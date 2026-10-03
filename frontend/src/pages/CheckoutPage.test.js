/**
 * @file CheckoutPage.test.js
 * @description NOTE: This file is a Node.js unit lifecycle & logic harness test suite.
 * It tests the idempotency state machine, payload building, and stale-response guard algorithms in isolation.
 * For the REAL mounted DOM component runtime tests that import CheckoutPage.jsx and mount via React 18 createRoot,
 * see CheckoutPage.test.jsx (executed via `node run-component-tests.js`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { orderApi } from '../api/orderApi.js';
import {
  buildOrderPayload,
  isResponseStale,
  getOrCreateIdempotencyKey,
  getStoredCheckoutIntent,
  clearStoredCheckoutIntent,
  IDEMPOTENCY_STORAGE_KEY
} from '../utils/idempotency.js';

// Setup Mock SessionStorage for Node environment
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

globalThis.sessionStorage = new MockSessionStorage();

const sampleCartItem = {
  cartItemId: 'item-101',
  product: {
    id: 101,
    name: 'Vợt Cầu Lông Yonex Astrox 88D Pro',
    price: 3890000,
    stock: 10
  },
  quantity: 1,
  selectedWeight: '4U',
  selectedGrip: 'G5',
  stringingService: 'Căng cước 10.5kg',
  stringTension: '10.5kg'
};

/**
 * Creates an execution harness simulating CheckoutPage component's exact state,
 * refs, and handleSubmitOrder lifecycle.
 */
function createCheckoutComponentHarness(initialState = {}) {
  const state = {
    customerName: initialState.customerName || 'Nguyễn Văn A',
    shippingPhone: initialState.shippingPhone || '0901234567',
    addressDetail: initialState.addressDetail || '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    note: initialState.note || 'Giao giờ hành chính',
    paymentMethod: initialState.paymentMethod || 'COD',
    voucherCode: initialState.voucherCode || '',
    voucherSuccess: initialState.voucherSuccess || null,
    checkoutItems: initialState.checkoutItems || [sampleCartItem],
    loading: false,
    errorMsg: '',
    removedFromCart: [],
    navigatedTo: null,
    navigatedState: null
  };

  // Component refs (matching lines 150-155 of CheckoutPage.jsx)
  const isSubmittingRef = { current: false };
  const currentFingerprintRef = { current: '' };

  // Helper calculating live payload & fingerprint on every render (lines 160-175)
  function computeLiveState() {
    const payload = buildOrderPayload({
      customerName: state.customerName,
      shippingPhone: state.shippingPhone,
      addressDetail: state.addressDetail,
      note: state.note,
      paymentMethod: state.paymentMethod,
      checkoutItems: state.checkoutItems
    });
    const fingerprint = JSON.stringify(payload);
    currentFingerprintRef.current = fingerprint;
    return { payload, fingerprint };
  }

  // Initial render calculation
  computeLiveState();

  // Navigation mock
  const navigate = (path, options) => {
    state.navigatedTo = path;
    state.navigatedState = options?.state || null;
  };

  // Cart action mock
  const removeFromCart = (cartItemId) => {
    state.removedFromCart.push(cartItemId);
  };

  /**
   * Component's handleSubmitOrder implementation (exact match to lines 180-270)
   */
  async function handleSubmitOrder() {
    if (isSubmittingRef.current || state.loading) return;
    if (state.voucherCode.trim() && !state.voucherSuccess) {
      state.errorMsg = 'Vui lòng áp dụng lại mã giảm giá hoặc xóa mã trước khi đặt hàng.';
      return;
    }
    if (!state.customerName || !state.shippingPhone || !state.addressDetail) {
      state.errorMsg = 'Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng.';
      return;
    }

    if (state.checkoutItems.length === 0) {
      state.errorMsg = 'Không có sản phẩm nào được chọn để thanh toán.';
      return;
    }

    const { payload, fingerprint: currentFingerprint } = computeLiveState();
    const submittedFingerprint = currentFingerprint;

    let idempotencyKey;
    try {
      const intent = getOrCreateIdempotencyKey(payload);
      idempotencyKey = intent.key;
    } catch {
      state.errorMsg =
        'Không thể khởi tạo mã giao dịch an toàn (Web Crypto không khả dụng). Vui lòng thử lại trên trình duyệt hiện đại.';
      return;
    }

    isSubmittingRef.current = true;
    state.loading = true;
    state.errorMsg = '';

    try {
      const res = await orderApi.createOrder(payload, idempotencyKey);
      const createdOrder = res?.data ?? res;

      if (!createdOrder?.id) throw new Error('Máy chủ chưa trả về mã đơn hàng hợp lệ.');

      // STALE RESPONSE GUARD
      if (isResponseStale(submittedFingerprint, currentFingerprintRef.current)) {
        return;
      }

      // Success (both 201 Created and 200 Replay) for CURRENT checkout intent:
      clearStoredCheckoutIntent();
      state.checkoutItems.forEach((item) => removeFromCart(item.cartItemId));

      if (state.paymentMethod === 'COD') {
        navigate(`/order-success/${createdOrder.id}`, { state: { order: createdOrder } });
      } else {
        navigate(`/payment/qr/${createdOrder.id}`, { state: { order: createdOrder } });
      }
    } catch (err) {
      // Stale response guard for errors
      if (isResponseStale(submittedFingerprint, currentFingerprintRef.current)) {
        return;
      }

      const isConflict = err.response?.status === 409 || err.response?.data?.code === 'IDEMPOTENCY_CONFLICT';
      const apiMessage = err.response?.data?.message;

      if (isConflict) {
        clearStoredCheckoutIntent();
        state.errorMsg =
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Yêu cầu đặt hàng bị xung đột hoặc thông tin đã thay đổi. Vui lòng kiểm tra lại thông tin và thử lại.';
      } else {
        state.errorMsg =
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Không thể tạo đơn hàng. Giỏ hàng được giữ nguyên, vui lòng thử lại.';
      }
    } finally {
      isSubmittingRef.current = false;
      state.loading = false;
    }
  }

  // Simulate user changing form field
  function updateField(field, value) {
    state[field] = value;
    computeLiveState(); // re-render updates live fingerprint ref
  }

  return {
    state,
    isSubmittingRef,
    currentFingerprintRef,
    handleSubmitOrder,
    updateField,
    computeLiveState
  };
}

