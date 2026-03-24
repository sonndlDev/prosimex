import React, { useEffect, useMemo } from "react";
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { DateTime } from "luxon";
import { useSnackbar } from "notistack";
import { dailyTicketService } from "../../../services/daily-ticket.service";
import { planningService } from "../../../services/planning.service";

const TicketRow = ({ index, control, setValue, remove, plans, ticketDate, watchItems }) => {
  const selectedOrderId = watchItems[index]?.order_id;
  const selectedProductId = watchItems[index]?.product_id;

  // Filter products based on selected order and available plans
  const availableProducts = useMemo(() => {
    if (!selectedOrderId || !plans) return [];
    const productsMap = new Map();
    plans
      .filter((p) => p.order_id === selectedOrderId)
      .forEach((p) => {
        if (p.product_id) {
          productsMap.set(p.product_id, { id: p.product_id, name: p.product_name });
        }
      });
    return Array.from(productsMap.values());
  }, [selectedOrderId, plans]);

  // Filter operations based on selected product and available plans
  const availableOperations = useMemo(() => {
    if (!selectedProductId || !plans) return [];
    return plans
      .filter((p) => p.order_id === selectedOrderId && p.product_id === selectedProductId)
      .map((p) => ({
        id: p.product_group_operation_id || `null-${p.id}`,
        name: p.operation_name || "N/A (CĐ Tổng)",
        plan: p,
      }));
  }, [selectedOrderId, selectedProductId, plans]);

  return (
    <Box
      display="grid"
      gridTemplateColumns="1fr 1fr 1fr 150px 50px"
      gap={2}
      mb={2}
      alignItems="center"
    >
      <Controller
        name={`items.${index}.order_id`}
        control={control}
        render={({ field }) => (
          <FormControl fullWidth size="small">
            <InputLabel>Đơn hàng</InputLabel>
            <Select
              {...field}
              label="Đơn hàng"
              onChange={(e) => {
                field.onChange(e.target.value);
                setValue(`items.${index}.product_id`, "");
                setValue(`items.${index}.product_group_operation_id`, "");
                setValue(`items.${index}.planned_quantity`, "");
              }}
            >
              {Array.from(new Map(plans?.map(p => [p.order_id, {id: p.order_id, name: p.order_name || p.order_code || `Đơn hàng #${p.order_id}`}]) || []).values()).map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />

      <Controller
        name={`items.${index}.product_id`}
        control={control}
        render={({ field }) => (
          <FormControl fullWidth size="small" disabled={!selectedOrderId}>
            <InputLabel>Sản phẩm</InputLabel>
            <Select
              {...field}
              label="Sản phẩm"
              onChange={(e) => {
                field.onChange(e.target.value);
                setValue(`items.${index}.product_group_operation_id`, "");
                setValue(`items.${index}.planned_quantity`, "");
              }}
            >
              {availableProducts.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />

      <Controller
        name={`items.${index}.product_group_operation_id`}
        control={control}
        render={({ field: selectField }) => (
          <FormControl fullWidth size="small" disabled={!selectedProductId}>
            <InputLabel>Công đoạn</InputLabel>
            <Select
              {...selectField}
              label="Công đoạn"
              onChange={(e) => {
                selectField.onChange(e.target.value);
                const op = availableOperations.find(o => o.id === e.target.value);
                if (op) {
                  setValue(`items.${index}.operation_name`, op.name);
                }
              }}
            >
              {availableOperations.map((op) => (
                <MenuItem key={op.id} value={op.id}>
                  {op.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />

      <Controller
        name={`items.${index}.planned_quantity`}
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Sản lượng"
            type="number"
            size="small"
            fullWidth
          />
        )}
      />

      <IconButton color="error" onClick={() => remove(index)}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );
};

export default function DailyTicketFormDialog({ open, onClose }) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { control, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: {
      ticket_date: DateTime.local().toISODate(),
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const ticketDate = watch("ticket_date");

  // Fetch plans for the selected date
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["plans-by-date", ticketDate],
    queryFn: () => planningService.getAll({ working_date: ticketDate, limit: 100 }),
    enabled: !!ticketDate && open,
  });
  const plans = plansData?.data || [];

  const createMutation = useMutation({
    mutationFn: dailyTicketService.create,
    onSuccess: () => {
      enqueueSnackbar("Đã tạo phiếu sản xuất thành công!", { variant: "success" });
      queryClient.invalidateQueries(["daily-tickets"]);
      onClose();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Lỗi khi tạo phiếu!", {
        variant: "error",
      });
    },
  });

  const watchItems = watch("items");

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = (data) => {
    if (data.items.length === 0) {
      enqueueSnackbar("Vui lòng thêm ít nhất một công đoạn!", { variant: "warning" });
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 700 }}>Tạo Phiếu Sản Xuất Hàng Ngày</DialogTitle>
      <DialogContent dividers>
        <Box mb={4} width={300}>
          <Controller
            name="ticket_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Ngày sản xuất"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
          />
        </Box>

        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Danh sách công việc dự kiến:
        </Typography>

        {fields.map((field, index) => (
          <React.Fragment key={field.id}>
             <TicketRow 
               index={index} 
               control={control} 
               setValue={setValue} 
               remove={remove} 
               plans={plans} 
               ticketDate={ticketDate}
               watchItems={watchItems}
             />
             <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          </React.Fragment>
        ))}

        <Button
          startIcon={<AddCircleIcon />}
          onClick={() =>
            append({
              order_id: "",
              product_id: "",
              product_group_operation_id: "",
              operation_name: "",
              planned_quantity: "",
            })
          }
          sx={{ mt: 2, fontWeight: 700 }}
        >
          Thêm Công Việc Tiết
        </Button>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Huỷ
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Đang lưu..." : "Tạo Phiếu"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
