import axiosClient from './axiosClient';

export const userApi = {
  uploadAvatar: (file, config = {}) => {
    const data = new FormData(); data.append('file', file);
    return axiosClient.post('/users/profile/avatar', data, { ...config, headers: { ...config.headers, 'Content-Type': undefined } });
  },
  deleteAvatar: (config) => axiosClient.delete('/users/profile/avatar', config),
  getProfile: (config) => axiosClient.get('/users/profile', config),
  updateProfile: (data, config) => axiosClient.put('/users/profile', data, config),
  changePassword: (data, config) => axiosClient.put('/users/change-password', data, config),
};
