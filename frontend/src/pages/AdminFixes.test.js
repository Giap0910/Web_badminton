import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'esbuild';
import { getOrderStatusLabel, getNextOrderStatuses, isOrderPaid } from '../utils/formatters.js';

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
