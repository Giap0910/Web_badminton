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

test('Sản phẩm có biến thể: PUT giữ thông số chung, không gửi lại tổ hợp hoặc tổng kho', () => {
  for (const categoryId of [1, 2, 3, 4, 5]) {
    const form = formTools.productToAdminForm({ ...product(categoryId), variants: [{ id: 9 }], colorName: 'Xanh',
      availableSizes: '["M"]', weightGrip: '4U-G5', quantityPerPack: '10m' });
    Object.assign(form, { stock: '999', colorName: 'Đỏ', availableSizes: 'L', weightGrip: '3U-G5', quantityPerPack: '200m' });
    const payload = formTools.buildAdminProductPayload(form, categories, true);
    for (const key of ['variants', 'stock', 'expectedStock', ...formTools.VARIANT_CHOICE_FIELDS]) assert.equal(key in payload, false, key);
    assert.equal(payload.name, 'Sản phẩm thực tế'); assert.equal(payload.price, 100000);
  }
});

test('Thêm tổ hợp giày/vợt/quần áo đúng lựa chọn, không tự sinh tổ hợp khác hoặc SKU', () => {
  const shoe = formTools.buildAdminVariantPayload({ color: ' Xanh ', size: '39.5', stock: '20' }, 2);
  assert.deepEqual(shoe, { color: 'Xanh', size: '39.5', weightGrip: null, packaging: null, stock: 20, active: true });
  assert.equal(formTools.buildAdminVariantPayload({ weightGrip: '4U-G5', color: 'Silver/Black', stock: '0' }, 1).stock, 0);
  assert.equal(formTools.buildAdminVariantPayload({ size: 'XXL', stock: '20' }, 3).size, 'XXL');
  assert.equal(formTools.buildAdminVariantPayload({ packaging: '10m', stock: '20' }, 5).packaging, '10m');
  for (const size of ['34', '42.5', '44', 'M', '']) assert.throws(() => formTools.buildAdminVariantPayload({ size, stock: '20' }, 2));
  assert.throws(() => formTools.buildAdminVariantPayload({ stock: '20' }, 1), /trọng lượng/);
  assert.throws(() => formTools.buildAdminVariantPayload({ stock: '20' }, 3), /kích cỡ/);
  for (const stock of ['', '-1', '1.5', '1000001']) assert.throws(() => formTools.buildAdminVariantPayload({ size: '40', stock }, 2));
});

test('Sửa kho biến thể gửi expectedStock, chặn legacy và tắt tổ hợp đang giữ chỗ', () => {
  const variant = { id: 5, stock: 20, reservedStock: 0, active: true, legacy: false };
  assert.deepEqual(formTools.buildAdminVariantStockPayload(variant, '0', false), { stock: 0, expectedStock: 20, active: false });
  assert.throws(() => formTools.buildAdminVariantStockPayload({ ...variant, legacy: true }, '20', true), /cũ cần đối soát/);
  assert.throws(() => formTools.buildAdminVariantStockPayload({ ...variant, reservedStock: 1 }, '20', false), /đang giữ chỗ/);
  assert.deepEqual(formTools.buildAdminVariantStockPayload({ ...variant, reservedStock: 1 }, '19', true), { stock: 19, expectedStock: 20, active: true });
  assert.throws(() => formTools.buildAdminVariantStockPayload(variant, '', true));
});
