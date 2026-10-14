import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const catalog = await server.ssrLoadModule('/src/utils/productCatalogQuery.jsx');
const { default: ProductsPage } = await server.ssrLoadModule('/src/pages/ProductsPage.jsx');
after(() => server.close());
const read = value => catalog.readCatalogQuery(new URLSearchParams(value));

test('Lọc cỡ gửi tới server trước phân trang và URL dùng trang bắt đầu từ 1', () => {
  const params = catalog.buildCatalogParams(read('categoryId=2&productSize=40.5&page=2&brand=Mizuno&sort=price-asc'));
  assert.deepEqual(params, { page: 1, size: 12, sortBy: 'price', sortDir: 'asc', categoryId: 2, brand: 'Mizuno', productSize: '40.5' });
});

test('Đổi bộ lọc hoặc sort về trang đầu, giữ các lựa chọn còn lại', () => {
  const old = new URLSearchParams('categoryId=2&page=5&brand=Yonex&productSize=44&sort=newest');
  const changed = catalog.updateCatalogQuery(old, { brand: 'Mizuno' });
  assert.equal(changed.has('page'), false);
  assert.equal(changed.get('productSize'), '44');
  assert.equal(old.get('page'), '5');
  assert.equal(catalog.updateCatalogQuery(old, { sort: 'price-asc' }).has('page'), false);
  assert.equal(catalog.updateCatalogQuery(old, { page: 2 }).get('brand'), 'Yonex');
});

test('Đổi danh mục bỏ bộ lọc riêng của danh mục cũ và giữ keyword/hãng', () => {
  const next = catalog.updateCatalogQuery(new URLSearchParams('categoryId=2&productSize=44&page=2&keyword=Yonex&brand=Yonex'), { categoryId: 3 });
  assert.equal(next.get('categoryId'), '3');
  assert.equal(next.has('productSize'), false);
  assert.equal(next.has('page'), false);
  assert.equal(next.get('keyword'), 'Yonex');
});

test('Đọc liên kết danh mục cũ, không nhận nhầm bao vợt thành vợt', () => {
  assert.equal(read('category=bao-vot').selectedCategory, 'BAG');
  assert.equal(read('category=accessories').selectedCategory, 'ACCESSORIES');
  assert.equal(read('category=shoes').selectedCategory, 'SHOES');
  assert.throws(() => catalog.buildCatalogParams(read('categoryId=unknown')), /Danh mục/);
});

test('Tải lại URL khôi phục giá, giới tính, phụ kiện, sức chứa và khuyến mãi', () => {
  const apparel = catalog.buildCatalogParams(read('categoryId=3&productSize=XL&gender=Nữ&priceRange=%3C2m&sale=true'));
  assert.equal(apparel.productSize, 'XL');
  assert.equal(apparel.gender, 'Nữ');
  assert.equal(apparel.maxPrice, 2000000);
  assert.equal(apparel.sale, true);
  assert.equal(catalog.buildCatalogParams(read('categoryId=5&accessoryType=qua_cau')).accessoryType, 'qua_cau');
  assert.equal(catalog.buildCatalogParams(read('categoryId=4&bagFilter=9-racket')).racketCapacity, 9);
  assert.equal(catalog.buildCatalogParams(read('categoryId=4&bagFilter=backpack')).bagType, 'balo');
});

test('Gỡ bộ lọc không để lại tham số cũ, page không hợp lệ trở về 1', () => {
  const next = catalog.updateCatalogQuery(new URLSearchParams('bagType=balo&racketCapacity=3&page=2'), { bagFilter: 'ALL' });
  assert.equal(next.has('bagType'), false);
  assert.equal(next.has('racketCapacity'), false);
  for (const page of ['0', '-1', '2.5', 'abc', 'Infinity']) assert.equal(read(`page=${page}`).currentPage, 1);
});

test('Tổng số và số trang phải lấy từ PageResponse, không lấy độ dài trang làm tổng', () => {
  const response = { content: [{ id: 1 }], pageNo: 0, pageSize: 12, totalElements: 22, totalPages: 2 };
  assert.equal(catalog.readCatalogPage(response).totalElements, 22);
  assert.throws(() => catalog.readCatalogPage([{ id: 1 }]), /phân trang/);
  assert.throws(() => catalog.readCatalogPage({ content: [], totalElements: -1 }), /phân trang/);
});

test('Kết quả rỗng giữ 0 trang, hiển thị 0–0 và trang cuối hiển thị đúng khoảng', () => {
  assert.equal(catalog.readCatalogPage({ content: [], pageNo: 0, pageSize: 12, totalElements: 0, totalPages: 0 }).totalPages, 0);
  assert.deepEqual(catalog.catalogDisplayRange(1, 0, 0), [0, 0]);
  assert.deepEqual(catalog.catalogDisplayRange(2, 10, 22), [13, 22]);
});

test('Trang danh sách thực render được khi mở liên kết có bộ lọc', () => {
  const html = renderToStaticMarkup(React.createElement(MemoryRouter,
    { initialEntries: ['/products?categoryId=2&productSize=40.5&page=2'] }, React.createElement(ProductsPage)));
  assert.match(html, /Giày|GIÀY/);
  assert.match(html, /40.5/);
});

test('Các điều kiện lọc từ URL hiện thành chip và không nhân đôi kích cỡ', () => {
  const chips = catalog.catalogFilterChips(read('categoryId=3&productSize=XL&gender=Nữ&sale=true'));
  assert.equal(chips.filter(chip => chip.key === 'productSize').length, 1);
  assert.ok(chips.some(chip => chip.key === 'gender' && chip.value === 'Nữ'));
  assert.ok(chips.some(chip => chip.key === 'sale'));
  assert.throws(() => catalog.buildCatalogParams(read('minPrice=-1')), /không hợp lệ/);
});

test('Bộ lọc thực hiển thị giày35–42 có39.5 và quần áoXS–XXL, gửi đúng size tới API', () => {
  const render = categoryId => renderToStaticMarkup(React.createElement(MemoryRouter,
    { initialEntries: [`/products?categoryId=${categoryId}`] }, React.createElement(ProductsPage)));
  const shoe = render(2); const apparel = render(3);
  for (const size of ['35', '36', '37', '38', '39', '39.5', '40', '40.5', '41', '42']) {
    assert.match(shoe, new RegExp(`>${size}<`));
    assert.equal(catalog.buildCatalogParams(read(`categoryId=2&productSize=${size}`)).productSize, size);
  }
  for (const size of ['43', '44', '45']) assert.doesNotMatch(shoe, new RegExp(`>${size}<`));
  for (const size of ['XS', 'S', 'M', 'L', 'XL', 'XXL']) assert.match(apparel, new RegExp(`>${size}<`));
  assert.doesNotMatch(apparel, />2XL</);
  assert.equal(catalog.buildCatalogParams(read('categoryId=3&productSize=XXL')).productSize, 'XXL');
});

test('Cả5banner danh mục SSR giữdesigngradient vàkhông hotlinkảnhngoài/chứngnhậnchưaxácminh',()=>{
  for(const categoryId of [1,2,3,4,5]) {
    const html=renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:[`/products?categoryId=${categoryId}`]},React.createElement(ProductsPage)));
    assert.match(html,/bg-gradient-to-br from-\[#131B2E\] via-blue-950/);assert.doesNotMatch(html,/background-image|googleusercontent|unsplash|CHÍNH HÃNG/);
  }
});
