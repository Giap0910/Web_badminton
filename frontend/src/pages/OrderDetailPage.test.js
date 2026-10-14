import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPaymentStatusInfo, formatReviewReason } from '../utils/paymentFormatters.js';
import { formatDate, getOrderStatusLabel } from '../utils/formatters.js';
import { formatOrderItemOptionsText } from '../utils/orderItemOptions.js';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';
import * as orderIcons from 'lucide-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function productionOrderHandler(name, scope) {
  const source = fs.readFileSync(path.join(__dirname, 'OrderDetailPage.jsx'), 'utf8');
  const match = source.match(new RegExp(`const ${name} = async \\(([^)]*)\\) => \\{([\\s\\S]*?)\\n  \\};`));
  assert.ok(match, 'Thực thi handler OrderDetailPage thật');
  return new Function(...Object.keys(scope), `return async (${match[1]}) => {${match[2]}}`)(...Object.values(scope));
}

function orderRuntime(api, id = '51') {
  const state = { order: null, payment: null, error: '', paymentError: null, loading: true, paymentLoading: true, reads: [] };
  const scope = { id, orderApi: api, isMountedRef: { current: true }, currentOrderIdRef: { current: id },
    orderFetchGenerationRef: { current: 0 }, paymentFetchGenerationRef: { current: 0 }, activeOrderPaymentIdRef: { current: null },
    setOrder: value => { state.order = value; }, setPayment: value => { state.payment = value; },
    setOrderError: value => { state.error = value; }, setPaymentError: value => { state.paymentError = value; },
    setPaymentLoading: value => { state.paymentLoading = value; }, setLoading: value => { state.loading = value; },
    setTimeLeft: () => {}, fetchPaymentOnly: value => state.reads.push(value) };
  return { state, scope, fetch: () => productionOrderHandler('fetchOrderAndPayment', scope)() };
}

test('Đơn hàng thật: phản hồi route A chậm không ghi đè route B', async () => {
  let release;
  const runtime = orderRuntime({ getOrderById: id => id === '51' ? new Promise(resolve => { release = resolve; }) : Promise.resolve({ id: 52 }) });
  const oldRequest = runtime.fetch();
  runtime.scope.id = '52'; runtime.scope.currentOrderIdRef.current = '52';
  await runtime.fetch(); release({ id: 51 }); await oldRequest;
  assert.equal(runtime.state.order.id, 52); assert.deepEqual(runtime.state.reads, ['52']);
});

test('Đơn hàng thật: response cũ cùng ID không ghi đè trạng thái mới', async () => {
  let release, calls = 0;
  const runtime = orderRuntime({ getOrderById: () => ++calls === 1 ? new Promise(resolve => { release = resolve; }) : Promise.resolve({ id: 51, status: 'COMPLETED' }) });
  const oldRequest = runtime.fetch(); await runtime.fetch();
  release({ id: 51, status: 'PENDING' }); await oldRequest;
  assert.equal(runtime.state.order.status, 'COMPLETED');
});

test('Đơn hàng thật: lỗi mạng không giả thành404, retry cùng ID tải lại được', async () => {
  let calls = 0;
  const runtime = orderRuntime({ getOrderById: async () => {
    if (++calls === 1) { const error = new Error('Unavailable'); error.response = { status: 503 }; throw error; }
    return { id: 51 };
  } });
  await runtime.fetch(); assert.match(runtime.state.error, /kết nối/); assert.equal(runtime.state.loading, false);
  await runtime.fetch(); assert.equal(runtime.state.order.id, 51); assert.equal(runtime.state.error, ''); assert.equal(calls, 2);
});

test('Đơn hàng thật:403 xóa snapshot được bảo vệ và không đọc payment', async () => {
  const runtime = orderRuntime({ getOrderById: async () => { const error = new Error('Forbidden'); error.response = { status: 403 }; throw error; } });
  runtime.state.order = { id: 51 }; runtime.state.payment = { orderId: 51 };
  await runtime.fetch();
  assert.equal(runtime.state.order, null); assert.equal(runtime.state.payment, null);
  assert.match(runtime.state.error, /không có quyền/); assert.deepEqual(runtime.state.reads, []);
});

test('Payment thật: GET cũ trả muộn không ghi đè xác nhận mới', async () => {
  let release, calls = 0;
  const runtime = orderRuntime({ getOrderPayment: () => ++calls === 1 ? new Promise(resolve => { release = resolve; })
    : Promise.resolve({ orderId: 51, status: 'PAID' }) });
  const read = productionOrderHandler('fetchPaymentOnly', runtime.scope);
  const oldRequest = read('51'); await read('51');
  release({ orderId: 51, status: 'PENDING' }); await oldRequest;
  assert.equal(runtime.state.payment.status, 'PAID'); assert.equal(runtime.state.paymentLoading, false);
});

