import api from './api.js';

export const agentApi = {
  list: async (params = {}) => {
    const res = await api.get('/agents', { params });
    return res.data;
  },

  getMyGroups: async () => {
    const res = await api.get('/agents/me/groups');
    return res.data;
  },

  updateAgentGroups: async (userId, groupIds, assignAgentRole = true) => {
    const res = await api.put(`/agents/${userId}/groups`, { groupIds, assignAgentRole });
    return res.data;
  },
};

export default agentApi;
