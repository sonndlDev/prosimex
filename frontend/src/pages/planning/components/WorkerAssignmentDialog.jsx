import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Checkbox,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: "16px" } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        Phân công công nhân ({dateLabel})
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Chọn các công nhân sẽ tham gia sản xuất cho ngày này.
        </Typography>
        <List sx={{ pt: 0, maxHeight: 300, overflow: "auto" }}>
          {allWorkers.map((worker) => {
            const isSelected = selectedWorkerIds.includes(worker.id);
            return (
              <ListItem
                key={worker.id}
                button
                onClick={() => onToggleWorker(worker.id)}
                sx={{
                  borderRadius: "8px",
                  mb: 0.5,
                  bgcolor: isSelected
                    ? "rgba(37, 99, 235, 0.05)"
                    : "transparent",
                  "&:hover": {
                    bgcolor: isSelected
                      ? "rgba(37, 99, 235, 0.1)"
                      : "rgba(0,0,0,0.02)",
                  },
                }}
              >
                <ListItemText
                  primary={worker.name}
                  secondary={worker.code}
                  primaryTypographyProps={{
                    fontWeight: isSelected ? 700 : 500,
                  }}
                />
                <Checkbox edge="end" checked={isSelected} disableRipple />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={isPending}
          sx={{ borderRadius: "8px", fontWeight: 700 }}
        >
          {isPending ? <CircularProgress size={20} /> : "Lưu phân công"}
        </Button>
      </DialogActions>
    </Dialog>
  ),
);
WorkerAssignmentDialog.displayName = "WorkerAssignmentDialog";

export default WorkerAssignmentDialog;
