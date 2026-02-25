import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scheduleService } from '../../services/schedule.service';
import { factoryService } from '../../services/factory.service';
import { 
    Box, Typography, Paper, CircularProgress, Alert, 
    FormControl, InputLabel, Select, MenuItem,
    IconButton, Button, ButtonGroup
} from '@mui/material';
import { DateTime } from 'luxon';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
        keepPreviousData: true
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

            <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Calendar Header Controls */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <ButtonGroup size="small" variant="contained" sx={{ bgcolor: '#334155' }}>
                            <IconButton onClick={handlePrev} sx={{ color: 'white', borderRadius: '4px 0 0 4px', bgcolor: 'rgba(255,255,255,0.1)' }}>
                                <ChevronLeftIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={handleNext} sx={{ color: 'white', borderRadius: '0 4px 4px 0', bgcolor: 'rgba(255,255,255,0.1)' }}>
                                <ChevronRightIcon fontSize="small" />
                            </IconButton>
                        </ButtonGroup>
                        <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={handleToday}
                            sx={{ color: '#64748b', borderColor: '#e2e8f0', textTransform: 'none', fontWeight: 600 }}
                        >
                            today
                        </Button>
                    </Box>

                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
                        {title}
                    </Typography>

                    <ButtonGroup size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                        {['day', 'week', 'month'].map((view) => (
                            <Button
                                key={view}
                                onClick={() => setViewType(view)}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    bgcolor: viewType === view ? '#334155' : 'transparent',
                                    color: viewType === view ? 'white' : '#64748b',
                                    '&:hover': { bgcolor: viewType === view ? '#1e293b' : '#f8fafc' },
                                    borderColor: '#e2e8f0 !important'
                                }}
                            >
                                {view}
                            </Button>
                        ))}
                    </ButtonGroup>
                </Box>

                {error && <Alert severity="error">{error.message || 'Lỗi khi tải lịch sản xuất'}</Alert>}

                <Box flexGrow={1} sx={{ position: 'relative', minHeight: 0 }}>
                    {isLoading && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 5 }}>
                            <CircularProgress size={32} />
                        </Box>
                    )}
                    
                    <CustomSchedule 
                        resources={scheduleData?.machines || []} 
                        events={scheduleData?.events || []} 
                        dateRange={dateRange}
                        viewType={viewType}
                    />
                </Box>
            </Paper>
        </Box>
    );
}
