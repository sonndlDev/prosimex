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
  const deleteMutation = useMutation({ mutationFn: machineService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["machines"] }) });

  const columns = [
    { id: "sort_order", label: "Thứ tự sắp xếp", className: "w-16 text-center italic text-zinc-400" },
    { id: "code", label: "Mã máy" },
    { id: "name", label: "Tên máy", className: "font-bold text-indigo-600" },
    { id: "factory_name", label: "Nhà máy" },
    { id: "capacity_per_day", label: "C.Suất/Ngày" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-3 py-1 rounded-full">Hoạt động</Badge>
        : <Badge variant="secondary" className="text-zinc-400 px-3 py-1 rounded-full">Ngừng HĐ</Badge>
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
  const handleDelete = (m) => { if (window.confirm(`Xóa máy "${m.name}"?`)) deleteMutation.mutate(m.id); };
  const handleBulkDelete = (ids) => { if (window.confirm(`Xóa ${ids.length} máy đã chọn?`)) ids.forEach(id => deleteMutation.mutate(id)); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản lý Máy móc</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Danh sách máy móc thiết bị theo xưởng</p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-56 h-11 justify-between bg-zinc-50 border-zinc-200 hover:bg-white transition-all font-bold rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-zinc-400" />
                  <span className="truncate">{factories?.find(f => String(f.id) === filterFactoryId)?.name || "Tất cả nhà máy"}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-30 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[224px] p-0 shadow-2xl border-zinc-100 rounded-xl overflow-hidden" align="end">
              <Command>
                <CommandInput placeholder="Tìm nhà máy..." className="h-10" />
                <CommandList>
                  <CommandEmpty className="py-6 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không thấy</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => setFilterFactoryId("")}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer font-bold text-xs"
                    >
                      Tất cả nhà máy
                      <Check className={cn("h-4 w-4 text-indigo-600", filterFactoryId === "" ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                    {factories?.map(f => (
                      <CommandItem
                        key={f.id}
                        value={f.name}
                        onSelect={() => setFilterFactoryId(String(f.id))}
                        className="flex items-center justify-between px-3 py-2 cursor-pointer font-bold text-xs"
                      >
                        {f.name}
                        <Check className={cn("h-4 w-4 text-indigo-600", String(filterFactoryId) === String(f.id) ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {hasPermission("machines:create") && (
            <Button onClick={() => handleOpen()} className="h-11 px-6 gap-2 font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl">+ Thêm máy</Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
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
        <DialogContent className="max-w-md p-0 overflow-hidden border-zinc-200 rounded-2xl">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader className="px-6 py-4 bg-zinc-50 border-b border-zinc-100">
              <DialogTitle className="text-lg font-black text-zinc-950 uppercase tracking-tight">{selectedMachine ? "Chỉnh sửa máy" : "Thêm máy mới"}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-5 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 group">
                  <Label className="text-xs font-black uppercase text-zinc-400 tracking-widest group-hover:text-indigo-600 transition-colors">Nhà máy quản lý <span className="text-red-500">*</span></Label>
                  <Controller name="factory_id" control={control} render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold border-zinc-200 rounded-xl hover:border-indigo-300 hover:bg-white transition-all">
                          <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                            <Factory className="h-4 w-4 text-zinc-400" />
                            {factories?.find(f => String(f.id) === String(field.value))?.name || "Chọn..."}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-zinc-100 rounded-xl overflow-hidden" align="start">
                        <Command>
                          <CommandInput placeholder="Tìm nhanh..." className="h-10" />
                          <CommandList>
                            <CommandEmpty className="py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không thấy</CommandEmpty>
                            <CommandGroup>
                              {factories?.filter(f => f.is_active).map(f => (
                                <CommandItem
                                  key={f.id}
                                  value={f.name}
                                  onSelect={() => field.onChange(String(f.id))}
                                  className="flex items-center justify-between px-3 py-2 cursor-pointer font-bold text-xs"
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
                  <Label className="text-xs font-black uppercase text-zinc-400 tracking-widest">STT Sắp xếp</Label>
                  <Controller name="sort_order" control={control} render={({ field }) => <Input {...field} type="number" className="h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500" placeholder="0" />} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400 tracking-widest">Mã định danh <span className="text-red-500">*</span></Label>
                  <Controller name="code" control={control} render={({ field }) => <Input {...field} className="h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500" placeholder="VD: CNC-01" required />} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-zinc-400 tracking-widest">Công suất/Giờ</Label>
                  <Controller name="capacity_per_day" control={control} render={({ field }) => <Input {...field} type="number" step="0.1" className="h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500" />} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-zinc-400 tracking-widest">Tên thiết bị <span className="text-red-500">*</span></Label>
                <Controller name="name" control={control} render={({ field }) => <Input {...field} className="h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500" placeholder="VD: Máy Tiện CNC Fanuc" required />} />
              </div>
              <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <Controller name="is_active" control={control} render={({ field }) => (
                  <input type="checkbox" className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer" id="is_active" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                )} />
                <Label htmlFor="is_active" className="text-xs font-black text-zinc-700 uppercase cursor-pointer">Sẵn sàng vận hành (Active)</Label>
              </div>
            </div>
            <DialogFooter className="p-6 bg-zinc-50 border-t border-zinc-100">
              <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl font-bold">Hủy bỏ</Button>
              <Button type="submit" className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 px-8Shadow-lg shadow-indigo-100" disabled={createMutation.isPending || updateMutation.isPending}>
                {selectedMachine ? "Cập nhật" : "Lưu máy mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
