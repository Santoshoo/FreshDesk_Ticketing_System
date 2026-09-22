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

  getCategoryReport: async (scope) => {
    const res = await api.get('/dashboard/reports/category-wise', { params: { scope } });
    return res.data;
  },

  getGroupReport: async (scope) => {
    const res = await api.get('/dashboard/reports/group-wise', { params: { scope } });
    return res.data;
  },

  getAgentReport: async (scope) => {
    const res = await api.get('/dashboard/reports/agent-wise', { params: { scope } });
    return res.data;
  },
};

export default dashboardApi;
