import api from './api';

export const workerService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/workers', { params });
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/workers', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/workers/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/workers/${id}`);
        return data;
    }
};
