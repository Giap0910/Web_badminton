import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { transformSync } from 'esbuild';

function hookHarness(getSuggestions) {
  let state, effect, cleanup, pending;
  const react = { ...React, useState: initial => [state ??= initial, next => { state = next; }], useEffect: fn => { effect = fn; } };
  const modules = { react, 'react-router-dom': {}, 'lucide-react': {}, '../api/productApi': { productApi: { getSuggestions } },
    './ProductImage': () => null, '../utils/formatters': { formatPrice: String } };
  const instance = { exports: {} };
  const source = transformSync(fs.readFileSync('src/components/ProductSearch.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', source)(name => modules[name], instance, instance.exports,
    fn => { pending = fn; return 1; }, () => { pending = null; });
  return { query: query => { cleanup?.(); instance.exports.useProductSuggestions(query); cleanup = effect(); },
    tick: () => pending?.(), state: () => state, dispose: () => cleanup?.() };
}

function voucherHarness(validateVoucher) {
  let state, effect, pending, cleanup, previous, api;
  const refs = [], storage = new Map(); let refCursor = 0;
  const react = { useState: initial => [state ??= initial, next => { state = next; }],
    useRef: initial => refs[refCursor++] ??= { current: initial }, useEffect: (fn, deps) => { effect = { fn, key: deps[0] }; } };
  const modules = { react, '../api/voucherApi': { voucherApi: { validateVoucher } }, '../utils/formatters': { formatPrice: String } };
  const sessionStorage = { setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const instance = { exports: {} };
  const source = transformSync(fs.readFileSync('src/components/useCheckoutVoucher.jsx', 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'sessionStorage', source)(name => modules[name], instance, instance.exports,
    fn => { pending = fn; return 1; }, () => { pending = null; }, sessionStorage);
  return { render: (code, total, cart = 'cart') => {
    refCursor = 0;
    api = instance.exports.default(code, total, cart);
    if (effect.key !== previous) { cleanup?.(); previous = effect.key; cleanup = effect.fn(); }
    return api;
  }, tick: () => pending?.(), state: () => state, stored: () => storage.get('hg_voucher_code') };
}

test('Voucher từ giỏ hàng được tự xác thực và áp dụng mà không cần bấm lại', async () => {
  const calls = [], h = voucherHarness(async (code, total) => { calls.push([code, total]); return { valid: true, code, discountAmount: 10000 }; });
  h.render('HG10K', 300000); await h.tick();
  assert.deepEqual(calls, [['HG10K', 300000]]);
  assert.equal(h.state().discountAmount, 10000);
  assert.equal(h.stored(), 'HG10K');
  assert.equal(h.state().validating, false);
});

test('Thay đổi giỏ tự kiểm tra lại; phản hồi voucher cũ không ghi đè giỏ mới', async () => {
  let complete;
  const h = voucherHarness((code, total) => total === 300000 ? new Promise(resolve => { complete = resolve; })
    : Promise.resolve({ valid: false }));
  h.render('HG10K', 300000); const old = h.tick();
  h.render('HG10K', 100000); await h.tick();
  complete({ valid: true, code: 'HG10K', discountAmount: 10000 }); await old;
  assert.equal(h.state().discountAmount, 0);
  assert.match(h.state().error, /không hợp lệ/);
  h.render('', 100000); assert.equal(h.state().validating, false); assert.equal(h.stored(), undefined);
});

test('Từ khóa ngắn không gọi API; hai ký tự gợi ý sáu sản phẩm công khai', async () => {
  const calls = [], h = hookHarness(async params => { calls.push(params); return [{ id: 3, catalogVisible: true }, { id: 4, catalogVisible: false }]; });
  h.query('y'); await h.tick(); assert.equal(calls.length, 0);
  h.query('yo'); assert.equal(h.state().loading, true); await h.tick();
  assert.deepEqual(calls[0], 'yo');
  assert.deepEqual(h.state().items.map(item => item.id), [3]); assert.equal(h.state().loading, false); h.dispose();
});

test('Phản hồi cũ không ghi đè từ khóa mới; lỗi API được hiển thị rõ', async () => {
  let complete;
  const h = hookHarness(params => params === 'yo' ? new Promise(resolve => { complete = resolve; }) : Promise.reject(new Error('Mất mạng')));
  h.query('yo'); const old = h.tick(); h.query('victor'); await h.tick();
  complete([{ id: 99 }]); await old;
  assert.deepEqual(h.state().items, []); assert.match(h.state().error, /Chưa tải được/);
  h.query(''); assert.equal(h.state().error, ''); assert.equal(h.state().loading, false); h.dispose();
});
