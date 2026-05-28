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
    PlayCircle,
    CheckCircle2,
    Loader2,
    Package,
    TrendingUp
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import GenericTable from "../../../components/GenericTable";
import { cn } from "@/lib/utils";

export default function OrderSummaryDialog({ open, onClose, orderId }) {
    const { data: summaryData, isLoading, error } = useQuery({
        queryKey: ["order-summary", orderId],
        queryFn: () => orderService.getSummaryReport(orderId),
        enabled: !!orderId && open
    });

    const totals = summaryData?.totals || { required: 0, started: 0, finished: 0, total_sx: 0 };
    const details = summaryData?.details || [];
    const poCode = summaryData?.order?.po_auto_code || "---";

    const completionRate = totals.required > 0 ? (totals.total_sx / totals.required) * 100 : 0;
    const startedRate = totals.required > 0 ? (totals.started / totals.required) * 100 : 0;

    const columns = [
        {
            id: "product_name",
            label: "Mã hàng",
            className: "font-black text-indigo-600",
            format: (v) => <div className="flex items-center gap-2"><Package className="w-3 h-3" /> {v}</div>
        },
        {
            id: "required_quantity",
            label: "SL Order",
            className: "font-bold text-center",
            format: (v) => Number(v).toLocaleString()
        },
        {
            id: "total_sx_quantity",
            label: "Đã hoàn thành\n(Giá trị TB)",
            className: "font-black text-center text-emerald-600",
            format: (v) => Number(v).toLocaleString()
        },
        {
            id: "finished_quantity",
            label: "C.Đoạn cuối",
            className: "font-black text-center text-blue-600",
            format: (v) => Number(v).toLocaleString()
        },

        // {
        //     id: "finished_quantity",
        //     label: "C.Đoạn cuối)",
        //     className: "font-black text-center text-blue-600",
        //     format: (v) => Number(v).toLocaleString()
        // },
        {
            id: "plating_out_quantity",
            label: "Xi mạ đi",
            className: "font-bold text-center text-indigo-500",
            format: (v) => Number(v).toLocaleString()
        },
        {
            id: "plating_returned_quantity",
            label: "Xi mạ về",
            className: "font-bold text-center text-teal-500",
            format: (v) => Number(v).toLocaleString()
        },
        {
            id: "packaging_out_quantity",
            label: "Đóng gói",
            className: "font-bold text-center text-purple-500",
            format: (v) => Number(v).toLocaleString()
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl w-[95vw] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <DialogHeader className="p-6 border-b border-[rgb(var(--c-line))] flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-zinc-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                            <BarChart className="w-5 h-5" />
                        </div>
                        <div>
                            <span>Báo cáo tổng hợp đơn hàng</span>
                            <p className="text-[10px] font-bold text-[rgb(var(--c-ink-4))] uppercase tracking-widest mt-0.5">Mã PO: {poCode}</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center gap-3 text-[rgb(var(--c-ink-4))]">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest">Đang tính toán sản lượng...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card className="border-none shadow-sm overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                                    <CardContent className="p-5 flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                            <ShoppingCart className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-4))]">Tổng Order</p>
                                            <h3 className="text-2xl font-black text-indigo-950 tabular-nums">{totals.required.toLocaleString()}</h3>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                                    <CardContent className="p-5 flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-4))]">Đã hoàn thành</p>
                                            <h3 className="text-2xl font-black text-emerald-950 tabular-nums">{totals.total_sx?.toLocaleString()}</h3>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[10px] font-bold text-emerald-600">{completionRate.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>



                            {/* Details Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-[rgb(var(--c-line))] overflow-hidden">
                                <div className="px-5 py-4 border-b border-zinc-50/30">
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-3))]">Chi tiết sản lượng mã hàng</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <GenericTable
                                        data={details}
                                        columns={columns}
                                        className="border-none min-w-[1000px]"
                                        maxHeight="calc(100vh - 555px)"
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
