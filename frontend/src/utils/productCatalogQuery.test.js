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
const catalog = await server.ssrLoadModule('/src/utils/productCatalogQuery.jsx');
const { default: ProductsPage } = await server.ssrLoadModule('/src/pages/ProductsPage.jsx');
const read = value => catalog.readCatalogQuery(new URLSearchParams(value));

function runtimeComponent(path, modules, environment = {}) {
  const instance = { exports: {} };
  const code = transformSync(fs.readFileSync(path, 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', ...Object.keys(environment), code)(name => modules[name], instance, instance.exports, ...Object.values(environment));
  return instance.exports.default;
}

function treeNodes(node, type) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(child => treeNodes(child, type));
  return [...(node.type === type ? [node] : []), ...treeNodes(node.props?.children, type)];
}

function treeText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(treeText).join('');
  return typeof node === 'object' ? treeText(node.props?.children) : String(node);
}

const runtimeIcons = new Proxy({}, { get: () => () => null });

function catalogHarness(url, options = {}) {
  let params = new URLSearchParams(url), cursor = 0, refCursor = 0;
  const modules = { react: { ...React, useState: value => [options.states?.[cursor++] ?? value, () => {}], useEffect: () => {},
    useRef: () => ({ current: options.refs?.[refCursor++] ?? null }) },
    'react-router-dom': { Link: 'a', useSearchParams: () => [params, next => { params = typeof next === 'function' ? next(params) : new URLSearchParams(next); }] },
    'lucide-react': runtimeIcons, '../api/productApi': { productApi: {} }, '../components/ProductCard': () => null,
    '../components/ProductImage': () => null, '../components/ProductFacts': { productSpecSummary: () => '' },
    '../utils/productCatalogQuery.jsx': catalog };
  const Component = runtimeComponent('src/pages/ProductsPage.jsx', modules, options.environment);
  return { render: () => { cursor = 0; refCursor = 0; return Component(); }, params: () => params };
}

test('Bỏ chọn hãng từ URL viết thường hoặc viết hoa thực sự gỡ bộ lọc và đặt lại trang', () => {
  for (const [brand, label] of [['yonex', 'Yonex'], ['YONEX', 'Yonex'], ['li-ning', 'Li-Ning'], ['VICTOR', 'Victor']]) {
    const h = catalogHarness(`categoryId=1&brand=${brand}&page=3`);
    const checkbox = () => treeNodes(treeNodes(h.render(), 'label').find(node => treeText(node) === label), 'input')[0];
    assert.equal(checkbox().props.checked, true);
    checkbox().props.onChange();
    assert.equal(h.params().has('brand'), false);
    assert.equal(h.params().has('page'), false);
    assert.equal(h.params().get('categoryId'), '1');
    assert.equal(checkbox().props.checked, false);
    checkbox().props.onChange();
    assert.equal(h.params().get('brand'), label);
    assert.equal(checkbox().props.checked, true);
  }
});

test('Menu phụ kiện di động dẫn đến danh sách đúng loại thay vì mã mẫu cố định', () => {
  const modules = { react: { ...React, useState: () => [true, () => {}], useRef: () => ({ current: null }), useEffect: () => {} }, 'react-router-dom': { Link: 'a', useNavigate: () => () => {} },
    'lucide-react': runtimeIcons, './AccountAvatar': () => null, './ProductSearch': () => null,
    '../context/AuthContext': { useAuth: () => ({ isAuthenticated: false }) },
    '../context/CartContext': { useCart: () => ({ cartCount: 0 }) },
    '../context/CompareContext': { useCompare: () => ({ selectedRackets: [] }) } };
  const Navbar = runtimeComponent('src/components/Navbar.jsx', modules);
  const links = treeNodes(Navbar(), 'a');
  for (const [label, type] of [['Quấn Cán Vợt', 'quan_can'], ['Cước Cầu Lông', 'day_cuoc'],
    ['Ống Cầu Lông', 'qua_cau'], ['Băng Chặn Mồ Hôi', 'bang_do']]) {
    const target = links.find(node => treeText(node).includes(`• ${label}`)).props.to;
    assert.equal(target, `/products?categoryId=5&accessoryType=${type}`);
    const params = catalog.buildCatalogParams(read(target.split('?')[1]));
    assert.equal(params.categoryId, 5);
    assert.equal(params.accessoryType, type);
  }
});

