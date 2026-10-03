import axiosClient from './axiosClient.js';

export const orderApi = {
  createOrder: (data, idempotencyKey) => {
    const config = {};
    if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      config.headers = { 'Idempotency-Key': idempotencyKey.trim() };
    } else if (idempotencyKey && typeof idempotencyKey === 'object') {
      Object.assign(config, idempotencyKey);
    }
    return axiosClient.post('/orders', data, config);
  },
  createPaymentLink: (orderId, idempotencyKey) => {
    const config = {};
    if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      config.headers = { 'Idempotency-Key': idempotencyKey.trim() };
    }
    return axiosClient.post(`/orders/${orderId}/payment-link`, undefined, config);
  },
  getOrderPayment: (orderId) => axiosClient.get(`/orders/${orderId}/payment`),
  getOrderById: (id) => axiosClient.get(`/orders/${id}`),
  cancelOrder: (id) => axiosClient.post(`/orders/${id}/cancel`),
  getMyOrders: () => axiosClient.get('/orders/my-orders'),
  getAllOrders: () => axiosClient.get('/orders/all'),
  updateOrderStatus: (id, status) => axiosClient.put(`/orders/${id}/status?status=${status}`),
  // Localhost Mock Webhook trigger
  triggerMockWebhook: (orderCode, amount) =>
    axiosClient.post(`/payment/mock-webhook-trigger?orderCode=${orderCode}&amount=${amount}`),
};
