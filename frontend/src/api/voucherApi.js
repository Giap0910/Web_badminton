import axiosClient from './axiosClient';

export const voucherApi = {
  validateVoucher: (code, orderTotal) =>
    axiosClient.post('/vouchers/validate', { code, orderTotal }),
  getActiveVouchers: () => axiosClient.get('/vouchers/active'),
};
