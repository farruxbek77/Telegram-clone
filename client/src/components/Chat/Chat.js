import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { imageAPI, videoAPI, fileAPI, notificationsAPI, BASE_URL } from '../../services/api';
import toast from 'react-hot-toast';
import Profile from '../Profile/Profile';
import Search from '../Search/Search';
import Settings from '../Settings/Settings';
import CreateGroup from '../CreateGroup/CreateGroup';
import './Chat.css';

const Chat = () => {
    const { user, token, logout } = useAuth();
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // Barcha foydalanuvchilar uchun
    const [typingUsers, setTypingUsers] = useState(new Map());
    const [isTyping, setIsTyping] = useState(false);
    const [connected, setConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [showProfile, setShowProfile] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [currentChatId] = useState('general');
    const [userAvatar, setUserAvatar] = useState(user?.avatar || '');
    const [groups, setGroups] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatList, setChatList] = useState([]);

    // Notification states
    const [notifications, setNotifications] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [totalUnread, setTotalUnread] = useState(0);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const readTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const documentInputRef = useRef(null);

    // Image upload states
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Video upload states
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    // File upload states
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // User avatar ni kuzatish va yangilash
    useEffect(() => {
        if (user?.avatar) {
            setUserAvatar(user.avatar);
        }
        // localStorage dan ham tekshirish
        const savedAvatar = localStorage.getItem('userAvatar');
        if (savedAvatar && savedAvatar !== 'null') {
            setUserAvatar(savedAvatar);
        }
    }, [user]);

    // Load user groups
    useEffect(() => {
        if (user && token) {
            loadGroups();
            loadAllUsers(); // Barcha foydalanuvchilarni yuklash
            loadNotifications(); // Bildirishnomalarni yuklash
        }
    }, [user, token]);

    // Initialize chat list with general chat
    useEffect(() => {
        const generalChat = {
            id: 'general',
            name: 'General Chat',
            icon: '💬', // General chat icon
            avatar: 'https://ui-avatars.com/api/?name=💬 General&background=0088cc&color=fff&size=84',
            type: 'group',
            lastMessage: 'Umumiy chat',
            time: 'Hozir',
            unread: 0
        };

        setChatList(prev => {
            const exists = prev.find(chat => chat.id === 'general');
            if (!exists) {
                return [generalChat, ...prev];
            }
            return prev;
        });
    }, []);

    // Set default selected chat for desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768 && !selectedChat) {
                // Desktop mode - select general chat by default
                const generalChat = {
                    id: 'general',
                    name: 'General Chat',
                    icon: '💬', // General chat icon
                    avatar: 'https://ui-avatars.com/api/?name=💬 General&background=0088cc&color=fff&size=84',
                    type: 'group'
                };
                setSelectedChat(generalChat);

                // Add general chat to chat list if not exists
                setChatList(prev => {
                    const exists = prev.find(chat => chat.id === 'general');
                    if (!exists) {
                        return [{
                            ...generalChat,
                            lastMessage: 'Umumiy chat',
                            time: 'Hozir',
                            unread: 0
                        }, ...prev];
                    }
                    return prev;
                });

                // Load general chat messages
                if (socket) {
                    socket.emit('get-group-messages', { groupId: 'general' });
                }
            }
        };

        handleResize(); // Check on mount
        window.addEventListener('resize', handleResize);

        // Also check when socket is connected
        if (socket && window.innerWidth > 768 && !selectedChat) {
            handleResize();
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [selectedChat, socket]);

    const loadGroups = async () => {
        try {
            const response = await fetch('http://localhost:5005/api/groups', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setGroups(data.groups);

                    // Update chat list with groups
                    const groupChats = data.groups.map(group => ({
                        id: group.id,
                        name: group.name,
                        icon: group.icon, // Icon qo'shish
                        avatar: group.avatar,
                        type: 'group',
                        memberCount: group.memberCount,
                        lastMessage: group.lastMessage?.text || 'Guruh yaratildi',
                        time: group.lastMessage ? formatTime(group.lastMessage.timestamp) : formatTime(group.createdAt),
                        unread: unreadCounts[group.id] || 0
                    }));

                    setChatList(groupChats);
                }
            }
        } catch (error) {
            console.error('Failed to load groups:', error);
        }
    };

    const loadAllUsers = async () => {
        try {
            const response = await fetch('http://localhost:5005/api/users/all', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAllUsers(data.users);
                }
            }
        } catch (error) {
            console.error('Failed to load all users:', error);
        }
    };

    const loadNotifications = async () => {
        try {
            const response = await notificationsAPI.getNotifications();
            if (response.data.success) {
                setNotifications(response.data.notifications);
                setUnreadCounts(response.data.chatCounts);
                setTotalUnread(response.data.totalUnread);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    };

    const markChatAsRead = async (chatId) => {
        try {
            // Mark on server
            await notificationsAPI.markChatAsRead(chatId);

            // Update local state
            setUnreadCounts(prev => {
                const newCounts = { ...prev };
                delete newCounts[chatId];
                return newCounts;
            });

            // Recalculate total
            const newTotal = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
            setTotalUnread(newTotal);

            // Emit socket event
            if (socket) {
                socket.emit('mark-chat-read', { chatId });
            }
        } catch (error) {
            console.error('Failed to mark chat as read:', error);
        }
    };

    useEffect(() => {
        if (user && token) {
            const newSocket = io('http://localhost:5005', {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling'],
                timeout: 20000,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                maxReconnectionAttempts: 5
            });

            newSocket.on('connect', () => {
                setConnected(true);
                setConnectionStatus('Connected');
                toast.success('Connected to chat!', {
                    icon: '🟢',
                    duration: 2000
                });
            });

            newSocket.on('disconnect', (reason) => {
                setConnected(false);
                setConnectionStatus('Disconnected');
                setTypingUsers(new Map());
                toast.error('Disconnected from chat', {
                    icon: '🔴',
                    duration: 3000
                });
            });

            newSocket.on('connect_error', (error) => {
                setConnectionStatus('Connection failed');
                // Don't show toast for every connection error to avoid spam
            });

            newSocket.on('user-joined', (userData) => {
                // User joined notification handled by toast
            });

            newSocket.on('message-history', (history) => {
                // Xabarlarni read status bilan yuklash
                setMessages(history);
            });

            newSocket.on('new-message', (message) => {
                // Chat list ni yangilash - private chat uchun
                if (message.room && message.room !== 'general' && message.room.includes('-')) {
                    // Bu private chat xabari
                    const otherUserId = message.room.split('-').find(id => id !== user.id);
                    if (otherUserId) {
                        setChatList(prev => {
                            const existingChat = prev.find(chat => chat.id === message.room);
                            if (existingChat) {
                                // Mavjud chatni yangilash
                                return prev.map(chat =>
                                    chat.id === message.room
                                        ? {
                                            ...chat,
                                            lastMessage: message.text || (message.type === 'image' ? '📷 Rasm' : message.type === 'video' ? '🎥 Video' : message.type === 'file' ? '📎 Fayl' : 'Xabar'),
                                            time: formatTime(message.timestamp),
                                            unread: message.user.id !== user.id ? (chat.unread || 0) + 1 : 0
                                        }
                                        : chat
                                );
                            } else {
                                // Yangi private chat yaratish
                                const otherUser = onlineUsers.find(u => u.id === otherUserId) ||
                                    allUsers.find(u => u.id === otherUserId);
                                if (otherUser) {
                                    const newPrivateChat = {
                                        id: message.room,
                                        name: otherUser.username,
                                        avatar: otherUser.avatar,
                                        type: 'private',
                                        targetUserId: otherUserId,
                                        lastMessage: message.text || (message.type === 'image' ? '📷 Rasm' : message.type === 'video' ? '🎥 Video' : message.type === 'file' ? '📎 Fayl' : 'Xabar'),
                                        time: formatTime(message.timestamp),
                                        unread: message.user.id !== user.id ? 1 : 0
                                    };
                                    return [...prev, newPrivateChat];
                                }
                            }
                            return prev;
                        });
                    }
                }

                setMessages(prev => {
                    // Agar bu xabar bizdan bo'lsa va tempId mavjud bo'lsa, optimistic xabarni almashtirish
                    if (message.tempId && message.user.id === user.id) {
                        return prev.map(msg =>
                            msg.id === message.tempId && msg.isOptimistic
                                ? {
                                    ...message,
                                    user: { ...message.user, avatar: userAvatar },
                                    isDelivered: true,
                                    isRead: false
                                }
                                : msg
                        );
                    }
                    // Aks holda oddiy qo'shish
                    return [...prev, {
                        ...message,
                        isDelivered: true,
                        isRead: false
                    }];
                });
            });

            // Message delivery confirmation
            newSocket.on('message-delivered', (data) => {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === data.tempId
                            ? { ...msg, isDelivered: true, isOptimistic: false }
                            : msg
                    )
                );
            });

            // Message read status listener
            newSocket.on('message-status-update', (data) => {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === data.messageId
                            ? { ...msg, status: data.status, readBy: data.readBy }
                            : msg
                    )
                );
            });

            // Private chat messages listener
            newSocket.on('private-message-history', (data) => {
                setMessages(data.messages || []);
            });

            // Group chat messages listener
            newSocket.on('group-message-history', (data) => {
                setMessages(data.messages || []);
            });

            newSocket.on('online-users', (users) => {
                setOnlineUsers(users);
            });

            newSocket.on('user-online', (userData) => {
                toast.success(`${userData.username} joined the chat`, {
                    icon: '👋',
                    duration: 3000
                });
            });

            newSocket.on('user-offline', (userData) => {
                toast(`${userData.username} left the chat`, {
                    icon: '👋',
                    duration: 3000
                });

                setTypingUsers(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(userData.id);
                    return newMap;
                });
            });

            newSocket.on('user-typing', (data) => {
                setTypingUsers(prev => {
                    const newMap = new Map(prev);
                    if (data.isTyping) {
                        newMap.set(data.user.id, {
                            ...data.user,
                            timestamp: new Date()
                        });
                    } else {
                        newMap.delete(data.user.id);
                    }
                    return newMap;
                });
            });

            newSocket.on('message-error', (error) => {
                toast.error(error.message, {
                    icon: '❌',
                    duration: 4000
                });
            });

            // Notification update listener
            newSocket.on('notification-update', (data) => {
                console.log('📢 Notification update received:', data);

                // Update unread counts
                setUnreadCounts(prev => ({
                    ...prev,
                    [data.chatId]: data.unreadCount
                }));

                // Update total unread count
                setTotalUnread(data.totalUnread);

                // Update chat list with unread count
                setChatList(prev =>
                    prev.map(chat =>
                        chat.id === data.chatId
                            ? { ...chat, unread: data.unreadCount }
                            : chat
                    )
                );

                // Show notification toast if not in current chat
                if (selectedChat?.id !== data.chatId && data.unreadCount > 0) {
                    toast(`Yangi xabar: ${data.chatId}`, {
                        icon: '💬',
                        duration: 3000
                    });
                }
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        }
    }, [user, token, userAvatar]);

    useEffect(() => {
        scrollToBottom();

        // Xabarlar ko'rinishi bilan avtomatik o'qish
        if (messages.length > 0 && socket && selectedChat) {
            const unreadMessages = messages.filter(msg =>
                msg.user.id !== user.id &&
                msg.status !== 'read'
            );

            if (unreadMessages.length > 0) {
                // 1 soniya kutib o'qilgan deb belgilash
                setTimeout(() => {
                    unreadMessages.forEach(msg => {
                        if (selectedChat.id === 'general') {
                            // General chat uchun
                            socket.emit('mark-message-read', msg.id);
                        } else {
                            // Private chat uchun
                            socket.emit('mark-message-read', msg.id);
                        }
                    });
                }, 1000);
            }
        }
    }, [messages, socket, selectedChat, user.id]);

    // Xabarlarni o'qilgan deb belgilash - faqat boshqa foydalanuvchilarning xabarlari uchun
    useEffect(() => {
        if (messages.length > 0 && socket && connected) {
            // Faqat boshqa foydalanuvchilarning o'qilmagan xabarlarini topish
            const unreadMessages = messages.filter(msg =>
                msg.user.id !== user.id && !msg.isRead && !msg.isOptimistic
            );

            if (unreadMessages.length > 0) {
                // 2 soniya kutib, xabarlarni o'qilgan deb belgilash
                clearTimeout(readTimeoutRef.current);
                readTimeoutRef.current = setTimeout(() => {
                    const messageIds = unreadMessages.map(msg => msg.id);

                    // Server ga xabarlar o'qilganini bildirish
                    socket.emit('mark-messages-read', {
                        messageIds: messageIds,
                        room: currentChatId
                    });

                    // Local state ni yangilash
                    setMessages(prevMessages =>
                        prevMessages.map(msg =>
                            messageIds.includes(msg.id)
                                ? { ...msg, isRead: true, readAt: new Date() }
                                : msg
                        )
                    );
                }, 2000);

                return () => clearTimeout(readTimeoutRef.current);
            }
        }
    }, [messages, socket, connected, user.id, currentChatId]);

    // Window focus/blur event handling for read status
    useEffect(() => {
        const handleFocus = () => {
            // Window focus bo'lganda o'qilmagan xabarlarni darhol o'qilgan deb belgilash
            if (socket && connected) {
                const unreadMessages = messages.filter(msg =>
                    msg.user.id !== user.id && !msg.isRead && !msg.isOptimistic
                );

                if (unreadMessages.length > 0) {
                    const messageIds = unreadMessages.map(msg => msg.id);

                    socket.emit('mark-messages-read', {
                        messageIds: messageIds,
                        room: currentChatId
                    });

                    setMessages(prevMessages =>
                        prevMessages.map(msg =>
                            messageIds.includes(msg.id)
                                ? { ...msg, isRead: true, readAt: new Date() }
                                : msg
                        )
                    );
                }
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            clearTimeout(readTimeoutRef.current);
        };
    }, [messages, socket, connected, user.id, currentChatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() && socket && connected) {
            const messageText = newMessage.trim();
            const tempId = Date.now(); // Vaqtinchalik ID

            // Darhol xabarni ko'rsatish (optimistic update)
            const optimisticMessage = {
                id: tempId,
                text: messageText,
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: userAvatar // Hozirgi avatar ni ishlatish
                },
                timestamp: new Date(),
                status: 'sent', // Dastlab sent status
                readBy: [],
                isDelivered: false, // Hali yuborilmagan
                isRead: false,
                isOptimistic: true // Bu optimistic xabar ekanligini belgilash
            };

            setMessages(prev => [...prev, optimisticMessage]);
            setNewMessage('');
            handleStopTyping();

            socket.emit('send-message', {
                text: messageText,
                chatId: selectedChat.id, // selectedChat.id ni ishlatish
                tempId: tempId // Server ga vaqtinchalik ID yuborish
            });
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!isTyping && socket && connected && e.target.value.trim()) {
            setIsTyping(true);
            socket.emit('typing', {
                isTyping: true,
                chatId: currentChatId
            });
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            handleStopTyping();
        }, 1500);
    };

    const handleStopTyping = () => {
        if (isTyping && socket && connected) {
            setIsTyping(false);
            socket.emit('typing', {
                isTyping: false,
                chatId: selectedChat?.id || 'general'
            });
        }
        clearTimeout(typingTimeoutRef.current);
    };

    // Image handling functions
    const handleImageSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // File type validation
            if (!file.type.startsWith('image/')) {
                toast.error('Faqat rasm fayllari ruxsat etilgan');
                return;
            }

            // File size validation (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Rasm hajmi 5MB dan kichik bo\'lishi kerak');
                return;
            }

            setSelectedImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageUpload = async () => {
        if (!selectedImage || !socket || !connected) return;

        try {
            setUploadingImage(true);

            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await imageAPI.uploadImage(formData);

            if (response.data.success) {
                const tempId = Date.now();

                // Send image message
                const imageMessage = {
                    text: '',
                    type: 'image',
                    imageUrl: response.data.imageUrl,
                    chatId: selectedChat.id,
                    tempId: tempId
                };

                // Create optimistic message
                const optimisticMessage = {
                    id: tempId,
                    text: '',
                    type: 'image',
                    imageUrl: `http://localhost:5005${response.data.imageUrl}`,
                    user: {
                        id: user.id,
                        username: user.username,
                        avatar: userAvatar
                    },
                    timestamp: new Date(),
                    status: 'sent',
                    readBy: [],
                    isDelivered: false,
                    isRead: false,
                    isOptimistic: true
                };

                setMessages(prev => [...prev, optimisticMessage]);

                socket.emit('send-message', imageMessage);

                // Clear image selection
                setSelectedImage(null);
                setImagePreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }

                toast.success('Rasm yuborildi');
            }
        } catch (error) {
            console.error('Image upload error:', error);
            toast.error('Rasm yuklashda xato');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleCancelImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Video handling functions
    const handleVideoSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // File type validation
            if (!file.type.startsWith('video/')) {
                toast.error('Faqat video fayllari ruxsat etilgan');
                return;
            }

            // File size validation (50MB)
            if (file.size > 50 * 1024 * 1024) {
                toast.error('Video hajmi 50MB dan kichik bo\'lishi kerak');
                return;
            }

            setSelectedVideo(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setVideoPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVideoUpload = async () => {
        if (!selectedVideo || !socket || !connected) return;

        try {
            setUploadingVideo(true);

            const formData = new FormData();
            formData.append('video', selectedVideo);

            const response = await videoAPI.uploadVideo(formData);

            if (response.data.success) {
                const tempId = Date.now();

                // Send video message
                const videoMessage = {
                    text: '',
                    type: 'video',
                    videoUrl: response.data.videoUrl,
                    chatId: selectedChat.id,
                    tempId: tempId
                };

                // Create optimistic message
                const optimisticMessage = {
                    id: tempId,
                    text: '',
                    type: 'video',
                    videoUrl: `http://localhost:5005${response.data.videoUrl}`,
                    user: {
                        id: user.id,
                        username: user.username,
                        avatar: userAvatar
                    },
                    timestamp: new Date(),
                    status: 'sent',
                    readBy: [],
                    isDelivered: false,
                    isRead: false,
                    isOptimistic: true
                };

                setMessages(prev => [...prev, optimisticMessage]);

                socket.emit('send-message', videoMessage);

                // Clear video selection
                setSelectedVideo(null);
                setVideoPreview(null);
                if (videoInputRef.current) {
                    videoInputRef.current.value = '';
                }

                toast.success('Video yuborildi');
            }
        } catch (error) {
            console.error('Video upload error:', error);
            toast.error('Video yuklashda xato');
        } finally {
            setUploadingVideo(false);
        }
    };

    const handleCancelVideo = () => {
        setSelectedVideo(null);
        setVideoPreview(null);
        if (videoInputRef.current) {
            videoInputRef.current.value = '';
        }
    };

    // File upload functions
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        console.log('Selected file:', file);

        if (file) {
            console.log('File details:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            });

            if (file.size > 50 * 1024 * 1024) {
                toast.error('Fayl hajmi 50MB dan oshmasligi kerak');
                return;
            }

            // Fayl turini tekshirish - barcha fayl turlarini qo'llab-quvvatlash
            const fileExtension = file.name.split('.').pop().toLowerCase();

            // Faqat xavfli fayl turlarini rad etish
            const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'msi'];

            if (dangerousExtensions.includes(fileExtension)) {
                toast.error('Xavfsizlik sababli bu fayl turi qo\'llab-quvvatlanmaydi');
                console.log('Dangerous file type blocked:', fileExtension);
                return;
            }

            console.log('File accepted:', {
                type: file.type || 'unknown',
                extension: fileExtension,
                size: file.size
            });

            setSelectedFile(file);
            console.log('File selected successfully');
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile || !socket || !connected) {
            console.log('Upload conditions not met:', {
                selectedFile: !!selectedFile,
                socket: !!socket,
                connected: connected
            });
            return;
        }

        try {
            console.log('Starting file upload:', selectedFile.name);
            setUploadingFile(true);
            setUploadProgress(0);

            const formData = new FormData();
            formData.append('file', selectedFile);

            console.log('FormData created, sending to server...');

            const response = await fileAPI.uploadFile(formData, (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(progress);
                console.log('Upload progress:', progress + '%');
            });

            console.log('Server response:', response.data);

            if (response.data.success) {
                const tempId = Date.now();

                // Send file message
                const fileMessage = {
                    text: '',
                    type: 'file',
                    fileUrl: response.data.fileUrl,
                    fileName: response.data.originalName,
                    fileSize: response.data.formattedSize,
                    fileType: response.data.fileType,
                    mimeType: response.data.mimeType,
                    chatId: selectedChat.id,
                    tempId: tempId
                };

                console.log('Sending file message:', fileMessage);

                // Create optimistic message
                const optimisticMessage = {
                    id: tempId,
                    text: '',
                    type: 'file',
                    fileUrl: `http://localhost:5005${response.data.fileUrl}`,
                    fileName: response.data.originalName,
                    fileSize: response.data.formattedSize,
                    fileType: response.data.fileType,
                    mimeType: response.data.mimeType,
                    user: {
                        id: user.id,
                        username: user.username,
                        avatar: userAvatar
                    },
                    timestamp: new Date(),
                    status: 'sent',
                    readBy: [],
                    isDelivered: false,
                    isRead: false,
                    isOptimistic: true
                };

                setMessages(prev => [...prev, optimisticMessage]);

                socket.emit('send-message', fileMessage);

                // Clear file selection
                setSelectedFile(null);
                setUploadProgress(0);
                if (documentInputRef.current) {
                    documentInputRef.current.value = '';
                }

                toast.success('Fayl yuborildi');
                console.log('File upload completed successfully');
            } else {
                console.error('Server returned error:', response.data);
                toast.error(response.data.message || 'Fayl yuklashda xato');
            }
        } catch (error) {
            console.error('File upload error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            const errorMessage = error.response?.data?.message || error.message || 'Fayl yuklashda xato';
            toast.error(errorMessage);
        } finally {
            setUploadingFile(false);
            setUploadProgress(0);
        }
    };

    const handleCancelFile = () => {
        setSelectedFile(null);
        setUploadProgress(0);
        if (documentInputRef.current) {
            documentInputRef.current.value = '';
        }
    };

    // File icon function
    const getFileIcon = (fileType, mimeType) => {
        switch (fileType) {
            case 'pdf':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                );
            case 'document':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                );
            case 'spreadsheet':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                );
            case 'presentation':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                );
            case 'archive':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                );
            case 'audio':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                    </svg>
                );
            case 'text':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                );
            default:
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                );
        }
    };

    // Download file function
    const handleFileDownload = async (fileUrl, fileName) => {
        try {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Fayl yuklab olishda xato');
        }
    };

    const handleLogout = async () => {
        if (socket) {
            socket.close();
        }
        await logout();
        toast.success('Logged out successfully');
    };

    const handleUserSelect = (selectedUser) => {
        // Private chat yaratish
        const chatId = [user.id, selectedUser.id].sort().join('-');
        const privateChat = {
            id: chatId,
            name: selectedUser.username,
            avatar: selectedUser.avatar,
            type: 'private',
            targetUserId: selectedUser.id,
            lastMessage: 'Yangi chat',
            time: 'Hozir',
            unread: 0
        };

        // Chat list ga qo'shish (agar mavjud bo'lmasa)
        setChatList(prev => {
            const exists = prev.find(chat => chat.id === chatId);
            if (!exists) {
                return [...prev, privateChat];
            }
            return prev;
        });

        setSelectedChat(privateChat);

        // Private chat xabarlarini yuklash
        if (socket) {
            socket.emit('get-private-messages', { targetUserId: selectedUser.id });
        }

        toast.success(`${selectedUser.username} bilan chat boshlandi`);
    };

    const handleGroupCreated = (newGroup) => {
        // Add new group to groups list
        setGroups(prev => [...prev, newGroup]);

        // Add to chat list
        const groupChat = {
            id: newGroup.id,
            name: newGroup.name,
            avatar: newGroup.avatar,
            type: 'group',
            memberCount: newGroup.memberCount,
            lastMessage: 'Guruh yaratildi',
            time: formatTime(newGroup.createdAt),
            unread: 0
        };

        setChatList(prev => [...prev, groupChat]);

        // Select the new group
        setSelectedChat({
            id: newGroup.id,
            name: newGroup.name,
            avatar: newGroup.avatar,
            type: 'group'
        });

        // Join the group room
        if (socket) {
            socket.emit('join-group', { groupId: newGroup.id });
            socket.emit('get-group-messages', { groupId: newGroup.id });
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Bugun';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Kecha';
        } else {
            return date.toLocaleDateString('uz-UZ', {
                day: 'numeric',
                month: 'long'
            });
        }
    };

    const shouldShowDateSeparator = (currentMessage, previousMessage) => {
        if (!previousMessage) return true;

        const currentDate = new Date(currentMessage.timestamp).toDateString();
        const previousDate = new Date(previousMessage.timestamp).toDateString();

        return currentDate !== previousDate;
    };

    if (!user) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading user data...</p>
            </div>
        );
    }

    return (
        <div className={`chat-container ${selectedChat ? 'chat-selected' : ''}`}>
            {/* LEFT PANEL - Chat List */}
            <div className="left-panel">
                <div className="left-panel-header">
                    <div className="header-left">
                        <div className="telegram-logo">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="telegram-icon">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-.38.24-1.07.7-.1.07-.27.04-.35-.04-.26-.25-.97-.62-1.54-.9-.32-.16-.57-.25-.78-.23-.46.04-.85.26-.85.26s.33-.21.88-.47c.55-.25.85-.4.85-.4s-.30-.14-.85-.4c-.55-.25-.88-.47-.88-.47s.39-.22.85-.26c.21-.02.46.07.78.23.57.28 1.28.65 1.54.9.08.08.25.11.35.04.69-.46.98-.68 1.07-.7.07-.01.15.03.21.02a.2.2 0 01.05.18c-.05.21-2.61 2.54-2.76 2.69-.57.58-1.21.94-.22 1.59.85.56 1.35.92 2.23 1.5.56.37 1 .8 1.58.75.26-.03.54-.28.68-1.03.33-1.77.98-5.61 1.13-7.19.02-.22.06-.58-.04-.8-.08-.18-.22-.23-.37-.24-.4-.02-1.01.15-4.64 1.69z" />
                            </svg>
                        </div>
                        <button className="exit-button" onClick={handleLogout} title="Chiqish">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                            </svg>
                        </button>
                    </div>
                    <div className="user-profile-section" onClick={() => setShowProfile(true)}>
                        <img src={userAvatar} alt={user.username} className="user-avatar" />
                        <div className="user-info">
                            <h3>{user.username}</h3>
                            <div className={`user-status ${connected ? 'online' : 'offline'}`}>
                                {connected ? 'Online' : 'Offline'}
                            </div>
                        </div>
                        {totalUnread > 0 && (
                            <div className="total-unread-badge">
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </div>
                        )}
                    </div>
                    <div className="header-actions">
                        <button
                            className="header-btn"
                            onClick={() => setShowSearch(true)}
                            title="Search Users"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                        </button>
                        <button
                            className="header-btn"
                            onClick={() => setShowCreateGroup(true)}
                            title="Guruh yaratish"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L19 5L17 7V9C16.4 9 16 9.4 16 10V16C16 16.6 16.4 17 17 17H19C19.6 17 20 16.6 20 16V10C20 9.4 19.6 9 19 9ZM15 12C16.1 12 17 12.9 17 14C17 15.1 16.1 16 15 16C13.9 16 13 15.1 13 14C13 12.9 13.9 12 15 12ZM9 12C10.1 12 11 12.9 11 14C11 15.1 10.1 16 9 16C7.9 16 7 15.1 7 14C7 12.9 7.9 12 9 12ZM9 18C6.3 18 4 20.3 4 23H14C14 20.3 11.7 18 9 18ZM15 18C12.3 18 10 20.3 10 23H20C20 20.3 17.7 18 15 18Z" />
                            </svg>
                        </button>
                        <button
                            className="header-btn"
                            onClick={() => setShowSettings(true)}
                            title="Sozlamalar"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="search-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search chats..."
                    />
                </div>

                <div className="chat-list">
                    {chatList.map(chat => (
                        <div
                            key={chat.id}
                            className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedChat(chat);

                                // Mark chat as read when selected
                                if (chat.unread > 0) {
                                    markChatAsRead(chat.id);
                                }

                                // Agar general chat bo'lsa, general xabarlarni yuklash
                                if (chat.id === 'general') {
                                    // General chat xabarlarini qayta yuklash
                                    if (socket) {
                                        socket.emit('get-group-messages', { groupId: 'general' });
                                    }
                                } else if (chat.type === 'group') {
                                    // Group chat bo'lsa, group xabarlarni yuklash
                                    if (socket) {
                                        socket.emit('join-group', { groupId: chat.id });
                                        socket.emit('get-group-messages', { groupId: chat.id });
                                    }
                                } else {
                                    // Private chat bo'lsa, private xabarlarni yuklash
                                    if (socket && chat.targetUserId) {
                                        socket.emit('get-private-messages', { targetUserId: chat.targetUserId });
                                    }
                                }
                            }}
                        >
                            <div className="chat-item-avatar-container">
                                <img src={chat.avatar} alt={chat.name} className="chat-item-avatar" />
                                {chat.icon && chat.type === 'group' && (
                                    <div className="chat-item-icon">{chat.icon}</div>
                                )}
                            </div>
                            <div className="chat-item-content">
                                <div className="chat-item-header">
                                    <h4 className="chat-item-name">{chat.name}</h4>
                                    <span className="chat-item-time">{chat.time}</span>
                                </div>
                                <div className="chat-item-footer">
                                    <p className="chat-item-message">
                                        {chat.lastMessage}
                                    </p>
                                    {(unreadCounts[chat.id] || 0) > 0 && (
                                        <span className="chat-item-unread">{unreadCounts[chat.id] > 99 ? '99+' : unreadCounts[chat.id]}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL - Chat Messages */}
            <div className="right-panel">
                {selectedChat ? (
                    <>
                        <div className="chat-header-right">
                            <button className="back-button mobile-only" onClick={() => setSelectedChat(null)} title="Orqaga">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                                </svg>
                            </button>
                            <div className="chat-info">
                                <div className="chat-info-avatar-container">
                                    <img
                                        src={selectedChat.avatar}
                                        alt={selectedChat.name}
                                        className="chat-info-avatar"
                                    />
                                    {selectedChat.icon && selectedChat.type === 'group' && (
                                        <div className="chat-info-icon">{selectedChat.icon}</div>
                                    )}
                                </div>
                                <div className="chat-details">
                                    <h2>{selectedChat.name}</h2>
                                    <div className={`chat-status ${connected ? 'online' : 'offline'}`}>
                                        {selectedChat.type === 'group'
                                            ? `${onlineUsers.length} members, ${onlineUsers.length} online`
                                            : selectedChat.type === 'private'
                                                ? (
                                                    onlineUsers.find(u => u.id === selectedChat.targetUserId)
                                                        ? <><span className="status-dot online"></span>online</>
                                                        : <><span className="status-dot offline"></span>last seen recently</>
                                                )
                                                : connected ? 'online' : 'last seen recently'
                                        }
                                    </div>
                                </div>
                            </div>
                            <div className="chat-actions">
                                <button className="header-action-btn" title="Video qo'ng'iroq">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                                    </svg>
                                </button>
                                <button className="header-action-btn" title="Audio qo'ng'iroq">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                </button>
                                <button className="header-action-btn" title="Qo'shimcha">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                    </svg>
                                </button>
                                <button className="chat-exit-button" onClick={handleLogout} title="Chatdan chiqish">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                    </svg>
                                </button>
                                <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                                    <div className="status-dot"></div>
                                    <span className="status-text">{connectionStatus}</span>
                                </div>
                            </div>
                        </div>

                        <div className="messages-container" ref={messagesContainerRef}>
                            {messages.length === 0 ? (
                                <div className="empty-chat">
                                    <div className="empty-icon">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="chat-icon">
                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                                        </svg>
                                    </div>
                                    <h3>Xush kelibsiz!</h3>
                                    <p>Quyidagi maydondan xabar yozing va suhbatni boshlang.</p>
                                </div>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={message.id || message._id}>
                                        {shouldShowDateSeparator(message, messages[index - 1]) && (
                                            <div className="date-separator">
                                                <span className="date-text">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="date-icon">
                                                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                                                    </svg>
                                                    {formatDate(message.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`message ${message.user.id === user.id ? 'own' : 'other'}`}>
                                            <div className="message-wrapper">
                                                <img
                                                    src={message.user.id === user.id ? userAvatar : message.user.avatar}
                                                    alt={message.user.username}
                                                    className="message-avatar"
                                                />
                                                <div className="message-bubble">
                                                    <div className="message-content">
                                                        <div className="message-header">
                                                            <span className="message-username">{message.user.username}</span>
                                                        </div>
                                                        <div className="message-text">
                                                            {/* Text message */}
                                                            {message.type === 'text' || !message.type ? (
                                                                message.text
                                                            ) : null}

                                                            {/* Image message */}
                                                            {message.type === 'image' && message.imageUrl && (
                                                                <div className="message-image">
                                                                    <img
                                                                        src={message.imageUrl}
                                                                        alt="Yuborilgan rasm"
                                                                        className="chat-image"
                                                                        onClick={() => window.open(message.imageUrl, '_blank')}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Video message */}
                                                            {message.type === 'video' && message.videoUrl && (
                                                                <div className="message-video">
                                                                    <video
                                                                        src={message.videoUrl}
                                                                        className="chat-video"
                                                                        controls
                                                                        preload="metadata"
                                                                    >
                                                                        Brauzeringiz video ni qo'llab-quvvatlamaydi.
                                                                    </video>
                                                                </div>
                                                            )}

                                                            {/* File message */}
                                                            {message.type === 'file' && message.fileUrl && (
                                                                <div className="message-file">
                                                                    <div className="file-container">
                                                                        <div className="file-icon">
                                                                            {getFileIcon(message.fileType, message.mimeType)}
                                                                        </div>
                                                                        <div className="file-info">
                                                                            <div className="file-name">{message.fileName}</div>
                                                                            <div className="file-size">{message.fileSize}</div>
                                                                        </div>
                                                                        <button
                                                                            className="file-download-btn"
                                                                            onClick={() => handleFileDownload(message.fileUrl, message.fileName)}
                                                                            title="Yuklab olish"
                                                                        >
                                                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                                                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="message-footer">
                                                            <span className="message-time">{formatTime(message.timestamp)}</span>
                                                            {message.user.id === user.id && (
                                                                <div className="message-status" title={
                                                                    message.status === 'read' ? "O'qildi" : "Yuborildi"
                                                                }>
                                                                    {message.status === 'read' ? (
                                                                        // Ikki galochka - o'qilgan
                                                                        <>
                                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="status-icon read-first">
                                                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                            </svg>
                                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="status-icon read-second">
                                                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                            </svg>
                                                                        </>
                                                                    ) : (
                                                                        // Bitta galochka - yuborilgan lekin o'qilmagan
                                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="status-icon sent">
                                                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {Array.from(typingUsers.values()).length > 0 && (
                            <div className="typing-indicator">
                                <div className="typing-avatars">
                                    {Array.from(typingUsers.values()).slice(0, 3).map(typingUser => (
                                        <img
                                            key={typingUser.id}
                                            src={typingUser.id === user.id ? userAvatar : typingUser.avatar}
                                            alt={typingUser.username}
                                            className="typing-avatar"
                                            title={`${typingUser.username} is typing...`}
                                        />
                                    ))}
                                </div>
                                <div className="typing-text">
                                    <span>
                                        {Array.from(typingUsers.values()).length === 1
                                            ? `${Array.from(typingUsers.values())[0].username} is typing`
                                            : Array.from(typingUsers.values()).length === 2
                                                ? `${Array.from(typingUsers.values())[0].username} and ${Array.from(typingUsers.values())[1].username} are typing`
                                                : `${Array.from(typingUsers.values()).length} people are typing`
                                        }
                                    </span>
                                    <div className="typing-dots">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="message-input-container">
                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="image-preview-container">
                                    <div className="image-preview">
                                        <img src={imagePreview} alt="Preview" className="preview-image" />
                                        <div className="preview-actions">
                                            <button
                                                type="button"
                                                className="preview-btn cancel-btn"
                                                onClick={handleCancelImage}
                                                disabled={uploadingImage}
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="preview-btn send-btn"
                                                onClick={handleImageUpload}
                                                disabled={uploadingImage}
                                            >
                                                {uploadingImage ? (
                                                    <div className="spinner-small"></div>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Video Preview */}
                            {videoPreview && (
                                <div className="video-preview-container">
                                    <div className="video-preview">
                                        <video src={videoPreview} className="preview-video" controls />
                                        <div className="preview-actions">
                                            <button
                                                type="button"
                                                className="preview-btn cancel-btn"
                                                onClick={handleCancelVideo}
                                                disabled={uploadingVideo}
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="preview-btn send-btn"
                                                onClick={handleVideoUpload}
                                                disabled={uploadingVideo}
                                            >
                                                {uploadingVideo ? (
                                                    <div className="spinner-small"></div>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* File Preview */}
                            {selectedFile && (
                                <div className="file-preview-container">
                                    <div className="file-preview">
                                        <div className="file-preview-info">
                                            <div className="file-preview-icon">
                                                {getFileIcon('file', selectedFile.type)}
                                            </div>
                                            <div className="file-preview-details">
                                                <div className="file-preview-name">{selectedFile.name}</div>
                                                <div className="file-preview-size">
                                                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                                </div>
                                            </div>
                                        </div>
                                        {uploadingFile && (
                                            <div className="upload-progress">
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    ></div>
                                                </div>
                                                <div className="progress-text">{uploadProgress}%</div>
                                            </div>
                                        )}
                                        <div className="preview-actions">
                                            <button
                                                type="button"
                                                className="preview-btn cancel-btn"
                                                onClick={handleCancelFile}
                                                disabled={uploadingFile}
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="preview-btn send-btn"
                                                onClick={handleFileUpload}
                                                disabled={uploadingFile}
                                            >
                                                {uploadingFile ? (
                                                    <div className="spinner-small"></div>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form className="message-input-form" onSubmit={handleSendMessage}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                                <input
                                    type="file"
                                    ref={videoInputRef}
                                    onChange={handleVideoSelect}
                                    accept="video/*"
                                    style={{ display: 'none' }}
                                />
                                <input
                                    type="file"
                                    ref={documentInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    className="input-icon-btn"
                                    title="Rasm yuklash"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={!connected}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="input-icon-btn"
                                    title="Video yuklash"
                                    onClick={() => videoInputRef.current?.click()}
                                    disabled={!connected}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="input-icon-btn"
                                    title="Fayl yuklash"
                                    onClick={() => documentInputRef.current?.click()}
                                    disabled={!connected}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                    </svg>
                                </button>
                                <textarea
                                    className="message-input"
                                    placeholder={connected ? "Xabar yozing..." : "Ulanmoqda..."}
                                    value={newMessage}
                                    onChange={handleTyping}
                                    onBlur={handleStopTyping}
                                    disabled={!connected}
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                                <button type="button" className="input-icon-btn" title="Emoji">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2ZM12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20ZM16.5,12C16.5,11.17 15.83,10.5 15,10.5C14.17,10.5 13.5,11.17 13.5,12C13.5,12.83 14.17,13.5 15,13.5C15.83,13.5 16.5,12.83 16.5,12ZM10.5,12C10.5,11.17 9.83,10.5 9,10.5C8.17,10.5 7.5,11.17 7.5,12C7.5,12.83 8.17,13.5 9,13.5C9.83,13.5 10.5,12.83 10.5,12ZM12,17.5C14.33,17.5 16.31,16.04 17,14H7C7.69,16.04 9.67,17.5 12,17.5Z" />
                                    </svg>
                                </button>
                                <button
                                    type="submit"
                                    className="send-button"
                                    disabled={!newMessage.trim() || !connected}
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="no-chat-content">
                            <div className="no-chat-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C13.6569 2 15 3.34315 15 5C15 6.65685 13.6569 8 12 8C10.3431 8 9 6.65685 9 5C9 3.34315 10.3431 2 12 2ZM20.2929 9.29289C20.6834 8.90237 21.3166 8.90237 21.7071 9.29289C22.0976 9.68342 22.0976 10.3166 21.7071 10.7071L17.7071 14.7071C17.3166 15.0976 16.6834 15.0976 16.2929 14.7071C15.9024 14.3166 15.9024 13.6834 16.2929 13.2929L20.2929 9.29289ZM2.29289 9.29289C2.68342 8.90237 3.31658 8.90237 3.70711 9.29289L7.70711 13.2929C8.09763 13.6834 8.09763 14.3166 7.70711 14.7071C7.31658 15.0976 6.68342 15.0976 6.29289 14.7071L2.29289 10.7071C1.90237 10.3166 1.90237 9.68342 2.29289 9.29289ZM12 10C14.7614 10 17 12.2386 17 15V16C17 18.7614 14.7614 21 12 21C9.23858 21 7 18.7614 7 16V15C7 12.2386 9.23858 10 12 10Z" />
                                </svg>
                            </div>
                            <h3>Chat tanlang</h3>
                            <p>Suhbatni boshlash uchun chap tarafdan chat tanlang yoki yangi chat yarating</p>
                        </div>
                    </div>
                )}
            </div>

            {showProfile && (
                <Profile
                    onClose={() => {
                        setShowProfile(false);
                        // Avatar ni yangilash
                        const savedAvatar = localStorage.getItem('userAvatar');
                        if (savedAvatar && savedAvatar !== 'null') {
                            setUserAvatar(savedAvatar);
                        }
                    }}
                />
            )}

            {showSearch && (
                <Search
                    onClose={() => setShowSearch(false)}
                    onSelectUser={handleUserSelect}
                />
            )}

            {showSettings && (
                <Settings
                    onClose={() => setShowSettings(false)}
                />
            )}

            {showCreateGroup && (
                <CreateGroup
                    onClose={() => setShowCreateGroup(false)}
                    onGroupCreated={handleGroupCreated}
                />
            )}
        </div>
    );
};

export default Chat;