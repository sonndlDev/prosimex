import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

const TableSearchFilter = React.memo(({ onSearch, initialValue = "" }) => {
  const [val, setVal] = React.useState(initialValue);
  
  return (
    <form 
      onSubmit={(e) => { e.preventDefault(); onSearch(val); }} 
      className="flex items-center gap-2 w-full sm:w-auto"
    >
      <div className="relative w-full sm:w-64 group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
        <Input
          placeholder="Tìm kiếm..."
          value={val}
          onChange={e => setVal(e.target.value)}
          className="pl-9 bg-zinc-50/50 hover:bg-white focus:bg-white border-zinc-200/80 h-9 text-xs font-bold rounded-xl transition-all focus-visible:ring-indigo-500/30"
        />
      </div>
      
      <div className="flex items-center gap-1.5">
        <Button 
          type="submit" 
          size="sm" 
          className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95 border-none"
        >
          Lọc
        </Button>

        {val !== "" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline"
                  size="icon" 
                  onClick={() => { setVal(""); onSearch(""); }}
                  className="h-9 w-9 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 rounded-xl border-zinc-200/80 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-[10px] font-bold">Xóa tìm kiếm</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </form>
  )
});

export default function GenericTable({
  title,
  data = [],
  columns = [],
  isLoading,
  error,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
  actionColWidth = 120,
  // Pagination props
  isServerSide = false,
  totalItems = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  renderActions,
  maxHeight = "calc(100vh - 320px)",
  // Added selection props
  selectedRows,
  onSelectionChange,
  // Added sticky props
  freezeFirstCols = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelected, setInternalSelected] = useState([]);

  const isControlledSelection = selectedRows !== undefined && onSelectionChange !== undefined;
  const selected = isControlledSelection ? selectedRows : internalSelected;
  const setSelected = (val) => {
    if (isControlledSelection) {
      if (typeof val === 'function') {
        onSelectionChange(val(selected));
      } else {
        onSelectionChange(val);
      }
    } else {
      setInternalSelected(val);
    }
  };

  // Client-side pagination state (only used if !isServerSide)
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(10);

  const filteredData = isServerSide ? data : (data?.filter(row =>
    Object.values(row).some(val =>
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || []);

  const effectivePage = isServerSide ? page : clientPage;
  const effectivePageSize = isServerSide ? pageSize : clientPageSize;
  const effectiveTotal = isServerSide ? totalItems : filteredData.length;
  const totalPages = Math.ceil(effectiveTotal / effectivePageSize);

  const startIndex = (effectivePage - 1) * effectivePageSize;
  const paginatedData = isServerSide ? data : filteredData.slice(startIndex, startIndex + effectivePageSize);

  const allSelected = paginatedData.length > 0 && paginatedData.every(r => selected.includes(r.id));
  const someSelected = paginatedData.some(r => selected.includes(r.id)) && !allSelected;

  const handleSelectAll = (e) => {
    const idsOnPage = paginatedData.map(r => r.id);
    if (e.target.checked) {
      setSelected(prev => Array.from(new Set([...prev, ...idsOnPage])));
    } else {
      setSelected(prev => prev.filter(id => !idsOnPage.includes(id)));
    }
  };

  const handleSelect = (e, id) => {
    e.stopPropagation();
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSearch = (val) => {
    setSearchTerm(val);
    if (isServerSide) {
      if (onSearchChange) onSearchChange(val);
    } else {
      setClientPage(1);
    }
  };

  const handlePageChange = (newPage) => {
    if (isServerSide) {
      if (onPageChange) onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    if (isServerSide) {
      if (onPageSizeChange) onPageSizeChange(newSize);
    } else {
      setClientPageSize(newSize);
      setClientPage(1);
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex-1">
          {typeof title === 'string' ? (
            <div>
              <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">{title}</h2>
            </div>
          ) : title}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(onSearchChange !== undefined || !isServerSide) && (
            <TableSearchFilter onSearch={handleSearch} initialValue={searchTerm} />
          )}
          {onBulkDelete && selected.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold rounded-xl"
              onClick={() => { onBulkDelete(selected); setSelected([]); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa {selected.length} mục
            </Button>
          )}
          {onAdd && (
            <Button onClick={onAdd} size="sm" className="h-9 gap-1.5 font-bold shadow-sm rounded-xl">
              <Plus className="w-3.5 h-3.5" />
              Thêm mới
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight }}
        >
          <Table className={cn(freezeFirstCols && "table-fixed min-w-max")}>
            <TableHeader className="bg-zinc-100 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent border-b border-zinc-100">
                {onBulkDelete && (
                  <TableHead 
                    className={cn("px-4 text-center", freezeFirstCols && "sticky left-0 z-30 bg-zinc-100 border-r border-zinc-200")}
                    style={freezeFirstCols ? { width: '40px', minWidth: '40px', maxWidth: '40px', left: 0 } : undefined}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-zinc-300 accent-zinc-950 h-3.5 w-3.5"
                      checked={allSelected}
                      ref={el => el && (el.indeterminate = someSelected)}
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead 
                  className={cn("font-black text-[10px] uppercase tracking-widest text-zinc-400 text-center py-4", freezeFirstCols && "sticky left-[40px] z-30 bg-zinc-100 border-r border-zinc-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]")}
                  style={freezeFirstCols ? { width: '60px', minWidth: '60px', maxWidth: '60px', left: '40px' } : undefined}
                >
                  STT
                </TableHead>
                {columns.map(col => (
                  <TableHead
                    key={col.id}
                    className={cn(
                      "font-black text-[10px] uppercase tracking-widest text-zinc-400", 
                      col.className,
                      col.isSticky && "sticky z-30 bg-zinc-100 border-r border-zinc-200",
                      col.isLastSticky && "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)]"
                    )}
                    style={{ 
                      textAlign: col.align || 'left', 
                      width: col.width || (col.isSticky ? col.width : undefined),
                      minWidth: col.width || (col.isSticky ? col.width : (col.minWidth ? `${col.minWidth}px` : (freezeFirstCols ? '150px' : 'auto'))),
                      maxWidth: col.width || (col.isSticky ? col.width : undefined),
                      left: col.isSticky ? col.stickyLeft : undefined
                    }}
                  >
                    {col.label}
                  </TableHead>
                ))}
                {(onEdit || onDelete || renderActions) && (
                  <TableHead 
                    className="w-24 text-center font-black text-[10px] uppercase tracking-widest text-zinc-400"
                    style={freezeFirstCols ? { width: '96px', minWidth: '96px', maxWidth: '96px' } : undefined}
                  >
                    Thao tác
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {(onBulkDelete ? 1 : 0) + 1 + columns.length + (onEdit || onDelete ? 1 : 0) > 0 && Array.from({ length: (onBulkDelete ? 1 : 0) + 1 + columns.length + (onEdit || onDelete ? 1 : 0) }).map((_, j) => (
                      <TableCell key={j} className="py-4"><Skeleton className="h-5 w-full bg-zinc-100/50 rounded-lg" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (onBulkDelete ? 3 : 2)} className="h-64 text-center text-zinc-400 font-bold uppercase text-[10px] tracking-widest bg-zinc-50/30">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-zinc-100">
                        <Search className="w-8 h-8 text-zinc-200" />
                      </div>
                      <span>Không tìm thấy dữ liệu phù hợp</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => {
                  const isSelected = selected.includes(row.id);
                  const displayIndex = startIndex + index + 1;
                  return (
                    <TableRow key={row.id || index} className={cn("group transition-all duration-200", isSelected ? "bg-indigo-50" : "hover:bg-zinc-100 bg-white")}>
                      {onBulkDelete && (
                        <TableCell 
                          className={cn("px-4 text-center", freezeFirstCols && "sticky left-0 z-20 bg-white group-hover:bg-zinc-100 group-[.bg-indigo-50]:bg-indigo-50 border-r border-zinc-100")}
                          style={freezeFirstCols ? { width: '40px', minWidth: '40px', maxWidth: '40px', left: 0 } : undefined}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-zinc-300 accent-indigo-600 h-3.5 w-3.5 cursor-pointer"
                            checked={isSelected}
                            onChange={e => handleSelect(e, row.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell 
                        className={cn("text-center font-medium", freezeFirstCols && "sticky left-[40px] z-20 bg-white group-hover:bg-zinc-100 group-[.bg-indigo-50]:bg-indigo-50 border-r border-zinc-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]")}
                        style={freezeFirstCols ? { width: '60px', minWidth: '60px', maxWidth: '60px', left: '40px' } : undefined}
                      >
                        <span className="text-[11px] font-black text-zinc-400 tabular-nums">
                          {String(displayIndex).padStart(2, '0')}
                        </span>
                      </TableCell>
                      {columns.map(col => {
                        const value = row[col.id];
                        return (
                          <TableCell 
                            key={col.id} 
                            className={cn(
                              "text-[13px] font-semibold text-zinc-700 py-4", 
                              col.className,
                              col.isSticky && "sticky z-20 bg-white group-hover:bg-zinc-100 group-[.bg-indigo-50]:bg-indigo-50 border-r border-zinc-100",
                              col.isLastSticky && "shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]"
                            )} 
                            style={{ 
                              textAlign: col.align || 'left',
                              width: col.width || (col.isSticky ? col.width : undefined),
                              minWidth: col.width || (col.isSticky ? col.width : (col.minWidth ? `${col.minWidth}px` : (freezeFirstCols ? '150px' : 'auto'))),
                              maxWidth: col.width || (col.isSticky ? col.width : undefined),
                              left: col.isSticky ? col.stickyLeft : undefined
                            }}
                          >
                            {col.format ? col.format(value, row) : (value || '---')}
                          </TableCell>
                        );
                      })}
                      {(onEdit || onDelete || renderActions) && (
                        <TableCell style={freezeFirstCols ? { width: '96px', minWidth: '96px', maxWidth: '96px', textAlign: 'center' } : undefined}>
                          <div className="flex items-center justify-center gap-1 transition-all duration-200">
                            {renderActions ? renderActions(row) : (
                              <>
                                {onEdit && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={e => { e.stopPropagation(); onEdit(row); }}
                                        className="p-2 rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-indigo-100"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]"><p>Chỉnh sửa</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {onDelete && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger
                                        onClick={e => { e.stopPropagation(); onDelete(row); }}
                                        className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-red-100"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]"><p>Xóa bản ghi</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </>
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

        {/* Improved Pagination Controls - Matches PlanningPage Style */}
        <div className="px-6 py-3 bg-white border-t border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <p className="text-xs font-bold text-zinc-500">
              Tổng cộng: <span className="text-zinc-950 font-black">{effectiveTotal}</span> bản ghi
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hiển thị</span>
              <select
                value={effectivePageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                className="text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-300 transition-all"
              >
                {[5, 10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-zinc-500">
              Trang <span className="text-zinc-950 font-black">{effectivePage}</span> / {totalPages || 1}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-zinc-200 hover:bg-zinc-50 transition-all font-bold"
                disabled={effectivePage === 1}
                onClick={() => handlePageChange(effectivePage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-zinc-200 hover:bg-zinc-50 transition-all font-bold"
                disabled={effectivePage >= totalPages}
                onClick={() => handlePageChange(effectivePage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
