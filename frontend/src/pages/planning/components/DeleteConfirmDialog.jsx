import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

const DeleteConfirmDialog = React.memo(
  ({ open, isPending, onClose, onConfirm }) => (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px] border-[rgb(var(--c-line-2))]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-50 rounded-full text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-black text-[rgb(var(--c-ink))]">Xác nhận xóa</DialogTitle>
          </div>
          <DialogDescription className="text-[rgb(var(--c-ink-3))] font-medium pt-2">
            Bạn có chắc chắn muốn xóa kế hoạch sản xuất này không? Hành động này
            không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="font-bold text-[rgb(var(--c-ink-3))] hover:text-[rgb(var(--c-ink))]">
            Hủy bỏ
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="font-black px-6 shadow-md shadow-red-100"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Đồng ý xóa"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
);
DeleteConfirmDialog.displayName = "DeleteConfirmDialog";

export default DeleteConfirmDialog;
