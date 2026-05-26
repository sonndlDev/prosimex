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
      <DialogContent className="sm:max-w-[420px] border-zinc-200 shadow-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-black text-zinc-950">Phân công công nhân</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-500 font-bold text-xs uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded inline-block w-fit">
            NGÀY: {dateLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <p className="text-sm text-zinc-500 mb-4 font-medium">Chọn các công nhân sẽ tham gia sản xuất cho ngày này.</p>
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
                      : "hover:bg-zinc-50 border border-transparent"
                      }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm ${isSelected ? "font-black text-blue-700" : "font-bold text-zinc-950"}`}>
                        {worker.name}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                        Mã: {worker.code}
                      </span>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleWorker(worker.id)}
                      className={isSelected ? "border-blue-600 bg-blue-600" : "border-zinc-300"}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100">
          <Button variant="ghost" onClick={onClose} className="font-bold text-zinc-500 hover:text-zinc-950 px-6">
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
