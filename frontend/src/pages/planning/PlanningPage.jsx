import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningService } from '../../services/planning.service';
import { orderService } from '../../services/order.service';
import { productGroupService } from '../../services/product-group.service';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, Typography, Divider, CircularProgress, Alert, 
    FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Paper, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
    TablePagination, InputAdornment, Autocomplete, Snackbar
} from '@mui/material';
import { DateTime } from 'luxon';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';

// Styled cell for the Excel look
const ExcelHeaderCell = ({ children, sx = {}, colSpan = 1, rowSpan = 1 }) => (
    <TableCell 
        colSpan={colSpan}
        rowSpan={rowSpan}
        align="center"
        sx={{ 
            border: '1px solid #cbd5e1',
            bgcolor: '#f1f5f9',
            color: '#475569',
            fontWeight: 800,
            fontSize: 'max(0.75rem, 0.8vw)',
            p: '12px 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            ...sx 
        }}
    >
        {children}
    </TableCell>
);

const ExcelDataCell = ({ children, align = 'center', sx = {} }) => (
    <TableCell 
        align={align}
        sx={{ 
            border: '1px solid #e2e8f0',
            p: '10px 12px',
            fontSize: 'max(0.8rem, 0.85vw)',
            color: '#1e293b',
            whiteSpace: 'nowrap',
            height: '48px',
            ...sx 
        }}
    >
        {children}
    </TableCell>
);

const NORMAL_CAPACITY = 1;
const OVERTIME_CAPACITY = 1.43; // Updated as per user request (was 1.43)

