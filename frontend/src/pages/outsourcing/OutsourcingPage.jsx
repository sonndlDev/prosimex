import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenericTable from "@/components/GenericTable";
import { getAuditColumn } from "@/utils/audit";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Search, Calendar, Package, Tag, Hash, Building2, CheckCircle2, ShoppingCart, PaintBucket, ChevronsUpDown, Check, AlertCircle, Trash2, Settings, Download, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Alert dialog component not present; use Dialog for confirmations
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { outsourcingService } from "@/services/outsourcing.service";
import { orderService } from "@/services/order.service";
import { productService } from "@/services/product.service";
import { supplierService } from "@/services/supplier.service";
import { PremiumDatePicker } from "@/components/PremiumDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTime } from "luxon";

import ExcelJS from 'exceljs';
import { useAuth } from "../../context/AuthContext";


export default function OutsourcingPage() {
  const [activeTab, setActiveTab] = useState("plating");
  const { hasPermission } = useAuth();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(var(--c-ink))", letterSpacing: "-0.01em" }}>Gia công ngoài</h2>
          <p style={{ fontSize: 11, color: "rgb(var(--c-ink-4))", marginTop: 2 }}>Quản lý xuất/nhập hàng gia công (Xi mạ & Đóng gói)</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6">
        <div className="flex justify-start">
          <TabsList className="flex flex-row h-12 bg-[rgb(var(--c-s2))] p-1 border border-[rgb(var(--c-line-2))] shadow-inner rounded-full w-full max-w-lg">
            <TabsTrigger
              value="plating"
              className={cn(
                "flex-1 h-full font-black text-xs rounded-full transition-all duration-300 group gap-2",
                activeTab === "plating"
                  ? "bg-[rgb(var(--c-s4))] text-[rgb(var(--c-blue))]"
                  : "text-[rgb(var(--c-ink-3))] hover:text-[rgb(var(--c-ink-2))]"
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
                  ? "bg-[rgb(var(--c-s4))] text-[rgb(var(--c-blue))]"
                  : "text-[rgb(var(--c-ink-3))] hover:text-[rgb(var(--c-ink-2))]"
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
    <Card >
      <CardHeader >
        <div className="px-6 pt-6">
          <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
            <TabsList className="flex w-full bg-[rgb(var(--c-s2))] p-1 rounded-full border border-[rgb(var(--c-line-2))] max-w-md h-10 shadow-inner">
              <TabsTrigger
                value="history"
                className={cn(
                  "flex-1 font-black rounded-full h-full transition-all text-[10px] uppercase tracking-widest",
                  subTab === "history"
                    ? "bg-[rgb(var(--c-s4))] text-[rgb(var(--c-blue))]"
                    : "text-[rgb(var(--c-ink-4))] hover:text-[rgb(var(--c-ink-2))]"
                )}
              >
                Danh sách
              </TabsTrigger>
              <TabsTrigger
                value="out"
                className={cn(
                  "flex-1 font-black rounded-full h-full transition-all text-[10px] uppercase tracking-widest",
                  subTab === "out"
                    ? "bg-[rgb(var(--c-s4))] text-[rgb(var(--c-blue))]"
                    : "text-[rgb(var(--c-ink-4))] hover:text-[rgb(var(--c-ink-2))]"
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
                      ? "bg-[rgb(var(--c-s4))] text-[rgb(var(--c-blue))]"
                      : "text-[rgb(var(--c-ink-4))] hover:text-[rgb(var(--c-ink-2))]"
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
        {subTab === "history" && <OutsourcingHistory type={type} orders={orders} products={products} suppliers={suppliers} />}
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
            "w-full justify-between",
            !value ? "text-[rgb(var(--c-ink-3))] font-medium" : "text-[rgb(var(--c-ink))] font-bold"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className={cn("h-4 w-4 shrink-0", value ? "text-blue-600" : "text-[rgb(var(--c-ink-4))]")} />
            <span className="truncate">
              {value && selected ? selected.name : "Chọn nhà cung cấp"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-[rgb(var(--c-line-2))] rounded-xl" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Tìm nhà cung cấp..." />
          <CommandList >
            <CommandEmpty className="py-4 text-center text-xs font-bold text-[rgb(var(--c-ink-4))]">Không tìm thấy NCC</CommandEmpty>
            <CommandGroup>
              {suppliers.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.code} ${s.name}`}
                  onSelect={() => onChange(String(s.id))}
                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] mb-1"
                >
                  <div >
                    <span className="text-xs font-black text-blue-600">{s.code}</span>
                    <span className="text-sm font-semibold text-[rgb(var(--c-ink-2))] truncate">{s.name}</span>
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
            "w-full justify-between",
            !value ? "text-[rgb(var(--c-ink-3))] font-medium" : "text-[rgb(var(--c-ink))] font-bold"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <ShoppingCart className={cn("h-4 w-4 shrink-0", value ? "text-blue-600" : "text-[rgb(var(--c-ink-4))]")} />
            <span className="truncate">
              {value && selectedOrder ? (selectedOrder.order_code ? `${selectedOrder.order_code} - ${selectedOrder.name}` : selectedOrder.name) : "Chọn ĐH"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-[rgb(var(--c-line-2))] rounded-xl" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Tìm mã PC hoặc tên..." />
          <CommandList >
            <CommandEmpty className="py-4 text-center text-xs font-bold text-[rgb(var(--c-ink-4))]">Không tìm thấy đơn hàng</CommandEmpty>
            <CommandGroup>
              {orders.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.order_code || ''} ${o.name || ''}`.trim()}
                  onSelect={() => onChange(String(o.id))}
                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] mb-1"
                >
                  <div >
                    {o.order_code && <span className="text-xs font-black text-blue-600">{o.order_code}</span>}
                    <span className="text-sm font-semibold text-[rgb(var(--c-ink-2))] truncate">{o.name}</span>
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
            "w-full justify-between",
            !value ? "text-[rgb(var(--c-ink-3))] font-medium" : "text-[rgb(var(--c-ink))] font-bold"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Package className={cn("h-4 w-4 shrink-0", value ? "text-indigo-600" : "text-[rgb(var(--c-ink-4))]")} />
            <span className="truncate">
              {value && selectedProduct ? selectedProduct.name : "Chọn MH"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-[rgb(var(--c-line-2))] rounded-xl" align="start">
        <Command className="w-full">
          <CommandInput placeholder="Tìm mã hàng..." />
          <CommandList >
            <CommandEmpty className="py-4 text-center text-xs font-bold text-[rgb(var(--c-ink-4))]">Không tìm thấy mã hàng</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => onChange(String(p.id))}
                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] mb-1"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 pb-6 border-b border-[rgb(var(--c-line))]">
          {type !== 'PACKAGING' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-black text-[rgb(var(--c-ink-3))] uppercase tracking-widest">Nhà cung cấp <span className="text-red-500">*</span></Label>
                <SupplierSelect
                  value={formData.supplier_id}
                  onChange={v => setFormData(f => ({ ...f, supplier_id: v }))}
                  suppliers={suppliers}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-[rgb(var(--c-ink-3))] uppercase tracking-widest">Ngày xuất đi</Label>
                <PremiumDatePicker
                  date={formData.dispatch_date}
                  onSelect={d => setFormData({ ...formData, dispatch_date: d })}
                  placeholder="Chọn ngày xuất"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black text-[rgb(var(--c-ink-3))] uppercase tracking-widest">Ngày dự kiến về</Label>
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
            <div key={item.id} className="relative p-5/80 border border-[rgb(var(--c-line-2))] rounded-2xl group">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-[rgb(var(--c-ink-4))] hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <h4 className="text-xs font-bold text-[rgb(var(--c-ink-3))] mb-4 uppercase tracking-widest">Phần {index + 1}</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5 lg:col-span-1">
                  <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Đơn hàng *</Label>
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
                  <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Mã hàng *</Label>
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
                  <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">SL Order</Label>
                  <Input type="number" placeholder="0" className="h-11 font-medium" value={item.order_quantity} onChange={e => handleItemChange(item.id, 'order_quantity', e.target.value)} />
                </div>
                {type === 'PACKAGING' && (
                  <div className="space-y-1.5 bg-[rgb(var(--c-s2))]/30 p-2 rounded-lg border border-[rgb(var(--c-line-2))]/50">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Quy cách đóng thùng</Label>
                    <Input
                      placeholder="VD: 24 cái/thùng"
                      className="h-9 font-bold text-[rgb(var(--c-ink))] border-[rgb(var(--c-line-2))]"
                      value={item.packing_specification || ""}
                      onChange={e => handleItemChange(item.id, 'packing_specification', e.target.value)}
                    />
                  </div>
                )}
                {type !== 'PACKAGING' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Loại hình</Label>
                    <select
                      className="h-11 font-medium w-full rounded-md border border-[rgb(var(--c-line-2))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-[rgb(var(--c-line-2))]/60">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Kiện hàng</Label>
                    <Input type="number" placeholder="0" className="h-10 border-indigo-100" value={item.package_count} onChange={e => handleItemChange(item.id, 'package_count', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Gross Weight (KG)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10" value={item.gross_weight} onChange={e => handleItemChange(item.id, 'gross_weight', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Pallet Weight (KG)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10" value={item.pallet_weight} onChange={e => handleItemChange(item.id, 'pallet_weight', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">KL Tịnh (kg/cái)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10 border-amber-100" value={item.unit_net_weight} onChange={e => handleItemChange(item.id, 'unit_net_weight', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Ghi chú</Label>
                    <Input placeholder="Chi tiết..." className="h-10" value={item.notes} onChange={e => handleItemChange(item.id, 'notes', e.target.value)} />
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Net Weight (KG)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" className="h-10 bg-[rgb(var(--c-s2))]/50 font-bold" readOnly value={item.net_weight} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-[rgb(var(--c-line))] flex justify-end">
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
        <div className="card p-4 relative overflow-hidden">
          <div className="absolute top-0 w-2 h-full left-0 bg-emerald-500"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-emerald-900 text-lg">{type === 'PACKAGING' ? 'Ghi nhận SL đóng gói thành công!' : 'Tạo phiếu thành công!'}</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-xl border border-emerald-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] gap-4">
            <div>
              <p className="text-[10px] font-black tracking-widest text-[rgb(var(--c-ink-4))] uppercase mb-1 flex items-center gap-1.5">
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
  const [returnFormData, setReturnFormData] = useState({});
  const [loadingReturn, setLoadingReturn] = useState(false);
  
  // Edit/Delete history state
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editingHistoryData, setEditingHistoryData] = useState({});
  const [showEditHistoryDialog, setShowEditHistoryDialog] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  
  const [deleteHistoryId, setDeleteHistoryId] = useState(null);
  const [showDeleteHistoryDialog, setShowDeleteHistoryDialog] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

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
      setReturnFormData({});
    } catch (error) {
      toast.error("Không tìm thấy mã phiếu hoặc có lỗi xảy ra");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleReturnFormChange = (itemId, field, value) => {
    setReturnFormData(prev => {
      const existing = prev[itemId] || {};
      const updated = { ...existing, [field]: value };
      if (field === 'gross_weight' || field === 'pallet_weight') {
        const g = parseFloat(updated.gross_weight || 0);
        const p = parseFloat(updated.pallet_weight || 0);
        if (updated.gross_weight || updated.pallet_weight) {
          updated.net_weight = (g - p).toFixed(2);
        } else {
          updated.net_weight = "";
        }
      }
      return { ...prev, [itemId]: updated };
    });
  };

  const handleAddReturn = async (itemId) => {
    const data = returnFormData[itemId] || {};
    if (!data.quantity_returned || parseFloat(data.quantity_returned) <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ!");
      return;
    }
    setLoadingReturn(true);
    try {
      await outsourcingService.addReturn(ticketData.id, { ticket_item_id: itemId, ...data });
      toast.success("Đã cập nhật lượng nhập về!");
      setReturnFormData(prev => ({ ...prev, [itemId]: undefined }));
      handleSearch(); // Refresh data
    } catch (error) {
      toast.error("Lỗi khi nhập bổ sung");
    } finally {
      setLoadingReturn(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="max-w-xl mx-auto space-y-3 p-6 md:p-8 rounded-2xl border border-[rgb(var(--c-line-2))] shadow-sm">
        <Label className="text-sm font-black text-slate-700 uppercase tracking-widest block text-center mb-4">TRA CỨU PHIẾU ĐI</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Mã phiếu (VD: PRO-ABC-20042026-001)"
            value={searchCode}
            onChange={e => setSearchCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-12 text-base border-[rgb(var(--c-line-3))] font-['Outfit'] font-bold text-center sm:text-left focus-visible:ring-indigo-500"
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-3">
                Thông tin chung
                <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 font-['Outfit']">{ticketData.ticket_code}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 text-sm card p-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-4))]">Nhà cung cấp</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[rgb(var(--c-ink-4))]" />
                  <p className="font-bold text-slate-800">{ticketData.supplier || "—"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-4))]">Thời gian</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[rgb(var(--c-ink-4))]" />
                  <p className="font-bold text-slate-800">
                    {ticketData.dispatch_date && DateTime.fromISO(ticketData.dispatch_date).toFormat('dd/MM/yyyy')}
                    <span className="text-[rgb(var(--c-ink-4))] mx-1">→</span>
                    {ticketData.expected_return_date && DateTime.fromISO(ticketData.expected_return_date).toFormat('dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-4))]">Tình trạng tổng</p>
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
              <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-4 mt-2 border-t border-[rgb(var(--c-line))]">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-4))]">Tổng Xuất đi</p>
                    <p className="font-black text-2xl text-slate-800 tabular-nums">{ticketData.quantity_out}</p>
                  </div>
                  <div className="h-10 w-px bg-[rgb(var(--c-s3))]"></div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--c-ink-4))]">Tổng Đã Về</p>
                    <p className="font-black text-2xl text-indigo-600 tabular-nums">{ticketData.total_returned}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-[rgb(var(--c-ink-4))]" />
                Các phần cần nhập về
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticketData.items && ticketData.items.map((item, idx) => {
                  const percent = Math.min(100, (parseFloat(item.total_returned || 0) / parseFloat(item.quantity_out || 1)) * 100);
                  return (
                    <div key={item.id} className="p-4 border border-[rgb(var(--c-line-2))] rounded-2xl shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black bg-[rgb(var(--c-s2))] px-2 py-0.5 rounded text-[rgb(var(--c-ink-2))]">Phần {idx + 1}</span>
                          <p className="font-bold text-slate-800">{item.product_name} <span className="text-[rgb(var(--c-ink-4))] mx-1">•</span> {item.order_name || item.order_code}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {item.processing_type && <p className="text-xs font-semibold text-[rgb(var(--c-ink-3))]">Gia công: {item.processing_type}</p>}
                            {item.package_count && <p className="text-xs font-semibold text-blue-600">Kiện hàng: {item.package_count}</p>}
                            {item.unit_net_weight && <p className="text-xs font-semibold text-amber-600">KL Tịnh: {item.unit_net_weight} kg/cái</p>}
                          </div>
                        </div>
                        <div className="text-right space-y-0.5 whitespace-nowrap">
                          <p className="text-xs font-bold text-[rgb(var(--c-ink-3))]">Xuất: <span className="text-slate-800 font-extrabold">{item.quantity_out}</span></p>
                          <p className="text-xs font-bold text-indigo-600">Về: <span className="font-extrabold">{item.total_returned}</span></p>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%` }}></div>
                      </div>

                      <div className="flex flex-col gap-3 pt-2">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          <Input
                            type="number"
                            placeholder="SL Nhập *"
                            value={returnFormData[item.id]?.quantity_returned || ""}
                            onChange={e => handleReturnFormChange(item.id, 'quantity_returned', e.target.value)}
                            className="bg-indigo-50/30 text-sm font-bold border-indigo-200 focus-visible:ring-indigo-600"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Gross (KG)"
                            value={returnFormData[item.id]?.gross_weight || ""}
                            onChange={e => handleReturnFormChange(item.id, 'gross_weight', e.target.value)}
                            className="text-sm font-medium"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Pallet (KG)"
                            value={returnFormData[item.id]?.pallet_weight || ""}
                            onChange={e => handleReturnFormChange(item.id, 'pallet_weight', e.target.value)}
                            className="text-sm font-medium"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Net (KG)"
                            readOnly
                            value={returnFormData[item.id]?.net_weight || ""}
                            className="text-sm font-bold bg-[rgb(var(--c-s2))]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="KG Thiếu thừa"
                            value={returnFormData[item.id]?.missing_weight || ""}
                            onChange={e => handleReturnFormChange(item.id, 'missing_weight', e.target.value)}
                            className="text-sm font-medium"
                          />
                          <Input
                            placeholder="Ghi chú"
                            value={returnFormData[item.id]?.notes || ""}
                            onChange={e => handleReturnFormChange(item.id, 'notes', e.target.value)}
                            className="text-sm font-medium"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleAddReturn(item.id)}
                            disabled={loadingReturn}
                            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs w-full sm:w-auto"
                          >
                            <Check className="w-4 h-4" /> Xác nhận
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* History Section Below */}
          <div className="space-y-4 pt-6 border-t border-[rgb(var(--c-line))]">
            <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
              Lịch sử nhập
              <span className="bg-[rgb(var(--c-s2))] text-[rgb(var(--c-ink-2))] text-xs px-2 py-0.5 rounded-full">{history.length}</span>
            </h3>

            {history.length === 0 ? (
              <div className="bg-white border border-[rgb(var(--c-line-2))] rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <AlertCircle className="w-10 h-10 text-zinc-300 mb-3" />
                <p className="text-[rgb(var(--c-ink-3))] font-medium text-sm">Chưa có bản ghi nào</p>
                <p className="text-[rgb(var(--c-ink-4))] text-xs mt-1 max-w-[200px]">Bạn hãy nhập số lượng để ghi nhận lịch sử.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((h, i) => (
                  <div key={h.id} className="flex flex-col p-4 border border-[rgb(var(--c-line-2))] hover:border-indigo-100 hover:bg-indigo-50/30 rounded-xl transition-all group shadow-sm relative">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingHistoryId(h.id);
                          setEditingHistoryData({ 
                            quantity_returned: h.quantity_returned || "", 
                            gross_weight: h.gross_weight || "",
                            pallet_weight: h.pallet_weight || "",
                            net_weight: h.net_weight || "",
                            missing_weight: h.missing_weight || "",
                            notes: h.notes || "" 
                          });
                          setShowEditHistoryDialog(true);
                        }}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteHistoryId(h.id);
                          setShowDeleteHistoryDialog(true);
                        }}
                        className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs shrink-0 shadow-sm border border-emerald-200">
                          #{history.length - i}
                        </div>
                        <div>
                          <p className="font-black text-lg text-emerald-600 tracking-tight leading-none mb-1">+{h.quantity_returned}</p>
                          <p className="text-xs font-bold text-[rgb(var(--c-ink-2))] truncate max-w-[150px]">{h.product_name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-[rgb(var(--c-line))]/50">
                      <p className="text-[10px] font-bold text-[rgb(var(--c-ink-4))]">{DateTime.fromISO(h.returned_at).setLocale('vi-VN').toFormat('dd/MM HH:mm')}</p>
                      <span className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] bg-[rgb(var(--c-s2))] px-2 py-0.5 rounded">
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

      {/* Edit History Dialog */}
      <Dialog open={showEditHistoryDialog} onOpenChange={setShowEditHistoryDialog}>
        <DialogContent className="sm:max-w-2xl border border-[rgb(var(--c-line-2))] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800">Chỉnh sửa lịch sử nhập</DialogTitle>
            <DialogDescription className="text-sm font-medium text-[rgb(var(--c-ink-2))] mt-2">
              Cập nhật thông tin lịch sử nhập hàng gia công
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))] uppercase">SL Nhập (cái) *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={editingHistoryData.quantity_returned || ""}
                  onChange={(e) => setEditingHistoryData(prev => ({...prev, quantity_returned: e.target.value}))}
                  className="h-11 font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))] uppercase">Gross (KG)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={editingHistoryData.gross_weight || ""}
                  onChange={(e) => {
                    const gross = parseFloat(e.target.value) || 0;
                    const pallet = parseFloat(editingHistoryData.pallet_weight) || 0;
                    setEditingHistoryData(prev => ({
                      ...prev, 
                      gross_weight: e.target.value,
                      net_weight: (gross - pallet).toFixed(2)
                    }));
                  }}
                  className="h-11 font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))] uppercase">Pallet (KG)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={editingHistoryData.pallet_weight || ""}
                  onChange={(e) => {
                    const pallet = parseFloat(e.target.value) || 0;
                    const gross = parseFloat(editingHistoryData.gross_weight) || 0;
                    setEditingHistoryData(prev => ({
                      ...prev, 
                      pallet_weight: e.target.value,
                      net_weight: (gross - pallet).toFixed(2)
                    }));
                  }}
                  className="h-11 font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))] uppercase">Net (KG)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={editingHistoryData.net_weight || ""}
                  readOnly
                  className="h-11 font-medium bg-[rgb(var(--c-s2))]/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))] uppercase">KG Thiếu Thữa</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={editingHistoryData.missing_weight || ""}
                  onChange={(e) => setEditingHistoryData(prev => ({...prev, missing_weight: e.target.value}))}
                  className="h-11 font-medium"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[rgb(var(--c-ink-2))]">Ghi chú</Label>
              <textarea 
                placeholder="Thêm ghi chú nếu cần..."
                value={editingHistoryData.notes || ""}
                onChange={(e) => setEditingHistoryData(prev => ({...prev, notes: e.target.value}))}
                className="w-full h-20 p-3 border border-[rgb(var(--c-line-2))] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-[rgb(var(--c-line))]">
            <Button 
              variant="outline" 
              onClick={() => setShowEditHistoryDialog(false)} 
              className="border-[rgb(var(--c-line-2))] text-[rgb(var(--c-ink-2))] hover:bg-[rgb(var(--c-s2))] font-bold"
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!editingHistoryId) return;
                if (!editingHistoryData.quantity_returned) {
                  toast.error("Vui lòng nhập số lượng");
                  return;
                }
                
                setIsSavingHistory(true);
                try {
                  await outsourcingService.updateReturn(editingHistoryId, {
                    quantity_returned: parseFloat(editingHistoryData.quantity_returned),
                    gross_weight: editingHistoryData.gross_weight ? parseFloat(editingHistoryData.gross_weight) : null,
                    pallet_weight: editingHistoryData.pallet_weight ? parseFloat(editingHistoryData.pallet_weight) : null,
                    net_weight: editingHistoryData.net_weight ? parseFloat(editingHistoryData.net_weight) : null,
                    missing_weight: editingHistoryData.missing_weight ? parseFloat(editingHistoryData.missing_weight) : null,
                    notes: editingHistoryData.notes || ""
                  });
                  
                  // Refetch ticket data
                  const res = await outsourcingService.getByCode(searchCode.trim());
                  setHistory(res.history || []);
                  
                  toast.success("Cập nhật lịch sử nhập thành công!");
                  setShowEditHistoryDialog(false);
                  setEditingHistoryId(null);
                  setEditingHistoryData({});
                } catch (error) {
                  toast.error(error?.response?.data?.message || "Lỗi khi cập nhật lịch sử");
                } finally {
                  setIsSavingHistory(false);
                }
              }}
              disabled={isSavingHistory}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isSavingHistory ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete History Dialog */}
      <Dialog open={showDeleteHistoryDialog} onOpenChange={setShowDeleteHistoryDialog}>
        <DialogContent className="bg-white border border-[rgb(var(--c-line-2))] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600">Xác nhận xóa lịch sử nhập</DialogTitle>
            <DialogDescription className="text-sm font-medium text-[rgb(var(--c-ink-2))] mt-2">
              Bạn có chắc chắn muốn xóa bản ghi lịch sử nhập này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-6 border-t border-[rgb(var(--c-line))]">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteHistoryDialog(false)} 
              className="border-[rgb(var(--c-line-2))] text-[rgb(var(--c-ink-2))] hover:bg-[rgb(var(--c-s2))] font-bold"
            >
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!deleteHistoryId) return;
                
                setIsDeletingHistory(true);
                try {
                  await outsourcingService.deleteReturn(deleteHistoryId);
                  
                  // Refetch ticket data
                  const res = await outsourcingService.getByCode(searchCode.trim());
                  setHistory(res.history || []);
                  
                  toast.success("Xóa lịch sử nhập thành công!");
                  setShowDeleteHistoryDialog(false);
                  setDeleteHistoryId(null);
                } catch (error) {
                  toast.error(error?.response?.data?.message || "Lỗi khi xóa lịch sử");
                } finally {
                  setIsDeletingHistory(false);
                }
              }}
              disabled={isDeletingHistory}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingHistory ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function mapTicketItemForEdit(item) {
  return {
    localKey: item.id,
    id: item.id,
    isNew: false,
    order_id: item.order_id ? String(item.order_id) : "",
    product_id: item.product_id ? String(item.product_id) : "",
    order_quantity: item.order_quantity ?? "",
    processing_type: item.processing_type ?? "",
    quantity_out: item.quantity_out ?? "",
    gross_weight: item.gross_weight ?? "",
    pallet_weight: item.pallet_weight ?? "",
    net_weight: item.net_weight ?? "",
    notes: item.notes ?? "",
    packing_specification: item.packing_specification ?? "",
    package_count: item.package_count ?? "",
    unit_net_weight: item.unit_net_weight ?? "",
    total_returned: parseFloat(item.total_returned || 0),
  };
}

function EditOutsourcingTicketDialog({ open, onOpenChange, ticketCode, type, orders, products, suppliers, onSaved }) {
  const [ticket, setTicket] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const ticketType = ticket?.type || type;

  useEffect(() => {
    if (!open || !ticketCode) {
      setTicket(null);
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await outsourcingService.getByCode(ticketCode);
        if (cancelled) return;
        const t = res.ticket;
        setTicket({
          ...t,
          supplier_id: t.supplier_id ? String(t.supplier_id) : "",
          dispatch_date: t.dispatch_date ? DateTime.fromISO(t.dispatch_date).toFormat("yyyy-MM-dd") : "",
          expected_return_date: t.expected_return_date ? DateTime.fromISO(t.expected_return_date).toFormat("yyyy-MM-dd") : "",
        });
        setItems((t.items || []).map(mapTicketItemForEdit));
      } catch {
        if (!cancelled) toast.error("Không tải được chi tiết phiếu");
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, ticketCode, onOpenChange]);

  const handleItemChange = (localKey, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.localKey !== localKey) return item;
      const newItem = { ...item, [field]: value };
      if (field === "gross_weight" || field === "pallet_weight") {
        const g = parseFloat(newItem.gross_weight || 0);
        const p = parseFloat(newItem.pallet_weight || 0);
        newItem.net_weight = (g - p).toFixed(2);
      }
      return newItem;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      localKey: `new-${Date.now()}`,
      id: null,
      isNew: true,
      order_id: "",
      product_id: "",
      order_quantity: "",
      processing_type: "",
      quantity_out: "",
      gross_weight: "",
      pallet_weight: "",
      net_weight: "",
      notes: "",
      packing_specification: "",
      package_count: "",
      unit_net_weight: "",
      total_returned: 0,
    }]);
  };

  const removeItem = (localKey) => {
    const item = items.find(i => i.localKey === localKey);
    if (item?.total_returned > 0) {
      toast.error(`Không thể xóa dòng đã có ${item.total_returned} hàng nhập về`);
      return;
    }
    if (items.length > 1) {
      setItems(prev => prev.filter(i => i.localKey !== localKey));
    }
  };

  const handleSave = async () => {
    if (!ticket) return;
    if (ticketType !== "PACKAGING" && !ticket.supplier_id) {
      toast.error("Vui lòng chọn Nhà cung cấp");
      return;
    }
    const invalidItem = items.find(i => !i.order_id || !i.product_id || (ticketType !== "PACKAGING" && !i.quantity_out));
    if (invalidItem) {
      toast.error("Vui lòng điền Đơn hàng, Mã hàng" + (ticketType !== "PACKAGING" ? " và Số lượng xuất" : "") + " cho tất cả các phần!");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplier_id: ticketType === "PACKAGING" ? null : ticket.supplier_id,
        type: ticket.type,
        status: ticket.status,
        dispatch_date: ticket.dispatch_date && ticketType !== "PACKAGING"
          ? DateTime.fromFormat(ticket.dispatch_date, "yyyy-MM-dd").toISO()
          : null,
        expected_return_date: ticket.expected_return_date && ticketType !== "PACKAGING"
          ? DateTime.fromFormat(ticket.expected_return_date, "yyyy-MM-dd").toISO()
          : null,
        items: items.map(i => {
          const row = {
            order_id: i.order_id,
            product_id: i.product_id,
            order_quantity: i.order_quantity || 0,
            processing_type: i.processing_type || null,
            quantity_out: i.quantity_out || 0,
            gross_weight: i.gross_weight || null,
            pallet_weight: i.pallet_weight || null,
            net_weight: i.net_weight || null,
            notes: i.notes || null,
            packing_specification: i.packing_specification || null,
            package_count: i.package_count || null,
            unit_net_weight: i.unit_net_weight || null,
          };
          if (!i.isNew && i.id) row.id = i.id;
          return row;
        }),
      };
      await outsourcingService.update(ticket.id, payload);
      toast.success("Cập nhật phiếu gia công thành công!");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lỗi khi cập nhật phiếu gia công");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto border border-[rgb(var(--c-line-2))] rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-800">Chỉnh sửa phiếu gia công</DialogTitle>
          <DialogDescription className="text-xs font-medium text-[rgb(var(--c-ink-3))]">
            {ticketCode ? `Cập nhật thông tin phiếu: ${ticketCode}` : "Đang tải..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm font-medium text-[rgb(var(--c-ink-3))]">Đang tải dữ liệu phiếu...</p>
        ) : ticket && (
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-3))] uppercase">Loại</Label>
                <Select value={ticket.type} onValueChange={v => setTicket({ ...ticket, type: v })}>
                  <SelectTrigger className="h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLATING">Xi mạ - Sơn</SelectItem>
                    <SelectItem value="PACKAGING">Đóng gói</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[rgb(var(--c-ink-3))] uppercase">Trạng thái</Label>
                <Select value={ticket.status || "PENDING"} onValueChange={v => setTicket({ ...ticket, status: v })}>
                  <SelectTrigger className="h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Đang chờ</SelectItem>
                    <SelectItem value="PARTIAL">Một phần</SelectItem>
                    <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {ticketType !== "PACKAGING" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[rgb(var(--c-ink-3))] uppercase">Nhà cung cấp</Label>
                  <SupplierSelect
                    value={ticket.supplier_id}
                    onChange={v => setTicket({ ...ticket, supplier_id: v })}
                    suppliers={suppliers}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[rgb(var(--c-ink-3))] uppercase">Ngày xuất đi</Label>
                  <PremiumDatePicker
                    date={ticket.dispatch_date}
                    onSelect={d => setTicket({ ...ticket, dispatch_date: d })}
                    placeholder="Chọn ngày"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[rgb(var(--c-ink-3))] uppercase">Ngày dự kiến về</Label>
                  <PremiumDatePicker
                    date={ticket.expected_return_date}
                    onSelect={d => setTicket({ ...ticket, expected_return_date: d })}
                    placeholder="Chọn ngày"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2 border-t border-[rgb(var(--c-line))]">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Danh sách hàng hóa
                </Label>
                <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold">
                  <Plus className="w-4 h-4" />
                  Thêm phần
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={item.localKey} className="relative p-5/80 border border-[rgb(var(--c-line-2))] rounded-2xl">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.localKey)}
                      className="absolute top-4 right-4 text-[rgb(var(--c-ink-4))] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <h4 className="text-xs font-bold text-[rgb(var(--c-ink-3))] mb-4 uppercase tracking-widest">
                    Phần {index + 1}
                    {item.total_returned > 0 && (
                      <span className="ml-2 text-amber-600 normal-case">(đã nhập về: {item.total_returned})</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5 lg:col-span-1">
                      <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Đơn hàng *</Label>
                      <OrderSelect
                        value={item.order_id}
                        onChange={v => {
                          handleItemChange(item.localKey, "order_id", v);
                          const selectedOrder = orders.find(o => String(o.id) === String(v));
                          if (selectedOrder?.products && item.product_id) {
                            const matchedProduct = selectedOrder.products.find(p => String(p.id) === String(item.product_id));
                            if (matchedProduct?.quantity) {
                              handleItemChange(item.localKey, "order_quantity", parseFloat(matchedProduct.quantity));
                            }
                          }
                        }}
                        orders={orders}
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-1">
                      <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Mã hàng *</Label>
                      <ProductSelect
                        value={item.product_id}
                        onChange={v => {
                          handleItemChange(item.localKey, "product_id", v);
                          if (item.order_id) {
                            const selectedOrder = orders.find(o => String(o.id) === String(item.order_id));
                            const matchedProduct = selectedOrder?.products?.find(p => String(p.id) === String(v));
                            if (matchedProduct?.quantity) {
                              handleItemChange(item.localKey, "order_quantity", parseFloat(matchedProduct.quantity));
                            }
                          }
                        }}
                        products={item.order_id ? (orders.find(o => String(o.id) === String(item.order_id))?.products || []) : products}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">SL Order</Label>
                      <Input type="number" placeholder="0" className="h-11 font-medium" value={item.order_quantity} onChange={e => handleItemChange(item.localKey, "order_quantity", e.target.value)} />
                    </div>
                    {ticketType === "PACKAGING" && (
                      <div className="space-y-1.5 bg-[rgb(var(--c-s2))]/30 p-2 rounded-lg border border-[rgb(var(--c-line-2))]/50">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Quy cách đóng thùng</Label>
                        <Input
                          placeholder="VD: 24 cái/thùng"
                          className="h-9 font-bold"
                          value={item.packing_specification || ""}
                          onChange={e => handleItemChange(item.localKey, "packing_specification", e.target.value)}
                        />
                      </div>
                    )}
                    {ticketType !== "PACKAGING" && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Loại hình</Label>
                        <select
                          className="h-11 font-medium w-full rounded-md border border-[rgb(var(--c-line-2))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          value={item.processing_type}
                          onChange={e => handleItemChange(item.localKey, "processing_type", e.target.value)}
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
                      ticketType === "PACKAGING" ? "bg-emerald-50/50 border-emerald-100" : "bg-blue-50/50 border-blue-100"
                    )}>
                      <Label className={cn("text-[10px] font-bold uppercase", ticketType === "PACKAGING" ? "text-emerald-700" : "text-blue-700")}>
                        {ticketType === "PACKAGING" ? "SL Đóng gói *" : "SL Xuất *"}
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className={cn("h-9 font-bold", ticketType === "PACKAGING" ? "text-emerald-900 border-emerald-200" : "text-blue-900 border-blue-200")}
                        value={item.quantity_out}
                        onChange={e => handleItemChange(item.localKey, "quantity_out", e.target.value)}
                      />
                    </div>
                  </div>

                  {ticketType !== "PACKAGING" && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-[rgb(var(--c-line-2))]/60">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Kiện hàng</Label>
                        <Input type="number" placeholder="0" className="h-10" value={item.package_count} onChange={e => handleItemChange(item.localKey, "package_count", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Gross Weight (KG)</Label>
                        <Input type="number" step="0.01" placeholder="0.00" className="h-10" value={item.gross_weight} onChange={e => handleItemChange(item.localKey, "gross_weight", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Pallet Weight (KG)</Label>
                        <Input type="number" step="0.01" placeholder="0.00" className="h-10" value={item.pallet_weight} onChange={e => handleItemChange(item.localKey, "pallet_weight", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">KL Tịnh (kg/cái)</Label>
                        <Input type="number" step="0.01" placeholder="0.00" className="h-10" value={item.unit_net_weight} onChange={e => handleItemChange(item.localKey, "unit_net_weight", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Ghi chú</Label>
                        <Input placeholder="Chi tiết..." className="h-10" value={item.notes} onChange={e => handleItemChange(item.localKey, "notes", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase">Net Weight (KG)</Label>
                        <Input type="number" step="0.01" placeholder="0.00" className="h-10 bg-[rgb(var(--c-s2))]/50 font-bold" readOnly value={item.net_weight} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-4 border-t border-[rgb(var(--c-line))]">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[rgb(var(--c-line-2))] text-[rgb(var(--c-ink-2))] hover:bg-[rgb(var(--c-s2))] font-bold">
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !ticket}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OutsourcingHistory({ type, orders, products, suppliers }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [filterOrderId, setFilterOrderId] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [editTicketCode, setEditTicketCode] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteTicketId, setDeleteTicketId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["outsourcing-tickets", type, page, pageSize, search, filterOrderId, filterProductId],
    queryFn: () => outsourcingService.getAll({ type, page, limit: pageSize, search, order_id: filterOrderId, product_id: filterProductId }),
    placeholderData: keepPreviousData
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;

  const handleEdit = (ticket) => {
    setEditTicketCode(ticket.ticket_code);
    setShowEditDialog(true);
  };

  const handleDelete = (ticket) => {
    setDeleteTicketId(ticket.id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTicketId) return;
    setIsDeleting(true);
    try {
      await outsourcingService.delete(deleteTicketId);
      toast.success("Xóa phiếu gia công thành công!");
      setShowDeleteDialog(false);
      setDeleteTicketId(null);
      refetch();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Lỗi khi xóa phiếu gia công");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const exportData = await outsourcingService.exportDetailed({
        type,
        search,
        order_id: filterOrderId,
        product_id: filterProductId
      });

      if (!exportData || exportData.length === 0) {
        toast.info("Không có dữ liệu để xuất");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Phiếu Gia Công");

      // ─── Cột phếu đi (B..O = col 2..15) | Phếu về (P..X = col 16..24)
      const diHeaders = [
        "NGÀY XUẤT ĐI", "PO NCC (MÃ PHIẾU)", "ĐƠN HÀNG", "MÃ HÀNG", "SL ORDER",
        "LOẠI HÌNH", "KIỆN", "SL XUẤT", "KG/CÁI", "GROSS WEIGH (KG)",
        "PALLET WEIGH (KG)", "NET WEIGH (KG)", "GHI CHÚ", "NGÀY DỰ KIẾN VỀ"
      ];
      const veHeaders = [
        "NGÀY NHẬP HÀNG", "KIỆN", "SL NHẬP", "KG/CÁI", "GROSS WEIGH (KG)",
        "PALLET WEIGH (KG)", "NET WEIGH (KG)", "KG THIẾU THỮA", "GHI CHÚ"
      ];

      const diColStart = 2; // 1-indexed
      const veColStart = diColStart + diHeaders.length; // 16
      const totalCols = veColStart + veHeaders.length - 1; // 24

      // ─── Cột widths
      ws.getColumn(1).width = 6;
      diHeaders.forEach((_, i) => {
        const widths = [13, 20, 18, 22, 9, 10, 7, 9, 9, 14, 14, 12, 18, 15];
        ws.getColumn(diColStart + i).width = widths[i] || 12;
      });
      veHeaders.forEach((_, i) => {
        const widths = [15, 7, 9, 9, 14, 14, 12, 13, 20];
        ws.getColumn(veColStart + i).width = widths[i] || 12;
      });

      // ─── Hàng 1: group headers
      ws.getRow(1).height = 24;
      const row1 = ws.getRow(1);

      // STT - gộp 2 hàng
      const sttCell = row1.getCell(1);
      sttCell.value = "STT";
      sttCell.font = { bold: true, size: 11, color: { argb: "FF374151" } };
      sttCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      sttCell.alignment = { horizontal: "center", vertical: "middle" };
      sttCell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

      // "Ở phiếu đi" - nền xanh dương
      const diCell = row1.getCell(diColStart);
      diCell.value = "PHIẾU ĐI";
      diCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
      diCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      diCell.alignment = { horizontal: "center", vertical: "middle" };
      diCell.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };

      // "Ở phiếu về" - nền xanh lá đậm
      const veCell = row1.getCell(veColStart);
      veCell.value = "PHIẾU VỀ";
      veCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
      veCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
      veCell.alignment = { horizontal: "center", vertical: "middle" };
      veCell.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };

      // Merge hàng 1
      ws.mergeCells(1, 1, 2, 1);                               // STT
      ws.mergeCells(1, diColStart, 1, diColStart + diHeaders.length - 1); // Phếu đi
      ws.mergeCells(1, veColStart, 1, veColStart + veHeaders.length - 1); // Phếu về

      // ─── Hàng 2: tên cột chi tiết
      ws.getRow(2).height = 36;
      const row2 = ws.getRow(2);

      const subHStyle = (argbBg, argbFont = "FF000000") => ({
        font: { bold: true, size: 9, color: { argb: argbFont } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: argbBg } },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
      });

      // A2 trống (đã merge với A1)
      Object.assign(row2.getCell(1), subHStyle("FFE5E7EB", "FF374151"));

      diHeaders.forEach((h, i) => {
        const c = row2.getCell(diColStart + i);
        c.value = h;
        const s = subHStyle("FFBFDBFE"); // xanh dương nhạt
        c.font = s.font; c.fill = s.fill; c.alignment = s.alignment; c.border = s.border;
      });

      veHeaders.forEach((h, i) => {
        const c = row2.getCell(veColStart + i);
        c.value = h;
        const s = subHStyle("FFD1FAE5"); // xanh lá nhạt
        c.font = s.font; c.fill = s.fill; c.alignment = s.alignment; c.border = s.border;
      });

      // ─── Dữ liệu từ row 3
      exportData.forEach((e, idx) => {
        const row = ws.addRow([
          idx + 1,
          e.dispatch_date ? DateTime.fromISO(e.dispatch_date).toFormat("dd/MM/yyyy") : "",
          e.ticket_code || "",
          e.order_display || "",
          e.product_name || "",
          e.order_quantity != null ? parseFloat(e.order_quantity) : 0,
          e.processing_type || "",
          e.package_count != null ? parseFloat(e.package_count) : 0,
          e.quantity_out != null ? parseFloat(e.quantity_out) : 0,
          e.unit_net_weight != null ? parseFloat(e.unit_net_weight) : 0,
          e.gross_weight != null ? parseFloat(e.gross_weight) : 0,
          e.pallet_weight != null ? parseFloat(e.pallet_weight) : 0,
          e.net_weight != null ? parseFloat(e.net_weight) : 0,
          e.notes || "",
          e.expected_return_date ? DateTime.fromISO(e.expected_return_date).toFormat("dd/MM/yyyy") : "",
          e.last_returned_at ? DateTime.fromISO(e.last_returned_at).toFormat("dd/MM/yyyy") : "",
          "",  // Kiện về
          e.total_returned != null ? parseFloat(e.total_returned) : 0,
          e.unit_net_weight != null ? parseFloat(e.unit_net_weight) : 0,
          e.return_gross_weight != null ? parseFloat(e.return_gross_weight) : 0,
          e.return_pallet_weight != null ? parseFloat(e.return_pallet_weight) : 0,
          e.return_net_weight != null ? parseFloat(e.return_net_weight) : 0,
          e.return_missing_weight != null ? parseFloat(e.return_missing_weight) : 0,
          e.return_notes ? (e.notes ? `${e.notes} | ${e.return_notes}` : e.return_notes) : "",
        ]);
        row.height = 18;
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        // Nền màu xen kẽ cho dễ đọc
        const rowBg = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c);
          if (!cell.fill || cell.fill.fgColor?.argb === "FFFFFFFF") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          }
          cell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };
        }
      });

      // ─── Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phieu_gia_cong_${type === 'PLATING' ? 'xi_ma' : 'dong_goi'}_${DateTime.now().toFormat('yyyyMMdd_HHmm')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Đã xuất file Excel thành công!");
    } catch (err) {
      console.error("Export Excel Error:", err);
      toast.error("Lỗi khi xuất file Excel");
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
      className: "font-bold text-[rgb(var(--c-ink-2))] max-w-[150px] truncate",
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
        return <Badge variant="secondary" className="bg-[rgb(var(--c-s2))] text-[rgb(var(--c-ink-3))]">Đang chờ</Badge>;
      }
    },
    getAuditColumn()
  ];

  if (type === 'PACKAGING') {
    columns = [
      { id: "order_code", label: "Gồm Đơn hàng", className: "font-bold text-[rgb(var(--c-ink-2))] max-w-[150px] truncate", format: (val) => val || "—" },
      { id: "product_name", label: "Gồm Mã hàng", className: "font-medium max-w-[150px] truncate", format: (val) => val || "—" },
      { id: "packing_specification", label: "Quy cách", className: "italic text-[11px] text-[rgb(var(--c-ink-3))] max-w-[120px] truncate", format: (val) => val || "—" },
      { id: "quantity_out", label: "Đã đóng gói", className: "font-black text-blue-600 tabular-nums text-right", format: (val) => parseFloat(val).toLocaleString() },
      {
        id: "status", label: "Trạng thái", format: (val) => {
          if (val === 'COMPLETED') return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn thành</Badge>;
          return <Badge variant="secondary" className="bg-[rgb(var(--c-s2))] text-[rgb(var(--c-ink-3))]">Hoàn thành</Badge>;
        }
      },
      getAuditColumn()
    ];
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-3 p-4 rounded-xl border border-[rgb(var(--c-line-2))]">
        <div className="flex-1 w-full md:w-auto">
          <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase block mb-1.5">Lọc theo ĐH</Label>
          <OrderSelect value={filterOrderId} onChange={setFilterOrderId} orders={orders} />
        </div>
        <div className="flex-1 w-full md:w-auto">
          <Label className="text-[10px] font-bold text-[rgb(var(--c-ink-3))] uppercase block mb-1.5">Lọc theo MH</Label>
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
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <EditOutsourcingTicketDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditTicketCode(null);
        }}
        ticketCode={editTicketCode}
        type={type}
        orders={orders}
        products={products}
        suppliers={suppliers}
        onSaved={refetch}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white border border-[rgb(var(--c-line-2))] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600">Xác nhận xóa phiếu gia công</DialogTitle>
            <DialogDescription className="text-sm font-medium text-[rgb(var(--c-ink-2))] mt-2">
              Bạn có chắc chắn muốn xóa phiếu này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-6">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-[rgb(var(--c-line-2))] text-[rgb(var(--c-ink-2))] hover:bg-[rgb(var(--c-s2))] font-bold rounded-lg">
              Hủy
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
