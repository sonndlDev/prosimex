import React from "react";
import { DateTime } from "luxon";
import { CalendarDays, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SHORTCUTS = [
  {
    label: "Hôm nay",
    getRange: () => { const d = DateTime.now().toISODate(); return [d, d]; },
  },
  {
    label: "Tuần này",
    getRange: () => [DateTime.now().startOf("week").toISODate(), DateTime.now().toISODate()],
  },
  {
    label: "Tháng này",
    getRange: () => [DateTime.now().startOf("month").toISODate(), DateTime.now().toISODate()],
  },
  {
    label: "Tháng trước",
    getRange: () => {
      const last = DateTime.now().minus({ months: 1 });
      return [last.startOf("month").toISODate(), last.endOf("month").toISODate()];
    },
  },
];

/**
 * Shared date range filter — Popover button hiển thị range đã chọn,
 * mở popover chứa shortcuts nhanh + 2 input ngày.
 *
 * Props:
 *   startDate  – ISO date string hoặc ""
 *   endDate    – ISO date string hoặc ""
 *   onChange   – (start: string, end: string) => void
 *   className  – wrapper div className (col-span, shrink-0, w-*, …)
 */
export function DateRangeFilter({ startDate = "", endDate = "", onChange, className }) {
  const hasValue = !!(startDate || endDate);

  const label = !startDate && !endDate
    ? "Tất cả ngày"
    : `${startDate ? DateTime.fromISO(startDate).toFormat("dd/MM") : "..."} — ${endDate ? DateTime.fromISO(endDate).toFormat("dd/MM") : "..."}`;

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full h-10 justify-between bg-zinc-50/50 border-zinc-200/80 rounded-xl font-bold hover:bg-white transition-all shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter shrink-0">Ngày:</span>
              <span className={cn("truncate text-[11px]", hasValue ? "text-indigo-700 font-black" : "text-zinc-900")}>
                {label}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-3 shadow-2xl border-indigo-50 rounded-xl" align="start">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {SHORTCUTS.map(s => {
                const [start, end] = s.getRange();
                const active = startDate === start && endDate === end;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => onChange(start, end)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-colors tracking-wider",
                      active ? "bg-indigo-600 text-white" : "bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-700"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="h-px bg-zinc-100" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Từ ngày</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => onChange(e.target.value, endDate)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Đến ngày</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => onChange(startDate, e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>
            {hasValue && (
              <button
                type="button"
                onClick={() => onChange("", "")}
                className="w-full text-[10px] font-bold text-red-400 hover:text-red-600 text-center py-0.5 transition-colors"
              >
                Xóa lọc ngày
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
