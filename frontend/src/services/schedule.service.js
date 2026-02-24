import api from './api';

export const scheduleService = {
    getCalendarData: async (startDate, endDate, factoryId = 'all') => {
        const { data } = await api.get(`/machine-schedule/calendar`, {
            params: { start_date: startDate, end_date: endDate, factory_id: factoryId }
        });
        return data;
    }
};
