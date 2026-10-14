import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { 'react-router-dom': 'react-router' } },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => server.close());
const { MemoryRouter } = await server.ssrLoadModule('react-router');
const { default: AdminProductsPage } = await server.ssrLoadModule('/src/pages/AdminProductsPage.jsx');
const { default: AdminProductFields } = await server.ssrLoadModule('/src/components/AdminProductFields.jsx');
const inventory = await server.ssrLoadModule('/src/components/AdminVariantInventory.jsx');
const { AuthProvider } = await server.ssrLoadModule('/src/context/AuthContext.jsx');
const { productToAdminForm } = await server.ssrLoadModule('/src/utils/adminProductForm.jsx');
const productFormTools = await server.ssrLoadModule('/src/utils/adminProductForm.jsx');
const searchHelpers = await server.ssrLoadModule('/src/utils/adminCustomers.jsx');
const { adminApi } = await server.ssrLoadModule('/src/api/adminApi.js');
const { default: axiosClient } = await server.ssrLoadModule('/src/api/axiosClient.js');

test('Trang quản trị thực render được, có bộ lọc ẩn/hiện và sáu thương hiệu', () => {
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/admin/products'] },
    React.createElement(AuthProvider, null, React.createElement(AdminProductsPage))));
  assert.match(html, /Trạng thái hiển thị/); assert.match(html, /Đang tải sản phẩm/);
  for (const brand of ['Yonex', 'Victor', 'Li-Ning', 'Mizuno', 'Kawasaki', 'Fleet']) assert.match(html, new RegExp(brand));
});

test('Form hiển thị thông số riêng từng danh mục, không dùng lực căng cho giày/quần áo/túi/phụ kiện', () => {
  const labels = { 1: 'Lực căng tối đa', 2: 'Công nghệ đệm', 3: 'Chất liệu vải', 4: 'Sức chứa vợt', 5: 'Loại phụ kiện' };
  for (const categoryId of [1, 2, 3, 4, 5]) {
    const form = productToAdminForm({ categoryId });
    const html = renderToStaticMarkup(React.createElement(AdminProductFields, { form, onChange: () => {} }));
    assert.match(html, new RegExp(labels[categoryId]));
    if (categoryId !== 1) assert.doesNotMatch(html, /Lực căng tối đa/);
    assert.match(html, /Mô tả sản phẩm/); assert.match(html, /Xuất xứ/);
  }
});

test('API ẩn/hiện chỉ gửi boolean, dùng PATCH và không gửi DELETE hoặc tồn kho', async () => {
  const original = axiosClient.patch;
  let request;
  axiosClient.patch = async (url, body) => { request = { url, body }; return { id: 51, catalogVisible: false }; };
  try {
    const result = await adminApi.updateProductVisibility(51, false);
    assert.deepEqual(request, { url: '/products/51/visibility', body: { catalogVisible: false } });
    assert.equal(result.catalogVisible, false);
  } finally { axiosClient.patch = original; }
});

test('Form thực khóa lựa chọn đã có biến thể và vẫn cho sửa chất liệu/giá/mô tả', () => {
  const form = productToAdminForm({ categoryId: 2, availableSizes: '["35","42"]', colorName: 'Đỏ', variants: [{ id: 11 }] });
  const html = renderToStaticMarkup(React.createElement(AdminProductFields, { form, onChange: () => {} }));
  const inputs = html.match(/<input[^>]*>/g);
  assert.match(inputs.find(input => input.includes('id="product-availableSizes"')), /\sdisabled=/);
  assert.match(inputs.find(input => input.includes('id="product-colorName"')), /\sdisabled=/);
  assert.doesNotMatch(inputs.find(input => input.includes('id="product-upperMaterial"')), /\sdisabled=/);
  assert.match(html, /tổng hợp từ biến thể/);
});

