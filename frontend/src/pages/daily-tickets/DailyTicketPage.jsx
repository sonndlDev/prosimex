import React, { useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { dailyTicketService } from "../../services/daily-ticket.service";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Printer, PencilLine, Trash2, BarChart2, Eye, LayoutGrid, Search, X, RotateCcw } from "lucide-react";
import DailyTicketFormDialog from "./components/DailyTicketFormDialog";
import DailyTicketPrintView from "./components/DailyTicketPrintView";
import GenericTable from "@/components/GenericTable";
import { getAuditColumn } from "@/utils/audit";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function DailyTicketPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const initialFilters = {
    startDate: "",
    endDate: "",
    status: "ALL",
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
    queryFn: () => dailyTicketService.getAll({
      page,
      limit: pageSize,
      ...appliedFilters
    }),
  });

  const tickets = ticketData?.data || [];
  const totalItems = ticketData?.total || 0;


  const deleteMutation = useMutation({
    mutationFn: dailyTicketService.delete,
    onSuccess: () => {
      toast.success("Đã xoá phiếu sản xuất!");
      queryClient.invalidateQueries(["daily-tickets"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Lỗi khi xoá phiếu!");
    },
  });

  const handleDelete = (id) => {
    Swal.fire({
      title: "Xác nhận xoá?",
      text: "Bạn có chắc chắn muốn xoá phiếu sản xuất này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#09090b",
      cancelButtonColor: "#e4e4e7",
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
    }).then((result) => {
      if (result.isConfirmed) deleteMutation.mutate(id);
    });
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
      label: "Trạng thái",
      format: (val) => val === "COMPLETED" ? (
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-semibold text-[10px] px-1.5 h-5">
          Xong
        </Badge>
      ) : (
        <Badge variant="secondary" className="font-semibold text-[10px] px-1.5 h-5">
          Nháp
        </Badge>
      )
    },
    getAuditColumn()
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Phiếu Sản Xuất Hàng Ngày</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Quản lý và theo dõi lịch sử sản xuất</p>
        </div>
        <div className="flex items-center gap-3">
          {/* <Button variant="outline" onClick={() => navigate("/plan-vs-actual")} className="h-11 px-6 rounded-xl border-zinc-200 hover:bg-zinc-50 font-bold gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            Báo cáo KH vs TT
          </Button> */}
          <Button onClick={() => { setSelectedTicketId(null); setIsFormOpen(true); }} className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 gap-2">
            <Plus className="w-4 h-4" />
            Tạo Phiếu Mới
          </Button>
        </div>
      </div>

      <DailyTicketFilterBar
        onSearch={handleSearch}
        onReset={handleReset}
        initialFilters={initialFilters}
      />



      {/* Table with GenericTable */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
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
          renderActions={(item) => (
            <div className="flex items-center gap-1">
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

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => { setSelectedTicketId(item.master_id); setIsFormOpen(true); }}
                    className="p-2 rounded-xl text-zinc-400 hover:text-blue-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-blue-100"
                  >
                    <PencilLine className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">Chỉnh sửa phiếu</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => handleDelete(item.master_id)}
                    disabled={item.ticket_status === "COMPLETED"}
                    className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-red-100 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">Xoá phiếu</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          onBulkDelete={(ids) => {
            const deletableIds = ids.filter(id => {
              const row = tickets.find(t => String(t.id) === String(id));
              return row && row.ticket_status !== "COMPLETED";
            });
            const skipped = ids.length - deletableIds.length;
            if (deletableIds.length === 0) {
              toast.error("Không có phiếu nào có thể xóa (phiếu đã hoàn thành không được xóa).");
              return;
            }
            const msg = skipped > 0
              ? `Xóa ${deletableIds.length} phiếu? (${skipped} phiếu đã hoàn thành sẽ bị bỏ qua)`
              : `Xóa ${deletableIds.length} phiếu sản xuất?`;
            if (window.confirm(msg)) {
              const ticketIdsToDelete = new Set();
              deletableIds.forEach(id => {
                const row = tickets.find(t => String(t.id) === String(id));
                if (row) ticketIdsToDelete.add(row.master_id);
              });
              ticketIdsToDelete.forEach(tId => deleteMutation.mutate(tId));
            }
          }}
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
          <Select
            value={tempFilters.ticket_status}
            onValueChange={val => setTempFilters(prev => ({ ...prev, ticket_status: val }))}
          >
            <SelectTrigger className="h-10 text-[11px] font-bold border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white transition-all shadow-sm">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-zinc-400 whitespace-nowrap uppercase tracking-tighter">Trạng thái:</span>
                <SelectValue placeholder="Tất cả" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả phiêú</SelectItem>
              <SelectItem value="DRAFT">Nháp</SelectItem>
              <SelectItem value="COMPLETED">Xong</SelectItem>
            </SelectContent>
          </Select>

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
