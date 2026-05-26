import api from './api';

export const operationService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/operations', { params });
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/operations', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/operations/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/operations/${id}`);
        return data;
    },
};
