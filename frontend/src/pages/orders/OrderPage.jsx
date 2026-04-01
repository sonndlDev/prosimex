import React, { useState, useCallback } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../services/order.service";
import { customerService } from "../../services/customer.service";
import { productService } from "../../services/product.service";
import { productGroupService } from "../../services/product-group.service";
import GenericTable from "../../components/GenericTable";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Package,
  User,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Timer,
  Check,
  ChevronsUpDown,
  Search,
  Layers
} from "lucide-react";
import { DateTime } from "luxon";
import { PremiumDatePicker } from "../../components/PremiumDatePicker";

const defaultValues = {
  order_code: "",
  po_auto_code: "",
  name: "",
  customer_id: "",
  product_items: [],
  po_customer: "",
  received_date: DateTime.now().toFormat("yyyy-MM-dd"),
  production_location: "",
  person_in_charge: "",
  note: "",
  status: "DRAFT",
};

export default function OrderPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "product_items",
  });
  const formStatus = watch("status");
  const formPoAutoCode = watch("po_auto_code");

  // Queries
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll({ limit: 1000 }),
  });
  const customers = customersData?.data || [];

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll({ limit: 1000 }),
  });
  const products = productsData?.data || [];

  const { data: productGroupsData } = useQuery({
    queryKey: ["productGroups"],
    queryFn: () => productGroupService.getAll({ limit: 1000 }),
  });
  const productGroups = productGroupsData?.data || [];

  const {
    data: ordersData,
    isLoading,
    error,
  } = useQuery({ 
    queryKey: ["orders", page, pageSize, search], 
    queryFn: () => orderService.getAll({ page, limit: pageSize, search }) 
  });
  
  const orders = ordersData?.data || [];
  const totalItems = ordersData?.total || 0;

  // Mutations
  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: orderService.create,
    ...mutationOpts,
    onSuccess: () => {
      toast.success("Đã tạo đơn hàng thành công!");
      mutationOpts.onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi tạo đơn hàng"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => orderService.update(id, payload),
    ...mutationOpts,
    onSuccess: () => {
      toast.success("Đã cập nhật đơn hàng thành công!");
      mutationOpts.onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi cập nhật đơn hàng"),
  });
  const deleteMutation = useMutation({
    mutationFn: orderService.delete,
    onSuccess: () => {
      toast.success("Đã xóa đơn hàng!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi xóa đơn hàng"),
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "PLANNED":
        return <Badge variant="primary" className="gap-1"><Timer className="w-3 h-3" /> PLANNED</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" /> IN PROGRESS</Badge>;
      case "DONE":
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> DONE</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> CANCELLED</Badge>;
      default:
        return <Badge variant="outline">DRAFT</Badge>;
    }
  };

  const columns = [
    { id: "po_auto_code", label: "Mã đơn hàng", className: "font-bold text-blue-600" },
    { id: "po_customer", label: "PO Khách hàng" },
    { id: "name", label: "Tên đơn hàng", className: "font-medium" },
    { id: "customer_name", label: "Khách hàng" },
    {
      id: "products",
      label: "Sản phẩm",
      format: (value, row) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.products?.slice(0, 3).map((p) => (
            <Badge
              key={p.id}
              variant="outline"
              className="text-[10px] bg-zinc-50 border-zinc-200"
            >
              {p.name} ({p.quantity || 0})
            </Badge>
          ))}
          {row.products?.length > 3 && (
            <Badge variant="outline" className="text-[10px] bg-zinc-50 border-zinc-200">
              +{row.products.length - 3}...
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "total_quantity",
      label: "Tổng SL",
      className: "text-right font-bold tabular-nums",
      format: (value, row) =>
        row.products
          ?.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0)
          .toLocaleString() || "0",
    },
    {
      id: "status",
      label: "Trạng thái",
      format: (value) => getStatusBadge(value),
    },
  ];

  const handleOpen = (order = null) => {
    if (order) {
      setSelectedOrder(order);
      reset({
        order_code: order.order_code,
        po_auto_code: order.po_auto_code || "",
        name: order.name,
        customer_id: String(order.customer_id),
        product_items:
          order.products?.map((p) => ({
            product_group_id: String(p.product_group_id || ""),
            product_id: String(p.id),
            quantity: p.quantity || "",
          })) || [],
        po_customer: order.po_customer,
        received_date: DateTime.fromISO(order.received_date).toFormat(
          "yyyy-MM-dd",
        ),
        production_location: order.production_location || "",
        person_in_charge: order.person_in_charge || "",
        note: order.note || "",
        status: order.status,
      });
    } else {
      setSelectedOrder(null);
      reset(defaultValues);
    }
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
    setSelectedOrder(null);
  };

  const onSubmit = (data) => {
    const product_items = data.product_items.filter(
      (item) => item.product_id && parseFloat(item.quantity) > 0,
    );

    if (product_items.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một mã hàng và nhập số lượng.");
      return;
    }

    const payload = {
      ...data,
      product_items,
      quantity: product_items.reduce(
        (sum, item) => sum + parseFloat(item.quantity || 0),
        0,
      ),
    };
    delete payload.product_ids;

    if (selectedOrder) updateMutation.mutate({ id: selectedOrder.id, payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (order) => {
    if (window.confirm(`Xóa đơn hàng ${order.order_code}?`))
      deleteMutation.mutate(order.id);
  };

  const handleBulkDelete = (selectedIds) => {
    if (window.confirm(`Xóa ${selectedIds.length} đơn hàng đã chọn?`)) {
      selectedIds.forEach((id) => deleteMutation.mutate(id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản lý Đơn hàng</h2>
           <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Danh sách thông tin đơn hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpen()} className="h-11 px-6 gap-2 font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl">
            <Plus className="w-4 h-4" /> Thêm đơn hàng
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <GenericTable
          data={orders}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        isServerSide={true}
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={setSearch}
      />
      </div>

      <Dialog open={openModal} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] flex flex-col p-0 border-zinc-200 shadow-2xl ">
          <form
            onSubmit={rhfHandleSubmit(onSubmit)}
            className="flex flex-col h-full bg-zinc-50/50"
          >
            <DialogHeader className="px-6 py-4 bg-white border-b border-zinc-200 shadow-sm z-10 sticky top-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <DialogTitle className="text-xl font-black tracking-tighter text-zinc-950 uppercase">
                    {selectedOrder ? `Chỉnh sửa đơn hàng` : "Tạo đơn hàng mới"}
                  </DialogTitle>
                  {selectedOrder && (
                    <div className="flex items-center gap-2">
                      {getStatusBadge(formStatus)}
                      <span className="text-lg font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        #{selectedOrder.order_code}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    className="font-bold text-zinc-500 hover:text-zinc-950 px-6"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="font-bold px-8 shadow-md h-10 min-w-[140px] bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu đơn hàng"
                    )}
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Full-Width Name field at the top */}
              <Card className="border-zinc-200 shadow-sm overflow-hidden border-t-4 border-t-blue-600">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">THÔNG TIN CHUNG</Label>
                    </div>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-1.5">
                          <Label htmlFor="name" className="text-sm font-bold">Tên đơn hàng <span className="text-red-500">*</span></Label>
                          <Input
                            {...field}
                            id="name"
                            className="bg-white text-lg font-bold border-zinc-200 focus-visible:ring-blue-600 h-12 px-4 shadow-sm"
                            placeholder="VD: Đơn hàng gia công khuôn mẫu ABC"
                          />
                        </div>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Details in 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-zinc-200 shadow-sm bg-white">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">KHÁCH HÀNG & PO</Label>
                    </div>

                    <div className="grid gap-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Khách hàng <span className="text-red-500">*</span></Label>
                        <Controller
                          name="customer_id"
                          control={control}
                          render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full h-10 justify-between bg-white border-zinc-200 font-bold",
                                            !field.value && "text-zinc-400 font-medium"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <User className={cn("h-3.5 w-3.5 shrink-0", field.value ? "text-indigo-600" : "text-zinc-300")} />
                                            <span className="truncate">
                                                {field.value ? customers?.find(c => String(c.id) === String(field.value))?.name : "Chọn khách hàng"}
                                            </span>
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                    <Command className="w-full">
                                        <CommandInput placeholder="Tìm khách hàng..." />
                                        <CommandList className="max-h-64 p-1">
                                            <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không thấy</CommandEmpty>
                                            <CommandGroup>
                                                {customers?.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={c.name}
                                                        onSelect={() => field.onChange(String(c.id))}
                                                        className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                                    >
                                                        <span className="text-xs font-bold">{c.name}</span>
                                                        <Check className={cn("ml-auto h-4 w-4 text-indigo-600", String(field.value) === String(c.id) ? "opacity-100" : "opacity-0")} />
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">PO Khách hàng <span className="text-red-500">*</span></Label>
                          <Controller
                            name="po_customer"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                className="bg-white border-zinc-200 h-10"
                                placeholder="Mã PO từ KH"
                              />
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-zinc-400">Mã PO Hệ thống (Tự động)</Label>
                          <div className="bg-zinc-50 border border-zinc-200 rounded-md h-10 flex items-center px-3 font-bold text-blue-700 opacity-80 text-sm">
                            {formPoAutoCode || (selectedOrder ? "N/A" : "Tự động tạo...")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200 shadow-sm bg-white">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">CHI TIẾT SẢN XUẤT</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Ngày nhận <span className="text-red-500">*</span></Label>
                        <Controller
                          name="received_date"
                          control={control}
                          render={({ field }) => (
                            <PremiumDatePicker
                                date={field.value}
                                onSelect={field.onChange}
                                placeholder="Ngày nhận"
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Người phụ trách</Label>
                        <Controller
                          name="person_in_charge"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                              <Input
                                {...field}
                                className="pl-10 bg-white border-zinc-200 h-10"
                                placeholder="Tên nhân viên"
                              />
                            </div>
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Địa điểm SX</Label>
                        <Controller
                          name="production_location"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                              <Input
                                {...field}
                                className="pl-10 bg-white border-zinc-200 h-10"
                                placeholder="Ghi chú địa điểm"
                              />
                            </div>
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Trạng thái</Label>
                        {selectedOrder ? (
                          <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={String(field.value || "")}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="bg-white border-zinc-200 h-10 uppercase font-bold text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {["DRAFT", "PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => (
                                    <SelectItem key={s} value={s} className="uppercase font-bold text-xs">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="bg-zinc-100 border border-zinc-200 rounded-md h-10 flex items-center px-3 font-bold text-zinc-500 text-xs">
                            DRAFT
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Ghi chú chi tiết</Label>
                      <Controller
                        name="note"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            className="bg-white border-zinc-200 min-h-[80px] resize-none"
                            placeholder="Thông tin bổ sung..."
                          />
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 3. Product Selection */}
              <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">DANH MỤC MÃ HÀNG & SỐ LƯỢNG</Label>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {fields.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50/50">
                        <AlertCircle className="w-8 h-8 text-zinc-300 mb-2" />
                        <p className="text-sm font-medium text-zinc-400">Chưa có mã hàng nào được thêm.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-[40px_1fr_1.5fr_1fr_40px] gap-4 px-2 mb-2">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">STT</span>
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Nhóm mã</span>
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Mã hàng</span>
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider text-right">Số lượng</span>
                          <div />
                        </div>
                        {(() => {
                          const watchedItems = watch("product_items") || [];
                          return fields.map((field, index) => {
                            const selectedProductIds = watchedItems
                              .filter((_, i) => i !== index)
                              .map((it) => String(it.product_id));

                            const currentGroupId = watchedItems[index]?.product_group_id;

                            return (
                              <div
                                key={field.id}
                                className="grid grid-cols-[40px_1fr_1.5fr_1fr_40px] gap-4 items-center p-2 rounded-lg border border-zinc-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all duration-200 group"
                              >
                                <span className="text-sm font-black text-zinc-300 group-hover:text-blue-600 transition-colors pl-1">
                                  {String(index + 1).padStart(2, '0')}
                                </span>

                                <Controller
                                  name={`product_items.${index}.product_group_id`}
                                  control={control}
                                  render={({ field: f }) => (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn(
                                            "bg-white h-10 border-zinc-200 text-[11px] font-bold justify-between w-full px-3",
                                            !f.value && "text-zinc-500 font-medium"
                                          )}
                                        >
                                          <span className="truncate">
                                            {f.value
                                              ? productGroups.find(g => String(g.id) === String(f.value))?.name
                                              : "Chọn nhóm..."}
                                          </span>
                                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                        <Command className="w-full">
                                          <CommandInput placeholder="Tìm nhóm mã hàng..." />
                                          <CommandList className="max-h-[250px] p-1">
                                            <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không thấy nhóm nào</CommandEmpty>
                                            <CommandGroup>
                                              {productGroups.map((g) => (
                                                <CommandItem
                                                  key={g.id}
                                                  value={g.name}
                                                  onSelect={() => {
                                                    f.onChange(String(g.id));
                                                    setValue(`product_items.${index}.product_id`, "");
                                                  }}
                                                  className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500 group-aria-selected:bg-indigo-100 group-aria-selected:text-indigo-600">
                                                      {g.name.substring(0, 1)}
                                                    </div>
                                                    <span className="text-xs font-bold">{g.name}</span>
                                                  </div>
                                                  <Check
                                                    className={cn(
                                                      "h-3.5 w-3.5 text-indigo-600",
                                                      String(f.value) === String(g.id) ? "opacity-100" : "opacity-0"
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

                                <Controller
                                  name={`product_items.${index}.product_id`}
                                  control={control}
                                  render={({ field: f }) => {
                                    const filteredProducts = products.filter(
                                      (p) =>
                                        (p.is_active || String(p.id) === String(f.value)) &&
                                        String(p.product_group_id) === String(currentGroupId) &&
                                        (!selectedProductIds.includes(String(p.id)) || String(p.id) === String(f.value))
                                    );

                                    return (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    disabled={!currentGroupId}
                                                    className={cn(
                                                        "w-full h-10 justify-between bg-white border-zinc-200 text-xs font-bold",
                                                        !f.value && "text-zinc-400 font-medium"
                                                    )}
                                                >
                                                    <span className="truncate">
                                                        {f.value ? products.find(p => String(p.id) === String(f.value))?.name : "Chọn mã hàng"}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                                <Command className="w-full">
                                                    <CommandInput placeholder="Tìm mã hàng..." />
                                                    <CommandList className="max-h-64 p-1">
                                                        <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không thấy</CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredProducts.map((p) => (
                                                                <CommandItem
                                                                    key={p.id}
                                                                    value={p.name}
                                                                    onSelect={() => f.onChange(String(p.id))}
                                                                    className="px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                                                >
                                                                    <span className="text-xs font-bold">{p.name}</span>
                                                                    <Check className={cn("ml-auto h-4 w-4 text-indigo-600", String(f.value) === String(p.id) ? "opacity-100" : "opacity-0")} />
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

                                <Controller
                                  name={`product_items.${index}.quantity`}
                                  control={control}
                                  render={({ field: f }) => (
                                    <Input
                                      {...f}
                                      type="number"
                                      className="h-10 text-right font-black tabular-nums border-zinc-200 focus-visible:ring-blue-600 bg-white"
                                      placeholder="0"
                                    />
                                  )}
                                />

                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => append({ product_group_id: "", product_id: "", quantity: "" })}
                      className="w-full py-6 border-dashed border-zinc-200 hover:border-blue-300 hover:bg-blue-50/30 text-zinc-400 hover:text-blue-600 font-bold transition-all gap-2"
                    >
                      <Plus className="w-4 h-4" /> Thêm mã hàng mới
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
