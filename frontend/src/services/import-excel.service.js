import api from './api';

export const importExcelService = {
    importDailyTickets: async (rows) => {
        const { data } = await api.post('/import-excel/daily-tickets', { rows });
        return data;
    },
    importMasterData: async (rows) => {
        const { data } = await api.post('/import-excel/master-data', { rows });
        return data;
    }
};
