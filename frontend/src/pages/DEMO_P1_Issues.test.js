import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'esbuild';
import * as formatters from '../utils/formatters.js';
import OrderItemOptions, { formatOrderItemOptionsText } from '../utils/orderItemOptions.js';

const require = createRequire(import.meta.url);
const customerHelpers = await import('data:text/javascript;base64,' +
  Buffer.from(fs.readFileSync('src/utils/adminCustomers.jsx', 'utf8')).toString('base64'));

function compileOrderModule(file, modules) {
  const instance = { exports: {} };
  const compiled = transformSync(fs.readFileSync(file, 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', compiled)(name => modules[name] || require(name), instance, instance.exports);
  return instance.exports;
}

function loadOrderPage(page, selectedOrder = null, searchTerm = '', activeTab = 'ALL') {
  let index = 0;
  const patchedReact = { ...React, useEffect: () => {}, useRef: value => ({ current: value }),
    useState: initial => [++index === 2 ? selectedOrder ? [selectedOrder] : [] : index === 3 ? false :
      page === 'MyOrdersPage' && index === 4 ? activeTab : page === 'MyOrdersPage' && index === 5 ? searchTerm :
      index === 7 ? selectedOrder : typeof initial === 'function' ? initial() : initial, () => {}] };
  const layout = { default: props => React.createElement('div', null, props.children), __esModule: true };
  const modules = { react: patchedReact, '../utils/formatters': formatters,
    '../components/AdminLayout': layout, '../components/UserLayout': layout,
    '../api/adminApi': { adminApi: {} }, '../api/orderApi': { orderApi: {} },
    '../utils/adminCustomers.jsx': customerHelpers,
    '../components/OrderItemOptions': { default: OrderItemOptions, formatOrderItemOptionsText, __esModule: true },
    '../components/ProductImage': compileOrderModule('src/components/ProductImage.jsx', { react: React }),
    '../components/AdminProductImport': { saveAdminFile: () => {} },
    'react-router-dom': { Link: props => React.createElement('a', { href: props.to }, props.children) },
    'lucide-react': new Proxy({}, { get: () => () => null }) };
  return compileOrderModule(`src/pages/${page}.jsx`, modules);
}

function orderFixture() {
  return { id: 17, status: 'PENDING', paymentMethod: 'COD', totalAmount: 500000, shippingFee: 0,
    items: [{ id: 1, productName: 'Vợt Yonex kiểm thử', productSku: 'HG-RACKET-017', quantity: 2, price: 100000,
      selectedColor: 'Vàng', selectedWeight: '4U-G5' },
    { id: 2, productName: 'Áo Victor kiểm thử', productSku: 'HG-APPAREL-018', quantity: 3, price: 100000,
      selectedSize: 'M', selectedColor: 'Đen' }] };
}

describe('ACADEMIC DEMO READINESS — 4 CRITICAL P1 DEFECTS VERIFICATION', () => {

  // =========================================================================
  // DEMO-P1-01 (FIX-005): Sweatband Detail Award icon ReferenceError remediation
  // =========================================================================
  describe('DEMO-P1-01: SweatbandDetailPage Award Icon Verification', () => {
    const sweatbandPath = path.resolve('src/pages/SweatbandDetailPage.jsx');
    const content = fs.readFileSync(sweatbandPath, 'utf8');

    test('Award icon is properly imported from lucide-react', () => {
      // Must import Award from 'lucide-react'
      const importMatch = content.match(/import\s*\{[^}]*\}\s*from\s*['"]lucide-react['"]/);
      assert.ok(importMatch, 'Must have lucide-react import');
      assert.ok(importMatch[0].includes('Award'), 'Must import Award icon in lucide-react imports');
    });

    test('Award icon usage in JSX has matching import declaration', () => {
      assert.ok(content.includes('<Award'), 'Must use Award component in JSX');
      assert.ok(!content.includes('Award is not defined'), 'No undefined reference');
    });
  });

  // =========================================================================
  // DEMO-P1-02 (FIX-009): Add to Cart False Success Elimination
  // =========================================================================
  describe('DEMO-P1-02: Add to Cart False Success Elimination', () => {
    const productDetailPath = path.resolve('src/pages/ProductDetailPage.jsx');
    const sweatbandPath = path.resolve('src/pages/SweatbandDetailPage.jsx');
    const stringPath = path.resolve('src/pages/StringDetailPage.jsx');
    const shuttlecockPath = path.resolve('src/pages/ShuttlecockDetailPage.jsx');
    const gripPath = path.resolve('src/pages/RacketGripDetailPage.jsx');

    test('ProductDetailPage verifies addToCart return value before setting addedToast', () => {
      const content = fs.readFileSync(productDetailPath, 'utf8');
      // Must check if (cartItemId) before setAddedToast(true)
      assert.ok(
        content.includes('const cartItemId = addToCart(product, quantity, getProductOptions());'),
        'Must capture cartItemId from addToCart'
      );
      assert.ok(
        content.includes('if (cartItemId) {') && content.includes('setCartError('),
        'Must branch on cartItemId and set error when null'
      );
      // Buy now must NOT navigate if cartItemId is null
      assert.ok(
        content.includes("navigate('/checkout', { state: { selectedItemIds: [cartItemId] } });"),
        'Must navigate with valid cartItemId only'
      );
    });

    test('Accessory detail pages verify addToCart return value before toast', () => {
      const sweatContent = fs.readFileSync(sweatbandPath, 'utf8');
      assert.ok(sweatContent.includes('if (cartItemId) {'), 'Sweatband must branch on cartItemId');

      const stringContent = fs.readFileSync(stringPath, 'utf8');
      assert.ok(stringContent.includes('if (cartItemId) {'), 'String must branch on cartItemId');

      const shuttleContent = fs.readFileSync(shuttlecockPath, 'utf8');
      assert.ok(shuttleContent.includes('if (cartItemId) {'), 'Shuttlecock must branch on cartItemId');

      const gripContent = fs.readFileSync(gripPath, 'utf8');
      assert.ok(gripContent.includes('if (cartItemId) {'), 'Racket grip must branch on cartItemId');
    });
  });

  // =========================================================================
  // DEMO-P1-03 (FIX-011): Review API 401 & Fake Reviews Elimination
  // =========================================================================
  describe('DEMO-P1-03: Review API 401 and Fake Reviews Elimination', () => {
    const productDetailPath = path.resolve('src/pages/ProductDetailPage.jsx');
    const content = fs.readFileSync(productDetailPath, 'utf8');

    test('Eliminated fallback fabricated review in catch block', () => {
      assert.ok(!content.includes('fallbackRev'), 'Must completely eliminate fallbackRev');
      assert.ok(!content.includes("userFullName: 'Vận động viên'"), 'Must eliminate fake Vận động viên author');
    });

    test('Review submission checks isAuthenticated and sets error on 401', () => {
      assert.ok(content.includes('if (!isAuthenticated)'), 'Must check isAuthenticated before submit');
      assert.ok(content.includes('err?.response?.status === 401'), 'Must check HTTP 401 status in catch');
      assert.ok(content.includes('setReviewSuccess(false);'), 'Must set reviewSuccess to false on catch');
    });

    test('Eliminated hardcoded sample reviews (Nguyễn Quốc Tuấn, etc.) when backend reviews is empty', () => {
      assert.ok(!content.includes('Nguyễn Quốc Tuấn'), 'Must eliminate hardcoded Nguyễn Quốc Tuấn review');
      assert.ok(!content.includes('Trần Phương Linh'), 'Must eliminate hardcoded Trần Phương Linh review');
      assert.ok(!content.includes('Hoàng Minh Quân'), 'Must eliminate hardcoded Hoàng Minh Quân review');
      assert.ok(content.includes('<ProductReviewList'), 'Product detail must use the actual shared review list');
      const facts = compileOrderModule('src/components/ProductFacts.jsx', { react: React, '../utils/formatters': formatters,
        'lucide-react': { Star: () => null } });
      const empty = renderToStaticMarkup(React.createElement(facts.ProductReviewList,
        { product: { reviewCount: 0, averageRating: 0 }, reviews: [] }));
      assert.match(empty, /Chưa có đánh giá/, 'A successful empty review response must render an honest empty state');
      assert.doesNotMatch(empty, /Nguyễn Quốc Tuấn|Trần Phương Linh|Hoàng Minh Quân/);
      const failed = renderToStaticMarkup(React.createElement(facts.ProductReviewList,
        { product: { reviewCount: 0 }, reviews: [], error: 'Không tải được đánh giá (500)', onRetry() {} }));
      assert.match(failed, /role="alert"|Thử lại/); assert.doesNotMatch(failed, /Chưa có đánh giá/);
    });
  });

  // =========================================================================
  // DEMO-P1-04 (FIX-019 / FIX-048): Admin Order Detail & Hardcoded Gifts Removal
  // =========================================================================
  describe('DEMO-P1-04: Admin Order Detail Full Items & Gifts Remediation', () => {
    const orderDetailPath = path.resolve('src/pages/OrderDetailPage.jsx');

    test('AdminOrdersPage maps and preserves full items array in order list', () => {
      const fixture = orderFixture();
      const { normalizeAdminOrder } = loadOrderPage('AdminOrdersPage');
      const order = normalizeAdminOrder(fixture);
      assert.deepEqual(order.items, fixture.items);
      assert.deepEqual(normalizeAdminOrder({ ...fixture, items: null, orderItems: fixture.items }).items, fixture.items);
      assert.deepEqual(normalizeAdminOrder({ id: 18 }).items, []);
      assert.equal(order.gift, undefined);
      assert.match(order.stringReq, /Vàng/);
      assert.match(order.stringReq, /4U-G5/);
    });

    test('AdminOrdersPage modal renders full items list instead of single item', () => {
      const order = loadOrderPage('AdminOrdersPage').normalizeAdminOrder(orderFixture());
      const page = loadOrderPage('AdminOrdersPage', order);
      const html = renderToStaticMarkup(React.createElement(page.default));
      assert.match(html, /Danh sách sản phẩm \(2 mặt hàng\)/);
      assert.match(html, /Vợt Yonex kiểm thử/);
      assert.match(html, /Áo Victor kiểm thử/);
      assert.match(html, /Số lượng: x2/); assert.match(html, /Số lượng: x3/);
      assert.match(html, /Vàng/); assert.match(html, /4U-G5/); assert.match(html, /Size: M/);
      assert.doesNotMatch(html, /Cuốn cán Yonex chính hãng|Kèm 01 Cuốn cán Yonex AC102EX/);
    });

    test('MyOrdersPage modal renders full items list and removes hardcoded giftDetail', () => {
      const fixture = orderFixture();
      const { normalizeUserOrder } = loadOrderPage('MyOrdersPage');
      const order = normalizeUserOrder(fixture);
      assert.deepEqual(order.items, fixture.items);
      assert.deepEqual(normalizeUserOrder({ ...fixture, items: null, orderItems: fixture.items }).items, fixture.items);
      assert.equal(order.quantity, 5); assert.equal(order.giftDetail, undefined);
      const page = loadOrderPage('MyOrdersPage', order);
      const html = renderToStaticMarkup(React.createElement(page.default));
      assert.match(html, /Vợt Yonex kiểm thử/); assert.match(html, /Áo Victor kiểm thử/);
      assert.match(html, /Số lượng: x2/); assert.match(html, /Số lượng: x3/);
      assert.match(html, /Vàng/); assert.match(html, /4U-G5/); assert.match(html, /Size: M/);
      assert.doesNotMatch(html, /Kèm 01 Cuốn cán Yonex AC102EX|Cuốn cán Yonex chính hãng/);
    });

    test('OrderDetailPage removes hardcoded gift line', () => {
      const content = fs.readFileSync(orderDetailPath, 'utf8');
      assert.ok(
        !content.includes('Tặng kèm bao vợt nhung + quấn cán chính hãng'),
        'OrderDetailPage must not have hardcoded gift text'
      );
    });
  });
});

test('Mã đơn lịch sử luôn dùng ID nội bộ, mã PayOS là định danh riêng trong bảng và CSV', () => {
  const module=loadOrderPage('MyOrdersPage');
  const raw={...orderFixture(),payosOrderCode:1000000017,paymentMethod:'PAYOS_VIETQR'};
  const order=module.normalizeUserOrder(raw);
  assert.equal(order.orderCode,'#HG-17');assert.equal(order.payosOrderCode,1000000017);
  assert.equal(order.paymentMethodCode,'PAYOS_VIETQR');
  const html=renderToStaticMarkup(React.createElement(loadOrderPage('MyOrdersPage',order).default));
  assert.match(html,/#HG-17/);assert.match(html,/Mã PayOS:[\s\S]*1000000017/);
  assert.doesNotMatch(html,/#HG-1000000017/);
  const csv=module.userOrderSlipCsv([order]);
  assert.match(csv,/"Mã đơn","Mã PayOS"/);assert.match(csv,/"#HG-17","1000000017"/);
});

test('Lịch sử QR pending có lối tiếp tục cùng đơn ở bảng và modal, không tạo đơn hoặc link thanh toán mới', () => {
  const order=loadOrderPage('MyOrdersPage').normalizeUserOrder({...orderFixture(),paymentMethod:'PAYOS_VIETQR',payosOrderCode:1000000017});
  const html=renderToStaticMarkup(React.createElement(loadOrderPage('MyOrdersPage',order).default));
  assert.equal((html.match(/href="\/checkout\?orderId=17"/g)||[]).length,2);
  assert.match(html,/Tiếp tục thanh toán/);assert.match(html,/href="\/orders\/17"/);
  assert.doesNotMatch(html,/checkout\?orderId=1000000017|payment\/qr\/1000000017/);
});

test('Lịch sử COD, đã thanh toán, đang giao và đã hủy không có CTA QR tiếp tục', () => {
  for(const patch of [{status:'PENDING',paymentMethod:'COD'},{status:'PAID',paymentMethod:'PAYOS_VIETQR'},
    {status:'SHIPPING',paymentMethod:'PAYOS_VIETQR'},{status:'COMPLETED',paymentMethod:'PAYOS_VIETQR'},
    {status:'CANCELLED',paymentMethod:'PAYOS_VIETQR'}]) {
    const order=loadOrderPage('MyOrdersPage').normalizeUserOrder({...orderFixture(),...patch});
    const html=renderToStaticMarkup(React.createElement(loadOrderPage('MyOrdersPage',order).default));
    assert.doesNotMatch(html,/href="\/checkout\?orderId=/);assert.match(html,/href="\/orders\/17"/);
  }
});

function userOrderTable(order, query, tab = 'ALL') {
  const page = loadOrderPage('MyOrdersPage', order, query, tab);
  const html = renderToStaticMarkup(React.createElement(page.default));
  return html.match(/<tbody[\s\S]*?<\/tbody>/)[0];
}

test('Tìm đơn theo mặt hàng thứ hai, SKU, hãng và tên tiếng Việt không dấu', () => {
  const raw = orderFixture(); raw.items[1].productBrand = 'Victor';
  const order = loadOrderPage('MyOrdersPage').normalizeUserOrder(raw);
  for (const query of ['ao victor', 'ÁO VICTOR', '  HG-APPAREL-018  ', 'victor', 'vot yonex']) {
    assert.match(userOrderTable(order, query), /#HG-17/, query);
  }
  assert.doesNotMatch(userOrderTable(order, 'Không tồn tại'), /#HG-17/);
});

test('Tìm đơn bằng mã nội bộ, PayOS và phương thức; không tìm theo giá hoặc số lượng', () => {
  const raw = { ...orderFixture(), payosOrderCode: 1000000017, paymentMethod: 'PAYOS_VIETQR' };
  const order = loadOrderPage('MyOrdersPage').normalizeUserOrder(raw);
  for (const query of ['#hg-17', 'HG-17', '1000000017', 'vietqr', '   ']) {
    assert.match(userOrderTable(order, query), /#HG-17/, query);
  }
  for (const query of ['500000', '999999']) assert.doesNotMatch(userOrderTable(order, query), /#HG-17/);
});

test('Tìm đơn giữ bộ lọc trạng thái và hỗ trợ dữ liệu sản phẩm cũ lồng trong item', () => {
  const raw = { ...orderFixture(), status: 'CANCELLED', items: [{ quantity: 1,
    product: { name: 'Đôi giày Mizuno', sku: 'HG-SHOE-021', brand: 'Mizuno' } }] };
  const order = loadOrderPage('MyOrdersPage').normalizeUserOrder(raw);
  assert.match(userOrderTable(order, 'doi giay', 'CANCELLED'), /#HG-17/);
  assert.match(userOrderTable(order, 'HG-SHOE-021', 'CANCELLED'), /#HG-17/);
  assert.doesNotMatch(userOrderTable(order, 'mizuno', 'PROCESSING'), /#HG-17/);
});
