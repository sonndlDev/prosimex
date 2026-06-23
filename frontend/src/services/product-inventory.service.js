import api from './api';

export const inventoryService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/product-inventory', { params });
        return data;
    },
    save: async (payload) => {
        const { data } = await api.post('/product-inventory', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/product-inventory/${id}`, payload);
        return data;
    },
    complete: async (id) => {
        const { data } = await api.patch(`/product-inventory/${id}/complete`);
        return data;
    },
    exportInventory: async (id, payload) => {
        const { data } = await api.post(`/product-inventory/${id}/export`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/product-inventory/${id}`);
        return data;
    }
};
