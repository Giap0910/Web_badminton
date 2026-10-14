import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'esbuild';
import { formatDate, getOrderStatusLabel, getNextOrderStatuses, isOrderPaid } from '../utils/formatters.js';
import OrderItemOptions, { formatOrderItemOptionsText } from '../utils/orderItemOptions.js';

const require = createRequire(import.meta.url);
const source = fs.readFileSync('src/utils/adminCustomers.jsx', 'utf8');
const helpers = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

function renderCustomerPage(users) {
  let index = 0;
  const patchedReact = { ...React, useEffect: () => {},
    useState: initial => [++index === 2 ? users : typeof initial === 'function' ? initial() : initial, () => {}] };
  const modules = { react: patchedReact, '../components/AdminLayout': { default: props =>
    React.createElement('div', null, props.children), __esModule: true }, '../api/adminApi': { adminApi: {} },
    '../utils/adminCustomers.jsx': helpers, 'lucide-react': new Proxy({}, { get: () => () => null }) };
  const compiled = transformSync(fs.readFileSync('src/pages/AdminCustomersPage.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  const instance = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => modules[name] || require(name), instance, instance.exports);
  return renderToStaticMarkup(React.createElement(instance.exports.default));
}

test('Khách hàng từ API không có điểm vẫn render bảng, số đơn và trạng thái', () => {
  const user = helpers.normalizeCustomer({ id: 17, fullName: 'Nguyễn Văn Giáp', role: 'ROLE_USER',
    isActive: true, totalOrders: 3, totalSpent: 900000 });
  const html = renderCustomerPage([user]);
  assert.match(html, /Nguyễn Văn Giáp/); assert.match(html, /3 đơn/);
  assert.match(html, /Chưa có thông tin/); assert.doesNotMatch(html, /undefined|NaN/); assert.equal(user.tier, 'UNKNOWN');
});

test('Dữ liệu khách hàng cũ/thiếu thống kê không tự tạo điểm hoặc hạng VIP', () => {
  const user = helpers.normalizeCustomer({ id: 3, fullName: 'Admin', role: 'ROLE_ADMIN' });
  assert.equal(user.points, null); assert.equal(user.totalOrders, null); assert.equal(user.totalSpent, null);
  assert.equal(user.tier, 'UNKNOWN'); assert.doesNotThrow(() => renderCustomerPage([user]));
});

test('Tên tiếng Việt không dấu, đ/Đ và khoảng trắng tìm đúng dữ liệu', () => {
  assert.equal(helpers.normalizeSearch('  Đơn HÀNG Nguyễn Giáp  '), 'don hang nguyen giap');
});

test('COD chỉ ghi đã thanh toán và mở hoàn tất sau xác nhận tiền thực tế', () => {
  const order = { paymentMethod: 'COD', status: 'COMPLETED', cashCollected: false };
  assert.equal(isOrderPaid(order), false);
  assert.equal(getOrderStatusLabel(order), 'Đã giao, chưa xác nhận thu COD');
  assert.deepEqual(getNextOrderStatuses({ ...order, status: 'SHIPPING' }), []);
  assert.deepEqual(getNextOrderStatuses({ ...order, status: 'SHIPPING', cashCollected: true }), ['COMPLETED']);
  assert.equal(isOrderPaid({ ...order, cashCollected: true }), true);
});

function reportHarness(onRangeChange, exportReport) {
  const values = [], instance = { exports: {} }; let cursor = 0;
  const patchedReact = { ...React, useRef: value => ({ current: value }), useState: initial => {
    const index = cursor++; if (!(index in values)) values[index] = initial;
    return [values[index], next => { values[index] = next; }];
  } };
  const modules = { react: patchedReact, '../api/adminApi': { adminApi: { exportReport } },
    './AdminProductImport': { saveAdminFile: () => {} } };
  const code = transformSync(fs.readFileSync('src/components/AdminReportControls.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(name => modules[name], instance, instance.exports);
  return () => { cursor = 0; return instance.exports.default({ range: values[0] || { from: '', to: '' }, onRangeChange }); };
}

test('Báo cáo chặn ngày thiếu, nhận ngày nhập và gửi đúng khoảng khi xuất', async () => {
  let applied, exported;
  const render = reportHarness(value => { applied = value; }, async params => { exported = params; return new Blob(); });
  const form = () => { const node = render().props.children[0]; return node.type(node.props); };
  form().props.onSubmit({ preventDefault() {} }); assert.equal(applied, undefined);
  form().props.children[0].props.children[1].props.onInput({ target: { value: '2026-10-12' } });
  form().props.children[1].props.children[1].props.onInput({ target: { value: '2026-10-12' } });
  form().props.onSubmit({ preventDefault() {} });
  assert.deepEqual(applied, { from: '2026-10-12', to: '2026-10-12' });
  await render().props.children[1].props.children[1].props.onClick();
  assert.deepEqual(exported, { ...applied, format: 'xlsx' });
  form().props.children[3].props.onClick();
  assert.deepEqual(applied, { from: '', to: '' }); assert.equal(render().props.children[2], '');
});

function loadAdminOrdersPage(orders = [], saveAdminFile = () => {}) {
  let index = 0;
  const patchedReact = { ...React, useEffect: () => {}, useRef: initial => ({ current: initial }),
    useState: initial => [++index === 2 ? orders : index === 3 ? false : typeof initial === 'function' ? initial() : initial, () => {}] };
  const imageModule = { exports: {} };
  const imageCode = transformSync(fs.readFileSync('src/components/ProductImage.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', imageCode)(name => name === 'react' ? React : require(name), imageModule, imageModule.exports);
  const modules = { react: patchedReact, '../utils/formatters': { formatDate, getOrderStatusLabel, getNextOrderStatuses, isOrderPaid },
    '../components/AdminLayout': { default: props => React.createElement('div', null, props.children), __esModule: true },
    '../api/adminApi': { adminApi: {} }, '../api/orderApi': { orderApi: {} }, '../utils/adminCustomers.jsx': helpers,
    '../components/OrderItemOptions': { default: OrderItemOptions, formatOrderItemOptionsText, __esModule: true },
    '../components/ProductImage': imageModule.exports, '../components/AdminProductImport': { saveAdminFile },
    'lucide-react': new Proxy({}, { get: () => () => null }) };
  const instance = { exports: {} };
  const code = transformSync(fs.readFileSync('src/pages/AdminOrdersPage.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(name => modules[name] || require(name), instance, instance.exports);
  return instance.exports;
}

test('Admin đơn thiếu dữ liệu không bịa ngày, người nhận, ảnh, mã tham chiếu hoặc đã thu COD', () => {
  const runtime = loadAdminOrdersPage();
  const order = runtime.normalizeAdminOrder({ id: 28, status: 'COMPLETED', paymentMethod: 'COD', payosOrderCode: 1000000028 });
  const page = loadAdminOrdersPage([order]);

  const html = renderToStaticMarkup(React.createElement(page.default));

  assert.equal(order.code, '#HG-28'); assert.equal(order.paymentRef, '—');
  assert.equal(order.createdAt, '—'); assert.equal(order.productImage, null); assert.equal(order.stringReq, '');
  assert.equal(order.totalAmount, null); assert.equal(order.isPaid, false); assert.deepEqual(order.nextStatuses, []);
  assert.equal(runtime.normalizeAdminOrder({ id: 29, status: 'COMPLETED' }).isPaid, false);
  assert.match(html, /Đã giao, chưa xác nhận thu COD/); assert.match(html, /Đang cập nhật/);
  assert.doesNotMatch(html, /0988 123 456|24\/10\/2024|TP\. Hồ Chí Minh|PAYOS-1000000028|REF-28|images\.unsplash/);
});

test('Admin ánh xạ đúng sản phẩm, biến thể và tham chiếu thật trong đơn', () => {
  const page = loadAdminOrdersPage();
  const item = { productSku: 'HG-SHOE-007', productName: 'Giày Yonex', selectedSize: '40', selectedColor: 'Xanh',
    quantity: 2, price: 100000, subtotal: 200000 };

  const order = page.normalizeAdminOrder({ id: 7, createdAt: '2026-10-13T10:00:00', customerName: 'Khách kiểm thử',
    shippingPhone: '0912345678', shippingAddress: 'Địa chỉ kiểm thử', reference: 'BANK-REAL-7',
    status: 'PAID', paymentMethod: 'PAYOS_VIETQR', totalAmount: 230000, items: [item] });

  assert.equal(order.productName, 'Giày Yonex'); assert.equal(order.paymentRef, 'BANK-REAL-7');
  assert.equal(order.customerPhone, '0912345678'); assert.equal(order.customerAddress, 'Địa chỉ kiểm thử');
  assert.deepEqual(order.items, [item]); assert.match(order.stringReq, /Size: 40/); assert.match(order.stringReq, /Xanh/);
  assert.deepEqual(order.nextStatuses, ['SHIPPING']); assert.equal(order.isPaid, true);
});

test('Xuất phiếu đơn hàng CSV thật có từng dòng biến thể và chống công thức Excel', async () => {
  let saved;
  const page = loadAdminOrdersPage([], (blob, filename) => { saved = { blob, filename }; });
  const order = page.normalizeAdminOrder({ id: 8, paymentMethod: 'COD', status: 'SHIPPING', cashCollected: false,
    customerName: '=HYPERLINK("bad")', shippingPhone: '0912345678', shippingAddress: 'Địa chỉ, có dấu phẩy', totalAmount: 330000,
    items: [{ productSku: 'HG-SHOE-008', productName: 'Giày Yonex', selectedSize: '40', selectedColor: 'Xanh',
      quantity: 2, price: 100000, subtotal: 200000 }, { productSku: 'HG-APPAREL-009', productName: 'Áo Victor',
      selectedSize: 'M', selectedColor: 'Đen', quantity: 1, price: 100000, subtotal: 100000 }] });

  page.exportAdminOrderSheet([order]);
  const csv = await saved.blob.text();

  assert.equal(saved.filename, 'phieu-don-hang.csv'); assert.match(saved.blob.type, /text\/csv/);
  assert.equal(csv.split('\r\n').length, 3); assert.match(csv, /"HG-SHOE-008","Giày Yonex","40","Xanh"/);
  assert.match(csv, /"HG-APPAREL-009","Áo Victor","M","Đen"/); assert.match(csv, /"'=HYPERLINK/);
  assert.match(csv, /"Địa chỉ, có dấu phẩy"/); assert.match(csv, /Chưa xác nhận thu tiền/);
  assert.doesNotMatch(csv, /Đã ghi nhận thanh toán|hóa đơn|REF-8|PAYOS-8/);
});

test('Nút xuất trên trang admin thực hiện tải CSV, không báo đã in giả', () => {
  let saved;
  const normalized = loadAdminOrdersPage().normalizeAdminOrder({ id: 9, paymentMethod: 'COD', status: 'PENDING', items: [] });
  const page = loadAdminOrdersPage([normalized], (blob, filename) => { saved = { blob, filename }; });
  const buttons = [];
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement(node)) return;
    if (node.type === 'button') buttons.push(node);
    visit(node.props.children);
  };
  visit(page.default());
  const button = buttons.find(node => Array.isArray(node.props.children)
    && node.props.children.some(child => child?.props?.children === 'Xuất phiếu đơn hàng CSV'));

  assert.ok(button); assert.equal(button.props.disabled, false);
  button.props.onClick();

  assert.equal(saved.filename, 'phieu-don-hang.csv'); assert.ok(saved.blob.size > 0);
});

function voucherPageHarness(api) {
  const values = [], refs = [], effects = [], instance = { exports: {} };
  let cursor = 0, refCursor = 0, effectCursor = 0;
  const patchedReact = { ...React, useState: initial => {
    const index = cursor++;
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
  }, useRef: initial => {
    const index = refCursor++; return refs[index] ||= { current: initial };
  }, useEffect: callback => {
    const index = effectCursor++; if (!(index in effects)) effects[index] = callback;
  } };
  const modules = { react: patchedReact, '../api/adminApi': { adminApi: api },
    '../components/AdminLayout': { default: props => React.createElement('div', null, props.children), __esModule: true },
    'lucide-react': new Proxy({}, { get: () => () => null }) };
  const code = transformSync(fs.readFileSync('src/pages/AdminVouchersPage.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', 'setTimeout', code)(name => modules[name] || require(name), instance, instance.exports, () => 0);
  const render = () => { cursor = 0; refCursor = 0; effectCursor = 0; return instance.exports.default(); };
  const nodes = type => {
    const result = [];
    const visit = node => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!React.isValidElement(node)) return;
      if (node.type === type) result.push(node);
      visit(node.props.children);
    };
    visit(render()); return result;
  };
  render();
  return { render, nodes, payload: instance.exports.buildAdminVoucherPayload,
    load: async () => { await Promise.all(effects.map(effect => effect())); },
    change: (name, value) => nodes('input').find(node => node.props.name === name).props.onChange({ target: { value, checked: value } }) };
}

const voucherRow = overrides => ({ id: 5, code: 'HGTEST', description: 'Mã giảm kiểm thử', discountType: 'PERCENT',
  discountValue: 10, minOrderValue: 200000, maxDiscountAmount: 50000, maxUses: 100, usedCount: 3,
  expiresAt: '2026-12-31T23:59:59', isActive: true, ...overrides });

test('Admin voucher bật/tắt gọi API thật, tải trạng thái mới và giữ lượt không giới hạn', async () => {
  let rows = [voucherRow({ maxUses: null })]; const updates = [];
  const page = voucherPageHarness({ getAllVouchers: async () => rows, updateVoucher: async (id, payload) => {
    updates.push({ id, payload }); rows = rows.map(row => ({ ...row, ...payload }));
  } });
  await page.load();
  let html = renderToStaticMarkup(page.render());
  assert.match(html, /3 \/ Không giới hạn/); assert.doesNotMatch(html, /NaN|Infinity/);

  await page.nodes('button').find(node => node.props.title === 'Bật hoặc tắt mã giảm giá').props.onClick();
  assert.deepEqual(updates, [{ id: 5, payload: { isActive: false } }]);
  assert.match(renderToStaticMarkup(page.render()), /Tạm tắt/);
  await page.nodes('button').find(node => node.props.title === 'Bật hoặc tắt mã giảm giá').props.onClick();
  assert.deepEqual(updates[1], { id: 5, payload: { isActive: true } });
  assert.match(renderToStaticMarkup(page.render()), /Đang kích hoạt/);
});

test('Sửa mã đang tắt không tự bật lại; gửi null để bỏ cap, giới hạn lượt và ngày hết hạn', async () => {
  const updates = [];
  const page = voucherPageHarness({ getAllVouchers: async () => [voucherRow({ isActive: false })],
    updateVoucher: async (id, payload) => { updates.push({ id, payload }); } });
  await page.load();
  page.nodes('button').find(node => node.props.title === 'Chỉnh sửa voucher').props.onClick();
  assert.equal(page.nodes('input').find(node => node.props.name === 'code').props.disabled, true);
  page.change('maxDiscountAmount', ''); page.change('maxUses', ''); page.change('expiresAt', '');

  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });

  assert.deepEqual(updates, [{ id: 5, payload: { code: 'HGTEST', description: 'Mã giảm kiểm thử', discountType: 'PERCENT',
    discountValue: 10, minOrderValue: 200000, maxDiscountAmount: null, maxUses: null, expiresAt: null, isActive: false } }]);
  assert.equal(page.nodes('form').length, 0);
});

test('Lượt tối đa bằng 0 được lưu nguyên, không tự thay thành 100', async () => {
  let saved;
  const page = voucherPageHarness({ getAllVouchers: async () => [], createVoucher: async payload => { saved = payload; } });
  page.nodes('button').find(node => node.props.onClick && node.props.children?.some?.(child => child?.props?.children === 'Tạo mã Voucher mới')).props.onClick();
  page.change('code', 'HGZERO'); page.change('description', 'Không phát hành'); page.change('maxUses', '0');

  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });

  assert.equal(saved.maxUses, 0); assert.equal(saved.code, 'HGZERO');
});

test('Lỗi lưu và lỗi bật/tắt hiển thị lỗi API, không báo thành công và giữ form để sửa', async () => {
  const error = { response: { data: { message: 'Số lượt tối đa không được nhỏ hơn số lượt đã sử dụng' } } };
  const page = voucherPageHarness({ getAllVouchers: async () => [voucherRow()], updateVoucher: async () => { throw error; } });
  await page.load();
  await page.nodes('button').find(node => node.props.title === 'Bật hoặc tắt mã giảm giá').props.onClick();
  assert.match(renderToStaticMarkup(page.render()), /Số lượt tối đa không được nhỏ hơn/);
  assert.match(renderToStaticMarkup(page.render()), /role="alert"[^>]*text-red-800/);
  assert.doesNotMatch(renderToStaticMarkup(page.render()), /Đã tắt mã giảm giá/);
  page.nodes('button').find(node => node.props.title === 'Chỉnh sửa voucher').props.onClick();
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(page.nodes('form').length, 1);
  assert.doesNotMatch(renderToStaticMarkup(page.render()), /Đã cập nhật mã giảm giá thành công/);
});

test('Khóa đang gửi chặn nhấn lưu và bật/tắt trùng, mở lại sau API hoàn tất', async () => {
  let release, calls = 0;
  const deferred = new Promise(resolve => { release = resolve; });
  const page = voucherPageHarness({ getAllVouchers: async () => [voucherRow()],
    updateVoucher: async () => { calls += 1; await deferred; } });
  await page.load();
  const toggle = page.nodes('button').find(node => node.props.title === 'Bật hoặc tắt mã giảm giá').props.onClick;
  const first = toggle(); await toggle();
  assert.equal(calls, 1);
  assert.equal(page.nodes('button').find(node => node.props.title === 'Chỉnh sửa voucher').props.disabled, true);
  release(); await first;
  page.nodes('button').find(node => node.props.title === 'Chỉnh sửa voucher').props.onClick();
  const submit = page.nodes('form')[0].props.onSubmit;
  const save = submit({ preventDefault() {} }); await submit({ preventDefault() {} });
  assert.equal(calls, 2); await save;
});

test('Form voucher kiểm tra số tiền, phần trăm, dữ liệu mã và hỗ trợ hạn mức để trống', () => {
  const page = voucherPageHarness({});
  const form = { code: 'HGTEST', title: 'Giảm giá', discountType: 'PERCENT', discountValue: '0.29',
    minOrderValue: '0', maxUsage: '', maxDiscountAmount: '', endDate: '', isActive: false };
  const payload = page.payload(form);
  assert.equal(payload.discountValue, 0.29); assert.equal(payload.maxUses, null); assert.equal(payload.isActive, false);
  for (const discountValue of ['0', '-1', '100.01', '1.005', 'NaN', 'Infinity', ''])
    assert.throws(() => page.payload({ ...form, discountValue }));
  for (const changes of [{ discountType: 'FIXED', discountValue: '0.5' }, { discountType: 'SHIPPING', discountValue: '0' },
    { minOrderValue: '-1' }, { maxUsage: '1.5' }, { maxUsage: '2147483648' }, { maxDiscountAmount: '0.5' },
    { code: 'HG BAD' }, { title: 'X'.repeat(256) }, { discountType: 'UNKNOWN' }])
    assert.throws(() => page.payload({ ...form, ...changes }));
});

function adminRmaHarness(api, productApi = {}, saveAdminFile = () => {}) {
  const values = [], refs = [], effects = [], cleanups = [], instance = { exports: {} };
  let cursor = 0, refCursor = 0, effectCursor = 0;
  const patchedReact = { ...React, useState: initial => {
    const index = cursor++;
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
  }, useRef: initial => refs[refCursor++] ||= { current: initial }, useEffect: effect => {
    const index = effectCursor++; if (!(index in effects)) effects[index] = effect;
  } };
  const adminForm = transformSync(fs.readFileSync('src/utils/adminProductForm.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  const formModule = { exports: {} };
  new Function('require', 'module', 'exports', adminForm)(name => name.endsWith('adminCustomers.jsx') ? helpers : require(name), formModule, formModule.exports);
  const modules = { react: patchedReact, '../api/adminApi': { adminApi: api }, '../api/productApi': { productApi },
    '../components/AdminProductImport': { saveAdminFile }, '../utils/adminProductForm': formModule.exports,
    '../utils/formatters': { formatDate }, '../components/AdminLayout': { default: props => React.createElement('div', null, props.children), __esModule: true },
    'lucide-react': new Proxy({}, { get: () => () => null }) };
  const code = transformSync(fs.readFileSync('src/pages/AdminReviewsPage.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(name => modules[name] || require(name), instance, instance.exports);
  const render = () => { cursor = 0; refCursor = 0; effectCursor = 0; return instance.exports.default(); };
  const nodes = type => {
    const result = [], visit = node => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!React.isValidElement(node)) return;
      if (node.type === type) result.push(node);
      visit(node.props.children);
    };
    visit(render()); return result;
  };
  const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : String(node ?? '');
  const button = label => nodes('button').find(node => text(node.props.children).includes(label));
  render();
  return { render, nodes, button, exports: instance.exports, unmount: () => cleanups.forEach(cleanup => cleanup?.()),
    restartEffects: async () => {
      cleanups.forEach(cleanup => cleanup?.()); cleanups.length = 0;
      effects.forEach(effect => cleanups.push(effect())); await Promise.resolve(); await Promise.resolve();
    },
    load: async () => { effects.forEach(effect => cleanups.push(effect())); await Promise.resolve(); await Promise.resolve(); button('Yêu cầu bảo hành RMA').props.onClick(); } };
}

const rmaRow = changes => ({ id: 7, orderId: 29, orderItemId: 15, originalVariantId: 32, productIdSnapshot: 3, categoryIdSnapshot: 2, brandSnapshot: 'Yonex',
  productName: 'Giày Yonex mẫu đã ngừng bán', productSku: 'HG-SHOE-003', userFullName: 'Nguyễn Văn Giáp', selectedSize: '40', selectedColor: 'Xanh',
  selectedWeight: null, quantity: 2, reason: 'Lỗi đế giày', status: 'APPROVED', serialNumber: 'REAL-SERIAL', createdAt: '2026-10-13T10:00:00', evidenceAvailable: true, ...changes });

const reviewRow = changes => ({ id: 12, productId: 3, productName: 'Giày Yonex đúng mẫu', productBrand: 'Yonex',
  productSku: 'HG-SHOE-003', userFullName: 'Nguyễn Văn Giáp', selectedSize: '40', selectedColor: 'Xanh',
  rating: 4, comment: 'Vừa chân', visible: true, verifiedPurchase: true, createdAt: '2026-10-14T10:00:00', ...changes });

async function loadReviews(page) {
  await page.load();page.button('Đánh giá sản phẩm').props.onClick();
}

test('Admin đánh giá đọc trạng thái, sao, phản hồi và snapshot thật; record cũ không giả đã mua', async () => {
  const page = adminRmaHarness({ getAllReviews: async () => [reviewRow({ visible: false, verifiedPurchase: false, productDeleted: true,
    officialReply: 'Phản hồi đã lưu', replyUpdatedAt: '2026-10-14T11:00:00', createdAt: null })], getAllReturns: async () => [] });
  await loadReviews(page);const html = renderToStaticMarkup(page.render());
  assert.match(html, /Giày Yonex đúng mẫu/);assert.match(html, /40 \/ Xanh/);assert.match(html, /Đã ẩn/);
  assert.match(html, /Phản hồi đã lưu/);assert.match(html, /Sản phẩm đã ngừng bán/);assert.match(html, /Hiển thị lại/);
  assert.doesNotMatch(html, /Đã mua hàng|4\.9★|HG Series|images\.unsplash|Gần đây/);
  assert.equal(page.exports.normalizeAdminReview({ id: 1 }).rating, null);
});

test('Ẩn và hiển thị đánh giá gọi đúng API, tải lại và chỉ cập nhật kết quả đúng ID', async () => {
  let row = reviewRow();const calls = [];
  const page = adminRmaHarness({ getAllReviews: async () => [row], getAllReturns: async () => [],
    updateReviewVisibility: async (id, visible) => {calls.push([id, visible]);row = { ...row, visible };return row;} });
  await loadReviews(page);await page.button('Ẩn đánh giá').props.onClick();
  assert.deepEqual(calls, [[12, false]]);assert.ok(page.button('Hiển thị lại'));
  await page.button('Hiển thị lại').props.onClick();assert.deepEqual(calls, [[12, false], [12, true]]);
  assert.ok(page.button('Ẩn đánh giá'));assert.match(renderToStaticMarkup(page.render()), /4\.0★/);
  const failed = adminRmaHarness({ getAllReviews: async () => [reviewRow()], getAllReturns: async () => [],
    updateReviewVisibility: async () => reviewRow({ id: 99, visible: false }) });
  await loadReviews(failed);await failed.button('Ẩn đánh giá').props.onClick();
  assert.match(renderToStaticMarkup(failed.render()), /Chưa xác nhận được kết quả/);assert.ok(failed.button('Ẩn đánh giá'));
});

test('Phản hồi dùng API thật, giữ form sau lỗi và hỗ trợ xóa bằng null', async () => {
  let row = reviewRow(), fail = true;const calls = [];
  const page = adminRmaHarness({ getAllReviews: async () => [row], getAllReturns: async () => [], replyReview: async (id, reply) => {
    calls.push([id, reply]);if (fail) throw { response: { data: { message: 'Không thể lưu phản hồi' } } };
    row = { ...row, officialReply: reply, replyUpdatedAt: reply ? '2026-10-14T11:00:00' : null };return row;
  } });
  await loadReviews(page);page.button('Trả lời đánh giá').props.onClick();
  page.nodes('textarea')[0].props.onChange({ target: { value: 'Đã hỗ trợ khách' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(page.nodes('textarea')[0].props.value, 'Đã hỗ trợ khách');assert.match(renderToStaticMarkup(page.render()), /Không thể lưu phản hồi/);
  fail = false;await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });assert.equal(page.nodes('form').length, 0);
  assert.match(renderToStaticMarkup(page.render()), /Đã hỗ trợ khách/);page.button('Sửa phản hồi').props.onClick();
  page.nodes('textarea')[0].props.onChange({ target: { value: '  ' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });assert.deepEqual(calls.at(-1), [12, null]);
  assert.ok(page.button('Trả lời đánh giá'));
});

test('Lỗi tải đánh giá không hiển thị danh sách rỗng giả; retry đọc dữ liệu và lỗi refresh không báo thành công', async () => {
  let fail = true, row = reviewRow();
  const page = adminRmaHarness({ getAllReviews: async () => {if (fail) throw new Error('Máy chủ đánh giá lỗi');return [row];}, getAllReturns: async () => [],
    updateReviewVisibility: async (id, visible) => {row = { ...row, visible };fail = true;return row;} });
  await loadReviews(page);let html = renderToStaticMarkup(page.render());
  assert.match(html, /Máy chủ đánh giá lỗi/);assert.doesNotMatch(html, /Không có đánh giá phù hợp/);
  fail = false;await page.button('Làm mới đánh giá').props.onClick();assert.ok(page.button('Ẩn đánh giá'));
  await page.button('Ẩn đánh giá').props.onClick();html = renderToStaticMarkup(page.render());
  assert.match(html, /Đã lưu đánh giá nhưng chưa tải lại/);assert.doesNotMatch(html, /Đã ẩn đánh giá\./);
});

test('Gửi trùng đánh giá chỉ gọi API một lần và unmount không nhận kết quả muộn', async () => {
  let release, calls = 0;const pending = new Promise(resolve => {release = resolve;});
  const page = adminRmaHarness({ getAllReviews: async () => [reviewRow()], getAllReturns: async () => [],
    updateReviewVisibility: async () => {calls++;return pending;} });
  await loadReviews(page);const handler = page.button('Ẩn đánh giá').props.onClick;
  const first = handler();await handler();assert.equal(calls, 1);assert.equal(page.button('Ẩn đánh giá').props.disabled, true);
  page.unmount();release(reviewRow({ visible: false }));await first;
  assert.ok(page.button('Ẩn đánh giá'));assert.doesNotMatch(renderToStaticMarkup(page.render()), /Đã ẩn đánh giá\./);
});

test('Điểm khách hàng lấy loyaltyPoints thật và số đơn bằng 0 không bị mất', () => {
  const mapped = helpers.normalizeCustomer({ id: 1, loyaltyPoints: 0, points: 999, totalOrders: 0, totalSpent: 0 });
  assert.equal(mapped.points, 0);assert.equal(mapped.totalOrders, 0);
  assert.match(renderCustomerPage([mapped]), /0 đơn/);assert.match(renderCustomerPage([mapped]), /0 pts/);
  assert.equal(helpers.normalizeCustomer({ id: 2, loyaltyPoints: '150' }).points, 150);
  assert.equal(helpers.normalizeCustomer({ id: 2, points: 999 }).points, null);
  assert.equal(helpers.normalizeCustomer({ id: 2, loyaltyPoints: -1 }).points, null);
  assert.doesNotMatch(renderCustomerPage([mapped]), /Gold|Diamond|BWF|Tất cả cấp bậc/);
});

function customerHarness(api) {
  const values = [], refs = [], effects = [], cleanups = [];let cursor = 0, refCursor = 0;
  const patchedReact = { ...React, useState: initial => {
    const index = cursor++;if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], next => {values[index] = typeof next === 'function' ? next(values[index]) : next;}];
  }, useRef: initial => refs[refCursor++] ||= { current: initial }, useEffect: effect => {if (!effects.length) effects.push(effect);} };
  const modules = { react: patchedReact, '../api/adminApi': { adminApi: api }, '../utils/adminCustomers.jsx': helpers,
    '../components/AdminLayout': { default: props => React.createElement('div', null, props.children), __esModule: true },
    'lucide-react': new Proxy({}, { get: () => () => null }) };
  const instance = { exports: {} };
  const code = transformSync(fs.readFileSync('src/pages/AdminCustomersPage.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(name => modules[name] || require(name), instance, instance.exports);
  const render = () => {cursor = 0;refCursor = 0;return instance.exports.default();};
  const buttons = () => {
    const result = [], visit = node => {if (Array.isArray(node)) return node.forEach(visit);if (!React.isValidElement(node)) return;
      if (node.type === 'button') result.push(node);visit(node.props.children);};visit(render());return result;
  };
  render();return { render, buttons, unmount: () => cleanups.forEach(cleanup => cleanup?.()),
    load: async () => {effects.forEach(effect => cleanups.push(effect()));await Promise.resolve();await Promise.resolve();} };
}

test('Khóa khách hàng chờ xác nhận máy chủ, chặn nhấn trùng và cập nhật modal từ dữ liệu mới', async () => {
  let row = { id: 18, role: 'ROLE_USER', fullName: 'Khách thật', isActive: true, loyaltyPoints: 17, totalOrders: 0 }, release, calls = 0;
  const waiting = new Promise(resolve => {release = resolve;});
  const page = customerHarness({ getAllUsers: async () => [row, { id: 99, role: 'ROLE_ADMIN', fullName: 'Không đưa vào danh sách' }],
    updateUserStatus: async (id, active) => {calls++;await waiting;row = { ...row, isActive: active };} });
  await page.load();assert.doesNotMatch(renderToStaticMarkup(page.render()), /Không đưa vào danh sách/);
  page.buttons().find(button => button.props.title === 'Xem chi tiết').props.onClick();
  const handler = page.buttons().find(button => button.props.title === 'Khóa tài khoản').props.onClick;
  const first = handler();await handler();assert.equal(calls, 1);
  release();await first;assert.ok(page.buttons().find(button => button.props.title === 'Mở khóa tài khoản'));
  assert.match(renderToStaticMarkup(page.render()), /Tài khoản tạm khóa/);assert.match(renderToStaticMarkup(page.render()), /17/);
});

test('Khách hàng lỗi API không báo khóa thành công, lỗi danh sách có nút làm mới và không giả rỗng', async () => {
  let fail = true;
  const page = customerHarness({ getAllUsers: async () => {if (fail) throw new Error('Danh sách khách lỗi');return [{ id: 7, fullName: 'Khách giữ nguyên', isActive: true }];},
    updateUserStatus: async () => {throw { response: { data: { message: 'Không có quyền khóa' } } };} });
  await page.load();let html = renderToStaticMarkup(page.render());assert.match(html, /Danh sách khách lỗi/);
  assert.doesNotMatch(html, /Không tìm thấy khách hàng nào/);fail = false;
  await page.buttons().find(button => button.props.children === 'Làm mới khách hàng').props.onClick();
  await page.buttons().find(button => button.props.title === 'Khóa tài khoản').props.onClick();
  html = renderToStaticMarkup(page.render());assert.match(html, /Không có quyền khóa/);assert.doesNotMatch(html, /Đã tạm khóa tài khoản/);
  assert.ok(page.buttons().find(button => button.props.title === 'Khóa tài khoản'));
});

test('Trang quản trị dùng tài khoản thật, hồ sơ có liên kết và gỡ icon trạng thái giả', () => {
  const patchedReact = { ...React, useState: initial => [initial, () => {}], useEffect: () => {} };
  const modules = { react: patchedReact, '../context/AuthContext': { useAuth: () => ({ user: { username: 'admin-thật', role: 'ROLE_ADMIN' }, logout() {} }) },
    './AdminSearch': { default: () => null, __esModule: true }, 'react-router-dom': {
      Link: props => React.createElement('a', { href: props.to, 'aria-label': props['aria-label'] }, props.children),
      NavLink: props => React.createElement('a', { href: props.to }, props.children), useNavigate: () => () => {}, useLocation: () => ({ pathname: '/admin' }) },
    'lucide-react': new Proxy({}, { get: () => () => null }) };
  const instance = { exports: {} }, code = transformSync(fs.readFileSync('src/components/AdminLayout.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(name => modules[name] || require(name), instance, instance.exports);
  const html = renderToStaticMarkup(React.createElement(instance.exports.default, null, 'Nội dung'));
  assert.match(html, /admin-thật/);assert.match(html, /Quản trị viên/);assert.match(html, /href="\/profile"/);assert.match(html, /Trang quản trị/);
  assert.doesNotMatch(html, /Hoàng Nam|Super Admin|Hệ thống hoạt động ổn định|Tin nhắn CSKH|Thông báo đơn mới/);
});

test('API quản trị ẩn/hiện và phản hồi dùng đúng endpoint và JSON', async () => {
  const calls = [], client = { put: (...args) => {calls.push(args);return Promise.resolve();}, defaults: {} };
  const instance = { exports: {} }, code = transformSync(fs.readFileSync('src/api/adminApi.js', 'utf8'), { format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(() => ({ default: client, __esModule: true }), instance, instance.exports);
  await instance.exports.adminApi.updateReviewVisibility(12, false);await instance.exports.adminApi.replyReview(12, null);
  assert.deepEqual(calls, [['/admin/reviews/12/visibility', { visible: false }], ['/admin/reviews/12/reply', { reply: null }]]);
});

function readOnlyAdminHarness(filename, api) {
  const values = [], refs = [], effects = [], cleanups = [];let cursor = 0, refCursor = 0;
  const patchedReact = { ...React, useState: initial => {
    const index = cursor++;if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], next => {values[index] = typeof next === 'function' ? next(values[index]) : next;}];
  }, useRef: initial => refs[refCursor++] ||= { current: initial }, useEffect: effect => {if (!effects.length) effects.push(effect);} };
  const modules = { react: patchedReact, '../api/adminApi': { adminApi: api }, '../utils/formatters': { getOrderStatusLabel },
    '../components/AdminLayout': { default: props => React.createElement('div', null, props.children), __esModule: true },
    '../components/AdminReportControls': { default: () => null, __esModule: true },
    'react-router-dom': { Link: props => React.createElement('a', { href: props.to }, props.children) },
    'lucide-react': new Proxy({}, { get: () => () => null }) };
  const instance = { exports: {} }, code = transformSync(fs.readFileSync(`src/pages/${filename}.jsx`, 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', code)
    (name => modules[name] || require(name), instance, instance.exports, () => 1, () => {});
  const render = () => {cursor = 0;refCursor = 0;return instance.exports.default();};
  const nodes = type => {
    const result = [], visit = node => {if (Array.isArray(node)) return node.forEach(visit);if (!React.isValidElement(node)) return;
      if (node.type === type) result.push(node);visit(node.props.children);};visit(render());return result;
  };
  const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : String(node ?? '');
  const button = label => nodes('button').find(node => text(node.props.children).includes(label));
  render();return { render, nodes, button, exports: instance.exports, unmount: () => cleanups.forEach(cleanup => cleanup?.()),
    load: async () => {effects.forEach(effect => cleanups.push(effect()));await Promise.resolve();await Promise.resolve();} };
}

const settingsResponse = () => ({ readOnly: true, store: { name: null, phone: null, email: null, address: null, verified: false },
  shipping: { fee: 30000, freeShippingThreshold: 1000000 }, loyalty: { paidAmountPerPoint: 10000, pointValue: 100, maxDiscountPercent: 10 },
  warranty: { days: 90, categoryIds: [1, 2, 3, 4] }, payment: { mode: 'REAL', connectionVerified: false } });
const dashboardResponse = changes => ({ totalRevenue: 0, totalOrders: 0, totalCustomers: 0, pendingOrders: 0,
  unverifiedPaidOrders: 0, topSellingProducts: [], recentOrders: [], dailyRevenue: {}, ...changes });

test('Cài đặt chỉ đọc lấy chính sách máy chủ, giữ 4 tab và không có ô nhập khóa hoặc lưu giả', async () => {
  const page = readOnlyAdminHarness('AdminSettingsPage', { getSettings: async () => settingsResponse() });
  await page.load();let html = renderToStaticMarkup(page.render());
  assert.match(html, /Thông tin liên hệ cửa hàng chưa được cấu hình và xác minh/);assert.match(html, /Chưa có thông tin/);
  assert.doesNotMatch(html, /1900 6886|support@|Lê Duẩn|Landmark|JSC|Lưu tất cả|Cập nhật thông tin|<input|<form/);
  page.button('Vận chuyển & Chính sách').props.onClick();html = renderToStaticMarkup(page.render());
  assert.match(html, /30\.000 đ/);assert.match(html, /1\.000\.000 đ/);assert.match(html, /10\.000 đ/);assert.match(html, /100 đ/);
  assert.match(html, /10%/);assert.match(html, /90 ngày/);assert.match(html, /phụ kiện không áp dụng/);
  page.button('Thanh toán PayOS VietQR').props.onClick();html = renderToStaticMarkup(page.render());
  assert.match(html, /REAL/);assert.match(html, /Chưa xác minh kết nối/);assert.doesNotMatch(html, /type="password"|<input/);
  page.button('Dịch vụ căng cước').props.onClick();html = renderToStaticMarkup(page.render());
  assert.match(html, /Chưa có cấu hình máy/);assert.doesNotMatch(html, /Victor VE-50|Yonex Precision|đơn thứ 6|50\.000|4 Nút BWF/);
});

test('Cài đặt lỗi GET và dữ liệu sai không hiện cấu hình mẫu; retry và unmount an toàn', async () => {
  let fail = true;
  const page = readOnlyAdminHarness('AdminSettingsPage', { getSettings: async () => {if (fail) throw new Error('Chính sách lỗi');return settingsResponse();} });
  await page.load();assert.match(renderToStaticMarkup(page.render()), /Chính sách lỗi/);fail = false;
  await page.button('Làm mới chính sách').props.onClick();assert.match(renderToStaticMarkup(page.render()), /Thông tin cửa hàng/);
  assert.throws(() => page.exports.normalizeAdminSettings({ ...settingsResponse(), shipping: { fee: -1, freeShippingThreshold: 1000000 } }));
  let release;const pending = new Promise(resolve => {release = resolve;});
  const late = readOnlyAdminHarness('AdminSettingsPage', { getSettings: async () => pending });
  await late.load();late.unmount();release(settingsResponse());await Promise.resolve();await Promise.resolve();
  assert.doesNotMatch(renderToStaticMarkup(late.render()), /Thông tin cửa hàng/);
});

test('Dashboard xếp hạng từ API giữ SKU, số lượng, sản phẩm đã ngừng bán và giá trị tiền hàng có chú thích', async () => {
  const page = readOnlyAdminHarness('AdminDashboardPage', { getDashboardStats: async () => dashboardResponse({
    totalRevenue: 200000, totalOrders: 1, topSellingProducts: [{ productId: 7, productSku: 'HG-SHOE-007', productName: 'Giày cũ đúng mẫu',
      quantity: 2, grossMerchandiseAmount: 210000, productDeleted: true }],
    recentOrders: [{ id: 18, payosOrderCode: 9000000018, totalAmount: 200000, status: 'COMPLETED', paymentMethod: 'COD', cashCollected: true,
      customerName: 'Khách thật', createdAt: '2026-10-14T10:00:00', items: [{ productName: 'Giày cũ đúng mẫu' }] }],
    dailyRevenue: { '2026-10-14': 200000 } }) });
  await page.load();const html = renderToStaticMarkup(page.render());
  assert.match(html, /Giày cũ đúng mẫu/);assert.match(html, /HG-SHOE-007/);assert.match(html, /2 sản phẩm/);assert.match(html, /Đã ngừng bán/);
  assert.match(html, /210\.000/);assert.match(html, /trước voucher và đổi điểm/);assert.match(html, /#HG-18/);
  assert.match(html, /href="\/admin\/orders\?search=%23HG-18"/);assert.doesNotMatch(html, /#HG-9000000018|Live Ops|Chưa hỗ trợ/);
});

test('Dashboard 0 là số thật; thiếu hoặc sai thông số báo lỗi và không dựng số 0', async () => {
  const page = readOnlyAdminHarness('AdminDashboardPage', { getDashboardStats: async () => dashboardResponse() });
  await page.load();const html = renderToStaticMarkup(page.render());
  assert.match(html, /Chưa có sản phẩm bán được xác minh trong kỳ/);assert.match(html, /Chưa có đơn hàng nào/);assert.doesNotMatch(html, /Chưa tải/);
  for (const value of [undefined, null, '', '  ', -1, 'NaN', {}, 1.5])
    assert.throws(() => page.exports.normalizeDashboardData(dashboardResponse({ totalRevenue: value })));
  const failed = readOnlyAdminHarness('AdminDashboardPage', { getDashboardStats: async () => dashboardResponse({ totalRevenue: null }) });
  await failed.load();assert.match(renderToStaticMarkup(failed.render()), /Dữ liệu doanh thu không hợp lệ/);
  assert.match(renderToStaticMarkup(failed.render()), /Chưa tải/);assert.doesNotMatch(renderToStaticMarkup(failed.render()), /Chưa có đơn hàng nào/);
  assert.equal(page.exports.normalizeDashboardOrder({ id: 18 }).amount, null);
});

test('Dashboard phản hồi cũ và sau unmount không ghi đè báo cáo mới, lỗi API có thể làm mới', async () => {
  let calls = 0, release;const pending = new Promise(resolve => {release = resolve;});
  const page = readOnlyAdminHarness('AdminDashboardPage', { getDashboardStats: async () => {calls++;return calls === 1 ? pending : dashboardResponse({ totalOrders: 3 });} });
  await page.load();await page.button('Làm mới').props.onClick();
  release(dashboardResponse({ totalOrders: 99 }));await Promise.resolve();await Promise.resolve();
  const html = renderToStaticMarkup(page.render());assert.match(html, />3<\/span>/);assert.doesNotMatch(html, />99<\/span>/);
  let fail = true;const retry = readOnlyAdminHarness('AdminDashboardPage', { getDashboardStats: async () => {if (fail) throw new Error('Mất kết nối báo cáo');return dashboardResponse();} });
  await retry.load();assert.match(renderToStaticMarkup(retry.render()), /Mất kết nối báo cáo/);fail = false;
  await retry.button('Làm mới').props.onClick();assert.match(renderToStaticMarkup(retry.render()), /Chưa có đơn hàng nào/);
  let end;const late = readOnlyAdminHarness('AdminDashboardPage', { getDashboardStats: async () => new Promise(resolve => {end = resolve;}) });
  await late.load();late.unmount();end(dashboardResponse());await Promise.resolve();await Promise.resolve();
  assert.match(renderToStaticMarkup(late.render()), /Chưa tải/);
});

test('API cài đặt chỉ gọi endpoint GET quản trị và không gửi thông tin bí mật', async () => {
  const calls = [], client = { get: (...args) => {calls.push(args);return Promise.resolve();}, defaults: {} };
  const instance = { exports: {} }, code = transformSync(fs.readFileSync('src/api/adminApi.js', 'utf8'), { format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(() => ({ default: client, __esModule: true }), instance, instance.exports);
  await instance.exports.adminApi.getSettings();assert.deepEqual(calls, [['/admin/dashboard/settings']]);
});
const rmaProducts = [
  { id: 8, name: 'Mẫu thay thế', brand: 'Yonex', categoryId: 2, catalogVisible: true, variants: [{ id: 82, color: 'Đỏ', size: '41', stock: 4, active: true }] },
  { id: 3, name: 'Mẫu gốc', brand: 'Yonex', categoryId: 2, catalogVisible: true, variants: [{ id: 32, color: 'Xanh', size: '40', stock: 3, active: true },
    { id: 33, size: '41', stock: 1, active: true }, { id: 34, stock: 10, active: false }, { id: 35, stock: 10, active: true, legacy: true }] },
  { id: 9, name: 'Khác hãng', brand: 'Victor', categoryId: 2, catalogVisible: true, variants: [{ id: 92, stock: 20, active: true }] },
  { id: 10, name: 'Khác danh mục', brand: 'Yonex', categoryId: 1, catalogVisible: true, variants: [{ id: 102, stock: 20, active: true }] },
  { id: 11, name: 'Sản phẩm đang ẩn', brand: 'Yonex', categoryId: 2, catalogVisible: false, variants: [{ id: 112, stock: 20, active: true }] },
];

test('Admin RMA giữ snapshot đúng sản phẩm/biến thể đã xóa và không dựng serial, điện thoại, ngày hoặc lab', async () => {
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow({ serialNumber: null, createdAt: null, productDeleted: true })] });
  await page.load();

  const html = renderToStaticMarkup(page.render());

  assert.match(html, /Giày Yonex mẫu đã ngừng bán/); assert.match(html, /Kích cỡ: 40/); assert.match(html, /Màu: Xanh/);
  assert.match(html, /Số lượng bảo hành: 2/); assert.match(html, /RMA-7/); assert.match(html, /#HG-29/);
  assert.doesNotMatch(html, /SN-7|0988 123 456|Gần đây|Phòng Lab|IN_REVIEW|Bước.*4/);
});

test('Bộ chọn hàng đổi ưu tiên cùng sản phẩm, loại sai hãng/danh mục/hết hàng/ẩn/legacy', () => {
  const page = adminRmaHarness({});
  const choices = page.exports.replacementOptions(rmaRow(), rmaProducts);
  assert.deepEqual(choices.map(item => item.id), [32, 82]); assert.equal(choices[0].original, true);
  assert.deepEqual(page.exports.replacementOptions(rmaRow({ quantity: null }), rmaProducts), []);
  assert.deepEqual(page.exports.replacementOptions(rmaRow({ brandSnapshot: null }), rmaProducts), []);
});

test('PENDING duyệt bằng API chuẩn, terminal không có nút thay đổi và phản hồi không đúng không báo thành công', async () => {
  let row = rmaRow({ status: 'PENDING' }); const updates = [];
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [row],
    updateReturnStatus: async (...args) => { updates.push(args); row = { ...row, status: args[1] }; return row; } });
  await page.load(); await page.button('Duyệt bảo hành').props.onClick();
  assert.deepEqual(updates, [[7, 'APPROVED', '', undefined]]); assert.ok(page.button('Hoàn tất đổi hàng'));
  const terminal = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow({ status: 'REJECTED' })] });
  await terminal.load(); assert.equal(terminal.button('Duyệt bảo hành'), undefined); assert.equal(terminal.button('Hoàn tất đổi hàng'), undefined);
  assert.equal(terminal.button('Từ chối bảo hành'), undefined);
  const failed = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow({ status: 'PENDING' })],
    updateReturnStatus: async () => ({ id: 7, status: 'PENDING' }) });
  await failed.load(); await failed.button('Duyệt bảo hành').props.onClick();
  assert.match(renderToStaticMarkup(failed.render()), /Chưa xác nhận được trạng thái/);
  assert.doesNotMatch(renderToStaticMarkup(failed.render()), /Đã cập nhật:/);
});

test('Hoàn tất chọn hàng đổi thật, yêu cầu ghi chú khi đổi mẫu khác và giữ form sau lỗi tồn kho', async () => {
  const updates = [], productsRequested = [];
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow()],
    updateReturnStatus: async (...args) => { updates.push(args); throw { response: { data: { message: 'Hàng đổi không đủ tồn kho' } } }; } },
    { getProducts: async params => { productsRequested.push(params); return rmaProducts; } });
  await page.load(); await page.button('Hoàn tất đổi hàng').props.onClick();
  assert.deepEqual(productsRequested, [{ categoryId: 2, brand: 'Yonex', catalogScope: 'all' }]);
  page.nodes('select')[0].props.onChange({ target: { value: '82' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(updates.length, 0); assert.match(renderToStaticMarkup(page.render()), /ghi nhận sự đồng ý/);
  page.nodes('textarea')[0].props.onChange({ target: { value: 'Khách đồng ý đổi mẫu thay thế' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(updates, [[7, 'COMPLETED', 'Khách đồng ý đổi mẫu thay thế', 82]]);
  assert.equal(page.nodes('form').length, 1); assert.equal(page.nodes('select')[0].props.value, '82');
  assert.equal(page.nodes('textarea')[0].props.value, 'Khách đồng ý đổi mẫu thay thế');
  assert.match(renderToStaticMarkup(page.render()), /Hàng đổi không đủ tồn kho/);
});

test('Đổi size hoặc màu khác trong cùng sản phẩm cũng cần ghi nhận đồng ý của khách', async () => {
  let calls = 0;
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow()], updateReturnStatus: async () => { calls++; } },
    { getProducts: async () => [{ ...rmaProducts[1], variants: [{ id: 36, size: '41', color: 'Đỏ', stock: 3, active: true }] }] });
  await page.load(); await page.button('Hoàn tất đổi hàng').props.onClick();
  page.nodes('select')[0].props.onChange({ target: { value: '36' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(calls, 0); assert.match(renderToStaticMarkup(page.render()), /Đổi mẫu hoặc biến thể khác phải ghi nhận/);
});

test('RMA khóa gửi trùng và không tự hoàn tất nếu API hoặc refresh danh sách thất bại', async () => {
  let release, calls = 0, row = rmaRow({ status: 'PENDING' });
  const pending = new Promise(resolve => { release = resolve; });
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [row],
    updateReturnStatus: async () => { calls++; await pending; row = { ...row, status: 'APPROVED' }; return row; } });
  await page.load(); const approve = page.button('Duyệt bảo hành').props.onClick;
  const first = approve(); await approve(); assert.equal(calls, 1);
  assert.equal(page.button('Duyệt bảo hành').props.disabled, true);
  release(); await first; assert.ok(page.button('Hoàn tất đổi hàng'));
});

test('Hoàn tất đổi cùng sản phẩm dùng variant đã chọn, đọc lại trạng thái thật và đóng form', async () => {
  let row = rmaRow(); const calls = [];
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [row], updateReturnStatus: async (...args) => {
    calls.push(args); row = { ...row, status: 'COMPLETED', replacementVariantId: args[3], completedAt: '2026-10-13T12:00:00' }; return row;
  } }, { getProducts: async () => rmaProducts });
  await page.load(); await page.button('Hoàn tất đổi hàng').props.onClick();
  page.nodes('select')[0].props.onChange({ target: { value: '32' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls, [[7, 'COMPLETED', '', 32]]); assert.equal(page.nodes('form').length, 0);
  assert.equal(page.button('Hoàn tất đổi hàng'), undefined); assert.equal(page.button('Từ chối bảo hành'), undefined);
  assert.match(renderToStaticMarkup(page.render()), /biến thể #32/); assert.doesNotMatch(renderToStaticMarkup(page.render()), /Đã hoàn tiền/);
});

test('Từ chối yêu cầu cần ghi lý do và không mất dữ liệu khi API trả lỗi', async () => {
  const calls = [];
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow({ status: 'PENDING' })],
    updateReturnStatus: async (...args) => { calls.push(args); throw new Error('Chưa cập nhật'); } });
  await page.load(); await page.button('Từ chối bảo hành').props.onClick();
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} }); assert.equal(calls.length, 0);
  page.nodes('textarea')[0].props.onChange({ target: { value: 'Không đủ điều kiện bảo hành' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls, [[7, 'REJECTED', 'Không đủ điều kiện bảo hành', undefined]]);
  assert.equal(page.nodes('textarea')[0].props.value, 'Không đủ điều kiện bảo hành'); assert.match(renderToStaticMarkup(page.render()), /Chưa cập nhật/);
});

test('Đóng modal hoặc unmount không nhận bộ chọn hàng đổi trả về muộn', async () => {
  let resolveProducts, started;
  const productsStarted = new Promise(resolve => { started = resolve; });
  const pending = new Promise(resolve => { resolveProducts = resolve; });
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow()] },
    { getProducts: async () => { started(); return pending; } });
  await page.load(); const opening = page.button('Hoàn tất đổi hàng').props.onClick(); await productsStarted;
  page.button('Hủy').props.onClick(); page.unmount(); resolveProducts(rmaProducts); await opening;
  assert.equal(page.nodes('form').length, 0); assert.doesNotMatch(renderToStaticMarkup(page.render()), /Mẫu thay thế/);
});

