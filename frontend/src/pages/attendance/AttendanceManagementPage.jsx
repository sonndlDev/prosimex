import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendance.service';
import { userService } from '../../services/user.service';
import {
    Box, Paper, Typography, TextField, Button, Grid, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    FormControl, InputLabel, Select, MenuItem, Chip, CircularProgress,
    Card, CardContent, Divider, Tooltip
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import { DateTime } from 'luxon';

export default function AttendanceManagementPage() {
    const [filters, setFilters] = useState({
        targetUserId: '',
        startDate: DateTime.now().startOf('month').toISODate(),
        endDate: DateTime.now().toISODate()
    });

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: userService.getAll
    });

    const { data: logs, isLoading: logsLoading, refetch } = useQuery({
        queryKey: ['attendanceLogsAdmin', filters],
        queryFn: () => attendanceService.getLogs(filters)
    });

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight={800}>Quản lý Chấm công</Typography>
            </Box>

            {/* Filter Card */}
            <Card sx={{ borderRadius: '16px', mb: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Nhân viên</InputLabel>
                                <Select
                                    value={filters.targetUserId}
                                    label="Nhân viên"
                                    onChange={(e) => handleFilterChange('targetUserId', e.target.value)}
                                >
                                    <MenuItem value="">Tất cả nhân viên</MenuItem>
                                    {users?.map(user => (
                                        <MenuItem key={user.id} value={user.id}>{user.username}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Từ ngày"
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Đến ngày"
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button 
                                variant="contained" 
                                fullWidth 
                                startIcon={<SearchIcon />}
                                onClick={() => refetch()}
                                sx={{ borderRadius: '8px', height: '40px' }}
                            >
                                Tìm kiếm
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Ngày</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Nhân viên</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Vào lúc</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ra lúc</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ghi chú</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logsLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" padding="normal">
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : logs?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" padding="normal">
                                    <Typography color="text.secondary">Không tìm thấy dữ liệu chấm công</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} hover>
                                    <TableCell>
                                        {DateTime.fromISO(log.date).toFormat('dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell fontWeight={600}>{log.username}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={DateTime.fromISO(log.check_in_time).toFormat('HH:mm')}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {log.check_out_time ? (
                                            <Chip 
                                                label={DateTime.fromISO(log.check_out_time).toFormat('HH:mm')}
                                                size="small"
                                                variant="outlined"
                                                color="success"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={log.check_out_time ? 'Đã hoàn thành' : 'Đang làm việc'}
                                            color={log.check_out_time ? 'success' : 'primary'}
                                            size="small"
                                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                        />
                                    </TableCell>
                                    <TableCell color="text.secondary">{log.note || '-'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
