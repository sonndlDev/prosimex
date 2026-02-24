import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productGroupService } from '../../services/product-group.service';
import { operationService } from '../../services/operation.service';
import { machineService } from '../../services/machine.service';
import GenericTable from '../../components/GenericTable';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, FormControl, InputLabel, Select, MenuItem, Typography, IconButton, Divider
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

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
            sequence_order: parseInt(opForm.sequence_order),
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
                    <GenericTable 
                        title="Thứ tự quy trình"
                        data={groupOperations}
                        isLoading={opsLoading}
                        columns={[
                            { id: 'sequence_order', label: 'Bước' },
                            { id: 'operation_name', label: 'Công đoạn' },
                            { id: 'machine_name', label: 'Máy' },
                            { id: 'dinh_muc', label: 'Định mức (Sản phẩm/Giờ)' },
                        ]}
                        onDelete={(row) => removeOpMutation.mutate(row.id)}
                    />
                    
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" mb={2}>Thêm bước</Typography>
                    
                    <form onSubmit={handleAddOp} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <TextField required type="number" label="Thứ tự" size="small" style={{width: 80}} value={opForm.sequence_order} onChange={e=>setOpForm({...opForm, sequence_order: e.target.value})} />
                        
                        <FormControl required size="small" style={{minWidth: 150}}>
                            <InputLabel>Công đoạn</InputLabel>
                            <Select value={opForm.operation_id} label="Công đoạn" onChange={e=>setOpForm({...opForm, operation_id: e.target.value})}>
                                {operationsList?.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                            </Select>
                        </FormControl>
 
                        <FormControl required size="small" style={{minWidth: 150}}>
                            <InputLabel>Máy</InputLabel>
                            <Select value={opForm.machine_id} label="Máy" onChange={e=>setOpForm({...opForm, machine_id: e.target.value})}>
                                {machinesList?.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                            </Select>
                        </FormControl>
 
                        <TextField required type="number" label="Định mức" size="small" style={{width: 100}} inputProps={{step: "0.1"}} value={opForm.dinh_muc} onChange={e=>setOpForm({...opForm, dinh_muc: e.target.value})} />
                        <TextField required type="number" label="Giờ dự kiến" size="small" style={{width: 100}} inputProps={{step: "0.1"}} value={opForm.estimated_hours} onChange={e=>setOpForm({...opForm, estimated_hours: e.target.value})} />
 
                        <Button type="submit" variant="contained">Thêm bước</Button>
                    </form>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setManageOpsModal(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
