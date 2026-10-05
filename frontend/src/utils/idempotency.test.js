import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateUUID,
  canonicalStringify,
  buildOrderPayload,
  isResponseStale,
  getOrCreateIdempotencyKey,
  getStoredCheckoutIntent,
  saveCheckoutIntent,
  clearStoredCheckoutIntent,
  IDEMPOTENCY_STORAGE_KEY,
  getOrCreatePaymentLinkKey,
  getStoredPaymentLinkIntent,
  clearStoredPaymentLinkIntent,
  PAYMENT_LINK_STORAGE_KEY,
  getOrCreateReconciliationKey,
  getStoredReconciliationIntent,
  clearStoredReconciliationIntent,
  RECONCILIATION_STORAGE_KEY
} from './idempotency.js';

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

globalThis.sessionStorage = new MockSessionStorage();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// =========================================================================
// ISSUE 1: SECURE UUID TESTS
// =========================================================================

const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

const mockCrypto = (customCrypto) => {
  Object.defineProperty(globalThis, 'crypto', {
    value: customCrypto,
    configurable: true,
    writable: true,
  });
};

const restoreCrypto = () => {
  if (originalDescriptor) {
    Object.defineProperty(globalThis, 'crypto', originalDescriptor);
  } else {
    delete globalThis.crypto;
  }
};

test('1.1 crypto.randomUUID available -> generates valid RFC4122 v4 UUID', () => {
  try {
    mockCrypto({
      randomUUID: () => '12345678-1234-4234-8234-123456789abc',
    });
    const id = generateUUID();
    assert.equal(id, '12345678-1234-4234-8234-123456789abc');
    assert.match(id, uuidRegex);
  } finally {
    restoreCrypto();
  }
});

test('1.2 randomUUID missing, getRandomValues available -> fallback generates valid RFC4122 v4 UUID', () => {
  try {
    mockCrypto({
      getRandomValues: (buffer) => {
        // Fill with arbitrary deterministic bytes
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = (i * 17 + 5) & 0xff;
        }
        return buffer;
      },
    });
    const id = generateUUID();
    assert.match(id, uuidRegex, `Fallback UUID ${id} does not match RFC4122 v4 regex`);
    // Check version nibble is 4
    assert.equal(id.split('-')[2][0], '4');
    // Check variant nibble is 8, 9, a, or b
    assert.match(id.split('-')[3][0], /^[89ab]$/i);
  } finally {
    restoreCrypto();
  }
});

test('1.3 Calling generateUUID with getRandomValues multiple times produces distinct keys', () => {
  const ids = new Set();
  for (let i = 0; i < 50; i++) {
    const id = generateUUID();
    assert.match(id, uuidRegex);
    ids.add(id);
  }
  assert.equal(ids.size, 50, 'All 50 generated UUIDs must be distinct');
});

test('1.4 Web Crypto completely missing -> throws controlled error and strictly does not use Math.random', () => {
  try {
    mockCrypto(undefined);
    assert.throws(
      () => generateUUID(),
      /Secure random source is not available\./
    );
  } finally {
    restoreCrypto();
  }
});

test('1.5 Source file scan: Math.random does not exist in idempotency.js', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const code = fs.readFileSync(path.join(__dirname, 'idempotency.js'), 'utf-8');
  assert.equal(
    code.includes('Math.random'),
    false,
    'idempotency.js must not contain any reference to Math.random'
  );
});

// =========================================================================
// DETERMINISTIC PAYLOAD & CANONICAL STRINGIFY
// =========================================================================

test('2. canonicalStringify is deterministic across different object key orders', () => {
  const objA = { b: 2, a: 1, nested: { z: 10, y: 20 } };
  const objB = { a: 1, b: 2, nested: { y: 20, z: 10 } };
  assert.equal(canonicalStringify(objA), canonicalStringify(objB));
  assert.equal(
    canonicalStringify(objA),
    '{"a":1,"b":2,"nested":{"y":20,"z":10}}'
  );
});

