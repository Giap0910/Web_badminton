import axiosClient from './axiosClient';

export const userApi = {
  uploadAvatar: file => {
    const data = new FormData(); data.append('file', file);
    return axiosClient.post('/users/profile/avatar', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteAvatar: () => axiosClient.delete('/users/profile/avatar'),
  getProfile: () => axiosClient.get('/users/profile'),
  updateProfile: (data) => axiosClient.put('/users/profile', data),
  changePassword: (data) => axiosClient.put('/users/change-password', data),
};
