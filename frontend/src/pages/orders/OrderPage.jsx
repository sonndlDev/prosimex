import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../services/order.service";
import { customerService } from "../../services/customer.service";
import { productService } from "../../services/product.service";
import GenericTable from "../../components/GenericTable";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import { DateTime } from "luxon";

export default function OrderPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const initialForm = {
    order_code: "",
    po_auto_code: "",
    name: "",
    customer_id: "",
    product_items: [],
    po_customer: "",
    received_date: DateTime.now().toFormat("yyyy-MM-dd"),
    production_location: "",
    person_in_charge: "",
    note: "",
    status: "DRAFT",
  };
  const [formData, setFormData] = useState(initialForm);

  // Queries
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll(),
  });
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({ queryKey: ["orders"], queryFn: orderService.getAll });

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: orderService.create,
    ...mutationOpts,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => orderService.update(id, payload),
    ...mutationOpts,
  });
  const deleteMutation = useMutation({
    mutationFn: orderService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const columns = [
    { id: "po_auto_code", label: "Mã đơn hàng" },
    { id: "po_customer", label: "PO Khách hàng" },
    { id: "name", label: "Tên đơn hàng" },
    { id: "customer_name", label: "Khách hàng" },
    {
      id: "products",
      label: "Sản phẩm",
      format: (value, row) => (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {row.products?.map((p) => (
            <Chip
              key={p.id}
              label={`${p.name} (${p.quantity || 0})`}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      ),
    },
    {
      id: "total_quantity",
      label: "Tổng SL",
      format: (value, row) =>
        row.products
          ?.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0)
          .toLocaleString() || "0",
    },
    {
      id: "status",
      label: "Trạng thái",
      format: (value) => (
        <Chip
          label={value}
          size="small"
          color={
            value === "PLANNED"
              ? "primary"
              : value === "IN_PROGRESS"
                ? "warning"
                : value === "DONE"
                  ? "success"
                  : value === "CANCELLED"
                    ? "error"
                    : "default"
          }
          sx={{ fontWeight: 700, borderRadius: "6px" }}
        />
      ),
    },
  ];

  const handleOpen = (order = null) => {
    if (order) {
      setSelectedOrder(order);
      setFormData({
        order_code: order.order_code,
        po_auto_code: order.po_auto_code || "",
        name: order.name,
        customer_id: order.customer_id,
        product_items:
          order.products?.map((p) => ({
            product_id: p.id,
            quantity: p.quantity || "",
          })) || [],
        po_customer: order.po_customer,
        received_date: DateTime.fromISO(order.received_date).toFormat(
          "yyyy-MM-dd",
        ),
        production_location: order.production_location || "",
        person_in_charge: order.person_in_charge || "",
        note: order.note || "",
        status: order.status,
      });
    } else {
      setSelectedOrder(null);
      setFormData(initialForm);
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedOrder(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Filter out items without product or quantity
    const product_items = formData.product_items.filter(
      (item) => item.product_id && parseFloat(item.quantity) > 0,
    );

    if (product_items.length === 0) {
      alert("Vui lòng chọn ít nhất một mã hàng và nhập số lượng.");
      return;
    }

    const payload = {
      ...formData,
      product_items,
      quantity: product_items.reduce(
        (sum, item) => sum + parseFloat(item.quantity || 0),
        0,
      ),
    };
    delete payload.product_ids;

    if (selectedOrder) updateMutation.mutate({ id: selectedOrder.id, payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (order) => {
    if (window.confirm(`Xóa đơn hàng ${order.order_code}?`))
      deleteMutation.mutate(order.id);
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
            <h2>Quản lý Đơn hàng</h2>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleOpen()}
            >
              + Thêm đơn hàng
            </Button>
          </Box>
        }
        data={orders}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
      />

      <Dialog
        open={openModal}
        onClose={handleClose}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: "90vw",
            height: "90vh",
            borderRadius: "24px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <DialogTitle
            sx={{
              bgcolor: "background.paper",
              color: "text.primary",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              boxShadow: "0 2px 4px -1px rgb(0 0 0 / 0.05)",
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Typography variant="h6" fontWeight={900} letterSpacing="-0.02em">
                {selectedOrder ? `Chỉnh sửa đơn hàng` : "Tạo đơn hàng mới"}
              </Typography>
              {selectedOrder && (
                <Chip
                  label={formData.status}
                  color={
                    formData.status === "PLANNED"
                      ? "primary"
                      : formData.status === "DONE"
                        ? "success"
                        : formData.status === "CANCELLED"
                          ? "error"
                          : formData.status === "IN_PROGRESS"
                            ? "warning"
                            : "default"
                  }
                  sx={{ fontWeight: 800, borderRadius: "8px" }}
                />
              )}
              {selectedOrder && (
                <Typography
                  variant="h6"
                  color="text.secondary"
                  fontWeight={500}
                >
                  #{selectedOrder.order_code}
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={2}>
              <Button
                onClick={handleClose}
                sx={{
                  color: "text.secondary",
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
                }}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{
                  fontWeight: 800,
                  px: 4,
                  borderRadius: "10px",
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                }}
              >
                Lưu đơn hàng
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
            {/* 1. Full-Width Name field at the top */}
            <Paper
              sx={{
                p: 3,
                mb: 2,
                borderRadius: "20px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "white",
              }}
              elevation={0}
            >
              <Typography
                variant="caption"
                fontWeight={800}
                mb={1.5}
                color="primary"
                sx={{ display: "block", opacity: 0.8, letterSpacing: "0.05em" }}
              >
                THÔNG TIN CHUNG
              </Typography>
              <TextField
                fullWidth
                label="Tên đơn hàng"
                required
                variant="outlined"
                size="small"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    bgcolor: "rgba(37, 99, 235, 0.02)",
                  },
                }}
              />
            </Paper>

            {/* 2. Primary Details in 2 columns */}
            <Box
              display="grid"
              gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }}
              gap={2}
              mb={2}
            >
              <Paper
                sx={{
                  p: 3,
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: "divider",
                }}
                elevation={0}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  mb={1.5}
                  color="primary"
                  sx={{
                    display: "block",
                    opacity: 0.8,
                    letterSpacing: "0.05em",
                  }}
                >
                  KHÁCH HÀNG & PO
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Khách hàng</InputLabel>
                    <Select
                      value={formData.customer_id}
                      label="Khách hàng"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customer_id: e.target.value,
                        })
                      }
                      sx={{ borderRadius: "8px" }}
                    >
                      {customers?.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="PO Khách hàng"
                    required
                    variant="outlined"
                    size="small"
                    value={formData.po_customer}
                    onChange={(e) =>
                      setFormData({ ...formData, po_customer: e.target.value })
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  />
                  <TextField
                    fullWidth
                    label="Mã PO Hệ thống (Tự động)"
                    variant="outlined"
                    size="small"
                    disabled
                    value={
                      formData.po_auto_code ||
                      (selectedOrder ? "" : "Tự động tạo...")
                    }
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        bgcolor: "rgba(0,0,0,0.02)",
                        "&.Mui-disabled": {
                          color: "primary.main",
                          opacity: 0.8,
                          fontWeight: 700,
                          fontSize: "0.9rem",
                        },
                      },
                    }}
                  />
                </Box>
              </Paper>

              <Paper
                sx={{
                  p: 3,
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: "divider",
                }}
                elevation={0}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  mb={1.5}
                  color="primary"
                  sx={{
                    display: "block",
                    opacity: 0.8,
                    letterSpacing: "0.05em",
                  }}
                >
                  CHI TIẾT & SẢN XUẤT
                </Typography>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                  <TextField
                    fullWidth
                    label="Ngày nhận"
                    type="date"
                    required
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={formData.received_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        received_date: e.target.value,
                      })
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  />
                  <TextField
                    fullWidth
                    label="Người phụ trách"
                    size="small"
                    value={formData.person_in_charge}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        person_in_charge: e.target.value,
                      })
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  />
                </Box>
              </Paper>
            </Box>

            {/* 3. Location & Status */}
            <Paper
              sx={{
                p: 3,
                mb: 2,
                borderRadius: "16px",
                border: "1px solid",
                borderColor: "divider",
              }}
              elevation={0}
            >
              <Typography
                variant="caption"
                fontWeight={800}
                mb={1.5}
                color="primary"
                sx={{ display: "block", opacity: 0.8, letterSpacing: "0.05em" }}
              >
                ĐỊA ĐIỂM & TRẠNG THÁI
              </Typography>
              <Box
                display="grid"
                gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}
                gap={2}
              >
                <TextField
                  fullWidth
                  label="Địa điểm sản xuất"
                  size="small"
                  value={formData.production_location}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      production_location: e.target.value,
                    })
                  }
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                />
                {selectedOrder ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>Trạng thái đơn hàng</InputLabel>
                    <Select
                      value={formData.status}
                      label="Trạng thái đơn hàng"
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      sx={{ borderRadius: "8px" }}
                    >
                      {[
                        "DRAFT",
                        "PLANNED",
                        "IN_PROGRESS",
                        "DONE",
                        "CANCELLED",
                      ].map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Box
                    sx={{
                      p: 1,
                      display: "flex",
                      alignItems: "center",
                      bgcolor: "rgba(0,0,0,0.02)",
                      borderRadius: "8px",
                      border: "1px dashed",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Trạng thái: <b>DRAFT</b>
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* 4. Notes Section */}
            <TextField
              fullWidth
              label="Ghi chú"
              size="small"
              multiline
              minRows={2}
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  bgcolor: "white",
                },
              }}
            />

            {/* Multi-Product Selection with Per-Product Quantity */}
            <Paper
              sx={{
                p: 3,
                borderRadius: "20px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "white",
              }}
              elevation={0}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  color="primary"
                  sx={{
                    display: "block",
                    opacity: 0.8,
                    letterSpacing: "0.05em",
                  }}
                >
                  CHỌN MÃ HÀNG & SỐ LƯỢNG
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddCircleIcon />}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      product_items: [
                        ...formData.product_items,
                        { product_id: "", quantity: "" },
                      ],
                    });
                  }}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Thêm mã hàng
                </Button>
              </Box>

              {formData.product_items.length === 0 && (
                <Box
                  sx={{
                    p: 3,
                    textAlign: "center",
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: "12px",
                    bgcolor: "rgba(0,0,0,0.01)",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.disabled"
                    fontWeight={500}
                  >
                    Chưa có mã hàng nào. Nhấn "Thêm mã hàng" để bắt đầu.
                  </Typography>
                </Box>
              )}

              {formData.product_items.map((item, index) => {
                const selectedProductIds = formData.product_items
                  .filter((_, i) => i !== index)
                  .map((it) => it.product_id);
                return (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      mb: 1,
                      borderRadius: "12px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "rgba(37, 99, 235, 0.02)",
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="text.secondary"
                      sx={{ minWidth: 28 }}
                    >
                      {index + 1}.
                    </Typography>
                    <FormControl size="small" required sx={{ flex: 2 }}>
                      <InputLabel>Mã hàng</InputLabel>
                      <Select
                        value={item.product_id}
                        label="Mã hàng"
                        onChange={(e) => {
                          const newItems = [...formData.product_items];
                          newItems[index] = {
                            ...newItems[index],
                            product_id: e.target.value,
                          };
                          setFormData({ ...formData, product_items: newItems });
                        }}
                        sx={{ borderRadius: "8px" }}
                      >
                        {products
                          ?.filter(
                            (p) =>
                              p.is_active && !selectedProductIds.includes(p.id),
                          )
                          .map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Số lượng"
                      type="number"
                      size="small"
                      required
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.product_items];
                        newItems[index] = {
                          ...newItems[index],
                          quantity: e.target.value,
                        };
                        setFormData({ ...formData, product_items: newItems });
                      }}
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { borderRadius: "8px" },
                      }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          product_items: formData.product_items.filter(
                            (_, i) => i !== index,
                          ),
                        });
                      }}
                      sx={{
                        border: "1px solid",
                        borderColor: "error.light",
                        borderRadius: "8px",
                        "&:hover": { bgcolor: "error.light", color: "white" },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Paper>
          </DialogContent>
        </form>
      </Dialog>
    </Box>
  );
}
