import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../../services/customer.service";
import GenericTable from "../../components/GenericTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { control, handleSubmit: rhfHandleSubmit, reset } = useForm({
    defaultValues: { code: "", name: "", contact_info: "" },
  });

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: customerService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => customerService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: customerService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }) });

  const columns = [
    { id: "code", label: "Mã công ty" },
    { id: "name", label: "Tên khách hàng" },
    { id: "contact_info", label: "Thông tin liên hệ" },
  ];

  const handleOpen = (customer = null) => {
    setSelectedCustomer(customer);
    reset(customer ? { code: customer.code, name: customer.name, contact_info: customer.contact_info || "" } : { code: "", name: "", contact_info: "" });
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedCustomer(null); };
  const onSubmit = (data) => {
    if (selectedCustomer) updateMutation.mutate({ id: selectedCustomer.id, payload: data });
    else createMutation.mutate(data);
  };

  return (
    <div>
      <GenericTable
        title="Quản lý Khách hàng"
        data={customers} columns={columns} isLoading={isLoading} error={error}
        onAdd={() => handleOpen()}
        onEdit={handleOpen}
        onDelete={(c) => { if (window.confirm(`Xóa khách hàng "${c.name}"?`)) deleteMutation.mutate(c.id); }}
        onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} khách hàng?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
      />

      <Dialog open={openModal} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{selectedCustomer ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Mã khách hàng <span className="text-red-500">*</span></Label>
                <Controller name="code" control={control} render={({ field }) => <Input {...field} required />} />
              </div>
              <div className="space-y-2">
                <Label>Tên công ty <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => <Input {...field} required />} />
              </div>
              <div className="space-y-2">
                <Label>Thông tin liên hệ</Label>
                <Controller name="contact_info" control={control} render={({ field }) => (
                  <textarea {...field} rows={3} placeholder="SĐT, email, địa chỉ..."
                    className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none" />
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