// Optimized sub-component for handling numeric inputs with local state to prevent lag
const ManagedTextField = ({ value, onCommit, ...props }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
        if (!isFocused) {
            setLocalValue(value);
        }
    }, [value, isFocused]);

    const handleBlur = () => {
        setIsFocused(false);
        if (localValue !== value) {
            onCommit(localValue);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    return (
        <TextField
            {...props}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
};

export default function PlanningPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [selectedOpId, setSelectedOpId] = useState('');
    const [inventory, setInventory] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [plannedDays, setPlannedDays] = useState([]);
    const [editingPlan, setEditingPlan] = useState(null);
    const [inlineEditingId, setInlineEditingId] = useState(null);
    const [inlineEditDays, setInlineEditDays] = useState([]);
    
    // Pagination & Filter state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, planId: null });

    // Data Fetching
    const { data: plansData, isLoading, error } = useQuery({ 
        queryKey: ['plans', page, rowsPerPage, selectedOrderIds], 
        queryFn: () => planningService.getAll({ 
            page: page + 1, 
            limit: rowsPerPage, 
            order_ids: selectedOrderIds.join(',') 
        }),
        keepPreviousData: true
    });
    
    const plans = plansData?.data || [];
    const totalCount = plansData?.total || 0;

    const { data: allOrdersData } = useQuery({ queryKey: ['orders'], queryFn: orderService.getAll });
    const orders = allOrdersData || [];

    const selectedOrder = orders?.find(o => o.id === selectedOrderId);
    
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
    const totalDaysNeeded = dinhMuc > 0 ? (remainingQty / dinhMuc) / 8 : 0;

    // Detect unique dates for columns
    const dateColumns = useMemo(() => {
        if (!plans) return [];
        const dates = new Set();
        plans.forEach(plan => {
            plan.days?.forEach(day => {
                dates.add(DateTime.fromISO(day.working_date).toFormat('yyyy-MM-dd'));
            });
        });
        return Array.from(dates).sort().map(d => ({
            key: d,
            label: DateTime.fromISO(d).toFormat('dd-MM')
        }));
    }, [plans]);

    const autoCalculateSchedule = (totalNeeded, start, currentDays = []) => {
        if (!start || totalNeeded <= 0) return [];
        
        let result = [];
        let remaining = totalNeeded;
        let currentDate = DateTime.fromISO(start);
        
        let i = 0;
        while (remaining > 0.001) {
            const isOvertime = currentDays[i]?.is_overtime || false;
            const capacity = isOvertime ? OVERTIME_CAPACITY : NORMAL_CAPACITY;
            const work = Math.min(remaining, capacity);
            
            result.push({
                date: currentDate.toISODate(),
                hours: work.toFixed(2),
                is_overtime: isOvertime
            });
            
            remaining -= work;
            currentDate = currentDate.plus({ days: 1 });
            i++;
        }
        return result;
    };

    const rebalanceDays = (daysArray, changedIndex, newValRaw, targetTotal) => {
        const newVal = parseFloat(newValRaw) || 0;
        const updated = [...daysArray];
        // Clean value and update the specific day
        updated[changedIndex] = { ...updated[changedIndex], hours: newVal.toFixed(2) };
        
        // Sum everything BEFORE and INCLUDING the changed day
        const sumSoFar = updated.slice(0, changedIndex + 1).reduce((sum, d) => sum + parseFloat(d.hours || 0), 0);
        let remaining = Math.max(0, targetTotal - sumSoFar);
        
        const head = updated.slice(0, changedIndex + 1);
        if (remaining < 0.001) return head; // Goal reached or exceeded (within float precision)
        
        // Calculate remaining sequence
        const nextDateStr = DateTime.fromISO(updated[changedIndex].date).plus({ days: 1 }).toISODate();
        const tailPrefs = updated.slice(changedIndex + 1);
        const newTail = autoCalculateSchedule(remaining, nextDateStr, tailPrefs);
        
        return [...head, ...newTail];
    };

    // Auto-calculate when totalDaysNeeded or startDate changes
    React.useEffect(() => {
        // If we're editing, we only want to auto-recalculate if the core parameters change
        // (Order, Op, or Inventory/Qty changed)
        if (startDate && totalDaysNeeded > 0) {
            const newDays = autoCalculateSchedule(totalDaysNeeded, startDate);
            setPlannedDays(newDays);
        }
    }, [totalDaysNeeded, startDate]);

    // Handlers
    const handleStartDateChange = (val) => {
        setStartDate(val);
    };

    const handleDayChange = (index, value) => {
        setPlannedDays(prev => rebalanceDays(prev, index, value, totalDaysNeeded));
    };

    const handleDayValueOnlyChange = (index, value) => {
        setPlannedDays(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], hours: value };
            return updated;
        });
    };

    const handleAddDay = () => {
        const lastDay = plannedDays[plannedDays.length - 1];
        const nextDate = lastDay ? DateTime.fromISO(lastDay.date).plus({ days: 1 }).toISODate() : startDate;
        setPlannedDays([...plannedDays, {
            date: nextDate,
            hours: "0.00",
            is_overtime: false
        }]);
    };

    const handleOpenEdit = (plan) => {
        setEditingPlan(plan);
        setSelectedOrderId(plan.order_id);
        setSelectedOpId(plan.product_group_operation_id);
        setInventory(parseFloat(plan.inventory_input));
        setStartDate(DateTime.fromISO(plan.planned_start_date).toISODate());
        setPlannedDays(plan.days.map(d => ({
            date: DateTime.fromISO(d.working_date).toISODate(),
            hours: (parseFloat(d.planned_work_quantity) / 8).toFixed(2), // Convert hours from DB to days for UI
            is_overtime: d.is_overtime
        })));
        setOpenModal(true);
    };

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => planningService.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            setSnackbar({ open: true, message: 'Cập nhật thành công!', severity: 'success' });
        }
    });

    const createMutation = useMutation({
        mutationFn: (payload) => planningService.createPlan(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            handleClose();
            setSnackbar({ open: true, message: 'Thêm mới thành công!', severity: 'success' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => planningService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            setSnackbar({ open: true, message: 'Xóa kế hoạch thành công!', severity: 'success' });
            setDeleteConfirm({ open: false, planId: null });
        },
        onError: (error) => {
            setSnackbar({ open: true, message: 'Lỗi khi xóa: ' + (error.response?.data?.message || error.message), severity: 'error' });
        }
    });

    const handleStartInlineEdit = (plan) => {
        setInlineEditingId(plan.id);
        setInlineEditDays(plan.days.map(d => ({
            date: DateTime.fromISO(d.working_date).toFormat('yyyy-MM-dd'),
            hours: (parseFloat(d.planned_work_quantity) / 8).toFixed(2),
            is_overtime: d.is_overtime
        })));
    };

    const handleCancelInlineEdit = () => {
        setInlineEditingId(null);
        setInlineEditDays([]);
    };

    const handleInlineDayChange = (plan, dateISO, value) => {
        const index = inlineEditDays.findIndex(d => d.date === dateISO);
        if (index >= 0) {
            const planTotalNeeded = (parseFloat(plan.quantity) - parseFloat(plan.inventory_input)) / (parseFloat(plan.dinh_muc) || 1) / 8;
            setInlineEditDays(prev => rebalanceDays(prev, index, value, planTotalNeeded));
        } else {
            const newVal = parseFloat(value) || 0;
            setInlineEditDays(prev => [...prev, { date: dateISO, hours: newVal.toFixed(2), is_overtime: false }]);
        }
    };

    const handleInlineDayValueOnlyChange = (dateISO, value) => {
        setInlineEditDays(prev => {
            const index = prev.findIndex(d => d.date === dateISO);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = { ...updated[index], hours: value };
                return updated;
            }
            return [...prev, { date: dateISO, hours: value, is_overtime: false }];
        });
    };

    const handleSaveInline = (plan) => {
        const payload = {
            inventory_input: plan.inventory_input,
            planned_start_date: plan.planned_start_date,
            days: inlineEditDays
                .filter(d => parseFloat(d.hours) > 0) // Filter out days with 0 work
                .map(d => ({
                    date: d.date,
                    hours: (parseFloat(d.hours) * 8).toFixed(2),
                    is_overtime: d.is_overtime
                }))
        };

        updateMutation.mutate({ id: plan.id, payload }, {
            onSuccess: () => handleCancelInlineEdit()
        });
    };

    const handleClose = () => {
        setOpenModal(false);
        setEditingPlan(null);
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
            days: plannedDays
                .filter(d => parseFloat(d.hours) > 0) // Filter out days with 0 work
                .map(d => ({
                    date: d.date,
                    hours: (parseFloat(d.hours) * 8).toFixed(2), // Convert days from UI back to hours for DB
                    is_overtime: d.is_overtime
                }))
        };
        if (editingPlan) {
            updateMutation.mutate({ id: editingPlan.id, payload }, {
                onSuccess: () => handleClose()
            });
        } else {
            createMutation.mutate(payload);
        }
    };

    if (isLoading) return (
        <Box display="flex" justifyContent="center" alignItems="center" p={10}>
            <CircularProgress />
        </Box>
    );

    if (error) return <Alert severity="error">{error.message}</Alert>;

    return (
        <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f7fa' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700} color="#1e293b">Lập Kế Hoạch Sản Xuất</Typography>
                
                <Box display="flex" alignItems="center" gap={2}>
                    <Autocomplete
                        multiple
                        size="small"
                        options={orders}
                        getOptionLabel={(option) => `${option.order_code} - ${option.name}`}
                        value={orders.filter(o => selectedOrderIds.includes(o.id))}
                        onChange={(e, newValue) => {
                            setSelectedOrderIds(newValue.map(v => v.id));
                            setPage(0);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn đơn hàng..."
                                sx={{ 
                                    minWidth: 300, 
                                    bgcolor: 'white', 
                                    borderRadius: '8px',
                                    '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                                }}
                            />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    variant="filled"
                                    size="small"
                                    label={option.order_code}
                                    {...getTagProps({ index })}
                                    sx={{ borderRadius: '4px', bgcolor: '#e2e8f0', fontWeight: 600, fontSize: '0.7rem' }}
                                />
                            ))
                        }
                    />
                    <Button variant="contained" onClick={() => setOpenModal(true)} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}>
                        + Lập kế hoạch mới
                    </Button>
                </Box>
            </Box>

            <Paper elevation={0} sx={{ flexGrow: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <ExcelHeaderCell>STT</ExcelHeaderCell>
                                <ExcelHeaderCell>STT CĐ</ExcelHeaderCell>
                                <ExcelHeaderCell>Mã mặt hàng</ExcelHeaderCell>
                                <ExcelHeaderCell>Nhóm mã hàng</ExcelHeaderCell>
                                <ExcelHeaderCell>Tên công đoạn</ExcelHeaderCell>
                                <ExcelHeaderCell>Loại máy</ExcelHeaderCell>
                                <ExcelHeaderCell>Số lượng</ExcelHeaderCell>
                                <ExcelHeaderCell>Số lượng tồn kho</ExcelHeaderCell>
                                <ExcelHeaderCell>Số lượng còn lại</ExcelHeaderCell>
                                <ExcelHeaderCell>Định mức/giờ</ExcelHeaderCell>
                                <ExcelHeaderCell>Tổng số công cần</ExcelHeaderCell>
                                <ExcelHeaderCell>Còn lại</ExcelHeaderCell>
                                <ExcelHeaderCell>Ghi chú</ExcelHeaderCell>
                                <ExcelHeaderCell>Ngày B</ExcelHeaderCell>
                                <ExcelHeaderCell>Ngày H</ExcelHeaderCell>
                                {dateColumns.map(date => (
                                    <ExcelHeaderCell key={date.key}>{date.label}</ExcelHeaderCell>
                                ))}
                                <ExcelHeaderCell sx={{ position: 'sticky', right: 0, zIndex: 10, bgcolor: '#f1f5f9', boxShadow: '-2px 0 5px rgba(0,0,0,0.05)' }}>Action</ExcelHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {plans?.map((plan, idx) => {
                                const isYellow = idx % 3 === 0;
                                const isOrange = idx % 2 === 0;
                                
                                return (
                                    <TableRow key={plan.id} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#f8fafc' } }}>
                                        <ExcelDataCell>{idx + 1}</ExcelDataCell>
                                        <ExcelDataCell>{plan.sequence_order}</ExcelDataCell>
                                        <ExcelDataCell sx={{ bgcolor: isYellow ? '#ffeb3b' : (isOrange ? '#ffcc80' : 'inherit') }}>
                                            {plan.order_code}
                                        </ExcelDataCell>
                                        <ExcelDataCell sx={{ bgcolor: isYellow ? '#ffee58' : (isOrange ? '#ffe0b2' : 'inherit') }}>
                                            {plan.product_group_name}
                                        </ExcelDataCell>
                                        <ExcelDataCell align="left">{plan.operation_name}</ExcelDataCell>
                                        <ExcelDataCell align="left">{plan.machine_name}</ExcelDataCell>
                                        <ExcelDataCell align="right">{(parseFloat(plan.inventory_input) + parseFloat(plan.remaining_quantity)).toLocaleString()}</ExcelDataCell>
                                        <ExcelDataCell align="right">{parseFloat(plan.inventory_input).toLocaleString()}</ExcelDataCell>
                                        <ExcelDataCell align="right" sx={{ fontWeight: 700 }}>{parseFloat(plan.remaining_quantity).toLocaleString()}</ExcelDataCell>
                                        <ExcelDataCell align="right">{plan.dinh_muc}</ExcelDataCell>
                                        <ExcelDataCell align="right" sx={{ color: '#e53935' }}>
                                            {(parseFloat(plan.total_required_work) / 8).toFixed(2)}
                                        </ExcelDataCell>
                                        <ExcelDataCell align="right">0.00</ExcelDataCell>
                                        <ExcelDataCell sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 700 }}>x</ExcelDataCell>
                                        <ExcelDataCell sx={{ color: '#64748b' }}>{DateTime.fromISO(plan.planned_start_date).toFormat('dd-MM')}</ExcelDataCell>
                                        <ExcelDataCell sx={{ color: '#64748b' }}>{DateTime.fromISO(plan.planned_end_date).toFormat('dd-MM')}</ExcelDataCell>
                                        {dateColumns.map((date, colIdx) => {
                                            const isEditing = inlineEditingId === plan.id;
                                            const dayData = plan.days.find(d => DateTime.fromISO(d.working_date).toFormat('yyyy-MM-dd') === date.key);
                                            const editDayData = inlineEditDays.find(d => d.date === date.key);
                                            
                                            return (
                                                <ExcelDataCell key={date.key} sx={{ bgcolor: isEditing ? '#fff' : (dayData ? '#fef9c3' : 'inherit'), p: isEditing ? 0 : '6px 8px' }}>
                                                    {isEditing ? (
                                                        <>
                                                            <ManagedTextField
                                                                size="small"
                                                                variant="standard"
                                                                type="number"
                                                                value={editDayData ? editDayData.hours : '0.00'}
                                                                onCommit={(val) => handleInlineDayChange(plan, date.key, val)}
                                                                InputProps={{ 
                                                                    disableUnderline: true,
                                                                    autoFocus: colIdx === 0, // Auto-focus on the first editable cell
                                                                    sx: { 
                                                                        fontSize: '0.8rem', 
                                                                        textAlign: 'center',
                                                                        '& input': { textAlign: 'center', fontWeight: 700, p: 0 }
                                                                    }
                                                                }}
                                                                sx={{
                                                                    width: '100%',
                                                                    height: '40px',
                                                                    border: 'none',
                                                                    background: '#ffffff',
                                                                    textAlign: 'center',
                                                                    fontSize: '0.95rem',
                                                                    fontWeight: 800,
                                                                    outline: '2px solid #3b82f6',
                                                                    padding: '4px 8px',
                                                                    color: '#2563eb',
                                                                    borderRadius: '4px',
                                                                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                                                        '-webkit-appearance': 'none',
                                                                        margin: 0,
                                                                    },
                                                                    '& input[type=number]': {
                                                                        '-moz-appearance': 'textfield',
                                                                    },
                                                                    '&:hover': {
                                                                        background: '#f8fafc',
                                                                    }
                                                                }}
                                                            />
                                                        </>
                                                    ) : (
                                                        <Typography variant="caption" sx={{ fontWeight: dayData ? 700 : 400, color: dayData ? '#854d0e' : '#94a3b8' }}>
                                                            {dayData ? (parseFloat(dayData.planned_work_quantity) / 8).toFixed(2) : '-'}
                                                        </Typography>
                                                    )}
                                                </ExcelDataCell>
                                            );
                                        })}
                                        <ExcelDataCell sx={{ position: 'sticky', right: 0, zIndex: 5, bgcolor: 'white', borderLeft: '1px solid #cbd5e1', boxShadow: '-2px 0 5px rgba(0,0,0,0.02)' }}>
                                            <Box display="flex" gap={0.5} justifyContent="center" bgcolor="white">
                                                {inlineEditingId === plan.id ? (
                                                    <>
                                                        <Tooltip title="Lưu thay đổi">
                                                            <IconButton size="small" sx={{ color: '#22c55e' }} onClick={() => handleSaveInline(plan)} disabled={updateMutation.isPending}>
                                                                {updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Hủy bỏ">
                                                            <IconButton size="small" sx={{ color: '#ef4444' }} onClick={handleCancelInlineEdit} disabled={updateMutation.isPending}>
                                                                <CancelIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Tooltip title="Sửa nhanh hàng này">
                                                            <IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => handleStartInlineEdit(plan)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Chỉnh sửa chi tiết">
                                                            <IconButton size="small" sx={{ color: '#6366f1' }} onClick={() => handleOpenEdit(plan)}>
                                                                <OpenInNewIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Xóa kế hoạch">
                                                            <IconButton 
                                                                size="small" 
                                                                sx={{ color: '#f43f5e' }} 
                                                                onClick={() => setDeleteConfirm({ open: true, planId: plan.id })}
                                                                disabled={deleteMutation.isPending && deleteConfirm.planId === plan.id}
                                                            >
                                                                {deleteMutation.isPending && deleteConfirm.planId === plan.id ? 
                                                                    <CircularProgress size={16} color="inherit" /> : 
                                                                    <DeleteIcon fontSize="small" />
                                                                }
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </Box>
                                        </ExcelDataCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, planId: null })}>
                    <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận xóa</DialogTitle>
                    <DialogContent>
                        <Typography>Bạn có chắc chắn muốn xóa kế hoạch sản xuất này không? Hành động này không thể hoàn tác.</Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setDeleteConfirm({ open: false, planId: null })} color="inherit">Hủy bỏ</Button>
                        <Button 
                            onClick={() => deleteMutation.mutate(deleteConfirm.planId)} 
                            variant="contained" 
                            color="error"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Đang xóa...' : 'Đồng ý xóa'}
                        </Button>
                    </DialogActions>
                </Dialog>
                
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    sx={{
                        borderTop: '1px solid #e2e8f0',
                        bgcolor: 'white',
                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'text.secondary'
                        }
                    }}
                />
            </Paper>

            <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editingPlan ? 'Chỉnh sửa kế hoạch sản xuất' : 'Lập kế hoạch sản xuất mới'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={4} mt={1}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Chọn đơn hàng</InputLabel>
                            <Select 
                                value={selectedOrderId} 
                                label="Chọn đơn hàng" 
                                disabled={!!editingPlan}
                                onChange={e => {
                                    setSelectedOrderId(e.target.value);
                                    setSelectedOpId(''); 
                                }}
                            >
                                {orders?.map(o => (
                                    <MenuItem key={o.id} value={o.id}>
                                        {o.order_code} - {o.name} ({o.quantity} SP)
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" disabled={!selectedOrderId || loadingOps}>
                            <InputLabel>Chọn công đoạn / Mã hàng công đoạn</InputLabel>
                            <Select 
                                value={selectedOpId} 
                                label="Chọn công đoạn / Mã hàng công đoạn" 
                                disabled={!!editingPlan}
                                onChange={e => setSelectedOpId(e.target.value)}
                            >
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
                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>TỔNG CÔNG CẦN</Typography>
                                    <Typography variant="h5" fontWeight={800} color="secondary.main">{totalDaysNeeded.toFixed(2)}</Typography>
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
                                onChange={e => handleStartDateChange(e.target.value)}
                                sx={{ mb: 3 }}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography variant="subtitle2" fontWeight={700}>Danh sách ngày làm việc:</Typography>
                                <Button 
                                    size="small" 
                                    startIcon={<AddCircleIcon />} 
                                    onClick={handleAddDay}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Thêm ngày
                                </Button>
                            </Box>

                            {plannedDays.length > 0 && (
                                <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" fontWeight={700} sx={{ width: '30%' }}>NGÀY LÀM VIỆC</Typography>
                                        <Typography variant="caption" fontWeight={700} sx={{ width: '30%', textAlign: 'center' }}>SỐ CÔNG</Typography>
                                        <Typography variant="caption" fontWeight={700} sx={{ width: '30%', textAlign: 'right' }}>TÙY CHỌN</Typography>
                                    </Box>
                                    <Box sx={{ maxHeight: 250, overflow: 'auto' }}>
                                        {plannedDays.map((day, idx) => (
                                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: idx === plannedDays.length - 1 ? 'none' : '1px solid', borderColor: 'divider' }}>
                                                <Box display="flex" alignItems="center" gap={1} sx={{ width: '30%' }}>
                                                    <TextField
                                                        type="date"
                                                        size="small"
                                                        variant="standard"
                                                        value={day.date}
                                                        onChange={e => {
                                                            const newDays = [...plannedDays];
                                                            newDays[idx].date = e.target.value;
                                                            setPlannedDays(newDays);
                                                        }}
                                                        InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem', fontWeight: 600 } }}
                                                    />
                                                </Box>
                                                <Box sx={{ width: '30%', display: 'flex', justifyContent: 'center' }}>
                                                    <ManagedTextField 
                                                        size="small" 
                                                        type="number"
                                                        value={day.hours}
                                                        onCommit={(val) => handleDayChange(idx, val)}
                                                        InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem', fontWeight: 700, textAlign: 'center' } }}
                                                        sx={{ width: 80 }}
                                                    />
                                                </Box>
                                                <Box sx={{ width: '30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <FormControlLabel 
                                                        sx={{ m: 0 }}
                                                        control={<Checkbox size="small" sx={{ p: 0.5 }} checked={day.is_overtime} onChange={e => {
                                                            const newDays = [...plannedDays];
                                                            newDays[idx].is_overtime = e.target.checked;
                                                            const recalculated = autoCalculateSchedule(totalDaysNeeded, startDate, newDays);
                                                            setPlannedDays(recalculated);
                                                        }} />} 
                                                        label={<Typography variant="caption" fontWeight={600}>Tăng ca</Typography>} 
                                                    />
                                                    <IconButton size="small" color="error" onClick={() => {
                                                        const newDays = [...plannedDays];
                                                        newDays.splice(idx, 1);
                                                        setPlannedDays(newDays);
                                                    }}>
                                                        <Typography variant="caption" sx={{ fontSize: '10px' }}>×</Typography>
                                                    </IconButton>
                                                </Box>
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
                        disabled={!startDate || plannedDays.length === 0 || createMutation.isPending || updateMutation.isPending}
                        onClick={handleSubmit}
                        sx={{ px: 4, py: 1, borderRadius: '10px', fontWeight: 700 }}
                    >
                        {(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={24} color="inherit" /> : 'Xác nhận kế hoạch'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity} 
                    sx={{ width: '100%', borderRadius: '8px', fontWeight: 600 }}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
