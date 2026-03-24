import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operationService } from "../../services/operation.service";
import GenericTable from "../../components/GenericTable";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";

export default function OperationPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
  } = useForm({
    defaultValues: { name: "", description: "" },
  });

  // Fetch Data
  const {
    data: operations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["operations"],
    queryFn: operationService.getAll,
  });

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: operationService.create,
    ...mutationOpts,
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi tạo công đoạn",
        severity: "error",
      });
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => operationService.update(id, payload),
    ...mutationOpts,
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi cập nhật công đoạn",
        severity: "error",
      });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: operationService.delete,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["operations"] }),
  });

  const columns = [
    { id: "name", label: "Tên công đoạn" },
    {
      id: "product_groups",
      label: "Nhóm mã hàng",
      format: (value) => (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {Array.isArray(value) && value.length > 0 ? (
            value.map((pg, index) => (
              <Chip key={index} label={pg} size="small" variant="outlined" color="primary" />
            ))
          ) : (
            <span style={{ color: '#ccc' }}>-</span>
          )}
        </Box>
      ),
    },
    { id: "description", label: "Mô tả" },
  ];

  const handleOpen = (operation = null) => {
    if (operation) {
      setSelectedOperation(operation);
      reset({ name: operation.name, description: operation.description || "" });
    } else {
      setSelectedOperation(null);
      reset({ name: "", description: "" });
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedOperation(null);
  };

  const onSubmit = (data) => {
    if (selectedOperation) {
      updateMutation.mutate({ id: selectedOperation.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (operation) => {
    if (window.confirm(`Xóa công đoạn ${operation.name}?`)) {
      deleteMutation.mutate(operation.id);
    }
  };

  const handleBulkDelete = (selectedIds) => {
    if (window.confirm(`Xóa ${selectedIds.length} công đoạn đã chọn?`)) {
      selectedIds.forEach((id) => deleteMutation.mutate(id));
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
          >
            <h2>Quản lý Công đoạn Tiêu chuẩn</h2>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleOpen()}
            >
              + Thêm công đoạn
            </Button>
          </Box>
        }
        data={operations}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
      />

      {/* Create / Edit Modal */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={rhfHandleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedOperation ? "Chỉnh sửa công đoạn" : "Thêm công đoạn mới"}
          </DialogTitle>
          <DialogContent dividers>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tên công đoạn"
                  margin="normal"
                  required
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Mô tả"
                  margin="normal"
                  multiline
                  rows={3}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: "12px", fontWeight: 600 }}
          variant="filled"
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
