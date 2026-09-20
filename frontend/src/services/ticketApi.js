import api from './api.js';

export const ticketApi = {
  list: async (params = {}) => {
    const res = await api.get('/tickets', { params });
    return res.data;
  },

  listMy: async (params = {}) => {
    const res = await api.get('/tickets/my', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/tickets/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/tickets', data);
    return res.data;
  },

  addComment: async (ticketId, data) => {
    const res = await api.post(`/tickets/${ticketId}/comments`, data);
    return res.data;
  },

  updateStatus: async (ticketId, status) => {
    const res = await api.put(`/tickets/${ticketId}/status`, { status });
    return res.data;
  },

  updateAssignment: async (ticketId, data) => {
    const res = await api.put(`/tickets/${ticketId}/assign`, data);
    return res.data;
  },

  update: async (ticketId, data) => {
    const res = await api.put(`/tickets/${ticketId}`, data);
    return res.data;
  },

  delete: async (ticketId) => {
    const res = await api.delete(`/tickets/${ticketId}`);
    return res.data;
  },

  getLogs: async (params = {}) => {
    const res = await api.get('/tickets/logs', { params });
    return res.data;
  },
};

export default ticketApi;
