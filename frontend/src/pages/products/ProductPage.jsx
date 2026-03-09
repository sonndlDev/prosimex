import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
  } = useForm({
    defaultValues: {
      name: "",
      product_group_id: "",
      is_active: true,
    },
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
    { id: "name", label: "Tên mã hàng" },
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
      reset({
        name: product.name,
        product_group_id: product.product_group_id || "",
        is_active: product.is_active,
      });
    } else {
      setSelectedProduct(null);
      reset({ name: "", product_group_id: "", is_active: true });
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedProduct(null);
  };

  const onSubmit = (data) => {
    if (selectedProduct)
      updateMutation.mutate({ id: selectedProduct.id, payload: data });
    else createMutation.mutate(data);
  };

  const handleDelete = (product) => {
    if (window.confirm(`Xóa sản phẩm ${product.name}?`))
      deleteMutation.mutate(product.id);
  };

  const handleBulkDelete = (selectedIds) => {
    if (window.confirm(`Xóa ${selectedIds.length} sản phẩm đã chọn?`)) {
      selectedIds.forEach((id) => deleteMutation.mutate(id));
    }
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
        onBulkDelete={handleBulkDelete}
      />

      {/* Create/Edit Modal */}
      <Dialog open={openModal} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={rhfHandleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedProduct ? "Chỉnh sửa mã hàng" : "Thêm mã hàng mới"}
          </DialogTitle>
          <DialogContent dividers>
            <Controller
              name="product_group_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Nhóm mã hàng</InputLabel>
                  <Select {...field} label="Nhóm mã hàng">
                    {availableGroupsInForm?.map((g) => (
                      <MenuItem key={g.id} value={g.id}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Tên mã hàng"
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
            <Button type="submit" variant="contained">
              Lưu
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
