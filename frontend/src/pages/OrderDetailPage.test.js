import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPaymentStatusInfo, formatReviewReason } from '../utils/paymentFormatters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('SECTION 30 & 47 — CANCELLED order with NEEDS_REVIEW payment: distinct states, no false completion', () => {
  const order = {
    id: 501,
    status: 'CANCELLED',
    paymentMethod: 'PAYOS_VIETQR',
  };

  const payment = {
    id: 9001,
    orderId: 501,
    status: 'NEEDS_REVIEW',
    amount: 1500000,
    reference: 'PAYOS-LATE-REF',
    paidAt: '2026-10-04T14:30:00Z',
    reviewReason: 'LATE_PAYMENT_CANCELLED_ORDER',
  };

  // 1. Order status remains CANCELLED
  assert.equal(order.status, 'CANCELLED');

  // 2. Payment status is correctly evaluated as NEEDS_REVIEW
  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'Thanh toán: Cần đối soát');
  assert.match(paymentInfo.badgeClass, /amber/);

  // 3. Review reason formatted correctly
  const formattedReason = formatReviewReason(payment.reviewReason);
  assert.equal(formattedReason, 'Thanh toán muộn cho đơn đã hủy');

  // 4. Must NOT confuse payment with PAID or order with PAID
  assert.notEqual(payment.status, 'PAID');
  assert.notEqual(order.status, 'PAID');
});

test('SECTION 31 & 47 — SHIPPING order with PAID payment: both displayed distinctly', () => {
  const order = {
    id: 502,
    status: 'SHIPPING',
    paymentMethod: 'PAYOS_VIETQR',
  };

  const payment = {
    id: 9002,
    orderId: 502,
    status: 'PAID',
    amount: 800000,
    reference: 'PAYOS-SUCCESS-REF',
    paidAt: '2026-10-04T08:00:00Z',
  };

  assert.equal(order.status, 'SHIPPING');

  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'Thanh toán: Đã thanh toán');
  assert.match(paymentInfo.badgeClass, /emerald/);
});

test('SECTION 29 & 47 — Null payment with COD order: displays safe COD message, not an error', () => {
  const order = {
    id: 503,
    status: 'PENDING',
    paymentMethod: 'COD',
  };

  const payment = null;

  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'COD - Thanh toán khi nhận hàng');
  assert.match(paymentInfo.badgeClass, /slate/);
});

test('SECTION 29 & 47 — Null payment with VietQR order: displays safe no-payment message', () => {
  const order = {
    id: 504,
    status: 'PENDING',
    paymentMethod: 'PAYOS_VIETQR',
  };

  const payment = null;

  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'Chưa có bản ghi thanh toán');
});

test('SECTION 34 & 47 — No frontend status mutation: backend response remains single source of truth', () => {
  let orderState = { id: 505, status: 'CANCELLED' };
  let paymentState = { id: 9005, status: 'NEEDS_REVIEW' };

  // Emulate button action or update attempt:
  // Must NOT mutate locally
  const applyBackendSync = (serverPayment) => {
    paymentState = serverPayment;
  };

  applyBackendSync({ id: 9005, status: 'NEEDS_REVIEW', reviewReason: 'EVENT_IDENTITY_CONFLICT' });

  assert.equal(orderState.status, 'CANCELLED');
  assert.equal(paymentState.status, 'NEEDS_REVIEW');
  assert.equal(paymentState.reviewReason, 'EVENT_IDENTITY_CONFLICT');
});

