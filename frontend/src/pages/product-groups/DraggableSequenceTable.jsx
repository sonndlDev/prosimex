import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  GripVertical, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Loader2,
  Settings2,
  Cpu,
  Hash,
  Activity
} from "lucide-react";

// Shadcn UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export default function DraggableSequenceTable({
  data = [],
  machinesList = [],
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
    defaultValues: { sequence_order: "", dinh_muc: "", machine_id: "" },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Đang tải cấu hình...</p>
      </div>
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
    resetEdit({ 
      sequence_order: row.sequence_order,
      dinh_muc: row.dinh_muc,
      machine_id: String(row.machine_id || "")
    });
  };

  const handleSave = (formData) => {
    onUpdate(editingId, {
        ...formData,
        machine_id: formData.machine_id === "" ? null : parseInt(formData.machine_id)
    });
    setEditingId(null);
  };

  return (
    <Card className="border-zinc-200 shadow-sm overflow-hidden bg-white rounded-2xl">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[80px] text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><Hash className="w-3 h-3"/> STT</div>
              </TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><Settings2 className="w-3 h-3"/> Công đoạn</div>
              </TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><Cpu className="w-3 h-3"/> Máy phụ trách</div>
              </TableHead>
              <TableHead className="text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center justify-end gap-1.5"><Activity className="w-3 h-3"/> Định mức (sp/8h)</div>
              </TableHead>
              <TableHead className="w-[140px] text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <Droppable droppableId="sequences">
            {(provided) => (
              <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-zinc-400 font-bold uppercase text-xs tracking-widest opacity-30">Chưa có công đoạn nào</TableCell>
                    </TableRow>
                ) : (
                    data.map((row, index) => (
                    <Draggable
                        key={String(row.id)}
                        draggableId={String(row.id)}
                        index={index}
                    >
                        {(provided, snapshot) => (
                        <TableRow
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`group transition-all duration-200 ${snapshot.isDragging ? "bg-white shadow-2xl scale-[1.01] z-50 border-y-indigo-200" : "bg-white"} hover:bg-zinc-50/50`}
                            style={{
                                ...provided.draggableProps.style,
                                display: snapshot.isDragging ? "table" : "table-row",
                            }}
                        >
                            <TableCell {...provided.dragHandleProps} className="w-[50px] text-center">
                                <GripVertical className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors mx-auto cursor-grab active:cursor-grabbing" />
                            </TableCell>
                            <TableCell className="w-[80px]">
                            {editingId === row.id ? (
                                <Controller
                                    name="sequence_order"
                                    control={editControl}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="number"
                                            className="h-9 w-16 font-black text-indigo-600 bg-white border-zinc-200"
                                        />
                                    )}
                                />
                            ) : (
                                <span className="font-black text-zinc-950 tabular-nums">
                                    {row.sequence_order}
                                </span>
                            )}
                            </TableCell>

                            {editingId === row.id ? (
                            <>
                                <TableCell>
                                    <span className="text-sm font-black text-zinc-950 uppercase tracking-tight">{row.operation_name}</span>
                                </TableCell>
                                <TableCell>
                                <Controller
                                    name="machine_id"
                                    control={editControl}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="h-9 w-[180px] bg-white border-zinc-200 font-bold text-xs">
                                                <SelectValue placeholder="Chọn máy" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">-- Không chọn --</SelectItem>
                                                {machinesList?.map((m) => (
                                                    <SelectItem key={m.id} value={String(m.id)}>
                                                        {m.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                </TableCell>
                                <TableCell className="text-right">
                                <Controller
                                    name="dinh_muc"
                                    control={editControl}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            type="number"
                                            className="h-9 w-24 ml-auto font-black text-emerald-600 text-right bg-white border-zinc-200"
                                        />
                                    )}
                                />
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            onClick={handleEditSubmit(handleSave)}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                                            onClick={() => setEditingId(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </>
                            ) : (
                            <>
                                <TableCell>
                                    <span className="text-sm font-black text-zinc-950 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                        {row.operation_name}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-zinc-500 uppercase">
                                            {row.machine_name || "---"}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="font-black text-emerald-600 tabular-nums">
                                        {parseFloat(row.dinh_muc).toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => startEdit(row)}
                                                        className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Chỉnh sửa</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => onDelete(row.id)}
                                                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Xóa công đoạn</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </>
                            )}
                        </TableRow>
                        )}
                    </Draggable>
                    ))
                )}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </DragDropContext>
    </Card>
  );
}
