import api from './api';

export const orderService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/orders', { params });
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
};
