import api from './api';

export const inventoryService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/product-inventory', { params });
        return data; // { data, total, page, limit }
    },
    save: async (payload) => {
        const { data } = await api.post('/product-inventory', payload);
        return data;
    }
};
