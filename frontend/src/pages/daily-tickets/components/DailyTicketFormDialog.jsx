import React, { useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../../services/daily-ticket.service";
import { planningService } from "../../../services/planning.service";
import { productGroupService } from "../../../services/product-group.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Loader2, Check, ChevronsUpDown, Package, Settings, ShoppingCart, FileSpreadsheet, User, Lock, Pencil } from "lucide-react";
import { PremiumDatePicker } from "../../../components/PremiumDatePicker";
import { orderService } from "../../../services/order.service";
import { cn } from "@/lib/utils";
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

const TicketRow = ({ index, control, setValue, remove, plans, isCompleted, watchItems, isManualMode, manualOrders }) => {
  const selectedOrderId = watchItems[index]?.order_id;
  const selectedProductId = watchItems[index]?.product_id;

  const productGroupId = useMemo(() => {
    if (!isManualMode || !manualOrders || !selectedOrderId || !selectedProductId) return null;
    const order = manualOrders.find(o => String(o.id) === String(selectedOrderId));
    const product = order?.products?.find(p => String(p.id) === String(selectedProductId));
    return product?.product_group_id;
  }, [isManualMode, manualOrders, selectedOrderId, selectedProductId]);

  const { data: manualOpsData } = useQuery({
    queryKey: ["orderOps", productGroupId, selectedOrderId, selectedProductId],
    queryFn: () => productGroupService.getOperations(productGroupId, { orderId: selectedOrderId, productId: selectedProductId }),
    enabled: !!productGroupId && isManualMode,
  });

  const availableProducts = useMemo(() => {
    const map = new Map();
    if (isManualMode && manualOrders) {
      const order = manualOrders.find(o => String(o.id) === String(selectedOrderId));
      if (order && order.products) {
        order.products.forEach(p => { map.set(p.id, { id: p.id, name: p.name }); });
      }
      const self = watchItems[index];
      if (self?.product_id && self?.product_name && !map.has(self.product_id)) {
        map.set(self.product_id, { id: self.product_id, name: self.product_name });
      }
      return Array.from(map.values());
    }
    if (selectedOrderId && plans) {
      plans.filter(p => String(p.order_id) === String(selectedOrderId))
        .forEach(p => { if (p.product_id) map.set(p.product_id, { id: p.product_id, name: p.product_name }); });
    }
    const self = watchItems[index];
    if (self?.product_id && self?.product_name && !map.has(self.product_id)) {
      map.set(self.product_id, { id: self.product_id, name: self.product_name });
    }
    return Array.from(map.values());
  }, [selectedOrderId, plans, watchItems, index, isManualMode, manualOrders]);

  const availableOperations = useMemo(() => {
    const map = new Map();
    if (isManualMode) {
      if (manualOpsData) {
        manualOpsData.forEach(o => { if (!map.has(o.id)) map.set(o.id, { id: o.id, name: o.operation_name }); });
      }
      const self = watchItems[index];
      if (self?.product_group_operation_id && self?.operation_name && !map.has(self.product_group_operation_id)) {
        map.set(self.product_group_operation_id, { id: self.product_group_operation_id, name: self.operation_name });
      }
      return Array.from(map.values());
    }
    if (!selectedProductId || !plans) return [];
    const ops = plans
      .filter(p => String(p.order_id) === String(selectedOrderId) && String(p.product_id) === String(selectedProductId))
      .map(p => ({ id: p.product_group_operation_id || `null-${p.id}`, name: p.operation_name || "N/A (CĐ Tổng)", plan: p }));
    const self = watchItems[index];
    if (self?.product_group_operation_id && self?.operation_name && !ops.find(o => String(o.id) === String(self.product_group_operation_id))) {
      ops.push({ id: self.product_group_operation_id, name: self.operation_name });
    }
    return ops;
  }, [selectedOrderId, selectedProductId, plans, watchItems, index, isManualMode, manualOpsData]);

  const uniqueOrders = useMemo(() => {
    const map = new Map();
    if (isManualMode && manualOrders) {
      manualOrders.forEach(o => {
        if (!map.has(o.id)) map.set(o.id, { id: o.id, name: o.order_code || o.name || `#${o.id}` });
      });
      const self = watchItems[index];
      if (self?.order_id && self?.order_name && !map.has(self.order_id)) {
        map.set(self.order_id, { id: self.order_id, name: self.order_name });
      }
      return Array.from(map.values());
    }
    plans?.forEach(p => {
      if (!map.has(p.order_id)) map.set(p.order_id, { id: p.order_id, name: p.order_name || p.order_code || `#${p.order_id}` });
    });
    const self = watchItems[index];
    if (self?.order_id && self?.order_name && !map.has(self.order_id)) {
      map.set(self.order_id, { id: self.order_id, name: self.order_name });
    }
    return Array.from(map.values());
  }, [plans, watchItems, index, isManualMode, manualOrders]);

  const comboboxBtn = (icon, label, isSet, disabled) => (
    <Button variant="outline" role="combobox" disabled={disabled}
      className="w-full h-9 justify-between text-xs font-semibold bg-zinc-50 border-zinc-200 hover:bg-white hover:border-indigo-300 transition-all disabled:opacity-50 overflow-hidden px-2.5">
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        {React.cloneElement(icon, { className: cn("h-3 w-3 shrink-0", isSet ? "text-indigo-500" : "text-zinc-300") })}
        <span className="truncate text-left">{label}</span>
      </div>
      <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40 ml-1" />
    </Button>
  );

  return (
    <div className="group relative bg-white rounded-xl border border-zinc-100 hover:border-indigo-200 hover:shadow-sm transition-all p-3 pl-8">
      <span className="absolute left-2 top-3.5 text-[10px] font-black text-zinc-300 group-hover:text-indigo-400 tabular-nums transition-colors select-none">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="space-y-2">
        {/* Hàng 1: Đơn hàng | Sản phẩm | Công đoạn | SL KH | Xóa */}
        <div className="flex items-center gap-2">

          <div className="min-w-0 flex-[2]">
            <Controller name={`items.${index}.order_id`} control={control} render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  {comboboxBtn(<ShoppingCart />, uniqueOrders.find(o => String(o.id) === String(field.value))?.name || "Đơn hàng", !!field.value, isCompleted)}
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0 shadow-2xl rounded-xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm đơn hàng..." className="h-9" />
                    <CommandList className="max-h-[260px] p-1">
                      <CommandEmpty className="py-5 text-center text-[10px] font-bold text-zinc-400">Không tìm thấy</CommandEmpty>
                      <CommandGroup>
                        {uniqueOrders.map(o => (
                          <CommandItem key={o.id} value={o.name}
                            onSelect={() => {
                              field.onChange(String(o.id));
                              setValue(`items.${index}.product_id`, "");
                              setValue(`items.${index}.product_group_operation_id`, "");
                              setValue(`items.${index}.planned_quantity`, "");
                            }}
                            className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-0.5">
                            <span className="text-xs font-semibold">{o.name}</span>
                            <Check className={cn("ml-auto h-3 w-3 shrink-0 text-indigo-600", String(field.value) === String(o.id) ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )} />
          </div>

          <div className="min-w-0 flex-[1.5]">
            <Controller name={`items.${index}.product_id`} control={control} render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  {comboboxBtn(<Package />, availableProducts.find(p => String(p.id) === String(field.value))?.name || "Sản phẩm", !!field.value, !selectedOrderId || isCompleted)}
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 shadow-2xl rounded-xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm mã hàng..." className="h-9" />
                    <CommandList className="max-h-[260px] p-1">
                      <CommandEmpty className="py-5 text-center text-[10px] font-bold text-zinc-400">Không tìm thấy</CommandEmpty>
                      <CommandGroup>
                        {availableProducts.map(p => (
                          <CommandItem key={p.id} value={p.name}
                            onSelect={() => {
                              field.onChange(String(p.id));
                              setValue(`items.${index}.product_group_operation_id`, "");
                              setValue(`items.${index}.planned_quantity`, "");
                            }}
                            className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-0.5">
                            <span className="text-xs font-semibold">{p.name}</span>
                            <Check className={cn("ml-auto h-3 w-3 shrink-0 text-indigo-600", String(field.value) === String(p.id) ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )} />
          </div>

          <div className="min-w-0 flex-[1.5]">
            <Controller name={`items.${index}.product_group_operation_id`} control={control} render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  {comboboxBtn(<Settings />, availableOperations.find(o => String(o.id) === String(field.value))?.name || "Công đoạn", !!field.value, !selectedProductId || isCompleted)}
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 shadow-2xl rounded-xl overflow-hidden" align="start">
                  <Command>
                    <CommandInput placeholder="Tìm công đoạn..." className="h-9" />
                    <CommandList className="max-h-[260px] p-1">
                      <CommandEmpty className="py-5 text-center text-[10px] font-bold text-zinc-400">Không tìm thấy</CommandEmpty>
                      <CommandGroup>
                        {availableOperations.map(op => (
                          <CommandItem key={op.id} value={op.name}
                            onSelect={() => {
                              field.onChange(String(op.id));
                              const found = availableOperations.find(o => String(o.id) === String(op.id));
                              if (found) setValue(`items.${index}.operation_name`, found.name);
                            }}
                            className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-0.5">
                            <span className="text-xs font-semibold">{op.name}</span>
                            <Check className={cn("ml-auto h-3 w-3 shrink-0 text-indigo-600", String(field.value) === String(op.id) ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )} />
          </div>

          <div className="w-[80px] shrink-0">
            <Controller name={`items.${index}.planned_quantity`} control={control} render={({ field }) => (
              <Input {...field} type="number" placeholder="SL"
                className="h-9 text-sm font-black text-right tabular-nums bg-zinc-50 border-zinc-200 focus:bg-white px-2"
                disabled={isCompleted} />
            )} />
          </div>

          <button type="button" onClick={() => !isCompleted && remove(index)} disabled={isCompleted}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-200 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hàng 2: Ghi chú */}
        <Controller name={`items.${index}.notes`} control={control} render={({ field }) => (
          <Input {...field} placeholder="Ghi chú..." value={field.value || ''}
            className="h-8 text-xs bg-zinc-50/70 border-zinc-100 focus:bg-white text-zinc-500 placeholder:text-zinc-300"
            disabled={isCompleted} />
        )} />
      </div>
    </div>
  );
};

export default function DailyTicketFormDialog({ open, ticketId, onClose }) {
  const queryClient = useQueryClient();
  const { control, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: { ticket_date: DateTime.local().toISODate(), is_manual: false, items: [] },
  });

  const { data: ticket } = useQuery({
    queryKey: ["daily-ticket", ticketId],
    queryFn: () => dailyTicketService.getById(ticketId),
    enabled: !!ticketId && open,
  });
  const isCompleted = ticket?.status === "COMPLETED";

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const ticketDate = watch("ticket_date");
  const watchItems = watch("items");
  const watchIsManual = watch("is_manual");

  const { data: plansData } = useQuery({
    queryKey: ["plans-by-date", ticketDate],
    queryFn: () => planningService.getAll({ working_date: ticketDate, limit: 100 }),
    enabled: !!ticketDate && open && !watchIsManual,
  });
  const plans = plansData?.data || [];

  const { data: manualOrdersResp } = useQuery({
    queryKey: ["all-orders"],
    queryFn: () => orderService.getAll({ limit: 1000 }),
    enabled: watchIsManual && open,
  });

  useEffect(() => {
    if (!open) { reset({ ticket_date: DateTime.local().toISODate(), is_manual: false, items: [] }); return; }
    if (ticketId && ticket) {
      reset({
        ticket_date: DateTime.fromISO(ticket.ticket_date).toISODate(),
        is_manual: ticket.is_manual || false,
        items: ticket.items?.map(item => ({
          order_id: item.order_id || "",
          order_name: item.order_name || item.order_code || "",
          product_id: item.product_id || "",
          product_name: item.product_name || "",
          product_group_operation_id: item.product_group_operation_id || "",
          operation_name: item.operation_name || item.pgo_operation_name || "",
          planned_quantity: item.planned_quantity ? parseFloat(item.planned_quantity) : "",
          notes: item.notes || "",
        })) || [],
      });
    } else if (!ticketId) {
      reset({ ticket_date: DateTime.local().toISODate(), is_manual: false, items: [] });
    }
  }, [open, ticket, ticketId, reset]);

  const createMutation = useMutation({
    mutationFn: dailyTicketService.create,
    onSuccess: () => { toast.success("Đã tạo phiếu sản xuất!"); queryClient.invalidateQueries(["daily-tickets"]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi tạo phiếu!"),
  });
  const updateMutation = useMutation({
    mutationFn: (data) => dailyTicketService.update(ticketId, data),
    onSuccess: () => { toast.success("Đã cập nhật phiếu!"); queryClient.invalidateQueries(["daily-tickets"]); queryClient.invalidateQueries(["daily-ticket", ticketId]); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi cập nhật!"),
  });

  const onSubmit = (data) => {
    if (data.items.length === 0) { toast.warning("Vui lòng thêm ít nhất một công đoạn!"); return; }
    if (ticketId) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] w-[1000px] max-h-[92vh] flex flex-col p-0 border-zinc-200 shadow-2xl">

        {/* ── HEADER ── */}
        <DialogHeader className="px-6 py-4 bg-white border-b border-zinc-200 shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl text-white shadow-md", isCompleted ? "bg-zinc-400" : "bg-indigo-600 shadow-indigo-200")}>
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black tracking-tight text-zinc-950">
                  {ticketId ? `Phiếu sản xuất #${ticketId}` : "Tạo Phiếu Sản Xuất Hàng Ngày"}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" /> Đã chốt
                    </span>
                  )}
                  {ticket?.machine_name && (
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {ticket.machine_name}
                    </span>
                  )}
                  {ticket?.creator_name && (
                    <span className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                      <User className="w-3 h-3" />{ticket.creator_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isCompleted && (
                <Controller name="is_manual" control={control} render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5">
                    <Pencil className="w-3 h-3 text-zinc-400" />
                    <span className="text-[11px] font-bold text-zinc-500">Thủ công</span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-indigo-600 h-4 w-7" />
                  </label>
                )} />
              )}
              <Button variant="ghost" onClick={onClose}
                className="font-bold text-zinc-500 hover:text-zinc-950 px-4 h-9">
                Hủy
              </Button>
              {!isCompleted ? (
                <Button onClick={handleSubmit(onSubmit)} disabled={isPending}
                  className="font-bold px-7 h-9 min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200">
                  {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : (ticketId ? "Cập nhật" : "Tạo phiếu")}
                </Button>
              ) : (
                <Button onClick={onClose} className="font-bold px-6 h-9 bg-zinc-900 hover:bg-zinc-800 text-white">
                  Đóng
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto bg-zinc-50/30">
          {/* Date + context bar */}
          <div className="px-6 py-4 bg-white border-b border-zinc-100 flex items-center gap-6 flex-wrap">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ngày sản xuất</Label>
              <Controller name="ticket_date" control={control} render={({ field }) => (
                <PremiumDatePicker date={field.value} onSelect={field.onChange} disabled={isCompleted} />
              )} />
            </div>

            {watchIsManual && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
                <Pencil className="w-3.5 h-3.5 shrink-0" />
                Chế độ thủ công — chọn đơn từ toàn bộ hệ thống
              </div>
            )}
            {!watchIsManual && plans.length > 0 && (
              <div className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-3 py-1.5 rounded-lg">
                {plans.length} công đoạn theo kế hoạch
              </div>
            )}
            {!watchIsManual && ticketDate && plans.length === 0 && (
              <div className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg">
                Không có kế hoạch cho ngày này
              </div>
            )}
          </div>

          {/* Items list */}
          <div className="p-6 space-y-2">
            {/* Column headers */}
            <div className="flex items-center gap-2 pl-8 pr-3 mb-1">
              <span className="min-w-0 flex-[2] text-[10px] font-black uppercase tracking-wider text-zinc-400">Đơn hàng</span>
              <span className="min-w-0 flex-[1.5] text-[10px] font-black uppercase tracking-wider text-zinc-400">Sản phẩm</span>
              <span className="min-w-0 flex-[1.5] text-[10px] font-black uppercase tracking-wider text-zinc-400">Công đoạn</span>
              <span className="w-[80px] shrink-0 text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right">SL KH</span>
              <div className="w-7 shrink-0" />
            </div>

            {fields.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-2xl bg-white">
                <FileSpreadsheet className="w-10 h-10 text-zinc-200 mb-3" />
                <p className="text-sm font-bold text-zinc-400">Chưa có công việc nào</p>
                <p className="text-xs text-zinc-300 mt-1">Nhấn nút bên dưới để thêm</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {fields.map((field, index) => (
                  <TicketRow key={field.id} index={index} control={control} setValue={setValue}
                    remove={remove} plans={plans} isCompleted={isCompleted} watchItems={watchItems}
                    isManualMode={watchIsManual} manualOrders={manualOrdersResp?.data} />
                ))}
              </div>
            )}

            {!isCompleted && (
              <button
                type="button"
                onClick={() => append({ order_id: "", product_id: "", product_group_operation_id: "", operation_name: "", planned_quantity: "", notes: "" })}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-700 py-2 px-4 rounded-xl hover:bg-indigo-50 transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm công việc
              </button>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
