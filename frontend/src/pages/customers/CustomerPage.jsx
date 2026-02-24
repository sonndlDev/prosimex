import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../../services/customer.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box 
} from '@mui/material';

export default function CustomerPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({ code: '', name: '', contact_info: '' });

    // Fetch Data
    const { data: customers, isLoading, error } = useQuery({
        queryKey: ['customers'],
        queryFn: customerService.getAll,
    });

    // Mutations
    const mutationOpts = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            handleClose();
        }
    };
    const createMutation = useMutation({ mutationFn: customerService.create, ...mutationOpts });
    const updateMutation = useMutation({ 
        mutationFn: ({id, payload}) => customerService.update(id, payload), 
        ...mutationOpts 
    });
    const deleteMutation = useMutation({ 
        mutationFn: customerService.delete, 
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] })
    });

    const columns = [
        { id: 'code', label: 'Mã công ty' },
        { id: 'name', label: 'Tên khách hàng' },
        { id: 'contact_info', label: 'Thông tin liên hệ' },
    ];

    const handleOpen = (customer = null) => {
        if (customer) {
            setSelectedCustomer(customer);
            setFormData({ code: customer.code, name: customer.name, contact_info: customer.contact_info || '' });
        } else {
            setSelectedCustomer(null);
            setFormData({ code: '', name: '', contact_info: '' });
        }
        setOpenModal(true);
    };

    const handleClose = () => {
        setOpenModal(false);
        setSelectedCustomer(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedCustomer) {
            updateMutation.mutate({ id: selectedCustomer.id, payload: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (customer) => {
        if(window.confirm(`Xóa khách hàng ${customer.name}?`)) {
            deleteMutation.mutate(customer.id);
        }
    };

    return (
        <Box>
            <GenericTable 
                title={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <h2>Quản lý Khách hàng</h2>
                        <Button variant="contained" color="secondary" onClick={() => handleOpen()}>
                            + Thêm khách hàng
                        </Button>
                    </Box>
                }
                data={customers}
                columns={columns}
                isLoading={isLoading}
                error={error}
                onEdit={handleOpen}
                onDelete={handleDelete}
            />

            {/* Create / Edit Modal */}
            <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{selectedCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}</DialogTitle>
                    <DialogContent dividers>
                        <TextField
                            fullWidth
                            label="Mã khách hàng"
                            margin="normal"
                            required
                            value={formData.code}
                            onChange={(e) => setFormData({...formData, code: e.target.value})}
                        />
                        <TextField
                            fullWidth
                            label="Tên công ty"
                            margin="normal"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                        <TextField
                            fullWidth
                            label="Thông tin liên hệ"
                            margin="normal"
                            multiline
                            rows={3}
                            value={formData.contact_info}
                            onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
                            Lưu
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
