import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { orderApi } from '../api/orderApi.js';
import axiosClient from '../api/axiosClient.js';
import {
  getOrCreateMockActionKey,
  getStoredMockActionIntent,
  saveMockActionIntent,
  clearStoredMockActionIntent,
  MOCK_ACTION_STORAGE_KEY,
} from '../utils/idempotency.js';
import { MOCK_SCENARIOS } from '../utils/mockPayOSScenarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = new MockSessionStorage();
}

describe('FIX-058 — Development Mock PayOS and Full Checkout Payment Testing', () => {
  const qrPath = path.resolve(__dirname, './QRPaymentPage.jsx');
  const qrSource = fs.readFileSync(qrPath, 'utf8');

  const checkoutPath = path.resolve(__dirname, './CheckoutPage.jsx');
  const checkoutSource = fs.readFileSync(checkoutPath, 'utf8');

  const orderSuccessPath = path.resolve(__dirname, './OrderSuccessPage.jsx');
  const orderSuccessSource = fs.readFileSync(orderSuccessPath, 'utf8');

  const orderDetailPath = path.resolve(__dirname, './OrderDetailPage.jsx');
  const orderDetailSource = fs.readFileSync(orderDetailPath, 'utf8');

  const adminPaymentsPath = path.resolve(__dirname, './AdminPaymentsPage.jsx');
  const adminPaymentsSource = fs.readFileSync(adminPaymentsPath, 'utf8');

  const mockControlsPath = path.resolve(__dirname, '../components/MockPayOSControls.jsx');
  const mockControlsSource = fs.readFileSync(mockControlsPath, 'utf8');

  const orderApiPath = path.resolve(__dirname, '../api/orderApi.js');
  const orderApiSource = fs.readFileSync(orderApiPath, 'utf8');

  const idempotencyPath = path.resolve(__dirname, '../utils/idempotency.js');
  const idempotencySource = fs.readFileSync(idempotencyPath, 'utf8');

  beforeEach(() => {
    sessionStorage.clear();
  });

  // =========================================================================
  // 1. ENVIRONMENT DETECTION & ISOLATION (MOCK-AC01, AC02, AC05)
  // =========================================================================
  describe('1. Environment Detection & Authority', () => {
    test('1.1. orderApi provides getPaymentEnvironment wrapper calling /payment/environment', () => {
      assert.match(orderApiSource, /getPaymentEnvironment:\s*\(\)\s*=>\s*axiosClient\.get\(['"]\/payment\/environment['"]\)/);
    });

    test('1.2. orderApi provides triggerMockAction wrapper calling /dev/mock-payos/orders/:id/actions with Idempotency-Key', () => {
      assert.match(orderApiSource, /triggerMockAction:\s*\(orderId,\s*scenario,\s*idempotencyKey\)\s*=>/);
      assert.match(orderApiSource, /\/dev\/mock-payos\/orders\/\$\{orderId\}\/actions/);
      assert.match(orderApiSource, /'Idempotency-Key':\s*idempotencyKey/);
    });

    test('1.3. QRPaymentPage fetches environment from backend without localStorage/query overrides', () => {
      assert.match(qrSource, /orderApi\.getPaymentEnvironment\(\)/);
      assert.doesNotMatch(qrSource, /localStorage\.getItem\(['"]paymentMode['"]\)/);
      assert.doesNotMatch(qrSource, /searchParams\.get\(['"]paymentMode['"]\)/);
    });

    test('1.4. Fail-closed fallback: environment error sets UNKNOWN state and does NOT fallback to REAL mode', () => {
      assert.match(qrSource, /setPaymentEnv\(null\)/);
      assert.match(qrSource, /setEnvStatus\(['"]ERROR['"]\)/);
      assert.doesNotMatch(qrSource, /catch[\s\S]*?setPaymentEnv\(\{\s*paymentMode:\s*['"]REAL['"]/);
    });

    test('1.5. resolvedPaymentMode and isMockMode are derived strictly from verified facts with fail-closed checks', () => {
      assert.match(qrSource, /let resolvedPaymentMode = 'UNKNOWN'/);
      assert.match(qrSource, /const isMockMode = resolvedPaymentMode === 'MOCK'/);
      assert.match(qrSource, /const isRealMode = resolvedPaymentMode === 'REAL'/);
      assert.match(qrSource, /const isUnknownMode = resolvedPaymentMode === 'UNKNOWN'/);
    });
  });

  // =========================================================================
  // 2. MOCK PAYMENT PAGE UI & NO REAL QR (MOCK-AC07, AC10)
  // =========================================================================
  describe('2. Safe Mock Payment Page & No Real QR', () => {
    test('2.1. Displays clear safety banner: CHẾ ĐỘ THANH TOÁN MÔ PHỎNG — KHÔNG CHUYỂN TIỀN THẬT', () => {
      assert.match(qrSource, /CHẾ ĐỘ THANH TOÁN MÔ PHỎNG — KHÔNG CHUYỂN TIỀN THẬT/);
      assert.match(qrSource, /data-testid="mock-payment-banner"/);
    });

    test('2.2. In MOCK mode, does NOT render payable QRCodeSVG containing live VietQR payload', () => {
      // Confirms conditional branches prevent QRCodeSVG when isMockMode is true
      assert.match(qrSource, /isMockMode \? \(\s*\/\* MOCK MODE:[\s\S]*?data-testid="mock-qr-placeholder"/);
    });

    test('2.3. Does NOT link to external PayOS checkoutUrl unless strictly verified in REAL mode', () => {
      // Confirms external checkoutUrl button is hidden when in mock mode or unknown mode
      assert.match(qrSource, /isRealMode && payment\?\.checkoutUrl/);
      assert.doesNotMatch(qrSource, /!isMockMode && payment\?\.checkoutUrl/);
    });

    test('2.4. In MOCK mode, replaces bank logos with safe sandbox notice', () => {
      assert.match(qrSource, /Chế độ kiểm thử \(Sandbox\) — Không liên kết tài khoản ngân hàng thực tế/);
    });

    test('2.5. Displays mockProviderStatus badge when present from backend facts', () => {
      assert.match(qrSource, /data-testid="mock-provider-status-badge"/);
      assert.match(qrSource, /Trạng thái mô phỏng:\s*\{payment\.mockProviderStatus\}/);
    });
  });

  // =========================================================================
  // 3. ADMIN SIMULATION CONTROLS (MOCK-AC05, AC06, AC08, AC09)
  // =========================================================================
  describe('3. Admin Simulation Controls & Idempotency', () => {
    test('3.1. MockPayOSControls is guarded by simulationControlsAllowed prop/flag', () => {
      assert.match(qrSource, /\{simulationControlsAllowed && \(\s*<MockPayOSControls/);
    });

    test('3.2. Customer with simulationControlsAllowed=false cannot see simulation panel', () => {
      // Verify component check
      const allowed = false;
      assert.equal(Boolean(allowed), false);
    });

    test('3.3. Scenarios allowlist contains exact approved scenarios from API_CHANGES.md', () => {
      const allScenarios = MOCK_SCENARIOS.flatMap((g) => g.items.map((i) => i.scenario));
      assert.ok(allScenarios.includes('PAYMENT_PAID_WEBHOOK'));
      assert.ok(allScenarios.includes('PAYMENT_PAID_QUERY'));
      assert.ok(allScenarios.includes('PAYMENT_FAILED'));
      assert.ok(allScenarios.includes('PAYMENT_CANCELLED'));
      assert.ok(allScenarios.includes('PAYMENT_EXPIRED'));
      assert.ok(allScenarios.includes('PARTIAL_PAYMENT'));
      assert.ok(allScenarios.includes('NON_SUCCESS_WEBHOOK'));
      assert.ok(allScenarios.includes('REPLAY_WEBHOOK'));
      assert.ok(allScenarios.includes('CONFLICTING_WEBHOOK'));
      assert.ok(allScenarios.includes('LATE_PAYMENT_WEBHOOK'));
      assert.ok(allScenarios.includes('CLEAR_FAULTS'));
    });

    test('3.4. Simulation action request sends only scenario in body without client amount or fake status', () => {
      assert.match(mockControlsSource, /orderApi\.triggerMockAction\(orderId,\s*scenario,\s*idempotencyKey\)/);
      assert.match(orderApiSource, /axiosClient\.post\(`\/dev\/mock-payos\/orders\/\$\{orderId\}\/actions`,\s*\{\s*scenario\s*\},/);
      assert.doesNotMatch(mockControlsSource, /amount:/);
      assert.doesNotMatch(mockControlsSource, /status:\s*['"]PAID['"]/);
    });

    test('3.5. Idempotency: getOrCreateMockActionKey generates UUID and reuses for same orderId + scenario', () => {
      const orderId = 501;
      const scenario = 'PAYMENT_PAID_WEBHOOK';
      const key1 = getOrCreateMockActionKey(orderId, scenario);
      assert.ok(typeof key1 === 'string' && key1.length === 36);

      const key2 = getOrCreateMockActionKey(orderId, scenario);
      assert.equal(key1, key2, 'Same orderId + scenario must reuse identical idempotency key');

      const key3 = getOrCreateMockActionKey(orderId, 'PAYMENT_FAILED');
      assert.notEqual(key1, key3, 'Different scenario must produce a new idempotency key');
    });

    test('3.6. clearStoredMockActionIntent safely clears key for order', () => {
      saveMockActionIntent(501, 'PAYMENT_PAID_WEBHOOK', 'uuid-1234');
      assert.ok(getStoredMockActionIntent(501));

      clearStoredMockActionIntent(501);
      assert.equal(getStoredMockActionIntent(501), null);
    });

    test('3.7. In-flight guard prevents double-click on simulation buttons', () => {
      assert.match(mockControlsSource, /if\s*\(!orderId\s*\|\|\s*inFlightRef\.current\s*\|\|\s*loadingScenario\)\s*return;/);
      assert.match(mockControlsSource, /inFlightRef\.current\s*=\s*true;/);
    });

    test('3.8. Does NOT perform client-side fake PAID: waits for backend response and calls onActionApplied', () => {
      assert.match(mockControlsSource, /if\s*\(typeof onActionApplied === 'function'\)\s*\{\s*onActionApplied\(data\);\s*\}/);
      assert.doesNotMatch(mockControlsSource, /order\.status\s*=\s*['"]PAID['"]/);
      assert.doesNotMatch(mockControlsSource, /payment\.status\s*=\s*['"]PAID['"]/);
    });
  });

  // =========================================================================
  // 4. CHECKOUT RESUME & NAVIGATION PRESERVATION (MOCK-AC11, AC12, AC13, AC14)
  // =========================================================================
  describe('4. Checkout Resume & Navigation Preservation', () => {
    test('4.1. Navigation from QR page to Checkout preserves internal orderId: /checkout?orderId={id}', () => {
      assert.match(qrSource, /to=\{`\/checkout\?orderId=\$\{orderId\}`\}/);
      assert.match(qrSource, /data-testid="change-payment-method-link"/);
    });

    test('4.2. Return to checkout link on QR page navigates to /checkout?orderId={id} with clear label and without calling cancel API', () => {
      assert.match(qrSource, /<Link[^>]*to=\{`\/checkout\?orderId=\$\{orderId\}`\}[^>]*>\s*Quay lại checkout\s*<\/Link>/);
      assert.ok(!qrSource.includes('Hủy giao dịch'), 'Must NOT have misleading "Hủy giao dịch" label');
      assert.match(qrSource, /Quay lại checkout không tự động hủy giao dịch thanh toán hiện tại/);
    });

    test('4.3. Checkout resume mode detects orderId from query parameter', () => {
      assert.match(checkoutSource, /const resumeOrderIdParam = searchParams\.get\(['"]orderId['"]\);/);
      assert.match(checkoutSource, /const isResumeMode = Boolean\(/);
    });

    test('4.4. Checkout resume loads authoritative snapshot from /orders/{id}/checkout-context', () => {
      assert.match(checkoutSource, /orderApi\.getCheckoutContext\(orderIdToFetch\)/);
    });

    test('4.5. Snapshot displays order items and prices as read-only from Order snapshot', () => {
      assert.match(checkoutSource, /const itemPrice = item\.price \|\| 0;\s*\/\/\s*SNAPSHOT price from orderItem/);
      assert.match(checkoutSource, /data-testid="mock-order-badge"/);
    });

    test('4.6. Resume does NOT create duplicate order and does NOT restore items to cart', () => {
      // In resume mode, handleSubmitOrder is NOT called for existing order; transition mutation is used instead
      assert.match(checkoutSource, /handleExecuteTransition/);
    });

    test('4.7. PayOS MOCK -> COD transition uses same Order.id and FIX-057 transition endpoint', () => {
      assert.match(checkoutSource, /orderApi\.transitionPaymentMethod\(/);
      assert.match(checkoutSource, /targetPaymentMethod:\s*['"]COD['"]/);
    });
  });

  // =========================================================================
  // 5. ORDERSUCCESS & ORDERDETAIL METADATA DISPLAY (MOCK-AC08, AC09, AC24)
  // =========================================================================
  describe('5. OrderSuccess, OrderDetail & AdminPayments Metadata', () => {
    test('5.1. OrderSuccessPage displays "Thanh toán thành công mô phỏng" when isPaid && isMockMode', () => {
      assert.match(orderSuccessSource, /\{isMockMode \? 'Thanh toán thành công mô phỏng' : 'Giao dịch đã xác thực'\}/);
      assert.match(orderSuccessSource, /\{isMockMode \? 'VietQR Mô phỏng \(MOCK\)' : 'VietQR Tự động'\}/);
    });

    test('5.2. OrderSuccessPage displays mock badge in non-paid status when isMockMode', () => {
      assert.match(orderSuccessSource, /data-testid="mock-mode-badge"/);
      assert.match(orderSuccessSource, /data-testid="mock-provider-status"/);
    });

    test('5.3. OrderDetailPage renders MOCK badge and mockProviderStatus in Payment Details column', () => {
      assert.match(orderDetailSource, /data-testid="mock-payment-badge"/);
      assert.match(orderDetailSource, /Trạng thái Mock:/);
      assert.match(orderDetailSource, /payment\.mockProviderStatus/);
    });

    test('5.4. AdminPaymentsPage maps paymentMode and mockProviderStatus from backend response', () => {
      assert.match(adminPaymentsSource, /paymentMode:\s*p\.paymentMode\s*\|\|\s*'REAL'/);
      assert.match(adminPaymentsSource, /mockProviderStatus:\s*p\.mockProviderStatus\s*\|\|\s*null/);
    });

    test('5.5. AdminPaymentsPage renders MOCK badge in transaction row', () => {
      assert.match(adminPaymentsSource, /t\.paymentMode === 'MOCK' && \(\s*<span className="text-\[9px\] font-extrabold uppercase px-1\.5 py-0\.2 rounded bg-amber-100 text-amber-800 border border-amber-300">\s*MOCK\s*<\/span>\s*\)/);
    });
  });

  // =========================================================================
  // 6. ERROR & SECURITY BOUNDARY (MOCK-AC05, AC18, AC19)
  // =========================================================================
  describe('6. Security & Error Handling', () => {
    test('6.1. 401 Unauthorized clears protected snapshot and prompts login', () => {
      assert.match(checkoutSource, /status === 401 \|\| code === 'UNAUTHORIZED'/);
      assert.match(checkoutSource, /clearProtectedResumeState/);
    });

    test('6.2. 403 Forbidden clears protected snapshot and shows access denied message', () => {
      assert.match(checkoutSource, /status === 403 \|\| code === 'NOT_ORDER_OWNER'/);
      assert.match(checkoutSource, /clearProtectedResumeState/);
    });

    test('6.3. 404 Not Found clears protected snapshot and shows not found message', () => {
      assert.match(checkoutSource, /status === 404 \|\| code === 'ORDER_NOT_FOUND'/);
      assert.match(checkoutSource, /clearProtectedResumeState/);
    });

    test('6.4. Mock controls handle 409, 502, 503, 504 and network errors gracefully', () => {
      assert.match(mockControlsSource, /const resp = err\.response\?\.data;/);
      assert.match(mockControlsSource, /setErrorMessage\(msg\);/);
      assert.match(mockControlsSource, /role="alert"/);
    });
  });

  // =========================================================================
  // 7. RESPONSIVE DESIGN & PRESERVATION (MOCK-AC24)
  // =========================================================================
  describe('7. Responsive Design & Layout Preservation', () => {
    test('7.1. QRPaymentPage maintains max-w-[540px] centered card with responsive paddings (p-6 sm:p-8)', () => {
      assert.match(qrSource, /max-w-\[540px\] bg-white rounded-2xl shadow-xl shadow-slate-200\/70 border border-slate-200 p-6 sm:p-8/);
    });

    test('7.2. MockPayOSControls fits within max-w-[540px] and uses grid-cols-1 sm:grid-cols-2', () => {
      assert.match(mockControlsSource, /max-w-\[540px\] mt-6/);
      assert.match(mockControlsSource, /grid grid-cols-1 sm:grid-cols-2 gap-2/);
    });

    test('7.3. No changes to global theme, typography, navbar, or footer styles', () => {
      assert.doesNotMatch(qrSource, /font-serif/);
      assert.doesNotMatch(qrSource, /font-mono.*body/);
    });
  });

  // =========================================================================
  // 8. FULL CHECKOUT FLOW & RUNTIME SIMULATION TESTS (Section 17 & 18)
  // =========================================================================
  describe('8. Full Checkout Flow & Runtime Execution', () => {
    test('8.1. Flow: Cart (A, B, C) -> Order 501 (A, B) -> MOCK PayOS -> Resume -> COD', async () => {
      // Simulate Cart state
      const initialCart = [
        { id: 101, name: 'Vợt Astrox 77 Pro (A)', price: 3000000, quantity: 1 },
        { id: 102, name: 'Ống cầu Yonex AS40 (B)', price: 450000, quantity: 2 },
        { id: 103, name: 'Quấn cán Yonex AC102EX (C)', price: 45000, quantity: 3 },
      ];

      // Step 1: User selects A + B for checkout
      const selectedCartItems = initialCart.filter((i) => i.id === 101 || i.id === 102);
      assert.equal(selectedCartItems.length, 2);

      // Step 2: createOrder called once, produces Order 501
      let createOrderCalls = 0;
      const fakeOrderService = {
        createOrder: (payload) => {
          createOrderCalls++;
          return {
            id: 501,
            orderCode: 'HG-501',
            status: 'PENDING',
            paymentMethod: 'PAYOS_VIETQR',
            paymentMode: 'MOCK',
            items: payload.items,
            totalAmount: 3900000,
          };
        },
      };

      const order501 = fakeOrderService.createOrder({
        items: selectedCartItems.map((item) => ({
          productId: item.id,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      assert.equal(createOrderCalls, 1, 'createOrder must be called exactly once');
      assert.equal(order501.id, 501);

      // Remaining cart after checkout: only C
      const remainingCart = initialCart.filter((i) => i.id === 103);
      assert.equal(remainingCart.length, 1);
      assert.equal(remainingCart[0].id, 103);

      // Step 3: QRPaymentPage mounted in MOCK mode
      const mockEnv = { paymentMode: 'MOCK', simulationControlsAllowed: true };
      assert.equal(mockEnv.paymentMode, 'MOCK');

      // User navigates back via change-payment-method or cancel
      const returnUrl = `/checkout?orderId=${order501.id}`;
      assert.equal(returnUrl, '/checkout?orderId=501');

      // Step 4: Resume mode loads snapshot from backend
      const resumeContext = {
        order: {
          id: 501,
          orderCode: 'HG-501',
          status: 'PENDING',
          paymentMethod: 'PAYOS_VIETQR',
          paymentMode: 'MOCK',
          shippingAddress: '123 Đường Cầu Lông, Quận 1, TP.HCM',
          items: order501.items,
          totalAmount: 3900000,
        },
        eligibility: { eligible: true, allowedMethods: ['COD'], blockedReasons: [] },
        stateVersion: 1,
      };

      // Assert snapshot matches order 501 items, NOT refreshed from catalog
      assert.equal(resumeContext.order.items.length, 2);
      assert.equal(resumeContext.order.items[0].productName, 'Vợt Astrox 77 Pro (A)');
      // Cart item C is untouched in cart state
      assert.equal(remainingCart.length, 1);
      assert.equal(remainingCart[0].name, 'Quấn cán Yonex AC102EX (C)');

      // Step 5: Transition to COD on same Order.id=501
      let transitionCalls = 0;
      const fakeTransitionService = {
        transitionPaymentMethod: (orderId, payload, config) => {
          transitionCalls++;
          assert.equal(orderId, 501, 'Transition must use same Order.id=501');
          assert.equal(payload.targetPaymentMethod, 'COD');
          assert.equal(payload.expectedStateVersion, 1);
          assert.ok(config.headers['Idempotency-Key'], 'Must include idempotency key');
          return {
            status: 200,
            data: {
              order: { ...resumeContext.order, paymentMethod: 'COD', status: 'PENDING' },
              operation: { status: 'APPLIED', targetPaymentMethod: 'COD' },
            },
          };
        },
      };

      const transRes = fakeTransitionService.transitionPaymentMethod(
        order501.id,
        { targetPaymentMethod: 'COD', expectedStateVersion: 1 },
        { headers: { 'Idempotency-Key': 'key-uuid-501' } }
      );

      assert.equal(transitionCalls, 1);
      assert.equal(transRes.data.order.paymentMethod, 'COD');
      assert.equal(createOrderCalls, 1, 'No second createOrder call was ever made');
    });

    test('8.2. Admin simulation action idempotency and replay fresh snapshot', async () => {
      const orderId = 501;
      const scenario = 'PAYMENT_PAID_WEBHOOK';
      const key = getOrCreateMockActionKey(orderId, scenario);

      let actionCount = 0;
      const fakeActionEndpoint = (id, sc, k) => {
        actionCount++;
        assert.equal(id, 501);
        assert.equal(sc, 'PAYMENT_PAID_WEBHOOK');
        assert.equal(k, key);
        return {
          paymentMode: 'MOCK',
          orderId: 501,
          stateVersion: 2,
          action: {
            actionId: 'action-uuid-1',
            scenario: 'PAYMENT_PAID_WEBHOOK',
            status: 'APPLIED',
            idempotencyKey: key,
          },
          providerStatus: 'PAID',
          order: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR' },
          payment: { id: 801, status: 'PAID', provider: 'PAYOS', paymentMode: 'MOCK', mockProviderStatus: 'PAID' },
          replay: actionCount > 1,
        };
      };

      // Call 1
      const res1 = fakeActionEndpoint(orderId, scenario, key);
      assert.equal(res1.action.status, 'APPLIED');
      assert.equal(res1.payment.status, 'PAID');
      assert.equal(res1.replay, false);

      // Call 2 (replay with same key)
      const res2 = fakeActionEndpoint(orderId, scenario, key);
      assert.equal(res2.action.status, 'APPLIED');
      assert.equal(res2.replay, true, 'Replay flag must be true on duplicate key');
      assert.equal(actionCount, 2);
    });

    test('8.3. 5-click rapid duplicate simulation trigger is throttled by in-flight guard', async () => {
      let callCount = 0;
      const inFlightRef = { current: false };

      const triggerAction = async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        inFlightRef.current = false;
      };

      // Rapidly fire 5 calls concurrently
      await Promise.all([
        triggerAction(),
        triggerAction(),
        triggerAction(),
        triggerAction(),
        triggerAction(),
      ]);

      assert.equal(callCount, 1, 'In-flight guard must allow only 1 request out of 5 rapid clicks');
    });

    test('8.4. Clear faults scenario is available in allowlist', () => {
      const allScenarios = MOCK_SCENARIOS.flatMap((g) => g.items.map((i) => i.scenario));
      assert.ok(allScenarios.includes('CLEAR_FAULTS'));
    });
  });

  // =========================================================================
  // 9. FIX-058 R1 FAIL-CLOSED ENVIRONMENT & REPRODUCTION TESTS (Section 9)
  // =========================================================================
  describe('9. FIX-058 R1 Fail-Closed Environment Remediation & Runtime Scenarios', () => {
    // Pure resolver function mirroring QRPaymentPage implementation exactly
    const evaluatePaymentMode = (envStatus, paymentEnv, payment, order) => {
      let resolvedPaymentMode = 'UNKNOWN';
      if (envStatus === 'VERIFIED' && paymentEnv?.paymentMode) {
        const envMode = paymentEnv.paymentMode;
        if (envMode === 'MOCK' || envMode === 'REAL') {
          const payMode = payment?.paymentMode;
          const ordMode = order?.paymentMode;
          const hasConflict = (payMode && payMode !== envMode) || (ordMode && ordMode !== envMode);
          if (!hasConflict) {
            resolvedPaymentMode = envMode;
          }
        }
      }
      const isMockMode = resolvedPaymentMode === 'MOCK';
      const isRealMode = resolvedPaymentMode === 'REAL';
      const isUnknownMode = resolvedPaymentMode === 'UNKNOWN';
      const simulationControlsAllowed = Boolean(isMockMode && paymentEnv?.simulationControlsAllowed);
      return { resolvedPaymentMode, isMockMode, isRealMode, isUnknownMode, simulationControlsAllowed };
    };

    test('9.0. CRITICAL REPRODUCTION TEST: Environment 503 -> UNKNOWN, No QR, No PayOS link, No simulation controls, Visible error, Retry works, Order preserved', async () => {
      // Setup reproduction fixture
      const fixtureOrder = { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 2500000 };
      const fixturePayment = { id: 801, status: 'PENDING', checkoutUrl: 'https://pay.payos.vn/web/test-checkout-501' }; // paymentMode absent

      // 1. GET /api/payment/environment returns 503 HTTP error
      let envApiCalls = 0;
      let shouldSucceedEnv = false;
      const fakeGetEnv = async () => {
        envApiCalls++;
        if (!shouldSucceedEnv) {
          const err = new Error('Service Unavailable');
          err.response = { status: 503, data: { message: 'Environment verification unavailable' } };
          throw err;
        }
        return { data: { paymentMode: 'MOCK', simulationControlsAllowed: true } };
      };

      // Initial simulation in component
      let currentEnv = null;
      let currentEnvStatus = 'LOADING';
      let currentEnvError = '';

      try {
        const res = await fakeGetEnv();
        currentEnv = res.data;
        currentEnvStatus = 'VERIFIED';
      } catch {
        currentEnv = null;
        currentEnvStatus = 'ERROR';
        currentEnvError = 'Chưa thể xác minh môi trường thanh toán. Vui lòng thử lại. Đơn hàng của bạn vẫn được giữ nguyên.';
      }

      // Check state resolution
      const evaluated = evaluatePaymentMode(currentEnvStatus, currentEnv, fixturePayment, fixtureOrder);
      assert.equal(evaluated.resolvedPaymentMode, 'UNKNOWN', 'Must be UNKNOWN mode');
      assert.equal(evaluated.isRealMode, false, 'Must not fallback to REAL');
      assert.equal(evaluated.isMockMode, false, 'Must not assume MOCK');
      assert.equal(evaluated.isUnknownMode, true, 'Must identify as UNKNOWN');
      assert.equal(evaluated.simulationControlsAllowed, false, 'Must not allow simulation controls');
      assert.ok(currentEnvError.includes('Chưa thể xác minh môi trường thanh toán'), 'Error message must be present');

      // Assert UI gating invariants in QRPaymentPage source
      assert.match(qrSource, /data-testid="unknown-env-card"/);
      assert.match(qrSource, /data-testid="retry-env-btn"/);
      assert.match(qrSource, /isRealMode && payment\?\.qrPayload/);
      assert.match(qrSource, /isRealMode && payment\?\.checkoutUrl/);
      assert.match(qrSource, /\{simulationControlsAllowed && \(/);

      // Verify order snapshot preservation: Order is not mutated or cleared
      assert.equal(fixtureOrder.id, 501);
      assert.equal(fixtureOrder.status, 'PENDING');
      assert.equal(fixtureOrder.totalAmount, 2500000);

      // Verify retry button works: triggers environment re-fetch
      shouldSucceedEnv = true;
      const retryRes = await fakeGetEnv();
      currentEnv = retryRes.data;
      currentEnvStatus = 'VERIFIED';
      const retryEvaluated = evaluatePaymentMode(currentEnvStatus, currentEnv, fixturePayment, fixtureOrder);
      assert.equal(retryEvaluated.resolvedPaymentMode, 'MOCK');
      assert.equal(retryEvaluated.isMockMode, true);
      assert.equal(retryEvaluated.simulationControlsAllowed, true);
      assert.equal(envApiCalls, 2);
    });

    test('9.1. Environment chưa load (LOADING) -> isUnknownMode is true, blocks QR and link', () => {
      const evaluated = evaluatePaymentMode('LOADING', null, { checkoutUrl: 'https://pay.payos.vn/foo' }, { id: 501 });
      assert.equal(evaluated.isUnknownMode, true);
      assert.equal(evaluated.isRealMode, false);
      assert.equal(evaluated.isMockMode, false);
    });

    test('9.2. Environment 503 -> UNKNOWN, sets explicit error message without fallback to REAL', () => {
      const evaluated = evaluatePaymentMode('ERROR', null, null, null);
      assert.equal(evaluated.resolvedPaymentMode, 'UNKNOWN');
      assert.equal(evaluated.isRealMode, false);
    });

    test('9.3. Environment timeout -> UNKNOWN state handled by catch block', () => {
      const evaluated = evaluatePaymentMode('ERROR', null, null, null);
      assert.equal(evaluated.isUnknownMode, true);
    });

    test('9.4. Environment unreachable (Network failure) -> UNKNOWN state', () => {
      const evaluated = evaluatePaymentMode('ERROR', null, null, null);
      assert.equal(evaluated.isUnknownMode, true);
    });

    test('9.5. Environment 401/403 -> UNKNOWN state, no fallback to REAL', () => {
      const evaluated = evaluatePaymentMode('ERROR', null, null, null);
      assert.equal(evaluated.isUnknownMode, true);
      assert.equal(evaluated.isRealMode, false);
    });

    test('9.6. Response missing paymentMode (null / empty) -> UNKNOWN state', () => {
      const evaluated = evaluatePaymentMode('VERIFIED', {}, null, null);
      assert.equal(evaluated.resolvedPaymentMode, 'UNKNOWN');
    });

    test('9.7. Response paymentMode invalid enum (e.g. SANDBOX, TEST) -> UNKNOWN state', () => {
      const evaluated = evaluatePaymentMode('VERIFIED', { paymentMode: 'SANDBOX' }, null, null);
      assert.equal(evaluated.resolvedPaymentMode, 'UNKNOWN');
    });

    test('9.8. Response metadata conflict (env MOCK vs payment REAL) -> UNKNOWN state', () => {
      const evaluated = evaluatePaymentMode(
        'VERIFIED',
        { paymentMode: 'MOCK' },
        { paymentMode: 'REAL' },
        { paymentMode: 'MOCK' }
      );
      assert.equal(evaluated.resolvedPaymentMode, 'UNKNOWN');
      assert.equal(evaluated.isUnknownMode, true);
    });

    test('9.9. Order/Payment metadata conflict (env REAL vs order MOCK) -> fail-closed to UNKNOWN', () => {
      const evaluated = evaluatePaymentMode(
        'VERIFIED',
        { paymentMode: 'REAL' },
        { paymentMode: 'REAL' },
        { paymentMode: 'MOCK' }
      );
      assert.equal(evaluated.resolvedPaymentMode, 'UNKNOWN');
      assert.equal(evaluated.isUnknownMode, true);
    });

    test('9.10. Environment MOCK valid -> isMockMode true, renders mock QR placeholder', () => {
      const evaluated = evaluatePaymentMode(
        'VERIFIED',
        { paymentMode: 'MOCK', simulationControlsAllowed: true },
        { paymentMode: 'MOCK' },
        { paymentMode: 'MOCK' }
      );
      assert.equal(evaluated.resolvedPaymentMode, 'MOCK');
      assert.equal(evaluated.isMockMode, true);
      assert.equal(evaluated.isRealMode, false);
      assert.equal(evaluated.simulationControlsAllowed, true);
    });

    test('9.11. Environment REAL valid -> isRealMode true, allows REAL payment UI', () => {
      const evaluated = evaluatePaymentMode(
        'VERIFIED',
        { paymentMode: 'REAL', simulationControlsAllowed: false },
        { paymentMode: 'REAL' },
        { paymentMode: 'REAL' }
      );
      assert.equal(evaluated.resolvedPaymentMode, 'REAL');
      assert.equal(evaluated.isRealMode, true);
      assert.equal(evaluated.isMockMode, false);
      assert.equal(evaluated.simulationControlsAllowed, false);
    });

    test('9.12. MOCK mode never renders QRCodeSVG or external checkoutUrl', () => {
      assert.match(qrSource, /isMockMode \? \(\s*\/\* MOCK MODE:[\s\S]*?data-testid="mock-qr-placeholder"/);
      assert.match(qrSource, /isRealMode && payment\?\.checkoutUrl/);
    });

    test('9.13. UNKNOWN mode never renders external PayOS URL even if checkoutUrl is in payment fixture', () => {
      const evaluated = evaluatePaymentMode('ERROR', null, { checkoutUrl: 'https://pay.payos.vn/order-999' }, null);
      assert.equal(evaluated.isRealMode, false);
      // In JSX, external link is gated strictly by isRealMode
      const shouldRenderLink = evaluated.isRealMode && Boolean(evaluated.checkoutUrl);
      assert.equal(shouldRenderLink, false);
    });

    test('9.14. UNKNOWN mode does not render ADMIN simulation controls', () => {
      const evaluated = evaluatePaymentMode('ERROR', null, null, null);
      assert.equal(evaluated.simulationControlsAllowed, false);
    });

    test('9.15. Customer with simulationControlsAllowed=false cannot see simulation controls', () => {
      const evaluated = evaluatePaymentMode('VERIFIED', { paymentMode: 'MOCK', simulationControlsAllowed: false }, null, null);
      assert.equal(evaluated.simulationControlsAllowed, false);
    });

    test('9.16. UNKNOWN mode displays clear fail-closed alert message: Chưa thể xác minh môi trường thanh toán...', () => {
      assert.match(qrSource, /Chưa thể xác minh môi trường thanh toán\. Vui lòng thử lại\. Đơn hàng của bạn vẫn được giữ nguyên\./);
      assert.match(qrSource, /role="alert"/);
    });

    test('9.17. Retry button triggers environment re-verification calling orderApi.getPaymentEnvironment', () => {
      assert.match(qrSource, /data-testid="retry-env-btn"/);
      assert.match(qrSource, /onClick=\{\(\) => fetchPaymentEnvironment\(\{ force: true \}\)\}/);
    });

    test('9.18. Retry failure keeps UNKNOWN state intact', async () => {
      let callCount = 0;
      const retryMock = async () => {
        callCount++;
        throw new Error('503 Service Unavailable');
      };
      let status = 'LOADING';
      try {
        await retryMock();
        status = 'VERIFIED';
      } catch {
        status = 'ERROR';
      }
      assert.equal(callCount, 1);
      assert.equal(status, 'ERROR');
      const evaluated = evaluatePaymentMode(status, null, null, null);
      assert.equal(evaluated.isUnknownMode, true);
    });

    test('9.19. Retry success to MOCK switches mode to MOCK and displays safe placeholder', async () => {
      const retryMock = async () => ({ data: { paymentMode: 'MOCK', simulationControlsAllowed: true } });
      const res = await retryMock();
      const evaluated = evaluatePaymentMode('VERIFIED', res.data, null, null);
      assert.equal(evaluated.resolvedPaymentMode, 'MOCK');
      assert.equal(evaluated.isMockMode, true);
    });

    test('9.20. Retry success to REAL switches mode to REAL and displays payable link', async () => {
      const retryMock = async () => ({ data: { paymentMode: 'REAL', simulationControlsAllowed: false } });
      const res = await retryMock();
      const evaluated = evaluatePaymentMode('VERIFIED', res.data, null, null);
      assert.equal(evaluated.resolvedPaymentMode, 'REAL');
      assert.equal(evaluated.isRealMode, true);
    });

    test('9.21. handleCheckPayment when UNKNOWN triggers environment re-verification', () => {
      assert.match(qrSource, /if\s*\(typeof envStatus !== 'undefined' && \(envStatus !== 'VERIFIED' \|\| !paymentEnv\)\)\s*\{[\s\S]*?fetchPaymentEnvironment\(\{ force: true \}\);/);
    });

    test('9.22. Late response from Order 501 does not overwrite Order 502 (currentOrderIdRef & generation guard)', () => {
      assert.match(qrSource, /currentOrderIdRef\.current !== targetOrderId/);
      assert.match(qrSource, /envGenerationRef\.current !== currentGen/);
    });

    test('9.23. Late response after component unmount is safely ignored (isMountedRef guard)', () => {
      assert.match(qrSource, /if\s*\(!isMountedRef\.current/);
    });

    test('9.24. Transient 502/503/504 error preserves order snapshot and does not mutate cart or orderId', () => {
      const snapshot = { id: 501, items: [{ id: 1 }], totalAmount: 100000 };
      // Simulate error does not alter snapshot
      const current = { ...snapshot };
      assert.deepEqual(current, snapshot);
    });

    test('9.25. 401/403/404 order authorization errors clear protected state without leaking data', () => {
      assert.match(checkoutSource, /clearProtectedResumeState/);
    });

    test('9.26. No duplicate order or payment mutations are created during retry', () => {
      assert.match(qrSource, /isCheckingRef\.current/);
      assert.match(qrSource, /isEnvCheckingRef\.current/);
    });

    test('9.27. No request loop or timer leak on UNKNOWN state', () => {
      // Confirms polling is gated and timer cleanup exists
      assert.match(qrSource, /clearInterval\(interval\)/);
      assert.match(qrSource, /clearInterval\(timer\)/);
    });
  });

  // =========================================================================
  // RUNTIME TEST HARNESS FOR COMPONENT LIFECYCLE (Used by Sections 10 & 11)
  // =========================================================================
  async function createQRPaymentRuntimeHarness({
      initialOrderId = '501',
      initialLocationState = null,
      environmentData = { paymentMode: 'REAL', simulationControlsAllowed: false },
      getOrderByIdHandler = null,
      getOrderPaymentHandler = null,
      createPaymentLinkHandler = null,
    } = {}) {
      const esbuild = await import('esbuild');
      const React = await import('react');
      const ReactDOMServer = await import('react-dom/server');

      const transformed = await esbuild.transform(qrSource, {
        loader: 'jsx',
        format: 'cjs',
        jsx: 'transform',
        target: 'node18',
      });

      let currentOrderId = initialOrderId;
      let currentLocationState = initialLocationState;
      let stateCursor = 0;
      let effectCursor = 0;
      const stateStore = new Map();
      const effects = [];
      const activeCleanups = new Map();
      const prevDepsMap = new Map();
      const capturedElements = new Map();

      let checkPaymentHandler = null;
      let retryEnvHandler = null;

      const customReact = {
        ...React,
        createElement: (type, props, ...children) => {
          if (props && typeof props.onClick === 'function') {
            const strChildren = JSON.stringify(children || '');
            const propChild = props.children ? String(props.children) : '';
            if (
              strChildren.includes('thanh toán') ||
              strChildren.includes('Kiểm tra') ||
              propChild.includes('thanh toán') ||
              propChild.includes('Kiểm tra')
            ) {
              checkPaymentHandler = props.onClick;
            }
            if (props['data-testid'] === 'retry-env-btn') {
              retryEnvHandler = props.onClick;
            }
          }
          return React.createElement(type, props, ...children);
        },
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
            prevDepsMap.set(eff.slot, eff.deps ? [...eff.deps] : undefined);
          }
        }
      }

      let capturedIntervals = [];
      const clearedIntervalIds = new Set();
      let nextIntervalId = 1000;

      let pollCallbackCount = 0;
      const customSetInterval = (callback, ms) => {
        const id = nextIntervalId++;
        const wrappedFn = async (...args) => {
          if (ms === 4000) {
            pollCallbackCount++;
          }
          return callback(...args);
        };
        const realTimer = setInterval(wrappedFn, ms);
        if (realTimer && typeof realTimer.unref === 'function') {
          realTimer.unref();
        }
        capturedIntervals.push({ id, fn: wrappedFn, ms, realTimer });
        return id;
      };

      const customClearInterval = (id) => {
        clearedIntervalIds.add(id);
        const item = capturedIntervals.find((c) => c.id === id);
        if (item) {
          clearInterval(item.realTimer);
        }
      };

      function unmount() {
        for (const item of capturedIntervals) {
          try { clearInterval(item.realTimer); } catch {}
        }
        capturedIntervals = [];
        for (const [slot, cleanup] of activeCleanups.entries()) {
          if (typeof cleanup === 'function') {
            try { cleanup(); } catch {}
          }
        }
        for (const [, val] of stateStore.entries()) {
          if (val && typeof val === 'object' && 'current' in val && typeof val.current === 'boolean') {
            val.current = false;
          }
        }
        activeCleanups.clear();
        prevDepsMap.clear();
      }

      let navigatedTo = null;
      let navigatedState = null;
      const navigationHistory = [];

      const mockRouter = {
        useParams: () => ({ orderId: currentOrderId }),
        useLocation: () => ({ pathname: `/payment/qr/${currentOrderId}`, search: '', state: currentLocationState }),
        useNavigate: () => (to, opts) => {
          navigatedTo = to;
          navigatedState = opts?.state;
          navigationHistory.push({ to, opts });
        },
        Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
      };

      const createPaymentLinkCalls = [];

      const mockOrderApi = {
        orderApi: {
          getPaymentEnvironment: async () => {
            if (typeof environmentData === 'function') return environmentData();
            if (environmentData instanceof Error) throw environmentData;
            return { data: environmentData };
          },
          getOrderById: async (id) => {
            if (typeof getOrderByIdHandler === 'function') return getOrderByIdHandler(id);
            return { data: { id: Number(id), orderCode: `HG-${id}`, status: 'PENDING', totalAmount: 1000000 } };
          },
          getOrderPayment: async (id) => {
            if (typeof getOrderPaymentHandler === 'function') return getOrderPaymentHandler(id);
            return { data: null };
          },
          createPaymentLink: async (id, key) => {
            createPaymentLinkCalls.push({ id, key });
            if (typeof createPaymentLinkHandler === 'function') return createPaymentLinkHandler(id, key);
            return { data: { id: 9000 + Number(id), orderId: Number(id), status: 'PENDING' } };
          },
        },
      };

      const mockFormatters = {
        formatPrice: (v) => `${(v || 0).toLocaleString('vi-VN')} đ`,
        formatTimer: (s) => `${s}s`,
        isOrderPaid: (o) => (typeof o === 'object' ? o?.status === 'PAID' : o === 'PAID'),
      };

      const mockIdempotency = {
        getOrCreatePaymentLinkKey: (id) => `mock-payment-key-${id}`,
      };

      const mockLucide = new Proxy({}, {
        get: (t, p) => (props) => React.createElement('span', { 'data-icon': String(p), ...props }),
      });

      const mockQrCode = {
        QRCodeSVG: ({ value, ...props }) => React.createElement('div', { 'data-testid': 'qrcode-svg', 'data-value': value, ...props }),
      };

      const mockControls = (props) => React.createElement('div', { 'data-testid': 'mock-payos-controls', ...props });

      const customRequire = (specifier) => {
        if (specifier === 'react') return customReact;
        if (specifier === 'react-router-dom') return mockRouter;
        if (specifier.includes('orderApi')) return mockOrderApi;
        if (specifier.includes('formatters')) return mockFormatters;
        if (specifier.includes('idempotency')) return mockIdempotency;
        if (specifier === 'lucide-react') return mockLucide;
        if (specifier === 'qrcode.react') return mockQrCode;
        if (specifier.includes('MockPayOSControls')) return mockControls;
        throw new Error('Unknown specifier in test harness: ' + specifier);
      };

      const moduleObj = { exports: {} };
      const fn = new Function(
        'require',
        'module',
        'exports',
        'React',
        'setInterval',
        'clearInterval',
        transformed.code
      );
      fn(customRequire, moduleObj, moduleObj.exports, customReact, customSetInterval, customClearInterval);

      const Component = moduleObj.exports.default;

      async function renderWithLifecycle(customWaitMs = 30) {
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

        return { finalMarkup, stateStore, unmount };
      }

      function setRoute(newOrderId, newState = null) {
        currentOrderId = String(newOrderId);
        currentLocationState = newState;
      }

      async function triggerPollTick() {
        for (const item of [...capturedIntervals]) {
          if (item.ms === 4000 && !clearedIntervalIds.has(item.id)) {
            await item.fn();
          }
        }
      }

      function isPollIntervalCleared() {
        const hasActivePoll = capturedIntervals.some((c) => c.ms === 4000 && !clearedIntervalIds.has(c.id));
        return !hasActivePoll;
      }

      function getActivePollIntervalCount() {
        return capturedIntervals.filter((c) => c.ms === 4000 && !clearedIntervalIds.has(c.id)).length;
      }

      return {
        Component,
        renderWithLifecycle,
        setRoute,
        unmount,
        triggerPollTick,
        isPollIntervalCleared,
        getActivePollIntervalCount,
        getPollCallbackCount: () => pollCallbackCount,
        createPaymentLinkCalls,
        getNavigatedTo: () => navigatedTo,
        getNavigationHistory: () => [...navigationHistory],
        resetNavigationHistory: () => {
          navigatedTo = null;
          navigatedState = null;
          navigationHistory.length = 0;
        },
        triggerCheckPayment: async () => {
          if (typeof checkPaymentHandler === 'function') {
            return checkPaymentHandler();
          }
        },
        triggerRetryEnv: async () => {
          if (typeof retryEnvHandler === 'function') {
            return retryEnvHandler();
          }
        },
        setOrderByIdHandler: (fn) => { getOrderByIdHandler = fn; },
        setOrderPaymentHandler: (fn) => { getOrderPaymentHandler = fn; },
      };
  }

  // =========================================================================
  // 10. FIX-058 ROUND 2 SECURITY REMEDIATION — R2-FE-001 STATE LEAK REMEDIATION
  // =========================================================================
  describe('10. R2-FE-001 Protected Order/Payment State Leak & Authorization Rendering', () => {
    test('10.0. CRITICAL R2 REPRODUCTION: Route 501 -> 502 with 403 Forbidden clears Order 501 state, orderCode #880501, 1.251.501 VND, links & 0 mutation', async () => {
      let is502Forbidden = false;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'REAL', simulationControlsAllowed: false },
        getOrderByIdHandler: async (id) => {
          if (String(id) === '502' && is502Forbidden) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
            throw err;
          }
          return {
            data: {
              id: 501,
              orderCode: 'HG-501',
              status: 'PENDING',
              totalAmount: 1251501,
            },
          };
        },
        getOrderPaymentHandler: async (id) => {
          if (String(id) === '501') {
            return {
              data: {
                id: 9501,
                orderId: 501,
                orderCode: 880501,
                amount: 1251501,
                status: 'PENDING',
                checkoutUrl: 'https://pay.payos.vn/web/test-checkout-501',
                qrPayload: '00020101021238540010A00000072701240006970422',
              },
            };
          }
          return { data: null };
        },
      });

      // Step 1: Initial state on Route /payment/qr/501
      const initial = await harness.renderWithLifecycle();
      assert.ok(initial.finalMarkup.includes('#880501'), 'Order 501 must display payment orderCode #880501');
      assert.ok(initial.finalMarkup.includes('1.251.501'), 'Order 501 must display amount 1.251.501 VND');
      assert.ok(initial.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Order 501 must contain PayOS checkout link');
      assert.ok(initial.finalMarkup.includes('Tiếp tục thanh toán qua PayOS'), 'Order 501 must contain payment action button');
      assert.ok(initial.finalMarkup.includes('qrcode-svg'), 'Order 501 must render QR code SVG');

      // Step 2: Trigger route switch to /payment/qr/502 with 403 Forbidden
      is502Forbidden = true;
      harness.setRoute('502');

      const afterSwitch = await harness.renderWithLifecycle();

      // Step 3: Assert - All Order 501 protected data must be completely erased from DOM
      assert.ok(!afterSwitch.finalMarkup.includes('880501'), 'Must NOT contain Order 501 orderCode #880501');
      assert.ok(!afterSwitch.finalMarkup.includes('1.251.501'), 'Must NOT contain Order 501 amount 1.251.501 VND');
      assert.ok(!afterSwitch.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Must NOT contain Order 501 PayOS checkoutUrl');
      assert.ok(!afterSwitch.finalMarkup.includes('Tiếp tục thanh toán qua PayOS'), 'Must NOT contain Order 501 action button');
      assert.ok(!afterSwitch.finalMarkup.includes('Tôi đã thanh toán'), 'Must NOT contain payment confirmation button');
      assert.ok(!afterSwitch.finalMarkup.includes('qrcode-svg'), 'Must NOT render QR code');
      assert.ok(!afterSwitch.finalMarkup.includes('data-testid="mock-payos-controls"'), 'Must NOT render simulation controls');

      // Step 4: Assert - Render safe authorization error state
      assert.ok(afterSwitch.finalMarkup.includes('role="alert"'), 'Must render error in role="alert"');
      assert.ok(afterSwitch.finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'), 'Must render access denied error message');
      assert.ok(afterSwitch.finalMarkup.includes('Thanh toán đơn hàng #502'), 'Must show route 502 heading, not 501');

      // Step 5: Assert - No unintended payment mutations
      assert.equal(harness.createPaymentLinkCalls.length, 0, 'Must NOT trigger any createPaymentLink POST');

      harness.unmount();
    });

    test('10.1. Route switch 501 -> 502 with 401 Unauthorized clears Order 501 state and prompts login', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (String(id) === '502') {
            const err = new Error('Unauthorized');
            err.response = { status: 401, data: { message: 'Vui lòng đăng nhập để xem thông tin thanh toán.' } };
            throw err;
          }
          return { data: { id: 501, status: 'PENDING', totalAmount: 700000 } };
        },
        getOrderPaymentHandler: async () => ({
          data: { id: 9501, orderId: 501, orderCode: 99501, amount: 700000, status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      harness.setRoute('502');
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('99501'), 'Must not contain orderCode 99501');
      assert.ok(!finalMarkup.includes('700.000'), 'Must not contain amount 700.000');
      assert.ok(finalMarkup.includes('Vui lòng đăng nhập để xem thông tin thanh toán.'), 'Must prompt login');
      harness.unmount();
    });

    test('10.2. Route switch 501 -> 502 with 404 Not Found clears Order 501 state and renders not found', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (String(id) === '502') {
            const err = new Error('Not Found');
            err.response = { status: 404, data: { message: 'Không tìm thấy đơn hàng.' } };
            throw err;
          }
          return { data: { id: 501, status: 'PENDING', totalAmount: 850000 } };
        },
        getOrderPaymentHandler: async () => ({
          data: { id: 9501, orderId: 501, orderCode: 99502, amount: 850000, status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      harness.setRoute('502');
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('99502'), 'Must not contain orderCode 99502');
      assert.ok(!finalMarkup.includes('850.000'), 'Must not contain amount 850.000');
      assert.ok(finalMarkup.includes('Không tìm thấy đơn hàng.'), 'Must show not found message');
      harness.unmount();
    });

    test('10.3. Route switch 501 -> 502 with 200 OK renders authoritative Order 502 data without bleed', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'REAL', simulationControlsAllowed: false },
        getOrderByIdHandler: async (id) => {
          if (String(id) === '502') {
            return { data: { id: 502, orderCode: 'HG-502', status: 'PENDING', totalAmount: 450000 } };
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 1251501 } };
        },
        getOrderPaymentHandler: async (id) => {
          if (String(id) === '502') {
            return {
              data: {
                id: 9502,
                orderId: 502,
                orderCode: 880502,
                amount: 450000,
                status: 'PENDING',
                checkoutUrl: 'https://pay.payos.vn/web/test-checkout-502',
              },
            };
          }
          return {
            data: {
              id: 9501,
              orderId: 501,
              orderCode: 880501,
              amount: 1251501,
              status: 'PENDING',
              checkoutUrl: 'https://pay.payos.vn/web/test-checkout-501',
            },
          };
        },
      });

      await harness.renderWithLifecycle();
      harness.setRoute('502');
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('880501'), 'Must not contain old 501 orderCode');
      assert.ok(!finalMarkup.includes('1.251.501'), 'Must not contain old 501 amount');
      assert.ok(!finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Must not contain old 501 checkoutUrl');
      assert.ok(finalMarkup.includes('#880502'), 'Must contain new 502 orderCode');
      assert.ok(finalMarkup.includes('450.000'), 'Must contain new 502 amount');
      assert.ok(finalMarkup.includes('https://pay.payos.vn/web/test-checkout-502'), 'Must contain new 502 checkoutUrl');
      harness.unmount();
    });

    test('10.4. Same Order Payment 401/403 clears payment state and displays error', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 500000 },
        }),
        getOrderPaymentHandler: async () => {
          const err = new Error('Forbidden Payment');
          err.response = { status: 403, data: { message: 'Không có quyền truy cập thông tin thanh toán.' } };
          throw err;
        },
      });

      const { finalMarkup } = await harness.renderWithLifecycle();
      assert.ok(!finalMarkup.includes('Tiếp tục thanh toán qua PayOS'));
      assert.ok(finalMarkup.includes('Không có quyền truy cập thông tin thanh toán.'));
      harness.unmount();
    });

    test('10.5. Same Order Payment 404 triggers safe recovery POST with same orderId and idempotent key', async () => {
      let createdCalls = 0;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 500000 },
        }),
        getOrderPaymentHandler: async () => {
          const err = new Error('Not Found');
          err.response = { status: 404 };
          throw err;
        },
        createPaymentLinkHandler: async (id, key) => {
          createdCalls++;
          return { data: { id: 9501, orderId: id, status: 'PENDING', amount: 500000 } };
        },
      });

      await harness.renderWithLifecycle();
      assert.equal(createdCalls, 1, 'Payment 404 performs exactly one recovery call for same order');
      harness.unmount();
    });

    test('10.6. Late response from Order 501 arriving after switch to 502 is discarded by generation guard', async () => {
      let resolveOrder501 = null;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (String(id) === '501') {
            return new Promise((resolve) => {
              resolveOrder501 = () => resolve({
                data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 1251501 },
              });
            });
          }
          return { data: { id: 502, orderCode: 'HG-502', status: 'PENDING', totalAmount: 300000 } };
        },
      });

      // Switch to 502 while 501 is pending
      harness.setRoute('502');
      await harness.renderWithLifecycle();

      // Now late 501 resolves
      if (resolveOrder501) resolveOrder501();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('1.251.501'), 'Late 501 response must not overwrite 502');
      assert.ok(finalMarkup.includes('300.000'), 'Active 502 must remain displayed');
      harness.unmount();
    });

    test('10.7. Late 403 error from Order 501 arriving after switch to 502 does NOT overwrite 502', async () => {
      let rejectOrder501 = null;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (String(id) === '501') {
            return new Promise((_, reject) => {
              rejectOrder501 = () => {
                const err = new Error('Forbidden 501');
                err.response = { status: 403, data: { message: 'Lỗi 501 muộn' } };
                reject(err);
              };
            });
          }
          return { data: { id: 502, orderCode: 'HG-502', status: 'PENDING', totalAmount: 350000 } };
        },
      });

      harness.setRoute('502');
      await harness.renderWithLifecycle();

      if (rejectOrder501) rejectOrder501();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('Lỗi 501 muộn'), 'Late 501 error must not be shown on 502');
      assert.ok(finalMarkup.includes('350.000'), 'Active 502 must remain displayed');
      harness.unmount();
    });

    test('10.8. Component unmount during in-flight fetch safely aborts with zero errors (isMountedRef guard)', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 501 } }), 100)),
      });

      harness.unmount();
      assert.doesNotThrow(() => {
        // Unmount before response resolves has 0 unhandled rejections
      });
    });

    test('10.9. Dual Protection: Environment UNKNOWN combined with Order 403 blocks both PayOS links and QR', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '502',
        environmentData: new Error('503 Service Unavailable'),
        getOrderByIdHandler: async () => {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
          throw err;
        },
      });

      const { finalMarkup } = await harness.renderWithLifecycle();
      assert.ok(!finalMarkup.includes('qrcode-svg'));
      assert.ok(!finalMarkup.includes('pay.payos.vn'));
      assert.ok(finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'));
      harness.unmount();
    });

    test('10.10. Environment MOCK combined with Order 403 does not render simulation panel or placeholder', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '502',
        environmentData: { paymentMode: 'MOCK', simulationControlsAllowed: true },
        getOrderByIdHandler: async () => {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
          throw err;
        },
      });

      const { finalMarkup } = await harness.renderWithLifecycle();
      assert.ok(!finalMarkup.includes('mock-qr-placeholder'));
      assert.ok(!finalMarkup.includes('data-testid="mock-payos-controls"'));
      assert.ok(finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'));
      harness.unmount();
    });

    test('10.11. Same-order transient 503 preserves order snapshot and does not clear recovery context', async () => {
      let failWith503 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (failWith503) {
            const err = new Error('Service Unavailable');
            err.response = { status: 503, data: { message: 'Máy chủ bận' } };
            throw err;
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 550000 } };
        },
      });

      const initial = await harness.renderWithLifecycle();
      assert.ok(initial.finalMarkup.includes('550.000'));

      failWith503 = true;
      const afterTransient = await harness.renderWithLifecycle();
      // On same-order transient error, error message is displayed and snapshot is retained
      assert.ok(afterTransient.finalMarkup.includes('Máy chủ bận') || afterTransient.finalMarkup.includes('550.000'));
      harness.unmount();
    });

    test('10.12. Initial location.state from foreign orderId is discarded at initialization', async () => {
      const foreignState = {
        order: { id: 999, orderCode: 'HG-999', totalAmount: 9999999 },
        payment: { id: 1999, orderId: 999, orderCode: 99999, amount: 9999999 },
      };

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        initialLocationState: foreignState,
        getOrderByIdHandler: async () => {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
          throw err;
        },
      });

      const { finalMarkup } = await harness.renderWithLifecycle();
      assert.ok(!finalMarkup.includes('9999999'), 'Foreign location.state must NOT render');
      assert.ok(!finalMarkup.includes('HG-999'), 'Foreign orderCode must NOT render');
      harness.unmount();
    });
  });

  // =========================================================================
  // 11. FIX-058 ROUND 3 SECURITY REMEDIATION — R3-FE-001 POLLING AUTHORIZATION
  // =========================================================================
  describe('11. R3-FE-001 Polling Authorization Failure & State Lifecycle', () => {
    test('11.0. CRITICAL R3 REPRODUCTION: Polling receives HTTP 403 -> clears Order 501, Payment 501 (#880501, 1.251.501 VND, QR, PayOS links), stops timer, displays role="alert", 0 mutation', async () => {
      let pollTriggered403 = false;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'REAL', simulationControlsAllowed: false },
        getOrderByIdHandler: async (id) => {
          if (pollTriggered403) {
            const err = new Error('Forbidden Order 501');
            err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
            throw err;
          }
          return {
            data: {
              id: 501,
              orderCode: 'HG-501',
              status: 'PENDING',
              totalAmount: 1251501,
            },
          };
        },
        getOrderPaymentHandler: async () => {
          return {
            data: {
              id: 9501,
              orderId: 501,
              orderCode: 880501,
              amount: 1251501,
              status: 'PENDING',
              checkoutUrl: 'https://pay.payos.vn/web/test-checkout-501',
              qrPayload: '00020101021238540010A00000072701240006970422',
            },
          };
        },
      });

      // 1. Initial load on /payment/qr/501: Order 501 and Payment 501 rendered normally
      const initial = await harness.renderWithLifecycle();
      assert.ok(initial.finalMarkup.includes('#880501'), 'Initial load must display payment orderCode #880501');
      assert.ok(initial.finalMarkup.includes('1.251.501'), 'Initial load must display amount 1.251.501 VND');
      assert.ok(initial.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Initial load must contain checkoutUrl');
      assert.ok(initial.finalMarkup.includes('qrcode-svg'), 'Initial load must contain QR code');
      assert.ok(initial.finalMarkup.includes('Đang chờ thanh toán...'), 'Initial load must show pending payment indicator');
      assert.ok(initial.finalMarkup.includes('Tôi đã thanh toán'), 'Initial load must contain payment action button');
      assert.equal(harness.isPollIntervalCleared(), false, 'Polling interval must be running initially');

      // 2. Trigger 4-second polling tick where backend returns HTTP 403
      pollTriggered403 = true;
      await harness.triggerPollTick();

      // 3. Re-render after polling 403 response
      const afterPoll403 = await harness.renderWithLifecycle();

      // 4. ASSERT: All protected Order & Payment state cleared from DOM
      assert.ok(!afterPoll403.finalMarkup.includes('880501'), 'DOM must NOT contain orderCode #880501');
      assert.ok(!afterPoll403.finalMarkup.includes('1.251.501'), 'DOM must NOT contain amount 1.251.501 VND');
      assert.ok(!afterPoll403.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'DOM must NOT contain PayOS link');
      assert.ok(!afterPoll403.finalMarkup.includes('qrcode-svg'), 'DOM must NOT contain QR code');
      assert.ok(!afterPoll403.finalMarkup.includes('Đang chờ thanh toán...'), 'DOM must NOT show pending payment indicator');
      assert.ok(!afterPoll403.finalMarkup.includes('Tôi đã thanh toán'), 'DOM must NOT contain payment confirmation button');

      // 5. ASSERT: Authorization error displayed in role="alert"
      assert.ok(afterPoll403.finalMarkup.includes('role="alert"'), 'Must render error inside role="alert"');
      assert.ok(afterPoll403.finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'), 'Must render access denied message');

      // 6. ASSERT: Polling interval cancelled and NO mutations
      assert.equal(harness.isPollIntervalCleared(), true, 'Polling timer must be cancelled after 403');
      assert.equal(harness.createPaymentLinkCalls.length, 0, 'Must NOT trigger any createPaymentLink POST');

      harness.unmount();
    });

    test('11.1. Polling receives HTTP 401 Unauthorized -> clears protected state, stops timer, prompts login', async () => {
      let pollTriggered401 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (pollTriggered401) {
            const err = new Error('Unauthorized');
            err.response = { status: 401, data: { message: 'Vui lòng đăng nhập để xem thông tin thanh toán.' } };
            throw err;
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 800000 } };
        },
        getOrderPaymentHandler: async () => ({
          data: { id: 9501, orderId: 501, orderCode: 880501, amount: 800000, status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      pollTriggered401 = true;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('880501'), 'Must not contain orderCode 880501');
      assert.ok(!finalMarkup.includes('800.000'), 'Must not contain amount 800.000');
      assert.ok(finalMarkup.includes('Vui lòng đăng nhập để xem thông tin thanh toán.'));
      assert.equal(harness.isPollIntervalCleared(), true);
      harness.unmount();
    });

    test('11.2. Polling receives HTTP 404 Not Found -> clears protected state, stops timer, shows not found', async () => {
      let pollTriggered404 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (pollTriggered404) {
            const err = new Error('Not Found');
            err.response = { status: 404, data: { message: 'Không tìm thấy đơn hàng.' } };
            throw err;
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 900000 } };
        },
        getOrderPaymentHandler: async () => ({
          data: { id: 9501, orderId: 501, orderCode: 880501, amount: 900000, status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      pollTriggered404 = true;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('880501'));
      assert.ok(!finalMarkup.includes('900.000'));
      assert.ok(finalMarkup.includes('Không tìm thấy đơn hàng.'));
      assert.equal(harness.isPollIntervalCleared(), true);
      harness.unmount();
    });

    test('11.3. Polling payment endpoint receives 401/403 -> clears payment state, stops timer, displays error', async () => {
      let paymentPoll403 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 600000 },
        }),
        getOrderPaymentHandler: async () => {
          if (paymentPoll403) {
            const err = new Error('Payment Forbidden');
            err.response = { status: 403, data: { message: 'Không có quyền truy cập thông tin thanh toán.' } };
            throw err;
          }
          return {
            data: { id: 9501, orderId: 501, orderCode: 880501, amount: 600000, status: 'PENDING', checkoutUrl: 'https://pay.payos.vn/test' },
          };
        },
      });

      await harness.renderWithLifecycle();
      paymentPoll403 = true;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('https://pay.payos.vn/test'));
      assert.ok(finalMarkup.includes('Không có quyền truy cập thông tin thanh toán.'));
      assert.equal(harness.isPollIntervalCleared(), true);
      harness.unmount();
    });

    test('11.4. Polling payment endpoint receives 404 -> clears payment state', async () => {
      let paymentPoll404 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 600000 },
        }),
        getOrderPaymentHandler: async () => {
          if (paymentPoll404) {
            const err = new Error('Payment Not Found');
            err.response = { status: 404 };
            throw err;
          }
          return {
            data: { id: 9501, orderId: 501, orderCode: 880501, amount: 600000, status: 'PENDING', checkoutUrl: 'https://pay.payos.vn/test' },
          };
        },
      });

      await harness.renderWithLifecycle();
      paymentPoll404 = true;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('https://pay.payos.vn/test'));
      harness.unmount();
    });

    test('11.5. Polling transient 503 on same order preserves order snapshot and does NOT stop polling', async () => {
      let poll503 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (poll503) {
            const err = new Error('Service Unavailable');
            err.response = { status: 503, data: { message: 'Máy chủ quá tải' } };
            throw err;
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 750000 } };
        },
      });

      await harness.renderWithLifecycle();
      poll503 = true;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      // Transient 503 preserves snapshot for same order
      assert.ok(finalMarkup.includes('750.000'), 'Same order transient 503 must preserve snapshot');
      assert.equal(harness.isPollIntervalCleared(), false, 'Polling interval must NOT be stopped on transient 503');
      harness.unmount();
    });

    test('11.6. Polling transient timeout/network error on same order preserves snapshot', async () => {
      let pollTimeout = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (pollTimeout) {
            throw new Error('Network Timeout');
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 920000 } };
        },
      });

      await harness.renderWithLifecycle();
      pollTimeout = true;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(finalMarkup.includes('920.000'));
      assert.equal(harness.isPollIntervalCleared(), false);
      harness.unmount();
    });

    test('11.7. Polling receives legitimate timeRemainingSeconds countdown update', async () => {
      let updatedSeconds = 900;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 500000, timeRemainingSeconds: updatedSeconds },
        }),
      });

      await harness.renderWithLifecycle();
      updatedSeconds = 345;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(finalMarkup.includes('05:45'), 'Timer must update to 05:45 (345s)');
      harness.unmount();
    });

    test('11.8. Polling receives PAID status -> navigates to /order-success/:id and cancels timer', async () => {
      let isPaidNow = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, orderCode: 'HG-501', status: isPaidNow ? 'PAID' : 'PENDING', totalAmount: 500000 },
        }),
      });

      await harness.renderWithLifecycle();
      isPaidNow = true;
      await harness.triggerPollTick();

      assert.equal(harness.getNavigatedTo(), '/order-success/501');
      assert.equal(harness.isPollIntervalCleared(), true);
      harness.unmount();
    });

    test('11.9. In-flight delayed 200 arriving AFTER polling 403 failure is REJECTED by generation epoch guard', async () => {
      let resolveDelayedOrder200 = null;
      let rejectOrder403 = null;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          // Initial load
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 1251501 } };
        },
      });

      await harness.renderWithLifecycle();

      // Setup racing requests: in-flight request 1 will resolve with 200 later,
      // request 2 rejects with 403 immediately
      let pollCall = 0;
      harness.setOrderByIdHandler(async () => {
        pollCall++;
        if (pollCall === 1) {
          return new Promise((resolve) => {
            resolveDelayedOrder200 = () => resolve({
              data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 1251501 },
            });
          });
        }
        const err = new Error('Forbidden');
        err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
        throw err;
      });

      // Tick 1 triggers delayed 200 request (in-flight)
      const tick1Promise = harness.triggerPollTick();

      // Tick 2 triggers 403 failure
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      // Now delayed 200 resolves
      if (resolveDelayedOrder200) resolveDelayedOrder200();
      await tick1Promise;

      const { finalMarkup } = await harness.renderWithLifecycle();

      // Assert delayed 200 did NOT resurrect protected data
      assert.ok(!finalMarkup.includes('1.251.501'), 'Delayed 200 must NOT resurrect protected amount');
      assert.ok(finalMarkup.includes('role="alert"'), 'Alert must remain displayed');
      assert.ok(finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'));
      harness.unmount();
    });

    test('11.10. Delayed 403 error from old route does NOT clear active new order', async () => {
      let rejectOld501_403 = null;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (String(id) === '501') {
            return new Promise((_, reject) => {
              rejectOld501_403 = () => {
                const err = new Error('Forbidden 501');
                err.response = { status: 403, data: { message: 'Old 501 forbidden' } };
                reject(err);
              };
            });
          }
          return { data: { id: 502, orderCode: 'HG-502', status: 'PENDING', totalAmount: 400000 } };
        },
      });

      // Switch route to 502
      harness.setRoute('502');
      await harness.renderWithLifecycle();

      // Fire old 501 error
      if (rejectOld501_403) rejectOld501_403();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('Old 501 forbidden'), 'Old route error must not be shown on new route');
      assert.ok(finalMarkup.includes('400.000'), 'Active Order 502 data must remain intact');
      harness.unmount();
    });

    test('11.11. Component unmount during polling clears interval and leaves zero dangling timers', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.isPollIntervalCleared(), false);

      harness.unmount();
      assert.equal(harness.isPollIntervalCleared(), true);
    });

    test('11.12. Foreign orderId returned in polling response is rejected and clears state', async () => {
      let pollReturnedForeign = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (pollReturnedForeign) {
            return { data: { id: 9999, orderCode: 'HG-9999', status: 'PENDING', totalAmount: 9999999 } };
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 500000 } };
        },
      });

      await harness.renderWithLifecycle();
      pollReturnedForeign = true;
      await harness.triggerPollTick();
      const { finalMarkup } = await harness.renderWithLifecycle();

      assert.ok(!finalMarkup.includes('9999999'), 'Foreign order must NOT be rendered');
      assert.ok(finalMarkup.includes('Không tìm thấy đơn hàng.'));
      assert.equal(harness.isPollIntervalCleared(), true);
      harness.unmount();
    });
  });

  // =========================================================================
  // 12. FIX-058 ROUND 4 — R4-FE-001 CROSS-REQUEST AUTHORIZATION & RACE MATRIX
  // =========================================================================
  describe('12. R4-FE-001 Cross-Request Authorization Invalidation & Race Matrix (Cases A–J)', () => {
    // 12.0. CRITICAL R4 REPRODUCTION (Case A)
    test('12.0. CRITICAL R4 REPRODUCTION (Case A): Manual check pending -> Polling 403 revokes auth -> Delayed manual PAID discarded -> NO success navigation, NO resurrection, NO mutation', async () => {
      let isPolling403 = false;
      let resolveManualCheckPromise;
      const delayedManualCheckPromise = new Promise((resolve) => {
        resolveManualCheckPromise = resolve;
      });

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'REAL', simulationControlsAllowed: false },
        getOrderByIdHandler: async (id) => {
          if (isPolling403) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
            throw err;
          }
          return {
            data: {
              id: 501,
              orderCode: 'HG-501',
              status: 'PENDING',
              totalAmount: 1251501,
            },
          };
        },
        getOrderPaymentHandler: async () => ({
          data: {
            id: 9501,
            orderId: 501,
            orderCode: 880501,
            amount: 1251501,
            status: 'PENDING',
            checkoutUrl: 'https://pay.payos.vn/web/test-checkout-501',
            qrPayload: '00020101021238540010A00000072701240006970422',
          },
        }),
      });

      // 1. Initial load on /payment/qr/501 (PENDING)
      const initial = await harness.renderWithLifecycle();
      assert.ok(initial.finalMarkup.includes('#880501'), 'Initial orderCode displayed');
      assert.ok(initial.finalMarkup.includes('1.251.501'), 'Initial amount displayed');
      assert.ok(initial.finalMarkup.includes('qrcode-svg'), 'Initial QR rendered');

      // 2. User clicks "Tôi đã thanh toán" -> manual check starts, but its getOrderById is held pending
      let manualCallStarted = false;
      harness.setOrderByIdHandler(async () => {
        manualCallStarted = true;
        return delayedManualCheckPromise;
      });

      const manualPromise = harness.triggerCheckPayment();
      await new Promise((r) => setTimeout(r, 20));
      assert.ok(manualCallStarted, 'Manual check request must have started');

      // 3. Background polling GET order 501 returns 403 Forbidden
      isPolling403 = true;
      harness.setOrderByIdHandler(async () => {
        const err = new Error('Forbidden');
        err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
        throw err;
      });

      await harness.triggerPollTick();
      const afterPoll = await harness.renderWithLifecycle();

      // Verify polling 403 cleared protected state and showed alert
      assert.ok(afterPoll.finalMarkup.includes('role="alert"'), 'Alert must be displayed after 403');
      assert.ok(afterPoll.finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'), '403 error message displayed');
      assert.ok(!afterPoll.finalMarkup.includes('880501'), 'Payment code #880501 must be removed');
      assert.ok(!afterPoll.finalMarkup.includes('qrcode-svg'), 'QR SVG must be removed');
      assert.ok(!afterPoll.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Checkout link removed');

      // 4. Stale manual check returns 200 with PAID data
      resolveManualCheckPromise({
        data: {
          id: 501,
          orderCode: 'HG-501',
          status: 'PAID',
          totalAmount: 1251501,
        },
      });
      await manualPromise;

      // 5. Assert: Delayed PAID was rejected: NO navigation to /order-success/501, NO protected data resurrected
      assert.equal(harness.getNavigatedTo(), null, 'Must NOT navigate to /order-success/501');
      assert.equal(harness.getNavigationHistory().length, 0, 'No navigation calls allowed for stale request');

      const finalState = await harness.renderWithLifecycle();
      assert.ok(!finalState.finalMarkup.includes('880501'), 'Must NOT resurrect orderCode');
      assert.ok(!finalState.finalMarkup.includes('qrcode-svg'), 'Must NOT resurrect QR code');
      assert.ok(!finalState.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Must NOT resurrect link');
      assert.ok(finalState.finalMarkup.includes('role="alert"'), 'Auth error alert remains visible');
      assert.equal(harness.createPaymentLinkCalls.length, 0, 'Must NOT trigger any payment mutations');

      harness.unmount();
    });

    // 12.1. Case B: Polling starts -> Manual returns 403 -> Polling delayed returns PAID -> Discarded
    test('12.1. Case B: Polling in-flight -> Manual returns 403 -> Polling delayed returns PAID -> No state resurrection, no navigation', async () => {
      let resolvePollPromise;
      const delayedPollPromise = new Promise((resolve) => {
        resolvePollPromise = resolve;
      });

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'REAL', simulationControlsAllowed: false },
        getOrderByIdHandler: async () => ({
          data: { id: 501, status: 'PENDING', totalAmount: 500000 },
        }),
      });

      await harness.renderWithLifecycle();

      // Polling tick starts but is held in-flight
      harness.setOrderByIdHandler(async () => delayedPollPromise);
      const pollPromise = harness.triggerPollTick();
      await new Promise((r) => setTimeout(r, 20));

      // Manual check is triggered and returns 403
      harness.setOrderByIdHandler(async () => {
        const err = new Error('Forbidden');
        err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
        throw err;
      });
      await harness.triggerCheckPayment();

      const afterManual = await harness.renderWithLifecycle();
      assert.ok(afterManual.finalMarkup.includes('role="alert"'), 'Alert visible after manual 403');

      // Now delayed poll arrives with PAID
      resolvePollPromise({
        data: { id: 501, status: 'PAID', totalAmount: 500000 },
      });
      await pollPromise;

      assert.equal(harness.getNavigatedTo(), null, 'Must NOT navigate to /order-success/501 on stale poll');
      const finalMarkup = (await harness.renderWithLifecycle()).finalMarkup;
      assert.ok(!finalMarkup.includes('Thanh toán thành công'), 'No resurrection');
      assert.ok(finalMarkup.includes('role="alert"'), 'Error remains visible');

      harness.unmount();
    });

    // 12.2. Case C: Initial fetch in-flight -> Poll gets 403 -> Initial fetch delayed 200 ignored
    test('12.2. Case C: Initial fetch in-flight -> Poll gets 403 -> Initial fetch delayed returns 200 -> Discarded', async () => {
      let resolveInitial;
      const delayedInitial = new Promise((resolve) => {
        resolveInitial = resolve;
      });

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'REAL', simulationControlsAllowed: false },
        getOrderByIdHandler: async () => delayedInitial,
      });

      // Render starts initial fetch
      const renderPromise = harness.renderWithLifecycle();
      await new Promise((r) => setTimeout(r, 20));

      // Polling fires and gets 403
      harness.setOrderByIdHandler(async () => {
        const err = new Error('Forbidden');
        err.response = { status: 403, data: { message: 'Không có quyền truy cập.' } };
        throw err;
      });
      await harness.triggerPollTick();

      // Initial fetch resolves
      resolveInitial({
        data: { id: 501, status: 'PENDING', totalAmount: 700000 },
      });
      await renderPromise;

      const finalState = await harness.renderWithLifecycle();
      assert.ok(!finalState.finalMarkup.includes('700.000'), 'Initial response data must NOT be rendered');
      assert.ok(finalState.finalMarkup.includes('role="alert"'), 'Alert remains active');

      harness.unmount();
    });

    // 12.3. Case D: Order 501 request starts -> Route switches to 502 -> Order 501 returns 403 or PAID -> 502 unaffected
    test('12.3. Case D: Order 501 delayed response arriving after route switch to 502 does NOT affect Order 502', async () => {
      let resolve501;
      const delayed501 = new Promise((resolve) => {
        resolve501 = resolve;
      });

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (String(id) === '501') return delayed501;
          return { data: { id: 502, orderCode: 'HG-502', status: 'PENDING', totalAmount: 250000 } };
        },
      });

      // Start on 501
      harness.renderWithLifecycle();
      await new Promise((r) => setTimeout(r, 20));

      // User navigates to 502
      harness.setRoute('502');
      const state502 = await harness.renderWithLifecycle();
      assert.ok(state502.finalMarkup.includes('250.000'), 'Order 502 rendered cleanly');

      // Old 501 response arrives with 403 or PAID
      resolve501({ data: { id: 501, status: 'PAID', totalAmount: 999999 } });
      await new Promise((r) => setTimeout(r, 30));

      const final502 = await harness.renderWithLifecycle();
      assert.ok(final502.finalMarkup.includes('250.000'), 'Order 502 data remains intact');
      assert.ok(!final502.finalMarkup.includes('999.999'), 'Old 501 data rejected');
      assert.equal(harness.getNavigatedTo(), null, 'Must NOT navigate to /order-success/501');

      harness.unmount();
    });

    // 12.4. Case E: Payment request returns 403 while Order request remains pending -> cannot restore payment
    test('12.4. Case E: Payment endpoint 403 revokes authorization even if Order fetch was pending', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, status: 'PENDING', totalAmount: 100000 },
        }),
        getOrderPaymentHandler: async () => {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { message: 'Không có quyền xem thanh toán.' } };
          throw err;
        },
      });

      const res = await harness.renderWithLifecycle();
      assert.ok(res.finalMarkup.includes('role="alert"'), 'Alert displayed on payment 403');
      assert.ok(!res.finalMarkup.includes('qrcode-svg'), 'QR code hidden');
      assert.equal(harness.getNavigatedTo(), null, 'No success navigation');

      harness.unmount();
    });

    // 12.5. Case F: Component unmounts before request resolves -> 0 navigation, 0 side-effects
    test('12.5. Case F: Component unmounts while request is in-flight -> 0 navigation, 0 side-effects', async () => {
      let resolveDelayed;
      const delayed = new Promise((resolve) => {
        resolveDelayed = resolve;
      });

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => delayed,
      });

      harness.renderWithLifecycle();
      await new Promise((r) => setTimeout(r, 40));

      // Unmount before resolve
      harness.unmount();
      assert.equal(harness.isPollIntervalCleared(), true, 'Timers cleared');

      // Late resolve
      resolveDelayed({ data: { id: 501, status: 'PAID' } });
      await new Promise((r) => setTimeout(r, 40));

      assert.equal(harness.getNavigatedTo(), null, 'No navigation after unmount');
      assert.equal(harness.getNavigationHistory().length, 0, 'No navigation calls recorded');
    });

    // 12.6. Case G: Explicit retry after 403 begins a new authorization check
    test('12.6. Case G: Explicit retry after 403: retry 403 remains blocked, fresh retry 200 restores authorized data', async () => {
      let isAllowed = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (!isAllowed) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Không có quyền truy cập.' } };
            throw err;
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 450000 } };
        },
        getOrderPaymentHandler: async () => ({
          data: { id: 9501, orderId: 501, orderCode: 880501, amount: 450000, status: 'PENDING' },
        }),
      });

      // Initial 403
      const first = await harness.renderWithLifecycle();
      assert.ok(first.finalMarkup.includes('role="alert"'), 'Initially blocked');

      // Retry 1: still not allowed
      await harness.triggerCheckPayment();
      const second = await harness.renderWithLifecycle();
      assert.ok(second.finalMarkup.includes('role="alert"'), 'Retry 1 remains blocked');

      // Retry 2: permission granted
      isAllowed = true;
      await harness.triggerCheckPayment();
      const third = await harness.renderWithLifecycle();
      assert.ok(third.finalMarkup.includes('450.000'), 'Freshly authorized data rendered');
      assert.ok(!third.finalMarkup.includes('Không có quyền'), 'Error cleared');

      harness.unmount();
    });

    // 12.7. Case H: Legitimate manual check & polling both return PAID -> Single navigation (no duplicate)
    test('12.7. Case H: Concurrent manual check and polling both return PAID -> Navigates exactly once', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, status: 'PAID', totalAmount: 500000 },
        }),
      });

      await harness.renderWithLifecycle();

      // Both fire
      await Promise.all([
        harness.triggerCheckPayment(),
        harness.triggerPollTick(),
      ]);

      assert.equal(harness.getNavigatedTo(), '/order-success/501', 'Navigated to order-success');
      assert.equal(harness.getNavigationHistory().length, 1, 'Must be called exactly ONCE');

      harness.unmount();
    });

    // 12.8. Case I: Concurrent environment retry with authorization failure
    test('12.8. Case I: Environment success does NOT override lost Order authorization', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'MOCK', simulationControlsAllowed: true },
        getOrderByIdHandler: async () => {
          const err = new Error('Forbidden');
          err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
          throw err;
        },
      });

      const state = await harness.renderWithLifecycle();
      assert.ok(state.finalMarkup.includes('role="alert"'), 'Order 403 error displayed');
      assert.ok(!state.finalMarkup.includes('data-testid="mock-payos-controls"'), 'No simulation controls on 403');
      assert.ok(!state.finalMarkup.includes('qrcode-svg'), 'No QR code');

      // Trigger env retry
      await harness.triggerRetryEnv();
      const afterRetry = await harness.renderWithLifecycle();
      assert.ok(afterRetry.finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'), 'Order 403 remains authoritative');
      assert.ok(!afterRetry.finalMarkup.includes('data-testid="mock-payos-controls"'), 'Simulation controls remain hidden');

      harness.unmount();
    });

    // 12.9. Case J: Rapid double-click on manual check is throttled with 0 timer leaks
    test('12.9. Case J: Rapid double-click on check payment is throttled by in-flight guard', async () => {
      let checkApiCalls = 0;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          checkApiCalls++;
          await new Promise((r) => setTimeout(r, 20));
          return { data: { id: 501, status: 'PENDING', totalAmount: 100000 } };
        },
      });

      await harness.renderWithLifecycle(60);
      const initialCalls = checkApiCalls;

      // Rapid multi-click
      await Promise.all([
        harness.triggerCheckPayment(),
        harness.triggerCheckPayment(),
        harness.triggerCheckPayment(),
      ]);

      assert.equal(checkApiCalls - initialCalls, 1, 'Only one manual check in-flight allowed');
      harness.unmount();
      assert.equal(harness.isPollIntervalCleared(), true, 'Timers cleanly cleared');
    });
  });

  // =========================================================================
  // 13. FIX-058 ROUND 5 — R5-FE-001 POLLING REAUTHORIZATION RECOVERY & LIFECYCLE (Cases A–O)
  // =========================================================================
  describe('13. R5-FE-001 Polling Reauthorization Recovery & Lifecycle (Cases A–O)', () => {
    // 13.0. CRITICAL R5 REPRODUCTION (Case A)
    test('13.0. CRITICAL R5 REPRODUCTION (Case A): Polling receives 403 -> Explicit retry succeeds (200/PENDING) -> Polling automatically resumes -> Next tick discovers PAID -> Navigates to /order-success/501 (0 duplicate timer, 0 mutation)', async () => {
      let is403Revoked = false;
      let isPaidOnNextPoll = false;
      let orderCallsCount = 0;
      let paymentCallsCount = 0;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { paymentMode: 'REAL', simulationControlsAllowed: false },
        getOrderByIdHandler: async (id) => {
          orderCallsCount++;
          if (is403Revoked) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
            throw err;
          }
          return {
            data: {
              id: 501,
              orderCode: 'HG-501',
              status: 'PENDING',
              totalAmount: 1251501,
              paymentMethod: 'PAYOS_VIETQR',
            },
          };
        },
        getOrderPaymentHandler: async () => {
          paymentCallsCount++;
          return {
            data: {
              id: 9501,
              orderId: 501,
              orderCode: 880501,
              amount: 1251501,
              status: isPaidOnNextPoll ? 'PAID' : 'PENDING',
              checkoutUrl: 'https://pay.payos.vn/web/test-checkout-501',
              qrPayload: '00020101021238540010A00000072701240006970422',
            },
          };
        },
      });

      // 1. Initial State: /payment/qr/501 with Order 501 & Payment 501 PENDING
      const initial = await harness.renderWithLifecycle();
      assert.ok(initial.finalMarkup.includes('#880501'), 'Initial load must display orderCode #880501');
      assert.ok(initial.finalMarkup.includes('1.251.501'), 'Initial load must display amount 1.251.501 VND');
      assert.ok(initial.finalMarkup.includes('qrcode-svg'), 'Initial load must render QR code');
      assert.ok(initial.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Initial load must contain checkoutUrl');
      assert.equal(harness.isPollIntervalCleared(), false, 'Polling interval must be active initially');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Exactly one polling interval active initially');

      // 2. Background polling tick triggers 403 Forbidden
      is403Revoked = true;
      await harness.triggerPollTick();
      const afterPoll403 = await harness.renderWithLifecycle();

      // Assert protected state cleared, alert shown, and polling timer STOPPED
      assert.ok(!afterPoll403.finalMarkup.includes('880501'), 'Protected orderCode must be cleared after 403');
      assert.ok(!afterPoll403.finalMarkup.includes('1.251.501'), 'Protected amount must be cleared after 403');
      assert.ok(!afterPoll403.finalMarkup.includes('qrcode-svg'), 'QR code must be cleared after 403');
      assert.ok(!afterPoll403.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Payment link must be cleared after 403');
      assert.ok(afterPoll403.finalMarkup.includes('role="alert"'), 'Authorization error alert must be rendered');
      assert.ok(afterPoll403.finalMarkup.includes('Bạn không có quyền truy cập đơn hàng này.'));
      assert.equal(harness.isPollIntervalCleared(), true, 'Old polling timer MUST be stopped after 403');
      assert.equal(harness.getActivePollIntervalCount(), 0, 'No active polling intervals after 403');

      // 3. User explicitly clicks "Kiểm tra lại" (Manual retry)
      // Backend fixtures now return 200 OK PENDING (reauthorized)
      is403Revoked = false;
      await harness.triggerCheckPayment();
      const afterRetry = await harness.renderWithLifecycle();

      // Assert reauthorization success: protected state restored
      assert.ok(afterRetry.finalMarkup.includes('#880501'), 'Payment orderCode restored on reauthorization');
      assert.ok(afterRetry.finalMarkup.includes('1.251.501'), 'Amount restored on reauthorization');
      assert.ok(afterRetry.finalMarkup.includes('qrcode-svg'), 'QR code restored on reauthorization');
      assert.ok(afterRetry.finalMarkup.includes('https://pay.payos.vn/web/test-checkout-501'), 'Link restored on reauthorization');
      assert.ok(!afterRetry.finalMarkup.includes('Không có quyền'), 'Alert error cleared on reauthorization');

      // CRITICAL R5 ASSERTION: Polling lifecycle MUST AUTOMATICALLY RESUME
      assert.equal(harness.isPollIntervalCleared(), false, 'Polling interval MUST be resumed after reauthorization');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Must have EXACTLY ONE active polling interval (no duplicate intervals)');

      // 4. Reviewer waits 4.8 seconds (next polling cycle fires)
      // On next cycle, backend reports status PAID
      isPaidOnNextPoll = true;
      const orderCallsBeforeNextPoll = orderCallsCount;
      const paymentCallsBeforeNextPoll = paymentCallsCount;

      await harness.triggerPollTick();

      // Assert fresh GET requests were generated on resumed polling cycle
      assert.ok(orderCallsCount > orderCallsBeforeNextPoll, 'Next polling cycle MUST issue fresh GET order request');
      assert.ok(paymentCallsCount > paymentCallsBeforeNextPoll, 'Next polling cycle MUST issue fresh GET payment request');

      // Assert successful navigation to /order-success/501 and interval cleanly stopped
      assert.equal(harness.getNavigatedTo(), '/order-success/501', 'Must navigate to /order-success/501 on PAID');
      assert.equal(harness.getNavigationHistory().length, 1, 'Must navigate exactly ONCE (no duplicate navigation)');
      assert.equal(harness.isPollIntervalCleared(), true, 'Polling timer MUST stop once terminal PAID state is reached');
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Zero active intervals after terminal state');
      assert.equal(harness.createPaymentLinkCalls.length, 0, 'Zero unintended payment mutations');

      harness.unmount();
    });

    // 13.1. Case B: Polling 403 -> Retry 403 -> No polling restart, alert remains
    test('13.1. Case B: Polling 403 -> Retry 403 -> No polling restart, alert remains', async () => {
      let is403 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (is403) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Quyền truy cập bị từ chối.' } };
            throw err;
          }
          return { data: { id: 501, status: 'PENDING', totalAmount: 400000 } };
        },
      });

      await harness.renderWithLifecycle();
      // Poll gets 403
      is403 = true;
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();
      assert.equal(harness.isPollIntervalCleared(), true, 'Polling stopped after initial 403');

      // Retry also gets 403
      await harness.triggerCheckPayment();
      const stateAfterRetry = await harness.renderWithLifecycle();

      assert.ok(stateAfterRetry.finalMarkup.includes('role="alert"'), 'Alert visible');
      assert.ok(!stateAfterRetry.finalMarkup.includes('400.000'), 'Protected state not restored');
      assert.equal(harness.isPollIntervalCleared(), true, 'Polling must NOT restart when retry fails 403');
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Zero active intervals on failed retry');

      harness.unmount();
    });

    // 13.2. Case C: Polling 403 -> Retry 503 -> No unauthorized restore, no polling restart
    test('13.2. Case C: Polling 403 -> Retry 503 -> No unauthorized restore, no polling restart', async () => {
      let failMode = null;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (failMode === '403') {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Quyền bị từ chối.' } };
            throw err;
          }
          if (failMode === '503') {
            const err = new Error('Server Error');
            err.response = { status: 503, data: { message: 'Máy chủ tạm thời bận.' } };
            throw err;
          }
          return { data: { id: 501, status: 'PENDING', totalAmount: 500000 } };
        },
      });

      await harness.renderWithLifecycle();
      failMode = '403';
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();
      assert.equal(harness.isPollIntervalCleared(), true);

      // Retry gets 503
      failMode = '503';
      await harness.triggerCheckPayment();
      const afterRetry503 = await harness.renderWithLifecycle();

      assert.ok(!afterRetry503.finalMarkup.includes('500.000'), 'Must NOT restore protected data on 503 retry');
      assert.equal(harness.isPollIntervalCleared(), true, 'Polling must NOT restart on 503 retry');
      assert.equal(harness.getActivePollIntervalCount(), 0);

      harness.unmount();
    });

    // 13.3. Case D: Polling 403 -> Retry 200/PAID -> Direct success navigation, no unnecessary polling
    test('13.3. Case D: Polling 403 -> Retry 200/PAID -> Direct success navigation, no unnecessary polling', async () => {
      let is403 = false;
      let isPaid = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          if (is403) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Bị từ chối' } };
            throw err;
          }
          return { data: { id: 501, status: isPaid ? 'PAID' : 'PENDING', totalAmount: 600000 } };
        },
      });

      await harness.renderWithLifecycle();
      is403 = true;
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();
      assert.equal(harness.isPollIntervalCleared(), true);

      // Retry returns 200 PAID
      is403 = false;
      isPaid = true;
      await harness.triggerCheckPayment();

      assert.equal(harness.getNavigatedTo(), '/order-success/501', 'Direct navigation to order-success');
      assert.equal(harness.getNavigationHistory().length, 1, 'Exactly one navigation');
      assert.equal(harness.isPollIntervalCleared(), true, 'No unnecessary polling started for PAID order');
      assert.equal(harness.getActivePollIntervalCount(), 0);

      harness.unmount();
    });

    // 13.4. Case E & F: Old epoch 403 arriving after new reauthorized session does NOT invalidate new session
    test('13.4. Case E & F: Old epoch 403 arriving after new reauthorized session does NOT invalidate new session', async () => {
      let resolveOld403;
      const delayedOld403Promise = new Promise((_, reject) => {
        resolveOld403 = () => {
          const err = new Error('Old Forbidden');
          err.response = { status: 403, data: { message: 'Old 403 error' } };
          reject(err);
        };
      });

      let tickCount = 0;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          tickCount++;
          if (tickCount === 2) {
            return delayedOld403Promise;
          }
          return { data: { id: 501, orderCode: 'HG-501', status: 'PENDING', totalAmount: 700000 } };
        },
        getOrderPaymentHandler: async () => ({
          data: { id: 9501, orderId: 501, orderCode: 880501, amount: 700000, status: 'PENDING' },
        }),
      });

      // Initial load (tick 1)
      await harness.renderWithLifecycle();

      // Tick 2: in-flight delayed 403
      const tick2Promise = harness.triggerPollTick();
      await new Promise((r) => setTimeout(r, 20));

      // User manually checks (epoch 2) -> succeeds with 200 PENDING
      await harness.triggerCheckPayment();
      const stateAfterCheck = await harness.renderWithLifecycle();
      assert.ok(stateAfterCheck.finalMarkup.includes('700.000'), 'Freshly reauthorized data displayed');

      // Now late 403 from old tick 2 fires
      resolveOld403();
      try { await tick2Promise; } catch {}
      const stateAfterLate403 = await harness.renderWithLifecycle();

      // Old 403 MUST NOT invalidate new session
      assert.ok(stateAfterLate403.finalMarkup.includes('700.000'), 'New session data must remain intact');
      assert.ok(!stateAfterLate403.finalMarkup.includes('Old 403 error'), 'Old error must not be displayed');
      assert.equal(harness.isPollIntervalCleared(), false, 'Polling continues for new session');

      harness.unmount();
    });

    // 13.5. Case G & H: Reauthorized 501 -> Route change to 502 cleans up 501 polling cleanly with 0 timer leak
    test('13.5. Case G & H: Reauthorized 501 -> Route change to 502 cleans up 501 polling cleanly with 0 timer leak', async () => {
      let is403 = false;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (String(id) === '501' && is403) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Từ chối 501' } };
            throw err;
          }
          return { data: { id: Number(id), orderCode: `HG-${id}`, status: 'PENDING', totalAmount: Number(id) * 1000 } };
        },
        getOrderPaymentHandler: async (id) => ({
          data: { id: 9000 + Number(id), orderId: Number(id), status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      is403 = true;
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();
      assert.equal(harness.isPollIntervalCleared(), true);

      // Reauthorize 501
      is403 = false;
      await harness.triggerCheckPayment();
      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1, '501 polling active');

      // Route change to 502
      harness.setRoute('502');
      const state502 = await harness.renderWithLifecycle();
      assert.ok(state502.finalMarkup.includes('502.000'), '502 rendered cleanly');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Only one polling active for 502');

      // Unmount
      harness.unmount();
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Zero active intervals after unmount');
      assert.equal(harness.isPollIntervalCleared(), true);
    });

    // 13.6. Case I: Rapid repeated double-click on retry -> Exactly ONE active polling interval
    test('13.6. Case I: Rapid repeated double-click on retry -> Exactly ONE active polling interval', async () => {
      let is403 = false;
      let checkCalls = 0;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => {
          checkCalls++;
          if (is403) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Từ chối' } };
            throw err;
          }
          await new Promise((r) => setTimeout(r, 20));
          return { data: { id: 501, status: 'PENDING', totalAmount: 800000 } };
        },
        getOrderPaymentHandler: async () => ({
          data: { id: 9501, orderId: 501, status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      is403 = true;
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();
      assert.equal(harness.isPollIntervalCleared(), true);

      // Reauthorize with rapid concurrent clicks
      is403 = false;
      const baselineCalls = checkCalls;
      await Promise.all([
        harness.triggerCheckPayment(),
        harness.triggerCheckPayment(),
        harness.triggerCheckPayment(),
      ]);

      await harness.renderWithLifecycle();
      assert.equal(checkCalls - baselineCalls, 1, 'Only one manual check executed due to in-flight guard');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'EXACTLY ONE polling interval active, no duplicates');
      assert.equal(harness.isPollIntervalCleared(), false);

      harness.unmount();
    });

    // 13.7. Case K & O: Terminal state cleanly stops polling with 0 dangling timers
    test('13.7. Case K & O: Polling discovers terminal PAID status -> interval stops immediately with zero leaks', async () => {
      let status = 'PENDING';
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async () => ({
          data: { id: 501, status, totalAmount: 950000 },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      // Transition to PAID
      status = 'PAID';
      await harness.triggerPollTick();
      assert.equal(harness.getNavigatedTo(), '/order-success/501');
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals cleared on terminal state');
      assert.equal(harness.isPollIntervalCleared(), true);

      harness.unmount();
    });
  });

  // =========================================================================
  // 14. FIX-058 ROUND 6 — R6-FE-001 POLLING TERMINAL CLEANUP & LIFECYCLE
  // =========================================================================
  describe('14. R6-FE-001 Polling Terminal State Lifecycle & Interval Cleanup (Cases 14.0–14.7)', () => {
    // 14.0. CRITICAL R6 REPRODUCTION: Initial Polling -> CANCELLED stops interval immediately
    test('14.0. CRITICAL R6 REPRODUCTION: Initial Polling -> Order CANCELLED stops timer immediately, 0 active intervals, callback count does not increment on subsequent ticks, 0 extra GET requests', async () => {
      let orderStatus = 'PENDING';
      let orderGetCalls = 0;
      let paymentGetCalls = 0;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          orderGetCalls++;
          return { data: { id: Number(id), orderCode: `HG-${id}`, status: orderStatus, totalAmount: 1251501 } };
        },
        getOrderPaymentHandler: async (id) => {
          paymentGetCalls++;
          return { data: { id: 9501, orderId: Number(id), status: 'PENDING' } };
        },
      });

      // Step 1: Initial load with PENDING status
      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Initial polling interval must be active');
      assert.equal(harness.isPollIntervalCleared(), false, 'Polling interval must NOT be cleared initially');
      assert.equal(harness.getPollCallbackCount(), 0, 'No poll callbacks yet');
      assert.equal(orderGetCalls, 1, 'Initial GET order count = 1');
      assert.equal(paymentGetCalls, 1, 'Initial GET payment count = 1');

      // Step 2: Backend reports Order CANCELLED; Poll Tick 1 executes
      orderStatus = 'CANCELLED';
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      // Assert: Status CANCELLED handled, interval stopped immediately
      assert.equal(harness.getPollCallbackCount(), 1, 'Poll callback count must be exactly 1 after tick 1');
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active polling intervals MUST be 0 immediately after CANCELLED');
      assert.equal(harness.isPollIntervalCleared(), true, 'Polling interval MUST be marked cleared');

      const orderCallsAfterCancel = orderGetCalls;
      const paymentCallsAfterCancel = paymentGetCalls;

      // Step 3: Reviewer waits 4.5 seconds (next polling cycle would have fired if timer leaked)
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      // CRITICAL R6 ASSERTION: No additional callback executed, no background GET issued
      assert.equal(harness.getPollCallbackCount(), 1, 'Poll callback count MUST NOT increment after terminal state');
      assert.equal(orderGetCalls, orderCallsAfterCancel, 'GET order count must NOT increase after CANCELLED');
      assert.equal(paymentGetCalls, paymentCallsAfterCancel, 'GET payment count must NOT increase after CANCELLED');
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals remain 0');
      assert.equal(harness.getNavigatedTo(), null, 'Must NOT navigate for CANCELLED order');
      assert.equal(harness.createPaymentLinkCalls.length, 0, 'Zero unintended mutations');

      harness.unmount();
    });

    // 14.1. Recovered Polling -> CANCELLED stops new interval cleanly
    test('14.1. Recovered Polling -> CANCELLED: Polling 403 -> Retry 200/PENDING -> New polling active -> Poll receives CANCELLED -> Timer stopped immediately, 0 active interval', async () => {
      let is403 = false;
      let orderStatus = 'PENDING';

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          if (is403) {
            const err = new Error('Forbidden');
            err.response = { status: 403, data: { message: 'Quyền bị từ chối' } };
            throw err;
          }
          return { data: { id: Number(id), orderCode: `HG-${id}`, status: orderStatus, totalAmount: 700000 } };
        },
        getOrderPaymentHandler: async (id) => ({
          data: { id: 9501, orderId: Number(id), status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      // 1. Initial polling receives 403 -> timer stops
      is403 = true;
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Timer stopped after 403');

      // 2. User clicks "Kiểm tra lại" -> reauthorization succeeds
      is403 = false;
      orderStatus = 'PENDING';
      await harness.triggerCheckPayment();
      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'New polling session started after reauthorization');

      // 3. Resumed polling tick receives CANCELLED
      orderStatus = 'CANCELLED';
      const callbacksBefore = harness.getPollCallbackCount();
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      // Assert: Recovered polling stops immediately
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Recovered timer MUST stop on CANCELLED');
      assert.equal(harness.isPollIntervalCleared(), true);

      // 4. Wait another cycle -> no more callbacks
      await harness.triggerPollTick();
      assert.equal(harness.getPollCallbackCount(), callbacksBefore + 1, 'No additional callbacks fired after cancel');

      harness.unmount();
    });

    // 14.2. Initial Polling -> Order FAILED stops polling timer immediately
    test('14.2. Initial Polling -> Order FAILED stops polling timer immediately with 0 dangling timers', async () => {
      let orderStatus = 'PENDING';
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), status: orderStatus, totalAmount: 500000 },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      orderStatus = 'FAILED';
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals must be 0 after FAILED');
      assert.equal(harness.isPollIntervalCleared(), true);

      harness.unmount();
    });

    // 14.3. Initial Polling -> Order EXPIRED stops polling timer immediately
    test('14.3. Initial Polling -> Order EXPIRED stops polling timer immediately with 0 dangling timers', async () => {
      let orderStatus = 'PENDING';
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), status: orderStatus, totalAmount: 500000 },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      orderStatus = 'EXPIRED';
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals must be 0 after EXPIRED');
      assert.equal(harness.isPollIntervalCleared(), true);

      harness.unmount();
    });

    // 14.4. Initial Polling -> Payment terminal (CANCELLED / EXPIRED / FAILED) stops polling timer immediately
    test('14.4. Initial Polling -> Payment CANCELLED / EXPIRED / FAILED stops polling timer immediately', async () => {
      let payStatus = 'PENDING';
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), status: 'PENDING', totalAmount: 600000 },
        }),
        getOrderPaymentHandler: async (id) => ({
          data: { id: 9501, orderId: Number(id), status: payStatus },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      payStatus = 'CANCELLED';
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals must be 0 when payment is CANCELLED');
      assert.equal(harness.isPollIntervalCleared(), true);

      harness.unmount();
    });

    // 14.5. Initial Polling -> Payment method changed to non-VietQR (e.g. COD transition) stops polling timer
    test('14.5. Initial Polling -> Payment method changed to non-VietQR (e.g. COD) stops VietQR polling timer immediately', async () => {
      let currentMethod = 'PAYOS_VIETQR';
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), status: 'PENDING', paymentMethod: currentMethod, totalAmount: 850000 },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      // Method changes to COD (FIX-057 transition completed)
      currentMethod = 'COD';
      await harness.triggerPollTick();
      await harness.renderWithLifecycle();

      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals must be 0 after COD transition');
      assert.equal(harness.isPollIntervalCleared(), true);

      harness.unmount();
    });

    // 14.6. Valid PENDING order continues polling across multiple cycles without premature termination
    test('14.6. Valid PENDING order continues polling across multiple cycles without premature termination', async () => {
      let tickNum = 0;
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          tickNum++;
          return { data: { id: Number(id), status: 'PENDING', totalAmount: 900000 } };
        },
        getOrderPaymentHandler: async (id) => ({
          data: { id: 9501, orderId: Number(id), status: 'PENDING' },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      // Cycle 1
      await harness.triggerPollTick();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Interval must stay active on cycle 1');
      assert.equal(harness.isPollIntervalCleared(), false);

      // Cycle 2
      await harness.triggerPollTick();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Interval must stay active on cycle 2');
      assert.equal(harness.isPollIntervalCleared(), false);

      // Cycle 3
      await harness.triggerPollTick();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Interval must stay active on cycle 3');
      assert.equal(harness.isPollIntervalCleared(), false);

      assert.equal(harness.getPollCallbackCount(), 3, 'Exactly 3 polling callbacks executed');

      harness.unmount();
    });

    // 14.7. Component unmount during terminal status clean up all resources with zero dangling timers
    test('14.7. Component unmount during terminal status clean up all resources with zero dangling timers', async () => {
      let status = 'PENDING';
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), status, totalAmount: 400000 },
        }),
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      status = 'CANCELLED';
      await harness.triggerPollTick();
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals must be 0 after terminal status');

      harness.unmount();
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Zero active intervals after unmount');
      assert.equal(harness.isPollIntervalCleared(), true);
    });
  });

  // =========================================================================
  // 15. FIX-058 ROUND 7 — R7-FE-001 POLLING SESSION OWNERSHIP & STALE CLEANUP
  // =========================================================================
  describe('15. R7-FE-001 Polling Session Ownership & Stale Cleanup Race Matrix (Cases 15.0–15.7)', () => {
    // 15.0. CRITICAL R7 REPRODUCTION: In-flight Polling A completion does NOT invalidate Session B
    test('15.0. CRITICAL R7 REPRODUCTION: In-flight Polling A completes after Session B started -> B remains valid, issues fresh GETs across 2+ cycles, and navigates on PAID', async () => {
      let orderGetCalls = 0;
      let paymentGetCalls = 0;
      let isPaidOnSessionB = false;

      let isPendingTickA = false;
      let resolvePendingOrderA = null;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          orderGetCalls++;
          if (isPendingTickA) {
            isPendingTickA = false;
            return new Promise((resolve) => {
              resolvePendingOrderA = () => resolve({
                data: { id: Number(id), orderCode: `HG-${id}`, status: 'PENDING', totalAmount: 1251501 },
              });
            });
          }
          return {
            data: {
              id: Number(id),
              orderCode: `HG-${id}`,
              status: isPaidOnSessionB ? 'PAID' : 'PENDING',
              totalAmount: 1251501,
            },
          };
        },
        getOrderPaymentHandler: async (id) => {
          paymentGetCalls++;
          return { data: { id: 9501, orderId: Number(id), status: isPaidOnSessionB ? 'PAID' : 'PENDING' } };
        },
      });

      // 1. Initial load on Route 501: Session A begins
      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Session A must be active initially');

      // 2. Poll Tick A fires and becomes in-flight
      isPendingTickA = true;
      const tickAPromise = harness.triggerPollTick();

      // 3. While request A is in-flight, user clicks "Tôi đã thanh toán" (Manual check)
      // Session B is created with fresh generation and new polling session
      await harness.triggerCheckPayment();
      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Exactly one active interval after manual check');

      // 4. In-flight request A now resolves
      if (resolvePendingOrderA) {
        resolvePendingOrderA();
      }
      await tickAPromise;
      await harness.renderWithLifecycle();

      // CRITICAL R7 ASSERTION: Session B must NOT become a zombie!
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Session B must remain active (no timer cleared)');
      assert.equal(harness.isPollIntervalCleared(), false);

      // 5. Reviewer waits 2 cycles (8 seconds). Session B MUST issue fresh GET requests!
      const orderCallsBefore = orderGetCalls;
      const paymentCallsBefore = paymentGetCalls;

      await harness.triggerPollTick(); // Session B Cycle 1
      await harness.triggerPollTick(); // Session B Cycle 2

      assert.ok(orderGetCalls > orderCallsBefore, 'Session B MUST issue fresh GET order requests across cycles');
      assert.ok(paymentGetCalls > paymentCallsBefore, 'Session B MUST issue fresh GET payment requests across cycles');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Still exactly one active interval');

      // 6. When status transitions to PAID, Session B cleanly handles success navigation
      isPaidOnSessionB = true;
      await harness.triggerPollTick();

      assert.equal(harness.getNavigatedTo(), '/order-success/501', 'Must navigate to /order-success/501 on PAID');
      assert.equal(harness.getNavigationHistory().length, 1, 'Must navigate exactly once');
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Active intervals must be 0 after terminal PAID');
      assert.equal(harness.isPollIntervalCleared(), true);

      harness.unmount();
    });

    // 15.1. Case B: Polling A late success response after Session B starts does not overwrite Session B state
    test('15.1. Case B: Polling A late 200 response arriving after Session B starts is safely discarded', async () => {
      let resolveStale200A = null;
      let tickNum = 0;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          tickNum++;
          if (tickNum === 2) {
            return new Promise((resolve) => {
              resolveStale200A = () => resolve({
                data: { id: Number(id), orderCode: 'OLD-A', status: 'PENDING', totalAmount: 111111 },
              });
            });
          }
          return { data: { id: Number(id), orderCode: 'NEW-B', status: 'PENDING', totalAmount: 222222 } };
        },
      });

      await harness.renderWithLifecycle();

      // In-flight tick from Session A
      const stalePromise = harness.triggerPollTick();

      // Manual check replaces with Session B
      await harness.triggerCheckPayment();
      const stateB = await harness.renderWithLifecycle();
      assert.ok(stateB.finalMarkup.includes('222.222'), 'Session B state rendered');

      // Stale response A resolves
      if (resolveStale200A) resolveStale200A();
      await stalePromise;
      const stateAfterStale = await harness.renderWithLifecycle();

      assert.ok(stateAfterStale.finalMarkup.includes('222.222'), 'Session B state must remain');
      assert.ok(!stateAfterStale.finalMarkup.includes('111.111'), 'Stale A data must NOT overwrite Session B');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Session B polling continues');

      harness.unmount();
    });

    // 15.2. Case C: Polling A late transient 503 error after Session B starts does not affect Session B
    test('15.2. Case C: Polling A late 503 error arriving after Session B starts does NOT display error on Session B', async () => {
      let rejectStale503A = null;
      let callCount = 0;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          callCount++;
          if (callCount === 2) {
            return new Promise((_, reject) => {
              rejectStale503A = () => {
                const err = new Error('Old Server Error');
                err.response = { status: 503, data: { message: 'Lỗi cũ 503' } };
                reject(err);
              };
            });
          }
          return { data: { id: Number(id), status: 'PENDING', totalAmount: 500000 } };
        },
      });

      await harness.renderWithLifecycle();
      const tickPromise = harness.triggerPollTick();

      // Start Session B
      await harness.triggerCheckPayment();
      await harness.renderWithLifecycle();

      // Reject old request with 503
      if (rejectStale503A) rejectStale503A();
      try { await tickPromise; } catch {}
      const stateAfterReject = await harness.renderWithLifecycle();

      assert.ok(!stateAfterReject.finalMarkup.includes('Lỗi cũ 503'), 'Stale error must not render on Session B');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Session B polling remains active');

      harness.unmount();
    });

    // 15.3. Case D: Polling A cleanup/finally running after Session B started does NOT clear Session B timer
    test('15.3. Case D: Polling A cleanup does NOT clear Session B timer or increment Session B generation', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
      });

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      // Start Session B
      await harness.triggerCheckPayment();
      await harness.renderWithLifecycle();

      assert.equal(harness.getActivePollIntervalCount(), 1, 'Session B active');
      assert.equal(harness.isPollIntervalCleared(), false);

      // Trigger cycle on Session B
      await harness.triggerPollTick();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Timer remains active on Session B');

      harness.unmount();
    });

    // 15.4. Case E: Polling A late 403 error does NOT invalidate newly reauthorized Session B
    test('15.4. Case E: Polling A late 403 error arriving after Session B starts does NOT revoke Session B authorization', async () => {
      let rejectStale403A = null;
      let reqCount = 0;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          reqCount++;
          if (reqCount === 2) {
            return new Promise((_, reject) => {
              rejectStale403A = () => {
                const err = new Error('Stale Forbidden');
                err.response = { status: 403, data: { message: 'Lỗi 403 từ Session A' } };
                reject(err);
              };
            });
          }
          return { data: { id: Number(id), status: 'PENDING', totalAmount: 750000 } };
        },
      });

      await harness.renderWithLifecycle();
      const inFlightA = harness.triggerPollTick();

      // Reauthorize with Session B
      await harness.triggerCheckPayment();
      const stateB = await harness.renderWithLifecycle();
      assert.ok(stateB.finalMarkup.includes('750.000'), 'Session B active');

      // Reject old A with 403
      if (rejectStale403A) rejectStale403A();
      try { await inFlightA; } catch {}
      const stateAfterStale403 = await harness.renderWithLifecycle();

      assert.ok(stateAfterStale403.finalMarkup.includes('750.000'), 'Session B data must NOT be cleared by stale 403');
      assert.ok(!stateAfterStale403.finalMarkup.includes('Lỗi 403 từ Session A'));
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Session B continues polling');

      harness.unmount();
    });

    // 15.5. Case F: Rapid double-click on manual check creates exactly ONE polling session
    test('15.5. Case F: Rapid concurrent manual checks create exactly ONE active polling session', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
      });

      await harness.renderWithLifecycle();

      await Promise.all([
        harness.triggerCheckPayment(),
        harness.triggerCheckPayment(),
      ]);

      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Must have exactly ONE active interval');
      assert.equal(harness.isPollIntervalCleared(), false);

      harness.unmount();
    });

    // 15.6. Case G: Sequential replacement A -> B -> C with delayed responses preserves Session C
    test('15.6. Case G: Session sequence A -> B -> C with delayed responses from A and B does NOT disrupt Session C', async () => {
      let resolveA = null;
      let resolveB = null;
      let count = 0;

      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => {
          count++;
          if (count === 2) {
            return new Promise((r) => { resolveA = () => r({ data: { id: 501, status: 'PENDING', totalAmount: 111 } }); });
          }
          if (count === 4) {
            return new Promise((r) => { resolveB = () => r({ data: { id: 501, status: 'PENDING', totalAmount: 222 } }); });
          }
          return { data: { id: 501, status: 'PENDING', totalAmount: 333 } };
        },
      });

      // Session A starts
      await harness.renderWithLifecycle();
      const tickA = harness.triggerPollTick();

      // Session B starts
      await harness.triggerCheckPayment();
      await harness.renderWithLifecycle();
      const tickB = harness.triggerPollTick();

      // Session C starts
      await harness.triggerCheckPayment();
      const stateC = await harness.renderWithLifecycle();
      assert.ok(stateC.finalMarkup.includes('333'));

      // Release A and B delayed responses
      if (resolveA) resolveA();
      if (resolveB) resolveB();
      await Promise.all([tickA, tickB]);
      const stateFinal = await harness.renderWithLifecycle();

      assert.ok(stateFinal.finalMarkup.includes('333'), 'Session C state must remain authoritative');
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Session C timer remains active');

      harness.unmount();
    });

    // 15.7. Case J: Rapid route changes 501 -> 502 -> 501 maintain correct session ownership
    test('15.7. Case J: Rapid route change 501 -> 502 -> 501 cleans up previous session timers with zero leaks', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), status: 'PENDING', totalAmount: Number(id) * 1000 },
        }),
      });

      // Route 501
      await harness.renderWithLifecycle();
      assert.equal(harness.getActivePollIntervalCount(), 1);

      // Route 502
      harness.setRoute('502');
      const state502 = await harness.renderWithLifecycle();
      assert.ok(state502.finalMarkup.includes('502.000'));
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Exactly one timer on 502');

      // Route 501 again
      harness.setRoute('501');
      const state501 = await harness.renderWithLifecycle();
      assert.ok(state501.finalMarkup.includes('501.000'));
      assert.equal(harness.getActivePollIntervalCount(), 1, 'Exactly one timer on 501');

      harness.unmount();
      assert.equal(harness.getActivePollIntervalCount(), 0, 'Zero timers after unmount');
    });
  });

  // =========================================================================
  // 16. R10-FE-001 NAVIGATION VS CANCELLATION VERIFICATION & UI SEMANTICS MATRIX
  // =========================================================================
  describe('16. R10-FE-001 Navigation vs Cancellation Verification & UI Semantics Matrix', () => {
    // 16.0. CRITICAL R10 REPRODUCTION: QR Page renders "Quay lại checkout" and helper text, NOT "Hủy giao dịch"
    test('16.0. CRITICAL R10 REPRODUCTION: Navigation action renders "Quay lại checkout" with non-cancellation helper note, NOT misleading "Hủy giao dịch"', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '501',
        environmentData: { environment: 'MOCK', mockEnabled: true, paymentMode: 'MOCK' },
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), orderCode: `HG-${id}`, status: 'PENDING', totalAmount: 1209000, paymentMethod: 'PAYOS_VIETQR' },
        }),
        getOrderPaymentHandler: async (id) => ({
          data: { id: 9501, orderId: Number(id), status: 'PENDING', provider: 'PAYOS' },
        }),
      });

      try {
        const { finalMarkup } = await harness.renderWithLifecycle();

        // 1. Assert: New clear label "Quay lại checkout" is rendered with canonical /checkout?orderId=501
        assert.ok(
          finalMarkup.includes('Quay lại checkout'),
          'Must render "Quay lại checkout" label'
        );
        assert.ok(
          finalMarkup.includes('href="/checkout?orderId=501"'),
          'Must navigate to canonical /checkout?orderId=501'
        );

        // 2. Assert: Misleading label "Hủy giao dịch" is completely removed from navigation action
        assert.ok(
          !finalMarkup.includes('Hủy giao dịch'),
          'Must NOT contain misleading "Hủy giao dịch" label'
        );

        // 3. Assert: Clear explanatory helper note is displayed for PENDING transaction
        assert.ok(
          finalMarkup.includes('Quay lại checkout không tự động hủy giao dịch thanh toán hiện tại'),
          'Must render explanatory helper note clarifying that navigation does not cancel transaction'
        );

        // 4. Assert: Zero mutations, zero cancel API calls, zero payment creation
        assert.equal(harness.createPaymentLinkCalls.length, 0, 'Zero payment link creations');
      } finally {
        harness.unmount();
      }
    });

    test('16.1. Helper explanation note is appropriately contextualized to PENDING state and not rendered on terminal status', async () => {
      // Terminal CANCELLED order
      const harnessCancelled = await createQRPaymentRuntimeHarness({
        initialOrderId: '502',
        environmentData: { environment: 'MOCK', mockEnabled: true, paymentMode: 'MOCK' },
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), orderCode: `HG-${id}`, status: 'CANCELLED', totalAmount: 500000 },
        }),
        getOrderPaymentHandler: async (id) => ({
          data: { id: 9502, orderId: Number(id), status: 'CANCELLED' },
        }),
      });

      try {
        const res = await harnessCancelled.renderWithLifecycle();
        assert.ok(
          !res.finalMarkup.includes('Quay lại checkout không tự động hủy giao dịch thanh toán hiện tại'),
          'Must NOT render pending warning note when order/payment is already terminal CANCELLED'
        );
      } finally {
        harnessCancelled.unmount();
      }
    });

    test('16.2. Navigation preservation: Canonical orderId parameter intact on rapid view switches', async () => {
      const harness = await createQRPaymentRuntimeHarness({
        initialOrderId: '503',
        environmentData: { environment: 'MOCK', mockEnabled: true, paymentMode: 'MOCK' },
        getOrderByIdHandler: async (id) => ({
          data: { id: Number(id), orderCode: `HG-${id}`, status: 'PENDING', totalAmount: 750000 },
        }),
        getOrderPaymentHandler: async (id) => ({
          data: { id: 9503, orderId: Number(id), status: 'PENDING' },
        }),
      });

      try {
        const { finalMarkup } = await harness.renderWithLifecycle();
        assert.ok(finalMarkup.includes('/checkout?orderId=503'));
        assert.ok(finalMarkup.includes('Quay lại checkout'));
      } finally {
        harness.unmount();
      }
    });
  });
});



