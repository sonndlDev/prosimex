import api from './api';

export const supplierService = {
  getAll: async ({ search = "" } = {}) => {
    const { data } = await api.get("/suppliers", { params: { search } });
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post("/suppliers", payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await api.put(`/suppliers/${id}`, payload);
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/suppliers/${id}`);
    return data;
  }
};
