import React, { useState } from "react"; import { toast } from "sonner";

import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workerService } from "../../services/worker.service";
import GenericTable from "../../components/GenericTable";
import { getAuditColumn } from "../../utils/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DeleteImpactDialog from "../../components/DeleteImpactDialog";
import { useDeleteWithImpact } from "../../hooks/useDeleteWithImpact";

export default function WorkerPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { control, handleSubmit: rhfHandleSubmit, reset } = useForm({
    defaultValues: { code: "", name: "", phone: "", factory_id: "", is_active: true },
  });

  const { data: workersData, isLoading, error } = useQuery({
    queryKey: ["workers", page, pageSize, search],
    queryFn: () => workerService.getAll({ page, limit: pageSize, search }),
  });

  const workers = workersData?.data || [];
  const totalItems = workersData?.total || 0;

  const createMutation = useMutation({ mutationFn: workerService.create, onSuccess: () => { queryClient.invalidateQueries(["workers"]); setOpenModal(false); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi tạo") });
  const updateMutation = useMutation({ mutationFn: (data) => workerService.update(data.id, data.payload), onSuccess: () => { queryClient.invalidateQueries(["workers"]); setOpenModal(false); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi cập nhật") });
  const { openDelete, confirmDelete, closeDelete, deleteDialogProps } = useDeleteWithImpact({
    entityType: "worker",
    entityLabel: "công nhân",
    deleteFn: workerService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  const columns = [
    { id: "code", label: "Mã nhân công" },
    { id: "name", label: "Họ và tên" },
    { id: "phone", label: "Số điện thoại" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <span className="status status-run">Hoạt động</span>
        : <span className="status status-idle">Tạm dừng</span>
    },
    getAuditColumn(),
  ];

  const handleOpenModal = (worker = null) => {
    setSelectedWorker(worker);
    reset(worker ? { code: worker.code, name: worker.name, phone: worker.phone || "", factory_id: worker.factory_id || "", is_active: worker.is_active } : { code: "", name: "", phone: "", factory_id: "", is_active: true });
    setOpenModal(true);
  };
  const onSubmit = (data) => {
    if (selectedWorker) updateMutation.mutate({ id: selectedWorker.id, payload: data });
    else createMutation.mutate(data);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'rgb(var(--c-ink))', letterSpacing: '-0.01em' }}>Quản lý Công nhân</h1>
          <p style={{ fontSize: 11, color: 'rgb(var(--c-ink-4))', marginTop: 2 }}>Danh sách nhân sự phục vụ sản xuất và kế hoạch</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="w-3.5 h-3.5" /> Thêm công nhân</Button>
      </div>

      <div className="table-container">
        <GenericTable
          columns={columns}
          data={workers}
          onEdit={hasPermission("workers:update") ? handleOpenModal : undefined}
          onDelete={hasPermission("workers:delete") ? (row) => openDelete(row) : undefined}
          onBulkDelete={(ids) => openDelete(ids)}
          isLoading={isLoading}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
        />
      </div>

      <Dialog open={openModal} onOpenChange={(v) => { if (!v) setOpenModal(false); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--c-ink))" }}>{selectedWorker ? "Cập nhật Công nhân" : "Thêm Công nhân mới"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Mã công nhân <span className="text-red-500">*</span></Label>
                <Controller name="code" control={control} render={({ field }) => (
                  <Input {...field} placeholder="VD: CN001" required disabled={!!selectedWorker} />
                )} />
              </div>
              <div className="space-y-2">
                <Label>Họ và tên <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => (
                  <Input {...field} placeholder="Nhập đầy đủ họ tên" required />
                )} />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Controller name="phone" control={control} render={({ field }) => (
                  <Input {...field} placeholder="0xxx xxx xxx" />
                )} />
              </div>
              <div className="flex items-center gap-3">
                <Label>Đang hoạt động</Label>
                <Controller name="is_active" control={control} render={({ field }) => (
                  <input type="checkbox" className="w-4 h-4 rounded accent-zinc-950" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                )} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedWorker ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteImpactDialog {...deleteDialogProps} onClose={closeDelete} onConfirm={confirmDelete} />
    </div>
  );
}
