import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Settings.css';

const Settings = ({ onClose }) => {
    const [settings, setSettings] = useState({
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
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('privacy');

    useEffect(() => {
        loadSettings();
    }, []);

    // Apply theme on settings load
    useEffect(() => {
        if (settings.theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }, [settings.theme]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5005/api/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSettings(response.data.settings);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Sozlamalarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const response = await axios.put('http://localhost:5005/api/settings',
                { settings },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                toast.success('Sozlamalar saqlandi');

                // Apply theme immediately
                if (settings.theme === 'light') {
                    document.body.classList.add('light-theme');
                } else {
                    document.body.classList.remove('light-theme');
                }
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Sozlamalarni saqlashda xato');
        } finally {
            setSaving(false);
        }
    };

    const handlePrivacyChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            privacy: {
                ...prev.privacy,
                [key]: value
            }
        }));
    };

    const handleNotificationChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [key]: value
            }
        }));
    };

    const handleThemeChange = (theme) => {
        setSettings(prev => ({
            ...prev,
            theme: theme
        }));
    };

    const handleLanguageChange = (language) => {
        setSettings(prev => ({
            ...prev,
            language: language
        }));
    };

    if (loading) {
        return (
            <div className="settings-overlay">
                <div className="settings-modal">
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Sozlamalar yuklanmoqda...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-overlay">
            <div className="settings-modal">
                <div className="settings-header">
                    <h2>Sozlamalar</h2>
                    <button className="close-button" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                <div className="settings-content">
                    <div className="settings-tabs">
                        <button
                            className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
                            onClick={() => setActiveTab('privacy')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16V13C8,12.4 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z" />
                            </svg>
                            Maxfiylik
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21" />
                            </svg>
                            Bildirishnomalar
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'appearance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('appearance')}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,18C8.69,18 6,15.31 6,12C6,8.69 8.69,6 12,6C15.31,6 18,8.69 18,12C18,15.31 15.31,18 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />
                            </svg>
                            Ko'rinish
                        </button>
                    </div>

                    <div className="settings-body">
                        {activeTab === 'privacy' && (
                            <div className="settings-section">
                                <h3>Maxfiylik sozlamalari</h3>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Oxirgi ko'rilgan vaqt</h4>
                                        <p>Kim sizning oxirgi faolligingizni ko'rishi mumkin</p>
                                    </div>
                                    <select
                                        value={settings.privacy.lastSeen}
                                        onChange={(e) => handlePrivacyChange('lastSeen', e.target.value)}
                                        className="setting-select"
                                    >
                                        <option value="everyone">Hamma</option>
                                        <option value="contacts">Kontaktlar</option>
                                        <option value="nobody">Hech kim</option>
                                    </select>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Profil rasmi</h4>
                                        <p>Kim sizning profil rasmingizni ko'rishi mumkin</p>
                                    </div>
                                    <select
                                        value={settings.privacy.profilePhoto}
                                        onChange={(e) => handlePrivacyChange('profilePhoto', e.target.value)}
                                        className="setting-select"
                                    >
                                        <option value="everyone">Hamma</option>
                                        <option value="contacts">Kontaktlar</option>
                                        <option value="nobody">Hech kim</option>
                                    </select>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>O'qildi belgilari</h4>
                                        <p>Xabarlaringiz o'qilganini ko'rsatish</p>
                                    </div>
                                    <label className="setting-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.privacy.readReceipts}
                                            onChange={(e) => handlePrivacyChange('readReceipts', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Online status</h4>
                                        <p>Boshqalar sizning online ekanligingizni ko'rishi</p>
                                    </div>
                                    <label className="setting-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.privacy.onlineStatus}
                                            onChange={(e) => handlePrivacyChange('onlineStatus', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="settings-section">
                                <h3>Bildirishnoma sozlamalari</h3>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Xabar ovozi</h4>
                                        <p>Yangi xabar kelganda ovoz chiqarish</p>
                                    </div>
                                    <label className="setting-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications.messageSound}
                                            onChange={(e) => handleNotificationChange('messageSound', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Desktop bildirishnomalar</h4>
                                        <p>Brauzer bildirishnomalarini ko'rsatish</p>
                                    </div>
                                    <label className="setting-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications.desktopNotifications}
                                            onChange={(e) => handleNotificationChange('desktopNotifications', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Guruh bildirishnomalari</h4>
                                        <p>Guruh xabarlari uchun bildirishnomalar</p>
                                    </div>
                                    <label className="setting-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications.groupNotifications}
                                            onChange={(e) => handleNotificationChange('groupNotifications', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Shaxsiy bildirishnomalar</h4>
                                        <p>Shaxsiy xabarlar uchun bildirishnomalar</p>
                                    </div>
                                    <label className="setting-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications.privateNotifications}
                                            onChange={(e) => handleNotificationChange('privateNotifications', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Xabar mazmuni</h4>
                                        <p>Bildirishnomada xabar mazmunini ko'rsatish</p>
                                    </div>
                                    <label className="setting-toggle">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications.notificationPreview}
                                            onChange={(e) => handleNotificationChange('notificationPreview', e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'appearance' && (
                            <div className="settings-section">
                                <h3>Ko'rinish sozlamalari</h3>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Mavzu</h4>
                                        <p>Ilovaning ko'rinish mavzusini tanlang</p>
                                    </div>
                                    <div className="theme-options">
                                        <button
                                            className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('dark')}
                                        >
                                            <div className="theme-preview dark-preview">
                                                <div className="preview-header"></div>
                                                <div className="preview-body"></div>
                                            </div>
                                            <span>Qorong'u</span>
                                        </button>
                                        <button
                                            className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                                            onClick={() => handleThemeChange('light')}
                                        >
                                            <div className="theme-preview light-preview">
                                                <div className="preview-header"></div>
                                                <div className="preview-body"></div>
                                            </div>
                                            <span>Yorug'</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="setting-item">
                                    <div className="setting-info">
                                        <h4>Til</h4>
                                        <p>Ilova tilini tanlang</p>
                                    </div>
                                    <select
                                        value={settings.language}
                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                        className="setting-select"
                                    >
                                        <option value="uz">O'zbekcha</option>
                                        <option value="en">English</option>
                                        <option value="ru">Русский</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="cancel-button" onClick={onClose}>
                        Bekor qilish
                    </button>
                    <button
                        className="save-button"
                        onClick={saveSettings}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <div className="spinner-small"></div>
                                Saqlanmoqda...
                            </>
                        ) : (
                            'Saqlash'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;