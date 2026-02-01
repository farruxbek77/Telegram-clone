require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Uploads papkasini yaratish
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static files uchun
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer konfiguratsiyasi
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

        // Fayl turiga qarab prefix berish
        let prefix = 'file-';
        if (file.mimetype.startsWith('image/')) {
            prefix = 'image-';
        } else if (file.mimetype.startsWith('video/')) {
            prefix = 'video-';
        } else if (file.mimetype.startsWith('audio/')) {
            prefix = 'audio-';
        } else if (file.mimetype === 'application/pdf') {
            prefix = 'pdf-';
        } else if (file.mimetype.includes('document') || file.mimetype.includes('word')) {
            prefix = 'doc-';
        } else if (file.mimetype.includes('sheet') || file.mimetype.includes('excel')) {
            prefix = 'excel-';
        } else if (file.mimetype.includes('zip') || file.mimetype.includes('rar') || file.mimetype.includes('7z')) {
            prefix = 'archive-';
        }

        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Faqat xavfli fayl turlarini rad etish
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.jar', '.msi'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (dangerousExtensions.includes(fileExtension)) {
        cb(new Error('Xavfsizlik sababli bu fayl turi qo\'llab-quvvatlanmaydi'), false);
    } else {
        // Barcha boshqa fayl turlarini qabul qilish
        cb(null, true);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for videos
    }
});

// In-memory storage
const users = new Map();
const messages = [];
const privateChats = new Map(); // userId1-userId2 -> messages[]
const onlineUsers = new Map();
const userStatus = new Map(); // userId -> { isOnline, lastSeen, socketId }
const userSettings = new Map(); // userId -> settings object
const groups = new Map(); // groupId -> group object
const groupMessages = new Map(); // groupId -> messages[]
const notifications = new Map(); // userId -> notifications[]
const unreadCounts = new Map(); // userId -> { chatId: count }

// Demo users
const demoUsers = [
    {
        id: '1',
        username: 'Foydalanuvchi_1',
        avatar: 'https://ui-avatars.com/api/?name=User1&background=0088cc&color=fff&size=200',
        isOnline: false,
        lastSeen: new Date()
    },
    {
        id: '2',
        username: 'Foydalanuvchi_2',
        avatar: 'https://ui-avatars.com/api/?name=User2&background=40a7e3&color=fff&size=200',
        isOnline: false,
        lastSeen: new Date()
    },
    {
        id: '3',
        username: 'Foydalanuvchi_3',
        avatar: 'https://ui-avatars.com/api/?name=User3&background=e74c3c&color=fff&size=200',
        isOnline: false,
        lastSeen: new Date()
    }
];

// Initialize demo users
demoUsers.forEach(user => {
    users.set(user.id, user);
    // Initialize user status
    userStatus.set(user.id, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: null
    });
    // Initialize user settings
    userSettings.set(user.id, {
        theme: 'dark', // 'dark' or 'light'
        privacy: {
            lastSeen: 'everyone', // 'everyone', 'contacts', 'nobody'
            profilePhoto: 'everyone',
            readReceipts: true,
            onlineStatus: true
        },
        notifications: {
            messageSound: true,
            desktopNotifications: true,
            groupNotifications: true,
            privateNotifications: true,
            notificationPreview: true
        },
        language: 'uz' // 'uz', 'en', 'ru'
    });
});

// Create default "General Chat" group
const generalGroup = {
    id: 'general',
    name: 'General Chat',
    description: 'Umumiy chat guruhi',
    icon: '💬', // General chat icon
    avatar: 'https://ui-avatars.com/api/?name=💬 General&background=0088cc&color=fff&size=200',
    createdBy: '1',
    createdAt: new Date(),
    members: demoUsers.map(user => user.id),
    admins: ['1'],
    isPublic: true,
    settings: {
        allowMemberInvite: true,
        allowMemberMessage: true,
        showMemberCount: true
    }
};

groups.set('general', generalGroup);
groupMessages.set('general', []);

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '7d' });
};

// Private chat helper functions
const getChatId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('-');
};

const getPrivateMessages = (userId1, userId2) => {
    const chatId = getChatId(userId1, userId2);
    if (!privateChats.has(chatId)) {
        privateChats.set(chatId, []);
    }
    return privateChats.get(chatId);
};

// Update user activity (lastSeen)
const updateUserActivity = (userId) => {
    const status = userStatus.get(userId);
    if (status) {
        status.lastSeen = new Date();
        userStatus.set(userId, status);

        // Update user in users map
        const user = users.get(userId);
        if (user) {
            user.lastSeen = new Date();
            users.set(userId, user);
        }
    }
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

// Routes - Parolsiz kirish
app.post('/api/auth/login', async (req, res) => {
    try {
        // Tasodifiy foydalanuvchi tanlash yoki yangi yaratish
        const existingUsers = Array.from(users.values());
        let selectedUser;

        if (existingUsers.length > 0) {
            // Mavjud foydalanuvchilardan birini tanlash
            const randomIndex = Math.floor(Math.random() * existingUsers.length);
            selectedUser = existingUsers[randomIndex];
        } else {
            // Yangi foydalanuvchi yaratish
            selectedUser = {
                id: uuidv4(),
                username: `Foydalanuvchi_${Date.now()}`,
                avatar: `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=200`
            };
            users.set(selectedUser.id, selectedUser);
        }

        const token = generateToken(selectedUser.id);

        res.json({
            success: true,
            message: 'Muvaffaqiyatli kirildi',
            token,
            user: {
                id: selectedUser.id,
                username: selectedUser.username,
                avatar: selectedUser.avatar,
                isOnline: true
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi: ' + error.message
        });
    }
});

// Register ham login bilan bir xil
app.post('/api/auth/register', async (req, res) => {
    try {
        // Yangi foydalanuvchi yaratish
        const newUser = {
            id: uuidv4(),
            username: `Foydalanuvchi_${Date.now()}`,
            avatar: `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=200`
        };

        users.set(newUser.id, newUser);
        const token = generateToken(newUser.id);

        console.log('✅ User registered successfully:', newUser.username);

        res.status(201).json({
            success: true,
            message: 'Muvaffaqiyatli ro\'yxatdan o\'tdingiz',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                avatar: newUser.avatar,
                isOnline: true
            }
        });
    } catch (error) {
        console.error('💥 Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi: ' + error.message
        });
    }
});

app.get('/api/auth/me', auth, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            avatar: req.user.avatar,
            isOnline: true
        }
    });
});

// Logout endpoint
app.post('/api/auth/logout', auth, (req, res) => {
    try {
        // Update user offline status
        const status = userStatus.get(req.user.id);
        if (status) {
            status.isOnline = false;
            status.lastSeen = new Date();
            userStatus.set(req.user.id, status);
        }

        // Remove from online users
        onlineUsers.delete(req.user.id);

        // Update user in users map
        const user = users.get(req.user.id);
        if (user) {
            user.isOnline = false;
            user.lastSeen = new Date();
            users.set(req.user.id, user);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
});

// Get online users
app.get('/api/users/online', auth, (req, res) => {
    const onlineUsersList = Array.from(onlineUsers.values())
        .filter(user => user.id !== req.user.id) // O'zini chiqarib tashlash
        .map(user => {
            const status = userStatus.get(user.id);
            return {
                ...user,
                isOnline: status?.isOnline || false,
                lastSeen: status?.lastSeen || new Date()
            };
        });

    res.json({
        success: true,
        users: onlineUsersList
    });
});

// Get all users with status
app.get('/api/users/all', auth, (req, res) => {
    const allUsers = Array.from(users.values())
        .filter(user => user.id !== req.user.id) // O'zini chiqarib tashlash
        .map(user => {
            const status = userStatus.get(user.id);
            return {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                isOnline: status?.isOnline || false,
                lastSeen: status?.lastSeen || new Date()
            };
        });

    res.json({
        success: true,
        users: allUsers
    });
});

// Get user settings
app.get('/api/settings', auth, (req, res) => {
    try {
        const settings = userSettings.get(req.user.id);

        if (!settings) {
            // Create default settings if not exist
            const defaultSettings = {
                theme: 'dark',
                privacy: {
                    lastSeen: 'everyone',
                    profilePhoto: 'everyone',
                    readReceipts: true,
                    onlineStatus: true
                },
                notifications: {
                    messageSound: true,
                    desktopNotifications: true,
                    groupNotifications: true,
                    privateNotifications: true,
                    notificationPreview: true
                },
                language: 'uz'
            };
            userSettings.set(req.user.id, defaultSettings);

            return res.json({
                success: true,
                settings: defaultSettings
            });
        }

        res.json({
            success: true,
            settings: settings
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Sozlamalarni olishda xato: ' + error.message
        });
    }
});

// Update user settings
app.put('/api/settings', auth, (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({
                success: false,
                message: 'Sozlamalar ma\'lumotlari kerak'
            });
        }

        // Get current settings
        const currentSettings = userSettings.get(req.user.id) || {};

        // Merge with new settings
        const updatedSettings = {
            theme: settings.theme || currentSettings.theme || 'dark',
            privacy: {
                ...currentSettings.privacy,
                ...settings.privacy
            },
            notifications: {
                ...currentSettings.notifications,
                ...settings.notifications
            },
            language: settings.language || currentSettings.language || 'uz'
        };

        // Save updated settings
        userSettings.set(req.user.id, updatedSettings);

        console.log('✅ Settings updated for user:', req.user.username);

        res.json({
            success: true,
            message: 'Sozlamalar muvaffaqiyatli yangilandi',
            settings: updatedSettings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Sozlamalarni yangilashda xato: ' + error.message
        });
    }
});

