import React, { useCallback } from "react";
import { DateTime } from "luxon";
import {
  Edit,
  Save,
  X,
  ExternalLink,
  Copy,
  Loader2,
  HelpCircle,
  Trash2
} from "lucide-react";
import {
  ExcelDataCell,
  ManagedTextField,
  toDisplayQuantity,
  parseOvertimeFlag,
  isMachineDayOverCapacity,
} from "./shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const PlanningTableRow = React.memo(
  ({
    plan,
    idx,
    dateColumns,
    isSelected,
    onSelect,
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
    const isEven = idx % 2 !== 0; // nth-child(even) in 1-based indexing means odd in 0-based
    const rowBg = isEven ? "bg-zinc-50" : "bg-white";

    const renderTooltippedCell = (
      content,
      className,
      isSticky = false,
      left,
      width,
      isLastSticky = false,
    ) => {
      const tooltipText =
        typeof content === "string" || typeof content === "number"
          ? String(content)
          : null;
      return (
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <ExcelDataCell
                className={cn(
                  className,
                  isSticky &&
                    cn(
                      "sticky z-20 border-r border-zinc-200 group-hover:bg-zinc-100",
                      rowBg,
                    ),
                  isLastSticky && "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]",
                )}
                style={
                  isSticky
                    ? {
                        left,
                        width,
                        minWidth: width,
                        maxWidth: width,
                        borderRight: "1px solid #d4d4d8",
                      }
                    : {}
                }
              >
                <div className="truncate w-full">{content}</div>
              </ExcelDataCell>
            </TooltipTrigger>
            {tooltipText && (
              <TooltipContent
                side="top"
                className="max-w-xs bg-zinc-900 text-white border-none text-[11px] font-semibold px-3 py-2 rounded-lg shadow-xl"
              >
                <p className="break-words">{tooltipText}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    };

    return (
      <tr
        className={cn(
          "group border-b border-zinc-200 transition-colors",
          rowBg,
        )}
      >
        <ExcelDataCell
          className={cn(
            "sticky left-0 z-20 border-r border-zinc-200 text-center",
            rowBg,
          )}
          style={{ width: 40, minWidth: 40, maxWidth: 40 }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="border-zinc-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
          </div>
        </ExcelDataCell>
        {renderTooltippedCell(idx + 1, "text-center font-medium", true, 40, 60)}
        {renderTooltippedCell(
          plan.product_name,
          "font-medium text-left px-3",
          true,
          100,
          150,
        )}
        {renderTooltippedCell(
          plan.product_group_name,
          "font-bold text-[10px]",
          true,
          250,
          100,
        )}
        {renderTooltippedCell(
          plan.sequence_order || "—",
          "font-bold text-indigo-600",
          true,
          350,
          80,
        )}
        {renderTooltippedCell(
          plan.operation_name,
          "text-left px-3",
          true,
          430,
          150,
        )}
        {renderTooltippedCell(
          plan.machine_code || plan.machine_name,
          "text-left px-3 font-bold text-blue-600",
          true,
          580,
          120,
        )}
        {renderTooltippedCell(
          (
            parseFloat(plan.inventory_input) +
            parseFloat(plan.remaining_quantity)
          ).toLocaleString("en-US"),
          "text-right px-3 tabular-nums font-medium",
          true,
          700,
          100,
          true,
        )}

        {renderTooltippedCell(
          parseFloat(plan.inventory_input).toLocaleString("en-US"),
          "text-right px-3 tabular-nums",
        )}
        {renderTooltippedCell(
          parseFloat(plan.remaining_quantity).toLocaleString("en-US"),
          "text-right px-3 tabular-nums font-black text-red-600",
        )}
        {renderTooltippedCell(
          parseFloat(plan.dinh_muc).toLocaleString("en-US"),
          "text-right px-3 tabular-nums",
        )}
        {renderTooltippedCell("0", "text-right px-3 tabular-nums")}

        {/* <ExcelDataCell className="bg-emerald-50 text-emerald-700 font-black">x</ExcelDataCell> */}
        {/* <ExcelDataCell className="text-zinc-500 font-mono text-[10px]">{DateTime.fromISO(plan.planned_start_date).toFormat("dd-MM")}</ExcelDataCell> */}
        {/* <ExcelDataCell className="text-zinc-500 font-mono text-[10px] cursor-help p-0">...</ExcelDataCell> */}

        {/* Date columns */}
        {dateColumns.map((date, colIdx) => {
          const dayData = plan.days?.find(
            (d) =>
              DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd") ===
              date.key,
          );
          const editDayData = inlineEditDays.find((d) => d.date === date.key);

          const metrics =
            dailyMachineMetrics?.[date.key]?.[plan.machine_id || "unknown"];
          const totalHours = metrics?.totalHours || 0;
          const hasOvertime = metrics?.hasOvertime || false;

          let cellBg = "inherit";
          let textColor = "inherit";

          const isStopped = plan.status === "STOPPED";
          const stoppedAt = plan.stopped_at
            ? DateTime.fromISO(plan.stopped_at)
            : null;
          const currentCellDate = DateTime.fromISO(date.key);
          const isActuallyStopped =
            isStopped &&
            stoppedAt &&
            currentCellDate.startOf("day") > stoppedAt.startOf("day");

          const dt = DateTime.fromISO(date.key);
          const isSunday = dt.weekday === 7;

          if (dayData) {
            if (isActuallyStopped) {
              cellBg = "#94a3b8"; // Slate gray for stopped days
              textColor = "#fff";
            } else if (isSunday) {
              cellBg = "#71717a"; // zinc-500 for Sunday with work
              textColor = "#fff";
            } else if (!plan.machine_id) {
              // Nếu không có máy, luôn hiển thị màu xanh theo yêu cầu
              cellBg = "#22c55e"; // Green
              textColor = "#fff";
            } else if (isMachineDayOverCapacity(totalHours, hasOvertime)) {
              cellBg = "#ef4444"; // Red — vượt 1 công hoặc 1,43 nếu tăng ca
              textColor = "#fff";
            } else if (hasOvertime) {
              cellBg = "#22c55e"; // Green
              textColor = "#fff";
            } else {
              cellBg = "#22c55e"; // Green
              textColor = "#fff";
            }
          } else if (isSunday) {
            cellBg = "#a1a1aa"; // zinc-400 for empty Sunday
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
                    className={`cursor-pointer text-[8px] font-black uppercase leading-tight ${
                      editDayData?.is_overtime
                        ? "text-red-500"
                        : "text-zinc-400"
                    } hover:text-red-600 mb-0.5`}
                  >
                    {editDayData?.is_overtime ? "TĂNG CA" : "chuẩn"}
                  </span>
                  <ManagedTextField
                    type="number"
                    value={editDayData ? editDayData.quantity : "0"}
                    onCommit={(val) => onInlineDayChange(plan, date.key, val)}
                    autoFocus={colIdx === 0}
                    className="w-full border-none shadow-none text-blue-600 focus-visible:ring-0"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span
                    className={`text-[7px] font-black uppercase ${parseOvertimeFlag(dayData?.is_overtime) ? "opacity-100" : "opacity-0"}`}
                  >
                    TC
                  </span>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${!dayData ? "text-zinc-300" : ""}`}
                  >
                    {dayData
                      ? Math.round(
                          toDisplayQuantity(
                            dayData.planned_work_quantity,
                            plan.dinh_muc,
                          ),
                        )
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
                {/* <TooltipProvider>
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
                </TooltipProvider> */}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => onOpenEdit(plan)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p>Chỉnh sửa chi tiết</p>
                    </TooltipContent>
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
                    <TooltipTrigger
                      render={
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
                      }
                    />
                    <TooltipContent>
                      <p>Xóa kế hoạch</p>
                    </TooltipContent>
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
