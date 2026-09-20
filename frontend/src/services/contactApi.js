import api from './api.js';

export const contactApi = {
  search: async (query, pageSize = 20) => {
    const res = await api.get('/contacts/search', {
      params: { q: query, pageSize },
    });
    return res.data;
  },
};

export default contactApi;
