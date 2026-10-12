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