// =========================================================================
// TEST A — STALE 201
// =========================================================================
test('TEST A — Stale 201: response for payload X when UI changed to Y does not clear cart Y or navigate', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  let resolveOrderApi;
  const pendingPromise = new Promise((resolve) => {
    resolveOrderApi = resolve;
  });

  let capturedKey = null;
  let capturedPayload = null;
  orderApi.createOrder = (payload, key) => {
    capturedPayload = payload;
    capturedKey = key;
    return pendingPromise;
  };

  // User submits order for payload X
  const submitPromise = harness.handleSubmitOrder();
  assert.ok(capturedKey, 'Idempotency key must be attached to in-flight request');
  assert.equal(harness.isSubmittingRef.current, true, 'isSubmittingRef must be true while in-flight');

  // While request X is pending, user modifies note and shipping phone -> changes to payload Y
  harness.updateField('note', 'Giao sau 18h tối (Sửa đổi)');
  harness.updateField('shippingPhone', '0909999999');

  // Verify that live fingerprint ref was updated to Y while submitted was X
  assert.notEqual(
    JSON.stringify(capturedPayload),
    harness.currentFingerprintRef.current,
    'Live fingerprint must reflect changes to Y'
  );

  // Server responds with 201 Created for old payload X
  resolveOrderApi({ id: 1001, orderCode: 'ORD-STALE-201' });
  await submitPromise;

  // Assertions for Test A:
  assert.equal(harness.state.removedFromCart.length, 0, 'Cart Y must NOT be cleared by stale 201');
  assert.equal(harness.state.navigatedTo, null, 'Must NOT navigate for stale 201');
  assert.equal(harness.state.customerName, 'Nguyễn Văn A', 'Form Y must not be reset');
  assert.equal(harness.state.note, 'Giao sau 18h tối (Sửa đổi)', 'Form Y value must remain intact');
});

// =========================================================================
// TEST B — STALE 200 REPLAY
// =========================================================================
test('TEST B — Stale 200 Replay: replay response for payload X does not overwrite state of intent Y', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  let resolveOrderApi;
  const pendingPromise = new Promise((resolve) => {
    resolveOrderApi = resolve;
  });

  orderApi.createOrder = () => pendingPromise;

  const submitPromise = harness.handleSubmitOrder();

  // User alters address detail while request is pending
  harness.updateField('addressDetail', '456 Phố Bà Triệu, Hà Nội (Địa chỉ mới)');

  // Server returns 200 OK replay for old request X
  resolveOrderApi({ id: 1002, orderCode: 'ORD-STALE-200-REPLAY' });
  await submitPromise;

  // Assertions for Test B:
  assert.equal(harness.state.removedFromCart.length, 0, 'Cart Y must NOT be cleared by stale 200 replay');
  assert.equal(harness.state.navigatedTo, null, 'Must NOT navigate for stale 200 replay');
  assert.equal(harness.state.addressDetail, '456 Phố Bà Triệu, Hà Nội (Địa chỉ mới)');
});

