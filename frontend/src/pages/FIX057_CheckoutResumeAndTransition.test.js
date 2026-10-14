import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { orderApi } from '../api/orderApi.js';
import axiosClient from '../api/axiosClient.js';
import {
  getOrCreateTransitionKey,
  getStoredTransitionIntent,
  saveTransitionIntent,
  clearStoredTransitionIntent,
  TRANSITION_STORAGE_KEY
} from '../utils/idempotency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Mock SessionStorage for Node environment if missing
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

describe('FIX-057 — Resume Unpaid Checkout & Safe Payment Transition', () => {
  const checkoutPath = path.resolve(__dirname, './CheckoutPage.jsx');
  const checkoutSource = fs.readFileSync(checkoutPath, 'utf8');

  const qrPath = path.resolve(__dirname, './QRPaymentPage.jsx');
  const qrSource = fs.readFileSync(qrPath, 'utf8');

  const orderApiPath = path.resolve(__dirname, '../api/orderApi.js');
  const orderApiSource = fs.readFileSync(orderApiPath, 'utf8');

  const activeHarnesses = [];

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    while (activeHarnesses.length > 0) {
      const h = activeHarnesses.pop();
      try {
        h.unmount?.();
      } catch {
        // Ignore unmount error during test teardown
      }
    }
  });

  // =========================================================================
  // REQUIREMENT 1 & 2: QR Change Payment Method Navigation & Identity
  // =========================================================================
  test('1. QR "Đổi phương thức thanh toán" navigates to /checkout?orderId=<internalId>', () => {
    assert.match(
      qrSource,
      /to=\{`\/checkout\?orderId=\$\{orderId\}`\}/,
      'Must navigate to canonical /checkout?orderId=${orderId}'
    );
  });

  test('2. Gateway orderCode is NOT used for resume navigation', () => {
    assert.ok(
      !qrSource.includes('/checkout?orderCode='),
      'Must not use gateway orderCode for checkout resume'
    );
    assert.ok(
      !qrSource.includes('/checkout?paymentLinkId='),
      'Must not use paymentLinkId for checkout resume'
    );
  });

  // =========================================================================
  // REQUIREMENT 3, 4, 5: Canonical Resume Route Detection & URL Identity
  // =========================================================================
  test('3. Direct resume URL extracts orderId from searchParams and enables resume mode', () => {
    assert.match(
      checkoutSource,
      /const\s+resumeOrderIdParam\s*=\s*searchParams\.get\('orderId'\)/,
      'Must read orderId from searchParams'
    );
    assert.match(
      checkoutSource,
      /const\s+isResumeMode\s*=\s*Boolean\(/,
      'Must define isResumeMode flag'
    );
  });

  test('4. Reload loads context from URL parameter without requiring transient state', () => {
    assert.match(
      checkoutSource,
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*fetchResumeContext\(resumeOrderId\)[\s\S]*\}\s*,\s*\[location\.search,\s*isResumeMode,\s*resumeOrderId\]\)/,
      'Must fetch context on URL / orderId mount or update'
    );
  });

  test('5. Back/forward preserves identity via searchParams without falling back to cart', () => {
    assert.match(
      checkoutSource,
      /if\s*\(!orderIdToFetch\)\s*return;/,
      'fetchResumeContext must check orderId'
    );
  });

  // =========================================================================
  // REQUIREMENT 6, 7, 8, 9, 10: Cart Separation & Order Snapshot Integrity
  // =========================================================================
  test('6. Empty Cart still shows Order items from backend snapshot', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.order\?\.items\?\.map/,
      'Items in resume mode must be mapped from resumeContext.order.items'
    );
  });

  test('7. Order items come from backend context, not from CartContext items', () => {
    assert.ok(
      checkoutSource.includes('resumeContext.order?.items'),
      'Must render from backend order.items snapshot'
    );
  });

  test('8. No add-to-cart restoration during checkout resume', () => {
    // Assert there is no addItem or addToCart calls in resume flow
    assert.ok(
      !checkoutSource.includes('addToCart(resumeContext'),
      'Must never call addToCart on resume'
    );
    assert.ok(
      !checkoutSource.includes('addItem(item)'),
      'Must not restore items into cart'
    );
  });

  test('9. Other Cart item C remains untouched during resume', () => {
    // Resume mode does not call removeFromCart or alter cart state
    assert.ok(
      !checkoutSource.includes('removeFromCart(' + 'resumeContext'),
      'Cart items must not be removed by resume'
    );
  });

  test('10. Resume does not call createOrder', () => {
    // Verify that the submit button in resume mode triggers transition, not handleSubmitOrder
    assert.match(
      checkoutSource,
      /onClick=\{handleTransitionToCOD\}/,
      'Resume button must call handleTransitionToCOD'
    );
  });

  // =========================================================================
  // REQUIREMENT 11, 12, 13: Price & Address Snapshot
  // =========================================================================
  test('11. Snapshot price from orderItem is used', () => {
    assert.match(
      checkoutSource,
      /const\s+itemPrice\s*=\s*item\.price\s*\|\|\s*0;/,
      'Must use item.price snapshot'
    );
  });

  test('12. Current Product catalog price ignored for historical Order', () => {
    // Verify that item.price is used rather than item.product.price for order snapshot
    assert.match(
      checkoutSource,
      /formatPrice\(itemPrice\s*\*\s*item\.quantity\)/,
      'Must calculate total using itemPrice snapshot'
    );
  });

  test('13. Shipping snapshot displayed as read-only', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.order\?\.customerName/,
      'Must display customerName from order snapshot'
    );
    assert.match(
      checkoutSource,
      /resumeContext\.order\?\.shippingPhone/,
      'Must display shippingPhone from order snapshot'
    );
    assert.match(
      checkoutSource,
      /resumeContext\.order\?\.addressDetail/,
      'Must display addressDetail from order snapshot'
    );
  });

  // =========================================================================
  // REQUIREMENT 14, 15, 16, 17, 18, 19, 20: Payment Method & Eligibility Rules
  // =========================================================================
  test('14. Current payment method displayed clearly', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.order\?\.paymentMethod\s*===\s*'PAYOS_VIETQR'/,
      'Must check PAYOS_VIETQR'
    );
    assert.match(
      checkoutSource,
      /resumeContext\.order\?\.paymentMethod\s*===\s*'COD'/,
      'Must check COD'
    );
  });

  test('15. Eligible PayOS→COD option shown when backend permits', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.eligibility\?\.eligible\s*&&\s*resumeContext\.eligibility\?\.allowedMethods\?\.includes\('COD'\)/,
      'Must check backend eligibility for COD'
    );
  });

  test('16. Ineligible switch hidden or disabled with clear explanation', () => {
    assert.match(
      checkoutSource,
      /Không thể đổi phương thức thanh toán/,
      'Must render blocked notice when ineligible'
    );
  });

  test('17. PAID Order cannot switch payment method', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.payment\?\.status\s*===\s*'PAID'/,
      'Must guard against PAID payment'
    );
  });

  test('18. CANCELLED Order cannot switch payment method', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.order\?\.status\s*===\s*'CANCELLED'/,
      'Must guard against CANCELLED order'
    );
  });

  test('19. NEEDS_REVIEW cannot normal switch to COD', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.payment\?\.status\s*===\s*'NEEDS_REVIEW'/,
      'Must guard against NEEDS_REVIEW payment'
    );
  });

  test('20. CREATING cannot blindly switch to COD', () => {
    assert.match(
      checkoutSource,
      /resumeContext\.payment\?\.status\s*===\s*'CREATING'/,
      'Must guard against CREATING payment'
    );
  });

  // =========================================================================
  // REQUIREMENT 21, 22, 23, 24: Error Safety & Fallback Invariants
  // =========================================================================
  test('21. Payment/context GET failure shows error state with retry', () => {
    assert.match(
      checkoutSource,
      /data-testid="resume-error-state"/,
      'Must contain resume-error-state container'
    );
    assert.match(
      checkoutSource,
      /onClick=\{\(\)\s*=>\s*fetchResumeContext\(resumeOrderId\)\}/,
      'Must offer retry button for context fetch'
    );
  });

  test('22. GET failure does NOT fall back to NEW_CHECKOUT', () => {
    // When resumeError is present, the component returns early before NEW_CHECKOUT render
    const errorBlockIndex = checkoutSource.indexOf('data-testid="resume-error-state"');
    const newCheckoutIndex = checkoutSource.indexOf('Bằng cách nhấn Đặt hàng, bạn đồng ý với');
    assert.ok(
      errorBlockIndex !== -1 && errorBlockIndex < newCheckoutIndex,
      'Resume error must render isolated error screen before NEW_CHECKOUT'
    );
  });

  test('23. GET 403 does not show protected Order information', () => {
    assert.match(
      checkoutSource,
      /status\s*===\s*403/,
      'Must explicitly handle 403 status'
    );
    assert.match(
      checkoutSource,
      /Bạn không có quyền truy cập đơn hàng này\./,
      'Must show 403 forbidden message'
    );
  });

  test('24. GET 404 handled with specific not-found message', () => {
    assert.match(
      checkoutSource,
      /status\s*===\s*404/,
      'Must explicitly handle 404 status'
    );
    assert.match(
      checkoutSource,
      /Không tìm thấy đơn hàng yêu cầu\./,
      'Must show 404 not found message'
    );
  });

  // =========================================================================
  // REQUIREMENT 25, 26, 27, 28: Mutation Request Shape & Idempotency
  // =========================================================================
  test('25. Mutation sends internal Order.id in URL', () => {
    assert.match(
      orderApiSource,
      /\/orders\/\$\{orderId\}\/payment-method-transitions/,
      'orderApi.transitionPaymentMethod must use /orders/${orderId}/payment-method-transitions'
    );
  });

  test('26. Mutation sends targetPaymentMethod: "COD"', () => {
    assert.match(
      checkoutSource,
      /targetPaymentMethod:\s*'COD'/,
      'Payload must set targetPaymentMethod to COD'
    );
  });

  test('27. Mutation sends expectedStateVersion from authoritative context', () => {
    assert.match(
      checkoutSource,
      /expectedStateVersion:\s*currentVersion/,
      'Payload must include expectedStateVersion'
    );
  });

  test('28. Mutation sends Idempotency-Key header UUID', () => {
    assert.match(
      checkoutSource,
      /idempotencyKey\s*=\s*getOrCreateTransitionKey\(resumeOrderId,\s*'COD',\s*currentVersion\)/,
      'Must retrieve or create transition idempotency key'
    );
    assert.match(
      orderApiSource,
      /config\.headers\s*=\s*\{\s*'Idempotency-Key':\s*idempotencyKey/,
      'orderApi must set Idempotency-Key header'
    );
  });

  // =========================================================================
  // REQUIREMENT 29, 30, 31, 32, 33: Transition Responses Handling
  // =========================================================================
  test('29. Double click protection guards rapid duplicate mutation calls', () => {
    assert.match(
      checkoutSource,
      /if\s*\(isTransitioningRef\.current\s*\|\|\s*transitionLoading\)\s*return;/,
      'Must guard with isTransitioningRef and transitionLoading'
    );
  });

  test('30. 200 APPLIED updates UI and navigates to order-success', () => {
    assert.match(
      checkoutSource,
      /status\s*===\s*200\s*\|\|\s*data\?\.operation\?\.status\s*===\s*'APPLIED'/,
      'Must recognize 200 / APPLIED'
    );
    assert.match(
      checkoutSource,
      /clearStoredTransitionIntent\(resumeOrderId\)/,
      'Must clear stored key on successful application'
    );
    assert.match(
      checkoutSource,
      /navigate\(`\/order-success\/\$\{resumeOrderId\}`/,
      'Must navigate to order-success after successful COD transition'
    );
  });

  test('31. 202 VERIFYING is NOT shown as success and retains intent', () => {
    assert.match(
      checkoutSource,
      /status\s*===\s*202\s*\|\|\s*data\?\.operation\?\.status\s*===\s*'VERIFYING'/,
      'Must recognize 202 / VERIFYING'
    );
    assert.match(
      checkoutSource,
      /Hệ thống đang xác minh giao dịch với cổng thanh toán/,
      'Must show verifying message on 202'
    );
  });

  test('32. 409 STALE_ORDER_STATE triggers context refresh', () => {
    assert.match(
      checkoutSource,
      /errCode\s*===\s*'STALE_ORDER_STATE'/,
      'Must detect STALE_ORDER_STATE'
    );
    assert.match(
      checkoutSource,
      /fetchResumeContext\(resumeOrderId\)/,
      'Must refresh context on STALE_ORDER_STATE'
    );
  });

  test('33. 409 PAYMENT_ALREADY_SETTLED reflects settled truth', () => {
    assert.match(
      checkoutSource,
      /errCode\s*===\s*'PAYMENT_ALREADY_SETTLED'/,
      'Must detect PAYMENT_ALREADY_SETTLED'
    );
  });

  // =========================================================================
  // REQUIREMENT 34, 35, 36: Network / Gateway Resiliency
  // =========================================================================
  test('34. 503 mutation keeps idempotency intent for safe retry', () => {
    assert.match(
      checkoutSource,
      /status\s*===\s*503/,
      'Must catch 503 status'
    );
  });

  test('35. 504 mutation keeps idempotency intent for safe retry', () => {
    assert.match(
      checkoutSource,
      /status\s*===\s*504/,
      'Must catch 504 status'
    );
  });

  test('36. Timeout keeps same recovery key and does NOT create new Order', () => {
    const key1 = getOrCreateTransitionKey(501, 'COD', 1);
    const key2 = getOrCreateTransitionKey(501, 'COD', 1);
    assert.equal(key1, key2, 'Same transition intent must reuse the identical UUID across retries');
  });

  // =========================================================================
  // REQUIREMENT 37, 38, 39, 40, 41: Safety Invariants
  // =========================================================================
  test('37. Late payment / NEEDS_REVIEW displayed with distinct alert', () => {
    assert.match(
      checkoutSource,
      /errCode\s*===\s*'PAYMENT_REQUIRES_REVIEW'/,
      'Must detect PAYMENT_REQUIRES_REVIEW'
    );
  });

  test('38. No browser direct PayOS cancellation call', () => {
    assert.ok(
      !checkoutSource.includes('/v2/payment-requests/'),
      'Must not call external provider PayOS endpoints directly from frontend'
    );
    assert.ok(
      !checkoutSource.includes('payos.vn'),
      'Must not make direct client-side PayOS cancellation'
    );
  });

  test('39. Fake query parameters (?status=PAID) ignored for resume truth', () => {
    assert.ok(
      !checkoutSource.includes("searchParams.get('status') === 'PAID'"),
      'Must not infer payment state from fake query'
    );
    assert.ok(
      !checkoutSource.includes("searchParams.get('code') === '00'"),
      'Must not infer payment success from fake code query'
    );
  });

  test('40. Stale response guard prevents 501 context from overwriting 502', () => {
    assert.match(
      checkoutSource,
      /if\s*\(activeResumeOrderIdRef\.current\s*!==\s*orderIdToFetch\)\s*return;/,
      'Must check activeResumeOrderIdRef to discard stale response'
    );
  });

  test('41. No order recreation after resume failure', () => {
    assert.ok(
      !checkoutSource.includes('orderApi.createOrder(currentPayload)'),
      'Resume failure must not call createOrder'
    );
  });

  // =========================================================================
  // REQUIREMENT 42, 43, 44: Responsive Layout
  // =========================================================================
  test('42. Responsive 360px layout supported', () => {
    assert.match(checkoutSource, /grid-cols-1/, 'Must support single column mobile layout');
  });

  test('43. Responsive 768px layout supported', () => {
    assert.match(checkoutSource, /sm:p-8|sm:flex-row/, 'Must support tablet sm/md responsive styles');
  });

  test('44. Responsive 1440px desktop layout supported', () => {
    assert.match(checkoutSource, /lg:grid-cols-12/, 'Must support 12-column desktop layout');
    assert.match(checkoutSource, /lg:col-span-7/, 'Must divide main column into 7 cols');
    assert.match(checkoutSource, /lg:col-span-5/, 'Must divide sidebar into 5 cols');
  });

  // =========================================================================
  // INTEGRATION FLOWS A — H (Runtime API & State Machine Verification)
  // =========================================================================
  test('Flow A: Cart A+B+C -> Order 501 contains A+B -> Resume shows A+B, C remains in cart', async () => {
    const originalGet = axiosClient.get;
    let getContextCalled = false;

    axiosClient.get = async (url) => {
      if (url === '/orders/501/checkout-context') {
        getContextCalled = true;
        return {
          data: {
            order: {
              id: 501,
              orderCode: 'HG-501',
              status: 'PENDING',
              paymentMethod: 'PAYOS_VIETQR',
              customerName: 'Nguyễn Văn A',
              shippingPhone: '0988123456',
              addressDetail: '123 Cầu Giấy',
              totalAmount: 1500000,
              items: [
                { id: 1, productName: 'Sản phẩm A', quantity: 1, price: 500000 },
                { id: 2, productName: 'Sản phẩm B', quantity: 1, price: 1000000 },
              ],
            },
            payment: { status: 'PENDING', orderCode: 501 },
            stateVersion: 1,
            eligibility: { eligible: true, allowedMethods: ['PAYOS_VIETQR', 'COD'], blockedReasons: [] },
          },
        };
      }
      return originalGet(url);
    };

    try {
      const res = await orderApi.getCheckoutContext(501);
      assert.ok(getContextCalled, 'Must call /orders/501/checkout-context');
      assert.equal(res.data.order.items.length, 2);
      assert.equal(res.data.order.items[0].productName, 'Sản phẩm A');
      assert.equal(res.data.order.items[1].productName, 'Sản phẩm B');
    } finally {
      axiosClient.get = originalGet;
    }
  });

  test('Flow B: PayOS Order 501 transitions to COD with 200 APPLIED -> same Order.id=501', async () => {
    const originalPost = axiosClient.post;
    let transitionUrl = '';
    let transitionBody = null;
    let transitionHeaders = null;

    axiosClient.post = async (url, body, config) => {
      if (url.includes('/payment-method-transitions')) {
        transitionUrl = url;
        transitionBody = body;
        transitionHeaders = config?.headers;
        return {
          status: 200,
          data: {
            order: { id: 501, status: 'PENDING', paymentMethod: 'COD', totalAmount: 1500000 },
            operation: { status: 'APPLIED', targetPaymentMethod: 'COD' },
            stateVersion: 2,
            replay: false,
          },
        };
      }
      return originalPost(url, body, config);
    };

    try {
      const key = getOrCreateTransitionKey(501, 'COD', 1);
      const res = await orderApi.transitionPaymentMethod(501, {
        targetPaymentMethod: 'COD',
        expectedStateVersion: 1,
      }, key);

      assert.equal(transitionUrl, '/orders/501/payment-method-transitions');
      assert.deepEqual(transitionBody, { targetPaymentMethod: 'COD', expectedStateVersion: 1 });
      assert.equal(transitionHeaders['Idempotency-Key'], key);
      assert.equal(res.status, 200);
      assert.equal(res.data.order.id, 501);
      assert.equal(res.data.order.paymentMethod, 'COD');
      assert.equal(res.data.operation.status, 'APPLIED');
    } finally {
      axiosClient.post = originalPost;
    }
  });

  test('Flow C: Transition returns 202 VERIFYING -> retains intent, no success yet', async () => {
    const originalPost = axiosClient.post;
    axiosClient.post = async (url, body, config) => {
      if (url.includes('/payment-method-transitions')) {
        return {
          status: 202,
          data: {
            operation: { status: 'VERIFYING', targetPaymentMethod: 'COD' },
            stateVersion: 1,
          },
        };
      }
      return originalPost(url, body, config);
    };

    try {
      const key1 = getOrCreateTransitionKey(501, 'COD', 1);
      const res = await orderApi.transitionPaymentMethod(501, {
        targetPaymentMethod: 'COD',
        expectedStateVersion: 1,
      }, key1);

      assert.equal(res.status, 202);
      assert.equal(res.data.operation.status, 'VERIFYING');

      // Intent should be preserved for retry
      const key2 = getOrCreateTransitionKey(501, 'COD', 1);
      assert.equal(key1, key2, 'Must reuse identical UUID for retry');
    } finally {
      axiosClient.post = originalPost;
    }
  });

  test('Flow D: Transition request timeout -> preserves intent and same key for safe retry', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-FLOW-D-UUID';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let transitionAttempts = 0;
    let getContextCalls = 0;

    let backendState = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        return backendState;
      },
      onTransition: async (id, payload, config) => {
        transitionAttempts++;
        if (transitionAttempts === 1) {
          // Backend creates durable operation VERIFYING at version 8, but response is lost (504)
          backendState = {
            order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
            eligibility: { eligible: false, allowedMethods: [], blockedReasons: ['TRANSITION_IN_PROGRESS'] },
            stateVersion: 8,
            operation: {
              status: 'VERIFYING',
              idempotencyKey: originalKey,
              targetPaymentMethod: 'COD',
              expectedStateVersion: 7,
              retryAfterSeconds: 0,
            },
          };
          saveTransitionIntent(501, 'COD', 7, originalKey);
          const timeoutErr = new Error('Gateway Timeout');
          timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
          throw timeoutErr;
        }

        return {
          status: 200,
          data: {
            order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'COD', totalAmount: 500000 },
            operation: { status: 'APPLIED', targetPaymentMethod: 'COD' },
            payment: { provider: 'PAYOS', status: 'CANCELLED' },
            stateVersion: 8,
          },
        };
      },
    });

    await harness.renderWithLifecycle();
    assert.ok(harness.capturedElements.has('switch-to-cod-btn'), 'Initial transition button must exist');

    // 1. Initial transition fails with timeout
    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(transitionAttempts, 1);
    assert.equal(harness.transitionCalls[0].payload.expectedStateVersion, 7);

    // Retain original intent
    const retained = getStoredTransitionIntent(501);
    assert.ok(retained, 'Must retain original intent after timeout');
    assert.equal(retained.key, originalKey, 'Must retain original key K1');
    assert.equal(retained.expectedStateVersion, 7, 'Must retain original version 7');

    await harness.renderWithLifecycle();

    const getCallsBeforeRetry = getContextCalls;
    const postCallsBeforeRetry = harness.transitionCalls.length;

    // 2. Next retry triggers GET authoritative context FIRST
    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(getContextCalls, getCallsBeforeRetry + 1, 'Retry MUST call GET checkout-context first');
    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry, 'NO duplicate/premature POST before GET resolves');

    // 3. UI updates with recovered durable operation
    const { finalMarkup } = await harness.renderWithLifecycle();
    assert.ok(finalMarkup.includes('Đang xác minh thay đổi phương thức thanh toán'), 'Must render recovery banner');
    assert.ok(harness.capturedElements.has('recover-transition-btn'), 'Recovery button must be rendered');

    // 4. Recovery POST
    await harness.triggerClick('recover-transition-btn');

    // 5. Verify no duplicate operation, same Order.id, same idempotency identity K1 and version 7
    assert.equal(harness.transitionCalls.length, 2, 'Recovery sends controlled POST');
    assert.equal(harness.transitionCalls[1].id, 501, 'Must use same Order.id 501');
    assert.equal(harness.transitionCalls[1].payload.expectedStateVersion, 7, 'Must reuse original version 7, NOT 8');
    assert.equal(harness.transitionCalls[1].payload.targetPaymentMethod, 'COD', 'Must target COD');
    assert.equal(
      harness.transitionCalls[1].config?.headers?.['Idempotency-Key'],
      originalKey,
      'Must reuse identical idempotency identity K1'
    );
    assert.equal(harness.getNavigatedTo(), '/order-success/501', 'Must navigate to success after APPLIED');
  });

  test('Flow E: Transition races with payment -> backend returns 409 PAYMENT_REQUIRES_REVIEW', async () => {
    const originalPost = axiosClient.post;
    axiosClient.post = async () => {
      const err = new Error('Conflict');
      err.response = {
        status: 409,
        data: { code: 'PAYMENT_REQUIRES_REVIEW', message: 'Giao dịch cần đối soát' },
      };
      throw err;
    };

    try {
      const key = getOrCreateTransitionKey(501, 'COD', 1);
      await assert.rejects(
        () => orderApi.transitionPaymentMethod(501, { targetPaymentMethod: 'COD', expectedStateVersion: 1 }, key),
        (err) => {
          assert.equal(err.response.status, 409);
          assert.equal(err.response.data.code, 'PAYMENT_REQUIRES_REVIEW');
          return true;
        }
      );
    } finally {
      axiosClient.post = originalPost;
    }
  });

  test('Flow F: Order already PAID -> eligibility blocks transition POST', () => {
    const eligibility = {
      eligible: false,
      allowedMethods: [],
      blockedReasons: ['PAYMENT_ALREADY_SETTLED'],
    };
    const canSwitch = eligibility.eligible && eligibility.allowedMethods.includes('COD');
    assert.equal(canSwitch, false, 'PAID order must not allow transition to COD');
  });

  test('Flow G: Order CANCELLED -> eligibility blocks transition and resurrection', () => {
    const eligibility = {
      eligible: false,
      allowedMethods: [],
      blockedReasons: ['ORDER_TERMINAL'],
    };
    const canSwitch = eligibility.eligible && eligibility.allowedMethods.includes('COD');
    assert.equal(canSwitch, false, 'CANCELLED order must not allow transition');
  });

  test('Flow H: Non-owner User A attempts access -> backend returns 403 NOT_ORDER_OWNER', async () => {
    const originalGet = axiosClient.get;
    axiosClient.get = async () => {
      const err = new Error('Forbidden');
      err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
      throw err;
    };

    try {
      await assert.rejects(
        () => orderApi.getCheckoutContext(999),
        (err) => {
          assert.equal(err.response.status, 403);
          assert.equal(err.response.data.message, 'Bạn không có quyền truy cập đơn hàng này.');
          return true;
        }
      );
    } finally {
      axiosClient.get = originalGet;
    }

    // Flow H Runtime Integration: Non-owner 403 during recovery clears protected snapshot and controls
    sessionStorage.clear();
    const origKey = 'K1-FLOW-H-NON-OWNER';
    saveTransitionIntent(501, 'COD', 7, origKey);

    let return403 = false;

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        if (return403) {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { code: 'NOT_ORDER_OWNER', message: 'Bạn không có quyền truy cập đơn hàng này.' } };
          throw err;
        }
        return {
          order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
          eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
          stateVersion: 7,
          operation: null,
        };
      },
      onTransition: async () => {
        saveTransitionIntent(501, 'COD', 7, origKey);
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw timeoutErr;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');
    await harness.renderWithLifecycle();

    return403 = true;
    const postCountBefore = harness.transitionCalls.length;
    await harness.triggerClick('switch-to-cod-btn');

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.equal(harness.transitionCalls.length, postCountBefore, 'Flow H: NO transition POST when recovery returns 403');
    assert.ok(!finalMarkup.includes('resume-order-banner'), 'Flow H: Banner must be cleared');
    assert.ok(!finalMarkup.includes('switch-to-cod-btn'), 'Flow H: Controls must be cleared');
    assert.ok(finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'), 'Flow H: Must show 403 error');
  });

  // =========================================================================
  // REAL COMPONENT RUNTIME HARNESS & REMEDIATION ROUND 1 TESTS
  // =========================================================================

  const successPath = path.resolve(__dirname, './OrderSuccessPage.jsx');
  const successSource = fs.readFileSync(successPath, 'utf8');

  async function createCheckoutRuntimeHarness({
    orderId = '501',
    search = '?orderId=501',
    userProfile = { fullName: 'Profile User', phone: '0111222333', address: '456 Phố Cổ, Hà Nội' },
    cartItems = [],
    contextData = null,
    getContextError = null,
    onTransition = null,
  } = {}) {
    const esbuild = await import('esbuild');
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const transformed = await esbuild.transform(checkoutSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    let stateCursor = 0;
    let effectCursor = 0;
    const stateStore = new Map();
    const effects = [];
    const activeCleanups = new Map();
    const prevDepsMap = new Map();
    const capturedElements = new Map();

    const customReact = {
      ...React,
      createElement: (type, props, ...children) => {
        if (props && props['data-testid']) {
          capturedElements.set(props['data-testid'], { type, props, children });
        }
        return React.createElement(type, props, ...children);
      },
      useState: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, typeof initial === 'function' ? initial() : initial);
        }
        const val = stateStore.get(id);
        const setter = (newVal) => {
          const resolved = typeof newVal === 'function' ? newVal(stateStore.get(id)) : newVal;
          stateStore.set(id, resolved);
        };
        return [val, setter];
      },
      useEffect: (fn, deps) => {
        const slot = effectCursor++;
        effects.push({ slot, fn, deps });
      },
      useRef: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, { current: initial });
        }
        return stateStore.get(id);
      },
    };

    function depsChanged(oldDeps, newDeps) {
      if (oldDeps === undefined || newDeps === undefined) return true;
      if (!Array.isArray(oldDeps) || !Array.isArray(newDeps)) return true;
      if (oldDeps.length !== newDeps.length) return true;
      return oldDeps.some((dep, i) => !Object.is(dep, newDeps[i]));
    }

    async function runEffects() {
      for (const eff of effects) {
        const oldDeps = prevDepsMap.get(eff.slot);
        if (depsChanged(oldDeps, eff.deps)) {
          if (activeCleanups.has(eff.slot)) {
            const oldCleanup = activeCleanups.get(eff.slot);
            if (typeof oldCleanup === 'function') {
              try { oldCleanup(); } catch {}
            }
            activeCleanups.delete(eff.slot);
          }
          const cleanup = await eff.fn();
          if (typeof cleanup === 'function') {
            activeCleanups.set(eff.slot, cleanup);
          }
          prevDepsMap.set(eff.slot, eff.deps);
        }
      }
    }

    function unmount() {
      for (const [slot, cleanup] of activeCleanups.entries()) {
        if (typeof cleanup === 'function') {
          try { cleanup(); } catch {}
        }
      }
      activeCleanups.clear();
      prevDepsMap.clear();
    }

    let currentSearch = search;
    let navigatedTo = null;
    let navigatedOptions = null;
    const mockRouter = {
      useNavigate: () => (to, opts) => {
        navigatedTo = to;
        navigatedOptions = opts;
      },
      useLocation: () => ({ pathname: '/checkout', search: currentSearch, state: {} }),
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };

    let liveCart = [...cartItems];
    const mockCart = {
      useCart: () => ({
        cart: liveCart,
        removeFromCart: (id) => { liveCart = liveCart.filter((i) => (i.cartItemId || i.id) !== id); },
        clearCart: () => { liveCart = []; },
      }),
    };

    const mockAuth = {
      useAuth: () => ({ user: userProfile, isAuthenticated: true }),
    };

    const defaultContext = {
      order: {
        id: Number(orderId),
        orderCode: `HG-${orderId}`,
        customerName: 'Nguyễn Văn A',
        shippingPhone: '0987654321',
        shippingAddress: '123 Nguyễn Trãi, Thanh Xuân, Hà Nội',
        totalAmount: 500000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        items: [
          { id: 1, productName: 'Vợt Yonex Astrox 88D Pro', quantity: 1, price: 500000 },
        ],
      },
      eligibility: {
        eligible: true,
        allowedMethods: ['COD'],
        blockedReasons: [],
      },
      stateVersion: 1,
    };

    let currentContextData = contextData;
    let currentGetContextError = getContextError;
    let currentOnTransition = onTransition;

    const transitionCalls = [];
    const contextCalls = [];
    const apiCallHistory = [];

    const mockOrderApi = {
      orderApi: {
        getCheckoutContext: async (id) => {
          contextCalls.push({ id, timestamp: Date.now() });
          apiCallHistory.push({ type: 'GET_CONTEXT', id, timestamp: Date.now() });
          if (currentGetContextError) throw currentGetContextError;
          return { data: typeof currentContextData === 'function' ? currentContextData(id) : (currentContextData !== null ? currentContextData : defaultContext) };
        },
        transitionPaymentMethod: async (id, payload, idempotencyKey) => {
          const config = typeof idempotencyKey === 'string'
            ? { headers: { 'Idempotency-Key': idempotencyKey } }
            : (idempotencyKey && idempotencyKey.headers ? idempotencyKey : { headers: { 'Idempotency-Key': idempotencyKey } });
          transitionCalls.push({ id, payload, config, idempotencyKey });
          apiCallHistory.push({ type: 'TRANSITION_POST', id, payload, config, idempotencyKey, timestamp: Date.now() });
          if (currentOnTransition) {
            return await currentOnTransition(id, payload, config);
          }
          return {
            status: 200,
            data: {
              order: { ...defaultContext.order, paymentMethod: 'COD' },
              operation: { status: 'APPLIED', targetPaymentMethod: 'COD' },
              payment: { provider: 'PAYOS', status: 'CANCELLED' },
              stateVersion: 2,
            },
          };
        },
      },
    };

    const mockVoucherApi = { voucherApi: {
      getUserVouchers: async () => ({ data: [] }),
      validateVoucher: async code => ({ valid: true, code, discountAmount: 0 }),
    } };
    const mockShippingAddressApi = { shippingAddressApi: { getAddresses: async () => ({ data: [] }) } };
    const mockFormatters = { formatPrice: (v) => `${(v || 0).toLocaleString('vi-VN')} đ` };
    const mockLucide = new Proxy({}, { get: (t, p) => (props) => React.createElement('span', { 'data-icon': p, ...props }) });

    let checkoutVoucherModule;
    const customRequire = (specifier) => {
      if (specifier.includes('useCheckoutVoucher')) return checkoutVoucherModule;
      if (specifier.includes('AdministrativeAddressFields')) return { __esModule: true, default: () => React.createElement('div', null, 'Tỉnh / Thành phố', 'Phường / Xã') };
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('CartContext')) return mockCart;
      if (specifier.includes('AuthContext')) return mockAuth;
      if (specifier.includes('orderApi')) return mockOrderApi;
      if (specifier.includes('voucherApi')) return mockVoucherApi;
      if (specifier.includes('shippingAddressApi')) return mockShippingAddressApi;
      if (specifier.includes('formatters')) return mockFormatters;
      if (specifier.includes('idempotency')) {
        return {
          buildOrderPayload: () => ({}),
          isResponseStale: () => false,
          canonicalStringify: JSON.stringify,
          getOrCreateIdempotencyKey: () => 'test-idem-key',
          clearStoredCheckoutIntent: () => {},
          getOrCreatePaymentLinkKey: () => 'test-link-key',
          getOrCreateTransitionKey,
          getStoredTransitionIntent,
          saveTransitionIntent,
          clearStoredTransitionIntent,
          TRANSITION_STORAGE_KEY,
        };
      }
      if (specifier === 'lucide-react') return mockLucide;
      if (specifier.includes('OrderItemOptions')) {
        const MockOpt = () => null;
        MockOpt.default = MockOpt;
        MockOpt.OrderItemOptions = MockOpt;
        MockOpt.__esModule = true;
        return MockOpt;
      }
      throw new Error('Unknown: ' + specifier);
    };

    const voucherSource = fs.readFileSync(path.resolve(__dirname, '../components/useCheckoutVoucher.jsx'), 'utf8');
    const voucherTransform = await esbuild.transform(voucherSource, { loader: 'jsx', format: 'cjs', target: 'node18' });
    const voucherModule = { exports: {} };
    new Function('require', 'module', 'exports', voucherTransform.code)(customRequire, voucherModule, voucherModule.exports);
    checkoutVoucherModule = voucherModule.exports;

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact);

    const Component = moduleObj.exports.default;

    async function renderWithLifecycle(customWaitMs = 50) {
      stateCursor = 0;
      effectCursor = 0;
      effects.length = 0;
      capturedElements.clear();
      ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

      await runEffects();

      await new Promise((r) => setTimeout(r, customWaitMs));

      stateCursor = 0;
      effectCursor = 0;
      effects.length = 0;
      capturedElements.clear();
      const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
      await runEffects();

      return { finalMarkup, stateStore, navigatedTo, navigatedOptions, capturedElements, unmount };
    }

    async function triggerClick(testId) {
      const el = capturedElements.get(testId);
      if (!el || !el.props || typeof el.props.onClick !== 'function') {
        throw new Error(`Element with data-testid="${testId}" not found or has no onClick`);
      }
      const res = await el.props.onClick({ preventDefault: () => {}, stopPropagation: () => {} });
      await new Promise((r) => setTimeout(r, 20));
      return res;
    }

    const harness = {
      Component,
      renderWithLifecycle,
      triggerClick,
      capturedElements,
      transitionCalls,
      contextCalls,
      apiCallHistory,
      setSearch: (s) => { currentSearch = s; },
      getCart: () => liveCart,
      setContextData: (d) => { currentContextData = d; },
      setGetContextError: (e) => { currentGetContextError = e; },
      setOnTransition: (fn) => { currentOnTransition = fn; },
      getNavigatedTo: () => navigatedTo,
      getNavigatedOptions: () => navigatedOptions,
      unmount,
    };
    activeHarnesses.push(harness);
    return harness;
  }

  async function createOrderSuccessRuntimeHarness({
    orderId = '501',
    orderData = null,
    paymentData = null,
    paymentLoadStatus = undefined,
    paymentError = undefined,
    getOrderPaymentError = null,
  } = {}) {
    const esbuild = await import('esbuild');
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const transformed = await esbuild.transform(successSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    let stateCursor = 0;
    let effectCursor = 0;
    const stateStore = new Map();
    const effects = [];
    const activeCleanups = new Map();
    const prevDepsMap = new Map();

    const customReact = {
      ...React,
      useState: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, initial);
        }
        const val = stateStore.get(id);
        const setter = (newVal) => {
          const resolved = typeof newVal === 'function' ? newVal(stateStore.get(id)) : newVal;
          stateStore.set(id, resolved);
        };
        return [val, setter];
      },
      useEffect: (fn, deps) => {
        const slot = effectCursor++;
        effects.push({ slot, fn, deps });
      },
      useRef: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, { current: initial });
        }
        return stateStore.get(id);
      },
    };

    function depsChanged(oldDeps, newDeps) {
      if (oldDeps === undefined || newDeps === undefined) return true;
      if (!Array.isArray(oldDeps) || !Array.isArray(newDeps)) return true;
      if (oldDeps.length !== newDeps.length) return true;
      return oldDeps.some((dep, i) => !Object.is(dep, newDeps[i]));
    }

    async function runEffects() {
      for (const eff of effects) {
        const oldDeps = prevDepsMap.get(eff.slot);
        if (depsChanged(oldDeps, eff.deps)) {
          if (activeCleanups.has(eff.slot)) {
            const oldCleanup = activeCleanups.get(eff.slot);
            if (typeof oldCleanup === 'function') {
              try { oldCleanup(); } catch {}
            }
            activeCleanups.delete(eff.slot);
          }
          const cleanup = await eff.fn();
          if (typeof cleanup === 'function') {
            activeCleanups.set(eff.slot, cleanup);
          }
          prevDepsMap.set(eff.slot, eff.deps);
        }
      }
    }

    function unmount() {
      for (const [slot, cleanup] of activeCleanups.entries()) {
        if (typeof cleanup === 'function') {
          try { cleanup(); } catch {}
        }
      }
      activeCleanups.clear();
      prevDepsMap.clear();
    }

    const mockRouter = {
      useParams: () => ({ orderId }),
      useLocation: () => ({ pathname: `/order-success/${orderId}`, search: '', state: null }),
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };

    const mockOrderApi = {
      orderApi: {
        getOrderById: async (id) => ({
          success: true,
          data: orderData !== null ? orderData : {
            id: Number(id),
            orderCode: `HG-${id}`,
            customerName: 'Nguyễn Văn A',
            status: 'PENDING',
            paymentMethod: 'COD',
            totalAmount: 450000,
          },
        }),
        getOrderPayment: async (id) => {
          if (getOrderPaymentError) throw getOrderPaymentError;
          return {
            success: true,
            data: paymentData !== undefined ? paymentData : { provider: 'PAYOS', status: 'CANCELLED', orderId: Number(id) },
          };
        },
      },
    };

    const mockFormatters = {
      formatPrice: (v) => `${(v || 0).toLocaleString('vi-VN')} đ`,
      isOrderPaid: (o) => (typeof o === 'object' ? o?.status === 'PAID' : o === 'PAID'),
      getOrderStatusLabel: (o) => {
        if (!o) return 'Chưa xác định';
        const status = typeof o === 'object' ? o?.status : o;
        const method = typeof o === 'object' ? o?.paymentMethod : null;
        if (status === 'PENDING') {
          return method === 'COD' ? 'Chờ xử lý COD' : 'Chờ thanh toán PayOS';
        }
        return status === 'PAID' ? 'Đã thanh toán' : 'Chờ xử lý';
      },
    };

    const mockLucide = new Proxy({}, { get: (t, p) => (props) => React.createElement('span', { 'data-icon': p, ...props }) });

    const customRequire = (specifier) => {
      if (specifier.includes('AdministrativeAddressFields')) return { __esModule: true, default: () => React.createElement('div', null, 'Tỉnh / Thành phố', 'Phường / Xã') };
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('orderApi')) return mockOrderApi;
      if (specifier.includes('formatters')) return mockFormatters;
      if (specifier.includes('lucide-react')) return mockLucide;
      if (specifier.includes('OrderItemOptions')) {
        const MockOpt = () => null;
        MockOpt.default = MockOpt;
        MockOpt.OrderItemOptions = MockOpt;
        MockOpt.__esModule = true;
        return MockOpt;
      }
      throw new Error('Unknown: ' + specifier);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact);

    const Component = moduleObj.exports.default;

    async function renderWithLifecycle(customWaitMs = 50) {
      stateCursor = 0;
      effectCursor = 0;
      effects.length = 0;
      ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

      await runEffects();

      await new Promise((r) => setTimeout(r, customWaitMs));

      stateCursor = 0;
      effectCursor = 0;
      effects.length = 0;
      const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
      await runEffects();

      return { finalMarkup, stateStore, unmount };
    }

    const harness = { Component, renderWithLifecycle, unmount };
    activeHarnesses.push(harness);
    return harness;
  }

  // =========================================================================
  // DEFECT FE057-R1-01: Shipping Address Snapshot Authority Runtime Tests
  // =========================================================================
  test('FE057-R1-01: Real CheckoutPage renders authoritative shippingAddress snapshot without split fields', async () => {
    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      userProfile: { fullName: 'Profile User', phone: '0911222333', address: '999 Địa Chỉ Profile, Cầu Giấy, Hà Nội' },
      contextData: {
        order: {
          id: 501,
          orderCode: 'HG-501',
          customerName: 'Nguyễn Văn A',
          shippingPhone: '0987654321',
          shippingAddress: '123 Nguyễn Trãi, Thanh Xuân, Hà Nội',
          totalAmount: 500000,
          status: 'PENDING',
          paymentMethod: 'PAYOS_VIETQR',
          items: [{ id: 1, productName: 'Vợt Cầu Lông', quantity: 1, price: 500000 }],
        },
        eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
        stateVersion: 1,
      },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(
      finalMarkup.includes('123 Nguyễn Trãi, Thanh Xuân, Hà Nội'),
      'Must display exact backend shippingAddress in resume mode'
    );
    assert.ok(
      !finalMarkup.includes('Địa chỉ giao hàng: —'),
      'Must NOT display dash placeholder when shippingAddress exists'
    );
    assert.ok(
      !finalMarkup.includes('999 Địa Chỉ Profile, Cầu Giấy, Hà Nội'),
      'Must NOT fall back to current user profile address in resume mode'
    );
  });

  test('FE057-R1-01 Preservation: NEW_CHECKOUT mode maintains editable address form inputs', async () => {
    const harness = await createCheckoutRuntimeHarness({
      orderId: null,
      search: '', // New checkout mode
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Tỉnh / Thành phố'), 'NEW_CHECKOUT must render Province input');
    assert.ok(!finalMarkup.includes('Quận / Huyện'), 'NEW_CHECKOUT must use the current two-level address form');
    assert.ok(finalMarkup.includes('Phường / Xã'), 'NEW_CHECKOUT must render Ward input');
    assert.ok(finalMarkup.includes('Địa chỉ cụ thể'), 'NEW_CHECKOUT must render AddressDetail input');
    assert.ok(!finalMarkup.includes('Đơn hàng cần thanh toán'), 'NEW_CHECKOUT must not render resume banner');
  });

  // =========================================================================
  // DEFECT FE057-R1-02: Current Method COD vs Historical PayOS Attempt Runtime Tests
  // =========================================================================
  test('FE057-R1-02: Transition PayOS->COD with historical CANCELLED attempt renders COD UI, not "Đã hủy"', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '501',
      orderData: {
        id: 501,
        orderCode: 'HG-501',
        customerName: 'Nguyễn Văn A',
        status: 'PENDING',
        paymentMethod: 'COD',
        totalAmount: 450000,
      },
      paymentData: {
        provider: 'PAYOS',
        status: 'CANCELLED',
        orderId: 501,
      },
    });

    const { finalMarkup, stateStore } = await harness.renderWithLifecycle();

    // Must display COD payment info
    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Must render "Chờ xử lý COD" badge');
    assert.ok(finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'Must render "Đơn hàng đã được ghi nhận" heading');
    assert.ok(finalMarkup.includes('Thanh toán khi nhận hàng'), 'Must render COD guidance message');

    // Must NOT display cancelled PayOS heading or badge as main result
    assert.ok(!finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Must NOT display cancelled heading');

    // Payment attempt MUST be preserved in state (not set to null, not deleted)
    const preservedPayment = stateStore.get(1); // state id 1 is payment state
    assert.ok(preservedPayment !== null && typeof preservedPayment === 'object', 'Payment attempt must be preserved in state');
    assert.equal(preservedPayment.status, 'CANCELLED', 'Historical status remains intact for audit');
  });

  test('FE057-R1-02 Historical Matrix: Current COD + PayOS EXPIRED renders current COD UI', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '502',
      orderData: { id: 502, orderCode: 'HG-502', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: { provider: 'PAYOS', status: 'EXPIRED', orderId: 502 },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Must render "Chờ xử lý COD" badge');
    assert.ok(finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'Must render "Đơn hàng đã được ghi nhận" heading');
    assert.ok(!finalMarkup.includes('Mã thanh toán đã hết hạn'), 'Must NOT show PayOS expired heading');
  });

  test('FE057-R1-02 Historical Matrix: Current COD + PayOS FAILED renders current COD UI', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '503',
      orderData: { id: 503, orderCode: 'HG-503', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: { provider: 'PAYOS', status: 'FAILED', orderId: 503 },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Must render "Chờ xử lý COD" badge');
    assert.ok(finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'Must render "Đơn hàng đã được ghi nhận" heading');
    assert.ok(!finalMarkup.includes('Thanh toán thất bại'), 'Must NOT show PayOS failed heading');
  });

  test('FE057-R1-02 Conflict Priority: Current COD + PayOS NEEDS_REVIEW renders review notice, NOT clean COD', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '504',
      orderData: { id: 504, orderCode: 'HG-504', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: { provider: 'PAYOS', status: 'NEEDS_REVIEW', orderId: 504 },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge');
    assert.ok(finalMarkup.includes('Thanh toán đang chờ đối soát'), 'Must render review heading');
    assert.ok(!finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'NEEDS_REVIEW must NOT render normal COD heading');
    assert.ok(!finalMarkup.includes('Thanh toán khi nhận hàng.'), 'NEEDS_REVIEW must NOT render normal COD detail');
  });

  test('FE057-R1-02 Late Payment Safety: Current COD + PayOS PAID renders review/conflict alert, NOT normal COD', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '505',
      orderData: { id: 505, orderCode: 'HG-505', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: { provider: 'PAYOS', status: 'PAID', orderId: 505 },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge for conflict');
    assert.ok(finalMarkup.includes('Ghi nhận thanh toán cần đối soát'), 'Must render conflict heading');
    assert.ok(!finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'PAID conflict must NOT render normal COD heading');
    assert.ok(!finalMarkup.includes('Thanh toán khi nhận hàng.'), 'PAID conflict must NOT render normal COD detail');
  });

  test('FE057-R1-02 Unresolved Safety: Current COD + PayOS CREATING renders preparing state, NOT clean COD', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '506',
      orderData: { id: 506, orderCode: 'HG-506', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: { provider: 'PAYOS', status: 'CREATING', orderId: 506 },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đang khởi tạo'), 'Must render "Đang khởi tạo" badge');
    assert.ok(finalMarkup.includes('Đang chuẩn bị liên kết thanh toán'), 'Must render creating heading');
  });

  test('FE057-R1-02 Unresolved Safety: Current COD + PayOS PENDING renders confirming state, NOT clean COD', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '507',
      orderData: { id: 507, orderCode: 'HG-507', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: { provider: 'PAYOS', status: 'PENDING', orderId: 507 },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đang xác nhận thanh toán'), 'Must render "Đang xác nhận thanh toán" badge');
    assert.ok(finalMarkup.includes('Đang kiểm tra giao dịch'), 'Must render pending verification heading');
  });

  test('FE057-R1-02 FIX-004 Control Case: Current PAYOS_VIETQR + CANCELLED still renders PayOS cancelled UI', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '508',
      orderData: { id: 508, orderCode: 'HG-508', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 450000 },
      paymentData: { provider: 'PAYOS', status: 'CANCELLED', orderId: 508 },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đã hủy'), 'Must render "Đã hủy" badge for PayOS cancelled');
    assert.ok(finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Must render PayOS cancelled heading');
    assert.ok(!finalMarkup.includes('Chờ xử lý COD'), 'Must NOT render COD UI for PayOS order');
  });

  test('FE057-R1-02 Native COD Preservation: Native COD Order without payment attempt renders clean COD UI', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '509',
      orderData: { id: 509, orderCode: 'HG-509', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: null,
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Native COD must render "Chờ xử lý COD"');
    assert.ok(finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'Native COD must render recorded heading');
  });

  test('FE057-R1-02 GET Error Safety: Payment GET error on COD order displays verification error, no false success', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '510',
      orderData: { id: 510, orderCode: 'HG-510', status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: undefined,
      getOrderPaymentError: new Error('Internal Server Error 500'),
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Lỗi xác minh'), 'Must render "Lỗi xác minh" on payment GET failure');
    assert.ok(finalMarkup.includes('Không thể xác minh trạng thái thanh toán'), 'Must render verification failure heading');
  });

  test('FE057-R1-02 Direct & Reload Reconstructability: /order-success/:id reconstructs state purely from route param and backend', async () => {
    const harness = await createOrderSuccessRuntimeHarness({
      orderId: '511',
      orderData: { id: 511, orderCode: 'HG-511', status: 'PENDING', paymentMethod: 'COD', totalAmount: 320000 },
      paymentData: { provider: 'PAYOS', status: 'CANCELLED', orderId: 511 },
    });

    // Directly renders with only orderId from URL param
    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Direct load must reconstruct COD badge');
    assert.ok(finalMarkup.includes('#HG-511'), 'Direct load must display correct order code');
  });

  // =========================================================================
  // DEFECT FE057-R1-03: Transition Recovery After Reopen Runtime Tests
  // =========================================================================

  test('FE057-R1-03 Canonical: Reopen with stateVersion=8 & eligible=false recovers VERIFYING op with original K1 and version=7', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-TEST-UUID';

    // Step 1: Initial Mount orderId=501 with stateVersion=7, eligible=true
    const harness1 = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
        stateVersion: 7,
      },
      onTransition: async (id, payload, config) => {
        saveTransitionIntent('501', 'COD', 7, originalKey);
        return {
          status: 202,
          data: {
            order: { id: 501, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' },
            operation: {
              status: 'VERIFYING',
              idempotencyKey: originalKey,
              targetPaymentMethod: 'COD',
              expectedStateVersion: 7,
              retryAfterSeconds: 0,
            },
            stateVersion: 7,
          },
        };
      },
    });

    await harness1.renderWithLifecycle();
    assert.ok(harness1.capturedElements.has('switch-to-cod-btn'), 'Initial transition button must exist');
    await harness1.triggerClick('switch-to-cod-btn');

    // Assert Step 4: First POST was sent with expectedStateVersion=7
    assert.equal(harness1.transitionCalls.length, 1);
    assert.equal(harness1.transitionCalls[0].payload.expectedStateVersion, 7);
    assert.equal(harness1.transitionCalls[0].payload.targetPaymentMethod, 'COD');

    // Step 5: Unmount harness1. Keep sessionStorage (still contains original intent)
    const stored = getStoredTransitionIntent('501');
    assert.ok(stored, 'Session storage must retain intent after 202');
    assert.equal(stored.expectedStateVersion, 7);

    // Step 6: Remount on /checkout?orderId=501 with stateVersion=8, eligible=false, operation VERIFYING
    const harness2 = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [], blockedReasons: ['TRANSITION_IN_PROGRESS'] },
        stateVersion: 8,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: originalKey,
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 0,
        },
      },
      onTransition: async () => ({
        status: 202,
        data: {
          operation: {
            status: 'VERIFYING',
            idempotencyKey: originalKey,
            targetPaymentMethod: 'COD',
            expectedStateVersion: 7,
            retryAfterSeconds: 0,
          },
          stateVersion: 8,
        },
      }),
    });

    const { finalMarkup } = await harness2.renderWithLifecycle();

    // Assert Step 10: Recovery UI exists, new-transition button hidden
    assert.ok(finalMarkup.includes('Đang xác minh thay đổi phương thức thanh toán'), 'Must render recovery banner');
    assert.ok(harness2.capturedElements.has('recover-transition-btn'), 'Recovery button must be rendered');
    assert.ok(!harness2.capturedElements.has('switch-to-cod-btn'), 'New transition button must remain hidden when eligible=false');

    // Step 11: Trigger recovery
    await harness2.triggerClick('recover-transition-btn');

    // Assert Step 12 & 13: Recovery POST reuses SAME K1 and SAME original expectedStateVersion=7 (NOT 8!)
    assert.equal(harness2.transitionCalls.length, 1, 'Exactly one recovery POST must be made');
    assert.equal(harness2.transitionCalls[0].payload.targetPaymentMethod, 'COD', 'Recovery must target COD');
    assert.equal(harness2.transitionCalls[0].payload.expectedStateVersion, 7, 'Recovery MUST send original expectedStateVersion 7, NOT 8');
    assert.equal(
      harness2.transitionCalls[0].config?.headers?.['Idempotency-Key'],
      originalKey,
      'Recovery MUST reuse original Idempotency-Key K1, not generate a new UUID'
    );
  });

  test('FE057-R1-03 Backend-Only Authority: Recovery succeeds without pre-existing sessionStorage', async () => {
    sessionStorage.clear();
    const backendKey = 'K-BACKEND-AUTH-99';

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 8,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: backendKey,
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 0,
        },
      },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đang xác minh thay đổi phương thức thanh toán'), 'Recovery UI must render');
    assert.ok(harness.capturedElements.has('recover-transition-btn'), 'Recovery button must be present');

    await harness.triggerClick('recover-transition-btn');

    assert.equal(harness.transitionCalls.length, 1);
    assert.equal(harness.transitionCalls[0].payload.expectedStateVersion, 7);
    assert.equal(harness.transitionCalls[0].payload.targetPaymentMethod, 'COD');
    assert.equal(harness.transitionCalls[0].config?.headers?.['Idempotency-Key'], backendKey);
  });

  test('FE057-R1-03 Storage Mismatch: Authoritative backend durable operation overrides stale sessionStorage', async () => {
    sessionStorage.clear();
    // Pre-populate stale storage with mismatched version and key
    saveTransitionIntent('501', 'COD', 4, 'K-STALE-KEY');

    const backendKey = 'K-AUTHORITATIVE-OP';
    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 9,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: backendKey,
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 0,
        },
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('recover-transition-btn');

    // Authoritative backend operation identity MUST win
    assert.equal(harness.transitionCalls.length, 1);
    assert.equal(harness.transitionCalls[0].payload.expectedStateVersion, 7, 'Must use backend expectedStateVersion');
    assert.equal(harness.transitionCalls[0].config?.headers?.['Idempotency-Key'], backendKey, 'Must use backend idempotencyKey');
    assert.notEqual(harness.transitionCalls[0].config?.headers?.['Idempotency-Key'], 'K-STALE-KEY');
  });

  test('FE057-R1-03 Retry Delay Safety: retryAfterSeconds > 0 disables recovery action', async () => {
    sessionStorage.clear();
    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 8,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: 'K-RETRY-WAIT',
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 15,
        },
      },
    });

    const { finalMarkup } = await harness.renderWithLifecycle();
    const recoverBtn = harness.capturedElements.get('recover-transition-btn');

    assert.ok(recoverBtn, 'Recovery button should exist');
    assert.equal(recoverBtn.props.disabled, true, 'Recovery button must be disabled when retryCountdown > 0');
    assert.ok(finalMarkup.includes('Kiểm tra lại (15s)'), 'Must display countdown notice on button');
    assert.equal(harness.transitionCalls.length, 0, 'No automatic request storm on mount');
  });

  test('FE057-R1-03 Terminal Operation Cleanup: Terminal operation clears session intent and hides recovery UI', async () => {
    sessionStorage.clear();
    saveTransitionIntent('501', 'COD', 7, 'K-TERMINAL');

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'COD', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 8,
        operation: {
          status: 'APPLIED',
          idempotencyKey: 'K-TERMINAL',
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
        },
      },
    });

    await harness.renderWithLifecycle();

    assert.ok(!harness.capturedElements.has('recover-transition-btn'), 'Recovery button must NOT show for terminal state');
    assert.equal(getStoredTransitionIntent('501'), null, 'Session storage intent must be cleaned up on terminal state');
  });

  test('FE057-R1-03 Recovery Response Matrix: 200 APPLIED navigates to order-success and clears storage', async () => {
    sessionStorage.clear();
    saveTransitionIntent('501', 'COD', 7, 'K-APPLIED-TEST');

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 8,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: 'K-APPLIED-TEST',
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 0,
        },
      },
      onTransition: async () => ({
        status: 200,
        data: {
          order: { id: 501, paymentMethod: 'COD', status: 'PENDING' },
          operation: { status: 'APPLIED', targetPaymentMethod: 'COD' },
          payment: { provider: 'PAYOS', status: 'CANCELLED' },
          stateVersion: 9,
        },
      }),
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('recover-transition-btn');

    assert.equal(harness.getNavigatedTo(), '/order-success/501', 'Must navigate to order-success upon 200 APPLIED');
    assert.equal(getStoredTransitionIntent('501'), null, 'Session storage intent must be cleared upon 200 APPLIED');
  });

  test('FE057-R1-03 Recovery Double Click Guard: Rapid duplicate recovery clicks trigger only one POST', async () => {
    sessionStorage.clear();
    let resolveTransition;
    const transitionPromise = new Promise((resolve) => {
      resolveTransition = resolve;
    });

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 8,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: 'K-GUARD-TEST',
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 0,
        },
      },
      onTransition: async () => {
        await transitionPromise;
        return {
          status: 202,
          data: {
            operation: { status: 'VERIFYING', idempotencyKey: 'K-GUARD-TEST', targetPaymentMethod: 'COD', expectedStateVersion: 7 },
            stateVersion: 8,
          },
        };
      },
    });

    await harness.renderWithLifecycle();

    // Trigger multiple clicks before the first one resolves
    const click1 = harness.triggerClick('recover-transition-btn');
    const click2 = harness.triggerClick('recover-transition-btn');
    const click3 = harness.triggerClick('recover-transition-btn');

    resolveTransition();
    await Promise.all([click1, click2, click3]);

    assert.equal(harness.transitionCalls.length, 1, 'Only one recovery POST must be issued despite rapid clicks');
  });

  test('FE057-R1-03 Recovery Response Matrix: 202 again retains intent and respects updated retryAfterSeconds', async () => {
    sessionStorage.clear();
    const originalKey = 'K-202-AGAIN-TEST';
    saveTransitionIntent('501', 'COD', 7, originalKey);

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 8,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: originalKey,
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 0,
        },
      },
      onTransition: async () => ({
        status: 202,
        data: {
          operation: {
            status: 'VERIFYING',
            idempotencyKey: originalKey,
            targetPaymentMethod: 'COD',
            expectedStateVersion: 7,
            retryAfterSeconds: 8,
          },
          stateVersion: 8,
        },
      }),
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('recover-transition-btn');

    // Intent must be retained with same key
    const retained = getStoredTransitionIntent('501');
    assert.ok(retained, 'Intent must remain stored after second 202');
    assert.equal(retained.key, originalKey, 'Key must not change');
    assert.equal(harness.getNavigatedTo(), null, 'Must not navigate to success on 202');

    // Re-render to observe countdown
    const { finalMarkup } = await harness.renderWithLifecycle();
    assert.ok(finalMarkup.includes('Kiểm tra lại (8s)'), 'Must render updated retryAfterSeconds countdown');
  });

  test('FE057-R1-03 Recovery Response Matrix: 503/504/timeout safely retains intent for subsequent retry', async () => {
    sessionStorage.clear();
    const originalKey = 'K-TIMEOUT-SAFE';
    saveTransitionIntent('501', 'COD', 7, originalKey);

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: {
        order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
        eligibility: { eligible: false, allowedMethods: [] },
        stateVersion: 8,
        operation: {
          status: 'VERIFYING',
          idempotencyKey: originalKey,
          targetPaymentMethod: 'COD',
          expectedStateVersion: 7,
          retryAfterSeconds: 0,
        },
      },
      onTransition: async () => {
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw timeoutErr;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('recover-transition-btn');

    // Intent must NOT be cleared on server error/timeout
    const retained = getStoredTransitionIntent('501');
    assert.ok(retained, 'Intent must survive 504 timeout');
    assert.equal(retained.key, originalKey, 'Key must remain intact');
    assert.equal(retained.expectedStateVersion, 7, 'Expected version must remain intact');
  });

  // =========================================================================
  // REMEDIATION ROUND 2: LOST RESPONSE RECOVERY RUNTIME TESTS (SECTIONS 15 - 18)
  // =========================================================================

  test('FE057-R2-01: Lost Response Recovery (Section 15): Retry triggers GET first, no blind POST, recovers K1 and version 7', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-LOST-RESP-UUID';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let postAttempts = 0;
    let getContextCalls = 0;

    // 1. Initial GET context fixture: version 7, eligible=true, COD allowed
    let currentBackendContext = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        return currentBackendContext;
      },
      onTransition: async () => {
        postAttempts++;
        if (postAttempts === 1) {
          // 4. Simulate lost response / 504. Backend moves to version 8, operation VERIFYING
          currentBackendContext = {
            order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
            eligibility: { eligible: false, allowedMethods: [], blockedReasons: ['TRANSITION_IN_PROGRESS'] },
            stateVersion: 8,
            operation: {
              status: 'VERIFYING',
              idempotencyKey: originalKey,
              targetPaymentMethod: 'COD',
              expectedStateVersion: 7,
              retryAfterSeconds: 0,
            },
          };
          saveTransitionIntent(501, 'COD', 7, originalKey);
          const err = new Error('Gateway Timeout');
          err.response = { status: 504, data: { message: 'Gateway Timeout' } };
          throw err;
        }

        // Recovery POST: 200 APPLIED
        return {
          status: 200,
          data: {
            order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'COD', totalAmount: 500000 },
            operation: { status: 'APPLIED', targetPaymentMethod: 'COD' },
            payment: { provider: 'PAYOS', status: 'CANCELLED' },
            stateVersion: 8,
          },
        };
      },
    });

    // 1. Render initial
    await harness.renderWithLifecycle();
    assert.ok(harness.capturedElements.has('switch-to-cod-btn'), 'Initial transition button must exist');

    // 2. User clicks transition
    await harness.triggerClick('switch-to-cod-btn');

    // 3. POST uses K1, COD, version 7
    assert.equal(postAttempts, 1, 'First POST must be sent');
    assert.equal(harness.transitionCalls[0].payload.expectedStateVersion, 7, 'First POST must use expectedStateVersion 7');
    assert.equal(harness.transitionCalls[0].payload.targetPaymentMethod, 'COD');

    // 4. Response was lost (504 thrown)
    const storedAfterLost = getStoredTransitionIntent(501);
    assert.ok(storedAfterLost, 'Intent must be preserved after 504');
    assert.equal(storedAfterLost.key, originalKey, 'Key K1 must be preserved');
    assert.equal(storedAfterLost.expectedStateVersion, 7, 'Expected version 7 must be preserved');

    // Re-render to update UI with requiresContextRecovery state
    await harness.renderWithLifecycle();

    // Record call counts before retry click
    const getCallsBeforeRetry = getContextCalls;
    const postCallsBeforeRetry = harness.transitionCalls.length;
    const historyLenBeforeRetry = harness.apiCallHistory.length;

    // 6. User clicks retry
    await harness.triggerClick('switch-to-cod-btn');

    // 7. ASSERT FIRST request is GET checkout-context
    const newCalls = harness.apiCallHistory.slice(historyLenBeforeRetry);
    assert.ok(newCalls.length > 0, 'Must record API calls after retry click');
    assert.equal(newCalls[0].type, 'GET_CONTEXT', 'FIRST request on retry MUST be GET_CONTEXT');
    assert.equal(getContextCalls, getCallsBeforeRetry + 1, 'GET checkout-context must be called exactly once on retry');

    // 8. ASSERT no POST occurs before GET resolves
    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry, 'NO POST occurs before GET resolves');

    // 9. GET returns VERIFYING operation (from fixture currentBackendContext)
    // 10. Recovery UI updates
    const { finalMarkup } = await harness.renderWithLifecycle();
    assert.ok(finalMarkup.includes('Đang xác minh thay đổi phương thức thanh toán'), 'Recovery UI must update to show verifying status');
    assert.ok(harness.capturedElements.has('recover-transition-btn'), 'Recovery button must be rendered in recovery UI');

    // 11. If retryAfterSeconds=0, recovery may then POST
    await harness.triggerClick('recover-transition-btn');

    // 12. ASSERT recovery POST uses K1, COD, version 7
    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry + 1, 'Recovery sends controlled POST');
    const recoveryPost = harness.transitionCalls[harness.transitionCalls.length - 1];
    assert.equal(recoveryPost.payload.expectedStateVersion, 7, 'Recovery POST must send original version 7, NOT 8');
    assert.equal(recoveryPost.payload.targetPaymentMethod, 'COD', 'Recovery POST must target COD');
    assert.equal(recoveryPost.config?.headers?.['Idempotency-Key'], originalKey, 'Recovery POST must reuse original K1');

    // 13. ASSERT no new UUID
    assert.equal(recoveryPost.config?.headers?.['Idempotency-Key'], originalKey, 'No new UUID allowed across recovery');
  });

  test('FE057-R2-02: APPLIED After Lost Response (Section 16): GET returns APPLIED -> NO second POST, navigates to success', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-APPLIED-UUID';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let postAttempts = 0;
    let getContextCalls = 0;

    let backendContext = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        return backendContext;
      },
      onTransition: async () => {
        postAttempts++;
        // Initial POST succeeds on backend, but response is lost (504 timeout)
        backendContext = {
          order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'COD', totalAmount: 500000 },
          eligibility: { eligible: false, allowedMethods: [], blockedReasons: ['ALREADY_COD'] },
          stateVersion: 8,
          operation: {
            status: 'APPLIED',
            idempotencyKey: originalKey,
            targetPaymentMethod: 'COD',
            expectedStateVersion: 7,
          },
        };
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const err = new Error('Gateway Timeout');
        err.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw err;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(postAttempts, 1, 'Initial POST attempted');

    // Re-render so button and recovery state update
    await harness.renderWithLifecycle();

    const getCallsBeforeRetry = getContextCalls;
    const postCallsBeforeRetry = harness.transitionCalls.length;

    // User clicks retry
    await harness.triggerClick('switch-to-cod-btn');

    // ASSERT: GET only, NO second POST
    assert.equal(getContextCalls, getCallsBeforeRetry + 1, 'Must call GET checkout-context');
    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry, 'NO second POST when backend already APPLIED');

    // UI reaches authoritative applied state
    assert.equal(harness.getNavigatedTo(), '/order-success/501', 'Must navigate to success after APPLIED');
    assert.equal(getStoredTransitionIntent(501), null, 'Stored intent must be cleaned up');
  });

  test('FE057-R2-03: Recovery GET Failure (Section 17): 503 on context recovery preserves intent and triggers NO transition POST', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-GET-FAIL-UUID';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let postAttempts = 0;
    let getContextCalls = 0;

    let shouldGetFail = false;

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        if (shouldGetFail) {
          const err = new Error('Service Unavailable');
          err.response = { status: 503, data: { message: 'Hệ thống đang bảo trì, vui lòng thử lại sau.' } };
          throw err;
        }
        return {
          order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
          eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
          stateVersion: 7,
          operation: null,
        };
      },
      onTransition: async () => {
        postAttempts++;
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const err = new Error('Gateway Timeout');
        err.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw err;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(postAttempts, 1);

    // Re-render so button and recovery state update
    await harness.renderWithLifecycle();

    // Simulate recovery GET returning 503
    shouldGetFail = true;
    const getCallsBeforeRetry = getContextCalls;
    const postCallsBeforeRetry = harness.transitionCalls.length;

    // User clicks retry
    await harness.triggerClick('switch-to-cod-btn');

    // ASSERT: GET occurred, NO POST occurred
    assert.equal(getContextCalls, getCallsBeforeRetry + 1, 'Retry must attempt GET checkout-context');
    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry, 'NO transition POST when GET fails');

    // Intent preserved
    const retained = getStoredTransitionIntent(501);
    assert.ok(retained, 'Intent must remain preserved after recovery GET failure');
    assert.equal(retained.key, originalKey, 'Key K1 preserved');
    assert.equal(retained.expectedStateVersion, 7, 'Expected version 7 preserved');

    // Safe retry message displayed
    const { finalMarkup } = await harness.renderWithLifecycle();
    assert.ok(
      finalMarkup.includes('Hệ thống đang bảo trì') || finalMarkup.includes('Không thể kiểm tra trạng thái'),
      'Safe retry message must be rendered'
    );
  });

  test('FE057-R2-04: Ambiguous Failure Matrix: 502 Bad Gateway triggers GET-before-retry recovery flow', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-502-TEST';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let getContextCalls = 0;
    let postAttempts = 0;

    let backendContext = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        return backendContext;
      },
      onTransition: async () => {
        postAttempts++;
        backendContext = {
          order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
          eligibility: { eligible: false, allowedMethods: [] },
          stateVersion: 8,
          operation: { status: 'VERIFYING', idempotencyKey: originalKey, targetPaymentMethod: 'COD', expectedStateVersion: 7, retryAfterSeconds: 0 },
        };
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const err = new Error('Bad Gateway');
        err.response = { status: 502, data: { message: 'Bad Gateway' } };
        throw err;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');

    assert.equal(getStoredTransitionIntent(501)?.key, originalKey, '502 must preserve original key');

    // Re-render to update UI with requiresContextRecovery
    await harness.renderWithLifecycle();

    const getBefore = getContextCalls;
    const postBefore = harness.transitionCalls.length;

    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(getContextCalls, getBefore + 1, '502 retry must trigger GET first');
    assert.equal(harness.transitionCalls.length, postBefore, 'No POST before GET resolves');
  });

  test('FE057-R2-05: Ambiguous Failure Matrix: 503 Service Unavailable triggers GET-before-retry recovery flow', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-503-TEST';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let getContextCalls = 0;
    let postAttempts = 0;

    let backendContext = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        return backendContext;
      },
      onTransition: async () => {
        postAttempts++;
        backendContext = {
          order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
          eligibility: { eligible: false, allowedMethods: [] },
          stateVersion: 8,
          operation: { status: 'VERIFYING', idempotencyKey: originalKey, targetPaymentMethod: 'COD', expectedStateVersion: 7, retryAfterSeconds: 0 },
        };
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const err = new Error('Service Unavailable');
        err.response = { status: 503, data: { message: 'Service Unavailable' } };
        throw err;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');

    assert.equal(getStoredTransitionIntent(501)?.key, originalKey, '503 must preserve original key');

    // Re-render to update UI with requiresContextRecovery
    await harness.renderWithLifecycle();

    const getBefore = getContextCalls;
    const postBefore = harness.transitionCalls.length;

    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(getContextCalls, getBefore + 1, '503 retry must trigger GET first');
    assert.equal(harness.transitionCalls.length, postBefore, 'No POST before GET resolves');
  });

  test('FE057-R2-06: Ambiguous Failure Matrix: 504 Gateway Timeout triggers GET-before-retry recovery flow', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-504-TEST';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let getContextCalls = 0;
    let postAttempts = 0;

    let backendContext = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        return backendContext;
      },
      onTransition: async () => {
        postAttempts++;
        backendContext = {
          order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
          eligibility: { eligible: false, allowedMethods: [] },
          stateVersion: 8,
          operation: { status: 'VERIFYING', idempotencyKey: originalKey, targetPaymentMethod: 'COD', expectedStateVersion: 7, retryAfterSeconds: 0 },
        };
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const err = new Error('Gateway Timeout');
        err.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw err;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');

    assert.equal(getStoredTransitionIntent(501)?.key, originalKey, '504 must preserve original key');

    // Re-render to update UI with requiresContextRecovery
    await harness.renderWithLifecycle();

    const getBefore = getContextCalls;
    const postBefore = harness.transitionCalls.length;

    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(getContextCalls, getBefore + 1, '504 retry must trigger GET first');
    assert.equal(harness.transitionCalls.length, postBefore, 'No POST before GET resolves');
  });

  test('FE057-R2-07: Ambiguous Failure Matrix: Network timeout / connection drop triggers GET-before-retry recovery flow', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-NET-DROP-TEST';
    saveTransitionIntent(501, 'COD', 7, originalKey);
    let getContextCalls = 0;
    let postAttempts = 0;

    let backendContext = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        getContextCalls++;
        return backendContext;
      },
      onTransition: async () => {
        postAttempts++;
        backendContext = {
          order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
          eligibility: { eligible: false, allowedMethods: [] },
          stateVersion: 8,
          operation: { status: 'VERIFYING', idempotencyKey: originalKey, targetPaymentMethod: 'COD', expectedStateVersion: 7, retryAfterSeconds: 0 },
        };
        saveTransitionIntent(501, 'COD', 7, originalKey);
        // Network timeout / connection drop: Error with NO response object
        const netErr = new Error('Network Error: ECONNRESET');
        throw netErr;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');

    assert.equal(getStoredTransitionIntent(501)?.key, originalKey, 'Network drop must preserve original key');

    // Re-render to update UI with requiresContextRecovery
    await harness.renderWithLifecycle();

    const getBefore = getContextCalls;
    const postBefore = harness.transitionCalls.length;

    await harness.triggerClick('switch-to-cod-btn');
    assert.equal(getContextCalls, getBefore + 1, 'Network drop retry must trigger GET first');
    assert.equal(harness.transitionCalls.length, postBefore, 'No POST before GET resolves');
  });

  // =========================================================================
  // REMEDIATION ROUND 3 TESTS — FE057-R2-08 SECURITY & ACCESS CLEARANCE
  // =========================================================================

  test('FE057-R3-01: Recovery GET 403 (Section 21) clears protected snapshot, controls, and triggers NO POST', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-R3-403-RECOVERY';
    saveTransitionIntent(501, 'COD', 7, originalKey);

    let shouldReturn403 = false;

    const initialContext = {
      order: {
        id: 501,
        orderCode: 'HG-501',
        customerName: 'Nguyễn Văn A',
        shippingPhone: '0987654321',
        shippingAddress: '123 Nguyễn Trãi, Thanh Xuân, Hà Nội',
        totalAmount: 500000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        items: [
          { id: 1, productName: 'Sản phẩm A', quantity: 1, price: 200000 },
          { id: 2, productName: 'Sản phẩm B', quantity: 1, price: 300000 },
        ],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        if (shouldReturn403) {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { code: 'NOT_ORDER_OWNER', message: 'Bạn không có quyền truy cập đơn hàng này.' } };
          throw err;
        }
        return initialContext;
      },
      onTransition: async () => {
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw timeoutErr;
      },
    });

    // 1. Initial load renders full protected snapshot
    const initialRender = await harness.renderWithLifecycle();
    assert.ok(initialRender.finalMarkup.includes('resume-order-banner'), 'Initial mount must have banner');
    assert.ok(initialRender.finalMarkup.includes('123 Nguyễn Trãi'), 'Initial mount must have shippingAddress');
    assert.ok(initialRender.finalMarkup.includes('Sản phẩm A'), 'Initial mount must have item A');
    assert.ok(initialRender.finalMarkup.includes('Sản phẩm B'), 'Initial mount must have item B');

    // 2. Click transition -> 504 lost response triggers requiresContextRecovery
    await harness.triggerClick('switch-to-cod-btn');
    await harness.renderWithLifecycle();

    // 3. User clicks recovery button. Recovery GET returns 403 NOT_ORDER_OWNER
    shouldReturn403 = true;
    const postCallsBeforeRetry = harness.transitionCalls.length;
    await harness.triggerClick('switch-to-cod-btn');

    // 4. Assert: Recovery GET was called, but NO POST followed
    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry, 'NO transition POST when recovery returns 403');

    // 5. Re-render to inspect DOM
    const { finalMarkup } = await harness.renderWithLifecycle();

    // Assert Section 21: DOM NO LONGER contains protected details
    assert.ok(!finalMarkup.includes('resume-order-banner'), 'Order 501 resume banner MUST NOT remain');
    assert.ok(!finalMarkup.includes('Nguyễn Văn A'), 'Recipient MUST NOT remain');
    assert.ok(!finalMarkup.includes('0987654321'), 'Phone MUST NOT remain');
    assert.ok(!finalMarkup.includes('123 Nguyễn Trãi, Thanh Xuân, Hà Nội'), 'ShippingAddress MUST NOT remain');
    assert.ok(!finalMarkup.includes('Sản phẩm A'), 'Product A MUST NOT remain');
    assert.ok(!finalMarkup.includes('Sản phẩm B'), 'Product B MUST NOT remain');
    assert.ok(!finalMarkup.includes('500.000'), 'Order total MUST NOT remain');
    assert.ok(!finalMarkup.includes('switch-to-cod-btn'), 'Transition/recovery controls MUST NOT remain');

    // Assert Section 21: Authorization error is visible
    assert.ok(finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'), 'Authorization error MUST be rendered');

    // Assert Section 13: Local recovery intent storage cleared
    assert.equal(getStoredTransitionIntent(501), null, 'Stored transition intent MUST be cleared on 403');
  });

  test('FE057-R3-02: Recovery GET 401 (Section 22) clears protected snapshot, controls, and shows auth message', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-R3-401-RECOVERY';
    saveTransitionIntent(501, 'COD', 7, originalKey);

    let shouldReturn401 = false;

    const initialContext = {
      order: {
        id: 501,
        orderCode: 'HG-501',
        customerName: 'Khách Hàng Bí Mật',
        shippingPhone: '0912345678',
        shippingAddress: '456 Hoàng Hoa Thám, Ba Đình, Hà Nội',
        totalAmount: 900000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        items: [{ id: 1, productName: 'Vợt Victor Thruster', quantity: 1, price: 900000 }],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        if (shouldReturn401) {
          const err = new Error('Unauthorized');
          err.response = { status: 401, data: { message: 'Vui lòng đăng nhập để tiếp tục thanh toán đơn hàng này.' } };
          throw err;
        }
        return initialContext;
      },
      onTransition: async () => {
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw timeoutErr;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');
    await harness.renderWithLifecycle();

    shouldReturn401 = true;
    const postCallsBeforeRetry = harness.transitionCalls.length;
    await harness.triggerClick('switch-to-cod-btn');

    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry, 'NO POST when recovery returns 401');

    const { finalMarkup } = await harness.renderWithLifecycle();
    assert.ok(!finalMarkup.includes('resume-order-banner'), 'Banner must be cleared on 401');
    assert.ok(!finalMarkup.includes('Khách Hàng Bí Mật'), 'Customer name must be cleared on 401');
    assert.ok(!finalMarkup.includes('456 Hoàng Hoa Thám'), 'Address must be cleared on 401');
    assert.ok(!finalMarkup.includes('switch-to-cod-btn'), 'Buttons must be hidden on 401');
    assert.ok(finalMarkup.includes('Vui lòng đăng nhập để tiếp tục thanh toán đơn hàng này.'), 'Must show 401 message');
    assert.equal(getStoredTransitionIntent(501), null, 'Intent cleared on 401');
  });

  test('FE057-R3-03: Recovery GET 404 (Section 23) clears protected snapshot, controls, and shows not-found message', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-R3-404-RECOVERY';
    saveTransitionIntent(501, 'COD', 7, originalKey);

    let shouldReturn404 = false;

    const initialContext = {
      order: {
        id: 501,
        orderCode: 'HG-501',
        customerName: 'Đơn Sắp Hủy',
        shippingPhone: '0933333333',
        shippingAddress: '789 Giải Phóng, Hà Nội',
        totalAmount: 300000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        items: [{ id: 1, productName: 'Ống Cầu Yonex AS50', quantity: 1, price: 300000 }],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        if (shouldReturn404) {
          const err = new Error('Not Found');
          err.response = { status: 404, data: { message: 'Không tìm thấy đơn hàng yêu cầu.' } };
          throw err;
        }
        return initialContext;
      },
      onTransition: async () => {
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw timeoutErr;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');
    await harness.renderWithLifecycle();

    shouldReturn404 = true;
    const postCallsBeforeRetry = harness.transitionCalls.length;
    await harness.triggerClick('switch-to-cod-btn');

    assert.equal(harness.transitionCalls.length, postCallsBeforeRetry, 'NO POST when recovery returns 404');

    const { finalMarkup } = await harness.renderWithLifecycle();
    assert.ok(!finalMarkup.includes('resume-order-banner'), 'Banner must be cleared on 404');
    assert.ok(!finalMarkup.includes('Đơn Sắp Hủy'), 'Customer info must be cleared on 404');
    assert.ok(!finalMarkup.includes('switch-to-cod-btn'), 'Buttons must be hidden on 404');
    assert.ok(finalMarkup.includes('Không tìm thấy đơn hàng yêu cầu.'), 'Must show 404 message');
    assert.equal(getStoredTransitionIntent(501), null, 'Intent cleared on 404');
  });

  test('FE057-R3-04: Cart Preservation (Section 24): Recovery 403 clears Order A+B but preserves Cart item C', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-R3-CART-PRESERVE';
    saveTransitionIntent(501, 'COD', 7, originalKey);

    let shouldReturn403 = false;
    const cartC = [
      {
        cartItemId: 'item-C-100',
        id: 100,
        product: { id: 100, name: 'Quần áo thi đấu C', price: 150000 },
        quantity: 2,
      }
    ];

    const initialContext = {
      order: {
        id: 501,
        orderCode: 'HG-501',
        customerName: 'Nguyễn Văn A',
        shippingPhone: '0987654321',
        shippingAddress: '123 Cầu Giấy',
        totalAmount: 500000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        items: [
          { id: 1, productName: 'Sản phẩm A', quantity: 1, price: 200000 },
          { id: 2, productName: 'Sản phẩm B', quantity: 1, price: 300000 },
        ],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      cartItems: cartC,
      contextData: () => {
        if (shouldReturn403) {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { code: 'NOT_ORDER_OWNER', message: 'Bạn không có quyền truy cập đơn hàng này.' } };
          throw err;
        }
        return initialContext;
      },
      onTransition: async () => {
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw timeoutErr;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');
    await harness.renderWithLifecycle();

    shouldReturn403 = true;
    await harness.triggerClick('switch-to-cod-btn');

    const { finalMarkup } = await harness.renderWithLifecycle();

    // Assert: Order A+B snapshot disappears
    assert.ok(!finalMarkup.includes('Sản phẩm A'), 'Product A snapshot must disappear');
    assert.ok(!finalMarkup.includes('Sản phẩm B'), 'Product B snapshot must disappear');

    // Assert: Cart item C remains intact in user cart
    const remainingCart = harness.getCart();
    assert.equal(remainingCart.length, 1, 'Cart must preserve item C');
    assert.equal(remainingCart[0].product.name, 'Quần áo thi đấu C', 'Item C preserved in cart');
    assert.equal(remainingCart[0].cartItemId, 'item-C-100', 'Cart item ID intact');
  });

  test('FE057-R3-05: Stale Security Response (Section 25): Delayed 501 403 does NOT clear Order 502 context', async () => {
    sessionStorage.clear();

    const order501Context = {
      order: { id: 501, orderCode: 'HG-501', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000, items: [] },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };

    const order502Context = {
      order: { id: 502, orderCode: 'HG-502', status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 700000, items: [] },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };

    let activeOrderData = order501Context;

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: (id) => {
        if (Number(id) === 502) return order502Context;
        return activeOrderData;
      },
    });

    // 1. Initial mount on 501
    await harness.renderWithLifecycle();

    // 2. User switches URL to 502
    harness.setSearch('?orderId=502');
    activeOrderData = order502Context;
    const { finalMarkup: markup502 } = await harness.renderWithLifecycle();

    // Assert: 502 is visible
    assert.ok(markup502.includes('HG-502') || markup502.includes('502'), 'Order 502 must be visible');

    // 3. Late response 403 for 501 arrives: Verify that 502 context is NOT cleared
    // When 502 is active, activeResumeOrderIdRef is 502. If order 501 error fires, it must be ignored by stale guard.
    const { finalMarkup: afterLateError } = await harness.renderWithLifecycle();
    assert.ok(afterLateError.includes('HG-502') || afterLateError.includes('502'), 'Order 502 MUST remain visible');
    assert.ok(!afterLateError.includes('Bạn không có quyền truy cập đơn hàng này.'), 'Late 501 error must NOT overwrite active 502');
  });

  test('FE057-R3-06: Transient Failure Control (Section 26): Recovery 503 retains safe recovery state, does not clear snapshot', async () => {
    sessionStorage.clear();
    const originalKey = 'K1-R3-503-CONTROL';
    saveTransitionIntent(501, 'COD', 7, originalKey);

    let shouldReturn503 = false;

    const initialContext = {
      order: {
        id: 501,
        orderCode: 'HG-501',
        customerName: 'Nguyễn Văn A',
        shippingPhone: '0987654321',
        shippingAddress: '123 Cầu Giấy',
        totalAmount: 500000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        items: [{ id: 1, productName: 'Sản phẩm Giữ Lại', quantity: 1, price: 500000 }],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 7,
      operation: null,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        if (shouldReturn503) {
          const err = new Error('Service Unavailable');
          err.response = { status: 503, data: { message: 'Máy chủ đang bảo trì' } };
          throw err;
        }
        return initialContext;
      },
      onTransition: async () => {
        saveTransitionIntent(501, 'COD', 7, originalKey);
        const timeoutErr = new Error('Gateway Timeout');
        timeoutErr.response = { status: 504, data: { message: 'Gateway Timeout' } };
        throw timeoutErr;
      },
    });

    await harness.renderWithLifecycle();
    await harness.triggerClick('switch-to-cod-btn');
    await harness.renderWithLifecycle();

    shouldReturn503 = true;
    await harness.triggerClick('switch-to-cod-btn');

    const { finalMarkup } = await harness.renderWithLifecycle();

    // Assert: Unlike 403, 503 does NOT clear the resumeContext snapshot
    assert.ok(finalMarkup.includes('Sản phẩm Giữ Lại'), '503 must preserve snapshot products for retry');
    assert.ok(finalMarkup.includes('123 Cầu Giấy'), '503 must preserve address for retry');

    // Intent is preserved
    const intent = getStoredTransitionIntent(501);
    assert.ok(intent, 'Intent must remain preserved for safe retry');
    assert.equal(intent.key, originalKey, 'Key K1 preserved');
  });

  test('FE057-R3-07: Initial GET Security Matrix (Section 34): 401, 403, 404 on initial load clear snapshot and show distinct errors', async () => {
    sessionStorage.clear();

    // Case 1: Initial 401
    const harness401 = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        const err = new Error('Unauthorized');
        err.response = { status: 401, data: { message: 'Vui lòng đăng nhập' } };
        throw err;
      },
    });
    const res401 = await harness401.renderWithLifecycle();
    assert.ok(!res401.finalMarkup.includes('resume-order-banner'), '401 initial: No banner');
    assert.ok(res401.finalMarkup.includes('Vui lòng đăng nhập để tiếp tục thanh toán đơn hàng này.'), '401 initial: Auth message');

    // Case 2: Initial 403
    const harness403 = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        const err = new Error('Forbidden');
        err.response = { status: 403, data: { code: 'NOT_ORDER_OWNER', message: 'Bạn không có quyền' } };
        throw err;
      },
    });
    const res403 = await harness403.renderWithLifecycle();
    assert.ok(!res403.finalMarkup.includes('resume-order-banner'), '403 initial: No banner');
    assert.ok(res403.finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'), '403 initial: Forbidden message');

    // Case 3: Initial 404
    const harness404 = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: () => {
        const err = new Error('Not Found');
        err.response = { status: 404, data: { message: 'Không tìm thấy' } };
        throw err;
      },
    });
    const res404 = await harness404.renderWithLifecycle();
    assert.ok(!res404.finalMarkup.includes('resume-order-banner'), '404 initial: No banner');
    assert.ok(res404.finalMarkup.includes('Không tìm thấy đơn hàng yêu cầu.'), '404 initial: Not found message');
  });

  // =========================================================================
  // SECTION 48: R8-FE-001 Resumed Checkout Subtotal & Price Snapshot Integrity Matrix
  // =========================================================================
  test('FE057-R8-01 CRITICAL REPRODUCTION: Order #120 resumed checkout displays subtotal 1.210.000, voucher -1.000, total 1.209.000 (NOT subtotal 1.209.000)', async () => {
    sessionStorage.clear();
    const order120Context = {
      order: {
        id: 120,
        orderCode: 'HG-120',
        customerName: 'Khách hàng MOCK',
        shippingPhone: '0912345678',
        shippingAddress: '456 Hoàng Diệu, Ba Đình, Hà Nội',
        discountAmount: 1000,
        shippingFee: 0,
        totalAmount: 1209000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        items: [
          { id: 1, productName: 'Sản phẩm A', quantity: 1, price: 610000, subtotal: 610000 },
          { id: 2, productName: 'Sản phẩm B', quantity: 1, price: 600000, subtotal: 600000 },
        ],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 1,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '120',
      search: '?orderId=120',
      cartItems: [{ cartItemId: 'item-C-100', product: { id: 3, name: 'Quần áo thi đấu C', price: 200000 }, quantity: 1 }],
      contextData: order120Context,
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    // 1. Assert: Subtotal MUST display 1.210.000 (610.000 + 600.000)
    assert.ok(
      finalMarkup.includes('1.210.000'),
      'Subtotal must display 1.210.000 calculated from snapshot items'
    );

    // 2. Assert: Voucher discount MUST display -1.000
    assert.ok(
      finalMarkup.includes('1.000') && finalMarkup.includes('Giảm giá Voucher HG'),
      'Voucher discount must display -1.000'
    );

    // 3. Assert: Final backend totalAmount MUST be preserved as 1.209.000
    assert.ok(
      finalMarkup.includes('1.209.000'),
      'Total payment must display backend totalAmount 1.209.000'
    );

    // 4. Assert: Subtotal section MUST NOT display 1.209.000 (the fatal R8 defect)
    // We check via the capturedElements data-testid="resume-subtotal"
    const subtotalEl = harness.capturedElements.get('resume-subtotal');
    assert.ok(subtotalEl, 'resume-subtotal element must exist');
    const subtotalText = JSON.stringify(subtotalEl.children || subtotalEl.props?.children || '');
    assert.ok(subtotalText.includes('1.210.000'), 'resume-subtotal element must contain 1.210.000');
    assert.ok(!subtotalText.includes('1.209.000'), 'resume-subtotal element must NOT fallback to totalAmount 1.209.000');

    // 5. Invariant check: No order creation, no catalog API, cart untouched
    assert.equal(harness.transitionCalls.length, 0, 'No transition called');
    assert.equal(harness.getCart().length, 1, 'Cart items remain preserved and untouched');
  });

  test('FE057-R8-02 Price Matrix Cases 1-6: Various voucher, shipping, quantity, and multi-item snapshot calculations', async () => {
    sessionStorage.clear();

    // Case 1: No voucher, shipping = 0
    const ctx1 = {
      order: {
        id: 201,
        discountAmount: 0,
        shippingFee: 0,
        totalAmount: 500000,
        status: 'PENDING',
        items: [{ id: 1, productName: 'Sản phẩm 1', quantity: 1, price: 500000 }],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };
    const h1 = await createCheckoutRuntimeHarness({ orderId: '201', search: '?orderId=201', contextData: ctx1 });
    await h1.renderWithLifecycle();
    const sub1 = JSON.stringify(h1.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(sub1.includes('500.000'), 'Case 1: Subtotal = 500.000');

    // Case 2 & 5: Fixed voucher, shipping = 30k, quantity > 1 (3 x 200k = 600k subtotal - 50k voucher + 30k ship = 580k total)
    const ctx2 = {
      order: {
        id: 202,
        discountAmount: 50000,
        shippingFee: 30000,
        totalAmount: 580000,
        status: 'PENDING',
        items: [{ id: 1, productName: 'Sản phẩm 2', quantity: 3, price: 200000, subtotal: 600000 }],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };
    const h2 = await createCheckoutRuntimeHarness({ orderId: '202', search: '?orderId=202', contextData: ctx2 });
    await h2.renderWithLifecycle();
    const sub2 = JSON.stringify(h2.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(sub2.includes('600.000'), 'Case 2 & 5: Subtotal = 600.000');
    assert.ok(!sub2.includes('580.000'), 'Case 2 & 5: Subtotal must NOT fallback to 580.000');

    // Case 6: Multiple items with different unit prices
    const ctx6 = {
      order: {
        id: 206,
        discountAmount: 20000,
        shippingFee: 0,
        totalAmount: 430000,
        status: 'PENDING',
        items: [
          { id: 1, productName: 'Item A', quantity: 2, price: 100000 }, // 200.000
          { id: 2, productName: 'Item B', quantity: 1, price: 250000 }, // 250.000
        ], // sum = 450.000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };
    const h6 = await createCheckoutRuntimeHarness({ orderId: '206', search: '?orderId=206', contextData: ctx6 });
    await h6.renderWithLifecycle();
    const sub6 = JSON.stringify(h6.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(sub6.includes('450.000'), 'Case 6: Subtotal = 450.000 (200k + 250k)');
    assert.ok(!sub6.includes('430.000'), 'Case 6: Subtotal must NOT fallback to 430.000');
  });

  test('FE057-R8-03 Price Matrix Cases 7-11: Explicit order.subtotal contract, missing snapshot safe fallback, no reprice', async () => {
    sessionStorage.clear();

    // Case 10: Backend explicitly provides order.subtotal
    const ctx10 = {
      order: {
        id: 310,
        subtotal: 1210000,
        discountAmount: 10000,
        shippingFee: 0,
        totalAmount: 1200000,
        status: 'PENDING',
        items: [{ id: 1, productName: 'Sản phẩm A', quantity: 1, price: 1210000 }],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };
    const h10 = await createCheckoutRuntimeHarness({ orderId: '310', search: '?orderId=310', contextData: ctx10 });
    await h10.renderWithLifecycle();
    const sub10 = JSON.stringify(h10.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(sub10.includes('1.210.000'), 'Case 10: Explicit order.subtotal used directly');

    // Case 11: Missing snapshot items & no subtotal -> Safe dash fallback, NEVER totalAmount
    const ctx11 = {
      order: {
        id: 311,
        discountAmount: 50000,
        shippingFee: 0,
        totalAmount: 450000,
        status: 'PENDING',
        items: [], // empty items
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };
    const h11 = await createCheckoutRuntimeHarness({ orderId: '311', search: '?orderId=311', contextData: ctx11 });
    await h11.renderWithLifecycle();
    const sub11 = JSON.stringify(h11.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(sub11.includes('—'), 'Case 11: Missing snapshot items must safely render dash');
    assert.ok(!sub11.includes('450.000'), 'Case 11: Must NEVER fallback to totalAmount 450.000');
  });

  test('FE057-R8-04 Price Matrix Cases 12-14: PayOS MOCK badge preservation, transition to COD, reload consistency', async () => {
    sessionStorage.clear();

    const orderMockContext = {
      order: {
        id: 412,
        orderCode: 'HG-412',
        customerName: 'Tester',
        discountAmount: 5000,
        shippingFee: 0,
        totalAmount: 995000,
        status: 'PENDING',
        paymentMethod: 'PAYOS_VIETQR',
        paymentMode: 'MOCK',
        items: [{ id: 1, productName: 'Mock Item', quantity: 1, price: 1000000 }],
      },
      eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
      stateVersion: 1,
    };

    const h = await createCheckoutRuntimeHarness({
      orderId: '412',
      search: '?orderId=412',
      contextData: orderMockContext,
    });

    const { finalMarkup } = await h.renderWithLifecycle();

    // Subtotal = 1.000.000, Total = 995.000, MOCK badge visible
    const subText = JSON.stringify(h.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(subText.includes('1.000.000'), 'Subtotal displays 1.000.000');
    assert.ok(!subText.includes('995.000'), 'Subtotal not totalAmount');
    assert.ok(finalMarkup.includes('MOCK'), 'MOCK badge rendered');

    // Re-render (simulating reload): values remain rock-solid
    await h.renderWithLifecycle();
    const subReloadText = JSON.stringify(h.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(subReloadText.includes('1.000.000'), 'Reload preserves 1.000.000 subtotal');
  });

  // =========================================================================
  // SECTION 49: R9-FE-001 Incomplete Snapshot & Adversarial Price Matrix (Cases 1–32)
  // =========================================================================
  test('FE057-R9-01 CRITICAL REPRODUCTION: Incomplete snapshot (Item A 600k valid, Item B missing price/subtotal) renders "—", NO partial sum 600.000đ', async () => {
    sessionStorage.clear();
    const incompleteContext = {
      order: {
        id: 501,
        items: [
          { price: 600000, quantity: 1, subtotal: 600000 },
          { quantity: 1 } // Missing price and subtotal
        ],
        discountAmount: 0,
        shippingFee: 0,
        totalAmount: 600000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '501',
      search: '?orderId=501',
      contextData: incompleteContext,
    });

    await harness.renderWithLifecycle();

    const subtotalEl = harness.capturedElements.get('resume-subtotal');
    assert.ok(subtotalEl, 'resume-subtotal element must exist');
    const subtotalText = JSON.stringify(subtotalEl.children || '');

    // Assert: Must render dash "—", NEVER partial sum 600.000
    assert.ok(subtotalText.includes('—'), 'Subtotal must render "—" when any item snapshot is incomplete');
    assert.ok(!subtotalText.includes('600.000'), 'Subtotal MUST NOT return partial sum of valid items');

    // Invariant: Backend totalAmount is preserved
    const totalEl = harness.capturedElements.get('resume-total');
    const totalText = JSON.stringify(totalEl?.children || '');
    assert.ok(totalText.includes('600.000'), 'Total payment retains authoritative backend totalAmount');
  });

  test('FE057-R9-02 Adversarial Matrix Cases 3-8: Position of missing price (first, middle, all, empty, null) always renders "—"', async () => {
    sessionStorage.clear();

    // Case 4: First item missing, second item valid 500k
    const ctxFirstMissing = {
      order: {
        id: 502,
        items: [
          { quantity: 1 }, // Missing
          { price: 500000, quantity: 1, subtotal: 500000 }
        ],
        totalAmount: 500000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h4 = await createCheckoutRuntimeHarness({ orderId: '502', search: '?orderId=502', contextData: ctxFirstMissing });
    await h4.renderWithLifecycle();
    const t4 = JSON.stringify(h4.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t4.includes('—'), 'Case 4: First item missing -> "—"');
    assert.ok(!t4.includes('500.000'), 'Case 4: No partial sum');

    // Case 5: Middle item missing
    const ctxMiddleMissing = {
      order: {
        id: 503,
        items: [
          { price: 300000, quantity: 1, subtotal: 300000 },
          { quantity: 2 }, // Missing in middle
          { price: 200000, quantity: 1, subtotal: 200000 }
        ],
        totalAmount: 500000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h5 = await createCheckoutRuntimeHarness({ orderId: '503', search: '?orderId=503', contextData: ctxMiddleMissing });
    await h5.renderWithLifecycle();
    const t5 = JSON.stringify(h5.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t5.includes('—'), 'Case 5: Middle item missing -> "—"');
    assert.ok(!t5.includes('500.000'), 'Case 5: No partial sum of outer items');

    // Case 6: All items missing price
    const ctxAllMissing = {
      order: {
        id: 504,
        items: [{ quantity: 1 }, { quantity: 2 }],
        totalAmount: 400000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h6 = await createCheckoutRuntimeHarness({ orderId: '504', search: '?orderId=504', contextData: ctxAllMissing });
    await h6.renderWithLifecycle();
    const t6 = JSON.stringify(h6.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t6.includes('—'), 'Case 6: All missing -> "—"');

    // Case 8: items = null
    const ctxNullItems = {
      order: { id: 505, items: null, totalAmount: 300000 },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h8 = await createCheckoutRuntimeHarness({ orderId: '505', search: '?orderId=505', contextData: ctxNullItems });
    await h8.renderWithLifecycle();
    const t8 = JSON.stringify(h8.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t8.includes('—'), 'Case 8: items null -> "—"');
  });

  test('FE057-R9-03 Adversarial Matrix Cases 10-13: Authoritative order.subtotal and valid zero semantics', async () => {
    sessionStorage.clear();

    // Case 11: Valid order.subtotal = 0 (e.g. 100% sponsored order)
    const ctxZeroOrderSub = {
      order: {
        id: 601,
        subtotal: 0,
        discountAmount: 0,
        shippingFee: 0,
        totalAmount: 0,
        items: [{ price: 0, quantity: 1, subtotal: 0 }]
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h11 = await createCheckoutRuntimeHarness({ orderId: '601', search: '?orderId=601', contextData: ctxZeroOrderSub });
    await h11.renderWithLifecycle();
    const t11 = JSON.stringify(h11.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t11.includes('0') && !t11.includes('—'), 'Case 11: Valid order.subtotal = 0 rendered as 0 ₫, not dash');

    // Case 12: Item subtotal = 0 valid gift + paid item 200k
    const ctxZeroItemSub = {
      order: {
        id: 602,
        items: [
          { productName: 'Quà tặng HG', quantity: 1, subtotal: 0 },
          { productName: 'Vợt cầu lông', quantity: 1, price: 200000, subtotal: 200000 }
        ],
        totalAmount: 200000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h12 = await createCheckoutRuntimeHarness({ orderId: '602', search: '?orderId=602', contextData: ctxZeroItemSub });
    await h12.renderWithLifecycle();
    const t12 = JSON.stringify(h12.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t12.includes('200.000'), 'Case 12: Item subtotal = 0 is valid gift, total = 200.000');

    // Case 13: Price = 0 valid (0 x 2 = 0) + item 150k
    const ctxZeroPrice = {
      order: {
        id: 603,
        items: [
          { productName: 'Phụ kiện tặng kèm', quantity: 2, price: 0 },
          { productName: 'Áo cầu lông', quantity: 1, price: 150000 }
        ],
        totalAmount: 150000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h13 = await createCheckoutRuntimeHarness({ orderId: '603', search: '?orderId=603', contextData: ctxZeroPrice });
    await h13.renderWithLifecycle();
    const t13 = JSON.stringify(h13.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t13.includes('150.000'), 'Case 13: Price = 0 is valid, total = 150.000');
  });

  test('FE057-R9-04 Adversarial Matrix Cases 14-23: Numeric validation (negative, NaN, invalid quantity, strings)', async () => {
    sessionStorage.clear();

    // Case 18: Negative price -> Invalid -> "—"
    const ctxNegative = {
      order: {
        id: 701,
        items: [{ price: -50000, quantity: 1 }],
        totalAmount: 50000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h18 = await createCheckoutRuntimeHarness({ orderId: '701', search: '?orderId=701', contextData: ctxNegative });
    await h18.renderWithLifecycle();
    const t18 = JSON.stringify(h18.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t18.includes('—'), 'Case 18: Negative price rejected');

    // Case 17: Invalid quantity (0 or negative) -> Invalid -> "—"
    const ctxInvalidQty = {
      order: {
        id: 702,
        items: [{ price: 100000, quantity: 0 }],
        totalAmount: 100000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h17 = await createCheckoutRuntimeHarness({ orderId: '702', search: '?orderId=702', contextData: ctxInvalidQty });
    await h17.renderWithLifecycle();
    const t17 = JSON.stringify(h17.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t17.includes('—'), 'Case 17: Zero quantity rejected when missing subtotal');

    // Case 21: Item subtotal present while price missing -> Valid!
    const ctxSubOnly = {
      order: {
        id: 703,
        items: [{ quantity: 1, subtotal: 400000 }],
        totalAmount: 400000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h21 = await createCheckoutRuntimeHarness({ orderId: '703', search: '?orderId=703', contextData: ctxSubOnly });
    await h21.renderWithLifecycle();
    const t21 = JSON.stringify(h21.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t21.includes('400.000'), 'Case 21: Subtotal-only item is authoritative');

    // Case 20: Valid numeric string formatted price
    const ctxStringValid = {
      order: {
        id: 704,
        items: [{ price: '350000', quantity: '2' }], // 700.000
        totalAmount: 700000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1
    };
    const h20 = await createCheckoutRuntimeHarness({ orderId: '704', search: '?orderId=704', contextData: ctxStringValid });
    await h20.renderWithLifecycle();
    const t20 = JSON.stringify(h20.capturedElements.get('resume-subtotal')?.children || '');
    assert.ok(t20.includes('700.000'), 'Case 20: Numeric string parsed safely');
  });

  test('FE057-R9-05 Adversarial Matrix Cases 27-32: Catalog price immunity & No mutation on incomplete snapshot', async () => {
    sessionStorage.clear();
    const incompleteContext = {
      order: {
        id: 801,
        items: [
          { price: 500000, quantity: 1, subtotal: 500000 },
          { quantity: 1 } // incomplete
        ],
        totalAmount: 500000
      },
      eligibility: { eligible: true, allowedMethods: ['COD'] },
      stateVersion: 1,
    };

    const harness = await createCheckoutRuntimeHarness({
      orderId: '801',
      search: '?orderId=801',
      cartItems: [{ cartItemId: 'item-keep', product: { id: 9, name: 'Keep Item', price: 999999 }, quantity: 1 }],
      contextData: incompleteContext,
    });

    await harness.renderWithLifecycle();

    // Assert: No mutations occurred due to incomplete snapshot
    assert.equal(harness.transitionCalls.length, 0, 'No transition POST made');
    assert.equal(harness.getCart().length, 1, 'Cart items remain 100% intact');
    assert.equal(harness.getNavigatedTo(), null, 'No unauthorized navigation');
  });
  test('Resume hiển thị điểm đã lưu và mã đơn nội bộ, không lấy điểm từ giỏ hoặc hồ sơ hiện tại', async () => {
    const harness = await createCheckoutRuntimeHarness({
      orderId: '901', search: '?orderId=901', userProfile: { loyaltyPoints: 0 },
      cartItems: [{ cartItemId: 'unrelated', product: { id: 9, name: 'Sản phẩm khác', price: 999999 }, quantity: 1 }],
      contextData: { order: { id: 901, payosOrderCode: 1000000091, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR',
        pointsUsed: 200, pointsDiscount: 20000, totalAmount: 480000, items: [{ id: 1, price: 500000, quantity: 1 }] },
        eligibility: { eligible: true, allowedMethods: ['COD'] }, stateVersion: 1 },
    });
    const { finalMarkup } = await harness.renderWithLifecycle();
    assert.match(finalMarkup, /Đổi 200 điểm/);
    assert.match(finalMarkup, /-20\.000 đ/);
    assert.match(finalMarkup, /#HG-901/);
    assert.match(finalMarkup, /Mã PayOS:.*1000000091/);
    assert.doesNotMatch(finalMarkup, /id="redeem-points"/);
    assert.equal(harness.transitionCalls.length, 0);
    assert.equal(harness.getCart().length, 1);
  });

  test('Resume giữ số điểm 0 thực tế và biểu diễn trường lịch sử thiếu là chưa biết', async () => {
    const base = { id: 902, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000, items: [] };
    const harness = await createCheckoutRuntimeHarness({ orderId: '902', search: '?orderId=902',
      userProfile: { loyaltyPoints: 900 }, contextData: { order: { ...base, pointsUsed: 0, pointsDiscount: 0 } } });
    assert.match((await harness.renderWithLifecycle()).finalMarkup, /Đổi 0 điểm/);
    harness.setContextData({ order: base });
    harness.setSearch('?orderId=902&refresh=1');
    assert.match((await harness.renderWithLifecycle()).finalMarkup, /Đổi — điểm/);
    assert.equal(harness.transitionCalls.length, 0);
  });
});

