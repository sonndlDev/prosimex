import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../../services/product.service";
import { productGroupService } from "../../services/product-group.service";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";

export default function ProductPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterFactoryId, setFilterFactoryId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    product_group_id: "",
    is_active: true,
  });

  // Queries
  const { data: factories } = useQuery({
    queryKey: ["factories"],
    queryFn: factoryService.getAll,
  });
  const { data: productGroups } = useQuery({
    queryKey: ["productGroups"],
    queryFn: () => productGroupService.getAll(),
  });
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products", filterFactoryId],
    queryFn: () => productService.getAll(filterFactoryId),
  });

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: productService.create,
    ...mutationOpts,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => productService.update(id, payload),
    ...mutationOpts,
  });
  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const columns = [
    { id: "name", label: "Tên sản phẩm" },
    { id: "product_group_name", label: "Nhóm mã hàng" },
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

  const handleOpen = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        product_group_id: product.product_group_id || "",
        is_active: product.is_active,
      });
    } else {
      setSelectedProduct(null);
      setFormData({ name: "", product_group_id: "", is_active: true });
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedProduct(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedProduct)
      updateMutation.mutate({ id: selectedProduct.id, payload: formData });
    else createMutation.mutate(formData);
  };

  const handleDelete = (product) => {
    if (window.confirm(`Xóa sản phẩm ${product.name}?`))
      deleteMutation.mutate(product.id);
  };

  const availableGroupsInForm = productGroups || [];

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
            <h2>Quản lý Mã hàng</h2>
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
                + Thêm mã hàng
              </Button>
            </Box>
          </Box>
        }
        data={products}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
      />

      {/* Create/Edit Modal */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedProduct ? "Chỉnh sửa mã hàng" : "Thêm mã hàng mới"}
          </DialogTitle>
          <DialogContent dividers>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Nhóm mã hàng</InputLabel>
              <Select
                value={formData.product_group_id}
                label="Nhóm mã hàng"
                onChange={(e) =>
                  setFormData({ ...formData, product_group_id: e.target.value })
                }
              >
                {availableGroupsInForm?.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Tên sản phẩm"
              margin="normal"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
              }
              label="Trạng thái hoạt động"
              sx={{ mt: 2 }}
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
    </Box>
  );
}
