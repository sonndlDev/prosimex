import React, { useCallback } from "react";
import {
  TableRow,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { DateTime } from "luxon";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ExcelDataCell, ManagedTextField } from "./shared";

const PlanningTableRow = React.memo(
  ({
    plan,
    idx,
    dateColumns,
    isInlineEditing,
    inlineEditDays,
    isUpdatePending,
    isDeletePending,
    onStartInlineEdit,
    onCancelInlineEdit,
    onSaveInline,
    onOpenEdit,
    onOpenDelete,
    onClone,
    onInlineDayChange,
    onInlineOTToggle,
    dailyMachineMetrics,
  }) => {
    const isYellow = idx % 3 === 0;
    const isOrange = idx % 2 === 0;

    return (
      <TableRow hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
        <ExcelDataCell>{idx + 1}</ExcelDataCell>
        <ExcelDataCell>{plan.sequence_order}</ExcelDataCell>
        <ExcelDataCell>{plan.product_name}</ExcelDataCell>
        <ExcelDataCell
          sx={{
            bgcolor: isYellow ? "#ffee58" : isOrange ? "#ffe0b2" : "inherit",
          }}
        >
          {plan.product_group_name}
        </ExcelDataCell>
        <ExcelDataCell align="left">{plan.operation_name}</ExcelDataCell>
        <ExcelDataCell align="left">{plan.machine_name}</ExcelDataCell>
        <ExcelDataCell align="right">
          {(
            parseFloat(plan.inventory_input) +
            parseFloat(plan.remaining_quantity)
          ).toLocaleString()}
        </ExcelDataCell>
        <ExcelDataCell align="right">
          {parseFloat(plan.inventory_input).toLocaleString()}
        </ExcelDataCell>
        <ExcelDataCell align="right" sx={{ fontWeight: 700 }}>
          {parseFloat(plan.remaining_quantity).toLocaleString()}
        </ExcelDataCell>
        <ExcelDataCell align="right">{plan.dinh_muc}</ExcelDataCell>
        <ExcelDataCell align="right" sx={{ color: "#e53935" }}>
          {(parseFloat(plan.total_required_work) / 8).toFixed(2)}
        </ExcelDataCell>
        <ExcelDataCell align="right">0.00</ExcelDataCell>
        <ExcelDataCell
          sx={{ bgcolor: "#f0fdf4", color: "#166534", fontWeight: 700 }}
        >
          x
        </ExcelDataCell>
        <ExcelDataCell sx={{ color: "#64748b" }}>
          {DateTime.fromISO(plan.planned_start_date).toFormat("dd-MM")}
        </ExcelDataCell>
        <Tooltip
          title={`Kết thúc vào cuối ngày ${DateTime.fromISO(plan.planned_end_date).toFormat("dd/MM/yyyy")} (23:59)`}
        >
          <ExcelDataCell sx={{ color: "#64748b", cursor: "help" }}>
            {DateTime.fromISO(plan.planned_end_date).toFormat("dd-MM")}
          </ExcelDataCell>
        </Tooltip>

        {/* Date columns */}
        {dateColumns.map((date, colIdx) => {
          const dayData = plan.days.find(
            (d) =>
              DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd") ===
              date.key,
          );
          const editDayData = inlineEditDays.find((d) => d.date === date.key);

          const metrics = dailyMachineMetrics?.[date.key]?.[plan.machine_id || "unknown"];
          const totalHours = metrics?.totalHours || 0;
          const hasOvertime = metrics?.hasOvertime || false;

          let cellBg = "inherit";
          if (dayData) {
            if (totalHours > 1.43) {
              cellBg = "#f44336"; // Red (Always over absolute max)
            } else if (hasOvertime) {
              cellBg = "#4caf50"; // Green (Within OT capacity 1.43)
            } else if (totalHours > 1) {
              cellBg = "#ffeb3b"; // Yellow (Over standard 1.0 capacity, no OT)
            } else {
              cellBg = "#4caf50"; // Green (Within standard 1.0 capacity)
            }
          }

          return (
            <ExcelDataCell
              key={date.key}
              sx={{
                bgcolor: isInlineEditing ? "#fff" : cellBg,
                p: isInlineEditing ? 0 : "4px 6px",
                position: "relative",
              }}
            >
              {isInlineEditing ? (
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Typography
                    variant="caption"
                    onClick={() => onInlineOTToggle(plan, date.key)}
                    sx={{
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: 900,
                      color: editDayData?.is_overtime ? "#ef4444" : "#94a3b8",
                      mb: -0.5,
                      "&:hover": { color: "#ef4444" },
                    }}
                  >
                    {editDayData?.is_overtime ? "TĂNG CA" : "chuẩn"}
                  </Typography>
                  <ManagedTextField
                    size="small"
                    variant="standard"
                    type="number"
                    value={editDayData ? editDayData.hours : "0.00"}
                    onCommit={(val) => onInlineDayChange(plan, date.key, val)}
                    InputProps={{
                      disableUnderline: true,
                      autoFocus: colIdx === 0,
                      sx: {
                        fontSize: "0.8rem",
                        textAlign: "center",
                        "& input": {
                          textAlign: "center",
                          fontWeight: 700,
                          p: 0,
                        },
                      },
                    }}
                    sx={{
                      width: "100%",
                      height: "30px",
                      border: "none",
                      background: "#ffffff",
                      textAlign: "center",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      padding: "0px 4px",
                      color: "#2563eb",
                    }}
                  />
                </Box>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  gap={0.2}
                >
                   <Typography
                    variant="caption"
                    sx={{
                      fontSize: "8px",
                      fontWeight: 900,
                      color: dayData?.is_overtime ? "#fff" : "transparent",
                      mb: -0.5
                    }}
                  >
                    TC
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: dayData ? 700 : 400,
                      color: dayData ? (cellBg === "#ffeb3b" ? "#856404" : "#fff") : "#94a3b8",
                    }}
                  >
                    {dayData
                      ? (() => {
                          const qty =
                            parseFloat(dayData.planned_work_quantity) || 0;
                          const dinhMuc = parseFloat(plan.dinh_muc) || 0;

                          const base = qty / 8;
                          const total = base * dinhMuc;

                          return `${base.toFixed(2)} (${total.toFixed(2)})`;
                        })()
                      : "-"}
                  </Typography>
                </Box>
              )}
            </ExcelDataCell>
          );
        })}

        {/* Action buttons (sticky right) */}
        <ExcelDataCell
          sx={{
            position: "sticky",
            right: 0,
            zIndex: 5,
            bgcolor: "white",
            borderLeft: "1px solid #cbd5e1",
            boxShadow: "-2px 0 5px rgba(0,0,0,0.02)",
          }}
        >
          <Box display="flex" gap={0.5} justifyContent="center" bgcolor="white">
            {isInlineEditing ? (
              <>
                <Tooltip title="Lưu thay đổi">
                  <IconButton
                    size="small"
                    sx={{ color: "#22c55e" }}
                    onClick={() => onSaveInline(plan)}
                    disabled={isUpdatePending}
                  >
                    {isUpdatePending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SaveIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Hủy bỏ">
                  <IconButton
                    size="small"
                    sx={{ color: "#ef4444" }}
                    onClick={onCancelInlineEdit}
                    disabled={isUpdatePending}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip title="Sửa nhanh hàng này">
                  <IconButton
                    size="small"
                    sx={{ color: "#3b82f6" }}
                    onClick={() => onStartInlineEdit(plan)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Chỉnh sửa chi tiết">
                  <IconButton
                    size="small"
                    sx={{ color: "#6366f1" }}
                    onClick={() => onOpenEdit(plan)}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Nhân bản (Clone)">
                  <IconButton
                    size="small"
                    sx={{ color: "#10b981" }}
                    onClick={() => onClone(plan.id)}
                  >
                    <ContentCopyIcon fontSize="small" sx={{ scale: "0.85" }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Xóa kế hoạch">
                  <IconButton
                    size="small"
                    sx={{ color: "#f43f5e" }}
                    onClick={() => onOpenDelete(plan.id)}
                    disabled={isDeletePending}
                  >
                    {isDeletePending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </ExcelDataCell>
      </TableRow>
    );
  },
);
PlanningTableRow.displayName = "PlanningTableRow";

export default PlanningTableRow;