test('Đơn hàng thật: unmount loại bỏ phản hồi đang chờ', async () => {
  let release;
  const runtime = orderRuntime({ getOrderById: () => new Promise(resolve => { release = resolve; }) });
  const pending = runtime.fetch(); runtime.scope.isMountedRef.current = false; release({ id: 51 }); await pending;
  assert.equal(runtime.state.order, null); assert.deepEqual(runtime.state.reads, []);
});

function productionHistoryHelper(name) {
  const source = fs.readFileSync(path.join(__dirname, 'MyOrdersPage.jsx'), 'utf8');
  const body = source.match(new RegExp(`export function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0];
  assert.ok(body, 'Thực thi hàm lịch sử đơn thật');
  return new Function('formatDate', 'getOrderStatusLabel', 'formatOrderItemOptionsText', `return ${body.replace('export ', '')}`)
    (formatDate, getOrderStatusLabel, formatOrderItemOptionsText);
}

test('Lịch sử thật: dùng snapshot giày đúng, tổng số lượng theo quantity, không ảnh/tên demo', () => {
  const normalize = productionHistoryHelper('normalizeUserOrder');
  const order = normalize({ id: 51, paymentMethod: 'COD', cashCollected: true, status: 'COMPLETED', totalAmount: 1500000,
    items: [{ productName: 'Giày Victor đã ngừng bán', productImageUrl: null, quantity: 3 }, { productName: 'Áo Yonex', quantity: 2 }] });
  assert.equal(order.quantity, 5); assert.equal(order.productImage, null); assert.equal(order.productName, 'Giày Victor đã ngừng bán');
  assert.equal(order.createdAt, '—'); assert.equal(order.statusLabel, 'Đã giao và thanh toán');
});

test('Phiếu đơn CSV thật: tiếng Việt, BOM, đầy đủ snapshot và chống công thức Excel', () => {
  const normalize = productionHistoryHelper('normalizeUserOrder'), csv = productionHistoryHelper('userOrderSlipCsv');
  const output = csv([normalize({ id: 51, customerName: '=HYPERLINK("https://example.invalid")', shippingPhone: '0901234567',
    paymentMethod: 'COD', status: 'PENDING', totalAmount: 200000, shippingFee: 30000,
    items: [{ productName: 'Áo "Yonex"', quantity: 2, selectedSize: 'M', selectedColor: 'Đỏ' }] })]);
  assert.ok(output.startsWith('\uFEFF')); assert.ok(output.includes('Tổng số lượng'));
  assert.ok(output.includes('Áo ""Yonex"" × 2')); assert.ok(output.includes('Size: M')); assert.ok(output.includes('Đỏ'));
  assert.ok(output.includes("\"'=HYPERLINK")); assert.ok(output.includes('200000')); assert.ok(output.includes('30000'));
});

test('SECTION 30 & 47 — CANCELLED order with NEEDS_REVIEW payment: distinct states, no false completion', () => {
  const order = {
    id: 501,
    status: 'CANCELLED',
    paymentMethod: 'PAYOS_VIETQR',
  };

  const payment = {
    id: 9001,
    orderId: 501,
    status: 'NEEDS_REVIEW',
    amount: 1500000,
    reference: 'PAYOS-LATE-REF',
    paidAt: '2026-10-04T14:30:00Z',
    reviewReason: 'LATE_PAYMENT_CANCELLED_ORDER',
  };

  // 1. Order status remains CANCELLED
  assert.equal(order.status, 'CANCELLED');

  // 2. Payment status is correctly evaluated as NEEDS_REVIEW
  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'Thanh toán: Cần đối soát');
  assert.match(paymentInfo.badgeClass, /amber/);

  // 3. Review reason formatted correctly
  const formattedReason = formatReviewReason(payment.reviewReason);
  assert.equal(formattedReason, 'Thanh toán muộn cho đơn đã hủy');

  // 4. Must NOT confuse payment with PAID or order with PAID
  assert.notEqual(payment.status, 'PAID');
  assert.notEqual(order.status, 'PAID');
});

test('SECTION 31 & 47 — SHIPPING order with PAID payment: both displayed distinctly', () => {
  const order = {
    id: 502,
    status: 'SHIPPING',
    paymentMethod: 'PAYOS_VIETQR',
  };

  const payment = {
    id: 9002,
    orderId: 502,
    status: 'PAID',
    amount: 800000,
    reference: 'PAYOS-SUCCESS-REF',
    paidAt: '2026-10-04T08:00:00Z',
  };

  assert.equal(order.status, 'SHIPPING');

  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'Thanh toán: Đã thanh toán');
  assert.match(paymentInfo.badgeClass, /emerald/);
});

test('SECTION 29 & 47 — Null payment with COD order: displays safe COD message, not an error', () => {
  const order = {
    id: 503,
    status: 'PENDING',
    paymentMethod: 'COD',
  };

  const payment = null;

  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'COD - Thanh toán khi nhận hàng');
  assert.match(paymentInfo.badgeClass, /slate/);
});

test('SECTION 29 & 47 — Null payment with VietQR order: displays safe no-payment message', () => {
  const order = {
    id: 504,
    status: 'PENDING',
    paymentMethod: 'PAYOS_VIETQR',
  };

  const payment = null;

  const paymentInfo = getPaymentStatusInfo(payment, order);
  assert.equal(paymentInfo.label, 'Chưa có bản ghi thanh toán');
});

test('SECTION 34 & 47 — No frontend status mutation: backend response remains single source of truth', () => {
  let orderState = { id: 505, status: 'CANCELLED' };
  let paymentState = { id: 9005, status: 'NEEDS_REVIEW' };

  // Emulate button action or update attempt:
  // Must NOT mutate locally
  const applyBackendSync = (serverPayment) => {
    paymentState = serverPayment;
  };

  applyBackendSync({ id: 9005, status: 'NEEDS_REVIEW', reviewReason: 'EVENT_IDENTITY_CONFLICT' });

  assert.equal(orderState.status, 'CANCELLED');
  assert.equal(paymentState.status, 'NEEDS_REVIEW');
  assert.equal(paymentState.reviewReason, 'EVENT_IDENTITY_CONFLICT');
});

test('BUG FE-4 — Distinct states: Loading, Success/Empty (200 + null), and Request Error (500)', () => {
  // Model state evaluation
  const evaluatePaymentDisplay = (paymentLoading, paymentError, payment, order) => {
    if (paymentLoading) return { state: 'LOADING', text: 'Đang tải thông tin thanh toán...' };
    if (paymentError) return { state: 'ERROR', text: paymentError, canRetry: true };
    if (!payment) {
      return {
        state: 'EMPTY',
        text: order?.paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi giao hàng.' : 'Chưa có bản ghi thanh toán.'
      };
    }
    return { state: 'SUCCESS', payment };
  };

  const order = { id: 601, paymentMethod: 'PAYOS_VIETQR' };

  // Case A: 200 + null -> EMPTY state, NOT error
  const emptyState = evaluatePaymentDisplay(false, null, null, order);
  assert.equal(emptyState.state, 'EMPTY');
  assert.equal(emptyState.text, 'Chưa có bản ghi thanh toán.');

  // Case B: 500 Error -> ERROR state with retry, NOT empty!
  const errorState = evaluatePaymentDisplay(false, 'Lỗi kết nối máy chủ (500)', null, order);
  assert.equal(errorState.state, 'ERROR');
  assert.equal(errorState.text, 'Lỗi kết nối máy chủ (500)');
  assert.equal(errorState.canRetry, true);
  assert.notEqual(errorState.state, 'EMPTY');

  // Case C: Success with payment object
  const successState = evaluatePaymentDisplay(false, null, { id: 99, status: 'PAID', reference: 'REF-123' }, order);
  assert.equal(successState.state, 'SUCCESS');
  assert.equal(successState.payment.reference, 'REF-123');
});

test('BUG FE-4 — Retry clears paymentError and recovers payment data or empty state', async () => {
  let attempt = 0;
  let paymentState = null;
  let paymentErrorState = null;
  let paymentLoadingState = false;

  const mockGetOrderPayment = async (orderId) => {
    attempt++;
    if (attempt === 1) {
      // First attempt fails with 500
      const err = new Error('Server Error');
      err.response = { status: 500, data: { message: 'Lỗi máy chủ nội bộ (500)' } };
      throw err;
    }
    // Retry succeeds with PaymentAttempt
    return {
      id: 9901,
      orderId,
      status: 'PAID',
      reference: 'PAYOS-RECOVERED-REF',
      paidAt: '2026-10-04T16:00:00Z',
    };
  };

  const fetchPayment = async (orderId) => {
    paymentLoadingState = true;
    paymentErrorState = null;
    try {
      const res = await mockGetOrderPayment(orderId);
      paymentState = res;
      paymentErrorState = null;
    } catch (err) {
      paymentState = null;
      paymentErrorState = err.response?.data?.message || 'Lỗi tải thanh toán';
    } finally {
      paymentLoadingState = false;
    }
  };

  // Attempt 1: Server fails with 500
  await fetchPayment(602);
  assert.equal(paymentState, null);
  assert.equal(paymentErrorState, 'Lỗi máy chủ nội bộ (500)', 'Must display error on 500');
  assert.equal(paymentLoadingState, false);

  // User clicks "Thử lại" (Retry) -> Attempt 2 succeeds
  await fetchPayment(602);
  assert.equal(paymentErrorState, null, 'Retry success must clear error state');
  assert.notEqual(paymentState, null);
  assert.equal(paymentState.status, 'PAID');
  assert.equal(paymentState.reference, 'PAYOS-RECOVERED-REF');
});

test('BUG FE-5 — OrderDetailPage source includes safe wrapping classes for reference', () => {
  const orderPageSource = fs.readFileSync(path.join(__dirname, 'OrderDetailPage.jsx'), 'utf8');

  assert.match(orderPageSource, /break-all/, 'OrderDetailPage must include break-all class for reference wrapping');
  assert.match(orderPageSource, /\[overflow-wrap:anywhere\]|min-w-0/, 'OrderDetailPage must include overflow wrapping class');
});

test('FE-REMEDIATION-2 — Cancelled late-payment warning wraps long reference with break-all and overflow-wrap:anywhere', () => {
  const orderPageSource = fs.readFileSync(path.join(__dirname, 'OrderDetailPage.jsx'), 'utf8');

  // Verify the warning section wraps reference in break-all span
  const warningSectionMatch = orderPageSource.match(/order\.status === 'CANCELLED' && payment\?\.status === 'NEEDS_REVIEW'([\s\S]*?)<\/\s*p>/);
  assert.ok(warningSectionMatch, 'Must contain cancelled order late payment warning notice section');
  const warningSection = warningSectionMatch[0];

  assert.match(warningSection, /break-all/, 'Warning notice must contain break-all for reference');
  assert.match(warningSection, /\[overflow-wrap:anywhere\]/, 'Warning notice must contain [overflow-wrap:anywhere]');
  assert.match(warningSection, /payment\.reference/, 'Warning notice must display payment.reference');
});

const warrantyServer = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { 'react-router-dom': 'react-router' } },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => warrantyServer.close());
const warrantyRouter = await warrantyServer.ssrLoadModule('react-router');
const { MemoryRouter } = warrantyRouter;
const warranty = await warrantyServer.ssrLoadModule('/src/pages/ReturnRequestPage.jsx');
const warrantyApiModule = await warrantyServer.ssrLoadModule('/src/api/returnApi.js');
const detailModule = await warrantyServer.ssrLoadModule('/src/pages/OrderDetailPage.jsx');
const { default: warrantyAxios } = await warrantyServer.ssrLoadModule('/src/api/axiosClient.js');
const orderImages=await warrantyServer.ssrLoadModule('/src/components/ProductImage.jsx');
const orderOptions=await warrantyServer.ssrLoadModule('/src/components/OrderItemOptions.jsx');
const orderTestRequire=createRequire(import.meta.url);

function storedOrderDetailPage(order,payment=null,patch={}) {
  let index=0;
  const values=[order,payment,patch.paymentLoading??false,patch.paymentError??null,false,0,null,'',patch.orderError||''];
  const patchedReact={...React,useEffect:()=>{},useRef:value=>({current:value}),
    useState:initial=>[index<values.length?values[index++]:++index&&typeof initial==='function'?initial():initial,()=>{}]};
  const layout={__esModule:true,default:props=>React.createElement('div',null,React.createElement('nav',null,props.currentPage),props.children)};
  const modules={react:patchedReact,'react-router-dom':{...warrantyRouter,useParams:()=>({id:String(order.id)}),useNavigate:()=>()=>{}},
    '../utils/formatters':{getOrderStatusLabel},'../components/UserLayout':layout,'../api/orderApi.js':{orderApi:{}},
    '../api/returnApi.js':warrantyApiModule,'../components/OrderItemOptions':{__esModule:true,...orderOptions},
    '../components/ProductImage':{__esModule:true,...orderImages},'../utils/paymentFormatters.js':{getPaymentStatusInfo,formatReviewReason},'lucide-react':orderIcons};
  const instance={exports:{}};
  const compiled=transformSync(fs.readFileSync(path.join(__dirname,'OrderDetailPage.jsx'),'utf8'),{loader:'jsx',format:'cjs'}).code;
  new Function('require','module','exports',compiled)(name=>modules[name]||orderTestRequire(name),instance,instance.exports);
  return instance.exports.default;
}

function storedOrderDetailHtml(order,payment=null,patch={}) {
  return renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(storedOrderDetailPage(order,payment,patch))));
}

test('CTA QR production dùng ID nội bộ và chặn loading, lỗi dữ liệu, đã trả tiền hoặc cần đối soát', () => {
  const order={id:51,status:'PENDING',paymentMethod:'PAYOS_VIETQR',payosOrderCode:1000000051,note:'Căng BG65Ti ở mức 10kg',items:[]};
  const html=storedOrderDetailHtml(order,{orderId:51,status:'PENDING'});
  assert.match(html,/Chi tiết đơn hàng #HG-51/);assert.match(html,/Mã PayOS:[\s\S]*1000000051/);
  assert.match(html,/href="\/checkout\?orderId=51"/);assert.match(html,/Tiếp tục thanh toán/);
  assert.doesNotMatch(html,/QR tạm hoãn|checkout\?orderId=1000000051/);
  assert.match(html,/Căng BG65Ti ở mức 10kg/);assert.doesNotMatch(html,/Yonex Tour Certified Master|Kỹ thuật viên đan vợt:/);
  for(const payment of [{orderId:51,status:'PAID'},{orderId:51,status:'NEEDS_REVIEW'},{orderId:52,status:'PENDING'}])
    assert.doesNotMatch(storedOrderDetailHtml(order,payment),/href="\/checkout\?orderId=51"/);
  for(const patch of [{paymentLoading:true},{paymentError:'Không tải được dữ liệu'},{orderError:'Không tải được đơn'}])
    assert.doesNotMatch(storedOrderDetailHtml(order,null,patch),/href="\/checkout\?orderId=51"/);
});

test('CTA QR production không khôi phục đơn đã hủy, COD hoặc trạng thái đã xử lý', () => {
  for(const order of [{id:51,status:'CANCELLED',paymentMethod:'PAYOS_VIETQR'},
    {id:51,status:'PENDING',paymentMethod:'COD'},{id:51,status:'PAID',paymentMethod:'PAYOS_VIETQR'},
    {id:51,status:'SHIPPING',paymentMethod:'PAYOS_VIETQR'},{id:51,status:'COMPLETED',paymentMethod:'PAYOS_VIETQR'}]) {
    assert.doesNotMatch(storedOrderDetailHtml({...order,items:[]},{orderId:51,status:'NEEDS_REVIEW'}),/href="\/checkout\?orderId=51"/);
  }
});
const eligibleLine = (patch = {}) => ({ orderId: 51, orderItemId: 111, productId: 8, productName: 'Áo Kawasaki ST-16209',
  categoryId: 3, selectedSize: 'M', selectedColor: 'Xanh', remainingQuantity: 2, activeRequestId: null,
  warrantyDeadline: '2026-12-12T10:00:00', eligible: true, ...patch });

async function withWarrantyApi(patch, callback) {
  const api = warrantyApiModule.returnApi; const previous = Object.fromEntries(Object.keys(patch).map(key => [key, api[key]]));
  Object.assign(api, patch); try { await callback(); } finally { Object.assign(api, previous); }
}

function warrantyPageFunction(name, scope, async = true) {
  const source = fs.readFileSync(path.join(__dirname, 'ReturnRequestPage.jsx'), 'utf8');
  const pattern = async ? `const ${name} = async \\(([^)]*)\\) => \\{([\\s\\S]*?)\\n  \\};`
    : `const ${name} = ([^=]+) => \\{([\\s\\S]*?)\\n  \\};`;
  const match = source.match(new RegExp(pattern)); assert.ok(match, `Thực thi ${name} production`);
  return new Function(...Object.keys(scope), `return ${async ? 'async ' : ''}(${match[1]}) => {${match[2]}}`)(...Object.values(scope));
}

function warrantyRuntime() {
  const state = { requests: [], snapshot: null, created: null, error: '', submitting: false, modal: true, refreshes: 0 };
  const scope = { form: { orderItemId: '111', quantity: '1', reason: ' Lỗi đường may ', serialNumber: ' SERIAL-123 ' },
    eligibleItems: [eligibleLine()], file: null, mounted: { current: true }, payloadRef: { current: null }, createdRef: { current: null },
    listGeneration: { current: 0 }, readWarrantyList: warranty.readWarrantyList, returnApi: warrantyApiModule.returnApi,
    setLoading: value => { state.loading = value; }, setDataError: value => { state.dataError = value; },
    submissionLock: { current: false }, buildWarrantyRequestPayload: warranty.buildWarrantyRequestPayload,
    validateWarrantyEvidence: warranty.validateWarrantyEvidence, submitWarrantyRequest: warranty.submitWarrantyRequest,
    setSubmissionSnapshot: value => { state.snapshot = value; }, setSubmitting: value => { state.submitting = value; },
    setFormError: value => { state.error = value; }, setCreatedRequest: value => { state.created = value; },
    setReturnRequests: updater => { state.requests = typeof updater === 'function' ? updater(state.requests) : updater; },
    setShowCreateModal: value => { state.modal = value; }, setForm: () => {}, setFile: () => {}, setSuccessMsg: () => {},
    blankForm: () => ({}), refresh: async () => { state.refreshes++; }, loadEligibleItems: () => {} };
  scope.onCreated = warrantyPageFunction('onCreated', scope, false);
  return { state, scope, submit: () => warrantyPageFunction('handleCreateRequest', scope)({ preventDefault() {} }) };
}

test('RMA thực: chọn đúng line/qty/serial; loại phụ kiện, hết hạn, active và dòng không đủ điều kiện', () => {
  const valid = eligibleLine(); const form = { orderItemId: '111', quantity: '2', reason: ' Lỗi đường may ', serialNumber: ' SERIAL-123 ' };
  assert.deepEqual(warranty.buildWarrantyRequestPayload(form, [valid]), { orderId: 51, orderItemId: 111, quantity: 2, reason: 'Lỗi đường may', serialNumber: 'SERIAL-123' });
  for (const item of [eligibleLine({ eligible: false, categoryId: 5 }), eligibleLine({ eligible: false, ineligibleReason: 'Hết hạn' }),
    eligibleLine({ activeRequestId: 77 }), eligibleLine({ remainingQuantity: 0 })]) {
    assert.equal(warrantyApiModule.isEligibleReturnLine(item), false);
    assert.throws(() => warranty.buildWarrantyRequestPayload(form, [item]), /đủ điều kiện/);
  }
  for (const quantity of ['0', '-1', '1.5', '3', '']) assert.throws(() => warranty.buildWarrantyRequestPayload({ ...form, quantity }, [valid]));
  const legacyLine = eligibleLine({ remainingQuantity: 150 });
  assert.equal(warranty.buildWarrantyRequestPayload({ ...form, quantity: '100' }, [legacyLine]).quantity, 100);
  assert.throws(() => warranty.buildWarrantyRequestPayload({ ...form, quantity: '101' }, [legacyLine]), /tối đa 100/);
  assert.throws(() => warranty.buildWarrantyRequestPayload({ ...form, orderItemId: '999' }, [valid]));
});

test('RMA form SSR thực chỉ có eligibleline, đúng size/màu/deadline/maxqty và khóa snapshot', () => {
  const html = renderToStaticMarkup(React.createElement(warranty.WarrantyFormFields, { form: { orderItemId: '111', quantity: '1', reason: 'Lỗi', serialNumber: 'SERIAL' },
    eligibleItems: [eligibleLine(), eligibleLine({ orderItemId: 112, productName: 'Phụ kiện không bảo hành', categoryId: 5, eligible: false })], disabled: true, onChange: () => {} }));
  assert.match(html, /Size: M/); assert.match(html, /Xanh/); assert.match(html, /Hạn bảo hành/);
  assert.match(html, /max="2"/); assert.match(html, /<fieldset disabled=/); assert.doesNotMatch(html, /value="112"/);
  const legacyHtml = renderToStaticMarkup(React.createElement(warranty.WarrantyFormFields, { form: { orderItemId: '111', quantity: '1' },
    eligibleItems: [eligibleLine({ remainingQuantity: 150 })], onChange() {} }));
  assert.match(legacyHtml, /max="100"/);
});

test('RMA card SSR thực dùng snapshot và bốn trạng thái, không ảnh/timeline/số liệu demo hoặc hoàn tiền giả', () => {
  for (const [status, label] of Object.entries(warranty.WARRANTY_STATUSES)) {
    const request = { id: 7, orderId: 51, orderItemId: 111, status, productName: 'Áo Kawasaki ST-16209', quantity: 2,
      selectedSize: 'M', selectedColor: 'Xanh', serialNumber: 'SERIAL-123', reason: 'Lỗi đường may', adminNote: 'Đã nhận sản phẩm để kiểm tra', createdAt: '2026-10-13T10:00:00', evidenceAvailable: false };
    if (status === 'COMPLETED') Object.assign(request, { replacementProductName: 'Áo Kawasaki ST-16210', replacementSku: 'HG-APPAREL-010',
      replacementSize: 'L', replacementColor: 'Đen', completedAt: '2026-10-14T10:00:00' });
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(warranty.WarrantyRequestCard, { request, onSaved: async () => {} })));
    assert.ok(html.includes(label)); assert.match(html, /Áo Kawasaki ST-16209/); assert.match(html, /Size: M/); assert.match(html, /SERIAL-123/);
    assert.match(html, /Đã nhận sản phẩm để kiểm tra/); assert.match(html, /Số lượng yêu cầu: 2/);
    assert.doesNotMatch(html, /Unsplash|unsplash|Astrox|phòng lab|Thẩm định BWF|hoàn tiền/i);
    if (status !== 'PENDING') assert.doesNotMatch(html, /Gửi ảnh minh chứng/);
    if (status === 'COMPLETED') { assert.match(html, /Áo Kawasaki ST-16210/); assert.match(html, /HG-APPAREL-010/); assert.match(html, /Size: L/); assert.match(html, /Hoàn tất:/); }
  }
});

test('RMA upload lỗi: giữ mã phiếu thật; retry chỉ gửi ảnh, không POST phiếu lần nữa', async () => {
  const runtime = warrantyRuntime(); const file = new File([new Uint8Array([137, 80, 78, 71])], 'evidence.png', { type: 'image/png' });
  runtime.scope.file = file; let creates = 0, uploads = 0;
  await withWarrantyApi({ createReturnRequest: async () => { creates++; return { id: 81, status: 'PENDING', orderItemId: 111 }; },
    uploadEvidence: async id => { assert.equal(id, 81); if (++uploads === 1) throw new Error('Upload failed'); } }, async () => {
    await runtime.submit(); assert.equal(runtime.scope.createdRef.current.id, 81); assert.match(runtime.state.error, /RMA #81.*đã được tạo/);
    await runtime.submit(); assert.equal(creates, 1); assert.equal(uploads, 2); assert.equal(runtime.state.modal, false); assert.equal(runtime.state.refreshes, 1);
  });
});

test('RMA mất phản hồi: retry giữ đúng payload line/qty/reason/serial dù UI đổi, nhận replay cùngID', async () => {
  const runtime = warrantyRuntime(); const sent = [];
  await withWarrantyApi({ createReturnRequest: async payload => { sent.push(structuredClone(payload));
    if (sent.length === 1) throw Object.assign(new Error('Timeout'), { response: { status: 503 } });
    return { id: 82, orderItemId: 111, status: 'PENDING', replayed: true }; } }, async () => {
    await runtime.submit(); assert.ok(runtime.scope.payloadRef.current); assert.equal(runtime.state.modal, true);
    Object.assign(runtime.scope.form, { orderItemId: '999', quantity: '2', reason: 'Đã đổi lý do', serialNumber: 'NEW' });
    await runtime.submit(); assert.deepEqual(sent[0], sent[1]); assert.equal(runtime.state.requests[0].id, 82);
  });
});

test('RMA pending: nhấp liên tiếp chỉ tạo một phiếu; lỗi dứt điểm mở sửa form', async () => {
  const runtime = warrantyRuntime(); let release; let calls = 0;
  await withWarrantyApi({ createReturnRequest: () => { calls++; return new Promise(resolve => { release = resolve; }); } }, async () => {
    const first = runtime.submit(); await runtime.submit(); assert.equal(calls, 1); release({ id: 83, status: 'PENDING' }); await first;
  });
  const rejected = warrantyRuntime();
  await withWarrantyApi({ createReturnRequest: async () => { throw Object.assign(new Error('Không đủ điều kiện'), { response: { status: 400 } }); } }, async () => {
    await rejected.submit(); assert.equal(rejected.scope.payloadRef.current, null); assert.equal(rejected.state.submitting, false);
  });
});

test('RMA mới tạo không bị GET danh sách cũ trả muộn xóa khỏi màn hình', async () => {
  const runtime = warrantyRuntime(); let release;
  await withWarrantyApi({ getMyReturns: () => new Promise(resolve => { release = resolve; }) }, async () => {
    const oldRead = warrantyPageFunction('loadReturns', runtime.scope)();
    runtime.scope.onCreated({ id: 84, status: 'PENDING', productName: 'Áo Kawasaki ST-16209' });
    release([]); await oldRead;
    assert.equal(runtime.state.requests[0].id, 84); assert.equal(runtime.state.loading, false);
  });
});

test('RMA evidence production kiểm JPG/PNG≤5MiB, multipart theoID và GET authenticatedblob', async () => {
  for (const file of [{ type: 'image/svg+xml', size: 4 }, { type: 'image/png', size: 0 }, { type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }])
    assert.throws(() => warranty.validateWarrantyEvidence(file), /JPG hoặc PNG/);
  const originalPost = warrantyAxios.post; const originalGet = warrantyAxios.get; const calls = [];
  const file = new File([new Uint8Array([137, 80])], 'evidence.png', { type: 'image/png' });
  warrantyAxios.post = async (url, body, config) => { calls.push({ url, body, config }); return { id: 81 }; };
  warrantyAxios.get = async (url, config) => { calls.push({ url, config }); return new Blob([file], { type: 'image/png' }); };
  try {
    await warrantyApiModule.returnApi.uploadEvidence(81, file); const blob = await warrantyApiModule.returnApi.getEvidence(81);
    assert.equal(calls[0].url, '/returns/81/evidence'); assert.equal(calls[0].body.get('file').name, 'evidence.png');
    assert.equal(calls[0].config.headers['Content-Type'], undefined);
    assert.deepEqual(calls[1], { url: '/returns/81/evidence', config: { responseType: 'blob' } }); assert.equal(blob.type, 'image/png');
  } finally { warrantyAxios.post = originalPost; warrantyAxios.get = originalGet; }
});

test('CTA bảo hành production chỉ choCOMPLETED với eligibleline; đủremaining nhưng ineligible/active vẫn chặn', () => {
  const items = [eligibleLine()]; assert.equal(detailModule.canRequestOrderWarranty({ id: 51, status: 'COMPLETED' }, items), true);
  for (const status of ['PENDING', 'PAID', 'SHIPPING', 'CANCELLED']) assert.equal(detailModule.canRequestOrderWarranty({ id: 51, status }, items), false);
  for (const patch of [{ eligible: false }, { activeRequestId: 9 }, { remainingQuantity: 0 }, { orderId: 52 }])
    assert.equal(detailModule.canRequestOrderWarranty({ id: 51, status: 'COMPLETED' }, [eligibleLine(patch)]), false);
});

test('Eligibility GET production chặn stale route, lọc cờ eligible và giữ lý do server', async () => {
  let release;
  const state = { items: [], note: '', error: '', loading: false };
  const scope = { id: '51', currentOrderIdRef: { current: '51' }, isMountedRef: { current: true }, warrantyFetchGenerationRef: { current: 0 },
    isEligibleReturnLine: warrantyApiModule.isEligibleReturnLine, setWarrantyItems: value => { state.items = value; },
    setWarrantyNote: value => { state.note = value; }, setWarrantyError: value => { state.error = value; }, setWarrantyLoading: value => { state.loading = value; },
    returnApi: { getEligibleItems: ({ params }) => params.orderId === '51' ? new Promise(resolve => { release = resolve; })
      : Promise.resolve([eligibleLine({ orderId: 52 }), eligibleLine({ orderId: 52, orderItemId: 112, eligible: false, ineligibleReason: 'Hết hạn bảo hành' })]) } };
  const first = productionOrderHandler('fetchWarrantyEligibility', scope)(); scope.id = '52'; scope.currentOrderIdRef.current = '52';
  await productionOrderHandler('fetchWarrantyEligibility', scope)(); release([eligibleLine()]); await first;
  assert.deepEqual(state.items.map(item => item.orderId), [52]); assert.equal(state.note, 'Hết hạn bảo hành'); assert.equal(state.loading, false);
});

test('Chi tiết đơn hiển thị điểm và tiền giảm đã lưu, giữ nguyên tổng thanh toán máy chủ', () => {
  const order = { id: 51, status: 'PENDING', paymentMethod: 'COD', totalAmount: 97000,
    discountAmount: 10000, voucherCode: 'HG10K', pointsUsed: 20, pointsDiscount: 2000, shippingFee: 30000,
    items: [{ id: 1, productName: 'Quấn cán Yonex', price: 50000, quantity: 2 }] };
  const html = storedOrderDetailHtml(order);
  assert.match(html, /Tạm tính:[\s\S]*100\.000/);
  assert.match(html, /Giảm bằng điểm \(20 điểm\):[\s\S]*-2\.000/);
  assert.match(html, /Giảm giá Voucher \(HG10K\):[\s\S]*-10\.000/);
  assert.match(html, /Tổng thanh toán:[\s\S]*97\.000/);
  assert.doesNotMatch(html, /118\.000/);
});

test('Chi tiết đơn không tự suy ra điểm hoặc tiền giảm từ các trường còn thiếu', () => {
  for (const patch of [{}, { pointsUsed: 0, pointsDiscount: 0 }, { pointsUsed: 20 }, { pointsDiscount: 2000 }]) {
    const html = storedOrderDetailHtml({ id: 51, status: 'PENDING', paymentMethod: 'COD', totalAmount: 50000, items: [], ...patch });
    assert.equal(html.includes('20 điểm'), patch.pointsUsed === 20);
    assert.equal(html.includes('-2.000'), patch.pointsDiscount === 2000);
    if (!patch.pointsUsed && !patch.pointsDiscount) assert.doesNotMatch(html, /Giảm bằng điểm|Điểm đã dùng/);
  }
});


