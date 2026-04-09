import React, { useState } from "react";
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
import { Plus, Printer, PencilLine, Trash2, BarChart2 } from "lucide-react";
import DailyTicketFormDialog from "./components/DailyTicketFormDialog";
import DailyTicketPrintView from "./components/DailyTicketPrintView";
import DailyTicketReportDialog from "./components/DailyTicketReportDialog";
import GenericTable from "@/components/GenericTable";
import { getAuditColumn } from "@/utils/audit";

export default function DailyTicketPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const { data: ticketData, isLoading, error } = useQuery({
    queryKey: ["daily-tickets", page, pageSize],
    queryFn: () => dailyTicketService.getAll({ page, limit: pageSize }),
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
      id: "order_name",
      label: "Đơn hàng",
      className: "font-bold text-zinc-950",
    },
    {
      id: "po_customer",
      label: "PO",
      className: "text-zinc-500",
    },
    {
      id: "product_name",
      label: "Mã SP",
      className: "font-medium",
    },
    {
      id: "remaining_quantity",
      label: "SL Order",
      className: "text-right font-bold text-orange-600",
      format: (val) => parseFloat(val) || 0
    },
    {
      id: "operation_name",
      label: "Công đoạn",
      format: (val, row) => val || row.fallback_operation_name || "N/A"
    },
    {
      id: "planned_quantity",
      label: "SL cần SX",
      className: "text-right font-bold text-zinc-900",
      format: (val) => parseFloat(val) || 0
    },
    {
      id: "actual_quantity",
      label: "SL thực tế",
      className: "text-right font-bold text-blue-600",
      format: (val) => parseFloat(val) || 0
    },
    {
      id: "notes",
      label: "Ghi chú",
      className: "text-zinc-500 italic text-xs",
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
          <Button variant="outline" onClick={() => setIsReportOpen(true)} className="h-11 px-6 rounded-xl border-zinc-200 hover:bg-zinc-50 font-bold gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            Báo cáo KH vs TT
          </Button>
          <Button onClick={() => { setSelectedTicketId(null); setIsFormOpen(true); }} className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 gap-2">
            <Plus className="w-4 h-4" />
            Tạo Phiếu Mới
          </Button>
        </div>
      </div>

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
      {isReportOpen && (
        <DailyTicketReportDialog
          open={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
