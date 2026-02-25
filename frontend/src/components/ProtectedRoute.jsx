import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function ProtectedRoute({ allowedRoles, requiredPermission }) {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admins bypass all role/permission checks
    if (user.role === 'ADMIN') return <Outlet />;

    // Check specific permissions if provided
    if (requiredPermission && user.permissions) {
        if (!user.permissions.includes(requiredPermission)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // Role check (legacy/fallback)
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
