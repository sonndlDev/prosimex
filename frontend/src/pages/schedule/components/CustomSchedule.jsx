import React, { useMemo, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Tooltip, Divider } from '@mui/material';
import { DateTime, Interval } from 'luxon';

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
                    // Simple overlap: if start is after previous end
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
        <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            overflow: 'hidden',
            bgcolor: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
            {/* Header */}
            <Box sx={{ display: 'flex', borderBottom: '1px solid #cbd5e1', bgcolor: '#f8fafc' }}>
                <Box sx={{ 
                    width: RESOURCE_WIDTH, 
                    minWidth: RESOURCE_WIDTH, 
                    p: 2, 
                    borderRight: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#475569',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em'
                }}>
                    MÁY MÓC
                </Box>
                <Box 
                    ref={headerRef}
                    sx={{ 
                        flexGrow: 1, 
                        overflow: 'hidden',
                        display: 'flex',
                        bgcolor: '#f1f5f9'
                    }}
                >
                    <Box sx={{ width: totalWidth, display: 'flex', position: 'relative' }}>
                        {days.map((day, i) => (
                            <Box 
                                key={i} 
                                sx={{ 
                                    width: COLUMN_WIDTH, 
                                    minWidth: COLUMN_WIDTH,
                                    height: HEADER_HEIGHT,
                                    borderRight: '1px solid #cbd5e1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: day.isWeekend ? '#cbd5e1' : (day.hasSame(DateTime.now(), 'day') ? '#dbeafe' : 'transparent'),
                                    transition: 'background 0.2s'
                                }}
                            >
                                <Typography variant="caption" sx={{ fontWeight: 800, color: day.isWeekend ? '#94a3b8' : '#64748b', fontSize: '0.6rem' }}>
                                    {day.toFormat('ccc').toUpperCase()}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 900, color: day.hasSame(DateTime.now(), 'day') ? 'primary.main' : '#1e293b' }}>
                                    {day.day}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Body */}
            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                {/* Resource Labels */}
                <Box sx={{ 
                    width: RESOURCE_WIDTH, 
                    minWidth: RESOURCE_WIDTH, 
                    borderRight: '1px solid #cbd5e1',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 2,
                    boxShadow: '4px 0 8px rgba(0,0,0,0.02)'
                }}>
                    {layouts.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Không có máy móc nào</Typography>
                        </Box>
                    ) : (
                        layouts.map((layout, i) => (
                            <Box 
                                key={layout.resourceId} 
                                sx={{ 
                                    height: layout.height, 
                                    minHeight: layout.height,
                                    p: '0 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: '1px solid #cbd5e1',
                                    bgcolor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                                    transition: 'height 0.3s ease'
                                }}
                            >
                                <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>
                                    {layout.resource.title}
                                </Typography>
                            </Box>
                        ))
                    )}
                </Box>

                {/* Timeline Grid */}
                <Box 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    sx={{ 
                        flexGrow: 1, 
                        overflow: 'auto',
                        position: 'relative',
                        bgcolor: '#ffffff'
                    }}
                >
                    <Box sx={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
                        {/* Vertical Lines */}
                        {days.map((day, i) => (
                            <Box 
                                key={i} 
                                sx={{ 
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: i * COLUMN_WIDTH,
                                    width: COLUMN_WIDTH,
                                    borderRight: '1px solid #cbd5e1',
                                    pointerEvents: 'none',
                                    bgcolor: day.isWeekend ? 'rgba(203, 213, 225, 0.4)' : 'transparent'
                                }}
                            />
                        ))}

                        {/* Today Marker */}
                        {days.some(d => d.hasSame(DateTime.now(), 'day')) && (
                            <Box sx={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: getPosition(DateTime.now()),
                                width: '2px',
                                bgcolor: 'rgba(37, 99, 235, 0.5)',
                                zIndex: 3,
                                pointerEvents: 'none',
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-4px',
                                    width: '10px',
                                    height: '10px',
                                    bgcolor: 'primary.main',
                                    borderRadius: '50%'
                                }
                            }} />
                        )}

                        {/* Horizontal Lines */}
                        {layouts.map((layout, i) => (
                            <Box 
                                key={i} 
                                sx={{ 
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: layout.top + layout.height,
                                    height: '1px',
                                    bgcolor: '#cbd5e1',
                                    pointerEvents: 'none'
                                }}
                            />
                        ))}

                        {/* Events grouped by layout to avoid redundant looping */}
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
                                    <Tooltip key={event.id} title={
                                        <Box sx={{ p: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={800} color="primary.light">{event.title}</Typography>
                                            <Divider sx={{ my: 0.5, bgcolor: 'rgba(255,255,255,0.1)' }} />
                                            <Typography variant="caption" display="block">Bắt đầu: {eStart.toFormat('dd/MM/yyyy HH:mm')}</Typography>
                                            <Typography variant="caption" display="block">Kết thúc: {eEnd.toFormat('dd/MM/yyyy HH:mm')}</Typography>
                                        </Box>
                                    } arrow>
                                        <Box 
                                            sx={{ 
                                                position: 'absolute',
                                                top: layout.top + (event.laneIndex * ROW_HEIGHT) + 8,
                                                left: left + (isClippedLeft ? 0 : 2),
                                                width: width - (isClippedLeft ? 0 : 2) - (isClippedRight ? 0 : 2),
                                                height: ROW_HEIGHT - 16,
                                                background: `linear-gradient(90deg, 
                                                    ${isClippedLeft ? 'rgba(0,0,0,0.1)' : 'transparent'} 0%, 
                                                    ${event.backgroundColor || '#2563eb'} ${isClippedLeft ? '10%' : '0%'}, 
                                                    ${event.backgroundColor || '#2563eb'} ${isClippedRight ? '90%' : '100%'}, 
                                                    ${isClippedRight ? 'rgba(0,0,0,0.1)' : 'transparent'} 100%)`,
                                                borderRadius: `${isClippedLeft ? '0' : '6px'} ${isClippedRight ? '0' : '6px'} ${isClippedRight ? '0' : '6px'} ${isClippedLeft ? '0' : '6px'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                px: isClippedLeft ? 1 : 1.5,
                                                color: '#ffffff',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderLeft: isClippedLeft ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                                borderRight: isClippedRight ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                zIndex: 1,
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    zIndex: 10,
                                                    boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)',
                                                    border: '1px solid rgba(255,255,255,0.4)',
                                                }
                                            }}
                                        >
                                            {isClippedLeft && (
                                                <Box sx={{ mr: 0.5, display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                                                    <svg width="6" height="10" viewBox="0 0 6 10">
                                                        <path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </Box>
                                            )}
                                            <Typography variant="caption" noWrap sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                                                {event.title}
                                            </Typography>
                                            {isClippedRight && (
                                                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                                                    <svg width="6" height="10" viewBox="0 0 6 10">
                                                        <path d="M1 1L5 5L1 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </Box>
                                            )}
                                        </Box>
                                    </Tooltip>
                                );
                            })
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
