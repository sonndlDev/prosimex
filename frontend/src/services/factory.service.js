import api from './api';

export const factoryService = {
    getAll: async () => {
        const { data } = await api.get('/factories');
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/factories', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/factories/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/factories/${id}`);
        return data;
    },
};
