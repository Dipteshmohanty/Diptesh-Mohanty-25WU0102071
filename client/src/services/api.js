import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('retail_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s to redirect to login if session expires
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if expired
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('retail_token');
        localStorage.removeItem('retail_user');
      }
    }
    const message = error.response?.data?.message || error.message || 'Network request failed';
    const errors = error.response?.data?.errors || null;
    return Promise.reject({ message, errors, status: error.response?.status });
  }
);

export default api;
