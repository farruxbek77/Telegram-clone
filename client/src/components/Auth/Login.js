import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
    const { login, loading, error, isAuthenticated, clearError } = useAuth();
    const navigate = useNavigate();

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

    const handleLogin = async () => {
        const result = await login({});
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
                                {/* Telegram Icon */}
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.45 3.61-.52.36-.99.53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 4.02-1.76 6.7-2.92 8.05-3.49 3.83-1.6 4.63-1.88 5.15-1.89.11 0 .37.03.54.17.14.12.18.28.2.39.02.11.04.35.02.54z" />
                                </svg>
                            </div>
                            <h1>Telegram</h1>
                        </div>
                        <p className="auth-subtitle">Chatga kirish uchun tugmani bosing</p>
                    </div>

                    <div className="auth-form">
                        <div className="phone-info">
                            <p>🚀 Parolsiz kirish tizimi</p>
                            <p>Faqat tugma bosing va chatga kiring!</p>
                        </div>

                        <button
                            onClick={handleLogin}
                            className={`auth-button ${loading ? 'loading' : ''}`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    Kirilmoqda...
                                </>
                            ) : (
                                'Chatga Kirish'
                            )}
                        </button>
                    </div>

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