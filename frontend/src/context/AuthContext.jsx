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
        const { token, user: userData } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
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

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
