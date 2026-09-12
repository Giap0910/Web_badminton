import axiosClient from './axiosClient';

export const returnApi = {
  createReturnRequest: (data) => axiosClient.post('/returns', data),
  getMyReturns: () => axiosClient.get('/returns/my-returns'),
  getAllReturns: () => axiosClient.get('/returns/all'),
  updateStatus: (id, status, adminNote) =>
    axiosClient.put(`/returns/${id}/status?status=${status}${adminNote ? `&adminNote=${encodeURIComponent(adminNote)}` : ''}`),
};
