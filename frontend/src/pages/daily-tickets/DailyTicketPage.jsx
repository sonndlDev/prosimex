import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { dailyTicketService } from "../../services/daily-ticket.service";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Printer, PencilLine, Trash2, BarChart2 } from "lucide-react";
import DailyTicketFormDialog from "./components/DailyTicketFormDialog";
import DailyTicketPrintView from "./components/DailyTicketPrintView";
import DailyTicketReportDialog from "./components/DailyTicketReportDialog";

export default function DailyTicketPage() {
  const queryClient = useQueryClient();
  const [page] = useState(1);
  const rowsPerPage = 10;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-tickets", page, rowsPerPage],
    queryFn: () => dailyTicketService.getAll({ page, limit: rowsPerPage }),
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Phiếu Sản Xuất Hàng Ngày</h2>
          <p className="text-zinc-500 text-sm font-medium mt-0.5">Quản lý và theo dõi các phiếu sản xuất theo ngày</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsReportOpen(true)} className="gap-2 font-semibold">
            <BarChart2 className="w-4 h-4" />
            Báo cáo KH vs TT
          </Button>
          <Button onClick={() => { setSelectedTicketId(null); setIsFormOpen(true); }} className="gap-2 font-semibold">
            <Plus className="w-4 h-4" />
            Tạo Phiếu Mới
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="w-[180px] font-semibold">Mã số phiếu</TableHead>
              <TableHead className="font-semibold">Ngày sản xuất</TableHead>
              <TableHead className="font-semibold">Trạng thái</TableHead>
              <TableHead className="font-semibold">Người lập</TableHead>
              <TableHead className="font-semibold">Ngày tạo</TableHead>
              <TableHead className="text-center font-semibold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-zinc-400 font-medium">
                  Chưa có phiếu sản xuất nào.
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((item) => (
                <TableRow key={item.id} className="cursor-default">
                  <TableCell className="font-bold text-zinc-950">
                    {DateTime.fromISO(item.ticket_date).toFormat("yyyyMMdd")}_#{item.id}
                  </TableCell>
                  <TableCell className="font-semibold text-zinc-700">
                    {DateTime.fromISO(item.ticket_date).toFormat("dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {item.status === "COMPLETED" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-semibold">
                        Đã nhập kết quả
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-semibold">
                        Mới/Bản nháp
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-600">{item.created_by_name}</TableCell>
                  <TableCell className="text-zinc-500 text-sm">
                    {DateTime.fromISO(item.created_at).toFormat("dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => { setSelectedTicketId(item.id); setIsPrintOpen(true); }}
                            className="p-2 rounded-md text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>In Phiếu</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => { setSelectedTicketId(item.id); setIsFormOpen(true); }}
                            className="p-2 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <PencilLine className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Chỉnh sửa phiếu</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={item.status === "COMPLETED"}
                            className="p-2 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Xoá phiếu</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
