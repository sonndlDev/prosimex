import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workerService } from '../../services/worker.service';
import { factoryService } from '../../services/factory.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    Paper, Chip, Typography, IconButton, Tooltip
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function WorkerPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        phone: '',
        factory_id: '',
        is_active: true
    });

    // Queries
    const { data: workers = [], isLoading } = useQuery({
        queryKey: ['workers'],
        queryFn: workerService.getAll
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: workerService.create,
        onSuccess: () => {
            queryClient.invalidateQueries(['workers']);
            setOpenModal(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data) => workerService.update(data.id, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries(['workers']);
            setOpenModal(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: workerService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['workers']);
        }
    });

    const handleOpenModal = (worker = null) => {
        if (worker) {
            setSelectedWorker(worker);
            setFormData({
                code: worker.code,
                name: worker.name,
                phone: worker.phone || '',
                factory_id: worker.factory_id || '',
                is_active: worker.is_active
            });
        } else {
            setSelectedWorker(null);
            setFormData({
                code: '',
                name: '',
                phone: '',
                factory_id: '',
                is_active: true
            });
        }
        setOpenModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedWorker) {
            updateMutation.mutate({ id: selectedWorker.id, payload: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa công nhân này?')) {
            deleteMutation.mutate(id);
        }
    };

    const columns = [
        { id: 'code', label: 'Mã nhân công' },
        { id: 'name', label: 'Họ và tên' },
        { id: 'phone', label: 'Số điện thoại' },
        { 
            id: 'is_active', 
            label: 'Trạng thái',
            format: (val) => (
                <Chip 
                    label={val ? 'Hoạt động' : 'Tạm dừng'} 
                    color={val ? 'success' : 'default'} 
                    size="small"
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                />
            )
        }
    ];

    return (
        <Box sx={{ p: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom>
                        Quản lý Công nhân
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Quản lý danh sách nhân sự phục vụ sản xuất và kế hoạch
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddCircleIcon />}
                    onClick={() => handleOpenModal()}
                    sx={{ 
                        borderRadius: '12px', 
                        px: 3, py: 1.2, 
                        fontWeight: 700,
                        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)'
                    }}
                >
                    Thêm công nhân
                </Button>
            </Box>

            <Paper sx={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <GenericTable 
                    columns={columns} 
                    data={workers} 
                    onEdit={handleOpenModal}
                    onDelete={(row) => handleDelete(row.id)}
                    isLoading={isLoading}
                />
            </Paper>

            <Dialog 
                open={openModal} 
                onClose={() => setOpenModal(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: { borderRadius: '24px', p: 1 }
                }}
            >
                <form onSubmit={handleSubmit}>
                    <DialogTitle sx={{ fontWeight: 800, fontSize: '1.5rem' }}>
                        {selectedWorker ? 'Cập nhật Công nhân' : 'Thêm Công nhân mới'}
                    </DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
                            <TextField 
                                fullWidth label="Mã công nhân" required
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value})}
                                disabled={!!selectedWorker}
                                placeholder="Ví dụ: CN001"
                            />
                            <TextField 
                                fullWidth label="Họ và tên" required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Nhập đầy đủ họ tên"
                            />
                            <TextField 
                                fullWidth label="Số điện thoại"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                placeholder="0xxx xxx xxx"
                            />
                            <FormControlLabel
                                control={
                                    <Switch 
                                        checked={formData.is_active} 
                                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})} 
                                    />
                                }
                                label="Trạng thái hoạt động"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={() => setOpenModal(false)} color="inherit" sx={{ fontWeight: 600 }}>
                            Hủy
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={createMutation.isPending || updateMutation.isPending}
                            sx={{ borderRadius: '12px', px: 4, fontWeight: 700 }}
                        >
                            {selectedWorker ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
