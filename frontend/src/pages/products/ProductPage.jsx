import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../../services/product.service";
import { productGroupService } from "../../services/product-group.service";
import { factoryService } from "../../services/factory.service";
import GenericTable from "../../components/GenericTable";
import { getAuditColumn } from "../../utils/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Package, Search, Layers, Factory, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterFactoryId, setFilterFactoryId] = useState("");

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { control, handleSubmit: rhfHandleSubmit, reset, watch } = useForm({
    defaultValues: { name: "", product_group_id: "", is_active: true },
  });

  const selectedGroupId = watch("product_group_id");

  const { data: factoriesData } = useQuery({ queryKey: ["factories"], queryFn: () => factoryService.getAll({ limit: 1000 }) });
  const factories = factoriesData?.data || [];
  const { data: productGroupsData } = useQuery({ queryKey: ["productGroups"], queryFn: () => productGroupService.getAll({ limit: 1000 }) });
  const productGroups = productGroupsData?.data || [];
  
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ["products", filterFactoryId, page, pageSize, search],
    queryFn: () => productService.getAll({ factory_id: filterFactoryId, page, limit: pageSize, search }),
  });

  const products = productsData?.data || [];
  const totalItems = productsData?.total || 0;

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: productService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => productService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: productService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }) });

  const columns = [
    { id: "name", label: "Tên mã hàng" },
    { id: "product_group_name", label: "Nhóm mã hàng" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">Hoạt động</Badge>
        : <Badge variant="secondary" className="text-zinc-400">Ngừng HĐ</Badge>
    },
    getAuditColumn(),
  ];

  const handleOpen = (product = null) => {
    setSelectedProduct(product);
    reset(product ? { name: product.name, product_group_id: String(product.product_group_id || ""), is_active: product.is_active } : { name: "", product_group_id: "", is_active: true });
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedProduct(null); };
  const onSubmit = (data) => {
    if (selectedProduct) updateMutation.mutate({ id: selectedProduct.id, payload: data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản lý Mã hàng</h2>
           <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Danh sách thông tin mã hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-48 h-11 justify-between bg-zinc-50 border-zinc-200 font-bold hover:bg-white transition-all rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <Factory className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span className="truncate">
                    {filterFactoryId === "" ? "Tất cả nhà máy" : factories?.find(f => String(f.id) === String(filterFactoryId))?.name}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="end">
              <Command className="w-full">
                <CommandInput placeholder="Tìm nhà máy..." className="h-10" />
                <CommandList className="max-h-64 p-1">
                  <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không thấy</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => setFilterFactoryId("")}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer font-bold text-xs"
                    >
                      Tất cả nhà máy
                      <Check
                        className={cn(
                          "h-4 w-4 text-indigo-600",
                          filterFactoryId === "" ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                    {factories?.map((f) => (
                      <CommandItem
                        key={f.id}
                        value={f.name}
                        onSelect={() => setFilterFactoryId(String(f.id))}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer font-bold text-xs"
                      >
                        {f.name}
                        <Check
                          className={cn(
                            "h-4 w-4 text-indigo-600",
                            String(filterFactoryId) === String(f.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button onClick={() => handleOpen()} className="h-11 px-6 gap-2 font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl">
            <Plus className="w-4 h-4" /> Thêm mã hàng
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <GenericTable data={products} columns={columns} isLoading={isLoading} error={error}
        onEdit={handleOpen}
        onDelete={(p) => { if (window.confirm(`Xóa mã hàng "${p.name}"?`)) deleteMutation.mutate(p.id); }}
        onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} mã hàng?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
        isServerSide={true}
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={setSearch}
      />
      </div>

      <Dialog open={openModal} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col h-full">
            <DialogHeader className="p-6 border-b border-zinc-100">
              <DialogTitle>{selectedProduct ? "Chỉnh sửa mã hàng" : "Thêm mã hàng mới"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nhóm mã hàng <span className="text-red-500">*</span></Label>
                <Controller name="product_group_id" control={control} render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between bg-white border-zinc-200 font-semibold",
                          !field.value && "text-zinc-500"
                        )}
                      >
                        {field.value
                          ? productGroups?.find(g => String(g.id) === String(field.value))?.name
                          : "Chọn nhóm mã hàng"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                      <Command className="w-full">
                        <CommandInput placeholder="Tìm kiếm nhóm..." />
                        <CommandList className="max-h-64 overflow-y-auto p-1">
                          <CommandEmpty className="py-6 text-center">
                            <Layers className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không tìm thấy nhóm nào</p>
                          </CommandEmpty>
                          <CommandGroup>
                            {productGroups?.map((g) => (
                              <CommandItem
                                key={g.id}
                                value={g.name}
                                onSelect={() => field.onChange(String(g.id))}
                                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                              >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500 group-aria-selected:bg-indigo-100 group-aria-selected:text-indigo-600">
                                        {g.name.substring(0, 1)}
                                    </div>
                                    <span className="text-xs font-bold">{g.name}</span>
                                </div>
                                <Check
                                  className={cn(
                                    "h-3.5 w-3.5 text-indigo-600",
                                    String(field.value) === String(g.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )} />

                {selectedGroupId && (
                  <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Package className="w-3 h-3" /> Danh sách mã trong nhóm này
                    </p>
                    <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-32 p-1">
                      {products?.filter(p => String(p.product_group_id) === String(selectedGroupId)).length > 0 ? (
                        products
                          ?.filter(p => String(p.product_group_id) === String(selectedGroupId))
                          .map(p => (
                            <Badge key={p.id} variant="secondary" className="bg-white border-zinc-200 font-bold text-[10px] shadow-sm">
                              {p.name}
                            </Badge>
                          ))
                      ) : (
                        <p className="text-[10px] italic text-zinc-400">Chưa có mã hàng nào trong nhóm này.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tên mã hàng <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => <Input {...field} required />} />
              </div>
              <div className="flex items-center gap-3">
                <Label>Đang hoạt động</Label>
                <Controller name="is_active" control={control} render={({ field }) => (
                  <input type="checkbox" className="w-4 h-4 rounded accent-zinc-950" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                )} />
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-zinc-100 bg-zinc-50/50">
              <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Lưu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
