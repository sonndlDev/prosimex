import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/user.service';
import { factoryService } from '../../services/factory.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    Checkbox, Paper, Chip, Typography
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const ROLES = ['ADMIN', 'PLANNER', 'OPERATOR'];

const AVAILABLE_PERMISSIONS = [
    { key: 'dashboard', label: 'Bảng điều khiển' },
    { key: 'planning', label: 'Lập kế hoạch' },
    { key: 'schedule', label: 'Lịch sản xuất' },
    { key: 'orders', label: 'Đơn hàng' },
    { key: 'customers', label: 'Khách hàng' },
    { key: 'factories', label: 'Nhà máy' },
    { key: 'machines', label: 'Máy móc' },
    { key: 'operations', label: 'Công đoạn' },
    { key: 'product_groups', label: 'Nhóm mã hàng' },
    { key: 'products', label: 'Mã hàng' },
    { key: 'users', label: 'Người dùng & Quyền' },
];

export default function UserPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const [formData, setFormData] = useState({ 
        username: '', 
        password: '', 
        role_name: 'OPERATOR', 
        factory_id: '', 
        is_active: true,
        permissions: [] 
    });

    // Queries
    const { data: factories } = useQuery({ queryKey: ['factories'], queryFn: factoryService.getAll });
    const { data: users, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: userService.getAll });

    // Mutations
    const mutationOpts = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleClose();
        }
    };
    const createMutation = useMutation({ mutationFn: userService.create, ...mutationOpts });
    const updateMutation = useMutation({ mutationFn: ({id, payload}) => userService.update(id, payload), ...mutationOpts });
    const deleteMutation = useMutation({ 
        mutationFn: userService.delete, 
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
    });

    const columns = [
        { id: 'username', label: 'Tên đăng nhập' },
        { id: 'role_name', label: 'Vai trò' },
        { id: 'factory_id', label: 'Nhà máy được gán' },
        { 
            id: 'is_active', 
            label: 'Trạng thái', 
            format: (val) => val ? <Chip label="Hoạt động" color="success" size="small" /> : <Chip label="Ngừng" color="error" size="small" /> 
        }
    ];

    const handleOpen = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({ 
                username: user.username, 
                password: '', 
                role_name: user.role_name,
                factory_id: user.factory_id || '',
                is_active: user.is_active,
                permissions: user.permissions || []
            });
        } else {
            setSelectedUser(null);
            setFormData({ 
                username: '', 
                password: '', 
                role_name: 'OPERATOR', 
                factory_id: '', 
                is_active: true,
                permissions: [] 
            });
        }
        setOpenModal(true);
    };

    const handleClose = () => {
        setOpenModal(false);
        setSelectedUser(null);
    };

    const togglePermission = (key) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(key)
                ? prev.permissions.filter(p => p !== key)
                : [...prev.permissions, key]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const payload = {...formData};
        if (selectedUser && !payload.password) delete payload.password;

        if (selectedUser) updateMutation.mutate({ id: selectedUser.id, payload });
        else createMutation.mutate(payload);
    };

    const handleDelete = (user) => {
        if(window.confirm(`Xóa người dùng ${user.username}?`)) deleteMutation.mutate(user.id);
    };

    return (
        <Box>
             <GenericTable 
                title={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h5" fontWeight={700}>Quản lý Người dùng & Quyền</Typography>
                        <Button variant="contained" color="primary" onClick={() => handleOpen()} startIcon={<AddCircleIcon />}>
                            Thêm người dùng
                        </Button>
                    </Box>
                }
                data={users}
                columns={columns}
                isLoading={isLoading}
                error={error}
                onEdit={handleOpen}
                onDelete={handleDelete}
            />

            {/* Create/Edit Modal */}
            <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="md">
                <form onSubmit={handleSubmit}>
                    <DialogTitle sx={{ fontWeight: 700 }}>
                        {selectedUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                    </DialogTitle>
                    <DialogContent dividers>
                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                            <Box>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600}>Thông tin tài khoản</Typography>
                                <TextField 
                                    fullWidth label="Tên đăng nhập" size="small" margin="dense" required 
                                    value={formData.username} 
                                    onChange={(e) => setFormData({...formData, username: e.target.value})} 
                                />
                                
                                <TextField 
                                    fullWidth label={selectedUser ? "Mật khẩu mới" : "Mật khẩu"} 
                                    size="small" margin="dense" type="password" required={!selectedUser} 
                                    value={formData.password} 
                                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                                />

                                <FormControl fullWidth size="small" margin="dense" required>
                                    <InputLabel>Vai trò hệ thống</InputLabel>
                                    <Select 
                                        value={formData.role_name} label="Vai trò hệ thống" 
                                        onChange={(e) => setFormData({...formData, role_name: e.target.value, factory_id: e.target.value === 'ADMIN' ? '' : formData.factory_id})}
                                    >
                                        {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small" margin="dense" disabled={formData.role_name === 'ADMIN'}>
                                    <InputLabel>Gán nhà máy</InputLabel>
                                    <Select 
                                        value={formData.factory_id} label="Gán nhà máy" 
                                        onChange={(e) => setFormData({...formData, factory_id: e.target.value})}
                                    >
                                        <MenuItem value=""><em>Không gán / Tất cả</em></MenuItem>
                                        {factories?.filter(f=>f.is_active).map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                                    </Select>
                                </FormControl>

                                <FormControlLabel
                                    control={<Switch checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />}
                                    label="Trạng thái hoạt động"
                                    sx={{ mt: 1 }}
                                />
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" gutterBottom fontWeight={600}>Phân quyền menu truy cập</Typography>
                                <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflowY: 'auto', bgcolor: '#f8fafc' }}>
                                    <Box display="grid" gridTemplateColumns="1fr" gap={0.5}>
                                        {AVAILABLE_PERMISSIONS.map(p => (
                                            <FormControlLabel
                                                key={p.key}
                                                control={
                                                    <Checkbox 
                                                        size="small" 
                                                        checked={formData.permissions.includes(p.key)}
                                                        onChange={() => togglePermission(p.key)}
                                                    />
                                                }
                                                label={<Typography variant="body2">{p.label}</Typography>}
                                            />
                                        ))}
                                    </Box>
                                </Paper>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    * Admin mặc định có tất cả quyền
                                </Typography>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button type="submit" variant="contained">Lưu thay đổi</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
