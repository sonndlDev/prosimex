import api from './api';

export const customerService = {
    getAll: async () => {
        const { data } = await api.get('/customers');
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/customers', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/customers/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/customers/${id}`);
        return data;
    },
};
