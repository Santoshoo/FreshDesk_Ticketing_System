import api from './api.js';

export const tagApi = {
  list: async (params = {}) => {
    const res = await api.get('/tags', { params });
    return res.data;
  },

  search: async (q, limit = 20) => {
    const res = await api.get('/tags/search', { params: { q, limit } });
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/tags', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/tags/${id}`, data);
    return res.data;
  },
};

export default tagApi;
