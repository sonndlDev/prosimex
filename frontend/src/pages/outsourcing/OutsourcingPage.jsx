import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenericTable from "@/components/GenericTable";
import { getAuditColumn } from "@/utils/audit";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, Search, Calendar, Package, Tag, Hash, Building2, CheckCircle2, ShoppingCart, PaintBucket, ChevronsUpDown, Check, AlertCircle } from "lucide-react";
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-30 lg:w-60 shrink-0">
          <TabsList className="flex flex-col h-auto bg-zinc-100 p-2 border border-zinc-200 shadow-inner rounded-3xl w-full">
            <TabsTrigger
              value="plating"
              className={cn(
                "w-full justify-start py-4 px-5 text-left font-black text-sm rounded-2xl mb-2 transition-all duration-300 group",
                activeTab === "plating"
                  ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 translate-x-1"
                  : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700"
              )}
            >
              <div className="flex items-center gap-3">
                <PaintBucket className={cn("w-5 h-5 transition-transform duration-300", activeTab === "plating" ? "scale-110" : "opacity-60")} />
                Xi mạ - Sơn
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="packaging"
              className={cn(
                "w-full justify-start py-4 px-5 text-left font-black text-sm rounded-2xl transition-all duration-300 group",
                activeTab === "packaging"
                  ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100/50 translate-x-1"
                  : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700"
              )}
            >
              <div className="flex items-center gap-3">
                <Package className={cn("w-5 h-5 transition-transform duration-300", activeTab === "packaging" ? "scale-110" : "opacity-60")} />
                Đóng gói
              </div>
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
  const [subTab, setSubTab] = useState("out");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resOrders, resProducts] = await Promise.all([
        orderService.getAll({ limit: 500 }),
        productService.getAll({ limit: 500 })
      ]);
      setOrders(resOrders.data || []);
      setProducts(resProducts.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu đơn hàng/mã hàng");
    }
  };

  return (
    <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white rounded-2xl">
      <CardHeader className="p-0 border-b border-zinc-100 bg-white">
        <div className="px-6 pt-6">
          <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
            <TabsList className="flex w-full bg-zinc-100 p-1 rounded-full border border-zinc-200 max-w-lg h-12 shadow-inner">
              <TabsTrigger
                value="out"
                className={cn(
                  "flex-1 font-black rounded-full py-2 transition-all text-xs uppercase tracking-widest",
                  subTab === "out"
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Phiếu ĐI
              </TabsTrigger>
              <TabsTrigger
                value="in"
                className={cn(
                  "flex-1 font-black rounded-full py-2 transition-all text-xs uppercase tracking-widest",
                  subTab === "in"
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Phiếu VỀ
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className={cn(
                  "flex-1 font-black rounded-full py-2 transition-all text-xs uppercase tracking-widest",
                  subTab === "history"
                    ? "bg-white text-indigo-600 shadow-md"
                    : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                Danh sách phiếu
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-6 md:p-8">
        {subTab === "out" && <OutboundTicketForm type={type} orders={orders} products={products} />}
        {subTab === "in" && <InboundTicketForm type={type} />}
        {subTab === "history" && <OutsourcingHistory type={type} />}
      </CardContent>
    </Card>
  );
}

function OrderSelect({ value, onChange, orders }) {
  const selectedOrder = orders.find(o => String(o.id) === String(value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
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
              {value && selectedOrder ? `${selectedOrder.order_code} - ${selectedOrder.name}` : "Chọn đơn hàng"}
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
                  value={`${o.order_code} ${o.name}`}
                  onSelect={() => onChange(String(o.id))}
                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700 mb-1"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-blue-600">{o.order_code}</span>
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
              {value && selectedProduct ? selectedProduct.name : "Chọn mã hàng"}
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

function OutboundTicketForm({ type, orders, products }) {
  const [formData, setFormData] = useState({
    order_id: "",
    product_id: "",
    supplier: "",
    quantity_out: "",
    weight_out: "",
    pieces_out: "",
    expected_return_date: DateTime.now().plus({ days: 3 }).toFormat("yyyy-MM-dd")
  });
  const [loading, setLoading] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.order_id || !formData.product_id || !formData.quantity_out) {
      toast.error("Vui lòng điền Đơn hàng, Mã hàng và Số lượng xuất");
      return;
    }
    setLoading(true);
    setCreatedTicket(null);
    try {
      const payload = {
        ...formData,
        type,
        expected_return_date: formData.expected_return_date && type !== 'PACKAGING' ? DateTime.fromFormat(formData.expected_return_date, 'yyyy-MM-dd').toISO() : null
      };
      if (type === 'PACKAGING') {
        payload.supplier = null;
        payload.weight_out = null;
        payload.pieces_out = null;
      }
      const res = await outsourcingService.create(payload);
      setCreatedTicket(res);
      toast.success("Tạo phiếu đi thành công!");
    } catch (error) {
      toast.error("Lỗi khi tạo phiếu đi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Đơn hàng <span className="text-red-500">*</span></Label>
            <OrderSelect
              value={formData.order_id}
              onChange={v => setFormData(f => ({ ...f, order_id: v }))}
              orders={orders}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Mã hàng <span className="text-red-500">*</span></Label>
            <ProductSelect
              value={formData.product_id}
              onChange={v => setFormData(f => ({ ...f, product_id: v }))}
              products={products}
            />
          </div>

          {type !== 'PACKAGING' && (
            <div className="space-y-2">
              <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Nhà cung cấp</Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  className="pl-10 h-11 bg-white focus-visible:ring-blue-500 border-zinc-200 font-medium"
                  placeholder="Tên nhà cung cấp / đối tác"
                  value={formData.supplier}
                  onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
            <Label className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
              <Hash className="w-4 h-4" /> Số lượng xuất <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              className="h-12 bg-white text-lg font-black tabular-nums border-blue-200 focus-visible:ring-blue-600 shadow-sm text-blue-900"
              placeholder="0"
              value={formData.quantity_out}
              onChange={e => setFormData({ ...formData, quantity_out: e.target.value })}
            />
          </div>

          {type !== 'PACKAGING' && (
            <>
              <div className="space-y-2 self-end">
                <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Số KG xuất đi</Label>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-10 h-11 bg-white focus-visible:ring-zinc-500 border-zinc-200 font-bold tabular-nums"
                    placeholder="0.00"
                    value={formData.weight_out}
                    onChange={e => setFormData({ ...formData, weight_out: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2 self-end">
                <Label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Số cái (Pieces)</Label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="number"
                    className="pl-10 h-11 bg-white focus-visible:ring-zinc-500 border-zinc-200 font-bold tabular-nums"
                    placeholder="0"
                    value={formData.pieces_out}
                    onChange={e => setFormData({ ...formData, pieces_out: e.target.value })}
                  />
                </div>
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

        <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-base shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Tạo phiếu xuất gia công
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
            <h3 className="font-bold text-emerald-900 text-lg">Tạo phiếu thành công!</h3>
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
  const [returnQty, setReturnQty] = useState("");
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
    } catch (error) {
      toast.error("Không tìm thấy mã phiếu hoặc có lỗi xảy ra");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAddReturn = async () => {
    if (!returnQty || parseFloat(returnQty) <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ!");
      return;
    }
    setLoadingReturn(true);
    try {
      await outsourcingService.addReturn(ticketData.id, { quantity_returned: returnQty });
      toast.success("Đã cập nhật lượng nhập về!");
      setReturnQty("");
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in slide-in-from-bottom-4 duration-500 pt-4">
          <div className="lg:col-span-3 space-y-6">
            <h3 className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-3">
              Thông tin Phiếu
              <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 font-['Outfit']">{ticketData.ticket_code}</span>
            </h3>

            <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Đơn hàng</p>
                <p className="font-bold text-slate-800 text-base">{ticketData.order_name || ticketData.order_code}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mã hàng</p>
                <p className="font-bold text-slate-800 text-base">{ticketData.product_name}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nhà cung cấp</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-400" />
                  <p className="font-bold text-slate-800">{ticketData.supplier || "—"}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tình trạng</p>
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
              <div className="col-span-2 pt-4 mt-2 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Lượng xuất đi</p>
                    <p className="font-black text-2xl text-slate-800 tabular-nums">{ticketData.quantity_out}</p>
                  </div>
                  <div className="h-10 w-px bg-zinc-200"></div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Đã nhập về</p>
                    <p className="font-black text-2xl text-indigo-600 tabular-nums">{ticketData.total_returned}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, (ticketData.total_returned / ticketData.quantity_out) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-indigo-50/70 border border-indigo-100 rounded-2xl shadow-sm">
              <Label className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3 block">Nhập lượng hàng về</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Số lượng..."
                    value={returnQty}
                    onChange={e => setReturnQty(e.target.value)}
                    className="h-12 bg-white text-lg font-black tabular-nums border-indigo-200 focus-visible:ring-indigo-600 pl-4"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">PCS</span>
                </div>
                <Button
                  onClick={handleAddReturn}
                  disabled={loadingReturn}
                  className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-md w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5" />
                  Xác nhận
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
              Lịch sử nhập
              <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-0.5 rounded-full">{history.length}</span>
            </h3>

            <div className="bg-white border border-zinc-200 rounded-2xl p-2 shadow-sm min-h-[300px]">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                  <AlertCircle className="w-10 h-10 text-zinc-300 mb-3" />
                  <p className="text-zinc-500 font-medium text-sm">Chưa có bản ghi nào</p>
                  <p className="text-zinc-400 text-xs mt-1 max-w-[200px]">Bạn hãy nhập số lượng để ghi nhận lịch sử.</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex flex-col p-4 bg-white border border-transparent hover:border-zinc-100 hover:bg-zinc-50 rounded-xl transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xs shrink-0 shadow-sm border border-emerald-200">
                            #{history.length - i}
                          </div>
                          <div>
                            <p className="font-black text-lg text-emerald-600 tracking-tight leading-none mb-1">+{h.quantity_returned}</p>
                            <p className="text-[11px] font-bold text-zinc-400">{new Date(h.returned_at).toLocaleString('vi-VN')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end content-end">
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md">
                          Bởi: {h.created_by_username || "Hệ thống"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OutsourcingHistory({ type }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["outsourcing-tickets", type, page, pageSize, search],
    queryFn: () => outsourcingService.getAll({ type, page, limit: pageSize, search }),
    placeholderData: keepPreviousData
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;

  const columns = [
    {
      id: "ticket_code",
      label: "Mã phiếu",
      className: "font-black text-indigo-600",
      format: (val) => <span className="font-['Outfit']">{val}</span>
    },
    {
      id: "order_name",
      label: "Đơn hàng",
      className: "font-bold text-zinc-700",
      format: (val, row) => val || row.order_code
    },
    { id: "product_name", label: "Mã hàng", className: "font-medium" },
    { id: "supplier", label: "Nhà cung cấp", format: (v) => v || "—" },
    {
      id: "quantity_out",
      label: "SL Xuất",
      className: "font-black text-blue-600 tabular-nums text-right",
      format: (val) => parseFloat(val).toLocaleString()
    },
    {
      id: "total_returned",
      label: "Đã về",
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

  return (
    <div className="space-y-4">
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