test('UI tồn kho thực có thêm tổ hợp, trạng thái từng dòng và khóa legacy/giữ chỗ', () => {
  const variants = [{ id: 1, sku: 'HG-SHOE-001-V1', color: 'Xanh', size: '35', stock: 20, reservedStock: 0, active: true },
    { id: 2, sku: 'HG-SHOE-001-V2', size: '42', stock: 0, reservedStock: 1, active: true },
    { id: 3, sku: 'HG-SHOE-001-OLD', size: '44', stock: 4, reservedStock: 0, active: false, legacy: true }];
  const html = renderToStaticMarkup(React.createElement(inventory.default, { product: { id: 1, categoryId: 2, variants }, onSaved: async () => true }));
  assert.match(html, /Thêm tổ hợp mới/); assert.match(html, /Thêm biến thể/);
  const inputs = html.match(/<input[^>]*>/g);
  assert.doesNotMatch(inputs.find(input => input.includes('aria-label="Đang bán HG-SHOE-001-V1"')), /disabled/);
  assert.match(inputs.find(input => input.includes('aria-label="Đang bán HG-SHOE-001-V2"')), /disabled/);
  assert.match(inputs.find(input => input.includes('aria-label="Tồn kho HG-SHOE-001-OLD"')), /disabled/);
});

test('Mutation production gọi POST/PATCH đúng tổ hợp, optimistic stock và reload sau lưu', async () => {
  const oldPost = axiosClient.post; const oldPatch = axiosClient.patch; const calls = []; let reload = 0;
  axiosClient.post = async (url, body) => { calls.push({ url, body }); return { id: 12, ...body }; };
  axiosClient.patch = async (url, body) => { calls.push({ url, body }); return { id: 12, ...body }; };
  try {
    await inventory.createVariantInventory({ id: 9, categoryId: 2 }, { size: '39.5', color: 'Đỏ', stock: '20' }, async () => { reload++; return true; });
    await inventory.saveVariantInventory(9, { id: 12, stock: 20, reservedStock: 0 }, '0', false, async () => { reload++; return true; });
    assert.equal(reload, 2); assert.equal(calls[0].url, '/products/9/variants');
    assert.deepEqual(calls[0].body, { color: 'Đỏ', size: '39.5', weightGrip: null, packaging: null, stock: 20, active: true });
    assert.deepEqual(calls[1], { url: '/products/9/variants/12', body: { stock: 0, expectedStock: 20, active: false } });
    await assert.rejects(inventory.saveVariantInventory(9, { id: 12, stock: 20 }, '20', true, async () => false), /Đã lưu.*chưa tải lại/);
    axiosClient.patch = async () => { throw { response: { status: 409, data: { message: 'Kho đã thay đổi' } } }; };
    await assert.rejects(inventory.saveVariantInventory(9, { id: 12, stock: 20 }, '19', true, async () => { reload++; }), error => error.response.status === 409);
    assert.equal(reload, 2);
  } finally { axiosClient.post = oldPost; axiosClient.patch = oldPatch; }
});

function runtimeNodes(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => runtimeNodes(child, type));
  if (!React.isValidElement(node)) return [];
  if (typeof node.type === 'function') return runtimeNodes(node.type(node.props), type);
  return [...(node.type === type ? [node] : []), ...runtimeNodes(node.props.children, type)];
}

function adminRuntime(path, modules = {}, locationSearch = '') {
  const values = [], refs = [], effects = [], instance = { exports: {} }, listeners = new Map();
  let cursor = 0, refCursor = 0, effectCursor = 0, timer;
  const react = { ...React, useState: initial => {
    const index = cursor++; if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
  }, useRef: initial => refs[refCursor++] ||= { current: initial }, useEffect: (callback, deps = []) => {
    const index = effectCursor++, old = effects[index];
    if (!old || deps.some((value, i) => value !== old.deps[i])) effects[index] = { callback, deps, pending: true, cleanup: old?.cleanup };
  } };
  const window = { location: { search: locationSearch }, addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name) };
  const document = { querySelector: () => null };
  const dependencies = { react, 'lucide-react': new Proxy({}, { get: () => () => null }), ...modules };
  const code = transformSync(fs.readFileSync(path, 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', 'window', 'document', 'setTimeout', 'clearTimeout', code)(name => dependencies[name], instance,
    instance.exports, window, document, callback => { timer = callback; return 1; }, () => { timer = null; });
  const render = type => { cursor = 0; refCursor = 0; effectCursor = 0; return runtimeNodes(instance.exports.default(), type); };
  const effectsRun = async () => { for (const effect of effects) if (effect.pending) {
    effect.pending = false; effect.cleanup?.(); effect.cleanup = effect.callback();
  } await Promise.resolve(); await Promise.resolve(); };
  return { exports: instance.exports, nodes: render, effects: effectsRun, tick: async () => { const callback = timer; timer = null; await callback?.(); },
    key: event => listeners.get('keydown')?.(event), refs };
}

