import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenericTable from "@/components/GenericTable";
import { getAuditColumn } from "@/utils/audit";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Search, Calendar, Package, Tag, Hash, Building2, CheckCircle2, ShoppingCart, PaintBucket, ChevronsUpDown, Check, AlertCircle, Trash2, Settings, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { outsourcingService } from "@/services/outsourcing.service";
import { orderService } from "@/services/order.service";
import { productService } from "@/services/product.service";
import { supplierService } from "@/services/supplier.service";
import { PremiumDatePicker } from "@/components/PremiumDatePicker";
import { DateTime } from "luxon";

export default function OutsourcingPage() {
  const [activeTab, setActiveTab] = useState("plating");

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Gia công ngoài</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Quản lý xuất/nhập hàng gia công (Xi mạ & Đóng gói)</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
        <div className="flex justify-start">
          <TabsList className="flex flex-row h-12 bg-zinc-100 p-1 border border-zinc-200 shadow-inner rounded-full w-full max-w-lg">
            <TabsTrigger
              value="plating"
              className={cn(
                "flex-1 h-full font-black text-xs rounded-full transition-all duration-300 group gap-2",
                activeTab === "plating"
                  ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50"
                  : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700"
              )}
            >
              <PaintBucket className={cn("w-4 h-4 transition-transform duration-300", activeTab === "plating" ? "scale-110" : "opacity-60")} />
              Xi mạ - Sơn
            </TabsTrigger>
            <TabsTrigger
              value="packaging"
              className={cn(
                "flex-1 h-full font-black text-xs rounded-full transition-all duration-300 group gap-2",
                activeTab === "packaging"
                  ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50"
                  : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700"
              )}
            >
              <Package className={cn("w-4 h-4 transition-transform duration-300", activeTab === "packaging" ? "scale-110" : "opacity-60")} />
              Đóng gói
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-w-0">
          <TabsContent value="plating" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <OutsourcingContent type="PLATING" />
          </TabsContent>
          <TabsContent value="packaging" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
            <OutsourcingContent type="PACKAGING" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OutsourcingContent({ type }) {
  const [subTab, setSubTab] = useState("history");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resOrders, resProducts, resSuppliers] = await Promise.all([
        orderService.getAll({ limit: 500 }),
        productService.getAll({ limit: 500 }),
        supplierService.getAll({ limit: 500 })
      ]);
      setOrders(resOrders.data || []);
      setProducts(resProducts.data || []);
      setSuppliers(resSuppliers || []);
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu");
    }
  };

  return (
    <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white rounded-2xl">
      <CardHeader className="p-0 border-b border-zinc-100 bg-white">
        <div className="px-6 pt-6">
          <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
            <TabsList className="flex w-full bg-zinc-100 p-1 rounded-full border border-zinc-200 max-w-md h-10 shadow-inner">
              <TabsTrigger
                value="history"
                className={cn(
                  "flex-1 font-black rounded-full h-full transition-all text-[10px] uppercase tracking-widest",
                  subTab === "history"
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Danh sách
              </TabsTrigger>
              <TabsTrigger
                value="out"
                className={cn(
                  "flex-1 font-black rounded-full h-full transition-all text-[10px] uppercase tracking-widest",
                  subTab === "out"
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                {type === 'PACKAGING' ? 'SL Đóng gói' : 'Phiếu ĐI'}
              </TabsTrigger>
              {type !== 'PACKAGING' && (
                <TabsTrigger
                  value="in"
                  className={cn(
                    "flex-1 font-black rounded-full h-full transition-all text-[10px] uppercase tracking-widest",
                    subTab === "in"
                      ? "bg-white text-indigo-600 shadow-md"
                      : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  Phiếu VỀ
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8">
        {subTab === "out" && <OutboundTicketForm type={type} orders={orders} products={products} suppliers={suppliers} />}
        {subTab === "in" && type !== 'PACKAGING' && <InboundTicketForm type={type} />}
        {subTab === "history" && <OutsourcingHistory type={type} orders={orders} products={products} />}
      </CardContent>
    </Card>
  );
}

function SupplierSelect({ value, onChange, suppliers }) {
  const selected = suppliers.find(s => String(s.id) === String(value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "w-full h-11 justify-between bg-white border-zinc-200 shadow-sm",
            !value ? "text-zinc-500 font-medium" : "text-zinc-900 font-bold"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className={cn("h-4 w-4 shrink-0", value ? "text-blue-600" : "text-zinc-400")} />
            <span className="truncate">
              {value && selected ? selected.name : "Chọn nhà cung cấp"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-zinc-200 rounded-xl" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Tìm nhà cung cấp..." />
          <CommandList className="max-h-64 p-1">
            <CommandEmpty className="py-4 text-center text-xs font-bold text-zinc-400">Không tìm thấy NCC</CommandEmpty>
            <CommandGroup>
              {suppliers.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.code} ${s.name}`}
                  onSelect={() => onChange(String(s.id))}
                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 mb-1"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-blue-600">{s.code}</span>
                    <span className="text-sm font-semibold text-zinc-700 truncate">{s.name}</span>
                  </div>
                  <Check className={cn("ml-auto h-4 w-4 text-blue-600", String(value) === String(s.id) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function OrderSelect({ value, onChange, orders }) {
  const selectedOrder = orders.find(o => String(o.id) === String(value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "w-full h-11 justify-between bg-white border-zinc-200 shadow-sm",
            !value ? "text-zinc-500 font-medium" : "text-zinc-900 font-bold"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <ShoppingCart className={cn("h-4 w-4 shrink-0", value ? "text-blue-600" : "text-zinc-400")} />
            <span className="truncate">
              {value && selectedOrder ? (selectedOrder.order_code ? `${selectedOrder.order_code} - ${selectedOrder.name}` : selectedOrder.name) : "Chọn ĐH"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-zinc-200 rounded-xl" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Tìm mã PC hoặc tên..." />
          <CommandList className="max-h-64 p-1">
            <CommandEmpty className="py-4 text-center text-xs font-bold text-zinc-400">Không tìm thấy đơn hàng</CommandEmpty>
            <CommandGroup>
              {orders.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.order_code || ''} ${o.name || ''}`.trim()}
                  onSelect={() => onChange(String(o.id))}
                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 mb-1"
                >
                  <div className="flex flex-col">
                    {o.order_code && <span className="text-xs font-black text-blue-600">{o.order_code}</span>}
                    <span className="text-sm font-semibold text-zinc-700 truncate">{o.name}</span>
                  </div>
                  <Check className={cn("ml-auto h-4 w-4 text-blue-600", String(value) === String(o.id) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProductSelect({ value, onChange, products }) {
  const selectedProduct = products.find(p => String(p.id) === String(value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "w-full h-11 justify-between bg-white border-zinc-200 shadow-sm",
            !value ? "text-zinc-500 font-medium" : "text-zinc-900 font-bold"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Package className={cn("h-4 w-4 shrink-0", value ? "text-indigo-600" : "text-zinc-400")} />
            <span className="truncate">
              {value && selectedProduct ? selectedProduct.name : "Chọn MH"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-zinc-200 rounded-xl" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Tìm mã hàng..." />
          <CommandList className="max-h-64 p-1">
            <CommandEmpty className="py-4 text-center text-xs font-bold text-zinc-400">Không tìm thấy mã hàng</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => onChange(String(p.id))}
                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 mb-1"
                >
                  <span className="text-sm font-bold truncate">{p.name}</span>
                  <Check className={cn("ml-auto h-4 w-4 text-indigo-600", String(value) === String(p.id) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function OutboundTicketForm({ type, orders, products, suppliers }) {
  const [formData, setFormData] = useState({
    supplier_id: "",
    dispatch_date: DateTime.now().toFormat("yyyy-MM-dd"),
    expected_return_date: DateTime.now().plus({ days: 3 }).toFormat("yyyy-MM-dd")
  });

  const [items, setItems] = useState([
    { id: Date.now(), order_id: "", product_id: "", order_quantity: "", processing_type: "", quantity_out: "", gross_weight: "", pallet_weight: "", net_weight: "", notes: "", packing_specification: "", package_count: "", unit_net_weight: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === 'gross_weight' || field === 'pallet_weight') {
          const g = parseFloat(newItem.gross_weight || 0);
          const p = parseFloat(newItem.pallet_weight || 0);
          newItem.net_weight = (g - p).toFixed(2);
        }
        return newItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now(), order_id: "", product_id: "", order_quantity: "", processing_type: "", quantity_out: "", gross_weight: "", pallet_weight: "", net_weight: "", notes: "", packing_specification: "", package_count: "", unit_net_weight: "" }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type !== 'PACKAGING' && !formData.supplier_id) {
      toast.error("Vui lòng chọn Nhà cung cấp");
      return;
    }
    const invalidItem = items.find(i => !i.order_id || !i.product_id || (type !== 'PACKAGING' && !i.quantity_out));
    if (invalidItem) {
      toast.error("Vui lòng điền Đơn hàng, Mã hàng" + (type !== 'PACKAGING' ? " và Số lượng xuất" : "") + " cho tất cả các phần!");
      return;
    }

    setLoading(true);
    setCreatedTicket(null);
    try {
      const payload = {
        ...formData,
        type,
        dispatch_date: formData.dispatch_date && type !== 'PACKAGING' ? DateTime.fromFormat(formData.dispatch_date, 'yyyy-MM-dd').toISO() : null,
        expected_return_date: formData.expected_return_date && type !== 'PACKAGING' ? DateTime.fromFormat(formData.expected_return_date, 'yyyy-MM-dd').toISO() : null,
        items: items
      };
      if (type === 'PACKAGING') {
        payload.supplier_id = null;
      }
      const res = await outsourcingService.create(payload);
      setCreatedTicket(res);
      toast.success(type === 'PACKAGING' ? "Lưu số lượng đóng gói thành công!" : "Tạo phiếu đi thành công!");
      // Reset form
      setItems([{ id: Date.now(), order_id: "", product_id: "", order_quantity: "", processing_type: "", quantity_out: "", gross_weight: "", pallet_weight: "", net_weight: "", notes: "", packing_specification: "", package_count: "", unit_net_weight: "" }]);
    } catch (error) {
      toast.error("Lỗi khi tạo phiếu đi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 pb-6 border-b border-zinc-100">
          {type !== 'PACKAGING' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Nhà cung cấp <span className="text-red-500">*</span></Label>
                <SupplierSelect
                  value={formData.supplier_id}
                  onChange={v => setFormData(f => ({ ...f, supplier_id: v }))}
                  suppliers={suppliers}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Ngày xuất đi</Label>
                <PremiumDatePicker
                  date={formData.dispatch_date}
                  onSelect={d => setFormData({ ...formData, dispatch_date: d })}
                  placeholder="Chọn ngày xuất"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Ngày dự kiến về</Label>
                <PremiumDatePicker
                  date={formData.expected_return_date}
                  onSelect={d => setFormData({ ...formData, expected_return_date: d })}
                  placeholder="Chọn ngày về"
                />
              </div>
            </>
          )}
        </div>

        <div className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Danh sách hàng hóa
            </Label>
            <Button type="button" onClick={addItem} variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold">
              <Plus className="w-4 h-4" />
              Thêm phần
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={item.id} className="relative p-5 bg-zinc-50/80 border border-zinc-200 rounded-2xl group">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <h4 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest">Phần {index + 1}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase">Đơn hàng *</Label>
                  <OrderSelect
                    value={item.order_id}
                    onChange={v => {
                      handleItemChange(item.id, 'order_id', v);
                      // if product is already selected, update quantity
                      const selectedOrder = orders.find(o => String(o.id) === String(v));
                      if (selectedOrder && selectedOrder.products && item.product_id) {
                        const matchedProduct = selectedOrder.products.find(p => String(p.id) === String(item.product_id));
                        if (matchedProduct && matchedProduct.quantity) {
                          handleItemChange(item.id, 'order_quantity', parseFloat(matchedProduct.quantity));
                        }
                      }
                    }}
                    orders={orders}
                  />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase">Mã hàng *</Label>
                  <ProductSelect
                    value={item.product_id}
                    onChange={v => {
                      handleItemChange(item.id, 'product_id', v);
                      if (item.order_id) {
                        const selectedOrder = orders.find(o => String(o.id) === String(item.order_id));
                        if (selectedOrder && selectedOrder.products) {
                          const matchedProduct = selectedOrder.products.find(p => String(p.id) === String(v));
                          if (matchedProduct && matchedProduct.quantity) {
                            handleItemChange(item.id, 'order_quantity', parseFloat(matchedProduct.quantity));
                          }
                        }
                      }
                    }}
                    products={item.order_id ? (orders.find(o => String(o.id) === String(item.order_id))?.products || []) : products}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase">SL Order</Label>
                  <Input type="number" placeholder="0" className="h-11 font-medium bg-white" value={item.order_quantity} onChange={e => handleItemChange(item.id, 'order_quantity', e.target.value)} />
                </div>
                {type === 'PACKAGING' && (
                  <div className="space-y-1.5 bg-zinc-100/30 p-2 rounded-lg border border-zinc-200/50">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Quy cách đóng thùng</Label>
                    <Input
                      placeholder="VD: 24 cái/thùng"
                      className="h-9 font-bold bg-white text-zinc-900 border-zinc-200"
                      value={item.packing_specification || ""}
                      onChange={e => handleItemChange(item.id, 'packing_specification', e.target.value)}
                    />
                  </div>
                )}
                {type !== 'PACKAGING' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Loại hình</Label>
                    <select
                      className="h-11 font-medium w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      value={item.processing_type}
                      onChange={e => handleItemChange(item.id, 'processing_type', e.target.value)}
                    >
                      <option value="">Chọn loại</option>
                      <option value="Xi">Xi</option>
                      <option value="Mạ">Mạ</option>
                      <option value="Sơn">Sơn</option>
                      <option value="Ly tâm">Ly tâm</option>
                    </select>
                  </div>
                )}
                <div className={cn(
                  "space-y-1.5 p-2 rounded-lg border",
                  type === 'PACKAGING' ? "bg-emerald-50/50 border-emerald-100" : "bg-blue-50/50 border-blue-100"
                )}>
                  <Label className={cn("text-[10px] font-bold uppercase", type === 'PACKAGING' ? "text-emerald-700" : "text-blue-700")}>
                    {type === 'PACKAGING' ? 'SL Đóng gói *' : 'SL Xuất *'}
                  </Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className={cn("h-9 font-bold", type === 'PACKAGING' ? "text-emerald-900 border-emerald-200" : "text-blue-900 border-blue-200")}
                    value={item.quantity_out}
                    onChange={e => handleItemChange(item.id, 'quantity_out', e.target.value)}
                  />
                </div>
              </div>

              {type !== 'PACKAGING' && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-zinc-200/60">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Kiện hàng</Label>
                    <Input type="number" placeholder="0" className="h-10 border-indigo-100" value={item.package_count} onChange={e => handleItemChange(item.id, 'package_count', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Gross Weight (KG)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10" value={item.gross_weight} onChange={e => handleItemChange(item.id, 'gross_weight', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Pallet Weight (KG)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10" value={item.pallet_weight} onChange={e => handleItemChange(item.id, 'pallet_weight', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">KL Tịnh (kg/cái)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10 border-amber-100" value={item.unit_net_weight} onChange={e => handleItemChange(item.id, 'unit_net_weight', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Ghi chú</Label>
                    <Input placeholder="Chi tiết..." className="h-10" value={item.notes} onChange={e => handleItemChange(item.id, 'notes', e.target.value)} />
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Net Weight (KG)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10 bg-zinc-100/50 font-bold" readOnly value={item.net_weight} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-base shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            {type === 'PACKAGING' ? 'Lưu SL đóng gói' : 'Tạo phiếu xuất gia công'}
          </Button>
        </div>
      </form>

      {createdTicket && (
        <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl relative overflow-hidden shadow-sm animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 w-2 h-full left-0 bg-emerald-500"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-emerald-900 text-lg">{type === 'PACKAGING' ? 'Ghi nhận SL đóng gói thành công!' : 'Tạo phiếu thành công!'}</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-5 rounded-xl border border-emerald-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] gap-4">
            <div>
              <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1 flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Mã Phiếu
              </p>
              <p className="text-3xl font-black text-slate-800 font-['Outfit'] tracking-tight">{createdTicket.ticket_code}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(createdTicket.ticket_code);
                toast.success("Đã copy mã phiếu!");
              }}
              className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 font-bold h-11 px-6 shadow-sm"
            >
              <Copy className="w-4 h-4" />
              Sao chép mã
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InboundTicketForm({ type }) {
  const [searchCode, setSearchCode] = useState("");
  const [ticketData, setTicketData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [returnQtys, setReturnQtys] = useState({});
  const [loadingReturn, setLoadingReturn] = useState(false);

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    setLoadingSearch(true);
    setTicketData(null);
    try {
      const res = await outsourcingService.getByCode(searchCode.trim());
      if (res.ticket.type !== type) {
        toast.warning(`Chú ý: Mã phiếu này thuộc loại ${res.ticket.type === 'PLATING' ? 'Xi mạ' : 'Đóng gói'}`);
      }
      setTicketData(res.ticket);
      setHistory(res.history || []);
      setReturnQtys({});
    } catch (error) {
      toast.error("Không tìm thấy mã phiếu hoặc có lỗi xảy ra");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAddReturn = async (itemId) => {
    const qty = returnQtys[itemId];
    if (!qty || parseFloat(qty) <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ!");
      return;
    }
    setLoadingReturn(true);
    try {
      await outsourcingService.addReturn(ticketData.id, { ticket_item_id: itemId, quantity_returned: qty });
      toast.success("Đã cập nhật lượng nhập về!");
      setReturnQtys(prev => ({ ...prev, [itemId]: "" }));
      handleSearch(); // Refresh data
    } catch (error) {
      toast.error("Lỗi khi nhập bổ sung");
    } finally {
      setLoadingReturn(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="max-w-xl mx-auto space-y-3 bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-200 shadow-sm">
        <Label className="text-sm font-black text-slate-700 uppercase tracking-widest block text-center mb-4">TRA CỨU PHIẾU ĐI</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Mã phiếu (VD: OUT-XM-20260401-001)"
            value={searchCode}
            onChange={e => setSearchCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-12 text-base bg-white border-zinc-300 font-['Outfit'] font-bold text-center sm:text-left focus-visible:ring-indigo-500"
          />
          <Button
            onClick={handleSearch}
            disabled={loadingSearch}
            className="h-12 px-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto shadow-md"
          >
            <Search className="w-5 h-5" />
            Tra cứu
          </Button>
        </div>
      </div>

      {ticketData && (
        <div className="flex flex-col gap-10 animate-in slide-in-from-bottom-4 duration-500 pt-4">
          {/* Main Info & Items */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-3">
                Thông tin chung
                <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 font-['Outfit']">{ticketData.ticket_code}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 text-sm bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nhà cung cấp</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-400" />
                  <p className="font-bold text-slate-800">{ticketData.supplier || "—"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Thời gian</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <p className="font-bold text-slate-800">
                    {ticketData.dispatch_date && DateTime.fromISO(ticketData.dispatch_date).toFormat('dd/MM/yyyy')}
                    <span className="text-zinc-400 mx-1">→</span>
                    {ticketData.expected_return_date && DateTime.fromISO(ticketData.expected_return_date).toFormat('dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tình trạng tổng</p>
                <div className="flex items-center">
                  <span className={cn(
                    "px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest",
                    ticketData.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      ticketData.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                  )}>
                    {ticketData.status === 'COMPLETED' ? 'Hoàn thành' : ticketData.status === 'PARTIAL' ? 'Nhập một phần' : 'Đang chờ'}
                  </span>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-4 mt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tổng Xuất đi</p>
                    <p className="font-black text-2xl text-slate-800 tabular-nums">{ticketData.quantity_out}</p>
                  </div>
                  <div className="h-10 w-px bg-zinc-200"></div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tổng Đã Về</p>
                    <p className="font-black text-2xl text-indigo-600 tabular-nums">{ticketData.total_returned}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                Các phần cần nhập về
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticketData.items && ticketData.items.map((item, idx) => {
                  const percent = Math.min(100, (parseFloat(item.total_returned || 0) / parseFloat(item.quantity_out || 1)) * 100);
                  return (
                    <div key={item.id} className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">Phần {idx + 1}</span>
                          <p className="font-bold text-slate-800">{item.product_name} <span className="text-zinc-400 mx-1">•</span> {item.order_name || item.order_code}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {item.processing_type && <p className="text-xs font-semibold text-zinc-500">Gia công: {item.processing_type}</p>}
                            {item.package_count && <p className="text-xs font-semibold text-blue-600">Kiện hàng: {item.package_count}</p>}
                            {item.unit_net_weight && <p className="text-xs font-semibold text-amber-600">KL Tịnh: {item.unit_net_weight} kg/cái</p>}
                          </div>
                        </div>
                        <div className="text-right space-y-0.5 whitespace-nowrap">
                          <p className="text-xs font-bold text-zinc-500">Xuất: <span className="text-slate-800 font-extrabold">{item.quantity_out}</span></p>
                          <p className="text-xs font-bold text-indigo-600">Về: <span className="font-extrabold">{item.total_returned}</span></p>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%` }}></div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            placeholder="Nhập thêm..."
                            value={returnQtys[item.id] || ""}
                            onChange={e => setReturnQtys({ ...returnQtys, [item.id]: e.target.value })}
                            className="h-10 bg-indigo-50/30 text-sm font-bold tabular-nums border-indigo-200 focus-visible:ring-indigo-600 pl-3"
                          />
                        </div>
                        <Button
                          onClick={() => handleAddReturn(item.id)}
                          disabled={loadingReturn}
                          className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs w-full sm:w-auto"
                        >
                          <Check className="w-4 h-4" /> Xác nhận
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* History Section Below */}
          <div className="space-y-4 pt-6 border-t border-zinc-100">
            <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
              Lịch sử nhập
              <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-0.5 rounded-full">{history.length}</span>
            </h3>

            {history.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <AlertCircle className="w-10 h-10 text-zinc-300 mb-3" />
                <p className="text-zinc-500 font-medium text-sm">Chưa có bản ghi nào</p>
                <p className="text-zinc-400 text-xs mt-1 max-w-[200px]">Bạn hãy nhập số lượng để ghi nhận lịch sử.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((h, i) => (
                  <div key={h.id} className="flex flex-col p-4 bg-white border border-zinc-200 hover:border-indigo-100 hover:bg-indigo-50/30 rounded-xl transition-all group shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs shrink-0 shadow-sm border border-emerald-200">
                          #{history.length - i}
                        </div>
                        <div>
                          <p className="font-black text-lg text-emerald-600 tracking-tight leading-none mb-1">+{h.quantity_returned}</p>
                          <p className="text-xs font-bold text-zinc-700 truncate max-w-[150px]">{h.product_name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-zinc-100/50">
                      <p className="text-[10px] font-bold text-zinc-400">{DateTime.fromISO(h.returned_at).setLocale('vi-VN').toFormat('dd/MM HH:mm')}</p>
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                        {h.created_by_username || "Hệ thống"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OutsourcingHistory({ type, orders, products }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [filterOrderId, setFilterOrderId] = useState("");
  const [filterProductId, setFilterProductId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["outsourcing-tickets", type, page, pageSize, search, filterOrderId, filterProductId],
    queryFn: () => outsourcingService.getAll({ type, page, limit: pageSize, search, order_id: filterOrderId, product_id: filterProductId }),
    placeholderData: keepPreviousData
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;

  const handleExportExcel = async () => {
    try {
      const res = await outsourcingService.getAll({ type, page: 1, limit: 5000, search, order_id: filterOrderId, product_id: filterProductId });
      const exportData = res.data || [];
      if (exportData.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
        "Mã phiếu,Nhà cung cấp,Gồm Đơn hàng,Gồm Mã hàng,Tổng Kiện,Quy cách,Tổng Xuất,Tổng Về,Trạng thái\n" +
        exportData.map(e => {
          const statusStr = e.status === 'COMPLETED' ? "Hoàn thành" : (e.status === 'PARTIAL' ? "Một phần" : "Đang chờ");
          return `"${e.ticket_code}","${e.supplier || ''}","${e.order_code || ''}","${e.product_name || ''}","${e.total_packages || 0}","${e.packing_specification || ''}","${e.quantity_out || 0}","${e.total_returned || 0}","${statusStr}"`
        }).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `lich_su_phieu_${type}_${DateTime.now().toFormat('yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Lỗi khi xuất excel");
    }
  };

  let columns = [
    {
      id: "ticket_code",
      label: "Mã phiếu",
      className: "font-black text-indigo-600",
      format: (val) => <span className="font-['Outfit']">{val}</span>
    },
    {
      id: "supplier",
      label: "Nhà cung cấp",
      format: (val) => val || "—"
    },
    {
      id: "order_code",
      label: "Gồm Đơn hàng",
      className: "font-bold text-zinc-700 max-w-[150px] truncate",
      format: (val) => val || "—"
    },
    {
      id: "product_name",
      label: "Gồm Mã hàng",
      className: "font-medium max-w-[150px] truncate",
      format: (val) => val || "—"
    },
    {
      id: "total_packages",
      label: "Số kiện",
      className: "font-bold text-slate-600 tabular-nums text-center",
      format: (val) => val || 0
    },
    {
      id: "quantity_out",
      label: "Tổng Xuất",
      className: "font-black text-blue-600 tabular-nums text-right",
      format: (val) => parseFloat(val).toLocaleString()
    },
    {
      id: "total_returned",
      label: "Tổng Về",
      className: "font-black text-emerald-600 tabular-nums text-right",
      format: (val) => parseFloat(val).toLocaleString()
    },
    {
      id: "status",
      label: "Trạng thái",
      format: (val) => {
        if (val === 'COMPLETED') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn thành</Badge>;
        if (val === 'PARTIAL') return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Một phần</Badge>;
        return <Badge variant="secondary" className="bg-zinc-100 text-zinc-500">Đang chờ</Badge>;
      }
    },
    getAuditColumn()
  ];

  if (type === 'PACKAGING') {
    columns = [
      { id: "order_code", label: "Gồm Đơn hàng", className: "font-bold text-zinc-700 max-w-[150px] truncate", format: (val) => val || "—" },
      { id: "product_name", label: "Gồm Mã hàng", className: "font-medium max-w-[150px] truncate", format: (val) => val || "—" },
      { id: "packing_specification", label: "Quy cách", className: "italic text-[11px] text-zinc-500 max-w-[120px] truncate", format: (val) => val || "—" },
      { id: "quantity_out", label: "Đã đóng gói", className: "font-black text-blue-600 tabular-nums text-right", format: (val) => parseFloat(val).toLocaleString() },
      {
        id: "status", label: "Trạng thái", format: (val) => {
          if (val === 'COMPLETED') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn thành</Badge>;
          return <Badge variant="secondary" className="bg-zinc-100 text-zinc-500">Hoàn thành</Badge>;
        }
      },
      getAuditColumn()
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
        <div className="flex-1 w-full md:w-auto">
          <Label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1.5">Lọc theo ĐH</Label>
          <OrderSelect value={filterOrderId} onChange={setFilterOrderId} orders={orders} />
        </div>
        <div className="flex-1 w-full md:w-auto">
          <Label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1.5">Lọc theo MH</Label>
          <ProductSelect value={filterProductId} onChange={setFilterProductId} products={filterOrderId ? (orders.find(o => String(o.id) === String(filterOrderId))?.products || []) : products} />
        </div>
        <div className="flex items-end h-full">
          <Button onClick={handleExportExcel} variant="outline" className="h-11 mt-[22px] bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold gap-2 md:w-auto w-full">
            <Download className="w-4 h-4" /> Xuất Excel
          </Button>
        </div>
      </div>
      <GenericTable
        data={tickets}
        columns={columns}
        isLoading={isLoading}
        isServerSide={true}
        totalItems={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={setSearch}
        showActions={false}
      />
    </div>
  );
}
