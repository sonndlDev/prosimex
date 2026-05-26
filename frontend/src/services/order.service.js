import api from './api';

export const orderService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/orders', { params });
        return data;
    },
    getById: async (id) => {
        const { data } = await api.get(`/orders/${id}`);
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/orders', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/orders/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/orders/${id}`);
        return data;
    },
    getCompletionReport: async (id) => {
        const { data } = await api.get(`/orders/${id}/completion-report`);
        return data;
    },
    updateWarehouseDetails: async (id, payload) => {
        const { data } = await api.put(`/orders/${id}/warehouse-details`, payload);
        return data;
    },
    getSummaryReport: async (id) => {
        const { data } = await api.get(`/orders/${id}/summary-report`);
        return data;
    },
    getProductSnapshots: async (params = {}) => {
        const { data } = await api.get('/orders/product-snapshots', { params });
        return data;
    },
};
