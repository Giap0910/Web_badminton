import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

function bannerHarness(length = 4) {
  const cells = [], intervals = new Map(), pending = []; let index = 0, nextTimer = 0;
  const react = { useState(initial) {
    const slot = index++; if (!(slot in cells)) cells[slot] = initial;
    return [cells[slot], value => { cells[slot] = typeof value === 'function' ? value(cells[slot]) : value; }];
  }, useRef(initial) {
    const slot = index++; if (!(slot in cells)) cells[slot] = { current: initial }; return cells[slot];
  }, useEffect(fn, deps) {
    const slot = index++, previous = cells[slot];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) pending.push(() => {
      previous?.cleanup?.(); cells[slot] = { deps, cleanup: fn() };
    });
  } };
  const source = transformSync(fs.readFileSync(new URL('./useBannerCarousel.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', source)(() => react, module, module.exports,
    (fn, delay) => { intervals.set(++nextTimer, { fn, delay }); return nextTimer; }, id => intervals.delete(id));
  return { render() { index = 0; const result = module.exports.default(length); pending.splice(0).forEach(fn => fn()); return result; },
    tick() { intervals.values().next().value?.fn(); }, intervals };
}
function pointer(x, y = 0, extra = {}) {
  return { button: 0, pointerId: 3, clientX: x, clientY: y, pointerType: 'mouse', target: { closest: () => null },
    currentTarget: { setPointerCapture() {} }, preventDefault() {}, ...extra };
}
test('Kéo trái/phải chuyển đúng banner và không bị tự chuyển khi đang kéo', () => {
  const h = bannerHarness(); let view = h.render();
  view.handlers.onPointerDown(pointer(200)); view = h.render();
  assert.equal(view.dragging, true); assert.equal(h.intervals.size, 0);
  view.handlers.onPointerMove(pointer(100)); assert.equal(h.render().offset, -100);
  view.handlers.onPointerUp(pointer(100)); view = h.render();
  assert.equal(view.activeSlide, 1); assert.equal(view.dragging, false); assert.equal(h.intervals.size, 1);
  view.handlers.onPointerDown(pointer(200)); h.render();
  view.handlers.onPointerUp(pointer(300)); assert.equal(h.render().activeSlide, 0);
});
test('Tự chuyển mỗi sáu giây, quay vòng và tiếp tục sau khi hủy kéo', () => {
  const h = bannerHarness(); let view = h.render();
  assert.equal([...h.intervals.values()][0].delay, 6000);
  for (let i = 0; i < 4; i++) { h.tick(); view = h.render(); }
  assert.equal(view.activeSlide, 0);
  view.handlers.onPointerDown(pointer(100)); view = h.render(); h.tick();
  assert.equal(h.render().activeSlide, 0);
  view.handlers.onPointerCancel(); h.render(); h.tick();
  assert.equal(h.render().activeSlide, 1);
});
test('Kéo ngắn, cuộn dọc và chạm nút CTA không chuyển banner', () => {
  const h = bannerHarness(); let view = h.render();
  view.handlers.onPointerDown(pointer(100)); view.handlers.onPointerUp(pointer(130));
  assert.equal(h.render().activeSlide, 0);
  view.handlers.onPointerDown(pointer(100)); view.handlers.onPointerMove(pointer(105, 80));
  assert.equal(h.render().dragging, false); assert.equal(h.render().activeSlide, 0);
  view.handlers.onPointerDown(pointer(100, 0, { target: { closest: () => ({ tagName: 'A' }) } }));
  assert.equal(h.render().dragging, false);
});
test('Kéo không mở link; phím mũi tên hỗ trợ điều khiển và quay vòng', () => {
  const h = bannerHarness(); let view = h.render(), blocked = 0;
  view.handlers.onPointerDown(pointer(100)); view.handlers.onPointerUp(pointer(0));
  view.handlers.onClickCapture({ preventDefault() { blocked++; }, stopPropagation() {} });
  assert.equal(blocked, 1);
  view.handlers.onClickCapture({ preventDefault() { blocked++; }, stopPropagation() {} });
  assert.equal(blocked, 1);
  const target = {};
  view.handlers.onKeyDown({ key: 'ArrowLeft', target, currentTarget: target, preventDefault() {} });
  assert.equal(h.render().activeSlide, 0);
  view.handlers.onKeyDown({ key: 'ArrowLeft', target, currentTarget: target, preventDefault() {} });
  assert.equal(h.render().activeSlide, 3);
});
