import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../../services/order.service';
import { customerService } from '../../services/customer.service';
import { productService } from '../../services/product.service';
import { factoryService } from '../../services/factory.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Typography, Divider
} from '@mui/material';
import { DateTime } from 'luxon';

export default function OrderPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    
    const initialForm = { 
        order_code: '', 
        name: '', 
        customer_id: '', 
        product_id: '', 
        po_customer: '', 
        received_date: DateTime.now().toFormat('yyyy-MM-dd'), 
        quantity: '', 
        factory_id: '',
        production_location: '',
        person_in_charge: '',
        note: '',
        status: 'DRAFT'
    };
    const [formData, setFormData] = useState(initialForm);

    // Queries
    const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: customerService.getAll });
    const { data: factories } = useQuery({ queryKey: ['factories'], queryFn: factoryService.getAll });
    const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => productService.getAll() });
    const { data: orders, isLoading, error } = useQuery({ queryKey: ['orders'], queryFn: orderService.getAll });

    // Mutations
    const mutationOpts = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            handleClose();
        }
    };
    const createMutation = useMutation({ mutationFn: orderService.create, ...mutationOpts });
    const updateMutation = useMutation({ mutationFn: ({id, payload}) => orderService.update(id, payload), ...mutationOpts });
    const deleteMutation = useMutation({ 
        mutationFn: orderService.delete, 
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
    });

    const columns = [
        { id: 'order_code', label: 'Mã đơn hàng' },
        { id: 'po_customer', label: 'PO Khách hàng' },
        { id: 'name', label: 'Tên đơn hàng' },
        { id: 'customer_name', label: 'Khách hàng' },
        { id: 'product_name', label: 'Sản phẩm' },
        { id: 'quantity', label: 'Số lượng' },
        { id: 'status', label: 'Trạng thái' }
    ];

    const handleOpen = (order = null) => {
        if (order) {
            setSelectedOrder(order);
            setFormData({ 
                order_code: order.order_code,
                name: order.name,
                customer_id: order.customer_id, 
                product_id: order.product_id,
                po_customer: order.po_customer, 
                received_date: DateTime.fromISO(order.received_date).toFormat('yyyy-MM-dd'),
                quantity: order.quantity,
                factory_id: order.factory_id,
                production_location: order.production_location || '',
                person_in_charge: order.person_in_charge || '',
                note: order.note || '',
                status: order.status
            });
        } else {
            setSelectedOrder(null);
            setFormData(initialForm);
        }
        setOpenModal(true);
    };

    const handleClose = () => {
        setOpenModal(false);
        setSelectedOrder(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            quantity: parseFloat(formData.quantity)
        };

        if (selectedOrder) updateMutation.mutate({ id: selectedOrder.id, payload });
        else createMutation.mutate(payload);
    };

    const handleDelete = (order) => {
        if(window.confirm(`Xóa đơn hàng ${order.order_code}?`)) deleteMutation.mutate(order.id);
    };

    return (
        <Box>
             <GenericTable 
                title={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <h2>Quản lý Đơn hàng</h2>
                        <Button variant="contained" color="secondary" onClick={() => handleOpen()}>+ Thêm đơn hàng</Button>
                    </Box>
                }
                data={orders}
                columns={columns}
                isLoading={isLoading}
                error={error}
                onEdit={handleOpen}
                onDelete={handleDelete}
            />

            <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{selectedOrder ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}</DialogTitle>
                    <DialogContent dividers>
                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                            <TextField 
                                fullWidth margin="dense" label="Mã đơn hàng" required
                                disabled={!!selectedOrder}
                                value={formData.order_code} 
                                onChange={e => setFormData({...formData, order_code: e.target.value})} 
                            />
                            <TextField 
                                fullWidth margin="dense" label="PO Khách hàng" required
                                value={formData.po_customer} 
                                onChange={e => setFormData({...formData, po_customer: e.target.value})} 
                            />
                        </Box>

                        <TextField 
                            fullWidth margin="normal" label="Tên đơn hàng" required
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                        />

                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1} mt={1}>
                            <FormControl fullWidth size="small" required>
                                <InputLabel>Nhà máy</InputLabel>
                                <Select value={formData.factory_id} label="Nhà máy" onChange={e => setFormData({...formData, factory_id: e.target.value})}>
                                    {factories?.filter(f => f.is_active).map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small" required>
                                <InputLabel>Khách hàng</InputLabel>
                                <Select value={formData.customer_id} label="Khách hàng" onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                                    {customers?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box display="grid" gridTemplateColumns="2fr 1fr" gap={2} mt={2}>
                            <FormControl fullWidth size="small" required>
                                <InputLabel>Sản phẩm</InputLabel>
                                <Select value={formData.product_id} label="Sản phẩm" onChange={e => setFormData({...formData, product_id: e.target.value})}>
                                    {products?.filter(p => p.is_active).map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <TextField 
                                fullWidth label="Số lượng" type="number" required size="small"
                                value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} 
                            />
                        </Box>
                        
                        <Box display="grid" gridTemplateColumns="1fr" gap={2} mt={2}>
                            <TextField 
                                fullWidth label="Ngày nhận" type="date" required size="small"
                                InputLabelProps={{ shrink: true }}
                                value={formData.received_date} 
                                onChange={e => setFormData({...formData, received_date: e.target.value})} 
                            />
                        </Box>

                        <TextField 
                            fullWidth margin="normal" label="Địa điểm sản xuất" size="small"
                            value={formData.production_location} onChange={e => setFormData({...formData, production_location: e.target.value})} 
                        />
                        <TextField 
                            fullWidth margin="normal" label="Người phụ trách" size="small"
                            value={formData.person_in_charge} onChange={e => setFormData({...formData, person_in_charge: e.target.value})} 
                        />
                        <TextField 
                            fullWidth margin="normal" label="Ghi chú" size="small" multiline rows={2}
                            value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} 
                        />

                        {selectedOrder && (
                            <FormControl fullWidth margin="normal" size="small">
                                <InputLabel>Trạng thái</InputLabel>
                                <Select value={formData.status} label="Trạng thái" onChange={e => setFormData({...formData, status: e.target.value})}>
                                    {['DRAFT', 'PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </Select>
                            </FormControl>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button type="submit" variant="contained">Lưu đơn hàng</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}
