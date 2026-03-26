import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

export default function GenericTable({
  title,
  data,
  columns,
  isLoading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
  actionColWidth = 120,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState([]);

  const filteredData = data?.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const allSelected = filteredData?.length > 0 && selected.length === filteredData?.length;
  const someSelected = selected.length > 0 && selected.length < (filteredData?.length || 0);

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? filteredData.map(r => r.id) : []);
  };

  const handleSelect = (e, id) => {
    e.stopPropagation();
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (error) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-700">{error.message || 'Lỗi khi tải dữ liệu'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          {typeof title === 'string' ? (
            <div>
              <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">{title}</h2>
            </div>
          ) : title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-50"
            />
          </div>
          {onBulkDelete && selected.length > 0 && (
            <Button
              variant="outline"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold"
              onClick={() => { onBulkDelete(selected); setSelected([]); }}
            >
              <Trash2 className="w-4 h-4" />
              Xóa {selected.length} mục
            </Button>
          )}
          {onAdd && (
            <Button onClick={onAdd} className="gap-1.5 font-semibold">
              <Plus className="w-4 h-4" />
              Thêm mới
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              {onBulkDelete && (
                <TableHead className="w-10 px-3">
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 accent-zinc-950"
                    checked={allSelected}
                    ref={el => el && (el.indeterminate = someSelected)}
                    onChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-[60px] font-semibold">STT</TableHead>
              {columns.map(col => (
                <TableHead
                  key={col.id}
                  className={cn("font-semibold text-[11px] uppercase tracking-wider text-zinc-500", col.minWidth ? `min-w-[${col.minWidth}px]` : '')}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.label}
                </TableHead>
              ))}
              {(onEdit || onDelete) && (
                <TableHead className="w-24 text-center font-semibold text-[11px] uppercase tracking-wider text-zinc-500">
                  Thao tác
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columns.length + 2 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredData?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onBulkDelete ? 3 : 2)} className="h-32 text-center text-zinc-400 font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-zinc-300" />
                    <span>Không có dữ liệu phù hợp</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData?.map((row, index) => {
                const isSelected = selected.includes(row.id);
                return (
                  <TableRow key={row.id || index} className={cn("cursor-default", isSelected && "bg-zinc-50")}>
                    {onBulkDelete && (
                      <TableCell className="px-3">
                        <input
                          type="checkbox"
                          className="rounded border-zinc-300 accent-zinc-950"
                          checked={isSelected}
                          onChange={e => handleSelect(e, row.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-zinc-400 font-medium">{index + 1}</TableCell>
                    {columns.map(col => {
                      const value = row[col.id];
                      return (
                        <TableCell key={col.id} className="font-medium" style={{ textAlign: col.align || 'left' }}>
                          {col.format ? col.format(value, row) : value}
                        </TableCell>
                      );
                    })}
                    {(onEdit || onDelete) && (
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {onEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={e => { e.stopPropagation(); onEdit(row); }}
                                  className="p-1.5 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p>Chỉnh sửa</p></TooltipContent>
                            </Tooltip>
                          )}
                          {onDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={e => { e.stopPropagation(); onDelete(row); }}
                                  className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent><p>Xóa</p></TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
