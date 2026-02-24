import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningService } from '../../services/planning.service';
import { orderService } from '../../services/order.service';
import { productGroupService } from '../../services/product-group.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, Typography, Divider, CircularProgress, Alert, 
    FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Paper, Chip
} from '@mui/material';
import { DateTime } from 'luxon';

export default function PlanningPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [selectedOpId, setSelectedOpId] = useState('');
    const [inventory, setInventory] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [plannedDays, setPlannedDays] = useState([]);

    // Data Fetching
    const { data: plans, isLoading, error } = useQuery({ queryKey: ['plans'], queryFn: planningService.getAll });
    const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: orderService.getAll });

    const selectedOrder = orders?.find(o => o.id === selectedOrderId);
    
    // Fetch operations mapped to the product group of the selected order
    const { data: operations, isLoading: loadingOps } = useQuery({
        queryKey: ['orderOps', selectedOrder?.product_group_id],
        queryFn: () => productGroupService.getOperations(selectedOrder.product_group_id),
        enabled: !!selectedOrder?.product_group_id
    });

    const selectedOp = operations?.find(op => op.id === selectedOpId);

    // Derived Calculations
    const totalOrderQty = selectedOrder ? parseFloat(selectedOrder.quantity) : 0;
    const remainingQty = Math.max(0, totalOrderQty - inventory);
    const dinhMuc = selectedOp ? parseFloat(selectedOp.dinh_muc) : 0;
    const totalHoursNeeded = dinhMuc > 0 ? (remainingQty / dinhMuc) : 0;

    // Handle Schedule Generation
    useEffect(() => {
        if (startDate && totalHoursNeeded > 0 && selectedOp) {
            let days = [];
            let unassignedHours = totalHoursNeeded;
            let current = DateTime.fromISO(startDate);
            const standardHoursPerDay = 8; 

            while (unassignedHours > 0.01) {
                // Default capacity per day is 8 hours (or whatever "1" unit of work means to the user)
                const dayWorkHours = Math.min(unassignedHours, standardHoursPerDay);
                days.push({
                    date: current.toISODate(),
                    hours: dayWorkHours.toFixed(2),
                    is_overtime: false
                });
                unassignedHours -= dayWorkHours;
                current = current.plus({ days: 1 });
            }
            setPlannedDays(days);
        } else {
            setPlannedDays([]);
        }
    }, [startDate, totalHoursNeeded, selectedOp]);

    const mutation = useMutation({
        mutationFn: planningService.createPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            handleClose();
        }
    });

    const handleClose = () => {
        setOpenModal(false);
        setSelectedOrderId('');
        setSelectedOpId('');
        setInventory(0);
        setStartDate('');
        setPlannedDays([]);
    };

    const handleSubmit = () => {
        const payload = {
            order_id: selectedOrderId,
            product_group_operation_id: selectedOpId,
            inventory_input: inventory,
            planned_start_date: startDate,
            days: plannedDays.map(d => ({
                date: d.date,
                hours: d.hours,
                is_overtime: d.is_overtime
            }))
        };
        mutation.mutate(payload);
    };

    const columns = [
        { id: 'order_code', label: 'Đơn hàng' },
        { id: 'operation_name', label: 'Công đoạn' },
        { id: 'machine_name', label: 'Máy' },
        { id: 'inventory_input', label: 'Tồn kho nhập', align: 'right' },
        { id: 'remaining_quantity', label: 'SL còn lại', align: 'right' },
        { 
            id: 'planned_start_date', 
            label: 'Thời gian', 
            format: (v, row) => (
                <Box>
                    <Typography variant="body2">{DateTime.fromISO(row.planned_start_date).toFormat('dd/MM/yyyy')}</Typography>
                    <Typography variant="caption" color="textSecondary">đến {DateTime.fromISO(row.planned_end_date).toFormat('dd/MM/yyyy')}</Typography>
                </Box>
            )
        },
        { 
            id: 'status', 
            label: 'Trạng thái',
            format: (v) => <Chip label={v} size="small" color={v === 'DONE' ? 'success' : 'primary'} variant="outlined" />
        }
    ];

    return (
        <Box>
            <GenericTable 
                title="Quản lý Kế hoạch Sản xuất"
                data={plans}
                columns={columns}
                isLoading={isLoading}
                error={error}
                onAdd={() => setOpenModal(true)}
                onDelete={(row) => window.confirm(`Xóa kế hoạch này?`) && planningService.delete(row.id).then(() => queryClient.invalidateQueries(['plans']))}
            />

            <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 700 }}>Lập kế hoạch sản xuất mới</DialogTitle>
                <DialogContent dividers>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={4} mt={1}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Chọn đơn hàng</InputLabel>
                            <Select 
                                value={selectedOrderId} 
                                label="Chọn đơn hàng" 
                                onChange={e => {
                                    setSelectedOrderId(e.target.value);
                                    setSelectedOpId(''); // Reset op when order changes
                                }}
                            >
                                {orders?.map(o => (
                                    <MenuItem key={o.id} value={o.id}>
                                        {o.order_code} - {o.product_name} ({o.quantity} SP)
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" disabled={!selectedOrderId || loadingOps}>
                            <InputLabel>Chọn công đoạn / Mã hàng công đoạn</InputLabel>
                            <Select value={selectedOpId} label="Chọn công đoạn / Mã hàng công đoạn" onChange={e => setSelectedOpId(e.target.value)}>
                                {operations?.map(op => (
                                    <MenuItem key={op.id} value={op.id}>
                                        Bước {op.sequence_order}: {op.operation_name} ({op.machine_name})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {selectedOp && (
                        <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: '16px', bgcolor: 'background.default' }}>
                            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2} mb={3}>
                                <Box>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>TỔNG SL ĐƠN</Typography>
                                    <Typography variant="h6" fontWeight={700}>{totalOrderQty.toLocaleString()}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>ĐỊNH MỨC (SP/GIỜ)</Typography>
                                    <Typography variant="h6" fontWeight={700} color="primary">{dinhMuc}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>MÁY PHỤ TRÁCH</Typography>
                                    <Typography variant="h6" fontWeight={700}>{selectedOp.machine_name}</Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3} alignItems="flex-end">
                                <TextField 
                                    label="Tồn kho nhập" 
                                    type="number" 
                                    size="small"
                                    value={inventory} 
                                    onChange={e => setInventory(parseFloat(e.target.value) || 0)}
                                    sx={{ bgcolor: 'white' }}
                                />
                                <Box>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>SỐ LƯỢNG CÒN LẠI</Typography>
                                    <Typography variant="h5" fontWeight={800} color="error.main">{remainingQty.toLocaleString()}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>TỔNG CÔNG CẦN (HRS)</Typography>
                                    <Typography variant="h5" fontWeight={800} color="secondary.main">{totalHoursNeeded.toFixed(1)}</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    {selectedOp && (
                        <Box mb={3}>
                            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Thời gian & Lịch biểu:</Typography>
                            <TextField 
                                label="Ngày bắt đầu" 
                                type="date" 
                                fullWidth 
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)}
                                sx={{ mb: 3 }}
                            />

                            {plannedDays.length > 0 && (
                                <Box sx={{ 
                                    borderRadius: '12px', 
                                    overflow: 'hidden', 
                                    border: '1px solid', 
                                    borderColor: 'divider' 
                                }}>
                                    <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" fontWeight={700}>NGÀY LÀM VIỆC</Typography>
                                        <Typography variant="caption" fontWeight={700}>KHỐI LƯỢNG (GIỜ)</Typography>
                                        <Typography variant="caption" fontWeight={700}>TÙY CHỌN</Typography>
                                    </Box>
                                    <Box sx={{ maxHeight: 250, overflow: 'auto' }}>
                                        {plannedDays.map((day, idx) => (
                                            <Box key={idx} sx={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                p: 1.5, 
                                                borderBottom: idx === plannedDays.length - 1 ? 'none' : '1px solid', 
                                                borderColor: 'divider',
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' }
                                            }}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2" fontWeight={600}>{DateTime.fromISO(day.date).toFormat('dd/MM')}</Typography>
                                                    <Typography variant="caption" color="textSecondary">({DateTime.fromISO(day.date).toFormat('EEE')})</Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={700} color="primary">{day.hours}</Typography>
                                                <FormControlLabel 
                                                    sx={{ m: 0 }}
                                                    control={<Checkbox size="small" sx={{ p: 0.5 }} checked={day.is_overtime} onChange={e => {
                                                        const newDays = [...plannedDays];
                                                        newDays[idx].is_overtime = e.target.checked;
                                                        setPlannedDays(newDays);
                                                    }} />} 
                                                    label={<Typography variant="caption" fontWeight={600}>Tăng ca</Typography>} 
                                                />
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
                    <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>Hủy bỏ</Button>
                    <Button 
                        variant="contained" 
                        disabled={!startDate || plannedDays.length === 0 || mutation.isPending}
                        onClick={handleSubmit}
                        sx={{ px: 4, py: 1, borderRadius: '10px', fontWeight: 700 }}
                    >
                        {mutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'Xác nhận kế hoạch'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
