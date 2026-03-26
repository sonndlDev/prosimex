import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "../../services/product.service";
import { productGroupService } from "../../services/product-group.service";
import { factoryService } from "../../services/factory.service";
import GenericTable from "../../components/GenericTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProductPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterFactoryId, setFilterFactoryId] = useState("");

  const { control, handleSubmit: rhfHandleSubmit, reset } = useForm({
    defaultValues: { name: "", product_group_id: "", is_active: true },
  });

  const { data: factories } = useQuery({ queryKey: ["factories"], queryFn: factoryService.getAll });
  const { data: productGroups } = useQuery({ queryKey: ["productGroups"], queryFn: () => productGroupService.getAll() });
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", filterFactoryId],
    queryFn: () => productService.getAll(filterFactoryId),
  });

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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Quản lý Mã hàng</h2>
        <div className="flex items-center gap-2">
          <Select value={filterFactoryId} onValueChange={setFilterFactoryId}>
            <SelectTrigger className="w-48 bg-zinc-50"><SelectValue placeholder="Tất cả nhà máy" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tất cả nhà máy</SelectItem>
              {factories?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpen()} className="gap-2 font-semibold">+ Thêm mã hàng</Button>
        </div>
      </div>

      <GenericTable data={products} columns={columns} isLoading={isLoading} error={error}
        onEdit={handleOpen}
        onDelete={(p) => { if (window.confirm(`Xóa mã hàng "${p.name}"?`)) deleteMutation.mutate(p.id); }}
        onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} mã hàng?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
      />

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
                  <Select value={String(field.value || "")} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhóm mã hàng">
                        {productGroups?.find(g => String(g.id) === String(field.value))?.name || field.value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {productGroups?.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
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
