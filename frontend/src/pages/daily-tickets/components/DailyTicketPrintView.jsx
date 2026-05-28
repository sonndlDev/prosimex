import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../../services/daily-ticket.service";
import { Printer, Loader2, ArrowLeft } from "lucide-react";

// Shadcn UI
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function DailyTicketPrintView({ open, ticketId, onClose }) {
  const printRef = useRef();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["daily-ticket", ticketId],
    queryFn: () => dailyTicketService.getById(ticketId),
    enabled: !!ticketId,
  });

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const originalContents = document.body.innerHTML;

    // Add some print-specific styles temporarily
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
      @media print {
        body { margin: 0; padding: 0; background: white; font-family: 'Times New Roman', serif; font-size: 11pt; }
        @page { size: A4 landscape; margin: 10mm; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #000 !important; padding: 4px; text-align: center; vertical-align: middle; }
      }
    `;
    document.head.appendChild(printStyle);

    document.body.innerHTML = printContent.innerHTML;
    window.print();

    // Restore original contents
    document.body.innerHTML = originalContents;
    document.head.removeChild(printStyle);
    window.location.reload(); // Reload to re-mount React tree properly
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md p-10 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-black text-[rgb(var(--c-ink-4))] uppercase tracking-widest">Đang tải bản in...</p>
        </DialogContent>
      </Dialog>
    );
  }

  const ticketDate = ticket ? DateTime.fromISO(ticket.ticket_date).toFormat("dd/MM/yyyy") : "";
  const firstMachine = ticket?.items?.[0]?.pgo_machine_name || "";
  const ticketCode = ticket ? `${DateTime.fromISO(ticket.ticket_date).toFormat("yyyyMMdd")}${ticket.id}` : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-7xl max-h-[85vh] p-0 !flex flex-col !overflow-hidden bg-[rgb(var(--c-s2))] border-[rgb(var(--c-line-2))] gap-0">
        <div className="flex-1 overflow-auto0/10 p-4 md:p-8">
          <div className="flex justify-start min-w-max">
            {/* Printable Area */}
            <div
              ref={printRef}
              className="bg-white text-black p-8 md:p-12 shadow-2xl w-[297mm] min-h-[210mm] mx-auto"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              <table className="w-full border-collapse table-fixed border-2 border-black">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td colSpan={2} className="border border-black p-2 text-left font-bold text-sm">SLK:</td>
                    <td colSpan={3} className="border border-black p-4 text-center">
                      <div className="text-3xl font-black uppercase tracking-tight">PHIẾU SẢN XUẤT</div>
                      {/* <div className="text-sm font-normal mt-1">Mã số phiếu: <span className="font-bold">{ticketCode}</span></div> */}
                    </td>
                    <td colSpan={2} className="border border-black p-2 text-center font-black text-xl italic tracking-tighter">PROSIMEX MES</td>
                  </tr>
                  {/* Row 2 */}
                  <tr>
                    <td className="border border-black p-2 text-left font-bold text-xs uppercase/50">NGÀY SẢN XUẤT:</td>
                    <td className="border border-black p-2 text-center font-black text-base">{ticketDate}</td>
                    <td colSpan={2} className="border border-black p-2 text-right font-bold pr-12 text-xs uppercase/50">CA SX: ....................</td>
                    <td className="border border-black p-2 text-left font-bold text-xs uppercase/50">MÃ SỐ CN:</td>
                    <td colSpan={2} className="border border-black p-2 text-center text-[10px] leading-tight text-[rgb(var(--c-ink-4))]">Mã số phiếu: {ticketCode}</td>
                  </tr>
                  {/* Row 3 */}
                  <tr>
                    <td className="border border-black p-2 text-left font-bold text-xs uppercase/50">MÁY MÓC / LINE:</td>
                    <td className="border border-black p-2 text-center font-black text-base italic">{firstMachine}</td>
                    <td colSpan={2} className="border border-black p-2 text-right font-bold pr-12 text-xs uppercase/50">SỐ THẺ: ....................</td>
                    <td colSpan={2} className="border border-black p-2 text-left font-bold text-xs uppercase/50 italic border-r-0">HỌ VÀ TÊN: ...........................................</td>
                    <td className="border border-black p-2 text-center border-l-0"></td>
                  </tr>
                  {/* Headers */}
                  <tr className="bg-[rgb(var(--c-s2))] font-bold text-[11px] uppercase tracking-tighter">
                    <td className="border border-black p-3 text-center">KHÁCH HÀNG</td>
                    <td className="border border-black p-3 text-center">ĐƠN HÀNG (PO)</td>
                    <td className="border border-black p-3 text-center">NHÓM MÃ</td>
                    <td className="border border-black p-3 text-center">MÃ HÀNG CHI TIẾT</td>
                    <td className="border border-black p-3 text-center">CÔNG ĐOẠN</td>
                    <td className="border border-black p-3 text-center">SẢN LƯỢNG<br />KẾ HOẠCH</td>
                    <td className="border border-black p-3 text-center bg-[rgb(var(--c-s3))]">KẾT QUẢ<br />THỰC TẾ</td>
                  </tr>
                  {/* Items */}
                  {ticket?.items?.map((item, index) => (
                    <tr key={index} className="h-14">
                      <td className="border border-black p-2 text-center text-[11px] font-bold leading-tight">{item.customer_name || ""}</td>
                      <td className="border border-black p-2 text-center text-[11px] tabular-nums">{item.po_customer || ""}</td>
                      <td className="border border-black p-2 text-center text-[11px] italic">{item.product_group_name || ""}</td>
                      <td className="border border-black p-2 text-left font-bold text-[13px] uppercase leading-tight tracking-tight">{item.product_name || ""}</td>
                      <td className="border border-black p-2 text-center text-[11px] font-bold">{item.operation_name || item.pgo_operation_name}</td>
                      <td className="border border-black p-2 text-center font-bold text-xl tabular-nums">
                        {parseFloat(item.planned_quantity).toLocaleString()}
                      </td>
                      <td className="border border-black p-2 text-center/20"></td>
                    </tr>
                  ))}
                  {/* Ghi chú */}
                  <tr>
                    <td colSpan={7} className="border border-black p-2 text-left h-24 align-top">
                      <span className="font-bold text-[10px] uppercase tracking-widest text-[rgb(var(--c-ink-4))]">GHI CHÚ SẢN XUẤT:</span>
                    </td>
                  </tr>
                  {/* Ký tên section */}
                  <tr>
                    <td colSpan={2} className="border border-black p-4 text-center font-bold text-[11px] uppercase h-32 align-top">CÔNG NHÂN KÝ TÊN</td>
                    <td colSpan={2} className="border border-black p-4 text-center font-bold text-[11px] uppercase h-32 align-top">QC KIỂM TRA</td>
                    <td colSpan={3} className="border border-black p-4 text-center font-bold text-[11px] uppercase h-32 align-top">QUẢN LÝ XÁC NHẬN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-auto px-6 pt-4 pb-8 bg-zinc-950 border-t border-zinc-800 flex flex-row items-center justify-between relative z-10">
          <Button variant="ghost" onClick={onClose} className="text-[rgb(var(--c-ink-4))] hover:text-white hover:bg-white/10 font-bold px-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Trở về
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 shadow-lg shadow-indigo-500/20 h-11"
          >
            <Printer className="mr-2 h-4 w-4" /> In Phiếu Sản Xuất
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
