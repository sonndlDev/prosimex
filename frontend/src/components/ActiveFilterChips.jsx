import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Shows the active filters as removable chips, styled like the planning page's "ĐANG LỌC" row.
 * Build the chip list with buildFilterChips() from "@/utils/filterChips".
 */
export function ActiveFilterChips({ chips = [], onClearAll }) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center px-1">
      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-1">
        ĐANG LỌC:
      </span>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 pl-2 pr-1 h-6 text-[10px] font-bold bg-white border-zinc-200"
        >
          {chip.label}: {chip.value}
          <button
            type="button"
            onClick={chip.onRemove}
            className="hover:text-red-500 rounded-full p-0.5 ml-1"
            aria-label={`Bỏ lọc ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      {onClearAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50/60"
        >
          Đặt lại bộ lọc
        </Button>
      )}
    </div>
  );
}
