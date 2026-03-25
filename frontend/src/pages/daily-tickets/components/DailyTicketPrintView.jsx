import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../../services/daily-ticket.service";

export default function DailyTicketPrintView({ open, ticketId, onClose }) {
  const printRef = useRef();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["daily-ticket", ticketId],
    queryFn: () => dailyTicketService.getById(ticketId),
    enabled: !!ticketId,
  });

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;

    // Add some print-specific styles temporarily
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
      @media print {
        body { margin: 0; padding: 0; background: white; font-family: 'Times New Roman', serif; font-size: 11pt; }
        @page { size: A4 landscape; margin: 10mm; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; }
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
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogContent>Đang tải bản in...</DialogContent>
      </Dialog>
    );
  }

  const ticketDate = ticket ? DateTime.fromISO(ticket.ticket_date).toFormat("dd/MM/yyyy") : "";
  const firstMachine = ticket?.items?.[0]?.pgo_machine_name || "";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogContent dividers>
        {/* Printable Area */}
        <Box ref={printRef} sx={{ p: 2, bgcolor: "white", color: "black", minHeight: "800px", fontFamily: "'Times New Roman', serif" }}>

          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <tbody>
              {/* Row 1 */}
              <tr>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "left", fontWeight: "bold" }}>SLK:</td>
                <td colSpan={3} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "bold", fontSize: "16pt", lineHeight: "1.2" }}>
                  PHIẾU SẢN XUẤT<br />
                  <span style={{ fontSize: "12pt", fontWeight: "normal" }}>Mã số phiếu: {ticket ? `${DateTime.fromISO(ticket.ticket_date).toFormat("yyyyMMdd")}_#${ticket.id}` : ""}</span>
                </td>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "bold" }}>VINTERPROS</td>
              </tr>
              {/* Row 2 */}
              <tr>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "left", fontWeight: "bold" }}>NGÀY SẢN XUẤT:</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "bold" }}>{ticketDate}</td>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "right", fontWeight: "bold", paddingRight: "50px" }}>CA SX:</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "left", fontWeight: "bold" }}>MÃ SỐ CN</td>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>dùng mã này để<br />nhập slsx thực tế</td>
              </tr>
              {/* Row 3 */}
              <tr>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "left", fontWeight: "bold" }}>MÁY MÓC:</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "bold" }}>{firstMachine}</td>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "right", fontWeight: "bold", paddingRight: "50px" }}>SỐ THẺ:</td>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "left", fontWeight: "bold", borderRight: "none" }}>HỌ VÀ TÊN</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center", borderLeft: "none" }}></td>
              </tr>
              {/* Headers */}
              <tr style={{ backgroundColor: "#f2f2f2", fontWeight: "bold" }}>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>KHÁCH HÀNG</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>PO</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>NHÓM MÃ</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>MÃ HÀNG<br /><span style={{ fontSize: "9pt", fontWeight: "normal" }}>Đi kèm mã hàng sẽ có mộ<br />t ả mã hàng ở phía dưới</span></td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>CÔNG ĐOẠN</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>SẢN LƯỢNG<br />CẦN SX (CÁI)</td>
                <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>SỐ LƯỢNG<br />THỰC TẾ SẢN XUẤT</td>
              </tr>
              {/* Items */}
              {ticket?.items?.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: "1px solid black", padding: "8px 4px", textAlign: "center" }}>{item.customer_name || ""}</td>
                  <td style={{ border: "1px solid black", padding: "8px 4px", textAlign: "center" }}>{item.po_customer || ""}</td>
                  <td style={{ border: "1px solid black", padding: "8px 4px", textAlign: "center" }}>{item.product_group_name || ""}</td>
                  <td style={{ border: "1px solid black", padding: "8px 4px", textAlign: "left", fontWeight: "bold" }}>{item.product_name || ""}</td>
                  <td style={{ border: "1px solid black", padding: "8px 4px", textAlign: "center" }}>{item.operation_name || item.pgo_operation_name}</td>
                  <td style={{ border: "1px solid black", padding: "8px 4px", textAlign: "center", fontWeight: "bold", fontSize: "14pt" }}>
                    {parseFloat(item.planned_quantity).toLocaleString()}
                  </td>
                  <td style={{ border: "1px solid black", padding: "8px 4px", textAlign: "center" }}></td>
                </tr>
              ))}
              {/* Fill empty rows if needed (e.g. at least 5 rows) */}
              {[...Array(Math.max(0, 5 - (ticket?.items?.length || 0)))].map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={{ border: "1px solid black", padding: "16px 4px" }}></td>
                  <td style={{ border: "1px solid black", padding: "16px 4px" }}></td>
                  <td style={{ border: "1px solid black", padding: "16px 4px" }}></td>
                  <td style={{ border: "1px solid black", padding: "16px 4px" }}></td>
                  <td style={{ border: "1px solid black", padding: "16px 4px" }}></td>
                  <td style={{ border: "1px solid black", padding: "16px 4px" }}></td>
                  <td style={{ border: "1px solid black", padding: "16px 4px" }}></td>
                </tr>
              ))}
              {/* Ghi chú */}
              <tr>
                <td colSpan={7} style={{ border: "1px solid black", padding: "4px", textAlign: "left", height: "40px" }}>
                  <span style={{ fontWeight: "bold", verticalAlign: "top" }}>GHI CHÚ</span>
                </td>
              </tr>
              {/* Ký tên */}
              <tr>
                <td colSpan={7} style={{ border: "1px solid black", padding: "4px", textAlign: "left" }}>
                  <span style={{ fontWeight: "bold" }}>KÝ TÊN</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "bold", height: "80px", verticalAlign: "top" }}>CÔNG NHÂN</td>
                <td colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "bold", height: "80px", verticalAlign: "top" }}>QC</td>
                <td colSpan={3} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: "bold", height: "80px", verticalAlign: "top" }}>QUẢN LÝ</td>
              </tr>
            </tbody>
          </table>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Trở về
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
        >
          In Phiếu Này
        </Button>
      </DialogActions>
    </Dialog >
  );
}
