import api from './api';

export const outsourcingService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/outsourcing', { params });
    return data;
  },
  getByCode: async (code) => {
    const { data } = await api.get(`/outsourcing/${code}`);
    return data;
  },
  create: async (payload) => {
    const { data } = await api.post('/outsourcing', payload);
    return data;
  },
  addReturn: async (id, payload) => {
    const { data } = await api.post(`/outsourcing/${id}/returns`, payload);
    return data;
  },
  updateReturn: async (returnId, payload) => {
    const { data } = await api.put(`/outsourcing/returns/${returnId}`, payload);
    return data;
  },
  deleteReturn: async (returnId) => {
    const { data } = await api.delete(`/outsourcing/returns/${returnId}`);
    return data;
  },
  exportDetailed: async (params = {}) => {
    const { data } = await api.get('/outsourcing/export-detailed', { params });
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.put(`/outsourcing/${id}`, payload);
    return data;
  },
  delete: async (id) => {
    const { data } = await api.delete(`/outsourcing/${id}`);
    return data;
  },
  getRemainingQuantity: async (orderId, productId) => {
    const { data } = await api.get('/outsourcing/remaining-quantity', { params: { order_id: orderId, product_id: productId } });
    return data;
  }
};
