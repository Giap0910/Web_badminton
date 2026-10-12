import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformSync } from 'esbuild';
import React from 'react';

function createProfileHarness(initial, failLoad = false) {
  let state = [], index = 0, effects = [], saved = { ...initial }, calls = [];
  const user = { username: 'qa_storefront', fullName: 'Tài khoản kiểm tra' };
  const react = { ...React, useState(value) {
    const slot = index++; if (!(slot in state)) state[slot] = value;
    return [state[slot], next => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }];
  }, useRef(value) {
    const slot = index++; if (!(slot in state)) state[slot] = { current: value }; return state[slot];
  }, useEffect(effect) { const slot = index++; if (!(slot in state)) { state[slot] = true; effects.push(effect); } } };
  const api = { getProfile: async () => { if (failLoad) throw new Error('Mất kết nối'); return saved; }, updateProfile: async payload => {
    calls.push(payload); saved = { ...saved, ...payload }; return saved;
  } };
  const code = transformSync(fs.readFileSync(new URL('./ProfilePage.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  const module = { exports: {} };
  const load = name => name === 'react' ? react : name.includes('AuthContext') ? { useAuth: () => ({ user, setProfile() {} }) }
    : name.includes('userApi') ? { userApi: api }
    : name === 'lucide-react' ? Object.fromEntries('Camera Check Lock BadgeCheck History Eye EyeOff RotateCcw ShieldCheck RefreshCw PhoneCall Loader2 AlertCircle'.split(' ').map(key => [key, () => null]))
    : () => null;
  new Function('require', 'module', 'exports', 'setTimeout', code)(load, module, module.exports, () => 0);
  return { render() { index = 0; return module.exports.default(); },
    async load() { effects.splice(0).forEach(effect => effect()); await Promise.resolve(); await Promise.resolve(); },
    reset() { state = []; }, calls, saved: () => saved };
}
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  const children = React.Children.toArray(element.props?.children);
  return [element, ...children.flatMap(nodes)];
}
test('Ngày sinh gửi trong payload và giữ nguyên sau khi form được dựng lại', async () => {
  const harness = createProfileHarness({ fullName: 'Tài khoản kiểm tra', phone: '0901234567', dob: '2000-02-29' });
  harness.render(); await harness.load();
  let tree = nodes(harness.render());
  const date = tree.find(node => node.type === 'input' && node.props.type === 'date');
  assert.equal(date.props.value, '2000-02-29');
  date.props.onInput({ target: { value: '1999-12-31' } });
  tree = nodes(harness.render());
  await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(harness.calls[0], { fullName: 'Tài khoản kiểm tra', phone: '0901234567', dob: '1999-12-31' });
  harness.reset(); harness.render(); await harness.load();
  const reloadedDate = nodes(harness.render()).find(node => node.type === 'input' && node.props.type === 'date');
  assert.equal(reloadedDate.props.value, '1999-12-31');
});
test('Đang tải thì khóa ngày sinh và nút lưu; xóa ngày gửi null rõ ràng', async () => {
  const harness = createProfileHarness({ fullName: 'Kiểm tra', phone: '0901234567', dob: '2000-02-29' });
  const initial = nodes(harness.render());
  assert.equal(initial.find(node => node.type === 'input' && node.props.type === 'date').props.disabled, true);
  assert.equal(initial.find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  await harness.load();
  let tree = nodes(harness.render());
  const date = tree.find(node => node.type === 'input' && node.props.type === 'date');
  assert.equal(date.props.disabled, false);
  date.props.onInput({ target: { value: '' } });
  tree = nodes(harness.render());
  await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(harness.calls[0].dob, null);
});

test('Tải hồ sơ lỗi thì không được gửi form làm mất ngày sinh cũ', async () => {
  const harness = createProfileHarness({ fullName: 'Kiểm tra', phone: '0901234567', dob: '2000-02-29' }, true);
  harness.render(); await harness.load();
  const tree = nodes(harness.render());
  assert.equal(tree.find(node => node.type === 'input' && node.props.type === 'date').props.disabled, true);
  assert.equal(tree.find(node => node.type === 'button' && node.props.type === 'submit').props.disabled, true);
  await tree.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(harness.calls.length, 0);
  assert.equal(harness.saved().dob, '2000-02-29');
});
