import React, { useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { dailyTicketService } from "../../services/daily-ticket.service";
import * as XLSX from 'xlsx';
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Printer, PencilLine, Trash2, BarChart2, Eye, LayoutGrid, Search, X, RotateCcw, FileSpreadsheet, Check } from "lucide-react";
import DailyTicketFormDialog from "./components/DailyTicketFormDialog";
import DailyTicketPrintView from "./components/DailyTicketPrintView";
import GenericTable from "@/components/GenericTable";
import { getAuditColumn } from "@/utils/audit";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "../../context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function ApprovalTicketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const initialFilters = {
    startDate: "",
    endDate: "",
    ticket_status: "PENDING_APPROVAL",
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

  const { data: ticketData, isLoading, error } = useQuery({
    queryKey: ["daily-tickets", page, pageSize, appliedFilters],
    queryFn: async () => dailyTicketService.getAll({
      page,
      limit: pageSize,
      ...appliedFilters,
      status: "PENDING_APPROVAL"
    }),
  });

  const tickets = ticketData?.data || [];
  const totalItems = ticketData?.total || 0;



  const approveMutation = useMutation({
    mutationFn: dailyTicketService.approve,
    onSuccess: () => {
      toast.success("Đã duyệt phiếu sản xuất!");
      queryClient.invalidateQueries(["daily-tickets"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Lỗi khi duyệt phiếu!");
    },
  });

  const handleApprove = (id) => {
    Swal.fire({
      title: "Xác nhận duyệt?",
      text: "Bạn có chắc chắn muốn duyệt phiếu sản xuất này?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#e4e4e7",
      confirmButtonText: "Duyệt",
      cancelButtonText: "Huỷ",
    }).then((result) => {
      if (result.isConfirmed) approveMutation.mutate(id);
    });
  };

  const rejectMutation = useMutation({
    mutationFn: dailyTicketService.reject,
    onSuccess: () => {
      toast.success("Đã từ chối phiếu sản xuất!");
      queryClient.invalidateQueries(["daily-tickets"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Lỗi khi từ chối phiếu!");
    },
  });

  const handleReject = (id) => {
    Swal.fire({
      title: "Xác nhận từ chối?",
      text: "Bạn có chắc chắn muốn từ chối phiếu sản xuất này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#e4e4e7",
      confirmButtonText: "Từ chối",
      cancelButtonText: "Huỷ",
    }).then((result) => {
      if (result.isConfirmed) rejectMutation.mutate(id);
    });
  };



  const handleExportExcel = async () => {
    try {
      const params = {
        ...appliedFilters,
      };
      if (selectedIds.length > 0) {
        params.ids = selectedIds.join(',');
      }

      const data = await dailyTicketService.exportDetailed(params);
      if (!data || data.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }

      const formattedData = data.map((item, index) => ({
        "STT": index + 1,
        "Mã Phiếu": `${DateTime.fromISO(item.ticket_date).toFormat("yyyyMMdd")}${item.master_id}`,
        "Ngày": DateTime.fromISO(item.ticket_date).toFormat("dd/MM/yyyy"),
        "Máy": item.machine_name || "",
        "Đơn hàng": item.order_name || "",
        "Mã đơn (PO)": item.order_code || item.po_customer || "",
        "Mã SP": item.product_name || "",
        "Công đoạn": item.operation_name || "",
        "SL Kế hoạch": parseFloat(item.planned_quantity) || 0,
        "SL Thực tế": parseFloat(item.actual_quantity) || 0,
        "Chênh lệch": (parseFloat(item.actual_quantity) || 0) - (parseFloat(item.planned_quantity) || 0),
        "Ghi chú": item.notes || "",
        "Trạng thái duyệt": item.ticket_status === 'COMPLETED' ? 'Xong' : item.ticket_status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : item.ticket_status === 'REJECTED' ? 'Từ chối' : item.ticket_status === 'APPROVED' ? 'Đã duyệt' : 'Nháp',
        "Người tạo": item.creator_name || "Hệ thống",
        "Ngày tạo": DateTime.fromISO(item.created_at).toFormat("dd/MM/yyyy HH:mm")
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "PhieuSanXuat");

      const wscols = [
        { wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
      ];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `PhieuSanXuat_${DateTime.now().toFormat("yyyyMMdd_HHmm")}.xlsx`);
      toast.success("Đã xuất file Excel!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Lỗi khi xuất file Excel");
    }
  };

  const columns = [
    {
      id: "id",
      label: "Mã số phiếu",
      className: "font-bold text-zinc-950",
      format: (val, row) => `${DateTime.fromISO(row.ticket_date).toFormat("yyyyMMdd")}${row.master_id}`
    },
    {
      id: "ticket_date",
      label: "Ngày",
      className: "font-semibold text-zinc-700 whitespace-nowrap",
      format: (val) => DateTime.fromISO(val).toFormat("dd/MM")
    },
    {
      id: "machine_name",
      label: "Máy",
      className: "font-bold text-indigo-600 italic",
    },
    {
      id: "order_name",
      label: "Đơn hàng",
      className: "font-bold text-zinc-950 max-w-[150px] truncate",
    },
    {
      id: "po_customer",
      label: "PO",
      className: "text-zinc-500 max-w-[100px] truncate",
    },
    {
      id: "product_name",
      label: "Mã SP",
      className: "font-medium max-w-[150px] truncate",
    },
    {
      id: "planned_quantity",
      label: "Tổng SL KH",
      className: "text-right font-bold text-zinc-900",
      format: (val) => parseFloat(val) || 0
    },
    {
      id: "actual_quantity",
      label: "Tổng SL TT",
      className: "text-right font-bold text-blue-600",
      format: (val) => parseFloat(val) || 0
    },
    {
      id: "operation_name",
      label: "Công đoạn",
      className: "max-w-[200px] truncate",
      format: (val, row) => val || row.fallback_operation_name || "N/A"
    },
    {
      id: "notes",
      label: "Ghi chú",
      className: "text-zinc-500 italic text-xs max-w-[100px] truncate",
    },
    {
      id: "ticket_status",
      label: "Trạng thái duyệt",
      format: (val) => {
        if (val === "PENDING_APPROVAL") return (
          <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-semibold text-[10px] px-1.5 h-5">
            Chờ duyệt
          </Badge>
        );
        if (val === "APPROVED") return (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px] px-1.5 h-5">
            Đã duyệt
          </Badge>
        );
        if (val === "REJECTED") return (
          <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-[10px] px-1.5 h-5">
            Từ chối
          </Badge>
        );
        if (val === "COMPLETED") return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-semibold text-[10px] px-1.5 h-5">
            Xong
          </Badge>
        );
        return (
          <Badge variant="secondary" className="font-semibold text-[10px] px-1.5 h-5">
            Nháp
          </Badge>
        );
      }
    },
    getAuditColumn()
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Duyệt Phiếu Sản Xuất</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Quản lý và phê duyệt các phiếu tạo thủ công</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="h-11 px-6 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất Excel {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </div>
      </div>

      <div className="flex-shrink-0">
        <DailyTicketFilterBar
          onSearch={handleSearch}
          onReset={handleReset}
          initialFilters={initialFilters}
        />
      </div>

      {/* Table with GenericTable */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <GenericTable
          data={tickets}
          columns={columns}
          isLoading={isLoading}
          error={error}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          selectedRows={selectedIds}
          onSelectionChange={setSelectedIds}
          maxHeight="100%"
          renderActions={(item) => (
            <div className="flex items-center gap-1">
              {item.ticket_status === 'PENDING_APPROVAL' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => handleApprove(item.master_id)}
                      className="p-2 rounded-xl text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-emerald-200"
                    >
                      <Check className="w-4 h-4" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">Duyệt phiếu</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {item.ticket_status === 'PENDING_APPROVAL' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => handleReject(item.master_id)}
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-rose-100"
                    >
                      <X className="w-4 h-4" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">Từ chối phiếu</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => { setSelectedTicketId(item.master_id); setIsPrintOpen(true); }}
                    className="p-2 rounded-xl text-zinc-400 hover:text-violet-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-violet-100"
                  >
                    <Printer className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">In Phiếu</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {item.ticket_status === 'PENDING_APPROVAL' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => handleApprove(item.master_id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-orange-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-orange-100"
                    >
                      <Check className="w-4 h-4" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">Duyệt phiếu</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => { setSelectedTicketId(item.master_id); setIsFormOpen(true); }}
                    className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-blue-100"
                  >
                    <PencilLine className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">Xem chi tiết</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          onBulkDelete={undefined}
        />
      </div>

      {isFormOpen && (
        <DailyTicketFormDialog
          open={isFormOpen}
          ticketId={selectedTicketId}
          onClose={() => { setIsFormOpen(false); setSelectedTicketId(null); }}
        />
      )}
      {isPrintOpen && selectedTicketId && (
        <DailyTicketPrintView
          open={isPrintOpen}
          ticketId={selectedTicketId}
          onClose={() => { setIsPrintOpen(false); setSelectedTicketId(null); }}
        />
      )}
    </div>
  );
}

const DailyTicketFilterBar = memo(({ onSearch, onReset, initialFilters }) => {
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
        {/* Search Input */}
        <div className="w-full xl:w-[320px] shrink-0">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Mã đơn, mã SP, định mức..."
              value={tempFilters.search}
              onChange={e => setTempFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 h-10 text-sm font-medium border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white focus:bg-white transition-all focus-visible:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Trạng thái */}


          {/* Khoảng ngày */}
          <div className="flex items-center gap-1 bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-2.5 h-10 group focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all shadow-sm overflow-hidden">
            <span className="text-[10px] font-black text-zinc-400 uppercase whitespace-nowrap mr-1 tracking-tighter">Ngày:</span>
            <Input
              type="date"
              value={tempFilters.startDate}
              onChange={e => setTempFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
            />
            <span className="text-zinc-300 mx-0.5">—</span>
            <Input
              type="date"
              value={tempFilters.endDate}
              onChange={e => setTempFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="submit"
            className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
          >
            Tìm kiếm
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="w-10 h-10 p-0 border-zinc-200/80 text-zinc-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-[10px] font-bold">Đặt lại bộ lọc</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
    </div>
  );
});