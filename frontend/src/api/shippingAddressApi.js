import axiosClient from './axiosClient';

export const shippingAddressApi = {
  getMyAddresses: () => axiosClient.get('/shipping-addresses'),
  getAddressById: (id) => axiosClient.get(`/shipping-addresses/${id}`),
  createAddress: (data) => axiosClient.post('/shipping-addresses', data),
  updateAddress: (id, data) => axiosClient.put(`/shipping-addresses/${id}`, data),
  setDefaultAddress: (id) => axiosClient.patch(`/shipping-addresses/${id}/default`),
  deleteAddress: (id) => axiosClient.delete(`/shipping-addresses/${id}`),
};
