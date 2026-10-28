import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Auto-attach JWT token if present
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers.get?.('Authorization') && !config.headers.Authorization && !config.headers.authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const authorization = error.config?.headers?.get?.('Authorization') || error.config?.headers?.Authorization || error.config?.headers?.authorization;
    if (error.response?.status === 401 &&
        localStorage.getItem('token') && authorization === `Bearer ${localStorage.getItem('token')}`) {
      const expiredToken = localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { token: expiredToken } }));
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
