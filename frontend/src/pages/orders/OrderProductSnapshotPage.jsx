import React, { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { DateTime } from "luxon";

import { toast } from "sonner";

import { orderService } from "../../services/order.service";

import GenericTable from "../../components/GenericTable";

import { OrderFormDialog } from "./OrderPage";


import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

import {

  Tooltip,

  TooltipContent,

  TooltipProvider,

  TooltipTrigger,

} from "@/components/ui/tooltip";

import { Camera, AlertTriangle, ArrowRight, RotateCcw, Eye, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";



function DriftCell({ snapshot, current, changed }) {

  if (!changed) {

    return <span className="text-xs font-bold text-zinc-600">{snapshot || "—"}</span>;

  }

  return (

    <div className="space-y-1 min-w-0">

      <p className="text-xs font-bold text-indigo-700 truncate" title={snapshot}>

        {snapshot || "—"}

      </p>

      <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold">

        <ArrowRight className="w-3 h-3 shrink-0" />

        <span className="truncate" title={current}>{current || "—"}</span>

      </div>

    </div>

  );

}



const statusBadge = (status) => {

  const cls = {

    DONE: "bg-emerald-100 text-emerald-800 border-emerald-200",

    IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",

    NOT_STARTED: "bg-zinc-100 text-zinc-800 border-zinc-200",

    PARTIAL_SHIPPED: "bg-blue-100 text-blue-800 border-blue-200",

    WAITING_CONTAINER: "bg-violet-100 text-violet-800 border-violet-200",

  };

  return (

    <Badge variant="outline" className={cn("text-[10px] font-black", cls[status])}>

      {status}

    </Badge>

  );

};



export default function OrderProductSnapshotPage() {
  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(20);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("ALL");

  const [driftOnly, setDriftOnly] = useState(false);

  const [orderIdFilter, setOrderIdFilter] = useState("");

  const [detailOrder, setDetailOrder] = useState(null);

  const [loadingOrderId, setLoadingOrderId] = useState(null);



  const { data, isLoading, error } = useQuery({

    queryKey: ["order-product-snapshots", page, pageSize, search, status, driftOnly, orderIdFilter],

    queryFn: () =>

      orderService.getProductSnapshots({

        page,

        limit: pageSize,

        search: search || undefined,

        status: status !== "ALL" ? status : undefined,

        drift_only: driftOnly ? "true" : undefined,

        order_id: orderIdFilter.trim() || undefined,

      }),

  });



  const rows = data?.data || [];

  const totalItems = data?.total || 0;



  const openOrderDetail = async (orderId) => {

    if (!orderId || loadingOrderId) return;

    setLoadingOrderId(orderId);

    try {

      const order = await orderService.getById(orderId);

      setDetailOrder(order);

    } catch (err) {

      toast.error(err.response?.data?.message || "Không tải được chi tiết đơn hàng");

    } finally {

      setLoadingOrderId(null);

    }

  };



  const columns = [

    {

      id: "order_code",

      label: "Mã đơn",

      format: (_, row) => (

        <button

          type="button"

          onClick={() => openOrderDetail(row.order_id)}

          className="min-w-0 text-left hover:underline"

        >

          <p className="text-xs font-black text-indigo-700">{row.order_code}</p>

          <p className="text-[10px] text-zinc-400 truncate">{row.order_name}</p>

        </button>

      ),

    },

    {

      id: "order_status",

      label: "Trạng thái",

      format: (_, row) => statusBadge(row.order_status),

    },

    {

      id: "customer_name",

      label: "Khách hàng",

      format: (v) => <span className="text-xs font-medium text-zinc-600">{v || "—"}</span>,

    },

    {

      id: "snapshot_product_name",

      label: "Mã hàng (snapshot)",

      format: (_, row) => (

        <DriftCell

          snapshot={row.snapshot_product_name}

          current={row.current_product_name}

          changed={row.has_master_drift && row.snapshot_product_name !== row.current_product_name}

        />

      ),

    },

    {

      id: "snapshot_product_group_name",

      label: "Nhóm hàng (snapshot)",

      format: (_, row) => (

        <DriftCell

          snapshot={row.snapshot_product_group_name}

          current={row.current_product_group_name}

          changed={

            row.has_master_drift &&

            row.snapshot_product_group_name !== row.current_product_group_name

          }

        />

      ),

    },

    {

      id: "quantity",

      label: "SL đơn",

      className: "text-right tabular-nums",

      format: (v) => (

        <span className="text-xs font-black text-zinc-800">

          {parseFloat(v || 0).toLocaleString()}

        </span>

      ),

    },

    {

      id: "snapshot_at",

      label: "Thời điểm snapshot",

      format: (v) =>

        v ? (

          <span className="text-[11px] font-bold text-zinc-500 tabular-nums">

            {DateTime.fromISO(v).toFormat("dd/MM/yyyy HH:mm")}

          </span>

        ) : (

          "—"

        ),

    },

    {

      id: "has_master_drift",

      label: "Lệch master",

      format: (_, row) =>

        row.has_master_drift ? (

          <Badge variant="outline" className="gap-1 text-[10px] font-black bg-amber-50 text-amber-800 border-amber-200">

            <AlertTriangle className="w-3 h-3" /> Có thay đổi

          </Badge>

        ) : (

          <Badge variant="outline" className="text-[10px] font-bold text-zinc-400">

            Khớp

          </Badge>

        ),

    },

    {

      id: "product_id",

      label: "ID master",

      format: (v) => <span className="text-[10px] font-mono text-zinc-400">#{v}</span>,

    },

  ];



  const handleReset = () => {

    setSearch("");

    setStatus("ALL");

    setDriftOnly(false);

    setOrderIdFilter("");

    setPage(1);

  };



  return (

    <div className="space-y-6">

      <div className="flex items-start justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">

        <div className="flex flex-col gap-1">

          <div className="flex items-center gap-2">

            <Camera className="w-6 h-6 text-indigo-600" />

            <h2 className="text-2xl font-black text-zinc-950 tracking-tight">

              Snapshot mã hàng theo đơn

            </h2>

          </div>

          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest max-w-2xl">

            Dữ liệu mã hàng lưu khi tạo/cập nhật đơn — không đổi khi sửa danh mục gốc. Bấm mã đơn hoặc nút xem để mở chi tiết giống trang Đơn hàng.

          </p>

        </div>

      </div>



      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-wrap items-end gap-4">

        <div className="space-y-1.5 min-w-[140px]">

          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">

            ID đơn hàng

          </Label>

          <Input

            value={orderIdFilter}

            onChange={(e) => {

              setOrderIdFilter(e.target.value);

              setPage(1);

            }}

            placeholder="VD: 12"

            className="h-10 font-bold"

          />

        </div>

        <div className="space-y-1.5 min-w-[160px]">

          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">

            Trạng thái đơn

          </Label>

          <Select

            value={status}

            onValueChange={(v) => {

              setStatus(v);

              setPage(1);

            }}

          >

            <SelectTrigger className="h-10 font-bold">

              <SelectValue />

            </SelectTrigger>

            <SelectContent>

              {["ALL", "NOT_STARTED", "IN_PROGRESS", "DONE", "PARTIAL_SHIPPED", "WAITING_CONTAINER"].map((s) => (

                <SelectItem key={s} value={s}>

                  {s === "ALL" ? "Tất cả" : s === "NOT_STARTED" ? "Chưa sản xuất" : s === "IN_PROGRESS" ? "Đang sản xuất" : s === "DONE" ? "Hoàn thành" : s === "PARTIAL_SHIPPED" ? "Đã xuất 1 phần" : s === "WAITING_CONTAINER" ? "Chờ xuất cont" : s}

                </SelectItem>

              ))}

            </SelectContent>

          </Select>

        </div>

        <div className="flex items-center gap-3 pb-1">

          <Switch

            id="drift-only"

            checked={driftOnly}

            onCheckedChange={(v) => {

              setDriftOnly(v);

              setPage(1);

            }}

          />

          <Label htmlFor="drift-only" className="text-xs font-bold text-zinc-600 cursor-pointer">

            Chỉ dòng lệch master

          </Label>

        </div>

        <Button

          type="button"

          variant="outline"

          onClick={handleReset}

          className="h-10 gap-2 font-bold text-xs ml-auto"

        >

          <RotateCcw className="w-4 h-4" /> Đặt lại bộ lọc

        </Button>

      </div>



      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">

        <GenericTable

          data={rows}

          columns={columns}

          isLoading={isLoading}

          error={error}

          isServerSide

          totalItems={totalItems}

          page={page}

          pageSize={pageSize}

          onPageChange={setPage}

          onPageSizeChange={setPageSize}

          onSearchChange={(v) => {

            setSearch(v);

            setPage(1);

          }}

          renderActions={(row) => (

            <TooltipProvider>

              <Tooltip>

                <TooltipTrigger

                  onClick={() => openOrderDetail(row.order_id)}

                  className="p-2 rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"

                >

                  {loadingOrderId === row.order_id ? (

                    <Loader2 className="w-4 h-4 animate-spin" />

                  ) : (

                    <Eye className="w-4 h-4" />

                  )}

                </TooltipTrigger>

                <TooltipContent>

                  <p className="text-[10px] font-bold">Xem chi tiết đơn hàng</p>

                </TooltipContent>

              </Tooltip>

            </TooltipProvider>

          )}

        />

      </div>



      <OrderFormDialog

        open={!!detailOrder}

        onClose={() => setDetailOrder(null)}

        order={detailOrder}

      />

    </div>

  );

}


