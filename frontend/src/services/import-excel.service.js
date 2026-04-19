import api from './api';

export const importExcelService = {
    importDailyTickets: async (rows) => {
        const { data } = await api.post('/import-excel/daily-tickets', { rows }, { timeout: 120000 });
        return data;
    },
    importMasterData: async (rows) => {
        const { data } = await api.post('/import-excel/master-data', { rows }, { timeout: 120000 });
        return data;
    },
    getImportHistory: async (params = {}) => {
        const { data } = await api.get('/import-excel/master-data/history', { params });
        return data;
    }
};
