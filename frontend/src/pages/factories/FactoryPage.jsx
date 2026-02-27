import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@mui/material";

export default function FactoryPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
  } = useForm({
    defaultValues: { name: "", is_active: true },
  });

  // Fetch Data
  const {
    data: factories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["factories"],
    queryFn: factoryService.getAll,
  });

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factories"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: factoryService.create,
    ...mutationOpts,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => factoryService.update(id, payload),
    ...mutationOpts,
  });
  const deleteMutation = useMutation({
    mutationFn: factoryService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["factories"] }),
  });

  const columns = [
    { id: "name", label: "Tên nhà máy" },
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

  const handleOpen = (factory = null) => {
    if (factory) {
      setSelectedFactory(factory);
      reset({ name: factory.name, is_active: factory.is_active });
    } else {
      setSelectedFactory(null);
      reset({ name: "", is_active: true });
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedFactory(null);
  };

  const onSubmit = (data) => {
    if (selectedFactory) {
      updateMutation.mutate({ id: selectedFactory.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (factory) => {
    if (window.confirm(`Xóa nhà máy ${factory.name}?`)) {
      deleteMutation.mutate(factory.id);
    }
  };

  return (
    <Box>
      {/* Action Toolbar built-in via GenericTable wrapper, passing down title/props */}
      <GenericTable
        title={
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <h2>Quản lý Nhà máy</h2>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleOpen()}
            >
              + Thêm nhà máy
            </Button>
          </Box>
        }
        data={factories}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
      />

      {/* Create / Edit Modal */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={rhfHandleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedFactory ? "Chỉnh sửa nhà máy" : "Thêm nhà máy mới"}
          </DialogTitle>
          <DialogContent dividers>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tên nhà máy"
                  margin="normal"
                  required
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
