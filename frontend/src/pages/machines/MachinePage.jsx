import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { machineService } from "../../services/machine.service";
import { factoryService } from "../../services/factory.service";
import GenericTable from "../../components/GenericTable";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";

export default function MachinePage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [filterFactoryId, setFilterFactoryId] = useState("");

  const initialForm = {
    code: "",
    name: "",
    factory_id: "",
    capacity_per_day: "",
    is_active: true,
  };
  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
  } = useForm({ defaultValues: initialForm });

  // Queries
  const { data: factories } = useQuery({
    queryKey: ["factories"],
    queryFn: factoryService.getAll,
  });
  const {
    data: machines,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["machines", filterFactoryId],
    queryFn: () => machineService.getAll(filterFactoryId),
  });

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: machineService.create,
    ...mutationOpts,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => machineService.update(id, payload),
    ...mutationOpts,
  });
  const deleteMutation = useMutation({
    mutationFn: machineService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["machines"] }),
  });

  const columns = [
    { id: "code", label: "Mã máy" },
    { id: "name", label: "Tên máy" },
    { id: "factory_name", label: "Nhà máy" },
    { id: "capacity_per_day", label: "Công suất/Ngày" },
    {
      id: "is_active",
      label: "Trạng thái",
      format: (val) =>
        val ? (
          <span style={{ color: "green" }}>Hoạt động</span>
        ) : (
          <span style={{ color: "red" }}>Ngừng hoạt động</span>
        ),
    },
  ];

  const handleOpen = (machine = null) => {
    if (machine) {
      setSelectedMachine(machine);
      reset({
        code: machine.code,
        name: machine.name,
        factory_id: machine.factory_id,
        capacity_per_day: machine.capacity_per_day,
        is_active: machine.is_active,
      });
    } else {
      setSelectedMachine(null);
      reset(initialForm);
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedMachine(null);
  };

  const onSubmit = (data) => {
    const payload = {
      ...data,
      capacity_per_day: parseFloat(data.capacity_per_day),
    };
    if (selectedMachine) {
      updateMutation.mutate({ id: selectedMachine.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (machine) => {
    if (window.confirm(`Xóa máy ${machine.name}?`)) {
      deleteMutation.mutate(machine.id);
    }
  };

  return (
    <Box>
      <GenericTable
        title={
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={2}
          >
            <h2>Quản lý Máy móc</h2>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Lọc theo nhà máy</InputLabel>
                <Select
                  value={filterFactoryId}
                  label="Lọc theo nhà máy"
                  onChange={(e) => setFilterFactoryId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Tất cả nhà máy</em>
                  </MenuItem>
                  {factories?.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleOpen()}
              >
                + Thêm máy
              </Button>
            </Box>
          </Box>
        }
        data={machines}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
      />

      {/* Create/Edit Modal */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={rhfHandleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedMachine ? "Chỉnh sửa máy" : "Thêm máy mới"}
          </DialogTitle>
          <DialogContent dividers>
            <Controller
              name="factory_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Nhà máy</InputLabel>
                  <Select {...field} label="Nhà máy">
                    {factories
                      ?.filter((f) => f.is_active)
                      .map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Mã máy"
                  margin="normal"
                  required
                />
              )}
            />
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tên máy"
                  margin="normal"
                  required
                />
              )}
            />
            <Controller
              name="capacity_per_day"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Công suất mỗi ngày (Giờ/Sản phẩm)"
                  margin="normal"
                  required
                  inputProps={{ step: "0.1" }}
                />
              )}
            />
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label="Trạng thái hoạt động"
                  sx={{ mt: 2 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Lưu
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
