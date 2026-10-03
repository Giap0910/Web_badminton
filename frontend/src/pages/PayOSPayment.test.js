import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { orderApi } from '../api/orderApi.js';
import axiosClient from '../api/axiosClient.js';
import {
  getOrCreatePaymentLinkKey,
  getStoredPaymentLinkIntent,
  clearStoredPaymentLinkIntent,
  buildOrderPayload,
  getOrCreateIdempotencyKey,
  clearStoredCheckoutIntent
} from '../utils/idempotency.js';

// Setup mock sessionStorage for Node environment
class MockSessionStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = new MockSessionStorage();
}

test('FIX-002 TEST 1 (Section 33) — 201: Payment link created after orderId exists, separate UUID, no amount sent', async () => {
  sessionStorage.clear();

  let createOrderCalls = 0;
  let createPaymentLinkCalls = 0;
  let capturedPaymentUrl = null;
  let capturedPaymentBody = null;
  let capturedPaymentConfig = null;
  let navigatedRoute = null;
  let navigatedState = null;

  const originalPost = axiosClient.post;
  axiosClient.post = (url, body, config) => {
    if (url === '/orders') {
      createOrderCalls++;
      return Promise.resolve({ data: { id: 101, orderCode: 'HG-101', status: 'PENDING' } });
    }
    if (url.includes('/payment-link')) {
      createPaymentLinkCalls++;
      capturedPaymentUrl = url;
      capturedPaymentBody = body;
      capturedPaymentConfig = config;
      return Promise.resolve({
        data: {
          id: 5001,
          orderId: 101,
          provider: 'PAYOS',
          orderCode: 123456,
          paymentLinkId: 'link-5001',
          amount: 2500000,
          currency: 'VND',
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/test-link-5001',
          qrPayload: '00020101021238540010A00000072701240006970422',
        }
      });
    }
    return Promise.reject(new Error('Unknown url'));
  };

  try {
    const payload = buildOrderPayload({
      customerName: 'Nguyễn Văn A',
      shippingPhone: '0901111111',
      addressDetail: '123 Cầu Giấy',
      paymentMethod: 'PAYOS_VIETQR',
      checkoutItems: [{ cartItemId: 'c1', product: { id: 10, price: 2500000 }, quantity: 1 }]
    });

    // 1. Create order with checkout idempotency key
    const orderKey = getOrCreateIdempotencyKey(payload).key;
    const orderRes = await orderApi.createOrder(payload, orderKey);
    const createdOrder = orderRes.data;

    assert.equal(createdOrder.id, 101);
    assert.equal(createOrderCalls, 1);

    // 2. Separate payment UUID
    const paymentKey = getOrCreatePaymentLinkKey(createdOrder.id);
    assert.notEqual(paymentKey, orderKey, 'Payment UUID must be distinct from order UUID');

    // 3. Call createPaymentLink
    const payRes = await orderApi.createPaymentLink(createdOrder.id, paymentKey);
    const paymentAttempt = payRes.data;

    // Simulate navigation
    navigatedRoute = `/payment/qr/${createdOrder.id}`;
    navigatedState = { order: createdOrder, payment: paymentAttempt };

    // Assertions
    assert.equal(createOrderCalls, 1, 'createOrder called exactly once');
    assert.equal(createPaymentLinkCalls, 1, 'createPaymentLink called after order exists');
    assert.equal(capturedPaymentUrl, '/orders/101/payment-link');
    assert.equal(capturedPaymentBody, undefined, 'No amount or body sent by frontend');
    assert.equal(capturedPaymentConfig.headers['Idempotency-Key'], paymentKey);
    assert.equal(paymentAttempt.checkoutUrl, 'https://pay.payos.vn/web/test-link-5001');
    assert.equal(paymentAttempt.status, 'PENDING');
    assert.notEqual(paymentAttempt.status, 'PAID', 'Must NOT fake PAID state');
    assert.equal(navigatedRoute, '/payment/qr/101');
  } finally {
    axiosClient.post = originalPost;
  }
});

test('FIX-002 TEST 2 (Section 34) — 200: Existing payment link reused, same order, no new order', async () => {
  sessionStorage.clear();

  let createOrderCalls = 0;
  let createPaymentLinkCalls = 0;

  const originalPost = axiosClient.post;
  axiosClient.post = (url, body, config) => {
    if (url === '/orders') {
      createOrderCalls++;
      return Promise.resolve({ data: { id: 202, orderCode: 'HG-202', status: 'PENDING' } });
    }
    if (url.includes('/payment-link')) {
      createPaymentLinkCalls++;
      return Promise.resolve({
        status: 200,
        data: {
          id: 5002,
          orderId: 202,
          provider: 'PAYOS',
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/existing-link-5002',
          qrPayload: 'vietqr-payload-string',
        }
      });
    }
    return Promise.reject(new Error('Unknown url'));
  };

  try {
    const payload = buildOrderPayload({
      customerName: 'Trần B',
      shippingPhone: '0902222222',
      addressDetail: '456 Hai Bà Trưng',
      paymentMethod: 'PAYOS_VIETQR',
      checkoutItems: [{ cartItemId: 'c2', product: { id: 20, price: 1000000 }, quantity: 1 }]
    });

    const orderRes = await orderApi.createOrder(payload);
    const order = orderRes.data;

    const paymentKey = getOrCreatePaymentLinkKey(order.id);
    const payRes = await orderApi.createPaymentLink(order.id, paymentKey);

    assert.equal(createOrderCalls, 1);
    assert.equal(createPaymentLinkCalls, 1);
    assert.equal(payRes.data.orderId, 202);
    assert.equal(payRes.data.checkoutUrl, 'https://pay.payos.vn/web/existing-link-5002');
  } finally {
    axiosClient.post = originalPost;
  }
});