// =========================================================================
// TEST C — NORMAL 201 SUCCESS
// =========================================================================
test('TEST C — Normal 201 Success: payload unchanged -> normal success flow', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  orderApi.createOrder = async (payload, key) => ({
    id: 1003,
    orderCode: 'ORD-NORMAL-201'
  });

  await harness.handleSubmitOrder();

  assert.equal(harness.state.removedFromCart.length, 1, 'Purchased cart item must be removed from cart');
  assert.equal(harness.state.removedFromCart[0], sampleCartItem.cartItemId);
  assert.equal(harness.state.navigatedTo, '/order-success/1003', 'Must navigate to order-success');
  assert.equal(getStoredCheckoutIntent(), null, 'Stored checkout intent must be cleared');
  assert.equal(harness.state.loading, false);
});

// =========================================================================
// TEST D — NORMAL 200 REPLAY
// =========================================================================
test('TEST D — Normal 200 Replay: same payload replay -> treated as success', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  orderApi.createOrder = async (payload, key) => ({
    id: 1004,
    orderCode: 'ORD-NORMAL-200'
  });

  await harness.handleSubmitOrder();

  assert.equal(harness.state.errorMsg, '', 'No error should be displayed for 200 replay');
  assert.equal(harness.state.removedFromCart.length, 1, 'Cart items removed on 200 replay');
  assert.equal(harness.state.navigatedTo, '/order-success/1004', 'Navigated to success route');
  assert.equal(getStoredCheckoutIntent(), null, 'Stored checkout intent cleared');
});

// =========================================================================
// TEST E — DOUBLE CLICK
// =========================================================================
test('TEST E — Double Click: synchronous guard prevents duplicate submission and multiple intents', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  let callCount = 0;
  const capturedKeys = [];
  orderApi.createOrder = async (payload, key) => {
    callCount++;
    capturedKeys.push(key);
    await new Promise((r) => setTimeout(r, 20));
    return { id: 1005 };
  };

  // Rapid double click
  const click1 = harness.handleSubmitOrder();
  const click2 = harness.handleSubmitOrder();

  await Promise.all([click1, click2]);

  assert.equal(callCount, 1, 'createOrder must be called exactly once');
  assert.equal(capturedKeys.length, 1);
});

// =========================================================================
// TEST F — TIMEOUT / NETWORK ERROR & RETRY
// =========================================================================
test('TEST F — Timeout: network error preserves cart and key; retry reuses same key', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  let attempt = 0;
  const recordedKeys = [];

  orderApi.createOrder = async (payload, key) => {
    attempt++;
    recordedKeys.push(key);
    if (attempt === 1) {
      const err = new Error('Network timeout');
      err.code = 'ECONNABORTED';
      throw err;
    }
    return { id: 1006 };
  };

  // Attempt 1: Network timeout
  await harness.handleSubmitOrder();

  assert.equal(harness.state.removedFromCart.length, 0, 'Cart must NOT be cleared on timeout');
  assert.equal(harness.state.navigatedTo, null, 'Must NOT navigate on timeout');
  assert.match(harness.state.errorMsg, /Không thể tạo đơn hàng\. Giỏ hàng được giữ nguyên/);

  const storedIntent = getStoredCheckoutIntent();
  assert.ok(storedIntent, 'Stored intent must be preserved on timeout');
  assert.equal(storedIntent.key, recordedKeys[0]);

  // Attempt 2: User clicks retry with unchanged payload
  await harness.handleSubmitOrder();

  assert.equal(attempt, 2, 'Two attempts made');
  assert.equal(recordedKeys[1], recordedKeys[0], 'Retry must send the EXACT SAME Idempotency-Key');
  assert.equal(harness.state.navigatedTo, '/order-success/1006', 'Retry success navigates to order-success');
});

