import * as productMedia from '../utils/productMedia.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const orderSuccessSource = fs.readFileSync(path.join(__dirname, 'OrderSuccessPage.jsx'), 'utf-8');
const checkoutSource = fs.readFileSync(path.join(__dirname, 'CheckoutPage.jsx'), 'utf-8');
const qrPaymentSource = fs.readFileSync(path.join(__dirname, 'QRPaymentPage.jsx'), 'utf-8');
const gripSource = fs.readFileSync(path.join(__dirname, 'RacketGripDetailPage.jsx'), 'utf-8');

// Real OrderItemOptions implementation for true component runtime verification
import { OrderItemOptions } from '../utils/orderItemOptions.js';

const testStorage = new Map();
globalThis.sessionStorage ??= { getItem: key => testStorage.get(key) ?? null,
  setItem: (key, value) => testStorage.set(key, String(value)), removeItem: key => testStorage.delete(key) };

test('STEP 1 — COD Demo Verification Suite', async (t) => {
  const esbuild = await import('esbuild');
  const React = await import('react');
  const ReactDOMServer = await import('react-dom/server');

  // =========================================================================
  // FIX-019 TESTS: OrderSuccessPage COD Snapshot
  // =========================================================================
  await t.test('FIX-019 TEST 1: COD Unpaid with null payment renders complete snapshot (customer, phone, address, note, items, options, costs)', async () => {
    const transformed = await esbuild.transform(orderSuccessSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    let stateCursor = 0;
    const stateStore = new Map();
    const effects = [];

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
        effects.push({ fn, deps });
      },
      useRef: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, { current: initial });
        }
        return stateStore.get(id);
      },
    };

    const mockOrder = {
      id: 888,
      orderCode: 'HG-888',
      customerName: 'Hoàng Minh Đức',
      shippingPhone: '0912345678',
      shippingAddress: 'Tòa nhà A, 144 Xuân Thủy, Cầu Giấy, Hà Nội',
      note: 'Giao giờ hành chính, gọi trước khi giao',
      paymentMethod: 'COD',
      status: 'PENDING',
      subtotal: 750000,
      discountAmount: 50000,
      shippingFee: 30000,
      totalAmount: 730000,
      items: [
        {
          id: 101,
          productId: 12,
          productName: 'Vợt Cầu Lông Yonex Astrox 88D Pro',
          price: 600000,
          quantity: 1,
          weightGrip: '4U-G5',
          selectedColor: 'Xanh Cam',
        },
        {
          id: 102,
          productId: 45,
          productName: 'Quấn Cán Vợt Yonex AC102EX',
          price: 150000,
          quantity: 1,
          selectedColor: 'Vàng Chanh',
        },
      ],
    };

    const mockRouter = {
      useParams: () => ({ orderId: '888' }),
      useLocation: () => ({ pathname: '/order-success/888', search: '', state: {} }),
      useNavigate: () => () => {},
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };

    const mockOrderApi = {
      getOrderById: async () => ({ data: mockOrder }),
      getOrderPayment: async () => ({ data: null }),
    };

    const mockFormatters = {
      formatPrice: (v) => `${(v || 0).toLocaleString('vi-VN')} đ`,
      getOrderStatusLabel: (o) => (o?.status === 'PENDING' ? 'Chờ xử lý' : 'Đã xử lý'),
      isOrderPaid: () => false,
      getPaymentStatusBadge: () => 'Chờ xử lý COD',
    };

    const mockLucide = new Proxy({}, { get: (t, p) => (props) => React.createElement('span', { 'data-icon': p, ...props }) });

    const customRequire = (specifier) => {
      if (specifier.includes('productMedia')) return productMedia;
      if (specifier.includes('AdministrativeAddressFields')) return { __esModule: true, default: () => React.createElement('div', null, 'Tỉnh / Thành phố', 'Phường / Xã') };
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('orderApi')) return { orderApi: mockOrderApi };
      if (specifier.includes('formatters')) return mockFormatters;
      if (specifier.includes('lucide-react')) return mockLucide;
      if (specifier.includes('OrderItemOptions')) {
        const Comp = OrderItemOptions;
        Comp.default = Comp;
        Comp.OrderItemOptions = Comp;
        Comp.__esModule = true;
        return Comp;
      }
      throw new Error('Unknown: ' + specifier);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact);

    const Component = moduleObj.exports.default;

    // 1. Initial mount (loading)
    stateCursor = 0;
    effects.length = 0;
    ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

    // 2. Trigger effects
    for (const eff of effects) {
      eff.fn();
    }

    // 3. Await async API completion
    await new Promise((r) => setTimeout(r, 80));

    // 4. Final render
    stateCursor = 0;
    effects.length = 0;
    const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

    // Assert Stepper displays COD
    assert.ok(finalMarkup.includes('2. Phương thức COD'), 'Stepper must display "2. Phương thức COD" for COD order');
    assert.ok(!finalMarkup.includes('2. Thanh toán QR'), 'Stepper must NOT display "2. Thanh toán QR" for COD order');

    // Assert COD Badge & Guidance
    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Badge must render "Chờ xử lý COD"');
    assert.ok(finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'Heading must render "Đơn hàng đã được ghi nhận"');
    assert.ok(finalMarkup.includes('Thanh toán khi nhận hàng'), 'Must render COD payment method text');

    // Assert Customer Snapshot info
    assert.ok(finalMarkup.includes('Hoàng Minh Đức'), 'Must render customerName snapshot');
    assert.ok(finalMarkup.includes('0912345678'), 'Must render shippingPhone snapshot');
    assert.ok(finalMarkup.includes('144 Xuân Thủy'), 'Must render shippingAddress snapshot');
    assert.ok(finalMarkup.includes('Giao giờ hành chính'), 'Must render note snapshot');

    // Assert Items & Real OrderItemOptions Rendering
    assert.ok(finalMarkup.includes('Astrox 88D Pro'), 'Must render first product name');
    assert.ok(finalMarkup.includes('4U-G5'), 'Must render real weightGrip option badge');
    assert.ok(finalMarkup.includes('Xanh Cam'), 'Must render real selectedColor option badge');
    assert.ok(finalMarkup.includes('AC102EX'), 'Must render second product name');
    assert.ok(finalMarkup.includes('Vàng Chanh'), 'Must render second color option badge');

    // Assert Financial Snapshot Breakdown
    assert.ok(finalMarkup.includes('750.000'), 'Must render subtotal 750.000 đ');
    assert.ok(finalMarkup.includes('50.000'), 'Must render voucher discount 50.000 đ');
    assert.ok(finalMarkup.includes('30.000'), 'Must render shipping fee 30.000 đ');
    assert.ok(finalMarkup.includes('730.000'), 'Must render totalAmount 730.000 đ');
  });

  await t.test('FIX-019 TEST 2: COD with historical PayOS CANCELLED attempt renders COD UI & complete snapshot, NOT PayOS cancelled', async () => {
    const transformed = await esbuild.transform(orderSuccessSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    let stateCursor = 0;
    const stateStore = new Map();
    const effects = [];

    const customReact = {
      ...React,
      useState: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) stateStore.set(id, initial);
        const val = stateStore.get(id);
        const setter = (newVal) => {
          const resolved = typeof newVal === 'function' ? newVal(stateStore.get(id)) : newVal;
          stateStore.set(id, resolved);
        };
        return [val, setter];
      },
      useEffect: (fn, deps) => { effects.push({ fn, deps }); },
      useRef: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) stateStore.set(id, { current: initial });
        return stateStore.get(id);
      },
    };

    const mockOrder = {
      id: 501,
      orderCode: 'HG-501',
      customerName: 'Nguyễn Văn A',
      shippingPhone: '0988776655',
      shippingAddress: '456 Lê Lợi, TP.HCM',
      paymentMethod: 'COD',
      status: 'PENDING',
      subtotal: 500000,
      totalAmount: 500000,
      items: [{ id: 1, productName: 'Áo Yonex Tour', price: 500000, quantity: 1, selectedColor: 'Đỏ', size: 'L' }],
    };

    const mockRouter = {
      useParams: () => ({ orderId: '501' }),
      useLocation: () => ({ pathname: '/order-success/501', search: '', state: {} }),
      useNavigate: () => () => {},
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };

    const mockOrderApi = {
      getOrderById: async () => ({ data: mockOrder }),
      getOrderPayment: async () => ({ data: { provider: 'PAYOS', status: 'CANCELLED', orderId: 501 } }),
    };

    const mockFormatters = {
      formatPrice: (v) => `${(v || 0).toLocaleString('vi-VN')} đ`,
      getOrderStatusLabel: () => 'Chờ xử lý',
      isOrderPaid: () => false,
      getPaymentStatusBadge: () => 'Chờ xử lý COD',
    };

    const mockLucide = new Proxy({}, { get: (t, p) => (props) => React.createElement('span', { 'data-icon': p, ...props }) });

    const customRequire = (specifier) => {
      if (specifier.includes('productMedia')) return productMedia;
      if (specifier.includes('AdministrativeAddressFields')) return { __esModule: true, default: () => React.createElement('div', null, 'Tỉnh / Thành phố', 'Phường / Xã') };
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('orderApi')) return { orderApi: mockOrderApi };
      if (specifier.includes('formatters')) return mockFormatters;
      if (specifier.includes('lucide-react')) return mockLucide;
      if (specifier.includes('OrderItemOptions')) {
        const Comp = OrderItemOptions;
        Comp.default = Comp;
        Comp.OrderItemOptions = Comp;
        Comp.__esModule = true;
        return Comp;
      }
      throw new Error('Unknown: ' + specifier);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact);

    const Component = moduleObj.exports.default;

    stateCursor = 0;
    effects.length = 0;
    ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

    for (const eff of effects) eff.fn();
    await new Promise((r) => setTimeout(r, 80));

    stateCursor = 0;
    effects.length = 0;
    const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

    // Must render COD UI and NOT PayOS Cancelled
    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Must render "Chờ xử lý COD"');
    assert.ok(finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'Must render "Đơn hàng đã được ghi nhận"');
    assert.ok(!finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Must NOT display cancelled PayOS heading');
    assert.ok(finalMarkup.includes('456 Lê Lợi'), 'Must render shipping address snapshot');
    assert.ok(finalMarkup.includes('Áo Yonex Tour'), 'Must render product name snapshot');
    assert.ok(finalMarkup.includes('Đỏ'), 'Must render color option snapshot');
  });

  await t.test('FIX-019 TEST 3: Order GET 401/403/404 does NOT leak snapshot from navigation state', async () => {
    const transformed = await esbuild.transform(orderSuccessSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    let stateCursor = 0;
    const stateStore = new Map();
    const effects = [];

    const customReact = {
      ...React,
      useState: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) stateStore.set(id, initial);
        const val = stateStore.get(id);
        const setter = (newVal) => {
          const resolved = typeof newVal === 'function' ? newVal(stateStore.get(id)) : newVal;
          stateStore.set(id, resolved);
        };
        return [val, setter];
      },
      useEffect: (fn, deps) => { effects.push({ fn, deps }); },
      useRef: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) stateStore.set(id, { current: initial });
        return stateStore.get(id);
      },
    };

    // Stale/fake order passed in location.state
    const fakeStateOrder = { id: 999, customerName: 'Secret VIP User', shippingPhone: '0999999999' };

    const mockRouter = {
      useParams: () => ({ orderId: '999' }),
      useLocation: () => ({ pathname: '/order-success/999', search: '', state: { order: fakeStateOrder } }),
      useNavigate: () => () => {},
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };

    const mockOrderApi = {
      getOrderById: async () => {
        const err = new Error('Forbidden');
        err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập thông tin đơn hàng này.' } };
        throw err;
      },
      getOrderPayment: async () => ({ data: null }),
    };

    const mockFormatters = {
      formatPrice: (v) => `${v} đ`,
      getOrderStatusLabel: () => '',
      isOrderPaid: () => false,
      getPaymentStatusBadge: () => '',
    };

    const mockLucide = new Proxy({}, { get: (t, p) => (props) => React.createElement('span', { 'data-icon': p, ...props }) });

    const customRequire = (specifier) => {
      if (specifier.includes('productMedia')) return productMedia;
      if (specifier.includes('AdministrativeAddressFields')) return { __esModule: true, default: () => React.createElement('div', null, 'Tỉnh / Thành phố', 'Phường / Xã') };
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('orderApi')) return { orderApi: mockOrderApi };
      if (specifier.includes('formatters')) return mockFormatters;
      if (specifier.includes('lucide-react')) return mockLucide;
      if (specifier.includes('OrderItemOptions')) {
        const Comp = OrderItemOptions;
        Comp.default = Comp;
        Comp.OrderItemOptions = Comp;
        Comp.__esModule = true;
        return Comp;
      }
      throw new Error('Unknown: ' + specifier);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact);

    const Component = moduleObj.exports.default;

    stateCursor = 0;
    effects.length = 0;
    ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

    for (const eff of effects) eff.fn();
    await new Promise((r) => setTimeout(r, 80));

    stateCursor = 0;
    effects.length = 0;
    const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

    // Must show 403 error and MUST NOT leak fakeStateOrder
    assert.ok(finalMarkup.includes('Bạn không có quyền truy cập'), 'Must display 403 forbidden message');
    assert.ok(!finalMarkup.includes('Secret VIP User'), 'Must NOT leak customerName from navigation state');
    assert.ok(!finalMarkup.includes('0999999999'), 'Must NOT leak phone from navigation state');
  });

  // =========================================================================
  // FIX-048 TESTS: CheckoutPage COD Defaults & Submit Guard
  // =========================================================================
  await t.test('Checkout mặc định COD và cho phép chọn QR động PayOS', async () => {
    const transformed = await esbuild.transform(checkoutSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    let stateCursor = 0;
    const stateStore = new Map();
    const effects = [];

    const customReact = {
      ...React,
      useState: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) stateStore.set(id, initial);
        const val = stateStore.get(id);
        const setter = (newVal) => {
          const resolved = typeof newVal === 'function' ? newVal(stateStore.get(id)) : newVal;
          stateStore.set(id, resolved);
        };
        return [val, setter];
      },
      useEffect: (fn, deps) => { effects.push({ fn, deps }); },
      useRef: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) stateStore.set(id, { current: initial });
        return stateStore.get(id);
      },
    };

    const mockRouter = {
      useNavigate: () => () => {},
      useLocation: () => ({ pathname: '/checkout', search: '', state: {} }),
      Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };

    const mockCart = {
      useCart: () => ({
        cart: [{ cartItemId: 1, product: { id: 10, name: 'Vợt Pro', price: 500000 }, quantity: 1 }],
        removeFromCart: () => {},
      }),
    };

    const mockAuth = {
      useAuth: () => ({ user: { fullName: 'Test User', phone: '0988112233', address: '123 Phố Vọng' } }),
    };

    const mockOrderApi = { orderApi: { createOrder: async () => ({ data: { id: 101 } }) } };
    const mockVoucherApi = { voucherApi: { getUserVouchers: async () => ({ data: [] }) } };
    const mockShippingAddressApi = { shippingAddressApi: { getMyAddresses: async () => ({ data: [] }) } };
    const mockFormatters = { formatPrice: (v) => `${(v || 0).toLocaleString('vi-VN')} đ` };
    const mockLucide = new Proxy({}, { get: (t, p) => (props) => React.createElement('span', { 'data-icon': p, ...props }) });

    const customRequire = (specifier) => {
      if (specifier.includes('productMedia')) return productMedia;
      if (specifier.includes('AdministrativeAddressFields')) return { __esModule: true, default: () => React.createElement('div', null, 'Tỉnh / Thành phố', 'Phường / Xã') };
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('CartContext')) return mockCart;
      if (specifier.includes('AuthContext')) return mockAuth;
      if (specifier.includes('orderApi')) return mockOrderApi;
      if (specifier.includes('voucherApi')) return mockVoucherApi;
      if (specifier.includes('useCheckoutVoucher')) return { __esModule: true, default: () => ({ discountAmount: 0, error: '', success: false, validating: false, apply: () => {} }) };
      if (specifier.includes('shippingAddressApi')) return mockShippingAddressApi;
      if (specifier.includes('formatters')) return mockFormatters;
      if (specifier.includes('idempotency')) {
        return {
          buildOrderPayload: () => ({}),
          isResponseStale: () => false,
          canonicalStringify: JSON.stringify,
          getOrCreateIdempotencyKey: () => ({ key: 'idem-uuid-test' }),
          clearStoredCheckoutIntent: () => {},
          getOrCreatePaymentLinkKey: () => 'link-key',
          getOrCreateTransitionKey: () => 'trans-key',
          getStoredTransitionIntent: () => null,
          saveTransitionIntent: () => {},
          clearStoredTransitionIntent: () => {},
          TRANSITION_STORAGE_KEY: 'test-key',
        };
      }
      if (specifier === 'lucide-react') return mockLucide;
      if (specifier.includes('OrderItemOptions')) {
        const Comp = OrderItemOptions;
        Comp.default = Comp;
        Comp.OrderItemOptions = Comp;
        Comp.__esModule = true;
        return Comp;
      }
      throw new Error('Unknown: ' + specifier);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact);

    const Component = moduleObj.exports.default;

    stateCursor = 0;
    effects.length = 0;
    const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

    assert.match(finalMarkup, /value="PAYOS_VIETQR"/);
    assert.doesNotMatch(finalMarkup, /Thanh toán QR tạm chưa hỗ trợ trong bản demo/);
    const qrRadio = finalMarkup.match(/<input[^>]+value="PAYOS_VIETQR"[^>]*>/)?.[0];
    assert.ok(qrRadio && !qrRadio.includes('disabled'), 'Radio QR phải cho phép chọn');

    // COD must be rendered as active payment method
    assert.ok(finalMarkup.includes('Thanh toán khi nhận hàng (COD)'), 'Must render COD payment method option');
  });

  await t.test('Checkout chỉ nhận COD hoặc PayOS, không chặn QR bằng quy tắc demo cũ', async () => {
    assert.ok(
      checkoutSource.includes("if (!['COD', 'PAYOS_VIETQR'].includes(paymentMethod))"),
      'Phải kiểm tra phương thức được hỗ trợ'
    );
    assert.ok(!checkoutSource.includes("if (paymentMethod !== 'COD')"));
  });

  // =========================================================================
  // FIX-048 COMPONENT RUNTIME TESTS: QRPaymentPage in Demo COD Mode
  // =========================================================================
  async function createQRPaymentHarness({
    qrEnabled = false,
    orderId = '501',
    initialOrder = null,
    initialPayment = null,
    getOrderByIdHandler = null,
    getOrderPaymentHandler = null,
    createPaymentLinkHandler = null,
  } = {}) {
    const transformed = await esbuild.transform(qrPaymentSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    let currentOrderId = orderId;
    let currentLocationState = { order: initialOrder, payment: initialPayment };
    let stateCursor = 0;
    let effectCursor = 0;
    const stateStore = new Map();
    const effects = [];
    const activeCleanups = new Map();
    const prevDepsMap = new Map();

    let checkPaymentHandler = null;

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

    const mockRouter = {
      useParams: () => ({ orderId: currentOrderId }),
      useLocation: () => ({ pathname: `/payment/qr/${currentOrderId}`, search: '', state: currentLocationState }),
      useNavigate: () => () => {},
      Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
    };

    const mockOrderApi = {
      orderApi: {
        getOrderById: async (id) => {
          if (typeof getOrderByIdHandler === 'function') return getOrderByIdHandler(id);
          return { data: { id: Number(id), orderCode: `HG-${id}`, totalAmount: 500000, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' } };
        },
        getOrderPayment: async (id) => {
          if (typeof getOrderPaymentHandler === 'function') return getOrderPaymentHandler(id);
          return { data: null };
        },
        createPaymentLink: async (id, key) => {
          if (typeof createPaymentLinkHandler === 'function') return createPaymentLinkHandler(id, key);
          return { data: {} };
        },
        getPaymentEnvironment: async () => ({ data: { paymentMode: 'REAL', simulationControlsAllowed: false } }),
      }
    };

    const customRequire = (specifier) => {
      if (specifier.includes('productMedia')) return productMedia;
      if (specifier.includes('AdministrativeAddressFields')) return { __esModule: true, default: () => React.createElement('div', null, 'Tỉnh / Thành phố', 'Phường / Xã') };
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('orderApi')) return mockOrderApi;
      if (specifier.includes('formatters')) {
        return {
          formatPrice: (p) => (p || 0).toLocaleString('vi-VN') + ' đ',
          formatTimer: (t) => t + 's',
          isOrderPaid: (o) => o?.status === 'PAID',
        };
      }
      if (specifier.includes('idempotency')) {
        return { getOrCreatePaymentLinkKey: (id) => `key-${id}` };
      }
      if (specifier === 'qrcode.react') {
        return { QRCodeSVG: (props) => React.createElement('svg', props) };
      }
      if (specifier.includes('MockPayOSControls')) {
        return () => null;
      }
      if (specifier === 'lucide-react') {
        return new Proxy({}, {
          get: (target, prop) => (props) => React.createElement('span', { 'data-icon': prop, ...props })
        });
      }
      throw new Error('Unknown: ' + specifier);
    };

    const capturedIntervals = new Set();
    const customSetInterval = (fn, ms, ...args) => {
      const id = setInterval(fn, ms, ...args);
      capturedIntervals.add(id);
      return id;
    };
    const customClearInterval = (id) => {
      capturedIntervals.delete(id);
      clearInterval(id);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', 'setInterval', 'clearInterval', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact, customSetInterval, customClearInterval);
    const Component = moduleObj.exports.default;

    const render = async () => {
      stateCursor = 0;
      effectCursor = 0;
      effects.length = 0;
      ReactDOMServer.renderToStaticMarkup(React.createElement(Component, { isQREnabled: qrEnabled }));

      await runEffects();
      await new Promise((r) => setTimeout(r, 60));

      stateCursor = 0;
      effectCursor = 0;
      effects.length = 0;
      const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component, { isQREnabled: qrEnabled }));
      await runEffects();
      return finalMarkup;
    };

    function dispose() {
      // 1. Call all React effect cleanups
      for (const [slot, cleanup] of activeCleanups.entries()) {
        if (typeof cleanup === 'function') {
          try {
            cleanup();
          } catch {}
        }
      }
      activeCleanups.clear();
      prevDepsMap.clear();

      // 2. Clear all captured intervals
      for (const id of capturedIntervals) {
        try {
          clearInterval(id);
        } catch {}
      }
      capturedIntervals.clear();
    }

    return {
      render,
      getCheckPaymentHandler: () => checkPaymentHandler,
      dispose,
    };
  }

  await t.test('FIX-048 TEST 3: Mount QRPaymentPage (PENDING + payment null) triggers exactly 0 POST payment-link calls', async (sub) => {
    let postLinkCalls = 0;
    const harness = await createQRPaymentHarness({
      orderId: '301',
      createPaymentLinkHandler: async () => {
        postLinkCalls++;
        return { data: {} };
      },
    });

    sub.after(() => harness.dispose());
    try {
      const markup = await harness.render();

      assert.equal(postLinkCalls, 0, 'DEMO COD REQUIREMENT: initial mount must make ZERO POST payment-link calls');
      assert.ok(markup.includes('Thanh toán QR tạm hoãn trong bản demo'), 'Must display demo suspension banner');
      assert.ok(markup.includes('TẠM HOÃN THANH TOÁN QR'), 'Must display suspended QR placeholder card');
    } finally {
      harness.dispose();
    }
  });

  await t.test('FIX-048 TEST 4: QRPaymentPage on CREATING payment + manual check/retry calls ZERO POST payment-link', async (sub) => {
    let postLinkCalls = 0;
    const harness = await createQRPaymentHarness({
      orderId: '302',
      getOrderPaymentHandler: async () => ({
        data: { id: 9302, orderId: 302, status: 'CREATING', checkoutUrl: null }
      }),
      createPaymentLinkHandler: async () => {
        postLinkCalls++;
        return { data: {} };
      },
    });

    sub.after(() => harness.dispose());
    try {
      await harness.render();
      const checkBtn = harness.getCheckPaymentHandler();
      assert.ok(checkBtn, 'Must find check payment / retry action handler');

      await checkBtn();
      assert.equal(postLinkCalls, 0, 'DEMO COD REQUIREMENT: manual check/retry on CREATING must make ZERO POST payment-link calls');
    } finally {
      harness.dispose();
    }
  });

  await t.test('FIX-048 TEST 5: QRPaymentPage with checkoutUrl/qrPayload has NO payable QR and NO external PayOS link', async (sub) => {
    const harness = await createQRPaymentHarness({
      orderId: '303',
      getOrderPaymentHandler: async () => ({
        data: {
          id: 9303,
          orderId: 303,
          status: 'PENDING',
          checkoutUrl: 'https://pay.payos.vn/web/test-link',
          qrPayload: '00020101021238540010A00000072701240006970422',
        }
      }),
    });

    sub.after(() => harness.dispose());
    try {
      const markup = await harness.render();

      assert.ok(!markup.includes('https://pay.payos.vn/web/test-link'), 'Must NOT render clickable external PayOS link');
      assert.ok(!markup.includes('Mở cổng thanh toán PayOS'), 'Must NOT render PayOS open gate link');
      assert.ok(!markup.includes('Tiếp tục thanh toán qua PayOS'), 'Must NOT render continue payment PayOS link');
      assert.ok(markup.includes('Cổng thanh toán PayOS tạm hoãn trong bản demo'), 'Must render PayOS suspension notice');
      assert.ok(markup.includes('TẠM HOÃN THANH TOÁN QR'), 'Must render suspended placeholder instead of payable QR');
    } finally {
      harness.dispose();
    }
  });

  await t.test('FIX-048 TEST 6: QRPaymentPage return checkout link preserves internal orderId', async (sub) => {
    const harness = await createQRPaymentHarness({
      orderId: '304',
    });

    sub.after(() => harness.dispose());
    try {
      const markup = await harness.render();
      assert.ok(markup.includes('href="/checkout?orderId=304"'), 'Return checkout link must preserve internal orderId 304');
      assert.ok(markup.includes('Đổi sang COD'), 'Banner must provide quick switch link to COD');
    } finally {
      harness.dispose();
    }
  });

  await t.test('FIX-048 TEST 7: QRPaymentPage on 401/403/404 does NOT expose order snapshot or payment links', async (sub) => {
    const harness = await createQRPaymentHarness({
      orderId: '305',
      getOrderByIdHandler: async () => {
        const err = new Error('Forbidden');
        err.response = { status: 403, data: { message: 'Bạn không có quyền truy cập đơn hàng này.' } };
        throw err;
      },
    });

    sub.after(() => harness.dispose());
    try {
      const markup = await harness.render();
      assert.ok(!markup.includes('HG-305'), 'Must not render order code on 403');
      assert.ok(markup.includes('Bạn không có quyền truy cập đơn hàng này'), 'Must render access denied message');
      assert.ok(!markup.includes('TẠM HOÃN THANH TOÁN QR'), 'Must not render QR frame when access is revoked');
    } finally {
      harness.dispose();
    }
  });

  await t.test('QR đã bật: hiển thị QR và link PayOS sau khi Backend xác minh môi trường REAL', async (sub) => {
    const payment = { id: 9001, orderId: 306, paymentMode: 'REAL', status: 'PENDING',
      qrPayload: 'TEST-QR-NONPAYABLE', checkoutUrl: 'https://pay.payos.vn/web/test-only' };
    const harness = await createQRPaymentHarness({ qrEnabled: true, orderId: '306',
      getOrderPaymentHandler: async () => ({ data: payment }) });
    sub.after(() => harness.dispose());
    const markup = await harness.render();
    assert.ok(markup.includes('Tiếp tục thanh toán qua PayOS'));
    assert.ok(markup.includes('https://pay.payos.vn/web/test-only'));
    assert.ok(markup.includes('TEST-QR-NONPAYABLE'));
    assert.ok(!markup.includes('TẠM HOÃN THANH TOÁN QR'));
  });

  // =========================================================================
  // FIX-010 TESTS: RacketGripDetailPage Fake Combo Disabled
  // =========================================================================
  await t.test('FIX-010 TEST 1: RacketGripDetailPage combo button is disabled and does NOT contain fake product 99901', async () => {
    const gripCode = fs.readFileSync(path.join(__dirname, 'RacketGripDetailPage.jsx'), 'utf-8');
    assert.ok(
      !gripCode.includes('99901'),
      'RacketGripDetailPage MUST NOT contain fake product ID 99901'
    );
    assert.ok(
      gripCode.includes('Combo tạm chưa hỗ trợ'),
      'RacketGripDetailPage must display "Combo tạm chưa hỗ trợ"'
    );
    assert.ok(
      gripCode.includes('disabled={true}'),
      'Combo button must be strictly disabled'
    );
  });
});
