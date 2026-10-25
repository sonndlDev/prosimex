import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

// Page list with ellipsis: 1 2 3 4 5 ... 50 | 1 ... 46 47 48 49 50 | 1 ... 4 5 6 ... 50
function getPageItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
  if (page >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", page - 1, page, page + 1, "...", totalPages];
}

/**
 * Shared pagination control.
 *
 * - page: 1-based current page
 * - onPageSizeChange: when omitted, the page-size selector is hidden
 * - showJumper: "Go to [ ] Page" input
 * - disabled: locks every control (e.g. while loading)
 */
export default function AppPagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageSizeChange,
  showJumper = true,
  disabled = false,
  className,
}) {
  const [jumpValue, setJumpValue] = useState("");
  const lastPage = Math.max(1, totalPages || 1);
  const items = getPageItems(page, lastPage);

  const goTo = (target) => {
    if (disabled) return;
    const clamped = Math.min(Math.max(target, 1), lastPage);
    if (clamped !== page) onPageChange(clamped);
  };

  const submitJump = () => {
    if (jumpValue !== "") {
      const n = parseInt(jumpValue, 10);
      if (!Number.isNaN(n)) goTo(n);
    }
    setJumpValue("");
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-sm select-none", className)}>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Trang trước"
          className="h-8 w-8 text-zinc-500 hover:text-indigo-600"
          disabled={disabled || page <= 1}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {items.map((item, idx) =>
          item === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-8 text-center text-zinc-400 font-bold tracking-widest"
            >
              •••
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "outline" : "ghost"}
              size="icon"
              disabled={disabled}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "h-8 min-w-8 px-2 text-sm font-medium",
                item === page
                  ? "border-indigo-500 text-indigo-600 bg-white hover:bg-indigo-50 hover:text-indigo-600"
                  : "text-zinc-700 hover:text-indigo-600",
              )}
              onClick={() => goTo(item)}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Trang sau"
          className="h-8 w-8 text-zinc-500 hover:text-indigo-600"
          disabled={disabled || page >= lastPage}
          onClick={() => goTo(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {onPageSizeChange && (
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[108px] text-sm rounded-md border-zinc-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-sm">
                {s} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showJumper && (
        <div className="flex items-center gap-2 text-zinc-600">
          <span>Go to</span>
          <Input
            inputMode="numeric"
            value={jumpValue}
            disabled={disabled}
            onChange={(e) => setJumpValue(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitJump();
            }}
            onBlur={submitJump}
            className="h-8 w-14 text-center text-sm px-1"
          />
          <span>Page</span>
        </div>
      )}
    </div>
  );
}
