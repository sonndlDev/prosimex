import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productGroupService } from "../../services/product-group.service";
import { operationService } from "../../services/operation.service";
import { machineService } from "../../services/machine.service";
import GenericTable from "../../components/GenericTable";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Divider,
  Autocomplete,
  Snackbar,
  Alert,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import DraggableSequenceTable from "./DraggableSequenceTable";

export default function ProductGroupPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [manageOpsModal, setManageOpsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const {
    control: groupControl,
    handleSubmit: handleGroupFormSubmit,
    reset: resetGroup,
  } = useForm({
    defaultValues: { name: "" },
  });

  // Ops mapping form
  const opInitial = {
    operation_id: "",
    machine_id: "",
    sequence_order: "",
    dinh_muc: "",
  };
  const {
    control: opControl,
    handleSubmit: handleOpFormSubmit,
    reset: resetOp,
  } = useForm({
    defaultValues: opInitial,
  });

  // Queries
  const { data: operationsList } = useQuery({
    queryKey: ["operations"],
    queryFn: operationService.getAll,
  });
  const { data: machinesList } = useQuery({
    queryKey: ["machines"],
    queryFn: () => machineService.getAll(),
  });

  const {
    data: productGroups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["productGroups"],
    queryFn: () => productGroupService.getAll(),
  });

  const { data: groupOperations, isLoading: opsLoading } = useQuery({
    queryKey: ["groupOperations", selectedGroup?.id],
    queryFn: () => productGroupService.getOperations(selectedGroup.id),
    enabled: !!selectedGroup && manageOpsModal,
  });

  // Auto-calculate next sequence order
  const nextSequenceOrder =
    groupOperations && groupOperations.length > 0
      ? Math.max(...groupOperations.map((o) => o.sequence_order)) + 1
      : 1;

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productGroups"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: productGroupService.create,
    ...mutationOpts,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => productGroupService.update(id, payload),
    ...mutationOpts,
  });
  const deleteMutation = useMutation({
    mutationFn: productGroupService.delete,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["productGroups"] }),
  });

  // Ops Mutations
  const addOpMutation = useMutation({
    mutationFn: (payload) =>
      productGroupService.addOperation(selectedGroup.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["groupOperations", selectedGroup?.id],
      });
      resetOp(opInitial);
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi thêm công đoạn",
        severity: "error",
      });
    }
  });

  const quickAddOpMutation = useMutation({
    mutationFn: (name) => operationService.create({ name }),
    onSuccess: (newOp) => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      // Set the newly created operation in the form
      opControl._defaultValues.operation_id = newOp.id;
      resetOp({ ...opControl._formValues, operation_id: newOp.id });
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi tạo công đoạn nhanh",
        severity: "error",
      });
    }
  });
  const removeOpMutation = useMutation({
    mutationFn: (mappingId) =>
      productGroupService.removeOperation(selectedGroup.id, mappingId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["groupOperations", selectedGroup?.id],
      }),
  });

  const updateOpMutation = useMutation({
    mutationFn: ({ mappingId, payload }) =>
      productGroupService.updateOperation(selectedGroup.id, mappingId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["groupOperations", selectedGroup?.id],
      }),
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Lỗi khi cập nhật công đoạn",
        severity: "error",
      });
    }
  });

  const reorderOpMutation = useMutation({
    mutationFn: (orders) =>
      productGroupService.reorderOperations(selectedGroup.id, orders),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["groupOperations", selectedGroup?.id],
      }),
  });

  const columns = [
    { id: "name", label: "Tên nhóm" },
    {
      id: "actions",
      label: "Quy trình",
      align: "center",
      format: (v, row) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => handleManageOps(row)}
        >
          Quy trình
        </Button>
      ),
    },
  ];

  const handleOpen = (group = null) => {
    if (group) {
      setSelectedGroup(group);
      resetGroup({ name: group.name });
    } else {
      setSelectedGroup(null);
      resetGroup({ name: "" });
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedGroup(null);
  };

  const onGroupSubmit = (data) => {
    if (selectedGroup)
      updateMutation.mutate({ id: selectedGroup.id, payload: data });
    else createMutation.mutate(data);
  };

  const handleDelete = (group) => {
    if (window.confirm(`Xóa nhóm sản phẩm ${group.name}?`))
      deleteMutation.mutate(group.id);
  };

  const handleBulkDelete = (selectedIds) => {
    if (window.confirm(`Xóa ${selectedIds.length} nhóm sản phẩm đã chọn?`)) {
      selectedIds.forEach((id) => deleteMutation.mutate(id));
    }
  };

  const handleManageOps = (group) => {
    setSelectedGroup(group);
    setManageOpsModal(true);
  };

  const handleQuickAddOperation = () => {
    const opName = window.prompt("Nhập tên công đoạn mới:");
    if (opName && opName.trim()) {
      quickAddOpMutation.mutate(opName.trim());
    }
  };

  const onAddOp = (data) => {
    const selectedOp = operationsList?.find(
      (o) => String(o.id) === String(data.operation_id)
    );
    const selectedOpName = selectedOp?.name;

    // Check for duplicate operation (thorough name comparison)
    const isDuplicate = groupOperations?.some(
      (op) =>
        String(op.operation_name).trim().toLowerCase() ===
        String(selectedOpName).trim().toLowerCase()
    );

    if (isDuplicate) {
      setSnackbar({
        open: true,
        message: `Công đoạn "${selectedOpName}" đã tồn tại trong quy trình. Vui lòng không thêm trùng.`,
        severity: "error",
      });
      return;
    }

    const seqOrder = parseInt(data.sequence_order) || nextSequenceOrder;

    addOpMutation.mutate({
      ...data,
      sequence_order: seqOrder,
      dinh_muc: data.dinh_muc ? parseFloat(data.dinh_muc) : null,
      machine_id: data.machine_id || null,
    });
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
            <h2>Nhóm mã hàng & Quy trình</h2>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleOpen()}
            >
              + Thêm nhóm
            </Button>
          </Box>
        }
        data={productGroups}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        actionColWidth={150}
      />

      {/* Base Form Modal */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={handleGroupFormSubmit(onGroupSubmit)}>
          <DialogTitle>
            {selectedGroup ? "Chỉnh sửa nhóm" : "Thêm nhóm mới"}
          </DialogTitle>
          <DialogContent dividers>
            <Controller
              name="name"
              control={groupControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tên nhóm"
                  margin="normal"
                  required
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button type="submit" variant="contained">
              Lưu
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Operations Routing Modal */}
      <Dialog
        open={manageOpsModal}
        onClose={() => setManageOpsModal(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Quy trình sản xuất cho: <b>{selectedGroup?.name}</b>
        </DialogTitle>
        <DialogContent dividers>
          <DraggableSequenceTable
            data={groupOperations}
            machinesList={machinesList}
            isLoading={opsLoading}
            onDelete={(id) => removeOpMutation.mutate(id)}
            onUpdate={(id, payload) =>
              updateOpMutation.mutate({ mappingId: id, payload })
            }
            onReorder={(newOrders) => reorderOpMutation.mutate(newOrders)}
          />

          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: "2px dashed",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="overline"
              color="primary"
              sx={{
                fontWeight: 800,
                mb: 2,
                display: "block",
                letterSpacing: "0.1em",
              }}
            >
              THÊM BƯỚC MỚI
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: "rgba(37, 99, 235, 0.02)",
                border: "1px solid",
                borderColor: "primary.light",
                borderRadius: "16px",
              }}
            >
              <form
                onSubmit={handleOpFormSubmit(onAddOp)}
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                <Controller
                  name="sequence_order"
                  control={opControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Thứ tự"
                      size="small"
                      sx={{
                        width: 80,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          bgcolor: "white",
                        },
                      }}
                      placeholder={String(nextSequenceOrder)}
                    />
                  )}
                />

                <Controller
                  name="operation_id"
                  control={opControl}
                  render={({ field }) => (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Autocomplete
                        sx={{ minWidth: 220 }}
                        options={operationsList || []}
                        getOptionLabel={(option) => option.name || ""}
                        value={operationsList?.find(o => o.id === field.value) || null}
                        onChange={(_, newValue) => field.onChange(newValue ? newValue.id : "")}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Công đoạn"
                            size="small"
                            required
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "10px",
                                bgcolor: "white",
                              },
                            }}
                          />
                        )}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleQuickAddOperation}
                        sx={{
                          minWidth: "auto",
                          p: "7px 10px",
                          borderRadius: "10px",
                          bgcolor: "white",
                        }}
                      >
                        + Mới
                      </Button>
                    </Box>
                  )}
                />

                <Controller
                  name="machine_id"
                  control={opControl}
                  render={({ field }) => (
                    <Autocomplete
                      sx={{ minWidth: 220 }}
                      options={machinesList || []}
                      getOptionLabel={(option) => option.name || ""}
                      value={machinesList?.find(m => m.id === field.value) || null}
                      onChange={(_, newValue) => field.onChange(newValue ? newValue.id : "")}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Máy"
                          size="small"
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "10px",
                              bgcolor: "white",
                            },
                          }}
                        />
                      )}
                    />
                  )}
                />

                <Controller
                  name="dinh_muc"
                  control={opControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Định mức"
                      size="small"
                      sx={{
                        width: 110,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "10px",
                          bgcolor: "white",
                        },
                      }}
                      inputProps={{ step: "0.1" }}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    borderRadius: "10px",
                    height: "40px",
                    px: 3,
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
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
