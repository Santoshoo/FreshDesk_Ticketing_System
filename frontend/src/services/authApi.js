import api from './api.js';

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },


  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },

  changePassword: async (passwords) => {
    const res = await api.put('/auth/change-password', passwords);
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  forgotPassword: async (identifier) => {
    const res = await api.post('/auth/forgot-password', { identifier });
    return res.data;
  },

  resetPassword: async ({ identifier, otp, newPassword }) => {
    const res = await api.post('/auth/reset-password', { identifier, otp, newPassword });
    return res.data;
  },
};

export default authApi;
