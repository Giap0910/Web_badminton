import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { transformSync } from 'esbuild';

function hookHarness(getProducts) {
  let state, effect, cleanup, pending;
  const react = { ...React, useState: initial => [state ??= initial, next => { state = next; }], useEffect: fn => { effect = fn; } };
  const modules = { react, 'react-router-dom': {}, 'lucide-react': {}, '../api/productApi': { productApi: { getProducts } },
    './ProductImage': () => null, '../utils/formatters': { formatPrice: String } };
  const instance = { exports: {} };
  const source = transformSync(fs.readFileSync('src/components/ProductSearch.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', source)(name => modules[name], instance, instance.exports,
    fn => { pending = fn; return 1; }, () => { pending = null; });
  return { query: query => { cleanup?.(); instance.exports.useProductSuggestions(query); cleanup = effect(); },
    tick: () => pending?.(), state: () => state, dispose: () => cleanup?.() };
}

test('Từ khóa ngắn không gọi API; hai ký tự gợi ý sáu sản phẩm công khai', async () => {
  const calls = [], h = hookHarness(async params => { calls.push(params); return { content: [{ id: 3, catalogVisible: true }, { id: 4, catalogVisible: false }] }; });
  h.query('y'); await h.tick(); assert.equal(calls.length, 0);
  h.query('yo'); assert.equal(h.state().loading, true); await h.tick();
  assert.deepEqual(calls[0], { keyword: 'yo', page: 0, size: 6, catalogScope: 'shop' });
  assert.deepEqual(h.state().items.map(item => item.id), [3]); assert.equal(h.state().loading, false); h.dispose();
});

test('Phản hồi cũ không ghi đè từ khóa mới; lỗi API được hiển thị rõ', async () => {
  let complete;
  const h = hookHarness(params => params.keyword === 'yo' ? new Promise(resolve => { complete = resolve; }) : Promise.reject(new Error('Mất mạng')));
  h.query('yo'); const old = h.tick(); h.query('victor'); await h.tick();
  complete({ content: [{ id: 99 }] }); await old;
  assert.deepEqual(h.state().items, []); assert.match(h.state().error, /Chưa tải được/);
  h.query(''); assert.equal(h.state().error, ''); assert.equal(h.state().loading, false); h.dispose();
});
