import axiosClient from './axiosClient';

export const orderApi = {
  createOrder: (data) => axiosClient.post('/orders', data),
  getOrderById: (id) => axiosClient.get(`/orders/${id}`),
  cancelOrder: (id) => axiosClient.post(`/orders/${id}/cancel`),
  getMyOrders: () => axiosClient.get('/orders/my-orders'),
  getAllOrders: () => axiosClient.get('/orders/all'),
  updateOrderStatus: (id, status) => axiosClient.put(`/orders/${id}/status?status=${status}`),
  // Localhost Mock Webhook trigger
  triggerMockWebhook: (orderCode, amount) =>
    axiosClient.post(`/payment/mock-webhook-trigger?orderCode=${orderCode}&amount=${amount}`),
};
