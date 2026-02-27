import React, { useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import { productGroupService } from "../../../services/product-group.service";
import { factoryService } from "../../../services/factory.service";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import { DateTime } from "luxon";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import {
  ManagedTextField,
  autoCalculateSchedule,
  rebalanceDays,
} from "./shared";

const PlanningFormDialog = React.memo(
  ({
    open,
    editingPlan,
    isCreatePending,
    isUpdatePending,
    onClose,
    onSubmit,
  }) => {
    const { control, watch, setValue, reset, handleSubmit } = useForm({
      defaultValues: {
        selectedOrderId: "",
        selectedProductId: "",
        selectedOpId: "",
        selectedFactoryId: "",
        isOutsourced: false,
        inventory: 0,
        startDate: "",
        plannedDays: [],
      },
    });

    const { fields, replace } = useFieldArray({
      control,
      name: "plannedDays",
    });

    // Watch form values
    const selectedOrderId = watch("selectedOrderId");
    const selectedProductId = watch("selectedProductId");
    const selectedOpId = watch("selectedOpId");
    const selectedFactoryId = watch("selectedFactoryId");
    const isOutsourced = watch("isOutsourced");
    const inventory = watch("inventory");
    const startDate = watch("startDate");
    const plannedDays = watch("plannedDays");

    // Data fetching
    const { data: allOrdersData } = useQuery({
      queryKey: ["orders"],
      queryFn: orderService.getAll,
    });
    const orders = allOrdersData || [];

    const { data: factories } = useQuery({
      queryKey: ["factories"],
      queryFn: factoryService.getAll,
    });

    const selectedOrder = orders?.find((o) => o.id === selectedOrderId);
    const selectedProduct = selectedOrder?.products?.find(
      (p) => p.id === selectedProductId,
    );

    const { data: operations, isLoading: loadingOps } = useQuery({
      queryKey: ["orderOps", selectedProduct?.product_group_id],
      queryFn: () =>
        productGroupService.getOperations(selectedProduct.product_group_id),
      enabled: !!selectedProduct?.product_group_id,
    });

    const selectedOp = operations?.find((op) => op.id === selectedOpId);

    // Derived calculations
    const productQtyInOrder = selectedProduct
      ? parseFloat(selectedProduct.quantity) || 0
      : 0;
    const totalOrderQty =
      productQtyInOrder > 0
        ? productQtyInOrder
        : selectedOrder
          ? parseFloat(selectedOrder.quantity)
          : 0;
    const remainingQty = Math.max(0, totalOrderQty - inventory);
    const dinhMuc = selectedOp ? parseFloat(selectedOp.dinh_muc) : 0;
    const totalDaysNeeded = dinhMuc > 0 ? remainingQty / dinhMuc / 8 : 0;

    // Reset form when opening/closing or switching between create/edit
    useEffect(() => {
      if (open && editingPlan) {
        reset({
          selectedOrderId: editingPlan.order_id,
          selectedProductId: editingPlan.product_id,
          selectedOpId: editingPlan.product_group_operation_id,
          selectedFactoryId: editingPlan.factory_id || "",
          isOutsourced: editingPlan.is_outsourced || false,
          inventory: parseFloat(editingPlan.inventory_input),
          startDate: DateTime.fromISO(
            editingPlan.planned_start_date,
          ).toISODate(),
          plannedDays: editingPlan.days.map((d) => ({
            date: DateTime.fromISO(d.working_date).toISODate(),
            hours: (parseFloat(d.planned_work_quantity) / 8).toFixed(2),
            is_overtime: d.is_overtime,
          })),
        });
      } else if (open) {
        reset({
          selectedOrderId: "",
          selectedProductId: "",
          selectedOpId: "",
          selectedFactoryId: "",
          isOutsourced: false,
          inventory: 0,
          startDate: "",
          plannedDays: [],
        });
      }
    }, [open, editingPlan, reset]);

    // Auto-calculate schedule when totalDaysNeeded or startDate changes
    useEffect(() => {
      if (startDate && totalDaysNeeded > 0 && !editingPlan) {
        const newDays = autoCalculateSchedule(totalDaysNeeded, startDate);
        replace(newDays);
      }
    }, [totalDaysNeeded, startDate]);

    const handleDayChange = (index, value) => {
      const newDays = rebalanceDays(plannedDays, index, value, totalDaysNeeded);
      replace(newDays);
    };

    const handleAddDay = () => {
      const lastDay = plannedDays[plannedDays.length - 1];
      const nextDate = lastDay
        ? DateTime.fromISO(lastDay.date).plus({ days: 1 }).toISODate()
        : startDate;
      replace([
        ...plannedDays,
        { date: nextDate, hours: "0.00", is_overtime: false },
      ]);
    };

    const handleStartDateChange = (val) => {
      setValue("startDate", val);
      if (val && totalDaysNeeded > 0) {
        const newDays = autoCalculateSchedule(totalDaysNeeded, val);
        replace(newDays);
      }
    };

    const handleFormSubmit = () => {
      onSubmit({
        order_id: selectedOrderId,
        product_id: selectedProductId,
        product_group_operation_id: selectedOpId,
        factory_id: isOutsourced ? null : selectedFactoryId || null,
        is_outsourced: isOutsourced,
        inventory_input: inventory,
        planned_start_date: startDate,
        days: plannedDays
          .filter((d) => parseFloat(d.hours) > 0)
          .map((d) => ({
            date: d.date,
            hours: (parseFloat(d.hours) * 8).toFixed(2),
            is_overtime: d.is_overtime || false,
          })),
      });
    };

    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingPlan
            ? "Chỉnh sửa kế hoạch sản xuất"
            : "Lập kế hoạch sản xuất mới"}
        </DialogTitle>
        <DialogContent dividers>
          {/* Steps 1-3: Order, Product, Operation selection */}
          <Box
            display="grid"
            gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }}
            gap={3}
            mb={4}
            mt={1}
          >
            <Controller
              name="selectedOrderId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel>Bước 1: Chọn đơn hàng</InputLabel>
                  <Select
                    {...field}
                    label="Bước 1: Chọn đơn hàng"
                    disabled={!!editingPlan}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setValue("selectedProductId", "");
                      setValue("selectedOpId", "");
                    }}
                  >
                    {orders?.map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.name} ({o.quantity} SP)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="selectedProductId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small" disabled={!selectedOrderId}>
                  <InputLabel>Bước 2: Chọn mã hàng</InputLabel>
                  <Select
                    {...field}
                    label="Bước 2: Chọn mã hàng"
                    disabled={!!editingPlan}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setValue("selectedOpId", "");
                    }}
                  >
                    {selectedOrder?.products?.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}{" "}
                        {p.quantity
                          ? `(${parseFloat(p.quantity).toLocaleString()} SP)`
                          : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="selectedOpId"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  size="small"
                  disabled={!selectedProductId || loadingOps}
                >
                  <InputLabel>Bước 3: Chọn công đoạn</InputLabel>
                  <Select
                    {...field}
                    label="Bước 3: Chọn công đoạn"
                    disabled={!!editingPlan}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setValue("selectedFactoryId", "");
                      setValue("isOutsourced", false);
                    }}
                  >
                    {operations?.map((op) => (
                      <MenuItem key={op.id} value={op.id}>
                        CĐ {op.sequence_order}: {op.operation_name} (
                        {op.machine_name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </Box>

          {/* Step 4: Factory selection */}
          {selectedOpId && (
            <Box display="flex" gap={3} mb={3} alignItems="center">
              <Controller
                name="selectedFactoryId"
                control={control}
                render={({ field }) => (
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Bước 4: Chọn nhà máy</InputLabel>
                    <Select
                      {...field}
                      label="Bước 4: Chọn nhà máy"
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        setValue("isOutsourced", false);
                      }}
                    >
                      <MenuItem value="">
                        <em>-- Chọn nhà máy --</em>
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
                name="isOutsourced"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.checked);
                          if (e.target.checked)
                            setValue("selectedFactoryId", "");
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={isOutsourced ? "warning.main" : "text.secondary"}
                      >
                        Gia công ngoài
                      </Typography>
                    }
                  />
                )}
              />
              {selectedFactoryId && !isOutsourced && (
                <Chip
                  label="Sản xuất tại xưởng"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
              {isOutsourced && (
                <Chip
                  label="Gia công ngoài"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>
          )}

          {/* Operation details */}
          {selectedOp && (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                mb: 4,
                borderRadius: "16px",
                bgcolor: "background.default",
              }}
            >
              <Box
                display="grid"
                gridTemplateColumns="repeat(3, 1fr)"
                gap={2}
                mb={3}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    fontWeight={600}
                  >
                    TỔNG SL ĐƠN
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {totalOrderQty.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    fontWeight={600}
                  >
                    ĐỊNH MỨC (SP/GIỜ)
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {dinhMuc}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    fontWeight={600}
                  >
                    MÁY PHỤ TRÁCH
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedOp.machine_name}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2, borderStyle: "dashed" }} />

              <Box
                display="grid"
                gridTemplateColumns="repeat(3, 1fr)"
                gap={3}
                alignItems="flex-end"
              >
                <Controller
                  name="inventory"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Tồn kho nhập"
                      type="number"
                      size="small"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                      sx={{ bgcolor: "white" }}
                    />
                  )}
                />
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    fontWeight={600}
                  >
                    SỐ LƯỢNG CÒN LẠI
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="error.main">
                    {remainingQty.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    fontWeight={600}
                  >
                    TỔNG CÔNG CẦN
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="secondary.main"
                  >
                    {totalDaysNeeded.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Schedule section */}
          {selectedOp && (
            <Box mb={3}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                Thời gian & Lịch biểu:
              </Typography>
              <TextField
                label="Ngày bắt đầu"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1.5}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  Danh sách ngày làm việc:
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddCircleIcon />}
                  onClick={handleAddDay}
                  sx={{ textTransform: "none" }}
                >
                  Thêm ngày
                </Button>
              </Box>

              {plannedDays.length > 0 && (
                <Box
                  sx={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: "grey.50",
                      p: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ width: "30%" }}
                    >
                      NGÀY LÀM VIỆC
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ width: "30%", textAlign: "center" }}
                    >
                      SỐ CÔNG
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ width: "30%", textAlign: "right" }}
                    >
                      TÙY CHỌN
                    </Typography>
                  </Box>
                  <Box sx={{ maxHeight: 250, overflow: "auto" }}>
                    {plannedDays.map((day, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1.5,
                          borderBottom:
                            idx === plannedDays.length - 1
                              ? "none"
                              : "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          sx={{ width: "30%" }}
                        >
                          <TextField
                            type="date"
                            size="small"
                            variant="standard"
                            value={day.date}
                            onChange={(e) => {
                              const newDays = [...plannedDays];
                              newDays[idx] = {
                                ...newDays[idx],
                                date: e.target.value,
                              };
                              replace(newDays);
                            }}
                            InputProps={{
                              disableUnderline: true,
                              sx: {
                                fontSize: "0.875rem",
                                fontWeight: 600,
                              },
                            }}
                          />
                        </Box>
                        <Box
                          sx={{
                            width: "30%",
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <ManagedTextField
                            size="small"
                            type="number"
                            value={day.hours}
                            onCommit={(val) => handleDayChange(idx, val)}
                            InputProps={{
                              disableUnderline: true,
                              sx: {
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                textAlign: "center",
                              },
                            }}
                            sx={{ width: 80 }}
                          />
                        </Box>
                        <Box
                          sx={{
                            width: "30%",
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                          }}
                        >
                          <FormControlLabel
                            sx={{ m: 0 }}
                            control={
                              <Checkbox
                                size="small"
                                sx={{ p: 0.5 }}
                                checked={day.is_overtime}
                                onChange={(e) => {
                                  const newDays = [...plannedDays];
                                  newDays[idx] = {
                                    ...newDays[idx],
                                    is_overtime: e.target.checked,
                                  };
                                  const recalculated = autoCalculateSchedule(
                                    totalDaysNeeded,
                                    startDate,
                                    newDays,
                                  );
                                  replace(recalculated);
                                }}
                              />
                            }
                            label={
                              <Typography variant="caption" fontWeight={600}>
                                Tăng ca
                              </Typography>
                            }
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const newDays = [...plannedDays];
                              newDays.splice(idx, 1);
                              replace(newDays);
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontSize: "10px" }}
                            >
                              ×
                            </Typography>
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: "grey.50" }}>
          <Button onClick={onClose} sx={{ color: "text.secondary" }}>
            Hủy bỏ
          </Button>
          <Button
            variant="contained"
            disabled={
              !startDate ||
              plannedDays.length === 0 ||
              isCreatePending ||
              isUpdatePending
            }
            onClick={handleFormSubmit}
            sx={{ px: 4, py: 1, borderRadius: "10px", fontWeight: 700 }}
          >
            {isCreatePending || isUpdatePending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Xác nhận kế hoạch"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);
PlanningFormDialog.displayName = "PlanningFormDialog";

export default PlanningFormDialog;
