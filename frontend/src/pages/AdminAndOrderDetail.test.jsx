import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../App.jsx';
import AdminPaymentsPage from './AdminPaymentsPage.jsx';
import OrderDetailPage from './OrderDetailPage.jsx';
import AdminProductsPage from './AdminProductsPage.jsx';
import AdminOrdersPage from './AdminOrdersPage.jsx';
import { adminApi } from '../api/adminApi.js';
import { orderApi } from '../api/orderApi.js';
import { productApi } from '../api/productApi.js';
import { authApi } from '../api/authApi.js';
import { getStoredReconciliationIntent } from '../utils/idempotency.js';
import { AuthProvider } from '../context/AuthContext';

const wait = (ms = 30) => new Promise((resolve) => setTimeout(resolve, Math.max(ms, 20)));

const waitFor = async (predicate, timeoutMs = 4000, intervalMs = 25) => {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = predicate();
      if (res) return res;
    } catch (e) {
      lastError = e;
    }
    await wait(intervalMs);
  }
  const lastRes = (() => {
    try {
      return predicate();
    } catch (e) {
      lastError = e;
      return null;
    }
  })();
  if (lastRes) return lastRes;
  throw lastError || new Error(`Timeout after ${timeoutMs}ms waiting for condition`);
};

export default function RealAdminAndOrderTestApp() {
  const [logs, setLogs] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [activeTest, setActiveTest] = useState('');

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${msg}`]);
  };

  const reportResult = (name, status, details = '') => {
    setTestResults((prev) => [...prev, { name, status, details }]);
  };

  useEffect(() => {
    let unmounted = false;

    const runAllTests = async () => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, fullName: 'Admin Tester', role: 'ROLE_ADMIN' }));
      const initialSearch = window.location.search;
      const initialParams = new URLSearchParams(initialSearch);
      const initialReceiverPort = initialParams.get('port') || '5182';
      const container = document.getElementById('test-mount-point');
      const results = [];

      const record = (name, status, details = '') => {
        results.push({ name, status, details });
        reportResult(name, status, details);
      };

      try {
        // =========================================================================
        // TEST 1 — Real Double Click Reconcile Guard (BUG FE-1)
        // =========================================================================
        setActiveTest('TEST 1: Real Double Click Reconcile Guard');
        addLog('Bắt đầu TEST 1: Double click reconcile button trên mounted AdminPaymentsPage');

        let postCount = 0;
        let reconcileDeferredResolve = null;

        adminApi.getAllPayments = async () => [
          {
            id: 101,
            orderId: 201,
            orderCode: 999101,
            provider: 'PAYOS',
            amount: 500000,
            status: 'NEEDS_REVIEW',
            reference: 'OLD-REF-101',
            paidAt: null,
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: 'AMOUNT_MISMATCH',
            customerName: 'Nguyễn Văn A',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];

        adminApi.reconcilePayment = async (paymentId, body, key) => {
          postCount++;
          return new Promise((resolve) => {
            reconcileDeferredResolve = () =>
              resolve({
                _httpStatus: 200,
                id: paymentId,
                status: 'PAID',
                reference: 'RECONCILED-REF-101',
                paidAt: '2026-10-04T10:30:00Z',
                reviewReason: null
              });
          });
        };

        const root1 = createRoot(container);
        root1.render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/admin/payments']}>
              <AdminPaymentsPage />
            </MemoryRouter>
          </AuthProvider>
        );

        // Deterministic wait for table to render and find "Đối soát" button
        const reconcileBtn = await waitFor(() => {
          return Array.from(container.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.includes('Đối soát')
          );
        }, 4000);

        reconcileBtn.click();

        // Deterministic wait for modal textarea
        const textarea = await waitFor(() => container.querySelector('textarea#reconcile-reason-input'), 3000);

        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeTextareaValueSetter.call(textarea, 'Đã kiểm tra sao kê ngân hàng');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        const confirmBtn = await waitFor(() => {
          return Array.from(container.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.includes('Xác nhận đối soát')
          );
        }, 3000);

        // Trigger two immediate clicks in the same turn
        confirmBtn.click();
        confirmBtn.click();

        // Wait a short tick while POST is pending
        await wait(80);

        if (postCount !== 1) {
          throw new Error(`Double click guard thất bại: postCount = ${postCount} (mong đợi 1)`);
        }

        if (reconcileDeferredResolve) reconcileDeferredResolve();
        await waitFor(() => !container.querySelector('textarea#reconcile-reason-input'), 3000);

        root1.unmount();
        container.innerHTML = '';
        record('TEST 1 — Real Double Click Reconcile Guard', 'PASS', 'reconcileInFlightRef blocked rapid double click; POST count = 1');

        // =========================================================================
        // TEST 2 — Explicit null reference merges correctly and renders — (BUG FE-2)
        // =========================================================================
        setActiveTest('TEST 2: Explicit null reference merges correctly');
        addLog('Bắt đầu TEST 2: Reconcile trả về reference = null');

        adminApi.getAllPayments = async () => [
          {
            id: 102,
            orderId: 202,
            orderCode: 999102,
            provider: 'PAYOS',
            amount: 750000,
            status: 'NEEDS_REVIEW',
            reference: 'FIRST',
            paidAt: null,
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: 'AMOUNT_MISMATCH',
            customerName: 'Trần B',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];

        adminApi.reconcilePayment = async (paymentId, body, key) => {
          return {
            _httpStatus: 200,
            id: paymentId,
            status: 'PAID',
            reference: null,
            paidAt: '2026-10-04T11:00:00Z',
            reviewReason: null
          };
        };

        const root2 = createRoot(container);
        root2.render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/admin/payments']}>
              <AdminPaymentsPage />
            </MemoryRouter>
          </AuthProvider>
        );

        const recBtn2 = await waitFor(() => {
          return Array.from(container.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.includes('Đối soát')
          );
        }, 4000);
        recBtn2.click();

        const textarea2 = await waitFor(() => container.querySelector('textarea#reconcile-reason-input'), 3000);
        const nativeTextareaValueSetter2 = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeTextareaValueSetter2.call(textarea2, 'Khớp nhiều giao dịch sao kê');
        textarea2.dispatchEvent(new Event('input', { bubbles: true }));

        const confirmBtn2 = await waitFor(() => {
          return Array.from(container.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.includes('Xác nhận đối soát')
          );
        }, 3000);
        confirmBtn2.click();

        await waitFor(() => {
          const tableText = container.innerText || '';
          if (tableText.includes('FIRST')) {
            throw new Error('Lỗi: reference "FIRST" cũ vẫn hiển thị sau khi backend trả reference: null!');
          }
          return tableText.includes('Ref: —');
        }, 4000);

        root2.unmount();
        container.innerHTML = '';
        record('TEST 2 — Explicit null reference renders —', 'PASS', 'Stale reference "FIRST" cleared; UI rendered "Ref: —"');

        // =========================================================================
        // TEST 3 — Reconcile 202 updates body data and retains retry key (BUG FE-3)
        // =========================================================================
        setActiveTest('TEST 3: Reconcile 202 updates body data and retains retry key');
        addLog('Bắt đầu TEST 3: Reconcile trả về 202 với reviewReason mới');

        let callCount202 = 0;
        adminApi.getAllPayments = async () => [
          {
            id: 103,
            orderId: 203,
            orderCode: 999103,
            provider: 'PAYOS',
            amount: 300000,
            status: 'NEEDS_REVIEW',
            reference: 'OLD-REF-103',
            paidAt: null,
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: 'AMOUNT_MISMATCH',
            customerName: 'Lê C',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];

        adminApi.reconcilePayment = async (paymentId, body, key) => {
          callCount202++;
          return {
            _httpStatus: 202,
            id: paymentId,
            status: 'NEEDS_REVIEW',
            reviewReason: 'PAYMENT_NOT_CONFIRMED',
            reference: null
          };
        };

        const root3 = createRoot(container);
        root3.render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/admin/payments']}>
              <AdminPaymentsPage />
            </MemoryRouter>
          </AuthProvider>
        );

        const recBtn3 = await waitFor(() => {
          return Array.from(container.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.includes('Đối soát')
          );
        }, 4000);
        recBtn3.click();

        const textarea3 = await waitFor(() => container.querySelector('textarea#reconcile-reason-input'), 3000);
        const nativeTextareaValueSetter3 = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeTextareaValueSetter3.call(textarea3, 'Chờ cổng phản hồi');
        textarea3.dispatchEvent(new Event('input', { bubbles: true }));

        const confirmBtn3 = await waitFor(() => {
          return Array.from(container.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.includes('Xác nhận đối soát')
          );
        }, 3000);
        confirmBtn3.click();

        await waitFor(() => {
          const domText3 = container.innerText || '';
          return domText3.includes('Chưa xác nhận từ ngân hàng');
        }, 4000);

        const domText3 = container.innerText || '';
        if (domText3.includes('Sai lệch số tiền thanh toán')) {
          throw new Error('Lỗi: Sai lệch số tiền thanh toán cũ vẫn còn hiển thị sau khi nhận 202!');
        }
        if (callCount202 !== 1) {
          throw new Error(`Lỗi: Phát hiện auto POST loop! callCount = ${callCount202}`);
        }
        const retainedIntent = getStoredReconciliationIntent(103);
        if (!retainedIntent || !retainedIntent.key) {
          throw new Error('Lỗi: Khóa đối soát bị xóa sau phản hồi 202!');
        }

        root3.unmount();
        container.innerHTML = '';
        record('TEST 3 — Reconcile 202 updates body data and retains retry key', 'PASS', 'Row updated to PAYMENT_NOT_CONFIRMED, no auto-POST loop, retry key retained');

        // =========================================================================
        // TEST 4 — OrderDetailPage GET payment 200 + null renders Empty State (BUG FE-4)
        // =========================================================================
        setActiveTest('TEST 4: OrderDetailPage GET payment 200 + null');
        addLog('Bắt đầu TEST 4: OrderDetailPage với payment 200 + null');

        orderApi.getOrderById = async (id) => ({
          id: 501,
          status: 'PENDING',
          paymentMethod: 'PAYOS_VIETQR',
          createdAt: '2026-10-04T12:00:00Z',
          items: []
        });

        orderApi.getOrderPayment = async (id) => null;

        const root4 = createRoot(container);
        root4.render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/orders/501']}>
              <Routes>
                <Route path="/orders/:id" element={<OrderDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        );

        await waitFor(() => {
          const domText4 = container.innerText || '';
          return domText4.includes('Chưa có bản ghi thanh toán');
        }, 4000);

        const domText4 = container.innerText || '';
        if (domText4.includes('Không thể tải thông tin thanh toán')) {
          throw new Error('Lỗi: Nhầm lẫn 200 + null thành lỗi yêu cầu (error state)!');
        }

        root4.unmount();
        container.innerHTML = '';
        record('TEST 4 — OrderDetailPage GET payment 200 + null renders Empty State', 'PASS', 'Rendered "Chưa có bản ghi thanh toán" without error alert');

        // =========================================================================
        // TEST 5 — OrderDetailPage GET payment 500 renders Error State with Retry (BUG FE-4)
        // =========================================================================
        setActiveTest('TEST 5: OrderDetailPage GET payment 500 renders Error State');
        addLog('Bắt đầu TEST 5: OrderDetailPage với payment lỗi 500');

        orderApi.getOrderById = async (id) => ({
          id: 502,
          status: 'PENDING',
          paymentMethod: 'PAYOS_VIETQR',
          createdAt: '2026-10-04T12:00:00Z',
          items: []
        });

        orderApi.getOrderPayment = async (id) => {
          const err = new Error('Internal Server Error');
          err.response = { status: 500, data: { message: 'Lỗi kết nối máy chủ thanh toán (500)' } };
          throw err;
        };

        const root5 = createRoot(container);
        root5.render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/orders/502']}>
              <Routes>
                <Route path="/orders/:id" element={<OrderDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        );

        await waitFor(() => {
          const domText5 = container.innerText || '';
          return domText5.includes('Không thể tải thông tin thanh toán') && domText5.includes('Thử lại');
        }, 4000);

        const domText5 = container.innerText || '';
        if (domText5.includes('Chưa có bản ghi thanh toán')) {
          throw new Error('Lỗi: Vẫn hiển thị "Chưa có bản ghi thanh toán" khi server trả lỗi 500!');
        }

        record('TEST 5 — OrderDetailPage GET payment 500 renders Error State with Retry', 'PASS', 'Error state rendered with retry button; did NOT conflate with empty state');

        // =========================================================================
        // TEST 6 — OrderDetailPage Retry after 500 recovers payment (BUG FE-4)
        // =========================================================================
        setActiveTest('TEST 6: OrderDetailPage Retry after 500 recovers payment');
        addLog('Bắt đầu TEST 6: Bấm "Thử lại" và hồi phục dữ liệu thanh toán');

        orderApi.getOrderPayment = async (id) => ({
          id: 9902,
          orderId: id,
          status: 'PAID',
          reference: 'RECOVERED-REF-502',
          paidAt: '2026-10-04T12:10:00Z',
          provider: 'PAYOS'
        });

        const retryBtn = await waitFor(() => {
          return Array.from(container.querySelectorAll('button')).find(
            (b) => b.textContent && b.textContent.includes('Thử lại')
          );
        }, 3000);

        retryBtn.click();

        await waitFor(() => {
          const domText6 = container.innerText || '';
          return !domText6.includes('Không thể tải thông tin thanh toán') && domText6.includes('RECOVERED-REF-502');
        }, 4000);

        root5.unmount();
        container.innerHTML = '';
        record('TEST 6 — OrderDetailPage Retry after 500 recovers payment', 'PASS', 'Error cleared; payment reference RECOVERED-REF-502 rendered successfully');

        // =========================================================================
        // TEST 7 — Responsive 140-char Reference Wrapping Check in Payment Detail (BUG FE-5)
        // =========================================================================
        setActiveTest('TEST 7: Responsive 140-char Reference Wrapping Check');
        addLog('Bắt đầu TEST 7: Kiểm tra reference 140 ký tự tại 360px, 768px, 1440px trong card thanh toán');

        const longRef140 = 'REF-BANK-TXN-1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890';

        orderApi.getOrderById = async (id) => ({
          id: 503,
          status: 'PAID',
          paymentMethod: 'PAYOS_VIETQR',
          createdAt: '2026-10-04T12:00:00Z',
          items: []
        });

        orderApi.getOrderPayment = async (id) => ({
          id: 9903,
          orderId: id,
          status: 'PAID',
          reference: longRef140,
          paidAt: '2026-10-04T12:20:00Z',
          provider: 'PAYOS'
        });

        const root7 = createRoot(container);
        root7.render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/orders/503']}>
              <Routes>
                <Route path="/orders/:id" element={<OrderDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        );

        await waitFor(() => {
          return Array.from(container.querySelectorAll('span')).find(
            (s) => s.textContent && s.textContent.includes(longRef140)
          );
        }, 4000);

        const widthsToCheck = [360, 768, 1440];
        for (const w of widthsToCheck) {
          container.style.width = `${w}px`;
          container.style.maxWidth = `${w}px`;
          await wait(50);

          const refEl = Array.from(container.querySelectorAll('span')).find(
            (s) => s.textContent && s.textContent.includes(longRef140)
          );

          if (!refEl) {
            throw new Error(`Tại ${w}px: Không tìm thấy element chứa toàn bộ 140 ký tự reference!`);
          }

          if (!refEl.textContent.includes(longRef140)) {
            throw new Error(`Tại ${w}px: Reference bị mất chữ hoặc cắt xén!`);
          }

          const computed = window.getComputedStyle(refEl);
          const hasBreakAll = computed.wordBreak === 'break-all' || refEl.className.includes('break-all');
          const hasAnywhere = computed.overflowWrap === 'anywhere' || refEl.className.includes('[overflow-wrap:anywhere]');

          if (!hasBreakAll && !hasAnywhere) {
            throw new Error(`Tại ${w}px: Thiếu CSS class break-all hoặc overflow-wrap:anywhere!`);
          }
        }

        container.style.width = '100%';
        container.style.maxWidth = 'none';
        root7.unmount();
        container.innerHTML = '';
        record('TEST 7 — Responsive 140-char Reference Wrapping Check', 'PASS', 'Reference 140 chars verified at 360px, 768px, 1440px with break-all wrapping');

        // =========================================================================
        // TEST 8 — Cancelled Late-Payment Warning 140-char Reference Wrapping (FE-REMEDIATION-2)
        // =========================================================================
        setActiveTest('TEST 8: Cancelled Late-Payment Warning 140-char Reference Wrapping');
        addLog('Bắt đầu TEST 8: Kiểm tra reference 140 ký tự trong cảnh báo Đơn đã hủy + Cần đối soát tại 360px, 768px, 1440px');

        const cancelledRef140 = 'CANCELLED-BANK-REF-' + '9'.repeat(121); // exactly 140 chars

        orderApi.getOrderById = async (id) => ({
          id: 504,
          status: 'CANCELLED',
          paymentMethod: 'PAYOS_VIETQR',
          createdAt: '2026-10-04T12:00:00Z',
          items: []
        });

        orderApi.getOrderPayment = async (id) => ({
          id: 9904,
          orderId: id,
          status: 'NEEDS_REVIEW',
          reference: cancelledRef140,
          paidAt: '2026-10-04T12:30:00Z',
          provider: 'PAYOS',
          reviewReason: 'LATE_PAYMENT_CANCELLED_ORDER'
        });

        const root8 = createRoot(container);
        root8.render(
          <AuthProvider>
            <MemoryRouter initialEntries={['/orders/504']}>
              <Routes>
                <Route path="/orders/:id" element={<OrderDetailPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        );

        // Wait for page to render cancelled late-payment warning banner div
        const warningBanner = await waitFor(() => {
          return Array.from(container.querySelectorAll('div')).find(
            (d) => d.textContent && d.textContent.includes('Cảnh báo: Đơn hàng đã hủy')
          );
        }, 4000);

        if (!warningBanner) {
          throw new Error('Không tìm thấy cảnh báo thanh toán muộn trong DOM');
        }

        const viewports = [360, 768, 1440];
        for (const w of viewports) {
          container.style.width = `${w}px`;
          container.style.maxWidth = `${w}px`;
          await wait(50);

          // Find the span containing the 140-char reference inside the warning
          const warningRefSpan = Array.from(warningBanner.querySelectorAll('span')).find(
            (s) => s.textContent && s.textContent.includes(cancelledRef140)
          );

          if (!warningRefSpan) {
            throw new Error(`Tại ${w}px: Không tìm thấy span chứa reference 140 ký tự trong cảnh báo!`);
          }

          // Assertion A: Full 140-char reference exists in DOM
          if (!warningRefSpan.textContent.includes(cancelledRef140)) {
            throw new Error(`Tại ${w}px: Reference 140 ký tự trong cảnh báo không đầy đủ!`);
          }

          // Assertion B: No ellipsis or truncation
          const computedSpan = window.getComputedStyle(warningRefSpan);
          if (computedSpan.textOverflow === 'ellipsis') {
            throw new Error(`Tại ${w}px: Reference trong cảnh báo bị ellipsis!`);
          }

          // Assertion C: Warning/reference element fits within container intended width
          const bannerRect = warningBanner.getBoundingClientRect();
          const refRect = warningRefSpan.getBoundingClientRect();

          if (refRect.right > bannerRect.right + 2) {
            throw new Error(`Tại ${w}px: Reference tràn ra ngoài warning banner! ref.right=${refRect.right}, banner.right=${bannerRect.right}`);
          }

          // Assertion D: Document/container not blown out by dynamic reference
          if (container.scrollWidth > w + 4) {
            throw new Error(`Tại ${w}px: Container bị horizontal scroll blowout! scrollWidth=${container.scrollWidth} > viewport=${w}`);
          }

          // Assertion E: Reference wraps onto multiple lines (height > single line height of ~20px)
          if (refRect.height <= 24) {
            throw new Error(`Tại ${w}px: Reference không xuống dòng! ref.height=${refRect.height}px`);
          }

          // Verify CSS wrapping classes
          const hasBreakAll = computedSpan.wordBreak === 'break-all' || warningRefSpan.className.includes('break-all');
          const hasAnywhere = computedSpan.overflowWrap === 'anywhere' || warningRefSpan.className.includes('[overflow-wrap:anywhere]');
          if (!hasBreakAll && !hasAnywhere) {
            throw new Error(`Tại ${w}px: Thiếu CSS class break-all hoặc overflow-wrap:anywhere trong cảnh báo!`);
          }
        }

        container.style.width = '100%';
        container.style.maxWidth = 'none';
        root8.unmount();
        container.innerHTML = '';
        record('TEST 8 — Cancelled Warning 140-char Reference Wrapping Check', 'PASS', '140-char reference wrapped without overflow at 360px, 768px, 1440px in cancelled warning banner');

        // =========================================================================
        // TEST 9 — AdminPayments Responsive Layout (Short Reference) (FE-REMEDIATION-3)
        // =========================================================================
        setActiveTest('TEST 9: AdminPayments Responsive Layout (Short Reference)');
        addLog('Bắt đầu TEST 9: Đo layout containment AdminPaymentsPage với reference ngắn tại 360px, 768px, 1440px');

        const shortRefPayments = [
          {
            id: 201,
            orderId: 301,
            orderCode: 999201,
            provider: 'PAYOS',
            amount: 500000,
            status: 'NEEDS_REVIEW',
            reference: 'SHORT-REF-201',
            paidAt: null,
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: 'AMOUNT_MISMATCH',
            customerName: 'Hoàng Nam',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];

        const viewportsAdmin = [360, 768, 1440];
        for (const w of viewportsAdmin) {
          adminApi.getAllPayments = async () => shortRefPayments;

          const iframe = document.createElement('iframe');
          iframe.style.width = `${w}px`;
          iframe.style.height = '700px';
          iframe.style.border = 'none';
          iframe.style.display = 'block';
          container.appendChild(iframe);

          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;"><div id="iframe-root"></div></body></html>');
          iframeDoc.close();

          document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
            iframeDoc.head.appendChild(styleEl.cloneNode(true));
          });

          const iframeMount = iframeDoc.getElementById('iframe-root');
          const iframeRoot = createRoot(iframeMount);

          iframeRoot.render(
            <AuthProvider>
              <MemoryRouter initialEntries={['/admin/payments']}>
                <AdminPaymentsPage />
              </MemoryRouter>
            </AuthProvider>
          );

          await waitFor(() => {
            return iframeDoc.querySelector('table');
          }, 4000);

          await wait(100);

          const docScrollWidth = iframeDoc.documentElement.scrollWidth;
          if (docScrollWidth > w + 3) {
            throw new Error(`Tại ${w}px: Document bị horizontal blowout! scrollWidth=${docScrollWidth} > viewport=${w}`);
          }

          const tableWrapper = iframeDoc.querySelector('.overflow-x-auto');
          if (!tableWrapper) {
            throw new Error(`Tại ${w}px: Không tìm thấy table scroll wrapper .overflow-x-auto!`);
          }
          const wrapperRect = tableWrapper.getBoundingClientRect();
          if (wrapperRect.right > w + 3) {
            throw new Error(`Tại ${w}px: Table scroll wrapper tràn ra ngoài viewport! wrapper.right=${wrapperRect.right} > viewport=${w}`);
          }

          const tableEl = iframeDoc.querySelector('table');
          if (w < 900) {
            if (tableEl.scrollWidth <= tableWrapper.clientWidth) {
              throw new Error(`Tại ${w}px: Table không cuộn ngang nội bộ! table.scrollWidth=${tableEl.scrollWidth} <= wrapper.clientWidth=${tableWrapper.clientWidth}`);
            }
          }

          const headerCard = iframeDoc.querySelector('h1')?.closest('.rounded-2xl');
          if (headerCard) {
            const hRect = headerCard.getBoundingClientRect();
            if (hRect.right > w + 3) {
              throw new Error(`Tại ${w}px: Header card tràn ra ngoài viewport! right=${hRect.right}`);
            }
          }

          iframeRoot.unmount();
          iframe.remove();
        }

        record('TEST 9 — AdminPayments Responsive Layout (Short Reference)', 'PASS', 'Document width fits 360px, 768px, 1440px; table horizontal scroll contained internally');

        // =========================================================================
        // TEST 10 — AdminPayments Responsive Layout (140-char Reference) (FE-REMEDIATION-3)
        // =========================================================================
        setActiveTest('TEST 10: AdminPayments Responsive Layout (140-char Reference)');
        addLog('Bắt đầu TEST 10: Đo layout containment AdminPaymentsPage với reference 140 ký tự tại 360px, 768px, 1440px');

        const adminLongRef140 = 'ADMIN-BANK-REF-' + '8'.repeat(125); // exactly 140 chars

        const longRefPayments = [
          {
            id: 202,
            orderId: 302,
            orderCode: 999202,
            provider: 'PAYOS',
            amount: 750000,
            status: 'NEEDS_REVIEW',
            reference: adminLongRef140,
            paidAt: null,
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: 'AMOUNT_MISMATCH',
            customerName: 'Trần B',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];

        for (const w of viewportsAdmin) {
          adminApi.getAllPayments = async () => longRefPayments;

          const iframe = document.createElement('iframe');
          iframe.style.width = `${w}px`;
          iframe.style.height = '700px';
          iframe.style.border = 'none';
          iframe.style.display = 'block';
          container.appendChild(iframe);

          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;"><div id="iframe-root"></div></body></html>');
          iframeDoc.close();

          document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
            iframeDoc.head.appendChild(styleEl.cloneNode(true));
          });

          const iframeMount = iframeDoc.getElementById('iframe-root');
          const iframeRoot = createRoot(iframeMount);

          iframeRoot.render(
            <AuthProvider>
              <MemoryRouter initialEntries={['/admin/payments']}>
                <AdminPaymentsPage />
              </MemoryRouter>
            </AuthProvider>
          );

          await waitFor(() => {
            return iframeDoc.querySelector('table');
          }, 4000);

          await wait(100);

          const refCell = Array.from(iframeDoc.querySelectorAll('span')).find(
            (s) => s.textContent && s.textContent.includes(adminLongRef140)
          );
          if (!refCell) {
            throw new Error(`Tại ${w}px: Không tìm thấy cell chứa 140-char reference trong bảng!`);
          }

          const docScrollWidth = iframeDoc.documentElement.scrollWidth;
          if (docScrollWidth > w + 3) {
            throw new Error(`Tại ${w}px: Document bị horizontal blowout do 140-char reference! scrollWidth=${docScrollWidth} > viewport=${w}`);
          }

          const tableWrapper = iframeDoc.querySelector('.overflow-x-auto');
          const wrapperRect = tableWrapper.getBoundingClientRect();
          if (wrapperRect.right > w + 3) {
            throw new Error(`Tại ${w}px: Table scroll wrapper tràn viewport! right=${wrapperRect.right}`);
          }

          iframeRoot.unmount();
          iframe.remove();
        }

        record('TEST 10 — AdminPayments Responsive Layout (140-char Reference)', 'PASS', '140-char reference preserved and table scroll contained at 360px, 768px, 1440px without page blowout');

        // =========================================================================
        // TEST 11 — AdminPayments Header Overlap & Layout Check (FE-REMEDIATION-4)
        // =========================================================================
        setActiveTest('TEST 11: AdminPayments Header Overlap & Layout Check at 360px, 768px, 1440px');
        addLog('Bắt đầu TEST 11: Đo header layout, kiểm tra chồng lấn text/buttons tại 360px, 768px, 1440px');

        const headerTestPayments = [
          {
            id: 203,
            orderId: 303,
            orderCode: 999203,
            provider: 'PAYOS',
            amount: 500000,
            status: 'NEEDS_REVIEW',
            reference: 'SHORT-REF-203',
            paidAt: null,
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: 'AMOUNT_MISMATCH',
            customerName: 'Hoàng Nam',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];

        const headerMetrics = {};
        const viewportsHeader = [360, 768, 1440];

        for (const w of viewportsHeader) {
          adminApi.getAllPayments = async () => headerTestPayments;

          const iframe = document.createElement('iframe');
          iframe.style.width = `${w}px`;
          iframe.style.height = '1100px';
          iframe.style.border = 'none';
          iframe.style.display = 'block';
          container.appendChild(iframe);

          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;"><div id="iframe-root"></div></body></html>');
          iframeDoc.close();

          document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
            iframeDoc.head.appendChild(styleEl.cloneNode(true));
          });

          const iframeMount = iframeDoc.getElementById('iframe-root');
          const iframeRoot = createRoot(iframeMount);

          iframeRoot.render(
            <AuthProvider>
              <MemoryRouter initialEntries={['/admin/payments']}>
                <AdminPaymentsPage />
              </MemoryRouter>
            </AuthProvider>
          );

          await waitFor(() => {
            return iframeDoc.querySelector('table');
          }, 4000);

          await wait(100);

          const docScrollWidth = iframeDoc.documentElement.scrollWidth;
          if (docScrollWidth > w + 3) {
            throw new Error(`Tại ${w}px: Document bị horizontal blowout! scrollWidth=${docScrollWidth} > viewport=${w}`);
          }

          const headerCard = iframeDoc.querySelector('h1')?.closest('.rounded-2xl');
          if (!headerCard) {
            throw new Error(`Tại ${w}px: Không tìm thấy header card!`);
          }

          const titleEl = iframeDoc.querySelector('h1');
          if (!titleEl) {
            throw new Error(`Tại ${w}px: Không tìm thấy h1 title!`);
          }

          const descEl = iframeDoc.querySelector('p.text-xs.text-slate-500');
          if (!descEl) {
            throw new Error(`Tại ${w}px: Không tìm thấy description paragraph!`);
          }

          const buttons = Array.from(headerCard.querySelectorAll('button'));
          if (buttons.length < 2) {
            throw new Error(`Tại ${w}px: Không tìm thấy đủ action buttons trong header!`);
          }
          const actionsContainer = buttons[0].parentElement;

          const headerRect = headerCard.getBoundingClientRect();
          const titleRect = titleEl.getBoundingClientRect();
          const descRect = descEl.getBoundingClientRect();
          const actionsRect = actionsContainer.getBoundingClientRect();

          // 1. Title width test
          if (titleRect.width <= 0) {
            throw new Error(`Tại ${w}px: Title width bị sập về <= 0! width=${titleRect.width}`);
          }
          if (w === 768 && titleRect.width < 150) {
            throw new Error(`Tại 768px: Title width quá nhỏ không thể hiển thị tiêu đề hợp lý! width=${titleRect.width}`);
          }

          // 2. Header height test
          if (headerRect.height > 400) {
            throw new Error(`Tại ${w}px: Header height bất thường (>400px)! height=${headerRect.height}`);
          }

          // 3. No intersection test between title/desc and buttons
          let hasOverlap = false;
          let overlapDetail = '';
          for (const btn of buttons) {
            const btnRect = btn.getBoundingClientRect();
            // Check intersection between titleRect and btnRect
            const intersectsTitle = !(
              titleRect.right <= btnRect.left ||
              titleRect.left >= btnRect.right ||
              titleRect.bottom <= btnRect.top ||
              titleRect.top >= btnRect.bottom
            );
            if (intersectsTitle) {
              hasOverlap = true;
              overlapDetail = `Title intersects button "${btn.textContent.trim()}": titleRect=[${titleRect.left},${titleRect.top},${titleRect.right},${titleRect.bottom}] vs btnRect=[${btnRect.left},${btnRect.top},${btnRect.right},${btnRect.bottom}]`;
              break;
            }

            // Check intersection between descRect and btnRect
            const intersectsDesc = !(
              descRect.right <= btnRect.left ||
              descRect.left >= btnRect.right ||
              descRect.bottom <= btnRect.top ||
              descRect.top >= btnRect.bottom
            );
            if (intersectsDesc) {
              hasOverlap = true;
              overlapDetail = `Description intersects button "${btn.textContent.trim()}": descRect=[${descRect.left},${descRect.top},${descRect.right},${descRect.bottom}] vs btnRect=[${btnRect.left},${btnRect.top},${btnRect.right},${btnRect.bottom}]`;
              break;
            }
          }

          if (hasOverlap) {
            throw new Error(`Tại ${w}px: Phát hiện chồng lấn header controls! ${overlapDetail}`);
          }

          // 4. Check table containment
          const tableWrapper = iframeDoc.querySelector('.overflow-x-auto');
          if (tableWrapper) {
            const wrapperRect = tableWrapper.getBoundingClientRect();
            if (wrapperRect.right > w + 3) {
              throw new Error(`Tại ${w}px: Table scroll wrapper tràn viewport! right=${wrapperRect.right}`);
            }
          }

          headerMetrics[w] = {
            viewport: w,
            documentScrollWidth: docScrollWidth,
            headerWidth: Math.round(headerRect.width * 100) / 100,
            titleWidth: Math.round(titleRect.width * 100) / 100,
            actionsWidth: Math.round(actionsRect.width * 100) / 100,
            titleRect: { left: Math.round(titleRect.left), top: Math.round(titleRect.top), right: Math.round(titleRect.right), bottom: Math.round(titleRect.bottom) },
            actionsRect: { left: Math.round(actionsRect.left), top: Math.round(actionsRect.top), right: Math.round(actionsRect.right), bottom: Math.round(actionsRect.bottom) },
            headerHeight: Math.round(headerRect.height * 100) / 100,
            overlap: 'NO'
          };

          addLog(`Header Matrix ${w}px: doc=${docScrollWidth}, headerW=${headerMetrics[w].headerWidth}, titleW=${headerMetrics[w].titleWidth}, actionsW=${headerMetrics[w].actionsWidth}, headerH=${headerMetrics[w].headerHeight}, overlap=NO`);

          iframeRoot.unmount();
          iframe.remove();
        }

        record(
          'TEST 11 — AdminPayments Header Overlap & Layout Check',
          'PASS',
          `Matrix: ` + JSON.stringify(headerMetrics)
        );

        // =========================================================================
        // TEST 12 — AdminPayments Filter Overlap & Hit Test Check (FE-REMEDIATION-5)
        // =========================================================================
        setActiveTest('TEST 12: AdminPayments Filter Overlap & Hit Test Check at 360px, 768px, 1440px');
        addLog('Bắt đầu TEST 12: Đo filter layout, kiểm tra không chồng lấn và hit-test dropdowns tại 360px, 768px, 1440px');

        const filterTestPayments = [
          {
            id: 204,
            orderId: 304,
            orderCode: 999204,
            provider: 'PAYOS',
            amount: 500000,
            status: 'NEEDS_REVIEW',
            reference: 'SHORT-REF-204',
            paidAt: null,
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: 'AMOUNT_MISMATCH',
            customerName: 'Hoàng Nam',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];

        const filterMetrics = {};
        const viewportsFilter = [360, 768, 1440];

        for (const w of viewportsFilter) {
          adminApi.getAllPayments = async () => filterTestPayments;

          const iframe = document.createElement('iframe');
          iframe.style.width = `${w}px`;
          iframe.style.height = '1100px';
          iframe.style.border = 'none';
          iframe.style.display = 'block';
          container.appendChild(iframe);

          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;"><div id="iframe-root"></div></body></html>');
          iframeDoc.close();

          document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
            iframeDoc.head.appendChild(styleEl.cloneNode(true));
          });

          const iframeMount = iframeDoc.getElementById('iframe-root');
          const iframeRoot = createRoot(iframeMount);

          iframeRoot.render(
            <AuthProvider>
              <MemoryRouter initialEntries={['/admin/payments']}>
                <AdminPaymentsPage />
              </MemoryRouter>
            </AuthProvider>
          );

          await waitFor(() => {
            return iframeDoc.querySelector('table');
          }, 4000);

          await wait(100);

          const docScrollWidth = iframeDoc.documentElement.scrollWidth;
          if (docScrollWidth > w + 3) {
            throw new Error(`Tại ${w}px: Document bị horizontal blowout! scrollWidth=${docScrollWidth} > viewport=${w}`);
          }

          const searchInput = iframeDoc.querySelector('input[placeholder*="Tìm theo mã GD"]');
          if (!searchInput) {
            throw new Error(`Tại ${w}px: Không tìm thấy search input!`);
          }
          const searchContainer = searchInput.parentElement;
          const filterCard = searchContainer.closest('.rounded-2xl');
          if (!filterCard) {
            throw new Error(`Tại ${w}px: Không tìm thấy filter card!`);
          }

          const selects = Array.from(filterCard.querySelectorAll('select'));
          if (selects.length < 2) {
            throw new Error(`Tại ${w}px: Không tìm thấy đủ 2 select dropdowns!`);
          }
          const methodSelect = selects.find((s) => s.querySelector('option[value="VIETQR"]')) || selects[0];
          const statusSelect = selects.find((s) => s.querySelector('option[value="PAID"]')) || selects[1];

          const filterCardRect = filterCard.getBoundingClientRect();
          const searchContainerRect = searchContainer.getBoundingClientRect();
          const searchInputRect = searchInput.getBoundingClientRect();
          const methodSelectRect = methodSelect.getBoundingClientRect();
          const statusSelectRect = statusSelect.getBoundingClientRect();

          // 1. Usable positive width checks
          if (searchContainerRect.width <= 0) {
            throw new Error(`Tại ${w}px: searchContainer width <= 0! width=${searchContainerRect.width}`);
          }
          if (searchInputRect.width <= 0) {
            throw new Error(`Tại ${w}px: searchInput width <= 0! width=${searchInputRect.width}`);
          }
          if (w === 768 && searchContainerRect.width < 150) {
            throw new Error(`Tại 768px: searchContainer width quá nhỏ không thể nhập liệu! width=${searchContainerRect.width}`);
          }

          // 2. Selects visibility
          if (methodSelectRect.width <= 0 || statusSelectRect.width <= 0) {
            throw new Error(`Tại ${w}px: Dropdown width <= 0! method=${methodSelectRect.width}, status=${statusSelectRect.width}`);
          }

          // 3. Intersection checks
          const overlapsMethod = !(
            searchInputRect.right <= methodSelectRect.left ||
            searchInputRect.left >= methodSelectRect.right ||
            searchInputRect.bottom <= methodSelectRect.top ||
            searchInputRect.top >= methodSelectRect.bottom
          );
          if (overlapsMethod) {
            throw new Error(`Tại ${w}px: Search input chồng lấn Payment Method dropdown! searchRect=[${searchInputRect.left},${searchInputRect.top},${searchInputRect.right},${searchInputRect.bottom}] vs methodRect=[${methodSelectRect.left},${methodSelectRect.top},${methodSelectRect.right},${methodSelectRect.bottom}]`);
          }

          const overlapsStatus = !(
            searchInputRect.right <= statusSelectRect.left ||
            searchInputRect.left >= statusSelectRect.right ||
            searchInputRect.bottom <= statusSelectRect.top ||
            searchInputRect.top >= statusSelectRect.bottom
          );
          if (overlapsStatus) {
            throw new Error(`Tại ${w}px: Search input chồng lấn Status dropdown! searchRect=[${searchInputRect.left},${searchInputRect.top},${searchInputRect.right},${searchInputRect.bottom}] vs statusRect=[${statusSelectRect.left},${statusSelectRect.top},${statusSelectRect.right},${statusSelectRect.bottom}]`);
          }

          // 4. Strict pointer hit test via elementFromPoint (semantic ownership)
          const hitBelongsTo = (control, hit) => Boolean(hit && (hit === control || control.contains(hit)));

          const methodCenterX = Math.round(methodSelectRect.left + methodSelectRect.width / 2);
          const methodCenterY = Math.round(methodSelectRect.top + methodSelectRect.height / 2);
          const hitMethodEl = iframeDoc.elementFromPoint(methodCenterX, methodCenterY);
          if (!hitBelongsTo(methodSelect, hitMethodEl)) {
            throw new Error(`Tại ${w}px: Pointer hit tại Payment Method dropdown thuộc phần tử không hợp lệ: <${hitMethodEl?.tagName} className="${hitMethodEl?.className}"> thay vì SELECT! Hit point: (${methodCenterX}, ${methodCenterY})`);
          }

          const statusCenterX = Math.round(statusSelectRect.left + statusSelectRect.width / 2);
          const statusCenterY = Math.round(statusSelectRect.top + statusSelectRect.height / 2);
          const hitStatusEl = iframeDoc.elementFromPoint(statusCenterX, statusCenterY);
          if (!hitBelongsTo(statusSelect, hitStatusEl)) {
            throw new Error(`Tại ${w}px: Pointer hit tại Status dropdown thuộc phần tử không hợp lệ: <${hitStatusEl?.tagName} className="${hitStatusEl?.className}"> thay vì SELECT! Hit point: (${statusCenterX}, ${statusCenterY})`);
          }

          addLog(`Tại ${w}px: methodCenterX=${methodCenterX}, methodCenterY=${methodCenterY}, hitMethodEl=${hitMethodEl?.tagName}.${hitMethodEl?.className}; hitStatusEl=${hitStatusEl?.tagName}.${hitStatusEl?.className}`);

          filterMetrics[w] = {
            viewport: w,
            documentScrollWidth: docScrollWidth,
            filterCardWidth: Math.round(filterCardRect.width * 100) / 100,
            searchContainerWidth: Math.round(searchContainerRect.width * 100) / 100,
            searchInputWidth: Math.round(searchInputRect.width * 100) / 100,
            paymentDropdownWidth: Math.round(methodSelectRect.width * 100) / 100,
            statusDropdownWidth: Math.round(statusSelectRect.width * 100) / 100,
            paymentDropdownRect: { left: Math.round(methodSelectRect.left), top: Math.round(methodSelectRect.top), right: Math.round(methodSelectRect.right), bottom: Math.round(methodSelectRect.bottom) },
            statusDropdownRect: { left: Math.round(statusSelectRect.left), top: Math.round(statusSelectRect.top), right: Math.round(statusSelectRect.right), bottom: Math.round(statusSelectRect.bottom) },
            searchPaymentOverlap: overlapsMethod ? 'YES' : 'NO',
            searchStatusOverlap: overlapsStatus ? 'YES' : 'NO',
            paymentHitTest: hitBelongsTo(methodSelect, hitMethodEl) ? 'PASS' : 'FAIL',
            statusHitTest: hitBelongsTo(statusSelect, hitStatusEl) ? 'PASS' : 'FAIL'
          };

          addLog(`Filter Matrix ${w}px: doc=${docScrollWidth}, cardW=${filterMetrics[w].filterCardWidth}, searchW=${filterMetrics[w].searchContainerWidth}, methodW=${filterMetrics[w].paymentDropdownWidth}, statusW=${filterMetrics[w].statusDropdownWidth}, overlap=NO, hitTest=PASS`);

          iframeRoot.unmount();
          iframe.remove();
        }

        record(
          'TEST 12 — AdminPayments Filter Overlap & Hit Test Check',
          'PASS',
          `Matrix: ` + JSON.stringify(filterMetrics)
        );

        // =========================================================================
        // TEST 13 — Shared AdminLayout Smoke Test (AdminProducts & AdminOrders)
        // =========================================================================
        setActiveTest('TEST 13: Shared AdminLayout Smoke Test at 360px, 768px, 1440px');
        addLog('Bắt đầu TEST 13: Smoke-check AdminProductsPage & AdminOrdersPage với AdminLayout tại 360px, 768px, 1440px');

        productApi.getProducts = async () => [];
        productApi.getCategories = async () => [];
        adminApi.getOrders = async () => [];

        const smokePages = [
          { name: 'AdminProductsPage', Component: AdminProductsPage, route: '/admin/products' },
          { name: 'AdminOrdersPage', Component: AdminOrdersPage, route: '/admin/orders' }
        ];

        for (const page of smokePages) {
          for (const w of [360, 768, 1440]) {
            const iframe = document.createElement('iframe');
            iframe.style.width = `${w}px`;
            iframe.style.height = '900px';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
            container.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;"><div id="iframe-root"></div></body></html>');
            iframeDoc.close();

            document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
              iframeDoc.head.appendChild(styleEl.cloneNode(true));
            });

            const iframeMount = iframeDoc.getElementById('iframe-root');
            const iframeRoot = createRoot(iframeMount);

            iframeRoot.render(
              <AuthProvider>
                <MemoryRouter initialEntries={[page.route]}>
                  <page.Component />
                </MemoryRouter>
              </AuthProvider>
            );

            await waitFor(() => {
              return iframeDoc.querySelector('main');
            }, 4000);

            await wait(100);

            const asideEl = iframeDoc.querySelector('aside');
            if (!asideEl) {
              throw new Error(`${page.name} tại ${w}px: Không tìm thấy sidebar <aside>!`);
            }
            const asideStyle = iframeDoc.defaultView.getComputedStyle(asideEl);

            if (w === 360) {
              if (asideStyle.display !== 'none') {
                throw new Error(`${page.name} tại 360px: Sidebar không bị ẩn (display=${asideStyle.display})!`);
              }
            } else {
              if (asideStyle.display === 'none') {
                throw new Error(`${page.name} tại ${w}px: Sidebar desktop bị ẩn nhầm!`);
              }
              const asideRect = asideEl.getBoundingClientRect();
              if (asideRect.width !== 256) {
                throw new Error(`${page.name} tại ${w}px: Chiều rộng sidebar không chuẩn 256px (width=${asideRect.width})!`);
              }
            }

            const mainEl = iframeDoc.querySelector('main');
            const mainRect = mainEl.getBoundingClientRect();
            if (mainRect.width <= 0) {
              throw new Error(`${page.name} tại ${w}px: Main content width <= 0!`);
            }

            iframeRoot.unmount();
            iframe.remove();
          }
        }

        record(
          'TEST 13 — Shared AdminLayout Smoke Test',
          'PASS',
          'AdminProductsPage và AdminOrdersPage hoạt động hoàn hảo tại 360px, 768px, 1440px: Sidebar ẩn trên mobile, hiển thị chuẩn 256px trên desktop'
        );

        // =========================================================================
        // TEST 14 — Production App/Router/Auth Integration Navigation Runtime (FE-REMEDIATION-8)
        // =========================================================================
        setActiveTest('TEST 14: Production App/Router/Auth Integration Navigation Runtime at 360px');
        addLog('Bắt đầu TEST 14: Mount production App, kiểm tra tích hợp BrowserRouter + AuthProvider + AdminRoute tại 360px');

        const navPaymentsFixture = [
          {
            id: 205,
            orderId: 305,
            orderCode: 999205,
            provider: 'PAYOS',
            amount: 500000,
            status: 'PAID',
            reference: 'NAV-PAYMENT-205',
            paidAt: '2026-10-04T12:00:00Z',
            createdAt: '2026-10-04T10:00:00Z',
            reviewReason: null,
            customerName: 'Mobile Admin User',
            paymentMethod: 'PAYOS_VIETQR'
          }
        ];
        adminApi.getAllPayments = async () => navPaymentsFixture;
        productApi.getProducts = async () => [];
        productApi.getCategories = async () => [];
        adminApi.getOrders = async () => [];

        // 1. Cung cấp ADMIN identity đúng format production AuthProvider tiêu thụ
        const validAdminToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
          btoa(JSON.stringify({ sub: 'admin', role: 'ROLE_ADMIN', exp: Math.floor(Date.now() / 1000) + 86400 })) +
          '.mocksignature';
        localStorage.setItem('token', validAdminToken);
        localStorage.setItem(
          'user',
          JSON.stringify({ id: 1, username: 'admin', fullName: 'Admin Integration Tester', role: 'ROLE_ADMIN' })
        );
        authApi.getMe = async () => ({
          id: 1,
          username: 'admin',
          fullName: 'Admin Integration Tester',
          role: 'ROLE_ADMIN'
        });

        // 2. Khởi tạo route bắt đầu bằng browser history thực tế
        const initialSearch = window.location.search || '';
        const initialReceiverPort = new URLSearchParams(initialSearch).get('port') || '5182';
        window.history.pushState({}, '', '/admin/payments' + initialSearch);

        // 3. Khởi tạo viewport 360x1100 qua iframe container để đánh giá đúng Tailwind md: responsive breakpoint
        const iframe14 = document.createElement('iframe');
        iframe14.style.width = '360px';
        iframe14.style.height = '1100px';
        iframe14.style.border = 'none';
        iframe14.style.display = 'block';
        container.appendChild(iframe14);

        const iframeDoc14 = iframe14.contentDocument || iframe14.contentWindow.document;
        iframeDoc14.open();
        iframeDoc14.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;"><div id="iframe-root"></div></body></html>');
        iframeDoc14.close();

        document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
          iframeDoc14.head.appendChild(styleEl.cloneNode(true));
        });

        const iframeMount14 = iframeDoc14.getElementById('iframe-root');
        const iframeRoot14 = createRoot(iframeMount14);

        // 4. Mount PRODUCTION APP (chứa production BrowserRouter, AuthProvider, CartProvider, CompareProvider, AdminRoute)
        // Tuyệt đối KHÔNG dùng MemoryRouter, KHÔNG dùng synthetic Route table!
        iframeRoot14.render(<App />);

        // 5. Chờ production AdminPaymentsPage render sau khi qua AuthProvider + AdminRoute + lazy Suspense
        await waitFor(() => {
          return iframeDoc14.querySelector('table');
        }, 8000);
        await wait(100);

        if (window.location.pathname !== '/admin/payments') {
          throw new Error(`Khởi đầu: Browser pathname không phải /admin/payments mà là: ${window.location.pathname}`);
        }

        // 6. Mobile menu trigger button tồn tại
        const menuBtn1 = iframeDoc14.querySelector('button[aria-label="Mở menu quản trị"]');
        if (!menuBtn1) {
          throw new Error('Tại 360px: Không tìm thấy mobile menu trigger button trên production App!');
        }

        // 7. Khi đóng, sidebar không intercept content (aside có display === "none")
        const aside1 = iframeDoc14.querySelector('aside');
        if (!aside1) {
          throw new Error('Tại 360px: Không tìm thấy sidebar <aside> trong production App!');
        }
        let asideStyle1 = iframeDoc14.defaultView.getComputedStyle(aside1);
        if (asideStyle1.display !== 'none') {
          throw new Error(`Tại 360px khi menu đóng: Sidebar không bị ẩn (display=${asideStyle1.display})!`);
        }

        // 8. Click mobile menu trigger để mở drawer
        menuBtn1.click();
        await wait(100);

        asideStyle1 = iframeDoc14.defaultView.getComputedStyle(aside1);
        if (asideStyle1.display === 'none') {
          throw new Error('Tại 360px khi click trigger: Sidebar vẫn bị ẩn!');
        }

        // 9. Tìm link Products ("Sản phẩm", to="/admin/products") trong production sidebar
        const productsLink = Array.from(aside1.querySelectorAll('a')).find(
          (a) => a.getAttribute('href') === '/admin/products' || (a.textContent && a.textContent.includes('Sản phẩm'))
        );
        if (!productsLink) {
          throw new Error('Tại 360px: Không tìm thấy navigation link tới "Sản phẩm" trong production sidebar!');
        }

        // 10. Click link Products
        productsLink.click();
        await wait(200);

        // 11. Kiểm tra BrowserRouter thật đã thay đổi window.location.pathname thành /admin/products
        if (window.location.pathname !== '/admin/products') {
          throw new Error(`Sau khi click Sản phẩm: Browser pathname không phải /admin/products mà là: ${window.location.pathname}`);
        }

        // 12. Chờ production AdminProductsPage hiển thị sau khi qua AdminRoute
        await waitFor(() => {
          const h1 = iframeDoc14.querySelector('h1');
          return h1 && h1.textContent.includes('Quản lý sản phẩm');
        }, 8000);

        // 13. Mobile sidebar tự động đóng lại (auto-close trên route change), không intercept content
        await wait(100);
        const aside2 = iframeDoc14.querySelector('aside');
        if (!aside2) {
          throw new Error('Tại trang Sản phẩm: Không tìm thấy sidebar <aside>!');
        }
        let asideStyle2 = iframeDoc14.defaultView.getComputedStyle(aside2);
        if (asideStyle2.display !== 'none') {
          throw new Error(`Sau khi chuyển sang Sản phẩm: Sidebar không tự động đóng (display=${asideStyle2.display})!`);
        }

        // 14. Mở lại mobile menu từ trang AdminProductsPage
        const menuBtn2 = iframeDoc14.querySelector('button[aria-label="Mở menu quản trị"]');
        if (!menuBtn2) {
          throw new Error('Tại trang Sản phẩm: Không tìm thấy mobile menu trigger button!');
        }
        menuBtn2.click();
        await wait(100);

        asideStyle2 = iframeDoc14.defaultView.getComputedStyle(aside2);
        if (asideStyle2.display === 'none') {
          throw new Error('Tại trang Sản phẩm khi click trigger: Sidebar vẫn bị ẩn!');
        }

        // 15. Tìm link Orders ("Đơn hàng", to="/admin/orders")
        const ordersLink = Array.from(aside2.querySelectorAll('a')).find(
          (a) => a.getAttribute('href') === '/admin/orders' || (a.textContent && a.textContent.includes('Đơn hàng'))
        );
        if (!ordersLink) {
          throw new Error('Tại 360px: Không tìm thấy navigation link tới "Đơn hàng" trong production sidebar!');
        }

        // 16. Click Orders
        ordersLink.click();
        await wait(200);

        // 17. Kiểm tra BrowserRouter thật đã thay đổi window.location.pathname thành /admin/orders
        if (window.location.pathname !== '/admin/orders') {
          throw new Error(`Sau khi click Đơn hàng: Browser pathname không phải /admin/orders mà là: ${window.location.pathname}`);
        }

        // 18. Chờ production AdminOrdersPage hiển thị sau khi qua AdminRoute
        await waitFor(() => {
          const h1 = iframeDoc14.querySelector('h1');
          return h1 && h1.textContent.includes('Quản lý đơn hàng');
        }, 8000);

        // 19. Kiểm tra sidebar lại tự động đóng
        await wait(100);
        const aside3 = iframeDoc14.querySelector('aside');
        if (!aside3) {
          throw new Error('Tại trang Đơn hàng: Không tìm thấy sidebar <aside>!');
        }
        let asideStyle3 = iframeDoc14.defaultView.getComputedStyle(aside3);
        if (asideStyle3.display !== 'none') {
          throw new Error(`Sau khi chuyển sang Đơn hàng: Sidebar không tự động đóng (display=${asideStyle3.display})!`);
        }

        iframeRoot14.unmount();
        iframe14.remove();
        window.history.pushState({}, '', '/test-fix003-component.html' + initialSearch);

        record(
          'TEST 14 — Production App/Router/Auth Integration Navigation Runtime',
          'PASS',
          'Mounted production App (BrowserRouter + AuthProvider + AdminRoute); validated real pathname updates (/admin/payments -> /admin/products -> /admin/orders) via UI clicks without manual mutation'
        );

        // =========================================================================
        // TEST 15 — Production App OrderDetail Navbar & Viewport Containment (FE-REMEDIATION-9)
        // =========================================================================
        setActiveTest('TEST 15: Production App OrderDetail Navbar & Viewport Containment at 360px, 768px, 1440px');
        addLog('Bắt đầu TEST 15: Kiểm tra /orders/501 trên production App tại 360px (ROLE_USER & ROLE_ADMIN), 768px, 1440px');

        const longRef140Order = 'REF-BANK-ORDER-501-' + '7'.repeat(121); // exactly 140 chars

        const order501Data = {
          id: 501,
          orderCode: 999501,
          code: 'HG-ORD-501',
          status: 'PAID',
          paymentMethod: 'PAYOS_VIETQR',
          createdAt: '2026-10-04T12:00:00Z',
          totalAmount: 1250000,
          shippingFee: 30000,
          discountAmount: 0,
          customerName: 'Khách Hàng Test',
          customerPhone: '0901234567',
          customerAddress: '123 Đường Cầu Lông, Quận 1, TP.HCM',
          items: [
            {
              id: 1,
              productName: 'Vợt Cầu Lông Yonex Astrox 88D Pro',
              quantity: 1,
              unitPrice: 1250000,
              image: '/images/racket.png'
            }
          ]
        };

        const payment501Data = {
          id: 99501,
          orderId: 501,
          status: 'PAID',
          reference: longRef140Order,
          paidAt: '2026-10-04T12:15:00Z',
          provider: 'PAYOS'
        };

        orderApi.getOrderById = async (id) => order501Data;
        orderApi.getOrderPayment = async (id) => payment501Data;

        const rolesToTest = ['ROLE_USER', 'ROLE_ADMIN'];
        const viewportsOrderDetail = [360, 768, 1024, 1440];
        const navbarMetrics = {};

        for (const role of rolesToTest) {
          navbarMetrics[role] = {};
          const roleToken =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
            btoa(JSON.stringify({ sub: role.toLowerCase(), role: role, exp: Math.floor(Date.now() / 1000) + 86400 })) +
            '.mocksignature';
          localStorage.setItem('token', roleToken);
          localStorage.setItem(
            'user',
            JSON.stringify({ id: role === 'ROLE_ADMIN' ? 1 : 2, username: role.toLowerCase(), fullName: `${role} Tester`, role })
          );
          authApi.getMe = async () => ({
            id: role === 'ROLE_ADMIN' ? 1 : 2,
            username: role.toLowerCase(),
            fullName: `${role} Tester`,
            role
          });

          for (const w of viewportsOrderDetail) {
            window.history.pushState({}, '', '/orders/501' + initialSearch);

            const iframe = document.createElement('iframe');
            iframe.style.width = `${w}px`;
            iframe.style.height = '1100px';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
            container.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;"><div id="iframe-root"></div></body></html>');
            iframeDoc.close();

            document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleEl) => {
              iframeDoc.head.appendChild(styleEl.cloneNode(true));
            });

            const iframeMount = iframeDoc.getElementById('iframe-root');
            const iframeRoot = createRoot(iframeMount);

            iframeRoot.render(<App />);

            // Chờ production OrderDetailPage render xong
            await waitFor(() => {
              const bodyText = iframeDoc.body.innerText || '';
              return bodyText.includes('501') && bodyText.includes('Thanh toán');
            }, 8000);
            await wait(100);

            const docScrollWidth = iframeDoc.documentElement.scrollWidth;
            const bodyScrollWidth = iframeDoc.body.scrollWidth;

            const headerEl = iframeDoc.querySelector('header');
            if (!headerEl) {
              throw new Error(`Tại ${w}px (${role}): Không tìm thấy <header> (Navbar)!`);
            }
            const headerRect = headerEl.getBoundingClientRect();

            const logoEl = headerEl.querySelector('a[href="/"]');
            if (!logoEl) {
              throw new Error(`Tại ${w}px (${role}): Không tìm thấy Logo trong Navbar!`);
            }
            const logoRect = logoEl.getBoundingClientRect();

            const searchEl = headerEl.querySelector('form');
            if (!searchEl) {
              throw new Error(`Tại ${w}px (${role}): Không tìm thấy Search Form trong Navbar!`);
            }
            const searchRect = searchEl.getBoundingClientRect();

            const searchInput = searchEl.querySelector('input');
            if (!searchInput) {
              throw new Error(`Tại ${w}px (${role}): Không tìm thấy Search Input trong Navbar!`);
            }
            const searchInputRect = searchInput.getBoundingClientRect();
            const inputComputedStyle = iframe.contentWindow.getComputedStyle(searchInput);
            const paddingLeft = parseFloat(inputComputedStyle.paddingLeft) || 0;
            const paddingRight = parseFloat(inputComputedStyle.paddingRight) || 0;
            const usableContentWidth = Math.round(searchInput.clientWidth - paddingLeft - paddingRight);

            const cartEl = headerEl.querySelector('a[href="/cart"]');
            const actionsEl = cartEl ? cartEl.closest('.shrink-0') : null;
            if (!actionsEl) {
              throw new Error(`Tại ${w}px (${role}): Không tìm thấy nhóm Actions trong Navbar!`);
            }
            const actionsRect = actionsEl.getBoundingClientRect();

            // Kiểm tra nút menu/action trên mobile
            const toggleMenuBtn = headerEl.querySelector('button[aria-label="Toggle menu"]');
            let toggleMenuRect = null;
            if (toggleMenuBtn) {
              toggleMenuRect = toggleMenuBtn.getBoundingClientRect();
            }

            // Kiểm tra 140-char reference
            const refEl = Array.from(iframeDoc.querySelectorAll('span')).find(
              (s) => s.textContent && s.textContent.includes(longRef140Order)
            );
            if (!refEl) {
              throw new Error(`Tại ${w}px (${role}): Không tìm thấy cell chứa 140-char reference!`);
            }

            // Kiểm tra tràn ngang toàn trang
            if (docScrollWidth > w + 3) {
              throw new Error(`Tại ${w}px (${role}): Document horizontal blowout! scrollWidth=${docScrollWidth} > viewport=${w}`);
            }
            if (bodyScrollWidth > w + 3) {
              throw new Error(`Tại ${w}px (${role}): Body horizontal blowout! scrollWidth=${bodyScrollWidth} > viewport=${w}`);
            }

            // Helper kiểm tra 2D Overlap
            const check2DOverlap = (rA, rB, nameA, nameB) => {
              const overlapX = Math.max(0, Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left));
              const overlapY = Math.max(0, Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top));
              if (overlapX > 2 && overlapY > 2) {
                throw new Error(`Tại ${w}px (${role}): Phát hiện 2D overlap giữa ${nameA} và ${nameB}! overlapX=${Math.round(overlapX)}px, overlapY=${Math.round(overlapY)}px`);
              }
            };

            // Kiểm tra hình học và thứ tự bố cục theo viewport
            if (w === 360) {
              // Mobile: Hàng 1 = Logo + Actions/Menu, Hàng 2 = Search Bar full-width
              if (toggleMenuRect && toggleMenuRect.right > w + 3) {
                throw new Error(`Tại 360px (${role}): Mobile toggle menu bị đẩy ra ngoài màn hình! right=${toggleMenuRect.right} > 360px`);
              }
              if (logoRect.left < 0 || logoRect.right > w + 3) {
                throw new Error(`Tại 360px (${role}): Logo bị tràn màn hình! left=${logoRect.left}, right=${logoRect.right}`);
              }
              if (actionsRect.right > w + 3) {
                throw new Error(`Tại 360px (${role}): Actions group bị tràn màn hình! right=${actionsRect.right} > 360px`);
              }
              // Kiểm tra 2D overlap không được xảy ra giữa các khối chính
              check2DOverlap(logoRect, actionsRect, 'Logo', 'Actions');
              check2DOverlap(logoRect, searchRect, 'Logo', 'Search');
              check2DOverlap(actionsRect, searchRect, 'Actions', 'Search');

              // Kiểm tra pointer hit: các nút điều khiển quan trọng phải nhận được tương tác
              if (toggleMenuBtn && toggleMenuRect) {
                const menuPoint = { x: Math.floor(toggleMenuRect.left + toggleMenuRect.width / 2), y: Math.floor(toggleMenuRect.top + toggleMenuRect.height / 2) };
                const hitMenu = iframeDoc.elementFromPoint(menuPoint.x, menuPoint.y);
                if (!hitMenu || (!toggleMenuBtn.contains(hitMenu) && hitMenu !== toggleMenuBtn)) {
                  throw new Error(`Tại 360px (${role}): Mobile toggle menu bị che khuất! hit=${hitMenu ? hitMenu.tagName : 'null'}`);
                }
              }
              const searchPoint = { x: Math.floor(searchInputRect.left + searchInputRect.width / 2), y: Math.floor(searchInputRect.top + searchInputRect.height / 2) };
              const hitSearch = iframeDoc.elementFromPoint(searchPoint.x, searchPoint.y);
              if (!hitSearch || (!searchEl.contains(hitSearch) && hitSearch !== searchInput)) {
                throw new Error(`Tại 360px (${role}): Search input bị che khuất! hit=${hitSearch ? hitSearch.tagName : 'null'}`);
              }

              // Search bar phải có bề rộng khả dụng tốt
              if (usableContentWidth < 120) {
                throw new Error(`Tại 360px (${role}): Search input usable content width quá nhỏ! usableContentWidth=${usableContentWidth}px < 120px`);
              }
            } else if (w === 768) {
              // 768px Tablet: Search bar không được co về 0px, phải có usableContentWidth >= 120px
              if (usableContentWidth < 120) {
                throw new Error(
                  `Tại 768px (${role}): Ô tìm kiếm bị ép co không sử dụng được! clientWidth=${searchInput.clientWidth}, ` +
                  `padL=${paddingLeft}, padR=${paddingRight}, usableContentWidth=${usableContentWidth}px < 120px`
                );
              }

              // Thử nghiệm tương tác: thực hiện focus thật và kiểm tra activeElement
              searchInput.focus();
              if (iframeDoc.activeElement !== searchInput) {
                throw new Error(
                  `Tại 768px (${role}): Focus thất bại! iframeDoc.activeElement không phải là search input (hiện tại: ${iframeDoc.activeElement ? iframeDoc.activeElement.tagName : 'null'})`
                );
              }

              // Mô phỏng tương tác gõ phím thật trên React controlled input
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                iframe.contentWindow.HTMLInputElement.prototype,
                'value'
              )?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(searchInput, 'Yonex Astrox 88D');
              } else {
                searchInput.value = 'Yonex Astrox 88D';
              }
              searchInput.dispatchEvent(new iframe.contentWindow.Event('input', { bubbles: true }));
              searchInput.dispatchEvent(new iframe.contentWindow.Event('change', { bubbles: true }));

              // Kiểm tra activeElement vẫn được duy trì và giá trị hiển thị đã cập nhật
              if (iframeDoc.activeElement !== searchInput) {
                throw new Error(
                  `Tại 768px (${role}): Mất focus sau khi gõ phím! activeElement=${iframeDoc.activeElement ? iframeDoc.activeElement.tagName : 'null'}`
                );
              }
              if (searchInput.value !== 'Yonex Astrox 88D') {
                throw new Error(`Tại 768px (${role}): Giá trị tìm kiếm không cập nhật! value=${searchInput.value}`);
              }
            } else {
              // Desktop (1024px, 1440px): Bắt buộc thứ tự ngang: Logo (trái) -> Search (giữa) -> Actions (phải)
              if (logoRect.right > searchRect.left + 5) {
                throw new Error(`Tại ${w}px (${role}): Logo không nằm trước Search! logo.right=${logoRect.right} > search.left=${searchRect.left}`);
              }
              if (searchRect.right > actionsRect.left + 5) {
                throw new Error(
                  `Tại ${w}px (${role}): Thứ tự Navbar bị sai (logo -> actions -> search)! Cần: logo -> search -> actions. ` +
                  `search.right=${searchRect.right} > actions.left=${actionsRect.left}`
                );
              }
              if (usableContentWidth < 120) {
                throw new Error(`Tại ${w}px (${role}): Search input usable content width quá nhỏ! usableContentWidth=${usableContentWidth}px < 120px`);
              }
              if (actionsRect.right > w + 3) {
                throw new Error(`Tại ${w}px (${role}): Actions group tràn mép phải màn hình! actions.right=${actionsRect.right} > viewport=${w}`);
              }
            }

            navbarMetrics[role][w] = {
              viewport: w,
              documentScrollWidth: docScrollWidth,
              bodyScrollWidth: bodyScrollWidth,
              navbarWidth: Math.round(headerRect.width * 100) / 100,
              logoRect: { left: Math.round(logoRect.left), right: Math.round(logoRect.right), width: Math.round(logoRect.width) },
              searchRect: { left: Math.round(searchRect.left), right: Math.round(searchRect.right), width: Math.round(searchRect.width) },
              searchUsableContentWidth: usableContentWidth,
              actionsRect: { left: Math.round(actionsRect.left), right: Math.round(actionsRect.right), width: Math.round(actionsRect.width) },
              menuBtnRect: toggleMenuRect ? { left: Math.round(toggleMenuRect.left), right: Math.round(toggleMenuRect.right) } : null,
              desktopOrder: w >= 1024 ? (searchRect.left > logoRect.right - 5 && actionsRect.left > searchRect.right - 5 ? 'logo -> search -> actions' : 'INCORRECT') : 'N/A (wrapped layout)',
              overflow: docScrollWidth > w + 3 ? 'YES' : 'NO'
            };

            addLog(`Navbar ${role} ${w}px: doc=${docScrollWidth}, body=${bodyScrollWidth}, usableWidth=${usableContentWidth}px, overflow=NO`);

            iframeRoot.unmount();
            iframe.remove();
          }
        }

        window.history.pushState({}, '', '/test-fix003-component.html' + initialSearch);

        record(
          'TEST 15 — Production App OrderDetail Navbar & Viewport Containment',
          'PASS',
          `Verified /orders/501 at 360px, 768px, 1440px for ROLE_USER & ROLE_ADMIN. 0 horizontal overflow; Navbar & controls fully contained. Metrics: ` + JSON.stringify(navbarMetrics)
        );

        // All tests passed! Post results back to receiver
        addLog('Tất cả 15 test component đều PASS! Đang gửi kết quả về receiver...');
        await fetch(`http://127.0.0.1:${initialReceiverPort}/test-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(results)
        });

      } catch (err) {
        addLog(`❌ TEST FAILED: ${err.message}`);
        console.error(err);
        record(activeTest || 'Test Runner Error', 'FAIL', err.message);

        const params = new URLSearchParams(window.location.search);
        const fallbackPort = params.get('port') || '5182';
        await fetch(`http://127.0.0.1:${fallbackPort}/test-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(results)
        }).catch(() => {});
      }
    };

    runAllTests();

    return () => {
      unmounted = true;
    };
  }, []);

  return (
    <div className="p-6 font-sans max-w-4xl mx-auto">
      <h1 className="text-xl font-black text-slate-900 mb-4">
        FIX-003: Real Component Test Runner (React 18)
      </h1>
      <div className="mb-4 p-3 bg-slate-100 rounded-xl text-xs font-mono">
        <strong>Trạng thái:</strong> {activeTest || 'Đang khởi chạy...'}
      </div>

      <div className="space-y-2 mb-6">
        <h2 className="font-bold text-sm text-slate-800">Kết quả kiểm thử:</h2>
        {testResults.map((r, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg text-xs font-mono border ${
              r.status === 'PASS'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <strong>[{r.status}] {r.name}</strong>
            {r.details && <p className="mt-1 text-[11px] opacity-80">{r.details}</p>}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-sm text-slate-800 mb-2">Logs:</h2>
        <div className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[11px] font-mono h-48 overflow-y-auto space-y-1">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>

      {/* Component mounting container */}
      <div
        id="test-mount-point"
        className="border-2 border-dashed border-slate-300 rounded-2xl p-4 min-h-[300px] overflow-hidden"
      />
    </div>
  );
}
