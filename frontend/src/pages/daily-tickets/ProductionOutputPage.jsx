import React, { useState, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../services/daily-ticket.service";
import { useAuth } from "../../context/AuthContext";
import { orderService } from "../../services/order.service";
import { productService } from "../../services/product.service";
import { productGroupService } from "../../services/product-group.service";
import { operationService } from "../../services/operation.service";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PremiumDatePicker } from "@/components/PremiumDatePicker";
import { Separator } from "@/components/ui/separator";
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
import {
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  ShoppingCart,
  Package,
  Settings,
  ClipboardList,
  Pencil,
} from "lucide-react";

// ─── Combobox helper ────────────────────────────────────────────────────────
function Combobox({
  value,
  onChange,
  options = [],
  placeholder = "Chọn...",
  disabled = false,
  icon: Icon,
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full h-9 justify-between text-xs font-bold"
        >
          <div className="flex items-center gap-1.5 truncate">
            {Icon && <Icon className="h-3 w-3 text-indigo-500 shrink-0" />}
            <span className="truncate">
              {options.find((o) => String(o.id) === String(value))?.name ||
                placeholder}
            </span>
          </div>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden"
        align="start"
      >
        <Command>
          <CommandInput placeholder={`Tìm ${placeholder.toLowerCase()}...`} />
          <CommandList className="max-h-[300px] p-1">
            <CommandEmpty className="py-6 text-center text-[10px] font-bold text-[rgb(var(--c-ink-4))]">
              Không thấy
            </CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isItemDisabled = !!o.disabled;
                return (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    disabled={isItemDisabled}
                    onSelect={() => {
                      if (!isItemDisabled) {
                        onChange(String(o.id));
                      }
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-1 flex items-center justify-between",
                      isItemDisabled &&
                        "opacity-50 pointer-events-none cursor-not-allowed",
                    )}
                  >
                    <div className="flex flex-col text-left">
                      <span
                        className={cn(
                          "text-xs font-bold",
                          isItemDisabled && "text-[rgb(var(--c-ink-4))] line-through",
                        )}
                      >
                        {o.name}
                      </span>
                      {o.subLabel && (
                        <span className="text-[10px] text-[rgb(var(--c-ink-4))] font-medium">
                          {o.subLabel}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-3 w-3 text-indigo-600 shrink-0",
                        String(value) === String(o.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Row nhập thủ công ──────────────────────────────────────────────────────
function ManualRow({
  index,
  control,
  setValue,
  remove,
  watchItems,
  allOrders,
  allProducts,
  allOperations,
}) {
  const row = watchItems[index] || {};

  const orderOptions = useMemo(() => {
    const map = new Map();
    (allOrders || []).forEach((o) => {
      if (!map.has(o.id))
        map.set(o.id, { id: o.id, name: o.order_code || o.name || `#${o.id}` });
    });
    return Array.from(map.values());
  }, [allOrders]);

  const productOptions = useMemo(() => {
    if (row.order_id) {
      const selectedOrder = (allOrders || []).find(
        (o) => String(o.id) === String(row.order_id),
      );
      if (selectedOrder && selectedOrder.products) {
        return selectedOrder.products.map((p) => ({
          id: p.id,
          name: p.name,
          product_group_id: p.product_group_id,
          // FIX A: giữ lại order_quantity và total_actual để tính remaining khi không có công đoạn
          order_quantity: parseFloat(p.quantity || p.order_quantity) || 0,
          total_actual: parseFloat(p.total_actual) || 0,
        }));
      }
    }
    if (!row.order_id) return [];
    const map = new Map();
    (allProducts || []).forEach((p) => {
      if (!map.has(p.id))
        map.set(p.id, {
          id: p.id,
          name: p.name,
          product_group_id: p.product_group_id,
          order_quantity: 0,
          total_actual: 0,
        });
    });
    return Array.from(map.values());
  }, [allProducts, allOrders, row.order_id]);

  const selectedProduct = useMemo(() => {
    if (!row.product_id) return null;
    return productOptions.find((p) => String(p.id) === String(row.product_id));
  }, [productOptions, row.product_id]);

  const { data: pgoList, isLoading: isLoadingPgo } = useQuery({
    queryKey: [
      "product-group-operations",
      selectedProduct?.product_group_id,
      row.order_id,
      row.product_id,
    ],
    queryFn: () =>
      productGroupService.getOperations(selectedProduct?.product_group_id, {
        orderId: row.order_id,
        productId: row.product_id,
      }),
    enabled: !!selectedProduct?.product_group_id,
  });

  const operationOptions = useMemo(() => {
    if (!row.product_id) return [];
    if (selectedProduct?.product_group_id && pgoList && pgoList.length === 0) {
      return [
        {
          id: "__no_operation__",
          name: "(Không công đoạn – SL tổng mã hàng)",
          subLabel: "Dùng cho mã hàng chưa khai báo quy trình",
        },
      ];
    }
    if (pgoList && pgoList.length > 0) {
      return pgoList.map((item) => {
        const orderQty = parseFloat(item.order_quantity) || 0;
        const totalActual = parseFloat(item.total_actual) || 0;
        const isCompleted = orderQty > 0 && totalActual >= orderQty;
        return {
          id: item.id,
          name: item.operation_name,
          subLabel:
            orderQty > 0 ? `Đã làm: ${totalActual}/${orderQty}` : undefined,
          disabled: isCompleted,
        };
      });
    }
    return [];
  }, [pgoList, allOperations, row.product_id, selectedProduct?.product_group_id]);

  const isNoOperation = !row.product_group_operation_id && row.operation_name;

  const selectedPgo = useMemo(() => {
    if (!row.product_group_operation_id || !pgoList) return null;
    return pgoList.find(
      (item) => String(item.id) === String(row.product_group_operation_id),
    );
  }, [pgoList, row.product_group_operation_id]);

  const remainingQuantity = useMemo(() => {
    // Trường hợp có chọn công đoạn cụ thể → dùng remaining từ pgo
    if (selectedPgo) {
      const orderQty = parseFloat(selectedPgo.order_quantity) || 0;
      const totalActual = parseFloat(selectedPgo.total_actual) || 0;
      return Math.max(0, orderQty - totalActual);
    }

    // Trường hợp "Không công đoạn" (pgo_id rỗng nhưng đã chọn product) → dùng order_quantity của product
    if (
      selectedProduct &&
      isNoOperation // operation_name được set = "Không công đoạn"
    ) {
                console.log("selectedProduct Detail for", selectedProduct);
      const orderQty = selectedProduct.order_quantity || 0;
      const totalActual = selectedProduct.total_actual || 0;
      if (orderQty > 0) return Math.max(0, orderQty - totalActual);
    }

    return null;
  }, [selectedPgo, selectedProduct, isNoOperation]);

  return (
    <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_100px_110px_110px_180px_36px] gap-2 items-center">
      {/* Đơn hàng */}
      <Controller
        name={`items.${index}.order_id`}
        control={control}
        render={({ field }) => (
          <Combobox
            value={field.value}
            onChange={(v) => {
              field.onChange(v);
              // Reset mã hàng và công đoạn khi đổi đơn hàng
              setValue(`items.${index}.product_id`, "");
              setValue(`items.${index}.product_group_operation_id`, "");
              setValue(`items.${index}.operation_name`, "");
            }}
            options={orderOptions}
            placeholder="Đơn hàng"
            icon={ShoppingCart}
          />
        )}
      />

      {/* Mã hàng */}
      <Controller
        name={`items.${index}.product_id`}
        control={control}
        render={({ field }) => (
          <Combobox
            value={field.value}
            onChange={(v) => {
              field.onChange(v);
              // Reset công đoạn khi đổi mã hàng
              setValue(`items.${index}.product_group_operation_id`, "");
              setValue(`items.${index}.operation_name`, "");
            }}
            options={productOptions}
            placeholder={row.order_id ? "Mã hàng" : "Chọn đơn hàng trước"}
            disabled={!row.order_id}
            icon={Package}
          />
        )}
      />

      {/* Công đoạn */}
      <Controller
        name={`items.${index}.product_group_operation_id`}
        control={control}
        render={({ field }) => (
          <Combobox
            value={field.value || (isNoOperation ? "__no_operation__" : "")}
            onChange={(v) => {
              if (v === "__no_operation__") {
                field.onChange("");
                setValue(`items.${index}.operation_name`, "Không công đoạn");
              } else {
                field.onChange(v);
                const found = operationOptions.find(
                  (o) => String(o.id) === String(v),
                );
                if (found)
                  setValue(`items.${index}.operation_name`, found.name);
              }
            }}
            disabled={!row.product_id || isLoadingPgo}
            options={operationOptions}
            placeholder={
              !row.product_id
                ? "Chọn mã hàng trước"
                : isLoadingPgo
                  ? "Đang tải..."
                  : "Công đoạn"
            }
            icon={Settings}
          />
        )}
      />

      {/* Còn thiếu */}
      <div className="flex justify-center">
        {remainingQuantity !== null ? (
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm",
              remainingQuantity > 0
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200",
            )}
          >
            {remainingQuantity}
          </span>
        ) : (
          <span className="text-zinc-300 font-bold text-xs">-</span>
        )}
      </div>

      {/* SL kế hoạch (tùy chọn) */}
      <Controller
        name={`items.${index}.planned_quantity`}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="number"
            placeholder="SL KH"
            className="h-9 text-sm text-right"
            min={0}
          />
        )}
      />

      {/* SL thực tế */}
      <Controller
        name={`items.${index}.actual_quantity`}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="number"
            placeholder="SL TT"
            className="h-9 text-sm text-right font-bold text-blue-600 border-blue-200 focus-visible:ring-blue-500"
            min={0}
          />
        )}
      />

      {/* Ghi chú */}
      <Controller
        name={`items.${index}.notes`}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            placeholder="Ghi chú..."
            className="h-9 text-xs border-[rgb(var(--c-line-3))]"
          />
        )}
      />

      {/* Xóa */}
      <button
        type="button"
        onClick={() => remove(index)}
        className="p-1.5 rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

