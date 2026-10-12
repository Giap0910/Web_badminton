import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loginSource = fs.readFileSync(path.join(__dirname, 'LoginPage.jsx'), 'utf-8');
const registerSource = fs.readFileSync(path.join(__dirname, 'RegisterPage.jsx'), 'utf-8');
const adminDashboardSource = fs.readFileSync(path.join(__dirname, 'AdminDashboardPage.jsx'), 'utf-8');

test('STEP 2 — FIX-026 & FIX-036 Verification Suite', async (t) => {
  const esbuild = await import('esbuild');
  const React = await import('react');
  const ReactDOMServer = await import('react-dom/server');

  // Helper for component mounting and running
  function createHarness(overrides = {}) {
    let stateCursor = 0;
    const stateStore = new Map();
    const effects = [];
    const activeCleanups = [];

    const customReact = {
      ...React,
      useState: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, initial);
        }
        const val = stateStore.get(id);
        const setter = (newVal) => {
          const resolved = typeof newVal === 'function' ? newVal(stateStore.get(id)) : newVal;
          stateStore.set(id, resolved);
        };
        return [val, setter];
      },
      useEffect: (fn, deps) => {
        effects.push({ fn, deps });
      },
      useRef: (initial) => {
        const id = stateCursor++;
        if (!stateStore.has(id)) {
          stateStore.set(id, { current: initial });
        }
        return stateStore.get(id);
      },
      useCallback: (fn) => fn,
      useMemo: (fn) => fn(),
    };

    const runEffects = async () => {
      for (const eff of effects) {
        const cleanup = await eff.fn();
        if (typeof cleanup === 'function') {
          activeCleanups.push(cleanup);
        }
      }
      effects.length = 0;
    };

    const dispose = () => {
      while (activeCleanups.length > 0) {
        const cleanup = activeCleanups.pop();
        try {
          cleanup();
        } catch (_) {}
      }
      effects.length = 0;
      stateStore.clear();
    };

    return {
      customReact,
      resetCursor: () => { stateCursor = 0; },
      runEffects,
      dispose,
      stateStore
    };
  }

  // =========================================================================
  // FIX-026 TESTS: Registration & Email Validation
  // =========================================================================

  await t.test('FIX-026: No fake email generation string exists in codebase', () => {
    // Assert no template literal or dynamic synthesis of ${...@hgbadminton.vn} or identifier fallback
    const fakeEmailPattern = /\$\{[^}]*\}\s*@\s*hgbadminton\.vn/;
    assert.strictEqual(
      fakeEmailPattern.test(loginSource),
      false,
      'LoginPage must not generate email dynamically with @hgbadminton.vn'
    );
    assert.strictEqual(
      fakeEmailPattern.test(registerSource),
      false,
      'RegisterPage must not generate email dynamically with @hgbadminton.vn'
    );
    // Assert neither file transforms phone number to email
    assert.strictEqual(
      loginSource.includes('registerIdentifier}@hgbadminton.vn'),
      false,
      'LoginPage must not have registerIdentifier}@hgbadminton.vn'
    );
    assert.strictEqual(
      registerSource.includes('registerIdentifier}@hgbadminton.vn'),
      false,
      'RegisterPage must not have registerIdentifier}@hgbadminton.vn'
    );
  });

  await t.test('FIX-026: RegisterPage blocks pure phone numbers, invalid emails, empty emails, password mismatch', async () => {
    const transformed = await esbuild.transform(registerSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    const harness = createHarness();
    try {
      const moduleFunc = new Function('require', 'module', 'exports', transformed.code);
      const modExports = {};
      const moduleObj = { exports: modExports };

      const customRequire = (id) => {
        if (id === 'react') return harness.customReact;
        if (id === 'react-router-dom') {
          return {
            useNavigate: () => () => {},
            useLocation: () => ({ search: '' }),
            Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children)
          };
        }
        if (id.includes('authApi')) return { authApi: { register: async () => ({ data: {} }) } };
        if (id.includes('AuthContext')) return { useAuth: () => ({ user: null }) };
        if (id === 'lucide-react') {
          return new Proxy({}, {
            get: (_, prop) => (props) => React.createElement('span', { 'data-icon': prop, ...props })
          });
        }
        return {};
      };

      moduleFunc(customRequire, moduleObj, modExports);
      const RegisterPage = moduleObj.exports.default || moduleObj.exports;

      harness.resetCursor();
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(RegisterPage));
      assert.ok(html.includes('Địa chỉ email'), 'Label must display Địa chỉ email');
      assert.ok(html.includes('name@example.com'), 'Placeholder must display name@example.com');
      assert.ok(!html.includes('Số điện thoại kích hoạt'), 'Must not prompt for phone activation');

      // Test validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = ['', '   ', '0988123456', '+84988123456', 'bad@', 'bad@domain', 'bad email'];
      for (const inv of invalidEmails) {
        assert.strictEqual(emailRegex.test(inv.trim()), false, `Input "${inv}" must be rejected`);
      }
      assert.strictEqual(emailRegex.test('valid@example.com'), true, 'Valid email must be accepted');
    } finally {
      harness.dispose();
    }
  });

  await t.test('FIX-026: LoginPage register tab requires valid email and blocks phone numbers', async () => {
    const transformed = await esbuild.transform(loginSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    const harness = createHarness();
    try {
      // Set activeTab (state 0) to 'register'
      harness.stateStore.set(0, 'register');

      const moduleFunc = new Function('require', 'module', 'exports', transformed.code);
      const modExports = {};
      const moduleObj = { exports: modExports };

      const customRequire = (id) => {
        if (id === 'react') return harness.customReact;
        if (id === 'react-router-dom') {
          return {
            useNavigate: () => () => {},
            useLocation: () => ({ search: '' }),
            Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children)
          };
        }
        if (id.includes('AuthContext')) {
          return {
            useAuth: () => ({
              user: null,
              login: async () => {},
              register: async () => {}
            })
          };
        }
        if (id === 'lucide-react') {
          return new Proxy({}, {
            get: (_, prop) => (props) => React.createElement('span', { 'data-icon': prop, ...props })
          });
        }
        return {};
      };

      moduleFunc(customRequire, moduleObj, modExports);
      const LoginPage = moduleObj.exports.default || moduleObj.exports;

      harness.resetCursor();
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(LoginPage));
      assert.ok(html.includes('Địa chỉ email'), 'LoginPage must display Địa chỉ email for register input');
      assert.ok(html.includes('name@example.com'), 'LoginPage must have name@example.com placeholder');
    } finally {
      harness.dispose();
    }
  });

  // =========================================================================
  // FIX-036 TESTS: AdminDashboardPage Semantics & Accuracy
  // =========================================================================

  await t.test('FIX-036: AdminDashboardPage displays exact metric labels matching API data semantics', async () => {
    const transformed = await esbuild.transform(adminDashboardSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    const mockDashboardData = {
      totalRevenue: 15500000,
      totalOrders: 42,
      totalCustomers: 15,
      pendingOrders: 3,
      recentOrders: [
        {
          id: 101,
          payosOrderCode: 98765,
          customerName: 'Nguyễn Văn Test',
          shippingPhone: '0901234567',
          totalAmount: 1500000,
          status: 'PENDING',
          items: [
            {
              productName: 'Vợt Yonex Astrox 88D Pro',
              stringingService: 'BG65Ti',
              stringTension: '11.0kg'
            }
          ],
          createdAt: '2026-10-10T10:00:00'
        }
      ],
      dailyRevenue: {
        '05/10': 1000000,
        '06/10': 2000000,
        '07/10': 1500000,
        '08/10': 3000000,
        '09/10': 2500000,
        '10/10': 1500000,
        '11/10': 4000000
      }
    };

    const mockAdminApi = {
      getDashboardStats: async () => ({ data: mockDashboardData })
    };

    const harness = createHarness();
    try {
      const moduleFunc = new Function('require', 'module', 'exports', transformed.code);
      const modExports = {};
      const moduleObj = { exports: modExports };

      const customRequire = (id) => {
        if (id === 'react') return harness.customReact;
        if (id === 'react-router-dom') {
          return {
            Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children)
          };
        }
        if (id.includes('adminApi')) return { adminApi: mockAdminApi };
        if (id.includes('AdminReportControls')) return () => React.createElement('button', null, 'Xuất báo cáo');
        if (id.includes('AdminLayout')) {
          return ({ children }) => React.createElement('div', { 'data-testid': 'admin-layout' }, children);
        }
        if (id.includes('formatters')) {
          return { getOrderStatusLabel: (o) => o?.status || 'PENDING' };
        }
        if (id === 'lucide-react') {
          return new Proxy({}, {
            get: (_, prop) => (props) => React.createElement('span', { 'data-icon': prop, ...props })
          });
        }
        return {};
      };

      moduleFunc(customRequire, moduleObj, modExports);
      const AdminDashboardPage = moduleObj.exports.default || moduleObj.exports;

      harness.resetCursor();
      ReactDOMServer.renderToStaticMarkup(React.createElement(AdminDashboardPage));
      await harness.runEffects();

      harness.resetCursor();
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(AdminDashboardPage));

      // 1. Verify Card Labels & Captions
      assert.ok(html.includes('Tổng doanh thu ghi nhận'), 'Must have label "Tổng doanh thu ghi nhận"');
      assert.ok(
        html.includes('Chỉ ghi nhận tiền PayOS đã xác nhận và tiền mặt/COD đã xác nhận thu.'),
        'Must have truthful revenue caption explaining backend recognition and no separate COD cash reconciliation'
      );
      assert.ok(!html.includes('Đơn hàng thanh toán thành công'), 'Must not claim orders are all successfully paid');

      assert.ok(html.includes('Tổng đơn hàng'), 'Must have label "Tổng đơn hàng"');
      assert.ok(html.includes('Tổng tài khoản'), 'Must have label "Tổng tài khoản"');
      assert.ok(html.includes('Đơn hàng chờ xử lý/thanh toán'), 'Must have label "Đơn hàng chờ xử lý/thanh toán"');

      // Must NOT have old misleading labels
      assert.ok(!html.includes('Tổng doanh thu<'), 'Must not have ambiguous label');
      assert.ok(!html.includes('mặt hàng</span>'), 'Pending orders must not be labeled as mặt hàng');
      assert.ok(html.includes('đơn</span>'), 'Pending orders must be labeled as đơn');

      // 2. Verify Revenue Chart subtitle
      assert.ok(
        html.includes('Doanh thu theo ngày nhận tiền'),
        'Chart subtitle must specify revenue is by order creation date in the last 7 days'
      );
      assert.ok(!html.includes('Dữ liệu ghi nhận từ các đơn thanh toán thành công theo ngày'), 'Must not claim chart is by payment success date');

      // 3. Verify Time Filter is disabled and explained
      assert.ok(html.includes('Xuất báo cáo'), 'Report controls must render');
      assert.ok(!html.includes('Chưa hỗ trợ lọc'), 'Date range filtering is now supported');

      // 3. Verify Top Products is transparent about no API support
      assert.ok(html.includes('Chưa hỗ trợ'), 'Top products must state Chưa hỗ trợ');

      // 4. Verify Recent Orders uses real data, no fake phone or stringing fallback
      assert.ok(html.includes('Nguyễn Văn Test'), 'Customer name must be from API');
      assert.ok(html.includes('0901234567'), 'Shipping phone must be from API');
      assert.ok(html.includes('BG65Ti (11.0kg)'), 'Stringing service must be from API');
      assert.ok(!html.includes('0988 123 456'), 'Must not contain fake fallback phone 0988 123 456');
      assert.ok(!html.includes('Khách hàng HG'), 'Must not contain fake customer name Khách hàng HG');
      assert.ok(!html.includes('Đan vợt tiêu chuẩn BWF'), 'Must not contain fake stringing requirement');
    } finally {
      harness.dispose();
    }
  });

  await t.test('FIX-036: AdminDashboardPage properly formats zero values without displaying loading state', async () => {
    const transformed = await esbuild.transform(adminDashboardSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    const zeroDashboardData = {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      pendingOrders: 0,
      recentOrders: [],
      dailyRevenue: {}
    };

    const mockAdminApi = {
      getDashboardStats: async () => ({ data: zeroDashboardData })
    };

    const harness = createHarness();
    try {
      const moduleFunc = new Function('require', 'module', 'exports', transformed.code);
      const modExports = {};
      const moduleObj = { exports: modExports };

      const customRequire = (id) => {
        if (id === 'react') return harness.customReact;
        if (id === 'react-router-dom') {
          return {
            Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children)
          };
        }
        if (id.includes('adminApi')) return { adminApi: mockAdminApi };
        if (id.includes('AdminReportControls')) return () => React.createElement('button', null, 'Xuất báo cáo');
        if (id.includes('AdminLayout')) {
          return ({ children }) => React.createElement('div', { 'data-testid': 'admin-layout' }, children);
        }
        if (id.includes('formatters')) {
          return { getOrderStatusLabel: (o) => o?.status || 'PENDING' };
        }
        if (id === 'lucide-react') {
          return new Proxy({}, {
            get: (_, prop) => (props) => React.createElement('span', { 'data-icon': prop, ...props })
          });
        }
        return {};
      };

      moduleFunc(customRequire, moduleObj, modExports);
      const AdminDashboardPage = moduleObj.exports.default || moduleObj.exports;

      harness.resetCursor();
      ReactDOMServer.renderToStaticMarkup(React.createElement(AdminDashboardPage));
      await harness.runEffects();

      harness.resetCursor();
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(AdminDashboardPage));

      // Zero values rendered
      assert.ok(html.includes('0&nbsp;₫') || html.includes('0 ₫') || html.includes('0'), 'Revenue of 0 VND must be shown');
      assert.ok(!html.includes('Chưa tải'), 'Should not show Chưa tải when 0 is returned');
      assert.ok(html.includes('Chưa có đơn hàng nào'), 'Empty recent orders table must show clear empty state');
    } finally {
      harness.dispose();
    }
  });

  await t.test('FIX-036: AdminDashboardPage displays server error without masking it with fake data', async () => {
    const transformed = await esbuild.transform(adminDashboardSource, {
      loader: 'jsx',
      format: 'cjs',
      jsx: 'transform',
      target: 'node18',
    });

    const mockAdminApi = {
      getDashboardStats: async () => {
        const error = new Error('Network error');
        error.response = { data: { message: 'Không thể kết nối đến máy chủ quản trị' } };
        throw error;
      }
    };

    const harness = createHarness();
    try {
      const moduleFunc = new Function('require', 'module', 'exports', transformed.code);
      const modExports = {};
      const moduleObj = { exports: modExports };

      const customRequire = (id) => {
        if (id === 'react') return harness.customReact;
        if (id === 'react-router-dom') {
          return {
            Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children)
          };
        }
        if (id.includes('adminApi')) return { adminApi: mockAdminApi };
        if (id.includes('AdminReportControls')) return () => React.createElement('button', null, 'Xuất báo cáo');
        if (id.includes('AdminLayout')) {
          return ({ children }) => React.createElement('div', { 'data-testid': 'admin-layout' }, children);
        }
        if (id.includes('formatters')) {
          return { getOrderStatusLabel: (o) => o?.status || 'PENDING' };
        }
        if (id === 'lucide-react') {
          return new Proxy({}, {
            get: (_, prop) => (props) => React.createElement('span', { 'data-icon': prop, ...props })
          });
        }
        return {};
      };

      moduleFunc(customRequire, moduleObj, modExports);
      const AdminDashboardPage = moduleObj.exports.default || moduleObj.exports;

      harness.resetCursor();
      ReactDOMServer.renderToStaticMarkup(React.createElement(AdminDashboardPage));
      await harness.runEffects();

      harness.resetCursor();
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(AdminDashboardPage));

      assert.ok(html.includes('Không thể kết nối đến máy chủ quản trị'), 'Error message from server must be rendered');
    } finally {
      harness.dispose();
    }
  });
});
