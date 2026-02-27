import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Tooltip,
  Box,
  Typography,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import CircularProgress from "@mui/material/CircularProgress";

export default function DraggableSequenceTable({
  data = [],
  onReorder,
  onDelete,
  onUpdate,
  isLoading,
}) {
  const [editingId, setEditingId] = useState(null);
  const {
    control: editControl,
    reset: resetEdit,
    handleSubmit: handleEditSubmit,
  } = useForm({
    defaultValues: { dinh_muc: "", estimated_hours: "" },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={8}>
        <CircularProgress size={32} thickness={4} />
      </Box>
    );
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(data);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    const updated = reordered.map((item, index) => ({
      ...item,
      sequence_order: index + 1,
    }));

    onReorder(updated);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    resetEdit({ dinh_muc: row.dinh_muc, estimated_hours: row.estimated_hours });
  };

  const handleSave = (data) => {
    onUpdate(editingId, data);
    setEditingId(null);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "16px",
          overflow: "hidden",
          bgcolor: "rgba(0,0,0,0.01)",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "white" }}>
              <TableCell width={50}></TableCell>
              <TableCell
                width={60}
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  py: 2,
                }}
              >
                STT
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  py: 2,
                }}
              >
                Công đoạn
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  py: 2,
                }}
              >
                Máy
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  py: 2,
                }}
              >
                Định mức (sp/8h)
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  py: 2,
                }}
              >
                Giờ dự kiến
              </TableCell>
              <TableCell
                align="center"
                width={120}
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  py: 2,
                }}
              >
                Thao tác
              </TableCell>
            </TableRow>
          </TableHead>
          <Droppable droppableId="sequences">
            {(provided) => (
              <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                {data.map((row, index) => (
                  <Draggable
                    key={String(row.id)}
                    draggableId={String(row.id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{
                          bgcolor: snapshot.isDragging ? "white" : "white",
                          boxShadow: snapshot.isDragging
                            ? "0 8px 24px rgba(0,0,0,0.12)"
                            : "none",
                          "&:hover": { bgcolor: "rgba(37, 99, 235, 0.02)" },
                          transition: "all 0.2s ease",
                          display: snapshot.isDragging ? "table" : "table-row",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          ...provided.draggableProps.style,
                        }}
                      >
                        <TableCell {...provided.dragHandleProps} width={50}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "text.disabled",
                              "&:hover": { color: "primary.main" },
                            }}
                          >
                            <DragIndicatorIcon fontSize="small" />
                          </Box>
                        </TableCell>
                        <TableCell width={60}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="text.secondary"
                          >
                            {index + 1}
                          </Typography>
                        </TableCell>

                        {editingId === row.id ? (
                          <>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {row.operation_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {row.machine_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Controller
                                name="dinh_muc"
                                control={editControl}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    size="small"
                                    variant="outlined"
                                    type="number"
                                    sx={{
                                      width: 100,
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                      },
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Controller
                                name="estimated_hours"
                                control={editControl}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    size="small"
                                    variant="outlined"
                                    type="number"
                                    sx={{
                                      width: 100,
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "8px",
                                      },
                                    }}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box
                                display="flex"
                                justifyContent="center"
                                gap={1}
                              >
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: "success.main",
                                    bgcolor: "rgba(34, 197, 94, 0.1)",
                                    "&:hover": {
                                      bgcolor: "rgba(34, 197, 94, 0.2)",
                                    },
                                  }}
                                  onClick={handleEditSubmit(handleSave)}
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: "text.secondary",
                                    bgcolor: "rgba(0,0,0,0.05)",
                                    "&:hover": { bgcolor: "rgba(0,0,0,0.1)" },
                                  }}
                                  onClick={() => setEditingId(null)}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {row.operation_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {row.machine_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>
                                {row.dinh_muc}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {row.estimated_hours || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box
                                display="flex"
                                justifyContent="center"
                                gap={1}
                              >
                                <Tooltip title="Chỉnh sửa">
                                  <IconButton
                                    size="small"
                                    onClick={() => startEdit(row)}
                                    sx={{
                                      color: "primary.main",
                                      bgcolor: "rgba(37, 99, 235, 0.05)",
                                      "&:hover": {
                                        bgcolor: "rgba(37, 99, 235, 0.12)",
                                      },
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                  <IconButton
                                    size="small"
                                    onClick={() => onDelete(row.id)}
                                    sx={{
                                      color: "error.main",
                                      bgcolor: "rgba(239, 68, 68, 0.05)",
                                      "&:hover": {
                                        bgcolor: "rgba(239, 68, 68, 0.12)",
                                      },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </TableContainer>
    </DragDropContext>
  );
}
