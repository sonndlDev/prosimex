import React, { useState, useMemo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../services/daily-ticket.service";
import { orderService } from "../../services/order.service";
import { productService } from "../../services/product.service";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PremiumDatePicker } from "@/components/PremiumDatePicker";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Check, ChevronsUpDown, ShoppingCart, Package, Settings, ClipboardList, Pencil } from "lucide-react";

// ─── Combobox helper ────────────────────────────────────────────────────────
function Combobox({ value, onChange, options = [], placeholder = "Chọn...", disabled = false, icon: Icon }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full h-9 justify-between text-xs font-bold bg-white border-zinc-200"
        >
          <div className="flex items-center gap-1.5 truncate">
            {Icon && <Icon className="h-3 w-3 text-indigo-500 shrink-0" />}
            <span className="truncate">
              {options.find(o => String(o.id) === String(value))?.name || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
        <Command>
          <CommandInput placeholder={`Tìm ${placeholder.toLowerCase()}...`} />
          <CommandList className="max-h-[300px] p-1">
            <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400">Không thấy</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem
                  key={o.id}
                  value={o.name}
                  onSelect={() => onChange(String(o.id))}
                  className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-1"
                >
                  <span className="text-xs font-bold">{o.name}</span>
                  <Check className={cn("ml-auto h-3 w-3 text-indigo-600", String(value) === String(o.id) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Row nhập thủ công ──────────────────────────────────────────────────────
function ManualRow({ index, control, setValue, remove, watchItems, allOrders, allProducts, allOperations }) {
  const row = watchItems[index] || {};

  const orderOptions = useMemo(() => {
    const map = new Map();
    (allOrders || []).forEach(o => {
      if (!map.has(o.id)) map.set(o.id, { id: o.id, name: o.order_code || o.name || `#${o.id}` });
    });
    return Array.from(map.values());
  }, [allOrders]);

  const productOptions = useMemo(() => {
    // Nếu đã chọn Đơn hàng, ưu tiên lấy danh sách mã hàng từ chính đơn hàng đó
    if (row.order_id) {
      const selectedOrder = (allOrders || []).find(o => String(o.id) === String(row.order_id));
      if (selectedOrder && selectedOrder.products) {
        return selectedOrder.products.map(p => ({ id: p.id, name: p.name }));
      }
    }
    
    // Nếu chưa chọn đơn hàng, không hiện mã hàng nào để tránh nhầm lẫn
    if (!row.order_id) return [];

    // Fallback nếu không tìm thấy list products trong order (nên hiếm khi xảy ra)
    const map = new Map();
    (allProducts || []).forEach(p => { if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name }); });
    return Array.from(map.values());
  }, [allProducts, allOrders, row.order_id]);

  const operationOptions = useMemo(() => {
    const map = new Map();
    (allOperations || []).forEach(o => { if (!map.has(o.id)) map.set(o.id, { id: o.id, name: o.name }); });
    return Array.from(map.values());
  }, [allOperations]);

  return (
    <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_110px_110px_180px_36px] gap-2 items-center">
      {/* Đơn hàng */}
      <Controller name={`items.${index}.order_id`} control={control} render={({ field }) => (
        <Combobox 
          value={field.value} 
          onChange={v => { 
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
      )} />

      {/* Mã hàng */}
      <Controller name={`items.${index}.product_id`} control={control} render={({ field }) => (
        <Combobox 
          value={field.value} 
          onChange={v => {
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
      )} />

      {/* Công đoạn */}
      <Controller name={`items.${index}.product_group_operation_id`} control={control} render={({ field }) => (
        <Combobox
          value={field.value}
          onChange={v => {
            field.onChange(v);
            const found = operationOptions.find(o => String(o.id) === String(v));
            if (found) setValue(`items.${index}.operation_name`, found.name);
          }}
          options={operationOptions}
          placeholder="Công đoạn"
          icon={Settings}
        />
      )} />

      {/* SL kế hoạch (tùy chọn) */}
      <Controller name={`items.${index}.planned_quantity`} control={control} render={({ field }) => (
        <Input {...field} type="number" placeholder="SL KH" className="h-9 text-sm text-right" min={0} />
      )} />

      {/* SL thực tế */}
      <Controller name={`items.${index}.actual_quantity`} control={control} render={({ field }) => (
        <Input {...field} type="number" placeholder="SL TT" className="h-9 text-sm text-right font-bold text-blue-600 border-blue-200 focus-visible:ring-blue-500" min={0} />
      )} />

      {/* Ghi chú */}
      <Controller name={`items.${index}.notes`} control={control} render={({ field }) => (
        <Input {...field} placeholder="Ghi chú..." className="h-9 text-xs border-zinc-300" />
      )} />

      {/* Xóa */}
      <button type="button" onClick={() => remove(index)}
        className="p-1.5 rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ProductionOutputPage() {
  const queryClient = useQueryClient();

  // Chế độ (nhập theo phiếu / nhập thủ công)
  const [isManualMode, setIsManualMode] = useState(false);

  // ── Chế độ THEO PHIẾU ────────────────────────────────────────────────────
  const [searchDate, setSearchDate] = useState(DateTime.now().toFormat("yyyy-MM-dd"));
  const [searchTicketId, setSearchTicketId] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(null);

  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ["daily-ticket", activeTicketId],
    queryFn: () => dailyTicketService.getById(activeTicketId),
    enabled: !!activeTicketId && !isManualMode,
    retry: false,
  });

  const { control: ticketControl, handleSubmit: ticketHandleSubmit, reset: ticketReset } = useForm({
    defaultValues: { items: [] },
  });
  const { fields: ticketFields, replace: ticketReplace } = useFieldArray({ control: ticketControl, name: "items" });

  React.useEffect(() => {
    if (ticket) {
      const rcvDate = DateTime.fromISO(ticket.ticket_date).toFormat("yyyy-MM-dd");
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
          }))
        );
      }
    }
  }, [ticket, ticketReplace, searchDate]);

  const handleSearch = () => {
    if (!searchTicketId) { toast.warning("Vui lòng nhập mã số phiếu!"); return; }
    let finalId = searchTicketId;
    let finalDate = searchDate;
    if (searchTicketId.length >= 9 && /^\d+$/.test(searchTicketId)) {
      const datePart = searchTicketId.substring(0, 8);
      const idPart = searchTicketId.substring(8);
      const parsedDate = DateTime.fromFormat(datePart, "yyyyMMdd");
      if (parsedDate.isValid) { finalDate = parsedDate.toISODate(); finalId = idPart; setSearchDate(finalDate); }
    } else if (searchTicketId.includes("_#")) {
      finalId = searchTicketId.split("_#")[1];
    }
    if (!finalDate) { toast.warning("Vui lòng chọn ngày sản xuất!"); return; }
    setActiveTicketId(finalId);
  };

  const updateMutation = useMutation({
    mutationFn: (data) => dailyTicketService.updateResults(activeTicketId, data),
    onSuccess: () => {
      toast.success("Đã cập nhật kết quả sản xuất!");
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["daily-ticket", activeTicketId]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi lưu kết quả!"),
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
  const [manualDate, setManualDate] = useState(DateTime.now().toFormat("yyyy-MM-dd"));

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

  const { control: manualControl, handleSubmit: manualHandleSubmit, watch: manualWatch, setValue: manualSetValue, reset: manualReset } = useForm({
    defaultValues: { items: [] },
  });
  const { fields: manualFields, append: manualAppend, remove: manualRemove } = useFieldArray({ control: manualControl, name: "items" });
  const manualWatchItems = manualWatch("items");

  const manualOutputMutation = useMutation({
    mutationFn: (data) => dailyTicketService.manualOutput(data),
    onSuccess: (res) => {
      toast.success(`Đã ghi nhận sản lượng! Lưu vào phiếu #${res.ticket_id}`);
      manualReset({ items: [] });
      queryClient.invalidateQueries(["daily-tickets"]);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi ghi nhận sản lượng!"),
  });

  const onManualSubmit = (data) => {
    if (data.items.length === 0) { toast.warning("Vui lòng thêm ít nhất một dòng!"); return; }
    const hasActual = data.items.some(i => parseFloat(i.actual_quantity) > 0);
    if (!hasActual) { toast.warning("Vui lòng nhập sản lượng thực tế!"); return; }
    manualOutputMutation.mutate({
      ticket_date: manualDate,
      items: data.items.map(i => ({
        order_id: i.order_id || null,
        product_id: i.product_id || null,
        product_group_operation_id: i.product_group_operation_id || null,
        operation_name: i.operation_name || null,
        planned_quantity: parseFloat(i.planned_quantity) || 0,
        actual_quantity: parseFloat(i.actual_quantity) || 0,
        notes: i.notes || null,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Nhập Sản Lượng</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Kết quả kiểm tra và báo cáo sản xuất hàng ngày</p>
        </div>
        {/* Modern Tab Bar - Segmented UI */}
        <div
          className={cn(
            "relative h-11 w-full max-w-[360px] p-1 bg-zinc-100/80 border border-zinc-200/50 rounded-full flex items-center cursor-pointer select-none transition-all duration-300"
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
              "absolute h-9 w-[calc(50%-4px)] bg-white rounded-full shadow-sm border border-zinc-200/50 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-0",
              isManualMode ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
            )}
          />

          {/* Tab 1: Theo phiếu */}
          <div className={cn(
            "relative flex-1 flex items-center justify-center gap-2 z-10 transition-all duration-300",
            !isManualMode ? "text-indigo-600 font-bold" : "text-zinc-500 font-medium"
          )}>
            <ClipboardList className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wide">Theo phiếu</span>
          </div>

          {/* Tab 2: Nhập thủ công */}
          <div className={cn(
            "relative flex-1 flex items-center justify-center gap-2 z-10 transition-all duration-300",
            isManualMode ? "text-indigo-600 font-bold" : "text-zinc-500 font-medium"
          )}>
            <Pencil className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-wide">Nhập thủ công</span>
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
                  <PremiumDatePicker date={searchDate} onSelect={(val) => setSearchDate(val)} placeholder="Chọn ngày sản xuất" />
                </div>
                <div className="w-full md:w-1/4 space-y-2">
                  <Label htmlFor="ticketId">Mã số phiếu</Label>
                  <Input
                    id="ticketId"
                    placeholder="VD: 202603268"
                    value={searchTicketId}
                    onChange={(e) => setSearchTicketId(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  />
                </div>
                <div className="w-full md:w-auto">
                  <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto px-8 font-semibold">
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

          {!isLoading && !isError && ticket && DateTime.fromISO(ticket.ticket_date).toFormat("yyyy-MM-dd") === searchDate && (
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-zinc-950">
                    Phiếu Sản Xuất {DateTime.fromISO(ticket.ticket_date).toFormat("yyyyMMdd")}{ticket.id}
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium">Người lập: {ticket.created_by_name}</p>
                </div>
                <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-green-600 hover:bg-green-700 font-bold" : "bg-orange-100 text-orange-800 hover:bg-orange-200 font-bold"}>
                  {isCompleted ? "Đã chốt (Không thể sửa)" : "Đang thực hiện"}
                </Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="w-[80px]">STT</TableHead>
                    <TableHead>Đơn hàng</TableHead>
                    <TableHead>Mã hàng</TableHead>
                    <TableHead>Công đoạn</TableHead>
                    <TableHead className="text-right">SL Kế Hoạch</TableHead>
                    <TableHead className="text-right w-[180px]">SL Thực Tế</TableHead>
                    <TableHead className="w-[200px]">Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketFields.map((field, index) => (
                    <TableRow key={field.id} className="cursor-default">
                      <TableCell className="font-medium text-zinc-500">{index + 1}</TableCell>
                      <TableCell>{field.order_code || "N/A"}</TableCell>
                      <TableCell>{field.product_name || "N/A"}</TableCell>
                      <TableCell className="font-semibold text-zinc-700">{field.operation_name}</TableCell>
                      <TableCell className="text-right font-bold text-zinc-900">{field.planned_quantity}</TableCell>
                      <TableCell className="text-right">
                        <Controller
                          name={`items.${index}.actual_quantity`}
                          control={ticketControl}
                          render={({ field: inputField }) => (
                            <Input
                              {...inputField}
                              type="number"
                              disabled={isCompleted || updateMutation.isPending}
                              className={`text-right font-bold w-full ${!isCompleted ? "text-blue-600 focus-visible:ring-blue-500 border-zinc-300" : ""}`}
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
                            <Input {...inputField} placeholder="Ghi chú nếu có..." disabled={isCompleted || updateMutation.isPending} className="text-xs h-9 border-zinc-300" />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {ticketFields.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-zinc-500 font-medium">Không có sản phẩm nào</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <CardFooter className="p-6 bg-zinc-50/50 border-t border-zinc-200 justify-end">
                <Button
                  size="lg"
                  onClick={ticketHandleSubmit(onTicketSubmit)}
                  disabled={isCompleted || updateMutation.isPending || ticketFields.length === 0}
                  className="px-8 font-bold"
                >
                  {updateMutation.isPending ? "Đang lưu..." : "Ghi Nhận Sản Lượng"}
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
                <Pencil className="h-4 w-4 text-indigo-600" />
                <h3 className="font-black text-indigo-900 text-sm uppercase tracking-wider">Nhập sản lượng từ đơn hàng / mã hàng</h3>
              </div>
              <p className="text-xs text-indigo-500 font-medium md:ml-2">
                Dùng khi không có phiếu sản xuất — hệ thống sẽ tự tạo/gộp phiếu thủ công cho ngày đã chọn.
              </p>
              <div className="md:ml-auto w-full md:w-52 space-y-1">
                <Label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Ngày sản xuất</Label>
                <PremiumDatePicker date={manualDate} onSelect={(val) => setManualDate(val)} placeholder="Chọn ngày" />
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_110px_110px_180px_36px] gap-2 px-0 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Đơn hàng</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mã hàng</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Công đoạn</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-right">SL Kế Hoạch</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 text-right">SL Thực Tế ✱</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ghi chú</p>
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
                <div className="h-20 flex items-center justify-center text-zinc-400 text-sm font-medium border-2 border-dashed border-zinc-200 rounded-xl">
                  Chưa có dòng nào — nhấn "+ Thêm dòng" để bắt đầu
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 mt-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => manualAppend({ order_id: "", product_id: "", product_group_operation_id: "", operation_name: "", planned_quantity: "", actual_quantity: "", notes: "" })}
            >
              <Plus className="w-3.5 h-3.5" /> Thêm dòng
            </Button>
          </div>

          <CardFooter className="p-6 bg-indigo-50/30 border-t border-indigo-100 justify-between items-center">
            <p className="text-xs text-zinc-500 font-medium">
              Sẽ lưu vào phiếu thủ công ngày <span className="font-black text-indigo-700">{DateTime.fromISO(manualDate).toFormat("dd/MM/yyyy")}</span>
            </p>
            <Button
              size="lg"
              onClick={manualHandleSubmit(onManualSubmit)}
              disabled={manualOutputMutation.isPending || manualFields.length === 0}
              className="px-8 font-bold bg-indigo-600 hover:bg-indigo-700"
            >
              {manualOutputMutation.isPending ? "Đang lưu..." : "Ghi Nhận Sản Lượng"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
