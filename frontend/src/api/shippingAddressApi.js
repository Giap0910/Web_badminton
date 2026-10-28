import axiosClient from './axiosClient';

export const shippingAddressApi = {
  getMyAddresses: (config) => axiosClient.get('/shipping-addresses', config),
  getAddressById: (id, config) => axiosClient.get(`/shipping-addresses/${id}`, config),
  createAddress: (data, config) => axiosClient.post('/shipping-addresses', data, config),
  updateAddress: (id, data, config) => axiosClient.put(`/shipping-addresses/${id}`, data, config),
  setDefaultAddress: (id, config) => axiosClient.patch(`/shipping-addresses/${id}/default`, null, config),
  deleteAddress: (id, config) => axiosClient.delete(`/shipping-addresses/${id}`, config),
};
