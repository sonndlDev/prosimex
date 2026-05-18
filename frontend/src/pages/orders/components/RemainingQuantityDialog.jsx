import React from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
    BarChart,
    ShoppingCart,
    CheckCircle2,
    Loader2,
    Package,
    TrendingUp,
    PackageMinus
} from "lucide-react";
import GenericTable from "../../../components/GenericTable";

export default function RemainingQuantityDialog({ open, onClose, orderId }) {
    const { data: summaryData, isLoading, error } = useQuery({
        queryKey: ["order-summary", orderId],
        queryFn: () => orderService.getSummaryReport(orderId),
        enabled: !!orderId && open
    });

    const totals = summaryData?.totals || { required: 0, started: 0, finished: 0, total_sx: 0 };
    const details = summaryData?.details || [];
    const poCode = summaryData?.order?.po_auto_code || "---";

    // Calculate totals for remaining
    const totalRemaining = details.reduce((sum, row) => {
        const required = Number(row.required_quantity) || 0;
        const actual = Number(row.total_sx_quantity) || 0;
        const originalSx = Number(row.original_total_sx) || 0;

        // Nếu chưa có số lượng thực tế (cả average và original đều 0) thì giữ nguyên số lượng order
        // Nếu có thì lấy hiệu số
        const hasActual = actual > 0 || originalSx > 0;
        const remaining = hasActual ? required - actual : required;

        return sum + remaining;
    }, 0);

    const columns = [
        {
            id: "product_name",
            label: "Mã hàng",
            className: "font-black text-indigo-600 align-top align-middle",
            format: (v) => <div className="flex items-center gap-2 mt-2"><Package className="w-3 h-3" /> {v}</div>
        },
        {
            id: "required_quantity",
            label: "SL Order",
            className: "font-bold text-center align-top align-middle",
            format: (v) => <div className="mt-2">{Number(v).toLocaleString()}</div>
        },
        {
            id: "operations_detail",
            label: "Chi tiết công đoạn",
            className: "text-left align-top min-w-[320px] align-middle",
            format: (_, row) => {
                const ops = row.operations_detail || [];
                const plating = Number(row.plating_out_quantity) || 0;
                const packaging = Number(row.packaging_out_quantity) || 0;
                const required = Number(row.required_quantity) || 0;

                if (ops.length === 0 && plating === 0 && packaging === 0) {
                    return <div className="mt-2"><span className="text-zinc-400 italic text-[11px]">Chưa có dữ liệu</span></div>;
                }

                return (
                    <div className="flex flex-col text-[11px] text-zinc-600 mt-1 w-full min-w-[320px]">
                        <div className="flex items-center pb-1.5 mb-1 border-b border-zinc-200 font-black text-[9px] uppercase tracking-widest text-zinc-400 px-1">
                            <span className="flex-1">Công đoạn</span>
                            <span className="w-20 text-right">Thực tế</span>
                            <span className="w-20 text-right text-rose-500">Còn thiếu</span>
                        </div>
                        {ops.map((op, i) => {
                            const actual = Number(op.actual_quantity) || 0;
                            const remaining = Math.max(0, required - actual);
                            return (
                                <div key={i} className="flex items-center py-1.5 border-b border-zinc-50 last:border-0 hover:bg-indigo-50/50 px-1.5 rounded-md transition-colors">
                                    <span className="font-semibold text-zinc-700 truncate pr-4 flex-1">{op.operation_name}</span>
                                    <span className={`w-20 text-right font-black tabular-nums ${actual > 0 ? 'text-indigo-600' : 'text-zinc-300'}`}>
                                        {actual.toLocaleString()}
                                    </span>
                                    <span className={`w-20 text-right font-black tabular-nums ${remaining > 0 ? 'text-rose-500' : 'text-zinc-300'}`}>
                                        {remaining.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                        {plating > 0 && (
                            <div className="flex items-center py-1.5 border-b border-zinc-50 last:border-0 hover:bg-indigo-50/50 px-1.5 rounded-md transition-colors">
                                <span className="font-semibold text-zinc-700 truncate pr-4 flex-1">Mạ (Gia công)</span>
                                <span className="w-20 text-right font-black text-indigo-600 tabular-nums">{plating.toLocaleString()}</span>
                                <span className="w-20 text-right font-black tabular-nums text-rose-500">{Math.max(0, required - plating).toLocaleString()}</span>
                            </div>
                        )}
                        {packaging > 0 && (
                            <div className="flex items-center py-1.5 border-b border-zinc-50 last:border-0 hover:bg-indigo-50/50 px-1.5 rounded-md transition-colors">
                                <span className="font-semibold text-zinc-700 truncate pr-4 flex-1">Đóng gói (Gia công)</span>
                                <span className="w-20 text-right font-black text-indigo-600 tabular-nums">{packaging.toLocaleString()}</span>
                                <span className="w-20 text-right font-black tabular-nums text-rose-500">{Math.max(0, required - packaging).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            id: "total_sx_quantity",
            label: "SL Thực tế (TB)",
            className: "font-black text-center text-emerald-600 align-middle",
            format: (v) => <div className="mt-2">{Number(v).toLocaleString()}</div>
        },
        {
            id: "remaining_quantity",
            label: "SL Còn thiếu",
            className: "font-black text-center text-rose-600 align-middle",
            format: (_, row) => {
                const required = Number(row.required_quantity) || 0;
                const actual = Number(row.total_sx_quantity) || 0;
                const originalSx = Number(row.original_total_sx) || 0;

                const hasActual = actual > 0 || originalSx > 0;
                const remaining = hasActual ? required - actual : required;

                return <div className="mt-2">{remaining.toLocaleString()}</div>;
            }
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl w-[95vw] p-0 overflow-y-auto border-none shadow-2xl rounded-2xl bg-zinc-50">
                <DialogHeader className="p-6 bg-white border-b border-zinc-100 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-zinc-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-600 rounded-xl text-white flex items-center justify-center shadow-lg shadow-rose-100">
                            <PackageMinus className="w-5 h-5" />
                        </div>
                        <div>
                            <span>Báo cáo số lượng còn thiếu</span>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Mã PO: {poCode}</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center gap-3 text-zinc-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest">Đang tải dữ liệu...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                                    <CardContent className="p-5 flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <ShoppingCart className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tổng Order</p>
                                            <h3 className="text-2xl font-black text-indigo-950 tabular-nums">{totals.required.toLocaleString()}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                                    <CardContent className="p-5 flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Đã hoàn thành</p>
                                            <h3 className="text-2xl font-black text-emerald-950 tabular-nums">{totals.total_sx?.toLocaleString()}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                                    <CardContent className="p-5 flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                                            <PackageMinus className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tổng còn lại</p>
                                            <h3 className="text-2xl font-black text-rose-950 tabular-nums">{totalRemaining.toLocaleString()}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Details Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                                <div className="px-5 py-4 border-b border-zinc-50 bg-zinc-50/30">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Chi tiết sản lượng còn lại từng mã hàng</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <GenericTable
                                        data={details}
                                        columns={columns}
                                        className="border-none"
                                        maxHeight="calc(95vh - 490px)"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
