import React, { useMemo, useRef, useEffect } from 'react';
import { DateTime } from 'luxon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

const COLUMN_WIDTH = 50; // px
const ROW_HEIGHT = 60;
const RESOURCE_WIDTH = 250;
const HEADER_HEIGHT = 80;

export default function CustomSchedule({ resources = [], events = [], dateRange }) {
    const scrollContainerRef = useRef(null);
    const headerRef = useRef(null);

    const start = useMemo(() => DateTime.fromISO(dateRange.start), [dateRange.start]);
    const end = useMemo(() => DateTime.fromISO(dateRange.end), [dateRange.end]);
    
    // Generate days once
    const days = useMemo(() => {
        const result = [];
        let current = start;
        while (current <= end) {
            result.push(current);
            current = current.plus({ days: 1 });
        }
        return result;
    }, [start, end]);

    const totalWidth = days.length * COLUMN_WIDTH;

    const getPosition = (date) => {
        const diff = date.diff(start, 'days').days;
        return diff * COLUMN_WIDTH;
    };

    // Calculate dynamic layouts (stacking overlaps into lanes)
    const { layouts, totalHeight } = useMemo(() => {
        // Group events by resource
        const eventsByResource = {};
        resources.forEach(r => eventsByResource[r.id] = []);
        events.forEach(e => {
            if (eventsByResource[e.resourceId]) {
                eventsByResource[e.resourceId].push(e);
            }
        });

        const layoutsList = [];
        let currentTop = 0;

        resources.forEach(resource => {
            const resEvents = [...eventsByResource[resource.id]].sort((a, b) => 
                DateTime.fromISO(a.start).toMillis() - DateTime.fromISO(b.start).toMillis()
            );

            const lanes = []; // Array of non-overlapping event groups

            const positionedEvents = resEvents.map(event => {
                const eventStart = DateTime.fromISO(event.start).toMillis();
                let assignedLaneIndex = -1;

                for (let i = 0; i < lanes.length; i++) {
                    const lastEventInLane = lanes[i][lanes[i].length - 1];
                    const laneEnd = DateTime.fromISO(lastEventInLane.end).toMillis();
                    if (eventStart >= laneEnd) {
                        assignedLaneIndex = i;
                        break;
                    }
                }

                if (assignedLaneIndex === -1) {
                    lanes.push([event]);
                    assignedLaneIndex = lanes.length - 1;
                } else {
                    lanes[assignedLaneIndex].push(event);
                }

                return { ...event, laneIndex: assignedLaneIndex };
            });

            const laneCount = Math.max(lanes.length, 1);
            const height = laneCount * ROW_HEIGHT;

            layoutsList.push({
                resourceId: resource.id,
                resource,
                top: currentTop,
                height,
                laneCount,
                events: positionedEvents
            });

            currentTop += height;
        });

        return { layouts: layoutsList, totalHeight: currentTop };
    }, [resources, events, start]);

    const handleScroll = (e) => {
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    return (
        <div className="h-full flex flex-col border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="flex border-b border-zinc-200 bg-zinc-50 shrink-0">
                <div className="w-[250px] min-w-[250px] p-4 border-r border-zinc-200 flex items-center justify-center font-black text-[10px] text-zinc-400 uppercase tracking-widest bg-zinc-50">
                    MÁY MÓC / THIẾT BỊ
                </div>
                <div 
                    ref={headerRef}
                    className="flex-1 overflow-hidden flex bg-zinc-100"
                >
                    <div style={{ width: totalWidth }} className="flex relative">
                        {days.map((day, i) => (
                            <div 
                                key={i} 
                                style={{ width: COLUMN_WIDTH, height: HEADER_HEIGHT }}
                                className={`min-w-[50px] border-r border-zinc-200 flex flex-col items-center justify-center transition-colors ${
                                    day.isWeekend ? 'bg-zinc-200/50' : (day.hasSame(DateTime.now(), 'day') ? 'bg-blue-50' : 'transparent')
                                }`}
                            >
                                <span className={`text-[8px] font-black uppercase ${day.isWeekend ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                    {day.toFormat('ccc')}
                                </span>
                                <span className={`text-base font-black ${day.hasSame(DateTime.now(), 'day') ? 'text-blue-600' : 'text-zinc-900'}`}>
                                    {day.day}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Resource Labels */}
                <div className="w-[250px] min-w-[250px] border-r border-zinc-200 bg-white flex flex-col z-10 shadow-[4px_0_8px_rgba(0,0,0,0.02)] overflow-y-auto">
                    {layouts.length === 0 ? (
                        <div className="p-8 text-center">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không có dữ liệu</span>
                        </div>
                    ) : (
                        layouts.map((layout, i) => (
                          <div 
                              key={layout.resourceId} 
                              style={{ height: layout.height }}
                              className={`px-4 flex items-center border-b border-zinc-100 transition-all duration-300 ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}
                          >
                              <span className="text-xs font-black text-zinc-800 truncate leading-tight uppercase tracking-tight">
                                  {layout.resource.title}
                              </span>
                          </div>
                      ))
                    )}
                </div>

                {/* Timeline Grid */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-auto relative bg-white"
                >
                    <div style={{ width: totalWidth, height: totalHeight }} className="relative">
                        {/* Vertical Lines */}
                        {days.map((day, i) => (
                            <div 
                                key={i} 
                                style={{ left: i * COLUMN_WIDTH, width: COLUMN_WIDTH }}
                                className={`absolute top-0 bottom-0 border-r border-zinc-100 pointer-events-none ${
                                    day.isWeekend ? 'bg-zinc-50/50' : 'transparent'
                                }`}
                            />
                        ))}

                        {/* Today Marker */}
                        {days.some(d => d.hasSame(DateTime.now(), 'day')) && (
                            <div style={{ left: getPosition(DateTime.now()) }} className="absolute top-0 bottom-0 w-[2px] bg-blue-500/40 z-20 pointer-events-none">
                                <div className="absolute top-0 left-[-4px] w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm shadow-blue-200" />
                            </div>
                        )}

                        {/* Horizontal Lines */}
                        {layouts.map((layout, i) => (
                            <div 
                                key={i} 
                                style={{ top: layout.top + layout.height }}
                                className="absolute left-0 right-0 h-[1px] bg-zinc-100 pointer-events-none"
                            />
                        ))}

                        {/* Events */}
                        <TooltipProvider>
                            {layouts.map(layout => 
                                layout.events.map(event => {
                                    const eStart = DateTime.fromISO(event.start);
                                    const eEnd = DateTime.fromISO(event.end);
                                    
                                    const isClippedLeft = eStart < start;
                                    const isClippedRight = eEnd > end;
                                    
                                    const renderStart = isClippedLeft ? start : eStart;
                                    const renderEnd = isClippedRight ? end : eEnd;
                                    
                                    const left = getPosition(renderStart);
                                    const right = getPosition(renderEnd);
                                    const width = Math.max(right - left, 4);

                                    return (
                                        <Tooltip key={event.id}>
                                            <TooltipTrigger asChild>
                                                <div 
                                                    style={{ 
                                                        top: layout.top + (event.laneIndex * ROW_HEIGHT) + 8,
                                                        left: left + (isClippedLeft ? 0 : 2),
                                                        width: width - (isClippedLeft ? 0 : 2) - (isClippedRight ? 0 : 2),
                                                        height: ROW_HEIGHT - 16,
                                                        backgroundColor: event.backgroundColor || '#2563eb',
                                                        borderRadius: `${isClippedLeft ? '0' : '8px'} ${isClippedRight ? '0' : '8px'} ${isClippedRight ? '0' : '8px'} ${isClippedLeft ? '0' : '8px'}`,
                                                    }}
                                                    className={`absolute flex items-center px-3 text-white text-[10px] font-black shadow-sm border border-white/20 cursor-pointer overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:z-30 hover:shadow-lg active:scale-100 z-10 ${isClippedLeft ? 'border-l-0' : ''} ${isClippedRight ? 'border-r-0' : ''}`}
                                                >
                                                    {isClippedLeft && <span className="mr-1 opacity-60">◀</span>}
                                                    <span className="truncate uppercase tracking-tighter">{event.title}</span>
                                                    {isClippedRight && <span className="ml-auto opacity-60">▶</span>}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-3 border-zinc-200 shadow-xl max-w-xs">
                                                <div className="space-y-2">
                                                    <p className="font-black text-indigo-600 uppercase tracking-tight leading-tight">{event.title}</p>
                                                    <Separator className="bg-zinc-100" />
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-zinc-500 flex justify-between">
                                                            <span>BẮT ĐẦU:</span>
                                                            <span className="text-zinc-950 font-black">{eStart.toFormat('dd/MM/yyyy HH:mm')}</span>
                                                        </p>
                                                        <p className="text-[10px] font-bold text-zinc-500 flex justify-between">
                                                            <span>KẾT THÚC:</span>
                                                            <span className="text-zinc-950 font-black">{eEnd.toFormat('dd/MM/yyyy HH:mm')}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })
                            )}
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}
