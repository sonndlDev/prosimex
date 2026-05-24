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

const DeleteImpactDialog = ({
  open,
  onClose,
  onConfirm,
  isPending = false,
  isLoadingImpact = false,
  title,
  entityLabel = "mục",
  impact,
}) => {
  const hasUsage = impact?.hasImpact;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="sm:max-w-[480px] border-zinc-200">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-50 rounded-full text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-black text-zinc-950">Xác nhận xóa</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="text-zinc-600 font-medium pt-2 space-y-3">
              <p>
                Bạn có chắc muốn xóa {entityLabel}{" "}
                <span className="font-black text-zinc-900">&quot;{title}&quot;</span>?
              </p>

              {isLoadingImpact ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang kiểm tra dữ liệu liên quan...
                </div>
              ) : impact ? (
                <div
                  className={`rounded-xl border p-4 text-sm ${
                    hasUsage
                      ? "bg-amber-50 border-amber-200 text-amber-950"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600"
                  }`}
                >
                  {hasUsage ? (
                    <>
                      <p className="font-black text-amber-900 mb-2">
                        Cảnh báo: Dữ liệu này đang được sử dụng
                      </p>
                      <p className="mb-2">
                        Khi xóa, hệ thống sẽ <strong>gỡ hoặc xóa liên quan</strong> tại:
                      </p>
                      <ul className="list-disc list-inside space-y-1 font-semibold">
                        {impact.items
                          .filter((i) => i.count > 0)
                          .map((i) => (
                            <li key={i.key}>
                              {i.count} {i.label}
                            </li>
                          ))}
                      </ul>
                    </>
                  ) : (
                    <p>Không có dữ liệu liên quan. Bạn có thể xóa an toàn.</p>
                  )}
                </div>
              ) : null}

              <p className="text-xs text-zinc-400">Hành động này không thể hoàn tác.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 flex gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending || isLoadingImpact} className="font-bold">
            Hủy bỏ
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending || isLoadingImpact}
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
  );
};

export default DeleteImpactDialog;
