import { useState, useCallback } from "react";
import { toast } from "sonner";
import { deleteImpactService } from "../services/delete-impact.service";

export function useDeleteWithImpact({ entityType, entityLabel, deleteFn, onSuccess }) {
  const [dialog, setDialog] = useState({
    open: false,
    loading: false,
    pending: false,
    impact: null,
    ids: [],
    title: "",
  });

  const closeDelete = useCallback(() => {
    if (dialog.pending) return;
    setDialog((d) => ({ ...d, open: false, impact: null, ids: [], title: "" }));
  }, [dialog.pending]);

  const openDelete = useCallback(
    async (rowOrIds) => {
      const isBulk = Array.isArray(rowOrIds);
      const ids = isBulk ? rowOrIds : [rowOrIds.id];
      const title = isBulk ? `${ids.length} mục đã chọn` : rowOrIds.name || rowOrIds.code || String(rowOrIds.id);

      setDialog({
        open: true,
        loading: true,
        pending: false,
        impact: null,
        ids,
        title,
      });

      try {
        const impact =
          isBulk && ids.length > 1
            ? await deleteImpactService.getBulk(entityType, ids)
            : await deleteImpactService.get(entityType, ids[0]);
        setDialog((d) => ({ ...d, loading: false, impact }));
      } catch (err) {
        toast.error(err.response?.data?.message || "Không thể kiểm tra dữ liệu liên quan");
        setDialog((d) => ({ ...d, open: false, loading: false }));
      }
    },
    [entityType],
  );

  const confirmDelete = useCallback(async () => {
    setDialog((d) => ({ ...d, pending: true }));
    try {
      for (const id of dialog.ids) {
        await deleteFn(id);
      }
      toast.success("Xóa thành công");
      setDialog({ open: false, loading: false, pending: false, impact: null, ids: [], title: "" });
      await onSuccess?.();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi xóa");
      setDialog((d) => ({ ...d, pending: false }));
      return false;
    }
  }, [deleteFn, dialog.ids]);

  return {
    openDelete,
    confirmDelete,
    closeDelete,
    deleteDialogProps: {
      open: dialog.open,
      onClose: closeDelete,
      onConfirm: confirmDelete,
      isPending: dialog.pending,
      isLoadingImpact: dialog.loading,
      title: dialog.title,
      entityLabel,
      impact: dialog.impact,
    },
  };
}
