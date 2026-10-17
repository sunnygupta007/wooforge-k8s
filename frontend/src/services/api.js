import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wooforge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      localStorage.removeItem('wooforge_token');
      localStorage.removeItem('wooforge_user');
      window.dispatchEvent(new Event('auth_change'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username_or_email, password) => {
    const res = await api.post('/auth/login', { username_or_email, password });
    if (res.data.token) {
      localStorage.setItem('wooforge_token', res.data.token);
      localStorage.setItem('wooforge_user', JSON.stringify(res.data.user));
      window.dispatchEvent(new Event('auth_change'));
    }
    return res.data;
  },
  register: async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    if (res.data.token) {
      localStorage.setItem('wooforge_token', res.data.token);
      localStorage.setItem('wooforge_user', JSON.stringify(res.data.user));
      window.dispatchEvent(new Event('auth_change'));
    }
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('wooforge_token');
    localStorage.removeItem('wooforge_user');
    window.dispatchEvent(new Event('auth_change'));
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('wooforge_user');
    return userStr ? JSON.parse(userStr) : null;
  },
  getProfile: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};

export const storeService = {
  listStores: async () => {
    const res = await api.get('/stores');
    return res.data;
  },
  createStore: async (payload) => {
    const res = await api.post('/stores', payload);
    return res.data;
  },
  getStore: async (storeId) => {
    const res = await api.get(`/stores/${storeId}`);
    return res.data;
  },
  pollStatus: async (storeId) => {
    const res = await api.get(`/stores/${storeId}/status`);
    return res.data;
  },
  deleteStore: async (storeId) => {
    const res = await api.delete(`/stores/${storeId}`);
    return res.data;
  },
  listPresets: async () => {
    const res = await api.get('/presets');
    return res.data;
  },
  getLimits: async () => {
    const res = await api.get('/system/limits');
    return res.data;
  },
  getClusterStatus: async () => {
    const res = await api.get('/system/cluster');
    return res.data;
  }
};

export default api;
