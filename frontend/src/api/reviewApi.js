import axiosClient from './axiosClient';

export const reviewApi = {
  getProductReviews: (productId) => axiosClient.get(`/reviews/product/${productId}`),
  createReview: (data) => axiosClient.post('/reviews', data),
};