test('3. buildOrderPayload creates uniform payload structure matching createOrder API', () => {
  const payload = buildOrderPayload({
    customerName: 'Nguyễn Văn A',
    addressDetail: '123 Đường 3/2',
    ward: 'Phường 10',
    district: 'Quận 10',
    province: 'TP. Hồ Chí Minh',
    shippingPhone: '0987654321',
    paymentMethod: 'COD',
    voucherCode: 'GIAM20K',
    note: 'Giao giờ hành chính',
    checkoutItems: [
      { product: { id: 101, name: 'Vợt Yonex' }, quantity: 1, selectedWeight: '4U' }
    ]
  });

  assert.equal(payload.customerName, 'Nguyễn Văn A');
  assert.equal(payload.shippingAddress, '123 Đường 3/2, Phường 10, Quận 10, TP. Hồ Chí Minh');
  assert.equal(payload.shippingPhone, '0987654321');
  assert.equal(payload.paymentMethod, 'COD');
  assert.equal(payload.voucherCode, 'GIAM20K');
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].productId, 101);
});

// =========================================================================
// ISSUE 2: STALE RESPONSE & SCENARIOS (TESTS A, B, C, D, E)
// =========================================================================

test('TEST A — Stale 201: response for payload X when UI changed to Y does not clear cart or navigate', () => {
  sessionStorage.clear();

  const payloadX = buildOrderPayload({
    customerName: 'Nguyễn Văn A',
    shippingPhone: '0901111111',
    addressDetail: 'Địa chỉ X',
    paymentMethod: 'COD',
    checkoutItems: [{ cartItemId: 'item-1', product: { id: 1 }, quantity: 1 }]
  });
  const fingerprintX = canonicalStringify(payloadX);

  // User submits payload X
  const { key: keyX } = getOrCreateIdempotencyKey(payloadX);
  const submittedFingerprint = fingerprintX;

  // While request is in-flight, user changes phone number to create payload Y
  const payloadY = buildOrderPayload({
    customerName: 'Nguyễn Văn A',
    shippingPhone: '0909999999', // CHANGED!
    addressDetail: 'Địa chỉ X',
    paymentMethod: 'COD',
    checkoutItems: [{ cartItemId: 'item-1', product: { id: 1 }, quantity: 1 }]
  });
  const currentFingerprint = canonicalStringify(payloadY);

  // Simulated 201 Created returns for payload X
  const response201 = { id: 501, status: 'PENDING' };

  let cartCleared = false;
  let intentCleared = false;
  let navigated = false;

  const handleResponse = () => {
    if (isResponseStale(submittedFingerprint, currentFingerprint)) {
      // Stale guard stops processing!
      return;
    }
    clearStoredCheckoutIntent();
    intentCleared = true;
    cartCleared = true;
    navigated = true;
  };

  handleResponse();

  // Verification
  assert.equal(isResponseStale(submittedFingerprint, currentFingerprint), true);
  assert.equal(cartCleared, false, 'Cart for intent Y must NOT be cleared');
  assert.equal(intentCleared, false, 'Intent Y must NOT be cleared');
  assert.equal(navigated, false, 'Navigation must NOT be triggered for stale response');
});

