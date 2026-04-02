import React, { useState } from "react";
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

export default function FactoryPage() {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["factories"] }); handleClose(); },
  };
  const createMutation = useMutation({ mutationFn: factoryService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => factoryService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: factoryService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["factories"] }) });

  const columns = [
    { id: "name", label: "Tên nhà máy" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">Hoạt động</Badge>
        : <Badge variant="secondary" className="text-zinc-400">Ngừng HĐ</Badge>
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
  const handleDelete = (factory) => {
    if (window.confirm(`Xóa nhà máy "${factory.name}"?`)) deleteMutation.mutate(factory.id);
  };
  const handleBulkDelete = (ids) => {
    if (window.confirm(`Xóa ${ids.length} nhà máy đã chọn?`)) ids.forEach(id => deleteMutation.mutate(id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản lý Nhà máy</h2>
           <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Danh sách phân xưởng sản xuất</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpen()} className="h-11 px-6 gap-2 font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl">
            <Plus className="w-4 h-4" /> Thêm nhà máy
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <GenericTable
        data={factories}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onEdit={handleOpen}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
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
        <DialogContent className="sm:max-w-[500px] p-0 border-zinc-200">
          <form onSubmit={rhfHandleSubmit(onSubmit)} className="flex flex-col">
            <DialogHeader className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <DialogTitle className="text-xl font-black text-zinc-950 uppercase tracking-tight">
                {selectedFactory ? "Chỉnh sửa nhà máy" : "Thêm nhà máy mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-zinc-400">Tên nhà máy <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => (
                  <Input {...field} placeholder="Nhập tên nhà máy" className="h-11 font-bold border-zinc-200 focus-visible:ring-indigo-600" required />
                )} />
              </div>
              <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <Label htmlFor="factory-active" className="font-bold text-sm text-zinc-700 cursor-pointer flex-1 uppercase tracking-tighter">Trạng thái hoạt động</Label>
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
            <DialogFooter className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 gap-2">
              <Button type="button" variant="ghost" onClick={handleClose} className="font-bold text-zinc-500">Hủy bỏ</Button>
              <Button type="submit" className="font-bold px-8 shadow-md" disabled={createMutation.isPending || updateMutation.isPending}>
                Lưu nhà máy
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
