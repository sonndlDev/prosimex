import api from './api';

export const machineService = {
    getAll: async (factory_id = '') => {
        const { data } = await api.get(`/machines?factory_id=${factory_id}`);
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/machines', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/machines/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/machines/${id}`);
        return data;
    },
};
