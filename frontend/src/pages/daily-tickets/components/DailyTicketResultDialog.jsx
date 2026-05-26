import React, { useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../../services/daily-ticket.service";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function DailyTicketResultDialog({ open, ticketId, onClose }) {
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["daily-ticket", ticketId],
    queryFn: () => dailyTicketService.getById(ticketId),
    enabled: !!ticketId && open,
  });

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "items",
  });

  useEffect(() => {
    if (ticket && ticket.items) {
      replace(
        ticket.items.map((item) => ({
          id: item.id,
          order_code: item.order_code || item.order_name,
          product_name: item.product_name,
          operation_name: item.operation_name || item.pgo_operation_name,
          planned_quantity: parseFloat(item.planned_quantity),
          actual_quantity: parseFloat(item.actual_quantity) || 0,
        }))
      );
    }
  }, [ticket, replace]);

  const updateMutation = useMutation({
    mutationFn: (data) => dailyTicketService.updateResults(ticketId, data),
    onSuccess: () => {
      toast.success("Đã cập nhật kết quả sản xuất!");
      queryClient.invalidateQueries({ queryKey: ["daily-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["daily-ticket", ticketId] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Lỗi khi lưu kết quả!");
    },
  });

  const onSubmit = (data) => {
    const payload = data.items.map((item) => ({
      id: item.id,
      actual_quantity: parseFloat(item.actual_quantity) || 0,
    }));
    updateMutation.mutate(payload);
  };

  const isCompleted = ticket?.status === "COMPLETED";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Nhập Kết Quả Sản Xuất - Phiếu #{ticket?.id}
            {ticket && (
              <Badge variant={isCompleted ? "success" : "warning"}>
                {isCompleted ? "Đã chốt" : "Đang thực hiện"}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          <div className="flex gap-8 px-1">
            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs">Ngày SX</Label>
              <p className="font-bold">
                {ticket ? DateTime.fromISO(ticket.ticket_date).toFormat("dd/MM/yyyy") : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-zinc-500 text-xs">Người lập</Label>
              <p className="font-bold">{ticket?.created_by_name || "-"}</p>
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50">
                <TableRow>
                  <TableHead className="font-bold">Đơn hàng</TableHead>
                  <TableHead className="font-bold">Mã hàng</TableHead>
                  <TableHead className="font-bold">Công đoạn</TableHead>
                  <TableHead className="text-right font-bold w-32">SL Kế Hoạch</TableHead>
                  <TableHead className="text-right font-bold w-40">SL Thực Tế</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải dữ liệu...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : fields.length > 0 ? (
                  fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.order_code || "N/A"}</TableCell>
                      <TableCell>{field.product_name || "N/A"}</TableCell>
                      <TableCell>{field.operation_name}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">
                        {field.planned_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <Controller
                          name={`items.${index}.actual_quantity`}
                          control={control}
                          render={({ field: inputField }) => (
                            <Input
                              {...inputField}
                              type="number"
                              disabled={isCompleted}
                              className={`h-9 text-right font-bold tabular-nums ${
                                !isCompleted ? "text-blue-600 focus-visible:ring-blue-600" : ""
                              }`}
                            />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                      Không có dữ liệu công việc.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isCompleted ? "Đóng" : "Hủy"}
          </Button>
          {!isCompleted && (
            <Button 
              onClick={handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
              className="min-w-32"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu Kết Quả"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