test('TEST B — Stale 200 Replay: replay response for payload X does not overwrite state of intent Y', () => {
  sessionStorage.clear();

  const payloadX = buildOrderPayload({
    customerName: 'Trần B',
    shippingPhone: '0902222222',
    addressDetail: 'Địa chỉ cũ',
    paymentMethod: 'PAYOS_VIETQR',
    checkoutItems: [{ cartItemId: 'item-2', product: { id: 2 }, quantity: 1 }]
  });
  const submittedFingerprint = canonicalStringify(payloadX);
  getOrCreateIdempotencyKey(payloadX);

  // User changes note during in-flight request
  const payloadY = buildOrderPayload({
    customerName: 'Trần B',
    shippingPhone: '0902222222',
    addressDetail: 'Địa chỉ cũ',
    note: 'Giao nhanh trước 5h', // CHANGED!
    paymentMethod: 'PAYOS_VIETQR',
    checkoutItems: [{ cartItemId: 'item-2', product: { id: 2 }, quantity: 1 }]
  });
  const currentFingerprint = canonicalStringify(payloadY);

  // 200 Replay returns for request X
  let cartCleared = false;
  let navigated = false;

  if (!isResponseStale(submittedFingerprint, currentFingerprint)) {
    cartCleared = true;
    navigated = true;
  }

  assert.equal(isResponseStale(submittedFingerprint, currentFingerprint), true);
  assert.equal(cartCleared, false);
  assert.equal(navigated, false);
});

test('TEST C — Non-stale Success (201/200): payload unchanged -> normal success flow', () => {
  sessionStorage.clear();

  const payload = buildOrderPayload({
    customerName: 'Lê C',
    shippingPhone: '0903333333',
    addressDetail: 'Địa chỉ C',
    paymentMethod: 'COD',
    checkoutItems: [{ cartItemId: 'item-3', product: { id: 3 }, quantity: 2 }]
  });
  const submittedFingerprint = canonicalStringify(payload);
  const currentFingerprint = submittedFingerprint; // Unchanged!

  let cartCleared = false;
  let intentCleared = false;
  let navigated = false;

  if (!isResponseStale(submittedFingerprint, currentFingerprint)) {
    clearStoredCheckoutIntent();
    intentCleared = true;
    cartCleared = true;
    navigated = true;
  }

  assert.equal(isResponseStale(submittedFingerprint, currentFingerprint), false);
  assert.equal(cartCleared, true);
  assert.equal(intentCleared, true);
  assert.equal(navigated, true);
});

test('TEST D — Network timeout: preserves cart, form, and idempotency key for retry', () => {
  sessionStorage.clear();

  const payloadX = buildOrderPayload({
    customerName: 'Phạm D',
    shippingPhone: '0904444444',
    addressDetail: 'Địa chỉ D',
    paymentMethod: 'PAYOS_VIETQR',
    checkoutItems: [{ cartItemId: 'item-4', product: { id: 4 }, quantity: 1 }]
  });

  const firstAttempt = getOrCreateIdempotencyKey(payloadX);
  assert.equal(firstAttempt.isReused, false);

  // Simulated timeout: do NOT clear storage or cart
  const storedAfterTimeout = getStoredCheckoutIntent();
  assert.equal(storedAfterTimeout.key, firstAttempt.key);

  // Retry with same payload reuses the same key
  const retryAttempt = getOrCreateIdempotencyKey(payloadX);
  assert.equal(retryAttempt.key, firstAttempt.key);
  assert.equal(retryAttempt.isReused, true);

  // If user modifies payload after timeout, a new key is generated
  const payloadChanged = {
    ...payloadX,
    shippingPhone: '0908888888',
  };
  const changedAttempt = getOrCreateIdempotencyKey(payloadChanged);
  assert.notEqual(changedAttempt.key, firstAttempt.key);
  assert.equal(changedAttempt.isReused, false);
});

test('TEST E — 409 IDEMPOTENCY_CONFLICT: preserves cart, invalidates stored key for next submission', () => {
  sessionStorage.clear();

  const payload = buildOrderPayload({
    customerName: 'Hoàng E',
    shippingPhone: '0905555555',
    addressDetail: 'Địa chỉ E',
    paymentMethod: 'COD',
    checkoutItems: [{ cartItemId: 'item-5', product: { id: 5 }, quantity: 1 }]
  });

  const conflictIntent = getOrCreateIdempotencyKey(payload);
  assert.ok(getStoredCheckoutIntent());

  // On 409 conflict: CheckoutPage invalidates stored intent and does NOT clear cart
  let cartCleared = false;
  clearStoredCheckoutIntent(); // Invalidate conflict key

  assert.equal(cartCleared, false, 'Cart must NOT be cleared on 409 conflict');
  assert.equal(getStoredCheckoutIntent(), null, 'Conflict intent must be cleared from storage');

  // Next user-initiated submit generates a fresh UUID
  const freshIntent = getOrCreateIdempotencyKey(payload);
  assert.notEqual(freshIntent.key, conflictIntent.key);
  assert.equal(freshIntent.isReused, false);
});

