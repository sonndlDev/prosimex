import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productGroupService } from "../../services/product-group.service";
import { operationService } from "../../services/operation.service";
import { machineService } from "../../services/machine.service";
import { toast } from "sonner";
import GenericTable from "../../components/GenericTable";
import DraggableSequenceTable from "./DraggableSequenceTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";

export default function ProductGroupPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [manageOpsModal, setManageOpsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { control: groupControl, handleSubmit: handleGroupFormSubmit, reset: resetGroup } = useForm({ defaultValues: { name: "" } });
  const opInitial = { operation_id: "", machine_id: "", sequence_order: "", dinh_muc: "" };
  const { control: opControl, handleSubmit: handleOpFormSubmit, reset: resetOp, setValue: setOpValue, watch: watchOp } = useForm({ defaultValues: opInitial });

  const { data: operationsList } = useQuery({ queryKey: ["operations"], queryFn: operationService.getAll });
  const { data: machinesList } = useQuery({ queryKey: ["machines"], queryFn: () => machineService.getAll() });
  const { data: productGroups, isLoading, error } = useQuery({ queryKey: ["productGroups"], queryFn: () => productGroupService.getAll() });
  const { data: groupOperations, isLoading: opsLoading } = useQuery({
    queryKey: ["groupOperations", selectedGroup?.id],
    queryFn: () => productGroupService.getOperations(selectedGroup.id),
    enabled: !!selectedGroup && manageOpsModal,
  });

  const nextSequenceOrder = groupOperations?.length > 0 ? Math.max(...groupOperations.map(o => o.sequence_order)) + 1 : 1;

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["productGroups"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: productGroupService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => productGroupService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: productGroupService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["productGroups"] }) });

  const addOpMutation = useMutation({
    mutationFn: (payload) => productGroupService.addOperation(selectedGroup.id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["groupOperations", selectedGroup?.id] }); resetOp(opInitial); },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi thêm công đoạn"),
  });
  const removeOpMutation = useMutation({
    mutationFn: (mappingId) => productGroupService.removeOperation(selectedGroup.id, mappingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groupOperations", selectedGroup?.id] }),
  });
  const updateOpMutation = useMutation({
    mutationFn: ({ mappingId, payload }) => productGroupService.updateOperation(selectedGroup.id, mappingId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groupOperations", selectedGroup?.id] }),
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi cập nhật công đoạn"),
  });
  const reorderOpMutation = useMutation({
    mutationFn: (orders) => productGroupService.reorderOperations(selectedGroup.id, orders),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groupOperations", selectedGroup?.id] }),
  });

  const columns = [
    { id: "name", label: "Tên nhóm" },
    {
      id: "actions", label: "Quy trình", align: "center",
      format: (v, row) => (
        <button
          onClick={() => { setSelectedGroup(row); setManageOpsModal(true); }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
        >
          <Settings className="w-3 h-3" /> Quy trình
        </button>
      ),
    },
  ];

  const handleOpen = (group = null) => {
    setSelectedGroup(group);
    resetGroup({ name: group?.name || "" });
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedGroup(null); };
  const onGroupSubmit = (data) => {
    if (selectedGroup) updateMutation.mutate({ id: selectedGroup.id, payload: data });
    else createMutation.mutate(data);
  };
  const onAddOp = (data) => {
    const selectedOp = operationsList?.find(o => String(o.id) === String(data.operation_id));
    const isDuplicate = groupOperations?.some(op => String(op.operation_name).trim().toLowerCase() === String(selectedOp?.name).trim().toLowerCase());
    if (isDuplicate) { toast.error(`Công đoạn "${selectedOp?.name}" đã tồn tại!`); return; }
    addOpMutation.mutate({
      ...data,
      sequence_order: parseInt(data.sequence_order) || nextSequenceOrder,
      dinh_muc: data.dinh_muc ? parseFloat(data.dinh_muc) : null,
      machine_id: data.machine_id || null,
    });
  };

  const watchOpId = watchOp("operation_id");
  const watchMachineId = watchOp("machine_id");

  return (
    <div>
      <GenericTable
        title="Nhóm mã hàng & Quy trình"
        data={productGroups} columns={columns} isLoading={isLoading} error={error}
        onAdd={() => handleOpen()}
        onEdit={handleOpen}
        onDelete={(g) => { if (window.confirm(`Xóa nhóm "${g.name}"?`)) deleteMutation.mutate(g.id); }}
        onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} nhóm?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
        actionColWidth={150}
      />

      {/* Base Form Dialog */}
      <Dialog open={openModal} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleGroupFormSubmit(onGroupSubmit)}>
            <DialogHeader>
              <DialogTitle>{selectedGroup ? "Chỉnh sửa nhóm" : "Thêm nhóm mới"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="space-y-2">
                <Label>Tên nhóm <span className="text-red-500">*</span></Label>
                <Controller name="name" control={groupControl} render={({ field }) => <Input {...field} required />} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
              <Button type="submit">Lưu</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Operations Routing Dialog */}
      <Dialog open={manageOpsModal} onOpenChange={(v) => { if (!v) setManageOpsModal(false); }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Quy trình sản xuất: <span className="text-blue-600">{selectedGroup?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <DraggableSequenceTable
              data={groupOperations} machinesList={machinesList} isLoading={opsLoading}
              onDelete={(id) => removeOpMutation.mutate(id)}
              onUpdate={(id, payload) => updateOpMutation.mutate({ mappingId: id, payload })}
              onReorder={(newOrders) => reorderOpMutation.mutate(newOrders)}
            />

            <Separator />
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Thêm bước mới</p>
            <form onSubmit={handleOpFormSubmit(onAddOp)} className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Thứ tự</Label>
                  <Controller name="sequence_order" control={opControl} render={({ field }) => (
                    <Input {...field} className="w-20" placeholder={String(nextSequenceOrder)} />
                  )} />
                </div>
                <div className="space-y-1.5 flex-1 min-w-40">
                  <Label className="text-xs">Công đoạn <span className="text-red-500">*</span></Label>
                  <Controller name="operation_id" control={opControl} render={({ field }) => (
                    <Select value={String(field.value || "")} onValueChange={field.onChange} required>
                      <SelectTrigger><SelectValue placeholder="Chọn công đoạn" /></SelectTrigger>
                      <SelectContent>
                        {operationsList?.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5 flex-1 min-w-40">
                  <Label className="text-xs">Máy (tùy chọn)</Label>
                  <Controller name="machine_id" control={opControl} render={({ field }) => (
                    <Select value={String(field.value || "")} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Tất cả máy" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tất cả máy</SelectItem>
                        {machinesList?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Định mức</Label>
                  <Controller name="dinh_muc" control={opControl} render={({ field }) => (
                    <Input {...field} type="number" step="0.1" className="w-28" />
                  )} />
                </div>
                <Button type="submit" disabled={addOpMutation.isPending} className="mb-0">Thêm bước</Button>
              </div>
            </form>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpsModal(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
