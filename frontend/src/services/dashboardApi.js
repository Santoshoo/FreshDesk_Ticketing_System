import api from './api.js';

export const dashboardApi = {
  getSummary: async (scope) => {
    const res = await api.get('/dashboard/summary', { params: { scope } });
    return res.data;
  },

  getRecentTickets: async (scope, limit = 8) => {
    const res = await api.get('/dashboard/recent-tickets', { params: { scope, limit } });
    return res.data;
  },

  getTrend: async (scope, days = 7) => {
    const res = await api.get('/dashboard/trend', { params: { scope, days } });
    return res.data;
  },
};

export default dashboardApi;
