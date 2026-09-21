import api from './api.js';

export const userApi = {
  list: async (params = {}) => {
    const res = await api.get('/users', { params });
    return res.data;
  },

  search: async (q, limit = 20) => {
    const res = await api.get('/users/search', { params: { q, limit } });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/users', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },

  getRoles: async () => {
    const res = await api.get('/users/roles');
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/users/me');
    return res.data;
  },

  getActiveContext: async () => {
    const res = await api.get('/users/active-context');
    return res.data;
  },
};

export default userApi;
