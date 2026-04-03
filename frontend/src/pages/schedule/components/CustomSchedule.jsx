import React, { useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { Separator } from "@/components/ui/separator";

const COLUMN_WIDTH = 50; // px
const ROW_HEIGHT = 25;
const RESOURCE_WIDTH = 250;
const HEADER_HEIGHT = 100;

export default function CustomSchedule({ resources = [], events = [], dateRange }) {
    const [hoveredEvent, setHoveredEvent] = useState(null);
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

    // Calculate total "công" per day
    const totalsByDay = useMemo(() => {
        const totals = {};
        events.forEach(event => {
            const dateStr = DateTime.fromISO(event.start).toISODate();
            const cong = parseFloat(event.planned_work_quantity) || 0;
            totals[dateStr] = (totals[dateStr] || 0) + cong;
        });
        return totals;
    }, [events]);

    const totalGridWidth = days.length * COLUMN_WIDTH;

    const getPosition = (date) => {
        // Use startOf('day') for both to get exact integer difference
        const diff = date.startOf('day').diff(start.startOf('day'), 'days').days;
        return Math.floor(diff) * COLUMN_WIDTH;
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

            // Pack events into lanes to minimize vertical space.
            // Only create new lanes if there is a time overlap between events.
            const lanes = []; // stores the end time (millis) of the last event in each lane
            const positionedEvents = resEvents.map(event => {
                const eventStart = DateTime.fromISO(event.start).toMillis();
                const eventEnd = DateTime.fromISO(event.end).toMillis();
                
                // Find the first lane where this event fits (no overlap)
                let laneIndex = lanes.findIndex(lastEnd => lastEnd <= eventStart);
                if (laneIndex === -1) {
                    laneIndex = lanes.length;
                    lanes.push(eventEnd);
                } else {
                    lanes[laneIndex] = eventEnd;
                }
                return { ...event, laneIndex };
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

    return (
        <div className="h-full w-full border border-zinc-200 rounded-xl overflow-auto bg-zinc-50/20 shadow-sm relative scrollbar-thin scrollbar-thumb-zinc-200">
            {/* The absolute container that actually defines the scrollable size */}
            <div style={{ width: RESOURCE_WIDTH + totalGridWidth, height: HEADER_HEIGHT + totalHeight }} className="relative bg-white">

                {/* 1. Header (Sticky Top) */}
                <div className="sticky top-0 z-40 bg-zinc-50 flex border-b border-zinc-200" style={{ height: HEADER_HEIGHT, width: RESOURCE_WIDTH + totalGridWidth }}>
                    {/* Top-Left Corner (Sticky Top and Left) */}
                    <div className="sticky left-0 z-50 bg-zinc-50 border-r border-zinc-200 h-full flex items-center justify-center p-4" style={{ width: RESOURCE_WIDTH }}>
                        <span className="font-black text-[10px] text-zinc-400 uppercase tracking-widest text-center">
                            MÁY MÓC / THIẾT BỊ
                        </span>
                    </div>

                    {/* Day Headers */}
                    <div className="flex bg-zinc-100/50">
                        {days.map((day, i) => (
                            <div
                                key={i}
                                style={{ width: COLUMN_WIDTH }}
                                className={`h-full border-r border-zinc-200 flex flex-col items-center justify-end pb-2 transition-colors ${day.isWeekend ? 'bg-zinc-200/50' : (day.hasSame(DateTime.now(), 'day') ? 'bg-blue-50' : 'transparent')
                                    }`}
                            >
                                <div className="mb-auto pt-2 flex flex-col items-center">
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded-full leading-none">
                                        {Number(totalsByDay[day.toISODate()] || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                    </span>
                                    <span className="text-[6px] font-black text-zinc-400 uppercase tracking-tighter mt-0.5">CÔNG</span>
                                </div>
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

                {/* 2. Body (Resource Labels and Timeline) */}
                <div className="relative">
                    {/* Sticky Resource Labels Column */}
                    <div className="sticky left-0 z-30 bg-white shadow-[4px_0_8px_rgba(0,0,0,0.02)]" style={{ width: RESOURCE_WIDTH }}>
                        {layouts.length === 0 ? (
                            <div className="p-8 text-center" style={{ height: 100 }}>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Không có dữ liệu</span>
                            </div>
                        ) : (
                            layouts.map((layout, i) => (
                                <div
                                    key={layout.resourceId}
                                    style={{ height: layout.height }}
                                    className={`px-4 flex items-center border-b border-zinc-100 border-r transition-all duration-300 ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}
                                >
                                    <span className="text-xs font-black text-zinc-800 truncate leading-tight uppercase tracking-tight">
                                        {layout.resource.title}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Timeline Grid (Absolute Layer Over Resources) */}
                    <div className="absolute top-0 pointer-events-none" style={{ left: RESOURCE_WIDTH, width: totalGridWidth, height: totalHeight }}>
                        {/* Vertical Lines */}
                        {days.map((day, i) => (
                            <div
                                key={i}
                                style={{ left: i * COLUMN_WIDTH, width: COLUMN_WIDTH }}
                                className={`absolute top-0 bottom-0 border-r border-zinc-100 ${day.isWeekend ? 'bg-zinc-50/50' : 'transparent'
                                    }`}
                            />
                        ))}

                        {/* Today Marker */}
                        {days.some(d => d.hasSame(DateTime.now(), 'day')) && (
                            <div style={{ left: getPosition(DateTime.now()) }} className="absolute top-0 bottom-0 w-[2px] bg-blue-500/40 z-20">
                                <div className="absolute top-0 left-[-4px] w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm shadow-blue-200" />
                            </div>
                        )}
                    </div>

                    {/* Events Layer (Pointer Events Active) */}
                    <div className="absolute top-0" style={{ left: RESOURCE_WIDTH, width: totalGridWidth, height: totalHeight }}>
                        {layouts.map(layout =>
                            layout.events.map(event => {
                                const eStart = DateTime.fromISO(event.start);
                                const left = getPosition(eStart);
                                const width = COLUMN_WIDTH;

                                return (
                                    <div
                                        key={event.id}
                                        style={{
                                            top: layout.top + (event.laneIndex * ROW_HEIGHT) + 4,
                                            left: left,
                                            width: width,
                                            height: ROW_HEIGHT - 8,
                                            backgroundColor: event.backgroundColor || '#2563eb',
                                        }}
                                        className="absolute flex flex-col items-center justify-center px-1 text-white text-[10px] font-black shadow-sm border border-white/20 cursor-pointer overflow-hidden z-10 hover:shadow-lg transition-shadow"
                                        onMouseEnter={() => setHoveredEvent({ ...event, layoutTop: layout.top, left, width })}
                                        onMouseLeave={() => setHoveredEvent(null)}
                                    >
                                        <span className="text-[12px] leading-tight font-black">
                                            {Number(event.planned_work_quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                        </span>
                                        <span className="text-[7px] opacity-80 truncate w-full text-center font-bold tracking-tighter uppercase">{event.product_name || event.title}</span>
                                    </div>
                                );
                            })
                        )}

                        {/* Custom Stable Tooltip */}
                        {hoveredEvent && (() => {
                            const eventTop = hoveredEvent.layoutTop + (hoveredEvent.laneIndex * ROW_HEIGHT);
                            // If the event is too close to the top (within 150px), show tooltip BELOW it.
                            const showBelow = eventTop < 150;

                            return (
                                <div
                                    style={{
                                        top: showBelow
                                            ? eventTop + (ROW_HEIGHT - 4) + 10 // Below the block
                                            : eventTop - 10, // Above the block
                                        left: hoveredEvent.left + (hoveredEvent.width / 2),
                                        transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                                    }}
                                    className="absolute z-[100] pointer-events-none"
                                >
                                    <div className="bg-zinc-950 p-3 shadow-2xl rounded-xl min-w-[220px] border border-zinc-800 space-y-3 relative">
                                        {!showBelow && (
                                            <div className="absolute bottom-[-6px] left-1/2 translate-x-[-50%] w-3 h-3 bg-zinc-950 border-r border-b border-zinc-800 rotate-45" />
                                        )}
                                        {showBelow && (
                                            <div className="absolute top-[-6px] left-1/2 translate-x-[-50%] w-3 h-3 bg-zinc-950 border-l border-t border-zinc-800 rotate-45" />
                                        )}

                                        <div>
                                            <p className="text-[8px] font-black text-white uppercase tracking-widest mb-1">Công đoạn</p>
                                            <p className="font-black text-blue-400 uppercase tracking-tight leading-tight text-[11px]">{hoveredEvent.operation_name || 'N/A'}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-zinc-800/50 pt-3">
                                            <div>
                                                <p className="text-[8px] font-black text-white uppercase tracking-widest mb-1">Mã hàng</p>
                                                <p className="text-[10px] font-black text-zinc-100 uppercase truncate">{hoveredEvent.product_name || hoveredEvent.title || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-white uppercase tracking-widest mb-1">PO</p>
                                                <p className="text-[10px] font-black text-zinc-100 uppercase truncate">{hoveredEvent.po_customer || 'N/A'}</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-zinc-800/50 pt-3">
                                            <p className="text-[8px] font-black text-white uppercase tracking-widest mb-1">Thời gian</p>
                                            <p className="text-[10px] font-black text-zinc-100">
                                                {DateTime.fromISO(hoveredEvent.start).toFormat('dd/MM/yyyy')}
                                            </p>
                                        </div>

                                        <div className="bg-blue-600 p-2 rounded-lg flex justify-between items-center shadow-lg shadow-blue-500/20">
                                            <span className="text-[8px] font-black text-blue-100 uppercase">SỐ CÔNG</span>
                                            <span className="text-sm font-black text-white">
                                                {Number(hoveredEvent.planned_work_quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Horizontal Divider Lines */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        {layouts.map((layout, i) => (
                            <div
                                key={i}
                                style={{ top: layout.top + layout.height }}
                                className="absolute left-0 right-0 h-[1px] bg-zinc-100"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
