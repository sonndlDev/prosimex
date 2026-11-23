import api from './api';

export const autoTicketScheduleService = {
    getAll: async () => {
        try {
            const { data } = await api.get('/auto-ticket-schedule');
            return data;
        } catch (error) {
            console.error('Error fetching auto ticket schedule rules:', error);
            throw error;
        }
    },

    create: async (payload) => {
        try {
            const { data } = await api.post('/auto-ticket-schedule', payload);
            return data;
        } catch (error) {
            console.error('Error creating auto ticket schedule rule:', error);
            throw error;
        }
    },

    updateStatus: async (id, status) => {
        try {
            const { data } = await api.patch(`/auto-ticket-schedule/${id}/status`, { status });
            return data;
        } catch (error) {
            console.error('Error updating auto ticket schedule rule status:', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            const { data } = await api.delete(`/auto-ticket-schedule/${id}`);
            return data;
        } catch (error) {
            console.error('Error deleting auto ticket schedule rule:', error);
            throw error;
        }
    },
};
