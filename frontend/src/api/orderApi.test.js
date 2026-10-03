import test from 'node:test';
import assert from 'node:assert/strict';
import { orderApi } from './orderApi.js';
import axiosClient from './axiosClient.js';

test('orderApi.createOrder attaches Idempotency-Key header when provided', async () => {
  let capturedUrl = null;
  let capturedData = null;
  let capturedConfig = null;

  // Mock post method
  const originalPost = axiosClient.post;
  axiosClient.post = (url, data, config) => {
    capturedUrl = url;
    capturedData = data;
    capturedConfig = config;
    return Promise.resolve({ data: { id: 999 } });
  };

  try {
    const payload = { customerName: 'Test', shippingPhone: '0900000000' };
    const uuidKey = '12345678-1234-4234-8234-123456789abc';

    await orderApi.createOrder(payload, uuidKey);

    assert.equal(capturedUrl, '/orders');
    assert.deepEqual(capturedData, payload);
    assert.ok(capturedConfig?.headers);
    assert.equal(capturedConfig.headers['Idempotency-Key'], uuidKey);

    // Call without key
    await orderApi.createOrder(payload);
    assert.deepEqual(capturedConfig, {});
  } finally {
    axiosClient.post = originalPost;
  }
});

test('orderApi.createPaymentLink sends POST /orders/{id}/payment-link with Idempotency-Key and empty body', async () => {
  let capturedUrl = null;
  let capturedData = null;
  let capturedConfig = null;

  const originalPost = axiosClient.post;
  axiosClient.post = (url, data, config) => {
    capturedUrl = url;
    capturedData = data;
    capturedConfig = config;
    return Promise.resolve({ data: { id: 1, orderId: 88, status: 'PENDING', checkoutUrl: 'https://pay.payos.vn/test' } });
  };

  try {
    const paymentKey = 'pay-uuid-4444-8888-123456789012';
    const orderId = 88;

    const res = await orderApi.createPaymentLink(orderId, paymentKey);

    assert.equal(capturedUrl, '/orders/88/payment-link');
    assert.equal(capturedData, undefined); // Body must be none
    assert.ok(capturedConfig?.headers);
    assert.equal(capturedConfig.headers['Idempotency-Key'], paymentKey);
    assert.equal(res.data.checkoutUrl, 'https://pay.payos.vn/test');
  } finally {
    axiosClient.post = originalPost;
  }
});

test('orderApi.getOrderPayment sends GET /orders/{id}/payment', async () => {
  let capturedUrl = null;

  const originalGet = axiosClient.get;
  axiosClient.get = (url) => {
    capturedUrl = url;
    return Promise.resolve({ data: { id: 1, orderId: 88, status: 'PENDING' } });
  };

  try {
    const orderId = 88;
    const res = await orderApi.getOrderPayment(orderId);

    assert.equal(capturedUrl, '/orders/88/payment');
    assert.equal(res.data.status, 'PENDING');
  } finally {
    axiosClient.get = originalGet;
  }
});
