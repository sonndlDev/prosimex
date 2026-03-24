import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ListAltIcon from "@mui/icons-material/ListAlt";
import PrintIcon from "@mui/icons-material/Print";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { DateTime } from "luxon";
import { useSnackbar } from "notistack";
import { dailyTicketService } from "../../services/daily-ticket.service";
import DailyTicketFormDialog from "./components/DailyTicketFormDialog";
import DailyTicketResultDialog from "./components/DailyTicketResultDialog";
import DailyTicketPrintView from "./components/DailyTicketPrintView";
import DailyTicketReportDialog from "./components/DailyTicketReportDialog";
import Swal from "sweetalert2";

export default function DailyTicketPage() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["daily-tickets", page, rowsPerPage],
    queryFn: () => dailyTicketService.getAll({ page, limit: rowsPerPage }),
  });

  const deleteMutation = useMutation({
    mutationFn: dailyTicketService.delete,
    onSuccess: () => {
      enqueueSnackbar("Đã xoá phiếu sản xuất!", { variant: "success" });
      queryClient.invalidateQueries(["daily-tickets"]);
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Lỗi khi xoá phiếu!", {
        variant: "error",
      });
    },
  });

  const handleDelete = (id) => {
    Swal.fire({
      title: "Xác nhận xoá?",
      text: "Bạn có chắc chắn muốn xoá phiếu sản xuất này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id);
      }
    });
  };

  const handleOpenResult = (id) => {
    setSelectedTicketId(id);
    setIsResultOpen(true);
  };

  const handleOpenPrint = (id) => {
    setSelectedTicketId(id);
    setIsPrintOpen(true);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
        <Typography variant="h5" fontWeight={800} color="text.primary">
          Phiếu Sản Xuất Hàng Ngày
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={() => setIsReportOpen(true)}
            sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700, borderColor: "primary.main", color: "primary.main" }}
          >
            Báo cáo Kế Hoạch vs Thực Tế
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsFormOpen(true)}
            sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
          >
            Tạo Phiếu Mới
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: "16px", overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "background.default" }}>
              <TableRow>
                <TableCell width={80}>ID</TableCell>
                <TableCell>Ngày sản xuất</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Người lập</TableCell>
                <TableCell>Ngày tạo</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Chưa có phiếu sản xuất nào.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>#{item.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {DateTime.fromISO(item.ticket_date).toFormat("dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status === "COMPLETED" ? "Đã nhập kết quả" : "Mới/Bản nháp"}
                        color={item.status === "COMPLETED" ? "success" : "default"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>{item.created_by_name}</TableCell>
                    <TableCell>
                      {DateTime.fromISO(item.created_at).toFormat("dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="In Phiếu">
                        <IconButton color="secondary" onClick={() => handleOpenPrint(item.id)}>
                          <PrintIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Nhập Kết Quả / Xem CT">
                        <IconButton color="primary" onClick={() => handleOpenResult(item.id)}>
                          <EditNoteIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xoá">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(item.id)}
                          disabled={item.status === "COMPLETED"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {isFormOpen && (
        <DailyTicketFormDialog
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {isResultOpen && selectedTicketId && (
        <DailyTicketResultDialog
          open={isResultOpen}
          ticketId={selectedTicketId}
          onClose={() => {
            setIsResultOpen(false);
            setSelectedTicketId(null);
          }}
        />
      )}

      {isPrintOpen && selectedTicketId && (
        <DailyTicketPrintView
          open={isPrintOpen}
          ticketId={selectedTicketId}
          onClose={() => {
            setIsPrintOpen(false);
            setSelectedTicketId(null);
          }}
        />
      )}

      {isReportOpen && (
        <DailyTicketReportDialog
          open={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </Box>
  );
}
