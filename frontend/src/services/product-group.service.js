import api from './api';

export const productGroupService = {
    getAll: async (params = {}) => {
        const { data } = await api.get('/product-groups', { params });
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
    getOperations: async (groupId, { orderId, productId } = {}) => {
        const params = {};
        if (orderId) params.order_id = orderId;
        if (productId) params.product_id = productId;
        const { data } = await api.get(`/product-groups/${groupId}/operations`, { params });
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
    },
    getStageConfigs: async (groupId) => {
        const { data } = await api.get(`/product-groups/${groupId}/stage-configs`);
        return data;
    },
    saveStageConfigs: async (groupId, configs) => {
        const { data } = await api.put(`/product-groups/${groupId}/stage-configs`, { configs });
        return data;
    },
    exportGroups: async (params = {}) => {
        const { data } = await api.get('/product-groups/export', { params });
        return data;
    }
};
