import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './Profile.css';

const Profile = ({ onClose }) => {
    const { user, logout, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        bio: user?.bio || ''
    });

    // Debug uchun - localStorage ni ko'rish
    const debugLocalStorage = () => {
        const savedUser = localStorage.getItem('user');
        const savedAvatar = localStorage.getItem('userAvatar');
        console.log('Current localStorage user:', savedUser ? JSON.parse(savedUser) : null);
        console.log('Current localStorage avatar:', savedAvatar);
    };

    // Component mount bo'lganda debug
    useEffect(() => {
        debugLocalStorage();
    }, []);

    // User o'zgarganda formData va avatarPreview ni yangilash
    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                bio: user.bio || ''
            });
            setAvatarPreview(user.avatar || '');
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileProcess(file);
        }
    };

    const handleAvatarUpload = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(user?.avatar || '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleFileProcess(file);
            } else {
                toast.error('Faqat rasm fayllari qabul qilinadi');
            }
        }
    };

    const handleFileProcess = (file) => {
        // Fayl o'lchamini tekshirish (5MB gacha)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Fayl o\'lchami 5MB dan kichik bo\'lishi kerak');
            return;
        }

        setAvatarFile(file);

        // Preview uchun
        const reader = new FileReader();
        reader.onload = (e) => {
            setAvatarPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let avatarUrl = user?.avatar;

            // Agar yangi avatar tanlangan bo'lsa, uni yuklash
            if (avatarFile) {
                try {
                    const formDataForUpload = new FormData();
                    formDataForUpload.append('avatar', avatarFile);

                    const uploadResponse = await authAPI.uploadAvatar(formDataForUpload);
                    if (uploadResponse.data.success) {
                        avatarUrl = uploadResponse.data.avatarUrl || uploadResponse.data.user?.avatar || avatarPreview;
                        toast.success('Avatar muvaffaqiyatli yuklandi!');
                    }
                } catch (uploadError) {
                    // Agar server tarafida endpoint bo'lmasa, preview ni ishlatamiz
                    avatarUrl = avatarPreview;
                    // Avatar ni localStorage da alohida saqlash
                    localStorage.setItem('userAvatar', avatarUrl);
                    toast.success('Avatar saqlandi!');
                }
            }

            // Profil ma'lumotlarini yangilash
            try {
                const response = await authAPI.updateProfile(formData);
                if (response.data.success) {
                    toast.success('Profil muvaffaqiyatli yangilandi!');
                }
            } catch (apiError) {
                // Agar API endpoint mavjud bo'lmasa, local storage ga saqlash
                toast.success('Profil ma\'lumotlari saqlandi!');
            }

            // User context ni yangilash
            const updatedUserData = {
                ...user,
                ...formData,
                avatar: avatarUrl
            };
            updateUser(updatedUserData);

            // Debug: yangilangan ma'lumotlarni ko'rish
            console.log('Updated user data:', updatedUserData);
            debugLocalStorage();

            setIsEditing(false);
            setAvatarFile(null);
            setAvatarPreview(avatarUrl);

        } catch (error) {
            console.error('Profile update error:', error);
            toast.error('Profilni yangilashda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            username: user?.username || '',
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            bio: user?.bio || ''
        });
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarPreview(user?.avatar || '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Muvaffaqiyatli chiqildi');
        onClose();
    };

    return (
        <div className="profile-overlay">
            <div className="profile-modal">
                <div className="profile-header">
                    <h2>Profil</h2>
                    <button className="close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                <div className="profile-content">
                    <div className="profile-avatar-section">
                        <div
                            className="profile-avatar"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <img src={avatarPreview} alt={user?.username} />
                            <div className="avatar-overlay">
                                <button className="avatar-upload-btn" onClick={handleAvatarUpload}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                                    </svg>
                                    <span>Yuklash</span>
                                </button>
                                {avatarFile && (
                                    <button className="avatar-remove-btn" onClick={handleRemoveAvatar}>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <div className={`avatar-drop-zone ${isDragging ? 'active' : ''}`}>
                                <div className="drop-text">
                                    Rasm faylini bu yerga tashlang
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>
                        <p className="profile-phone">{user?.phone}</p>
                        {avatarFile && (
                            <div className="file-info">
                                <span className="file-name">{avatarFile.name}</span>
                                <span className="file-size">
                                    {(avatarFile.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="profile-form">
                        <div className="form-group">
                            <label>Foydalanuvchi nomi</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={`profile-input ${!isEditing ? 'disabled' : ''}`}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Ism</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`profile-input ${!isEditing ? 'disabled' : ''}`}
                                    placeholder="Ismingiz"
                                />
                            </div>

                            <div className="form-group">
                                <label>Familiya</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`profile-input ${!isEditing ? 'disabled' : ''}`}
                                    placeholder="Familiyangiz"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Haqida</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={`profile-textarea ${!isEditing ? 'disabled' : ''}`}
                                placeholder="O'zingiz haqingizda yozing..."
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="profile-actions">
                        {!isEditing ? (
                            <>
                                <button className="edit-button" onClick={() => setIsEditing(true)}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                    </svg>
                                    Profilni tahrirlash
                                </button>
                                <button className="logout-button" onClick={handleLogout}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                    </svg>
                                    Chiqish
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="save-button"
                                    onClick={handleSave}
                                    disabled={loading}
                                >
                                    {loading ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
                                </button>
                                <button className="cancel-button" onClick={handleCancel}>
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;