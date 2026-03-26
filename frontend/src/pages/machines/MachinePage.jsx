import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { machineService } from "../../services/machine.service";
import { factoryService } from "../../services/factory.service";
import GenericTable from "../../components/GenericTable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MachinePage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [filterFactoryId, setFilterFactoryId] = useState("");

  const initialForm = { code: "", name: "", factory_id: "", capacity_per_day: "", is_active: true };
  const { control, handleSubmit: rhfHandleSubmit, reset, setValue, watch } = useForm({ defaultValues: initialForm });

  const { data: factories } = useQuery({ queryKey: ["factories"], queryFn: factoryService.getAll });
  const { data: machines, isLoading, error } = useQuery({
    queryKey: ["machines", filterFactoryId],
    queryFn: () => machineService.getAll(filterFactoryId),
  });

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["machines"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: machineService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => machineService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: machineService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["machines"] }) });

  const columns = [
    { id: "code", label: "Mã máy" },
    { id: "name", label: "Tên máy" },
    { id: "factory_name", label: "Nhà máy" },
    { id: "capacity_per_day", label: "Công suất/Ngày" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">Hoạt động</Badge>
        : <Badge variant="secondary" className="text-zinc-400">Ngừng HĐ</Badge>
    },
  ];

  const handleOpen = (machine = null) => {
    setSelectedMachine(machine);
    reset(machine ? { code: machine.code, name: machine.name, factory_id: String(machine.factory_id), capacity_per_day: machine.capacity_per_day, is_active: machine.is_active } : initialForm);
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedMachine(null); };
  const onSubmit = (data) => {
    const payload = { ...data, capacity_per_day: parseFloat(data.capacity_per_day) };
    if (selectedMachine) updateMutation.mutate({ id: selectedMachine.id, payload });
    else createMutation.mutate(payload);
  };
  const handleDelete = (m) => { if (window.confirm(`Xóa máy "${m.name}"?`)) deleteMutation.mutate(m.id); };
  const handleBulkDelete = (ids) => { if (window.confirm(`Xóa ${ids.length} máy đã chọn?`)) ids.forEach(id => deleteMutation.mutate(id)); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Quản lý Máy móc</h2>
        <div className="flex items-center gap-2">
          <Select value={filterFactoryId} onValueChange={setFilterFactoryId}>
            <SelectTrigger className="w-48 bg-zinc-50">
              <SelectValue placeholder="Tất cả nhà máy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tất cả nhà máy</SelectItem>
              {factories?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpen()} className="gap-2 font-semibold">+ Thêm máy</Button>
        </div>
      </div>

      <GenericTable data={machines} columns={columns} isLoading={isLoading} error={error}
        onEdit={handleOpen} onDelete={handleDelete} onBulkDelete={handleBulkDelete} />

      <Dialog open={openModal} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{selectedMachine ? "Chỉnh sửa máy" : "Thêm máy mới"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Nhà máy <span className="text-red-500">*</span></Label>
                <Controller name="factory_id" control={control} render={({ field }) => (
                  <Select value={String(field.value || "")} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Chọn nhà máy" /></SelectTrigger>
                    <SelectContent>
                      {factories?.filter(f => f.is_active).map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2">
                <Label>Mã máy <span className="text-red-500">*</span></Label>
                <Controller name="code" control={control} render={({ field }) => <Input {...field} placeholder="VD: M001" required />} />
              </div>
              <div className="space-y-2">
                <Label>Tên máy <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => <Input {...field} required />} />
              </div>
              <div className="space-y-2">
                <Label>Công suất mỗi ngày (Giờ/Sản phẩm)</Label>
                <Controller name="capacity_per_day" control={control} render={({ field }) => <Input {...field} type="number" step="0.1" />} />
              </div>
              <div className="flex items-center gap-3">
                <Label>Đang hoạt động</Label>
                <Controller name="is_active" control={control} render={({ field }) => (
                  <input type="checkbox" className="w-4 h-4 rounded accent-zinc-950" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
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
