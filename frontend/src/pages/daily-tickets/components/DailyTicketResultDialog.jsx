import React, { useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import { DateTime } from "luxon";
import { useSnackbar } from "notistack";
import { dailyTicketService } from "../../../services/daily-ticket.service";

export default function DailyTicketResultDialog({ open, ticketId, onClose }) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["daily-ticket", ticketId],
    queryFn: () => dailyTicketService.getById(ticketId),
    enabled: !!ticketId,
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
      enqueueSnackbar("Đã cập nhật kết quả sản xuất!", { variant: "success" });
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["daily-ticket", ticketId]);
      onClose();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Lỗi khi lưu kết quả!", {
        variant: "error",
      });
    },
  });

  const onSubmit = (data) => {
    // Only send id and actual_quantity
    const payload = data.items.map((item) => ({
      id: item.id,
      actual_quantity: parseFloat(item.actual_quantity) || 0,
    }));
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogContent>Đang tải...</DialogContent>
      </Dialog>
    );
  }

  const isCompleted = ticket?.status === "COMPLETED";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Nhập Kết Quả Sản Xuất - Phiếu #{ticket?.id}
        <Chip 
           label={ticket?.status === "COMPLETED" ? "Đã chốt" : "Đang thực hiện"} 
           color={ticket?.status === "COMPLETED" ? "success" : "warning"}
           size="small"
           sx={{ ml: 2, fontWeight: 700 }}
        />
      </DialogTitle>
      <DialogContent dividers>
        <Box mb={3} display="flex" gap={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">Ngày SX:</Typography>
            <Typography variant="subtitle1" fontWeight={700}>
               {ticket ? DateTime.fromISO(ticket.ticket_date).toFormat("dd/MM/yyyy") : ""}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Người lập:</Typography>
            <Typography variant="subtitle1" fontWeight={700}>{ticket?.created_by_name}</Typography>
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: "background.default" }}>
              <TableRow>
                <TableCell>Đơn hàng</TableCell>
                <TableCell>Mã hàng</TableCell>
                <TableCell>Công đoạn</TableCell>
                <TableCell align="right">SL Kế Hoạch</TableCell>
                <TableCell align="right" width={150}>SL Thực Tế</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id} hover>
                  <TableCell>{field.order_code || "N/A"}</TableCell>
                  <TableCell>{field.product_name || "N/A"}</TableCell>
                  <TableCell>{field.operation_name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {field.planned_quantity}
                  </TableCell>
                  <TableCell align="right">
                    <Controller
                      name={`items.${index}.actual_quantity`}
                      control={control}
                      render={({ field: inputField }) => (
                        <TextField
                          {...inputField}
                          type="number"
                          size="small"
                          fullWidth
                          variant="outlined"
                          disabled={isCompleted}
                          inputProps={{ style: { textAlign: "right", fontWeight: 700, color: isCompleted ? "inherit" : "#2563eb" } }}
                        />
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {fields.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">Không có dữ liệu</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {isCompleted ? (
          <Button onClick={onClose} variant="contained" color="primary">
            Đóng
          </Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">
              Hủy
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              variant="contained"
              color="primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Đang lưu..." : "Lưu Kết Quả"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
