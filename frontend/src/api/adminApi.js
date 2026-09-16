import axiosClient from './axiosClient';

export const adminApi = {
  // Dashboard Metrics
  getDashboardStats: () => axiosClient.get('/admin/dashboard'),

  // User Management
  getAllUsers: () => axiosClient.get('/admin/users'),
  updateUserStatus: (userId, active) => 
    axiosClient.put(`/admin/users/${userId}/status`, null, { params: { active } }),

  // Order Management
  getOrders: () => axiosClient.get('/orders/all'),
  updateOrderStatus: (id, status) =>
    axiosClient.put(`/orders/${id}/status`, null, { params: { status } }),

  // Product Management
  createProduct: (data) => axiosClient.post('/products', data),
  updateProduct: (id, data) => axiosClient.put(`/products/${id}`, data),
  deleteProduct: (id) => axiosClient.delete(`/products/${id}`),

  // Voucher Management
  getAllVouchers: () => axiosClient.get('/admin/vouchers'),
  createVoucher: (data) => axiosClient.post('/admin/vouchers', data),
  updateVoucher: (id, data) => axiosClient.put(`/admin/vouchers/${id}`, data),
  deleteVoucher: (id) => axiosClient.delete(`/admin/vouchers/${id}`),

  // Review Management
  getAllReviews: () => axiosClient.get('/admin/reviews'),
  deleteReview: (id) => axiosClient.delete(`/admin/reviews/${id}`),

  // Payments & PayOS VietQR
  getAllPayments: () => axiosClient.get('/admin/payments'),
  triggerMockWebhook: (orderCode, amount) =>
    axiosClient.post('/payment/mock-webhook-trigger', null, {
      params: { orderCode, amount },
    }),

  // Returns & Warranties
  getAllReturns: () => axiosClient.get('/returns/all'),
  updateReturnStatus: (id, status) =>
    axiosClient.put(`/returns/${id}/status`, null, { params: { status } }),
};