function navbarHeightHarness(hasObserver = true) {
  const properties = new Map(), listeners = new Map(), observers = [];
  const style = { setProperty: (key, value) => properties.set(key, value), getPropertyValue: key => properties.get(key) || '',
    removeProperty: key => properties.delete(key) };
  const view = { addEventListener: (key, callback) => listeners.set(key, callback), removeEventListener: key => listeners.delete(key) };
  const ownerDocument = { documentElement: { style }, defaultView: view };
  let height = 106, mobileOpen = false, effect, cleanup, header = { ownerDocument, getBoundingClientRect: () => ({ height }) };
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(element) { this.element = element; }
    disconnect() { this.disconnected = true; }
  }
  const modules = { react: { ...React, useState: () => [mobileOpen, value => { mobileOpen = value; }],
    useRef: () => ({ current: header }), useEffect: callback => { effect = callback; } },
    'react-router-dom': { Link: 'a', useNavigate: () => () => {} }, 'lucide-react': runtimeIcons,
    './AccountAvatar': () => null, './ProductSearch': () => null, '../context/AuthContext': { useAuth: () => ({ isAuthenticated: false }) },
    '../context/CartContext': { useCart: () => ({ cartCount: 0 }) }, '../context/CompareContext': { useCompare: () => ({ selectedRackets: [] }) } };
  const Navbar = runtimeComponent('src/components/Navbar.jsx', modules, { ResizeObserver: hasObserver ? Observer : undefined });
  const render = () => Navbar();
  const mount = () => { render(); cleanup = effect?.(); };
  return { render, mount, observers, style, listeners, header: () => header, setHeight: value => { height = value; },
    value: () => style.getPropertyValue('--customer-navbar-height'), resize: () => listeners.get('resize')?.(), dispose: () => cleanup?.(),
    toggle: () => { treeNodes(render(), 'button').find(node => node.props['aria-label'] === 'Toggle menu').props.onClick(); cleanup?.(); mount(); },
    mountAnother: value => { header = { ownerDocument, getBoundingClientRect: () => ({ height: value }) }; render(); return effect?.(); } };
}

test('Navbar đo chiều cao ban đầu, ResizeObserver và mở/đóng menu cập nhật chiều cao thực', () => {
  const h = navbarHeightHarness(); h.mount();
  assert.equal(h.value(), '106px'); assert.equal(h.observers[0].element, h.header());
  h.setHeight(121.2); h.observers[0].callback(); assert.equal(h.value(), '122px');
  h.setHeight(320); h.toggle(); assert.equal(h.value(), '320px'); assert.equal(h.observers[0].disconnected, true);
  h.setHeight(116); h.toggle(); assert.equal(h.value(), '116px');
  const last = h.observers.at(-1); h.dispose();
  assert.equal(last.disconnected, true); assert.equal(h.value(), ''); assert.equal(h.listeners.size, 0);
  h.setHeight(450); last.callback(); assert.equal(h.value(), '');
});

test('Không có ResizeObserver vẫn đo được resize/menu; cleanup không xóa giá trị của header khác', () => {
  const h = navbarHeightHarness(false); h.mount(); assert.equal(h.value(), '106px');
  h.setHeight(114); h.resize(); assert.equal(h.value(), '114px');
  h.setHeight(280); h.toggle(); assert.equal(h.value(), '280px');
  const disposeOther = h.mountAnother(150); assert.equal(h.value(), '150px');
  h.dispose(); assert.equal(h.value(), '150px');
  disposeOther(); assert.equal(h.value(), '');
  const external = navbarHeightHarness(); external.mount();
  external.style.setProperty('--customer-navbar-height', '999px'); external.dispose();
  assert.equal(external.value(), '999px');
});

test('Thanh danh mục dùng chiều cao Navbar đã đo cho vị trí sticky, giữ màu và lớp xếp chồng', () => {
  const navigation = treeNodes(catalogHarness('categoryId=1').render(), 'div').find(node => node.props.className?.includes('shadow-sm sticky'));
  assert.equal(navigation.props.style?.top, 'var(--customer-navbar-height, 106px)');
  assert.doesNotMatch(navigation.props.className, /top-\[60px\]/);
  assert.match(navigation.props.className, /bg-white.*z-30/);
});

test('Chuyển trang cuộn đầu danh sách dưới đáy hai thanh điều hướng ở desktop và mobile', () => {
  for (const bottom of [162, 330]) {
    let scroll;
    const h = catalogHarness('categoryId=1', { states: [[{ id: 1 }], 25, 3, false, '', 0, 'grid', false],
      refs: [{ getBoundingClientRect: () => ({ top: 50 }) }, { getBoundingClientRect: () => ({ bottom }) }],
      environment: { window: { pageYOffset: 800, scrollTo: value => { scroll = value; } } } });
    treeNodes(h.render(), 'button').find(node => node.props.title === 'Trang sau').props.onClick();
    assert.equal(h.params().get('page'), '2');
    assert.deepEqual(scroll, { top: 850 - bottom - 16, behavior: 'smooth' });
  }
});

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
