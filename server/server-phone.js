require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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

// In-memory storage
const users = new Map();
const messages = [];
const onlineUsers = new Map();

// Demo users with phone numbers
const demoUsers = [
    {
        id: '1',
        username: 'Admin',
        phone: '+998 90 123 45 67',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=0088cc&color=fff&size=200'
    },
    {
        id: '2',
        username: 'User1',
        phone: '+998 91 234 56 78',
        avatar: 'https://ui-avatars.com/api/?name=User1&background=40a7e3&color=fff&size=200'
    },
    {
        id: '3',
        username: 'User2',
        phone: '+998 93 345 67 89',
        avatar: 'https://ui-avatars.com/api/?name=User2&background=e74c3c&color=fff&size=200'
    }
];

// Initialize demo users
demoUsers.forEach(user => {
    users.set(user.phone, user);
});

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '7d' });
};

// Auth middleware
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
        const user = Array.from(users.values()).find(u => u.id === decoded.userId);

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
        const user = users.get(phone);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Phone number not registered' });
        }

        const token = generateToken(user.id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone,
                avatar: user.avatar,
                isOnline: true
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, phone } = req.body;

        // Check if phone already exists
        if (users.has(phone)) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }

        const newUser = {
            id: uuidv4(),
            username,
            phone,
            avatar: `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&size=200`
        };

        users.set(phone, newUser);
        const token = generateToken(newUser.id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                phone: newUser.phone,
                avatar: newUser.avatar,
                isOnline: true
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/auth/me', auth, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            phone: req.user.phone,
            avatar: req.user.avatar,
            firstName: req.user.firstName || '',
            lastName: req.user.lastName || '',
            bio: req.user.bio || '',
            isOnline: true
        }
    });
});