// =========================================================================
// TEST G — RELOAD SAME PAYLOAD
// =========================================================================
test('TEST G — Reload Same Payload: recovers persisted key from sessionStorage', async () => {
  sessionStorage.clear();

  // Initial session generates and stores intent A
  const harness1 = createCheckoutComponentHarness();
  const { payload } = harness1.computeLiveState();
  const initialIntent = getOrCreateIdempotencyKey(payload);
  const keyA = initialIntent.key;

  // Page reload simulated: harness2 mounts fresh, reads same cart and form state
  const harness2 = createCheckoutComponentHarness();

  let usedKey = null;
  orderApi.createOrder = async (p, key) => {
    usedKey = key;
    return { id: 1007 };
  };

  await harness2.handleSubmitOrder();

  assert.equal(usedKey, keyA, 'Reloaded page submit must reuse persisted Idempotency-Key from sessionStorage');
});

// =========================================================================
// TEST H — PAYLOAD CHANGE AFTER RELOAD
// =========================================================================
test('TEST H — Changed Payload After Reload: produces new UUID key', async () => {
  sessionStorage.clear();

  // Session has persisted key A for payload X
  const harness1 = createCheckoutComponentHarness({ shippingPhone: '0901111111' });
  const { payload: payloadX } = harness1.computeLiveState();
  const intentX = getOrCreateIdempotencyKey(payloadX);
  const keyA = intentX.key;

  // User reloads and changes phone to 0902222222 (payload Y)
  const harness2 = createCheckoutComponentHarness({ shippingPhone: '0902222222' });

  let usedKey = null;
  orderApi.createOrder = async (p, key) => {
    usedKey = key;
    return { id: 1008 };
  };

  await harness2.handleSubmitOrder();

  assert.notEqual(usedKey, keyA, 'Changed payload after reload must generate a brand new Idempotency-Key');
  assert.match(
    usedKey,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'New key must be valid RFC4122 v4 UUID'
  );
});

// =========================================================================
// TEST I — NO WEB CRYPTO AT COMPONENT LEVEL
// =========================================================================
test('TEST I — No Web Crypto: controlled error displayed, submit blocked safely, no request sent', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  let orderApiCalled = false;
  orderApi.createOrder = async () => {
    orderApiCalled = true;
    return { id: 1009 };
  };

  // Temporarily disable global crypto
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true
    });

    await harness.handleSubmitOrder();

    assert.equal(orderApiCalled, false, 'createOrder must NOT be called when crypto is missing');
    assert.equal(harness.state.removedFromCart.length, 0, 'Cart must NOT be cleared');
    assert.equal(harness.state.navigatedTo, null, 'Must NOT navigate');
    assert.match(
      harness.state.errorMsg,
      /Web Crypto không khả dụng/,
      'User-friendly error banner must be displayed'
    );
  } finally {
    // Restore global crypto
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'crypto', originalDescriptor);
    } else {
      delete globalThis.crypto;
    }
  }
});

// =========================================================================
// TEST J — 409 IDEMPOTENCY_CONFLICT
// =========================================================================
test('TEST J — 409 Conflict: preserves cart, invalidates stored key for next submission', async () => {
  sessionStorage.clear();
  const harness = createCheckoutComponentHarness();

  let attempt = 0;
  const usedKeys = [];

  orderApi.createOrder = async (payload, key) => {
    attempt++;
    usedKeys.push(key);
    if (attempt === 1) {
      const error = new Error('Conflict');
      error.response = {
        status: 409,
        data: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Yêu cầu đặt hàng bị xung đột hoặc thông tin đã thay đổi. Vui lòng kiểm tra lại thông tin và thử lại.'
        }
      };
      throw error;
    }
    return { id: 1010 };
  };

  // Attempt 1: Server rejects with 409
  await harness.handleSubmitOrder();

  assert.equal(harness.state.removedFromCart.length, 0, 'Cart must NOT be cleared on 409 conflict');
  assert.equal(harness.state.navigatedTo, null, 'Must NOT navigate on 409 conflict');
  assert.match(harness.state.errorMsg, /Yêu cầu đặt hàng bị xung đột/);
  assert.equal(getStoredCheckoutIntent(), null, 'Stored key must be invalidated from storage on 409');

  // Attempt 2: User re-submits after conflict -> must generate fresh UUID
  await harness.handleSubmitOrder();

  assert.equal(attempt, 2);
  assert.notEqual(usedKeys[1], usedKeys[0], 'Subsequent submit after conflict must generate a fresh UUID');
  assert.equal(harness.state.navigatedTo, '/order-success/1010');
});
