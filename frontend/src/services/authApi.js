import api from './api.js';

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  getGoogleUrl: async () => {
    const res = await api.get('/auth/google/url');
    return res.data;
  },

  googleLogin: async (email, name) => {
    const res = await api.post('/auth/google', { email, name });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
};

export default authApi;
