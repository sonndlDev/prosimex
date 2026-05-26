import api from './api';

export const workerAssignmentService = {
    getAssignments: async (planId, date) => {
        const { data } = await api.get('/worker-assignments', { 
            params: { production_plan_id: planId, working_date: date } 
        });
        return data; // Array of workers
    },
    updateAssignments: async (payload) => {
        // payload: { production_plan_id, working_date, worker_ids: [] }
        const { data } = await api.post('/worker-assignments', payload);
        return data;
    }
};
