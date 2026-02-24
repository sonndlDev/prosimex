import api from './api';

export const dashboardService = {
    getMetrics: async () => {
        const { data } = await api.get('/dashboard/metrics');
        return data; // { totalOrders, activeMachines, activeUsers, activePlans }
    }
};
