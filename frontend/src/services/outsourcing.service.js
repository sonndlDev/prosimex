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
  exportDetailed: async (params = {}) => {
    const { data } = await api.get('/outsourcing/export-detailed', { params });
    return data;
  }
};
