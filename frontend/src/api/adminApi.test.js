import test from 'node:test';
import assert from 'node:assert/strict';
import { adminApi } from './adminApi.js';
import axiosClient from './axiosClient.js';

test('adminApi.getAllPayments sends GET /admin/payments with query params', async () => {
  let capturedUrl = null;
  let capturedConfig = null;

  const originalGet = axiosClient.get;
  axiosClient.get = (url, config) => {
    capturedUrl = url;
    capturedConfig = config;
    return Promise.resolve({ data: [{ id: 1, orderCode: 1001 }] });
  };

  try {
    const params = { query: 'test', status: 'PAID', page: 0, size: 20 };
    const res = await adminApi.getAllPayments(params);

    assert.equal(capturedUrl, '/admin/payments');
    assert.deepEqual(capturedConfig?.params, params);
    assert.equal(res.data[0].id, 1);
  } finally {
    axiosClient.get = originalGet;
  }
});

test('adminApi.reconcilePayment sends POST /admin/payments/{id}/reconcile with reason only and Idempotency-Key header', async () => {
  let capturedUrl = null;
  let capturedData = null;
  let capturedConfig = null;

  const originalPost = axiosClient.post;
  axiosClient.post = (url, data, config) => {
    capturedUrl = url;
    capturedData = data;
    capturedConfig = config;
    return Promise.resolve({
      id: 10,
      orderId: 50,
      status: 'PAID',
      amount: 1500000,
      reference: 'PAYOS-REF-999',
    });
  };

  try {
    const paymentAttemptId = 10;
    const body = { reason: 'Đối soát sao kê ngân hàng thành công' };
    const key = '11111111-2222-4333-8444-555555555555';

    const res = await adminApi.reconcilePayment(paymentAttemptId, body, key);

    assert.equal(capturedUrl, '/admin/payments/10/reconcile');
    assert.deepEqual(capturedData, { reason: 'Đối soát sao kê ngân hàng thành công' });
    assert.ok(capturedConfig?.headers);
    assert.equal(capturedConfig.headers['Idempotency-Key'], key);
    // MUST NOT send amount, status, or reference
    assert.equal(capturedData.amount, undefined);
    assert.equal(capturedData.status, undefined);
    assert.equal(capturedData.reference, undefined);
    assert.equal(res.status, 'PAID');
  } finally {
    axiosClient.post = originalPost;
  }
});

test('adminApi.reconcilePayment handles 202 response', async () => {
  const originalPost = axiosClient.post;
  axiosClient.post = () => {
    const data = { id: 10, orderId: 50, status: 'PENDING', reviewReason: 'PAYMENT_NOT_CONFIRMED' };
    Object.defineProperty(data, '_httpStatus', { value: 202, enumerable: false });
    return Promise.resolve(data);
  };

  try {
    const res = await adminApi.reconcilePayment(10, { reason: 'Kiểm tra' }, '22222222-3333-4444-8555-666666666666');
    assert.equal(res._httpStatus, 202);
    assert.equal(res.status, 'PENDING');
  } finally {
    axiosClient.post = originalPost;
  }
});

test('adminApi.reconcilePayment handles 409 conflict', async () => {
  const originalPost = axiosClient.post;
  axiosClient.post = () => {
    const err = new Error('Request failed with status code 409');
    err.response = { status: 409, data: { message: 'Khóa đối soát đã được dùng cho lý do khác' } };
    return Promise.reject(err);
  };

  try {
    await assert.rejects(
      () => adminApi.reconcilePayment(10, { reason: 'Conflict' }, '33333333-4444-4555-8666-777777777777'),
      (err) => {
        assert.equal(err.response?.status, 409);
        assert.match(err.response?.data?.message, /Khóa đối soát/);
        return true;
      }
    );
  } finally {
    axiosClient.post = originalPost;
  }
});

test('adminApi.reconcilePayment handles 502/503/504 gateway failures and timeout', async () => {
  const originalPost = axiosClient.post;
  const statuses = [502, 503, 504];

  for (const status of statuses) {
    axiosClient.post = () => {
      const err = new Error(`Request failed with status code ${status}`);
      err.response = { status, data: { message: 'Cổng thanh toán tạm thời không phản hồi' } };
      return Promise.reject(err);
    };

    await assert.rejects(
      () => adminApi.reconcilePayment(10, { reason: 'Retry test' }, '44444444-5555-4666-8777-888888888888'),
      (err) => {
        assert.equal(err.response?.status, status);
        return true;
      }
    );
  }

  // Timeout test (code ECONNABORTED)
  axiosClient.post = () => {
    const timeoutErr = new Error('timeout of 20000ms exceeded');
    timeoutErr.code = 'ECONNABORTED';
    return Promise.reject(timeoutErr);
  };

  await assert.rejects(
    () => adminApi.reconcilePayment(10, { reason: 'Timeout test' }, '55555555-6666-4777-8888-999999999999'),
    (err) => {
      assert.equal(err.code, 'ECONNABORTED');
      return true;
    }
  );

  axiosClient.post = originalPost;
});
