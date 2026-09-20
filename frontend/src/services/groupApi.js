import api from './api.js';

export const groupApi = {
  list: async (params = {}) => {
    const res = await api.get('/groups', { params });
    return res.data;
  },

  search: async (q, limit = 20) => {
    const res = await api.get('/groups/search', { params: { q, limit } });
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/groups', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/groups/${id}`, data);
    return res.data;
  },

  bulkCreate: async (groups) => {
    const res = await api.post('/groups/bulk', { groups });
    return res.data;
  },

  getAgentsByGroup: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/agents`, { params });
    return res.data;
  },
};

export default groupApi;
