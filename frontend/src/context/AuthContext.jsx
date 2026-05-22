import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        const { token, refreshToken, user: userData } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/auth/me');
            const userData = response.data;
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Failed to refresh user:', error);
            if (error.response?.status === 401) logout();
        }
    };

    useEffect(() => {
        if (!!user) {
            refreshUser();
        }
    }, []);

    useEffect(() => {
        const onUserUpdated = (e) => {
            if (e.detail) {
                setUser(e.detail);
            }
        };
        window.addEventListener("auth:user-updated", onUserUpdated);
        return () => window.removeEventListener("auth:user-updated", onUserUpdated);
    }, []);

    const hasPermission = (permission) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        const perms = Array.isArray(user.permissions) ? user.permissions : [];
        const key = permission.replace(/-/g, '_');
        return perms.includes(key) || perms.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
