import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { planningService } from "../../services/planning.service";
import { orderService } from "../../services/order.service";
import { productService } from "../../services/product.service";
import { machineService } from "../../services/machine.service";
import { DateTime } from "luxon";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  ChevronsUpDown,
  X,
  Timer,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Sub-components
import {
  ExcelHeaderCell,
  rebalanceDaysAsQuantity,
  toDisplayQuantity,
  buildDailyMachineMetrics,
  parseOvertimeFlag,
} from "./components/shared";
import PlanningTableRow from "./components/PlanningTableRow";
import PlanningFormDialog from "./components/PlanningFormDialog";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";

/** Mã máy (code) là duy nhất theo xưởng; name có thể trùng giữa nhiều bản ghi. */
const formatMachineFilterLabel = (machine) => {
  const code = machine?.code?.trim();
  const name = machine?.name?.trim();
  if (code && name && code !== name) return `${code} — ${name}`;
  return code || name || `#${machine?.id}`;
};

export default function PlanningPage() {
  const queryClient = useQueryClient();

  // UI state
  const [openModal, setOpenModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineEditDays, setInlineEditDays] = useState([]);

  // Pagination & Filter
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedMachineIds, setSelectedMachineIds] = useState([]);
  const [openFilter, setOpenFilter] = useState(false);
  const [openProductFilter, setOpenProductFilter] = useState(false);
  const [openMachineFilter, setOpenMachineFilter] = useState(false);
  const [showPastDays, setShowPastDays] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    planId: null,
  });

  // ─── Data Fetching ─────────────────────────────────────
  const {
    data: plansData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "plans",
      page,
      rowsPerPage,
      selectedOrderIds,
      selectedProductIds,
      selectedMachineIds,
    ],
    queryFn: () =>
      planningService.getAll({
        page: page + 1,
        limit: rowsPerPage,
        order_ids: selectedOrderIds.join(","),
        product_ids: selectedProductIds.join(","),
        machine_ids: selectedMachineIds.join(","),
      }),
  });

  const plans = plansData?.data || [];
  const totalCount = plansData?.total || 0;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  // Toàn bộ kế hoạch — dùng cho cảnh báo đỏ (không phụ thuộc phân trang)
  const { data: allPlansForMetrics } = useQuery({
    queryKey: ["plans", "capacity-check"],
    queryFn: () => planningService.getAll({ limit: 5000 }),
    staleTime: 30_000,
  });
  const allPlans = allPlansForMetrics?.data || [];

  const { data: allOrdersData } = useQuery({
    queryKey: ["orders"],
    queryFn: () => orderService.getAll({ limit: 1000 }), // Lấy nhiều để filter
  });
  const orders = allOrdersData?.data || [];

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll({ limit: 1000 }),
  });
  const filterProducts = productsData?.data || [];

  const { data: machinesData } = useQuery({
    queryKey: ["machines"],
    queryFn: () => machineService.getAll({ limit: 1000 }),
  });
  const filterMachines = machinesData?.data || [];

  const dailyMachineMetrics = useMemo(
    () =>
      buildDailyMachineMetrics(allPlans, { inlineEditingId, inlineEditDays }),
    [allPlans, inlineEditingId, inlineEditDays],
  );

  // Aggregates total shifts (công) across all machines per day
  const dailyTotalCong = useMemo(() => {
    if (!dailyMachineMetrics) return {};
    const totals = {};
    Object.keys(dailyMachineMetrics).forEach((dateISO) => {
      let daySum = 0;
      Object.values(dailyMachineMetrics[dateISO]).forEach((m) => {
        daySum += m.totalHours;
      });
      totals[dateISO] = daySum;
    });
    return totals;
  }, [dailyMachineMetrics]);

  // ─── Date Columns ──────────────────────────────────────
  const dateColumns = useMemo(() => {
    if (!plans || plans.length === 0) return [];
    const dates = new Set();
    plans.forEach((plan) => {
      plan.days?.forEach((day) => {
        dates.add(DateTime.fromISO(day.working_date).toFormat("yyyy-MM-dd"));
      });
    });

    if (dates.size === 0) return [];

    const sortedDates = Array.from(dates).sort();
    const minDate = DateTime.fromISO(sortedDates[0]);
    const maxDate = DateTime.fromISO(sortedDates[sortedDates.length - 1]);

    const continuousDates = [];
    let cur = minDate;
    while (cur <= maxDate) {
      continuousDates.push(cur.toFormat("yyyy-MM-dd"));
      cur = cur.plus({ days: 1 });
    }

    const todayStr = DateTime.now().toFormat("yyyy-MM-dd");

    return continuousDates
      .filter((d) => showPastDays || d >= todayStr)
      .map((d) => ({
        key: d,
        label: DateTime.fromISO(d).toFormat("dd-MM"),
      }));
  }, [plans, showPastDays]);

  // ─── Mutations ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload) => planningService.createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      handleCloseModal();
      toast.success("Thêm mới thành công!");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi tạo kế hoạch"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => planningService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Cập nhật thành công!");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật"),
  });

  const batchOrderMutation = useMutation({
    mutationFn: (payload) => planningService.createBatchOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      handleCloseModal();
      toast.success("Tạo kế hoạch theo đơn chung thành công!");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi tạo kế hoạch chung"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => planningService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Xóa kế hoạch thành công!");
      setDeleteConfirm({ open: false, planId: null });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi xóa"),
  });

  const cloneMutation = useMutation({
    mutationFn: (id) => planningService.clone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Nhân bản kế hoạch thành công!");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi nhân bản"),
  });

  // ─── Handlers ──────────────────────────────────────────
  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
    setEditingPlan(null);
  }, []);

  const findSiblingPlans = useCallback((plan, allPlans) => {
    if (!plan.machine_id) return [];
    return allPlans.filter(
      (p) =>
        p.id !== plan.id &&
        p.order_id === plan.order_id &&
        p.product_id === plan.product_id &&
        p.product_group_operation_id === plan.product_group_operation_id &&
        p.machine_id,
    );
  }, []);

  const buildMergedPlanForEdit = useCallback((plan, siblings) => {
    if (siblings.length === 0) return plan;

    const allPlans = [plan, ...siblings];
    const machineIds = allPlans
      .map((p) => String(p.machine_id))
      .filter(Boolean);
    const daysByDate = {};

    for (const p of allPlans) {
      const mId = String(p.machine_id);
      for (const d of p.days || []) {
        const date = DateTime.fromISO(d.working_date).toISODate();
        if (!daysByDate[date]) {
          daysByDate[date] = {
            date,
            hours: "0",
            is_overtime: false,
            machineHours: {},
          };
        }
        daysByDate[date].machineHours[mId] = (
          parseFloat(d.planned_work_quantity) / 8
        ).toFixed(6);
        if (parseOvertimeFlag(d.is_overtime))
          daysByDate[date].is_overtime = true;
      }
    }

    const mergedPlannedDays = Object.values(daysByDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => {
        const total = machineIds.reduce(
          (s, mid) => s + parseFloat(day.machineHours[mid] || 0),
          0,
        );
        return {
          ...day,
          hours: total.toFixed(6),
          is_overtime: Boolean(day.is_overtime),
        };
      });

    return {
      ...plan,
      machine_ids: machineIds,
      planGroup: allPlans.map((p) => ({ id: p.id, machine_id: p.machine_id })),
      _mergedPlannedDays: mergedPlannedDays,
    };
  }, []);

  const handleOpenEdit = useCallback(
    (plan) => {
      const siblings = findSiblingPlans(plan, plans);
      setEditingPlan(buildMergedPlanForEdit(plan, siblings));
      setOpenModal(true);
    },
    [plans, findSiblingPlans, buildMergedPlanForEdit],
  );

  const handleFormSubmit = useCallback(
    async (payload) => {
      if (payload.isFullOrderMode) {
        batchOrderMutation.mutate({
          order_id: payload.order_id,
          start_date: payload.planned_start_date,
          end_date: payload.endDate,
          factory_id: payload.factory_id,
          is_outsourced: payload.is_outsourced,
          items: payload.items,
        });
        return;
      }
      if (editingPlan?.planGroup?.length > 1) {
        try {
          await Promise.all(
            editingPlan.planGroup.map(({ id, machine_id }) => {
              const mId = String(machine_id);
              const planRecord = plans.find((p) => p.id === id) || editingPlan;
              const mDays = (payload.days || [])
                .map((d) => {
                  const machineHrs = parseFloat(d.machine_hours?.[mId] ?? 0);
                  if (machineHrs <= 0) return null;
                  return {
                    date: d.date,
                    hours: (machineHrs * 8).toFixed(6),
                    is_overtime: d.is_overtime || false,
                  };
                })
                .filter(Boolean);

              return planningService.update(id, {
                order_id: planRecord.order_id,
                product_id: planRecord.product_id,
                product_group_operation_id:
                  planRecord.product_group_operation_id,
                inventory_input:
                  payload.inventory_input ?? planRecord.inventory_input,
                planned_start_date:
                  payload.planned_start_date ?? planRecord.planned_start_date,
                dinh_muc: payload.dinh_muc ?? planRecord.dinh_muc,
                machine_id: machine_id || null,
                days: mDays,
              });
            }),
          );
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          handleCloseModal();
          toast.success("Cập nhật thành công!");
        } catch (err) {
          toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
        }
        return;
      }
      if (editingPlan) {
        updateMutation.mutate(
          { id: editingPlan.id, payload },
          { onSuccess: () => handleCloseModal() },
        );
      } else {
        createMutation.mutate(payload);
      }
    },
    [
      editingPlan,
      plans,
      updateMutation,
      createMutation,
      batchOrderMutation,
      handleCloseModal,
      queryClient,
    ],
  );

  const mapDaysWithQuantity = useCallback((days, dinhMuc) => {
    return days.map((d) => {
      const hours = parseFloat(
        (parseFloat(d.planned_work_quantity) / 8).toFixed(10),
      );
      return {
        date: DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd"),
        hours,
        quantity: String(
          Math.round(toDisplayQuantity(d.planned_work_quantity, dinhMuc)),
        ),
        is_overtime: d.is_overtime,
      };
    });
  }, []);

  const handleStartInlineEdit = useCallback(
    (plan) => {
      setInlineEditingId(plan.id);
      setInlineEditDays(mapDaysWithQuantity(plan.days, plan.dinh_muc));
    },
    [mapDaysWithQuantity],
  );

  const handleCancelInlineEdit = useCallback(() => {
    setInlineEditingId(null);
    setInlineEditDays([]);
  }, []);

  const handleInlineDayChange = useCallback(
    (plan, dateISO, value) => {
      setInlineEditDays((prev) => {
        const dinhMuc = parseFloat(plan.dinh_muc) || 1;
        // Calculate total work needed from the existing days (not from order quantity)
        // This ensures multi-machine plans maintain their allocated portion
        const totalHoursInPlan = (prev || []).reduce(
          (sum, d) => sum + parseFloat(d.hours || 0),
          0,
        );
        const planTotalNeeded =
          (parseFloat(plan.quantity) - parseFloat(plan.inventory_input)) / dinhMuc;

        let newDays = [...prev];
        let index = newDays.findIndex((d) => d.date === dateISO);
        if (index === -1) {
          newDays.push({
            date: dateISO,
            hours: "0.00",
            quantity: "0",
            is_overtime: false,
          });
          newDays.sort((a, b) => a.date.localeCompare(b.date));
          index = newDays.findIndex((d) => d.date === dateISO);
        }
        return rebalanceDaysAsQuantity(
          newDays,
          index,
          value,
          planTotalNeeded,
          dinhMuc,
        );
      });
    },
    [rebalanceDaysAsQuantity],
  );

  const handleInlineOTToggle = useCallback(
    (plan, dateISO) => {
      setInlineEditDays((prev) => {
        const dinhMuc = parseFloat(plan.dinh_muc) || 1;
        // Calculate total work needed from the existing days (not from order quantity)
        // This ensures multi-machine plans maintain their allocated portion
        const totalHoursInPlan = (prev || []).reduce(
          (sum, d) => sum + parseFloat(d.hours || 0),
          0,
        );
        const planTotalNeeded =
          totalHoursInPlan > 0
            ? totalHoursInPlan
            : (parseFloat(plan.quantity) - parseFloat(plan.inventory_input)) /
              dinhMuc;

        let newDays = [...prev];
        let index = newDays.findIndex((d) => d.date === dateISO);
        if (index === -1) {
          const existingDay = plan.days?.find(
            (d) =>
              DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd") ===
              dateISO,
          );
          const hours = existingDay
            ? (parseFloat(existingDay.planned_work_quantity) / 8).toFixed(6)
            : "0.00";
          const quantity = existingDay
            ? String(
                toDisplayQuantity(existingDay.planned_work_quantity, dinhMuc),
              )
            : "0";
          newDays.push({
            date: dateISO,
            hours,
            quantity,
            is_overtime: existingDay?.is_overtime || false,
          });
          newDays.sort((a, b) => a.date.localeCompare(b.date));
          index = newDays.findIndex((d) => d.date === dateISO);
        }
        newDays = newDays.map((d) =>
          d.date === dateISO ? { ...d, is_overtime: !d.is_overtime } : d,
        );
        const day = newDays[index];
        if (!day) return prev;
        return rebalanceDaysAsQuantity(
          newDays,
          index,
          day.quantity,
          planTotalNeeded,
          dinhMuc,
        );
      });
    },
    [rebalanceDaysAsQuantity],
  );

  const handleSaveInline = useCallback(
    (plan) => {
      const payload = {
        order_id: plan.order_id,
        product_id: plan.product_id,
        product_group_operation_id: plan.product_group_operation_id,
        inventory_input: plan.inventory_input,
        planned_start_date: plan.planned_start_date,
        machine_id: plan.machine_id || null,
        days: inlineEditDays
          .filter((d) => parseFloat(d.hours) > 0)
          .map((d) => ({
            date: d.date,
            hours: (parseFloat(d.hours) * 8).toFixed(6),
            is_overtime: d.is_overtime,
          })),
      };
      updateMutation.mutate(
        { id: plan.id, payload },
        { onSuccess: () => handleCancelInlineEdit() },
      );
    },
    [inlineEditDays, updateMutation, handleCancelInlineEdit],
  );

  const toggleOrderSelection = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id],
    );
    setPage(0);
  };

  const toggleProductSelection = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
    setPage(0);
  };

  const toggleMachineSelection = (id) => {
    setSelectedMachineIds((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id],
    );
    setPage(0);
  };

  const selectedOrdersDisplay = orders?.filter((o) =>
    selectedOrderIds.includes(o.id),
  );
  const selectedProductsDisplay = filterProducts?.filter((p) =>
    selectedProductIds.includes(p.id),
  );
  const selectedMachinesDisplay = filterMachines?.filter((m) =>
    selectedMachineIds.includes(m.id),
  );

  // ─── Render ────────────────────────────────────────────
  if (isLoading && !plansData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-zinc-500 font-medium animate-pulse">
          Đang tải kế hoạch sản xuất...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Lỗi</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="px-2 py-4 space-y-6">
      {/* Title & Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex-1 shrink-0 min-w-0">
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight uppercase">
            Kế hoạch sản xuất
          </h1>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Quản lý và điều phối các công đoạn sản xuất tại xưởng
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            onClick={async () => {
              if (totalCount === 0) {
                toast.warning("Không có dữ liệu để xuất");
                return;
              }
              const toastId = toast.loading("Đang tải toàn bộ dữ liệu...");
              try {
                // Fetch all data matching current filters
                const res = await planningService.getAll({
                  page: 1,
                  limit: 100000,
                  order_ids: selectedOrderIds.join(","),
                  product_ids: selectedProductIds.join(","),
                  machine_ids: selectedMachineIds.join(","),
                });
                const allPlans = res.data || [];

                // Recalculate date columns for all plans
                const dates = new Set();
                allPlans.forEach((plan) => {
                  plan.days?.forEach((day) => {
                    dates.add(
                      DateTime.fromISO(day.working_date).toFormat("yyyy-MM-dd"),
                    );
                  });
                });

                let exportDateColumns = [];
                if (dates.size > 0) {
                  const sortedDates = Array.from(dates).sort();
                  const minDate = DateTime.fromISO(sortedDates[0]);
                  const maxDate = DateTime.fromISO(
                    sortedDates[sortedDates.length - 1],
                  );
                  const continuousDates = [];
                  let cur = minDate;
                  while (cur <= maxDate) {
                    continuousDates.push(cur.toFormat("yyyy-MM-dd"));
                    cur = cur.plus({ days: 1 });
                  }

                  const todayStr = DateTime.now().toFormat("yyyy-MM-dd");
                  exportDateColumns = continuousDates
                    .filter((d) => showPastDays || d >= todayStr)
                    .map((d) => ({
                      key: d,
                      label: DateTime.fromISO(d).toFormat("dd-MM"),
                    }));
                }

                const XLSX = await import("xlsx");
                const worksheetData = allPlans.map((plan, i) => {
                  const row = {
                    STT: i + 1,
                    "STT CĐ": plan.sequence_order,
                    "Tên mã hàng": plan.product_name,
                    "Nhóm mã": plan.product_group_name,
                    "Công đoạn": plan.operation_name,
                    Máy: plan.machine_name,
                    "SL đơn":
                      parseFloat(plan.inventory_input) +
                      parseFloat(plan.remaining_quantity),
                    "Tồn kho": plan.inventory_input,
                    "Còn lại": plan.remaining_quantity,
                    "Định mức": plan.dinh_muc,
                    "Đã SX": 0,
                    Mẫu: "x",
                    "Bắt đầu": plan.planned_start_date
                      ? DateTime.fromISO(plan.planned_start_date).toFormat(
                          "dd-MM",
                        )
                      : "",
                    "Kết thúc": plan.planned_end_date
                      ? DateTime.fromISO(plan.planned_end_date).toFormat(
                          "dd-MM",
                        )
                      : "",
                  };

                  exportDateColumns.forEach((date) => {
                    const dayData = plan.days?.find(
                      (d) =>
                        DateTime.fromISO(d.working_date).toFormat(
                          "yyyy-MM-dd",
                        ) === date.key,
                    );
                    if (dayData) {
                      const qty =
                        parseFloat(dayData.planned_work_quantity) || 0;
                      const dinhMuc = parseFloat(plan.dinh_muc) || 0;
                      const base = qty / 8;
                      const total = Math.round(base * dinhMuc);
                      row[date.label] = total;
                    } else {
                      row[date.label] = "";
                    }
                  });
                  return row;
                });
                const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "KeHoach");
                XLSX.writeFile(
                  workbook,
                  `KeHoach_SanXuat_${DateTime.now().toFormat("yyyyMMdd")}.xlsx`,
                );
                toast.success("Xuất Excel thành công", { id: toastId });
              } catch (err) {
                console.error(err);
                toast.error("Lỗi xuất Excel", { id: toastId });
              }
            }}
            variant="outline"
            className="h-11 px-5 border-zinc-200 text-zinc-700 hover:text-indigo-600 hover:border-indigo-200 shadow-sm rounded-xl font-bold transition-all text-xs tracking-wider uppercase"
          >
            Xuất Excel
          </Button>

          <Button
            onClick={() => {
              setEditingPlan(null);
              setOpenModal(true);
            }}
            className="h-11 gap-2 font-black uppercase text-xs tracking-widest px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 rounded-xl border-none transition-all"
          >
            <Plus className="w-4 h-4" /> Lập kế hoạch
          </Button>
        </div>
      </div>

      {/* Filters Bar Row */}
      <div className="bg-white/80 backdrop-blur-md border border-zinc-200 shadow-sm p-4 rounded-2xl flex flex-wrap items-center gap-3">
        {/* Product Filter */}
        <Popover open={openProductFilter} onOpenChange={setOpenProductFilter}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-10 gap-2 font-bold px-4 bg-zinc-50 hover:bg-white shadow-sm border-zinc-200 rounded-xl text-xs text-zinc-700 transition-all"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                {selectedProductIds.length > 0
                  ? `Đã chọn ${selectedProductIds.length} mã`
                  : "Lọc mã hàng"}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 ml-1" />
              </Button>
            }
          />
          <PopoverContent
            className="w-[320px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden"
            align="start"
          >
            <Command className="w-full">
              <CommandInput placeholder="Tìm kiếm mã hàng..." />
              <CommandList className="max-h-[300px] p-1">
                <CommandEmpty className="py-6 text-center">
                  <Layers className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Không thấy mã hàng
                  </p>
                </CommandEmpty>
                <CommandGroup>
                  {filterProducts.map((p) => (
                    <CommandItem
                      key={p.id}
                      onSelect={() => toggleProductSelection(p.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                    >
                      <div
                        className={cn(
                          "w-4 h-4 border border-zinc-300 rounded flex items-center justify-center transition-colors",
                          selectedProductIds.includes(p.id)
                            ? "bg-indigo-600 border-indigo-600"
                            : "bg-white",
                        )}
                      >
                        {selectedProductIds.includes(p.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-bold text-xs break-all leading-tight">
                        {p.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              {selectedProductIds.length > 0 && (
                <div className="p-2 border-t border-zinc-100 flex justify-between bg-zinc-50/50">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedProductIds([])}
                    className="text-[10px] h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Xóa tất cả
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => setOpenProductFilter(false)}
                    className="text-[10px] h-7 px-3 bg-zinc-950 text-white font-bold"
                  >
                    Xong
                  </Button>
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>

        {/* Machine Filter */}
        <Popover open={openMachineFilter} onOpenChange={setOpenMachineFilter}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-10 gap-2 font-bold px-4 bg-zinc-50 hover:bg-white shadow-sm border-zinc-200 rounded-xl text-xs text-zinc-700 transition-all"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                {selectedMachineIds.length > 0
                  ? `Đã chọn ${selectedMachineIds.length} máy`
                  : "Lọc máy"}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 ml-1" />
              </Button>
            }
          />
          <PopoverContent
            className="w-[280px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden"
            align="start"
          >
            <Command className="w-full">
              <CommandInput placeholder="Tìm kiếm máy..." />
              <CommandList className="max-h-[300px] p-1">
                <CommandEmpty className="py-6 text-center">
                  <Layers className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Không thấy máy
                  </p>
                </CommandEmpty>
                <CommandGroup>
                  {filterMachines.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={`${m.code || ""} ${m.name || ""}`}
                      onSelect={() => toggleMachineSelection(m.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                    >
                      <div
                        className={cn(
                          "w-4 h-4 border border-zinc-300 rounded flex items-center justify-center transition-colors shrink-0",
                          selectedMachineIds.some(
                            (mid) => String(mid) === String(m.id),
                          )
                            ? "bg-indigo-600 border-indigo-600"
                            : "bg-white",
                        )}
                      >
                        {selectedMachineIds.some(
                          (mid) => String(mid) === String(m.id),
                        ) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        {m.code && (
                          <span className="font-bold text-xs text-indigo-700 leading-tight">
                            {m.code}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] leading-tight break-all",
                            m.code
                              ? "text-zinc-500 font-medium"
                              : "font-bold text-xs text-zinc-900",
                          )}
                        >
                          {m.name}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              {selectedMachineIds.length > 0 && (
                <div className="p-2 border-t border-zinc-100 flex justify-between bg-zinc-50/50">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedMachineIds([])}
                    className="text-[10px] h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Xóa tất cả
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => setOpenMachineFilter(false)}
                    className="text-[10px] h-7 px-3 bg-zinc-950 text-white font-bold"
                  >
                    Xong
                  </Button>
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>

        {/* Multi-select filter replacement (Orders) */}
        <Popover open={openFilter} onOpenChange={setOpenFilter}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="h-10 gap-2 font-bold px-4 bg-zinc-50 hover:bg-white shadow-sm border-zinc-200 rounded-xl text-xs text-zinc-700 transition-all"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                {selectedOrderIds.length > 0
                  ? `Đã chọn ${selectedOrderIds.length} đơn`
                  : "Lọc theo đơn hàng"}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 ml-1" />
              </Button>
            }
          />
          <PopoverContent
            className="w-[320px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden"
            align="start"
          >
            <Command className="w-full">
              <CommandInput placeholder="Tìm kiếm đơn hàng..." />
              <CommandList className="max-h-[300px] p-1">
                <CommandEmpty className="py-6 text-center">
                  <Layers className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Không thấy đơn hàng
                  </p>
                </CommandEmpty>
                <CommandGroup>
                  {orders.map((order) => (
                    <CommandItem
                      key={order.id}
                      onSelect={() => toggleOrderSelection(order.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                    >
                      <div
                        className={cn(
                          "w-4 h-4 border border-zinc-300 rounded flex items-center justify-center transition-colors",
                          selectedOrderIds.includes(order.id)
                            ? "bg-indigo-600 border-indigo-600"
                            : "bg-white",
                        )}
                      >
                        {selectedOrderIds.includes(order.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-bold text-xs break-all leading-tight">
                        {order.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              {selectedOrderIds.length > 0 && (
                <div className="p-2 border-t border-zinc-100 flex justify-between bg-zinc-50/50">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedOrderIds([])}
                    className="text-[10px] h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Xóa tất cả
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => setOpenFilter(false)}
                    className="text-[10px] h-7 px-3 bg-zinc-950 text-white font-bold"
                  >
                    Xong
                  </Button>
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          onClick={() => setShowPastDays(!showPastDays)}
          className={cn(
            "h-10 gap-2 font-bold px-4 bg-zinc-50 border-zinc-200 transition-all rounded-xl text-xs",
            showPastDays
              ? "text-indigo-600 border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/50"
              : "text-zinc-600 hover:bg-white",
          )}
        >
          {showPastDays ? (
            <Eye className="w-4 h-4 text-indigo-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-zinc-400" />
          )}
          {showPastDays ? "Đang hiện ngày cũ" : "Ẩn ngày cũ"}
        </Button>

        {/* Clear Filters Button */}
        {(selectedProductIds.length > 0 ||
          selectedMachineIds.length > 0 ||
          selectedOrderIds.length > 0) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedProductIds([]);
              setSelectedMachineIds([]);
              setSelectedOrderIds([]);
              setPage(0);
            }}
            className="h-10 px-3 text-red-500 hover:text-red-600 hover:bg-red-50/60 font-bold text-xs rounded-xl transition-all"
          >
            Đặt lại bộ lọc
          </Button>
        )}
      </div>

      {/* Selected Filters View */}
      {(selectedOrderIds.length > 0 ||
        selectedProductIds.length > 0 ||
        selectedMachineIds.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center px-1">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-1">
            ĐANG LỌC:
          </span>
          {selectedOrdersDisplay.slice(0, 5).map((o) => (
            <Badge
              key={o.id}
              variant="secondary"
              className="gap-1 pl-2 pr-1 h-6 text-[10px] font-bold bg-white border-zinc-200"
            >
              Đơn: {o.name.substring(0, 20)}
              {o.name.length > 20 ? "..." : ""}
              <button
                onClick={() => toggleOrderSelection(o.id)}
                className="hover:text-red-500 rounded-full p-0.5 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedOrderIds.length > 5 && (
            <Badge
              variant="outline"
              className="h-6 text-[10px] font-bold bg-white border-dashed"
            >
              +{selectedOrderIds.length - 5} đơn hàng khác
            </Badge>
          )}

          {selectedProductsDisplay.slice(0, 5).map((p) => (
            <Badge
              key={p.id}
              variant="secondary"
              className="gap-1 pl-2 pr-1 h-6 text-[10px] font-bold bg-white border-zinc-200"
            >
              Mã: {p.name.substring(0, 20)}
              {p.name.length > 20 ? "..." : ""}
              <button
                onClick={() => toggleProductSelection(p.id)}
                className="hover:text-red-500 rounded-full p-0.5 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedProductIds.length > 5 && (
            <Badge
              variant="outline"
              className="h-6 text-[10px] font-bold bg-white border-dashed"
            >
              +{selectedProductIds.length - 5} mã hàng khác
            </Badge>
          )}

          {selectedMachinesDisplay.slice(0, 5).map((m) => {
            const machineLabel = formatMachineFilterLabel(m);
            return (
              <Badge
                key={m.id}
                variant="secondary"
                className="gap-1 pl-2 pr-1 h-6 text-[10px] font-bold bg-white border-zinc-200"
              >
                Máy: {machineLabel.substring(0, 28)}
                {machineLabel.length > 28 ? "..." : ""}
                <button
                  onClick={() => toggleMachineSelection(m.id)}
                  className="hover:text-red-500 rounded-full p-0.5 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          {selectedMachineIds.length > 5 && (
            <Badge
              variant="outline"
              className="h-6 text-[10px] font-bold bg-white border-dashed"
            >
              +{selectedMachineIds.length - 5} máy khác
            </Badge>
          )}
        </div>
      )}

      {/* Main Table */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="w-full border-collapse border-spacing-0">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-zinc-100">
                <ExcelHeaderCell rowSpan={2}>Thứ tự</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Tên mã hàng</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Nhóm mã</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>STT CĐ</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Công đoạn</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Máy</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>SL đơn</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Tồn kho</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2} className="text-red-600">
                  Còn lại
                </ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Định mức</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Đã SX</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Mẫu</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Bắt đầu</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Kết thúc</ExcelHeaderCell>
                {dateColumns.length > 0 && (
                  <ExcelHeaderCell
                    colSpan={dateColumns.length}
                    className="bg-sky-50 text-sky-700 border-b-none"
                  >
                    NGÀY LÀM VIỆC
                  </ExcelHeaderCell>
                )}
                <ExcelHeaderCell
                  rowSpan={2}
                  className="sticky right-0 z-30 bg-zinc-100 border-l border-zinc-300"
                >
                  Hành động
                </ExcelHeaderCell>
              </tr>
              {dateColumns.length > 0 && (
                <tr className="bg-zinc-50">
                  {dateColumns.map((date) => {
                    const dt = DateTime.fromISO(date.key);
                    const isSunday = dt.weekday === 7;
                    const dayName = dt.setLocale("vi").toFormat("cccc");

                    return (
                      <ExcelHeaderCell
                        key={date.key}
                        className={cn(
                          "text-[9px] min-w-[54px] p-1 h-auto py-2",
                          isSunday
                            ? "bg-zinc-400 text-red-50"
                            : "bg-sky-50/50 text-zinc-600",
                        )}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none",
                                isSunday
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100/50 text-blue-600",
                              )}
                            >
                              {Number(
                                dailyTotalCong[date.key] || 0,
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 1,
                              })}
                            </span>
                            <span className="text-[6px] font-black opacity-40 uppercase tracking-tighter mt-0.5">
                              CÔNG
                            </span>
                          </div>
                          <div className="flex flex-col items-center border-t border-sky-100 w-full pt-1 mt-0.5">
                            <span className="text-[7px] font-black uppercase opacity-60 mb-0.5">
                              {dayName}
                            </span>
                            <span className="font-bold">{date.label}</span>
                          </div>
                        </div>
                      </ExcelHeaderCell>
                    );
                  })}
                </tr>
              )}
            </thead>
            <tbody>
              {plans.length > 0 ? (
                plans.map((plan, idx) => (
                  <PlanningTableRow
                    key={plan.id}
                    plan={plan}
                    idx={idx}
                    dateColumns={dateColumns}
                    isInlineEditing={inlineEditingId === plan.id}
                    inlineEditDays={
                      inlineEditingId === plan.id ? inlineEditDays : []
                    }
                    isUpdatePending={updateMutation.isPending}
                    isDeletePending={
                      deleteMutation.isPending &&
                      deleteConfirm.planId === plan.id
                    }
                    onStartInlineEdit={handleStartInlineEdit}
                    onCancelInlineEdit={handleCancelInlineEdit}
                    onSaveInline={handleSaveInline}
                    onOpenEdit={handleOpenEdit}
                    onOpenDelete={(pid) =>
                      setDeleteConfirm({ open: true, planId: pid })
                    }
                    onClone={(pid) => cloneMutation.mutate(pid)}
                    onInlineDayChange={handleInlineDayChange}
                    onInlineOTToggle={handleInlineOTToggle}
                    dailyMachineMetrics={dailyMachineMetrics}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={17 + dateColumns.length}
                    className="py-20 text-center text-zinc-400 bg-white"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2 italic">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />{" "}
                        Đang cập nhật danh sách...
                      </div>
                    ) : (
                      "Không tìm thấy kế hoạch sản xuất nào."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Custom Pagination */}
        <div className="px-6 py-3 bg-white border-t border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <p className="text-xs font-bold text-zinc-500">
              Tổng cộng:{" "}
              <span className="text-zinc-950 font-black">{totalCount}</span> kế
              hoạch
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">
                Hiển thị
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setPage(0);
                }}
                className="text-xs font-bold bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 focus:ring-0 focus:border-zinc-300"
              >
                {[5, 10, 25, 50].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-zinc-500">
              Trang <span className="text-zinc-950">{page + 1}</span> /{" "}
              {totalPages || 1}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-zinc-200"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-zinc-200"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Dialogs ────────────────────────────────────── */}
      <PlanningFormDialog
        open={openModal}
        editingPlan={editingPlan}
        isCreatePending={
          createMutation.isPending || batchOrderMutation.isPending
        }
        isUpdatePending={updateMutation.isPending}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteConfirm({ open: false, planId: null })}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.planId)}
      />
    </div>
  );
}
