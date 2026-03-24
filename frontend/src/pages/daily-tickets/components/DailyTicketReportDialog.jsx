import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from "@mui/material";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../../services/daily-ticket.service";

// Styled Components inline
const HeaderCell = ({ children, rowSpan = 1, colSpan = 1, sx = {} }) => (
  <TableCell
    rowSpan={rowSpan}
    colSpan={colSpan}
    align="center"
    sx={{
      fontWeight: 800,
      bgcolor: "#f1f5f9",
      color: "#334155",
      borderRight: "1px solid #cbd5e1",
      borderBottom: "2px solid #cbd5e1",
      p: "8px 4px",
      fontSize: "0.75rem",
      whiteSpace: "nowrap",
      ...sx,
    }}
  >
    {children}
  </TableCell>
);

const DataCell = ({ children, align = "center", sx = {} }) => (
  <TableCell
    align={align}
    sx={{
      p: "6px",
      borderRight: "1px solid #e2e8f0",
      borderBottom: "1px solid #e2e8f0",
      fontSize: "0.8rem",
      whiteSpace: "nowrap",
      ...sx,
    }}
  >
    {children}
  </TableCell>
);

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
      // Collect dates from plans
      if (row.plan_days) {
        row.plan_days.forEach(d => {
           if (d && d.working_date) {
               datesSet.add(DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd"));
           }
        });
      }
      // Collect dates from actuals
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
      
      // Map actual tickets by date for quick lookup
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

      // Map plan days by date for quick lookup
      const planByDate = {};
      if (row.plan_days) {
        row.plan_days.forEach(d => {
          if (d && d.working_date) {
            const dateStr = DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd");
            // Plans usually store hours or qty/8 in planned_work_quantity. We multiply by dinh_muc to get qty.
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" sx={{ "& .MuiDialog-paper": { height: "95vh" } }}>
      <DialogTitle sx={{ fontWeight: 800, bgcolor: "#1e293b", color: "#fff", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Báo cáo Kế Hoạch vs Thực Tế
        <Typography variant="body2" sx={{ bgcolor: '#334155', px: 2, py: 0.5, borderRadius: 1 }}>
          Cập nhật: {DateTime.now().toFormat("dd/MM/yyyy HH:mm")}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, bgcolor: "#f8fafc" }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={3}>
            <Alert severity="error">Lỗi khi tải báo cáo: {error.message}</Alert>
          </Box>
        ) : rows.length === 0 ? (
          <Box p={3}>
            <Alert severity="info" variant="outlined">Chưa có dữ liệu kế hoạch và kết quả sản xuất để báo cáo.</Alert>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: "100%", bgcolor: "white" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <HeaderCell rowSpan={2} sx={{ position: "sticky", left: 0, zIndex: 12 }}>STT</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ position: "sticky", left: 40, zIndex: 12 }}>Thứ tự</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ position: "sticky", left: 100, zIndex: 12 }}>Tên mã hàng</HeaderCell>
                  <HeaderCell rowSpan={2}>Nhóm mã hàng</HeaderCell>
                  <HeaderCell rowSpan={2}>Công đoạn</HeaderCell>
                  <HeaderCell rowSpan={2}>Máy</HeaderCell>
                  
                  <HeaderCell rowSpan={2}>SL đơn</HeaderCell>
                  <HeaderCell rowSpan={2}>Tồn kho</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ color: "#e53935" }}>Còn lại</HeaderCell>
                  <HeaderCell rowSpan={2}>Định mức</HeaderCell>
                  <HeaderCell rowSpan={2}>Tổng công</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ color: "#2e7d32" }}>SL SX Thực tế</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ color: "#d32f2f" }}>SL CÒN PHẢI SX</HeaderCell>
                  <HeaderCell rowSpan={2} sx={{ color: "#1976d2" }}>Tỉ lệ Thực tế</HeaderCell>
                  <HeaderCell rowSpan={2}>Mẫu</HeaderCell>
                  <HeaderCell rowSpan={2}>Bắt đầu</HeaderCell>
                  <HeaderCell rowSpan={2}>Kết thúc</HeaderCell>

                  {/* Date Columns */}
                  {dateColumns.map((date) => (
                    <HeaderCell 
                      key={date.key} 
                      colSpan={2} 
                      sx={{ bgcolor: "#f0f9ff", color: "#0369a1" }}
                    >
                      {date.label}
                    </HeaderCell>
                  ))}
                </TableRow>
                
                {/* Sub headers KH | TT for each date */}
                <TableRow>
                  {dateColumns.map((date) => (
                    <React.Fragment key={`sub-${date.key}`}>
                      <HeaderCell sx={{ bgcolor: "#fef08a", color: "#854d0e", p: "4px" }}>KH</HeaderCell>
                      <HeaderCell sx={{ bgcolor: "#f8fafc", color: "#475569", p: "4px" }}>Thực tế</HeaderCell>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.id} hover>
                    <DataCell sx={{ position: "sticky", left: 0, bgcolor: "white", zIndex: 5, fontWeight: 600, textAlign: "center" }}>{idx + 1}</DataCell>
                    <DataCell sx={{ position: "sticky", left: 40, bgcolor: "white", zIndex: 5, textAlign: "center" }}>{row.sequence_order || ""}</DataCell>
                    <DataCell sx={{ position: "sticky", left: 100, bgcolor: "white", zIndex: 5, fontWeight: 600 }}>{row.product_name || ""}</DataCell>
                    <DataCell>{row.product_group_name || ""}</DataCell>
                    <DataCell align="left">{row.operation_name || ""}</DataCell>
                    <DataCell align="left">{row.machine_name || ""}</DataCell>
                    
                    <DataCell align="right">{row.planQty?.toLocaleString()}</DataCell>
                    <DataCell align="right">{row.inventory?.toLocaleString() || "0"}</DataCell>
                    <DataCell align="right" sx={{ fontWeight: 700, color: "#e53935" }}>{row.qtyToProduce?.toLocaleString()}</DataCell>
                    
                    <DataCell align="right">{row.dinh_muc || ""}</DataCell>
                    <DataCell align="right" sx={{ color: "#e53935" }}>{row.total_required_work ? (parseFloat(row.total_required_work) / 8).toFixed(2) : "0.00"}</DataCell>
                    
                    {/* SL SX Thực tế */}
                    <DataCell align="right" sx={{ fontWeight: 700, color: "#2e7d32" }}>
                      {row.totalActual.toLocaleString()}
                    </DataCell>

                    {/* SL CÒN PHẢI SX */}
                    <DataCell align="right" sx={{ fontWeight: 700, color: "#d32f2f" }}>
                      {row.remaining.toLocaleString()}
                    </DataCell>

                    {/* Tỉ lệ Thực tế */}
                    <DataCell align="right" sx={{ 
                      fontWeight: 700, 
                      color: "#1976d2",
                      bgcolor: row.percentage >= 100 ? "#f0fdf4" : "transparent"
                    }}>
                      {row.percentage.toFixed(0)}%
                    </DataCell>

                    <DataCell sx={{ bgcolor: "#f0fdf4", color: "#166534", fontWeight: 700 }}>x</DataCell>
                    
                    <DataCell sx={{ color: "#64748b", textAlign: "center" }}>
                      {row.planned_start_date ? DateTime.fromISO(row.planned_start_date).toFormat("dd-MM") : ""}
                    </DataCell>
                    <DataCell sx={{ color: "#64748b", textAlign: "center" }}>
                      {row.planned_end_date ? DateTime.fromISO(row.planned_end_date).toFormat("dd-MM") : ""}
                    </DataCell>

                    {/* Daily KH and TT */}
                    {dateColumns.map(date => {
                       const planQty = row.planByDate[date.key] || 0;
                       const actQty = row.actualByDate[date.key] || 0;
                       
                       return (
                         <React.Fragment key={`data-${row.id}-${date.key}`}>
                            <DataCell 
                              align="right" 
                              sx={{ 
                                bgcolor: planQty > 0 ? "#fef08a" : "inherit",
                                color: planQty > 0 ? "#854d0e" : "transparent"
                              }}
                            >
                              {planQty > 0 ? planQty.toLocaleString() : "-"}
                            </DataCell>
                            <DataCell 
                              align="right" 
                              sx={{ 
                                color: actQty > 0 ? "#0f172a" : "transparent",
                                fontWeight: actQty > 0 ? 700 : 400
                              }}
                            >
                              {actQty > 0 ? actQty.toLocaleString() : "-"}
                            </DataCell>
                         </React.Fragment>
                       );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: "white", borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ px: 4, borderRadius: 2 }}>
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
