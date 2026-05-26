import api from './api';

export const dashboardService = {
    getMetrics: async () => {
        const { data } = await api.get('/dashboard/metrics', { params: { _t: Date.now() } });
        return data;
    },
    getActivities: async ({ page = 1, limit = 15 } = {}) => {
        const { data } = await api.get('/dashboard/activities', { params: { page, limit } });
        return data;
    }
};