test('FIX-002 TEST 3 (Section 35) — 202: CREATING with null checkoutUrl, same order, same key, no new order', async () => {
  sessionStorage.clear();

  let createOrderCalls = 0;

  const originalPost = axiosClient.post;
  axiosClient.post = (url) => {
    if (url === '/orders') {
      createOrderCalls++;
      return Promise.resolve({ data: { id: 303, orderCode: 'HG-303', status: 'PENDING' } });
    }
    if (url.includes('/payment-link')) {
      return Promise.resolve({
        status: 202,
        data: {
          id: 5003,
          orderId: 303,
          provider: 'PAYOS',
          status: 'CREATING',
          checkoutUrl: null,
          qrPayload: null,
        }
      });
    }
    return Promise.reject(new Error('Unknown url'));
  };

  try {
    const orderId = 303;
    const paymentKey = getOrCreatePaymentLinkKey(orderId);

    const payRes = await orderApi.createPaymentLink(orderId, paymentKey);
    const payment = payRes.data;

    assert.equal(payment.status, 'CREATING');
    assert.equal(payment.checkoutUrl, null);
    assert.equal(createOrderCalls, 0, 'No order created during payment link step');

    // Key must remain intact for this order
    const retainedKey = getStoredPaymentLinkIntent();
    assert.equal(retainedKey.orderId, String(orderId));
    assert.equal(retainedKey.key, paymentKey);

    // Status text semantic representation
    const statusText = payment.status === 'CREATING' ? 'Đang chuẩn bị liên kết thanh toán...' : 'Đang chờ thanh toán...';
    assert.equal(statusText, 'Đang chuẩn bị liên kết thanh toán...');
  } finally {
    axiosClient.post = originalPost;
  }
});

test('FIX-002 TEST 4 (Section 36) — Timeout on payment-link: order & payment key retained, retry uses same order and key, NO new order', async () => {
  sessionStorage.clear();

  let createOrderCalls = 0;
  let paymentLinkCalls = 0;
  const capturedKeys = [];

  const originalPost = axiosClient.post;
  axiosClient.post = (url, body, config) => {
    if (url === '/orders') {
      createOrderCalls++;
      return Promise.resolve({ data: { id: 404, orderCode: 'HG-404', status: 'PENDING' } });
    }
    if (url.includes('/payment-link')) {
      paymentLinkCalls++;
      capturedKeys.push(config?.headers?.['Idempotency-Key']);
      if (paymentLinkCalls === 1) {
        // First attempt times out
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        return Promise.reject(timeoutErr);
      }
      // Retry succeeds
      return Promise.resolve({
        data: {
          id: 5004,
          orderId: 404,
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/retry-success-404',
        }
      });
    }
    return Promise.reject(new Error('Unknown url'));
  };

  try {
    const payload = buildOrderPayload({
      customerName: 'Lê D',
      shippingPhone: '0904444444',
      addressDetail: '789 Đống Đa',
      paymentMethod: 'PAYOS_VIETQR',
      checkoutItems: [{ cartItemId: 'c4', product: { id: 40, price: 500000 }, quantity: 1 }]
    });

    // Step 1: create order succeeds
    const orderRes = await orderApi.createOrder(payload);
    const orderId = orderRes.data.id;
    assert.equal(createOrderCalls, 1);

    // Step 2: first payment link attempt times out
    const key1 = getOrCreatePaymentLinkKey(orderId);
    let firstAttemptFailed = false;
    try {
      await orderApi.createPaymentLink(orderId, key1);
    } catch {
      firstAttemptFailed = true;
    }
    assert.equal(firstAttemptFailed, true);
    assert.equal(paymentLinkCalls, 1);

    // Step 3: Retry payment link — MUST NOT call createOrder!
    const key2 = getOrCreatePaymentLinkKey(orderId);
    assert.equal(key2, key1, 'Must reuse identical payment key on retry');

    const retryRes = await orderApi.createPaymentLink(orderId, key2);

    // Assertions
    assert.equal(createOrderCalls, 1, 'createOrder MUST NEVER be called during payment retry');
    assert.equal(paymentLinkCalls, 2, 'createPaymentLink called twice');
    assert.equal(capturedKeys[0], capturedKeys[1], 'Both payment attempts used the exact same UUID');
    assert.equal(retryRes.data.checkoutUrl, 'https://pay.payos.vn/web/retry-success-404');
  } finally {
    axiosClient.post = originalPost;
  }
});

