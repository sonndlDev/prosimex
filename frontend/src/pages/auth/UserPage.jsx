import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/user.service';
import { factoryService } from '../../services/factory.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel 
} from '@mui/material';

const ROLES = ['ADMIN', 'PLANNER', 'OPERATOR'];

export default function UserPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const [formData, setFormData] = useState({ username: '', password: '', role_name: 'OPERATOR', factory_id: '', is_active: true });

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
            format: (val) => val ? <span style={{color:'green'}}>Hoạt động</span> : <span style={{color:'red'}}>Ngừng hoạt động</span> 
        }
    ];

    const handleOpen = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({ 
                username: user.username, 
                password: '', // Blank out pass on edit
                role_name: user.role_name,
                factory_id: user.factory_id || '',
                is_active: user.is_active
            });
        } else {
            setSelectedUser(null);
            setFormData({ username: '', password: '', role_name: 'OPERATOR', factory_id: '', is_active: true });
        }
        setOpenModal(true);
    };

    const handleClose = () => {
        setOpenModal(false);
        setSelectedUser(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const payload = {...formData};
        // Don't send empty password strings on update
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
                        <h2>Quản lý Người dùng & Quyền</h2>
                        <Button variant="contained" color="secondary" onClick={() => handleOpen()}>+ Thêm người dùng</Button>
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
            <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{selectedUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
                    <DialogContent dividers>
                        <TextField 
                            fullWidth label="Tên đăng nhập" margin="normal" required 
                            value={formData.username} 
                            onChange={(e) => setFormData({...formData, username: e.target.value})} 
                        />
                        
                        <TextField 
                            fullWidth label={selectedUser ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"} 
                            margin="normal" type="password" required={!selectedUser} 
                            value={formData.password} 
                            onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        />

                        <FormControl fullWidth margin="normal" required>
                            <InputLabel>Vai trò hệ thống</InputLabel>
                            <Select 
                                value={formData.role_name} label="Vai trò hệ thống" 
                                onChange={(e) => setFormData({...formData, role_name: e.target.value, factory_id: e.target.value === 'ADMIN' ? '' : formData.factory_id})} // clear factory if admin
                            >
                                {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {/* Optional Factory Binding - Only planners and operators strictly need it in a real MES, but we expose it widely */}
                        <FormControl fullWidth margin="normal" disabled={formData.role_name === 'ADMIN'}>
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
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button type="submit" variant="contained">Lưu</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
