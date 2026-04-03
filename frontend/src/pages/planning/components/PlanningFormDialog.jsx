import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import { productGroupService } from "../../../services/product-group.service";
import { factoryService } from "../../../services/factory.service";
import { machineService } from "../../../services/machine.service";
import { DateTime } from "luxon";
import {
  Plus,
  Loader2,
  Calendar,
  Settings,
  Package,
  Factory as FactoryIcon,
  Cpu,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Info,
  Search,
  Layers,
  Check,
  ChevronsUpDown,
  Truck
} from "lucide-react";

// Shadcn UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ManagedTextField,
  autoCalculateSchedule,
  rebalanceDays,
} from "./shared";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PremiumDatePicker } from "@/components/PremiumDatePicker";
import { Badge } from "@/components/ui/badge";

const PlanningFormDialog = React.memo(
  ({
    open,
    editingPlan,
    isCreatePending,
    isUpdatePending,
    onClose,
    onSubmit,
  }) => {
    const [tabValue, setTabValue] = useState(editingPlan ? "edit" : "create");

    // Sync tab when editingPlan changes
    useEffect(() => {
      setTabValue(editingPlan ? "edit" : "create");
    }, [editingPlan, open]);

    const defaultValues = useMemo(() => ({
      selectedOrderId: "",
      selectedProductId: "",
      selectedOpId: "",
      selectedFactoryId: "",
      isOutsourced: false,
      inventory: 0,
      startDate: "",
      endDate: "",
      manualDinhMuc: "",
      selectedMachineId: "",
      isFullOrderMode: false,
      plannedDays: [],
      case2Items: [],
    }), []);

    const { control, watch, setValue, reset, handleSubmit } = useForm({
      defaultValues,
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
      queryFn: () => orderService.getAll({ limit: 1000 }),
    });
    const orders = allOrdersData?.data || [];

    const { data: factoriesData } = useQuery({
      queryKey: ["factories"],
      queryFn: () => factoryService.getAll({ limit: 1000 }),
    });
    const factories = factoriesData?.data || [];

    const { data: machinesData } = useQuery({
      queryKey: ["machines", selectedFactoryId],
      queryFn: () => machineService.getAll({ factoryId: selectedFactoryId, limit: 1000 }),
    });
    const machines = machinesData?.data || [];

    const selectedOrder = orders?.find((o) => String(o.id) === String(selectedOrderId));
    const selectedProduct = selectedOrder?.products?.find(
      (p) => String(p.id) === String(selectedProductId),
    );

    const { data: operations, isLoading: loadingOps } = useQuery({
      queryKey: ["orderOps", selectedProduct?.product_group_id],
      queryFn: () =>
        productGroupService.getOperations(selectedProduct.product_group_id),
      enabled: !!selectedProduct?.product_group_id,
    });

    const selectedOp = operations?.find((op) => String(op.id) === String(selectedOpId));

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
      // If manually entered
      if (manualDinhMuc && parseFloat(manualDinhMuc) > 0) return parseFloat(manualDinhMuc);
      // If operation selected
      if (selectedOp) return parseFloat(selectedOp.dinh_muc) || 0;

      // Case 1: Special case - no operation selected, but have Start/End
      if (!selectedOpId && !isFullOrderMode && startDate && endDate && remainingQty > 0) {
        const start = DateTime.fromISO(startDate);
        const end = DateTime.fromISO(endDate);
        const diffDays = end.diff(start, 'days').days + 1;
        if (diffDays > 0) {
          // Norm (SP/H) = Qty / (Days * 8)
          // To ensure total work needed = Days
          return (remainingQty / 8) / diffDays;
        }
      }
      return 0;
    }, [selectedOp, manualDinhMuc, selectedOpId, startDate, endDate, remainingQty, isFullOrderMode]);

    const totalDaysNeeded = dinhMuc > 0 ? remainingQty / dinhMuc : 0;

    // Debounce totalDaysNeeded to avoid heavy schedule recalcs on every keystroke
    const [debouncedTotalDaysNeeded, setDebouncedTotalDaysNeeded] = useState(0);
    useEffect(() => {
      const timer = setTimeout(() => setDebouncedTotalDaysNeeded(totalDaysNeeded), 400);
      return () => clearTimeout(timer);
    }, [totalDaysNeeded]);

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
          startDate: DateTime.fromISO(editingPlan.planned_start_date).toISODate(),
          endDate: DateTime.fromISO(editingPlan.planned_end_date).toISODate(),
          selectedMachineId: editingPlan.machine_id || "",
          isFullOrderMode: editingPlan.is_full_order_mode || false,
          plannedDays: editingPlan.days.map((d) => ({
            date: DateTime.fromISO(d.working_date).toISODate(),
            hours: Math.round(parseFloat(d.planned_work_quantity) / 8),
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
          selectedMachineId: "",
          isFullOrderMode: false,
          plannedDays: [],
          case2Items: [],
        });
      }
    }, [open, editingPlan, reset]);

    useEffect(() => {
      const hasOrderIdChanged = selectedOrder && (case2Items?.length > 0) && case2Items[0] && String(case2Items[0].orderId) !== String(selectedOrderId);

      if (isFullOrderMode && selectedOrder?.products && (case2Items.length === 0 || hasOrderIdChanged)) {
        const items = selectedOrder.products.map(p => ({
          orderId: selectedOrderId,
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

    // Case 2 Auto-calculation Logic
    useEffect(() => {
      if (!isFullOrderMode || !startDate || !endDate || case2Items.length === 0) return;

      const selectedItems = case2Items.filter(item => item.isSelected);
      if (selectedItems.length === 0) return;

      // Only run auto-calc if it's the first time or if master dates (startDate/endDate) actually changed
      // We use a simple check to see if we've already initialized these specific dates
      const hasInitDates = selectedItems.every(i => i.startDate && i.endDate);

      // If we are in edit mode of an existing plan, don't overwrite manual sequence
      if (editingPlan && hasInitDates) return;

      const totalSelectedQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);
      const totalDiffDays = end.diff(start, "days").days + 1;

      if (totalDiffDays <= 0) return;

      const avgOrderNormPerDay = totalSelectedQty / totalDiffDays;
      const avgItemNormPerDay = avgOrderNormPerDay / selectedItems.length;

      let currentStart = start;
      const newItems = case2Items.map(item => {
        if (!item.isSelected) return item;

        const itemDuration = Math.max(1, Math.ceil(item.quantity / avgItemNormPerDay));
        const pStart = currentStart;
        const pEnd = currentStart.plus({ days: itemDuration - 1 });

        const updated = {
          ...item,
          norm: parseFloat(avgItemNormPerDay.toFixed(2)),
          startDate: pStart.toISODate(),
          endDate: pEnd.toISODate(),
        };
        currentStart = pEnd.plus({ days: 1 });
        return updated;
      });

      // Crucial: Only update if changed to avoid loop
      if (JSON.stringify(newItems) !== JSON.stringify(case2Items)) {
        replaceCase2(newItems);
      }
    }, [startDate, endDate, isFullOrderMode, selectedOrderId]); // Only these trigger auto-split

    // Manual shift logic for Case 2
    const handleCase2Update = (idx, changes) => {
      let currentItems = case2Items.map(it => ({ ...it }));
      let item = { ...currentItems[idx], ...changes };

      // If dates changed, recalculate norm
      const s = DateTime.fromISO(item.startDate);
      const e = DateTime.fromISO(item.endDate);
      const duration = e.diff(s, 'days').days + 1;
      if (duration > 0) {
        item.norm = parseFloat((item.quantity / duration).toFixed(2));
      }

      currentItems[idx] = item;

      // Shift next items
      let currentEnd = DateTime.fromISO(item.endDate);
      for (let i = idx + 1; i < currentItems.length; i++) {
        if (!currentItems[i].isSelected) continue;

        const nextStart = currentEnd.plus({ days: 1 });
        const oldS = DateTime.fromISO(currentItems[i].startDate);
        const oldE = DateTime.fromISO(currentItems[i].endDate);
        const oldDuration = oldE.diff(oldS, 'days').days + 1;

        currentItems[i].startDate = nextStart.toISODate();
        currentItems[i].endDate = nextStart.plus({ days: Math.max(0, oldDuration - 1) }).toISODate();
        currentEnd = DateTime.fromISO(currentItems[i].endDate);
      }

      replaceCase2(currentItems);
    };

    // Auto-calculate schedule: use debounced value to avoid lag on rapid input
    useEffect(() => {
      if (startDate && debouncedTotalDaysNeeded > 0 && !isFullOrderMode) {
        const newDays = autoCalculateSchedule(debouncedTotalDaysNeeded, startDate);
        replaceDays(newDays);
      }
    }, [debouncedTotalDaysNeeded, startDate, isFullOrderMode]);

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
        { date: nextDate, hours: "0", is_overtime: false },
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
      const data = {
        isFullOrderMode,
        order_id: selectedOrderId,
        machine_id: selectedMachineId || null,
        factory_id: isOutsourced ? (selectedFactoryId || null) : null,
        is_outsourced: isOutsourced,
      };

      if (isFullOrderMode) {
        onSubmit({
          ...data,
          planned_start_date: startDate,
          endDate: endDate,
          items: case2Items.filter((i) => i.isSelected),
        });
        return;
      }

      onSubmit({
        ...data,
        product_id: selectedProductId || null,
        product_group_operation_id: selectedOpId || null,
        inventory_input: inventory,
        dinh_muc: dinhMuc,
        planned_start_date: startDate,
        endDate: endDate,
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
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 !flex flex-col !overflow-hidden border-zinc-200">
          <DialogHeader className="px-6 py-4 bg-white border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-100">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-zinc-950 leading-tight">
                  {editingPlan ? "Chỉnh sửa kế hoạch" : "Lập kế hoạch sản xuất"}
                </DialogTitle>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">
                  {editingPlan ? `Mã kế hoạch: #${editingPlan.id}` : "Khởi tạo tiến độ sản xuất mới"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-white/50">
            <div className="p-6 space-y-8">
              {/* Tabs for Mode selection */}
              <Tabs
                value={isFullOrderMode ? "full" : "single"}
                onValueChange={(val) => {
                  const currentOrder = selectedOrderId;
                  reset({
                    ...defaultValues,
                    selectedOrderId: currentOrder,
                    isFullOrderMode: val === "full"
                  });
                }}
                className="w-full"
              >
                <TabsList className="flex w-full p-1 bg-zinc-200/50 rounded-xl h-12 shadow-inner border border-zinc-200/50">
                  <TabsTrigger
                    value="single"
                    className={cn(
                      "flex-1 rounded-lg font-bold transition-all h-full",
                      !isFullOrderMode ? "bg-white text-indigo-600 shadow-md" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Tạo theo từng mã hàng
                  </TabsTrigger>
                  <TabsTrigger
                    value="full"
                    className={cn(
                      "flex-1 rounded-lg font-bold transition-all h-full",
                      isFullOrderMode ? "bg-white text-indigo-600 shadow-md" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Tạo theo đơn chung (Case 2)
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Steps 1-3: Linear Workflow Layout */}
              <div className="relative space-y-8">
                {/* Visual Connection Line (Desktop only) */}
                <div className="hidden lg:block absolute top-[62px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent z-0" />

                <div className={cn(
                  "grid gap-4 lg:gap-8 relative z-10",
                  isFullOrderMode ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 lg:grid-cols-4"
                )}>
                  {/* Step 1: Order */}
                  <div className="flex flex-col gap-3 group">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-100">1</div>
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Đơn hàng mục tiêu</Label>
                    </div>
                    <Controller
                      name="selectedOrderId"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!!editingPlan}
                              className={cn(
                                "w-full h-[52px] justify-between bg-white border-zinc-200/80 rounded-xl font-bold shadow-sm transition-all text-xs px-4",
                                "hover:border-indigo-300 hover:shadow-indigo-50/50 hover:bg-white group-hover:-translate-y-0.5"
                              )}
                            >
                              <div className="flex items-center gap-3 truncate">
                                <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                                  <Package className="h-4 w-4 text-indigo-600" />
                                </div>
                                <span className="truncate leading-tight">
                                  {orders?.find(o => String(o.id) === String(field.value))?.name || "Chọn đơn hàng..."}
                                </span>
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                            <Command className="w-full">
                              <CommandInput placeholder="Tìm đơn hàng..." className="h-11" />
                              <CommandList className="max-h-[300px] p-1">
                                <CommandEmpty className="py-8 text-center">
                                  <Layers className="h-8 w-8 text-zinc-200 mx-auto mb-2 opacity-50" />
                                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không có dữ liệu</p>
                                </CommandEmpty>
                                <CommandGroup>
                                  {orders?.map((o) => (
                                    <CommandItem
                                      key={o.id}
                                      value={o.name}
                                      onSelect={() => {
                                        field.onChange(String(o.id));
                                        setValue("selectedProductId", "");
                                        setValue("selectedOpId", "");
                                      }}
                                      className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-bold">{o.name}</span>
                                        <span className="text-[10px] text-zinc-400 font-medium">SL: {o.quantity} SP • PO: {o.po_customer}</span>
                                      </div>
                                      <Check className={cn("h-4 w-4 text-indigo-600", String(field.value) === String(o.id) ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>

                  {/* Step 2: Product */}
                  <div className="flex flex-col gap-3 group">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-100">2</div>
                      <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">
                        {isFullOrderMode ? "Chế độ sản xuất" : "Mã sản phẩm"}
                      </Label>
                    </div>
                    <Controller
                      name="selectedProductId"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!!editingPlan || isFullOrderMode || !selectedOrderId}
                              className={cn(
                                "w-full h-[52px] justify-between bg-white border-zinc-200/80 rounded-xl font-bold shadow-sm transition-all text-xs px-4",
                                "hover:border-indigo-300 hover:shadow-indigo-50/50 hover:bg-white group-hover:-translate-y-0.5",
                                isFullOrderMode && "opacity-80 bg-zinc-50 border-zinc-200"
                              )}
                            >
                              <div className="flex items-center gap-3 truncate">
                                <div className={cn("p-2 rounded-lg shrink-0", isFullOrderMode ? "bg-zinc-200" : "bg-blue-50")}>
                                  <Layers className={cn("h-4 w-4", isFullOrderMode ? "text-zinc-500" : "text-blue-600")} />
                                </div>
                                <span className="truncate leading-tight">
                                  {isFullOrderMode ? "Toàn bộ đơn hàng" : (selectedOrder?.products?.find(p => String(p.id) === String(field.value))?.name || "Chọn mã sản phẩm")}
                                </span>
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                            </Button>
                          </PopoverTrigger>
                          {!isFullOrderMode && (
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                              <Command className="w-full">
                                <CommandInput placeholder="Tìm mã hàng..." className="h-11" />
                                <CommandList className="max-h-[300px] p-1">
                                  <CommandEmpty className="py-8 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không có dữ liệu</CommandEmpty>
                                  <CommandGroup>
                                    {selectedOrder?.products?.map((p) => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => {
                                          field.onChange(String(p.id));
                                          setValue("selectedOpId", "");
                                        }}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-bold">{p.name}</span>
                                          <span className="text-[10px] text-zinc-400 font-medium">{parseFloat(p.quantity).toLocaleString()} SP • ĐVT: {p.unit || "N/A"}</span>
                                        </div>
                                        <Check className={cn("h-4 w-4 text-indigo-600", String(field.value) === String(p.id) ? "opacity-100" : "opacity-0")} />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          )}
                        </Popover>
                      )}
                    />
                  </div>

                  {!isFullOrderMode && (
                    <>
                      {/* Step 3: Operation */}
                      <div className="flex flex-col gap-3 group">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-100">3</div>
                          <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Công đoạn SX <span className="text-red-500">*</span></Label>
                        </div>
                        <Controller
                          name="selectedOpId"
                          control={control}
                          render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  disabled={!!editingPlan || !selectedProductId || loadingOps}
                                  className={cn(
                                    "w-full h-[52px] justify-between bg-white border-zinc-200/80 rounded-xl font-bold shadow-sm transition-all text-xs px-4",
                                    "hover:border-indigo-300 hover:shadow-indigo-50/50 hover:bg-white group-hover:-translate-y-0.5",
                                    !field.value && "opacity-90"
                                  )}
                                >
                                  <div className="flex items-center gap-3 truncate">
                                    <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                                      <Settings className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <span className="truncate leading-tight">
                                      {operations?.find(op => String(op.id) === String(field.value))?.operation_name || (selectedProductId ? "Chọn công đoạn..." : "Chưa chọn mã")}
                                    </span>
                                  </div>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                <Command className="w-full">
                                  <CommandInput placeholder="Tìm công đoạn..." className="h-11" />
                                  <CommandList className="max-h-[300px] p-1">
                                    <CommandEmpty className="py-8 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest tracking-widest">Không có dữ liệu</CommandEmpty>
                                    <CommandGroup>
                                      {operations?.map((op) => (
                                        <CommandItem
                                          key={op.id}
                                          value={op.operation_name}
                                          onSelect={() => {
                                            field.onChange(String(op.id));
                                            const found = operations?.find(o => String(o.id) === String(op.id));
                                            if (found?.machine_ids?.length > 0) {
                                              setValue("selectedMachineId", String(found.machine_ids[0]));
                                            } else if (found?.machine_id) {
                                              setValue("selectedMachineId", String(found.machine_id));
                                            } else {
                                              setValue("selectedMachineId", "");
                                            }
                                          }}
                                          className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-bold">CĐ {op.sequence_order}: {op.operation_name}</span>
                                            <span className="text-[10px] text-zinc-400 font-medium">Đồ gá: {op.fixture || "N/A"} • Định mức: {op.dinh_muc || 0} SP/H</span>
                                          </div>
                                          <Check className={cn("h-4 w-4 text-indigo-600", String(field.value) === String(op.id) ? "opacity-100" : "opacity-0")} />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </div>

                      {/* Step 4: Machine (Inside Single Mode) */}
                      <div className="flex flex-col gap-3 group">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-100">3b</div>
                          <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Máy sản xuất</Label>
                        </div>
                        <Controller
                          name="selectedMachineId"
                          control={control}
                          render={({ field }) => {
                            const availableMachineIds = (selectedOp?.machine_ids || (selectedOp?.machine_id ? [selectedOp.machine_id] : [])).map(String);
                            const availableMachines = selectedOp ? machines?.filter(m => availableMachineIds.includes(String(m.id))) : [];

                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={isOutsourced || !selectedOp}
                                    className={cn(
                                      "w-full h-[52px] justify-between bg-white border-zinc-200/80 rounded-xl font-bold shadow-sm transition-all text-xs px-4",
                                      "hover:border-indigo-300 hover:shadow-indigo-50/50 hover:bg-white group-hover:-translate-y-0.5",
                                      (isOutsourced || !selectedOp) && "opacity-80 bg-zinc-50"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 truncate">
                                      <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                                        <Cpu className="h-4 w-4 text-amber-600" />
                                      </div>
                                      <span className="truncate leading-tight">
                                        {machines?.find(m => String(m.id) === String(field.value))?.name || (!selectedOp ? "Hãy chọn công đoạn" : (!isOutsourced ? "Chọn máy..." : "Gia công ngoài"))}
                                      </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                  <Command className="w-full">
                                    <CommandInput placeholder="Tìm máy..." className="h-11" />
                                    <CommandList className="max-h-[300px] p-1">
                                      <CommandEmpty className="py-8 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không có máy</CommandEmpty>
                                      <CommandGroup>
                                        {availableMachines?.map((m) => (
                                          <CommandItem
                                            key={m.id}
                                            value={m.name}
                                            onSelect={() => field.onChange(String(m.id))}
                                            className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                          >
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-xs font-bold">{m.name}</span>
                                              <span className="text-[10px] text-zinc-400 font-medium">Khu vực: Xưởng 1 • Công nghệ: {m.type || "Tiện/Phay"}</span>
                                            </div>
                                            <Check className={cn("h-4 w-4 text-indigo-600", String(field.value) === String(m.id) ? "opacity-100" : "opacity-0")} />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            );
                          }}
                        />
                      </div>
                    </>
                  )}

                  {isFullOrderMode && (
                    <div className="flex flex-col gap-3 group">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-100">3</div>
                        <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Máy sản xuất chung</Label>
                      </div>
                      <Controller
                        name="selectedMachineId"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={isOutsourced}
                                className={cn(
                                  "w-full h-[52px] justify-between bg-white border-zinc-200/80 rounded-xl font-bold shadow-sm transition-all text-xs px-4",
                                  "hover:border-indigo-300 hover:shadow-indigo-50/50 hover:bg-white group-hover:-translate-y-0.5"
                                )}
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                                    <Cpu className="h-4 w-4 text-amber-600" />
                                  </div>
                                  <span className="truncate leading-tight">
                                    {machines?.find(m => String(m.id) === String(field.value))?.name || (!isOutsourced ? "Chọn máy..." : "Gia công ngoài")}
                                  </span>
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                              <Command className="w-full">
                                <CommandInput placeholder="Tìm máy..." className="h-11" />
                                <CommandList className="max-h-[300px] p-1">
                                  <CommandEmpty className="py-8 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không có dữ liệu</CommandEmpty>
                                  <CommandGroup>
                                    {machines?.map((m) => (
                                      <CommandItem
                                        key={m.id}
                                        value={m.name}
                                        onSelect={() => field.onChange(String(m.id))}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                      >
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-bold">{m.name}</span>
                                          <span className="text-[10px] text-zinc-400 font-medium font-medium">Máy sản xuất xưởng</span>
                                        </div>
                                        <Check className={cn("h-4 w-4 text-indigo-600", String(field.value) === String(m.id) ? "opacity-100" : "opacity-0")} />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Third Party Toggle Block */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setValue("isOutsourced", !isOutsourced)}
                    className={cn(
                      "w-full p-4 rounded-xl border flex items-center justify-between transition-all group relative overflow-hidden",
                      isOutsourced
                        ? "bg-red-50 border-red-200 shadow-lg shadow-red-100/50"
                        : "bg-zinc-50 border-zinc-200 hover:border-indigo-200 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isOutsourced ? "bg-red-600 text-white animate-pulse" : "bg-zinc-200 text-zinc-500 group-hover:bg-indigo-600 group-hover:text-white"
                      )}>
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className={cn("text-xs font-black uppercase tracking-widest", isOutsourced ? "text-red-700" : "text-zinc-500 group-hover:text-indigo-600")}>
                          Ghi chú gia công ngoài (Outsourcing)
                        </p>
                        <p className="text-[11px] font-medium text-zinc-400">
                          {isOutsourced ? "Đang chọn chế độ gia công tại đơn vị ngoài" : "Nhấp vào để bật chế độ lập kế hoạch ra bên ngoài"}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-all duration-300",
                      isOutsourced ? "bg-red-600" : "bg-zinc-300"
                    )}>
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-sm",
                        isOutsourced ? "right-0.5" : "left-0.5"
                      )} />
                    </div>
                  </button>
                </div>
              </div>
              {/* Factory / Outsourcing */}
              {(selectedOpId || isFullOrderMode) && (
                <div className="flex flex-col md:flex-row gap-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 md:items-center">
                  {/* <div className="flex items-center gap-3 min-w-[200px]">
                    <Switch
                      id="outsourced"
                      checked={isOutsourced}
                      onCheckedChange={(val) => {
                        setValue("isOutsourced", val);
                        if (!val) setValue("selectedFactoryId", "");
                      }}
                    />
                    <Label htmlFor="outsourced" className="font-black text-sm text-zinc-950 cursor-pointer uppercase tracking-tighter">
                      Gia công ngoài
                    </Label>
                  </div> */}

                  {isOutsourced && (
                    <div className="flex-1 flex flex-col md:flex-row gap-4 md:items-center">
                      <Label className="text-xs font-bold text-zinc-400 whitespace-nowrap">CHỌN ĐƠN VỊ <span className="text-red-500">*</span>:</Label>
                      <Controller
                        name="selectedFactoryId"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="h-10 bg-white border-zinc-200 min-w-[240px] justify-between font-bold"
                              >
                                {factories?.find(f => String(f.id) === String(field.value))?.name || "Chọn nhà máy gia công"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                              <Command className="w-full">
                                <CommandInput placeholder="Tìm nhà máy..." />
                                <CommandList className="max-h-[300px] p-1">
                                  <CommandEmpty className="py-6 text-center">Không thấy nhà máy</CommandEmpty>
                                  <CommandGroup>
                                    {factories?.filter(f => f.is_active).map(f => (
                                      <CommandItem
                                        key={f.id}
                                        value={f.name}
                                        onSelect={() => field.onChange(String(f.id))}
                                        className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                      >
                                        <span className="text-xs font-bold">{f.name}</span>
                                        <Check
                                          className={cn(
                                            "ml-auto h-4 w-4 text-indigo-600",
                                            String(field.value) === String(f.id) ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {selectedFactoryId && (
                        <Badge variant="warning" className="uppercase font-black text-[10px] py-1 shadow-sm">
                          Unit: {factories?.find(f => String(f.id) === String(selectedFactoryId))?.name}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Summary Area for Single Item Mode */}
              {selectedOrderId && (selectedOp || (!selectedOpId && !isFullOrderMode)) && (
                <Card className="border-zinc-200 bg-white shadow-md overflow-hidden border-l-4 border-l-emerald-500">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 group">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Package className="w-3 h-3 text-emerald-500" /> TỔNG SL ĐƠN/MÃ
                        </span>
                        <div className="text-2xl font-black text-zinc-950 tabular-nums">
                          {totalOrderQty.toLocaleString('en-US')}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-500" /> ĐỊNH MỨC (SP/8H)
                        </span>
                        <Controller
                          name="manualDinhMuc"
                          control={control}
                          render={({ field }) => (
                            <div className="relative group/input">
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="number"
                                placeholder={dinhMuc.toString()}
                                className="h-9 font-black text-xl text-indigo-600 border-none px-0 shadow-none focus-visible:ring-0 bg-transparent"
                              />
                              {!selectedOp && <span className="text-[9px] font-bold text-amber-600 absolute -bottom-4 left-0">(*) Nhập thủ công</span>}
                            </div>
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-emerald-500" /> MÁY PHỤ TRÁCH
                        </span>
                        <div className="text-lg font-black text-zinc-950 mt-0.5">
                          {machines?.find(m => String(m.id) === String(selectedMachineId))?.name || selectedOp?.machine_names || selectedOp?.machine_name || (selectedOpId === "" ? "N/A" : "---")}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Info className="w-3 h-3 text-indigo-500" /> CÁC CÔNG ĐOẠN
                        </span>
                        <div className="text-xs font-bold text-zinc-500 mt-1">
                          {operations?.length || 0} công đoạn đã định nghĩa
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-zinc-100 mb-6" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-zinc-500">Tồn kho đầu kỳ</Label>
                        <Controller
                          name="inventory"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <Input
                                {...field}
                                value={field.value || ""}
                                type="number"
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="pl-10 h-11 bg-zinc-50/50 border-zinc-200 font-bold tabular-nums"
                              />
                            </div>
                          )}
                        />
                      </div>

                      <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">CẦN SẢN XUẤT</span>
                        <div className="text-3xl font-black text-red-600 tabular-nums">
                          {remainingQty.toLocaleString('en-US')}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col items-center justify-center">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">TỔNG CÔNG CẦN</span>
                        <div className="text-3xl font-black text-indigo-600 tabular-nums">
                          {Math.round(totalDaysNeeded).toLocaleString('en-US')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Case 2 View: Product Table */}
              {isFullOrderMode && selectedOrderId && (
                <Card className="border-zinc-200 bg-zinc-50/50 shadow-inner">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black text-zinc-950 uppercase tracking-widest">Cấu hình mã hàng (Case 2)</span>
                      </div>
                      <Badge variant="outline" className="font-black bg-white border-zinc-200">
                        Total {case2Fields.length} Items
                      </Badge>
                    </div>

                    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="grid grid-cols-[50px_1fr_120px_100px_130px_130px] gap-2 px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                        <div className="text-center">ON</div>
                        <div>Tên sản phẩm</div>
                        <div className="text-right">Số lượng</div>
                        <div className="text-center">Định mức</div>
                        <div className="text-center">Bắt đầu</div>
                        <div className="text-center">Kết thúc</div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {case2Fields.map((field, idx) => (
                          <div key={field.id} className="grid grid-cols-[50px_1fr_120px_100px_130px_130px] gap-2 px-4 py-2.5 items-center border-b border-zinc-100 hover:bg-zinc-50 transition-colors last:border-0 group">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={field.isSelected}
                                onCheckedChange={(val) => updateCase2(idx, { ...field, isSelected: !!val })}
                              />
                            </div>
                            <div className={`text-xs font-bold truncate ${!field.isSelected ? "opacity-40" : "text-zinc-900"}`}>{field.name}</div>
                            <div className="text-xs font-black text-right tabular-nums text-zinc-500">{field.quantity.toLocaleString()}</div>
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                value={field.norm}
                                onChange={(e) => handleCase2Update(idx, { norm: parseFloat(e.target.value) || 0 })}
                                className="h-7 w-20 text-center text-xs font-black text-indigo-600 border-none shadow-none focus-visible:ring-1 focus-visible:ring-indigo-100 bg-transparent group-hover:bg-white"
                              />
                            </div>
                            <div className="flex justify-center">
                              <PremiumDatePicker
                                date={field.startDate}
                                onSelect={(val) => handleCase2Update(idx, { startDate: val })}
                                className="h-7 w-28"
                              />
                            </div>
                            <div className="flex justify-center">
                              <PremiumDatePicker
                                date={field.endDate}
                                onSelect={(val) => handleCase2Update(idx, { endDate: val })}
                                className="h-7 w-28"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center px-2">
                      <span className="text-xs font-black text-zinc-400 uppercase">Tổng số lượng chọn:</span>
                      <div className="text-xl font-black text-indigo-600">
                        {case2Items.filter(i => i.isSelected).reduce((sum, p) => sum + p.quantity, 0).toLocaleString()} <span className="text-xs">SP</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Schedule / Time Section */}
              {selectedOrderId && (selectedOpId !== "" || !selectedProductId || isFullOrderMode) && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-zinc-950 uppercase tracking-widest">Thời gian & Lịch biểu</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-zinc-400">{isFullOrderMode ? "Ngày bắt đầu (A)" : "Ngày bắt đầu"}</Label>
                      <PremiumDatePicker
                        date={startDate}
                        onSelect={handleStartDateChange}
                      />
                    </div>

                    {(!selectedOp || isFullOrderMode) && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-zinc-400">{isFullOrderMode ? "Ngày kết thúc (B)" : "Ngày kết thúc (để tính ĐM)"}</Label>
                        <PremiumDatePicker
                          date={endDate}
                          onSelect={(val) => setValue("endDate", val)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Daily List */}
                  {!isFullOrderMode && (
                    <Card className="border-zinc-200 bg-zinc-50 overflow-hidden">
                      <div className="px-4 py-3 bg-white border-b border-zinc-100 flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-zinc-950 tracking-tight">Danh sách ngày sản xuất</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddDay}
                          className="h-8 gap-1.5 border-zinc-200 text-xs font-bold hover:bg-zinc-100"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm ngày
                        </Button>
                      </div>
                      <div className="divide-y divide-zinc-200/50 max-h-64 overflow-y-auto">
                        {plannedDays.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs font-bold">Chưa có ngày nào được xác định</p>
                          </div>
                        ) : (
                          plannedDays.map((day, idx) => (
                            <div key={idx} className="flex items-center gap-4 px-4 py-3 bg-white group hover:bg-zinc-50/50 transition-colors">
                              <div className="w-[140px]">
                                <PremiumDatePicker
                                  date={day.date}
                                  onSelect={(val) => {
                                    const newDays = [...plannedDays];
                                    newDays[idx] = { ...newDays[idx], date: val };
                                    replaceDays(newDays);
                                  }}
                                />
                              </div>

                              <div className="flex-1 flex justify-center">
                                <div className="flex flex-col items-center relative gap-0.5">
                                  <span className="text-[7px] font-black uppercase text-zinc-300 absolute -top-3">Số công</span>
                                  <ManagedTextField
                                    type="number"
                                    value={day.hours}
                                    onCommit={(val) => handleDayChange(idx, val)}
                                    className="w-20 border-zinc-100 shadow-none hover:bg-zinc-100 transition-colors font-black text-indigo-600"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-6 pr-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`ot-${idx}`}
                                    checked={day.is_overtime}
                                    onCheckedChange={(checked) => {
                                      const newDays = [...plannedDays];
                                      newDays[idx] = { ...newDays[idx], is_overtime: !!checked };
                                      let nextVal = parseFloat(newDays[idx].hours);
                                      if (checked && nextVal >= 1.0) nextVal = 1.43;
                                      if (!checked && nextVal > 1.0) nextVal = 1.0;
                                      const recalculated = rebalanceDays(newDays, idx, nextVal.toString(), totalDaysNeeded);
                                      replaceDays(recalculated);
                                    }}
                                  />
                                  <Label htmlFor={`ot-${idx}`} className="text-[10px] font-black uppercase cursor-pointer text-zinc-500">Tăng ca</Label>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newDays = [...plannedDays];
                                    newDays.splice(idx, 1);
                                    replaceDays(newDays);
                                  }}
                                  className="h-7 w-7 text-zinc-300 hover:text-red-500 rounded-full"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex flex-row items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="font-bold text-zinc-500 hover:text-zinc-950 px-8">
              Hủy bỏ
            </Button>
            <Button
              disabled={
                !startDate ||
                (isFullOrderMode ? (!endDate || (isOutsourced ? !selectedFactoryId : false)) : (plannedDays.length === 0 || !selectedOpId || (isOutsourced ? !selectedFactoryId : false))) ||
                isCreatePending ||
                isUpdatePending
              }
              onClick={handleFormSubmit}
              className="font-black px-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 h-11 disabled:opacity-50 disabled:bg-zinc-300 disabled:shadow-none transition-all"
            >
              {isCreatePending || isUpdatePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Xác nhận kế hoạch
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);
PlanningFormDialog.displayName = "PlanningFormDialog";

export default PlanningFormDialog;
