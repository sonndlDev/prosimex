import api from './api';

export const userService = {
    getAll: async () => {
        const { data } = await api.get('/users');
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/users', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/users/${id}`, payload);
        return data;
    },
    delete: async (id) => {
        const { data } = await api.delete(`/users/${id}`);
        return data;
    },
    getRoles: async () => {
        const { data } = await api.get('/users/roles');
        return data;
    },
    createRole: async (payload) => {
        const { data } = await api.post('/users/roles', payload);
        return data;
    },
    deleteRole: async (id) => {
        const { data } = await api.delete(`/users/roles/${id}`);
        return data;
    },
    updateProfile: async (payload) => {
        const { data } = await api.put('/users/profile/update', payload);
        return data;
    }
};
