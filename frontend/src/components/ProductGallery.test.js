import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const gallery = await server.ssrLoadModule('/src/components/ProductGallery.jsx');
const media = await server.ssrLoadModule('/src/components/ProductImage.jsx');
const { productCoverImage } = await server.ssrLoadModule('/src/utils/productMedia.js');
after(() => server.close());

test('Ảnh 1 là đại diện; thiếu ảnh 2 không đẩy ảnh 3 sang ô 2 hoặc dùng ảnh 3 làm đại diện', () => {
  const product = { imageUrl: '/api/media/products/1/old.png', imageSlots: [
    { position: 3, status: 'READY', url: '/api/media/products/1/three.png' },
    { position: 1, status: 'READY', url: '/api/media/products/1/one.png' }] };
  assert.deepEqual(gallery.productGallerySlots(product).map(slot => slot.url),
    ['/api/media/products/1/one.png', null, '/api/media/products/1/three.png', null]);
  assert.equal(productCoverImage(product), '/api/media/products/1/one.png');
  product.imageSlots = product.imageSlots.filter(slot => slot.position !== 1);
  assert.equal(productCoverImage(product), null);
});

test('Bốn ảnh mới và WebP cũ đều hiển thị đúng từng vị trí sau khi tải lại sản phẩm', () => {
  const product = { name: 'Sản phẩm đã tải ảnh', brand: 'Yonex', imageSlots: Array.from({ length: 4 }, (_, i) =>
    ({ position: i + 1, status: 'READY', url: `/api/media/products/7/image${i + 1}.${i === 3 ? 'webp' : 'png'}` })) };
  for (let index = 0; index < 4; index++) {
    const html = renderToStaticMarkup(React.createElement(gallery.default, { product, activeIndex: index }));
    assert.match(html, new RegExp(`Ảnh ${index + 1}/4`));
    assert.match(html, new RegExp(`image${index + 1}\\.`));
  }
});

test('Ảnh nội bộ được tải từ Backend thay vì cổng Vite', () => {
  assert.equal(media.productImageSource('/api/media/products/1/a.webp'), 'http://localhost:8080/api/media/products/1/a.webp');
  const html = renderToStaticMarkup(React.createElement(media.default, { src: '/api/media/products/1/a.webp' }));
  assert.match(html, /src="http:\/\/localhost:8080\/api\/media\/products\/1\/a.webp"/);
  assert.equal(media.internalProductImage('https://other.test/a.webp'), false);
  assert.equal(media.productImageSource(null), null);
});

test('Cả 5 danh mục có đúng 4 ô và ảnh nhỏ nằm bên trái ảnh lớn', () => {
  for (let categoryId = 1; categoryId <= 5; categoryId++) {
    const html = renderToStaticMarkup(React.createElement(gallery.default, { product: { categoryId, name: 'Sản phẩm thử', brand: 'Yonex' } }));
    assert.equal((html.match(/aria-label="Xem ảnh/g) || []).length, 4);
    assert.match(html, /flex flex-row/);
    assert.match(html, /flex flex-col gap-2/);
    assert.match(html, /Ảnh 1\/4/);
    assert.match(html, /Hình ảnh đang cập nhật/);
    assert.doesNotMatch(html, /<img/);
  }
});
test('Nhấn ảnh nhỏ và dùng bàn phím đổi đúng ảnh đang xem', () => {
  let activeIndex = 0;
  const props = { product: { name: 'Yonex thử', brand: 'Yonex' }, activeIndex, onChange: index => { activeIndex = index; } };
  const root = gallery.default(props);
  const thumbnailElement = root.props.children[0];
  const thumbnails = thumbnailElement.type(thumbnailElement.props);
  thumbnails.props.children[3].props.onClick();
  assert.equal(activeIndex, 3);
  const html = renderToStaticMarkup(React.createElement(gallery.default, { ...props, activeIndex }));
  assert.match(html, /Ảnh 4\/4/);
  const next = gallery.default({ ...props, activeIndex });
  next.props.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(activeIndex, 0);
  assert.equal(gallery.nextGalleryIndex(0, 'ArrowLeft'), 3);
});
test('Không dùng ảnh bên ngoài, ảnh chưa duyệt hoặc lặp một ảnh thành 4 ảnh', () => {
  const slots = gallery.productGallerySlots({ imageUrl: 'https://other-shop.test/p.jpg', imageSlots: [
    { status: 'READY', url: 'https://other-shop.test/a.jpg' },
    { status: 'UPDATING', url: '/api/media/products/1/b.jpg' },
    { status: 'READY', url: '/api/media/products/1/c.jpg' }] });
  assert.equal(slots.length, 4);
  assert.deepEqual(slots.map(s => s.url), [null, null, '/api/media/products/1/c.jpg', null]);
});
