import api from './api';

export const planningService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/production-plans', { params });
        return data; // Returns { data, total, page, limit, totalPages }
    },
    // The complex calculation endpoint handling transactions and distributions
    createPlan: async (payload) => {
        const { data } = await api.post('/production-plans', payload);
        return data;
    },
    createBatchOrder: async (payload) => {
        const { data } = await api.post('/production-plans/batch-order', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/production-plans/${id}`, payload);
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
    clone: async (id) => {
        const { data } = await api.post(`/production-plans/clone/${id}`);
        return data;
    },
    stop: async (id, stopped_at) => {
        const { data } = await api.put(`/production-plans/${id}/stop`, { stopped_at });
        return data;
    },
    getPlannedStatus: async (orderId) => {
        const { data } = await api.get('/production-plans/planned-status', { params: { order_id: orderId } });
        return data; // [{ product_id, total_ops, planned_ops, all_planned }]
    },
};
