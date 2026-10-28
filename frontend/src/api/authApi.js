import axiosClient from './axiosClient';

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  register: (data) => axiosClient.post('/auth/register', data),
  getMe: (token) => axiosClient.get('/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  logout: (token) => axiosClient.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }),
};
