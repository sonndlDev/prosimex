import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { userService } from "../../services/user.service";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LockIcon from "@mui/icons-material/Lock";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import SaveIcon from "@mui/icons-material/Save";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const { control: profileControl, handleSubmit: handleProfileFormSubmit } =
    useForm({
      defaultValues: {
        full_name: user?.full_name || "",
        phone: user?.phone || "",
        email: user?.email || "",
      },
    });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordFormSubmit,
    reset: resetPassword,
  } = useForm({
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const profileMutation = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: () => {
      setNotification({
        open: true,
        message: "Cập nhật thông tin thành công!",
        severity: "success",
      });
      refreshUser();
    },
    onError: (error) => {
      setNotification({
        open: true,
        message: error.response?.data?.message || "Lỗi khi cập nhật thông tin",
        severity: "error",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: () => {
      setNotification({
        open: true,
        message: "Đổi mật khẩu thành công!",
        severity: "success",
      });
      resetPassword({ new_password: "", confirm_password: "" });
    },
    onError: (error) => {
      setNotification({
        open: true,
        message: error.response?.data?.message || "Lỗi khi đổi mật khẩu",
        severity: "error",
      });
    },
  });

  const onProfileSubmit = (data) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    if (data.new_password !== data.confirm_password) {
      return setNotification({
        open: true,
        message: "Mật khẩu xác nhận không khớp",
        severity: "error",
      });
    }
    if (data.new_password.length < 6) {
      return setNotification({
        open: true,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
        severity: "error",
      });
    }
    passwordMutation.mutate({ password: data.new_password });
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: 4 }}>
        Hồ sơ cá nhân
      </Typography>

      <Grid container spacing={4}>
        {/* Left side: Avatar & Summary */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              borderRadius: "24px",
              textAlign: "center",
              p: 2,
              height: "100%",
            }}
          >
            <CardContent>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: "auto",
                  mb: 2,
                  bgcolor: "primary.main",
                  fontSize: "3rem",
                  fontWeight: 700,
                  boxShadow: "0 8px 16px rgba(37, 99, 235, 0.2)",
                }}
              >
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h5" fontWeight={700}>
                {user?.full_name || user?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                @{user?.username}
              </Typography>

              <Box
                sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    px: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Vai trò:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {user?.role}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    px: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Trạng thái:
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="success.main"
                  >
                    Hoạt động
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right side: Forms */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Basic Info Form */}
            <Paper sx={{ p: 4, borderRadius: "24px" }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
              >
                <PersonIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Thông tin cơ bản
                </Typography>
              </Box>

              <form onSubmit={handleProfileFormSubmit(onProfileSubmit)}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Controller
                      name="full_name"
                      control={profileControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Họ và tên"
                          placeholder="Nhập tên hiển thị"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="phone"
                      control={profileControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Số điện thoại"
                          placeholder="0xxx xxx xxx"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="email"
                      control={profileControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email"
                          placeholder="example@prosimex.com"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={profileMutation.isPending}
                      sx={{
                        borderRadius: "12px",
                        px: 4,
                        py: 1.2,
                        fontWeight: 700,
                      }}
                    >
                      {profileMutation.isPending
                        ? "Đang lưu..."
                        : "Lưu thay đổi"}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>

            {/* Security Form */}
            <Paper sx={{ p: 4, borderRadius: "24px" }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
              >
                <LockIcon color="error" />
                <Typography variant="h6" fontWeight={700}>
                  Bảo mật & Mật khẩu
                </Typography>
              </Box>

              <form onSubmit={handlePasswordFormSubmit(onPasswordSubmit)}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="new_password"
                      control={passwordControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Mật khẩu mới"
                          type={showPassword ? "text" : "password"}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockIcon fontSize="small" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <VisibilityOff />
                                  ) : (
                                    <Visibility />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="confirm_password"
                      control={passwordControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Xác nhận mật khẩu"
                          type={showPassword ? "text" : "password"}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Button
                      type="submit"
                      variant="outlined"
                      color="error"
                      disabled={passwordMutation.isPending}
                      sx={{
                        borderRadius: "12px",
                        px: 4,
                        py: 1.2,
                        fontWeight: 700,
                      }}
                    >
                      {passwordMutation.isPending
                        ? "Đang xử lý..."
                        : "Đổi mật khẩu"}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ borderRadius: "12px" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