test('Lỗi tải reviews không ngăn RMA và refresh thất bại không báo cập nhật hoàn tất giả', async () => {
  let loads = 0;
  const page = adminRmaHarness({ getAllReviews: async () => { throw new Error('Reviews chưa tải'); }, getAllReturns: async () => {
    if (++loads > 1) throw new Error('Mất kết nối'); return [rmaRow({ status: 'PENDING' })];
  }, updateReturnStatus: async () => rmaRow({ status: 'APPROVED' }) });
  await page.load(); assert.ok(page.button('Duyệt bảo hành'));
  await page.button('Duyệt bảo hành').props.onClick();
  assert.match(renderToStaticMarkup(page.render()), /Đã lưu trạng thái nhưng chưa tải lại/);
  assert.doesNotMatch(renderToStaticMarkup(page.render()), /Đã cập nhật:/);
});

test('Mount lại không để lần tải RMA cũ ghi đè trạng thái mới', async () => {
  let resolveOld, loads = 0;
  const old = new Promise(resolve => { resolveOld = resolve; });
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => {
    return ++loads === 1 ? old : [rmaRow({ status: 'APPROVED' })];
  } });
  await page.load(); await page.restartEffects();
  assert.ok(page.button('Hoàn tất đổi hàng')); resolveOld([rmaRow({ status: 'PENDING' })]);
  await old; await Promise.resolve(); await Promise.resolve();
  assert.ok(page.button('Hoàn tất đổi hàng')); assert.equal(page.button('Duyệt bảo hành'), undefined);
});

