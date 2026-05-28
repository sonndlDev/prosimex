import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../../services/schedule.service';
import { planningService } from '../../services/planning.service';
import { factoryService } from '../../services/factory.service';
import { toast } from 'sonner';
import { DateTime } from 'luxon';
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Loader2, 
    AlertCircle,
    LayoutDashboard,
    Filter,
    Check,
    ChevronsUpDown,
    Factory
} from 'lucide-react';
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
    const queryClient = useQueryClient();
    const [factoryId, setFactoryId] = useState('all');
    const [activeTab, setActiveTab] = useState('assigned'); // assigned, unassigned
    const [rangeStart, setRangeStart] = useState(() => DateTime.now().startOf('day'));

    const { data: factories } = useQuery({ queryKey: ['factories'], queryFn: factoryService.getAll });
    const factoriesArray = Array.isArray(factories) ? factories : [];

    const dateRange = useMemo(() => {
        const today = DateTime.now().startOf('day');
        const start = rangeStart < today ? today : rangeStart;
        const end = start.plus({ months: 1 });
        return { start: start.toISODate(), end: end.toISODate() };
    }, [rangeStart]);

    const { data: scheduleData, isLoading, error } = useQuery({
        queryKey: ['schedule', dateRange, factoryId, activeTab],
        queryFn: () => scheduleService.getCalendarData(
            dateRange.start, 
            dateRange.end, 
            factoryId, 
            activeTab === 'unassigned'
        ),
    });

    const stopMutation = useMutation({
        mutationFn: ({ id, stopped_at }) => planningService.stop(id, stopped_at),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            toast.success("Đã dừng công đoạn thành công");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi dừng công đoạn"),
    });

    const handleStop = (id, date) => {
        stopMutation.mutate({ id, stopped_at: date });
    };

    const handlePrev = () => {
        const today = DateTime.now().startOf('day');
        setRangeStart((prev) => {
            const next = prev.minus({ months: 1 });
            return next < today ? today : next;
        });
    };

    const handleNext = () => {
        setRangeStart((prev) => prev.plus({ months: 1 }));
    };

    const handleToday = () => setRangeStart(DateTime.now().startOf('day'));

    const canGoPrev = useMemo(() => {
        const today = DateTime.now().startOf('day');
        return rangeStart > today;
    }, [rangeStart]);

    const title = useMemo(() => {
        const start = DateTime.fromISO(dateRange.start);
        const end = DateTime.fromISO(dateRange.end);
        return `${start.toFormat('dd/MM/yyyy')} - ${end.toFormat('dd/MM/yyyy')}`;
    }, [dateRange]);

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4 px-2 py-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                        <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-[rgb(var(--c-ink))]">Lịch sản xuất</h1>
                        <p className="text-xs font-bold text-[rgb(var(--c-ink-4))] uppercase tracking-widest mt-0.5">Gantt chart điều phối máy móc</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                        <TabsList className="bg-[rgb(var(--c-s2))] p-1 rounded-full border border-[rgb(var(--c-line-2))] h-12 shadow-inner flex">
                            <TabsTrigger 
                                value="assigned" 
                                className={cn(
                                    "px-8 font-black rounded-full py-2 transition-all text-[10px] uppercase tracking-widest",
                                    activeTab === "assigned"
                                        ? "bg-[rgb(var(--c-s4))] text-[rgb(var(--c-blue))]"
                                        : "text-[rgb(var(--c-ink-4))] hover:text-[rgb(var(--c-ink-2))]"
                                )}
                            >
                                Theo máy
                            </TabsTrigger>
                            <TabsTrigger 
                                value="unassigned" 
                                className={cn(
                                    "px-8 font-black rounded-full py-2 transition-all text-[10px] uppercase tracking-widest",
                                    activeTab === "unassigned"
                                        ? "bg-white text-orange-600 shadow-md"
                                        : "text-[rgb(var(--c-ink-4))] hover:text-[rgb(var(--c-ink-2))]"
                                )}
                            >
                                Chưa gán máy
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="w-px h-8 bg-[rgb(var(--c-s3))] hidden md:block"></div>

                    <div className="relative flex-1 md:flex-none">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-[240px] h-10 justify-between font-bold shadow-sm"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Factory className="h-4 w-4 text-indigo-500 shrink-0" />
                                        <span className="truncate">
                                            {factoryId === 'all' ? "Tất cả nhà máy" : factories?.find(f => String(f.id) === String(factoryId))?.name}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0 shadow-2xl border-indigo-50 rounded-xl overflow-hidden" align="start">
                                <Command className="w-full">
                                    <CommandInput placeholder="Tìm nhà máy..." />
                                    <CommandList className="max-h-[300px] p-1">
                                        <CommandEmpty className="py-6 text-center text-xs font-bold text-[rgb(var(--c-ink-4))] uppercase tracking-widest">Không thấy nhà máy</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => setFactoryId('all')}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] transition-colors mb-1 last:mb-0"
                                            >
                                                <span className="text-xs font-bold">Tất cả nhà máy</span>
                                                <Check
                                                    className={cn(
                                                        "h-4 w-4 text-indigo-600",
                                                        factoryId === 'all' ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                            </CommandItem>
                                            {factoriesArray.map((f) => (
                                                <CommandItem
                                                    key={f.id}
                                                    value={f.name}
                                                    onSelect={() => setFactoryId(String(f.id))}
                                                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-[rgb(var(--c-blue)/0.1)] aria-selected:text-[rgb(var(--c-blue))] transition-colors mb-1 last:mb-0"
                                                >
                                                    <span className="text-xs font-bold">{f.name}</span>
                                                    <Check
                                                        className={cn(
                                                            "h-4 w-4 text-indigo-600",
                                                            String(factoryId) === String(f.id) ? "opacity-100" : "opacity-0"
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
                </div>
            </div>

            <Card className="flex-1 flex flex-col border-[rgb(var(--c-line-2))] shadow-sm overflow-hidden">
                <CardHeader className="px-6 py-4 border-b border-[rgb(var(--c-line-2))] flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-[rgb(var(--c-line-2))] shadow-sm overflow-hidden">
                            <Button variant="ghost" size="icon" onClick={handlePrev} disabled={!canGoPrev} className="h-9 w-9 border-r border-[rgb(var(--c-line))] rounded-none hover:bg-[rgb(var(--c-s2))] disabled:opacity-40">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-none hover:bg-[rgb(var(--c-s2))]">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleToday}
                            className="h-9 font-bold px-4 border-[rgb(var(--c-line-2))] hover:bg-[rgb(var(--c-s2))]"
                        >
                            Hôm nay
                        </Button>
                    </div>

                    <CardTitle className="text-xl font-black text-[rgb(var(--c-ink))] uppercase tracking-tighter">
                        {title}
                    </CardTitle>

                    <div className="text-[10px] font-black text-[rgb(var(--c-ink-4))] uppercase tracking-widest px-2">
                        {DateTime.fromISO(dateRange.end).diff(DateTime.fromISO(dateRange.start), 'days').days + 1} ngày
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 relative min-h-0/20">
                    {error && (
                        <Alert variant="destructive" className="m-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Lỗi</AlertTitle>
                            <AlertDescription>{error.message || 'Lỗi khi tải dữ liệu lịch'}</AlertDescription>
                        </Alert>
                    )}

                    <div className="absolute inset-0 flex flex-col overflow-hidden">
                        {isLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center/60 z-50 backdrop-blur-[1px]">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                                <p className="text-xs font-black text-[rgb(var(--c-ink-4))] uppercase tracking-widest">Đang cập nhật biểu đồ...</p>
                            </div>
                        )}
                        
                        <div className="flex-1 min-h-0">
                            <CustomSchedule 
                                resources={scheduleData?.machines || []} 
                                events={scheduleData?.events || []} 
                                dateRange={dateRange}
                                onStop={handleStop}
                                isStopping={stopMutation.isPending}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
