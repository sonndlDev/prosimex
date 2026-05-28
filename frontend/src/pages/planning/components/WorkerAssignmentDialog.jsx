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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users } from "lucide-react";

const WorkerAssignmentDialog = React.memo(
  ({
    open,
    dateLabel,
    allWorkers,
    selectedWorkerIds,
    isPending,
    onToggleWorker,
    onClose,
    onSave,
  }) => (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px] border-[rgb(var(--c-line-2))] shadow-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-black text-[rgb(var(--c-ink))]">Phân công công nhân</DialogTitle>
          </div>
          <DialogDescription className="text-[rgb(var(--c-ink-3))] font-bold text-xs uppercase tracking-widest bg-[rgb(var(--c-s2))] px-2 py-1 rounded inline-block w-fit">
            NGÀY: {dateLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <p className="text-sm text-[rgb(var(--c-ink-3))] mb-4 font-medium">Chọn các công nhân sẽ tham gia sản xuất cho ngày này.</p>
          <ScrollArea className="h-[300px] pr-4 -mr-4">
            <div className="space-y-1">
              {allWorkers.map((worker) => {
                const isSelected = selectedWorkerIds.includes(worker.id);
                return (
                  <div
                    key={worker.id}
                    onClick={() => onToggleWorker(worker.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${isSelected
                      ? "bg-blue-50 border border-blue-100 shadow-sm"
                      : "hover:bg-[rgb(var(--c-s2))] border border-transparent"
                      }`}
                  >
                    <div >
                      <span className={`text-sm ${isSelected ? "font-black text-blue-700" : "font-bold text-[rgb(var(--c-ink))]"}`}>
                        {worker.name}
                      </span>
                      <span className="text-[10px] font-bold text-[rgb(var(--c-ink-4))] uppercase tracking-tighter">
                        Mã: {worker.code}
                      </span>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleWorker(worker.id)}
                      className={isSelected ? "border-blue-600 bg-blue-600" : "border-[rgb(var(--c-line-3))]"}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4/50 border-t border-[rgb(var(--c-line))]">
          <Button variant="ghost" onClick={onClose} className="font-bold text-[rgb(var(--c-ink-3))] hover:text-[rgb(var(--c-ink))] px-6">
            Hủy
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending}
            className="font-black px-8 bg-zinc-950 text-white shadow-md shadow-zinc-200 h-10 min-w-[140px]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : "Lưu phân công"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
);
WorkerAssignmentDialog.displayName = "WorkerAssignmentDialog";

export default WorkerAssignmentDialog;
