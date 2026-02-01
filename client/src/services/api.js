import axios from 'axios';
import { API_URL, API_BASE_URL } from './config';

export const BASE_URL = API_BASE_URL;

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API calls
export const authAPI = {
    register: (userData) => api.post('/auth/register', userData),
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    updateProfile: (profileData) => api.put('/auth/me/update', profileData),
    updatePhoto: (photoData) => api.put('/auth/me/photo', photoData),
    uploadAvatar: (formData) => {
        return api.post('/auth/me/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// Image upload API
export const imageAPI = {
    uploadImage: (formData) => {
        return api.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// Video upload API
export const videoAPI = {
    uploadVideo: (formData) => {
        return api.post('/upload/video', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// File upload API
export const fileAPI = {
    uploadFile: (formData, onUploadProgress) => {
        return api.post('/upload/file', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: onUploadProgress
        });
    },
    downloadFile: (filename) => {
        return api.get(`/uploads/${filename}`, {
            responseType: 'blob'
        });
    }
};

// Users API calls
export const usersAPI = {
    search: (query) => api.get(`/users/search?query=${encodeURIComponent(query)}`),
};

// Messages API calls
export const messagesAPI = {
    getMessages: (chatId, page = 1, limit = 50) =>
        api.get(`/messages/${chatId}?page=${page}&limit=${limit}`),
    sendMessage: (messageData) => api.post('/messages/send', messageData),
    editMessage: (messageId, text) => api.put(`/messages/${messageId}/edit`, { text }),
    deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
    markAsRead: (chatId) => api.post(`/messages/${chatId}/read`),
};

// Chats API calls
export const chatsAPI = {
    getChats: () => api.get('/chats'),
    createPrivateChat: (userId) => api.post('/chats/private', { userId }),
};

// Notifications API calls
export const notificationsAPI = {
    getNotifications: () => api.get('/notifications'),
    markAsRead: (notificationIds) => api.post('/notifications/read', { notificationIds }),
    markChatAsRead: (chatId) => api.post(`/notifications/chat/${chatId}/read`),
    getUnreadCounts: () => api.get('/notifications/unread'),
};

export default api;