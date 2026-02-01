import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

const initialState = {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: true,
    error: null,
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'AUTH_START':
            return {
                ...state,
                loading: true,
                error: null,
            };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                loading: false,
                error: null,
            };
        case 'AUTH_FAIL':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: action.payload,
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: null,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        case 'UPDATE_USER':
            return {
                ...state,
                user: { ...state.user, ...action.payload },
            };
        default:
            return state;
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Check if user is logged in on app start
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            const savedAvatar = localStorage.getItem('userAvatar');

            if (token) {
                try {
                    // Avval localStorage dan user ma'lumotlarini olish
                    let userData = null;
                    if (savedUser) {
                        userData = JSON.parse(savedUser);
                        // Agar alohida avatar saqlangan bo'lsa, uni qo'shish
                        if (savedAvatar && savedAvatar !== 'null') {
                            userData.avatar = savedAvatar;
                        }
                    }

                    // API dan yangi ma'lumotlarni olishga harakat qilish
                    try {
                        const response = await authAPI.getMe();
                        const apiUserData = response.data.user;
                        // API dan kelgan ma'lumotlarni localStorage dagi avatar bilan birlashtirish
                        if (savedAvatar && savedAvatar !== 'null') {
                            apiUserData.avatar = savedAvatar;
                        }
                        userData = apiUserData;
                    } catch (apiError) {
                        // Agar API ishlamasa, localStorage dagi ma'lumotlarni ishlatish
                        console.log('API dan ma\'lumot olib bo\'lmadi, localStorage ishlatilmoqda');
                    }

                    if (userData) {
                        dispatch({
                            type: 'AUTH_SUCCESS',
                            payload: {
                                user: userData,
                                token,
                            },
                        });
                    } else {
                        throw new Error('User data not found');
                    }
                } catch (error) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('userAvatar');
                    dispatch({ type: 'AUTH_FAIL', payload: 'Session expired' });
                }
            } else {
                dispatch({ type: 'AUTH_FAIL', payload: null });
            }
        };

        checkAuth();
    }, []);

    // Register user
    const register = async (userData) => {
        dispatch({ type: 'AUTH_START' });
        try {
            const response = await authAPI.register(userData);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, token },
            });

            return { success: true, data: response.data };
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed';
            dispatch({ type: 'AUTH_FAIL', payload: message });
            return { success: false, error: message };
        }
    };

    // Login user
    const login = async (credentials) => {
        dispatch({ type: 'AUTH_START' });
        try {
            const response = await authAPI.login(credentials);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, token },
            });

            return { success: true, data: response.data };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            dispatch({ type: 'AUTH_FAIL', payload: message });
            return { success: false, error: message };
        }
    };

    // Logout user
    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            dispatch({ type: 'LOGOUT' });
        }
    };

    // Clear error
    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    // Update user data
    const updateUser = (userData) => {
        const updatedUser = { ...state.user, ...userData };
        dispatch({ type: 'UPDATE_USER', payload: userData });
        // LocalStorage ni ham yangilash
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Agar avatar o'zgargan bo'lsa, uni alohida saqlash
        if (userData.avatar) {
            localStorage.setItem('userAvatar', userData.avatar);
        }
        console.log('User updated:', updatedUser);
    };

    const value = {
        ...state,
        register,
        login,
        logout,
        clearError,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;