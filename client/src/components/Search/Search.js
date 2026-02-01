import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Search.css';

const Search = ({ onClose, onSelectUser }) => {
    const [allUsers, setAllUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [offlineUsers, setOfflineUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        // Focus input when component mounts
        if (inputRef.current) {
            inputRef.current.focus();
        }

        // Load all users
        loadAllUsers();
    }, []);

    const loadAllUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5005/api/users/all', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const users = response.data.users;
                setAllUsers(users);

                // Separate online and offline users
                const online = users.filter(user => user.isOnline);
                const offline = users.filter(user => !user.isOnline);

                setOnlineUsers(online);
                setOfflineUsers(offline);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Foydalanuvchilarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (user) => {
        onSelectUser(user);
        onClose();
    };

    const formatLastSeen = (lastSeen) => {
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'Hozir online';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} daqiqa oldin ko'rilgan`;
        } else if (diffInMinutes < 1440) { // 24 hours
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours} soat oldin ko'rilgan`;
        } else {
            const days = Math.floor(diffInMinutes / 1440);
            return `${days} kun oldin ko'rilgan`;
        }
    };

    return (
        <div className="search-overlay">
            <div className="search-modal">
                <div className="search-header">
                    <h2>Foydalanuvchilar</h2>
                    <button className="close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                <div className="search-content">
                    <div className="search-results">
                        {loading && (
                            <div className="loading-container">
                                <div className="spinner"></div>
                                <p>Yuklanmoqda...</p>
                            </div>
                        )}

                        {!loading && onlineUsers.length > 0 && (
                            <div className="users-section">
                                <h3 className="section-title">
                                    <span className="online-indicator"></span>
                                    Online foydalanuvchilar ({onlineUsers.length})
                                </h3>
                                {onlineUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="user-item"
                                        onClick={() => handleUserSelect(user)}
                                    >
                                        <div className="user-avatar-container">
                                            <img
                                                src={user.avatar}
                                                alt={user.username}
                                                className="user-avatar"
                                            />
                                        </div>
                                        <div className="user-info">
                                            <div className="user-name">{user.username}</div>
                                            <div className="user-status online">Online</div>
                                        </div>
                                        <div className="user-actions">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && offlineUsers.length > 0 && (
                            <div className="users-section">
                                <h3 className="section-title">
                                    <span className="offline-indicator"></span>
                                    Offline foydalanuvchilar ({offlineUsers.length})
                                </h3>
                                {offlineUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="user-item offline"
                                        onClick={() => handleUserSelect(user)}
                                    >
                                        <div className="user-avatar-container">
                                            <img
                                                src={user.avatar}
                                                alt={user.username}
                                                className="user-avatar"
                                            />
                                        </div>
                                        <div className="user-info">
                                            <div className="user-name">{user.username}</div>
                                            <div className="user-status offline">{formatLastSeen(user.lastSeen)}</div>
                                        </div>
                                        <div className="user-actions">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && allUsers.length === 0 && (
                            <div className="no-users">
                                <div className="no-users-icon">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4h2v-7.5c0-.83.67-1.5 1.5-1.5S12 9.67 12 10.5V11h2.5c.83 0 1.5.67 1.5 1.5V18h2v-6.5c0-1.38-1.12-2.5-2.5-2.5H13V9.5c0-1.38-1.12-2.5-2.5-2.5S8 8.12 8 9.5V11H4.5C3.67 11 3 11.67 3 12.5V18h1z" />
                                    </svg>
                                </div>
                                <p>Hozirda boshqa foydalanuvchilar mavjud emas</p>
                                <p className="suggestion">Keyinroq qayta urinib ko'ring</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Search;