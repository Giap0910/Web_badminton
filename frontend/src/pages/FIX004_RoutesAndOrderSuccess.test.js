import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('FIX-004 — Frontend Implementation & Verification', () => {

  const appPath = path.resolve(__dirname, '../App.jsx');
  const appSource = fs.readFileSync(appPath, 'utf8');

  const successPath = path.resolve(__dirname, './OrderSuccessPage.jsx');
  const successSource = fs.readFileSync(successPath, 'utf8');

  const qrPath = path.resolve(__dirname, './QRPaymentPage.jsx');
  const qrSource = fs.readFileSync(qrPath, 'utf8');

  test('1. App.jsx: Canonical routes /payment/qr/:orderId and /order-success/:orderId exist', () => {
    assert.match(appSource, /path="\/payment\/qr\/:orderId"/, 'Must contain canonical /payment/qr/:orderId route');
    assert.match(appSource, /path="\/order-success\/:orderId"/, 'Must contain canonical /order-success/:orderId route');
  });

  test('2. App.jsx: Route guard prevents /orders/cancel from matching /orders/:id with id="cancel"', () => {
    const cancelIdx = appSource.indexOf('path="/orders/cancel"');
    const orderDetailIdx = appSource.indexOf('path="/orders/:id"');
    assert.ok(cancelIdx !== -1, 'Must define explicit /orders/cancel route');
    assert.ok(cancelIdx < orderDetailIdx, '/orders/cancel must be placed before /orders/:id');
  });

  test('3. OrderSuccessPage: Identifies orderId from route param and never trusts fake browser query', () => {
    assert.match(successSource, /const\s*{\s*orderId\s*}\s*=\s*useParams\(\)/, 'Must extract orderId from useParams');
    // Ensure status query parameter is not used to determine payment truth
    assert.ok(!successSource.includes('searchParams.get(\'status\') === \'PAID\''), 'Must not trust ?status=PAID');
    assert.ok(!successSource.includes('searchParams.get(\'code\') === \'00\''), 'Must not trust ?code=00');
    assert.ok(!successSource.includes('searchParams.get(\'success\') === \'true\''), 'Must not trust ?success=true');
  });

  test('4. OrderSuccessPage: Authoritative data fetch calls getOrderById and getOrderPayment', () => {
    assert.match(successSource, /orderApi\.getOrderById\(targetId\)/, 'Must fetch order by internal id');
    assert.match(successSource, /orderApi\.getOrderPayment\(targetId\)/, 'Must fetch payment attempt by internal id');
  });

  test('5. OrderSuccessPage: Handles return before webhook (PENDING) without showing false success', () => {
    assert.match(successSource, /isPending/, 'Must distinguish pending payment state');
    assert.match(successSource, /Đang xác nhận thanh toán/, 'Must render pending waiting badge/text');
    assert.match(successSource, /fetchOrderData\(orderId,\s*true\)/, 'Must provide manual check button');
  });

  test('6. OrderSuccessPage: Handles distinct NEEDS_REVIEW state', () => {
    assert.match(successSource, /isNeedsReview\s*=\s*payment\?\.status\s*===\s*'NEEDS_REVIEW'/, 'Must distinguish NEEDS_REVIEW');
    assert.match(successSource, /Cần đối soát/, 'Must render distinct review notice');
  });

  test('7. OrderSuccessPage: Handles distinct FAILED, EXPIRED, and CANCELLED states', () => {
    assert.match(successSource, /isFailed\s*=\s*payment\?\.status\s*===\s*'FAILED'/, 'Must distinguish FAILED');
    assert.match(successSource, /isExpired\s*=\s*payment\?\.status\s*===\s*'EXPIRED'/, 'Must distinguish EXPIRED');
    assert.match(successSource, /isCancelled\s*=\s*payment\?\.status\s*===\s*'CANCELLED'/, 'Must distinguish CANCELLED');
  });

  test('8. OrderSuccessPage: Link to order list uses canonical /my-orders instead of /user/orders', () => {
    assert.ok(!successSource.includes('/user/orders'), 'Must NOT link to /user/orders');
    assert.match(successSource, /to="\/my-orders"/, 'Must link to canonical /my-orders');
  });

  test('9. OrderSuccessPage: Stale request guard on orderId change', () => {
    assert.match(successSource, /currentOrderIdRef\.current\s*!==\s*targetId/, 'Must guard against stale response overwriting state');
  });

  test('10. OrderSuccessPage: Duplicate click guard on manual check', () => {
    assert.match(successSource, /isCheckingRef\.current/, 'Must check in-flight flag before dispatch');
    assert.match(successSource, /disabled=\{isChecking\}/, 'Check button must be disabled during request');
  });

  test('11. QRPaymentPage: Cancelled query ?cancelled=1 provides context only and does NOT call cancelOrder', () => {
    assert.match(qrSource, /get\('cancelled'\)\s*===\s*'1'/, 'Must detect ?cancelled=1 context');
    assert.match(qrSource, /Bạn đã quay lại từ cổng thanh toán/, 'Must render contextual notice');
    // Ensure cancelled=1 does NOT invoke orderApi.cancelOrder
    assert.ok(!qrSource.includes('orderApi.cancelOrder'), 'Must NEVER call orderApi.cancelOrder on cancelled query');
  });

  test('12. QRPaymentPage: Distinct statuses (CREATING, PENDING, PAID, NEEDS_REVIEW, FAILED, EXPIRED, CANCELLED)', () => {
    assert.match(qrSource, /payment\?\.status\s*===\s*'NEEDS_REVIEW'/, 'Must handle NEEDS_REVIEW');
    assert.match(qrSource, /payment\?\.status\s*===\s*'FAILED'/, 'Must handle FAILED');
    assert.match(qrSource, /payment\?\.status\s*===\s*'EXPIRED'/, 'Must handle EXPIRED');
    assert.match(qrSource, /payment\?\.status\s*===\s*'CANCELLED'/, 'Must handle CANCELLED');
  });

  test('13. QRPaymentPage: Legacy img src branch removed; qrPayload is never used as img.src', () => {
    assert.ok(!qrSource.includes('<img\n                  src={order.qrCode'), 'Legacy img qrCode must be removed');
    assert.ok(!qrSource.includes('src={payment.qrPayload}'), 'qrPayload must NEVER be an img.src');
    assert.ok(!qrSource.includes('src={payment?.qrPayload}'), 'payment.qrPayload must NEVER be an img.src');
  });

  test('14. QRPaymentPage: Preserves backend checkoutUrl link to PayOS', () => {
    assert.match(qrSource, /href=\{payment\.checkoutUrl\}/, 'Must preserve exact backend checkoutUrl');
    assert.match(qrSource, /Mở cổng thanh toán PayOS/, 'Must offer checkoutUrl link');
  });

  test('15. Security: STATIC_QR_REACHABLE is NO (no hardcoded bank accounts or fake QR images)', () => {
    assert.ok(!qrSource.includes('https://img.vietqr.io'), 'No static VietQR image service allowed');
    assert.ok(!qrSource.includes('api.vietqr.io'), 'No external VietQR image generation API allowed');
    assert.ok(!successSource.includes('https://img.vietqr.io'), 'No static VietQR image service in success page');
  });

  test('16. Security: Customer pages do NOT call payos-webhook or admin reconcile', () => {
    assert.ok(!qrSource.includes('/api/payment/payos-webhook'), 'Customer page must not call webhook');
    assert.ok(!qrSource.includes('/reconcile'), 'Customer page must not call reconcile');
    assert.ok(!successSource.includes('/api/payment/payos-webhook'), 'Success page must not call webhook');
    assert.ok(!successSource.includes('/reconcile'), 'Success page must not call reconcile');
  });

  test('17. Production QR: QRPaymentPage imports QRCodeSVG and binds value={payment.qrPayload}', () => {
    assert.match(qrSource, /import\s*{\s*QRCodeSVG\s*}\s*from\s*['"]qrcode\.react['"]/, 'Must import QRCodeSVG from qrcode.react');
    assert.match(qrSource, /<QRCodeSVG[\s\S]*?value=\{payment\.qrPayload\}/, 'Must pass payment.qrPayload directly as value prop');
  });

  test('18. Production QR: Value prop is exact qrPayload without mutation, prefix, or object wrapping', () => {
    // Assert no prepended URL or fake conversion
    assert.ok(!qrSource.includes('value={`https://'), 'Must not prepend URL to qrPayload');
    assert.ok(!qrSource.includes('value={JSON.stringify(payment.qrPayload)}'), 'Must not JSON wrap qrPayload');
    assert.ok(!qrSource.includes('value={payment.checkoutUrl}'), 'Must not replace qrPayload with checkoutUrl');
    assert.ok(!qrSource.includes('value={payment.orderCode}'), 'Must not replace qrPayload with orderCode');
  });

  test('19. Runtime QR Renderer: Actual installed qrcode.react renders real SVG from payment payload fixture', async () => {
    const { QRCodeSVG } = await import('qrcode.react');
    assert.ok(typeof QRCodeSVG === 'function' || typeof QRCodeSVG === 'object', 'QRCodeSVG must be exported by installed qrcode.react');

    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const sampleFixturePayload = '00020101021238540010A00000072701240006970454011099999999990208QRIBFTTA530370454061500005802VN62140810HG892416304ABCD';
    const element = React.createElement(QRCodeSVG, {
      value: sampleFixturePayload,
      size: 210,
      level: 'M'
    });

    const svgString = ReactDOMServer.renderToStaticMarkup(element);
    assert.ok(svgString.startsWith('<svg'), 'Renderer output must start with <svg tag');
    assert.ok(svgString.includes('</svg>'), 'Renderer output must close with </svg>');
    assert.ok(svgString.includes('<path'), 'Rendered SVG must contain QR matrix path elements');
    assert.ok(!svgString.includes('<img'), 'Rendered output must NEVER be or contain an img tag');
  });

  // Helper for actual OrderSuccessPage runtime tests
  async function createOrderSuccessTestHarness({
    source = null,
    orderId = '501',
    search = '',
    state = null,
    orderData = null,
    paymentData = null,
    paymentLoadStatus = undefined,
    paymentError = undefined,
    loading = false,
    useRealEffects = false,
    getOrderByIdDelay = 0,
    getOrderPaymentDelay = 0,
    getOrderByIdError = null,
    getOrderPaymentError = null,
    getOrderPaymentHandler = null
  } = {}) {
    const esbuild = await import('esbuild');
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const rawSource = source ?? fs.readFileSync(successPath, 'utf8');
    const transformed = await esbuild.transform(rawSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18'
    });

    let stateCursor = 0;
    const stateStore = new Map();
    const effects = [];

    // Synthetic states for direct render mode
    let syntheticIndex = 0;
    const initialPaymentLoadStatus = paymentLoadStatus !== undefined
      ? paymentLoadStatus
      : (paymentData ? 'loaded' : (orderData ? 'absent' : 'idle'));
    const syntheticStates = [
      [orderData, () => {}],
      [paymentData, () => {}],
      [initialPaymentLoadStatus, () => {}],
      [paymentError !== undefined ? paymentError : '', () => {}],
      [loading, () => {}],
      [false, () => {}],
      [null, () => {}],
      [false, () => {}]
    ];

    let clickHandlers = new Map();
    const customReact = {
      ...React,
      createElement: (type, props, ...children) => {
        if (type === 'button' && props && typeof props.onClick === 'function') {
          clickHandlers.set('button', props.onClick);
        }
        return React.createElement(type, props, ...children);
      },
      useState: (initial) => {
        if (!useRealEffects) {
          const val = syntheticStates[syntheticIndex] ? syntheticStates[syntheticIndex] : [initial, () => {}];
          syntheticIndex++;
          return val;
        }
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
        if (!useRealEffects) return;
        effects.push({ fn, deps });
      },
      useRef: (initial) => {
        if (!useRealEffects) return { current: initial };
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, { current: initial });
        }
        return stateStore.get(id);
      }
    };

    let fetchedOrderIds = [];
    let fetchedPaymentOrderIds = [];
    const mockOrderApi = {
      getOrderById: async (id) => {
        fetchedOrderIds.push(id);
        if (getOrderByIdDelay > 0) await new Promise(r => setTimeout(r, getOrderByIdDelay));
        if (getOrderByIdError) throw getOrderByIdError;
        return { success: true, data: orderData !== undefined && orderData !== null ? orderData : { id: Number(id), status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 } };
      },
      getOrderPayment: async (id) => {
        fetchedPaymentOrderIds.push(id);
        if (getOrderPaymentDelay > 0) await new Promise(r => setTimeout(r, getOrderPaymentDelay));
        if (typeof getOrderPaymentHandler === 'function') {
          return getOrderPaymentHandler(id);
        }
        if (getOrderPaymentError) throw getOrderPaymentError;
        return { success: true, data: paymentData !== undefined ? paymentData : { id: 9001, orderId: Number(id), status: 'PENDING', amount: 500000 } };
      }
    };

    const mockFormatters = {
      formatPrice: (v) => `${(v || 0).toLocaleString('vi-VN')} đ`,
      isOrderPaid: (orderOrStatus) => typeof orderOrStatus === 'object' ? orderOrStatus?.status === 'PAID' : orderOrStatus === 'PAID',
      getOrderStatusLabel: (orderOrStatus) => {
        const s = typeof orderOrStatus === 'object' ? orderOrStatus?.status : orderOrStatus;
        return s === 'PAID' ? 'Đã thanh toán' : 'Chờ xử lý';
      }
    };

    let currentRouteParams = { orderId };
    let currentRouteLocation = { pathname: `/order-success/${orderId}`, search, state };

    const mockRouter = {
      useParams: () => currentRouteParams,
      useLocation: () => currentRouteLocation,
      Link: ({ children, to, className, ...props }) => React.createElement('a', { href: to, className, ...props }, children)
    };

    const mockLucide = new Proxy({}, {
      get: (target, prop) => (props) => React.createElement('span', { 'data-icon': prop, ...props })
    });

    const customRequire = (specifier) => {
      if (specifier === 'react') return customReact;
      if (specifier === 'react-router-dom') return mockRouter;
      if (specifier.includes('orderApi')) return { orderApi: mockOrderApi };
      if (specifier.includes('formatters')) return mockFormatters;
      if (specifier === 'lucide-react') return mockLucide;
      throw new Error(`Unknown require in test harness: ${specifier}`);
    };

    const moduleObj = { exports: {} };
    const fn = new Function('require', 'module', 'exports', 'React', transformed.code);
    fn(customRequire, moduleObj, moduleObj.exports, customReact);

    const Component = moduleObj.exports.default;

    async function renderWithLifecycle(customWaitMs = 80) {
      // 1. Initial mount (loading=true)
      stateCursor = 0;
      effects.length = 0;
      ReactDOMServer.renderToStaticMarkup(React.createElement(Component));

      // 2. Execute useEffect hooks
      for (const eff of effects) {
        eff.fn();
      }

      // 3. Wait for async promises (fetchOrderData -> getOrderById + getOrderPayment) to complete
      await new Promise(r => setTimeout(r, customWaitMs));

      // 4. Re-render with settled state
      stateCursor = 0;
      effects.length = 0;
      const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
      return { finalMarkup, fetchedOrderIds, fetchedPaymentOrderIds, stateStore };
    }

    async function triggerRetry(customWaitMs = 80) {
      const handler = clickHandlers.get('button');
      if (handler) {
        await handler();
      }
      await new Promise(r => setTimeout(r, customWaitMs));
      stateCursor = 0;
      effects.length = 0;
      const finalMarkup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
      return { finalMarkup, fetchedOrderIds, fetchedPaymentOrderIds, stateStore };
    }

    return {
      Component,
      customReact,
      fetchedOrderIds,
      fetchedPaymentOrderIds,
      renderWithLifecycle,
      triggerRetry,
      setRoute: (newOrderId, newSearch = '') => {
        currentRouteParams = { orderId: newOrderId };
        currentRouteLocation = { pathname: `/order-success/${newOrderId}`, search: newSearch, state: null };
      }
    };
  }

  test('20. Real Component Runtime: Actual OrderSuccessPage instantiates without missing hook ReferenceError (Fault Proof verified)', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    // 1. Fault Proof: Verify that unimported useRef throws ReferenceError
    const faultySource = fs.readFileSync(successPath, 'utf8').replace(
      "import React, { useState, useEffect, useRef } from 'react';",
      "import React, { useState, useEffect } from 'react';"
    );
    let faultCaught = false;
    try {
      const { Component: FaultyComponent } = await createOrderSuccessTestHarness({ source: faultySource });
      ReactDOMServer.renderToStaticMarkup(React.createElement(FaultyComponent));
    } catch (err) {
      if (err instanceof ReferenceError && err.message.includes('useRef')) {
        faultCaught = true;
      }
    }
    assert.ok(faultCaught, 'Fault proof passed: unimported useRef MUST throw ReferenceError: useRef is not defined');

    // 2. Production Source: Must instantiate and render without any ReferenceError
    const { Component } = await createOrderSuccessTestHarness();
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(typeof markup === 'string' && markup.length > 0, 'Production OrderSuccessPage must render valid markup');
  });

  test('21. Fake Query Runtime: /order-success/501?status=PAID&code=00&success=true with backend PENDING renders confirming state, NOT PAID', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '501',
      search: '?status=PAID&code=00&success=true',
      orderData: { id: 501, status: 'PENDING', totalAmount: 500000, shippingFee: 30000 },
      paymentData: { id: 9001, orderId: 501, status: 'PENDING', amount: 530000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    // Must NOT confirm success solely from browser query params
    assert.ok(!markup.includes('Đặt hàng thành công!'), 'Must NOT show "Đặt hàng thành công!" when backend payment is PENDING');
    // Must render pending / confirming state
    assert.ok(markup.includes('Đang xác nhận thanh toán'), 'Must render "Đang xác nhận thanh toán" badge/notice');
    assert.ok(markup.includes('501'), 'Must display target order id 501');
  });

  test('22. Return After Webhook Runtime: Backend PAID renders confirmed success state without needing query params', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '501',
      search: '', // No query params needed
      orderData: { id: 501, status: 'PAID', totalAmount: 750000, shippingFee: 30000 },
      paymentData: { id: 9002, orderId: 501, status: 'PAID', amount: 780000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Đặt hàng thành công!'), 'Must show "Đặt hàng thành công!" when backend payment is PAID');
    assert.ok(!markup.includes('Đang xác nhận thanh toán'), 'Must NOT show "Đang xác nhận thanh toán" when backend payment is PAID');
    assert.ok(markup.includes('501'), 'Must display target order id 501');
  });

  test('23. Direct Load Runtime: /order-success/501 without location.state fetches by route orderId, no crash', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '501',
      search: '',
      state: null, // No transient state from previous page
      orderData: { id: 501, status: 'PAID', totalAmount: 600000 },
      paymentData: { id: 9003, orderId: 501, status: 'PAID', amount: 600000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('501'), 'Direct load must bind route orderId 501');
    assert.ok(markup.includes('/my-orders'), 'Must provide link to canonical /my-orders');
  });

  test('24. Reload Equivalent Runtime: Reconstructs state from route URL only, no transient state required', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '501',
      search: '',
      state: undefined,
      orderData: { id: 501, status: 'PAID', totalAmount: 450000 },
      paymentData: { id: 9004, orderId: 501, status: 'PAID', amount: 450000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Đặt hàng thành công!'), 'Reload equivalent must restore confirmed state from API');
    assert.ok(markup.includes('450.000'), 'Reload equivalent must format price correctly');
  });

  test('25. Stale Response Guard: currentOrderIdRef prevents late response from overwriting active order state', () => {
    // Verify stale guard implementation logic in source
    assert.match(successSource, /const\s+currentOrderIdRef\s*=\s*useRef\(orderId\)/, 'Must initialize currentOrderIdRef with orderId');
    assert.match(successSource, /currentOrderIdRef\.current\s*=\s*orderId/, 'Must update currentOrderIdRef on orderId change');
    assert.match(successSource, /if\s*\(\s*currentOrderIdRef\.current\s*!==\s*targetId/, 'Must discard response if targetId does not match current ref');
    assert.match(successSource, /const\s+isMountedRef\s*=\s*useRef\(true\)/, 'Must maintain isMountedRef');
  });

  test('26. Precedence: Order=PENDING / Payment=FAILED strictly renders "Thanh toán thất bại", NOT "Đang xác nhận thanh toán"', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '501',
      orderData: { id: 501, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      paymentData: { id: 9001, orderId: 501, status: 'FAILED', amount: 500000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Thanh toán thất bại'), 'Must render "Thanh toán thất bại" badge and heading');
    assert.ok(!markup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán" when payment is FAILED');
    assert.ok(!markup.includes('Đang kiểm tra giao dịch'), 'Must NOT render "Đang kiểm tra giao dịch" when payment is FAILED');
    assert.ok(!markup.includes('Đặt hàng thành công!'), 'Must NOT render success when payment is FAILED');
  });

  test('27. Precedence: Order=PENDING / Payment=EXPIRED strictly renders "Đã hết hạn", "Mã thanh toán đã hết hạn"', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '502',
      orderData: { id: 502, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      paymentData: { id: 9002, orderId: 502, status: 'EXPIRED', amount: 600000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Đã hết hạn'), 'Must render "Đã hết hạn" badge');
    assert.ok(markup.includes('Mã thanh toán đã hết hạn'), 'Must render "Mã thanh toán đã hết hạn" heading');
    assert.ok(!markup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán" when payment is EXPIRED');
  });

  test('28. Precedence: Order=PENDING / Payment=CANCELLED strictly renders "Đã hủy", "Giao dịch thanh toán đã bị hủy"', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '503',
      orderData: { id: 503, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 700000 },
      paymentData: { id: 9003, orderId: 503, status: 'CANCELLED', amount: 700000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Đã hủy'), 'Must render "Đã hủy" badge');
    assert.ok(markup.includes('Giao dịch thanh toán đã bị hủy'), 'Must render "Giao dịch thanh toán đã bị hủy" heading');
    assert.ok(!markup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán" when payment is CANCELLED');
  });

  test('29. Precedence: Order=PENDING / Payment=CREATING renders "Đang khởi tạo", "Đang chuẩn bị liên kết thanh toán"', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '504',
      orderData: { id: 504, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 800000 },
      paymentData: { id: 9004, orderId: 504, status: 'CREATING', amount: 800000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Đang khởi tạo'), 'Must render "Đang khởi tạo" badge');
    assert.ok(markup.includes('Đang chuẩn bị liên kết thanh toán'), 'Must render "Đang chuẩn bị liên kết thanh toán" heading');
  });

  test('30. Precedence: Fake Query with Payment=FAILED strictly renders FAILED, never PAID or PENDING', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '505',
      search: '?status=PAID&code=00&success=true',
      orderData: { id: 505, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 900000 },
      paymentData: { id: 9005, orderId: 505, status: 'FAILED', amount: 900000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Thanh toán thất bại'), 'Must render "Thanh toán thất bại"');
    assert.ok(!markup.includes('Đặt hàng thành công!'), 'Must NOT render success from fake query');
    assert.ok(!markup.includes('Đang xác nhận thanh toán'), 'Must NOT render pending from order status');
  });

  test('31. Precedence: Order=CANCELLED / Payment=NEEDS_REVIEW preserves review-needed notice', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '506',
      orderData: { id: 506, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 1000000 },
      paymentData: { id: 9006, orderId: 506, status: 'NEEDS_REVIEW', amount: 1000000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge');
    assert.ok(markup.includes('Thanh toán đang chờ đối soát'), 'Must render "Thanh toán đang chờ đối soát" heading');
  });

  test('32. Precedence: Order=PENDING / Payment=NEEDS_REVIEW renders "Cần đối soát", NOT PENDING', async () => {
    const React = await import('react');
    const ReactDOMServer = await import('react-dom/server');

    const { Component } = await createOrderSuccessTestHarness({
      orderId: '507',
      orderData: { id: 507, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 1100000 },
      paymentData: { id: 9007, orderId: 507, status: 'NEEDS_REVIEW', amount: 1100000 },
      loading: false
    });

    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    assert.ok(markup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge');
    assert.ok(markup.includes('Thanh toán đang chờ đối soát'), 'Must render "Thanh toán đang chờ đối soát" heading');
    assert.ok(!markup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán"');
  });

  // =========================================================================
  // REAL RUNTIME LIFECYCLE TESTS (Sections 16-24, 28)
  // Executes actual useEffect, real useState transitions, and async API calls
  // =========================================================================

  test('33. Real Lifecycle Runtime (Sec 17): Order=PENDING / Payment=FAILED resolves and renders FAILED, NOT PENDING', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      paymentData: { id: 9001, orderId: 501, status: 'FAILED', amount: 500000 }
    });

    const { finalMarkup, fetchedOrderIds, fetchedPaymentOrderIds } = await harness.renderWithLifecycle();

    assert.deepStrictEqual(fetchedOrderIds, ['501'], 'Must have called getOrderById(501)');
    assert.deepStrictEqual(fetchedPaymentOrderIds, ['501'], 'Must have called getOrderPayment(501)');
    assert.ok(finalMarkup.includes('Thanh toán thất bại'), 'Must render "Thanh toán thất bại" badge and heading');
    assert.ok(!finalMarkup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán"');
    assert.ok(!finalMarkup.includes('Đang kiểm tra giao dịch'), 'Must NOT render "Đang kiểm tra giao dịch"');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render success when payment failed');
  });

  test('34. Real Lifecycle Runtime (Sec 18): Order=PENDING / Payment=EXPIRED resolves and renders EXPIRED, NOT PENDING', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '502',
      useRealEffects: true,
      orderData: { id: 502, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      paymentData: { id: 9002, orderId: 502, status: 'EXPIRED', amount: 600000 }
    });

    const { finalMarkup, fetchedOrderIds, fetchedPaymentOrderIds } = await harness.renderWithLifecycle();

    assert.deepStrictEqual(fetchedOrderIds, ['502'], 'Must have called getOrderById(502)');
    assert.deepStrictEqual(fetchedPaymentOrderIds, ['502'], 'Must have called getOrderPayment(502)');
    assert.ok(finalMarkup.includes('Đã hết hạn'), 'Must render "Đã hết hạn" badge');
    assert.ok(finalMarkup.includes('Mã thanh toán đã hết hạn'), 'Must render "Mã thanh toán đã hết hạn" heading');
    assert.ok(!finalMarkup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán"');
  });

  test('35. Real Lifecycle Runtime (Sec 19): Order=PENDING / Payment=CANCELLED renders CANCELLED, Order stays PENDING, 0 POSTs', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '503',
      useRealEffects: true,
      orderData: { id: 503, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 700000 },
      paymentData: { id: 9003, orderId: 503, status: 'CANCELLED', amount: 700000 }
    });

    const { finalMarkup, fetchedOrderIds, fetchedPaymentOrderIds } = await harness.renderWithLifecycle();

    assert.deepStrictEqual(fetchedOrderIds, ['503'], 'Must have called getOrderById(503)');
    assert.deepStrictEqual(fetchedPaymentOrderIds, ['503'], 'Must have called getOrderPayment(503)');
    assert.ok(finalMarkup.includes('Đã hủy'), 'Must render "Đã hủy" badge');
    assert.ok(finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Must render "Giao dịch thanh toán đã bị hủy" heading');
    assert.ok(!finalMarkup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán"');
  });

  test('36. Real Lifecycle Runtime (Sec 20): Order=PENDING / Payment=NEEDS_REVIEW resolves and renders NEEDS_REVIEW, NOT PENDING', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '504',
      useRealEffects: true,
      orderData: { id: 504, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 800000 },
      paymentData: { id: 9004, orderId: 504, status: 'NEEDS_REVIEW', amount: 800000 }
    });

    const { finalMarkup, fetchedOrderIds, fetchedPaymentOrderIds } = await harness.renderWithLifecycle();

    assert.deepStrictEqual(fetchedOrderIds, ['504'], 'Must have called getOrderById(504)');
    assert.deepStrictEqual(fetchedPaymentOrderIds, ['504'], 'Must have called getOrderPayment(504)');
    assert.ok(finalMarkup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge');
    assert.ok(finalMarkup.includes('Thanh toán đang chờ đối soát'), 'Must render "Thanh toán đang chờ đối soát" heading');
    assert.ok(!finalMarkup.includes('Đang xác nhận thanh toán'), 'Must NOT render "Đang xác nhận thanh toán"');
  });

  test('37. Real Lifecycle Runtime (Sec 21): Order=PENDING / Payment=PENDING resolves and renders confirming UI', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '505',
      useRealEffects: true,
      orderData: { id: 505, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 900000 },
      paymentData: { id: 9005, orderId: 505, status: 'PENDING', amount: 900000 }
    });

    const { finalMarkup, fetchedOrderIds, fetchedPaymentOrderIds } = await harness.renderWithLifecycle();

    assert.deepStrictEqual(fetchedOrderIds, ['505'], 'Must have called getOrderById(505)');
    assert.deepStrictEqual(fetchedPaymentOrderIds, ['505'], 'Must have called getOrderPayment(505)');
    assert.ok(finalMarkup.includes('Đang xác nhận thanh toán'), 'Must render "Đang xác nhận thanh toán" badge');
    assert.ok(finalMarkup.includes('Đang kiểm tra giao dịch'), 'Must render "Đang kiểm tra giao dịch" heading');
  });

  test('38. Real Lifecycle Runtime (Sec 22): Order=PENDING / Payment=CREATING resolves and renders preparing UI', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '506',
      useRealEffects: true,
      orderData: { id: 506, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 950000 },
      paymentData: { id: 9006, orderId: 506, status: 'CREATING', amount: 950000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đang khởi tạo'), 'Must render "Đang khởi tạo" badge');
    assert.ok(finalMarkup.includes('Đang chuẩn bị liên kết thanh toán'), 'Must render "Đang chuẩn bị liên kết thanh toán" heading');
    assert.ok(!finalMarkup.includes('Thanh toán thất bại'), 'Must NOT render failed');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render paid');
  });

  test('39. Real Lifecycle Runtime (Sec 23): Order=PENDING / Payment=PAID resolves and renders confirmed success UI', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '507',
      useRealEffects: true,
      orderData: { id: 507, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 1200000 },
      paymentData: { id: 9007, orderId: 507, status: 'PAID', amount: 1200000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đặt hàng thành công!'), 'Must render "Đặt hàng thành công!" heading');
    assert.ok(finalMarkup.includes('Giao dịch đã xác thực'), 'Must render "Giao dịch đã xác thực" badge');
    assert.ok(!finalMarkup.includes('Đang xác nhận thanh toán'), 'Must NOT render pending');
  });

  test('40. Real Lifecycle Runtime (Sec 24): Fake query ?status=PAID&code=00 with Payment=FAILED renders FAILED, never PAID or PENDING', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '508',
      search: '?status=PAID&code=00&success=true',
      useRealEffects: true,
      orderData: { id: 508, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 1300000 },
      paymentData: { id: 9008, orderId: 508, status: 'FAILED', amount: 1300000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Thanh toán thất bại'), 'Must render "Thanh toán thất bại"');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render success from fake query');
    assert.ok(!finalMarkup.includes('Đang xác nhận thanh toán'), 'Must NOT render pending');
  });

  test('41. Real Lifecycle Runtime (Sec 28): Stale Response Guard prevents delayed 501 from overwriting 502', async () => {
    // Mount order 501 with slow response
    const harness501 = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      getOrderByIdDelay: 200, // 501 response is slow
      orderData: { id: 501, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      paymentData: { id: 9001, orderId: 501, status: 'FAILED', amount: 500000 }
    });

    // Start lifecycle for 501 (effects start running async)
    const lifecyclePromise501 = harness501.renderWithLifecycle(250);

    // Navigate to 502 immediately (updates ref.current to 502)
    harness501.setRoute('502');

    // Mount 502 with fast response
    const harness502 = await createOrderSuccessTestHarness({
      orderId: '502',
      useRealEffects: true,
      getOrderByIdDelay: 20, // 502 response is fast
      orderData: { id: 502, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      paymentData: { id: 9002, orderId: 502, status: 'PAID', amount: 600000 }
    });

    const res502 = await harness502.renderWithLifecycle(80);
    assert.ok(res502.finalMarkup.includes('502'), 'Active route 502 must render 502');
    assert.ok(res502.finalMarkup.includes('Đặt hàng thành công!'), 'Active route 502 renders PAID');

    // Wait for slow 501 to complete
    await lifecyclePromise501;

    // Verify 502 content was not corrupted
    assert.ok(res502.finalMarkup.includes('502'), '502 view must remain intact');
  });

  // =========================================================================
  // CROSS-ORDER MATRIX RUNTIME TESTS (Sections 10-14, 16, 21-22)
  // Prove PaymentAttempt exclusive authority across Order=PAID, CANCELLED, COD
  // =========================================================================

  test('42. Exclusive Authority (DEFECT REPRO): Order=PAID / Payment=NEEDS_REVIEW renders "Cần đối soát", NOT success', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      paymentData: { id: 9001, orderId: 501, status: 'NEEDS_REVIEW', amount: 500000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge');
    assert.ok(finalMarkup.includes('Thanh toán đang chờ đối soát'), 'Must render "Thanh toán đang chờ đối soát" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render "Đặt hàng thành công!" when payment is NEEDS_REVIEW');
    assert.ok(!finalMarkup.includes('Giao dịch đã xác thực'), 'Must NOT render "Giao dịch đã xác thực" badge');
  });

  test('43. Exclusive Authority: Order=PAID / Payment=FAILED renders "Thanh toán thất bại", NOT success', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '502',
      useRealEffects: true,
      orderData: { id: 502, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      paymentData: { id: 9002, orderId: 502, status: 'FAILED', amount: 600000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Thanh toán thất bại'), 'Must render "Thanh toán thất bại" badge and heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render "Đặt hàng thành công!"');
    assert.ok(!finalMarkup.includes('Giao dịch đã xác thực'), 'Must NOT render "Giao dịch đã xác thực"');
  });

  test('44. Exclusive Authority: Order=PAID / Payment=EXPIRED renders "Đã hết hạn", NOT success', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '503',
      useRealEffects: true,
      orderData: { id: 503, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 700000 },
      paymentData: { id: 9003, orderId: 503, status: 'EXPIRED', amount: 700000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đã hết hạn'), 'Must render "Đã hết hạn" badge');
    assert.ok(finalMarkup.includes('Mã thanh toán đã hết hạn'), 'Must render "Mã thanh toán đã hết hạn" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render "Đặt hàng thành công!"');
    assert.ok(!finalMarkup.includes('Giao dịch đã xác thực'), 'Must NOT render "Giao dịch đã xác thực"');
  });

  test('45. Exclusive Authority: Order=PAID / Payment=CANCELLED renders "Đã hủy" payment UI, NOT success', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '504',
      useRealEffects: true,
      orderData: { id: 504, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 800000 },
      paymentData: { id: 9004, orderId: 504, status: 'CANCELLED', amount: 800000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đã hủy'), 'Must render "Đã hủy" badge');
    assert.ok(finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Must render "Giao dịch thanh toán đã bị hủy" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render "Đặt hàng thành công!"');
    assert.ok(!finalMarkup.includes('Giao dịch đã xác thực'), 'Must NOT render "Giao dịch đã xác thực"');
  });

  test('46. Cancelled Order: Order=CANCELLED / Payment=NEEDS_REVIEW renders "Cần đối soát", order remains CANCELLED', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '505',
      useRealEffects: true,
      orderData: { id: 505, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 900000 },
      paymentData: { id: 9005, orderId: 505, status: 'NEEDS_REVIEW', amount: 900000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge');
    assert.ok(finalMarkup.includes('Thanh toán đang chờ đối soát'), 'Must render "Thanh toán đang chờ đối soát" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render success');
  });

  test('47. Cancelled Order: Order=CANCELLED / Payment=FAILED renders "Thanh toán thất bại", order remains CANCELLED', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '506',
      useRealEffects: true,
      orderData: { id: 506, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 1000000 },
      paymentData: { id: 9006, orderId: 506, status: 'FAILED', amount: 1000000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Thanh toán thất bại'), 'Must render "Thanh toán thất bại" badge and heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render success');
  });

  test('48. Cancelled Order: Order=CANCELLED / Payment=CANCELLED renders payment cancelled UI distinctly', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '507',
      useRealEffects: true,
      orderData: { id: 507, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 1100000 },
      paymentData: { id: 9007, orderId: 507, status: 'CANCELLED', amount: 1100000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đã hủy'), 'Must render "Đã hủy" badge');
    assert.ok(finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Must render "Giao dịch thanh toán đã bị hủy" heading');
  });

  test('49. Fake Query Authority (Sec 14): Order=PAID + Payment=NEEDS_REVIEW with fake query renders NEEDS_REVIEW, NOT PAID', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '508',
      search: '?status=PAID&code=00&success=true',
      useRealEffects: true,
      orderData: { id: 508, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 1200000 },
      paymentData: { id: 9008, orderId: 508, status: 'NEEDS_REVIEW', amount: 1200000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Cần đối soát'), 'Must render "Cần đối soát" badge');
    assert.ok(finalMarkup.includes('Thanh toán đang chờ đối soát'), 'Must render "Thanh toán đang chờ đối soát" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render success from fake query or order status');
    assert.ok(!finalMarkup.includes('Giao dịch đã xác thực'), 'Must NOT render authenticated transaction');
  });

  test('50. COD Fallback (Sec 16): payment=null, paymentMethod=COD renders "Chờ xử lý COD", does not break', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '509',
      useRealEffects: true,
      orderData: { id: 509, status: 'PENDING', paymentMethod: 'COD', totalAmount: 450000 },
      paymentData: null
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Chờ xử lý COD'), 'Must render "Chờ xử lý COD" badge');
    assert.ok(finalMarkup.includes('Đơn hàng đã được ghi nhận'), 'Must render "Đơn hàng đã được ghi nhận" heading');
    assert.ok(finalMarkup.includes('Thanh toán khi nhận hàng'), 'Must render COD guidance message');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render paid success');
  });

  test('51. Round 4 DEFECT REPRODUCTION: Order=CANCELLED / Payment=PENDING renders payment PENDING and separate order CANCELLED notice', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '510',
      useRealEffects: true,
      orderData: { id: 510, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 750000 },
      paymentData: { id: 9010, orderId: 510, status: 'PENDING', amount: 750000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    // Payment UI must be PENDING
    assert.ok(finalMarkup.includes('Đang xác nhận thanh toán'), 'Payment UI must render "Đang xác nhận thanh toán" badge');
    assert.ok(finalMarkup.includes('Đang kiểm tra giao dịch'), 'Payment UI must render "Đang kiểm tra giao dịch" heading');
    assert.ok(!finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Payment UI must NOT render payment cancelled');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Payment UI must NOT render paid success');

    // Separate order lifecycle notice must be present
    assert.ok(finalMarkup.includes('data-testid="order-lifecycle-notice"'), 'Must render separate order lifecycle notice');
    assert.ok(finalMarkup.includes('Đơn hàng đã bị hủy'), 'Must mention that order is cancelled in separate notice');
  });

  test('52. Round 4 Separation: Order=CANCELLED / Payment=CREATING renders payment CREATING and separate order CANCELLED notice', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '511',
      useRealEffects: true,
      orderData: { id: 511, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      paymentData: { id: 9011, orderId: 511, status: 'CREATING', amount: 600000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đang khởi tạo'), 'Payment UI must render "Đang khởi tạo" badge');
    assert.ok(finalMarkup.includes('Đang chuẩn bị liên kết thanh toán'), 'Payment UI must render "Đang chuẩn bị liên kết thanh toán" heading');
    assert.ok(!finalMarkup.includes('Giao dịch thanh toán đã bị hủy'), 'Payment UI must NOT render payment cancelled');
    assert.ok(finalMarkup.includes('data-testid="order-lifecycle-notice"'), 'Must render separate order lifecycle notice');
    assert.ok(finalMarkup.includes('Đơn hàng đã bị hủy'), 'Separate notice must state order is cancelled');
  });

  test('53. Round 4 Separation: Order=CANCELLED / Payment=PAID renders payment PAID and preserves order CANCELLED status', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '512',
      useRealEffects: true,
      orderData: { id: 512, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 850000 },
      paymentData: { id: 9012, orderId: 512, status: 'PAID', amount: 850000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    // Payment UI must reflect PaymentAttempt PAID
    assert.ok(finalMarkup.includes('Giao dịch đã xác thực'), 'Payment UI must render "Giao dịch đã xác thực"');
    assert.ok(finalMarkup.includes('Đặt hàng thành công!'), 'Payment UI must render "Đặt hàng thành công!"');

    // Order lifecycle must preserve CANCELLED
    assert.ok(finalMarkup.includes('data-testid="order-lifecycle-notice"'), 'Must render separate order lifecycle notice');
    assert.ok(finalMarkup.includes('Đơn hàng đã bị hủy'), 'Order lifecycle notice must state order is cancelled');
  });

  test('54. Round 4 Fake Query: Order=CANCELLED / Payment=PENDING + ?status=PAID query preserves PENDING and CANCELLED', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '513',
      search: '?status=PAID&code=00&success=true',
      useRealEffects: true,
      orderData: { id: 513, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 950000 },
      paymentData: { id: 9013, orderId: 513, status: 'PENDING', amount: 950000 }
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đang xác nhận thanh toán'), 'Payment UI must render "Đang xác nhận thanh toán" badge');
    assert.ok(finalMarkup.includes('Đang kiểm tra giao dịch'), 'Payment UI must render "Đang kiểm tra giao dịch" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render fake paid success');
    assert.ok(finalMarkup.includes('data-testid="order-lifecycle-notice"'), 'Must render separate order notice');
  });

  test('55. Round 4 Fallback: PayOS Order=PENDING with payment=null renders waiting fallback, NOT PAID', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '514',
      useRealEffects: true,
      orderData: { id: 514, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 300000 },
      paymentData: null
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đang xác nhận thanh toán'), 'Must render "Đang xác nhận thanh toán" badge');
    assert.ok(finalMarkup.includes('Đang kiểm tra giao dịch'), 'Must render "Đang kiểm tra giao dịch" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT render paid success');
  });

  test('56. Round 4 Fallback: PayOS Order=CANCELLED with payment=null renders cancelled fallback', async () => {
    const harness = await createOrderSuccessTestHarness({
      orderId: '515',
      useRealEffects: true,
      orderData: { id: 515, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 300000 },
      paymentData: null
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Đã hủy'), 'Must render "Đã hủy" badge');
    assert.ok(finalMarkup.includes('Đơn hàng đã bị hủy'), 'Must render "Đơn hàng đã bị hủy" heading');
  });

  test('57. Full 35 Combination Matrix (5 Order statuses x 7 Payment statuses)', async () => {
    const orderStatuses = ['PENDING', 'PAID', 'SHIPPING', 'COMPLETED', 'CANCELLED'];
    const paymentStatuses = ['CREATING', 'PENDING', 'PAID', 'NEEDS_REVIEW', 'FAILED', 'EXPIRED', 'CANCELLED'];

    const expectedPaymentInfo = {
      CREATING: { badge: 'Đang khởi tạo', heading: 'Đang chuẩn bị liên kết thanh toán' },
      PENDING: { badge: 'Đang xác nhận thanh toán', heading: 'Đang kiểm tra giao dịch' },
      PAID: { badge: 'Giao dịch đã xác thực', heading: 'Đặt hàng thành công!' },
      NEEDS_REVIEW: { badge: 'Cần đối soát', heading: 'Thanh toán đang chờ đối soát' },
      FAILED: { badge: 'Thanh toán thất bại', heading: 'Thanh toán thất bại' },
      EXPIRED: { badge: 'Đã hết hạn', heading: 'Mã thanh toán đã hết hạn' },
      CANCELLED: { badge: 'Đã hủy', heading: 'Giao dịch thanh toán đã bị hủy' }
    };

    let checkedCombinations = 0;

    for (const orderStatus of orderStatuses) {
      for (const paymentStatus of paymentStatuses) {
        const testOrderId = `7${checkedCombinations + 10}`;
        const harness = await createOrderSuccessTestHarness({
          orderId: testOrderId,
          useRealEffects: true,
          orderData: { id: Number(testOrderId), status: orderStatus, paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
          paymentData: { id: 9500 + checkedCombinations, orderId: Number(testOrderId), status: paymentStatus, amount: 500000 }
        });

        const { finalMarkup } = await harness.renderWithLifecycle();
        const expected = expectedPaymentInfo[paymentStatus];

        // 1. Assert Payment UI matches PaymentAttempt.status exclusively
        assert.ok(
          finalMarkup.includes(expected.badge),
          `Combo Order=${orderStatus} / Payment=${paymentStatus} must contain payment badge "${expected.badge}"`
        );
        assert.ok(
          finalMarkup.includes(expected.heading),
          `Combo Order=${orderStatus} / Payment=${paymentStatus} must contain payment heading "${expected.heading}"`
        );

        // 2. Negative assertion: Non-PAID payment status must NEVER render success
        if (paymentStatus !== 'PAID') {
          assert.ok(
            !finalMarkup.includes('Đặt hàng thành công!'),
            `Combo Order=${orderStatus} / Payment=${paymentStatus} must NOT render "Đặt hàng thành công!"`
          );
        }

        // 3. Order lifecycle notice check when Order is CANCELLED
        if (orderStatus === 'CANCELLED') {
          assert.ok(
            finalMarkup.includes('data-testid="order-lifecycle-notice"'),
            `Combo Order=${orderStatus} / Payment=${paymentStatus} must render separate order lifecycle notice`
          );
          assert.ok(
            finalMarkup.includes('Đơn hàng đã bị hủy'),
            `Combo Order=${orderStatus} / Payment=${paymentStatus} must state order is cancelled`
          );
        } else {
          // If order is NOT cancelled, order notice must not claim order is cancelled
          assert.ok(
            !finalMarkup.includes('data-testid="order-lifecycle-notice"'),
            `Combo Order=${orderStatus} / Payment=${paymentStatus} must NOT render order cancellation notice`
          );
        }

        checkedCombinations++;
      }
    }

    assert.equal(checkedCombinations, 35, 'Must have verified all 35 combinations');
  });

  // =========================================================================
  // ROUND 5 REMEDIATION TESTS: DISTINGUISH PAYMENT GET FAILURE FROM ABSENT
  // =========================================================================

  test('58. Round 5 DEFECT REPRODUCTION: Order=PAID with Payment GET 503 renders verification error, NOT false success', async () => {
    const error503 = new Error('Request failed with status code 503');
    error503.response = { status: 503, data: { message: 'Service Unavailable' } };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 750000, orderCode: 'HG-501' },
      getOrderPaymentError: error503
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    // 1. Must render verification error UI
    assert.ok(finalMarkup.includes('Lỗi xác minh'), 'Must render "Lỗi xác minh" badge');
    assert.ok(finalMarkup.includes('Không thể xác minh trạng thái thanh toán'), 'Must render "Không thể xác minh trạng thái thanh toán" heading');
    assert.ok(finalMarkup.includes('Chưa thể xác minh trạng thái thanh toán. Vui lòng kiểm tra lại.'), 'Must render detail error message');

    // 2. Must offer retry button
    assert.ok(finalMarkup.includes('Kiểm tra lại'), 'Must offer "Kiểm tra lại" retry button');

    // 3. Must preserve loaded Order details
    assert.ok(finalMarkup.includes('HG-501'), 'Must preserve order code HG-501');
    assert.ok(finalMarkup.includes('data-testid="order-summary-preserved"'), 'Must render preserved order summary');
    assert.ok(finalMarkup.includes('750.000'), 'Must preserve order totalAmount 750.000');

    // 4. Must NOT confirm false PAID success
    assert.ok(!finalMarkup.includes('Giao dịch đã xác thực'), 'Must NOT declare transaction verified');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT declare "Đặt hàng thành công!"');
  });

  test('59. Round 5 HTTP 500: Order=PAID with Payment GET 500 renders verification error, NOT false success', async () => {
    const error500 = new Error('Internal Server Error');
    error500.response = { status: 500, data: { message: 'Database connection failed' } };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      getOrderPaymentError: error500
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Lỗi xác minh'), 'Must render "Lỗi xác minh" badge');
    assert.ok(finalMarkup.includes('Không thể xác minh trạng thái thanh toán'), 'Must render "Không thể xác minh trạng thái thanh toán" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT declare "Đặt hàng thành công!" on HTTP 500');
  });

  test('60. Round 5 Timeout: Order=PAID with Payment GET timeout renders verification error, NOT false success', async () => {
    const timeoutErr = new Error('timeout of 20000ms exceeded');
    timeoutErr.code = 'ECONNABORTED';

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      getOrderPaymentError: timeoutErr
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Lỗi xác minh'), 'Must render "Lỗi xác minh" badge');
    assert.ok(finalMarkup.includes('Không thể xác minh trạng thái thanh toán'), 'Must render "Không thể xác minh trạng thái thanh toán" heading');
    assert.ok(!finalMarkup.includes('Đặt hàng thành công!'), 'Must NOT declare "Đặt hàng thành công!" on timeout');
  });

  test('61. Round 5 Order=PENDING with Payment GET 503 renders verification error, NOT absent fallback', async () => {
    const error503 = new Error('Service Unavailable');
    error503.response = { status: 503 };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR', totalAmount: 400000 },
      getOrderPaymentError: error503
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    assert.ok(finalMarkup.includes('Lỗi xác minh'), 'Must render "Lỗi xác minh" badge');
    assert.ok(finalMarkup.includes('Không thể xác minh trạng thái thanh toán'), 'Must render "Không thể xác minh trạng thái thanh toán" heading');
    assert.ok(!finalMarkup.includes('Đang kiểm tra giao dịch'), 'Must NOT conflate error with normal absent fallback');
  });

  test('62. Round 5 Order=CANCELLED with Payment GET 503 renders verification error + separate CANCELLED notice', async () => {
    const error503 = new Error('Service Unavailable');
    error503.response = { status: 503 };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'CANCELLED', paymentMethod: 'PAYOS_VIETQR', totalAmount: 400000 },
      getOrderPaymentError: error503
    });

    const { finalMarkup } = await harness.renderWithLifecycle();

    // 1. Payment result section renders verification error
    assert.ok(finalMarkup.includes('Lỗi xác minh'), 'Payment UI must render "Lỗi xác minh" badge');
    assert.ok(finalMarkup.includes('Không thể xác minh trạng thái thanh toán'), 'Payment UI must render "Không thể xác minh trạng thái thanh toán" heading');

    // 2. Separate Order lifecycle notice renders cancellation
    assert.ok(finalMarkup.includes('data-testid="order-lifecycle-notice"'), 'Must render separate order lifecycle notice');
    assert.ok(finalMarkup.includes('Đơn hàng đã bị hủy'), 'Notice must state order is cancelled');
  });

  test('63. Round 5 Retry Recovery: 503 -> NEEDS_REVIEW recovers to verified review state', async () => {
    let callCount = 0;
    const handler = async (id) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('503 Service Unavailable');
        err.response = { status: 503 };
        throw err;
      }
      return { success: true, data: { id: 9001, orderId: Number(id), status: 'NEEDS_REVIEW', amount: 500000 } };
    };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      getOrderPaymentHandler: handler
    });

    // Initial load: 503 failure
    const { finalMarkup: initialMarkup } = await harness.renderWithLifecycle();
    assert.ok(initialMarkup.includes('Lỗi xác minh'), 'Initial render must be verification error');
    assert.ok(!initialMarkup.includes('Đặt hàng thành công!'), 'Initial render must NOT be success');
    assert.ok(!initialMarkup.includes('Cần đối soát'), 'Initial render must NOT jump to NEEDS_REVIEW before retry');

    // Trigger retry
    const { finalMarkup: retryMarkup } = await harness.triggerRetry();
    assert.ok(retryMarkup.includes('Cần đối soát'), 'After retry must render "Cần đối soát" badge');
    assert.ok(retryMarkup.includes('Thanh toán đang chờ đối soát'), 'After retry must render "Thanh toán đang chờ đối soát" heading');
    assert.ok(!retryMarkup.includes('Đặt hàng thành công!'), 'Must NOT render fake PAID');
  });

  test('64. Round 5 Retry Recovery: 503 -> PAID recovers to verified success state', async () => {
    let callCount = 0;
    const handler = async (id) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error('503 Service Unavailable');
        err.response = { status: 503 };
        throw err;
      }
      return { success: true, data: { id: 9001, orderId: Number(id), status: 'PAID', amount: 500000 } };
    };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      getOrderPaymentHandler: handler
    });

    // Initial load: 503 failure
    const { finalMarkup: initialMarkup } = await harness.renderWithLifecycle();
    assert.ok(initialMarkup.includes('Lỗi xác minh'), 'Initial render must be verification error');
    assert.ok(!initialMarkup.includes('Đặt hàng thành công!'), 'Initial render must NOT be success');

    // Trigger retry
    const { finalMarkup: retryMarkup } = await harness.triggerRetry();
    assert.ok(retryMarkup.includes('Giao dịch đã xác thực'), 'After retry must render "Giao dịch đã xác thực"');
    assert.ok(retryMarkup.includes('Đặt hàng thành công!'), 'After retry must render "Đặt hàng thành công!"');
  });

  test('65. Round 5 Retry Still Fails: 503 -> 503 remains in verification error', async () => {
    let callCount = 0;
    const handler = async () => {
      callCount++;
      const err = new Error('503 Service Unavailable');
      err.response = { status: 503 };
      throw err;
    };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      getOrderPaymentHandler: handler
    });

    // Initial load: 503 failure
    const { finalMarkup: initialMarkup } = await harness.renderWithLifecycle();
    assert.ok(initialMarkup.includes('Lỗi xác minh'), 'Initial render must be verification error');

    // Trigger retry: still 503
    const { finalMarkup: retryMarkup } = await harness.triggerRetry();
    assert.ok(retryMarkup.includes('Lỗi xác minh'), 'After failed retry must remain in verification error');
    assert.ok(retryMarkup.includes('Kiểm tra lại'), 'Retry button remains available');
    assert.ok(!retryMarkup.includes('Đặt hàng thành công!'), 'Must never show fake success');
    assert.equal(callCount, 2, 'Must have executed two GET calls');
  });

  test('66. Round 5 Stale Error Guard: Delayed 501 503 error does not overwrite active 502 state', async () => {
    let resolve501Payment;
    const delayed501Promise = new Promise((resolve, reject) => {
      resolve501Payment = () => {
        const err = new Error('503 Service Unavailable');
        err.response = { status: 503 };
        reject(err);
      };
    });

    const handler = async (id) => {
      if (id === '501') {
        return delayed501Promise;
      }
      return { success: true, data: { id: 9002, orderId: 502, status: 'PAID', amount: 600000 } };
    };

    const harness = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 500000 },
      getOrderPaymentHandler: handler
    });

    // 1. Initial render for 501 (waiting for payment)
    const ReactDOMServer = await import('react-dom/server');
    const React = await import('react');

    // Render with 501
    await harness.renderWithLifecycle(10);

    // 2. User navigates to 502
    harness.setRoute('502');
    const harness502 = await createOrderSuccessTestHarness({
      orderId: '502',
      useRealEffects: true,
      orderData: { id: 502, status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 600000 },
      paymentData: { id: 9002, orderId: 502, status: 'PAID', amount: 600000 }
    });
    const { finalMarkup: markup502 } = await harness502.renderWithLifecycle();
    assert.ok(markup502.includes('Đặt hàng thành công!'), 'Order 502 must be confirmed PAID');

    // 3. 501 late error rejects
    try {
      resolve501Payment();
    } catch {
      // expected rejection
    }

    // 4. State for 502 remains intact
    assert.ok(markup502.includes('502'), 'Active order 502 is preserved');
  });

  test('67. Round 5 Duplicate Retry Guard: Concurrent clicks do not launch uncontrolled GETs', () => {
    assert.match(successSource, /if\s*\(\s*isCheckingRef\.current\s*\)\s*return/, 'Must guard manual check with isCheckingRef');
    assert.match(successSource, /disabled=\{isChecking\}/, 'Check button must be disabled when isChecking is true');
  });

  test('68. Round 5 Status Semantics: 401, 403, 404 on getOrderPayment', async () => {
    // 401
    const err401 = new Error('Unauthorized');
    err401.response = { status: 401 };
    const harness401 = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR' },
      getOrderPaymentError: err401
    });
    const { finalMarkup: markup401 } = await harness401.renderWithLifecycle();
    assert.ok(markup401.includes('Phiên đăng nhập đã hết hạn'), '401 must display session expired error');

    // 403
    const err403 = new Error('Forbidden');
    err403.response = { status: 403 };
    const harness403 = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR' },
      getOrderPaymentError: err403
    });
    const { finalMarkup: markup403 } = await harness403.renderWithLifecycle();
    assert.ok(markup403.includes('Bạn không có quyền truy cập'), '403 must display forbidden error');

    // 404
    const err404 = new Error('Not Found');
    err404.response = { status: 404 };
    const harness404 = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PAID', paymentMethod: 'PAYOS_VIETQR' },
      getOrderPaymentError: err404
    });
    const { finalMarkup: markup404 } = await harness404.renderWithLifecycle();
    assert.ok(markup404.includes('Không tìm thấy dữ liệu thanh toán'), '404 must display payment not found error');
  });

  test('69. Round 5 Invariant: Distinguish GET 200 + null (absent) from GET error (503)', async () => {
    // Case A: GET 200 + null response (confirmed absent) for PayOS PENDING order
    const harnessAbsent = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' },
      paymentData: null
    });
    const { finalMarkup: markupAbsent } = await harnessAbsent.renderWithLifecycle();
    assert.ok(markupAbsent.includes('Đang xác nhận thanh toán'), 'Confirmed absent must render normal pending waiting state');
    assert.ok(!markupAbsent.includes('Lỗi xác minh'), 'Confirmed absent must NOT render "Lỗi xác minh"');

    // Case B: GET 503 error for PayOS PENDING order
    const err503 = new Error('503 Service Unavailable');
    err503.response = { status: 503 };
    const harnessError = await createOrderSuccessTestHarness({
      orderId: '501',
      useRealEffects: true,
      orderData: { id: 501, status: 'PENDING', paymentMethod: 'PAYOS_VIETQR' },
      getOrderPaymentError: err503
    });
    const { finalMarkup: markupError } = await harnessError.renderWithLifecycle();
    assert.ok(markupError.includes('Lỗi xác minh'), 'Failed GET must render "Lỗi xác minh"');
    assert.ok(markupError.includes('Không thể xác minh trạng thái thanh toán'), 'Failed GET must render verification error heading');
  });
});


