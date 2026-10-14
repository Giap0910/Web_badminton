import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const { default: AdminProductsPage } = await server.ssrLoadModule('/src/pages/AdminProductsPage.jsx');
const { default: AdminProductFields } = await server.ssrLoadModule('/src/components/AdminProductFields.jsx');
const inventory = await server.ssrLoadModule('/src/components/AdminVariantInventory.jsx');
const { AuthProvider } = await server.ssrLoadModule('/src/context/AuthContext.jsx');
const { productToAdminForm } = await server.ssrLoadModule('/src/utils/adminProductForm.jsx');
const { adminApi } = await server.ssrLoadModule('/src/api/adminApi.js');
const { default: axiosClient } = await server.ssrLoadModule('/src/api/axiosClient.js');
after(() => server.close());

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
