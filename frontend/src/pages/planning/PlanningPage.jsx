import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { planningService } from "../../services/planning.service";
import { orderService } from "../../services/order.service";
import { workerService } from "../../services/worker.service";
import { workerAssignmentService } from "../../services/workerAssignment.service";
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Autocomplete,
  TextField,
  Snackbar,
} from "@mui/material";
import { DateTime } from "luxon";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";

// Sub-components
import { ExcelHeaderCell, rebalanceDays } from "./components/shared";
import PlanningTableRow from "./components/PlanningTableRow";
import PlanningFormDialog from "./components/PlanningFormDialog";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import WorkerAssignmentDialog from "./components/WorkerAssignmentDialog";

export default function PlanningPage() {
  const queryClient = useQueryClient();

  // UI state
  const [openModal, setOpenModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineEditDays, setInlineEditDays] = useState([]);

  // Pagination & Filter
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    planId: null,
  });

  // Worker assignment
  const [assignmentDialog, setAssignmentDialog] = useState({
    open: false,
    planId: null,
    date: null,
    dateLabel: "",
  });
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);

  // ─── Data Fetching ─────────────────────────────────────
  const {
    data: plansData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["plans", page, rowsPerPage, selectedOrderIds],
    queryFn: () =>
      planningService.getAll({
        page: page + 1,
        limit: rowsPerPage,
        order_ids: selectedOrderIds.join(","),
      }),
    keepPreviousData: true,
  });

  const plans = plansData?.data || [];
  const totalCount = plansData?.total || 0;

  const { data: allOrdersData } = useQuery({
    queryKey: ["orders"],
    queryFn: orderService.getAll,
  });
  const orders = allOrdersData || [];

  const { data: allWorkers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: workerService.getAll,
  });

  // ─── Date Columns ──────────────────────────────────────
  const dateColumns = useMemo(() => {
    if (!plans) return [];
    const dates = new Set();
    plans.forEach((plan) => {
      plan.days?.forEach((day) => {
        dates.add(DateTime.fromISO(day.working_date).toFormat("yyyy-MM-dd"));
      });
    });
    return Array.from(dates)
      .sort()
      .map((d) => ({
        key: d,
        label: DateTime.fromISO(d).toFormat("dd-MM"),
      }));
  }, [plans]);

  // ─── Mutations ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload) => planningService.createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      handleCloseModal();
      setSnackbar({
        open: true,
        message: "Thêm mới thành công!",
        severity: "success",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => planningService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setSnackbar({
        open: true,
        message: "Cập nhật thành công!",
        severity: "success",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => planningService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setSnackbar({
        open: true,
        message: "Xóa kế hoạch thành công!",
        severity: "success",
      });
      setDeleteConfirm({ open: false, planId: null });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message:
          "Lỗi khi xóa: " + (error.response?.data?.message || error.message),
        severity: "error",
      });
    },
  });

  const handleSaveAssignments = useMutation({
    mutationFn: () =>
      workerAssignmentService.updateAssignments({
        production_plan_id: assignmentDialog.planId,
        working_date: assignmentDialog.date,
        worker_ids: selectedWorkerIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setAssignmentDialog((prev) => ({ ...prev, open: false }));
      setSnackbar({
        open: true,
        message: "Đã cập nhật công nhân làm việc",
        severity: "success",
      });
    },
  });

  // ─── Handlers ──────────────────────────────────────────
  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
    setEditingPlan(null);
  }, []);

  const handleOpenEdit = useCallback((plan) => {
    setEditingPlan(plan);
    setOpenModal(true);
  }, []);

  const handleFormSubmit = useCallback(
    (payload) => {
      if (editingPlan) {
        updateMutation.mutate(
          { id: editingPlan.id, payload },
          { onSuccess: () => handleCloseModal() },
        );
      } else {
        createMutation.mutate(payload);
      }
    },
    [editingPlan, updateMutation, createMutation, handleCloseModal],
  );

  // Inline editing
  const handleStartInlineEdit = useCallback((plan) => {
    setInlineEditingId(plan.id);
    setInlineEditDays(
      plan.days.map((d) => ({
        date: DateTime.fromISO(d.working_date).toFormat("yyyy-MM-dd"),
        hours: (parseFloat(d.planned_work_quantity) / 8).toFixed(2),
        is_overtime: d.is_overtime,
      })),
    );
  }, []);

  const handleCancelInlineEdit = useCallback(() => {
    setInlineEditingId(null);
    setInlineEditDays([]);
  }, []);

  const handleInlineDayChange = useCallback(
    (plan, dateISO, value) => {
      setInlineEditDays((prev) => {
        const index = prev.findIndex((d) => d.date === dateISO);
        if (index >= 0) {
          const planTotalNeeded =
            (parseFloat(plan.quantity) - parseFloat(plan.inventory_input)) /
            (parseFloat(plan.dinh_muc) || 1) /
            8;
          return rebalanceDays(prev, index, value, planTotalNeeded);
        }
        const newVal = parseFloat(value) || 0;
        return [
          ...prev,
          { date: dateISO, hours: newVal.toFixed(2), is_overtime: false },
        ];
      });
    },
    [],
  );

  const handleSaveInline = useCallback(
    (plan) => {
      const payload = {
        order_id: plan.order_id,
        product_id: plan.product_id,
        product_group_operation_id: plan.product_group_operation_id,
        inventory_input: plan.inventory_input,
        planned_start_date: plan.planned_start_date,
        days: inlineEditDays
          .filter((d) => parseFloat(d.hours) > 0)
          .map((d) => ({
            date: d.date,
            hours: (parseFloat(d.hours) * 8).toFixed(2),
            is_overtime: d.is_overtime,
          })),
      };
      updateMutation.mutate(
        { id: plan.id, payload },
        { onSuccess: () => handleCancelInlineEdit() },
      );
    },
    [inlineEditDays, updateMutation, handleCancelInlineEdit],
  );

  // Assignment
  const handleOpenAssignment = useCallback(
    async (planId, date, dateLabel) => {
      setAssignmentDialog({ open: true, planId, date, dateLabel });
      try {
        const currentAssignments =
          await workerAssignmentService.getAssignments(planId, date);
        setSelectedWorkerIds(currentAssignments.map((w) => w.id));
      } catch {
        setSnackbar({
          open: true,
          message: "Lỗi khi tải danh sách công nhân",
          severity: "error",
        });
      }
    },
    [],
  );

  const toggleWorker = useCallback((id) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const handleOpenDelete = useCallback((planId) => {
    setDeleteConfirm({ open: true, planId });
  }, []);

  // ─── Render ────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="60vh"
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2, borderRadius: "12px" }}>
        {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ px: 1 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" fontWeight={800}>
          Kế hoạch sản xuất
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Autocomplete
            multiple
            size="small"
            options={orders}
            getOptionLabel={(o) => o.name || ""}
            value={orders.filter((o) => selectedOrderIds.includes(o.id))}
            onChange={(_, val) => {
              setSelectedOrderIds(val.map((o) => o.id));
              setPage(0);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Lọc theo đơn hàng"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon
                        sx={{ color: "text.disabled", fontSize: 20, mr: 0.5 }}
                      />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ minWidth: 320 }}
          />
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => {
              setEditingPlan(null);
              setOpenModal(true);
            }}
            sx={{
              bgcolor: "#4f46e5",
              fontWeight: 700,
              borderRadius: "10px",
              px: 3,
              "&:hover": { bgcolor: "#4338ca" },
            }}
          >
            Lập kế hoạch
          </Button>
        </Box>
      </Box>

      {/* Main Table */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <TableContainer sx={{ maxHeight: "calc(100vh - 240px)" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <ExcelHeaderCell rowSpan={2}>STT</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Thứ tự</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Mã mặt hàng</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Nhóm mã hàng</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Công đoạn</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Máy</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>SL đơn</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Tồn kho</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2} sx={{ color: "#e53935" }}>
                  Còn lại
                </ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Định mức</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Tổng công</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Đã SX</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Mẫu</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Bắt đầu</ExcelHeaderCell>
                <ExcelHeaderCell rowSpan={2}>Kết thúc</ExcelHeaderCell>
                {dateColumns.length > 0 && (
                  <ExcelHeaderCell
                    colSpan={dateColumns.length}
                    sx={{ bgcolor: "#e0f2fe", color: "#0369a1" }}
                  >
                    NGÀY LÀM VIỆC
                  </ExcelHeaderCell>
                )}
                <ExcelHeaderCell
                  rowSpan={2}
                  sx={{
                    position: "sticky",
                    right: 0,
                    zIndex: 12,
                    bgcolor: "#f1f5f9",
                    borderLeft: "1px solid #cbd5e1",
                  }}
                >
                  Hành động
                </ExcelHeaderCell>
              </TableRow>
              {dateColumns.length > 0 && (
                <TableRow>
                  {dateColumns.map((date) => (
                    <ExcelHeaderCell
                      key={date.key}
                      sx={{
                        bgcolor: "#f0f9ff",
                        fontSize: "0.7rem",
                        p: "4px",
                        minWidth: "50px",
                      }}
                    >
                      {date.label}
                    </ExcelHeaderCell>
                  ))}
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {plans?.map((plan, idx) => (
                <PlanningTableRow
                  key={plan.id}
                  plan={plan}
                  idx={idx}
                  dateColumns={dateColumns}
                  isInlineEditing={inlineEditingId === plan.id}
                  inlineEditDays={
                    inlineEditingId === plan.id ? inlineEditDays : []
                  }
                  isUpdatePending={updateMutation.isPending}
                  isDeletePending={
                    deleteMutation.isPending &&
                    deleteConfirm.planId === plan.id
                  }
                  onStartInlineEdit={handleStartInlineEdit}
                  onCancelInlineEdit={handleCancelInlineEdit}
                  onSaveInline={handleSaveInline}
                  onOpenEdit={handleOpenEdit}
                  onOpenDelete={handleOpenDelete}
                  onOpenAssignment={handleOpenAssignment}
                  onInlineDayChange={handleInlineDayChange}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{
            borderTop: "1px solid #e2e8f0",
            bgcolor: "white",
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows":
              {
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "text.secondary",
              },
          }}
        />
      </Paper>

      {/* ─── Dialogs ────────────────────────────────────── */}
      <PlanningFormDialog
        open={openModal}
        editingPlan={editingPlan}
        isCreatePending={createMutation.isPending}
        isUpdatePending={updateMutation.isPending}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteConfirm({ open: false, planId: null })}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.planId)}
      />

      <WorkerAssignmentDialog
        open={assignmentDialog.open}
        dateLabel={assignmentDialog.dateLabel}
        allWorkers={allWorkers}
        selectedWorkerIds={selectedWorkerIds}
        isPending={handleSaveAssignments.isPending}
        onToggleWorker={toggleWorker}
        onClose={() =>
          setAssignmentDialog((prev) => ({ ...prev, open: false }))
        }
        onSave={() => handleSaveAssignments.mutate()}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: "8px", fontWeight: 600 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
