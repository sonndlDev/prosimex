import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPage } from '../constants/permissions';

export default function ProtectedRoute({ allowedRoles, requiredPermission }) {
    const { user, isAuthenticated, authReady } = useAuth();
    const location = useLocation();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!authReady) {
        return (
            <div className="flex items-center justify-center min-h-[40vh] text-sm font-bold text-zinc-500">
                Đang tải quyền truy cập...
            </div>
        );
    }

    // Admins bypass all role/permission checks
    if (user.role === 'ADMIN') return <Outlet />;

    if (requiredPermission) {
        if (!canAccessPage(user, requiredPermission)) {
            return <Navigate to="/unauthorized" state={{ from: location, requiredPermission }} replace />;
        }
        return <Outlet />;
    }

    if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
