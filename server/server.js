require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import models and routes
const User = require('./models/User');
const Message = require('./models/Message');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);

// CORS configuration for production
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.CLIENT_URL || 'http://localhost:3000'
];

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-clone')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
};

// Apply socket authentication
io.use(authenticateSocket);

// Socket.io connection handling
io.on('connection', async (socket) => {
    console.log('User connected:', socket.user.username);

    try {
        // Update user online status and socket ID
        await User.findByIdAndUpdate(socket.userId, {
            isOnline: true,
            socketId: socket.id,
            lastSeen: new Date()
        });

        // Join general room
        socket.join('general');

        // Send user info
        socket.emit('user-joined', {
            id: socket.user._id,
            username: socket.user.username,
            email: socket.user.email,
            avatar: socket.user.avatar,
            isOnline: true
        });

        // Send recent messages
        const recentMessages = await Message.find({ room: 'general' })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('sender', 'username avatar isOnline');

        const messagesWithReadStatus = recentMessages.reverse().map(message => ({
            id: message._id,
            text: message.text,
            user: {
                id: message.sender._id,
                username: message.sender.username,
                avatar: message.sender.avatar,
                isOnline: message.sender.isOnline
            },
            timestamp: message.createdAt,
            room: message.room,
            readBy: message.readBy || [],
            isDelivered: true,
            isRead: message.readBy.some(read => read.user.toString() === socket.userId) ||
                message.sender._id.toString() === socket.userId
        }));

        socket.emit('message-history', messagesWithReadStatus);

        // Get and send online users
        const onlineUsers = await User.find({ isOnline: true })
            .select('username avatar isOnline');

        io.to('general').emit('online-users', onlineUsers);

        // Notify others user is online
        socket.to('general').emit('user-online', {
            id: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar,
            isOnline: true
        });

        // Handle new messages
        socket.on('send-message', async (messageData) => {
            try {
                const message = new Message({
                    text: messageData.text,
                    sender: socket.userId,
                    room: messageData.room || 'general'
                });

                await message.save();
                await message.populate('sender', 'username avatar isOnline');

                const messageResponse = {
                    id: message._id,
                    text: message.text,
                    user: {
                        id: message.sender._id,
                        username: message.sender.username,
                        avatar: message.sender.avatar,
                        isOnline: message.sender.isOnline
                    },
                    timestamp: message.createdAt,
                    room: message.room,
                    tempId: messageData.tempId, // Client dan kelgan tempId ni qaytarish
                    readBy: message.readBy || [],
                    isDelivered: true,
                    isRead: false
                };

                // Xabar yuborilganini tasdiqlash
                socket.emit('message-delivered', {
                    tempId: messageData.tempId,
                    messageId: message._id,
                    timestamp: message.createdAt
                });

                io.to(message.room).emit('new-message', messageResponse);
            } catch (error) {
                console.error('Message save error:', error);
                socket.emit('message-error', { message: 'Failed to send message' });
            }
        });

        // Handle message read status
        socket.on('mark-messages-read', async (data) => {
            try {
                const { messageIds, room } = data;

                // Update multiple messages as read
                await Message.updateMany(
                    {
                        _id: { $in: messageIds },
                        sender: { $ne: socket.userId } // Don't mark own messages as read
                    },
                    {
                        $addToSet: {
                            readBy: {
                                user: socket.userId,
                                readAt: new Date()
                            }
                        }
                    }
                );

                // Notify message senders about read status
                const messages = await Message.find({ _id: { $in: messageIds } })
                    .populate('sender', 'socketId');

                messages.forEach(message => {
                    if (message.sender.socketId && message.sender._id.toString() !== socket.userId) {
                        io.to(message.sender.socketId).emit('message-read', {
                            messageId: message._id,
                            readBy: socket.userId,
                            readAt: new Date(),
                            reader: {
                                id: socket.user._id,
                                username: socket.user.username,
                                avatar: socket.user.avatar
                            }
                        });
                    }
                });

            } catch (error) {
                console.error('Mark messages read error:', error);
            }
        });

        // Handle single message read
        socket.on('mark-message-read', async (data) => {
            try {
                const { messageId } = data;

                const message = await Message.findById(messageId)
                    .populate('sender', 'socketId');

                if (message && message.sender._id.toString() !== socket.userId) {
                    // Add read status if not already read by this user
                    const alreadyRead = message.readBy.find(
                        read => read.user.toString() === socket.userId
                    );

                    if (!alreadyRead) {
                        message.readBy.push({
                            user: socket.userId,
                            readAt: new Date()
                        });
                        await message.save();

                        // Notify message sender
                        if (message.sender.socketId) {
                            io.to(message.sender.socketId).emit('message-read', {
                                messageId: message._id,
                                readBy: socket.userId,
                                readAt: new Date(),
                                reader: {
                                    id: socket.user._id,
                                    username: socket.user.username,
                                    avatar: socket.user.avatar
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Mark message read error:', error);
            }
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            socket.to(data.room || 'general').emit('user-typing', {
                user: {
                    id: socket.user._id,
                    username: socket.user.username,
                    avatar: socket.user.avatar
                },
                isTyping: data.isTyping
            });
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            try {
                await User.findByIdAndUpdate(socket.userId, {
                    isOnline: false,
                    lastSeen: new Date(),
                    socketId: null
                });

                // Notify others user is offline
                socket.broadcast.emit('user-offline', {
                    id: socket.user._id,
                    username: socket.user.username,
                    avatar: socket.user.avatar,
                    isOnline: false
                });

                // Send updated online users
                const onlineUsers = await User.find({ isOnline: true })
                    .select('username avatar isOnline');

                io.emit('online-users', onlineUsers);

                console.log('User disconnected:', socket.user.username);
            } catch (error) {
                console.error('Disconnect error:', error);
            }
        });

    } catch (error) {
        console.error('Socket connection error:', error);
        socket.disconnect();
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});