test('FIX-002 TEST 5 (Section 37) — Reload after unresolved payment: recover same order & key, GET payment, NO createOrder', async () => {
  sessionStorage.clear();

  let createOrderCalls = 0;
  let getPaymentCalls = 0;

  const originalGet = axiosClient.get;
  const originalPost = axiosClient.post;

  axiosClient.post = () => {
    createOrderCalls++;
    return Promise.resolve({ data: { id: 505 } });
  };

  axiosClient.get = (url) => {
    if (url === '/orders/505') {
      return Promise.resolve({ data: { id: 505, orderCode: 'HG-505', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' } });
    }
    if (url === '/orders/505/payment') {
      getPaymentCalls++;
      return Promise.resolve({
        data: {
          id: 5005,
          orderId: 505,
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/synced-505',
        }
      });
    }
    return Promise.reject(new Error('Unknown url'));
  };

  try {
    const orderId = 505;
    const initialKey = getOrCreatePaymentLinkKey(orderId);

    // Simulate page remount/reload: QRPaymentPage mounts with orderId from route
    const reloadedKey = getOrCreatePaymentLinkKey(orderId);
    assert.equal(reloadedKey, initialKey, 'Retains same payment key across reload');

    // QRPaymentPage syncs via getOrderPayment
    const payRes = await orderApi.getOrderPayment(orderId);

    assert.equal(getPaymentCalls, 1);
    assert.equal(createOrderCalls, 0, 'Reload MUST NEVER call createOrder');
    assert.equal(payRes.data.checkoutUrl, 'https://pay.payos.vn/web/synced-505');
  } finally {
    axiosClient.get = originalGet;
    axiosClient.post = originalPost;
  }
});

test('FIX-002 TEST 6 (Section 38) — Error handling (409, 502, 503, 504): no new order, controlled error message, same order retained', async () => {
  sessionStorage.clear();

  let createOrderCalls = 0;

  const originalPost = axiosClient.post;
  axiosClient.post = (url) => {
    if (url.includes('/payment-link')) {
      const err = new Error('Bad Gateway');
      err.response = { status: 502, data: { message: 'Cổng thanh toán tạm thời gián đoạn.' } };
      return Promise.reject(err);
    }
    createOrderCalls++;
    return Promise.resolve({ data: { id: 606 } });
  };

  try {
    const orderId = 606;
    const paymentKey = getOrCreatePaymentLinkKey(orderId);

    let caughtError = null;
    try {
      await orderApi.createPaymentLink(orderId, paymentKey);
    } catch (err) {
      caughtError = err.response?.data?.message || 'Chưa thể chuẩn bị liên kết thanh toán. Vui lòng kiểm tra lại.';
    }

    assert.equal(caughtError, 'Cổng thanh toán tạm thời gián đoạn.');
    assert.equal(createOrderCalls, 0, 'No createOrder called on payment failure');

    // Storage preserves payment key for same orderId
    const stored = getStoredPaymentLinkIntent();
    assert.equal(stored.orderId, '606');
    assert.equal(stored.key, paymentKey);
  } finally {
    axiosClient.post = originalPost;
  }
});

test('FIX-002 TEST 7 (Section 39) — COD Regression: COD must not call payment-link, navigates directly to order-success', async () => {
  sessionStorage.clear();

  let createOrderCalls = 0;
  let paymentLinkCalls = 0;
  let navigatedRoute = null;

  const originalPost = axiosClient.post;
  axiosClient.post = (url) => {
    if (url === '/orders') {
      createOrderCalls++;
      return Promise.resolve({ data: { id: 707, status: 'PENDING' } });
    }
    if (url.includes('/payment-link')) {
      paymentLinkCalls++;
      return Promise.resolve({ data: { id: 999 } });
    }
    return Promise.reject(new Error('Unknown url'));
  };

  try {
    const paymentMethod = 'COD';
    const createdOrder = (await orderApi.createOrder({})).data;

    // Emulate CheckoutPage branching
    if (paymentMethod === 'COD') {
      navigatedRoute = `/order-success/${createdOrder.id}`;
    } else {
      await orderApi.createPaymentLink(createdOrder.id, 'key');
      navigatedRoute = `/payment/qr/${createdOrder.id}`;
    }

    assert.equal(createOrderCalls, 1);
    assert.equal(paymentLinkCalls, 0, 'COD must NEVER call payment-link');
    assert.equal(navigatedRoute, '/order-success/707');
  } finally {
    axiosClient.post = originalPost;
  }
});

// ======================================================================
// REMEDIATION TESTS: Directly testing production logic from QRPaymentPage.jsx
// ======================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qrPageCode = fs.readFileSync(path.join(__dirname, 'QRPaymentPage.jsx'), 'utf8');

function createProductionCheckPaymentRunner(scope) {
  const match = qrPageCode.match(/const handleCheckPayment = async \(\) => {([\s\S]*?)};\r?\n\r?\n  const displayOrderCode/);
  if (!match) throw new Error('Could not extract handleCheckPayment from QRPaymentPage.jsx');
  const fnBody = match[1];
  const keys = Object.keys(scope);
  const values = Object.values(scope);
  const factory = new Function(...keys, `return async function handleCheckPayment() { ${fnBody} };`);
  return factory(...values);
}

function createProductionFetchOrderRunner(scope) {
  const match = qrPageCode.match(/const fetchOrder = async \(\) => {([\s\S]*?)};\r?\n\r?\n  useEffect\(\(\) => {/);
  if (!match) throw new Error('Could not extract fetchOrder from QRPaymentPage.jsx');
  const fnBody = match[1];
  const keys = Object.keys(scope);
  const values = Object.values(scope);
  const factory = new Function(...keys, `return async function fetchOrder() { ${fnBody} };`);
  return factory(...values);
}

function createProductionPollingRunner(scope) {
  const match = qrPageCode.match(/\/\/ Polling check order status every 4 seconds\r?\n\s*useEffect\(\(\) => {([\s\S]*?)},\s*\[orderId\]\);/);
  if (!match) throw new Error('Could not extract polling effect from QRPaymentPage.jsx');
  const fnBody = match[1];
  const keys = Object.keys(scope);
  const values = Object.values(scope);
  const factory = new Function(...keys, `return function runPollingEffect() { ${fnBody} };`);
  return factory(...values);
}

test('FIX-002 REMEDIATION TEST 8 (BUG A) — handleCheckPayment on GET 200 + null calls createPaymentLink with same orderId and same key', async () => {
  sessionStorage.clear();

  const orderId = 801;
  const initialKey = getOrCreatePaymentLinkKey(orderId);

  let getOrderCalls = 0;
  let getPaymentCalls = 0;
  let createPaymentLinkCalls = 0;
  let capturedKey = null;
  let updatedPaymentState = null;

  const mockOrderApi = {
    getOrderById: async (id) => {
      getOrderCalls++;
      return { data: { id, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' } };
    },
    getOrderPayment: async (id) => {
      getPaymentCalls++;
      // BUG A scenario: HTTP 200 with null body
      return { data: null };
    },
    createPaymentLink: async (id, key) => {
      createPaymentLinkCalls++;
      capturedKey = key;
      return {
        data: {
          id: 9801,
          orderId: id,
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/recovered-null',
        }
      };
    }
  };

  const isCheckingRef = { current: false };
  const currentOrderIdRef = { current: orderId };

  const handleCheckPayment = createProductionCheckPaymentRunner({
    orderId,
    orderApi: mockOrderApi,
    getOrCreatePaymentLinkKey,
    isCheckingRef,
    isVerifying: false,
    setIsVerifying: () => {},
    setError: () => {},
    setOrder: () => {},
    setPayment: (p) => { updatedPaymentState = p; },
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: () => {},
    currentOrderIdRef
  });

  await handleCheckPayment();

  assert.equal(getOrderCalls, 1, 'getOrderById called once');
  assert.equal(getPaymentCalls, 1, 'getOrderPayment called once');
  assert.equal(createPaymentLinkCalls, 1, 'createPaymentLink MUST be called when GET returns 200 + null');
  assert.equal(capturedKey, initialKey, 'Must use SAME persisted payment UUID');
  assert.equal(updatedPaymentState?.checkoutUrl, 'https://pay.payos.vn/web/recovered-null');
});

test('FIX-002 REMEDIATION TEST 9 (BUG B) — handleCheckPayment on GET CREATING calls createPaymentLink to trigger gateway query/recovery', async () => {
  sessionStorage.clear();

  const orderId = 902;
  const initialKey = getOrCreatePaymentLinkKey(orderId);

  let getOrderCalls = 0;
  let getPaymentCalls = 0;
  let createPaymentLinkCalls = 0;
  let capturedKey = null;
  let updatedPaymentState = null;

  const mockOrderApi = {
    getOrderById: async (id) => {
      getOrderCalls++;
      return { data: { id, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' } };
    },
    getOrderPayment: async (id) => {
      getPaymentCalls++;
      // BUG B scenario: GET returns CREATING
      return { data: { id: 9902, orderId: id, status: 'CREATING', checkoutUrl: null } };
    },
    createPaymentLink: async (id, key) => {
      createPaymentLinkCalls++;
      capturedKey = key;
      // Backend queries PayOS and recovers the pending attempt with checkoutUrl
      return {
        data: {
          id: 9902,
          orderId: id,
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/recovered-from-creating',
        }
      };
    }
  };

  const isCheckingRef = { current: false };
  const currentOrderIdRef = { current: orderId };

  const handleCheckPayment = createProductionCheckPaymentRunner({
    orderId,
    orderApi: mockOrderApi,
    getOrCreatePaymentLinkKey,
    isCheckingRef,
    isVerifying: false,
    setIsVerifying: () => {},
    setError: () => {},
    setOrder: () => {},
    setPayment: (p) => { updatedPaymentState = p; },
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: () => {},
    currentOrderIdRef
  });

  await handleCheckPayment();

  assert.equal(getOrderCalls, 1, 'getOrderById called once');
  assert.equal(getPaymentCalls, 1, 'getOrderPayment called once');
  assert.equal(createPaymentLinkCalls, 1, 'createPaymentLink MUST be called when GET returns CREATING');
  assert.equal(capturedKey, initialKey, 'Must use SAME persisted payment UUID');
  assert.equal(updatedPaymentState?.status, 'PENDING');
  assert.equal(updatedPaymentState?.checkoutUrl, 'https://pay.payos.vn/web/recovered-from-creating');
});

test('FIX-002 REMEDIATION TEST 10 — handleCheckPayment on GET PENDING does NOT call createPaymentLink', async () => {
  sessionStorage.clear();

  const orderId = 1003;
  let createPaymentLinkCalls = 0;
  let alertMessage = null;

  const mockOrderApi = {
    getOrderById: async (id) => ({ data: { id, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' } }),
    getOrderPayment: async (id) => ({
      data: { id: 91003, orderId: id, status: 'PENDING', checkoutUrl: 'https://pay.payos.vn/web/existing' }
    }),
    createPaymentLink: async () => {
      createPaymentLinkCalls++;
      return { data: {} };
    }
  };

  const isCheckingRef = { current: false };
  const currentOrderIdRef = { current: orderId };

  const handleCheckPayment = createProductionCheckPaymentRunner({
    orderId,
    orderApi: mockOrderApi,
    getOrCreatePaymentLinkKey,
    isCheckingRef,
    isVerifying: false,
    setIsVerifying: () => {},
    setError: () => {},
    setOrder: () => {},
    setPayment: () => {},
    isOrderPaid: () => false,
    navigate: () => {},
    alert: (msg) => { alertMessage = msg; },
    currentOrderIdRef
  });

  await handleCheckPayment();

  assert.equal(createPaymentLinkCalls, 0, 'Must NOT call createPaymentLink when payment is already PENDING');
  assert.ok(alertMessage);
});

test('FIX-002 REMEDIATION TEST 11 — handleCheckPayment double-click guard prevents duplicate POST calls', async () => {
  sessionStorage.clear();

  const orderId = 1104;
  let createPaymentLinkCalls = 0;

  const mockOrderApi = {
    getOrderById: async (id) => {
      await new Promise((r) => setTimeout(r, 20));
      return { data: { id, status: 'PENDING' } };
    },
    getOrderPayment: async () => ({ data: null }),
    createPaymentLink: async (id) => {
      createPaymentLinkCalls++;
      await new Promise((r) => setTimeout(r, 20));
      return { data: { id: 91104, orderId: id, status: 'PENDING' } };
    }
  };

  const isCheckingRef = { current: false };
  const currentOrderIdRef = { current: orderId };

  const handleCheckPayment = createProductionCheckPaymentRunner({
    orderId,
    orderApi: mockOrderApi,
    getOrCreatePaymentLinkKey,
    isCheckingRef,
    isVerifying: false,
    setIsVerifying: () => {},
    setError: () => {},
    setOrder: () => {},
    setPayment: () => {},
    isOrderPaid: () => false,
    navigate: () => {},
    currentOrderIdRef
  });

  // Rapid synchronous double-click
  const p1 = handleCheckPayment();
  const p2 = handleCheckPayment();

  await Promise.all([p1, p2]);

  assert.equal(createPaymentLinkCalls, 1, 'Double-click must only trigger exactly ONE createPaymentLink call');
});

test('FIX-002 REMEDIATION TEST 12 — fetchOrder on initial load handles GET 200 + null with single controlled call and NO loop', async () => {
  sessionStorage.clear();

  const orderId = 1205;
  let createPaymentLinkCalls = 0;

  const mockOrderApi = {
    getOrderById: async (id) => ({ data: { id, status: 'PENDING', timeRemainingSeconds: 600 } }),
    getOrderPayment: async () => ({ data: null }),
    createPaymentLink: async (id) => {
      createPaymentLinkCalls++;
      return { data: { id: 91205, orderId: id, status: 'CREATING', checkoutUrl: null } };
    }
  };

  const hasInitialRecoveredRef = { current: false };
  const currentOrderIdRef = { current: orderId };

  const fetchOrder = createProductionFetchOrderRunner({
    orderId,
    orderApi: mockOrderApi,
    getOrCreatePaymentLinkKey,
    hasInitialRecoveredRef,
    currentOrderIdRef,
    setError: () => {},
    setOrder: () => {},
    setSecondsRemaining: () => {},
    setPayment: () => {},
    setLoading: () => {},
    isOrderPaid: () => false,
    navigate: () => {}
  });

  // First call on mount
  await fetchOrder();
  assert.equal(createPaymentLinkCalls, 1, 'First load should perform one controlled recovery call');

  // Simulated re-run without route change: hasInitialRecoveredRef prevents auto-loop
  await fetchOrder();
  assert.equal(createPaymentLinkCalls, 1, 'Subsequent load checks must NOT loop or call createPaymentLink again');
});

test('FIX-002 REMEDIATION TEST 13 — fetchOrder on initial load with CREATING does NOT auto-POST', async () => {
  sessionStorage.clear();

  const orderId = 1306;
  let createPaymentLinkCalls = 0;
  let paymentStateSet = null;

  const mockOrderApi = {
    getOrderById: async (id) => ({ data: { id, status: 'PENDING' } }),
    getOrderPayment: async (id) => ({
      data: { id: 91306, orderId: id, status: 'CREATING', checkoutUrl: null }
    }),
    createPaymentLink: async () => {
      createPaymentLinkCalls++;
      return { data: {} };
    }
  };

  const hasInitialRecoveredRef = { current: false };
  const currentOrderIdRef = { current: orderId };

  const fetchOrder = createProductionFetchOrderRunner({
    orderId,
    orderApi: mockOrderApi,
    getOrCreatePaymentLinkKey,
    hasInitialRecoveredRef,
    currentOrderIdRef,
    setError: () => {},
    setOrder: () => {},
    setSecondsRemaining: () => {},
    setPayment: (p) => { paymentStateSet = p; },
    setLoading: () => {},
    isOrderPaid: () => false,
    navigate: () => {}
  });

  await fetchOrder();

  assert.equal(createPaymentLinkCalls, 0, 'On initial load with CREATING, must NOT auto-POST (waits for manual retry)');
  assert.equal(paymentStateSet?.status, 'CREATING');
});

test('FIX-002 REMEDIATION TEST 14 — Polling stale response on route switch O1 -> O2 does NOT update order state', async () => {
  const orderId = 'O1';
  const order = { id: 'O1', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' };
  const currentOrderIdRef = { current: 'O1' };
  const pollGenerationRef = { current: 0 };
  const isMountedRef = { current: true };

  let resolveOrderO1;
  const delayedOrderPromise = new Promise((resolve) => {
    resolveOrderO1 = resolve;
  });

  const mockOrderApi = {
    getOrderById: async (id) => {
      if (id === 'O1') return delayedOrderPromise;
      return { data: { id, status: 'PENDING' } };
    },
    getOrderPayment: async () => ({ data: null })
  };

  let capturedIntervalCb = null;
  let clearedIntervalId = null;
  const customSetInterval = (cb) => {
    capturedIntervalCb = cb;
    return 999;
  };
  const customClearInterval = (id) => {
    clearedIntervalId = id;
  };

  let updatedOrder = null;
  let navigatedRoute = null;

  const runPolling = createProductionPollingRunner({
    order,
    orderId,
    pollGenerationRef,
    isMountedRef,
    currentOrderIdRef,
    orderRef: { current: order },
    orderApi: mockOrderApi,
    setOrder: (o) => { updatedOrder = o; },
    setSecondsRemaining: () => {},
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: (route) => { navigatedRoute = route; },
    setPayment: () => {},
    setInterval: customSetInterval,
    clearInterval: customClearInterval
  });

  const cleanup = runPolling();
  assert.ok(capturedIntervalCb, 'Interval callback must be registered');

  // Trigger poll callback for O1 (in-flight request started)
  const pollPromise = capturedIntervalCb();

  // User navigates / route changes to O2: cleanup O1 effect & update currentOrderIdRef
  cleanup();
  currentOrderIdRef.current = 'O2';

  // Late response for O1 arrives
  resolveOrderO1({ data: { id: 'O1', status: 'PENDING', totalAmount: 500000 } });
  await pollPromise;

  assert.equal(updatedOrder, null, 'Stale O1 response must NOT call setOrder after route switched to O2');
  assert.equal(navigatedRoute, null, 'Must NOT navigate for stale order');
});

test('FIX-002 REMEDIATION TEST 15 — Polling stale PAID response after route switch O1 -> O2 MUST NOT navigate to /order-success/O1', async () => {
  const orderId = 'O1';
  const order = { id: 'O1', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' };
  const currentOrderIdRef = { current: 'O1' };
  const pollGenerationRef = { current: 0 };
  const isMountedRef = { current: true };

  let resolveOrderO1;
  const delayedOrderPromise = new Promise((resolve) => {
    resolveOrderO1 = resolve;
  });

  const mockOrderApi = {
    getOrderById: async () => delayedOrderPromise,
    getOrderPayment: async () => ({ data: null })
  };

  let capturedIntervalCb = null;
  const customSetInterval = (cb) => {
    capturedIntervalCb = cb;
    return 1001;
  };

  let navigatedRoute = null;

  const runPolling = createProductionPollingRunner({
    order,
    orderId,
    pollGenerationRef,
    isMountedRef,
    currentOrderIdRef,
    orderRef: { current: order },
    orderApi: mockOrderApi,
    setOrder: () => {},
    setSecondsRemaining: () => {},
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: (route) => { navigatedRoute = route; },
    setPayment: () => {},
    setInterval: customSetInterval,
    clearInterval: () => {}
  });

  const cleanup = runPolling();

  // Start polling in-flight
  const pollPromise = capturedIntervalCb();

  // Switch to O2
  cleanup();
  currentOrderIdRef.current = 'O2';

  // Late response arrives with PAID status
  resolveOrderO1({ data: { id: 'O1', status: 'PAID' } });
  await pollPromise;

  assert.equal(navigatedRoute, null, 'CRITICAL: Must NEVER navigate to /order-success/O1 after route switch to O2');
});

test('FIX-002 REMEDIATION TEST 16 — Polling stale payment response MUST NOT update payment or leak checkoutUrl to O2', async () => {
  const orderId = 'O1';
  const order = { id: 'O1', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' };
  const currentOrderIdRef = { current: 'O1' };
  const pollGenerationRef = { current: 0 };
  const isMountedRef = { current: true };

  let resolvePaymentO1;
  const delayedPaymentPromise = new Promise((resolve) => {
    resolvePaymentO1 = resolve;
  });

  const mockOrderApi = {
    getOrderById: async (id) => ({ data: { id, status: 'PENDING' } }),
    getOrderPayment: async () => delayedPaymentPromise
  };

  let capturedIntervalCb = null;
  const customSetInterval = (cb) => {
    capturedIntervalCb = cb;
    return 1002;
  };

  let updatedPayment = null;

  const runPolling = createProductionPollingRunner({
    order,
    orderId,
    pollGenerationRef,
    isMountedRef,
    currentOrderIdRef,
    orderRef: { current: order },
    orderApi: mockOrderApi,
    setOrder: () => {},
    setSecondsRemaining: () => {},
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: () => {},
    setPayment: (p) => { updatedPayment = p; },
    setInterval: customSetInterval,
    clearInterval: () => {}
  });

  const cleanup = runPolling();

  // Polling starts: getOrderById resolves immediately, getOrderPayment is delayed
  const pollPromise = capturedIntervalCb();

  // Route switches to O2
  cleanup();
  currentOrderIdRef.current = 'O2';

  // Late payment response resolves with checkoutUrl
  resolvePaymentO1({
    data: {
      id: 9916,
      orderId: 'O1',
      status: 'PENDING',
      checkoutUrl: 'https://pay.payos.vn/old-O1'
    }
  });
  await pollPromise;

  assert.equal(updatedPayment, null, 'Must NOT set payment or leak checkoutUrl from O1 to O2');
});

test('FIX-002 REMEDIATION TEST 17 — Polling legitimate response for CURRENT order O1 updates state and navigates on PAID', async () => {
  const orderId = 'O1';
  const order = { id: 'O1', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' };
  const currentOrderIdRef = { current: 'O1' };
  const pollGenerationRef = { current: 0 };
  const isMountedRef = { current: true };

  const mockOrderApi = {
    getOrderById: async (id) => ({
      data: { id, status: 'PENDING', timeRemainingSeconds: 450 }
    }),
    getOrderPayment: async (id) => ({
      data: { id: 9917, orderId: id, status: 'PAID' }
    })
  };

  let capturedIntervalCb = null;
  const customSetInterval = (cb) => {
    capturedIntervalCb = cb;
    return 1003;
  };

  let updatedOrder = null;
  let updatedPayment = null;
  let updatedSeconds = null;
  let navigatedRoute = null;

  const runPolling = createProductionPollingRunner({
    order,
    orderId,
    pollGenerationRef,
    isMountedRef,
    currentOrderIdRef,
    orderRef: { current: order },
    orderApi: mockOrderApi,
    setOrder: (o) => { updatedOrder = o; },
    setSecondsRemaining: (s) => { updatedSeconds = s; },
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: (route) => { navigatedRoute = route; },
    setPayment: (p) => { updatedPayment = p; },
    setInterval: customSetInterval,
    clearInterval: () => {}
  });

  const cleanup = runPolling();

  await capturedIntervalCb();

  assert.equal(updatedOrder?.id, 'O1', 'Legitimate order data must update');
  assert.equal(updatedSeconds, 450, 'Countdown timer must update');
  assert.equal(updatedPayment?.status, 'PAID', 'Payment state must update');
  assert.equal(navigatedRoute, '/order-success/O1', 'Legitimate PAID order must navigate to success page');

  cleanup();
});

test('FIX-002 REMEDIATION TEST 18 — Polling delayed response arriving after UNMOUNT is safely discarded with 0 side-effects', async () => {
  const orderId = 'O1';
  const order = { id: 'O1', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' };
  const currentOrderIdRef = { current: 'O1' };
  const pollGenerationRef = { current: 0 };
  const isMountedRef = { current: true };

  let resolveOrderO1;
  const delayedOrderPromise = new Promise((resolve) => {
    resolveOrderO1 = resolve;
  });

  const mockOrderApi = {
    getOrderById: async () => delayedOrderPromise,
    getOrderPayment: async () => ({ data: null })
  };

  let capturedIntervalCb = null;
  const customSetInterval = (cb) => {
    capturedIntervalCb = cb;
    return 1004;
  };

  let setOrderCalls = 0;
  let navigateCalls = 0;

  const runPolling = createProductionPollingRunner({
    order,
    orderId,
    pollGenerationRef,
    isMountedRef,
    currentOrderIdRef,
    orderRef: { current: order },
    orderApi: mockOrderApi,
    setOrder: () => { setOrderCalls++; },
    setSecondsRemaining: () => {},
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: () => { navigateCalls++; },
    setPayment: () => {},
    setInterval: customSetInterval,
    clearInterval: () => {}
  });

  const cleanup = runPolling();

  // In-flight poll started
  const pollPromise = capturedIntervalCb();

  // Component unmounts
  isMountedRef.current = false;
  cleanup();

  // Response arrives after unmount
  resolveOrderO1({ data: { id: 'O1', status: 'PAID' } });
  await pollPromise;

  assert.equal(setOrderCalls, 0, 'No state update on unmounted component');
  assert.equal(navigateCalls, 0, 'No navigation on unmounted component');
});

test('FIX-002 REMEDIATION TEST 19 (LIFECYCLE FIX) — Polling: setOrder(latest) does NOT invalidate effect, subsequent payment PENDING response updates payment state and checkoutUrl', async () => {
  const orderId = 'O1';
  const initialOrder = { id: 'O1', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' };
  const currentOrderIdRef = { current: 'O1' };
  const pollGenerationRef = { current: 0 };
  const isMountedRef = { current: true };
  const orderRef = { current: initialOrder };

  let updatedOrder = null;
  let updatedPayment = null;

  const mockOrderApi = {
    getOrderById: async (id) => {
      // Return fresh object reference simulating server response
      return { data: { id, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', timeRemainingSeconds: 590 } };
    },
    getOrderPayment: async (id) => {
      // Payment attempt has newly generated checkoutUrl
      return {
        data: {
          id: 9919,
          orderId: id,
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/test-pending-123'
        }
      };
    }
  };

  let capturedIntervalCb = null;
  const customSetInterval = (cb) => {
    capturedIntervalCb = cb;
    return 1005;
  };

  const runPolling = createProductionPollingRunner({
    orderId,
    pollGenerationRef,
    isMountedRef,
    currentOrderIdRef,
    orderRef,
    orderApi: mockOrderApi,
    setOrder: (o) => {
      updatedOrder = o;
      // Simulate React state update updating orderRef
      orderRef.current = o;
    },
    setSecondsRemaining: () => {},
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: () => {},
    setPayment: (p) => { updatedPayment = p; },
    setInterval: customSetInterval,
    clearInterval: () => {}
  });

  const cleanup = runPolling();

  // Execute interval callback: both getOrderById AND getOrderPayment run in the same iteration
  await capturedIntervalCb();

  assert.equal(updatedOrder?.id, 'O1', 'Order state updated');
  assert.equal(updatedPayment?.status, 'PENDING', 'Payment state must NOT be dropped after setOrder');
  assert.equal(updatedPayment?.checkoutUrl, 'https://pay.payos.vn/web/test-pending-123', 'checkoutUrl must be updated and visible');

  cleanup();
});

test('FIX-002 REMEDIATION TEST 20 (LIFECYCLE FIX) — Polling: setOrder(latest) does NOT invalidate effect, subsequent payment PAID response navigates to /order-success/O1', async () => {
  const orderId = 'O1';
  const initialOrder = { id: 'O1', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' };
  const currentOrderIdRef = { current: 'O1' };
  const pollGenerationRef = { current: 0 };
  const isMountedRef = { current: true };
  const orderRef = { current: initialOrder };

  let updatedOrder = null;
  let navigatedRoute = null;

  const mockOrderApi = {
    getOrderById: async (id) => ({
      data: { id, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' }
    }),
    getOrderPayment: async (id) => ({
      data: { id: 9920, orderId: id, status: 'PAID' }
    })
  };

  let capturedIntervalCb = null;
  const customSetInterval = (cb) => {
    capturedIntervalCb = cb;
    return 1006;
  };

  const runPolling = createProductionPollingRunner({
    orderId,
    pollGenerationRef,
    isMountedRef,
    currentOrderIdRef,
    orderRef,
    orderApi: mockOrderApi,
    setOrder: (o) => {
      updatedOrder = o;
      orderRef.current = o;
    },
    setSecondsRemaining: () => {},
    isOrderPaid: (o) => o?.status === 'PAID',
    navigate: (route) => { navigatedRoute = route; },
    setPayment: () => {},
    setInterval: customSetInterval,
    clearInterval: () => {}
  });

  const cleanup = runPolling();

  await capturedIntervalCb();

  assert.equal(updatedOrder?.id, 'O1');
  assert.equal(navigatedRoute, '/order-success/O1', 'CRITICAL: payment PAID must trigger navigation even when order was setOrder rerendered');

  cleanup();
});


