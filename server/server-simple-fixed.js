require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);

// Data files
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

// Create data directory if not exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Initialize data files
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
}
if (!fs.existsSync(CHATS_FILE)) {
    fs.writeFileSync(CHATS_FILE, JSON.stringify([]));
}

// Helper functions
const readData = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        return [];
    }
};

const writeData = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// CORS configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
];

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Auth middleware
const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
        const users = readData(USERS_FILE);
        const user = users.find(u => u.id === decoded.userId);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.userId = user.id;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Telegram Clone Backend API',
        version: '1.0.0'
    });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        const users = readData(USERS_FILE);

        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            phone: phone || '',
            password: hashedPassword,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        writeData(USERS_FILE, users);

        const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                avatar: newUser.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email, password: '***' });

        const users = readData(USERS_FILE);
        console.log('Total users:', users.length);

        const user = users.find(u => u.email === email);

        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        console.log('User found:', user.username);
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isValidPassword);

        if (!isValidPassword) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret-key', { expiresIn: '7d' });

        console.log('Login successful:', user.username);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            phone: req.user.phone,
            avatar: req.user.avatar
        }
    });
});

// User routes
app.get('/api/users/search', authMiddleware, (req, res) => {
    try {
        const { query } = req.query;
        const users = readData(USERS_FILE);

        const results = users
            .filter(u => u.id !== req.userId &&
                (u.username.toLowerCase().includes(query.toLowerCase()) ||
                    u.email.toLowerCase().includes(query.toLowerCase())))
            .map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                avatar: u.avatar,
                isOnline: u.isOnline
            }));

        res.json({ success: true, users: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/users/all', authMiddleware, (req, res) => {
    try {
        const users = readData(USERS_FILE);
        const allUsers = users
            .filter(u => u.id !== req.userId)
            .map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                avatar: u.avatar,
                isOnline: u.isOnline,
                lastSeen: u.lastSeen
            }));

        res.json({ success: true, users: allUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Chat routes
app.get('/api/chats', authMiddleware, (req, res) => {
    try {
        const chats = readData(CHATS_FILE);
        const userChats = chats.filter(c => c.participants.includes(req.userId));
        res.json({ success: true, chats: userChats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/chats/private', authMiddleware, (req, res) => {
    try {
        const { userId } = req.body;
        const chats = readData(CHATS_FILE);

        let chat = chats.find(c =>
            c.type === 'private' &&
            c.participants.includes(req.userId) &&
            c.participants.includes(userId)
        );

        if (!chat) {
            chat = {
                id: Date.now().toString(),
                type: 'private',
                participants: [req.userId, userId],
                createdAt: new Date().toISOString()
            };
            chats.push(chat);
            writeData(CHATS_FILE, chats);
        }

        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Message routes
app.get('/api/messages/:chatId', authMiddleware, (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = readData(MESSAGES_FILE);
        const chatMessages = messages
            .filter(m => m.chatId === chatId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.json({ success: true, messages: chatMessages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Groups
app.get('/api/groups', authMiddleware, (req, res) => {
    try {
        const chats = readData(CHATS_FILE);
        const groups = chats.filter(c => c.type === 'group');
        res.json({ success: true, groups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create group
app.post('/api/groups', authMiddleware, (req, res) => {
    try {
        const { name, description, members = [], isPublic = false, icon = '👥' } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Group name is required' });
        }

        const chats = readData(CHATS_FILE);
        const users = readData(USERS_FILE);

        // Add creator to members
        const allMembers = [req.userId, ...members.filter(m => m !== req.userId)];

        const newGroup = {
            id: Date.now().toString(),
            type: 'group',
            name,
            description: description || '',
            icon: icon || '👥',
            isPublic: isPublic || false,
            participants: allMembers,
            admins: [req.userId],
            creator: req.userId,
            createdAt: new Date().toISOString(),
            memberCount: allMembers.length
        };

        chats.push(newGroup);
        writeData(CHATS_FILE, chats);

        // Get member details
        const memberDetails = users
            .filter(u => allMembers.includes(u.id))
            .map(u => ({
                id: u.id,
                username: u.username,
                avatar: u.avatar
            }));

        res.json({
            success: true,
            group: {
                ...newGroup,
                members: memberDetails
            }
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get group details
app.get('/api/groups/:groupId', authMiddleware, (req, res) => {
    try {
        const { groupId } = req.params;
        const chats = readData(CHATS_FILE);
        const users = readData(USERS_FILE);

        const group = chats.find(c => c.id === groupId && c.type === 'group');

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        // Get member details
        const memberDetails = users
            .filter(u => group.participants.includes(u.id))
            .map(u => ({
                id: u.id,
                username: u.username,
                avatar: u.avatar,
                isOnline: u.isOnline
            }));

        res.json({
            success: true,
            group: {
                ...group,
                members: memberDetails
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Notifications
app.get('/api/notifications', authMiddleware, (req, res) => {
    res.json({ success: true, notifications: [] });
});

// File upload
app.post('/api/upload/image', authMiddleware, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        res.json({
            success: true,
            url: `/uploads/${req.file.filename}`,
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/upload/video', authMiddleware, upload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        res.json({
            success: true,
            url: `/uploads/${req.file.filename}`,
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Socket.io
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user-connected', (data) => {
        const { userId, token } = data;

        if (!userId) {
            console.log('No userId provided');
            return;
        }

        connectedUsers.set(userId, socket.id);
        socket.userId = userId;

        const users = readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].isOnline = true;
            users[userIndex].socketId = socket.id;
            writeData(USERS_FILE, users);

            console.log(`User ${users[userIndex].username} connected`);

            // Notify all users
            io.emit('user-online', {
                userId,
                isOnline: true,
                username: users[userIndex].username,
                avatar: users[userIndex].avatar
            });
        }
    });

    socket.on('send-message', (data) => {
        try {
            const messages = readData(MESSAGES_FILE);
            const users = readData(USERS_FILE);

            const sender = users.find(u => u.id === data.senderId);

            const newMessage = {
                id: Date.now().toString(),
                chatId: data.chatId,
                senderId: data.senderId,
                senderName: sender ? sender.username : 'Unknown',
                senderAvatar: sender ? sender.avatar : '',
                text: data.text,
                type: data.type || 'text',
                fileUrl: data.fileUrl,
                createdAt: new Date().toISOString(),
                readBy: []
            };

            messages.push(newMessage);
            writeData(MESSAGES_FILE, messages);

            // Send to all users in the chat
            io.emit('new-message', newMessage);

            console.log('Message sent:', newMessage.text.substring(0, 20));
        } catch (error) {
            console.error('Send message error:', error);
        }
    });

    socket.on('join-chat', (chatId) => {
        socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
    });

    socket.on('typing', (data) => {
        socket.broadcast.emit('user-typing', data);
    });

    socket.on('disconnect', () => {
        const users = readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.socketId === socket.id);
        if (userIndex !== -1) {
            const userId = users[userIndex].id;
            users[userIndex].isOnline = false;
            users[userIndex].lastSeen = new Date().toISOString();
            users[userIndex].socketId = null;
            writeData(USERS_FILE, users);

            io.emit('user-offline', { userId, isOnline: false });
            console.log(`User ${users[userIndex].username} disconnected`);
        } else {
            console.log('User disconnected:', socket.id);
        }
    });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Using JSON file database (no MongoDB required)`);
});
