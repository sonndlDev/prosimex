import React, { useState, useCallback, memo } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../services/order.service";
import { customerService } from "../../services/customer.service";
import { productService } from "../../services/product.service";
import { productGroupService } from "../../services/product-group.service";
import GenericTable from "../../components/GenericTable";
import { toast } from "sonner";
import CompletionReportDialog from "./components/CompletionReportDialog";
import OrderSummaryDialog from "./components/OrderSummaryDialog";
import RemainingQuantityDialog from "./components/RemainingQuantityDialog";
import CompletionPercentageCell from "./components/CompletionPercentageCell";
import WarehouseDetailsDialog from "./components/WarehouseDetailsDialog";
import { getAuditColumn } from "../../utils/audit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Layers,
  MoreHorizontal,
  Warehouse,
  Pencil,
  LayoutDashboard,
  Search,
  X,
  RotateCcw,
  MessageSquare,
  Upload,
  Download
} from "lucide-react";
import { DateTime } from "luxon";
import { PremiumDatePicker } from "../../components/PremiumDatePicker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as XLSX from "xlsx";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  production_start_date: "",
  expected_shipping_date: "",
  expected_container_shipping_date: "",
  customer_confirmation_result: "",
  pallet_info: "",
  accessory_status: "",
};

export default function OrderPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const initialFilters = {
    startDate: "",
    endDate: "",
    dateType: "received",
    status: "ALL",
    customer_id: "ALL",
    product_id: "ALL",
    person_in_charge: "",
    location: "",
    search: "",
  };

  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const handleSearch = useCallback((newFilters) => {
    setPage(1);
    setAppliedFilters(newFilters);
  }, []);

  const handleReset = useCallback(() => {
    setPage(1);
    setAppliedFilters(initialFilters);
  }, [initialFilters]);


  const [openCompletionReport, setOpenCompletionReport] = useState(false);
  const [reportOrderId, setReportOrderId] = useState(null);

  const [openWarehouseDialog, setOpenWarehouseDialog] = useState(false);
  const [warehouseOrder, setWarehouseOrder] = useState(null);

  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [summaryOrderId, setSummaryOrderId] = useState(null);

  const [openRemainingQuantity, setOpenRemainingQuantity] = useState(false);
  const [remainingQuantityOrderId, setRemainingQuantityOrderId] = useState(null);

  const [importErrors, setImportErrors] = useState([]);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const fileInputRef = React.useRef(null);

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
    queryKey: ["orders", page, pageSize, appliedFilters],
    queryFn: () => orderService.getAll({ page, limit: pageSize, ...appliedFilters })
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
    {
      id: "report_action",
      label: "Báo cáo",
      className: "min-w-[80px] w-[80px] max-w-[80px] text-center",
      isSticky: true,
      stickyLeft: "100px",
      width: "80px",
      format: (_, row) => (
        <div className="flex items-center justify-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  setSummaryOrderId(row.id);
                  setOpenSummaryDialog(true);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-sm transition-all active:scale-95 border border-transparent"
              >
                <LayoutDashboard className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">
                <p>Báo cáo tổng hợp</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  setRemainingQuantityOrderId(row.id);
                  setOpenRemainingQuantity(true);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 hover:shadow-sm transition-all active:scale-95 border border-transparent"
              >
                <Layers className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">
                <p>Sản lượng còn lại</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
    {
      id: "po_customer",
      label: "PO KH",
      className: "min-w-[120px] w-[120px] max-w-[120px] font-bold text-blue-600",
      isSticky: true,
      stickyLeft: "180px",
      width: "120px",
      format: (value, row) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              onClick={(e) => {
                e.stopPropagation();
                handleOpen(row);
              }}
              className="inline-flex items-center gap-1 font-black text-blue-600 hover:text-indigo-700 hover:underline cursor-pointer transition-colors"
            >
              {value || "-"}
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">
              <p>Xem chi tiết đơn hàng</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    { 
      id: "name", 
      label: "Tên đơn hàng", 
      className: "min-w-[250px] w-[250px] max-w-[250px] font-semibold text-zinc-900",
      isSticky: true,
      stickyLeft: "300px",
      width: "250px"
    },
    { 
      id: "customer_name", 
      label: "Tên khách", 
      className: "min-w-[150px] w-[150px] max-w-[150px] font-medium truncate",
      isSticky: true,
      stickyLeft: "550px",
      width: "150px"
    },
    { 
      id: "person_in_charge", 
      label: "Người theo dõi đơn hàng", 
      className: "min-w-[150px] w-[150px] max-w-[150px] truncate",
      isSticky: true,
      stickyLeft: "700px",
      width: "150px"
    },
    {
      id: "received_date",
      label: "Ngày nhận đơn",
      className: "min-w-[110px] w-[110px] max-w-[110px] text-center",
      isSticky: true,
      stickyLeft: "850px",
      isLastSticky: true,
      width: "110px",
      format: (value) => value ? DateTime.fromISO(value).toFormat("dd/MM/yyyy") : ""
    },
    {
      id: "expected_material_date",
      label: <p className="text-center">Ngày NL về xưởng <br /> (Dự kiến)</p>,
      format: (value, row) => row.expected_material_date ? DateTime.fromISO(row.expected_material_date).toFormat("dd/MM/yyyy") : "-"
    },
    {
      id: "production_start_date",
      label: "Ngày bắt đầu sản xuất",
      format: (value) => value ? DateTime.fromISO(value).toFormat("dd/MM/yyyy") : ""
    },
    {
      id: "expected_shipping_date",
      label: <p className="text-center">Ngày xuất hàng <br /> (Dự kiến)</p>,
      format: (value) => value ? DateTime.fromISO(value).toFormat("dd/MM/yyyy") : ""
    },
    {
      id: "actual_material_date",
      label: <p className="text-center">Ngày báo XNK</p>,
      format: (value, row) => row.actual_material_date ? DateTime.fromISO(row.actual_material_date).toFormat("dd/MM/yyyy") : "-"
    },
    {
      id: "expected_container_shipping_date",
      label: <p className="text-center">Ngày xuất công <br /> (Thực tế)</p>,
      format: (value) => value ? DateTime.fromISO(value).toFormat("dd/MM/yyyy") : ""
    },
    {
      id: "status",
      label: "Trạng thái",
      format: (value) => getStatusBadge(value),
    },
    {
      id: "customer_confirmation_result",
      label: "Kết quả xác nhận Kh"
    },
    {
      id: "completion_percentage",
      label: "Phần trăm hoàn thành đơn hàng",
      format: (value, row) => (
        <div
          className="flex justify-center items-center h-full w-full cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setReportOrderId(row.id);
            setOpenCompletionReport(true);
          }}
        >
          <Badge
            variant={(row.completion_percentage || 0) >= 100 ? "success" : (row.completion_percentage || 0) > 0 ? "warning" : "outline"}
            className="font-black tabular-nums border-zinc-200 shadow-sm cursor-pointer hover:bg-zinc-100"
          >
            {(row.completion_percentage || 0)}%
          </Badge>
        </div>
      )
    },
    { id: "note", label: "Ghi chú", className: "max-w-[150px] truncate" },
    {
      id: "total_quantity",
      label: "Số lượng",
      className: "text-right font-bold tabular-nums",
      format: (value, row) =>
        row.products
          ?.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0)
          .toLocaleString() || "0",
    },
    { id: "net_weight_text", label: "Net W", format: (value, row) => row.net_weight_text || "-" },
    { id: "package_count_text", label: "Số kiện", format: (value, row) => row.package_count_text || "-" },
    { id: "container_volume_text", label: "Khối lượng cont/ lẻ", format: (value, row) => row.container_volume_text || "-" },
    { id: "pallet_info", label: "Loại pallet, kích thước, tải trọng", format: (value, row) => row.pallet_info || "-" },
    { id: "accessory_status", label: "Tình trạng phụ kiện", format: (value, row) => row.accessory_status || "-" },
    getAuditColumn(),
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
        production_start_date: order.production_start_date ? DateTime.fromISO(order.production_start_date).toFormat("yyyy-MM-dd") : "",
        expected_shipping_date: order.expected_shipping_date ? DateTime.fromISO(order.expected_shipping_date).toFormat("yyyy-MM-dd") : "",
        expected_container_shipping_date: order.expected_container_shipping_date ? DateTime.fromISO(order.expected_container_shipping_date).toFormat("yyyy-MM-dd") : "",
        customer_confirmation_result: order.customer_confirmation_result || "",
        pallet_info: order.pallet_info || "",
        accessory_status: order.accessory_status || "",
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

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const errors = [];
        const validItems = [];

        data.forEach((row, idx) => {
          const rowNum = idx + 2; // +1 header, +1 zero-indexed
          const groupName = (row["Nhóm mã hàng"] || row["Nhóm"] || row["Product Group"])?.toString().trim();
          const productName = (row["Mã hàng"] || row["Sản phẩm"] || row["Product"])?.toString().trim();
          const qty = parseFloat(row["Số lượng"] || row["Quantity"] || 0);

          if (!groupName || !productName) {
            errors.push({ row: rowNum, reason: "Thiếu tên nhóm mã hàng hoặc mã hàng" });
            return;
          }

          const foundGroup = productGroups.find(
            (g) => g.name.trim().toLowerCase() === groupName.toLowerCase()
          );

          if (!foundGroup) {
            errors.push({ row: rowNum, reason: `Không tìm thấy nhóm: "${groupName}"` });
            return;
          }

          const foundProduct = products.find(
            (p) =>
              p.name.trim().toLowerCase() === productName.toLowerCase() &&
              String(p.product_group_id) === String(foundGroup.id)
          );

          if (!foundProduct) {
            errors.push({
              row: rowNum,
              reason: `Không tìm thấy mã hàng: "${productName}" trong nhóm "${foundGroup.name}"`,
            });
            return;
          }

          if (qty <= 0) {
            errors.push({ row: rowNum, reason: `Số lượng không hợp lệ cho mã: "${productName}"` });
            return;
          }

          validItems.push({
            product_group_id: String(foundGroup.id),
            product_id: String(foundProduct.id),
            quantity: String(qty),
          });
        });

        if (validItems.length > 0) {
          validItems.forEach((item) => {
            // Avoid duplicates
            const currentItems = watch("product_items") || [];
            if (!currentItems.some((it) => String(it.product_id) === String(item.product_id))) {
              append(item);
            }
          });
          toast.success(`Đã thêm ${validItems.length} mã hàng từ file Excel.`);
        }

        if (errors.length > 0) {
          setImportErrors(errors);
          setShowImportErrors(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    try {
      const headers = [["Nhóm mã hàng", "Mã hàng", "Số lượng"]];
      const ws = XLSX.utils.aoa_to_sheet(headers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "Template_Import_San_Pham.xlsx");
    } catch (err) {
      toast.error("Lỗi khi tạo file mẫu");
    }
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

      <OrderFilterBar
        customers={customers}
        products={products}
        onSearch={handleSearch}
        onReset={handleReset}
        initialFilters={initialFilters}
      />




      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <GenericTable
          data={orders}
          columns={columns}
          isLoading={isLoading}
          error={error}
          onBulkDelete={handleBulkDelete}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onEdit={handleOpen}
          onDelete={handleDelete}
          maxHeight="calc(100vh - 425px)"
          freezeFirstCols={true}
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
                          <Label className="text-xs font-bold">Mã PO Hệ thống</Label>
                          <Controller
                            name="po_auto_code"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                className="bg-white border-zinc-200 h-10"
                                placeholder="Có thể nhập tay hoặc để trống"
                              />
                            )}
                          />
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
                                <SelectTrigger className="bg-white border-zinc-200 h-10 uppercase font-bold text-[10px] rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="w-[var(--radix-select-trigger-width)] border-indigo-50 shadow-2xl rounded-xl p-1 bg-white/95 backdrop-blur-sm z-[200]">
                                  {["DRAFT", "PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => (
                                    <SelectItem key={s} value={s} className="uppercase font-bold text-[10px] rounded-lg py-2.5 px-3 focus:bg-indigo-50 focus:text-indigo-700 transition-colors cursor-pointer mb-0.5 last:mb-0">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="bg-zinc-100/80 border border-zinc-200 rounded-xl h-10 flex items-center px-3 font-bold text-zinc-500 text-[10px] uppercase">
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

              {/* Tiến độ và Xác nhận (chỉ hiển thị khi Update theo yêu cầu) */}
              {selectedOrder && (
                <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">TIẾN ĐỘ & XÁC NHẬN</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-100 pb-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Ngày bắt đầu sản xuất</Label>
                        <Controller
                          name="production_start_date"
                          control={control}
                          render={({ field }) => (
                            <PremiumDatePicker
                              date={field.value}
                              onSelect={field.onChange}
                              placeholder="Chọn ngày"
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Ngày xuất hàng (Dự kiến)</Label>
                        <Controller
                          name="expected_shipping_date"
                          control={control}
                          render={({ field }) => (
                            <PremiumDatePicker
                              date={field.value}
                              onSelect={field.onChange}
                              placeholder="Chọn ngày"
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Ngày xuất công thực tế</Label>
                        <Controller
                          name="expected_container_shipping_date"
                          control={control}
                          render={({ field }) => (
                            <PremiumDatePicker
                              date={field.value}
                              onSelect={field.onChange}
                              placeholder="Chọn ngày"
                            />
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Kết quả xác nhận Khách hàng</Label>
                      <Controller
                        name="customer_confirmation_result"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={String(field.value || "")}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full h-12 bg-white border-zinc-200 rounded-xl font-bold text-[11px] shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all px-4">
                              <div className="flex items-center gap-3 truncate">
                                <MessageSquare className={cn("h-4 w-4 shrink-0", field.value ? "text-indigo-600" : "text-zinc-300")} />
                                <SelectValue placeholder="Chọn kết quả xác nhận..." />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="w-[var(--radix-select-trigger-width)] border-indigo-50 shadow-2xl rounded-xl p-1 bg-white/95 backdrop-blur-sm z-[200]">
                              {[
                                "Khách chưa phản hồi",
                                "Chưa báo khách",
                                "Khách đã xác nhận",
                                "Đã báo XNK",
                                "Theo lịch xuất của xưởng"
                              ].map((opt) => (
                                <SelectItem
                                  key={opt}
                                  value={opt}
                                  className="rounded-lg font-bold text-[11px] py-3 px-4 focus:bg-indigo-50 focus:text-indigo-700 transition-all cursor-pointer mb-0.5 last:mb-0"
                                >
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-100 pt-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500">Loại pallet, kích thước, tải trọng</Label>
                        <Controller
                          name="pallet_info"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              className="bg-white border-zinc-200 h-10"
                              placeholder="VD: Pallet gỗ, 1100x1100, 1000kg..."
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-500">Tình trạng phụ kiện</Label>
                        <Controller
                          name="accessory_status"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              className="bg-white border-zinc-200 h-10"
                              placeholder="VD: Đầy đủ, thiếu ốc vít..."
                            />
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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

                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        className="hidden"
                        accept=".xlsx,.xls"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ product_group_id: "", product_id: "", quantity: "" })}
                        className="flex-1 py-6 border-dashed border-zinc-200 hover:border-blue-300 hover:bg-blue-50/30 text-zinc-400 hover:text-blue-600 font-bold transition-all gap-2"
                      >
                        <Plus className="w-4 h-4" /> Thêm mã hàng mới
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-6 px-6 border-dashed border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30 text-zinc-400 hover:text-emerald-600 font-bold transition-all gap-2"
                      >
                        <Upload className="w-4 h-4" /> Import Excel
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDownloadTemplate}
                        className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-blue-600 transition-all gap-2"
                      >
                        <Download className="w-3 h-3" /> Tải file mẫu
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CompletionReportDialog
        orderId={reportOrderId}
        open={openCompletionReport}
        onClose={() => {
          setOpenCompletionReport(false);
          setReportOrderId(null);
        }}
      />

      <OrderSummaryDialog
        orderId={summaryOrderId}
        open={openSummaryDialog}
        onClose={() => {
          setOpenSummaryDialog(false);
          setSummaryOrderId(null);
        }}
      />

      <RemainingQuantityDialog
        orderId={remainingQuantityOrderId}
        open={openRemainingQuantity}
        onClose={() => {
          setOpenRemainingQuantity(false);
          setRemainingQuantityOrderId(null);
        }}
      />

      <Dialog open={showImportErrors} onOpenChange={setShowImportErrors}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-red-50 border-b border-red-100">
            <DialogTitle className="text-red-700 font-black flex items-center gap-2 uppercase text-sm tracking-tight">
              <AlertCircle className="w-5 h-5" /> Kết quả Import (Có lỗi)
            </DialogTitle>
          </DialogHeader>
          <div className="p-0">
            <ScrollArea className="max-h-[300px] p-6">
              <div className="space-y-3">
                {importErrors.map((err, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100 group hover:bg-white hover:border-red-200 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-black text-xs shrink-0">
                      {err.row}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-zinc-700">Dòng {err.row}</p>
                      <p className="text-[11px] font-medium text-zinc-500 mt-0.5">{err.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-100">
            <Button onClick={() => setShowImportErrors(false)} className="w-full font-bold bg-zinc-900 text-white rounded-xl h-11">
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const OrderFilterBar = memo(({ customers, products, onSearch, onReset, initialFilters }) => {
  const [tempFilters, setTempFilters] = useState(initialFilters);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(tempFilters);
  };

  const handleClear = () => {
    setTempFilters(initialFilters);
    onReset();
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-200/60 shadow-sm sticky top-0 z-50">
      <form
        className="flex flex-col xl:flex-row items-center gap-4"
        onSubmit={handleSubmit}
      >
        {/* Search Input - Tăng độ rộng để dễ nhìn */}
        <div className="w-full xl:w-[350px] shrink-0">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Mã đơn, PO, tên đơn..."
              value={tempFilters.search}
              onChange={e => setTempFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 h-10 text-sm font-medium border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white focus:bg-white transition-all focus-visible:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* Filters Row - Sử dụng flex-1 để co giãn tự nhiên */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Customer */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full h-10 justify-between bg-zinc-50/50 border-zinc-200/80 rounded-xl font-bold hover:bg-white transition-all shadow-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Khách:</span>
                  <span className="truncate text-[11px]">
                    {tempFilters.customer_id === 'ALL' || !tempFilters.customer_id
                      ? "Tất cả"
                      : customers.find(c => String(c.id) === String(tempFilters.customer_id))?.name}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
              <Command className="w-full">
                <CommandInput placeholder="Tìm khách hàng..." />
                <CommandList className="max-h-[300px] p-1">
                  <CommandEmpty className="py-4 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không thấy khách hàng</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="ALL"
                      onSelect={() => setTempFilters(prev => ({ ...prev, customer_id: 'ALL' }))}
                      className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-0.5"
                    >
                      <span className="text-[11px] font-bold">Tất cả khách hàng</span>
                      <Check className={cn("h-4 w-4 text-indigo-600", (tempFilters.customer_id === 'ALL' || !tempFilters.customer_id) ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                    {customers.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => setTempFilters(prev => ({ ...prev, customer_id: String(c.id) }))}
                        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-0.5"
                      >
                        <span className="text-[11px] font-bold">{c.name}</span>
                        <Check className={cn("h-4 w-4 text-indigo-600", String(tempFilters.customer_id) === String(c.id) ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Person In Charge (NV) */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">NPT:</span>
            </div>
            <Input
              placeholder="Tên nhân viên..."
              value={tempFilters.person_in_charge}
              onChange={e => setTempFilters(prev => ({ ...prev, person_in_charge: e.target.value }))}
              className="pl-10 h-10 text-[11px] font-bold border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white focus:bg-white transition-all focus-visible:ring-indigo-500/30 shadow-sm"
            />
          </div>

          {/* Date Picker Range - Tối ưu padding và font để không bị vỡ */}
          <div className="flex items-center gap-1 bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-2.5 h-10 group focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all shadow-sm overflow-hidden">
            <span className="text-[10px] font-black text-zinc-400 uppercase whitespace-nowrap mr-1 tracking-tighter">Ngày:</span>
            <Input
              type="date"
              value={tempFilters.startDate}
              onChange={e => setTempFilters(prev => ({ ...prev, startDate: e.target.value, dateType: "received" }))}
              className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
            />
            <span className="text-zinc-300 mx-0.5">—</span>
            <Input
              type="date"
              value={tempFilters.endDate}
              onChange={e => setTempFilters(prev => ({ ...prev, endDate: e.target.value, dateType: "received" }))}
              className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
            />
          </div>
        </div>

        {/* Buttons - Cố định bên phải */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="submit"
            className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            Lọc kết quả
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="w-10 h-10 p-0 border-zinc-200/80 text-zinc-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl bg-white transition-all shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[10px] font-bold">Đặt lại bộ lọc</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
    </div>
  );
});

