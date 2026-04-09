import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../../services/product.service";
import { productGroupService } from "../../services/product-group.service";
import { inventoryService } from "../../services/product-inventory.service";
import GenericTable from "../../components/GenericTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { 
    Package, 
    Layers, 
    Plus, 
    Search, 
    Check, 
    ChevronsUpDown, 
    Save, 
    History,
    X,
    ClipboardList,
    Boxes
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProductInventoryPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");

    // Form states
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedOps, setSelectedOps] = useState([]); // Array of operation objects
    const [formItems, setFormItems] = useState({}); // { opId: { quantity: '', note: '' } }
    const [isProductOpen, setIsProductOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch data
    const { data: productsData } = useQuery({
        queryKey: ["products", "all"],
        queryFn: () => productService.getAll({ limit: 1000 })
    });
    const products = productsData?.data || [];

    const { data: operations, isLoading: isLoadingOps } = useQuery({
        queryKey: ["product-group-ops", selectedProduct?.product_group_id],
        queryFn: () => productGroupService.getOperations(selectedProduct.product_group_id),
        enabled: !!selectedProduct?.product_group_id
    });

    const { data: inventoryData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ["product-inventory", page, pageSize, search],
        queryFn: () => inventoryService.getAll({ page, limit: pageSize, search })
    });

    // Mutations
    const saveMutation = useMutation({
        mutationFn: (payload) => inventoryService.save(payload),
        onSuccess: () => {
            toast.success("Đã lưu tồn kho thành công");
            queryClient.invalidateQueries({ queryKey: ["product-inventory"] });
            resetForm();
        },
        onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi lưu tồn kho")
    });

    // Handlers
    const resetForm = () => {
        setSelectedProduct(null);
        setSelectedOps([]);
        setFormItems({});
        setIsProductOpen(false);
    };

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setSelectedOps([]);
        setFormItems({});
        setIsProductOpen(false);
    };

    const toggleOp = (op) => {
        if (selectedOps.find(o => o.id === op.id)) {
            setSelectedOps(selectedOps.filter(o => o.id !== op.id));
            const newFormItems = { ...formItems };
            delete newFormItems[op.id];
            setFormItems(newFormItems);
        } else {
            setSelectedOps([...selectedOps, op]);
            setFormItems({
                ...formItems,
                [op.id]: { quantity: '', note: '', inventory_type: 'BTP' }
            });
        }
    };

    const handleInputChange = (opId, field, value) => {
        setFormItems({
            ...formItems,
            [opId]: { ...formItems[opId], [field]: value }
        });
    };

    const handleSave = () => {
        if (!selectedProduct) return toast.error("Vui lòng chọn mã hàng");
        if (selectedOps.length === 0) return toast.error("Vui lòng chọn ít nhất một công đoạn");

        const items = selectedOps.map(op => ({
            operation_id: op.operation_id,
            quantity: parseFloat(formItems[op.id]?.quantity || 0),
            note: formItems[op.id]?.note || "",
            inventory_type: formItems[op.id]?.inventory_type || "BTP"
        }));

        if (items.some(it => isNaN(it.quantity) || it.quantity < 0)) {
            return toast.error("Số lượng không hợp lệ");
        }

        saveMutation.mutate({
            product_id: selectedProduct.id,
            items
        }, {
            onSuccess: () => {
                setIsModalOpen(false);
            }
        });
    };

    const tableColumns = [
        { 
            id: "product_name", 
            label: "Mã hàng", 
            className: "font-black text-indigo-600",
            format: (v) => <div className="flex items-center gap-2"><Package className="w-3 h-3"/> {v}</div>
        },
        { 
            id: "operation_name", 
            label: "Công đoạn", 
            className: "font-bold text-zinc-700",
            format: (v, row) => (
                <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-none font-bold uppercase text-[9px] w-fit">{v}</Badge>
                    <Badge className={cn(
                        "text-[8px] font-black uppercase px-2 py-0 h-4 border-none w-fit",
                        row.inventory_type === 'TP' ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                    )}>
                        {row.inventory_type === 'TP' ? 'Thành phẩm' : 'Bán thành phẩm'}
                    </Badge>
                </div>
            )
        },
        { 
            id: "quantity", 
            label: "Số lượng", 
            className: "font-black text-right",
            format: (v) => <span className="text-blue-600">{Number(v).toLocaleString()}</span>
        },
        { id: "note", label: "Ghi chú", className: "text-zinc-500 italic text-xs max-w-[200px] truncate" },
        { id: "recorder_name", label: "Người nhập", className: "font-medium text-xs" },
        { 
            id: "recorded_at", 
            label: "Ngày nhập", 
            format: (v) => DateTime.fromISO(v).toFormat("dd/MM/yyyy HH:mm")
        }
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                        <Boxes className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-zinc-950">Tồn kho BTP & TP</h1>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Quản lý số lượng tồn kho theo sản phẩm</p>
                    </div>
                </div>

                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 border-none px-6 gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Tạo mới tồn kho
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* History Section - Full Width */}
                <div className="flex flex-col gap-4">
                    <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden flex flex-col h-full min-h-[600px]">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 py-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <History className="w-4 h-4 text-indigo-600" />
                                Lịch sử nhập tồn kho
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            <GenericTable
                                data={inventoryData?.data || []}
                                columns={tableColumns}
                                isLoading={isLoadingHistory}
                                isServerSide={true}
                                totalItems={inventoryData?.total || 0}
                                page={page}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={setPageSize}
                                onSearchChange={setSearch}
                                className="border-none"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal Form */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="bg-zinc-50 border-b border-zinc-100 p-6">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-zinc-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Plus className="w-5 h-5" />
                            </div>
                            Nhập tồn kho mới
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Product Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-tighter text-zinc-500 pl-1">Mã hàng</Label>
                            <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full h-11 justify-between bg-zinc-50 border-zinc-200 hover:bg-white hover:border-indigo-300 transition-all text-zinc-900 font-bold"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                                            <span className="truncate">{selectedProduct ? selectedProduct.name : "Chọn mã hàng..."}</span>
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                    <Command className="w-full">
                                        <CommandInput placeholder="Tìm mã hàng..." className="h-11 border-none focus:ring-0" />
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty className="py-6 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">Không tìm thấy mã hàng</CommandEmpty>
                                            <CommandGroup title="Danh sách mã hàng">
                                                {products.map((p) => (
                                                    <CommandItem
                                                        key={p.id}
                                                        value={p.name}
                                                        onSelect={() => handleProductSelect(p)}
                                                        className="flex items-center justify-between px-4 py-3 cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors border-b border-zinc-50 last:border-none"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black">{p.name}</span>
                                                            <span className="text-[10px] text-zinc-400 font-bold uppercase">{p.product_group_name}</span>
                                                        </div>
                                                        <Check className={cn("h-4 w-4 text-indigo-600", selectedProduct?.id === p.id ? "opacity-100" : "opacity-0")} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Operation Selector */}
                        {selectedProduct && (
                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-tighter text-zinc-500 pl-1">Chọn công đoạn</Label>
                                    <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl">
                                        {isLoadingOps ? (
                                            <span className="text-xs text-zinc-400 italic p-1">Đang tải danh sách công đoạn...</span>
                                        ) : operations?.length > 0 ? (
                                            operations.map((op) => (
                                                <Badge
                                                    key={op.id}
                                                    variant={selectedOps.find(o => o.id === op.id) ? "default" : "outline"}
                                                    className={cn(
                                                        "cursor-pointer font-bold px-3 py-1.5 transition-all active:scale-95 text-[10px] uppercase tracking-tight",
                                                        selectedOps.find(o => o.id === op.id) 
                                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 border-none" 
                                                            : "bg-white text-zinc-500 hover:text-indigo-600 hover:border-indigo-300 border-zinc-200 shadow-sm"
                                                    )}
                                                    onClick={() => toggleOp(op)}
                                                >
                                                    {op.operation_name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-zinc-400 italic p-1 text-center w-full">Sản phẩm này chưa có quy trình công đoạn</span>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Inputs with ScrollArea */}
                                {selectedOps.length > 0 && (
                                    <ScrollArea className="h-[300px] pr-4 pt-4 border-t border-zinc-100 animate-in fade-in duration-300">
                                        <div className="space-y-4 pb-4">
                                            {selectedOps.map((op) => (
                                                <div key={op.id} className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm relative group overflow-hidden transition-all hover:border-indigo-200">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[10px] uppercase px-3 py-1">
                                                                {op.operation_name}
                                                            </Badge>
                                                            <div className="flex items-center bg-zinc-100 rounded-lg p-0.5 border border-zinc-200">
                                                                <button
                                                                    className={cn(
                                                                        "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                                                                        formItems[op.id]?.inventory_type === 'BTP' 
                                                                            ? "bg-white text-orange-600 shadow-sm" 
                                                                            : "text-zinc-400 hover:text-zinc-600"
                                                                    )}
                                                                    onClick={() => handleInputChange(op.id, 'inventory_type', 'BTP')}
                                                                >
                                                                    BTP
                                                                </button>
                                                                <button
                                                                    className={cn(
                                                                        "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                                                                        formItems[op.id]?.inventory_type === 'TP' 
                                                                            ? "bg-white text-emerald-600 shadow-sm" 
                                                                            : "text-zinc-400 hover:text-zinc-600"
                                                                    )}
                                                                    onClick={() => handleInputChange(op.id, 'inventory_type', 'TP')}
                                                                >
                                                                    TP
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-zinc-300 hover:text-red-500" onClick={() => toggleOp(op)}>
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="col-span-1 space-y-1.5">
                                                            <Label className="text-[10px] font-black uppercase text-zinc-400">Số lượng</Label>
                                                            <Input 
                                                                type="number" 
                                                                placeholder="0"
                                                                className="h-10 font-black text-blue-600 focus:ring-indigo-500" 
                                                                value={formItems[op.id]?.quantity || ''}
                                                                onChange={(e) => handleInputChange(op.id, 'quantity', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="col-span-2 space-y-1.5">
                                                            <Label className="text-[10px] font-black uppercase text-zinc-400">Ghi chú</Label>
                                                            <Input 
                                                                placeholder="Nhập ghi chú..." 
                                                                className="h-10 text-sm font-medium"
                                                                value={formItems[op.id]?.note || ''}
                                                                onChange={(e) => handleInputChange(op.id, 'note', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="bg-zinc-50 border-t border-zinc-100 p-6">
                        <Button 
                            variant="ghost" 
                            onClick={() => {
                                setIsModalOpen(false);
                                resetForm();
                            }}
                            className="font-bold text-zinc-500 hover:text-zinc-700"
                        >
                            Hủy
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 px-8"
                            disabled={!selectedProduct || selectedOps.length === 0 || saveMutation.isPending}
                            onClick={handleSave}
                        >
                            {saveMutation.isPending ? "Đang lưu..." : (
                                <><Save className="w-4 h-4 mr-2" /> Lưu tồn kho</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