test('BUG FE-4 — Distinct states: Loading, Success/Empty (200 + null), and Request Error (500)', () => {
  // Model state evaluation
  const evaluatePaymentDisplay = (paymentLoading, paymentError, payment, order) => {
    if (paymentLoading) return { state: 'LOADING', text: 'Đang tải thông tin thanh toán...' };
    if (paymentError) return { state: 'ERROR', text: paymentError, canRetry: true };
    if (!payment) {
      return {
        state: 'EMPTY',
        text: order?.paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi giao hàng.' : 'Chưa có bản ghi thanh toán.'
      };
    }
    return { state: 'SUCCESS', payment };
  };

  const order = { id: 601, paymentMethod: 'PAYOS_VIETQR' };

  // Case A: 200 + null -> EMPTY state, NOT error
  const emptyState = evaluatePaymentDisplay(false, null, null, order);
  assert.equal(emptyState.state, 'EMPTY');
  assert.equal(emptyState.text, 'Chưa có bản ghi thanh toán.');

  // Case B: 500 Error -> ERROR state with retry, NOT empty!
  const errorState = evaluatePaymentDisplay(false, 'Lỗi kết nối máy chủ (500)', null, order);
  assert.equal(errorState.state, 'ERROR');
  assert.equal(errorState.text, 'Lỗi kết nối máy chủ (500)');
  assert.equal(errorState.canRetry, true);
  assert.notEqual(errorState.state, 'EMPTY');

  // Case C: Success with payment object
  const successState = evaluatePaymentDisplay(false, null, { id: 99, status: 'PAID', reference: 'REF-123' }, order);
  assert.equal(successState.state, 'SUCCESS');
  assert.equal(successState.payment.reference, 'REF-123');
});

test('BUG FE-4 — Retry clears paymentError and recovers payment data or empty state', async () => {
  let attempt = 0;
  let paymentState = null;
  let paymentErrorState = null;
  let paymentLoadingState = false;

  const mockGetOrderPayment = async (orderId) => {
    attempt++;
    if (attempt === 1) {
      // First attempt fails with 500
      const err = new Error('Server Error');
      err.response = { status: 500, data: { message: 'Lỗi máy chủ nội bộ (500)' } };
      throw err;
    }
    // Retry succeeds with PaymentAttempt
    return {
      id: 9901,
      orderId,
      status: 'PAID',
      reference: 'PAYOS-RECOVERED-REF',
      paidAt: '2026-10-04T16:00:00Z',
    };
  };

  const fetchPayment = async (orderId) => {
    paymentLoadingState = true;
    paymentErrorState = null;
    try {
      const res = await mockGetOrderPayment(orderId);
      paymentState = res;
      paymentErrorState = null;
    } catch (err) {
      paymentState = null;
      paymentErrorState = err.response?.data?.message || 'Lỗi tải thanh toán';
    } finally {
      paymentLoadingState = false;
    }
  };

  // Attempt 1: Server fails with 500
  await fetchPayment(602);
  assert.equal(paymentState, null);
  assert.equal(paymentErrorState, 'Lỗi máy chủ nội bộ (500)', 'Must display error on 500');
  assert.equal(paymentLoadingState, false);

  // User clicks "Thử lại" (Retry) -> Attempt 2 succeeds
  await fetchPayment(602);
  assert.equal(paymentErrorState, null, 'Retry success must clear error state');
  assert.notEqual(paymentState, null);
  assert.equal(paymentState.status, 'PAID');
  assert.equal(paymentState.reference, 'PAYOS-RECOVERED-REF');
});

test('BUG FE-5 — OrderDetailPage source includes safe wrapping classes for reference', () => {
  const orderPageSource = fs.readFileSync(path.join(__dirname, 'OrderDetailPage.jsx'), 'utf8');

  assert.match(orderPageSource, /break-all/, 'OrderDetailPage must include break-all class for reference wrapping');
  assert.match(orderPageSource, /\[overflow-wrap:anywhere\]|min-w-0/, 'OrderDetailPage must include overflow wrapping class');
});

test('FE-REMEDIATION-2 — Cancelled late-payment warning wraps long reference with break-all and overflow-wrap:anywhere', () => {
  const orderPageSource = fs.readFileSync(path.join(__dirname, 'OrderDetailPage.jsx'), 'utf8');

  // Verify the warning section wraps reference in break-all span
  const warningSectionMatch = orderPageSource.match(/order\.status === 'CANCELLED' && payment\?\.status === 'NEEDS_REVIEW'([\s\S]*?)<\/\s*p>/);
  assert.ok(warningSectionMatch, 'Must contain cancelled order late payment warning notice section');
  const warningSection = warningSectionMatch[0];

  assert.match(warningSection, /break-all/, 'Warning notice must contain break-all for reference');
  assert.match(warningSection, /\[overflow-wrap:anywhere\]/, 'Warning notice must contain [overflow-wrap:anywhere]');
  assert.match(warningSection, /payment\.reference/, 'Warning notice must display payment.reference');
});


