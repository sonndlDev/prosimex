import React from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import { 
  Loader2, 
  AlertCircle, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle2,
  X
} from "lucide-react";
import { DateTime } from "luxon";

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

export default function CompletionReportDialog({ orderId, open, onClose }) {
  const { data: response, isLoading, error } = useQuery({
    queryKey: ["order-completion", orderId],
    queryFn: () => orderService.getCompletionReport(orderId),
    enabled: !!orderId && open,
  });

  const rows = response?.data || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[1000px] max-h-[90vh] p-0 flex flex-col border-zinc-200 shadow-2xl">
        <DialogHeader className="px-6 py-4 bg-zinc-950 text-white flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
                <FileSpreadsheet className="h-5 w-5" />
             </div>
             <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight leading-tight">Báo cáo Hoàn Thành Đơn Hàng</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                   <Clock className="w-3 h-3 text-zinc-400" />
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                     Truy xuất: {DateTime.now().toFormat("dd/MM/yyyy HH:mm")}
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
            <div className="flex flex-col items-center justify-center p-20 gap-4">
               <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
               <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Đang tính toán...</p>
            </div>
          ) : error ? (
            <div className="p-10">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Lỗi</AlertTitle>
                <AlertDescription>Lỗi tải báo cáo: {error.message}</AlertDescription>
              </Alert>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10">
              <Alert className="bg-white border-zinc-200">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-zinc-950 font-black uppercase text-xs">Thông báo</AlertTitle>
                <AlertDescription className="text-zinc-500 font-bold">Chưa có mã hàng nào trong đơn hàng này.</AlertDescription>
              </Alert>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="min-w-max p-6">
                <div className="border border-zinc-200 rounded-xl bg-white shadow-sm overflow-hidden">
                  <Table className="relative min-w-full">
                    <TableHeader className="bg-[#8ec28b] border-b-2 border-zinc-300">
                      <TableRow className="hover:bg-transparent border-b-zinc-400">
                        <TableHead className="w-[50px] text-center font-black text-[11px] text-zinc-800 border-r border-[#7ab377]">STT</TableHead>
                        <TableHead className="w-[180px] font-black text-[11px] text-zinc-800 border-r border-[#7ab377]">Mã mặt hàng</TableHead>
                        <TableHead className="w-[120px] text-right font-black text-[11px] text-zinc-800 border-r border-[#7ab377]">Số lượng yêu cầu</TableHead>
                        <TableHead className="w-[100px] text-right font-black text-[11px] text-zinc-800 border-r border-[#7ab377]">SX</TableHead>
                        <TableHead className="w-[100px] text-right font-black text-[11px] text-zinc-800 border-r border-[#7ab377]">ĐI XMS</TableHead>
                        <TableHead className="w-[100px] text-right font-black text-[11px] text-zinc-800 border-r border-[#7ab377]">XMS VỀ</TableHead>
                        <TableHead className="w-[100px] text-right font-black text-[11px] text-zinc-800 border-r border-[#7ab377]">ĐÓNG GÓI</TableHead>
                        <TableHead className="w-[120px] text-right font-black text-[11px] text-zinc-800 border-l-2 border-zinc-400 uppercase tracking-widest">% Hoàn thành</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={row.product_id} className="hover:bg-blue-50/50 transition-colors border-b border-zinc-200">
                          <TableCell className="font-bold text-[12px] text-zinc-600 text-center border-r border-zinc-200 tabular-nums">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-black text-[12px] text-zinc-950 border-r border-zinc-200 whitespace-nowrap">
                            {row.product_code}
                          </TableCell>
                          <TableCell className="text-right text-[12px] font-bold tabular-nums border-r border-zinc-200 text-zinc-900 bg-zinc-50">
                            {row.required_quantity > 0 ? parseFloat(row.required_quantity).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="text-right text-[12px] font-bold tabular-nums border-r border-zinc-200">
                            {row.sx_quantity > 0 ? parseFloat(row.sx_quantity).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="text-right text-[12px] font-bold tabular-nums border-r border-zinc-200">
                            {row.plating_out_quantity > 0 ? parseFloat(row.plating_out_quantity).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="text-right text-[12px] font-bold tabular-nums border-r border-zinc-200">
                            {row.plating_returned_quantity > 0 ? parseFloat(row.plating_returned_quantity).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell className="text-right text-[12px] font-bold tabular-nums border-r border-zinc-200">
                            {row.packaging_out_quantity > 0 ? parseFloat(row.packaging_out_quantity).toLocaleString() : "-"}
                          </TableCell>
                          
                          <TableCell className="text-right border-l-2 border-zinc-400 bg-zinc-50/80">
                             <Badge variant={row.completion_percentage >= 100 ? "success" : row.completion_percentage > 0 ? "warning" : "outline"} className="font-black text-[11px] tabular-nums">
                               {row.completion_percentage.toFixed(0)}%
                             </Badge>
                          </TableCell>
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
           <Button onClick={onClose} className="bg-zinc-950 hover:bg-zinc-800 text-white font-black px-10">
             <CheckCircle2 className="mr-2 h-4 w-4" /> Đóng báo cáo
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
