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
          <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Đang tải bản in...</p>
        </DialogContent>
      </Dialog>
    );
  }

  const ticketDate = ticket ? DateTime.fromISO(ticket.ticket_date).toFormat("dd/MM/yyyy") : "";
  const firstMachine = ticket?.items?.[0]?.pgo_machine_name || "";
  const ticketCode = ticket ? `${DateTime.fromISO(ticket.ticket_date).toFormat("yyyyMMdd")}${ticket.id}` : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-7xl max-h-[85vh] p-0 !flex flex-col !overflow-hidden bg-zinc-100 border-zinc-200 gap-0">
        <div className="flex-1 overflow-auto bg-zinc-500/10 p-4 md:p-8">
          <div className="flex justify-start min-w-max">
            {/* Printable Area */}
            <div
              ref={printRef}
              className="bg-white text-black p-8 md:p-12 shadow-2xl w-[297mm] min-h-[210mm] mx-auto"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              <table className="w-full border-collapse table-fixed border-2 border-black">
                <colgroup>
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <tbody>
                  {/* Row 1 */}
                  <tr>
                    <td colSpan={2} className="border border-black p-2 text-left font-bold text-sm">SLK:</td>
                    <td colSpan={5} className="border border-black p-4 text-center">
                      <div className="text-3xl font-black uppercase tracking-tight">PHIẾU SẢN XUẤT</div>
                    </td>
                    <td colSpan={2} className="border border-black p-2 text-center font-black text-xl italic tracking-tighter">PROSIMEX MES</td>
                  </tr>
                  {/* Row 2 */}
                  <tr>
                    <td className="border border-black p-2 text-left font-bold text-xs uppercase bg-zinc-50/50">NGÀY SẢN XUẤT:</td>
                    <td className="border border-black p-2 text-center font-black text-base">{ticketDate}</td>
                    <td colSpan={2} className="border border-black p-2 text-right font-bold pr-12 text-xs uppercase bg-zinc-50/50">CA SX: ....................</td>
                    <td className="border border-black p-2 text-left font-bold text-xs uppercase bg-zinc-50/50">MÃ SỐ CN:</td>
                    <td colSpan={4} className="border border-black p-2 text-center text-[10px] leading-tight text-zinc-400">Mã số phiếu: {ticketCode}</td>
                  </tr>
                  {/* Row 3 */}
                  <tr>
                    <td className="border border-black p-2 text-left font-bold text-xs uppercase bg-zinc-50/50">MÁY MÓC / LINE:</td>
                    <td className="border border-black p-2 text-center font-black text-base italic">{firstMachine}</td>
                    <td colSpan={2} className="border border-black p-2 text-right font-bold pr-12 text-xs uppercase bg-zinc-50/50">SỐ THẺ: ....................</td>
                    <td colSpan={5} className="border border-black p-2 text-left font-bold text-xs uppercase bg-zinc-50/50 italic">HỌ VÀ TÊN: ...........................................</td>
                  </tr>
                  {/* Headers */}
                  <tr className="bg-zinc-100 font-bold text-[10px] uppercase tracking-tighter">
                    <td className="border border-black p-2 text-center">KHÁCH HÀNG</td>
                    <td className="border border-black p-2 text-center">ĐƠN HÀNG (PO)</td>
                    <td className="border border-black p-2 text-center">NHÓM MÃ</td>
                    <td className="border border-black p-2 text-center">MÃ HÀNG CHI TIẾT</td>
                    <td className="border border-black p-2 text-center">CÔNG ĐOẠN / GHI CHÚ</td>
                    <td className="border border-black p-2 text-center">ĐỊNH MỨC</td>
                    <td className="border border-black p-2 text-center">SỐ CÔNG</td>
                    <td className="border border-black p-2 text-center">SẢN LƯỢNG<br />KẾ HOẠCH</td>
                    <td className="border border-black p-2 text-center bg-zinc-200">KẾT QUẢ<br />THỰC TẾ</td>
                  </tr>
                  {/* Items */}
                  {ticket?.items?.map((item, index) => {
                    const dinhMuc = parseFloat(item.dinh_muc) || 0;
                    const plannedQty = parseFloat(item.planned_quantity) || 0;
                    const soCong = dinhMuc > 0 ? (plannedQty / dinhMuc).toFixed(2) : "—";
                    const opNote = item.operation_note || item.notes || "";
                    const opName = item.operation_name || item.pgo_operation_name || "";
                    return (
                      <tr key={index} className="h-14">
                        <td className="border border-black p-2 text-center text-[10px] font-bold leading-tight">{item.customer_code || ""}</td>
                        <td className="border border-black p-2 text-center text-[10px] tabular-nums" style={{ wordBreak: "break-all" }}>{item.po_customer || ""}</td>
                        <td className="border border-black p-2 text-center text-[10px] italic" style={{ wordBreak: "break-word" }}>{item.product_group_name || ""}</td>
                        <td className="border border-black p-2 text-left font-bold text-[12px] uppercase leading-tight tracking-tight" style={{ wordBreak: "break-word" }}>{item.product_name || ""}</td>
                        <td className="border border-black p-2 text-center text-[10px] font-bold align-top" style={{ wordBreak: "break-word" }}>
                          <div>{opName}</div>
                          {opNote && (
                            <div className="mt-1 text-[9px] font-normal text-zinc-500 italic border-t border-zinc-300 pt-1" style={{ wordBreak: "break-word" }}>
                              {opNote}
                            </div>
                          )}
                        </td>
                        <td className="border border-black p-2 text-center text-[11px] tabular-nums">
                          {dinhMuc > 0 ? dinhMuc.toLocaleString() : ""}
                        </td>
                        <td className="border border-black p-2 text-center text-[11px] tabular-nums font-bold">
                          {soCong}
                        </td>
                        <td className="border border-black p-2 text-center font-bold text-xl tabular-nums">
                          {plannedQty.toLocaleString()}
                        </td>
                        <td className="border border-black p-2 text-center bg-zinc-50/20"></td>
                      </tr>
                    );
                  })}
                  {/* Ghi chú */}
                  <tr>
                    <td colSpan={9} className="border border-black p-2 text-left h-24 align-top">
                      <span className="font-bold text-[10px] uppercase tracking-widest text-zinc-400">GHI CHÚ SẢN XUẤT:</span>
                    </td>
                  </tr>
                  {/* Ký tên section */}
                  <tr>
                    <td colSpan={3} className="border border-black p-4 text-center font-bold text-[11px] uppercase bg-zinc-50 h-32 align-top">CÔNG NHÂN KÝ TÊN</td>
                    <td colSpan={3} className="border border-black p-4 text-center font-bold text-[11px] uppercase bg-zinc-50 h-32 align-top">QC KIỂM TRA</td>
                    <td colSpan={3} className="border border-black p-4 text-center font-bold text-[11px] uppercase bg-zinc-50 h-32 align-top">QUẢN LÝ XÁC NHẬN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-auto px-6 pt-4 pb-8 bg-zinc-950 border-t border-zinc-800 flex flex-row items-center justify-between relative z-10">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-white/10 font-bold px-6">
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
