import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendance.service';
import {
    Box, Paper, Typography, Button, TextField, Divider, 
    Card, CardContent, Grid, Chip, IconButton, Alert, CircularProgress, 
    List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { DateTime } from 'luxon';

export default function AttendancePage() {
    const queryClient = useQueryClient();
    const [note, setNote] = useState('');
    const [currentTime, setCurrentTime] = useState(DateTime.now());

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(DateTime.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Queries
    const { data: todayStatus, isLoading: statusLoading } = useQuery({
        queryKey: ['attendanceToday'],
        queryFn: attendanceService.getStatus
    });

    const { data: logs, isLoading: logsLoading } = useQuery({
        queryKey: ['attendanceLogs'],
        queryFn: attendanceService.getLogs
    });

    // Mutations
    const checkInMutation = useMutation({
        mutationFn: attendanceService.checkIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
            queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
            setNote('');
        }
    });

    const checkOutMutation = useMutation({
        mutationFn: attendanceService.checkOut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
            queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
        }
    });

    const handleCheckIn = () => {
        if (window.confirm('Xác nhận chấm công vào?')) {
            checkInMutation.mutate(note);
        }
    };

    const handleCheckOut = () => {
        if (window.confirm('Xác nhận chấm công ra?')) {
            checkOutMutation.mutate();
        }
    };

    if (statusLoading) return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>;

    const hasCheckedIn = !!todayStatus;
    const hasCheckedOut = !!todayStatus?.check_out_time;

    return (
        <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
            <Grid container spacing={4}>
                {/* Check-in Card */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ 
                        borderRadius: '24px', 
                        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                        overflow: 'hidden',
                        height: '100%',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Box sx={{ 
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', 
                            py: 4, 
                            color: 'white', 
                            textAlign: 'center' 
                        }}>
                            <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>
                                {currentTime.toFormat('HH:mm:ss')}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
                                {currentTime.toFormat('cccc, dd MMMM yyyy')}
                            </Typography>
                        </Box>

                        <CardContent sx={{ p: 4 }}>
                            {!hasCheckedIn ? (
                                <Box>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>Chấm công vào</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                        Hãy nhấn nút bên dưới để bắt đầu ngày làm việc của bạn.
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        label="Ghi chú buổi sáng (không bắt buộc)"
                                        variant="outlined"
                                        placeholder="Ví dụ: Làm việc tại xưởng A..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                    />
                                    <Button 
                                        fullWidth 
                                        variant="contained" 
                                        size="large"
                                        startIcon={<LoginIcon />}
                                        onClick={handleCheckIn}
                                        disabled={checkInMutation.isPending}
                                        sx={{ 
                                            py: 2, 
                                            borderRadius: '12px',
                                            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                                            textTransform: 'none',
                                            fontSize: '1.1rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        Bắt đầu làm việc (Check-in)
                                    </Button>
                                </Box>
                            ) : !hasCheckedOut ? (
                                <Box>
                                    <Alert icon={<CheckCircleOutlineIcon fontSize="inherit" />} severity="success" sx={{ mb: 4, borderRadius: '12px' }}>
                                        Bạn đã check-in vào lúc {DateTime.fromISO(todayStatus.check_in_time).toFormat('HH:mm')}. Chúc bạn một ngày làm việc hiệu quả!
                                    </Alert>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>Chấm công ra</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                                        Khi kết thúc công việc, hãy nhấn nút bên dưới để hoàn tất ngày làm việc.
                                    </Typography>
                                    <Button 
                                        fullWidth 
                                        variant="contained" 
                                        color="warning"
                                        size="large"
                                        startIcon={<LogoutIcon />}
                                        onClick={handleCheckOut}
                                        disabled={checkOutMutation.isPending}
                                        sx={{ 
                                            py: 2, 
                                            borderRadius: '12px',
                                            boxShadow: '0 8px 20px rgba(237, 108, 2, 0.2)',
                                            textTransform: 'none',
                                            fontSize: '1.1rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        Kết thúc làm việc (Check-out)
                                    </Button>
                                </Box>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                                    <Typography variant="h5" fontWeight={800} gutterBottom>Đã hoàn thành!</Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                        Bạn đã hoàn tất chấm công cho ngày hôm nay.
                                    </Typography>
                                    <Box display="flex" justifyContent="center" gap={4}>
                                        <Box>
                                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Vào lúc</Typography>
                                            <Typography variant="h6" fontWeight={700}>{DateTime.fromISO(todayStatus.check_in_time).toFormat('HH:mm')}</Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem />
                                        <Box>
                                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Ra lúc</Typography>
                                            <Typography variant="h6" fontWeight={700}>{DateTime.fromISO(todayStatus.check_out_time).toFormat('HH:mm')}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* History List */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ 
                        borderRadius: '24px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <HistoryIcon color="primary" />
                            <Typography variant="h6" fontWeight={800}>Lịch sử 30 ngày gần đây</Typography>
                        </Box>
                        <Divider />
                        <CardContent sx={{ p: 0, flexGrow: 1, overflowY: 'auto', maxHeight: 600 }}>
                            {logsLoading ? (
                                <Box display="flex" justifyContent="center" p={4}><CircularProgress size={24} /></Box>
                            ) : logs?.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <Typography color="text.disabled">Chưa có dữ liệu chấm công</Typography>
                                </Box>
                            ) : (
                                <List sx={{ py: 0 }}>
                                    {logs.map((log, idx) => (
                                        <React.Fragment key={log.id}>
                                            <ListItem sx={{ py: 2, px: 4 }}>
                                                <ListItemIcon>
                                                    <Box sx={{ 
                                                        width: 48, height: 48, borderRadius: '12px', 
                                                        bgcolor: 'rgba(37, 99, 235, 0.05)', 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'primary.main'
                                                    }}>
                                                        <AccessTimeIcon fontSize="small" />
                                                    </Box>
                                                </ListItemIcon>
                                                <ListItemText 
                                                    primary={
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography fontWeight={700}>
                                                                {DateTime.fromISO(log.date).toFormat('dd/MM/yyyy')}
                                                            </Typography>
                                                            <Chip 
                                                                label={log.check_out_time ? 'Đã hoàn thành' : 'Đang làm việc'} 
                                                                size="small"
                                                                color={log.check_out_time ? 'success' : 'primary'}
                                                                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                                                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                Vào: <b>{DateTime.fromISO(log.check_in_time).toFormat('HH:mm')}</b>
                                                            </Typography>
                                                            {log.check_out_time && (
                                                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    Ra: <b>{DateTime.fromISO(log.check_out_time).toFormat('HH:mm')}</b>
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {idx < logs.length - 1 && <Divider component="li" />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
