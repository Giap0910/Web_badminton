import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderItemOptions, getOrderItemOptions, formatOrderItemOptionsText } from '../utils/orderItemOptions.js';

describe('DEMO-FINAL-01: Product Variant Color in Order Details Remediation', () => {

  // =========================================================================
  // SECTION 1: Order #141 Equivalent Fixture & Option Extraction Logic
  // =========================================================================
  describe('1. Order #141 Fixture & Options Extraction Matrix', () => {
    
    test('Critical Test: Order #141 equivalent fixture extracts BOTH weightGrip (4U-G5) and selectedColor (Blue)', () => {
      const order141Item = {
        id: 14101,
        productName: 'Vợt Cầu Lông Yonex Astrox 100ZZ',
        weightGrip: '4U-G5',
        selectedColor: 'Blue',
        quantity: 1,
        price: 4350000
      };

      const options = getOrderItemOptions(order141Item);
      assert.equal(options.length, 2, 'Must extract exactly 2 options');
      
      const weightOpt = options.find((o) => o.type === 'weight');
      const colorOpt = options.find((o) => o.type === 'color');

      assert.ok(weightOpt, 'Must have weight option');
      assert.equal(weightOpt.label, '4U-G5', 'Weight must be 4U-G5');

      assert.ok(colorOpt, 'Must have color option');
      assert.equal(colorOpt.label, 'Blue', 'Color must be Blue');

      const textSummary = formatOrderItemOptionsText(order141Item);
      assert.ok(textSummary.includes('4U-G5'), 'Summary must contain 4U-G5');
      assert.ok(textSummary.includes('Blue'), 'Summary must contain Blue');
    });

    test('Case 1: Product with weight only', () => {
      const item = { productName: 'Vợt Yonex 88D Pro', selectedWeight: '3U-G5' };
      const options = getOrderItemOptions(item);
      assert.equal(options.length, 1);
      assert.equal(options[0].type, 'weight');
      assert.equal(options[0].label, '3U-G5');
      assert.equal(formatOrderItemOptionsText(item), '3U-G5');
    });

    test('Case 2: Product with color only', () => {
      const item = { productName: 'Băng chặn mồ hôi Yonex AC488', selectedColor: 'Đen (Black)' };
      const options = getOrderItemOptions(item);
      assert.equal(options.length, 1);
      assert.equal(options[0].type, 'color');
      assert.equal(options[0].label, 'Đen (Black)');
      assert.equal(formatOrderItemOptionsText(item), 'Đen (Black)');
    });

    test('Case 3: Product with weight + color + size + stringingService', () => {
      const item = {
        productName: 'Combo Vợt Đan Cước',
        weightGrip: '4U-G5',
        selectedColor: 'Blue',
        selectedSize: 'L',
        stringingService: 'BG65',
        stringTension: '10.5kg'
      };
      const options = getOrderItemOptions(item);
      assert.equal(options.length, 4);
      assert.ok(options.some((o) => o.label === '4U-G5'));
      assert.ok(options.some((o) => o.label === 'Blue'));
      assert.ok(options.some((o) => o.label === 'Size: L'));
      assert.ok(options.some((o) => o.label === 'BG65 (10.5kg)'));
    });

    test('Case 4: Product without options returns empty array and fallback', () => {
      const item = { productName: 'Ống cầu Yonex Aerosensa 50' };
      const options = getOrderItemOptions(item);
      assert.equal(options.length, 0);
      assert.equal(formatOrderItemOptionsText(item, 'Tiêu chuẩn'), 'Tiêu chuẩn');
    });

    test('Case 5: Multi-item order with diverse options does not cross-pollinate', () => {
      const itemA = { id: 1, weightGrip: '4U-G5', selectedColor: 'Blue' };
      const itemB = { id: 2, selectedColor: 'Red', selectedSize: '42' };
      const itemC = { id: 3, productName: 'Quấn cán', color: 'Yellow' };

      const optsA = getOrderItemOptions(itemA);
      const optsB = getOrderItemOptions(itemB);
      const optsC = getOrderItemOptions(itemC);

      assert.equal(optsA.length, 2);
      assert.ok(optsA.some((o) => o.label === '4U-G5') && optsA.some((o) => o.label === 'Blue'));

      assert.equal(optsB.length, 2);
      assert.ok(optsB.some((o) => o.label === 'Red') && optsB.some((o) => o.label === 'Size: 42'));

      assert.equal(optsC.length, 1);
      assert.ok(optsC.some((o) => o.label === 'Yellow'));
    });

    test('Case 6: Safeguard against [object Object], undefined, null string rendering', () => {
      const badItem = {
        selectedWeight: null,
        selectedColor: undefined,
        color: '   ',
        selectedSize: { invalid: true },
        stringingService: null
      };
      const options = getOrderItemOptions(badItem);
      assert.equal(options.length, 0, 'Must safely ignore invalid/empty types');
      const text = formatOrderItemOptionsText(badItem, 'Mặc định');
      assert.equal(text, 'Mặc định');
      assert.ok(!text.includes('[object Object]'));
      assert.ok(!text.includes('undefined'));
      assert.ok(!text.includes('null'));
    });
  });

  // =========================================================================
  // SECTION 2: React Component Rendering Verification
  // =========================================================================
  describe('2. OrderItemOptions Component HTML Rendering', () => {
    test('Renders both 4U-G5 and Blue as distinct HTML badges for Order #141 fixture', () => {
      const order141Item = {
        productName: 'Vợt Cầu Lông Yonex Astrox 100ZZ',
        weightGrip: '4U-G5',
        selectedColor: 'Blue'
      };

      const html = renderToStaticMarkup(React.createElement(OrderItemOptions, { item: order141Item }));
      assert.ok(html.includes('4U-G5'), 'Rendered HTML must contain 4U-G5');
      assert.ok(html.includes('Blue'), 'Rendered HTML must contain Blue');
      assert.ok(html.includes('bg-slate-100'), 'Must render with badge styling');
    });

    test('Returns null / empty HTML when item has no options', () => {
      const plainItem = { productName: 'Phụ kiện thường' };
      const html = renderToStaticMarkup(React.createElement(OrderItemOptions, { item: plainItem }));
      assert.equal(html, '', 'Must render empty HTML when no options exist');
    });
  });

  // =========================================================================
  // SECTION 3: Codebase Integration across the 3 Order Detail Surfaces
  // =========================================================================
  describe('3. Integration in MyOrdersPage, AdminOrdersPage and OrderDetailPage', () => {
    const myOrdersPath = path.resolve('src/pages/MyOrdersPage.jsx');
    const adminOrdersPath = path.resolve('src/pages/AdminOrdersPage.jsx');
    const orderDetailPath = path.resolve('src/pages/OrderDetailPage.jsx');

    test('MyOrdersPage imports and renders OrderItemOptions in modal and summary', () => {
      const content = fs.readFileSync(myOrdersPath, 'utf8');
      assert.ok(content.includes("OrderItemOptions"), 'Must import and use OrderItemOptions');
      assert.ok(content.includes('<OrderItemOptions item={it} />'), 'Must render OrderItemOptions for each item in modal');
      assert.ok(content.includes('formatOrderItemOptionsText('), 'Must format techString with formatOrderItemOptionsText');
      // Must not use old single-spec fallback that truncated color
      assert.ok(!content.includes("it.selectedWeight || it.weightGrip || it.selectedSize || it.selectedColor"), 'Old truncated fallback must be removed');
    });

    test('AdminOrdersPage imports and renders OrderItemOptions in modal and summary', () => {
      const content = fs.readFileSync(adminOrdersPath, 'utf8');
      assert.ok(content.includes("OrderItemOptions"), 'Must import and use OrderItemOptions');
      assert.ok(content.includes('<OrderItemOptions item={it} />'), 'Must render OrderItemOptions for each item in modal');
      assert.ok(content.includes('formatOrderItemOptionsText('), 'Must format techStr with formatOrderItemOptionsText');
      assert.ok(!content.includes("it.selectedWeight || it.weightGrip || it.selectedSize || it.selectedColor"), 'Old truncated fallback must be removed');
    });

    test('OrderDetailPage imports and renders OrderItemOptions for items table', () => {
      const content = fs.readFileSync(orderDetailPath, 'utf8');
      assert.ok(content.includes("OrderItemOptions"), 'Must import and use OrderItemOptions');
      assert.ok(content.includes('<OrderItemOptions item={item} />'), 'Must render OrderItemOptions in items table');
    });
  });
});