// Notification helper functions
const createNotification = (userId, type, data) => {
    const notification = {
        id: uuidv4(),
        type: type, // 'message', 'group_invite', 'mention', etc.
        data: data,
        timestamp: new Date(),
        read: false
    };

    if (!notifications.has(userId)) {
        notifications.set(userId, []);
    }

    const userNotifications = notifications.get(userId);
    userNotifications.unshift(notification); // Add to beginning

    // Keep only last 100 notifications
    if (userNotifications.length > 100) {
        userNotifications.splice(100);
    }

    return notification;
};

const updateUnreadCount = (userId, chatId, increment = 1) => {
    if (!unreadCounts.has(userId)) {
        unreadCounts.set(userId, new Map());
    }

    const userCounts = unreadCounts.get(userId);
    const currentCount = userCounts.get(chatId) || 0;
    const newCount = Math.max(0, currentCount + increment);

    if (newCount === 0) {
        userCounts.delete(chatId);
    } else {
        userCounts.set(chatId, newCount);
    }

    return newCount;
};

const getTotalUnreadCount = (userId) => {
    const userCounts = unreadCounts.get(userId);
    if (!userCounts) return 0;

    let total = 0;
    for (const count of userCounts.values()) {
        total += count;
    }
    return total;
};

// Get notifications
app.get('/api/notifications', auth, (req, res) => {
    try {
        const userNotifications = notifications.get(req.user.id) || [];
        const totalUnread = getTotalUnreadCount(req.user.id);
        const chatCounts = unreadCounts.get(req.user.id) || new Map();

        res.json({
            success: true,
            notifications: userNotifications,
            totalUnread: totalUnread,
            chatCounts: Object.fromEntries(chatCounts)
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirishnomalarni olishda xato: ' + error.message
        });
    }
});

// Mark notifications as read
app.post('/api/notifications/read', auth, (req, res) => {
    try {
        const { notificationIds } = req.body;

        const userNotifications = notifications.get(req.user.id) || [];

        if (notificationIds && Array.isArray(notificationIds)) {
            // Mark specific notifications as read
            userNotifications.forEach(notification => {
                if (notificationIds.includes(notification.id)) {
                    notification.read = true;
                }
            });
        } else {
            // Mark all notifications as read
            userNotifications.forEach(notification => {
                notification.read = true;
            });
        }

        res.json({
            success: true,
            message: 'Bildirishnomalar o\'qilgan deb belgilandi'
        });
    } catch (error) {
        console.error('Mark notifications read error:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirishnomalarni belgilashda xato: ' + error.message
        });
    }
});

// Mark chat as read (clear unread count)
app.post('/api/notifications/chat/:chatId/read', auth, (req, res) => {
    try {
        const { chatId } = req.params;
        updateUnreadCount(req.user.id, chatId, -1000); // Clear all unread

        const totalUnread = getTotalUnreadCount(req.user.id);

        res.json({
            success: true,
            message: 'Chat o\'qilgan deb belgilandi',
            totalUnread: totalUnread
        });
    } catch (error) {
        console.error('Mark chat read error:', error);
        res.status(500).json({
            success: false,
            message: 'Chatni belgilashda xato: ' + error.message
        });
    }
});

// Get unread counts
app.get('/api/notifications/unread', auth, (req, res) => {
    try {
        const totalUnread = getTotalUnreadCount(req.user.id);
        const chatCounts = unreadCounts.get(req.user.id) || new Map();

        res.json({
            success: true,
            totalUnread: totalUnread,
            chatCounts: Object.fromEntries(chatCounts)
        });
    } catch (error) {
        console.error('Get unread counts error:', error);
        res.status(500).json({
            success: false,
            message: 'O\'qilmagan xabarlar sonini olishda xato: ' + error.message
        });
    }
});

