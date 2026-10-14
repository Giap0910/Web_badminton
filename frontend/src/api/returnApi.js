import axiosClient from './axiosClient';

export const isEligibleReturnLine = item => item?.eligible === true && !item.activeRequestId
  && Number.isSafeInteger(item.orderItemId) && Number.isSafeInteger(item.remainingQuantity) && item.remainingQuantity > 0;

export const returnApi = {
  getEligibleItems: (options = {}) => axiosClient.get('/returns/eligible-items', options),
  uploadEvidence: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post(`/returns/${id}/evidence`, form, { headers: { 'Content-Type': undefined } });
  },
  getEvidence: (id) => axiosClient.get(`/returns/${id}/evidence`, { responseType: 'blob' }),
  createReturnRequest: (data) => axiosClient.post('/returns', data),
  getMyReturns: () => axiosClient.get('/returns/my-returns'),
  getAllReturns: () => axiosClient.get('/returns/all'),
  updateStatus: (id, status, adminNote) =>
    axiosClient.put(`/returns/${id}/status?status=${status}${adminNote ? `&adminNote=${encodeURIComponent(adminNote)}` : ''}`),
};
