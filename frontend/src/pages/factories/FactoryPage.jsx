import React, { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "../../context/AuthContext";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { factoryService } from "../../services/factory.service";
import GenericTable from "../../components/GenericTable";
import { getAuditColumn } from "../../utils/audit";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DeleteImpactDialog from "../../components/DeleteImpactDialog";
import { useDeleteWithImpact } from "../../hooks/useDeleteWithImpact";

export default function FactoryPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState(null);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { control, handleSubmit: rhfHandleSubmit, reset } = useForm({
    defaultValues: { name: "", is_active: true },
  });

  const { data: factoriesData, isLoading, error } = useQuery({
    queryKey: ["factories", page, pageSize, search],
    queryFn: () => factoryService.getAll({ page, limit: pageSize, search }),
  });

  const factories = factoriesData?.data || [];
  const totalItems = factoriesData?.total || 0;

  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factories"] });
      handleClose();
    },
  };
  const createMutation = useMutation({ mutationFn: factoryService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => factoryService.update(id, payload), ...mutationOpts });
  const { openDelete, confirmDelete, closeDelete, deleteDialogProps } = useDeleteWithImpact({
    entityType: "factory",
    entityLabel: "nhà máy",
    deleteFn: factoryService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["factories"] }),
  });

  const columns = [
    { id: "name", label: "Tên nhà máy" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="status status-run">Hoạt động</Badge>
        : <Badge className="status status-idle">Ngừng HĐ</Badge>
    },
    getAuditColumn(),
  ];

  const handleOpen = (factory = null) => {
    setSelectedFactory(factory);
    reset(factory ? { name: factory.name, is_active: factory.is_active } : { name: "", is_active: true });
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedFactory(null); };
  const onSubmit = (data) => {
    if (selectedFactory) updateMutation.mutate({ id: selectedFactory.id, payload: data });
    else createMutation.mutate(data);
  };
  const handleDelete = (factory) => openDelete(factory);
  const handleBulkDelete = (ids) => openDelete(ids);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(var(--c-ink))", letterSpacing: "-0.01em" }}>Quản lý Nhà máy</h2>
          <p style={{ fontSize: 11, color: "rgb(var(--c-ink-4))", marginTop: 2 }}>Danh sách phân xưởng sản xuất</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission("factories:create") && (
            <Button onClick={() => handleOpen()} >
              <Plus className="w-4 h-4" /> Thêm nhà máy
            </Button>
          )}
        </div>
      </div>

      <div className="table-container">
        <GenericTable
          data={factories}
          columns={columns}
          isLoading={isLoading}
          error={error}
          onEdit={hasPermission("factories:update") ? handleOpen : undefined}
          onDelete={hasPermission("factories:delete") ? handleDelete : undefined}
          onBulkDelete={hasPermission("factories:delete") ? handleBulkDelete : undefined}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
        />
      </div>

      <Dialog open={openModal} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={rhfHandleSubmit(onSubmit)} >
            <DialogHeader className="px-6 py-4 border-b border-[rgb(var(--c-line-2))]">
              <DialogTitle className="text-xl font-black text-[rgb(var(--c-ink))] uppercase tracking-tight">
                {selectedFactory ? "Chỉnh sửa nhà máy" : "Thêm nhà máy mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-[rgb(var(--c-ink-4))]">Tên nhà máy <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => (
                  <Input {...field} placeholder="Nhập tên nhà máy" className="h-11 font-bold border-[rgb(var(--c-line-2))] focus-visible:ring-indigo-600" required />
                )} />
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[rgb(var(--c-line))]">
                <Label htmlFor="factory-active" className="font-bold text-sm text-[rgb(var(--c-ink-2))] cursor-pointer flex-1 uppercase tracking-tighter">Trạng thái hoạt động</Label>
                <Controller name="is_active" control={control} render={({ field }) => (
                  <input
                    id="factory-active"
                    type="checkbox"
                    className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
                    checked={field.value}
                    onChange={e => field.onChange(e.target.checked)}
                  />
                )} />
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-[rgb(var(--c-line-2))] gap-2">
              <Button type="button" variant="ghost" onClick={handleClose} className="font-bold text-[rgb(var(--c-ink-3))]">Hủy bỏ</Button>
              <Button type="submit" className="font-bold px-8 shadow-md" disabled={createMutation.isPending || updateMutation.isPending}>
                Lưu nhà máy
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteImpactDialog {...deleteDialogProps} onClose={closeDelete} onConfirm={confirmDelete} />
    </div>
  );
}