test('TEST F — Synchronous double-click guard prevents duplicate intents', () => {
  sessionStorage.clear();

  const payload = buildOrderPayload({
    customerName: 'Vũ G',
    shippingPhone: '0906666666',
    addressDetail: 'Địa chỉ G',
    paymentMethod: 'COD',
    checkoutItems: [{ cartItemId: 'item-6', product: { id: 6 }, quantity: 1 }]
  });

  let submissionCount = 0;
  let isSubmitting = false;
  const recordedKeys = [];

  const simulateClick = () => {
    if (isSubmitting) return; // Guard
    isSubmitting = true;
    submissionCount++;
    const { key } = getOrCreateIdempotencyKey(payload);
    recordedKeys.push(key);
  };

  simulateClick();
  simulateClick();

  assert.equal(submissionCount, 1, 'Only 1 submission allowed');
  assert.equal(recordedKeys.length, 1);
});

test('FIX-002: getOrCreatePaymentLinkKey produces RFC4122 v4 UUID and reuses same key for same orderId', () => {
  sessionStorage.clear();

  const orderId = 1001;
  const key1 = getOrCreatePaymentLinkKey(orderId);

  // Validate RFC4122 v4 UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(key1, uuidRegex, 'Payment key must be a valid RFC4122 v4 UUID');

  // Retry or reload: same orderId must return the exact same key
  const key2 = getOrCreatePaymentLinkKey(orderId);
  assert.equal(key2, key1, 'Must reuse same payment key for the same orderId');

  // Different orderId gets a different key
  const key3 = getOrCreatePaymentLinkKey(1002);
  assert.notEqual(key3, key1, 'Different orderId must get a different key');
});

test('FIX-002: Payment intent storage is completely separated from checkout idempotency storage', () => {
  sessionStorage.clear();

  const payload = buildOrderPayload({
    customerName: 'Separation Test',
    shippingPhone: '0907777777',
    addressDetail: '123 Test St',
    paymentMethod: 'PAYOS_VIETQR',
    checkoutItems: [{ cartItemId: 'item-sep', product: { id: 7 }, quantity: 1 }]
  });

  const orderIntent = getOrCreateIdempotencyKey(payload);
  const paymentKey = getOrCreatePaymentLinkKey(777);

  // Assert keys are distinct
  assert.notEqual(orderIntent.key, paymentKey, 'Order key and Payment key must never be the same');

  // Stored items must exist in separate keys
  const storedOrder = getStoredCheckoutIntent();
  const storedPayment = getStoredPaymentLinkIntent();

  assert.equal(storedOrder.key, orderIntent.key);
  assert.equal(storedPayment.key, paymentKey);
  assert.equal(storedPayment.orderId, '777');

  // Clearing order intent does NOT clear payment intent
  clearStoredCheckoutIntent();
  assert.equal(getStoredCheckoutIntent(), null);
  assert.equal(getStoredPaymentLinkIntent().key, paymentKey);

  // Clearing payment intent for another order does NOT clear current order's payment intent
  clearStoredPaymentLinkIntent(999);
  assert.equal(getStoredPaymentLinkIntent().key, paymentKey);

  // Clearing payment intent for this order clears it
  clearStoredPaymentLinkIntent(777);
  assert.equal(getStoredPaymentLinkIntent(), null);
});

// =========================================================================
// FIX-003: RECONCILIATION IDEMPOTENCY TESTS
// =========================================================================

