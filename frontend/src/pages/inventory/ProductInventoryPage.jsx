import React, { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
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
    Boxes,
    RotateCcw,
    Edit2,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Truck
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ProductInventoryPage() {
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const initialFilters = {
        search: "",
        inventory_type: "ALL",
        completed: "false"
    };

    const [tempFilters, setTempFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);

    const handleSearch = useCallback((filters) => {
        setPage(1);
        setAppliedFilters(filters);
    }, []);

    const handleReset = useCallback(() => {
        setPage(1);
        setAppliedFilters(initialFilters);
    }, [initialFilters]);


    // Form states
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedOps, setSelectedOps] = useState([]); // Array of operation objects
    const [formItems, setFormItems] = useState({}); // { opId: { quantity: '', note: '' } }
    const [isProductOpen, setIsProductOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [exportRecord, setExportRecord] = useState(null);
    const [exportQuantity, setExportQuantity] = useState("");
    const [exportNote, setExportNote] = useState("");

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
        queryKey: ["product-inventory", page, pageSize, appliedFilters],
        queryFn: () => inventoryService.getAll({ page, limit: pageSize, ...appliedFilters })
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

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => inventoryService.update(id, payload),
        onSuccess: () => {
            toast.success("Đã cập nhật tồn kho thành công");
            queryClient.invalidateQueries({ queryKey: ["product-inventory"] });
            setEditingRecord(null);
            setEditFormData({});
        },
        onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi cập nhật tồn kho")
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => inventoryService.delete(id),
        onSuccess: () => {
            toast.success("Đã xóa tồn kho thành công");
            queryClient.invalidateQueries({ queryKey: ["product-inventory"] });
            setDeleteConfirmId(null);
        },
        onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi xóa tồn kho")
    });

    const completeMutation = useMutation({
        mutationFn: (id) => inventoryService.complete(id),
        onSuccess: () => {
            toast.success("Đã hoàn thành tồn kho");
            queryClient.invalidateQueries({ queryKey: ["product-inventory"] });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi hoàn thành tồn kho")
    });

    const exportMutation = useMutation({
        mutationFn: ({ id, payload }) => inventoryService.exportInventory(id, payload),
        onSuccess: () => {
            toast.success("Đã xuất kho thành công");
            queryClient.invalidateQueries({ queryKey: ["product-inventory"] });
            setExportRecord(null);
            setExportQuantity("");
            setExportNote("");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi xuất kho")
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

    const handleEditClick = (record) => {
        setEditingRecord(record);
        setEditFormData({
            quantity: record.quantity,
            note: record.note,
            inventory_type: record.inventory_type
        });
    };

    const handleEditSave = () => {
        if (!editingRecord) return;
        if (editFormData.quantity === '' || isNaN(parseFloat(editFormData.quantity))) {
            return toast.error("Số lượng không hợp lệ");
        }

        updateMutation.mutate({
            id: editingRecord.id,
            payload: {
                quantity: parseFloat(editFormData.quantity),
                note: editFormData.note,
                inventory_type: editFormData.inventory_type
            }
        });
    };

    const handleDeleteClick = (record) => {
        setDeleteConfirmId(record.id);
    };

    const handleConfirmDelete = () => {
        if (!deleteConfirmId) return;
        deleteMutation.mutate(deleteConfirmId);
    };

    const handleExportClick = (record) => {
        setExportRecord(record);
        setExportQuantity("");
        setExportNote("");
    };

    const handleExportConfirm = () => {
        if (!exportRecord) return;
        const qty = parseFloat(exportQuantity);
        if (isNaN(qty) || qty <= 0) return toast.error("Số lượng xuất không hợp lệ");
        if (qty > parseFloat(exportRecord.quantity)) return toast.error("Số lượng xuất vượt quá tồn kho");
        exportMutation.mutate({
            id: exportRecord.id,
            payload: { quantity: qty, note: exportNote }
        });
    };

    const tableColumns = [
        {
            id: "product_name",
            label: "Mã hàng",
            className: "font-black text-indigo-600",
            format: (v) => <div className="flex items-center gap-2"><Package className="w-3 h-3" /> {v}</div>
        },
        {
            id: "operation_name",
            label: "Công đoạn",
            className: "font-bold text-zinc-700",
            format: (v, row) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-none font-bold uppercase text-[9px] w-fit">{v}</Badge>
                        {row.completed_at && (
                            <Badge className="text-[8px] font-black uppercase px-2 py-0 h-4 border-none w-fit bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                                Hoàn thành
                            </Badge>
                        )}
                    </div>
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
        {
            id: "used_quantity",
            label: "Đã xuất",
            className: "font-bold text-right",
            format: (v) => <span className="text-amber-600">{Number(v || 0).toLocaleString()}</span>
        },
        { id: "note", label: "Ghi chú", className: "text-zinc-500 italic text-xs max-w-[200px] truncate" },
        { id: "recorder_name", label: "Người nhập", className: "font-medium text-xs" },
        {
            id: "recorded_at",
            label: "Ngày nhập",
            format: (v) => DateTime.fromISO(v).toFormat("dd/MM/yyyy HH:mm")
        },
        {
            id: "actions",
            label: "Thao tác",
            className: "text-center",
            format: (v, row) => (
                <div className="flex items-center justify-center gap-2">
                    {hasPermission('product_inventory:update') && !row.completed_at && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                            onClick={() => handleExportClick(row)}
                            title="Xuất kho"
                        >
                            <Truck className="w-4 h-4" />
                        </Button>
                    )}
                    {hasPermission('product_inventory:update') && !row.completed_at && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => completeMutation.mutate(row.id)}
                            disabled={completeMutation.isPending}
                            title="Hoàn thành"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </Button>
                    )}
                    {hasPermission('product_inventory:update') && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                            onClick={() => handleEditClick(row)}
                            title="Chỉnh sửa"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    )}
                    {hasPermission('product_inventory:delete') && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteClick(row)}
                            title="Xóa"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            )
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

                        <InventoryFilterBar
                            initialFilters={initialFilters}
                            onSearch={handleSearch}
                            onReset={handleReset}
                        />

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

            {/* Edit Modal */}
            <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
                <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="bg-zinc-50 border-b border-zinc-100 p-6">
                        <DialogTitle className="text-lg font-black uppercase tracking-tight text-zinc-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Edit2 className="w-5 h-5" />
                            </div>
                            Chỉnh sửa tồn kho
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                            <p className="text-xs font-bold text-zinc-500 uppercase">Sản phẩm: <span className="text-indigo-600 ml-2">{editingRecord?.product_name}</span></p>
                            <p className="text-xs font-bold text-zinc-500 uppercase mt-1">Công đoạn: <span className="text-indigo-600 ml-2">{editingRecord?.operation_name}</span></p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-tighter text-zinc-500 pl-1">Số lượng</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                className="h-10 font-black text-blue-600 focus:ring-indigo-500"
                                value={editFormData.quantity}
                                onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-tighter text-zinc-500 pl-1">Loại tồn kho</Label>
                            <Select value={editFormData.inventory_type} onValueChange={(val) => setEditFormData({ ...editFormData, inventory_type: val })}>
                                <SelectTrigger className="h-10 text-sm font-medium border-zinc-200 rounded-lg bg-zinc-50 hover:bg-white transition-all">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BTP">Bán thành phẩm (BTP)</SelectItem>
                                    <SelectItem value="TP">Thành phẩm (TP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-tighter text-zinc-500 pl-1">Ghi chú</Label>
                            <Textarea
                                placeholder="Nhập ghi chú..."
                                className="font-medium text-sm border-zinc-200 rounded-lg bg-zinc-50 hover:bg-white transition-all focus:ring-indigo-500"
                                rows={3}
                                value={editFormData.note}
                                onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="bg-zinc-50 border-t border-zinc-100 p-6">
                        <Button
                            variant="ghost"
                            onClick={() => setEditingRecord(null)}
                            className="font-bold text-zinc-500 hover:text-zinc-700"
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 px-8"
                            disabled={updateMutation.isPending}
                            onClick={handleEditSave}
                        >
                            {updateMutation.isPending ? "Đang lưu..." : (
                                <><Save className="w-4 h-4 mr-2" /> Cập nhật</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="max-w-sm p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="bg-red-50 border-b border-red-100 p-6">
                        <DialogTitle className="text-lg font-black uppercase tracking-tight text-red-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-500 rounded-xl text-white flex items-center justify-center shadow-lg shadow-red-100">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            Xác nhận xóa
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6">
                        <p className="text-sm text-zinc-600 font-medium">
                            Bạn chắc chắn muốn xóa bản ghi tồn kho này? Hành động này không thể hoàn tác.
                        </p>
                    </div>

                    <DialogFooter className="bg-zinc-50 border-t border-zinc-100 p-6">
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(null)}
                            className="font-bold text-zinc-500 hover:text-zinc-700"
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all active:scale-[0.98] disabled:opacity-50 px-8"
                            disabled={deleteMutation.isPending}
                            onClick={handleConfirmDelete}
                        >
                            {deleteMutation.isPending ? "Đang xóa..." : (
                                <><Trash2 className="w-4 h-4 mr-2" /> Xóa</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Inventory Modal */}
            <Dialog open={!!exportRecord} onOpenChange={(open) => !open && setExportRecord(null)}>
                <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="bg-amber-50 border-b border-amber-100 p-6">
                        <DialogTitle className="text-lg font-black uppercase tracking-tight text-amber-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl text-white flex items-center justify-center shadow-lg shadow-amber-100">
                                <Truck className="w-5 h-5" />
                            </div>
                            Xuất kho
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                            <p className="text-xs font-bold text-zinc-500 uppercase">Sản phẩm: <span className="text-indigo-600 ml-2">{exportRecord?.product_name}</span></p>
                            <p className="text-xs font-bold text-zinc-500 uppercase mt-1">Công đoạn: <span className="text-indigo-600 ml-2">{exportRecord?.operation_name}</span></p>
                            <p className="text-xs font-bold text-zinc-500 uppercase mt-1">Tồn kho hiện tại: <span className="text-blue-600 ml-2">{Number(exportRecord?.quantity).toLocaleString()}</span></p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-tighter text-zinc-500 pl-1">Số lượng xuất <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                placeholder="Nhập số lượng..."
                                className="h-10 font-black text-blue-600 focus:ring-indigo-500"
                                value={exportQuantity}
                                onChange={(e) => setExportQuantity(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-tighter text-zinc-500 pl-1">Ghi chú <span className="text-zinc-400 font-normal">(tuỳ chọn)</span></Label>
                            <Textarea
                                placeholder="Nhập lý do xuất kho..."
                                className="font-medium text-sm border-zinc-200 rounded-lg bg-zinc-50 hover:bg-white transition-all focus:ring-indigo-500"
                                rows={3}
                                value={exportNote}
                                onChange={(e) => setExportNote(e.target.value)}
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-700 font-medium">
                                Hệ thống sẽ tách thành 2 bản ghi: bản ghi gốc giảm số lượng, bản ghi mới ghi nhận số đã xuất.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="bg-zinc-50 border-t border-zinc-100 p-6">
                        <Button
                            variant="ghost"
                            onClick={() => setExportRecord(null)}
                            className="font-bold text-zinc-500 hover:text-zinc-700"
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest shadow-lg shadow-amber-100 transition-all active:scale-[0.98] disabled:opacity-50 px-8"
                            disabled={exportMutation.isPending || !exportQuantity}
                            onClick={handleExportConfirm}
                        >
                            {exportMutation.isPending ? "Đang xuất..." : (
                                <><Truck className="w-4 h-4 mr-2" /> Xác nhận xuất</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const InventoryFilterBar = memo(({ initialFilters, onSearch, onReset }) => {
    const [tempFilters, setTempFilters] = useState(initialFilters);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(tempFilters);
    };

    const handleClear = () => {
        setTempFilters(initialFilters);
        onReset();
    };

    return (
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-200/60 shadow-sm sticky top-0 z-50">
            <form className="flex flex-col xl:flex-row items-center gap-4" onSubmit={handleSubmit}>
                {/* Search */}
                <div className="flex-1 w-full">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                            placeholder="Tìm mã hàng, tên sản phẩm..."
                            value={tempFilters.search}
                            onChange={e => setTempFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="pl-10 h-10 text-sm font-medium border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white focus:bg-white transition-all focus-visible:ring-indigo-500/30 shadow-sm"
                        />
                    </div>
                </div>

                {/* Filters Grid */}
                <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                    {/* Loại tồn kho */}
                    <Select
                        value={tempFilters.inventory_type}
                        onValueChange={val => setTempFilters(prev => ({ ...prev, inventory_type: val }))}
                    >
                        <SelectTrigger className="h-10 text-[11px] font-bold border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white transition-all shadow-sm w-full xl:w-48">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-zinc-400 whitespace-nowrap uppercase tracking-tighter">Loại:</span>
                                <SelectValue placeholder="Tất cả" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả</SelectItem>
                            <SelectItem value="BTP">Bán thành phẩm (BTP)</SelectItem>
                            <SelectItem value="TP">Thành phẩm (TP)</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Trạng thái hoàn thành */}
                    <Select
                        value={tempFilters.completed}
                        onValueChange={val => setTempFilters(prev => ({ ...prev, completed: val }))}
                    >
                        <SelectTrigger className="h-10 text-[11px] font-bold border-zinc-200/80 rounded-xl bg-zinc-50/50 hover:bg-white transition-all shadow-sm w-full xl:w-48">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-zinc-400 whitespace-nowrap uppercase tracking-tighter">Trạng thái:</span>
                                <SelectValue placeholder="Tất cả" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả</SelectItem>
                            <SelectItem value="false">Chưa hoàn thành</SelectItem>
                            <SelectItem value="true">Đã hoàn thành</SelectItem>
                        </SelectContent>
                    </Select>
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
                                    onClick={handleClear}
                                    className="w-10 h-10 p-0 border-zinc-200/80 text-zinc-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl bg-white transition-all shadow-sm"
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

