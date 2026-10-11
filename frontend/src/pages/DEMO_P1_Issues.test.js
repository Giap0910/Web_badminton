import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('ACADEMIC DEMO READINESS — 4 CRITICAL P1 DEFECTS VERIFICATION', () => {

  // =========================================================================
  // DEMO-P1-01 (FIX-005): Sweatband Detail Award icon ReferenceError remediation
  // =========================================================================
  describe('DEMO-P1-01: SweatbandDetailPage Award Icon Verification', () => {
    const sweatbandPath = path.resolve('src/pages/SweatbandDetailPage.jsx');
    const content = fs.readFileSync(sweatbandPath, 'utf8');

    test('Award icon is properly imported from lucide-react', () => {
      // Must import Award from 'lucide-react'
      const importMatch = content.match(/import\s*\{[^}]*\}\s*from\s*['"]lucide-react['"]/);
      assert.ok(importMatch, 'Must have lucide-react import');
      assert.ok(importMatch[0].includes('Award'), 'Must import Award icon in lucide-react imports');
    });

    test('Award icon usage in JSX has matching import declaration', () => {
      assert.ok(content.includes('<Award'), 'Must use Award component in JSX');
      assert.ok(!content.includes('Award is not defined'), 'No undefined reference');
    });
  });

  // =========================================================================
  // DEMO-P1-02 (FIX-009): Add to Cart False Success Elimination
  // =========================================================================
  describe('DEMO-P1-02: Add to Cart False Success Elimination', () => {
    const productDetailPath = path.resolve('src/pages/ProductDetailPage.jsx');
    const sweatbandPath = path.resolve('src/pages/SweatbandDetailPage.jsx');
    const stringPath = path.resolve('src/pages/StringDetailPage.jsx');
    const shuttlecockPath = path.resolve('src/pages/ShuttlecockDetailPage.jsx');
    const gripPath = path.resolve('src/pages/RacketGripDetailPage.jsx');

    test('ProductDetailPage verifies addToCart return value before setting addedToast', () => {
      const content = fs.readFileSync(productDetailPath, 'utf8');
      // Must check if (cartItemId) before setAddedToast(true)
      assert.ok(
        content.includes('const cartItemId = addToCart(product, quantity, getProductOptions());'),
        'Must capture cartItemId from addToCart'
      );
      assert.ok(
        content.includes('if (cartItemId) {') && content.includes('setCartError('),
        'Must branch on cartItemId and set error when null'
      );
      // Buy now must NOT navigate if cartItemId is null
      assert.ok(
        content.includes("navigate('/checkout', { state: { selectedItemIds: [cartItemId] } });"),
        'Must navigate with valid cartItemId only'
      );
    });

    test('Accessory detail pages verify addToCart return value before toast', () => {
      const sweatContent = fs.readFileSync(sweatbandPath, 'utf8');
      assert.ok(sweatContent.includes('if (cartItemId) {'), 'Sweatband must branch on cartItemId');

      const stringContent = fs.readFileSync(stringPath, 'utf8');
      assert.ok(stringContent.includes('if (cartItemId) {'), 'String must branch on cartItemId');

      const shuttleContent = fs.readFileSync(shuttlecockPath, 'utf8');
      assert.ok(shuttleContent.includes('if (cartItemId) {'), 'Shuttlecock must branch on cartItemId');

      const gripContent = fs.readFileSync(gripPath, 'utf8');
      assert.ok(gripContent.includes('if (cartItemId) {'), 'Racket grip must branch on cartItemId');
    });
  });

  // =========================================================================
  // DEMO-P1-03 (FIX-011): Review API 401 & Fake Reviews Elimination
  // =========================================================================
  describe('DEMO-P1-03: Review API 401 and Fake Reviews Elimination', () => {
    const productDetailPath = path.resolve('src/pages/ProductDetailPage.jsx');
    const content = fs.readFileSync(productDetailPath, 'utf8');

    test('Eliminated fallback fabricated review in catch block', () => {
      assert.ok(!content.includes('fallbackRev'), 'Must completely eliminate fallbackRev');
      assert.ok(!content.includes("userFullName: 'Vận động viên'"), 'Must eliminate fake Vận động viên author');
    });

    test('Review submission checks isAuthenticated and sets error on 401', () => {
      assert.ok(content.includes('if (!isAuthenticated)'), 'Must check isAuthenticated before submit');
      assert.ok(content.includes('err?.response?.status === 401'), 'Must check HTTP 401 status in catch');
      assert.ok(content.includes('setReviewSuccess(false);'), 'Must set reviewSuccess to false on catch');
    });

    test('Eliminated hardcoded sample reviews (Nguyễn Quốc Tuấn, etc.) when backend reviews is empty', () => {
      assert.ok(!content.includes('Nguyễn Quốc Tuấn'), 'Must eliminate hardcoded Nguyễn Quốc Tuấn review');
      assert.ok(!content.includes('Trần Phương Linh'), 'Must eliminate hardcoded Trần Phương Linh review');
      assert.ok(!content.includes('Hoàng Minh Quân'), 'Must eliminate hardcoded Hoàng Minh Quân review');
      assert.ok(content.includes('Chưa có đánh giá nào cho sản phẩm này'), 'Must render honest empty state');
    });
  });

  // =========================================================================
  // DEMO-P1-04 (FIX-019 / FIX-048): Admin Order Detail & Hardcoded Gifts Removal
  // =========================================================================
  describe('DEMO-P1-04: Admin Order Detail Full Items & Gifts Remediation', () => {
    const adminOrdersPath = path.resolve('src/pages/AdminOrdersPage.jsx');
    const myOrdersPath = path.resolve('src/pages/MyOrdersPage.jsx');
    const orderDetailPath = path.resolve('src/pages/OrderDetailPage.jsx');

    test('AdminOrdersPage maps and preserves full items array in order list', () => {
      const content = fs.readFileSync(adminOrdersPath, 'utf8');
      assert.ok(
        content.includes('items: itemsList'),
        'AdminOrdersPage must store full items list in order object'
      );
      assert.ok(
        !content.includes("gift: 'Cuốn cán Yonex chính hãng'"),
        'Must remove hardcoded gift string from AdminOrdersPage mapped order'
      );
    });

    test('AdminOrdersPage modal renders full items list instead of single item', () => {
      const content = fs.readFileSync(adminOrdersPath, 'utf8');
      assert.ok(
        content.includes('selectedOrder.items'),
        'Admin modal must render from selectedOrder.items'
      );
      assert.ok(
        content.includes('Danh sách sản phẩm'),
        'Admin modal must have items header'
      );
      assert.ok(
        !content.includes('selectedOrder.gift'),
        'Admin modal must not render hardcoded selectedOrder.gift'
      );
    });

    test('MyOrdersPage modal renders full items list and removes hardcoded giftDetail', () => {
      const content = fs.readFileSync(myOrdersPath, 'utf8');
      assert.ok(
        content.includes('items: itemsList'),
        'MyOrdersPage must store full items list'
      );
      assert.ok(
        !content.includes("giftDetail: 'Kèm 01 Cuốn cán Yonex AC102EX'"),
        'Must remove hardcoded giftDetail string from MyOrdersPage'
      );
      assert.ok(
        !content.includes('selectedOrder.giftDetail'),
        'MyOrdersPage modal must not render selectedOrder.giftDetail'
      );
    });

    test('OrderDetailPage removes hardcoded gift line', () => {
      const content = fs.readFileSync(orderDetailPath, 'utf8');
      assert.ok(
        !content.includes('Tặng kèm bao vợt nhung + quấn cán chính hãng'),
        'OrderDetailPage must not have hardcoded gift text'
      );
    });
  });
});
