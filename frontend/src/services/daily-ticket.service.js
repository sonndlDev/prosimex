import api from './api';

export const dailyTicketService = {
    getAll: async (params = { page: 1, limit: 10 }) => {
        try {
            const queryParams = new URLSearchParams(params).toString();
            const { data } = await api.get(`/daily-tickets?${queryParams}`);
            return data;
        } catch (error) {
            console.error('Error fetching daily tickets:', error);
            throw error;
        }
    },

    getPlanVsActualReport: async (params = {}) => {
        try {
            const queryParams = new URLSearchParams(params).toString();
            const { data } = await api.get(`/daily-tickets/report/plan-vs-actual?${queryParams}`);
            return data;
        } catch (error) {
            console.error('Error fetching plan vs actual report:', error);
            throw error;
        }
    },

    getById: async (id) => {
        try {
            const { data } = await api.get(`/daily-tickets/${id}`);
            return data;
        } catch (error) {
            console.error('Error fetching ticket by id', error);
            throw error;
        }
    },

    create: async (payload) => {
        try {
            const { data } = await api.post('/daily-tickets', payload);
            return data;
        } catch (error) {
            console.error('Error creating daily ticket:', error);
            throw error;
        }
    },

    update: async (id, payload) => {
        try {
            const { data } = await api.put(`/daily-tickets/${id}`, payload);
            return data;
        } catch (error) {
            console.error('Error updating daily ticket:', error);
            throw error;
        }
    },

    updateResults: async (id, items) => {
        try {
            const { data } = await api.put(`/daily-tickets/${id}/results`, { items });
            return data;
        } catch (error) {
            console.error('Error updating ticket results:', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            const { data } = await api.delete(`/daily-tickets/${id}`);
            return data;
        } catch (error) {
            console.error('Error deleting ticket:', error);
            throw error;
        }
    }
};
