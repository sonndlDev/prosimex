import React, { useState, useEffect } from 'react';import { toast } from "sonner";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendance.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, LogOut, History, Clock, CheckCircle2 } from 'lucide-react';
import { DateTime } from 'luxon';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [currentTime, setCurrentTime] = useState(DateTime.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(DateTime.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['attendanceToday'],
    queryFn: attendanceService.getStatus,
  });
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['attendanceLogs'],
    queryFn: attendanceService.getLogs,
  });
  const logs = logsData?.data || [];

  const checkInMutation = useMutation({
    mutationFn: attendanceService.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
      setNote('');
    },
  });
  const checkOutMutation = useMutation({
    mutationFn: attendanceService.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceToday'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceLogs'] });
    },
  });

  const hasCheckedIn = !!todayStatus;
  const hasCheckedOut = !!todayStatus?.check_out_time;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900, margin: "0 auto" }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "rgb(var(--c-ink))", letterSpacing: "-0.01em" }}>Chấm công</h2>
        <p className="text-[rgb(var(--c-ink-3))] text-sm font-medium mt-0.5">Theo dõi giờ vào/ra của bạn hàng ngày</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check-in Card */}
        <Card className="overflow-hidden">
          {/* Clock header */}
          <div className="py-8 text-center" style={{ background: 'rgb(var(--c-s2))', borderBottom: '1px solid rgb(var(--c-line))' }}>
            <p className="text-5xl font-extrabold tracking-tight font-mono">{currentTime.toFormat('HH:mm:ss')}</p>
            <p className="text-blue-200 text-sm font-medium mt-2">{currentTime.toFormat('cccc, dd/MM/yyyy')}</p>
          </div>

          <CardContent className="p-6">
            {statusLoading ? (
              <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : !hasCheckedIn ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-[rgb(var(--c-ink))] mb-1">Chấm công vào</h3>
                  <p className="text-[rgb(var(--c-ink-3))] text-sm">Nhấn nút bên dưới để bắt đầu ngày làm việc của bạn.</p>
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú buổi sáng (không bắt buộc)..."
                  className="w-full rounded-md border border-[rgb(var(--c-line-2))] px-3 py-2 text-sm placeholder:text-[rgb(var(--c-ink-4))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 resize-none"
                />
                <Button
                  className="w-full gap-2 h-12 text-base font-bold bg-blue-600 hover:bg-blue-500"
                  onClick={() => { if (window.confirm('Xác nhận chấm công vào?')) checkInMutation.mutate(note); }}
                  disabled={checkInMutation.isPending}
                >
                  <LogIn className="w-5 h-5" /> Bắt đầu làm việc (Check-in)
                </Button>
              </div>
            ) : !hasCheckedOut ? (
              <div className="space-y-4">
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-700 font-medium ml-2">
                    Đã check-in vào lúc <b>{DateTime.fromISO(todayStatus.check_in_time).toFormat('HH:mm')}</b>. Chúc ngày làm việc hiệu quả!
                  </AlertDescription>
                </Alert>
                <div>
                  <h3 className="font-bold text-[rgb(var(--c-ink))] mb-1">Chấm công ra</h3>
                  <p className="text-[rgb(var(--c-ink-3))] text-sm">Khi kết thúc, nhấn nút để hoàn tất ngày làm việc.</p>
                </div>
                <Button
                  className="w-full gap-2 h-12 text-base font-bold bg-orange-500 hover:bg-orange-400"
                  onClick={() => { if (window.confirm('Xác nhận chấm công ra?')) checkOutMutation.mutate(); }}
                  disabled={checkOutMutation.isPending}
                >
                  <LogOut className="w-5 h-5" /> Kết thúc làm việc (Check-out)
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                <h3 className="text-xl font-extrabold text-[rgb(var(--c-ink))]">Đã hoàn thành!</h3>
                <p className="text-[rgb(var(--c-ink-4))] text-sm">Bạn đã hoàn tất chấm công cho ngày hôm nay.</p>
                <div className="flex items-center gap-6 mt-2">
                  <div>
                    <p className="text-xs text-[rgb(var(--c-ink-4))] uppercase font-bold tracking-wider">Giờ vào</p>
                    <p className="text-2xl font-extrabold text-[rgb(var(--c-ink))]">{DateTime.fromISO(todayStatus.check_in_time).toFormat('HH:mm')}</p>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div>
                    <p className="text-xs text-[rgb(var(--c-ink-4))] uppercase font-bold tracking-wider">Giờ ra</p>
                    <p className="text-2xl font-extrabold text-[rgb(var(--c-ink))]">{DateTime.fromISO(todayStatus.check_out_time).toFormat('HH:mm')}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Card */}
        <Card>
          <div className="section-header">
            <div style={{ width:32, height:32, borderRadius:6, background:"rgb(var(--c-s3))", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <History className="w-4 h-4 text-[rgb(var(--c-ink-2))]" />
            </div>
            <h3 className="font-bold text-[rgb(var(--c-ink))]">Lịch sử 30 ngày gần đây</h3>
          </div>
          <CardContent className="p-0 max-h-[480px] overflow-y-auto">
            {logsLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : logs?.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2 text-[rgb(var(--c-ink-4))]">
                <Clock className="w-8 h-8" />
                <p className="text-sm font-medium">Chưa có dữ liệu chấm công</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[rgb(var(--c-s2))]">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[rgb(var(--c-ink))] text-sm">{DateTime.fromISO(log.date).toFormat('dd/MM/yyyy')}</p>
                        <Badge className={log.check_out_time ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[10px] font-bold" : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 text-[10px] font-bold"}>
                          {log.check_out_time ? 'Đã hoàn thành' : 'Đang làm việc'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[rgb(var(--c-ink-4))] font-medium mt-0.5">
                        Vào: <span className="text-[rgb(var(--c-ink-2))] font-semibold">{DateTime.fromISO(log.check_in_time).toFormat('HH:mm')}</span>
                        {log.check_out_time && <> · Ra: <span className="text-[rgb(var(--c-ink-2))] font-semibold">{DateTime.fromISO(log.check_out_time).toFormat('HH:mm')}</span></>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
