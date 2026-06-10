import React, { useState, useMemo, useCallback, memo, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../services/daily-ticket.service";
import { orderService } from "../../services/order.service";
import { productService } from "../../services/product.service";
import { operationService } from "../../services/operation.service";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileSpreadsheet,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Filter,
  RotateCcw,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// ─── Tooltip Cell wrapper ─────────────────────────────────────────────────────
function TCell({ value, children, className, style, ...props }) {
  const tooltipText =
    typeof value === "string" || typeof value === "number"
      ? String(value)
      : null;

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <TableCell className={className} style={style} {...props}>
            {children}
          </TableCell>
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
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "zinc", icon: Icon, trend }) {
  const colorMap = {
    zinc: {
      bg: "bg-zinc-50",
      text: "text-zinc-900",
      icon: "text-zinc-400",
      border: "border-zinc-300",
    },
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      icon: "text-indigo-500",
      border: "border-indigo-200",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      icon: "text-emerald-500",
      border: "border-emerald-200",
    },
    rose: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      icon: "text-rose-500",
      border: "border-rose-200",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      icon: "text-amber-500",
      border: "border-amber-200",
    },
  };
  const c = colorMap[color] || colorMap.zinc;
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md",
        c.border,
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          c.bg,
        )}
      >
        <Icon className={cn("w-6 h-6", c.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {label}
        </p>
        <p
          className={cn(
            "text-2xl font-black tabular-nums leading-tight",
            c.text,
          )}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{sub}</p>
        )}
      </div>
      {trend !== undefined && (
        <div
          className={cn(
            "text-xs font-black flex items-center gap-1",
            trend >= 0 ? "text-emerald-600" : "text-rose-500",
          )}
        >
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {Math.abs(trend).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped >= 100
      ? "bg-emerald-500"
      : clamped >= 70
        ? "bg-indigo-500"
        : clamped >= 30
          ? "bg-amber-500"
          : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-black tabular-nums w-8 text-right",
          clamped >= 100
            ? "text-emerald-600"
            : clamped >= 70
              ? "text-indigo-600"
              : clamped >= 30
                ? "text-amber-600"
                : "text-rose-500",
        )}
      >
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Resize Handle ───────────────────────────────────────────────────────────
function ResizeHandle({ onMouseDown }) {
  return (
    <span
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-20 group/rh flex items-center justify-center"
      style={{ touchAction: "none" }}
    >
      <span className="w-px h-4 bg-zinc-300 group-hover/rh:bg-indigo-400 transition-colors rounded-full" />
    </span>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = memo(
  ({ onSearch, onReset, orders, operations, products }) => {
    const [search, setSearch] = useState("");
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [openOrder, setOpenOrder] = useState(false);
    const [openProduct, setOpenProduct] = useState(false);

    const toggleOrder = (id) =>
      setSelectedOrderIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );

    const toggleProduct = (id) =>
      setSelectedProductIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );

    const handleSubmit = (e) => {
      e.preventDefault();
      const params = {};
      if (search) params.search = search;
      if (selectedOrderIds.length) params.order_id = selectedOrderIds.join(",");
      if (selectedProductIds.length)
        params.product_id = selectedProductIds.join(",");
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      onSearch(params);
    };

    const handleReset = () => {
      setSearch("");
      setSelectedOrderIds([]);
      setSelectedProductIds([]);
      setStartDate("");
      setEndDate("");
      onReset();
    };

    const selectedOrdersDisplay = (orders || []).filter((o) =>
      selectedOrderIds.includes(String(o.id)),
    );
    const selectedProductsDisplay = (products || []).filter((p) =>
      selectedProductIds.includes(String(p.id)),
    );

    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-300/60 shadow-sm p-4 sticky top-0 z-50 space-y-3">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap xl:flex-nowrap items-center gap-3">
            <div className="w-full xl:w-[320px] shrink-0">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  placeholder="Tìm mã PO, đơn hàng, mã hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 text-sm font-medium border-zinc-300/80 rounded-xl bg-zinc-50/50 hover:bg-white focus:bg-white transition-all focus-visible:ring-indigo-500/30"
                />
              </div>
            </div>

            <Popover open={openOrder} onOpenChange={setOpenOrder}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 font-bold px-4 bg-zinc-50 hover:bg-white shadow-sm border-zinc-300 rounded-xl text-xs text-zinc-700 transition-all"
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  {selectedOrderIds.length > 0
                    ? `Đã chọn ${selectedOrderIds.length} đơn`
                    : "Lọc theo đơn hàng"}
                  <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[320px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Tìm kiếm đơn hàng..." />
                  <CommandList className="max-h-[300px] p-1">
                    <CommandEmpty className="py-6 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Không thấy đơn hàng
                    </CommandEmpty>
                    <CommandGroup>
                      {(orders || []).map((o) => (
                        <CommandItem
                          key={o.id}
                          value={o.order_code || o.name || String(o.id)}
                          onSelect={() => toggleOrder(String(o.id))}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                        >
                          <div
                            className={cn(
                              "w-4 h-4 border border-zinc-300 rounded flex items-center justify-center transition-colors shrink-0",
                              selectedOrderIds.includes(String(o.id))
                                ? "bg-indigo-600 border-indigo-600"
                                : "bg-white",
                            )}
                          >
                            {selectedOrderIds.includes(String(o.id)) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="font-bold text-xs break-all leading-tight">
                            {o.order_code || o.name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  {selectedOrderIds.length > 0 && (
                    <div className="p-2 border-t border-zinc-200 flex justify-between bg-zinc-50/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setSelectedOrderIds([])}
                        className="text-[10px] h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Xóa tất cả
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => setOpenOrder(false)}
                        className="text-[10px] h-7 px-3 bg-zinc-950 text-white font-bold"
                      >
                        Xong
                      </Button>
                    </div>
                  )}
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={openProduct} onOpenChange={setOpenProduct}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 font-bold px-4 bg-zinc-50 hover:bg-white shadow-sm border-zinc-300 rounded-xl text-xs text-zinc-700 transition-all"
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  {selectedProductIds.length > 0
                    ? `Đã chọn ${selectedProductIds.length} mã`
                    : "Lọc mã hàng"}
                  <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[320px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Tìm kiếm mã hàng..." />
                  <CommandList className="max-h-[300px] p-1">
                    <CommandEmpty className="py-6 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Không thấy mã hàng
                    </CommandEmpty>
                    <CommandGroup>
                      {(products || []).map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name || p.code || String(p.id)}
                          onSelect={() => toggleProduct(String(p.id))}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                        >
                          <div
                            className={cn(
                              "w-4 h-4 border border-zinc-300 rounded flex items-center justify-center transition-colors shrink-0",
                              selectedProductIds.includes(String(p.id))
                                ? "bg-indigo-600 border-indigo-600"
                                : "bg-white",
                            )}
                          >
                            {selectedProductIds.includes(String(p.id)) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="font-bold text-xs break-all leading-tight">
                            {p.name || p.code}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  {selectedProductIds.length > 0 && (
                    <div className="p-2 border-t border-zinc-200 flex justify-between bg-zinc-50/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setSelectedProductIds([])}
                        className="text-[10px] h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Xóa tất cả
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => setOpenProduct(false)}
                        className="text-[10px] h-7 px-3 bg-zinc-950 text-white font-bold"
                      >
                        Xong
                      </Button>
                    </div>
                  )}
                </Command>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1 bg-zinc-50/50 border border-zinc-300/80 rounded-xl px-2.5 h-10 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all shadow-sm overflow-hidden shrink-0">
              <span className="text-[10px] font-black text-zinc-400 uppercase whitespace-nowrap mr-1 tracking-tighter">
                Ngày:
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
              />
              <span className="text-zinc-300 mx-0.5">—</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <Button
                type="submit"
                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                Lọc kết quả
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className="w-10 h-10 p-0 border-zinc-300/80 text-zinc-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-[10px] font-bold">Đặt lại bộ lọc</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </form>

        {(selectedOrderIds.length > 0 || selectedProductIds.length > 0) && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-zinc-200">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              ĐANG LỌC:
            </span>
            {selectedOrdersDisplay.slice(0, 5).map((o) => (
              <Badge
                key={o.id}
                variant="secondary"
                className="gap-1 pl-2 pr-1 h-6 text-[10px] font-bold bg-white border-zinc-300"
              >
                Đơn: {(o.order_code || o.name || "").substring(0, 20)}
                {(o.order_code || o.name || "").length > 20 ? "..." : ""}
                <button
                  type="button"
                  onClick={() => toggleOrder(String(o.id))}
                  className="hover:text-red-500 rounded-full p-0.5 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {selectedOrderIds.length > 5 && (
              <Badge
                variant="outline"
                className="h-6 text-[10px] font-bold bg-white border-dashed"
              >
                +{selectedOrderIds.length - 5} đơn khác
              </Badge>
            )}
            {selectedProductsDisplay.slice(0, 5).map((p) => (
              <Badge
                key={p.id}
                variant="secondary"
                className="gap-1 pl-2 pr-1 h-6 text-[10px] font-bold bg-white border-zinc-300"
              >
                Mã: {(p.name || p.code || "").substring(0, 20)}
                {(p.name || p.code || "").length > 20 ? "..." : ""}
                <button
                  type="button"
                  onClick={() => toggleProduct(String(p.id))}
                  className="hover:text-red-500 rounded-full p-0.5 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {selectedProductIds.length > 5 && (
              <Badge
                variant="outline"
                className="h-6 text-[10px] font-bold bg-white border-dashed"
              >
                +{selectedProductIds.length - 5} mã khác
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  },
);

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onPageSizeChange,
}) {
  const pages = useMemo(() => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3)
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [page, totalPages]);

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200">
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-zinc-400 font-medium">
          Hiển thị{" "}
          <span className="font-black text-zinc-700">
            {from}-{to}
          </span>{" "}
          /{" "}
          <span className="font-black text-zinc-700">
            {total.toLocaleString()}
          </span>{" "}
          kế hoạch
        </p>
        <Select
          value={String(limit)}
          onValueChange={(v) => {
            onPageSizeChange(Number(v));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-7 w-[80px] text-[11px] font-bold border-zinc-300 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">
                {s} / trang
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`dot-${i}`}
              className="px-2 text-zinc-400 text-xs font-bold"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-black transition-all",
                p === page
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-zinc-600 hover:bg-indigo-50 hover:text-indigo-700",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlanVsActualPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ sortBy: "order_code", direction: "DESC" });

  // ── Column resize ──────────────────────────────────────────────────────────
  const [colWidths, setColWidths] = useState({
    stt: 40, seq: 40, product: 140, order: 140, operation: 120,
    plan_qty: 70, inventory: 70, qty_produce: 70, dinh_muc: 60,
    actual: 70, remaining: 70, progress: 100,
  });
  const [dateColWidth, setDateColWidth] = useState(52);

  const startResize = useCallback((e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colKey === "__date__" ? dateColWidth : colWidths[colKey];
    const onMove = (ev) => {
      const newW = Math.max(
        colKey === "__date__" ? 36 : 28,
        startWidth + ev.clientX - startX,
      );
      startTransition(() => {
        if (colKey === "__date__") setDateColWidth(newW);
        else setColWidths((p) => ({ ...p, [colKey]: newW }));
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [colWidths, dateColWidth]);

  const sl = useMemo(() => {
    const w = colWidths;
    const r = { stt: 0 };
    r.seq = r.stt + w.stt;
    r.product = r.seq + w.seq;
    r.order = r.product + w.product;
    r.operation = r.order + w.order;
    r.plan_qty = r.operation + w.operation;
    r.inventory = r.plan_qty + w.plan_qty;
    r.qty_produce = r.inventory + w.inventory;
    r.dinh_muc = r.qty_produce + w.qty_produce;
    r.actual = r.dinh_muc + w.dinh_muc;
    r.remaining = r.actual + w.actual;
    r.progress = r.remaining + w.remaining;
    return r;
  }, [colWidths]);
  // ──────────────────────────────────────────────────────────────────────────

  const handleSort = (field) => {
    setSort((prev) => ({
      sortBy: field,
      direction:
        prev.sortBy === field && prev.direction === "ASC" ? "DESC" : "ASC",
    }));
  };

  const SortIcon = ({ field }) => {
    if (sort.sortBy !== field)
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sort.direction === "ASC" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-indigo-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-indigo-600" />
    );
  };

  const SortableHead = ({ field, label, className, style, colKey, ...props }) => (
    <TableHead
      {...props}
      className={cn(
        "cursor-pointer hover:bg-zinc-100 transition-colors",
        className,
      )}
      style={style}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon field={field} />
      </div>
      {colKey && (
        <ResizeHandle
          onMouseDown={(e) => startResize(e, colKey)}
        />
      )}
    </TableHead>
  );

  const handleSearch = useCallback((params) => {
    setPage(1);
    setFilters(params);
  }, []);
  const handleReset = useCallback(() => {
    setPage(1);
    setFilters({});
  }, []);

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["report-plan-vs-actual-page", page, limit, filters, sort],
    queryFn: () =>
      dailyTicketService.getPlanVsActualReport({
        page,
        limit,
        ...filters,
        sortBy: sort.sortBy,
        sortDirection: sort.direction,
      }),
    keepPreviousData: true,
  });

  const { data: ordersResp } = useQuery({
    queryKey: ["orders-for-report"],
    queryFn: () => orderService.getAll({ limit: 500 }),
  });
  const { data: operationsResp } = useQuery({
    queryKey: ["operations-for-report"],
    queryFn: () => operationService.getAll({ limit: 500 }),
  });
  const { data: productsResp } = useQuery({
    queryKey: ["products-for-report"],
    queryFn: () => productService.getAll({ limit: 1000 }),
  });

  const reportData = response?.data || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  const rows = useMemo(() => {
    return reportData.map((row) => {
      let totalActual = 0;
      const actualByDate = {};
      (row.actual_tickets || []).forEach((t) => {
        if (t && t.ticket_date) {
          const dateStr = DateTime.fromISO(t.ticket_date).toFormat(
            "yyyy-MM-dd",
          );
          const qty = parseFloat(t.actual_quantity) || 0;
          actualByDate[dateStr] = (actualByDate[dateStr] || 0) + qty;
          totalActual += qty;
        }
      });

      const planByDate = {};
      (row.plan_days || []).forEach((d) => {
        if (d && d.working_date) {
          const dateStr = DateTime.fromISO(d.working_date).toFormat(
            "yyyy-MM-dd",
          );
          const hours = parseFloat(d.planned_quantity) / 8 || 0;
          const dm = parseFloat(d.dinh_muc) ?? parseFloat(row.dinh_muc) ?? 0;
          planByDate[dateStr] = (planByDate[dateStr] || 0) + hours * dm;
        }
      });

      const planQty = parseFloat(row.plan_quantity) || 0;
      const inventory = parseFloat(row.inventory_input) || 0;
      const qtyToProduce = Math.max(0, planQty - inventory);
      const remaining = Math.max(0, qtyToProduce - totalActual);
      const percentage =
        qtyToProduce > 0 ? (totalActual / qtyToProduce) * 100 : 0;

      return {
        ...row,
        planQty,
        inventory,
        qtyToProduce,
        totalActual,
        remaining,
        percentage,
        planByDate,
        actualByDate,
      };
    });
  }, [reportData]);

  const dateColumns = useMemo(() => {
    const datesSet = new Set();
    rows.forEach((r) => {
      Object.keys(r.planByDate).forEach((d) => datesSet.add(d));
      Object.keys(r.actualByDate).forEach((d) => datesSet.add(d));
    });
    return Array.from(datesSet)
      .sort()
      .map((d) => ({ key: d, label: DateTime.fromISO(d).toFormat("dd-MM") }));
  }, [rows]);

  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const done = rows.filter((r) => r.percentage >= 100).length;
    const inprog = rows.filter(
      (r) => r.percentage > 0 && r.percentage < 100,
    ).length;
    const notStart = rows.filter((r) => r.percentage === 0).length;
    const avgPct = rows.reduce((a, r) => a + r.percentage, 0) / rows.length;
    const totalAct = rows.reduce((a, r) => a + r.totalActual, 0);
    const totalKH = rows.reduce((a, r) => a + r.qtyToProduce, 0);
    return { done, inprog, notStart, avgPct, totalAct, totalKH };
  }, [rows]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-300 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-950 tracking-tight">
              Báo Cáo Kế Hoạch vs Thực Tế
            </h2>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
              So sánh sản lượng kế hoạch và thực tế theo từng kế hoạch sản xuất
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Cập nhật: {DateTime.now().toFormat("dd/MM/yyyy HH:mm")}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        onSearch={handleSearch}
        onReset={handleReset}
        orders={ordersResp?.data || ordersResp}
        operations={operationsResp?.data || operationsResp}
        products={productsResp?.data || productsResp}
      />

      {/* Stats */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Tổng KH (trang này)"
            value={rows.length}
            icon={Target}
            color="zinc"
            sub={`/ ${total.toLocaleString()} toàn bộ`}
          />
          <StatCard
            label="Hoàn thành"
            value={stats.done}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            label="Đang SX"
            value={stats.inprog}
            icon={Clock}
            color="indigo"
          />
          <StatCard
            label="Chưa bắt đầu"
            value={stats.notStart}
            icon={AlertCircle}
            color="rose"
          />
          <StatCard
            label="Tỉ lệ TB"
            value={`${stats.avgPct.toFixed(0)}%`}
            icon={TrendingUp}
            color="amber"
            sub="trung bình trang này"
          />
          <StatCard
            label="Tổng SL thực tế"
            value={stats.totalAct.toLocaleString()}
            icon={BarChart3}
            color="indigo"
            sub={`/ ${stats.totalKH.toLocaleString()} cần SX`}
          />
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-zinc-300 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-black text-zinc-900 uppercase tracking-tight">
              Danh sách kế hoạch sản xuất
            </span>
            {total > 0 && (
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-[10px] h-5 px-2">
                {total.toLocaleString()} kế hoạch
              </Badge>
            )}
          </div>
          {Object.keys(filters).length > 0 && (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] h-5 px-2 gap-1">
              <Filter className="w-2.5 h-2.5" /> Đang lọc
            </Badge>
          )}
        </div>

        {isLoading && (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
            <div className="flex items-center justify-center gap-3 pt-4">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                Đang tải dữ liệu...
              </p>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="font-black text-zinc-800">Lỗi tải báo cáo</p>
            <p className="text-sm text-zinc-400">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <div className="p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-zinc-300" />
            </div>
            <div>
              <p className="font-black text-zinc-500 text-sm">
                Không có dữ liệu
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Hãy thử thay đổi bộ lọc hoặc thêm kế hoạch sản xuất
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <>
            <div className="w-full overflow-auto max-h-[calc(100vh-380px)]">
              <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
                <TableHeader className="sticky top-0 z-50">
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50 border-b-2 border-zinc-300">
                    {/* STT */}
                    <TableHead
                      rowSpan={2}
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-center font-black text-[9px] uppercase text-zinc-500"
                      style={{ width: colWidths.stt, minWidth: colWidths.stt, left: sl.stt }}
                    >
                      STT
                      <ResizeHandle onMouseDown={(e) => startResize(e, "stt")} />
                    </TableHead>
                    {/* TT */}
                    <SortableHead
                      rowSpan={2}
                      field="sequence_order"
                      label="TT"
                      colKey="seq"
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-center font-black text-[9px] uppercase text-zinc-500"
                      style={{ width: colWidths.seq, minWidth: colWidths.seq, left: sl.seq }}
                    />
                    {/* Mã hàng */}
                    <SortableHead
                      rowSpan={2}
                      field="product_name"
                      label="Mã hàng"
                      colKey="product"
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 font-black text-[9px] uppercase text-zinc-500"
                      style={{ width: colWidths.product, minWidth: colWidths.product, left: sl.product }}
                    />
                    {/* Đơn hàng */}
                    <SortableHead
                      rowSpan={2}
                      field="order_code"
                      label="Đơn hàng"
                      colKey="order"
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap"
                      style={{ width: colWidths.order, minWidth: colWidths.order, left: sl.order }}
                    />
                    {/* Công đoạn */}
                    <SortableHead
                      rowSpan={2}
                      field="operation_name"
                      label="Công đoạn"
                      colKey="operation"
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap"
                      style={{ width: colWidths.operation, minWidth: colWidths.operation, left: sl.operation }}
                    />
                    {/* SL Đơn */}
                    <SortableHead
                      rowSpan={2}
                      field="plan_quantity"
                      label="SL Đơn"
                      colKey="plan_qty"
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-right font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap"
                      style={{ width: colWidths.plan_qty, minWidth: colWidths.plan_qty, left: sl.plan_qty }}
                    />
                    {/* Tồn kho */}
                    <TableHead
                      rowSpan={2}
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-right font-black text-[9px] uppercase text-zinc-400 whitespace-nowrap"
                      style={{ width: colWidths.inventory, minWidth: colWidths.inventory, left: sl.inventory }}
                    >
                      Tồn kho
                      <ResizeHandle onMouseDown={(e) => startResize(e, "inventory")} />
                    </TableHead>
                    {/* Cần SX */}
                    <TableHead
                      rowSpan={2}
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-right font-black text-[9px] uppercase text-rose-500 whitespace-nowrap"
                      style={{ width: colWidths.qty_produce, minWidth: colWidths.qty_produce, left: sl.qty_produce }}
                    >
                      Cần SX
                      <ResizeHandle onMouseDown={(e) => startResize(e, "qty_produce")} />
                    </TableHead>
                    {/* Định mức */}
                    <TableHead
                      rowSpan={2}
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-right font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap"
                      style={{ width: colWidths.dinh_muc, minWidth: colWidths.dinh_muc, left: sl.dinh_muc }}
                    >
                      Định mức
                      <ResizeHandle onMouseDown={(e) => startResize(e, "dinh_muc")} />
                    </TableHead>
                    {/* Thực tế */}
                    <TableHead
                      rowSpan={2}
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-right font-black text-[9px] uppercase text-emerald-600 whitespace-nowrap"
                      style={{ width: colWidths.actual, minWidth: colWidths.actual, left: sl.actual }}
                    >
                      Thực tế
                      <ResizeHandle onMouseDown={(e) => startResize(e, "actual")} />
                    </TableHead>
                    {/* Còn lại */}
                    <TableHead
                      rowSpan={2}
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 text-right font-black text-[9px] uppercase text-rose-600 whitespace-nowrap"
                      style={{ width: colWidths.remaining, minWidth: colWidths.remaining, left: sl.remaining }}
                    >
                      Còn lại
                      <ResizeHandle onMouseDown={(e) => startResize(e, "remaining")} />
                    </TableHead>
                    {/* Tiến độ % */}
                    <TableHead
                      rowSpan={2}
                      className="sticky z-40 bg-zinc-50 border-r border-zinc-300 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] font-black text-[9px] uppercase text-indigo-600 whitespace-nowrap"
                      style={{ width: colWidths.progress, minWidth: colWidths.progress, left: sl.progress }}
                    >
                      Tiến độ %
                      <ResizeHandle onMouseDown={(e) => startResize(e, "progress")} />
                    </TableHead>
                    {/* Date columns */}
                    {dateColumns.map((date) => (
                      <TableHead
                        key={date.key}
                        colSpan={2}
                        className="bg-indigo-50/40 text-indigo-700 text-center font-black text-[9px] border-l border-zinc-300 py-2 whitespace-nowrap"
                        style={{ width: dateColWidth * 2, minWidth: dateColWidth * 2 }}
                      >
                        <div className="relative flex items-center justify-center px-2">
                          {date.label}
                          <ResizeHandle onMouseDown={(e) => startResize(e, "__date__")} />
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow className="hover:bg-zinc-50 bg-zinc-50">
                    {dateColumns.map((date) => (
                      <React.Fragment key={`sub-${date.key}`}>
                        <TableHead
                          className="text-[8px] font-black uppercase text-amber-600 border-l border-zinc-300 bg-amber-50/30 text-center h-7 px-1 whitespace-nowrap"
                          style={{ width: dateColWidth, minWidth: dateColWidth }}
                        >
                          KH
                        </TableHead>
                        <TableHead
                          className="text-[8px] font-black uppercase text-zinc-400 border-l border-zinc-200 text-center h-7 px-1 whitespace-nowrap"
                          style={{ width: dateColWidth, minWidth: dateColWidth }}
                        >
                          TT
                        </TableHead>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody className="[&_td]:border-b [&_td]:border-zinc-300 [&_th]:border-b [&_th]:border-zinc-300">
                  {rows.map((row, idx) => (
                    <TableRow
                      key={
                        row.pp_id ||
                        `${row.order_id}-${row.product_id}-${row.product_group_operation_id}`
                      }
                      className="group hover:bg-indigo-50/20 transition-colors border-b border-zinc-200"
                    >
                      {/* STT */}
                      <TCell
                        value={(page - 1) * limit + idx + 1}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 font-black text-[10px] text-zinc-400 text-center border-r border-zinc-200 tabular-nums"
                        style={{ width: colWidths.stt, minWidth: colWidths.stt, left: sl.stt }}
                      >
                        {(page - 1) * limit + idx + 1}
                      </TCell>
                      {/* Thứ tự */}
                      <TCell
                        value={row.sequence_order}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 text-center font-black text-xs text-zinc-700 border-r border-zinc-200"
                        style={{ width: colWidths.seq, minWidth: colWidths.seq, left: sl.seq }}
                      >
                        {row.sequence_order || "—"}
                      </TCell>
                      {/* Mã hàng */}
                      <TCell
                        value={row.product_name}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 font-black text-xs text-zinc-950 border-r border-zinc-200 uppercase tracking-tight overflow-hidden"
                        style={{ width: colWidths.product, minWidth: colWidths.product, left: sl.product }}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="truncate" title={row.product_name}>
                            {row.product_name || "—"}
                          </div>
                          {!row.pp_id ? (
                            <Badge className="w-fit bg-amber-100 text-amber-700 group-hover:bg-indigo-50 border-amber-200 text-[8px] font-black h-4 px-1 leading-none uppercase tracking-tighter shadow-none">
                              Nhập trực tiếp
                            </Badge>
                          ) : (
                            <Badge className="w-fit bg-indigo-50 text-indigo-600 group-hover:bg-indigo-50 border-indigo-100 text-[8px] font-black h-4 px-1 leading-none uppercase tracking-tighter shadow-none">
                              Theo KH
                            </Badge>
                          )}
                        </div>
                      </TCell>
                      {/* Đơn hàng */}
                      <TCell
                        value={row.order_code || row.order_name}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-300 overflow-hidden"
                        style={{ width: colWidths.order, minWidth: colWidths.order, left: sl.order }}
                      >
                        <div className="flex flex-col w-full">
                          <span className="text-[11px] font-black text-indigo-700 truncate block w-full">
                            {row.order_code || row.order_name || "—"}
                          </span>
                          {row.po_customer && (
                            <span
                              className="text-[10px] text-zinc-400 font-medium truncate block w-full"
                              title={row.po_customer}
                            >
                              {row.po_customer}
                            </span>
                          )}
                        </div>
                      </TCell>
                      {/* Công đoạn */}
                      <TCell
                        value={row.operation_name}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-200 text-[11px] font-black text-zinc-800 truncate"
                        style={{ width: colWidths.operation, minWidth: colWidths.operation, left: sl.operation }}
                      >
                        {row.operation_name || "—"}
                      </TCell>
                      {/* SL Đơn */}
                      <TCell
                        value={row.planQty}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-200 text-right text-xs font-bold tabular-nums text-zinc-700"
                        style={{ width: colWidths.plan_qty, minWidth: colWidths.plan_qty, left: sl.plan_qty }}
                      >
                        {row.planQty.toLocaleString()}
                      </TCell>
                      {/* Tồn kho */}
                      <TCell
                        value={row.inventory}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-200 text-right text-xs font-bold tabular-nums text-zinc-400"
                        style={{ width: colWidths.inventory, minWidth: colWidths.inventory, left: sl.inventory }}
                      >
                        {row.inventory.toLocaleString()}
                      </TCell>
                      {/* Cần SX */}
                      <TCell
                        value={row.qtyToProduce}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-200 text-right text-xs font-black tabular-nums text-rose-500"
                        style={{ width: colWidths.qty_produce, minWidth: colWidths.qty_produce, left: sl.qty_produce }}
                      >
                        {row.qtyToProduce.toLocaleString()}
                      </TCell>
                      {/* Định mức */}
                      <TCell
                        value={row.dinh_muc}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-200 text-right text-xs font-bold tabular-nums text-zinc-500"
                        style={{ width: colWidths.dinh_muc, minWidth: colWidths.dinh_muc, left: sl.dinh_muc }}
                      >
                        {Math.round(row.dinh_muc) || "—"}
                      </TCell>
                      {/* Thực tế */}
                      <TCell
                        value={row.totalActual}
                        className="sticky z-30 bg-white group-hover:bg-emerald-50 border-r border-zinc-200 text-right text-xs font-black tabular-nums text-emerald-600"
                        style={{ width: colWidths.actual, minWidth: colWidths.actual, left: sl.actual }}
                      >
                        {row.totalActual.toLocaleString()}
                      </TCell>
                      {/* Còn lại */}
                      <TCell
                        value={row.remaining}
                        className={cn(
                          "sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-200 text-right text-xs font-black tabular-nums",
                          row.remaining > 0 ? "text-rose-600" : "text-emerald-600",
                        )}
                        style={{ width: colWidths.remaining, minWidth: colWidths.remaining, left: sl.remaining }}
                      >
                        {row.remaining.toLocaleString()}
                      </TCell>
                      {/* Tiến độ */}
                      <TCell
                        value={`${row.percentage.toFixed(1)}%`}
                        className="sticky z-30 bg-white group-hover:bg-indigo-50 border-r border-zinc-200 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]"
                        style={{ width: colWidths.progress, minWidth: colWidths.progress, left: sl.progress }}
                      >
                        <ProgressBar pct={row.percentage} />
                      </TCell>

                      {/* Date columns */}
                      {dateColumns.map((date) => {
                        const pQty = row.planByDate[date.key] || 0;
                        const aQty = row.actualByDate[date.key] || 0;
                        return (
                          <React.Fragment
                            key={`data-${row.pp_id || row.order_id}-${date.key}`}
                          >
                            <TCell
                              value={pQty > 0 ? pQty : null}
                              className={cn(
                                "text-right text-[11px] font-black border-l group-hover:bg-indigo-50 border-zinc-200 tabular-nums px-2",
                                pQty > 0
                                  ? "text-amber-600 bg-amber-50/20"
                                  : "text-zinc-200",
                              )}
                              style={{ width: dateColWidth, minWidth: dateColWidth }}
                            >
                              {pQty > 0
                                ? pQty.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })
                                : "—"}
                            </TCell>
                            <TCell
                              value={aQty > 0 ? aQty : null}
                              className={cn(
                                "text-right text-[11px] font-black border-l group-hover:bg-indigo-50 border-zinc-200 tabular-nums px-2",
                                aQty > 0 ? "text-zinc-900" : "text-zinc-200",
                              )}
                              style={{ width: dateColWidth, minWidth: dateColWidth }}
                            >
                              {aQty > 0 ? aQty.toLocaleString() : "—"}
                            </TCell>
                          </React.Fragment>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>

            <div className="px-6 pb-5 pt-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onPageSizeChange={setLimit}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