function searchHarness(getProducts) {
  const navigations = [];
  const products = [384, 385, 386].map(id => ({ id, name: `Giày Yonex ${id}`, sku: `HG-SHOE-${id}`, brand: 'Yonex' }));
  const page = adminRuntime('src/components/AdminSearch.jsx', { 'react-router-dom': { useNavigate: () => href => navigations.push(href) },
    '../api/productApi': { productApi: { getProducts: getProducts || (async () => products) } },
    '../api/adminApi': { adminApi: { getOrders: async () => [], getAllUsers: async () => [] } }, '../utils/adminCustomers.jsx': searchHelpers });
  return { ...page, navigations, input: () => page.nodes('input')[0],
    query: async value => { page.nodes('input')[0].props.onChange({ target: { value } }); page.nodes('input'); await page.effects(); await page.tick(); } };
}

const keyEvent = key => ({ key, preventDefault() {} });

test('Tìm ID trong quản trị dẫn đến ID tương ứng; truy vấn SKU vẫn giữ liên kết cũ', () => {
  const page = searchHarness(), lists = [[{ id: 384, name: 'Giày Yonex', sku: 'HG-SHOE-009', brand: 'Yonex' }], [], []]
    .map(value => ({ status: 'fulfilled', value }));
  const byId = page.exports.searchResults(lists, '384');
  assert.equal(byId.length, 1); assert.equal(byId[0].href, '/admin/products?search=384');
  assert.equal(page.exports.searchResults(lists, 'HG-SHOE-009')[0].href, '/admin/products?search=HG-SHOE-009');
});

test('Gợi ý quản trị ArrowDown chọn đúng dòng thứ hai, Enter đi đúng liên kết và Escape đóng', async () => {
  const page = searchHarness(); await page.query('yonex');
  page.input().props.onKeyDown(keyEvent('ArrowDown'));
  page.input().props.onKeyDown(keyEvent('ArrowDown'));
  const input = page.input(), options = page.nodes('button');
  assert.equal(input.props['aria-activedescendant'], options[1].props.id);
  assert.equal(options[1].props['aria-selected'], true);
  assert.equal(options[0].props['aria-selected'], false);
  input.props.onKeyDown(keyEvent('Enter'));
  assert.deepEqual(page.navigations, ['/admin/products?search=HG-SHOE-385']);
  assert.equal(page.input().props['aria-expanded'], false);
  page.input().props.onKeyDown(keyEvent('Enter'));
  assert.equal(page.navigations.length, 1);
  page.input().props.onFocus(); page.input().props.onKeyDown(keyEvent('Escape'));
  assert.equal(page.input().props['aria-expanded'], false);
});

test('ArrowUp vòng về kết quả cuối; đổi từ khóa không Enter kết quả cũ hoặc đang tải', async () => {
  const page = searchHarness(); await page.query('yonex');
  page.input().props.onKeyDown(keyEvent('ArrowUp'));
  assert.equal(page.input().props['aria-activedescendant'], page.nodes('button')[2].props.id);
  page.input().props.onKeyDown(keyEvent('ArrowDown'));
  assert.equal(page.input().props['aria-activedescendant'], page.nodes('button')[0].props.id);
  page.input().props.onChange({ target: { value: '385' } });
  assert.equal(page.input().props['aria-activedescendant'], undefined);
  page.input().props.onKeyDown(keyEvent('Enter'));
  assert.equal(page.navigations.length, 0);
  await page.effects(); await page.tick();
  assert.equal(page.nodes('button').length, 1);
  page.input().props.onKeyDown(keyEvent('ArrowDown'));
  page.input().props.onKeyDown(keyEvent('Enter'));
  assert.deepEqual(page.navigations, ['/admin/products?search=385']);
});

test('Ctrl+K tập trung input và mở gợi ý; API lỗi không Enter dữ liệu cũ', async () => {
  const page = searchHarness(); await page.query('yonex'); let focused = false;
  page.refs[0].current = { focus: () => { focused = true; } };
  page.key({ ...keyEvent('k'), ctrlKey: true });
  assert.equal(focused, true); assert.equal(page.input().props['aria-expanded'], true);
  page.key(keyEvent('Escape')); assert.equal(page.input().props['aria-expanded'], false);
  const failed = adminRuntime('src/components/AdminSearch.jsx', { 'react-router-dom': { useNavigate: () => () => { throw new Error('Không được điều hướng khi lỗi'); } },
    '../api/productApi': { productApi: { getProducts: async () => { throw new Error('Mất mạng'); } } },
    '../api/adminApi': { adminApi: { getOrders: async () => [], getAllUsers: async () => [] } }, '../utils/adminCustomers.jsx': searchHelpers });
  failed.nodes('input')[0].props.onChange({ target: { value: 'yonex' } }); failed.nodes('input'); await failed.effects(); await failed.tick();
  failed.nodes('input')[0].props.onKeyDown(keyEvent('Enter'));
  assert.ok(failed.nodes('p').some(node => node.props.role === 'alert'));
});

