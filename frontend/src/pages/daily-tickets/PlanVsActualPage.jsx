import React, { useState, useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../services/daily-ticket.service";
import { orderService } from "../../services/order.service";
import { operationService } from "../../services/operation.service";
import { cn } from "@/lib/utils";

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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "zinc", icon: Icon, trend }) {
  const colorMap = {
    zinc: { bg: "bg-zinc-50", text: "text-zinc-900", icon: "text-zinc-400", border: "border-zinc-200" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500", border: "border-indigo-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500", border: "border-emerald-200" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", icon: "text-rose-500", border: "border-rose-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500", border: "border-amber-200" },
  };
  const c = colorMap[color] || colorMap.zinc;
  return (
    <div className={cn("flex items-center gap-4 p-4 rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md", c.border)}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", c.bg)}>
        <Icon className={cn("w-6 h-6", c.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
        <p className={cn("text-2xl font-black tabular-nums leading-tight", c.text)}>{value}</p>
        {sub && <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn("text-xs font-black flex items-center gap-1", trend >= 0 ? "text-emerald-600" : "text-rose-500")}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
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
    clamped >= 100 ? "bg-emerald-500" :
      clamped >= 70 ? "bg-indigo-500" :
        clamped >= 30 ? "bg-amber-500" :
          "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={cn(
        "text-[10px] font-black tabular-nums w-8 text-right",
        clamped >= 100 ? "text-emerald-600" : clamped >= 70 ? "text-indigo-600" : clamped >= 30 ? "text-amber-600" : "text-rose-500"
      )}>
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ pct }) {
  if (pct >= 100) return (
    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] h-5 px-2 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Hoàn thành
    </Badge>
  );
  if (pct > 0) return (
    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px] h-5 px-2 gap-1">
      <Clock className="w-3 h-3" /> Đang SX
    </Badge>
  );
  return (
    <Badge className="bg-zinc-50 text-zinc-500 border border-zinc-200 font-bold text-[10px] h-5 px-2 gap-1">
      <AlertCircle className="w-3 h-3" /> Chưa bắt đầu
    </Badge>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = memo(({ onSearch, onReset, orders, operations }) => {
  const [f, setF] = useState({
    search: "",
    order_id: "all",
    operation_id: "all",
    startDate: "",
    endDate: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (f.search) params.search = f.search;
    if (f.order_id && f.order_id !== "all") params.order_id = f.order_id;
    if (f.operation_id && f.operation_id !== "all") params.operation_id = f.operation_id;
    if (f.startDate) params.startDate = f.startDate;
    if (f.endDate) params.endDate = f.endDate;
    onSearch(params);
  };

  const handleReset = () => {
    setF({ search: "", order_id: "all", operation_id: "all", startDate: "", endDate: "" });
    onReset();
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/60 shadow-sm p-4 sticky top-0 z-50">
      <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row items-center gap-4">
        {/* Search Input */}
        <div className="w-full xl:w-[350px] shrink-0">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Tìm mã PO, đơn hàng, mã hàng..."
              value={f.search}
              onChange={e => setF(p => ({ ...p, search: e.target.value }))}
              className="pl-10 h-10 text-sm font-medium border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white focus:bg-white transition-all focus-visible:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">


          {/* Khoảng ngày */}
          <div className="flex items-center gap-1 bg-zinc-50/50 border border-zinc-200/80 rounded-xl px-2.5 h-10 group focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all shadow-sm overflow-hidden">
            <span className="text-[10px] font-black text-zinc-400 uppercase whitespace-nowrap mr-1 tracking-tighter">Ngày:</span>
            <Input
              type="date"
              value={f.startDate}
              onChange={e => setF(p => ({ ...p, startDate: e.target.value }))}
              className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
            />
            <span className="text-zinc-300 mx-0.5">—</span>
            <Input
              type="date"
              value={f.endDate}
              onChange={e => setF(p => ({ ...p, endDate: e.target.value }))}
              className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
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
                  className="w-10 h-10 p-0 border-zinc-200/80 text-zinc-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-[10px] font-bold">Đặt lại bộ lọc</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
    </div>
  );
});

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, limit, onPageChange, onPageSizeChange }) {
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [page, totalPages]);

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-100">
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-zinc-400 font-medium">
          Hiển thị <span className="font-black text-zinc-700">{from}-{to}</span> / <span className="font-black text-zinc-700">{total.toLocaleString()}</span> kế hoạch
        </p>
        <Select value={String(limit)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-[80px] text-[11px] font-bold border-zinc-200 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map(s => (
              <SelectItem key={s} value={String(s)} className="text-xs">{s} / trang</SelectItem>
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
            <span key={`dot-${i}`} className="px-2 text-zinc-400 text-xs font-bold">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-black transition-all",
                p === page
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-zinc-600 hover:bg-indigo-50 hover:text-indigo-700"
              )}
            >
              {p}
            </button>
          )
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

  const handleSort = (field) => {
    setSort(prev => ({
      sortBy: field,
      direction: prev.sortBy === field && prev.direction === "ASC" ? "DESC" : "ASC"
    }));
  };

  const SortIcon = ({ field }) => {
    if (sort.sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sort.direction === "ASC"
      ? <ArrowUp className="w-3 h-3 ml-1 text-indigo-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-indigo-600" />;
  };

  const SortableHead = ({ field, label, className, ...props }) => (
    <TableHead
      {...props}
      className={cn("cursor-pointer hover:bg-zinc-100 transition-colors", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon field={field} />
      </div>
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

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: response, isLoading, error } = useQuery({
    queryKey: ["report-plan-vs-actual-page", page, limit, filters, sort],
    queryFn: () => dailyTicketService.getPlanVsActualReport({
      page,
      limit,
      ...filters,
      sortBy: sort.sortBy,
      sortDirection: sort.direction
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

  const reportData = response?.data || [];
  const total = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  // ── Compute per-row ─────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    return reportData.map((row) => {
      let totalActual = 0;
      const actualByDate = {};
      (row.actual_tickets || []).forEach(t => {
        if (t && t.ticket_date) {
          const dateStr = DateTime.fromISO(t.ticket_date).toFormat("yyyy-MM-dd");
          const qty = parseFloat(t.actual_quantity) || 0;
          actualByDate[dateStr] = (actualByDate[dateStr] || 0) + qty;
          totalActual += qty;
        }
      });

      const planByDate = {};
      (row.plan_days || []).forEach(d => {
        if (d && d.working_date) {
          const dateStr = DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd");
          const hours = parseFloat(d.planned_quantity) / 8 || 0;
          const dm = parseFloat(row.dinh_muc) || 0;
          planByDate[dateStr] = (planByDate[dateStr] || 0) + hours * dm;
        }
      });

      const planQty = parseFloat(row.plan_quantity) || 0;
      const inventory = parseFloat(row.inventory_input) || 0;
      const qtyToProduce = Math.max(0, planQty - inventory);
      const remaining = Math.max(0, qtyToProduce - totalActual);
      const percentage = qtyToProduce > 0 ? (totalActual / qtyToProduce) * 100 : 0;

      return { ...row, planQty, inventory, qtyToProduce, totalActual, remaining, percentage, planByDate, actualByDate };
    });
  }, [reportData]);

  // ── Date columns (visible dates in current page rows) ──────────────────────
  const dateColumns = useMemo(() => {
    const datesSet = new Set();
    rows.forEach(r => {
      Object.keys(r.planByDate).forEach(d => datesSet.add(d));
      Object.keys(r.actualByDate).forEach(d => datesSet.add(d));
    });
    return Array.from(datesSet).sort().map(d => ({
      key: d,
      label: DateTime.fromISO(d).toFormat("dd-MM"),
    }));
  }, [rows]);

  // ── Summary stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const done = rows.filter(r => r.percentage >= 100).length;
    const inprog = rows.filter(r => r.percentage > 0 && r.percentage < 100).length;
    const notStart = rows.filter(r => r.percentage === 0).length;
    const avgPct = rows.reduce((a, r) => a + r.percentage, 0) / rows.length;
    const totalAct = rows.reduce((a, r) => a + r.totalActual, 0);
    const totalKH = rows.reduce((a, r) => a + r.qtyToProduce, 0);
    return { done, inprog, notStart, avgPct, totalAct, totalKH };
  }, [rows]);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Báo Cáo Kế Hoạch vs Thực Tế</h2>
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

      {/* ── Filter bar ── */}
      <FilterBar
        onSearch={handleSearch}
        onReset={handleReset}
        orders={ordersResp?.data || ordersResp}
        operations={operationsResp?.data || operationsResp}
      />

      {/* ── Stats (chỉ hiện khi có data) ── */}
      {!isLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Tổng KH (trang này)" value={rows.length} icon={Target} color="zinc" sub={`/ ${total.toLocaleString()} toàn bộ`} />
          <StatCard label="Hoàn thành" value={stats.done} icon={CheckCircle2} color="emerald" />
          <StatCard label="Đang SX" value={stats.inprog} icon={Clock} color="indigo" />
          <StatCard label="Chưa bắt đầu" value={stats.notStart} icon={AlertCircle} color="rose" />
          <StatCard label="Tỉ lệ TB" value={`${stats.avgPct.toFixed(0)}%`} icon={TrendingUp} color="amber" sub="trung bình trang này" />
          <StatCard
            label="Tổng SL thực tế"
            value={stats.totalAct.toLocaleString()}
            icon={BarChart3}
            color="indigo"
            sub={`/ ${stats.totalKH.toLocaleString()} cần SX`}
          />
        </div>
      )}

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Table header info */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-black text-zinc-900 uppercase tracking-tight">Danh sách kế hoạch sản xuất</span>
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

        {/* Loading */}
        {isLoading && (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
            <div className="flex items-center justify-center gap-3 pt-4">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="font-black text-zinc-800">Lỗi tải báo cáo</p>
            <p className="text-sm text-zinc-400">{error.message}</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && rows.length === 0 && (
          <div className="p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-zinc-300" />
            </div>
            <div>
              <p className="font-black text-zinc-500 text-sm">Không có dữ liệu</p>
              <p className="text-xs text-zinc-400 mt-1">Hãy thử thay đổi bộ lọc hoặc thêm kế hoạch sản xuất</p>
            </div>
          </div>
        )}

        {/* Data table */}
        {!isLoading && !error && rows.length > 0 && (
          <>
            <ScrollArea className="w-full">
              <div className="min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50 border-b-2 border-zinc-200">
                      {/* Fixed info columns */}
                      <TableHead
                        rowSpan={2}
                        className="sticky left-0 z-40 bg-zinc-50 border-r border-zinc-200 w-10 text-center font-black text-[9px] uppercase text-zinc-500"
                      >STT</TableHead>
                      <SortableHead
                        rowSpan={2}
                        field="sequence_order"
                        label="TT"
                        className="sticky left-10 z-40 bg-zinc-50 border-r border-zinc-200 w-12 text-center font-black text-[9px] uppercase text-zinc-500"
                      />
                      <SortableHead
                        rowSpan={2}
                        field="product_name"
                        label="Mã hàng"
                        className="sticky left-[88px] z-40 bg-zinc-50 border-r border-zinc-200 min-w-[170px] font-black text-[9px] uppercase text-zinc-500"
                      />

                      {/* Info columns (non-sticky) */}
                      <SortableHead rowSpan={2} field="order_code" label="Đơn hàng" className="font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap" />
                      <TableHead rowSpan={2} className="font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap">Nhóm SP</TableHead>
                      <SortableHead rowSpan={2} field="operation_name" label="Công đoạn" className="font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap" />
                      <TableHead rowSpan={2} className="font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap italic">Máy</TableHead>
                      <SortableHead rowSpan={2} field="plan_quantity" label="SL Đơn" className="text-right font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap" />
                      <TableHead rowSpan={2} className="text-right font-black text-[9px] uppercase text-zinc-400 whitespace-nowrap">Tồn kho</TableHead>
                      <TableHead rowSpan={2} className="text-right font-black text-[9px] uppercase text-rose-500 whitespace-nowrap">Cần SX</TableHead>
                      <TableHead rowSpan={2} className="text-right font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap">Định mức</TableHead>
                      <TableHead rowSpan={2} className="text-right font-black text-[9px] uppercase text-emerald-600 whitespace-nowrap min-w-[80px]">Thực tế</TableHead>
                      <TableHead rowSpan={2} className="text-right font-black text-[9px] uppercase text-rose-600 whitespace-nowrap">Còn lại</TableHead>
                      <TableHead rowSpan={2} className="font-black text-[9px] uppercase text-indigo-600 whitespace-nowrap min-w-[130px]">Tiến độ %</TableHead>
                      <TableHead rowSpan={2} className="font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap">Trạng thái</TableHead>
                      <SortableHead rowSpan={2} field="planned_start_date" label="Bắt đầu KH" className="text-center font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap" />
                      <SortableHead rowSpan={2} field="planned_end_date" label="Kết thúc KH" className="text-center font-black text-[9px] uppercase text-zinc-500 whitespace-nowrap" />

                      {/* Date columns */}
                      {dateColumns.map(date => (
                        <TableHead
                          key={date.key}
                          colSpan={2}
                          className="bg-indigo-50/40 text-indigo-700 text-center font-black text-[9px] border-l border-zinc-200 py-2 whitespace-nowrap"
                        >
                          {date.label}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-transparent bg-zinc-50/80">
                      {dateColumns.map(date => (
                        <React.Fragment key={`sub-${date.key}`}>
                          <TableHead className="text-[8px] font-black uppercase text-amber-600 border-l border-zinc-200 bg-amber-50/30 text-center h-7 px-1 whitespace-nowrap">KH</TableHead>
                          <TableHead className="text-[8px] font-black uppercase text-zinc-400 border-l border-zinc-100 text-center h-7 px-1 whitespace-nowrap">TT</TableHead>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow
                        key={row.pp_id || `${row.order_id}-${row.product_id}-${row.product_group_operation_id}`}
                        className="group hover:bg-indigo-50/20 transition-colors border-b border-zinc-100"
                      >
                        {/* STT */}
                        <TableCell className="sticky left-0 z-30 bg-white group-hover:bg-indigo-50/20 font-black text-[10px] text-zinc-400 text-center border-r border-zinc-100 tabular-nums">
                          {(page - 1) * limit + idx + 1}
                        </TableCell>
                        {/* Thứ tự */}
                        <TableCell className="sticky left-10 z-30 bg-white group-hover:bg-indigo-50/20 text-center font-black text-xs text-zinc-700 border-r border-zinc-100">
                          {row.sequence_order || "—"}
                        </TableCell>
                        {/* Mã hàng */}
                        <TableCell className="sticky left-[88px] z-30 bg-white group-hover:bg-indigo-50/20 font-black text-xs text-zinc-950 border-r border-zinc-100 uppercase tracking-tight">
                          <div className="flex flex-col gap-1">
                            <div className="max-w-[170px] truncate" title={row.product_name}>{row.product_name || "—"}</div>
                            {(!row.pp_id) ? (
                              <Badge className="w-fit bg-amber-100 text-amber-700 border-amber-200 text-[8px] font-black h-4 px-1 leading-none uppercase tracking-tighter shadow-none">
                                Nhập trực tiếp
                              </Badge>
                            ) : (
                              <Badge className="w-fit bg-indigo-50 text-indigo-600 border-indigo-100 text-[8px] font-black h-4 px-1 leading-none uppercase tracking-tighter shadow-none">
                                Theo KH
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Đơn hàng */}
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-indigo-700">{row.order_code || row.order_name || "—"}</span>
                            {row.po_customer && (
                              <span className="text-[10px] text-zinc-400 font-medium">{row.po_customer}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Nhóm SP */}
                        <TableCell className="text-[11px] text-zinc-500 font-bold max-w-[100px] truncate">
                          {row.product_group_name || "—"}
                        </TableCell>

                        {/* Công đoạn */}
                        <TableCell className="text-[11px] font-black text-zinc-800 whitespace-nowrap">
                          {row.operation_name || "—"}
                        </TableCell>

                        {/* Máy */}
                        <TableCell className="text-[11px] text-zinc-400 font-bold italic whitespace-nowrap">
                          {row.machine_name || "—"}
                        </TableCell>

                        {/* SL Đơn */}
                        <TableCell className="text-right text-xs font-bold tabular-nums text-zinc-700">
                          {row.planQty.toLocaleString()}
                        </TableCell>
                        {/* Tồn kho */}
                        <TableCell className="text-right text-xs font-bold tabular-nums text-zinc-400">
                          {row.inventory.toLocaleString()}
                        </TableCell>
                        {/* Cần SX */}
                        <TableCell className="text-right text-xs font-black tabular-nums text-rose-500">
                          {row.qtyToProduce.toLocaleString()}
                        </TableCell>
                        {/* Định mức */}
                        <TableCell className="text-right text-xs font-bold tabular-nums text-zinc-500">
                          {row.dinh_muc || "—"}
                        </TableCell>
                        {/* Thực tế */}
                        <TableCell className="text-right text-xs font-black tabular-nums text-emerald-600 bg-emerald-50/30">
                          {row.totalActual.toLocaleString()}
                        </TableCell>
                        {/* Còn lại */}
                        <TableCell className={cn(
                          "text-right text-xs font-black tabular-nums",
                          row.remaining > 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {row.remaining.toLocaleString()}
                        </TableCell>
                        {/* Tiến độ progress bar */}
                        <TableCell className="min-w-[130px]">
                          <ProgressBar pct={row.percentage} />
                        </TableCell>
                        {/* Trạng thái badge */}
                        <TableCell>
                          <StatusBadge pct={row.percentage} />
                        </TableCell>
                        {/* Bắt đầu KH */}
                        <TableCell className="text-center text-[10px] font-bold text-zinc-400 whitespace-nowrap tabular-nums">
                          {row.planned_start_date ? DateTime.fromISO(row.planned_start_date).toFormat("dd/MM") : "—"}
                        </TableCell>
                        {/* Kết thúc KH */}
                        <TableCell className="text-center text-[10px] font-bold text-zinc-400 whitespace-nowrap tabular-nums">
                          {row.planned_end_date ? DateTime.fromISO(row.planned_end_date).toFormat("dd/MM") : "—"}
                        </TableCell>

                        {/* Date columns data */}
                        {dateColumns.map(date => {
                          const pQty = row.planByDate[date.key] || 0;
                          const aQty = row.actualByDate[date.key] || 0;
                          return (
                            <React.Fragment key={`data-${row.id}-${date.key}`}>
                              <TableCell className={cn(
                                "text-right text-[11px] font-black border-l border-zinc-100 tabular-nums px-2",
                                pQty > 0 ? "text-amber-600 bg-amber-50/20" : "text-zinc-200"
                              )}>
                                {pQty > 0 ? pQty.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right text-[11px] font-black border-l border-zinc-100 tabular-nums px-2",
                                aQty > 0 ? "text-zinc-900" : "text-zinc-200"
                              )}>
                                {aQty > 0 ? aQty.toLocaleString() : "—"}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Pagination */}
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
