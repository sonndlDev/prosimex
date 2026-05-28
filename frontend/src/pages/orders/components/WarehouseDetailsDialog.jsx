import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import { toast } from "sonner";
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
import { Loader2, Warehouse } from "lucide-react";
import { PremiumDatePicker } from "../../../components/PremiumDatePicker";
import { DateTime } from "luxon";

export default function WarehouseDetailsDialog({ open, onClose, order }) {
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      expected_material_date: "",
      actual_material_date: "",
      net_weight_text: "",
      package_count_text: "",
      container_volume_text: "",
    },
  });

  useEffect(() => {
    if (order && open) {
      reset({
        expected_material_date: order.expected_material_date ? DateTime.fromISO(order.expected_material_date).toFormat("yyyy-MM-dd") : "",
        actual_material_date: order.actual_material_date ? DateTime.fromISO(order.actual_material_date).toFormat("yyyy-MM-dd") : "",
        net_weight_text: order.net_weight_text || "",
        package_count_text: order.package_count_text || "",
        container_volume_text: order.container_volume_text || "",
      });
    }
  }, [order, open, reset]);

  const updateMutation = useMutation({
    mutationFn: (payload) => orderService.updateWarehouseDetails(order.id, payload),
    onSuccess: () => {
      toast.success("Cập nhật thông tin kho thành công!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi cập nhật thông tin kho");
    },
  });

  const onSubmit = (data) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader className="mb-4 text-left">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 p-2 rounded-full">
                <Warehouse className="w-5 h-5 text-indigo-600" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-[rgb(var(--c-ink))]">
                Nhập thông tin Kho
              </DialogTitle>
            </div>
            {order && (
              <p className="text-sm font-medium text-[rgb(var(--c-ink-3))] mt-1">
                Đơn hàng: <span className="text-blue-600 font-bold">{order.order_code}</span>
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2 text-left">
              <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))]">Ngày NL về xưởng (Dự kiến)</Label>
              <Controller
                name="expected_material_date"
                control={control}
                render={({ field }) => (
                  <PremiumDatePicker
                    date={field.value}
                    onSelect={field.onChange}
                    placeholder="Chọn ngày"
                  />
                )}
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))]">Ngày báo XNK</Label>
              <Controller
                name="actual_material_date"
                control={control}
                render={({ field }) => (
                  <PremiumDatePicker
                    date={field.value}
                    onSelect={field.onChange}
                    placeholder="Chọn ngày"
                  />
                )}
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))]">Net W</Label>
              <Controller
                name="net_weight_text"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="VD: 50kg, 2 tấn..." className="border-[rgb(var(--c-line-3))] focus-visible:ring-indigo-500" />
                )}
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))]">Số kiện</Label>
              <Controller
                name="package_count_text"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="VD: 10 kiện, 5 thùng..." className="border-[rgb(var(--c-line-3))] focus-visible:ring-indigo-500" />
                )}
              />
            </div>

            <div className="space-y-2 text-left">
              <Label className="text-xs font-bold text-[rgb(var(--c-ink-2))]">Khối lượng cont / lẻ</Label>
              <Controller
                name="container_volume_text"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="VD: 20ft, 40 LCL..." className="border-[rgb(var(--c-line-3))] focus-visible:ring-indigo-500" />
                )}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 border-t border-[rgb(var(--c-line))] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mr-2"
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thông tin"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
