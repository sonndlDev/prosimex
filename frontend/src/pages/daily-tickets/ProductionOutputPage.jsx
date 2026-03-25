import React, { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
} from "@mui/material";
import { DateTime } from "luxon";
import { useSnackbar } from "notistack";
import { dailyTicketService } from "../../services/daily-ticket.service";

export default function ProductionOutputPage() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Search form
  const [searchDate, setSearchDate] = useState(
    DateTime.now().toFormat("yyyy-MM-dd")
  );
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
    defaultValues: {
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "items",
  });

  // When ticket data is loaded, populate form and verify date
  React.useEffect(() => {
    if (ticket) {
      // Check date
      const rcvDate = DateTime.fromISO(ticket.ticket_date).toFormat(
        "yyyy-MM-dd"
      );
      if (rcvDate !== searchDate) {
        enqueueSnackbar("Không tìm thấy phiếu trong ngày này!", {
          variant: "error",
        });
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
  }, [ticket, replace, searchDate, enqueueSnackbar]);

  const handleSearch = () => {
    if (!searchTicketId || !searchDate) {
      enqueueSnackbar("Vui lòng nhập Ngày và Mã số phiếu!", {
        variant: "warning",
      });
      return;
    }
    // Extract ID if user pastes formatted text like 20260325_#5
    const parts = searchTicketId.split("_#");
    const idToFetch = parts.length > 1 ? parts[1] : searchTicketId;
    setActiveTicketId(idToFetch);
  };

  const updateMutation = useMutation({
    mutationFn: (data) => dailyTicketService.updateResults(activeTicketId, data),
    onSuccess: () => {
      enqueueSnackbar("Đã cập nhật kết quả sản xuất!", { variant: "success" });
      queryClient.invalidateQueries(["daily-tickets"]);
      queryClient.invalidateQueries(["daily-ticket", activeTicketId]);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Lỗi khi lưu kết quả!", {
        variant: "error",
      });
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
    <Box>
      <Box mb={3}>
        <Typography variant="h5" fontWeight={800} color="text.primary">
          Nhập Sản Lượng / Kết Quả Sản Xuất
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vui lòng nhập Ngày và Mã số phiếu sản xuất để lấy danh sách công đoạn.
        </Typography>
      </Box>

      {/* SEARCH FORM */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: "16px", borderColor: "divider" }} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              label="Ngày sản xuất"
              type="date"
              fullWidth
              size="small"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              label="Mã số phiếu"
              type="text"
              placeholder="VD: 20260325_#5"
              fullWidth
              size="small"
              value={searchTicketId}
              onChange={(e) => setSearchTicketId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={isLoading}
              sx={{ borderRadius: "8px", fontWeight: 700, px: 4 }}
            >
              {isLoading ? "Đang tìm..." : "Tìm Kiếm"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {isError && (
        <Paper sx={{ p: 3, textAlign: "center", borderRadius: "16px", color: "error.main" }} variant="outlined">
          <Typography fontWeight={700}>
            Không tìm thấy dữ liệu hoặc có lỗi xảy ra! {error?.message}
          </Typography>
        </Paper>
      )}

      {/* RESULTS TABLE */}
      {!isLoading && !isError && ticket && DateTime.fromISO(ticket.ticket_date).toFormat("yyyy-MM-dd") === searchDate && (
        <Paper variant="outlined" sx={{ borderRadius: "16px", overflow: "hidden" }}>
          <Box p={3} borderBottom="1px solid" borderColor="divider" display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Phiếu Sản Xuất {DateTime.fromISO(ticket.ticket_date).toFormat("yyyyMMdd")}_#{ticket.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Người lập: {ticket.created_by_name}
              </Typography>
            </Box>
            <Chip
              label={isCompleted ? "Đã chốt (Không thể sửa)" : "Đang thực hiện"}
              color={isCompleted ? "success" : "warning"}
              sx={{ fontWeight: 700 }}
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "background.default" }}>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Đơn hàng</TableCell>
                  <TableCell>Mã hàng</TableCell>
                  <TableCell>Công đoạn</TableCell>
                  <TableCell align="right">SL Kế Hoạch</TableCell>
                  <TableCell align="right" width={200}>SL Thực Tế</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{field.order_code || "N/A"}</TableCell>
                    <TableCell>{field.product_name || "N/A"}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{field.operation_name}</TableCell>
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
                            disabled={isCompleted || updateMutation.isPending}
                            inputProps={{
                              style: { textAlign: "right", fontWeight: 700, color: isCompleted ? "inherit" : "#2563eb" },
                              min: 0,
                            }}
                          />
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Không có sản phẩm nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box p={3} display="flex" justifyContent="flex-end" bgcolor="background.default" borderTop="1px solid" borderColor="divider">
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSubmit(onSubmit)}
              disabled={isCompleted || updateMutation.isPending || fields.length === 0}
              sx={{ fontWeight: 800, borderRadius: "8px", px: 5 }}
            >
              {updateMutation.isPending ? "Đang lưu..." : "Ghi Nhận Sản Lượng"}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
