import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

function createAuthHarness() {
  const cells = [], pending = [], storage = new Map(), responses = []; let index = 0;
  const react = { ...React, useState(initial) {
    const slot = index++; if (!(slot in cells)) cells[slot] = initial;
    return [cells[slot], value => { cells[slot] = typeof value === 'function' ? value(cells[slot]) : value; }];
  }, useRef(initial) {
    const slot = index++; if (!(slot in cells)) cells[slot] = { current: initial }; return cells[slot];
  }, useEffect(fn, deps) {
    const slot = index++, old = cells[slot];
    if (!old || deps.some((value, i) => value !== old.deps[i])) pending.push(() => {
      old?.cleanup?.(); cells[slot] = { deps, cleanup: fn() };
    });
  } };
  const api = { login: async ({ username }) => {
    const id = Number(username), payload = Buffer.from(JSON.stringify({ id, exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url');
    return { id, username, fullName: 'Tài khoản ' + id, role: 'ROLE_USER', token: 'header.' + payload + '.signature' };
  } };
  return compileAuth({ react, api, storage, responses, pending, reset: () => { index = 0; } });
}
function compileAuth({ react, api, storage, responses, pending, reset }) {
  const module = { exports: {} }, mocks = { react, '../api/authApi': { authApi: api },
    '../api/userApi': { userApi: { getProfile: () => new Promise(resolve => responses.push(resolve)) } } };
  const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  const code = transformSync(fs.readFileSync(new URL('./AuthContext.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  new Function('require', 'module', 'exports', 'localStorage', 'window', 'atob', 'setTimeout', 'clearTimeout', code)
    (name => mocks[name], module, module.exports, localStorage, window, atob, () => 1, () => {});
  return { render() { reset(); const value = module.exports.AuthProvider({ children: null }).props.value; pending.splice(0).forEach(fn => fn()); return value; }, responses };
}
test('Phản hồi hồ sơ và callback của phiên cũ không ghi đè tài khoản mới', async () => {
  const h = createAuthHarness(); let context = h.render();
  await context.login('1', 'test'); const former = h.render();
  former.logout(); context = h.render();
  await context.login('2', 'test'); context = h.render();
  former.setProfile({ id: 1, fullName: 'Tài khoản cũ' });
  h.responses[0]({ id: 1, fullName: 'Phản hồi cũ' }); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.render().profile, null);
  assert.equal(h.render().user.id, 2);
  h.responses[1]({ id: 2, fullName: 'Tài khoản mới', loyaltyPoints: 5 }); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.render().profile.id, 2);
  assert.equal(h.render().profile.loyaltyPoints, 5);
  h.render().logout();
  context.setProfile({ id: 2, fullName: 'Phản hồi sau đăng xuất' });
  assert.equal(h.render().profile, null);
  context.setProfile({ fullName: 'Phản hồi thiếu ID' });
  assert.equal(h.render().profile, null);
});
