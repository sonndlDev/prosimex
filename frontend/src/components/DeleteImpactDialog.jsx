import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

export default function DeleteImpactDialog({ open, onClose, onConfirm, isPending = false, isLoadingImpact = false, title, entityLabel = "mục", impact }) {
  const hasUsage = impact?.hasImpact;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgb(var(--red-light))] border border-[rgb(var(--red-border))] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-[rgb(var(--red))]" />
            </div>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription asChild>
          <div className="space-y-3 text-[13px] text-[rgb(var(--text-3))]">
            <p>Bạn có chắc muốn xóa {entityLabel} <strong className="text-[rgb(var(--text))]">"{title}"</strong>?</p>

            {isLoadingImpact ? (
              <div className="flex items-center gap-2 text-[rgb(var(--text-4))]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang kiểm tra dữ liệu liên quan...
              </div>
            ) : impact ? (
              <div className={`rounded-lg border p-3 text-[12px] ${hasUsage ? 'bg-[rgb(var(--amber-light))] border-[rgb(var(--amber-border))] text-[rgb(var(--amber))]' : 'bg-[rgb(var(--surface-2))] border-[rgb(var(--border))] text-[rgb(var(--text-3))]'}`}>
                {hasUsage ? (
                  <>
                    <p className="font-semibold mb-2">⚠ Dữ liệu này đang được sử dụng</p>
                    <p className="text-[rgb(var(--text-2))] mb-1.5">Khi xóa, hệ thống sẽ gỡ hoặc xóa liên quan tại:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[rgb(var(--text-2))]">
                      {impact.items.filter(i => i.count > 0).map(i => <li key={i.key}>{i.count} {i.label}</li>)}
                    </ul>
                  </>
                ) : <p>✓ Không có dữ liệu liên quan. Bạn có thể xóa an toàn.</p>}
              </div>
            ) : null}

            <p className="text-[11px] text-[rgb(var(--text-4))]">Hành động này không thể hoàn tác.</p>
          </div>
        </DialogDescription>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending || isLoadingImpact}>Hủy</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending || isLoadingImpact}>
            {isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Đang xóa...</> : "Xóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