test('Phản hồi khác phiếu hoặc khác hàng đổi không được ghi là hoàn tất thành công', async () => {
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow()],
    updateReturnStatus: async () => rmaRow({ status: 'COMPLETED', replacementVariantId: 82 }) }, { getProducts: async () => rmaProducts });
  await page.load(); await page.button('Hoàn tất đổi hàng').props.onClick();
  page.nodes('select')[0].props.onChange({ target: { value: '32' } });
  await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(page.nodes('form').length, 1); assert.match(renderToStaticMarkup(page.render()), /Chưa xác nhận được đúng hàng đổi/);
  assert.doesNotMatch(renderToStaticMarkup(page.render()), /Đã cập nhật:/);
});

test('Phiếu RMA CSV chứa dữ liệu thực, trạng thái và hàng đổi; chặn công thức Excel', async () => {
  let saved;
  const page = adminRmaHarness({}, {}, (blob, filename) => { saved = { blob, filename }; });
  page.exports.exportRmaSheet(page.exports.normalizeAdminRma(rmaRow({ userFullName: '=HYPERLINK("bad")',
    status: 'COMPLETED', replacementVariantId: 82, adminNote: 'Khách đồng ý', completedAt: '2026-10-13T11:00:00' })));
  const csv = await saved.blob.text();
  assert.equal(saved.filename, 'phieu-rma-7.csv'); assert.match(csv, /"HG-SHOE-003","40","Xanh"/);
  assert.match(csv, /"82"/); assert.match(csv, /Khách đồng ý/); assert.match(csv, /Đã hoàn tất đổi hàng/);
  assert.match(csv, /'\=HYPERLINK/); assert.doesNotMatch(csv, /SN-7|Phòng Lab|Đã hoàn tiền/);
});

test('Minh chứng chỉ tải Blob từ endpoint riêng và không tải URL ảnh ngoài; lỗi không tạo file', async () => {
  let saved, requests = 0;
  const page = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow({ imageUrl: 'https://outside.invalid/photo.jpg' })],
    getReturnEvidence: async id => { assert.equal(id, 7); requests++; return new Blob(['image'], { type: 'image/png' }); } }, {},
    (blob, filename) => { saved = { blob, filename }; });
  await page.load(); await page.button('Tải minh chứng bảo hành').props.onClick();
  assert.equal(requests, 1); assert.equal(saved.filename, 'minh-chung-rma-7.png');
  assert.doesNotMatch(renderToStaticMarkup(page.render()), /outside\.invalid/);
  const invalid = adminRmaHarness({ getAllReviews: async () => [], getAllReturns: async () => [rmaRow()],
    getReturnEvidence: async () => new Blob(['{"message":"forbidden"}'], { type: 'application/json' }) }, {}, () => assert.fail('Không được tải file lỗi'));
  await invalid.load(); await invalid.button('Tải minh chứng bảo hành').props.onClick();
  assert.match(renderToStaticMarkup(invalid.render()), /Minh chứng không phải ảnh hợp lệ/);
});

test('Admin API giữ status/ghi chú/variant params và tải minh chứng bằng Blob', async () => {
  const calls = [], runtime = { exports: {} };
  const client = { put: (...args) => calls.push(['put', ...args]), get: (...args) => calls.push(['get', ...args]) };
  const code = transformSync(fs.readFileSync('src/api/adminApi.js', 'utf8'), { loader: 'js', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', code)(() => ({ default: client, __esModule: true }), runtime, runtime.exports);
  runtime.exports.adminApi.updateReturnStatus(7, 'COMPLETED', 'Khách đồng ý', 82);
  runtime.exports.adminApi.getReturnEvidence(7);
  assert.deepEqual(calls, [['put', '/returns/7/status', null, { params: { status: 'COMPLETED', adminNote: 'Khách đồng ý', replacementVariantId: 82 } }],
    ['get', '/returns/7/evidence', { responseType: 'blob' }]]);
});
