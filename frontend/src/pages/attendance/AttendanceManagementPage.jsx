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
import { Loader2, Search, FilterX, User, Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
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

export default function AttendanceManagementPage() {
  // Pagination State
  const [page, setPage] = useState(1);
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
    { id: "username", label: "Nhân viên", className: "font-bold text-zinc-950" },
    {
      id: "check_in_time",
      label: "Vào lúc",
      format: (val) => (
        <Badge variant="outline" className="font-mono bg-zinc-50 border-zinc-200">
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
      className: "max-w-[200px] truncate text-zinc-500 text-sm italic",
      format: (val) => val || <span className="text-zinc-300 not-italic">Không có ghi chú</span>
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản lý Chấm công</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Lịch sử ra vào của nhân viên</p>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nhân viên</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full h-10 justify-between bg-white border-zinc-200 font-bold"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <User className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate">
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
                      <CommandEmpty className="py-6 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">Không thấy nhân viên</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="ALL_USERS"
                          onSelect={() => handleFilterChange('targetUserId', 'ALL_USERS')}
                          className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                        >
                          <span className="text-xs font-bold">Tất cả nhân viên</span>
                          <Check
                            className={cn(
                              "h-4 w-4 text-indigo-600",
                              filters.targetUserId === 'ALL_USERS' ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                        {users?.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.username}
                            onSelect={() => handleFilterChange('targetUserId', String(user.id))}
                            className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700 transition-colors mb-1 last:mb-0"
                          >
                            <span className="text-xs font-bold">{user.username}</span>
                            <Check
                              className={cn(
                                "h-4 w-4 text-indigo-600",
                                String(filters.targetUserId) === String(user.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Từ ngày</label>
              <PremiumDatePicker
                date={filters.startDate}
                onSelect={(val) => handleFilterChange('startDate', val)}
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Đến ngày</label>
              <PremiumDatePicker
                date={filters.endDate}
                onSelect={(val) => handleFilterChange('endDate', val)}
              />
            </div>

            <div className="md:col-span-3 flex gap-2">
              <Button
                variant="outline"
                className="w-full h-10 px-3 font-bold border-zinc-200"
                onClick={resetFilters}
              >
                <FilterX className="w-4 h-4 mr-2 text-zinc-400" />
                Đặt lại
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table with GenericTable */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
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
