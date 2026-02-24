import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scheduleService } from '../../services/schedule.service';
import { factoryService } from '../../services/factory.service';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Box, Typography, Paper, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DateTime } from 'luxon';

export default function SchedulePage() {
    const [factoryId, setFactoryId] = useState('all');
    const [dateRange, setDateRange] = useState({
        start: DateTime.now().startOf('month').toISODate(),
        end: DateTime.now().endOf('month').toISODate()
    });

    const { data: factories } = useQuery({ queryKey: ['factories'], queryFn: factoryService.getAll });

    const { data: scheduleData, isLoading, error } = useQuery({
        queryKey: ['schedule', dateRange, factoryId],
        queryFn: () => scheduleService.getCalendarData(dateRange.start, dateRange.end, factoryId),
        keepPreviousData: true
    });

    const handleDatesSet = (dateInfo) => {
        setDateRange({
            start: DateTime.fromJSDate(dateInfo.start).toISODate(),
            end: DateTime.fromJSDate(dateInfo.end).toISODate()
        });
    };

    return (
        <Box height="calc(100vh - 100px)" display="flex" flexDirection="column">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                    Lịch sản xuất theo máy
                </Typography>
                
                <FormControl size="small" sx={{ width: 250 }}>
                    <InputLabel>Lọc theo nhà máy</InputLabel>
                    <Select value={factoryId} label="Lọc theo nhà máy" onChange={e => setFactoryId(e.target.value)}>
                        <MenuItem value="all"><em>Tất cả nhà máy</em></MenuItem>
                        {factories?.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message || 'Lỗi khi tải lịch sản xuất'}</Alert>}

            <Paper sx={{ flexGrow: 1, p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {isLoading && !scheduleData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box flexGrow={1} sx={{ 
                        '& .fc': { height: '100% !important' },
                        '& .fc-theme-standard th': { backgroundColor: '#f4f6f8' },
                        '& .fc-event': { cursor: 'pointer', borderRadius: '4px', border: 'none' } 
                    }}>
                        <FullCalendar
                            plugins={[resourceTimelinePlugin, interactionPlugin, dayGridPlugin]}
                            initialView="resourceTimelineMonth"
                            timeZone="local"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
                            }}
                            editable={false}
                            resourceAreaWidth="250px"
                            resourceAreaHeaderContent="Máy móc"
                            resources={scheduleData?.machines || []}
                            events={scheduleData?.events || []}
                            datesSet={handleDatesSet}
                            eventOverlap={true} // Allow multiple orders on same machine
                            slotMinTime="00:00:00"
                            slotMaxTime="24:00:00"
                            height="100%"
                            resourceOrder="title"
                        />
                    </Box>
                )}
            </Paper>
        </Box>
    );
}
