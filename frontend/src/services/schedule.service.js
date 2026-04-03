import api from './api';

export const scheduleService = {
    getCalendarData: async (startDate, endDate, factoryId = 'all', isUnassigned = false) => {
        const { data } = await api.get(`/machine-schedule/calendar`, {
            params: { 
                start_date: startDate, 
                end_date: endDate, 
                factory_id: factoryId,
                is_unassigned: isUnassigned
            }
        });
        return data;
    }
};
