import axiosClient from './axiosClient';

export const aiApi = {
  chat: (message, history = []) => axiosClient.post('/ai-chat', { message, history }, { timeout: 35000 }),
};
