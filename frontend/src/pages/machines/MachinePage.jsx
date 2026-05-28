import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { machineService } from "../../services/machine.service";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Factory, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import DeleteImpactDialog from "../../components/DeleteImpactDialog";
import { useDeleteWithImpact } from "../../hooks/useDeleteWithImpact";

export default function MachinePage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [filterFactoryId, setFilterFactoryId] = useState("");

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const initialForm = { code: "", name: "", factory_id: "", capacity_per_day: "", is_active: true, sort_order: 0 };
  const { control, handleSubmit: rhfHandleSubmit, reset, setValue, watch } = useForm({ defaultValues: initialForm });

  const { data: factoriesData } = useQuery({ queryKey: ["factories"], queryFn: () => factoryService.getAll({ limit: 1000 }) });
  const factories = factoriesData?.data || [];
  const { data: machinesData, isLoading, error } = useQuery({
    queryKey: ["machines", filterFactoryId, page, pageSize, search],
    queryFn: () => machineService.getAll({ factory_id: filterFactoryId, page, limit: pageSize, search }),
  });

  const machines = machinesData?.data || [];
  const totalItems = machinesData?.total || 0;

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["machines"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: machineService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => machineService.update(id, payload), ...mutationOpts });
  const { openDelete, confirmDelete, closeDelete, deleteDialogProps } = useDeleteWithImpact({
    entityType: "machine",
    entityLabel: "máy",
    deleteFn: machineService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["machines"] }),
  });

  const columns = [
    { id: "sort_order", label: "Thứ tự sắp xếp", className: "w-16 text-center italic text-[rgb(var(--c-ink-4))]" },
    { id: "code", label: "Mã máy" },
    { id: "name", label: "Tên máy", className: "font-bold text-indigo-600" },
    { id: "factory_name", label: "Nhà máy" },
    { id: "capacity_per_day", label: "C.Suất/Ngày" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <span className="status status-run">Hoạt động</span>
        : <span className="status status-idle">Ngừng HĐ</span>
    },
    getAuditColumn(),
  ];

  const handleOpen = (machine = null) => {
    setSelectedMachine(machine);
    reset(machine ? {
      code: machine.code,
      name: machine.name,
      factory_id: String(machine.factory_id),
      capacity_per_day: machine.capacity_per_day,
      is_active: machine.is_active,
      sort_order: machine.sort_order || 0
    } : initialForm);
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedMachine(null); };
  const onSubmit = (data) => {
    console.log("Submitting machine data:", data);
    const payload = {
      ...data,
      capacity_per_day: (data.capacity_per_day === "" || data.capacity_per_day === null) ? 0 : Number(data.capacity_per_day),
      sort_order: (data.sort_order === "" || data.sort_order === null) ? 0 : Number(data.sort_order),
      factory_id: data.factory_id ? Number(data.factory_id) : null
    };
    console.log("Payload to backend:", payload);
    if (selectedMachine) {
      toast.promise(updateMutation.mutateAsync({ id: selectedMachine.id, payload }), {
        loading: 'Đang cập nhật...',
        success: 'Cập nhật thành công!',
        error: (err) => err.response?.data?.message || 'Lỗi khi cập nhật'
      });
    } else {
      toast.promise(createMutation.mutateAsync(payload), {
        loading: 'Đang lưu...',
        success: 'Thêm mới thành công!',
        error: (err) => err.response?.data?.message || 'Lỗi khi tạo mới'
      });
    }
  };
  const handleDelete = (m) => openDelete(m);
  const handleBulkDelete = (ids) => openDelete(ids);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'rgb(var(--c-ink))', letterSpacing: '-0.01em' }}>Quản lý Máy móc</h1>
          <p style={{ fontSize: 11, color: 'rgb(var(--c-ink-4))', marginTop: 2 }}>Danh sách máy móc thiết bị theo xưởng</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between">
                <div className="flex items-center gap-2">
                  <Factory className="h-3.5 w-3.5" />
                  <span className="truncate">{factories?.find(f => String(f.id) === filterFactoryId)?.name || "Tất cả nhà máy"}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-40 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <Command>
                <CommandInput placeholder="Tìm nhà máy..." />
                <CommandList>
                  <CommandEmpty>Không thấy</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="all" onSelect={() => setFilterFactoryId("")}>
                      Tất cả nhà máy
                      <Check className={cn("ml-auto h-3.5 w-3.5", filterFactoryId === "" ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                    {factories?.map(f => (
                      <CommandItem key={f.id} value={f.name} onSelect={() => setFilterFactoryId(String(f.id))}>
                        {f.name}
                        <Check className={cn("ml-auto h-3.5 w-3.5", String(filterFactoryId) === String(f.id) ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {hasPermission("machines:create") && (
            <Button onClick={() => handleOpen()}>+ Thêm máy</Button>
          )}
        </div>
      </div>

      <div className="table-container">
        <GenericTable
          data={machines}
          columns={columns}
          isLoading={isLoading}
          error={error}
          onEdit={hasPermission("machines:update") ? handleOpen : undefined}
          onDelete={hasPermission("machines:delete") ? handleDelete : undefined}
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
        <DialogContent className="sm:max-w-md">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader >
              <DialogTitle style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--c-ink))" }}>{selectedMachine ? "Chỉnh sửa máy" : "Thêm máy mới"}</DialogTitle>
            </DialogHeader>
            <div >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 group">
                  <Label >Nhà máy quản lý <span className="text-red-500">*</span></Label>
                  <Controller name="factory_id" control={control} render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold border-[rgb(var(--c-line-2))] rounded-xl hover:border-indigo-300 hover:bg-white transition-all">
                          <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                            <Factory className="h-4 w-4 text-[rgb(var(--c-ink-4))]" />
                            {factories?.find(f => String(f.id) === String(field.value))?.name || "Chọn..."}
                          </div>
                          <ChevronsUpDown  />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-[rgb(var(--c-line))] rounded-xl overflow-hidden" align="start">
                        <Command>
                          <CommandInput placeholder="Tìm nhanh..." className="h-10" />
                          <CommandList>
                            <CommandEmpty className="py-4 text-center text-[10px] font-black text-[rgb(var(--c-ink-4))] uppercase tracking-widest">Không thấy</CommandEmpty>
                            <CommandGroup>
                              {factories?.filter(f => f.is_active).map(f => (
                                <CommandItem
                                  key={f.id}
                                  value={f.name}
                                  onSelect={() => field.onChange(String(f.id))}
                                  
                                >
                                  {f.name}
                                  <Check className={cn("h-4 w-4 text-indigo-600", String(field.value) === String(f.id) ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )} />
                </div>
                <div className="space-y-2">
                  <Label >STT Sắp xếp</Label>
                  <Controller name="sort_order" control={control} render={({ field }) => <Input {...field} type="number" className="h-11 rounded-xl border-[rgb(var(--c-line-2))] font-bold focus-visible:ring-indigo-500" placeholder="0" />} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label >Mã định danh <span className="text-red-500">*</span></Label>
                  <Controller name="code" control={control} render={({ field }) => <Input {...field} className="h-11 rounded-xl border-[rgb(var(--c-line-2))] font-bold focus-visible:ring-indigo-500" placeholder="VD: CNC-01" required />} />
                </div>
                <div className="space-y-2">
                  <Label >Công suất/Giờ</Label>
                  <Controller name="capacity_per_day" control={control} render={({ field }) => <Input {...field} type="number" step="0.1" className="h-11 rounded-xl border-[rgb(var(--c-line-2))] font-bold focus-visible:ring-indigo-500" />} />
                </div>
              </div>
              <div className="space-y-2">
                <Label >Tên thiết bị <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => <Input {...field} className="h-11 rounded-xl border-[rgb(var(--c-line-2))] font-bold focus-visible:ring-indigo-500" placeholder="VD: Máy Tiện CNC Fanuc" required />} />
              </div>
              <div className="flex items-center gap-3">
                <Controller name="is_active" control={control} render={({ field }) => (
                  <input type="checkbox" className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer" id="is_active" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                )} />
                <Label htmlFor="is_active" >Sẵn sàng vận hành (Active)</Label>
              </div>
            </div>
            <DialogFooter >
              <Button type="button" variant="outline" onClick={handleClose}>Hủy bỏ</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedMachine ? "Cập nhật" : "Lưu máy mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteImpactDialog {...deleteDialogProps} onClose={closeDelete} onConfirm={confirmDelete} />
    </div>
  );
}
