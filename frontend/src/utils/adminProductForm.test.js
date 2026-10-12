import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const formTools = await server.ssrLoadModule('/src/utils/adminProductForm.jsx');
after(() => server.close());
const categories = [1, 2, 3, 4, 5].map(id => ({ id }));
const product = categoryId => ({ id: 1, sku: 'SKU-001', name: 'Sản phẩm thực tế', brand: 'Lining', categoryId,
  price: 100000, originalPrice: 120000, stock: 7, reservedStock: 3, imageUrl: '/old-image.jpg', catalogVisible: false });

for (const category of [1, 2, 3, 4, 5]) {
  test(`Form danh mục ${category} gửi đủ thông số và không chạm ảnh/trạng thái`, () => {
    const form = formTools.productToAdminForm(product(category));
    for (const [key, , , type] of formTools.CATEGORY_FIELDS[category]) form[key] = type === 'number' ? '9' : key === 'availableSizes' ? '40, 40.5, 40' : 'Thông số đã kiểm tra';
    const payload = formTools.buildAdminProductPayload(form, categories, true);
    assert.equal(payload.brand, 'Li-Ning');
    for (const [key, , , type] of formTools.CATEGORY_FIELDS[category])
      assert.deepEqual(payload[key], type === 'number' ? 9 : key === 'availableSizes' ? '["40","40.5"]' : 'Thông số đã kiểm tra');
    for (const key of ['imageUrl', 'imageUrls', 'catalogVisible', 'reservedStock', 'stock', 'expectedStock']) assert.equal(key in payload, false, key);
  });
}

test('Không tự tạo SKU, giá, tồn kho hoặc ảnh cho sản phẩm mới', () => {
  const blank = formTools.productToAdminForm();
  for (const key of ['sku', 'price', 'originalPrice', 'stock', 'maxTension']) assert.equal(blank[key], '');
  assert.equal('imageUrl' in blank, false);
  assert.throws(() => formTools.buildAdminProductPayload(blank, categories), /Danh mục/);
});

test('Đổi tồn kho gửi snapshot, giữ tồn kho không ghi đè từ danh sách cũ', () => {
  const form = formTools.productToAdminForm(product(1));
  assert.equal('stock' in formTools.buildAdminProductPayload(form, categories, true), false);
  form.stock = '0';
  const payload = formTools.buildAdminProductPayload(form, categories, true);
  assert.equal(payload.stock, 0); assert.equal(payload.expectedStock, 7);
  assert.equal(payload.name, 'Sản phẩm thực tế');
});

test('Kiểm tra giá nguyên, giới hạn tồn kho, danh mục và sáu hãng trước lưu', () => {
  const valid = formTools.productToAdminForm(product(1));
  for (const patch of [{ price: '1.5' }, { price: '0' }, { price: '10000000000' }, { originalPrice: '5' },
    { stock: '-1' }, { stock: '2147483648' }, { categoryId: '6' }, { brand: 'Kumpoo' }, { name: ' ' }])
    assert.throws(() => formTools.buildAdminProductPayload({ ...valid, ...patch }, categories));
  for (const brand of formTools.PRODUCT_BRANDS) assert.equal(formTools.buildAdminProductPayload({ ...valid, brand }, categories).brand, brand);
});

test('Cỡ thập phân và cỡ quần áo được giữ, cỡ legacy chưa sửa không bị ghi lại', () => {
  const form = formTools.productToAdminForm({ ...product(2), availableSizes: '["40","40.5"]' });
  assert.equal(form.availableSizes, '40, 40.5');
  assert.equal('availableSizes' in formTools.buildAdminProductPayload(form, categories, true), false);
  const legacy = formTools.productToAdminForm({ ...product(2), availableSizes: '{"legacy":"40"}' });
  assert.equal('availableSizes' in formTools.buildAdminProductPayload(legacy, categories, true), false);
  legacy.availableSizes = 'S, M, XL'; legacy.categoryId = '3';
  assert.equal(formTools.buildAdminProductPayload(legacy, categories, true).availableSizes, '["S","M","XL"]');
});

test('Thông số không liên quan danh mục không bị gửi, chuỗi rỗng xóa được trường tùy chọn', () => {
  const form = formTools.productToAdminForm({ ...product(2), maxTension: 'Sai loại', upperMaterial: 'Vải' });
  form.upperMaterial = ''; form.racketCapacity = '-2';
  const payload = formTools.buildAdminProductPayload(form, categories, true);
  assert.equal('maxTension' in payload, false); assert.equal('racketCapacity' in payload, false);
  assert.equal(payload.upperMaterial, '');
});

test('Trạng thái hiển thị không suy từ tồn kho và hãng ngoài phạm vi vẫn nằm trong quản trị', () => {
  const products = [{ ...product(1), id: 1, stock: 0, catalogVisible: true, brand: 'Yonex' },
    { ...product(2), id: 2, stock: 100, catalogVisible: false, brand: 'Kumpoo' }];
  assert.deepEqual(formTools.filterAdminProducts(products, '', 'ALL', 'ALL', 'ALL', 'VISIBLE').map(p => p.id), [1]);
  assert.deepEqual(formTools.filterAdminProducts(products, '', 'ALL', 'ALL', 'ALL', 'HIDDEN').map(p => p.id), [2]);
  assert.equal(formTools.filterAdminProducts(products, ' SKU-001 ', '2', 'Kumpoo', 'IN_STOCK', 'HIDDEN').length, 1);
});
