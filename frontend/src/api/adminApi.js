import axiosClient from './axiosClient.js';

export const adminApi = {
  // Dashboard Metrics
  getDashboardStats: params => axiosClient.get('/admin/dashboard', { params }),
  getSettings: () => axiosClient.get('/admin/dashboard/settings'),
  exportReport: params => axiosClient.get('/admin/reports', { params, responseType: 'blob' }),
  confirmCash: (id, amount) => axiosClient.post(`/admin/orders/${id}/cash-collection`, { amount }),

  // User Management
  getAllUsers: () => axiosClient.get('/admin/users'),
  updateUserStatus: (userId, active) => 
    axiosClient.put(`/admin/users/${userId}/status`, null, { params: { active } }),

  // Order Management
  getOrders: options => axiosClient.get('/orders/all', options),
  updateOrderStatus: (id, status) =>
    axiosClient.put(`/orders/${id}/status`, null, { params: { status } }),

  // Product Management
  productTemplate: () => axiosClient.get('/admin/products/template', { responseType: 'blob' }),
  previewProducts: file => {
    const body = new FormData(); body.append('file', file);
    return axiosClient.post('/admin/products/import/preview', body, { headers: { 'Content-Type': undefined } });
  },
  importProducts: (file, sha256) => {
    const body = new FormData(); body.append('file', file); body.append('sha256', sha256);
    return axiosClient.post('/admin/products/import/commit', body, { headers: { 'Content-Type': undefined }, timeout: 120000 });
  },
  createProduct: (data) => axiosClient.post('/products', data),
  createProductDraft: data => axiosClient.post('/admin/products/drafts', data),
  getProductImagePreview: (id, position, signal) => axiosClient.get(`/admin/products/${id}/images/${position}/content`,
    { responseType: 'blob', signal }),
  uploadProductImage: (id, position, file, approved) => {
    const body = new FormData(); body.append('file', file); body.append('approved', String(approved));
    return axiosClient.put(`/admin/products/${id}/images/${position}`, body,
      { headers: { 'Content-Type': undefined }, timeout: 60000 });
  },
  publishProduct: id => axiosClient.post(`/admin/products/${id}/publish`),
  updateProduct: (id, data) => axiosClient.put(`/products/${id}`, data),
  updateProductVisibility: (id, catalogVisible) => axiosClient.patch(`/products/${id}/visibility`, { catalogVisible }),
  deleteProduct: (id) => axiosClient.delete(`/products/${id}`),

  // Voucher Management
  getAllVouchers: () => axiosClient.get('/admin/vouchers'),
  createVoucher: (data) => axiosClient.post('/admin/vouchers', data),
  updateVoucher: (id, data) => axiosClient.put(`/admin/vouchers/${id}`, data),
  deleteVoucher: (id) => axiosClient.delete(`/admin/vouchers/${id}`),

  // Review Management
  getAllReviews: () => axiosClient.get('/admin/reviews'),
  updateReviewVisibility: (id, visible) => axiosClient.put(`/admin/reviews/${id}/visibility`, { visible }),
  replyReview: (id, reply) => axiosClient.put(`/admin/reviews/${id}/reply`, { reply }),
  deleteReview: (id) => axiosClient.delete(`/admin/reviews/${id}`),

  // Payments & PayOS VietQR
  getAllPayments: (params) => axiosClient.get('/admin/payments', { params }),
  paymentEvents: () => axiosClient.get('/admin/payment-events'),
  reconcilePayment: (paymentAttemptId, data, idempotencyKey) => {
    const config = {};
    if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      config.headers = { 'Idempotency-Key': idempotencyKey.trim() };
    } else if (idempotencyKey && typeof idempotencyKey === 'object') {
      Object.assign(config, idempotencyKey);
    }
    config.transformResponse = [
      ...(Array.isArray(axiosClient.defaults.transformResponse)
        ? axiosClient.defaults.transformResponse
        : [
            (rawData) => {
              try {
                return JSON.parse(rawData);
              } catch {
                return rawData;
              }
            },
          ]),
      (parsedData, headers, status) => {
        if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
          Object.defineProperty(parsedData, '_httpStatus', {
            value: status,
            writable: true,
            enumerable: false,
          });
        }
        return parsedData;
      },
    ];
    return axiosClient.post(`/admin/payments/${paymentAttemptId}/reconcile`, data, config);
  },
  triggerMockWebhook: (orderCode, amount) =>
    axiosClient.post('/payment/mock-webhook-trigger', null, {
      params: { orderCode, amount },
    }),

  // Returns & Warranties
  getAllReturns: () => axiosClient.get('/returns/all'),
  updateReturnStatus: (id, status, adminNote, replacementVariantId) =>
    axiosClient.put(`/returns/${id}/status`, null, { params: { status, adminNote, replacementVariantId } }),
  getReturnEvidence: id => axiosClient.get(`/returns/${id}/evidence`, { responseType: 'blob' }),
};
