import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workerService } from "../../services/worker.service";
import GenericTable from "../../components/GenericTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default function WorkerPage() {
  const queryClient = useQueryClient();
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

  const createMutation = useMutation({ mutationFn: workerService.create, onSuccess: () => { queryClient.invalidateQueries(["workers"]); setOpenModal(false); } });
  const updateMutation = useMutation({ mutationFn: (data) => workerService.update(data.id, data.payload), onSuccess: () => { queryClient.invalidateQueries(["workers"]); setOpenModal(false); } });
  const deleteMutation = useMutation({ mutationFn: workerService.delete, onSuccess: () => queryClient.invalidateQueries(["workers"]) });

  const columns = [
    { id: "code", label: "Mã nhân công" },
    { id: "name", label: "Họ và tên" },
    { id: "phone", label: "Số điện thoại" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">Hoạt động</Badge>
        : <Badge variant="secondary" className="text-zinc-400">Tạm dừng</Badge>
    },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản lý Công nhân</h2>
           <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Quản lý danh sách nhân sự phục vụ sản xuất và kế hoạch</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpenModal()} className="h-11 px-6 gap-2 font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl">
            <Plus className="w-4 h-4" /> Thêm công nhân
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <GenericTable
        columns={columns}
        data={workers}
        onEdit={handleOpenModal}
        onDelete={(row) => { if (window.confirm("Bạn có chắc muốn xóa công nhân này?")) deleteMutation.mutate(row.id); }}
        onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} công nhân?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
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
              <DialogTitle className="text-xl font-extrabold">{selectedWorker ? "Cập nhật Công nhân" : "Thêm Công nhân mới"}</DialogTitle>
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
    </div>
  );
}
