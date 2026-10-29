import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { transformSync } from 'esbuild';
import { buildOrderPayload, getOrCreateIdempotencyKey, clearStoredCheckoutIntent, getOrCreatePaymentLinkKey } from '../utils/idempotency.js';
import { formatPrice } from '../utils/formatters.js';

class Storage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
globalThis.sessionStorage = new Storage();
const source = fs.readFileSync(new URL('./CheckoutPage.jsx', import.meta.url), 'utf8');
const start = source.indexOf('export const pendingCheckoutStorageKey');
const helpers = source.slice(start, source.indexOf('/**', start)).replaceAll('export ', '');
const handlerStart = source.indexOf('  const handleSubmitOrder =');
const implementation = source.slice(source.indexOf('  const validateNewCheckout ='),
  source.indexOf('\n  };', handlerStart) + '\n  };'.length);

function production(scope) {
  return new Function(...Object.keys(scope), helpers + '\n' + implementation
    + '\nreturn { submit: handleSubmitOrder, read: readPendingCheckoutSubmission };')(...Object.values(scope));
}
function harness(overrides = {}) {
  const item = { cartItemId: 'variant-277', product: { id: 4, price: 4350000 }, variantId: 277, quantity: 1 };
  const state = { user: { id: 51 }, customerName: 'Nguyễn Văn A', shippingPhone: '0901234567',
    addressDetail: 'Số 1', province: 'Hà Nội', ward: 'Phường Ba Đình', provinceCode: '01', wardCode: '00001',
    paymentMethod: 'COD', voucherCode: '', voucherSuccess: false, checkoutItems: [item],
    email: '', note: '', requestedPoints: 0, saveInfo: false, loading: false, isValidatingVoucher: false,
    loyaltyRefreshing: false, loyaltyError: '',
    subtotal: 4350000, effectiveDiscount: 0, shippingDiscountAmount: 0, pointsDiscount: 0, shippingFee: 0, finalTotal: 4350000, redeemPoints: 0,
    ...overrides, removed: [], updated: [], navigation: null, error: '' };
  const currentCartRef = { current: state.checkoutItems };
  const pendingSubmissionRef = { current: null };
  const isSubmittingRef = { current: false };
  const checkoutOwnerRef = { current: state.user.id };
  const checkoutTokenRef = { current: null };
  const checkoutActiveRef = { current: true };
  const api = { createOrder: async () => ({ id: 301 }), createPaymentLink: async () => ({ status: 'PENDING' }) };
  const addresses = { getMyAddresses: async () => ({ data: [] }), createAddress: async () => ({ id: 1 }) };
  const scope = () => ({ ...state, currentPayload: buildOrderPayload(state), currentCartRef, pendingSubmissionRef,
    isSubmittingRef, checkoutOwnerRef, checkoutTokenRef, checkoutActiveRef, shippingAddressApi: addresses,
    getOrCreateIdempotencyKey, clearStoredCheckoutIntent, getOrCreatePaymentLinkKey, orderApi: api,
    navigate: (route, options) => { state.navigation = { route, ...options }; },
    removeFromCart: id => state.removed.push(id), updateQuantity: (id, quantity) => state.updated.push({ id, quantity }),
    setLoading: value => { state.loading = value; }, setErrorMsg: value => { state.error = value; },
    setPendingSubmission: value => { state.pending = value; } });
  pendingSubmissionRef.current = production(scope()).read(state.user.id);
  return { state, api, addresses, checkoutOwnerRef, checkoutTokenRef, checkoutActiveRef, currentCartRef, pendingSubmissionRef,
    submit: () => production(scope()).submit(), change: patch => Object.assign(state, patch) };
}
const failure = status => Object.assign(new Error('Kết quả chưa rõ'), { response: { status, data: { message: 'Kết quả chưa rõ' } } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

for (const wrapped of [false, true]) test('Đơn đã tạo hoặc replay: chấp nhận đúng ID (' + wrapped + ')', async () => {
  sessionStorage.clear();
  const h = harness();
  h.api.createOrder = async () => wrapped ? { data: { id: 301 } } : { id: 301 };
  await h.submit();
  assert.equal(h.state.navigation.route, '/order-success/301');
  assert.deepEqual(h.state.removed, ['variant-277']);
  assert.equal(sessionStorage.getItem('hg_checkout_submission_51'), null);
});

test('Nhấp liên tiếp chỉ gửi một yêu cầu trong khi đang chờ', async () => {
  sessionStorage.clear(); const h = harness(); const d = deferred(); let count = 0;
  h.api.createOrder = () => { count++; return d.promise; };
  const first = h.submit(); const second = h.submit();
  assert.equal(count, 1); d.resolve({ id: 302 }); await Promise.all([first, second]);
  assert.equal(h.state.navigation.route, '/order-success/302');
});

test('UI đổi trong khi chờ vẫn nhận đơn đã tạo và không tạo đơn thứ hai', async () => {
  sessionStorage.clear(); const h = harness(); const d = deferred(); let count = 0;
  h.api.createOrder = () => { count++; return d.promise; };
  const pending = h.submit(); h.change({ paymentMethod: 'PAYOS_VIETQR', addressDetail: 'Địa chỉ khác' });
  await h.submit(); d.resolve({ id: 303, paymentMethod: 'COD' }); await pending;
  assert.equal(count, 1); assert.equal(h.state.navigation.route, '/order-success/303');
});

for (const status of [undefined, 401, 409, 500, 503]) test('Kết quả chưa rõ ' + status + ': reload dùng cùng payload/key', async () => {
  sessionStorage.clear(); const h = harness(); let first;
  h.api.createOrder = async (payload, key) => { first = { payload, key }; throw status ? failure(status) : new Error('Timeout'); };
  await h.submit();
  assert.equal(h.state.navigation, null); assert.deepEqual(h.state.removed, []);
  assert.ok(sessionStorage.getItem('hg_checkout_submission_51'));
  const replay = harness({ shippingPhone: '0909999999', paymentMethod: 'PAYOS_VIETQR' });
  let recovered;
  replay.api.createOrder = async (payload, key) => { recovered = { payload, key }; return { id: 304 }; };
  await replay.submit(); assert.deepEqual(recovered, first);
  assert.equal(replay.state.navigation.route, '/order-success/304');
});

for (const status of [400, 403, 404, 422]) test('Máy chủ từ chối dứt điểm ' + status + ': giữ giỏ và mở sửa thông tin', async () => {
  sessionStorage.clear(); const h = harness(); h.api.createOrder = async () => { throw failure(status); };
  await h.submit();
  assert.equal(sessionStorage.getItem('hg_checkout_submission_51'), null);
  assert.deepEqual(h.state.removed, []); assert.equal(h.pendingSubmissionRef.current, null);
});

test('Snapshot hỏng không tự bỏ key hoặc tạo đơn mới', async () => {
  sessionStorage.clear(); sessionStorage.setItem('hg_checkout_submission_51', '{hỏng');
  const h = harness(); let count = 0; h.api.createOrder = async () => { count++; return { id: 305 }; };
  await h.submit(); assert.equal(count, 0); assert.match(h.state.error, /Yêu cầu trước không đọc được/);
  assert.equal(sessionStorage.getItem('hg_checkout_submission_51'), '{hỏng');
});

test('Snapshot gắn tài khoản không được replay bởi tài khoản khác', async () => {
  sessionStorage.clear(); const h = harness(); h.api.createOrder = async () => { throw new Error('Timeout'); }; await h.submit();
  const other = harness({ user: { id: 52 } }); let sent;
  other.api.createOrder = async (payload, key) => { sent = key; return { id: 306 }; }; await other.submit();
  const old = JSON.parse(sessionStorage.getItem('hg_checkout_submission_51'));
  assert.notEqual(sent, old.key); assert.ok(old.payload.items.length);
});

test('Hết thời gian lưu key không làm xoay key của snapshot chưa rõ kết quả', async () => {
  sessionStorage.clear(); const h = harness(); let key;
  h.api.createOrder = async (payload, value) => { key = value; throw new Error('Timeout'); }; await h.submit();
  const snapshot = JSON.parse(sessionStorage.getItem('hg_checkout_submission_51'));
  snapshot.createdAt = '2020-01-01T00:00:00.000Z';
  sessionStorage.setItem('hg_checkout_submission_51', JSON.stringify(snapshot));
  const replay = harness(); replay.api.createOrder = async (payload, value) => { assert.equal(value, key); return { id: 307 }; };
  await replay.submit(); assert.equal(replay.state.navigation.route, '/order-success/307');
});

test('Lỗi tạo liên kết QR không tạo lại đơn và vẫn mở trang QR với lỗi thật', async () => {
  sessionStorage.clear(); const h = harness({ paymentMethod: 'PAYOS_VIETQR' }); let orders = 0, links = 0;
  h.api.createOrder = async () => { orders++; return { id: 308, paymentMethod: 'PAYOS_VIETQR' }; };
  h.api.createPaymentLink = async () => { links++; throw failure(503); };
  await h.submit();
  assert.equal(orders, 1); assert.equal(links, 1); assert.equal(h.state.navigation.route, '/payment/qr/308');
  assert.equal(h.state.navigation.state.payment, null); assert.match(h.state.navigation.state.paymentError, /Kết quả chưa rõ/);
});

test('Đơn replay đã hủy mở chi tiết, không tạo QR', async () => {
  sessionStorage.clear(); const h = harness({ paymentMethod: 'PAYOS_VIETQR' }); let links = 0;
  h.api.createOrder = async () => ({ id: 309, status: 'CANCELLED' }); h.api.createPaymentLink = async () => { links++; };
  await h.submit(); assert.equal(links, 0); assert.equal(h.state.navigation.route, '/orders/309');
});

test('Giỏ thay đổi trong khi chờ chỉ trừ số lượng đã đặt', async () => {
  sessionStorage.clear(); const h = harness(); const d = deferred(); h.api.createOrder = () => d.promise;
  const waiting = h.submit(); h.currentCartRef.current = [{ ...h.state.checkoutItems[0], quantity: 4 }];
  d.resolve({ id: 310 }); await waiting;
  assert.deepEqual(h.state.updated, [{ id: 'variant-277', quantity: 3 }]); assert.deepEqual(h.state.removed, []);
});

test('Không lưu được snapshot thì không gửi yêu cầu', async () => {
  sessionStorage.clear(); const original = sessionStorage.setItem;
  sessionStorage.setItem = () => { throw new Error('Storage unavailable'); };
  try { const h = harness(); let count = 0; h.api.createOrder = async () => { count++; };
    await h.submit(); assert.equal(count, 0); assert.match(h.state.error, /Storage unavailable/);
  } finally { sessionStorage.setItem = original; }
});

test('Không có Web Crypto thì không gửi đơn', async () => {
  sessionStorage.clear(); const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try { const h = harness(); let count = 0; h.api.createOrder = async () => { count++; };
    await h.submit(); assert.equal(count, 0); assert.match(h.state.error, /Web Crypto/);
  } finally { Object.defineProperty(globalThis, 'crypto', descriptor); }
});

test('Form khóa thông tin, voucher, điểm và phương thức khi đang chờ', () => {
  assert.match(source, /const submissionLocked = loading \|\| Boolean\(pendingSubmission\)/);
  assert.match(source, /<fieldset disabled=\{submissionLocked\}/);
  assert.match(source, /if \(isSubmittingRef.current \|\| pendingSubmissionRef.current\) return/);
});

function loyaltyControlFixture(overrides = {}) {
  const jsx = source.match(/<div data-testid="loyalty-points-control"[\s\S]*?<\/div>\s*<\/div>/)[0];
  const code = transformSync('return (' + jsx + ');', { loader: 'jsx' }).code;
  const state = { maximumPoints: 3, redeemPoints: 0, submissionLocked: false, isValidatingVoucher: false,
    loyaltyRefreshing: false, loyaltyError: '', ...overrides };
  const scope = () => ({ ...state, setRequestedPoints: value => { state.redeemPoints = value; } });
  const render = () => {
    const values = scope();
    const tree = new Function('React', 'ChevronUp', 'ChevronDown', ...Object.keys(values), code)
      (React, () => null, () => null, ...Object.values(values));
    const nodes = cartTestElements(tree);
    return { input: nodes.find(node => node.type === 'input'),
      up: nodes.find(node => node.props['aria-label'] === 'Tăng điểm sử dụng'),
      down: nodes.find(node => node.props['aria-label'] === 'Giảm điểm sử dụng') };
  };
  return { state, render };
}

function loyaltyRefreshFixture(refreshProfile) {
  const start=source.indexOf('  useEffect(() => {',source.indexOf('  const loyaltyCartKey ='));
  const effect=source.slice(start,source.indexOf('  // Saved Addresses',start));
  const state={loading:false,error:''},listeners=new Map();let cleanup;
  const scope={user:{id:51},checkoutToken:'session-A',isResumeMode:false,loyaltyCartKey:'racket',loyaltyRefreshVersion:0,refreshProfile,
    useEffect:fn=>{cleanup=fn();},setLoyaltyRefreshing:value=>{state.loading=value;},setLoyaltyError:value=>{state.error=value;},
    window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}};
  const render=()=>new Function(...Object.keys(scope),effect)(...Object.values(scope));
  return {state,render,focus:()=>listeners.get('focus')?.(),unmount:()=>cleanup?.(),
    switchCart:key=>{cleanup?.();scope.loyaltyCartKey=key;render();}};
}

test('Checkout thật tải lại điểm khi mở, đổi vợt sang cước và quay lại tab; dọn listener khi rời trang',async()=>{
  let calls=0;const h=loyaltyRefreshFixture(async()=>{calls++;return {id:51,loyaltyPoints:10};});
  h.render();await Promise.resolve();assert.equal(calls,1);assert.equal(h.state.loading,false);
  h.switchCart('string');await Promise.resolve();assert.equal(calls,2);
  await h.focus();assert.equal(calls,3);h.unmount();await h.focus();assert.equal(calls,3);
});

test('Refresh điểm lỗi có thông báo; lỗi cũ hoặc unmount không ghi đè lần tải mới',async()=>{
  let rejectOld;let calls=0;
  const h=loyaltyRefreshFixture(()=>++calls===1?new Promise((resolve,reject)=>{rejectOld=reject;}):Promise.resolve({loyaltyPoints:5}));
  h.render();await h.focus();assert.equal(h.state.loading,false);
  rejectOld(new Error('Lỗi cũ'));await Promise.resolve();await Promise.resolve();assert.equal(h.state.error,'');
  h.unmount();
  const failed=loyaltyRefreshFixture(async()=>{throw new Error('Mất mạng');});
  failed.render();await Promise.resolve();await Promise.resolve();assert.match(failed.state.error,/Chưa cập nhật/);
});

test('Điểm checkout: nút tăng/giảm luôn hiện, thay đổi từng điểm và khóa đúng hai biên', () => {
  const h = loyaltyControlFixture();
  let control = h.render();
  assert.equal(control.down.props.disabled, true); assert.equal(control.up.props.disabled, false);
  assert.equal(control.up.props.type, 'button'); assert.equal(control.down.props.type, 'button');
  for (let value = 1; value <= 3; value++) {
    control.up.props.onClick(); control = h.render(); assert.equal(control.input.props.value, value);
  }
  assert.equal(control.up.props.disabled, true);
  control.down.props.onClick(); assert.equal(h.render().input.props.value, 2);
});

test('Điểm checkout: vẫn nhập tay được, không âm, không vượt giới hạn và không nhận phần lẻ', () => {
  const h = loyaltyControlFixture();
  for (const [input, expected] of [['2', 2], ['-1', 0], ['999', 3], ['1.5', 1], ['', 0]]) {
    h.render().input.props.onChange({ target: { value: input } });
    assert.equal(h.render().input.props.value, expected);
  }
});

test('Điểm checkout: hết hạn mức, đang xác thực voucher hoặc đang gửi đơn đều khóa điều khiển', () => {
  for (const state of [{ maximumPoints: 0 }, { submissionLocked: true }, { isValidatingVoucher: true },
    { loyaltyRefreshing: true }, { loyaltyError: 'Mất kết nối' }]) {
    const control = loyaltyControlFixture(state).render();
    assert.equal(control.input.props.disabled, true);
    assert.equal(control.up.props.disabled, true); assert.equal(control.down.props.disabled, true);
  }
});

const voucherSource = fs.readFileSync(new URL('../components/useCheckoutVoucher.jsx', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replaceAll('export default ', '').replaceAll('export ', '');

function voucherHarness(api) {
  const slots = []; const effects = []; const waiting = []; const timers = new Map(); let cursor = 0; let timerId = 0;
  const useState = initial => { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; };
  const useRef = value => { const index = cursor++; return slots[index] ??= { current: value }; };
  const useEffect = (effect, deps) => { const index = cursor++; const old = effects[index];
    if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) { effects[index] = { deps, cleanup: old?.cleanup };
      waiting.push(() => { old?.cleanup?.(); effects[index].cleanup = effect(); }); } };
  const factory = new Function('useState', 'useRef', 'useEffect', 'voucherApi', 'formatPrice', 'setTimeout', 'clearTimeout', voucherSource
    + '\nreturn { useCheckoutVoucher, checkoutVoucherQuote };');
  const actual = factory(useState, useRef, useEffect, api, formatPrice,
    callback => { timers.set(++timerId, callback); return timerId; }, id => timers.delete(id));
  const render = (...args) => { cursor = 0; actual.useCheckoutVoucher(...args); waiting.splice(0).forEach(effect => effect());
    cursor = 0; return actual.useCheckoutVoucher(...args); };
  return { render, quote: actual.checkoutVoucherQuote, unmount: () => effects.forEach(effect => effect?.cleanup?.()),
    timer: () => { const [id, callback] = [...timers.entries()].at(-1) || []; timers.delete(id); return callback?.(); } };
}

function actualCheckoutTotals(voucher, pendingSubmission = null, requestedPoints = 0, overrides = {}) {
  const body = source.slice(source.indexOf('  const subtotal = checkoutItems.reduce('), source.indexOf('  // Live order payload'));
  const scope = { checkoutItems: [{ cartItemId: 'line-1', quantity: 1, product: { id: 7, price: 400000 } }],
    voucherCode: voucher.appliedVoucher?.code || '', useCheckoutVoucher: () => voucher,
    profile: { loyaltyPoints: 1000 }, requestedPoints, pendingSubmission, ...overrides };
  return new Function(...Object.keys(scope), body + '\nreturn { shippingFee, displayedShippingFee, maximumPoints, loyaltyLimitPoints, redeemPoints, pointsDiscount, finalTotal, orderSummary, effectiveDiscount };')(...Object.values(scope));
}

test('Điểm không bị giới hạn cố định ở 1; áp dụng cả số dư và trần 10% sau voucher',()=>{
  const voucher={discountAmount:0,finalShippingFee:30000};
  const available=actualCheckoutTotals(voucher,null,100,{profile:{loyaltyPoints:1000}});
  assert.equal(available.maximumPoints,400);assert.equal(available.redeemPoints,100);assert.equal(available.pointsDiscount,10000);
  const limited=actualCheckoutTotals(voucher,null,500,{profile:{loyaltyPoints:1000}});
  assert.equal(limited.redeemPoints,400);assert.equal(limited.pointsDiscount,40000);
  const balance=actualCheckoutTotals(voucher,null,100,{profile:{loyaltyPoints:1}});
  assert.equal(balance.loyaltyLimitPoints,400);assert.equal(balance.maximumPoints,1);assert.equal(balance.redeemPoints,1);
});

test('Đổi từ vợt sang cước chỉ đổi hạn mức đơn, không mất điểm do lựa chọn nháp',()=>{
  const profile={loyaltyPoints:10};
  const totals=(price,discount,requested)=>actualCheckoutTotals({discountAmount:discount,finalShippingFee:30000},null,requested,
    {profile,checkoutItems:[{cartItemId:'selected',quantity:1,product:{id:7,price}}]});
  assert.equal(totals(2550000,1000000,5).redeemPoints,5);
  assert.equal(totals(60000,0,5).redeemPoints,5);assert.equal(profile.loyaltyPoints,10);
  assert.equal(totals(60000,60000,5).redeemPoints,0);assert.equal(profile.loyaltyPoints,10);
  assert.equal(totals(60000,0,5).redeemPoints,5);
});

test('Không gửi yêu cầu dùng điểm khi số dư chưa tải xong hoặc tải thất bại',async()=>{
  for(const state of [{loyaltyRefreshing:true},{loyaltyError:'Chưa tải được điểm'}]) {
    sessionStorage.clear();const h=harness({redeemPoints:1,...state});let requests=0;
    h.api.createOrder=async()=>{requests++;return {id:301};};await h.submit();
    assert.equal(requests,0);assert.ok(h.state.error);assert.equal(h.state.removed.length,0);
  }
});

function actualCartTotals(voucher) {
  const cartSource = fs.readFileSync(new URL('./CartPage.jsx', import.meta.url), 'utf8');
  const body = cartSource.slice(cartSource.indexOf('  const selectedSubtotal ='), cartSource.indexOf('  const handleRemoveCoupon'));
  const scope = { selectedItems: [{ cartItemId: 'line-1', quantity: 1, product: { id: 7, price: 400000 } }],
    getItemId: item => item.cartItemId, couponCode: voucher.appliedVoucher?.code || '', useCheckoutVoucher: () => voucher };
  return new Function(...Object.keys(scope), body + '\nreturn { shippingFee, displayedShippingFee, finalTotal, effectiveDiscount, shippingDiscountAmount };')(...Object.values(scope));
}

test('SHIPPING production: Cart và Checkout cùng giảm ship, không trừ tiền hàng hoặc sai mức đổi điểm', async () => {
  sessionStorage.clear(); let request;
  const h = voucherHarness({ validateVoucher: async (code, orderTotal) => { request = { code, orderTotal };
    return { valid: true, code: 'FREESHIP', discountAmount: 0, shippingDiscountAmount: 30000, finalShippingFee: 0 }; } });
  h.render('FREESHIP', 400000, 'line-1'); await h.timer(); const voucher = h.render('FREESHIP', 400000, 'line-1');
  assert.deepEqual(request, { code: 'FREESHIP', orderTotal: 400000 });
  assert.equal(voucher.discountAmount, 0); assert.equal(voucher.finalShippingFee, 0); assert.match(voucher.success, /phí vận chuyển/);
  assert.equal(actualCartTotals(voucher).finalTotal, 400000); assert.equal(actualCheckoutTotals(voucher).finalTotal, 400000);
  assert.equal(actualCartTotals(voucher).displayedShippingFee, 30000);
  assert.equal(actualCheckoutTotals(voucher).displayedShippingFee, 30000);
  assert.equal(400000 - actualCartTotals(voucher).effectiveDiscount + actualCartTotals(voucher).displayedShippingFee - voucher.shippingDiscountAmount, actualCartTotals(voucher).finalTotal);
  assert.equal(400000 - actualCheckoutTotals(voucher).effectiveDiscount + actualCheckoutTotals(voucher).displayedShippingFee - voucher.shippingDiscountAmount, actualCheckoutTotals(voucher).finalTotal);
  assert.equal(actualCheckoutTotals(voucher, null, 500).maximumPoints, 400);
  assert.equal(actualCheckoutTotals(voucher, null, 500).finalTotal, 360000);
});

test('FIXED/legacy production: chỉ giảm hàng, không miễn phí ship và Cart/Checkout khớp tổng', async () => {
  sessionStorage.clear(); const h = voucherHarness({ validateVoucher: async () => ({ valid: true, code: 'HG10K', discountAmount: 10000 }) });
  h.render('HG10K', 400000, 'line-1'); await h.timer(); const voucher = h.render('HG10K', 400000, 'line-1');
  assert.equal(voucher.shippingDiscountAmount, 0); assert.equal(voucher.finalShippingFee, 30000);
  assert.equal(actualCartTotals(voucher).finalTotal, 420000); assert.equal(actualCheckoutTotals(voucher).finalTotal, 420000);
  assert.equal(actualCheckoutTotals(voucher, null, 500).maximumPoints, 390);
  assert.equal(actualCheckoutTotals(voucher, null, 500).finalTotal, 381000);
});

test('Hook thật loại response chậm khi giỏ/code đổi, xóa discount cũ ngay từ render', async () => {
  sessionStorage.clear(); const slow = deferred();
  const h = voucherHarness({ validateVoucher: async code => code === 'OLD' ? slow.promise : { valid: true, code, discountAmount: 10000 } });
  h.render('OLD', 400000, 'line-A'); const first = h.timer();
  const changed = h.render('NEW', 400000, 'line-B'); assert.equal(changed.discountAmount, 0); assert.equal(changed.validating, true);
  await h.timer(); slow.resolve({ valid: true, code: 'OLD', discountAmount: 200000 }); await first;
  const actual = h.render('NEW', 400000, 'line-B'); assert.equal(actual.discountAmount, 10000); assert.equal(actual.appliedVoucher.code, 'NEW');
  assert.equal(sessionStorage.getItem('hg_voucher_code'), 'NEW');
});

test('Hook thật cùng key: yêu cầu cũ trả sau không ghi đè xác thực mới, unmount không nhận response', async () => {
  sessionStorage.clear(); const old = deferred(); const latest = deferred(); let calls = 0;
  const h = voucherHarness({ validateVoucher: () => ++calls === 1 ? old.promise : latest.promise });
  const initial = h.render('HG10K', 400000, 'line-1'); const first = initial.apply(); const second = initial.apply();
  latest.resolve({ valid: true, code: 'HG10K', discountAmount: 10000 }); await second;
  old.resolve({ valid: true, code: 'HG10K', discountAmount: 200000 }); await first;
  assert.equal(h.render('HG10K', 400000, 'line-1').discountAmount, 10000);
  const afterUnmount = deferred(); const unmounted = voucherHarness({ validateVoucher: () => afterUnmount.promise });
  unmounted.render('LATE', 400000, 'line-2'); const pending = unmounted.timer(); unmounted.unmount();
  afterUnmount.resolve({ valid: true, code: 'LATE', discountAmount: 30000 }); await pending;
  assert.notEqual(sessionStorage.getItem('hg_voucher_code'), 'LATE');
});

test('Hook lỗi voucher miễn ship đơn vốn miễn ship: giữ tổng, báo đúng lỗi, không giữ mã cũ', async () => {
  sessionStorage.clear(); sessionStorage.setItem('hg_voucher_code', 'OLD');
  const h = voucherHarness({ validateVoucher: async () => { throw { response: { data: { message: 'Đơn hàng đã được miễn phí vận chuyển' } } }; } });
  h.render('FREESHIP', 1000000, 'line-1'); await h.timer(); const actual = h.render('FREESHIP', 1000000, 'line-1');
  assert.equal(actual.discountAmount, 0); assert.equal(actual.shippingDiscountAmount, 0); assert.equal(actual.finalShippingFee, 0);
  assert.match(actual.error, /đã được miễn phí/); assert.equal(sessionStorage.getItem('hg_voucher_code'), null);
});

test('Snapshot chưa rõ kết quả giữ cả giảm ship/tổng dù giá, giỏ hoặc voucher hiện tại đổi', async () => {
  sessionStorage.clear(); const h = harness({ subtotal: 400000, effectiveDiscount: 0, shippingDiscountAmount: 30000,
    shippingFee: 0, finalTotal: 400000, voucherCode: 'FREESHIP', voucherSuccess: 'valid' });
  h.api.createOrder = async () => { throw new Error('Timeout'); }; await h.submit();
  const snapshot = JSON.parse(sessionStorage.getItem('hg_checkout_submission_51'));
  assert.equal(snapshot.form.totals.shippingDiscountAmount, 30000);
  const quote = { discountAmount: 0, shippingDiscountAmount: 0, finalShippingFee: 30000 };
  const current = actualCheckoutTotals(quote, snapshot);
  assert.equal(current.finalTotal, 430000); assert.equal(current.orderSummary.finalTotal, 400000);
  assert.equal(current.orderSummary.shippingDiscountAmount, 30000);
  assert.equal(current.displayedShippingFee, 30000);
});

test('Lưu địa chỉ khi đơn đã tạo: dữ liệu lấy từ yêu cầu đã chụp', async () => {
  sessionStorage.clear(); const h = harness({ saveInfo: true }); const d = deferred(); const saved = [];
  h.api.createOrder = () => d.promise;
  h.addresses.createAddress = async body => { saved.push(body); return { id: 4 }; };
  const task = h.submit(); h.change({ addressDetail: 'Địa chỉ vừa thay' });
  d.resolve({ id: 601 }); await task;
  assert.equal(saved.length, 1); assert.equal(saved[0].addressDetail, 'Số 1');
  assert.equal(saved[0].isDefault, true); assert.equal(h.state.navigation.route, '/order-success/601');
});
test('Địa chỉ đã lưu thì không tạo lại', async () => {
  sessionStorage.clear(); const h = harness({ saveInfo: true }); let creates = 0;
  h.addresses.getMyAddresses = async () => [{ fullName: 'Nguyễn Văn A', phone: '0901234567',
    provinceCode: '01', wardCode: '00001', addressDetail: 'Số 1' }];
  h.addresses.createAddress = async () => { creates++; };
  await h.submit(); assert.equal(creates, 0); assert.equal(h.state.navigation.route, '/order-success/301');
});
test('Lỗi lưu địa chỉ không làm mất đơn đã tạo hoặc tạo đơn thứ hai', async () => {
  sessionStorage.clear(); const h = harness({ saveInfo: true }); let orders = 0;
  h.api.createOrder = async () => { orders++; return { id: 602 }; };
  h.addresses.getMyAddresses = async () => { throw new Error('Không kết nối'); };
  await h.submit(); assert.equal(orders, 1); assert.equal(h.state.navigation.route, '/order-success/602');
  assert.match(h.state.navigation.state.addressSaveWarning, /Đơn hàng đã được tạo/);
  assert.equal(sessionStorage.getItem('hg_checkout_submission_51'), null);
});
test('Không tích lưu thông tin thì không gọi API địa chỉ', async () => {
  sessionStorage.clear(); const h = harness({ saveInfo: false }); let calls = 0;
  h.addresses.getMyAddresses = async () => { calls++; return []; };
  await h.submit(); assert.equal(calls, 0);
});
test('Đổi tài khoản lúc đang tạo đơn không sửa giỏ hoặc điều hướng tài khoản mới', async () => {
  sessionStorage.clear(); const h = harness({ saveInfo: true }); const d = deferred();
  h.api.createOrder = () => d.promise; const task = h.submit();
  h.checkoutOwnerRef.current = 52; d.resolve({ id: 603 }); await task;
  assert.deepEqual(h.state.removed, []); assert.equal(h.state.navigation, null);
  assert.ok(sessionStorage.getItem('hg_checkout_submission_51'));
});
test('Rời checkout khi đang tải sổ địa chỉ không tạo địa chỉ hoặc điều hướng', async () => {
  sessionStorage.clear(); const h = harness({ saveInfo: true }); const d = deferred(); let creates = 0;
  h.addresses.getMyAddresses = () => d.promise; h.addresses.createAddress = async () => { creates++; };
  const task = h.submit(); await new Promise(resolve => setImmediate(resolve));
  h.checkoutActiveRef.current = false; d.resolve([]); await task;
  assert.equal(creates, 0); assert.equal(h.state.navigation, null);
  assert.ok(sessionStorage.getItem('hg_checkout_submission_51'));
});

test('Đổi token khi tải địa chỉ giữ token cũ và không gửi POST dưới phiên mới', async () => {
  sessionStorage.clear(); const h = harness({ saveInfo: true }); const d = deferred();
  const original = globalThis.localStorage; const storage = new Storage(); storage.setItem('token', 'session-A');
  globalThis.localStorage = storage; let headers; let creates = 0;
  h.checkoutTokenRef.current = 'session-A';
  h.addresses.getMyAddresses = config => { headers = config.headers; return d.promise; };
  h.addresses.createAddress = async () => { creates++; };
  try {
    const task = h.submit(); await new Promise(resolve => setImmediate(resolve));
    storage.setItem('token', 'session-B'); d.resolve([]); await task;
    assert.equal(headers.Authorization, 'Bearer session-A'); assert.equal(creates, 0);
    assert.equal(h.state.navigation, null);
  } finally { globalThis.localStorage = original; }
});

function cartTestHooks() {
  const slots = [], effects = []; let cursor = 0;
  return {
    react: { ...React,
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
        return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useEffect(effect) { effects.push(effect); },
    },
    render(component) {
      cursor = 0; effects.length = 0;
      const tree = component();
      effects.splice(0).forEach(effect => effect());
      return tree;
    },
  };
}

function cartTestElements(node) {
  if (Array.isArray(node)) return node.flatMap(cartTestElements);
  if (!React.isValidElement(node)) return [];
  return [node, ...cartTestElements(node.props.children)];
}

function cartPageFixture(initialCart) {
  const hooks = cartTestHooks(), module = { exports: {} }, state = { cart: initialCart, navigation: null, quote: 0 };
  const modules = {
    react: hooks.react,
    'react-router-dom': { Link: () => null, useNavigate: () => (route, options) => { state.navigation = { route, ...options }; } },
    '../context/CartContext': { useCart: () => ({ cart: state.cart,
      removeFromCart: id => { state.cart = state.cart.filter(item => item.cartItemId !== id); }, updateQuantity() {} }) },
    '../context/AuthContext': { useAuth: () => ({ isAuthenticated: true }) },
    '../components/useCheckoutVoucher': (code, subtotal) => { state.quote = subtotal;
      return { discountAmount: 0, shippingDiscountAmount: 0, finalShippingFee: subtotal >= 1000000 ? 0 : 30000 }; },
    '../components/ProductImage': () => null,
    '../utils/formatters': { formatPrice },
    'lucide-react': new Proxy({}, { get: () => () => null }),
  };
  const text = fs.readFileSync(new URL('./CartPage.jsx', import.meta.url), 'utf8');
  new Function('require', 'module', 'exports', transformSync(text, { loader: 'jsx', format: 'cjs' }).code)
    (name => modules[name], module, module.exports);
  return { state, render: () => cartTestElements(hooks.render(module.exports.default)) };
}

const cartTestItems = () => [
  { cartItemId: 'line-a', product: { id: 11, name: 'Vợt kiểm thử', price: 100000 }, quantity: 1 },
  { cartItemId: 'line-b', product: { id: 12, name: 'Giày kiểm thử', price: 200000 }, quantity: 2 },
];
const cartCheckboxes = nodes => nodes.filter(node => node.type === 'input' && node.props.type === 'checkbox');

test('Giỏ hàng thực: xóa một trong hai dòng đã chọn vẫn đồng bộ hai nút chọn tất cả', () => {
  sessionStorage.clear(); const h = cartPageFixture(cartTestItems());
  let nodes = h.render(); assert.ok(cartCheckboxes(nodes).every(node => node.props.checked));
  nodes.find(node => node.type === 'button' && node.props.title === 'Xóa sản phẩm').props.onClick();
  nodes = h.render(); assert.equal(cartCheckboxes(nodes).length, 3);
  assert.ok(cartCheckboxes(nodes).every(node => node.props.checked)); assert.equal(h.state.quote, 400000);
  cartCheckboxes(nodes)[0].props.onChange(); nodes = h.render();
  assert.ok(cartCheckboxes(nodes).every(node => !node.props.checked)); assert.equal(h.state.quote, 0);
  cartCheckboxes(nodes).at(-1).props.onChange(); nodes = h.render();
  assert.ok(cartCheckboxes(nodes).every(node => node.props.checked)); assert.equal(h.state.quote, 400000);
  nodes.find(node => node.type === 'button' && node.props.onClick?.name === 'handleCheckoutClick').props.onClick();
  assert.deepEqual(h.state.navigation.state.selectedItemIds, ['line-b']);
});

test('Giỏ hàng thực: thay đổi dòng ngoài trang không giữ ID cũ hoặc tự chọn dòng mới', () => {
  sessionStorage.clear(); const h = cartPageFixture(cartTestItems()); h.render();
  h.state.cart = [h.state.cart[1], { cartItemId: 'line-c', product: { id: 13, price: 300000 }, quantity: 1 }];
  let nodes = h.render(); const checks = cartCheckboxes(nodes);
  assert.deepEqual(checks.map(node => node.props.checked), [false, true, false, false]);
  nodes.find(node => node.type === 'button' && node.props.onClick?.name === 'handleCheckoutClick').props.onClick();
  assert.deepEqual(h.state.navigation.state.selectedItemIds, ['line-b']);
  checks[0].props.onChange(); nodes = h.render(); assert.ok(cartCheckboxes(nodes).every(node => node.props.checked));
  nodes.find(node => node.type === 'button' && node.props.onClick?.name === 'removeSelectedItems').props.onClick();
  assert.deepEqual(h.state.cart, []); assert.equal(cartCheckboxes(h.render()).length, 0);
});
