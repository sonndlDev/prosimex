import api from './api';

export const planningService = {
    getAll: async () => {
        const { data } = await api.get('/production-plans');
        return data;
    },
    // The complex calculation endpoint handling transactions and distributions
    createPlan: async (payload) => {
        const { data } = await api.post('/production-plans', payload);
        return data;
    },
    getPlanDays: async (planId) => {
        const { data } = await api.get(`/production-plans/${planId}/days`);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/production-plans/${id}`);
        return data;
    },
};
