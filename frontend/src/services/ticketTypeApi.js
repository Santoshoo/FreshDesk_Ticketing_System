import api from './api.js';

export const ticketTypeApi = {
  list: async (params = {}) => {
    const res = await api.get('/ticket-types', { params });
    return res.data;
  },

  search: async (q, limit = 20) => {
    const res = await api.get('/ticket-types/search', { params: { q, limit } });
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/ticket-types', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/ticket-types/${id}`, data);
    return res.data;
  },
};

export default ticketTypeApi;
