import api from './api';

export const attendanceService = {
    checkIn: async (note = '') => {
        const { data } = await api.post('/attendance/check-in', { note });
        return data;
    },
    checkOut: async () => {
        const { data } = await api.post('/attendance/check-out');
        return data;
    },
    getStatus: async () => {
        const { data } = await api.get('/attendance/today');
        return data;
    },
    getLogs: async (filters = {}) => {
        const { targetUserId, startDate, endDate } = filters;
        const { data } = await api.get('/attendance/logs', {
            params: { targetUserId, startDate, endDate }
        });
        return data;
    }
};
