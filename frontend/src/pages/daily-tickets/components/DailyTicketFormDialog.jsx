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
import { Trash2, Plus, Loader2 } from "lucide-react";

const TicketRow = ({ index, control, setValue, remove, plans, isCompleted, watchItems }) => {
  const selectedOrderId = watchItems[index]?.order_id;
  const selectedProductId = watchItems[index]?.product_id;

  const availableProducts = useMemo(() => {
    if (!selectedOrderId || !plans) return [];
    const map = new Map();
    plans
      .filter(p => String(p.order_id) === String(selectedOrderId))
      .forEach(p => {
        if (p.product_id) map.set(p.product_id, { id: p.product_id, name: p.product_name });
      });
    return Array.from(map.values());
  }, [selectedOrderId, plans]);

  const availableOperations = useMemo(() => {
    if (!selectedProductId || !plans) return [];
    return plans
      .filter(p => String(p.order_id) === String(selectedOrderId) && String(p.product_id) === String(selectedProductId))
      .map(p => ({ id: p.product_group_operation_id || `null-${p.id}`, name: p.operation_name || "N/A (CĐ Tổng)", plan: p }));
  }, [selectedOrderId, selectedProductId, plans]);

  const uniqueOrders = Array.from(new Map(plans?.map(p => [p.order_id, { id: p.order_id, name: p.order_name || p.order_code || `#${p.order_id}` }]) || []).values());

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_140px_36px] gap-2 items-center">
      {/* Order */}
      <Controller name={`items.${index}.order_id`} control={control} render={({ field }) => (
        <Select value={String(field.value || "")} disabled={isCompleted}
          onValueChange={v => { field.onChange(v); setValue(`items.${index}.product_id`, ""); setValue(`items.${index}.product_group_operation_id`, ""); setValue(`items.${index}.planned_quantity`, ""); }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Đơn hàng">
              {uniqueOrders.find(o => String(o.id) === String(field.value))?.name || field.value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>{uniqueOrders.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
      )} />

      {/* Product */}
      <Controller name={`items.${index}.product_id`} control={control} render={({ field }) => (
        <Select value={String(field.value || "")} disabled={!selectedOrderId || isCompleted}
          onValueChange={v => { field.onChange(v); setValue(`items.${index}.product_group_operation_id`, ""); setValue(`items.${index}.planned_quantity`, ""); }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Sản phẩm">
               {availableProducts.find(p => String(p.id) === String(field.value))?.name || field.value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>{availableProducts.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      )} />

      {/* Operation */}
      <Controller name={`items.${index}.product_group_operation_id`} control={control} render={({ field }) => (
        <Select value={String(field.value || "")} disabled={!selectedProductId || isCompleted}
          onValueChange={v => { field.onChange(v); const op = availableOperations.find(o => String(o.id) === v); if (op) setValue(`items.${index}.operation_name`, op.name); }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Công đoạn">
               {availableOperations.find(o => String(o.id) === String(field.value))?.name || field.value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>{availableOperations.map(op => <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>)}</SelectContent>
        </Select>
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
          product_id: item.product_id || "",
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
            <Label>Ngày sản xuất</Label>
            <Controller name="ticket_date" control={control} render={({ field }) => (
              <Input {...field} type="date" className="h-9" disabled={isCompleted} />
            )} />
          </div>

          <Separator />

          {/* Items header */}
          <div>
            <p className="text-sm font-bold text-zinc-950 mb-3">Danh sách công việc dự kiến:</p>
            <div className="grid grid-cols-[1fr_1fr_1fr_140px_36px] gap-2 px-0 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Đơn hàng</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sản phẩm</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Công đoạn</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">SL Kế hoạch</p>
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
