import api from './api';

export const productService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/products', { params });
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/products', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/products/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/products/${id}`);
        return data;
    },
};