app.put('/api/auth/me/update', auth, (req, res) => {
    try {
        const { username, firstName, lastName, bio } = req.body;
        const user = Array.from(users.values()).find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update user data
        if (username) user.username = username;
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (bio !== undefined) user.bio = bio;

        // Update in storage
        users.set(user.phone, user);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
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
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/auth/me/photo', auth, (req, res) => {
    try {
        const { avatar } = req.body;
        const user = Array.from(users.values()).find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update avatar
        user.avatar = avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random&color=fff&size=200`;

        // Update in storage
        users.set(user.phone, user);

        res.json({
            success: true,
            message: 'Profile photo updated successfully',
            user: {
                id: user.id,
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
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Search users
app.get('/api/users/search', auth, (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.json({
                success: true,
                users: []
            });
        }

        const searchQuery = query.toLowerCase().trim();
        const allUsers = Array.from(users.values());

        // Filter users based on username, firstName, lastName, or phone
        const filteredUsers = allUsers
            .filter(user => user.id !== req.user.id) // Exclude current user
            .filter(user => {
                const username = (user.username || '').toLowerCase();
                const firstName = (user.firstName || '').toLowerCase();
                const lastName = (user.lastName || '').toLowerCase();
                const phone = (user.phone || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`.trim().toLowerCase();

                return username.includes(searchQuery) ||
                    firstName.includes(searchQuery) ||
                    lastName.includes(searchQuery) ||
                    fullName.includes(searchQuery) ||
                    phone.includes(searchQuery);
            })
            .map(user => ({
                id: user.id,
                username: user.username,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone,
                avatar: user.avatar,
                isOnline: onlineUsers.has(user.id),
                lastSeen: user.lastSeen || new Date()
            }))
            .slice(0, 20); // Limit to 20 results

        res.json({
            success: true,
            users: filteredUsers
        });
    } catch (error) {
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
        const user = Array.from(users.values()).find(u => u.id === decoded.userId);

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
};

io.use(authenticateSocket);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.user.username} (${socket.user.phone})`);

    // Add to online users with more details
    onlineUsers.set(socket.userId, {
        id: socket.user.id,
        username: socket.user.username,
        phone: socket.user.phone,
        avatar: socket.user.avatar,
        socketId: socket.id,
        connectedAt: new Date(),
        lastSeen: new Date()
    });

    // Join general room
    socket.join('general');

    // Send user info with connection status
    socket.emit('user-joined', {
        ...socket.user,
        isOnline: true,
        connectedAt: new Date()
    });

    // Send recent messages
    socket.emit('message-history', messages.slice(-50));

    // Send updated online users list to everyone
    const onlineUsersList = Array.from(onlineUsers.values()).map(user => ({
        id: user.id,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar,
        isOnline: true,
        connectedAt: user.connectedAt,
        lastSeen: user.lastSeen
    }));

    io.to('general').emit('online-users', onlineUsersList);

    // Notify others user is online with animation
    socket.to('general').emit('user-online', {
        ...socket.user,
        isOnline: true,
        connectedAt: new Date()
    });

    // Handle new messages with validation
    socket.on('send-message', (messageData) => {
        if (!messageData || !messageData.text || !messageData.text.trim()) {
            socket.emit('message-error', { message: 'Message cannot be empty' });
            return;
        }

        if (messageData.text.length > 1000) {
            socket.emit('message-error', { message: 'Message too long (max 1000 characters)' });
            return;
        }

        const message = {
            id: uuidv4(),
            text: messageData.text.trim(),
            user: {
                id: socket.user.id,
                username: socket.user.username,
                phone: socket.user.phone,
                avatar: socket.user.avatar
            },
            timestamp: new Date(),
            room: 'general',
            type: 'text'
        };

        messages.push(message);

        // Keep only last 1000 messages
        if (messages.length > 1000) {
            messages.shift();
        }

        // Update user's last seen
        if (onlineUsers.has(socket.userId)) {
            onlineUsers.get(socket.userId).lastSeen = new Date();
        }

        // Broadcast message to all users in room
        io.to('general').emit('new-message', message);

        console.log(`💬 Message from ${socket.user.username}: ${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}`);
    });

    // Enhanced typing indicator with timeout
    let typingTimeout;
    socket.on('typing', (data) => {
        // Clear previous timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        if (data.isTyping) {
            // User started typing
            socket.to('general').emit('user-typing', {
                user: {
                    id: socket.user.id,
                    username: socket.user.username,
                    avatar: socket.user.avatar
                },
                isTyping: true,
                timestamp: new Date()
            });

            // Auto-stop typing after 3 seconds
            typingTimeout = setTimeout(() => {
                socket.to('general').emit('user-typing', {
                    user: {
                        id: socket.user.id,
                        username: socket.user.username,
                        avatar: socket.user.avatar
                    },
                    isTyping: false,
                    timestamp: new Date()
                });
            }, 3000);
        } else {
            // User stopped typing
            socket.to('general').emit('user-typing', {
                user: {
                    id: socket.user.id,
                    username: socket.user.username,
                    avatar: socket.user.avatar
                },
                isTyping: false,
                timestamp: new Date()
            });
        }
    });

    // Handle user activity (for last seen updates)
    socket.on('user-activity', () => {
        if (onlineUsers.has(socket.userId)) {
            onlineUsers.get(socket.userId).lastSeen = new Date();
        }
    });

    // Handle disconnect with cleanup
    socket.on('disconnect', (reason) => {
        console.log(`🔴 User disconnected: ${socket.user.username} (${reason})`);

        // Clear typing timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Remove from online users
        onlineUsers.delete(socket.userId);

        // Notify others user went offline
        socket.to('general').emit('user-offline', {
            ...socket.user,
            isOnline: false,
            lastSeen: new Date(),
            disconnectReason: reason
        });

        // Send updated online users list
        const onlineUsersList = Array.from(onlineUsers.values()).map(user => ({
            id: user.id,
            username: user.username,
            phone: user.phone,
            avatar: user.avatar,
            isOnline: true,
            connectedAt: user.connectedAt,
            lastSeen: user.lastSeen
        }));

        io.to('general').emit('online-users', onlineUsersList);
    });

    // Handle connection errors
    socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.user.username}:`, error);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('\n📱 Demo Phone Numbers (No Password Required):');
    console.log('Phone: +998 90 123 45 67 (Admin)');
    console.log('Phone: +998 91 234 56 78 (User1)');
    console.log('Phone: +998 93 345 67 89 (User2)');
    console.log('\n✨ Or register with any +998 XX XXX XX XX number!');
});