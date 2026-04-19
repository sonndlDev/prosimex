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
  Activity,
  Search,
  Layers
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
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
    defaultValues: { sequence_order: "", dinh_muc: "", machine_ids: [] },
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
      machine_ids: Array.isArray(row.machine_ids) ? row.machine_ids.map(String) : (row.machine_id ? [String(row.machine_id)] : [])
    });
  };

  const handleSave = (formData) => {
    onUpdate(editingId, {
      ...formData,
      dinh_muc: (formData.dinh_muc !== "" && formData.dinh_muc !== null && formData.dinh_muc !== undefined) ? parseFloat(formData.dinh_muc) : null,
      machine_ids: formData.machine_ids.map(Number)
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
                <div className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> STT</div>
              </TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><Settings2 className="w-3 h-3" /> Công đoạn</div>
              </TableHead>
              <TableHead className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> Máy phụ trách</div>
              </TableHead>
              <TableHead className="text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center justify-end gap-1.5"><Activity className="w-3 h-3" /> Định mức (sp/8h)</div>
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
                                  name="machine_ids"
                                  control={editControl}
                                  render={({ field }) => (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="min-h-9 h-auto py-2 w-full justify-between bg-white border-zinc-200 text-[10px] font-bold text-left">
                                          <div className="flex flex-wrap gap-1 pr-1">
                                            {field.value?.length > 0 ? (
                                              field.value.map(id => {
                                                const machine = machinesList?.find(m => String(m.id) === String(id));
                                                return (
                                                  <Badge key={id} variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[9px] px-1 py-0 h-4">
                                                    {machine?.name || id}
                                                  </Badge>
                                                );
                                              })
                                            ) : (
                                              <span className="text-zinc-400">Chọn máy...</span>
                                            )}
                                          </div>
                                          <Cpu className="h-3 w-3 opacity-50 shrink-0" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                          <Command className="w-full">
                                            <CommandInput placeholder="Tìm máy..." />
                                            <CommandList className="max-h-64 overflow-y-auto p-1">
                                              <CommandEmpty className="py-6 text-center">
                                                <Layers className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không tìm thấy máy</p>
                                              </CommandEmpty>
                                              <CommandGroup>
                                                {machinesList?.map((m) => (
                                                  <CommandItem
                                                    key={m.id}
                                                    onSelect={() => {
                                                      const current = field.value || [];
                                                      const next = current.includes(String(m.id))
                                                        ? current.filter(id => id !== String(m.id))
                                                        : [...current, String(m.id)];
                                                      field.onChange(next);
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 transition-colors mb-1 last:mb-0 group"
                                                  >
                                                    <Checkbox
                                                      id={`edit-m-${m.id}`}
                                                      checked={field.value?.includes(String(m.id))}
                                                      className="pointer-events-none"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-zinc-700">
                                                            {m.name}
                                                        </span>
                                                        <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-tighter">Máy sản xuất</span>
                                                    </div>
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                    </Popover>
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
                                <div className="flex flex-wrap gap-1 max-w-[280px]">
                                  {row.machine_names ? (
                                    (() => {
                                      const names = row.machine_names.split(", ");
                                      const displayLimit = 3;
                                      const displayNames = names.slice(0, displayLimit);
                                      const remainingCount = names.length - displayLimit;
                                      return (
                                        <>
                                          {displayNames.map((name, i) => (
                                            <Badge
                                              key={i}
                                              variant="secondary"
                                              className="text-[9px] font-black text-indigo-600 bg-indigo-50 border-indigo-100 uppercase tracking-tight px-1.5 py-0 h-4 whitespace-nowrap"
                                            >
                                              {name}
                                            </Badge>
                                          ))}
                                          {remainingCount > 0 && (
                                            <Badge variant="outline" className="text-[9px] font-bold text-zinc-400 border-dashed border-zinc-200 px-1.5 py-0 h-4">
                                              +{remainingCount}
                                            </Badge>
                                          )}
                                        </>
                                      );
                                    })()
                                  ) : row.machine_name ? (
                                    <Badge variant="secondary" className="text-[9px] font-bold text-zinc-500 bg-zinc-50 border-zinc-200 uppercase px-1.5 py-0 h-4">
                                      {row.machine_name}
                                    </Badge>
                                  ) : (
                                    <span className="text-[11px] font-bold text-zinc-300 italic">Tất cả máy</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-black text-emerald-600 tabular-nums">
                                  {row.dinh_muc !== null && row.dinh_muc !== undefined ? parseFloat(row.dinh_muc).toLocaleString() : "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center gap-1 transition-opacity">
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
