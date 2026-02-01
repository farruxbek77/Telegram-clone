require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import models
const User = require('./models/User');
const Message = require('./models/Message');
const Chat = require('./models/Chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-clone')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// In-memory storage for online users (socket connections)
const onlineUsers = new Map();

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '7d' });
};

// Auth middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone } = req.body;

        // Find user by phone
        let user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Phone number not registered' });
        }

        // Update user online status
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                phone: user.phone,
                avatar: user.avatar,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                bio: user.bio || '',
                isOnline: true
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, phone } = req.body;

        // Check if phone already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }

        const newUser = new User({
            username,
            phone,
            avatar: `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&size=200`,
            isOnline: true,
            lastSeen: new Date()
        });

        await newUser.save();
        const token = generateToken(newUser._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                phone: newUser.phone,
                avatar: newUser.avatar,
                firstName: newUser.firstName || '',
                lastName: newUser.lastName || '',
                bio: newUser.bio || '',
                isOnline: true
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/auth/me', auth, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            phone: req.user.phone,
            avatar: req.user.avatar,
            firstName: req.user.firstName || '',
            lastName: req.user.lastName || '',
            bio: req.user.bio || '',
            isOnline: req.user.isOnline
        }
    });
});

app.put('/api/auth/me/update', auth, async (req, res) => {
    try {
        const { username, firstName, lastName, bio } = req.body;

        // Check if username is taken by another user
        if (username && username !== req.user.username) {
            const existingUser = await User.findOne({ username, _id: { $ne: req.user._id } });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Username already taken' });
            }
        }

        // Update user data
        const updateData = {};
        if (username) updateData.username = username;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (bio !== undefined) updateData.bio = bio;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                phone: updatedUser.phone,
                avatar: updatedUser.avatar,
                firstName: updatedUser.firstName || '',
                lastName: updatedUser.lastName || '',
                bio: updatedUser.bio || '',
                isOnline: updatedUser.isOnline
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/auth/me/photo', auth, async (req, res) => {
    try {
        const { avatar } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                avatar: avatar || `https://ui-avatars.com/api/?name=${req.user.username}&background=random&color=fff&size=200&${Date.now()}`
            },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Profile photo updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                phone: updatedUser.phone,
                avatar: updatedUser.avatar,
                firstName: updatedUser.firstName || '',
                lastName: updatedUser.lastName || '',
                bio: updatedUser.bio || '',
                isOnline: updatedUser.isOnline
            }
        });
    } catch (error) {
        console.error('Update photo error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Search users
app.get('/api/users/search', auth, async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.json({
                success: true,
                users: []
            });
        }

        const searchQuery = query.toLowerCase().trim();

        // Create search conditions
        const searchConditions = {
            _id: { $ne: req.user._id }, // Exclude current user
            $or: [
                { username: { $regex: searchQuery, $options: 'i' } },
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } },
                { phone: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        const users = await User.find(searchConditions)
            .select('username firstName lastName phone avatar isOnline lastSeen')
            .limit(20)
            .sort({ isOnline: -1, lastSeen: -1 }); // Online users first

        const formattedUsers = users.map(user => ({
            id: user._id,
            username: user.username,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone,
            avatar: user.avatar,
            isOnline: onlineUsers.has(user._id.toString()),
            lastSeen: user.lastSeen || new Date()
        }));

        res.json({
            success: true,
            users: formattedUsers
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== MESSAGE APIs ====================

// Get messages for a specific chat
app.get('/api/messages/:chatId', auth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // For general chat, allow access to all authenticated users
        if (chatId !== 'general') {
            // Check if user has access to this chat
            const chat = await Chat.findOne({
                chatId,
                'participants.user': req.user._id
            });

            if (!chat) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this chat'
                });
            }
        }

        // Get messages with pagination
        const messages = await Message.find({
            chatId,
            deleted: false
        })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const formattedMessages = messages.reverse().map(msg => ({
            id: msg._id,
            text: msg.text,
            chatId: msg.chatId,
            messageType: msg.messageType,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            user: {
                id: msg.sender._id,
                username: msg.sender.username,
                phone: msg.sender.phone,
                avatar: msg.sender.avatar,
                firstName: msg.sender.firstName || '',
                lastName: msg.sender.lastName || '',
                isOnline: onlineUsers.has(msg.sender._id.toString())
            },
            replyTo: msg.replyTo ? {
                id: msg.replyTo._id,
                text: msg.replyTo.text,
                sender: msg.replyTo.sender
            } : null,
            timestamp: msg.createdAt,
            edited: msg.edited,
            editedAt: msg.editedAt,
            readBy: msg.readBy,
            isRead: msg.readBy.length > 0
        }));

        res.json({
            success: true,
            messages: formattedMessages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: messages.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Send a new message
app.post('/api/messages/send', auth, async (req, res) => {
    try {
        const {
            text,
            chatId = 'general',
            messageType = 'text',
            fileUrl,
            fileName,
            fileSize,
            replyToId
        } = req.body;

        // Validate required fields
        if (!text && !fileUrl) {
            return res.status(400).json({
                success: false,
                message: 'Message text or file is required'
            });
        }

        // For non-general chats, check access
        if (chatId !== 'general') {
            const chat = await Chat.findOne({
                chatId,
                'participants.user': req.user._id
            });

            if (!chat) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this chat'
                });
            }
        }

        // Create message
        const messageData = {
            text: text?.trim(),
            chatId,
            sender: req.user._id,
            messageType
        };

        if (fileUrl) {
            messageData.fileUrl = fileUrl;
            messageData.fileName = fileName;
            messageData.fileSize = fileSize;
        }

        if (replyToId) {
            const replyMessage = await Message.findById(replyToId);
            if (replyMessage && replyMessage.chatId === chatId) {
                messageData.replyTo = replyToId;
            }
        }

        const message = new Message(messageData);
        await message.save();

        // Populate after save
        await message.populate('sender', 'username phone avatar firstName lastName isOnline');
        if (message.replyTo) {
            await message.populate('replyTo');
        }

        // Update chat's last message and activity (for non-general chats)
        if (chatId !== 'general') {
            await Chat.findOneAndUpdate(
                { chatId },
                {
                    lastMessage: message._id,
                    lastActivity: new Date()
                }
            );
        }

        const formattedMessage = {
            id: message._id,
            text: message.text,
            chatId: message.chatId,
            messageType: message.messageType,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            fileSize: message.fileSize,
            user: {
                id: message.sender._id,
                username: message.sender.username,
                phone: message.sender.phone,
                avatar: message.sender.avatar,
                firstName: message.sender.firstName || '',
                lastName: message.sender.lastName || '',
                isOnline: onlineUsers.has(message.sender._id.toString())
            },
            replyTo: message.replyTo ? {
                id: message.replyTo._id,
                text: message.replyTo.text,
                sender: message.replyTo.sender
            } : null,
            timestamp: message.createdAt,
            edited: false,
            readBy: [],
            isRead: false
        };

        // Emit to socket room
        io.to(chatId).emit('new-message', formattedMessage);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: formattedMessage
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Socket authentication
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
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

io.use(authenticateSocket);

// Socket.io connection handling
io.on('connection', async (socket) => {
    console.log('User connected:', socket.user.username);

    try {
        // Update user online status
        await User.findByIdAndUpdate(socket.userId, {
            isOnline: true,
            socketId: socket.id,
            lastSeen: new Date()
        });

        // Add to online users
        onlineUsers.set(socket.userId, {
            id: socket.user._id,
            username: socket.user.username,
            avatar: socket.user.avatar,
            socketId: socket.id
        });

        // Join general room
        socket.join('general');

        // Send user info
        socket.emit('user-joined', {
            id: socket.user._id,
            username: socket.user.username,
            phone: socket.user.phone,
            avatar: socket.user.avatar,
            isOnline: true
        });

        // Send recent messages (for general chat only initially)
        if (currentChatId === 'general') {
            const recentMessages = await Message.find({
                $or: [
                    { chatId: 'general' },
                    { room: 'general' } // Backward compatibility
                ]
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .populate('sender', 'username avatar isOnline');

            const formattedMessages = recentMessages.reverse().map(msg => ({
                id: msg._id,
                text: msg.text,
                user: {
                    id: msg.sender._id,
                    username: msg.sender.username,
                    avatar: msg.sender.avatar,
                    isOnline: msg.sender.isOnline
                },
                timestamp: msg.createdAt,
                chatId: msg.chatId || msg.room || 'general'
            }));

            socket.emit('message-history', formattedMessages);
        }

        // Get and send online users
        const onlineUsersList = Array.from(onlineUsers.values());
        io.to('general').emit('online-users', onlineUsersList);

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
                    chatId: messageData.chatId || 'general'
                });

                await message.save();
                await message.populate('sender', 'username phone avatar firstName lastName isOnline');

                const formattedMessage = {
                    id: message._id,
                    text: message.text,
                    chatId: message.chatId,
                    messageType: message.messageType,
                    user: {
                        id: message.sender._id,
                        username: message.sender.username,
                        phone: message.sender.phone,
                        avatar: message.sender.avatar,
                        firstName: message.sender.firstName || '',
                        lastName: message.sender.lastName || '',
                        isOnline: onlineUsers.has(message.sender._id.toString())
                    },
                    timestamp: message.createdAt,
                    edited: false,
                    readBy: [],
                    isRead: false
                };

                io.to(message.chatId).emit('new-message', formattedMessage);

                console.log(`💬 Message in ${message.chatId} from ${socket.user.username}: ${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}`);
            } catch (error) {
                console.error('Message save error:', error);
                socket.emit('message-error', { message: 'Failed to send message' });
            }
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            const room = data.chatId || 'general';
            socket.to(room).emit('user-typing', {
                user: {
                    id: socket.user._id,
                    username: socket.user.username,
                    avatar: socket.user.avatar
                },
                isTyping: data.isTyping,
                chatId: room
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

                // Remove from online users
                onlineUsers.delete(socket.userId);

                // Notify others user is offline
                socket.broadcast.emit('user-offline', {
                    id: socket.user._id,
                    username: socket.user.username,
                    avatar: socket.user.avatar,
                    isOnline: false
                });

                // Send updated online users
                const onlineUsersList = Array.from(onlineUsers.values());
                io.emit('online-users', onlineUsersList);

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
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('📱 MongoDB Telegram Clone Server');
    console.log('✨ Register with any +998 XX XXX XX XX number!');
});