import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
    const { login, loading, error, isAuthenticated, clearError } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/chat');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            clearError();
        }
    }, [error, clearError]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            toast.error('Email va parolni kiriting!');
            return;
        }

        const result = await login(formData);
        if (result.success) {
            toast.success('Muvaffaqiyatli kirildi!');
            navigate('/chat');
        }
    };

    // Quick login function for test users
    const quickLogin = async (email) => {
        const result = await login({ email, password: '123456' });
        if (result.success) {
            toast.success('Muvaffaqiyatli kirildi!');
            navigate('/chat');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="logo-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.45 3.61-.52.36-.99.53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 4.02-1.76 6.7-2.92 8.05-3.49 3.83-1.6 4.63-1.88 5.15-1.89.11 0 .37.03.54.17.14.12.18.28.2.39.02.11.04.35.02.54z" />
                                </svg>
                            </div>
                            <h1>Telegram</h1>
                        </div>
                        <p className="auth-subtitle">Chatga kirish</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="farrux@test.com"
                                    required
                                />
                                <span className="input-icon">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                    </svg>
                                </span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Parol</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="123456"
                                    required
                                />
                                <span className="input-icon">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                    </svg>
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`auth-button ${loading ? 'loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    Kirilmoqda...
                                </>
                            ) : (
                                'Kirish'
                            )}
                        </button>

                        <div className="quick-login">
                            <p style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
                                Tezkor kirish:
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => quickLogin('farrux@test.com')}
                                    className="quick-login-btn"
                                    disabled={loading}
                                >
                                    Farrux
                                </button>
                                <button
                                    type="button"
                                    onClick={() => quickLogin('shohruh@test.com')}
                                    className="quick-login-btn"
                                    disabled={loading}
                                >
                                    Shohruh
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Yangi hisob yaratmoqchimisiz?{' '}
                            <Link to="/register" className="auth-link">
                                Ro'yxatdan o'ting
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
