import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token and internal user context
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kims_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeUserId = localStorage.getItem('kims_active_user_id');
    if (activeUserId) {
      config.headers['x-user-id'] = activeUserId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kims_token');
      localStorage.removeItem('kims_active_user_id');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
