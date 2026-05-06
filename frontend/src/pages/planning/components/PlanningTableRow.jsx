import React, { useCallback } from "react";
import { DateTime } from "luxon";
import {
  Edit,
  Save,
  X,
  ExternalLink,
  Trash2,
  Copy,
  Loader2,
  HelpCircle
} from "lucide-react";
import { ExcelDataCell, ManagedTextField } from "./shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

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
      <tr className="hover:bg-zinc-50 border-b border-zinc-200 transition-colors even:bg-zinc-50/30">
        <ExcelDataCell>{idx + 1}</ExcelDataCell>
        <ExcelDataCell className="font-medium">{plan.product_name}</ExcelDataCell>
        <ExcelDataCell
          className="font-bold text-[10px]"
        >
          {plan.product_group_name}
        </ExcelDataCell>
        <ExcelDataCell className="text-left px-3">{plan.operation_name}</ExcelDataCell>
        <ExcelDataCell className="text-left px-3 font-bold text-blue-600">{plan.machine_code || plan.machine_name}</ExcelDataCell>
        <ExcelDataCell className="text-right px-3 tabular-nums font-medium">
          {(
            parseFloat(plan.inventory_input) +
            parseFloat(plan.remaining_quantity)
          ).toLocaleString('en-US')}
        </ExcelDataCell>
        <ExcelDataCell className="text-right px-3 tabular-nums">
          {parseFloat(plan.inventory_input).toLocaleString('en-US')}
        </ExcelDataCell>
        <ExcelDataCell className="text-right px-3 tabular-nums font-black text-red-600">
          {parseFloat(plan.remaining_quantity).toLocaleString('en-US')}
        </ExcelDataCell>
        <ExcelDataCell className="text-right px-3 tabular-nums">{parseFloat(plan.dinh_muc).toLocaleString('en-US')}</ExcelDataCell>
        {/* <ExcelDataCell className="text-right px-3 tabular-nums font-bold text-blue-600">
          {(parseFloat(plan.total_required_work) / 8).toLocaleString('en-US')}
        </ExcelDataCell> */}
        <ExcelDataCell className="text-right px-3 tabular-nums">0</ExcelDataCell>
        <ExcelDataCell className="bg-emerald-50 text-emerald-700 font-black">
          x
        </ExcelDataCell>
        <ExcelDataCell className="text-zinc-500 font-mono text-[10px]">
          {DateTime.fromISO(plan.planned_start_date).toFormat("dd-MM")}
        </ExcelDataCell>

        <ExcelDataCell className="text-zinc-500 font-mono text-[10px] cursor-help p-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<div className="w-full h-full flex items-center justify-center">{DateTime.fromISO(plan.planned_end_date).toFormat("dd-MM")}</div>} />
              <TooltipContent>
                <p>Kết thúc vào cuối ngày {DateTime.fromISO(plan.planned_end_date).toFormat("dd/MM/yyyy")} (23:59)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ExcelDataCell>

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
          let textColor = "inherit";

          const isStopped = plan.status === 'STOPPED';
          const stoppedAt = plan.stopped_at ? DateTime.fromISO(plan.stopped_at) : null;
          const currentCellDate = DateTime.fromISO(date.key);
          const isActuallyStopped = isStopped && stoppedAt && currentCellDate.startOf('day') > stoppedAt.startOf('day');

          const dt = DateTime.fromISO(date.key);
          const isSunday = dt.weekday === 7;

          if (dayData) {
            if (isActuallyStopped) {
              cellBg = "#94a3b8"; // Slate gray for stopped days
              textColor = "#fff";
            } else if (isSunday) {
              cellBg = "#d4d4d8"; // Darker gray (zinc-300) for Sunday with work
              textColor = "#000";
            } else if (!plan.machine_id) {
              // Nếu không có máy, luôn hiển thị màu xanh theo yêu cầu
              cellBg = "#22c55e"; // Green
              textColor = "#fff";
            } else if (totalHours > 1.43) {
              cellBg = "#ef4444"; // Red
              textColor = "#fff";
            } else if (hasOvertime) {
              cellBg = "#22c55e"; // Green
              textColor = "#fff";
            } else if (totalHours > 1) {
              cellBg = "#eab308"; // Yellow
              textColor = "#854d0e";
            } else {
              cellBg = "#22c55e"; // Green
              textColor = "#fff";
            }
          } else if (isSunday) {
            cellBg = "#e4e4e7"; // zinc-200 for empty Sunday
          }

          return (
            <ExcelDataCell
              key={date.key}
              style={{
                backgroundColor: isInlineEditing ? "#fff" : cellBg,
                color: isInlineEditing ? "inherit" : textColor,
                padding: isInlineEditing ? 0 : "4px 6px",
              }}
              className="relative"
            >
              {isInlineEditing ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <span
                    onClick={() => onInlineOTToggle(plan, date.key)}
                    className={`cursor-pointer text-[8px] font-black uppercase leading-tight ${editDayData?.is_overtime ? "text-red-500" : "text-zinc-400"
                      } hover:text-red-600 mb-0.5`}
                  >
                    {editDayData?.is_overtime ? "TĂNG CA" : "chuẩn"}
                  </span>
                  <ManagedTextField
                    type="number"
                    value={editDayData ? editDayData.hours : "0"}
                    onCommit={(val) => onInlineDayChange(plan, date.key, val)}
                    autoFocus={colIdx === 0}
                    className="w-full border-none shadow-none text-blue-600 focus-visible:ring-0"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className={`text-[7px] font-black uppercase ${dayData?.is_overtime ? "opacity-100" : "opacity-0"}`}>
                    TC
                  </span>
                  <span className={`text-[10px] font-bold tabular-nums ${!dayData ? "text-zinc-300" : ""}`}>
                    {dayData
                      ? (() => {
                        const qty = parseFloat(dayData.planned_work_quantity) || 0;
                        const dinhMuc = parseFloat(plan.dinh_muc) || 0;
                        const base = qty / 8;
                        const total = Math.round(base * dinhMuc);
                        return total.toLocaleString('en-US');
                      })()
                      : "-"}
                  </span>
                </div>
              )}
            </ExcelDataCell>
          );
        })}

        {/* Action buttons (sticky right) */}
        <ExcelDataCell className="sticky right-0 z-10 bg-white border-l border-zinc-300 shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-center gap-1 bg-white p-1">
            {isInlineEditing ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => onSaveInline(plan)}
                  disabled={isUpdatePending}
                >
                  {isUpdatePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={onCancelInlineEdit}
                  disabled={isUpdatePending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => onStartInlineEdit(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    } />
                    <TooltipContent><p>Sửa nhanh hàng này</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => onOpenEdit(plan)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    } />
                    <TooltipContent><p>Chỉnh sửa chi tiết</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                        onClick={() => onClone(plan.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    } />
                    <TooltipContent><p>Nhân bản (Clone)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider> */}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => onOpenDelete(plan.id)}
                        disabled={isDeletePending}
                      >
                        {isDeletePending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    } />
                    <TooltipContent><p>Xóa kế hoạch</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </ExcelDataCell>
      </tr>
    );
  },
);
PlanningTableRow.displayName = "PlanningTableRow";

export default PlanningTableRow;
