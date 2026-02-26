import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productGroupService } from '../../services/product-group.service';
import { operationService } from '../../services/operation.service';
import { machineService } from '../../services/machine.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Paper, 
    Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Typography, IconButton, Divider
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DraggableSequenceTable from './DraggableSequenceTable';

export default function ProductGroupPage() {
    const queryClient = useQueryClient();
    const [openModal, setOpenModal] = useState(false);
    const [manageOpsModal, setManageOpsModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    
    const [formData, setFormData] = useState({ name: '' });
    
    // Ops mapping state
    const [opForm, setOpForm] = useState({ operation_id: '', machine_id: '', sequence_order: '', dinh_muc: '', estimated_hours: '' });

    // Queries
    const { data: operationsList } = useQuery({ queryKey: ['operations'], queryFn: operationService.getAll });
    const { data: machinesList } = useQuery({ queryKey: ['machines'], queryFn: () => machineService.getAll() });
    
    const { data: productGroups, isLoading, error } = useQuery({
        queryKey: ['productGroups'],
        queryFn: () => productGroupService.getAll(),
    });

    const { data: groupOperations, isLoading: opsLoading } = useQuery({
        queryKey: ['groupOperations', selectedGroup?.id],
        queryFn: () => productGroupService.getOperations(selectedGroup.id),
        enabled: !!selectedGroup && manageOpsModal
    });

    // Auto-calculate next sequence order
    const nextSequenceOrder = (groupOperations?.length || 0) + 1;

    // Mutations
    const mutationOpts = {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['productGroups'] });
            handleClose();
        }
    };
    const createMutation = useMutation({ mutationFn: productGroupService.create, ...mutationOpts });
    const updateMutation = useMutation({ mutationFn: ({id, payload}) => productGroupService.update(id, payload), ...mutationOpts });
    const deleteMutation = useMutation({ 
        mutationFn: productGroupService.delete, 
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['productGroups'] })
    });

    // Ops Mutations
    const addOpMutation = useMutation({ 
        mutationFn: (payload) => productGroupService.addOperation(selectedGroup.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groupOperations', selectedGroup?.id] });
            setOpForm({ operation_id: '', machine_id: '', sequence_order: '', dinh_muc: '', estimated_hours: '' });
        }
    });
    const removeOpMutation = useMutation({
        mutationFn: (mappingId) => productGroupService.removeOperation(selectedGroup.id, mappingId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groupOperations', selectedGroup?.id] })
    });

    const updateOpMutation = useMutation({
        mutationFn: ({mappingId, payload}) => productGroupService.updateOperation(selectedGroup.id, mappingId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groupOperations', selectedGroup?.id] })
    });

    const reorderOpMutation = useMutation({
        mutationFn: (orders) => productGroupService.reorderOperations(selectedGroup.id, orders),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groupOperations', selectedGroup?.id] })
    });

    const columns = [
        { id: 'name', label: 'Tên nhóm' },
        { 
            id: 'actions', 
            label: 'Quy trình',
            align: 'center',
            format: (v, row) => (
                <Button size="small" variant="outlined" startIcon={<SettingsIcon/>} onClick={() => handleManageOps(row)}>
                    Quy trình
                </Button>
            )
        }
    ];

    const handleOpen = (group = null) => {
        if (group) {
            setSelectedGroup(group);
            setFormData({ name: group.name });
        } else {
            setSelectedGroup(null);
            setFormData({ name: '' });
        }
        setOpenModal(true);
    };

    const handleClose = () => {
        setOpenModal(false);
        setSelectedGroup(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedGroup) updateMutation.mutate({ id: selectedGroup.id, payload: formData });
        else createMutation.mutate(formData);
    };

    const handleDelete = (group) => {
        if(window.confirm(`Xóa nhóm sản phẩm ${group.name}?`)) deleteMutation.mutate(group.id);
    };

    const handleManageOps = (group) => {
        setSelectedGroup(group);
        setManageOpsModal(true);
    };

    const handleAddOp = (e) => {
        e.preventDefault();
        addOpMutation.mutate({
            ...opForm, 
            sequence_order: parseInt(opForm.sequence_order) || nextSequenceOrder,
            dinh_muc: parseFloat(opForm.dinh_muc),
            estimated_hours: parseFloat(opForm.estimated_hours)
        });
    };

    return (
        <Box>
            <GenericTable 
                title={
                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                        <h2>Nhóm mã hàng & Quy trình</h2>
                        <Button variant="contained" color="secondary" onClick={() => handleOpen()}>+ Thêm nhóm</Button>
                    </Box>
                }
                data={productGroups}
                columns={columns}
                isLoading={isLoading}
                error={error}
                onEdit={handleOpen}
                onDelete={handleDelete}
                actionColWidth={150}
            />

            {/* Base Form Modal */}
            <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{selectedGroup ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}</DialogTitle>
                    <DialogContent dividers>
                        <TextField fullWidth label="Tên nhóm" margin="normal" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button type="submit" variant="contained">Lưu</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Operations Routing Modal */}
            <Dialog open={manageOpsModal} onClose={() => setManageOpsModal(false)} fullWidth maxWidth="md">
                <DialogTitle>Quy trình sản xuất cho: <b>{selectedGroup?.name}</b></DialogTitle>
                <DialogContent dividers>
                    <DraggableSequenceTable 
                        data={groupOperations}
                        isLoading={opsLoading}
                        onDelete={(id) => removeOpMutation.mutate(id)}
                        onUpdate={(id, payload) => updateOpMutation.mutate({ mappingId: id, payload })}
                        onReorder={(newOrders) => reorderOpMutation.mutate(newOrders)}
                    />
                    
                    <Box sx={{ mt: 4, pt: 3, borderTop: '2px dashed', borderColor: 'divider' }}>
                        <Typography variant="overline" color="primary" sx={{ fontWeight: 800, mb: 2, display: 'block', letterSpacing: '0.1em' }}>THÊM BƯỚC MỚI</Typography>
                        
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 2.5, 
                                bgcolor: 'rgba(37, 99, 235, 0.02)', 
                                border: '1px solid', 
                                borderColor: 'primary.light',
                                borderRadius: '16px'
                            }}
                        >
                            <form onSubmit={handleAddOp} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <TextField 
                                    label="Thứ tự" size="small" 
                                    sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'white' } }} 
                                    placeholder={String(nextSequenceOrder)}
                                    value={opForm.sequence_order} 
                                    onChange={e=>setOpForm({...opForm, sequence_order: e.target.value})} 
                                />
                                
                                <FormControl required size="small" sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'white' } }}>
                                    <InputLabel>Công đoạn</InputLabel>
                                    <Select value={opForm.operation_id} label="Công đoạn" onChange={e=>setOpForm({...opForm, operation_id: e.target.value})}>
                                        {operationsList?.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
         
                                <FormControl required size="small" sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'white' } }}>
                                    <InputLabel>Máy</InputLabel>
                                    <Select value={opForm.machine_id} label="Máy" onChange={e=>setOpForm({...opForm, machine_id: e.target.value})}>
                                        {machinesList?.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
         
                                <TextField 
                                    required type="number" label="Định mức" size="small" 
                                    sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'white' } }} 
                                    inputProps={{step: "0.1"}} value={opForm.dinh_muc} 
                                    onChange={e=>setOpForm({...opForm, dinh_muc: e.target.value})} 
                                />
                                <TextField 
                                    required type="number" label="Giờ dự kiến" size="small" 
                                    sx={{ width: 110, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'white' } }} 
                                    inputProps={{step: "0.1"}} value={opForm.estimated_hours} 
                                    onChange={e=>setOpForm({...opForm, estimated_hours: e.target.value})} 
                                />
         
                                <Button 
                                    type="submit" 
                                    variant="contained" 
                                    sx={{ 
                                        borderRadius: '10px', 
                                        height: '40px', 
                                        px: 3,
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                    }}
                                >
                                    Thêm bước
                                </Button>
                            </form>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setManageOpsModal(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
