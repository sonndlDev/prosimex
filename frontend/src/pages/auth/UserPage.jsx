import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../services/user.service";
import { factoryService } from "../../services/factory.service";
import GenericTable from "../../components/GenericTable";
import {
  Checkbox,
  Paper,
  Chip,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormControlLabel,
  Switch,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip,
  IconButton,
  Box,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SecurityIcon from "@mui/icons-material/Security";
import InfoIcon from "@mui/icons-material/Info";
import SearchIcon from "@mui/icons-material/Search";

// Roles will be fetched from the database

const AVAILABLE_PERMISSIONS = [
  // { key: 'dashboard', label: 'Bảng điều khiển' },
  { key: "planning", label: "Lập kế hoạch" },
  { key: "schedule", label: "Lịch sản xuất" },
  { key: "orders", label: "Đơn hàng" },
  { key: "customers", label: "Khách hàng" },
  { key: "factories", label: "Nhà máy" },
  { key: "machines", label: "Máy móc" },
  { key: "operations", label: "Công đoạn" },
  { key: "product_groups", label: "Nhóm mã hàng" },
  { key: "products", label: "Mã hàng" },
  { key: "workers", label: "Quản lý công nhân" },
  { key: "attendance", label: "Chấm công" },
  // { key: 'attendance_management', label: 'Quản lý chấm công' },
  // { key: 'users', label: 'Người dùng & Quyền' },
  { key: "settings", label: "Cài đặt hệ thống" },
];

export default function UserPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const initialForm = {
    username: "",
    password: "",
    role_name: "OPERATOR",
    factory_id: "",
    is_active: true,
    permissions: [],
    full_name: "",
    phone: "",
    email: "",
  };
  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
    watch,
    setValue,
  } = useForm({ defaultValues: initialForm });
  const watchRoleName = watch("role_name");
  const watchPermissions = watch("permissions");

  // Queries
  const { data: factories } = useQuery({
    queryKey: ["factories"],
    queryFn: factoryService.getAll,
  });
  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({ queryKey: ["users"], queryFn: userService.getAll });
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: userService.getRoles,
  });

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: userService.create,
    ...mutationOpts,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => userService.update(id, payload),
    ...mutationOpts,
  });
  const deleteMutation = useMutation({
    mutationFn: userService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const createRoleMutation = useMutation({
    mutationFn: userService.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setNewRoleName("");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: userService.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const handleCreateRole = () => {
    if (newRoleName.trim()) {
      createRoleMutation.mutate({ name: newRoleName.trim() });
    }
  };

  const handleDeleteRole = (role) => {
    if (role.is_system) return;
    if (
      window.confirm(
        `Xóa vai trò "${role.name}"? Tất cả người dùng thuộc vai trò này sẽ được chuyển về "DEFAULT_USER".`,
      )
    ) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const columns = [
    { id: "username", label: "Tên đăng nhập" },
    { id: "full_name", label: "Tên hiển thị" },
    { id: "role_name", label: "Vai trò" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Số điện thoại" },
    { id: "factory_id", label: "Nhà máy được gán" },
    {
      id: "is_active",
      label: "Trạng thái",
      format: (val) =>
        val ? (
          <Chip label="Hoạt động" color="success" size="small" />
        ) : (
          <Chip label="Ngừng" color="error" size="small" />
        ),
    },
  ];

  const handleOpen = (user = null) => {
    if (user) {
      setSelectedUser(user);
      reset({
        username: user.username,
        password: "",
        role_name: user.role_name,
        factory_id: user.factory_id || "",
        is_active: user.is_active,
        permissions: user.permissions || [],
        full_name: user.full_name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    } else {
      setSelectedUser(null);
      reset(initialForm);
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedUser(null);
  };

  const togglePermission = (key) => {
    const current = watchPermissions || [];
    const updated = current.includes(key)
      ? current.filter((p) => p !== key)
      : [...current, key];
    setValue("permissions", updated);
  };

  const onSubmit = (data) => {
    const payload = { ...data };
    if (selectedUser && !payload.password) delete payload.password;

    if (selectedUser) updateMutation.mutate({ id: selectedUser.id, payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (user) => {
    if (window.confirm(`Xóa người dùng ${user.username}?`))
      deleteMutation.mutate(user.id);
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
            <Typography variant="h5" fontWeight={700}>
              Quản lý Người dùng & Quyền
            </Typography>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
            >
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setOpenRoleModal(true)}
              >
                Quản lý Vai trò
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleOpen()}
                startIcon={<AddCircleIcon />}
              >
                Thêm người dùng
              </Button>
            </Box>
          </Box>
        }
        data={users}
        columns={columns}
        isLoading={usersLoading || rolesLoading}
        error={usersError}
        onEdit={handleOpen}
        onDelete={handleDelete}
      />

      {/* Create/Edit Modal */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="md">
        <form onSubmit={rhfHandleSubmit(onSubmit)}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {selectedUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
          </DialogTitle>
          <DialogContent dividers>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <Box>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  fontWeight={600}
                  color="primary"
                >
                  Thông tin cá nhân
                </Typography>
                <Controller
                  name="full_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Tên hiển thị (Họ tên)"
                      size="small"
                      margin="dense"
                    />
                  )}
                />
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Số điện thoại"
                        size="small"
                        margin="dense"
                      />
                    )}
                  />
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Email"
                        size="small"
                        margin="dense"
                      />
                    )}
                  />
                </Box>

                <Typography
                  variant="subtitle2"
                  gutterBottom
                  fontWeight={600}
                  color="primary"
                  sx={{ mt: 2 }}
                >
                  Tài khoản & Hệ thống
                </Typography>
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Tên đăng nhập"
                      size="small"
                      margin="dense"
                      required
                      disabled={!!selectedUser}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={selectedUser ? "Mật khẩu mới" : "Mật khẩu"}
                      size="small"
                      margin="dense"
                      type="password"
                      required={!selectedUser}
                    />
                  )}
                />

                <Controller
                  name="role_name"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small" margin="dense" required>
                      <InputLabel>Vai trò hệ thống</InputLabel>
                      <Select
                        {...field}
                        label="Vai trò hệ thống"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          if (e.target.value === "ADMIN")
                            setValue("factory_id", "");
                        }}
                      >
                        {roles?.map((r) => (
                          <MenuItem key={r.id} value={r.name}>
                            {r.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Controller
                  name="factory_id"
                  control={control}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      margin="dense"
                      disabled={watchRoleName === "ADMIN"}
                    >
                      <InputLabel>Gán nhà máy</InputLabel>
                      <Select {...field} label="Gán nhà máy">
                        <MenuItem value="">
                          <em>Không gán / Tất cả</em>
                        </MenuItem>
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
                      sx={{ mt: 1 }}
                    />
                  )}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                  Phân quyền menu truy cập
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    maxHeight: 300,
                    overflowY: "auto",
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box display="grid" gridTemplateColumns="1fr" gap={0.5}>
                    {AVAILABLE_PERMISSIONS.map((p) => (
                      <FormControlLabel
                        key={p.key}
                        control={
                          <Checkbox
                            size="small"
                            checked={(watchPermissions || []).includes(p.key)}
                            onChange={() => togglePermission(p.key)}
                          />
                        }
                        label={
                          <Typography variant="body2">{p.label}</Typography>
                        }
                      />
                    ))}
                  </Box>
                </Paper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  * Admin mặc định có tất cả quyền
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button type="submit" variant="contained">
              Lưu thay đổi
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Role Management Modal */}
      {/* Role Management Modal */}
      <Dialog
        open={openRoleModal}
        onClose={() => setOpenRoleModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            py: 2.5,
          }}
        >
          <SecurityIcon color="primary" /> Quản lý Vai trò Hệ thống
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Add Section */}
          <Box
            sx={{
              p: 3,
              bgcolor: "background.default",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              gutterBottom
              fontWeight={700}
              color="text.secondary"
            >
              THÊM VAI TRÒ MỚI
            </Typography>
            <Box display="flex" gap={2} mt={1.5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Nhập tên vai trò (VD: MANAGER, SUPERVISOR...)"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
                sx={{
                  bgcolor: "white",
                  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
                }}
              />
              <Button
                variant="contained"
                onClick={handleCreateRole}
                disabled={!newRoleName.trim() || createRoleMutation.isPending}
                sx={{
                  borderRadius: "10px",
                  px: 4,
                  fontWeight: 700,
                  boxShadow: "none",
                }}
              >
                {createRoleMutation.isPending ? "Đang thêm..." : "Thêm"}
              </Button>
            </Box>
          </Box>

          {/* List Table Section */}
          <Box sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: 350 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        bgcolor: "background.paper",
                        py: 1.5,
                      }}
                    >
                      VAI TRÒ
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                    >
                      LOẠI
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                    >
                      THAO TÁC
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles?.map((role) => (
                    <TableRow key={role.id} hover>
                      <TableCell
                        sx={{ fontWeight: 600, color: "text.primary" }}
                      >
                        {role.name}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={role.is_system ? "Hệ thống" : "Tùy chỉnh"}
                          size="small"
                          variant={role.is_system ? "filled" : "outlined"}
                          sx={{
                            fontSize: "0.7rem",
                            height: 20,
                            bgcolor: role.is_system
                              ? "rgba(51, 65, 85, 0.08)"
                              : "transparent",
                            borderColor: role.is_system
                              ? "transparent"
                              : "divider",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {role.is_system ? (
                          <Tooltip title="Vai trò hệ thống không thể xóa">
                            <span>
                              <IconButton disabled size="small">
                                <DeleteIcon
                                  fontSize="small"
                                  sx={{ opacity: 0.3 }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Xóa vai trò này">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(role);
                              }}
                              sx={{
                                bgcolor: "rgba(239, 68, 68, 0.05)",
                                "&:hover": {
                                  bgcolor: "rgba(239, 68, 68, 0.12)",
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Bottom Warning */}
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: "rgba(234, 88, 12, 0.02)",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <WarningAmberIcon
                sx={{ color: "#ea580c", fontSize: "1.2rem", mt: 0.1 }}
              />
              <Typography
                variant="caption"
                sx={{ color: "#9a3412", fontWeight: 500, lineHeight: 1.5 }}
              >
                Khi xóa vai trò tùy chỉnh, tất cả người dùng thuộc vai trò đó sẽ
                tự động chuyển về <strong>DEFAULT_USER</strong> (không có quyền
                truy cập mặc định).
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}
        >
          <Button
            onClick={() => setOpenRoleModal(false)}
            sx={{ fontWeight: 600, color: "text.secondary", px: 3 }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
