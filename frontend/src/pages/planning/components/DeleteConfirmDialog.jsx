import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

const DeleteConfirmDialog = React.memo(
  ({ open, isPending, onClose, onConfirm }) => (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ fontWeight: 800 }}>Xác nhận xóa</DialogTitle>
      <DialogContent>
        <Typography>
          Bạn có chắc chắn muốn xóa kế hoạch sản xuất này không? Hành động này
          không thể hoàn tác.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Hủy bỏ
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isPending}
        >
          {isPending ? "Đang xóa..." : "Đồng ý xóa"}
        </Button>
      </DialogActions>
    </Dialog>
  ),
);
DeleteConfirmDialog.displayName = "DeleteConfirmDialog";

export default DeleteConfirmDialog;
