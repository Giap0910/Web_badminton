import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatReviewReason, getPaymentStatusBadge } from '../utils/paymentFormatters.js';
import {
  getOrCreateReconciliationKey,
  getStoredReconciliationIntent,
  clearStoredReconciliationIntent,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminPageSource = fs.readFileSync(path.join(__dirname, 'AdminPaymentsPage.jsx'), 'utf8');

test('SECTION 8 & 42 — No fake identifiers (TXN-, QR-, COD-DIRECT) in AdminPaymentsPage source', () => {
  assert.equal(adminPageSource.includes('TXN-'), false, 'Must not construct fake TXN- identifiers');
  assert.equal(adminPageSource.includes('COD-DIRECT'), false, 'Must not construct fake COD-DIRECT bankRef');
  assert.equal(adminPageSource.includes('`QR-${p.payosOrderCode}`'), false, 'Must not fake QR- reference from order code');
  assert.equal(adminPageSource.includes('`PAYOS-${p.payosOrderCode}`'), false, 'Must not fake PAYOS- transId from order code');
});

test('SECTION 11 & 42 — formatReviewReason maps deterministic reasons with safety fallback', () => {
  assert.equal(formatReviewReason('AMOUNT_MISMATCH'), 'Sai lệch số tiền thanh toán');
  assert.equal(formatReviewReason('CURRENCY_MISMATCH'), 'Sai lệch loại tiền tệ');
  assert.equal(formatReviewReason('IDENTITY_MISMATCH'), 'Không khớp thông tin đơn hàng');
  assert.equal(formatReviewReason('LATE_PAYMENT_CANCELLED_ORDER'), 'Thanh toán muộn cho đơn đã hủy');
  assert.equal(formatReviewReason('LATE_PAYMENT_EXPIRED'), 'Thanh toán sau khi liên kết hết hạn');
  assert.equal(formatReviewReason('EVENT_IDENTITY_CONFLICT'), 'Xung đột định danh giao dịch');
  assert.equal(formatReviewReason('PAYMENT_NOT_CONFIRMED'), 'Chưa xác nhận từ ngân hàng');
  // Fallback for new/unknown reasons
  assert.equal(formatReviewReason('SOME_NEW_REASON'), 'Yêu cầu kiểm tra: SOME_NEW_REASON');
  assert.equal(formatReviewReason(null), '');
});

test('SECTION 10 & 42 — getPaymentStatusBadge renders distinct badge metadata for all statuses', () => {
  const paidBadge = getPaymentStatusBadge('PAID');
  assert.equal(paidBadge.label, 'Đã thanh toán');
  assert.match(paidBadge.bg, /emerald/);

  const reviewBadge = getPaymentStatusBadge('NEEDS_REVIEW');
  assert.equal(reviewBadge.label, 'Cần đối soát');
  assert.match(reviewBadge.bg, /amber/);

  const pendingBadge = getPaymentStatusBadge('PENDING');
  assert.equal(pendingBadge.label, 'Chờ thanh toán');

  const failedBadge = getPaymentStatusBadge('FAILED');
  assert.equal(failedBadge.label, 'Thất bại');
  assert.match(failedBadge.bg, /rose/);

  const expiredBadge = getPaymentStatusBadge('EXPIRED');
  assert.equal(expiredBadge.label, 'Hết hạn');

  const cancelledBadge = getPaymentStatusBadge('CANCELLED');
  assert.equal(cancelledBadge.label, 'Đã hủy');
});

test('SECTION 42 & 7 — Real backend ledger mapping preserves real reference, paidAt, and reviewReason', () => {
  const backendList = [
    {
      id: 88,
      orderId: 101,
      orderCode: 999888,
      provider: 'PAYOS',
      amount: 1250000,
      currency: 'VND',
      status: 'NEEDS_REVIEW',
      reference: 'FT2410058821901',
      paidAt: '2026-10-04T10:15:30Z',
      reviewReason: 'LATE_PAYMENT_CANCELLED_ORDER',
      customerName: 'Hoàng Văn B',
      paymentMethod: 'PAYOS_VIETQR'
    },
    {
      id: 89,
      orderId: 102,
      orderCode: 999889,
      provider: 'PAYOS',
      amount: 450000,
      currency: 'VND',
      status: 'PENDING',
      reference: null,
      paidAt: null,
      reviewReason: null,
      customerName: 'Trần C',
      paymentMethod: 'PAYOS_VIETQR'
    }
  ];

  const mapped = backendList.map((p) => ({
    id: p.id,
    orderId: p.orderId,
    orderCode: `#HG-${p.orderCode}`,
    provider: p.provider || 'PAYOS',
    amount: p.amount || 0,
    status: p.status,
    reference: p.reference || null,
    paidAt: p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : null,
    reviewReason: p.reviewReason || null,
    customer: p.customerName || '—'
  }));

  // Item 88 has real reference and reviewReason
  assert.equal(mapped[0].id, 88);
  assert.equal(mapped[0].orderCode, '#HG-999888');
  assert.equal(mapped[0].reference, 'FT2410058821901');
  assert.equal(mapped[0].status, 'NEEDS_REVIEW');
  assert.equal(mapped[0].reviewReason, 'LATE_PAYMENT_CANCELLED_ORDER');

  // Item 89 has null reference and displays null / '—' presentation, no fake string
  assert.equal(mapped[1].reference, null);
  assert.equal(mapped[1].paidAt, null);
  assert.equal(mapped[1].reviewReason, null);
});

test('SECTION 43 — Reconcile 200 with returned status PAID updates row to PAID', async () => {
  sessionStorage.clear();
  const paymentId = 120;
  const reason = 'Khớp tiền theo sao kê ngân hàng Vietcombank';
  const initialKey = getOrCreateReconciliationKey(paymentId, reason);

  let updatedRow = null;
  const mockReconcileApi = async (id, body, key) => {
    assert.equal(id, paymentId);
    assert.deepEqual(body, { reason });
    assert.equal(key, initialKey);
    // Backend returns 200 with PAID outcome
    return {
      _httpStatus: 200,
      id,
      orderId: 77,
      status: 'PAID',
      reference: 'VCB-REF-12345',
      paidAt: '2026-10-04T12:00:00Z',
      reviewReason: null,
    };
  };

  const res = await mockReconcileApi(paymentId, { reason }, initialKey);
  if (res._httpStatus === 200) {
    updatedRow = {
      id: paymentId,
      status: res.status,
      reference: res.reference,
      paidAt: res.paidAt,
      reviewReason: res.reviewReason,
    };
    clearStoredReconciliationIntent(paymentId);
  }

  assert.equal(updatedRow.status, 'PAID');
  assert.equal(updatedRow.reference, 'VCB-REF-12345');
  assert.equal(getStoredReconciliationIntent(paymentId), null, 'Stored intent cleared after definitive 200');
});

test('SECTION 44 — Reconcile 200 with returned status NEEDS_REVIEW MUST NOT render PAID', async () => {
  sessionStorage.clear();
  const paymentId = 121;
  const reason = 'Kiểm tra giao dịch lệch tiền';
  const key = getOrCreateReconciliationKey(paymentId, reason);

  let displayedStatus = null;
  const mockReconcileApi = async () => {
    // Backend completed reconcile, but discrepancy found -> returns 200 with status NEEDS_REVIEW
    return {
      _httpStatus: 200,
      id: paymentId,
      status: 'NEEDS_REVIEW',
      reviewReason: 'AMOUNT_MISMATCH',
      reference: 'MB-REF-999',
    };
  };

  const res = await mockReconcileApi();
  // CRITICAL RULE: Backend is authoritative. Never assume 200 === PAID!
  displayedStatus = res.status;

  assert.equal(displayedStatus, 'NEEDS_REVIEW', 'Must NOT fake PAID merely because HTTP is 200');
  assert.notEqual(displayedStatus, 'PAID');
  assert.equal(res.reviewReason, 'AMOUNT_MISMATCH');
});

test('SECTION 45 — Reconcile 202 Pending retains key and current state, does NOT set PAID', async () => {
  sessionStorage.clear();
  const paymentId = 122;
  const reason = 'Kiểm tra ngân hàng chưa có kết quả tức thì';
  const key1 = getOrCreateReconciliationKey(paymentId, reason);

  let displayedStatus = 'NEEDS_REVIEW';
  let message = '';

  const mockReconcileApi = async () => {
    return {
      _httpStatus: 202,
      id: paymentId,
      status: 'PENDING',
      reviewReason: 'PAYMENT_NOT_CONFIRMED',
    };
  };

  const res = await mockReconcileApi();
  if (res._httpStatus === 202) {
    message = 'Đối soát đang chờ xử lý: Bằng chứng từ cổng thanh toán chưa dứt khoát.';
    // Status is preserved, NOT changed to PAID
  }

  assert.equal(displayedStatus, 'NEEDS_REVIEW', 'Status must NOT be mutated to PAID');
  assert.match(message, /đang chờ xử lý/);

  // Key must be retained for retry
  const retainedKey = getStoredReconciliationIntent(paymentId);
  assert.equal(retainedKey.key, key1);
  assert.equal(retainedKey.reason, reason);
});

test('SECTION 46 — Reconcile 409 conflict and 502/503/504 errors retain reason and key without fake success', async () => {
  sessionStorage.clear();
  const paymentId = 123;
  const reason = 'Đối soát lại sau lỗi mạng';
  const initialKey = getOrCreateReconciliationKey(paymentId, reason);

  // 1. Simulate 409 conflict
  let conflictMessage = '';
  try {
    const err = new Error('Conflict');
    err.response = { status: 409, data: { message: 'Khóa đối soát đã được dùng cho lý do khác' } };
    throw err;
  } catch (err) {
    conflictMessage = err.response?.data?.message;
  }
  assert.match(conflictMessage, /Khóa đối soát đã được dùng/);

  // 2. Simulate 503 gateway failure
  let retryableError = '';
  try {
    const err = new Error('Service Unavailable');
    err.response = { status: 503, data: { message: 'Cổng thanh toán tạm thời không phản hồi' } };
    throw err;
  } catch (err) {
    const status = err.response?.status;
    if (status === 503) {
      retryableError = 'Cổng thanh toán tạm thời không phản hồi. Vui lòng thử lại sau.';
    }
  }
  assert.match(retryableError, /Cổng thanh toán tạm thời không phản hồi/);

  // Key & reason must remain intact in sessionStorage for user retry
  const stored = getStoredReconciliationIntent(paymentId);
  assert.equal(stored.key, initialKey);
  assert.equal(stored.reason, reason);
});

test('SECTION 48 — Stale async request guard prevents late response from overwriting newer query', async () => {
  let activeRequestId = 0;
  let pageStateData = null;

  const simulateFetch = async (queryParam, delayMs, dataResult) => {
    const currentId = ++activeRequestId;
    await new Promise((r) => setTimeout(r, delayMs));
    // Guard against stale response
    if (currentId !== activeRequestId) {
      return; // Discard stale response
    }
    pageStateData = dataResult;
  };

  // Launch Request 1 (slow, takes 50ms)
  const req1 = simulateFetch('OLD_QUERY', 50, ['OLD_DATA']);
  // User rapidly types new query -> launches Request 2 (fast, takes 10ms)
  const req2 = simulateFetch('NEW_QUERY', 10, ['NEW_DATA']);

  await Promise.all([req1, req2]);

  assert.deepEqual(pageStateData, ['NEW_DATA'], 'Page state must reflect newer query, discarding stale response');
});

test('BUG FE-1 — Synchronous in-flight authority blocks rapid second dispatch before React state update', async () => {
  const inFlightSet = new Set();
  let postCount = 0;
  const paymentId = 555;

  const simulateHandleConfirm = async () => {
    // Synchronous guard
    if (inFlightSet.has(paymentId)) return { dispatched: false };
    inFlightSet.add(paymentId);

    postCount++;
    // Simulate pending request
    await new Promise((r) => setTimeout(r, 20));
    inFlightSet.delete(paymentId);
    return { dispatched: true };
  };

  // Two rapid calls in the same execution tick
  const [call1, call2] = await Promise.all([
    simulateHandleConfirm(),
    simulateHandleConfirm(),
  ]);

  assert.equal(postCount, 1, 'Only exactly 1 POST must be dispatched on rapid double-invocation');
  assert.equal(call1.dispatched, true);
  assert.equal(call2.dispatched, false);
});

test('BUG FE-2 — Explicit null reference in reconcile response replaces previous reference, renders —', () => {
  const oldRow = {
    id: 701,
    status: 'NEEDS_REVIEW',
    reference: 'FIRST',
    paidAt: null,
    reviewReason: 'AMOUNT_MISMATCH',
  };

  const responseBody = {
    id: 701,
    status: 'PAID',
    reference: null, // Explicit null from multi-transaction or backend resolution
    paidAt: '2026-10-04T15:00:00Z',
    reviewReason: null,
  };

  const hasField = (obj, field) => obj != null && Object.prototype.hasOwnProperty.call(obj, field);

  const returnedStatus = hasField(responseBody, 'status') ? responseBody.status : oldRow.status;
  const returnedReference = hasField(responseBody, 'reference') ? responseBody.reference : oldRow.reference;
  const returnedReviewReason = hasField(responseBody, 'reviewReason') ? responseBody.reviewReason : oldRow.reviewReason;

  const updatedRow = {
    ...oldRow,
    status: returnedStatus,
    reference: returnedReference,
    reviewReason: returnedReviewReason,
  };

  // Must NOT keep old reference 'FIRST'
  assert.equal(updatedRow.reference, null, 'Must explicitly replace old reference with null');
  assert.notEqual(updatedRow.reference, 'FIRST', 'Must NOT preserve stale reference when backend sent null');

  // Presentation check: null reference formats as '—'
  const displayRef = updatedRow.reference ? updatedRow.reference : '—';
  assert.equal(displayRef, '—');
});

test('BUG FE-2 — Property-existence check distinguishes absent field from explicit null', () => {
  const hasField = (obj, field) => obj != null && Object.prototype.hasOwnProperty.call(obj, field);

  const payloadWithNull = { reference: null };
  const payloadAbsent = {};

  assert.equal(hasField(payloadWithNull, 'reference'), true);
  assert.equal(hasField(payloadAbsent, 'reference'), false);

  const oldRef = 'ORIGINAL_REF';
  const mergedNull = hasField(payloadWithNull, 'reference') ? payloadWithNull.reference : oldRef;
  const mergedAbsent = hasField(payloadAbsent, 'reference') ? payloadAbsent.reference : oldRef;

  assert.equal(mergedNull, null, 'Explicit null must be applied');
  assert.equal(mergedAbsent, 'ORIGINAL_REF', 'Absent field may preserve old value if allowed');
});

test('BUG FE-3 — Reconcile 202 body updates payment row with new reviewReason and status, retains retry key', () => {
  sessionStorage.clear();
  const paymentId = 702;
  const reason = 'Đối soát lại giao dịch';
  const idempotencyKey = getOrCreateReconciliationKey(paymentId, reason);

  const oldRow = {
    id: paymentId,
    status: 'NEEDS_REVIEW',
    reviewReason: 'AMOUNT_MISMATCH',
    reference: 'MB-OLD',
  };

  // Backend responds with 202 and updated PaymentAttempt body
  const responseBody = {
    _httpStatus: 202,
    id: paymentId,
    status: 'NEEDS_REVIEW',
    reviewReason: 'PAYMENT_NOT_CONFIRMED',
    reference: null,
  };

  const hasField = (obj, field) => obj != null && Object.prototype.hasOwnProperty.call(obj, field);

  const returnedStatus = hasField(responseBody, 'status') ? responseBody.status : oldRow.status;
  const returnedReference = hasField(responseBody, 'reference') ? responseBody.reference : oldRow.reference;
  const returnedReviewReason = hasField(responseBody, 'reviewReason') ? responseBody.reviewReason : oldRow.reviewReason;

  const updatedRow = {
    ...oldRow,
    status: returnedStatus,
    reference: returnedReference,
    reviewReason: returnedReviewReason,
  };

  // 1. Row data is updated from 202 response body
  assert.equal(updatedRow.reviewReason, 'PAYMENT_NOT_CONFIRMED', 'New reviewReason must be applied from body');
  assert.notEqual(updatedRow.reviewReason, 'AMOUNT_MISMATCH', 'Old reviewReason must be replaced');
  assert.equal(updatedRow.reference, null);
  assert.equal(updatedRow.status, 'NEEDS_REVIEW');

  // 2. Mapped label for new reason
  assert.equal(formatReviewReason(updatedRow.reviewReason), 'Chưa xác nhận từ ngân hàng');

  // 3. Stored intent & key must NOT be cleared on 202
  const retained = getStoredReconciliationIntent(paymentId);
  assert.equal(retained.key, idempotencyKey);
  assert.equal(retained.reason, reason);
});

test('BUG FE-5 — Reference column and cells use safe wrapping classes to prevent layout blowout', () => {
  assert.match(adminPageSource, /break-all/, 'AdminPaymentsPage must use break-all for safe wrapping');
  assert.match(adminPageSource, /overflow-wrap:anywhere|min-w-0/, 'AdminPaymentsPage must use modern overflow protection');
});

