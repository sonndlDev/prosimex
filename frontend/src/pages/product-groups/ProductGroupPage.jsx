import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productGroupService } from "../../services/product-group.service";
import { operationService } from "../../services/operation.service";
import { machineService } from "../../services/machine.service";
import { toast } from "sonner";
import GenericTable from "../../components/GenericTable";
import { getAuditColumn } from "../../utils/audit";
import DraggableSequenceTable from "./DraggableSequenceTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Cpu, Search, Layers, ChevronsUpDown, Check, Plus, Zap, ClipboardList, ArrowRight, Package, CheckCircle2, Circle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "../../context/AuthContext";
import DeleteImpactDialog from "../../components/DeleteImpactDialog";
import { useDeleteWithImpact } from "../../hooks/useDeleteWithImpact";

export default function ProductGroupPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [manageOpsModal, setManageOpsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [quickCreateOpModal, setQuickCreateOpModal] = useState(false);
  const [quickOpName, setQuickOpName] = useState("");
  const [quickOpDesc, setQuickOpDesc] = useState("");
  const [stageConfigModal, setStageConfigModal] = useState(false);
  const [stageConfigGroup, setStageConfigGroup] = useState(null);
  const [stageConfigs, setStageConfigs] = useState([]);
  const [stageHasOps, setStageHasOps] = useState(true);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { control: groupControl, handleSubmit: handleGroupFormSubmit, reset: resetGroup } = useForm({ defaultValues: { name: "" } });
  const opInitial = { operation_id: "", machine_ids: [], sequence_order: "", dinh_muc: "" };
  const { control: opControl, handleSubmit: handleOpFormSubmit, reset: resetOp, setValue: setOpValue, watch: watchOp } = useForm({ defaultValues: opInitial });

  const { data: operationsListData } = useQuery({ queryKey: ["operations"], queryFn: () => operationService.getAll({ limit: 1000 }) });
  const operationsList = operationsListData?.data || [];
  const { data: machinesListData } = useQuery({ queryKey: ["machines"], queryFn: () => machineService.getAll({ limit: 1000 }) });
  const machinesList = machinesListData?.data || [];

  const { data: productGroupsData, isLoading, error } = useQuery({
    queryKey: ["productGroups", page, pageSize, search],
    queryFn: () => productGroupService.getAll({ page, limit: pageSize, search })
  });

  const productGroups = productGroupsData?.data || [];
  const totalItems = productGroupsData?.total || 0;

  const { data: groupOperations, isLoading: opsLoading } = useQuery({
    queryKey: ["groupOperations", selectedGroup?.id],
    queryFn: () => productGroupService.getOperations(selectedGroup.id),
    enabled: !!selectedGroup && manageOpsModal,
  });

  const nextSequenceOrder = groupOperations?.length > 0 ? Math.max(...groupOperations.map(o => o.sequence_order)) + 1 : 1;

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["productGroups"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: productGroupService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => productGroupService.update(id, payload), ...mutationOpts });
  const { openDelete, confirmDelete, closeDelete, deleteDialogProps } = useDeleteWithImpact({
    entityType: "product_group",
    entityLabel: "nhóm mã hàng",
    deleteFn: productGroupService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["productGroups"] }),
  });

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

  const quickCreateOpMutation = useMutation({
    mutationFn: operationService.create,
    onSuccess: (newOp) => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      // Auto-select the newly created operation in the form
      setOpValue("operation_id", String(newOp.id));
      setQuickCreateOpModal(false);
      setQuickOpName("");
      setQuickOpDesc("");
      toast.success(`Đã tạo công đoạn "${newOp.name}" thành công!`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi tạo công đoạn"),
  });

  const { data: stageConfigsData, isLoading: stageConfigsLoading } = useQuery({
    queryKey: ["stageConfigs", stageConfigGroup?.id],
    queryFn: () => productGroupService.getStageConfigs(stageConfigGroup.id),
    enabled: !!stageConfigGroup && stageConfigModal,
  });

  useEffect(() => {
    if (stageConfigsData?.data) {
      setStageConfigs(stageConfigsData.data.map(d => ({
        product_id: d.product_id,
        product_name: d.product_name,
        has_xi_ma: d.has_xi_ma,
        has_dong_goi: d.has_dong_goi,
      })));
      setStageHasOps(stageConfigsData.has_operations);
    }
  }, [stageConfigsData]);

  const saveStageConfigsMutation = useMutation({
    mutationFn: (configs) => productGroupService.saveStageConfigs(stageConfigGroup.id, configs),
    onSuccess: () => {
      toast.success("Đã lưu cấu hình giai đoạn thành công!");
      setStageConfigModal(false);
      setStageConfigGroup(null);
      queryClient.invalidateQueries({ queryKey: ["productGroups"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi lưu cấu hình"),
  });

  const handleQuickCreateOp = () => {
    const trimmedName = quickOpName.trim();
    if (!trimmedName) { toast.error("Vui lòng nhập tên công đoạn!"); return; }
    // Check duplicate in existing operations list
    const isDuplicate = operationsList?.some(
      (o) => o.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`Công đoạn "${trimmedName}" đã tồn tại!`);
      return;
    }
    quickCreateOpMutation.mutate({ name: trimmedName, description: quickOpDesc.trim() || undefined });
  };

  const columns = [
    { id: "name", label: "Tên nhóm" },
    {
      id: "stage_config", label: "Giai đoạn", align: "center",
      format: (v, row) => (
        <button
          onClick={() => { setStageConfigGroup(row); setStageConfigModal(true); }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
        >
          <ClipboardList className="w-3 h-3" /> Chỉnh sửa
        </button>
      ),
    },
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
    getAuditColumn(),
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
      dinh_muc: (data.dinh_muc !== "" && data.dinh_muc !== null && data.dinh_muc !== undefined) ? parseFloat(data.dinh_muc) : null,
      machine_ids: data.machine_ids.map(Number),
    });
  };

  const watchOpId = watchOp("operation_id");
  const watchMachineIds = watchOp("machine_ids");

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-zinc-950 uppercase tracking-tight">Nhóm sản phẩm</h1>
        {hasPermission("product_groups:create") && (
          <Button onClick={() => handleOpen()} className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-black uppercase text-xs tracking-widest gap-2">
            <Plus className="w-4 h-4" /> Thêm nhóm
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <GenericTable
          data={productGroups}
          columns={columns}
          isLoading={isLoading}
          error={error}
          onEdit={hasPermission("product_groups:update") ? handleOpen : undefined}
          onDelete={hasPermission("product_groups:delete") ? (g) => openDelete(g) : undefined}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
        />
      </div>

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
        <DialogContent className="sm:max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden border-zinc-200">
          <DialogHeader className="px-6 py-4 border-b border-zinc-100 bg-white shrink-0">
            <DialogTitle className="text-xl font-black tracking-tight">
              Quy trình sản xuất: <span className="text-indigo-600">{selectedGroup?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/30">
            <DraggableSequenceTable
              data={groupOperations} machinesList={machinesList} isLoading={opsLoading}
              onDelete={hasPermission("product_groups:delete") ? (id) => removeOpMutation.mutate(id) : undefined}
              onUpdate={(id, payload) => updateOpMutation.mutate({ mappingId: id, payload })}
              onReorder={(newOrders) => reorderOpMutation.mutate(newOrders)}
            />
          </div>

          <div className="shrink-0 border-t border-zinc-100 bg-white p-6 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-indigo-600 rounded-full"></div>
              <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Thêm bước mới vào quy trình</p>
            </div>

            <form onSubmit={handleOpFormSubmit(onAddOp)} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap lg:flex-nowrap gap-4 items-end">
                <div className="space-y-1.5 shrink-0">
                  <Label className="text-[10px] font-black uppercase text-zinc-400">Thứ tự</Label>
                  <Controller name="sequence_order" control={opControl} render={({ field }) => (
                    <Input {...field} className="w-20 h-10 font-bold bg-zinc-50 border-zinc-200" placeholder={String(nextSequenceOrder)} />
                  )} />
                </div>

                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-zinc-400">Công đoạn <span className="text-red-500">*</span></Label>
                    <button
                      type="button"
                      onClick={() => setQuickCreateOpModal(true)}
                      className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded-md transition-colors"
                    >
                      <Zap className="w-2.5 h-2.5" />
                      Tạo nhanh
                    </button>
                  </div>
                  <Controller name="operation_id" control={opControl} render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full h-10 justify-between bg-zinc-50 border-zinc-200 text-xs font-bold",
                            !field.value && "text-zinc-400 font-medium"
                          )}
                        >
                          <span className="truncate">
                            {field.value ? operationsList?.find(o => String(o.id) === String(field.value))?.name : "Chọn công đoạn..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                        <Command className="w-full">
                          <CommandInput placeholder="Tìm nhanh công đoạn..." />
                          <CommandList className="max-h-64 p-1">
                            <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không có dữ liệu</CommandEmpty>
                            <CommandGroup>
                              {operationsList?.map((o) => (
                                <CommandItem
                                  key={o.id}
                                  value={o.name}
                                  onSelect={() => field.onChange(String(o.id))}
                                  className="px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                                >
                                  <span className="text-xs font-bold">{o.name}</span>
                                  <Check className={cn("ml-auto h-4 w-4 text-indigo-600", String(field.value) === String(o.id) ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )} />
                </div>

                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <Label className="text-[10px] font-black uppercase text-zinc-400">Máy sản xuất (nhiều máy)</Label>
                  <Controller name="machine_ids" control={opControl} render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full min-h-10 h-auto py-2 justify-between bg-zinc-50 border-zinc-200 text-xs font-bold text-left">
                          <div className="flex flex-wrap gap-1 pr-2">
                            {field.value?.length > 0 ? (
                              field.value.map(id => {
                                const machine = machinesList?.find(m => String(m.id) === String(id));
                                return (
                                  <Badge key={id} variant="secondary" className="bg-white text-indigo-700 border-indigo-100 text-[9px] px-1.5 py-0 h-4 font-black">
                                    {machine?.name || id}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-zinc-400 font-medium italic">Tất cả máy / Chưa gán</span>
                            )}
                          </div>
                          <Cpu className="h-3 w-3 opacity-50 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                        <Command className="w-full">
                          <CommandInput placeholder="Tìm máy..." />
                          <CommandList className="max-h-64 overflow-y-auto p-1">
                            <CommandEmpty className="py-6 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không có máy</CommandEmpty>
                            <CommandGroup>
                              {machinesList?.map((m) => (
                                <CommandItem
                                  key={m.id}
                                  onSelect={() => {
                                    const current = field.value || [];
                                    const next = current.includes(String(m.id))
                                      ? current.filter(id => id !== String(m.id))
                                      : [...current, String(m.id)];
                                    field.onChange(next);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-1 last:mb-0 group"
                                >
                                  <Checkbox id={`new-m-${m.id}`} checked={field.value?.includes(String(m.id))} className="pointer-events-none" />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-zinc-700">{m.name}</span>
                                    <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-tighter">Máy sản xuất h.lượng</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )} />
                </div>

                <div className="space-y-1.5 shrink-0">
                  <Label className="text-[10px] font-black uppercase text-zinc-400">Định mức</Label>
                  <Controller name="dinh_muc" control={opControl} render={({ field }) => (
                    <Input {...field} type="number" step="1" className="w-24 h-10 font-bold bg-zinc-50 border-zinc-200" />
                  )} />
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setManageOpsModal(false)}
                    className="h-10 px-6 font-bold text-zinc-400 hover:text-zinc-600 uppercase text-[10px] tracking-widest"
                  >
                    Đóng
                  </Button>
                  <Button
                    type="submit"
                    disabled={addOpMutation.isPending}
                    className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 rounded-xl"
                  >
                    Thêm bước
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Create Operation Dialog */}
      <Dialog open={quickCreateOpModal} onOpenChange={(v) => { if (!v) { setQuickCreateOpModal(false); setQuickOpName(""); setQuickOpDesc(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50">
                <Zap className="w-4 h-4 text-indigo-600" />
              </span>
              Tạo nhanh công đoạn
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Tên công đoạn <span className="text-red-500">*</span></Label>
              <Input
                value={quickOpName}
                onChange={(e) => setQuickOpName(e.target.value)}
                placeholder="Nhập tên công đoạn..."
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickCreateOp(); } }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả <span className="text-zinc-400 text-xs font-normal">(tuỳ chọn)</span></Label>
              <textarea
                value={quickOpDesc}
                onChange={(e) => setQuickOpDesc(e.target.value)}
                rows={2}
                placeholder="Mô tả ngắn về công đoạn..."
                className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none"
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Hệ thống sẽ kiểm tra nếu công đoạn đã tồn tại và thông báo lỗi.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setQuickCreateOpModal(false); setQuickOpName(""); setQuickOpDesc(""); }}>Hủy</Button>
            <Button
              type="button"
              onClick={handleQuickCreateOp}
              disabled={quickCreateOpMutation.isPending || !quickOpName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              {quickCreateOpMutation.isPending ? "Đang tạo..." : "Tạo công đoạn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteImpactDialog {...deleteDialogProps} onClose={closeDelete} onConfirm={confirmDelete} />

      <Dialog open={stageConfigModal} onOpenChange={(v) => { if (!v) { setStageConfigModal(false); setStageConfigGroup(null); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
              </div>
              <span>Cấu hình giai đoạn</span>
              <span className="text-indigo-600 font-semibold">{stageConfigGroup?.name}</span>
            </DialogTitle>
            <p className="text-sm text-zinc-500 mt-1 ml-[46px]">
              Bật/tắt các công đoạn cho từng mã hàng trong nhóm
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {stageConfigsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-200 border-t-indigo-600"></div>
                <p className="text-sm text-zinc-400">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-zinc-50 to-zinc-100/80">
                      <th className="text-left px-5 py-3.5 font-semibold text-zinc-700 text-xs uppercase tracking-wider border-b border-zinc-200">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-zinc-400" />
                          Mã hàng
                        </div>
                      </th>
                      <th className="text-center px-4 py-3.5 font-semibold text-zinc-700 text-xs uppercase tracking-wider border-b border-zinc-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                          Xi mạ đi
                        </div>
                      </th>
                      <th className="text-center px-4 py-3.5 font-semibold text-zinc-700 text-xs uppercase tracking-wider border-b border-zinc-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500 rotate-180" />
                          Xi mạ về
                        </div>
                      </th>
                      <th className="text-center px-4 py-3.5 font-semibold text-zinc-700 text-xs uppercase tracking-wider border-b border-zinc-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-500" />
                          Đóng gói
                        </div>
                      </th>
                      <th className="text-center px-4 py-3.5 font-semibold text-zinc-700 text-xs uppercase tracking-wider border-b border-zinc-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {stageHasOps ? 'Công đoạn cuối' : 'Hàng đen'}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {stageConfigs.map((cfg, idx) => (
                      <tr key={cfg.product_id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {/* <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                              {cfg.product_name.charAt(0).toUpperCase()}
                            </div> */}
                            <span className="font-medium text-zinc-800">{cfg.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={cfg.has_xi_ma}
                              onCheckedChange={(checked) => {
                                const updated = [...stageConfigs];
                                updated[idx] = { ...updated[idx], has_xi_ma: !!checked };
                                setStageConfigs(updated);
                              }}
                              className="data-checked:border-blue-500 data-checked:bg-blue-500 size-5"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={cfg.has_xi_ma}
                              onCheckedChange={(checked) => {
                                const updated = [...stageConfigs];
                                updated[idx] = { ...updated[idx], has_xi_ma: !!checked };
                                setStageConfigs(updated);
                              }}
                              className="data-checked:border-blue-500 data-checked:bg-blue-500 size-5"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={cfg.has_dong_goi}
                              onCheckedChange={(checked) => {
                                const updated = [...stageConfigs];
                                updated[idx] = { ...updated[idx], has_dong_goi: !!checked };
                                setStageConfigs(updated);
                              }}
                              className="data-checked:border-amber-500 data-checked:bg-amber-500 size-5"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={cfg.has_dong_goi}
                              onCheckedChange={(checked) => {
                                const updated = [...stageConfigs];
                                updated[idx] = { ...updated[idx], has_dong_goi: !!checked };
                                setStageConfigs(updated);
                              }}
                              className="data-checked:border-emerald-500 data-checked:bg-emerald-500 size-5"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {stageConfigs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Circle className="w-8 h-8 text-zinc-300" />
                            <p className="text-sm text-zinc-400">Nhóm mã hàng này chưa có mã hàng nào</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {stageConfigs.length > 0 && (
            <DialogFooter className="shrink-0 px-6 py-4 bg-zinc-50/80 border-t border-zinc-200 gap-2">
              <Button type="button" variant="outline" onClick={() => { setStageConfigModal(false); setStageConfigGroup(null); }} className="border-zinc-300 hover:bg-zinc-100">
                Hủy
              </Button>
              <Button
                onClick={() => saveStageConfigsMutation.mutate(stageConfigs.map(c => ({
                  product_id: c.product_id,
                  has_xi_ma: c.has_xi_ma,
                  has_dong_goi: c.has_dong_goi,
                })))}
                disabled={saveStageConfigsMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
              >
                {saveStageConfigsMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    Đang lưu...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Lưu cấu hình
                  </span>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
