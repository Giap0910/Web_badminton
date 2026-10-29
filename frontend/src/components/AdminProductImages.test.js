import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => server.close());
const images = await server.ssrLoadModule('/src/components/AdminProductImages.jsx');
const { adminApi } = await server.ssrLoadModule('/src/api/adminApi.js');
const { default: axios } = await server.ssrLoadModule('/src/api/axiosClient.js');
const file = () => new File([new Uint8Array([1, 2])], 'test.png', { type: 'image/png' });
const url = position => `/api/media/products/9/00000000-0000-4000-8000-00000000000${position}.png`;
const slots = () => Array.from({ length: 4 }, (_, i) => ({ position: i + 1, status: 'READY', url: url(i + 1) }));

test('Bốn ô có nhãn 1–2–3–4, ảnh đại diện, định dạng và xác nhận quyền sử dụng', () => {
  const html = renderToStaticMarkup(React.createElement(images.default, { files: images.emptyProductImageFiles(),
    slots: [], approved: false, disabled: true, onApproved() {}, onSelect() {} }));
  assert.equal((html.match(/type="file"/g) || []).length, 4);
  for (let i = 1; i <= 4; i++) assert.match(html, new RegExp(`product-image-${i}`));
  assert.match(html, /Ảnh đại diện/); assert.match(html, /5 MB/); assert.match(html, /quyền sử dụng/);
  assert.equal((html.match(/type="file"[^>]*disabled/g) || []).length, 4);
});

test('Chặn file rỗng, sai loại hoặc quá lớn; không khóa việc sửa sản phẩm cũ khi không đổi ảnh', () => {
  for (const bad of [{ type: 'image/svg+xml', size: 20 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 5242881 }])
    assert.throws(() => images.validateProductImageFile(bad));
  assert.doesNotThrow(() => images.validateProductImageFile(file()));
  assert.doesNotThrow(() => images.validateProductImageSelection({ files: [null, null, null, null], slots: [], isNew: false }));
  assert.throws(() => images.validateProductImageSelection({ files: [file(), null, null, null], slots: [], isNew: true, approved: true }), /đủ ảnh/);
  assert.throws(() => images.validateProductImageSelection({ files: [file(), file(), file(), file()], slots: [], isNew: true }), /quyền sử dụng/);
});

test('API tải đúng multipart, vị trí và bỏ Content-Type JSON mặc định', async () => {
  const original = axios.put; let captured;
  axios.put = async (...args) => { captured = args; return slots(); };
  try {
    const upload = file(); await adminApi.uploadProductImage(9, 3, upload, true);
    assert.equal(captured[0], '/admin/products/9/images/3');
    assert.equal(captured[1].get('file').name, 'test.png'); assert.equal(captured[1].get('approved'), 'true');
    assert.equal(captured[2].headers['Content-Type'], undefined);
  } finally { axios.put = original; }
});

test('Tạo một bản nháp, tải tuần tự 4 ảnh rồi mới công khai', async () => {
  const original = { ...adminApi }, calls = [];
  adminApi.createProductDraft = async () => { calls.push('draft'); return { id: 9 }; };
  adminApi.uploadProductImage = async (id, position) => { calls.push(position); return slots(); };
  adminApi.publishProduct = async id => calls.push(`publish:${id}`);
  try {
    const result = await images.saveProductWithImages({ productId: null, files: [file(), file(), file(), file()], slots: [],
      isNew: true, approved: true, payload: {}, onDraft: draft => calls.push(`remember:${draft.id}`),
      onUploaded() {}, onProgress() {} });
    assert.equal(result, 9); assert.deepEqual(calls, ['draft', 'remember:9', 1, 2, 3, 4, 'publish:9']);
  } finally { Object.assign(adminApi, original); }
});

test('Lỗi ảnh 3 giữ ID nháp và 2 ảnh đã lưu; thử lại không tạo sản phẩm hoặc tải lại ảnh 1–2', async () => {
  const original = { ...adminApi }, uploaded = [], remaining = [file(), file(), file(), file()];
  const saved = slots().map(slot => ({ ...slot, url: null, status: 'UPDATING' })); let id;
  adminApi.createProductDraft = async () => ({ id: 9 });
  adminApi.uploadProductImage = async (productId, position) => {
    uploaded.push(position); if (position === 3) throw new Error('Mất kết nối');
    saved[position - 1] = slots()[position - 1]; return [...saved];
  };
  adminApi.publishProduct = async () => assert.fail('Không được công khai khi tải lỗi');
  const options = () => ({ productId: id, files: [...remaining], slots: saved, isNew: true, approved: true,
    payload: {}, onDraft: draft => { id = draft.id; }, onUploaded: index => { remaining[index] = null; }, onProgress() {} });
  try {
    await assert.rejects(images.saveProductWithImages(options()), /Mất kết nối/);
    assert.equal(id, 9); assert.deepEqual(uploaded, [1, 2, 3]);
    adminApi.createProductDraft = async () => assert.fail('Không tạo bản nháp thứ hai');
    adminApi.updateProduct = async productId => assert.equal(productId, 9);
    adminApi.uploadProductImage = async (productId, position) => { uploaded.push(position); return slots(); };
    let published = 0; adminApi.publishProduct = async () => published++;
    await images.saveProductWithImages(options());
    assert.deepEqual(uploaded, [1, 2, 3, 3, 4]); assert.equal(published, 1);
  } finally { Object.assign(adminApi, original); }
});

test('Sửa ảnh 4 của sản phẩm cũ không tải lại hoặc đổi các ảnh còn lại, không tự công khai', async () => {
  const original = { ...adminApi }, changes = [];
  adminApi.updateProduct = async id => changes.push(`edit:${id}`);
  adminApi.uploadProductImage = async (id, position) => { changes.push(position); return slots(); };
  adminApi.publishProduct = async () => assert.fail('Giữ nguyên trạng thái sản phẩm cũ');
  try {
    await images.saveProductWithImages({ productId: 9, files: [null, null, null, file()], slots: slots(), approved: true,
      isNew: false, payload: {}, onDraft() {}, onUploaded() {}, onProgress() {} });
    assert.deepEqual(changes, ['edit:9', 4]);
  } finally { Object.assign(adminApi, original); }
});

test('Máy chủ chưa xác nhận vị trí ảnh thì giữ file đã chọn và không công khai', async () => {
  const original = { ...adminApi };
  adminApi.updateProduct = async () => {};
  adminApi.uploadProductImage = async () => [];
  try {
    await assert.rejects(images.saveProductWithImages({ productId: 9, files: [file(), null, null, null], slots: slots(),
      approved: true, isNew: true, payload: {}, onDraft() {}, onUploaded() { assert.fail('Không xóa file chưa xác nhận'); },
      onProgress() {} }), /Chưa xác nhận/);
  } finally { Object.assign(adminApi, original); }
});
