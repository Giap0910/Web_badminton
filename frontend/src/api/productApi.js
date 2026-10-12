import axiosClient from './axiosClient';

export const productApi = {
  getProducts: (params, options = {}) => axiosClient.get('/products', { ...options, params }),
  getProductById: (id, params) => axiosClient.get(`/products/${id}`, { params }),
  getProductImages: (id) => axiosClient.get(`/products/${id}/images`),
  getCategories: () => axiosClient.get('/categories'),
  compareRackets: (ids) => axiosClient.get(`/comparison?ids=${ids.join(',')}`),
  createProduct: (data) => axiosClient.post('/products', data),
  updateProduct: (id, data) => axiosClient.put(`/products/${id}`, data),
  deleteProduct: (id) => axiosClient.delete(`/products/${id}`),
};
