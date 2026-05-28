import React, { useState } from "react";
import { toast } from "sonner";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Package, Layers, Factory, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "../../context/AuthContext";
import DeleteImpactDialog from "../../components/DeleteImpactDialog";
import { useDeleteWithImpact } from "../../hooks/useDeleteWithImpact";

export default function ProductPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
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

  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      handleClose();
      toast.success("Thành công");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Có lỗi xảy ra"),
  };
  const createMutation = useMutation({ mutationFn: productService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => productService.update(id, payload), ...mutationOpts });
  const { openDelete, confirmDelete, closeDelete, deleteDialogProps } = useDeleteWithImpact({
    entityType: "product",
    entityLabel: "mã hàng",
    deleteFn: productService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const columns = [
    { id: "name", label: "Tên mã hàng" },
    { id: "product_group_name", label: "Nhóm mã hàng" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="status status-run">Hoạt động</Badge>
        : <Badge className="status status-idle">Ngừng HĐ</Badge>
    },
    getAuditColumn(),
  ];

  const handleOpen = (product = null) => {
    setSelectedProduct(product);
    reset(product
      ? { name: product.name, product_group_id: String(product.product_group_id || ""), is_active: product.is_active }
      : { name: "", product_group_id: "", is_active: true }
    );
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedProduct(null); };
  const onSubmit = (data) => {
    if (selectedProduct) updateMutation.mutate({ id: selectedProduct.id, payload: data });
    else createMutation.mutate(data);
  };
  const handleDelete = (product) => openDelete(product);
  const handleBulkDelete = (ids) => openDelete(ids);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(var(--c-ink))", letterSpacing: "-0.01em" }}>Quản lý Mã hàng</h2>
          <p style={{ fontSize: 11, color: "rgb(var(--c-ink-4))", marginTop: 2 }}>Danh mục sản phẩm theo nhóm mã hàng</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Factory Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-48 justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <Factory  />
                  <span className="truncate">
                    {filterFactoryId === "" ? "Tất cả nhà máy" : factories?.find(f => String(f.id) === String(filterFactoryId))?.name}
                  </span>
                </div>
                <ChevronsUpDown  />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="end">
              <Command className="w-full">
                <CommandInput placeholder="Tìm nhà máy..." className="h-10" />
                <CommandList >
                  <CommandEmpty >Không thấy</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => setFilterFactoryId("")}
                      
                    >
                      Tất cả nhà máy
                      <Check className={cn("h-4 w-4 text-indigo-600", filterFactoryId === "" ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                    {factories?.map((f) => (
                      <CommandItem
                        key={f.id}
                        value={f.name}
                        onSelect={() => setFilterFactoryId(String(f.id))}
                        
                      >
                        {f.name}
                        <Check className={cn("h-4 w-4 text-indigo-600", String(filterFactoryId) === String(f.id) ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {hasPermission("products:create") && (
            <Button
              onClick={() => handleOpen()}
              
            >
              <Plus className="w-4 h-4" /> Thêm mã hàng
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <GenericTable
          data={products}
          columns={columns}
          isLoading={isLoading}
          error={error}
          onEdit={hasPermission("products:update") ? handleOpen : undefined}
          onDelete={hasPermission("products:delete") ? handleDelete : undefined}
          onBulkDelete={hasPermission("products:delete") ? handleBulkDelete : undefined}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
        />
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={openModal} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={rhfHandleSubmit(onSubmit)} >
            <DialogHeader className="px-6 py-4 border-b border-[rgb(var(--c-line-2))]">
              <DialogTitle className="text-xl font-black text-[rgb(var(--c-ink))] uppercase tracking-tight">
                {selectedProduct ? "Chỉnh sửa mã hàng" : "Thêm mã hàng mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Product Group */}
              <div className="space-y-2">
                <Label>Nhóm mã hàng <span className="text-red-500">*</span></Label>
                <Controller name="product_group_id" control={control} render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between font-semibold",
                          !field.value && "text-[rgb(var(--c-ink-3))]"
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
                            <p className="text-[10px] font-black text-[rgb(var(--c-ink-4))] uppercase tracking-widest">Không tìm thấy nhóm nào</p>
                          </CommandEmpty>
                          <CommandGroup>
                            {productGroups?.map((g) => (
                              <CommandItem
                                key={g.id}
                                value={g.name}
                                onSelect={() => field.onChange(String(g.id))}
                                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] transition-colors mb-1 last:mb-0"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-[rgb(var(--c-s2))] flex items-center justify-center text-[10px] font-bold text-[rgb(var(--c-ink-3))]">
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
                  <div className="bg-[rgb(var(--c-s2))] rounded-xl p-3 border border-[rgb(var(--c-line))] space-y-2">
                    <p className="text-[10px] font-black text-[rgb(var(--c-ink-4))] uppercase tracking-widest flex items-center gap-1.5">
                      <Package className="w-3 h-3" /> Danh sách mã trong nhóm này
                    </p>
                    <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-32 p-1">
                      {products?.filter(p => String(p.product_group_id) === String(selectedGroupId)).length > 0 ? (
                        products
                          ?.filter(p => String(p.product_group_id) === String(selectedGroupId))
                          .map(p => (
                            <Badge key={p.id} variant="secondary" className="bg-white border-[rgb(var(--c-line-2))] font-bold text-[10px] shadow-sm">
                              {p.name}
                            </Badge>
                          ))
                      ) : (
                        <p className="text-[10px] italic text-[rgb(var(--c-ink-4))]">Chưa có mã hàng nào trong nhóm này.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <Label>Tên mã hàng <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => <Input {...field} required />} />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <Label>Đang hoạt động</Label>
                <Controller name="is_active" control={control} render={({ field }) => (
                  <input type="checkbox" className="w-4 h-4 rounded accent-zinc-950" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                )} />
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-[rgb(var(--c-line))]/50">
              <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Lưu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteImpactDialog
        {...deleteDialogProps}
        onClose={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
