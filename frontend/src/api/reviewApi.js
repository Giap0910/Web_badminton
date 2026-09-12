import axiosClient from './axiosClient';

export const reviewApi = {
  getProductReviews: (productId) => axiosClient.get(`/reviews/product/${productId}`),
  getMyReviews: () => axiosClient.get('/reviews/my-reviews'),
  createReview: (data) => axiosClient.post('/reviews', data),
};
