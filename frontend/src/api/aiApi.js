import axiosClient from './axiosClient';

export const aiApi = {
  chat: (message) => axiosClient.post('/ai-chat', { message }),
};
