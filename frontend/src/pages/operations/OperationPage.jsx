import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { operationService } from "../../services/operation.service";
import { toast } from "sonner";
import GenericTable from "../../components/GenericTable";
import { getAuditColumn } from "../../utils/audit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DeleteImpactDialog from "../../components/DeleteImpactDialog";
import { useDeleteWithImpact } from "../../hooks/useDeleteWithImpact";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productGroupService } from "../../services/product-group.service";

export default function OperationPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedProductGroup, setSelectedProductGroup] = useState("all");

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
  } = useForm({
    defaultValues: { name: "", description: "" },
  });

  const {
    data: operationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["operations", page, pageSize, search, selectedProductGroup],
    queryFn: () =>
      operationService.getAll({
        page,
        limit: pageSize,
        search,
        product_group_id:
          selectedProductGroup !== "all" ? selectedProductGroup : undefined,
      }),
  });

  const { data: productGroupsData } = useQuery({
    queryKey: ["product-groups-all"],
    queryFn: () => productGroupService.getAll({ limit: 1000 }),
  });
  const productGroups = productGroupsData?.data || [];

  const operations = operationsData?.data || [];
  const totalItems = operationsData?.total || 0;

  const mutationOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      handleClose();
    },
  };
  const createMutation = useMutation({
    mutationFn: operationService.create,
    ...mutationOpts,
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi tạo công đoạn"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => operationService.update(id, payload),
    ...mutationOpts,
    onError: (err) =>
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật công đoạn"),
  });
  const { openDelete, confirmDelete, closeDelete, deleteDialogProps } = useDeleteWithImpact({
    entityType: "operation",
    entityLabel: "công đoạn",
    deleteFn: operationService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations"] }),
  });

  const columns = [
    { id: "name", label: "Tên công đoạn" },
    {
      id: "product_groups",
      label: "Nhóm mã hàng",
      format: (value) => (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(value) && value.length > 0 ? (
            value.map((pg, i) => (
              <Badge key={i} variant="outline" className="text-xs font-medium">
                {pg}
              </Badge>
            ))
          ) : (
            <span className="text-zinc-300">-</span>
          )}
        </div>
      ),
    },
    { id: "description", label: "Mô tả" },
    getAuditColumn(),
  ];

  const handleOpen = (operation = null) => {
    setSelectedOperation(operation);
    reset(
      operation
        ? { name: operation.name, description: operation.description || "" }
        : { name: "", description: "" },
    );
    setOpenModal(true);
  };
  const handleClose = () => {
    setOpenModal(false);
    setSelectedOperation(null);
  };
  const onSubmit = (data) => {
    if (selectedOperation)
      updateMutation.mutate({ id: selectedOperation.id, payload: data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">
            Quản lý Công đoạn
          </h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Danh sách công đoạn tiêu chuẩn
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedProductGroup}
            onValueChange={(v) => {
              setSelectedProductGroup(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48 h-11 bg-zinc-50 border-zinc-200 focus:ring-0 focus:ring-offset-0 rounded-xl text-sm font-medium">
              <SelectValue placeholder="Tất cả nhóm mã hàng" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all" className="font-semibold text-indigo-600">
                Tất cả nhóm mã hàng
              </SelectItem>
              {productGroups.map((pg) => (
                <SelectItem key={pg.id} value={pg.id.toString()}>
                  {pg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasPermission("operations:create") && (
            <Button
              onClick={() => handleOpen()}
              className="h-11 px-6 gap-2 font-black uppercase text-xs tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Thêm công đoạn
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <GenericTable
          data={operations}
          columns={columns}
          isLoading={isLoading}
          error={error}
          onEdit={hasPermission("operations:update") ? handleOpen : undefined}
          onDelete={hasPermission("operations:delete") ? (op) => openDelete(op) : undefined}
          onBulkDelete={hasPermission("operations:delete") ? (ids) => openDelete(ids) : undefined}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
        />
      </div>

      <Dialog
        open={openModal}
        onOpenChange={(v) => {
          if (!v) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedOperation
                  ? "Chỉnh sửa công đoạn"
                  : "Thêm công đoạn mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>
                  Tên công đoạn <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => <Input {...field} required />}
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={3}
                      placeholder="Mô tả ngắn về công đoạn..."
                      className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none"
                    />
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteImpactDialog {...deleteDialogProps} onClose={closeDelete} onConfirm={confirmDelete} />
    </div>
  );
}
