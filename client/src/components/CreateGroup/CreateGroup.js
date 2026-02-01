import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './CreateGroup.css';

const CreateGroup = ({ onClose, onGroupCreated }) => {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupImage, setGroupImage] = useState(null);
    const [groupImagePreview, setGroupImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadAvailableUsers();
    }, []);

    const loadAvailableUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5005/api/users/all', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setAvailableUsers(response.data.users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Foydalanuvchilarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    const handleMemberToggle = (userId) => {
        setSelectedMembers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
                return;
            }

            if (!file.type.startsWith('image/')) {
                toast.error('Faqat rasm fayllari ruxsat etilgan');
                return;
            }

            setGroupImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setGroupImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            toast.error('Guruh nomi kerak');
            return;
        }

        if (groupName.trim().length > 50) {
            toast.error('Guruh nomi 50 belgidan oshmasligi kerak');
            return;
        }

        try {
            setCreating(true);
            const token = localStorage.getItem('token');

            const groupData = {
                name: groupName.trim(),
                description: groupDescription.trim(),
                members: selectedMembers,
                isPublic: false,
                icon: '👥'
            };

            const response = await axios.post('http://localhost:5005/api/groups', groupData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Guruh muvaffaqiyatli yaratildi');
                onGroupCreated(response.data.group);
                onClose();
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Guruh yaratishda xato';
            toast.error(message);
        } finally {
            setCreating(false);
        }
    };

    const filteredUsers = availableUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="create-group-overlay">
            <div className="create-group-modal telegram-style">
                {/* Header */}
                <div className="create-group-header">
                    <button className="close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                    <h2>New Group</h2>
                    <button
                        className="create-button-header"
                        onClick={handleCreateGroup}
                        disabled={creating || !groupName.trim()}
                    >
                        {creating ? 'Creating...' : 'Create'}
                    </button>
                </div>

                <div className="create-group-content">
                    {/* Group Image */}
                    <div className="group-image-section">
                        <div className="group-image-container" onClick={() => fileInputRef.current?.click()}>
                            {groupImagePreview ? (
                                <img src={groupImagePreview} alt="Group" className="group-image-preview" />
                            ) : (
                                <div className="group-image-placeholder">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.1 3.89 23 5 23H19C20.1 23 21 22.1 21 21V9M19 9H14V4H5V21H19V9Z" />
                                    </svg>
                                </div>
                            )}
                            <div className="camera-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9,2V7.38L10.38,8.76L15.24,3.9C14.64,3.34 13.95,2.9 13.17,2.6L12,2H9M19,7V9C20.1,9 21,9.9 21,11V19C21,20.1 20.1,21 19,21H5C3.9,21 3,20.1 3,19V11C3,9.9 3.9,9 5,9H6.17L7.83,7.34L9.41,5.76C9.25,5.76 9.08,5.76 8.92,5.76H5.5L6.5,4H8V2H4A2,2 0 0,0 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4A2,2 0 0,0 20,2H16V4H17.5L18.5,5.76H15.08L19,9M12,19A4,4 0 0,0 16,15A4,4 0 0,0 12,11A4,4 0 0,0 8,15A4,4 0 0,0 12,19M12,17A2,2 0 0,1 10,15A2,2 0 0,1 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17Z" />
                                </svg>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Group Name */}
                    <div className="form-group">
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Group name"
                            maxLength={50}
                            className="group-name-input"
                        />
                    </div>

                    {/* Group Description */}
                    <div className="form-group">
                        <textarea
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="Description (optional)"
                            maxLength={200}
                            rows={3}
                            className="group-description-input"
                        />
                    </div>

                    {/* Members Count */}
                    <div className="members-count">
                        {selectedMembers.length} members
                    </div>

                    {/* Selected Members */}
                    {selectedMembers.length > 0 && (
                        <div className="selected-members-section">
                            {selectedMembers.map(memberId => {
                                const user = availableUsers.find(u => u.id === memberId);
                                return user ? (
                                    <div key={memberId} className="selected-member-item">
                                        <img src={user.avatar} alt={user.username} />
                                        <span>{user.username}</span>
                                        <button
                                            onClick={() => handleMemberToggle(memberId)}
                                            className="remove-member-btn"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    )}

                    {/* Search */}
                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    {/* Available Members */}
                    <div className="available-members-section">
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Loading...</p>
                            </div>
                        ) : (
                            <div className="members-list">
                                {filteredUsers.length === 0 ? (
                                    <div className="no-users">
                                        <p>No users found</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(user => (
                                        <div
                                            key={user.id}
                                            className={`member-item ${selectedMembers.includes(user.id) ? 'selected' : ''}`}
                                            onClick={() => handleMemberToggle(user.id)}
                                        >
                                            <div className="member-avatar">
                                                <img src={user.avatar} alt={user.username} />
                                            </div>
                                            <div className="member-info">
                                                <div className="member-name">{user.username}</div>
                                                <div className="member-status">
                                                    {user.isOnline ? 'online' : 'last seen recently'}
                                                </div>
                                            </div>
                                            <div className="member-check">
                                                {selectedMembers.includes(user.id) && (
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateGroup;