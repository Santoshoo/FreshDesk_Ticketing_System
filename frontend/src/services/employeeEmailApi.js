import api from './api.js';

export const employeeEmailApi = {
  list: async (params = {}) => {
    const res = await api.get('/employee-emails', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/employee-emails/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/employee-emails', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.patch(`/employee-emails/${id}`, data);
    return res.data;
  },

  setStatus: async (id, isActive) => {
    const res = await api.patch(`/employee-emails/${id}/status`, { isActive });
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/employee-emails/${id}`);
    return res.data;
  },
};

export default employeeEmailApi;
