import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../../services/daily-ticket.service";
import { 
  Loader2, 
  AlertCircle, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2,
  X
} from "lucide-react";

// Shadcn UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function DailyTicketReportDialog({ open, onClose }) {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ["report-plan-vs-actual"],
    queryFn: () => dailyTicketService.getPlanVsActualReport(),
    enabled: open,
  });

  const reportData = response?.data || [];

  // Extract all unique dates from all plans and actual tickets
  const dateColumns = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    
    const datesSet = new Set();
    reportData.forEach((row) => {
      if (row.plan_days) {
        row.plan_days.forEach(d => {
           if (d && d.working_date) {
               datesSet.add(DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd"));
           }
        });
      }
      if (row.actual_tickets) {
        row.actual_tickets.forEach(t => {
           if (t && t.ticket_date) {
               datesSet.add(DateTime.fromISO(t.ticket_date).toFormat("yyyy-MM-dd"));
           }
        });
      }
    });

    return Array.from(datesSet)
      .sort()
      .map(d => ({
        key: d,
        label: DateTime.fromISO(d).toFormat("dd-MM"),
      }));
  }, [reportData]);

  // Transform data for UI rendering
  const rows = useMemo(() => {
    return reportData.map((row) => {
      let totalActual = 0;
      const actualByDate = {};
      
      if (row.actual_tickets) {
        row.actual_tickets.forEach(t => {
          if (t && t.ticket_date) {
            const dateStr = DateTime.fromISO(t.ticket_date).toFormat("yyyy-MM-dd");
            const qty = parseFloat(t.actual_quantity) || 0;
            if (!actualByDate[dateStr]) actualByDate[dateStr] = 0;
            actualByDate[dateStr] += qty;
            totalActual += qty;
          }
        });
      }

      const planByDate = {};
      if (row.plan_days) {
        row.plan_days.forEach(d => {
          if (d && d.working_date) {
            const dateStr = DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd");
            const hours = parseFloat(d.planned_quantity) / 8 || 0;
            const dinhMuc = parseFloat(row.dinh_muc) || 0;
            const qty = hours * dinhMuc;
            
            if (!planByDate[dateStr]) planByDate[dateStr] = 0;
            planByDate[dateStr] += qty;
          }
        });
      }

      const planQty = parseFloat(row.plan_quantity) || 0;
      const inventory = parseFloat(row.inventory_input) || 0;
      const qtyToProduce = Math.max(0, planQty - inventory); 
      const remaining = Math.max(0, qtyToProduce - totalActual);
      
      let percentage = 0;
      if (qtyToProduce > 0) {
        percentage = (totalActual / qtyToProduce) * 100;
      }

      return {
        ...row,
        planQty,
        inventory,
        qtyToProduce,
        totalActual,
        remaining,
        percentage,
        planByDate,
        actualByDate
      };
    });
  }, [reportData]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[98vw] max-h-[95vh] p-0 flex flex-col border-zinc-200">
        <DialogHeader className="px-6 py-4 bg-zinc-950 text-white flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
                <FileSpreadsheet className="h-5 w-5" />
             </div>
             <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight leading-tight">Báo cáo Kế Hoạch vs Thực Tế</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                   <Clock className="w-3 h-3 text-zinc-400" />
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                     Cập nhật: {DateTime.now().toFormat("dd/MM/yyyy HH:mm")}
                   </span>
                </div>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-zinc-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
               <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
               <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Đang tổng hợp dữ liệu báo cáo...</p>
            </div>
          ) : error ? (
            <div className="p-10">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lỗi</AlertTitle>
                <AlertDescription>Lỗi khi tải báo cáo: {error.message}</AlertDescription>
              </Alert>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10">
              <Alert className="bg-white border-zinc-200 shadow-sm">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-zinc-950 font-black uppercase text-xs">Thông báo</AlertTitle>
                <AlertDescription className="text-zinc-500 font-bold">Chưa có dữ liệu kế hoạch và kết quả sản xuất để báo cáo.</AlertDescription>
              </Alert>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="min-w-max p-4">
                <div className="border border-zinc-200 rounded-xl bg-white shadow-sm overflow-hidden">
                  <Table className="relative">
                    <TableHeader className="bg-zinc-50 border-b-2 border-zinc-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead rowSpan={2} className="w-[50px] sticky left-0 z-40 bg-zinc-50 border-r border-zinc-100 text-center font-black text-[10px] uppercase text-zinc-500">STT</TableHead>
                        <TableHead rowSpan={2} className="w-[60px] sticky left-[50px] z-40 bg-zinc-50 border-r border-zinc-100 text-center font-black text-[10px] uppercase text-zinc-500">Thứ tự</TableHead>
                        <TableHead rowSpan={2} className="w-[200px] sticky left-[110px] z-40 bg-zinc-50 border-r border-zinc-100 font-black text-[10px] uppercase text-zinc-500">Tên mã hàng</TableHead>
                        <TableHead rowSpan={2} className="font-black text-[10px] uppercase text-zinc-500 px-4">Đặc điểm / Nhóm</TableHead>
                        <TableHead rowSpan={2} className="font-black text-[10px] uppercase text-zinc-500 px-4">Công đoạn</TableHead>
                        <TableHead rowSpan={2} className="font-black text-[10px] uppercase text-zinc-500 px-4">Máy</TableHead>
                        
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-zinc-500 px-4">SL đơn</TableHead>
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-zinc-500 px-4">Tồn kho</TableHead>
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-red-500 px-4">Còn lại</TableHead>
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-zinc-500 px-4">Định mức</TableHead>
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-zinc-500 px-4">Tổng công</TableHead>
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-emerald-600 px-4">Thực tế</TableHead>
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-rose-600 px-4">Cần SX</TableHead>
                        <TableHead rowSpan={2} className="text-right font-black text-[10px] uppercase text-indigo-600 px-4">Tỉ lệ %</TableHead>
                        <TableHead rowSpan={2} className="text-center font-black text-[10px] uppercase text-zinc-500 px-4">Bắt đầu</TableHead>
                        <TableHead rowSpan={2} className="text-center font-black text-[10px] uppercase text-zinc-500 px-4">Kết thúc</TableHead>

                        {dateColumns.map((date) => (
                          <TableHead 
                            key={date.key} 
                            colSpan={2} 
                            className="bg-indigo-50/30 text-indigo-700 text-center font-black text-[10px] border-l border-zinc-100 p-1"
                          >
                            {date.label}
                          </TableHead>
                        ))}
                      </TableRow>
                      <TableRow className="hover:bg-transparent">
                        {dateColumns.map((date) => (
                          <React.Fragment key={`sub-${date.key}`}>
                            <TableHead className="text-[9px] font-black uppercase text-amber-600 border-l border-zinc-100 bg-amber-50/30 text-center h-8">KH</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-zinc-400 border-l border-zinc-100 text-center h-8">TT</TableHead>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={row.pp_id || `${row.order_id}-${row.product_id}-${row.product_group_operation_id}`} className="group hover:bg-zinc-50 active:bg-zinc-100 transition-colors">
                          <TableCell className="sticky left-0 bg-white group-hover:bg-zinc-50 z-30 font-black text-[10px] text-zinc-400 text-center border-r border-zinc-100 tabular-nums">{idx + 1}</TableCell>
                          <TableCell className="sticky left-[50px] bg-white group-hover:bg-zinc-50 z-30 font-bold text-center border-r border-zinc-100 tabular-nums">{row.sequence_order || ""}</TableCell>
                          <TableCell className="sticky left-[110px] bg-white group-hover:bg-zinc-50 z-30 font-black text-xs text-zinc-950 border-r border-zinc-100 uppercase tracking-tighter truncate max-w-[200px]">{row.product_name || ""}</TableCell>
                          <TableCell className="text-[11px] font-bold text-zinc-500 max-w-[150px] truncate">{row.product_group_name || ""}</TableCell>
                          <TableCell className="text-[11px] font-black text-zinc-800">{row.operation_name || ""}</TableCell>
                          <TableCell className="text-[11px] font-bold text-zinc-500 italic">{row.machine_name || ""}</TableCell>
                          
                          <TableCell className="text-right text-xs font-bold tabular-nums">{row.planQty?.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-bold tabular-nums text-zinc-400">{row.inventory?.toLocaleString() || "0"}</TableCell>
                          <TableCell className="text-right text-xs font-black tabular-nums text-red-500">{row.qtyToProduce?.toLocaleString()}</TableCell>
                          
                          <TableCell className="text-right text-xs font-bold tabular-nums">{row.dinh_muc || ""}</TableCell>
                          <TableCell className="text-right text-xs font-black tabular-nums text-rose-500">{row.total_required_work ? (parseFloat(row.total_required_work) / 8).toFixed(2) : "0.00"}</TableCell>
                          
                          <TableCell className="text-right text-xs font-black tabular-nums text-emerald-600 bg-emerald-50/20">{row.totalActual.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-black tabular-nums text-rose-600">{row.remaining.toLocaleString()}</TableCell>
                          
                          <TableCell className="text-right">
                             <Badge variant={row.percentage >= 100 ? "success" : row.percentage > 0 ? "warning" : "outline"} className="font-black tabular-nums text-[10px]">
                               {row.percentage.toFixed(0)}%
                             </Badge>
                          </TableCell>
                          
                          <TableCell className="text-center text-[10px] font-bold text-zinc-400 tabular-nums">
                            {row.planned_start_date ? DateTime.fromISO(row.planned_start_date).toFormat("dd-MM") : ""}
                          </TableCell>
                          <TableCell className="text-center text-[10px] font-bold text-zinc-400 tabular-nums">
                            {row.planned_end_date ? DateTime.fromISO(row.planned_end_date).toFormat("dd-MM") : ""}
                          </TableCell>

                          {dateColumns.map(date => {
                             const planQty = row.planByDate[date.key] || 0;
                             const actQty = row.actualByDate[date.key] || 0;
                             
                             return (
                               <React.Fragment key={`data-${row.pp_id || row.order_id}-${date.key}`}>
                                  <TableCell className={`text-right text-[11px] font-black border-l border-zinc-100 tabular-nums ${planQty > 0 ? 'text-amber-600 bg-amber-50/10' : 'text-zinc-200'}`}>
                                    {planQty > 0 ? planQty.toLocaleString() : "-"}
                                  </TableCell>
                                  <TableCell className={`text-right text-[11px] font-black border-l border-zinc-100 tabular-nums ${actQty > 0 ? 'text-zinc-900 bg-zinc-50/50' : 'text-zinc-200'}`}>
                                    {actQty > 0 ? actQty.toLocaleString() : "-"}
                                  </TableCell>
                               </React.Fragment>
                             );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-white border-t border-zinc-200">
           <div className="flex-1 hidden md:block">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">PROSIMEX MES / REPORTING MODULE</p>
           </div>
           <Button onClick={onClose} className="bg-zinc-950 hover:bg-zinc-800 text-white font-black px-10 shadow-lg shadow-zinc-200">
             <CheckCircle2 className="mr-2 h-4 w-4" /> Đóng báo cáo
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
