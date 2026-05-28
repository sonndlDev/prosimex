import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendance.service';
import { userService } from '../../services/user.service';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, FilterX, User, Calendar as CalendarIcon, Check, ChevronsUpDown, RotateCcw } from "lucide-react";
import { DateTime } from 'luxon';
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PremiumDatePicker } from "@/components/PremiumDatePicker";
import GenericTable from '@/components/GenericTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from "../../context/AuthContext";

export default function AttendanceManagementPage() {
  // Pagination State
  const [page, setPage] = useState(1);
  const { hasPermission } = useAuth();
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    targetUserId: '',
    startDate: DateTime.now().startOf('month').toISODate(),
    endDate: DateTime.now().toISODate()
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll({ limit: 1000 })
  });
  const users = usersData?.data || [];

  const { data: attendanceData, isLoading: logsLoading } = useQuery({
    queryKey: ['attendanceLogsAdmin', filters, page, pageSize],
    queryFn: () => attendanceService.getLogs({ ...filters, page, limit: pageSize })
  });
  const logs = attendanceData?.data || [];
  const totalItems = attendanceData?.total || 0;

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const resetFilters = () => {
    setFilters({
      targetUserId: '',
      startDate: DateTime.now().startOf('month').toISODate(),
      endDate: DateTime.now().toISODate()
    });
    setPage(1);
  };

  const columns = [
    {
      id: "date",
      label: "Ngày",
      format: (val) => DateTime.fromISO(val).toFormat('dd/MM/yyyy')
    },
    { id: "username", label: "Nhân viên", className: "font-bold text-[rgb(var(--c-ink))]" },
    {
      id: "check_in_time",
      label: "Vào lúc",
      format: (val) => (
        <Badge variant="outline" className="font-mono border-[rgb(var(--c-line-2))]">
          {DateTime.fromISO(val).toFormat('HH:mm')}
        </Badge>
      )
    },
    {
      id: "check_out_time",
      label: "Ra lúc",
      format: (val) => val ? (
        <Badge variant="outline" className="font-mono bg-emerald-50 text-emerald-700 border-emerald-200">
          {DateTime.fromISO(val).toFormat('HH:mm')}
        </Badge>
      ) : <span className="text-zinc-300">—</span>
    },
    {
      id: "status",
      label: "Trạng thái",
      format: (_, row) => (
        <Badge variant={row.check_out_time ? "success" : "warning"}>
          {row.check_out_time ? 'Đã hoàn thành' : 'Đang làm việc'}
        </Badge>
      )
    },
    {
      id: "note",
      label: "Ghi chú",
      className: "max-w-[200px] truncate text-[rgb(var(--c-ink-3))] text-sm italic",
      format: (val) => val || <span className="text-zinc-300 not-italic">Không có ghi chú</span>
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(var(--c-ink))", letterSpacing: "-0.01em" }}>Quản lý Chấm công</h2>
          <p style={{ fontSize: 11, color: "rgb(var(--c-ink-4))", marginTop: 2 }}>Lịch sử ra vào của nhân viên</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-50 p-4 rounded-lg border">
        <div className="flex flex-col xl:flex-row items-center gap-4">
          {/* Employee Picker */}
          <div className="w-full xl:w-[320px] shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full h-10 justify-between/50 border-[rgb(var(--c-line-2))]/80 rounded-xl font-bold hover:bg-white transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-black text-[rgb(var(--c-ink-4))] uppercase tracking-tighter">NV:</span>
                    <span className="truncate text-xs">
                      {!filters.targetUserId || filters.targetUserId === 'ALL_USERS'
                        ? "Tất cả nhân viên"
                        : users?.find(u => String(u.id) === String(filters.targetUserId))?.username}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                <Command className="w-full">
                  <CommandInput placeholder="Tìm nhân viên..." />
                  <CommandList className="max-h-[300px] p-1">
                    <CommandEmpty className="py-6 text-center text-xs font-bold text-[rgb(var(--c-ink-4))] uppercase tracking-widest">Không thấy nhân viên</CommandEmpty>
                    <CommandGroup>
                      {/* ... Items ... */}
                      <CommandItem
                        value="ALL_USERS"
                        onSelect={() => handleFilterChange('targetUserId', 'ALL_USERS')}
                        className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] transition-colors mb-1 last:mb-0"
                      >
                        <span className="text-xs font-bold">Tất cả nhân viên</span>
                        <Check className={cn("h-4 w-4 text-indigo-600", filters.targetUserId === 'ALL_USERS' ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                      {users?.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.username}
                          onSelect={() => handleFilterChange('targetUserId', String(user.id))}
                          className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] transition-colors mb-1 last:mb-0"
                        >
                          <span className="text-xs font-bold">{user.username}</span>
                          <Check className={cn("h-4 w-4 text-indigo-600", String(filters.targetUserId) === String(user.id) ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Picker Range */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-1/50 border border-[rgb(var(--c-line-2))]/80 rounded-xl px-3 h-10 group focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all shadow-sm overflow-hidden">
              <span className="text-[10px] font-black text-[rgb(var(--c-ink-4))] uppercase whitespace-nowrap tracking-tighter">Từ:</span>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
              />
            </div>
            <div className="flex items-center gap-1/50 border border-[rgb(var(--c-line-2))]/80 rounded-xl px-3 h-10 group focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all shadow-sm overflow-hidden">
              <span className="text-[10px] font-black text-[rgb(var(--c-ink-4))] uppercase whitespace-nowrap tracking-tighter">Đến:</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-8 border-none bg-transparent text-[10px] font-extrabold focus-visible:ring-0 p-0 w-full min-w-[90px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-10 h-10 p-0 border-[rgb(var(--c-line-2))]/80 text-[rgb(var(--c-ink-4))] hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p className="text-[10px] font-bold">Đặt lại bộ lọc</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-md shadow-indigo-100 transition-all active:scale-95"
              onClick={() => { }}
            >
              Lọc kết quả
            </Button>
          </div>
        </div>
      </div>

      {/* Logs Table with GenericTable */}
      <div className="table-container">
        <GenericTable
          data={logs}
          columns={columns}
          isLoading={logsLoading}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showActions={false}
        />
      </div>
    </div>
  );
}
