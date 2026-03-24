import React, { useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import { productGroupService } from "../../../services/product-group.service";
import { factoryService } from "../../../services/factory.service";
import { machineService } from "../../../services/machine.service";
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
  Switch,
  Tab,
  Tabs,
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
        endDate: "", // For no-stage calculation
        manualDinhMuc: "",
        selectedMachineId: "",
        isFullOrderMode: false,
        plannedDays: [],
        case2Items: [], // [{productId, name, quantity, norm, startDate, endDate, isSelected}]
      },
    });

    const { fields: dayFields, replace: replaceDays } = useFieldArray({
      control,
      name: "plannedDays",
    });

    const { fields: case2Fields, replace: replaceCase2, update: updateCase2 } = useFieldArray({
      control,
      name: "case2Items",
    });

    // Watch form values
    const selectedOrderId = watch("selectedOrderId");
    const selectedProductId = watch("selectedProductId");
    const selectedOpId = watch("selectedOpId");
    const selectedFactoryId = watch("selectedFactoryId");
    const isOutsourced = watch("isOutsourced");
    const inventory = watch("inventory");
    const startDate = watch("startDate");
    const endDate = watch("endDate");
    const manualDinhMuc = watch("manualDinhMuc");
    const selectedMachineId = watch("selectedMachineId");
    const isFullOrderMode = watch("isFullOrderMode");
    const plannedDays = watch("plannedDays");
    const case2Items = watch("case2Items");

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

    const { data: machines } = useQuery({
      queryKey: ["machines", selectedFactoryId],
      queryFn: () => machineService.getAll(selectedFactoryId),
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
    const dinhMuc = useMemo(() => {
      if (selectedOp) return parseFloat(selectedOp.dinh_muc) || 0;
      if (manualDinhMuc) return parseFloat(manualDinhMuc) || 0;
      
      // Auto-calculate if no stage and dates are present
      if (!selectedOpId && startDate && endDate && remainingQty > 0) {
        const start = DateTime.fromISO(startDate);
        const end = DateTime.fromISO(endDate);
        const diff = end.diff(start, 'days').days + 1;
        if (diff > 0) {
          return remainingQty / diff / 8;
        }
      }
      return 0;
    }, [selectedOp, manualDinhMuc, selectedOpId, startDate, endDate, remainingQty]);

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
          manualDinhMuc: editingPlan.dinh_muc || "",
          startDate: DateTime.fromISO(
            editingPlan.planned_start_date,
          ).toISODate(),
          endDate: DateTime.fromISO(
            editingPlan.planned_end_date,
          ).toISODate(),
          selectedMachineId: editingPlan.machine_id || "",
          isFullOrderMode: false,
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
          endDate: "",
          manualDinhMuc: "",
          endDate: "",
          manualDinhMuc: "",
          selectedMachineId: "",
          isFullOrderMode: false,
          plannedDays: [],
          case2Items: [],
        });
      }
    }, [open, editingPlan, reset]);

    // Initialize Case 2 items when order changes
    useEffect(() => {
      if (isFullOrderMode && selectedOrder?.products) {
        const items = selectedOrder.products.map(p => ({
          productId: p.id,
          name: p.name,
          quantity: parseFloat(p.quantity) || 0,
          norm: 0,
          startDate: "",
          endDate: "",
          isSelected: true
        }));
        replaceCase2(items);
      }
    }, [isFullOrderMode, selectedOrderId, selectedOrder, replaceCase2]);

    // Case 2 Auto-calculation
    useEffect(() => {
      if (!isFullOrderMode || !startDate || !endDate || case2Items.length === 0) return;
      
      const selectedItems = case2Items.filter(item => item.isSelected);
      if (selectedItems.length === 0) return;

      const totalSelectedQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);
      const diffDays = end.diff(start, "days").days + 1;

      if (diffDays <= 0) return;

      const avgOrderNormPerDay = totalSelectedQty / diffDays;
      const avgItemNormPerDay = avgOrderNormPerDay; // User requested: take the norm directly, no division by count

      let currentStart = start;
      const newItems = case2Items.map(item => {
        if (!item.isSelected) return item;
        
        const pDays = Math.ceil(item.quantity / avgItemNormPerDay);
        const pStart = currentStart;
        const pEnd = currentStart.plus({ days: pDays - 1 });
        
        const updated = {
          ...item,
          norm: parseFloat(avgItemNormPerDay.toFixed(2)),
          startDate: pStart.toISODate(),
          endDate: pEnd.toISODate(),
        };
        currentStart = pEnd.plus({ days: 1 });
        return updated;
      });

      // Prevent infinite loop by checking if values actually changed
      const isDifferent = JSON.stringify(newItems) !== JSON.stringify(case2Items);
      if (isDifferent) {
         replaceCase2(newItems);
      }
    }, [startDate, endDate, isFullOrderMode]);

    // Auto-calculate schedule when totalDaysNeeded or startDate changes
    useEffect(() => {
      if (startDate && totalDaysNeeded > 0 && !editingPlan && !isFullOrderMode) {
        const newDays = autoCalculateSchedule(totalDaysNeeded, startDate);
        replaceDays(newDays);
      }
    }, [totalDaysNeeded, startDate, isFullOrderMode]);

    const handleDayChange = (index, value) => {
      const newDays = rebalanceDays(plannedDays, index, value, totalDaysNeeded);
      replaceDays(newDays);
    };

    const handleAddDay = () => {
      const lastDay = plannedDays[plannedDays.length - 1];
      const nextDate = lastDay
        ? DateTime.fromISO(lastDay.date).plus({ days: 1 }).toISODate()
        : startDate;
      replaceDays([
        ...plannedDays,
        { date: nextDate, hours: "0.00", is_overtime: false },
      ]);
    };

    const handleStartDateChange = (val) => {
      setValue("startDate", val);
      if (val && totalDaysNeeded > 0 && !isFullOrderMode) {
        const newDays = autoCalculateSchedule(totalDaysNeeded, val);
        replaceDays(newDays);
      }
    };

    const handleFormSubmit = () => {
      if (isFullOrderMode) {
        const selectedProducts = case2Items.filter((i) => i.isSelected);
        onSubmit({
          isFullOrderMode: true,
          order_id: selectedOrderId,
          planned_start_date: startDate,
          endDate: endDate,
          machine_id: selectedMachineId || null,
          factory_id: isOutsourced ? null : selectedFactoryId || null,
          is_outsourced: isOutsourced,
          items: selectedProducts,
        });
        return;
      }

      onSubmit({
        order_id: selectedOrderId,
        product_id: selectedProductId || null,
        product_group_operation_id: selectedOpId || null,
        machine_id: selectedMachineId || null,
        factory_id: isOutsourced ? null : selectedFactoryId || null,
        is_outsourced: isOutsourced,
        inventory_input: inventory,
        dinh_muc: dinhMuc,
        planned_start_date: startDate,
        endDate: endDate,
        isFullOrderMode: false,
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
          <Box mb={2}>
            <Tabs
              value={isFullOrderMode ? 1 : 0}
              onChange={(_, val) => {
                const isFull = val === 1;
                setValue("isFullOrderMode", isFull);
                if (isFull) {
                  setValue("selectedProductId", "");
                  setValue("selectedOpId", "");
                }
              }}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Tạo theo từng mã" />
              <Tab label="Tạo theo đơn chung (Case 2)" />
            </Tabs>
          </Box>
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
                <FormControl
                  fullWidth
                  size="small"
                  disabled={!selectedOrderId || isFullOrderMode}
                >
                  <InputLabel>
                    {isFullOrderMode
                      ? "Bước 2: (Đã chọn cả đơn)"
                      : "Bước 2: Chọn mã hàng"}
                  </InputLabel>
                  <Select
                    {...field}
                    label={
                      isFullOrderMode
                        ? "Bước 2: (Đã chọn cả đơn)"
                        : "Bước 2: Chọn mã hàng"
                    }
                    disabled={!!editingPlan || isFullOrderMode}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setValue("selectedOpId", "");
                    }}
                  >
                    {!isFullOrderMode &&
                      selectedOrder?.products?.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}{" "}
                          {p.quantity
                            ? `(${parseFloat(p.quantity).toLocaleString()} SP)`
                            : ""}
                        </MenuItem>
                      ))}
                    {isFullOrderMode && (
                      <MenuItem value="">
                        <em>-- Toàn bộ đơn hàng --</em>
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              )}
            />

            {!isFullOrderMode && (
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
                      <MenuItem value="">
                        <em>-- Không có công đoạn --</em>
                      </MenuItem>
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
            )}

            {(isFullOrderMode || !selectedOpId) && (
              <Controller
                name="selectedMachineId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel>Bước 3b: Chọn máy sản xuất</InputLabel>
                    <Select {...field} label="Bước 3b: Chọn máy sản xuất">
                      <MenuItem value="">
                        <em>-- Chọn máy (Tùy chọn) --</em>
                      </MenuItem>
                      {machines?.map((m) => (
                        <MenuItem key={m.id} value={m.id}>
                          {m.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            )}
          </Box>

          {/* Step 4: Factory selection */}
          {(selectedOpId || isFullOrderMode) && (
            <Box display="flex" gap={3} mb={3} alignItems="center">
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
              {isOutsourced && (
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
              )}
              {selectedFactoryId && isOutsourced && (
                <Chip
                  label="Gia công ngoài"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>
          )}

          {/* Operation details or No-Stage Summary */}
          {selectedOrderId && (selectedOp || (!selectedOpId && !isFullOrderMode)) && (
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
                    TỔNG SL ĐƠN/MÃ
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
                    ĐỊNH MỨC (SP/8H)
                  </Typography>
                  <Controller
                    name="manualDinhMuc"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        placeholder={dinhMuc.toString()}
                        type="number"
                        size="small"
                        sx={{ mt: 0.5, bgcolor: "white" }}
                        variant="standard"
                        InputProps={{
                          disableUnderline: true,
                          sx: {
                            fontWeight: 700,
                            fontSize: "1.25rem",
                            color: "primary.main",
                          },
                        }}
                      />
                    )}
                  />
                  {!selectedOp && (
                    <Typography
                      variant="caption"
                      display="block"
                      color="warning.main"
                    >
                      (Nhập thủ công hoặc tự tính)
                    </Typography>
                  )}
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
                    {selectedOp?.machine_name || (selectedOpId === "" ? "N/A" : "Chưa chọn")}
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

          {/* Case 2: Product List Preview with Calculations and Controls */}
          {isFullOrderMode && selectedOrderId && (
            <Paper
              variant="outlined"
              sx={{ p: 3, mb: 4, borderRadius: "16px", bgcolor: "#f8fafc" }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="text.secondary"
                mb={2}
                sx={{ textTransform: "uppercase", letterSpacing: 1 }}
              >
                Cấu hình chi tiết mã hàng (Case 2):
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", fontSize: "11px", color: "#64748b" }}>
                      <th style={{ padding: "8px" }}>CHỌN</th>
                      <th style={{ padding: "8px" }}>MÃ HÀNG</th>
                      <th style={{ padding: "8px" }}>SỐ LƯỢNG</th>
                      <th style={{ padding: "8px" }}>ĐỊNH MỨC</th>
                      <th style={{ padding: "8px" }}>BẮT ĐẦU</th>
                      <th style={{ padding: "8px" }}>KẾT THÚC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {case2Fields.map((field, idx) => (
                      <tr key={field.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "4px" }}>
                          <Checkbox
                            size="small"
                            checked={field.isSelected}
                            onChange={(e) => updateCase2(idx, { ...field, isSelected: e.target.checked })}
                          />
                        </td>
                        <td style={{ padding: "8px", fontWeight: 600 }}>{field.name}</td>
                        <td style={{ padding: "8px" }}>{field.quantity.toLocaleString()}</td>
                        <td style={{ padding: "8px" }}>
                          <TextField
                            size="small"
                            type="number"
                            variant="standard"
                            value={field.norm}
                            onChange={(e) => updateCase2(idx, { ...field, norm: parseFloat(e.target.value) || 0 })}
                            InputProps={{ disableUnderline: true, sx: { fontSize: "13px", fontWeight: 700, color: "#2563eb" } }}
                            sx={{ width: 70 }}
                          />
                        </td>
                        <td style={{ padding: "8px" }}>
                           <TextField
                            size="small"
                            type="date"
                            variant="standard"
                            value={field.startDate}
                            onChange={(e) => updateCase2(idx, { ...field, startDate: e.target.value })}
                            InputProps={{ disableUnderline: true, sx: { fontSize: "12px" } }}
                            sx={{ width: 110 }}
                          />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <TextField
                            size="small"
                            type="date"
                            variant="standard"
                            value={field.endDate}
                            onChange={(e) => updateCase2(idx, { ...field, endDate: e.target.value })}
                            InputProps={{ disableUnderline: true, sx: { fontSize: "12px" } }}
                            sx={{ width: 110 }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt={3}
                pt={2}
                borderTop="2px solid"
                borderColor="primary.light"
              >
                <Typography variant="subtitle1" fontWeight={800}>
                  TỔNG SỐ LƯỢNG CHỌN:
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight={900}>
                  {case2Items
                    .filter(i => i.isSelected)
                    .reduce((sum, p) => sum + p.quantity, 0)
                    .toLocaleString()}{" "}
                  SP
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Schedule section */}
          {selectedOrderId && (selectedOpId !== "" || !selectedProductId || isFullOrderMode) && (
            <Box mb={3}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                Thời gian & Lịch biểu:
              </Typography>
              <Box display="flex" gap={2}>
                <TextField
                  label={isFullOrderMode ? "Ngày bắt đầu (A)" : "Ngày bắt đầu"}
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  sx={{ mb: 3 }}
                />
                {(!selectedOp || isFullOrderMode) && (
                  <TextField
                    label={isFullOrderMode ? "Ngày kết thúc (B)" : "Ngày kết thúc (để tính ĐM)"}
                    type="date"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setValue("endDate", e.target.value)}
                    sx={{ mb: 3 }}
                  />
                )}
              </Box>

              {!isFullOrderMode && (
                <>
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
                                  replaceDays(newDays);
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
                                      const checked = e.target.checked;
                                      const newDays = [...plannedDays];
                                      newDays[idx] = {
                                        ...newDays[idx],
                                        is_overtime: checked,
                                      };
                                      
                                      // If toggled ON and was at normal cap, jump to overtime cap
                                      // If toggled OFF and was above normal cap, back to normal cap
                                      let nextVal = parseFloat(newDays[idx].hours);
                                      if (checked && nextVal >= 1.0) nextVal = 1.43;
                                      if (!checked && nextVal > 1.0) nextVal = 1.0;

                                      const recalculated = rebalanceDays(
                                        newDays,
                                        idx,
                                        nextVal.toString(),
                                        totalDaysNeeded,
                                      );
                                      replaceDays(recalculated);
                                    }}
                                  />
                                }
                                label={
                                  <Typography
                                    variant="caption"
                                    fontWeight={600}
                                  >
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
                                  replaceDays(newDays);
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
                </>
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
              (isFullOrderMode ? !endDate : plannedDays.length === 0) ||
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
