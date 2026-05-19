import React, { useState } from "react";import { toast } from "sonner";

import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../../services/customer.service";
import GenericTable from "../../components/GenericTable";
import { getAuditColumn } from "../../utils/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export default function CustomerPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { control, handleSubmit: rhfHandleSubmit, reset } = useForm({
    defaultValues: { code: "", name: "", contact_info: "" },
  });

  const { data: customersData, isLoading, error } = useQuery({
    queryKey: ["customers", page, pageSize, search],
    queryFn: () => customerService.getAll({ page, limit: pageSize, search }),
  });

  const customers = customersData?.data || [];
  const totalItems = customersData?.total || 0;

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); handleClose(); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Có lỗi xảy ra") };
  const createMutation = useMutation({ mutationFn: customerService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => customerService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: customerService.delete, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi xóa") });

  const columns = [
    { id: "code", label: "Mã công ty" },
    { id: "name", label: "Tên khách hàng" },
    { id: "contact_info", label: "Thông tin liên hệ" },
    getAuditColumn(),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản lý Khách hàng</h2>
           <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Danh sách đối tác và khách hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpen()} className="h-11 px-6 gap-2 font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl">
            <Plus className="w-4 h-4" /> Thêm khách hàng
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <GenericTable
        data={customers} columns={columns} isLoading={isLoading} error={error}
        onEdit={handleOpen}
        onDelete={(c) => { if (window.confirm(`Xóa khách hàng "${c.name}"?`)) deleteMutation.mutate(c.id); }}
        onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} khách hàng?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
        isServerSide={true}
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={setSearch}
      />
      </div>

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
