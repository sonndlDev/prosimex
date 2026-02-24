import React from 'react';
import { Typography, Box, Paper, Grid, Card, CardContent, CircularProgress, Avatar, Chip, Button, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { useAuth } from '../../context/AuthContext';

import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EngineeringIcon from '@mui/icons-material/Engineering';
import TimerIcon from '@mui/icons-material/Timer';

export default function DashboardPage() {
    const { user } = useAuth();
    const { data: metrics, isLoading } = useQuery({
        queryKey: ['dashboardMetrics'],
        queryFn: dashboardService.getMetrics,
        staleTime: 60000 
    });

    const StatCard = ({ title, value, icon, color, trend }) => (
        <Card sx={{ 
            height: '100%', 
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)'
            }
        }}>
            <Box sx={{ 
                position: 'absolute', 
                top: -10, 
                right: -10, 
                width: 100, 
                height: 100, 
                background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
                borderRadius: '50%'
            }} />
            <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography color="textSecondary" variant="overline" sx={{ fontWeight: 700, letterSpacing: 1 }}>{title}</Typography>
                        <Box display="flex" alignItems="baseline" gap={1} mt={0.5}>
                            <Typography variant="h3" fontWeight={800} sx={{ color: 'text.primary' }}>
                                {isLoading ? <CircularProgress size={28} /> : (value || 0)}
                            </Typography>
                            {trend && (
                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main', fontSize: '0.75rem', fontWeight: 700 }}>
                                    <ArrowUpwardIcon sx={{ fontSize: '1rem' }} /> {trend}
                                </Box>
                            )}
                        </Box>
                    </Box>
                    <Avatar sx={{ 
                        bgcolor: `${color}10`, 
                        color: color,
                        width: 56,
                        height: 56,
                        borderRadius: '12px'
                    }}>
                        {icon}
                    </Avatar>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box>
            <Box mb={5} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h3" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-1px', mb: 0.5 }}>
                        Xin chào, {user?.username} <span style={{ opacity: 0.8 }}>👋</span>
                    </Typography>
                    <Typography variant="h6" color="text.secondary" fontWeight={500}>
                        Chào mừng bạn quay trở lại. Chúc bạn một ngày làm việc hiệu quả!
                    </Typography>
                </Box>
                <Box>
                    <Chip 
                        icon={<TimerIcon sx={{ fontSize: '1rem !important' }} />} 
                        label={`Hôm nay: ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}`} 
                        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', fontWeight: 600, px: 1 }}
                    />
                </Box>
            </Box>

            <Grid container spacing={3} mb={5}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Đơn hàng" 
                        value={metrics?.totalOrders} 
                        icon={<ShoppingCartIcon />} 
                        color="#2563eb"
                        trend="+12%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Kế hoạch" 
                        value={metrics?.activePlans} 
                        icon={<EventNoteIcon />} 
                        color="#7c3aed"
                        trend="+5%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Hiệu suất máy" 
                        value={`${metrics?.activeMachines || 0}%`} 
                        icon={<EngineeringIcon />} 
                        color="#059669"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Nhân viên" 
                        value={metrics?.activeUsers} 
                        icon={<GroupsIcon />} 
                        color="#ea580c"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                <Grid item xs={12} md={7}>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 4, 
                            borderRadius: '24px', 
                            border: '1px solid', 
                            borderColor: 'divider',
                            minHeight: '400px',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                    <NotificationsActiveIcon sx={{ fontSize: '1.2rem' }} />
                                </Avatar>
                                <Typography variant="h6" fontWeight={700}>Thông báo hệ thống</Typography>
                            </Box>
                            <Button size="small">Xem tất cả</Button>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Alert severity="info" variant="outlined" sx={{ borderRadius: '16px' }}>
                                Bảo trì hệ thống dự kiến vào Chủ Nhật tuần này lúc 22:00.
                            </Alert>
                            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
                                Hiện không có thông báo khẩn cấp nào khác.
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 4, 
                            borderRadius: '24px', 
                            border: '1px solid', 
                            borderColor: 'divider',
                            bgcolor: 'primary.main',
                            color: 'white',
                            minHeight: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
                        <Box>
                            <Typography variant="h5" fontWeight={700} mb={1}>Trạng thái máy móc</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                Theo dõi hiệu suất và tình trạng vận hành của các dây chuyền sản xuất trong thời gian thực.
                            </Typography>
                        </Box>
                        
                        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box textAlign="center">
                                <Typography variant="h2" fontWeight={800}>98%</Typography>
                                <Typography variant="overline" sx={{ fontWeight: 700, opacity: 0.9 }}>Sẵn sàng hoạt động</Typography>
                            </Box>
                        </Box>
                        
                        <Button 
                            variant="contained" 
                            fullWidth 
                            sx={{ 
                                bgcolor: 'white', 
                                color: 'primary.main', 
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                                borderRadius: '12px',
                                py: 1.5
                            }}
                        >
                            Chi tiết vận hành
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
