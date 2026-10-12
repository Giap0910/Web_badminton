import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'esbuild';

function loadHome() {
  const text = fs.readFileSync(new URL('./HomePage.jsx', import.meta.url), 'utf8');
  const icons = text.match(/import \{([^}]+)\} from 'lucide-react'/)[1].split(',').map(name => name.trim());
  const modules = {
    react: { ...React, useState: initial => [initial, () => {}], useEffect() {} },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children), useNavigate: () => () => {} },
    '../hooks/useBannerCarousel': () => ({ activeSlide: 0, dragging: false, offset: 0, handlers: {} }),
    '../api/productApi': { productApi: {} }, '../context/CartContext': { useCart: () => ({ addToCart() {} }) },
    '../components/ProductCard': () => null, '../components/ProductFacts': {},
    '../utils/formatters': { productCategory: () => '' }, 'lucide-react': Object.fromEntries(icons.map(name => [name, () => null])),
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', transformSync(text, { loader: 'jsx', format: 'cjs' }).code)
    (name => modules[name], module, module.exports);
  return module.exports.default;
}
test('Trang chủ render đủ danh mục, chữ banner nhỏ hơn và không còn điều khiển cũ', () => {
  const Home = loadHome(), html = renderToStaticMarkup(React.createElement(Home));
  assert.match(html, /Banner quảng cáo/);
  assert.match(html, /text-2xl sm:text-4xl lg:text-5xl/);
  assert.match(html, /leading-\[1.18\]/);
  assert.equal((html.match(/>20\+</g) || []).length, 5);
  assert.doesNotMatch(html, /aria-label="Slide|01 \/ 04|Slide trước|Slide sau/);
});
