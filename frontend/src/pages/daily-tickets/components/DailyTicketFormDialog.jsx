import React, { useEffect, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../../services/daily-ticket.service";
import { planningService } from "../../../services/planning.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Loader2, Calendar as CalendarIcon, Check, ChevronsUpDown, Package, Settings, ShoppingCart } from "lucide-react";
import { PremiumDatePicker } from "../../../components/PremiumDatePicker";
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

const TicketRow = ({ index, control, setValue, remove, plans, isCompleted, watchItems }) => {
  const selectedOrderId = watchItems[index]?.order_id;
  const selectedProductId = watchItems[index]?.product_id;

  const availableProducts = useMemo(() => {
    const map = new Map();
    // From plans
    if (selectedOrderId && plans) {
      plans
        .filter(p => String(p.order_id) === String(selectedOrderId))
        .forEach(p => {
          if (p.product_id) map.set(p.product_id, { id: p.product_id, name: p.product_name });
        });
    }
    // From backup
    const self = watchItems[index];
    if (self?.product_id && self?.product_name && !map.has(self.product_id)) {
      map.set(self.product_id, { id: self.product_id, name: self.product_name });
    }
    return Array.from(map.values());
  }, [selectedOrderId, plans, watchItems, index]);

  const availableOperations = useMemo(() => {
    if (!selectedProductId || !plans) return [];
    const ops = plans
      .filter(p => String(p.order_id) === String(selectedOrderId) && String(p.product_id) === String(selectedProductId))
      .map(p => ({ id: p.product_group_operation_id || `null-${p.id}`, name: p.operation_name || "N/A (CĐ Tổng)", plan: p }));

    // Backup for the currently selected operation name if not in plans
    const self = watchItems[index];
    if (self?.product_group_operation_id && self?.operation_name && !ops.find(o => String(o.id) === String(self.product_group_operation_id))) {
      ops.push({ id: self.product_group_operation_id, name: self.operation_name });
    }
    return ops;
  }, [selectedOrderId, selectedProductId, plans, watchItems, index]);

  // Derive order name from plans OR from the current form item (for backup during loading/editing)
  const uniqueOrders = useMemo(() => {
    const map = new Map();
    // 1. Add from plans (the live pool)
    plans?.forEach(p => {
      if (!map.has(p.order_id)) {
        map.set(p.order_id, { id: p.order_id, name: p.order_name || p.order_code || `#${p.order_id}` });
      }
    });
    // 2. Add from current row state (backup if plans list is building/mismatched)
    const self = watchItems[index];
    if (self?.order_id && self?.order_name && !map.has(self.order_id)) {
      map.set(self.order_id, { id: self.order_id, name: self.order_name });
    }
    return Array.from(map.values());
  }, [plans, watchItems, index]);

  return (
    <div className="grid grid-cols-[1.2fr_1.2fr_1fr_100px_36px] gap-2 items-center">
      {/* Order */}
      <Controller name={`items.${index}.order_id`} control={control} render={({ field }) => (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={isCompleted}
              className="w-full h-9 justify-between text-xs font-bold bg-white border-zinc-200"
            >
              <div className="flex items-center gap-1.5 truncate">
                <ShoppingCart className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">
                  {uniqueOrders.find(o => String(o.id) === String(field.value))?.name || "Đơn hàng"}
                </span>
              </div>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
              <Command className="w-full">
                  <CommandInput placeholder="Tìm đơn hàng..." />
                  <CommandList className="max-h-[300px] p-1">
                      <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400">Không thấy</CommandEmpty>
                      <CommandGroup>
                        {uniqueOrders.map(o => (
                            <CommandItem
                                key={o.id}
                                value={o.name}
                                onSelect={() => {
                                    field.onChange(String(o.id));
                                    setValue(`items.${index}.product_id`, "");
                                    setValue(`items.${index}.product_group_operation_id`, "");
                                    setValue(`items.${index}.planned_quantity`, "");
                                }}
                                className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-1"
                            >
                                <span className="text-xs font-bold">{o.name}</span>
                                <Check className={cn("ml-auto h-3 w-3 text-indigo-600", String(field.value) === String(o.id) ? "opacity-100" : "opacity-0")} />
                            </CommandItem>
                        ))}
                      </CommandGroup>
                  </CommandList>
              </Command>
          </PopoverContent>
        </Popover>
      )} />

      {/* Product */}
      <Controller name={`items.${index}.product_id`} control={control} render={({ field }) => (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={!selectedOrderId || isCompleted}
                    className="w-full h-9 justify-between text-xs font-bold bg-white border-zinc-200"
                >
                   <div className="flex items-center gap-1.5 truncate">
                        <Package className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">
                            {availableProducts.find(p => String(p.id) === String(field.value))?.name || "Sản phẩm"}
                        </span>
                    </div>
                    <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                <Command className="w-full">
                    <CommandInput placeholder="Tìm mã hàng..." />
                    <CommandList className="max-h-[300px] p-1">
                        <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400">Không thấy</CommandEmpty>
                        <CommandGroup>
                            {availableProducts.map(p => (
                                <CommandItem
                                    key={p.id}
                                    value={p.name}
                                    onSelect={() => {
                                        field.onChange(String(p.id));
                                        setValue(`items.${index}.product_group_operation_id`, "");
                                        setValue(`items.${index}.planned_quantity`, "");
                                    }}
                                    className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-1"
                                >
                                    <span className="text-xs font-bold">{p.name}</span>
                                    <Check className={cn("ml-auto h-3 w-3 text-indigo-600", String(field.value) === String(p.id) ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
      )} />

      {/* Operation */}
      <Controller name={`items.${index}.product_group_operation_id`} control={control} render={({ field }) => (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={!selectedProductId || isCompleted}
                    className="w-full h-9 justify-between text-xs font-bold bg-white border-zinc-200"
                >
                    <div className="flex items-center gap-1.5 truncate">
                        <Settings className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span className="truncate">
                            {availableOperations.find(o => String(o.id) === String(field.value))?.name || "Công đoạn"}
                        </span>
                    </div>
                    <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                <Command className="w-full">
                    <CommandInput placeholder="Tìm công đoạn..." />
                    <CommandList className="max-h-[300px] p-1">
                        <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400">Không thấy</CommandEmpty>
                        <CommandGroup>
                            {availableOperations.map(op => (
                                <CommandItem
                                    key={op.id}
                                    value={op.name}
                                    onSelect={() => {
                                        field.onChange(String(op.id));
                                        const found = availableOperations.find(o => String(o.id) === String(op.id));
                                        if (found) setValue(`items.${index}.operation_name`, found.name);
                                    }}
                                    className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-1"
                                >
                                    <span className="text-xs font-bold">{op.name}</span>
                                    <Check className={cn("ml-auto h-3 w-3 text-indigo-600", String(field.value) === String(op.id) ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
      )} />

      {/* Quantity */}
      <Controller name={`items.${index}.planned_quantity`} control={control} render={({ field }) => (
        <Input {...field} type="number" placeholder="SL KH" className="h-9 text-sm" disabled={isCompleted} />
      )} />

      {/* Delete */}
      <button type="button" onClick={() => !isCompleted && remove(index)} disabled={isCompleted}
        className="p-1.5 rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function DailyTicketFormDialog({ open, ticketId, onClose }) {
  const queryClient = useQueryClient();
  const { control, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: { ticket_date: DateTime.local().toISODate(), items: [] },
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

  const { data: plansData } = useQuery({
    queryKey: ["plans-by-date", ticketDate],
    queryFn: () => planningService.getAll({ working_date: ticketDate, limit: 100 }),
    enabled: !!ticketDate && open,
  });
  const plans = plansData?.data || [];

  useEffect(() => {
    if (!open) { reset({ ticket_date: DateTime.local().toISODate(), items: [] }); return; }
    if (ticketId && ticket) {
      reset({
        ticket_date: DateTime.fromISO(ticket.ticket_date).toISODate(),
        items: ticket.items?.map(item => ({
          order_id: item.order_id || "",
          order_name: item.order_name || item.order_code || "",
          product_id: item.product_id || "",
          product_name: item.product_name || "",
          product_group_operation_id: item.product_group_operation_id || "",
          operation_name: item.operation_name || item.pgo_operation_name || "",
          planned_quantity: item.planned_quantity ? parseFloat(item.planned_quantity) : "",
        })) || [],
      });
    } else if (!ticketId) { reset({ ticket_date: DateTime.local().toISODate(), items: [] }); }
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {ticketId ? `Chỉnh sửa Phiếu #${ticketId}` : "Tạo Phiếu Sản Xuất Hàng Ngày"}
            {isCompleted && <Badge variant="destructive" className="text-xs">Đã chốt - Không thể sửa</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2">
          {/* Date */}
          <div className="w-52 space-y-1.5">
            <Label className="text-xs font-bold uppercase text-zinc-400 tracking-widest">Ngày sản xuất</Label>
            <Controller name="ticket_date" control={control} render={({ field }) => (
              <PremiumDatePicker 
                date={field.value} 
                onSelect={field.onChange} 
                disabled={isCompleted}
              />
            )} />
          </div>

          <Separator />

          {/* Items header */}
          <div>
            <p className="text-sm font-bold text-zinc-950 mb-3">Danh sách công việc dự kiến:</p>
            <div className="grid grid-cols-[1.2fr_1.2fr_1fr_100px_36px] gap-2 px-0 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Đơn hàng</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sản phẩm</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Công đoạn</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">SL Kế hoạch</p>
              <div />
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <TicketRow key={field.id} index={index} control={control} setValue={setValue}
                  remove={remove} plans={plans} isCompleted={isCompleted} watchItems={watchItems} />
              ))}
            </div>
          </div>

          {!isCompleted && (
            <Button type="button" variant="outline" size="sm" className="gap-2 mt-2"
              onClick={() => append({ order_id: "", product_id: "", product_group_operation_id: "", operation_name: "", planned_quantity: "" })}>
              <Plus className="w-3.5 h-3.5" /> Thêm công việc
            </Button>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          {isCompleted ? (
            <Button onClick={onClose}>Đóng</Button>
          ) : (
            <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : (ticketId ? "Cập Nhật Phiếu" : "Tạo Phiếu")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