const formatManualTicketCode = (ticketDate, userId, ticketId) => {
  const dateKey = DateTime.fromISO(ticketDate).toFormat("yyyyMMdd");
  return `${dateKey}U${userId}#${ticketId}`;
};

const parseManualTicketCode = (code) => {
  const m = String(code)
    .trim()
    .match(/^(\d{8})U(\d+)#(\d+)$/i);
  if (!m) return null;
  const date = DateTime.fromFormat(m[1], "yyyyMMdd");
  if (!date.isValid) return null;
  return { date: date.toISODate(), userId: m[2], ticketId: m[3] };
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ProductionOutputPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Chế độ (nhập theo phiếu / nhập thủ công)
  const [isManualMode, setIsManualMode] = useState(false);

  // ── Chế độ THEO PHIẾU ────────────────────────────────────────────────────
  const [searchDate, setSearchDate] = useState(
    DateTime.now().toFormat("yyyy-MM-dd"),
  );
  const [searchTicketId, setSearchTicketId] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(null);

  const {
    data: ticket,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["daily-ticket", activeTicketId],
    queryFn: () => dailyTicketService.getById(activeTicketId),
    enabled: !!activeTicketId && !isManualMode,
    retry: false,
  });

  const {
    control: ticketControl,
    handleSubmit: ticketHandleSubmit,
    reset: ticketReset,
  } = useForm({
    defaultValues: { items: [] },
  });
  const { fields: ticketFields, replace: ticketReplace } = useFieldArray({
    control: ticketControl,
    name: "items",
  });

  React.useEffect(() => {
    if (ticket) {
      const rcvDate = DateTime.fromISO(ticket.ticket_date).toFormat(
        "yyyy-MM-dd",
      );
      if (rcvDate !== searchDate) {
        toast.error("Không tìm thấy phiếu trong ngày này!");
        setActiveTicketId(null);
        return;
      }
      if (ticket.items) {
        ticketReplace(
          ticket.items.map((item) => ({
            id: item.id,
            order_code: item.order_code || item.order_name,
            product_name: item.product_name,
            operation_name: item.operation_name || item.pgo_operation_name,
            planned_quantity: parseFloat(item.planned_quantity),
            actual_quantity: parseFloat(item.actual_quantity) || "",
            notes: item.notes || "",
          })),
        );
      }
    }
  }, [ticket, ticketReplace, searchDate]);

  const handleSearch = () => {
    if (!searchTicketId) {
      toast.warning("Vui lòng nhập mã số phiếu!");
      return;
    }
    let finalId = searchTicketId;
    let finalDate = searchDate;

    const manualParsed = parseManualTicketCode(searchTicketId);
    if (manualParsed) {
      finalDate = manualParsed.date;
      finalId = manualParsed.ticketId;
      setSearchDate(finalDate);
    } else if (searchTicketId.length >= 9 && /^\d+$/.test(searchTicketId)) {
      const datePart = searchTicketId.substring(0, 8);
      const idPart = searchTicketId.substring(8);
      const parsedDate = DateTime.fromFormat(datePart, "yyyyMMdd");
      if (parsedDate.isValid) {
        finalDate = parsedDate.toISODate();
        finalId = idPart;
        setSearchDate(finalDate);
      }
    } else if (searchTicketId.includes("_#")) {
      finalId = searchTicketId.split("_#")[1];
    } else if (searchTicketId.includes("#")) {
      finalId = searchTicketId.split("#").pop();
    }
    if (!finalDate) {
      toast.warning("Vui lòng chọn ngày sản xuất!");
      return;
    }
    setActiveTicketId(finalId);
  };

  const updateMutation = useMutation({
    mutationFn: (data) =>
      dailyTicketService.updateResults(activeTicketId, data),
    onSuccess: () => {
      toast.success("Đã cập nhật kết quả sản xuất!");
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["daily-ticket", activeTicketId]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi lưu kết quả!"),
  });

  const onTicketSubmit = (data) => {
    const payload = data.items.map((item) => ({
      id: item.id,
      actual_quantity: parseFloat(item.actual_quantity) || 0,
      notes: item.notes || null,
    }));
    updateMutation.mutate(payload);
  };

  const isCompleted = ticket?.status === "COMPLETED";

  // ── Chế độ THỦ CÔNG ──────────────────────────────────────────────────────
  const [manualDate, setManualDate] = useState(
    DateTime.now().toFormat("yyyy-MM-dd"),
  );
  const [showAllManualTickets, setShowAllManualTickets] = useState(false);
  const [editingManualTicket, setEditingManualTicket] = useState(null);
  const [manualSearchCode, setManualSearchCode] = useState("");

  const { data: allOrdersResp } = useQuery({
    queryKey: ["all-orders"],
    queryFn: () => orderService.getAll({ limit: 1000 }),
    enabled: isManualMode,
  });
  const { data: allProductsResp } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => productService.getAll({ limit: 1000 }),
    enabled: isManualMode,
  });
  const { data: allOperationsResp } = useQuery({
    queryKey: ["all-operations"],
    queryFn: () => operationService.getAll({ limit: 1000 }),
    enabled: isManualMode,
  });

  const {
    control: manualControl,
    handleSubmit: manualHandleSubmit,
    watch: manualWatch,
    setValue: manualSetValue,
    reset: manualReset,
  } = useForm({
    defaultValues: { items: [] },
  });
  const {
    fields: manualFields,
    append: manualAppend,
    remove: manualRemove,
  } = useFieldArray({ control: manualControl, name: "items" });
  const manualWatchItems = manualWatch("items");

  const { data: manualTicketsResp, isLoading: manualTicketsLoading } = useQuery(
    {
      queryKey: ["manual-tickets", manualDate, showAllManualTickets, user?.id],
      queryFn: () => {
        const params = {
          startDate: manualDate,
          endDate: manualDate,
          is_manual: true,
          limit: 200,
          page: 1,
        };
        if (!showAllManualTickets && user?.id) params.created_by = user.id;
        return dailyTicketService.getAll(params);
      },
      enabled: isManualMode && !!manualDate,
    },
  );

  const manualTickets = manualTicketsResp?.data || [];

  const loadManualTicketForEdit = async (ticketMeta) => {
    try {
      const full = await dailyTicketService.getById(ticketMeta.id);
      setEditingManualTicket(full);
      setManualDate(DateTime.fromISO(full.ticket_date).toFormat("yyyy-MM-dd"));
      manualReset({
        items: (full.items || []).map((item) => ({
          id: item.id,
          order_id: item.order_id ? String(item.order_id) : "",
          product_id: item.product_id ? String(item.product_id) : "",
          product_group_operation_id: item.product_group_operation_id
            ? String(item.product_group_operation_id)
            : "",
          operation_name: item.operation_name || item.pgo_operation_name || "",
          planned_quantity: parseFloat(item.planned_quantity) || "",
          actual_quantity: parseFloat(item.actual_quantity) || "",
          notes: item.notes || "",
        })),
      });
      toast.success(
        `Đã mở phiếu ${formatManualTicketCode(full.ticket_date, full.created_by, full.id)}`,
      );
    } catch (e) {
      toast.error("Không tải được phiếu!");
    }
  };

  const handleManualCodeSearch = () => {
    const parsed = parseManualTicketCode(manualSearchCode);
    if (!parsed) {
      toast.warning("Mã phiếu thủ công: yyyyMMddU{userId}#{ticketId}");
      return;
    }
    setManualDate(parsed.date);
    loadManualTicketForEdit({ id: parsed.ticketId });
  };

  const manualOutputMutation = useMutation({
    mutationFn: (data) => dailyTicketService.manualOutput(data),
    onSuccess: (res) => {
      const code = res.display_code || `#${res.ticket_id}`;
      toast.success(`Đã ghi nhận! Mã phiếu: ${code}`);
      if (!editingManualTicket) manualReset({ items: [] });
      setEditingManualTicket(null);
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["manual-tickets"]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi ghi nhận sản lượng!"),
  });

  const manualUpdateMutation = useMutation({
    mutationFn: ({ ticketId, items }) =>
      dailyTicketService.updateResults(ticketId, items),
    onSuccess: () => {
      toast.success("Đã cập nhật phiếu thủ công!");
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["manual-tickets"]);
      if (editingManualTicket?.id)
        loadManualTicketForEdit({ id: editingManualTicket.id });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật!"),
  });

  const mapManualItemPayload = (i) => ({
    order_id: i.order_id || null,
    product_id: i.product_id || null,
    product_group_operation_id: i.product_group_operation_id || null,
    operation_name: i.operation_name || null,
    planned_quantity: parseFloat(i.planned_quantity) || 0,
    actual_quantity: parseFloat(i.actual_quantity) || 0,
    notes: i.notes || null,
  });

  const onManualSubmit = async (data) => {
    if (data.items.length === 0) {
      toast.warning("Vui lòng thêm ít nhất một dòng!");
      return;
    }

    const existingRows = data.items.filter((i) => i.id);
    const newRows = data.items.filter((i) => !i.id);

    if (editingManualTicket?.id && existingRows.length > 0) {
      await manualUpdateMutation.mutateAsync({
        ticketId: editingManualTicket.id,
        items: existingRows.map((i) => ({
          id: i.id,
          actual_quantity: parseFloat(i.actual_quantity) || 0,
          notes: i.notes || null,
        })),
      });
    }

    if (newRows.length > 0) {
      manualOutputMutation.mutate({
        ticket_date: manualDate,
        items: newRows.map(mapManualItemPayload),
        ...(editingManualTicket?.id
          ? { target_ticket_id: editingManualTicket.id }
          : {}),
      });
    } else if (editingManualTicket?.id && existingRows.length > 0) {
      setEditingManualTicket(null);
      manualReset({ items: [] });
    } else if (!editingManualTicket) {
      manualOutputMutation.mutate({
        ticket_date: manualDate,
        items: data.items.map(mapManualItemPayload),
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(var(--c-ink))", letterSpacing: "-0.01em" }}>
            Nhập Sản Lượng
          </h2>
          <p style={{ fontSize: 11, color: "rgb(var(--c-ink-4))", marginTop: 2 }}>
            Kết quả kiểm tra và báo cáo sản xuất hàng ngày
          </p>
        </div>
        {/* Modern Tab Bar - Segmented UI */}
        <div
          className={cn(
            "relative h-11 w-full max-w-[360px] p-1 bg-[rgb(var(--c-s2))]/80 border border-[rgb(var(--c-line-2))]/50 rounded-full flex items-center cursor-pointer select-none transition-all duration-300",
          )}
          onClick={() => {
            const newVal = !isManualMode;
            setIsManualMode(newVal);
            setActiveTicketId(null);
            ticketReset({ items: [] });
            manualReset({ items: [] });
          }}
        >
          {/* Active Tab Background Pill */}
          <div
            className={cn(
              "absolute h-9 w-[calc(50%-4px)] rounded-full shadow-sm border border-[rgb(var(--c-line-2))]/50 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-0",
              isManualMode ? "translate-x-[calc(100%+4px)]" : "translate-x-0",
            )}
          />

          {/* Tab 1: Theo phiếu */}
          <div
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 z-10 transition-all duration-300",
              !isManualMode
                ? "text-indigo-600 font-bold"
                : "text-[rgb(var(--c-ink-3))] font-medium",
            )}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wide">
              Theo phiếu
            </span>
          </div>

          {/* Tab 2: Nhập thủ công */}
          <div
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 z-10 transition-all duration-300",
              isManualMode
                ? "text-indigo-600 font-bold"
                : "text-[rgb(var(--c-ink-3))] font-medium",
            )}
          >
            <Pencil className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wide">
              Nhập thủ công
            </span>
          </div>
        </div>
      </div>

      {/* ── CHẾ ĐỘ THEO PHIẾU ── */}
      {!isManualMode && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-end gap-4">
                <div className="w-full md:w-1/4 space-y-2">
                  <Label>Ngày sản xuất</Label>
                  <PremiumDatePicker
                    date={searchDate}
                    onSelect={(val) => setSearchDate(val)}
                    placeholder="Chọn ngày sản xuất"
                  />
                </div>
                <div className="w-full md:w-1/4 space-y-2">
                  <Label htmlFor="ticketId">Mã số phiếu</Label>
                  <Input
                    id="ticketId"
                    placeholder="VD: 202603268"
                    value={searchTicketId}
                    onChange={(e) => setSearchTicketId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                  />
                </div>
                <div className="w-full md:w-auto">
                  <Button
                    onClick={handleSearch}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 font-semibold"
                  >
                    {isLoading ? "Đang tìm..." : "Tìm Kiếm"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center text-red-600 font-semibold">
                Không tìm thấy dữ liệu hoặc có lỗi xảy ra! {error?.message}
              </CardContent>
            </Card>
          )}

          {!isLoading &&
            !isError &&
            ticket &&
            DateTime.fromISO(ticket.ticket_date).toFormat("yyyy-MM-dd") ===
              searchDate && (
              <Card className="overflow-hidden">
                <div className="p-6 border-b border-[rgb(var(--c-line-2))]/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-[rgb(var(--c-ink))]">
                      Phiếu Sản Xuất{" "}
                      {DateTime.fromISO(ticket.ticket_date).toFormat(
                        "yyyyMMdd",
                      )}
                      {ticket.id}
                    </h3>
                    <p className="text-sm text-[rgb(var(--c-ink-3))] font-medium">
                      Người lập: {ticket.creator_name}
                    </p>
                  </div>
                  <Badge
                    variant={isCompleted ? "default" : "secondary"}
                    className={
                      isCompleted
                        ? "bg-green-600 hover:bg-green-700 font-bold"
                        : "bg-orange-100 text-orange-800 hover:bg-orange-200 font-bold"
                    }
                  >
                    {isCompleted
                      ? user?.role === "ADMIN"
                        ? "Đã chốt (Admin có thể sửa)"
                        : "Đã chốt (Không thể sửa)"
                      : "Đang thực hiện"}
                  </Badge>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-[rgb(var(--c-s2))] hover:bg-[rgb(var(--c-s2))]">
                      <TableHead className="w-[80px]">STT</TableHead>
                      <TableHead>Đơn hàng</TableHead>
                      <TableHead>Mã hàng</TableHead>
                      <TableHead>Công đoạn</TableHead>
                      <TableHead className="text-right">SL Kế Hoạch</TableHead>
                      <TableHead className="text-right w-[180px]">
                        SL Thực Tế
                      </TableHead>
                      <TableHead className="w-[200px]">Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketFields.map((field, index) => (
                      <TableRow key={field.id} className="cursor-default">
                        <TableCell className="font-medium text-[rgb(var(--c-ink-3))]">
                          {index + 1}
                        </TableCell>
                        <TableCell>{field.order_code || "N/A"}</TableCell>
                        <TableCell>{field.product_name || "N/A"}</TableCell>
                        <TableCell className="font-semibold text-[rgb(var(--c-ink-2))]">
                          {field.operation_name}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[rgb(var(--c-ink))]">
                          {field.planned_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Controller
                            name={`items.${index}.actual_quantity`}
                            control={ticketControl}
                            render={({ field: inputField }) => (
                              <Input
                                {...inputField}
                                type="number"
                                disabled={
                                  (isCompleted && user?.role !== "ADMIN") ||
                                  updateMutation.isPending
                                }
                                className={`text-right font-bold w-full ${!(isCompleted && user?.role !== "ADMIN") ? "text-blue-600 focus-visible:ring-blue-500 border-[rgb(var(--c-line-3))]" : ""}`}
                                min={0}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.notes`}
                            control={ticketControl}
                            render={({ field: inputField }) => (
                              <Input
                                {...inputField}
                                placeholder="Ghi chú nếu có..."
                                disabled={
                                  (isCompleted && user?.role !== "ADMIN") ||
                                  updateMutation.isPending
                                }
                                className="text-xs h-9 border-[rgb(var(--c-line-3))]"
                              />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {ticketFields.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-[rgb(var(--c-ink-3))] font-medium"
                        >
                          Không có sản phẩm nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <CardFooter className="p-6/50 border-t border-[rgb(var(--c-line-2))] justify-end">
                  <Button
                    size="lg"
                    onClick={ticketHandleSubmit(onTicketSubmit)}
                    disabled={
                      (isCompleted && user?.role !== "ADMIN") ||
                      updateMutation.isPending ||
                      ticketFields.length === 0
                    }
                    className="px-8 font-bold"
                  >
                    {updateMutation.isPending
                      ? "Đang lưu..."
                      : "Ghi Nhận Sản Lượng"}
                  </Button>
                </CardFooter>
              </Card>
            )}
        </>
      )}

      {/* ── CHẾ ĐỘ THỦ CÔNG ── */}
      {isManualMode && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-indigo-100 bg-indigo-50/40">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5" />
                <h3 className="font-black text-indigo-900 text-sm uppercase tracking-wider">
                  Nhập sản lượng từ đơn hàng / mã hàng
                </h3>
              </div>
              <p className="text-xs text-indigo-500 font-medium md:ml-2">
                Mỗi lần ghi nhận tạo một phiếu mới. Mã phiếu:{" "}
                <span className="font-mono">
                  yyyyMMddU{"{userId}"}#{"{id}"}
                </span>
              </p>
              <div className="md:ml-auto w-full md:w-52 space-y-1">
                <Label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Ngày sản xuất
                </Label>
                <PremiumDatePicker
                  date={manualDate}
                  onSelect={(val) => setManualDate(val)}
                  placeholder="Chọn ngày"
                />
              </div>
            </div>
          </div>

          {/* <div className="p-6 space-y-4 border-b border-indigo-100/60">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-3))]">Tìm mã phiếu thủ công</Label>
                <Input
                  placeholder="VD: 20260522U5#123"
                  value={manualSearchCode}
                  onChange={(e) => setManualSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualCodeSearch()}
                />
              </div>
              <Button variant="outline" onClick={handleManualCodeSearch} className="font-bold">Mở phiếu</Button>
              <div className="flex items-center gap-2 pb-1">
                <Switch checked={showAllManualTickets} onCheckedChange={setShowAllManualTickets} id="show-all-manual" />
                <Label htmlFor="show-all-manual" className="text-xs font-bold cursor-pointer">Xem phiếu mọi user</Label>
              </div>
            </div>

            {editingManualTicket && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold text-amber-900">
                  Đang sửa phiếu{" "}
                  <span className="font-mono">
                    {formatManualTicketCode(editingManualTicket.ticket_date, editingManualTicket.created_by, editingManualTicket.id)}
                  </span>
                  {" "}— {editingManualTicket.creator_name}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-800 font-bold"
                  onClick={() => { setEditingManualTicket(null); manualReset({ items: [] }); }}
                >
                  Hủy / Nhập mới
                </Button>
              </div>
            )}

            <div className="rounded-xl border border-[rgb(var(--c-line-2))] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[rgb(var(--c-s2))]">
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Người nhập</TableHead>
                    <TableHead className="text-right">SL TT</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualTicketsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-[rgb(var(--c-ink-4))]">Đang tải...</TableCell></TableRow>
                  ) : manualTickets.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-[rgb(var(--c-ink-4))]">Chưa có phiếu thủ công trong ngày này</TableCell></TableRow>
                  ) : manualTickets.map((t) => (
                    <TableRow key={t.id} className={editingManualTicket?.id === t.id ? "bg-indigo-50" : ""}>
                      <TableCell className="font-mono text-xs font-bold text-indigo-700">
                        {formatManualTicketCode(t.ticket_date, t.created_by, t.id)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{t.creator_name}</TableCell>
                      <TableCell className="text-right font-bold">{parseFloat(t.actual_quantity) || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">{t.ticket_status || t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => loadManualTicketForEdit(t)}>
                          Sửa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div> */}

          <div className="p-6 space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_100px_110px_110px_180px_36px] gap-2 px-0 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--c-ink-4))]">
                Đơn hàng
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--c-ink-4))]">
                Mã hàng
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--c-ink-4))]">
                Công đoạn
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 text-center font-black">
                Còn thiếu
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--c-ink-4))] text-right">
                SL Kế Hoạch
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 text-right">
                SL Thực Tế
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--c-ink-4))]">
                Ghi chú
              </p>
              <div />
            </div>

            <Separator />

            <div className="space-y-2">
              {manualFields.map((field, index) => (
                <ManualRow
                  key={field.id}
                  index={index}
                  control={manualControl}
                  setValue={manualSetValue}
                  remove={manualRemove}
                  watchItems={manualWatchItems}
                  allOrders={allOrdersResp?.data}
                  allProducts={allProductsResp?.data}
                  allOperations={allOperationsResp?.data}
                />
              ))}
              {manualFields.length === 0 && (
                <div className="h-20 flex items-center justify-center text-[rgb(var(--c-ink-4))] text-sm font-medium border-2 border-dashed border-[rgb(var(--c-line-2))] rounded-xl">
                  Chưa có dòng nào — nhấn "+ Thêm dòng" để bắt đầu
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 mt-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() =>
                manualAppend({
                  order_id: "",
                  product_id: "",
                  product_group_operation_id: "",
                  operation_name: "",
                  planned_quantity: "",
                  actual_quantity: "",
                  notes: "",
                })
              }
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng
            </Button>
          </div>

          <CardFooter className="p-6 bg-indigo-50/30 border-t border-indigo-100 justify-between items-center">
            <p className="text-xs text-[rgb(var(--c-ink-3))] font-medium">
              Phiếu của{" "}
              <span className="font-black text-indigo-700">
                {user?.username}
              </span>{" "}
              — ngày{" "}
              <span className="font-black text-indigo-700">
                {DateTime.fromISO(manualDate).toFormat("dd/MM/yyyy")}
              </span>
            </p>
            <Button
              size="lg"
              onClick={manualHandleSubmit(onManualSubmit)}
              disabled={
                manualOutputMutation.isPending ||
                manualUpdateMutation.isPending ||
                manualFields.length === 0
              }
              className="px-8 font-bold bg-indigo-600 hover:bg-indigo-700"
            >
              {manualOutputMutation.isPending || manualUpdateMutation.isPending
                ? "Đang lưu..."
                : editingManualTicket
                  ? "Cập nhật phiếu"
                  : "Ghi Nhận Sản Lượng"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
