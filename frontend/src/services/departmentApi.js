import api from './api.js';

export const departmentApi = {
  list: async (params = {}) => {
    const res = await api.get('/departments', { params });
    return res.data;
  },

  search: async (q, limit = 20) => {
    const res = await api.get('/departments/search', { params: { q, limit } });
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/departments', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/departments/${id}`, data);
    return res.data;
  },
};

export default departmentApi;
