import React, { useState } from "react";
import { toast } from "sonner";

import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierService } from "../../services/supplier.service";
import GenericTable from "../../components/GenericTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [search, setSearch] = useState("");
  // Pagination if needed later
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { control, handleSubmit: rhfHandleSubmit, reset } = useForm({
    defaultValues: { code: "", name: "", phone: "", address: "" },
  });

  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => supplierService.getAll({ search }),
  });

  const mutationOpts = { 
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }); 
      handleClose(); 
      toast.success(selectedSupplier ? "Cập nhật thành công!" : "Tạo mới thành công!");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };
  const createMutation = useMutation({ mutationFn: supplierService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => supplierService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ 
    mutationFn: supplierService.delete, 
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Xóa thành công!");
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.response?.data?.message || "Không thể xóa nhà cung cấp");
    }
  });

  const columns = [
    { id: "code", label: "Mã NCC" },
    { id: "name", label: "Tên nhà cung cấp" },
    { id: "phone", label: "Số điện thoại" },
    { id: "address", label: "Địa chỉ" },
  ];

  const handleOpen = (supplier = null) => {
    setSelectedSupplier(supplier);
    reset(supplier ? { code: supplier.code, name: supplier.name, phone: supplier.phone || "", address: supplier.address || "" } : { code: "", name: "", phone: "", address: "" });
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedSupplier(null); };
  const onSubmit = (data) => {
    if (selectedSupplier) updateMutation.mutate({ id: selectedSupplier.id, payload: data });
    else createMutation.mutate(data);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div >
           <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(var(--c-ink))", letterSpacing: "-0.01em" }}>Quản lý Nhà Cung Cấp</h2>
           <p style={{ fontSize: 11, color: "rgb(var(--c-ink-4))", marginTop: 2 }}>Danh sách đối tác gia công và cung cấp vật tư</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission("suppliers:create") && (
            <Button onClick={() => handleOpen()} >
              <Plus className="w-4 h-4" /> Thêm NCC
            </Button>
          )}
        </div>
      </div>

      <div className="table-container">
      <GenericTable
        data={suppliers || []} columns={columns} isLoading={isLoading} error={error}
        onEdit={hasPermission("suppliers:update") ? handleOpen : undefined}
        onDelete={hasPermission("suppliers:delete") ? (c) => { if (window.confirm(`Xóa nhà cung cấp "${c.name}"?`)) deleteMutation.mutate(c.id); } : undefined}
        onBulkDelete={hasPermission("suppliers:delete") ? (ids) => { if (window.confirm(`Xóa ${ids.length} NCC?`)) ids.forEach(id => deleteMutation.mutate(id)); } : undefined}
        isServerSide={false}
        onSearchChange={setSearch}
      />
      </div>

      <Dialog open={openModal} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{selectedSupplier ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp mới"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Mã số <span className="text-red-500">*</span></Label>
                <Controller name="code" control={control} render={({ field }) => <Input {...field} required />} />
              </div>
              <div className="space-y-2">
                <Label>Tên NCC <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => <Input {...field} required />} />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Controller name="phone" control={control} render={({ field }) => <Input {...field} />} />
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ</Label>
                <Controller name="address" control={control} render={({ field }) => (
                  <textarea {...field} rows={3} placeholder="Địa chỉ chi tiết..."
                    className="w-full rounded-md border border-[rgb(var(--c-line-2))] bg-transparent px-3 py-2 text-sm placeholder:text-[rgb(var(--c-ink-4))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none" />
                )} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Lưu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
