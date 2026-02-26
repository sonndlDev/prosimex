import api from './api';

export const productGroupService = {
    getAll: async (factory_id = '') => {
        const { data } = await api.get(`/product-groups?factory_id=${factory_id}`);
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/product-groups', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/product-groups/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/product-groups/${id}`);
        return data;
    },
    // Map Operations
    getOperations: async (groupId) => {
        const { data } = await api.get(`/product-groups/${groupId}/operations`);
        return data;
    },
    addOperation: async (groupId, payload) => {
        const { data } = await api.post(`/product-groups/${groupId}/operations`, payload);
        return data;
    },
    removeOperation: async (groupId, mappingId) => {
        const { data } = await api.delete(`/product-groups/${groupId}/operations/${mappingId}`);
        return data;
    },
    updateOperation: async (groupId, mappingId, payload) => {
        const { data } = await api.put(`/product-groups/${groupId}/operations/${mappingId}`, payload);
        return data;
    },
    reorderOperations: async (groupId, orders) => {
        const { data } = await api.put(`/product-groups/${groupId}/operations/reorder`, { orders });
        return data;
    }
};