test('Phản hồi từ khóa cũ sau khi gõ từ khóa mới không phục hồi kết quả hoặc điều hướng', async () => {
  let resolveOld, calls = 0;
  const page = searchHarness(() => {
    calls++;
    if (calls === 1) return Promise.resolve([{ id: 384, name: 'Giày Yonex', sku: 'HG-SHOE-009' }]);
    if (calls === 2) return new Promise(resolve => { resolveOld = resolve; });
    return Promise.reject(new Error('Mất mạng'));
  });
  await page.query('yonex');
  page.input().props.onChange({ target: { value: 'fleet' } }); page.input(); await page.effects();
  const oldRequest = page.tick();
  page.input().props.onChange({ target: { value: 'victor' } });
  resolveOld([{ id: 385, name: 'Vợt Fleet', sku: 'HG-RACKET-010' }]); await oldRequest;
  assert.equal(page.nodes('button').length, 0);
  page.input().props.onKeyDown(keyEvent('Enter')); assert.equal(page.navigations.length, 0);
  await page.effects(); await page.tick();
  assert.ok(page.nodes('p').some(node => node.props.role === 'alert'));
  assert.equal(page.nodes('button').length, 0);
});

test('Bảng quản trị hiện ID và tìm sản phẩm sau khi upload theo ID', async () => {
  const rows = [384, 385].map((id, index) => ({ id, sku: `HG-SHOE-00${index + 8}`, name: 'Giày Yonex thử nhập', brand: 'Yonex', categoryId: 2, stock: 20, price: 100000, catalogVisible: false }));
  const page = adminRuntime('src/pages/AdminProductsPage.jsx', { '../components/AdminLayout': props => props.children,
    '../components/ProductImage': () => null, '../components/AdminProductFields': () => null, '../components/AdminProductImport': () => null,
    '../components/AdminVariantInventory': () => null, '../utils/adminProductForm': productFormTools, '../api/adminApi': { adminApi: {} },
    '../api/productApi': { productApi: { getProducts: async () => rows, getCategories: async () => [{ id: 2 }] } } }, '?search=384');
  page.nodes('input'); await page.effects();
  assert.match(page.nodes('input')[0].props.placeholder, /ID/);
  assert.equal(page.nodes('tr').length, 2);
  assert.ok(page.nodes('span').some(node => node.props.children === 'ID: 384'));
  assert.ok(page.nodes('span').some(node => node.props.children === 'HG-SHOE-008'));
});

test('Sửa mô tả voucher giữ nguyên giờ hết hạn; đổi hoặc xóa ngày gửi giá trị tương ứng', async () => {
  const updates = [], original = '2026-12-31T10:45:37';
  const row = { id: 5, code: 'HGTEST', description: 'Mã giảm kiểm thử', discountType: 'FIXED', discountValue: 10000,
    minOrderValue: 200000, maxUses: 100, usedCount: 3, expiresAt: original, isActive: true };
  const makePage = () => adminRuntime('src/pages/AdminVouchersPage.jsx', { '../components/AdminLayout': props => props.children,
    '../api/adminApi': { adminApi: { getAllVouchers: async () => [row], updateVoucher: async (id, payload) => { updates.push({ id, payload }); } } } });
  for (const [date, expected] of [[null, original], ['2027-01-02', '2027-01-02T23:59:59'], ['', null]]) {
    const page = makePage(); page.nodes('button'); await page.effects();
    page.nodes('button').find(node => node.props.title === 'Chỉnh sửa voucher').props.onClick();
    page.nodes('input').find(node => node.props.name === 'description').props.onChange({ target: { value: 'Mô tả đã sửa' } });
    if (date !== null) page.nodes('input').find(node => node.props.name === 'expiresAt').props.onChange({ target: { value: date } });
    await page.nodes('form')[0].props.onSubmit({ preventDefault() {} });
    assert.equal(updates.at(-1).payload.expiresAt, expected);
    assert.equal(updates.at(-1).payload.description, 'Mô tả đã sửa');
  }
});