// Helper function to get last group message
const getLastGroupMessage = (groupId) => {
    const messages = groupMessages.get(groupId) || [];
    if (messages.length === 0) return null;

    const lastMessage = messages[messages.length - 1];
    return {
        text: lastMessage.text || (lastMessage.type === 'image' ? '📷 Rasm' : lastMessage.type === 'video' ? '🎥 Video' : 'Xabar'),
        timestamp: lastMessage.timestamp,
        user: lastMessage.user
    };
};

// Get user groups
app.get('/api/groups', auth, (req, res) => {
    try {
        const userGroups = Array.from(groups.values())
            .filter(group => group.members.includes(req.user.id))
            .map(group => ({
                id: group.id,
                name: group.name,
                description: group.description,
                avatar: group.avatar,
                memberCount: group.members.length,
                isAdmin: group.admins.includes(req.user.id),
                createdAt: group.createdAt,
                lastMessage: getLastGroupMessage(group.id)
            }));

        res.json({
            success: true,
            groups: userGroups
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({
            success: false,
            message: 'Guruhlarni olishda xato: ' + error.message
        });
    }
});

// Create new group
app.post('/api/groups', auth, (req, res) => {
    try {
        const { name, description, members = [], isPublic = false, icon = '👥' } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Guruh nomi kerak'
            });
        }

        if (name.trim().length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Guruh nomi 50 belgidan oshmasligi kerak'
            });
        }

        const groupId = uuidv4();
        const newGroup = {
            id: groupId,
            name: name.trim(),
            description: description?.trim() || '',
            icon: icon, // Icon qo'shish
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(icon + ' ' + name.trim())}&background=random&color=fff&size=200`,
            createdBy: req.user.id,
            createdAt: new Date(),
            members: [req.user.id, ...members.filter(id => id !== req.user.id)], // Creator + unique members
            admins: [req.user.id],
            isPublic: isPublic,
            settings: {
                allowMemberInvite: true,
                allowMemberMessage: true,
                showMemberCount: true
            }
        };

        groups.set(groupId, newGroup);
        groupMessages.set(groupId, []);

        console.log('✅ Group created:', newGroup.name, 'with icon:', newGroup.icon, 'by:', req.user.username);

        res.status(201).json({
            success: true,
            message: 'Guruh muvaffaqiyatli yaratildi',
            group: {
                id: newGroup.id,
                name: newGroup.name,
                description: newGroup.description,
                icon: newGroup.icon,
                avatar: newGroup.avatar,
                memberCount: newGroup.members.length,
                isAdmin: true,
                createdAt: newGroup.createdAt,
                lastMessage: null
            }
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({
            success: false,
            message: 'Guruh yaratishda xato: ' + error.message
        });
    }
});

// Get group details
app.get('/api/groups/:groupId', auth, (req, res) => {
    try {
        const { groupId } = req.params;
        const group = groups.get(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Guruh topilmadi'
            });
        }

        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Bu guruhga kirish huquqingiz yo\'q'
            });
        }

        // Get group members info
        const membersInfo = group.members.map(memberId => {
            const user = users.get(memberId);
            const status = userStatus.get(memberId);
            return {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                isOnline: status?.isOnline || false,
                lastSeen: status?.lastSeen || new Date(),
                isAdmin: group.admins.includes(memberId),
                joinedAt: group.createdAt // For now, use group creation date
            };
        });

        res.json({
            success: true,
            group: {
                ...group,
                members: membersInfo,
                isUserAdmin: group.admins.includes(req.user.id)
            }
        });
    } catch (error) {
        console.error('Get group details error:', error);
        res.status(500).json({
            success: false,
            message: 'Guruh ma\'lumotlarini olishda xato: ' + error.message
        });
    }
});

// Add member to group
app.post('/api/groups/:groupId/members', auth, (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const group = groups.get(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Guruh topilmadi'
            });
        }

        if (!group.admins.includes(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Faqat adminlar a\'zo qo\'sha oladi'
            });
        }

        if (!users.has(userId)) {
            return res.status(404).json({
                success: false,
                message: 'Foydalanuvchi topilmadi'
            });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Foydalanuvchi allaqachon guruh a\'zosi'
            });
        }

        group.members.push(userId);
        groups.set(groupId, group);

        const addedUser = users.get(userId);
        console.log('✅ User added to group:', addedUser.username, 'to', group.name);

        res.json({
            success: true,
            message: 'A\'zo muvaffaqiyatli qo\'shildi'
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({
            success: false,
            message: 'A\'zo qo\'shishda xato: ' + error.message
        });
    }
});

// Get group messages
app.get('/api/groups/:groupId/messages', auth, (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const group = groups.get(groupId);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Guruh topilmadi'
            });
        }

        if (!group.members.includes(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: 'Bu guruhga kirish huquqingiz yo\'q'
            });
        }

        const messages = groupMessages.get(groupId) || [];
        const paginatedMessages = messages
            .slice(-limit - offset, messages.length - offset)
            .reverse();

        res.json({
            success: true,
            messages: paginatedMessages,
            total: messages.length
        });
    } catch (error) {
        console.error('Get group messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Guruh xabarlarini olishda xato: ' + error.message
        });
    }
});

// Image upload endpoint
app.post('/api/upload/image', auth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Rasm fayli topilmadi'
            });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Rasm muvaffaqiyatli yuklandi',
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Rasm yuklashda xato: ' + error.message
        });
    }
});

// Video upload endpoint
app.post('/api/upload/video', auth, upload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Video fayli topilmadi'
            });
        }

        const videoUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Video muvaffaqiyatli yuklandi',
            videoUrl: videoUrl,
            filename: req.file.filename,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        console.error('Video upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Video yuklashda xato: ' + error.message
        });
    }
});

// Universal file upload endpoint with error handling
app.post('/api/upload/file', auth, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('❌ Multer error:', err);

            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Fayl hajmi 50MB dan oshmasligi kerak'
                });
            }

            if (err.message === 'Fayl turi qo\'llab-quvvatlanmaydi') {
                return res.status(400).json({
                    success: false,
                    message: 'Bu fayl turi qo\'llab-quvvatlanmaydi'
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Fayl yuklashda xato: ' + err.message
            });
        }

        try {
            console.log('📁 File upload request received');
            console.log('User:', req.user?.username);
            console.log('File info:', req.file ? {
                originalname: req.file.originalname,
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : 'No file');

            if (!req.file) {
                console.log('❌ No file in request');
                return res.status(400).json({
                    success: false,
                    message: 'Fayl topilmadi'
                });
            }

            const fileUrl = `/uploads/${req.file.filename}`;

            // Fayl turini aniqlash
            const getFileType = (mimetype) => {
                if (mimetype.startsWith('image/')) return 'image';
                if (mimetype.startsWith('video/')) return 'video';
                if (mimetype.startsWith('audio/')) return 'audio';
                if (mimetype === 'application/pdf') return 'pdf';
                if (mimetype.includes('document') || mimetype.includes('word')) return 'document';
                if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'spreadsheet';
                if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'presentation';
                if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z') || mimetype.includes('tar')) return 'archive';
                if (mimetype.startsWith('text/')) return 'text';
                return 'file';
            };

            // Fayl hajmini formatlash
            const formatFileSize = (bytes) => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            const responseData = {
                success: true,
                message: 'Fayl muvaffaqiyatli yuklandi',
                fileUrl: fileUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                fileSize: req.file.size,
                formattedSize: formatFileSize(req.file.size),
                mimeType: req.file.mimetype,
                fileType: getFileType(req.file.mimetype)
            };

            console.log('✅ File upload successful:', responseData);

            res.json(responseData);
        } catch (error) {
            console.error('❌ File upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Fayl yuklashda xato: ' + error.message
            });
        }
    });
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
    console.log('User connected:', socket.user.username);

    // Update user status to online
    userStatus.set(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
        socketId: socket.id
    });

    // Update user in users map
    const user = users.get(socket.userId);
    if (user) {
        user.isOnline = true;
        user.lastSeen = new Date();
        users.set(socket.userId, user);
    }

    // Add to online users
    onlineUsers.set(socket.userId, {
        id: socket.user.id,
        username: socket.user.username,
        avatar: socket.user.avatar,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date()
    });

    // Join general room
    socket.join('general');

    // Send user info
    socket.emit('user-joined', socket.user);

    // Send recent messages
    socket.emit('message-history', messages.slice(-50));

    // Send online users with status
    const onlineUsersList = Array.from(onlineUsers.values()).map(user => {
        const status = userStatus.get(user.id);
        return {
            ...user,
            isOnline: status?.isOnline || false,
            lastSeen: status?.lastSeen || new Date()
        };
    });
    io.to('general').emit('online-users', onlineUsersList);

    // Notify others user is online
    socket.to('general').emit('user-online', {
        ...socket.user,
        isOnline: true,
        lastSeen: new Date()
    });

    // Handle message history request
    socket.on('message-history', () => {
        // Update lastSeen on activity
        updateUserActivity(socket.userId);
        socket.emit('message-history', messages.slice(-50));
    });

    // Handle new messages
    socket.on('send-message', (messageData) => {
        console.log('📨 New message received from:', socket.user.username, '- Type:', messageData.type || 'text');

        // Update lastSeen on activity
        updateUserActivity(socket.userId);

        const message = {
            id: uuidv4(),
            text: messageData.text || '',
            type: messageData.type || 'text', // 'text', 'image', 'video', yoki 'file'
            imageUrl: messageData.imageUrl || null,
            videoUrl: messageData.videoUrl || null,
            fileUrl: messageData.fileUrl || null,
            fileName: messageData.fileName || null,
            fileSize: messageData.fileSize || null,
            fileType: messageData.fileType || null,
            mimeType: messageData.mimeType || null,
            user: {
                id: socket.user.id,
                username: socket.user.username,
                avatar: socket.user.avatar
            },
            timestamp: new Date(),
            room: messageData.chatId || 'general',
            tempId: messageData.tempId,
            status: 'sent',
            readBy: []
        };

        // Check if it's a group message
        if (messageData.chatId && groups.has(messageData.chatId)) {
            const group = groups.get(messageData.chatId);

            // Check if user is member of the group
            if (!group.members.includes(socket.user.id)) {
                socket.emit('message-error', { message: 'Bu guruhga xabar yuborish huquqingiz yo\'q' });
                return;
            }

            // Rasm, video va file URL ni to'liq manzil bilan yangilash
            if (message.type === 'image' && message.imageUrl) {
                message.imageUrl = `http://localhost:5005${message.imageUrl}`;
            }
            if (message.type === 'video' && message.videoUrl) {
                message.videoUrl = `http://localhost:5005${message.videoUrl}`;
            }
            if (message.type === 'file' && message.fileUrl) {
                message.fileUrl = `http://localhost:5005${message.fileUrl}`;
            }

            // Save to group messages
            const groupMsgs = groupMessages.get(messageData.chatId) || [];
            groupMsgs.push(message);
            if (groupMsgs.length > 1000) {
                groupMsgs.shift();
            }
            groupMessages.set(messageData.chatId, groupMsgs);

            // Send to all group members who are online
            group.members.forEach(memberId => {
                const memberSocket = onlineUsers.get(memberId);
                if (memberSocket) {
                    io.to(memberSocket.socketId).emit('new-message', message);
                }

                // Create notification and update unread count for other members
                if (memberId !== socket.user.id) {
                    createNotification(memberId, 'message', {
                        chatId: messageData.chatId,
                        chatName: group.name,
                        senderName: socket.user.username,
                        messageText: message.text || (message.type === 'image' ? '📷 Rasm' : message.type === 'video' ? '🎥 Video' : message.type === 'file' ? '📎 Fayl' : 'Xabar'),
                        messageType: message.type
                    });

                    const newCount = updateUnreadCount(memberId, messageData.chatId, 1);
                    const totalUnread = getTotalUnreadCount(memberId);

                    // Send notification update to user if online
                    const memberSocket = onlineUsers.get(memberId);
                    if (memberSocket) {
                        io.to(memberSocket.socketId).emit('notification-update', {
                            chatId: messageData.chatId,
                            unreadCount: newCount,
                            totalUnread: totalUnread
                        });
                    }
                }
            });

            console.log('📤 Group message sent to:', group.name, 'members:', group.members.length);
        }
        // Agar private chat bo'lsa
        else if (messageData.chatId && messageData.chatId !== 'general' && messageData.chatId.includes('-')) {
            const [userId1, userId2] = messageData.chatId.split('-');
            const privateMessages = getPrivateMessages(userId1, userId2);

            // Rasm, video va file URL ni to'liq manzil bilan yangilash
            if (message.type === 'image' && message.imageUrl) {
                message.imageUrl = `http://localhost:5005${message.imageUrl}`;
            }
            if (message.type === 'video' && message.videoUrl) {
                message.videoUrl = `http://localhost:5005${message.videoUrl}`;
            }
            if (message.type === 'file' && message.fileUrl) {
                message.fileUrl = `http://localhost:5005${message.fileUrl}`;
            }

            privateMessages.push(message);

            // Faqat shu ikki kishiga yuborish
            const targetUserId = userId1 === socket.user.id ? userId2 : userId1;
            const targetUser = onlineUsers.get(targetUserId);

            if (targetUser) {
                io.to(targetUser.socketId).emit('new-message', message);
            }
            socket.emit('new-message', message); // O'ziga ham yuborish

            // Create notification and update unread count for target user
            createNotification(targetUserId, 'message', {
                chatId: messageData.chatId,
                chatName: socket.user.username, // Private chat da sender nomi
                senderName: socket.user.username,
                messageText: message.text || (message.type === 'image' ? '📷 Rasm' : message.type === 'video' ? '🎥 Video' : message.type === 'file' ? '📎 Fayl' : 'Xabar'),
                messageType: message.type
            });

            const newCount = updateUnreadCount(targetUserId, messageData.chatId, 1);
            const totalUnread = getTotalUnreadCount(targetUserId);

            // Send notification update to target user if online
            if (targetUser) {
                io.to(targetUser.socketId).emit('notification-update', {
                    chatId: messageData.chatId,
                    unreadCount: newCount,
                    totalUnread: totalUnread
                });
            }

            console.log('📤 Private message sent between:', userId1, 'and', userId2);
        } else {
            // General chat (default group)
            const generalGroup = groups.get('general');
            if (generalGroup && generalGroup.members.includes(socket.user.id)) {
                // Rasm, video va file URL ni to'liq manzil bilan yangilash
                if (message.type === 'image' && message.imageUrl) {
                    message.imageUrl = `http://localhost:5005${message.imageUrl}`;
                }
                if (message.type === 'video' && message.videoUrl) {
                    message.videoUrl = `http://localhost:5005${message.videoUrl}`;
                }
                if (message.type === 'file' && message.fileUrl) {
                    message.fileUrl = `http://localhost:5005${message.fileUrl}`;
                }

                // Save to general group messages
                const generalMsgs = groupMessages.get('general') || [];
                generalMsgs.push(message);
                if (generalMsgs.length > 1000) {
                    generalMsgs.shift();
                }
                groupMessages.set('general', generalMsgs);

                console.log('📤 Broadcasting message to all users in general group');
                console.log('📊 Online users count:', onlineUsers.size);
                io.to('general').emit('new-message', message);

                // Create notifications for all other members in general group
                generalGroup.members.forEach(memberId => {
                    if (memberId !== socket.user.id) {
                        createNotification(memberId, 'message', {
                            chatId: 'general',
                            chatName: 'General Chat',
                            senderName: socket.user.username,
                            messageText: message.text || (message.type === 'image' ? '📷 Rasm' : message.type === 'video' ? '🎥 Video' : message.type === 'file' ? '📎 Fayl' : 'Xabar'),
                            messageType: message.type
                        });

                        const newCount = updateUnreadCount(memberId, 'general', 1);
                        const totalUnread = getTotalUnreadCount(memberId);

                        // Send notification update to user if online
                        const memberSocket = onlineUsers.get(memberId);
                        if (memberSocket) {
                            io.to(memberSocket.socketId).emit('notification-update', {
                                chatId: 'general',
                                unreadCount: newCount,
                                totalUnread: totalUnread
                            });
                        }
                    }
                });
            }
        }

        // Avtomatik o'qish o'chirildi - faqat haqiqiy o'qish
    });

    // Handle message read status
    socket.on('mark-message-read', (messageId) => {
        console.log('📖 Mark message as read:', messageId, 'by:', socket.user.username);

        // Update lastSeen on activity
        updateUserActivity(socket.userId);

        // General chat xabarlarini tekshirish
        const message = messages.find(msg => msg.id === messageId);
        if (message && message.user.id !== socket.user.id) {
            if (!message.readBy) message.readBy = [];
            if (!message.readBy.includes(socket.user.id)) {
                message.readBy.push(socket.user.id);
                message.status = 'read';

                console.log('📤 Broadcasting read status for message:', messageId);
                // Xabar egasiga o'qilganlik haqida xabar berish
                io.to('general').emit('message-status-update', {
                    messageId: messageId,
                    status: 'read',
                    readBy: message.readBy
                });
            }
        }

        // Private chat xabarlarini ham tekshirish
        for (const [chatId, chatMessages] of privateChats.entries()) {
            const privateMessage = chatMessages.find(msg => msg.id === messageId);
            if (privateMessage && privateMessage.user.id !== socket.user.id) {
                if (!privateMessage.readBy) privateMessage.readBy = [];
                if (!privateMessage.readBy.includes(socket.user.id)) {
                    privateMessage.readBy.push(socket.user.id);
                    privateMessage.status = 'read';

                    // Private chat da faqat ikki kishiga yuborish
                    const [userId1, userId2] = chatId.split('-');
                    const targetUserId = userId1 === socket.user.id ? userId2 : userId1;
                    const targetUser = onlineUsers.get(targetUserId);

                    if (targetUser) {
                        io.to(targetUser.socketId).emit('message-status-update', {
                            messageId: messageId,
                            status: 'read',
                            readBy: privateMessage.readBy
                        });
                    }
                }
            }
        }
    });

    // Mark entire chat as read
    socket.on('mark-chat-read', (data) => {
        console.log('📖 Mark chat as read:', data.chatId, 'by:', socket.user.username);

        // Update lastSeen on activity
        updateUserActivity(socket.userId);

        const { chatId } = data;

        // Clear unread count for this chat
        updateUnreadCount(socket.user.id, chatId, -1000); // Clear all unread
        const totalUnread = getTotalUnreadCount(socket.user.id);

        // Send updated counts back to user
        socket.emit('notification-update', {
            chatId: chatId,
            unreadCount: 0,
            totalUnread: totalUnread
        });

        console.log('✅ Chat marked as read:', chatId, 'Total unread:', totalUnread);
    });

    // Get private chat messages
    socket.on('get-private-messages', (data) => {
        // Update lastSeen on activity
        updateUserActivity(socket.userId);

        const { targetUserId } = data;
        const privateMessages = getPrivateMessages(socket.user.id, targetUserId);
        socket.emit('private-message-history', {
            chatId: getChatId(socket.user.id, targetUserId),
            messages: privateMessages.slice(-50) // Oxirgi 50 ta xabar
        });
    });

    // Get group messages
    socket.on('get-group-messages', (data) => {
        // Update lastSeen on activity
        updateUserActivity(socket.userId);

        const { groupId } = data;
        const group = groups.get(groupId);

        if (!group) {
            socket.emit('message-error', { message: 'Guruh topilmadi' });
            return;
        }

        if (!group.members.includes(socket.user.id)) {
            socket.emit('message-error', { message: 'Bu guruhga kirish huquqingiz yo\'q' });
            return;
        }

        const messages = groupMessages.get(groupId) || [];
        socket.emit('group-message-history', {
            groupId: groupId,
            messages: messages.slice(-50) // Oxirgi 50 ta xabar
        });
    });

    // Join group room
    socket.on('join-group', (data) => {
        const { groupId } = data;
        const group = groups.get(groupId);

        if (group && group.members.includes(socket.user.id)) {
            socket.join(groupId);
            console.log('👥 User joined group room:', socket.user.username, 'in', group.name);
        }
    });

    // Leave group room
    socket.on('leave-group', (data) => {
        const { groupId } = data;
        socket.leave(groupId);
        console.log('👋 User left group room:', socket.user.username, 'from', groupId);
    });

    // Handle typing
    socket.on('typing', (data) => {
        // Update lastSeen on activity
        updateUserActivity(socket.userId);

        socket.to('general').emit('user-typing', {
            user: socket.user,
            isTyping: data.isTyping
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user.username);

        // Update user status to offline
        userStatus.set(socket.userId, {
            isOnline: false,
            lastSeen: new Date(),
            socketId: null
        });

        // Update user in users map
        const user = users.get(socket.userId);
        if (user) {
            user.isOnline = false;
            user.lastSeen = new Date();
            users.set(socket.userId, user);
        }

        // Remove from online users
        onlineUsers.delete(socket.userId);

        // Notify others user is offline
        socket.broadcast.emit('user-offline', {
            ...socket.user,
            isOnline: false,
            lastSeen: new Date()
        });

        // Send updated online users list
        const onlineUsersList = Array.from(onlineUsers.values()).map(user => {
            const status = userStatus.get(user.id);
            return {
                ...user,
                isOnline: status?.isOnline || false,
                lastSeen: status?.lastSeen || new Date()
            };
        });
        io.emit('online-users', onlineUsersList);
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('\n� Parolsiz kirish tizimi!');
    console.log('� Faqat "Kirish" tugmasini bosing!');
    console.log('\n🌐 Frontend: http://localhost:3000');
    console.log('� Backend: http://localhost:' + PORT);
});