import React, { useEffect, useRef, useState } from "react";
import { Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n) => String(n).padStart(2, "0");

// Chấp nhận: "8:05", "08:05", "0805", "8.05" → "08:05". Trả về null nếu không hợp lệ.
export function normalizeTime(raw) {
  const s = String(raw || "").trim().replace(/[hH.]/g, ":");
  let m = /^(\d{1,2}):(\d{1,2})$/.exec(s);
  if (!m) m = /^(\d{2})(\d{2})$/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/**
 * Ô nhập giờ dạng HH:mm (24h).
 * - Gõ trực tiếp được (ví dụ 0805 hoặc 8:05), commit khi Enter / rời ô.
 * - Bấm biểu tượng đồng hồ để chọn giờ và phút từ danh sách.
 * value/onChange dùng chuỗi "HH:mm" hoặc "".
 */
export default function TimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "HH:mm",
  className,
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value || "");
  const listRef = useRef(null);

  useEffect(() => {
    setText(value || "");
  }, [value]);

  // Cuộn tới giá trị đang chọn khi mở popover
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current
      .querySelectorAll("[data-selected='true']")
      .forEach((el) => el.scrollIntoView({ block: "center" }));
  }, [open]);

  const commit = () => {
    if (text.trim() === "") {
      if (value) onChange("");
      return;
    }
    const normalized = normalizeTime(text);
    if (normalized) {
      setText(normalized);
      if (normalized !== value) onChange(normalized);
    } else {
      setText(value || ""); // không hợp lệ → khôi phục giá trị cũ
    }
  };

  const [selH, selM] = value ? value.split(":").map((x) => parseInt(x, 10)) : [null, null];

  const pick = (h, m) => {
    const hh = h ?? (selH ?? 0);
    const mm = m ?? (selM ?? 0);
    onChange(`${pad(hh)}:${pad(mm)}`);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="numeric"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-10 pr-16 text-sm font-semibold tabular-nums border-indigo-300 bg-indigo-50/40 focus-visible:ring-indigo-500"
      />
      <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
        {value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange("")}
            className="p-1 rounded text-zinc-400 hover:text-red-500"
            aria-label="Xóa giờ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              tabIndex={-1}
              disabled={disabled}
              className="h-7 w-7 text-indigo-600 hover:bg-indigo-100"
              aria-label="Chọn giờ"
            >
              <Clock className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2">
            <div ref={listRef} className="flex gap-2">
              <TimeColumn
                label="Giờ"
                items={HOURS}
                selected={selH}
                onSelect={(h) => pick(h, null)}
              />
              <TimeColumn
                label="Phút"
                items={MINUTES}
                selected={selM}
                onSelect={(m) => pick(null, m)}
              />
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs font-bold"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Xóa
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs font-bold"
                onClick={() => setOpen(false)}
              >
                Xong
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function TimeColumn({ label, items, selected, onSelect }) {
  return (
    <div className="flex flex-col w-14">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center pb-1">
        {label}
      </span>
      <div className="h-56 overflow-y-auto rounded-md border border-zinc-200 p-1 space-y-0.5">
        {items.map((n) => {
          const isSel = selected === n;
          return (
            <button
              key={n}
              type="button"
              data-selected={isSel ? "true" : "false"}
              onClick={() => onSelect(n)}
              className={cn(
                "w-full rounded px-1 py-1 text-sm font-semibold tabular-nums text-center transition-colors",
                isSel
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-700 hover:bg-indigo-50",
              )}
            >
              {pad(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