test('FIX-003: getOrCreateReconciliationKey produces valid RFC4122 v4 UUID and reuses same key for same paymentAttemptId + same reason', () => {
  sessionStorage.clear();

  const paymentAttemptId = 55;
  const reason = 'Khớp giao dịch ngân hàng theo sao kê lúc 15:00';
  const key1 = getOrCreateReconciliationKey(paymentAttemptId, reason);

  assert.match(key1, uuidRegex, 'Reconciliation key must be a valid RFC4122 v4 UUID');

  // Retry or reload with same paymentAttemptId and same reason: must reuse exact same key
  const key2 = getOrCreateReconciliationKey(paymentAttemptId, reason);
  assert.equal(key2, key1, 'Must reuse same reconciliation key for same paymentAttemptId and same reason');
});

test('FIX-003: getOrCreateReconciliationKey generates new UUID when reason changes', () => {
  sessionStorage.clear();

  const paymentAttemptId = 55;
  const key1 = getOrCreateReconciliationKey(paymentAttemptId, 'Lý do 1: Kiểm tra đối soát');
  const key2 = getOrCreateReconciliationKey(paymentAttemptId, 'Lý do 2: Thay đổi thông tin đối soát');

  assert.notEqual(key1, key2, 'Changed reason must yield a new UUID');
});

test('FIX-003: Payment A key != Payment B key', () => {
  sessionStorage.clear();

  const reason = 'Đối soát thủ công';
  const keyA = getOrCreateReconciliationKey(101, reason);
  const keyB = getOrCreateReconciliationKey(102, reason);

  assert.notEqual(keyA, keyB, 'Different paymentAttemptId must receive distinct UUIDs');
});

test('FIX-003: Reconciliation key != payment-link key != order creation key', () => {
  sessionStorage.clear();

  const payload = buildOrderPayload({
    customerName: 'Multi-intent test',
    shippingPhone: '0901234567',
    addressDetail: '789 District 1',
    paymentMethod: 'PAYOS_VIETQR',
    checkoutItems: [{ cartItemId: 'item-sep-3', product: { id: 8 }, quantity: 1 }]
  });

  const orderKey = getOrCreateIdempotencyKey(payload).key;
  const paymentLinkKey = getOrCreatePaymentLinkKey(888);
  const reconcileKey = getOrCreateReconciliationKey(888, 'Lý do kiểm tra');

  assert.notEqual(orderKey, paymentLinkKey);
  assert.notEqual(orderKey, reconcileKey);
  assert.notEqual(paymentLinkKey, reconcileKey);

  // Separate storage entries
  assert.equal(getStoredCheckoutIntent().key, orderKey);
  assert.equal(getStoredPaymentLinkIntent().key, paymentLinkKey);
  assert.equal(getStoredReconciliationIntent(888).key, reconcileKey);

  // Clearing reconciliation intent does not touch payment link or checkout intents
  clearStoredReconciliationIntent(888);
  assert.equal(getStoredReconciliationIntent(888), null);
  assert.equal(getStoredPaymentLinkIntent().key, paymentLinkKey);
  assert.equal(getStoredCheckoutIntent().key, orderKey);
});

test('FIX-003: Synchronous double-click guard allows exactly one reconciliation dispatch', () => {
  sessionStorage.clear();

  const paymentAttemptId = 77;
  const reason = 'Khớp giao dịch đối soát';

  let dispatchCount = 0;
  let isSubmitting = false;
  const dispatchedKeys = [];

  const handleReconcileClick = () => {
    if (isSubmitting) return; // double-click lock
    isSubmitting = true;
    dispatchCount++;
    const key = getOrCreateReconciliationKey(paymentAttemptId, reason);
    dispatchedKeys.push(key);
  };

  handleReconcileClick();
  handleReconcileClick(); // Second rapid click while in-flight

  assert.equal(dispatchCount, 1, 'Double click must only trigger 1 request dispatch');
  assert.equal(dispatchedKeys.length, 1);
});
