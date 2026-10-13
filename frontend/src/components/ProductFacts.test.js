import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const facts = await server.ssrLoadModule('/src/components/ProductFacts.jsx');
after(() => server.close());
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const shoe = { id: 51, categoryId: 2, categoryName: 'Giày cầu lông', name: 'Mizuno Wave Claw',
  brand: 'Mizuno', sku: 'SH-MZ-01', availableSizes: '["40", "40.5", "41"]',
  cushionTechnology: 'Mizuno Wave', soleType: 'Cao su', averageRating: 0, reviewCount: 0 };

test('Mô tả không chèn bảng thông số', () => {
  const html = render(facts.ProductDescription, { product: { ...shoe, description: 'Giày Mizuno hỗ trợ di chuyển linh hoạt.' } });
  assert.match(html, /hỗ trợ di chuyển linh hoạt/);
  assert.doesNotMatch(html, /Loại đế|Chất liệu mặt giày|Mã sản phẩm/);
});

test('Giày dùng thông số giày và ưu tiên danh mục API trước từ khóa trong tên', () => {
  const html = render(facts.ProductSpecifications, { product: { ...shoe, name: 'Giày dùng sân cầu lông' } });
  assert.match(html, /Mizuno Wave/);
  assert.match(html, /40, 40.5, 41/);
  assert.doesNotMatch(html, /Sức căng|Vật liệu khung|Power Cushion|Namd/);
});

test('Mỗi danh mục có trường riêng, dữ liệu thiếu không tạo thông số', () => {
  const cases = [[1, 'maxTension', '28 lbs', 'Sức căng tối đa'],
    [3, 'fabricType', 'Polyester', 'Chất liệu vải'],
    [4, 'waterproof', false, 'Khả năng chống nước'],
    [5, 'quantityPerPack', 'Vỉ 3 chiếc', 'Quy cách đóng gói']];
  for (const [categoryId, field, value, label] of cases) {
    const rows = facts.productSpecRows({ categoryId, [field]: value });
    assert.deepEqual(rows.find(row => row[0] === label), [label, String(value === false ? 'Không' : value)]);
    assert.deepEqual(rows.find(row => row[0] === 'Màu sắc'), ['Màu sắc', 'Chưa có thông tin']);
  }
  assert.equal(facts.productValue(0), '0');
  assert.equal(facts.productValue('  '), 'Chưa có thông tin');
  assert.equal(facts.productAccessoryLabel('qua_cau'), 'Quả cầu');
  assert.equal(facts.productAccessoryLabel('bang_do'), 'Băng chặn mồ hôi');
});

test('Chỉ cho chọn kích cỡ API, giữ kích cỡ thập phân và không giả hết cỡ 44', () => {
  assert.deepEqual(facts.availableProductSizes({ availableSizes: '["40.5", "44", "44", " ", null]' }), ['40.5', '44']);
  assert.deepEqual(facts.availableProductSizes({ availableSizes: '40,41' }), []);
  const html = render(facts.ProductSelections, { product: { ...shoe, availableSizes: '["40.5","44"]' }, selectedSize: '44' });
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /disabled|White Gold|Hết cỡ|EU/);
});

test('Giỏ hàng không nhận màu, quy cách, dịch vụ hay phụ phí tự tạo', () => {
  assert.deepEqual(facts.productCartOptions(shoe, '40.5'), { size: '40.5' });
  assert.deepEqual(facts.productCartOptions(shoe, '99'), {});
  assert.deepEqual(facts.productCartOptions({ categoryId: 5, quantityPerPack: 'Vỉ 3 chiếc' }), { packaging: 'Vỉ 3 chiếc' });
  assert.deepEqual(facts.productCartOptions({ categoryId: 1, weightGrip: '4U/G5', colorName: 'Đỏ' }), { weightGrip: '4U/G5', color: 'Đỏ' });
});

test('Chưa có đánh giá không điền 4.9, số người mua hay sao vàng', () => {
  const html = render(facts.ProductRating, { product: shoe });
  assert.match(html, /Chưa có đánh giá/);
  assert.doesNotMatch(html, /fill-amber-500/);
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /4\.9|218|850/);
  assert.doesNotMatch(render(facts.ProductRating, { product: { averageRating: 7, reviewCount: 2 } }), /fill-amber-500/);
});

test('Phân bố sao tính từ đánh giá đã tải, bỏ điểm không hợp lệ', () => {
  const rows = facts.reviewDistribution([{ rating: 5 }, { rating: 5 }, { rating: 3 }, { rating: 9 }]);
  assert.deepEqual(rows[0], { stars: 5, count: 2, percent: 67 });
  assert.deepEqual(rows[2], { stars: 3, count: 1, percent: 33 });
  assert.ok(facts.reviewDistribution([]).every(row => row.count === 0 && row.percent === 0));
});

test('Danh sách nhận xét hiển thị dữ liệu thật và tách lỗi tải khỏi danh sách trống', () => {
  assert.match(render(facts.ProductReviewEntries, {}), /Chưa có đánh giá/);
  const failed = render(facts.ProductReviewEntries, { error: 'Chưa thể tải đánh giá.' });
  assert.match(failed, /role="alert"/);
  assert.doesNotMatch(failed, /Chưa có đánh giá/);
  const actual = render(facts.ProductReviewEntries, { reviews: [{ id: 1, userFullName: 'Phong', rating: 4, comment: 'Vừa chân' }] });
  assert.match(actual, /Phong/);
  assert.match(actual, /Vừa chân/);
  assert.doesNotMatch(actual, /Đã mua hàng|Tuyển Trẻ|92%/);
});

test('Giảm giá được tính từ giá API, không tự tạo mức giảm', () => {
  assert.match(render(facts.ProductDiscount, { product: { price: 80000, originalPrice: 100000 } }), /-20%/);
  assert.equal(render(facts.ProductDiscount, { product: { price: 80000 } }), '');
  assert.equal(render(facts.ProductDiscount, { product: { price: 100000, originalPrice: 80000 } }), '');
});

test('Biến thể hết cỡ bị khóa chọn, không lộ số lượng tồn hoặc tự tạo màu', () => {
  const product = { ...shoe, inStock: true, variants: [
    { id: 1, active: true, color: 'Trắng / Đen', size: '40', inStock: false, stock: null },
    { id: 2, active: true, color: 'Trắng / Đen', size: '41', inStock: true, stock: null },
    { id: 3, active: false, legacy: true, size: '44', inStock: false, stock: null }] };
  const html = render(facts.ProductSelections, { product, selectedVariantId: 2 });
  assert.match(html, /disabled=""[^>]*>40</);
  assert.match(html, /aria-pressed="true"[^>]*>41</);
  assert.doesNotMatch(html, />44<|20 sản phẩm|Tồn kho/);
  assert.deepEqual(facts.productCartOptions(product, '', 2), { variantId: 2, size: '41', color: 'Trắng / Đen', weightGrip: '', packaging: '' });
  assert.deepEqual(facts.productCartOptions(product, '', 1), {});
  assert.doesNotMatch(render(facts.ProductSelections, { product: { variants: [{ id: 1, active: true, inStock: true, packaging: '10m' }] } }), /Màu sắc/);
});
