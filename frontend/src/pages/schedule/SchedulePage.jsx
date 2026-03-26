import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scheduleService } from '../../services/schedule.service';
import { factoryService } from '../../services/factory.service';
import { DateTime } from 'luxon';
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Loader2, 
    AlertCircle,
    LayoutDashboard,
    Filter
} from 'lucide-react';

// Shadcn UI
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomSchedule from './components/CustomSchedule';

export default function SchedulePage() {
    const [factoryId, setFactoryId] = useState('all');
    const [viewType, setViewType] = useState('month'); // day, week, month
    const [currentDate, setCurrentDate] = useState(DateTime.now());

    const { data: factories } = useQuery({ queryKey: ['factories'], queryFn: factoryService.getAll });

    const dateRange = useMemo(() => {
        let start, end;
        if (viewType === 'day') {
            start = currentDate.startOf('day');
            end = currentDate.endOf('day');
        } else if (viewType === 'week') {
            start = currentDate.startOf('week');
            end = currentDate.endOf('week');
        } else {
            start = currentDate.startOf('month');
            end = currentDate.endOf('month');
        }
        return { start: start.toISODate(), end: end.toISODate() };
    }, [currentDate, viewType]);

    const { data: scheduleData, isLoading, error } = useQuery({
        queryKey: ['schedule', dateRange, factoryId],
        queryFn: () => scheduleService.getCalendarData(dateRange.start, dateRange.end, factoryId),
    });

    const handlePrev = () => {
        if (viewType === 'day') setCurrentDate(prev => prev.minus({ days: 1 }));
        else if (viewType === 'week') setCurrentDate(prev => prev.minus({ weeks: 1 }));
        else setCurrentDate(prev => prev.minus({ months: 1 }));
    };

    const handleNext = () => {
        if (viewType === 'day') setCurrentDate(prev => prev.plus({ days: 1 }));
        else if (viewType === 'week') setCurrentDate(prev => prev.plus({ weeks: 1 }));
        else setCurrentDate(prev => prev.plus({ months: 1 }));
    };

    const handleToday = () => setCurrentDate(DateTime.now());

    const title = useMemo(() => {
        if (viewType === 'day') return currentDate.toFormat('dd/MM/yyyy');
        if (viewType === 'week') {
            const start = currentDate.startOf('week');
            const end = currentDate.endOf('week');
            return `${start.toFormat('dd/MM')} - ${end.toFormat('dd/MM/yyyy')}`;
        }
        return currentDate.toFormat('MMMM yyyy');
    }, [currentDate, viewType]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4 px-2 py-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-100">
                        <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-zinc-950">Lịch sản xuất</h1>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gantt chart điều phối máy móc</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                        <Select value={factoryId} onValueChange={setFactoryId}>
                            <SelectTrigger className="pl-10 h-10 w-[240px] bg-white border-zinc-200 font-semibold shadow-sm">
                                <SelectValue placeholder="Lọc theo nhà máy" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả nhà máy</SelectItem>
                                {factories?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Card className="flex-1 flex flex-col border-zinc-200 shadow-sm overflow-hidden bg-white">
                <CardHeader className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
                            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 border-r border-zinc-100 rounded-none hover:bg-zinc-50">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-none hover:bg-zinc-50">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleToday}
                            className="h-9 font-bold px-4 border-zinc-200 bg-white hover:bg-zinc-50"
                        >
                            Hôm nay
                        </Button>
                    </div>

                    <CardTitle className="text-xl font-black text-zinc-950 uppercase tracking-tighter">
                        {title}
                    </CardTitle>

                    <Tabs value={viewType} onValueChange={setViewType} className="w-auto">
                        <TabsList className="bg-zinc-100 border border-zinc-200 h-9 p-1 rounded-lg">
                            <TabsTrigger value="day" className="px-4 text-xs font-bold rounded-md">Ngày</TabsTrigger>
                            <TabsTrigger value="week" className="px-4 text-xs font-bold rounded-md">Tuần</TabsTrigger>
                            <TabsTrigger value="month" className="px-4 text-xs font-bold rounded-md">Tháng</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>

                <CardContent className="flex-1 p-0 relative min-h-0 bg-zinc-50/20">
                    {error && (
                        <Alert variant="destructive" className="m-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Lỗi</AlertTitle>
                            <AlertDescription>{error.message || 'Lỗi khi tải dữ liệu lịch'}</AlertDescription>
                        </Alert>
                    )}

                    <div className="absolute inset-0 flex flex-col overflow-hidden">
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 z-50 backdrop-blur-[1px]">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Đang cập nhật biểu đồ...</p>
                            </div>
                        )}
                        
                        <div className="flex-1">
                            <CustomSchedule 
                                resources={scheduleData?.machines || []} 
                                events={scheduleData?.events || []} 
                                dateRange={dateRange}
                                viewType={viewType}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
