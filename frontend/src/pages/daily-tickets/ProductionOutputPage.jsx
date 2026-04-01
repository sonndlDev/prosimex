import React, { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { dailyTicketService } from "../../services/daily-ticket.service";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProductionOutputPage() {
  const queryClient = useQueryClient();

  // Search form
  const [searchDate, setSearchDate] = useState(DateTime.now().toFormat("yyyy-MM-dd"));
  const [searchTicketId, setSearchTicketId] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(null);

  // Load ticket if searched
  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ["daily-ticket", activeTicketId],
    queryFn: () => dailyTicketService.getById(activeTicketId),
    enabled: !!activeTicketId,
    retry: false,
  });

  const { control, handleSubmit, reset } = useForm({
    defaultValues: { items: [] },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "items",
  });

  // Populate form
  React.useEffect(() => {
    if (ticket) {
      const rcvDate = DateTime.fromISO(ticket.ticket_date).toFormat("yyyy-MM-dd");
      if (rcvDate !== searchDate) {
        toast.error("Không tìm thấy phiếu trong ngày này!");
        setActiveTicketId(null);
        return;
      }
      if (ticket.items) {
        replace(
          ticket.items.map((item) => ({
            id: item.id,
            order_code: item.order_code || item.order_name,
            product_name: item.product_name,
            operation_name: item.operation_name || item.pgo_operation_name,
            planned_quantity: parseFloat(item.planned_quantity),
            actual_quantity: parseFloat(item.actual_quantity) || "",
          }))
        );
      }
    }
  }, [ticket, replace, searchDate]);

  const handleSearch = () => {
    if (!searchTicketId) {
      toast.warning("Vui lòng nhập mã số phiếu!");
      return;
    }

    let finalId = searchTicketId;
    let finalDate = searchDate;

    // Handle new format: YYYYMMDD + ID (e.g., 202603268)
    // We expect at least 9 characters (8 for date + at least 1 for ID)
    if (searchTicketId.length >= 9 && /^\d+$/.test(searchTicketId)) {
      const datePart = searchTicketId.substring(0, 8);
      const idPart = searchTicketId.substring(8);
      
      const parsedDate = DateTime.fromFormat(datePart, "yyyyMMdd");
      if (parsedDate.isValid) {
        finalDate = parsedDate.toISODate();
        finalId = idPart;
        // Sync the date picker
        setSearchDate(finalDate);
      }
    } else if (searchTicketId.includes("_#")) {
      // Legacy format support
      const parts = searchTicketId.split("_#");
      finalId = parts[1];
    }

    if (!finalDate) {
      toast.warning("Vui lòng chọn ngày sản xuất!");
      return;
    }

    setActiveTicketId(finalId);
  };

  const updateMutation = useMutation({
    mutationFn: (data) => dailyTicketService.updateResults(activeTicketId, data),
    onSuccess: () => {
      toast.success("Đã cập nhật kết quả sản xuất!");
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["daily-ticket", activeTicketId]);
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
    <div className="space-y-6">
      <Toaster position="top-right" richColors />

      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
           <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Nhập Sản Lượng</h2>
           <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Kết quả kiểm tra và báo cáo sản xuất hàng ngày</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:w-1/4 space-y-2">
              <Label htmlFor="date">Ngày sản xuất</Label>
              <Input
                id="date"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>
            <div className="w-full md:w-1/4 space-y-2">
              <Label htmlFor="ticketId">Mã số phiếu</Label>
              <Input
                id="ticketId"
                placeholder="VD: 202603268"
                value={searchTicketId}
                onChange={(e) => setSearchTicketId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>
            <div className="w-full md:w-auto">
              <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto px-8 font-semibold">
                {isLoading ? "Đang tìm..." : "Tìm Kiếm"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-600 font-semibold">
            Không tìm thấy dữ liệu hoặc có lỗi xảy ra! {error?.message}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && ticket && DateTime.fromISO(ticket.ticket_date).toFormat("yyyy-MM-dd") === searchDate && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-zinc-950">
                Phiếu Sản Xuất {DateTime.fromISO(ticket.ticket_date).toFormat("yyyyMMdd")}{ticket.id}
              </h3>
              <p className="text-sm text-zinc-500 font-medium">Người lập: {ticket.created_by_name}</p>
            </div>
            <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-green-600 hover:bg-green-700 font-bold" : "bg-orange-100 text-orange-800 hover:bg-orange-200 font-bold"}>
              {isCompleted ? "Đã chốt (Không thể sửa)" : "Đang thực hiện"}
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="w-[80px]">STT</TableHead>
                <TableHead>Đơn hàng</TableHead>
                <TableHead>Mã hàng</TableHead>
                <TableHead>Công đoạn</TableHead>
                <TableHead className="text-right">SL Kế Hoạch</TableHead>
                <TableHead className="text-right w-[200px]">SL Thực Tế</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id} className="cursor-default">
                  <TableCell className="font-medium text-zinc-500">{index + 1}</TableCell>
                  <TableCell>{field.order_code || "N/A"}</TableCell>
                  <TableCell>{field.product_name || "N/A"}</TableCell>
                  <TableCell className="font-semibold text-zinc-700">{field.operation_name}</TableCell>
                  <TableCell className="text-right font-bold text-zinc-900">
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
                          disabled={isCompleted || updateMutation.isPending}
                          className={`text-right font-bold w-full ${!isCompleted ? "text-blue-600 focus-visible:ring-blue-500 border-zinc-300" : ""}`}
                          min={0}
                        />
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-zinc-500 font-medium">
                    Không có sản phẩm nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <CardFooter className="p-6 bg-zinc-50/50 border-t border-zinc-200 justify-end">
            <Button
              size="lg"
              onClick={handleSubmit(onSubmit)}
              disabled={isCompleted || updateMutation.isPending || fields.length === 0}
              className="px-8 font-bold"
            >
              {updateMutation.isPending ? "Đang lưu..." : "Ghi Nhận Sản Lượng"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
