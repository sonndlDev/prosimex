import React, { useState } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    AppBar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Button,
    Avatar,
    Chip,
    Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FactoryIcon from '@mui/icons-material/Factory';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SettingsIcon from '@mui/icons-material/Settings';
import EventNoteIcon from '@mui/icons-material/EventNote';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import StoreIcon from '@mui/icons-material/Store';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import ConstructionIcon from '@mui/icons-material/Construction';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';

export default function MainLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { refreshUser } = useAuth();

    React.useEffect(() => {
        refreshUser();
    }, [location.pathname]);

    const drawerWidth = isCollapsed ? 84 : 280;

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { type: 'subheader', text: 'Sản xuất' },
        { text: 'Bảng điều khiển', icon: <DashboardIcon />, path: '/', permission: 'dashboard' },
        { text: 'Lập kế hoạch', icon: <EventNoteIcon />, path: '/planning', permission: 'planning' },
        { text: 'Lịch sản xuất', icon: <ViewTimelineIcon />, path: '/schedule', permission: 'schedule' },
        { text: 'Đơn hàng', icon: <ShoppingCartIcon />, path: '/orders', permission: 'orders' },
        
        { type: 'subheader', text: 'Dữ liệu gốc' },
        { text: 'Khách hàng', icon: <StoreIcon />, path: '/customers', permission: 'customers' },
        { text: 'Nhà máy', icon: <FactoryIcon />, path: '/factories', permission: 'factories' },
        { text: 'Máy móc', icon: <PrecisionManufacturingIcon />, path: '/machines', permission: 'machines' },
        { text: 'Công đoạn', icon: <SettingsIcon />, path: '/operations', permission: 'operations' },
        { text: 'Nhóm mã hàng', icon: <CategoryIcon />, path: '/product-groups', permission: 'product_groups' },
        { text: 'Mã hàng', icon: <InventoryIcon />, path: '/products', permission: 'products' },
        
        { type: 'subheader', text: 'Hệ thống' },
        { text: 'Chấm công', icon: <AccessTimeFilledIcon />, path: '/attendance', permission: 'attendance' },
        { text: 'Quản lý chấm công', icon: <AccessTimeFilledIcon />, path: '/attendance/management', permission: 'attendance_management' },
        { text: 'Quản lý công nhân', icon: <GroupIcon />, path: '/workers', permission: 'workers' },
        { text: 'Người dùng & Quyền', icon: <GroupIcon />, path: '/users', permission: 'users' },
        { text: 'Cài đặt hệ thống', icon: <SettingsIcon />, path: '/settings', permission: 'settings' },
    ];

    const allowedMenus = menuItems.filter((item, index) => {
        if (item.type === 'subheader') {
            // Only show subheader if there's at least one visible item below it
            const nextItems = menuItems.slice(index + 1);
            const firstSubheader = nextItems.findIndex(i => i.type === 'subheader');
            const itemsInSection = firstSubheader === -1 ? nextItems : nextItems.slice(0, firstSubheader);
            
            return itemsInSection.some(i => {
                if (user?.role === 'ADMIN') return true;
                if (user?.permissions) return user.permissions.includes(i.permission);
                return i.roles?.includes(user?.role);
            });
        }

        if (user?.role === 'ADMIN') return true;
        if (user?.permissions) return user.permissions.includes(item.permission);
        return !item.roles || item.roles.includes(user?.role);
    });

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: isCollapsed ? 2 : 3, display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                    <ConstructionIcon />
                </Avatar>
                {!isCollapsed && (
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: 'text.primary' }}>
                        PROSIMEX <span style={{ color: '#2563eb' }}>MES</span>
                    </Typography>
                )}
            </Box>
            
            <Box sx={{ flexGrow: 1, px: 2, pb: 2, overflowY: 'auto' }}>
                <List disablePadding>
                    {allowedMenus.map((item, index) => {
                        if (item.type === 'subheader') {
                            return !isCollapsed && (
                                <Typography 
                                    key={index}
                                    variant="overline" 
                                    sx={{ px: 2, mt: 3, mb: 1, display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.7rem' }}
                                >
                                    {item.text}
                                </Typography>
                            );
                        }
                        
                        const isActive = location.pathname === item.path;
                        
                        return (
                            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton 
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        borderRadius: '12px',
                                        py: 1.2,
                                        px: 2,
                                        backgroundColor: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                        color: isActive ? 'primary.main' : 'text.secondary',
                                        '&:hover': {
                                            backgroundColor: 'rgba(37, 99, 235, 0.04)',
                                            color: 'primary.main',
                                            '& .MuiListItemIcon-root': { color: 'primary.main' }
                                        },
                                        transition: 'all 0.2s ease-in-out',
                                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                                    }}
                                >
                                    <ListItemIcon sx={{ 
                                        minWidth: isCollapsed ? 0 : 40, 
                                        color: isActive ? 'primary.main' : 'text.secondary',
                                        transition: 'all 0.2s ease-in-out',
                                        mr: isCollapsed ? 0 : 2
                                    }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    {!isCollapsed && (
                                        <ListItemText 
                                            primary={item.text} 
                                            primaryTypographyProps={{ 
                                                fontSize: '0.875rem', 
                                                fontWeight: isActive ? 600 : 500 
                                            }} 
                                        />
                                    )}
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>

            <Divider sx={{ mx: 2 }} />
            <Box sx={{ p: isCollapsed ? 1 : 2 }}>
                <Box 
                    sx={{ 
                        p: isCollapsed ? 1 : 2, 
                        borderRadius: '16px', 
                        bgcolor: 'background.default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: 1.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.05)' }
                    }}
                    onClick={() => navigate('/profile')}
                >
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: '1rem', fontWeight: 600 }}>
                        {user?.username?.[0]?.toUpperCase()}
                    </Avatar>
                    {!isCollapsed && (
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                                {user?.username}
                            </Typography>
                            <Chip 
                                label={user?.role} 
                                size="small" 
                                variant="filled" 
                                sx={{ 
                                    height: 18, 
                                    fontSize: '0.65rem', 
                                    fontWeight: 700,
                                    bgcolor: 'rgba(37, 99, 235, 0.1)',
                                    color: 'primary.main'
                                }} 
                            />
                        </Box>
                    )}
                    {!isCollapsed && (
                        <Tooltip title="Đăng xuất">
                            <IconButton size="small" onClick={handleLogout} sx={{ color: 'error.light' }}>
                                <LogoutIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                className="glass-effect"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    color: 'text.primary',
                    boxShadow: 'none',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box display="flex" alignItems="center">
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { sm: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <IconButton
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
                        >
                            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </IconButton>
                        <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                            {allowedMenus.find(m => m.path === location.pathname)?.text || 'Hệ thống điều hành'}
                        </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                                Phiên bản v1.0.4
                            </Typography>
                        </Box>
                        <Tooltip title="Đăng xuất">
                            <IconButton color="error" onClick={handleLogout} sx={{ bgcolor: 'rgba(239, 68, 68, 0.08)', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.15)' } }}>
                                <LogoutIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>
            
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { 
                            boxSizing: 'border-box', 
                            width: drawerWidth,
                            borderRight: '1px solid',
                            borderColor: 'divider'
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { 
                            boxSizing: 'border-box', 
                            width: drawerWidth,
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            backgroundColor: '#ffffff'
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            
            <Box
                component="main"
                sx={{ 
                    flexGrow: 1, 
                    p: isCollapsed ? '24px' : '32px', 
                    width: { sm: `calc(100% - ${drawerWidth}px)` }, 
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    transition: 'all 0.2s ease-in-out'
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}
