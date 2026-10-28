import axiosClient from './axiosClient';

export const voucherApi = {
  validateVoucher: (code, orderTotal, items = []) =>
    axiosClient.post('/vouchers/validate', { code, orderTotal, ...(items.length ? { items } : {}) }),
  getActiveVouchers: () => axiosClient.get('/vouchers/active'),
};
