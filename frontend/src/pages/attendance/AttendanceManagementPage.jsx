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
import { Loader2, Search, FilterX } from "lucide-react";
import { DateTime } from 'luxon';

export default function AttendanceManagementPage() {
  const [filters, setFilters] = useState({
    targetUserId: '',
    startDate: DateTime.now().startOf('month').toISODate(),
    endDate: DateTime.now().toISODate()
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userService.getAll
  });

  const { data: logs, isLoading: logsLoading, refetch } = useQuery({
    queryKey: ['attendanceLogsAdmin', filters],
    queryFn: () => attendanceService.getLogs(filters)
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({
      targetUserId: '',
      startDate: DateTime.now().startOf('month').toISODate(),
      endDate: DateTime.now().toISODate()
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">
          Quản lý Chấm công
        </h1>
      </div>

      {/* Filter Card */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nhân viên</label>
              <Select
                value={filters.targetUserId}
                onValueChange={(v) => handleFilterChange('targetUserId', v)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Tất cả nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_USERS">Tất cả nhân viên</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Từ ngày</label>
              <Input
                type="date"
                className="h-10"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Đến ngày</label>
              <Input
                type="date"
                className="h-10"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="md:col-span-3 flex gap-2">
              <Button 
                variant="default" 
                className="flex-1 h-10 font-bold gap-2"
                onClick={() => refetch()}
              >
                <Search className="w-4 h-4" />
                Tìm kiếm
              </Button>
              <Button 
                variant="outline" 
                className="h-10 px-3"
                onClick={resetFilters}
                title="Đặt lại bộ lọc"
              >
                <FilterX className="w-4 h-4 text-zinc-400" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <div className="rounded-xl border border-zinc-200 shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow>
              <TableHead className="font-bold py-4">Ngày</TableHead>
              <TableHead className="font-bold">Nhân viên</TableHead>
              <TableHead className="font-bold">Vào lúc</TableHead>
              <TableHead className="font-bold">Ra lúc</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="font-bold">Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang tải dữ liệu chấm công...
                  </div>
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                  Không tìm thấy dữ liệu chấm công nào trong khoảng thời gian này.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-zinc-50/50">
                  <TableCell className="font-medium">
                    {DateTime.fromISO(log.date).toFormat('dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="font-bold text-zinc-950">{log.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono bg-zinc-50 border-zinc-200">
                      {DateTime.fromISO(log.check_in_time).toFormat('HH:mm')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.check_out_time ? (
                      <Badge variant="outline" className="font-mono bg-emerald-50 text-emerald-700 border-emerald-200">
                        {DateTime.fromISO(log.check_out_time).toFormat('HH:mm')}
                      </Badge>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.check_out_time ? "success" : "warning"}>
                      {log.check_out_time ? 'Đã hoàn thành' : 'Đang làm việc'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-zinc-500 text-sm italic">
                    {log.note || <span className="text-zinc-300 not-italic">Không có ghi chú</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
