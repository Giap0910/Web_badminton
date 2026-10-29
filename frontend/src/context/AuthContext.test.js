import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
const fixtureExpiry = Math.floor(Date.now()/1000)+3600;
const tokenFor = id => 'header.' + Buffer.from(JSON.stringify({ id, exp: fixtureExpiry })).toString('base64url') + '.signature';
const account = id => ({ id, username: String(id), fullName: 'Tài khoản ' + id, role: 'ROLE_USER', token: tokenFor(id) });
class TestEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
function createAuthHarness(savedToken = null, overrides = {}) {
  const cells = [], effects = [], storage = new Map(), responses = [], listeners = new Map(), timers = [], getMeCalls = [], logoutCalls = [], profileCalls = [];
  if (savedToken) storage.set('token', savedToken);
  let index = 0;
  const react = { ...React, useCallback: fn => fn, useState(initial) { const slot=index++; if (!(slot in cells)) cells[slot]=initial;
    return [cells[slot], value => { cells[slot]=typeof value==='function' ? value(cells[slot]) : value; }]; },
    useRef(initial) { const slot=index++; if (!(slot in cells)) cells[slot]={ current:initial }; return cells[slot]; },
    useEffect(fn, deps) { const slot=index++, old=cells[slot]; if (!old || deps.some((value,i)=>value!==old.deps[i]))
      effects.push(()=>{ old?.cleanup?.();cells[slot]={ deps,cleanup:fn() }; }); } };
  const api = { login: async ({username})=>account(Number(username)), register:async()=>account(3),
    getMe: token=>{ getMeCalls.push(token); return Promise.resolve(account(1)); },
    logout: token=>{ logoutCalls.push(token);return Promise.resolve({message:'Đã đăng xuất'}); }, ...overrides };
  const localStorage = { getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key) };
  const window = { addEventListener:(name,fn)=>listeners.set(name,fn), removeEventListener:name=>listeners.delete(name),
    dispatchEvent:event=>listeners.get(event.type)?.(event) };
  const module={exports:{}}, mocks={react,'../api/authApi':{authApi:api},'../api/userApi':{userApi:{getProfile:config=>{
    profileCalls.push(config); return new Promise((resolve,reject)=>{ resolve.reject=reject; responses.push(resolve); });
  }}}};
  const code=transformSync(fs.readFileSync(new URL('./AuthContext.jsx',import.meta.url),'utf8'),{loader:'jsx',format:'cjs'}).code;
  new Function('require','module','exports','localStorage','window','atob','setTimeout','clearTimeout','CustomEvent',code)
    (name=>mocks[name],module,module.exports,localStorage,window,atob,fn=>{timers.push(fn);return timers.length;},()=>{},TestEvent);
  return { render(){index=0;const value=module.exports.AuthProvider({children:null}).props.value;effects.splice(0).forEach(fn=>fn());return value;},
    responses,storage,api,getMeCalls,logoutCalls,profileCalls,timers,window,exports:module.exports,
    unmount(){cells.forEach(cell=>cell?.cleanup?.());} };
}

test('Tải lại điểm từ backend thay hồ sơ cũ, không trừ điểm khi chỉ xem checkout khác',async()=>{
  const h=createAuthHarness();h.render();await h.render().login('1','test');h.render();
  h.responses[0]({id:1,loyaltyPoints:0});await flush();assert.equal(h.render().profile.loyaltyPoints,0);
  const first=h.render().refreshProfile();h.responses[1]({id:1,loyaltyPoints:1});await first;
  assert.equal(h.render().profile.loyaltyPoints,1);
  const second=h.render().refreshProfile();h.responses[2]({id:1,loyaltyPoints:1});await second;
  assert.equal(h.render().profile.loyaltyPoints,1);
  assert.equal(h.profileCalls[2].headers.Authorization,'Bearer '+tokenFor(1));
});

test('Tải hồ sơ muộn không ghi đè số dư mới hoặc tài khoản đã chuyển',async()=>{
  const h=createAuthHarness();h.render();await h.render().login('1','test');h.render();
  const old=h.render().refreshProfile(),latest=h.render().refreshProfile();
  h.responses[2]({id:1,loyaltyPoints:30});await latest;
  h.responses[1]({id:1,loyaltyPoints:1});await old;
  h.responses[0]({id:1,loyaltyPoints:0});await flush();assert.equal(h.render().profile.loyaltyPoints,30);
  const prior=h.render().refreshProfile();await h.render().logout();await h.render().login('2','test');h.render();
  h.responses[3]({id:1,loyaltyPoints:999});await prior;assert.equal(h.render().profile,null);
});

test('Lỗi tải lại hồ sơ giữ số dư cũ, không giả thành 0; có thể thử lại',async()=>{
  const h=createAuthHarness();h.render();await h.render().login('1','test');h.render();
  h.responses[0]({id:1,loyaltyPoints:10});await flush();
  const failed=h.render().refreshProfile();h.responses[1].reject(new Error('Mất mạng'));
  await assert.rejects(failed);assert.equal(h.render().profile.loyaltyPoints,10);
  const retry=h.render().refreshProfile();h.responses[2]({id:1,loyaltyPoints:12});await retry;
  assert.equal(h.render().profile.loyaltyPoints,12);
});

test('Phản hồi hồ sơ và callback của phiên cũ không ghi đè tài khoản mới',async()=>{
  const h=createAuthHarness();let context=h.render();await context.login('1','test');const former=h.render();
  await former.logout();context=h.render();await context.login('2','test');context=h.render();
  former.setProfile({id:1,fullName:'Tài khoản cũ'});h.responses[0]({id:1});await flush();
  assert.equal(h.render().profile,null);assert.equal(h.render().user.id,2);
  h.responses[1]({id:2,loyaltyPoints:5});await flush();assert.equal(h.render().profile.loyaltyPoints,5);
  await h.render().logout();context.setProfile({id:2});assert.equal(h.render().profile,null);
});
test('GET me mạng/500/403 giữ JWT, khóa phiên và retry xác minh đúng tài khoản',async()=>{
  for(const status of [undefined,500,403]) {
    const failure=Object.assign(new Error('Lỗi kết nối'),{response:status ? {status}:undefined});
    const h=createAuthHarness(tokenFor(1),{getMe:async()=>{throw failure;}});h.render();await flush();
    let context=h.render();assert.equal(h.storage.get('token'),tokenFor(1));assert.equal(context.user,null);
    assert.equal(context.isAuthenticated,false);assert.match(context.verificationError,/Chưa xác minh/);
    h.api.getMe=async()=>account(1);await context.retryVerification();context=h.render();
    assert.equal(context.user.id,1);assert.equal(context.verificationError,'');assert.equal(context.isAuthenticated,true);
  }
});
test('GET me401 xóa JWT; kết quả GET cũ sau loginB không đổi tài khoảnB',async()=>{
  const invalid=createAuthHarness(tokenFor(1),{getMe:async()=>{throw {response:{status:401}};}});
  invalid.render();await flush();assert.equal(invalid.storage.has('token'),false);assert.equal(invalid.render().loading,false);
  const pending=deferred(),h=createAuthHarness(tokenFor(1),{getMe:()=>pending.promise});h.render();
  await h.render().login('2','test');pending.resolve(account(1));await flush();
  assert.equal(h.render().user.id,2);assert.equal(h.storage.get('token'),tokenFor(2));
});
test('LoginA trả muộn sau logout/loginB bị loại; không commit sau unmount',async()=>{
  const pending=deferred(),h=createAuthHarness(null,{login:({username})=>username==='1'?pending.promise:Promise.resolve(account(2))});
  h.render();const old=h.render().login('1','test').catch(error=>error);await h.render().logout();await h.render().login('2','test');
  pending.resolve(account(1));assert.ok(await old instanceof Error);assert.equal(h.render().user.id,2);
  const late=deferred(),removed=createAuthHarness(null,{login:()=>late.promise});removed.render();
  const call=removed.render().login('1','test').catch(error=>error);removed.unmount();late.resolve(account(1));
  assert.ok(await call instanceof Error);assert.equal(removed.storage.has('token'),false);
});
test('Logout chụp JWT trước clear; lỗi logoutA và expiryA không xóa hoặc báo sai phiênB',async()=>{
  const pending=deferred(),seen=[],h=createAuthHarness(null,{logout:token=>{seen.push(token);return pending.promise;}});
  h.render();await h.render().login('1','test');h.render();const oldExpiry=h.timers[0];
  const logout=h.render().logout();assert.equal(h.storage.has('token'),false);assert.equal(seen[0],tokenFor(1));
  await h.render().login('2','test');h.render();oldExpiry();assert.equal(h.render().user.id,2);
  pending.reject(new Error('Mất mạng'));await logout;
  assert.equal(h.render().user.id,2);assert.equal(h.render().sessionNotice,'');assert.equal(h.storage.get('token'),tokenFor(2));
});
test('Logout API lỗi vẫn xóa local và báo chưa thu hồi các phiên khác',async()=>{
  const h=createAuthHarness(null,{logout:async()=>{throw new Error('Mất mạng');}});h.render();await h.render().login('1','test');h.render();
  await h.render().logout();assert.equal(h.render().user,null);assert.equal(h.storage.has('token'),false);
  assert.match(h.render().sessionNotice,/chưa xác nhận thu hồi/);
});
test('Redirect chỉ nội bộ, chặn network path/backslash/C0/DEL và giữ state mua ngay',()=>{
  const {safeInternalRedirect,loginDestination}=createAuthHarness().exports;
  for(const input of ['https://external.invalid','//external.invalid','/\\external.invalid','/\t/external.invalid','/\u0000/a','/\u007f/a','/login','/register?redirect=/checkout'])
    assert.equal(safeInternalRedirect(input),'/');
  assert.equal(safeInternalRedirect('/products/10?color=red#review-3'),'/products/10?color=red#review-3');
  assert.deepEqual(loginDestination({search:'',state:{from:'/checkout',returnState:{selectedItemIds:['v-11']}}}),
    {path:'/checkout',state:{selectedItemIds:['v-11']}});
});
function axiosHarness() {
  const storage=new Map([['token','token-B']]),events=[],interceptors={},module={exports:{}};
  const instance={interceptors:{request:{use:fn=>interceptors.request=fn},response:{use:(ok,bad)=>interceptors.error=bad}}};
  const source=fs.readFileSync(new URL('../api/axiosClient.js',import.meta.url),'utf8').replace('import.meta.env?.VITE_API_BASE_URL','undefined');
  const code=transformSync(source,{format:'cjs'}).code;
  new Function('require','module','exports','localStorage','window','CustomEvent',code)
    (name=>({create:()=>instance}),module,module.exports,{getItem:key=>storage.get(key),removeItem:key=>storage.delete(key)},
      {dispatchEvent:event=>events.push(event)},TestEvent);
  return {storage,events,...interceptors};
}
test('Axios giữ Authorization explicit cả lowercase/AxiosHeaders;401 cũ không xóaJWT mới',async()=>{
  const h=axiosHarness();for(const headers of [{Authorization:'Bearer token-A'},{authorization:'Bearer token-A'},
    {get:name=>name==='Authorization'?'Bearer token-A':null}]) {
    assert.equal(h.request({headers}).headers,headers);
    await assert.rejects(h.error({response:{status:401},config:{headers}}));assert.equal(h.storage.get('token'),'token-B');
  }
  await assert.rejects(h.error({response:{status:401},config:{headers:{authorization:'Bearer token-B'}}}));
  assert.equal(h.storage.has('token'),false);assert.equal(h.events[0].detail.token,'token-B');
});
test('AuthApi logout/getMe dùng Authorization token đã chụp',async()=>{
  const calls=[],module={exports:{}},code=transformSync(fs.readFileSync(new URL('../api/authApi.js',import.meta.url),'utf8'),{format:'cjs'}).code;
  new Function('require','module','exports',code)(()=>({get:(...args)=>calls.push(['GET',...args]),post:(...args)=>calls.push(['POST',...args])}),module,module.exports);
  await module.exports.authApi.logout('token-A');await module.exports.authApi.getMe('token-A');
  assert.deepEqual(calls[0],['POST','/auth/logout',{}, {headers:{Authorization:'Bearer token-A'}}]);
  assert.deepEqual(calls[1],['GET','/auth/me',{headers:{Authorization:'Bearer token-A'}}]);
});

test('Guard production giữ redirect/state, khóa lỗi xác minh và remount theo userid',()=>{
  const source=fs.readFileSync(new URL('../App.jsx',import.meta.url),'utf8');
  const snippet=source.slice(source.indexOf('export const AdminRoute'),source.indexOf('function AppContent'));
  const code=transformSync(snippet,{loader:'jsx',format:'cjs'}).code;
  let auth,location={pathname:'/checkout',search:'?test=1',state:{selectedItemIds:['v-11']}};
  const module={exports:{}},Navigate=()=>null,PageFallbackLoader=()=>null,AdminPageBoundary=()=>null;
  new Function('module','exports','React','useAuth','useLocation','Navigate','PageFallbackLoader','AdminPageBoundary',code)
    (module,module.exports,React,()=>auth,()=>location,Navigate,PageFallbackLoader,AdminPageBoundary);
  auth={loading:false,isAuthenticated:false};let view=module.exports.PrivateRoute({children:'bí mật'});
  assert.equal(view.type,Navigate);assert.deepEqual(view.props.state,{from:'/checkout?test=1',returnState:{selectedItemIds:['v-11']}});
  auth={loading:false,isAuthenticated:false,verificationError:'Không xác minh',retryVerification(){}};
  view=module.exports.PrivateRoute({children:'bí mật'});assert.equal(view.type,module.exports.SessionVerificationError);assert.equal(view.props.children,undefined);
  auth={loading:false,isAuthenticated:true,user:{id:7},isAdmin:true};view=module.exports.PrivateRoute({children:'bí mật'});assert.equal(view.key,'7');
  auth.user={id:8};assert.equal(module.exports.PrivateRoute({children:'bí mật'}).key,'8');assert.equal(module.exports.AdminRoute({children:'quản trị'}).key,'8');
  auth.isAdmin=false;assert.equal(module.exports.AdminRoute({children:'quản trị'}).props.role,'alert');
});

test('Login/Register production handlers đều giữ destination/state và chốngnhấpđúp',async()=>{
  const helper=createAuthHarness().exports,location={search:'',state:{from:'/checkout',returnState:{selectedItemIds:['v-11']}}};
  for(const page of ['LoginPage.jsx','RegisterPage.jsx']) for(const handler of ['handleLoginSubmit','handleRegisterSubmit']) {
    const source=fs.readFileSync(new URL('../pages/'+page,import.meta.url),'utf8');
    const match=source.match(new RegExp('const '+handler+' = async \\(e\\) => \\{([\\s\\S]*?)\\n  \\};'));assert.ok(match);
    let resolve,calls=0;const pending=new Promise(yes=>resolve=yes),navigation=[];
    const scope={submissionLock:{current:false},mounted:{current:true},loginIdentifier:'Phong',loginPassword:'secret',
      registerIdentifier:'phong@example.invalid',registerFullName:'Phong',registerPassword:'secret',registerPasswordConfirm:'secret',agreeTerms:true,
      destination:helper.loginDestination(location),setErrorMsg(){},setSuccessMsg(){},setSubmitting(){},
      login:async()=>{calls++;return pending;},register:async()=>{calls++;return pending;},navigate:(...args)=>navigation.push(args)};
    const submit=new Function(...Object.keys(scope),'return async e=>{'+match[1]+'}')( ...Object.values(scope));
    const first=submit({preventDefault(){}}),second=submit({preventDefault(){}});assert.equal(calls,1);resolve(account(1));await first;await second;
    assert.deepEqual(navigation,[['/checkout',{state:{selectedItemIds:['v-11']},replace:true}]]);
  }
});

test('Thay tài khoản ởtabkhác khóaowner cũ và xácminhJWT mới; expirycũ không xóaJWT mới',async()=>{
  const h=createAuthHarness();h.render();await h.render().login('1','test');h.render();const expiryA=h.timers[0];
  h.storage.set('token',tokenFor(2));expiryA();assert.equal(h.storage.get('token'),tokenFor(2));
  h.api.getMe=async token=>{assert.equal(token,tokenFor(2));return account(2);};
  h.window.dispatchEvent({type:'storage',key:'token'});assert.equal(h.render().loading,true);assert.equal(h.render().user,null);
  await flush();assert.equal(h.render().user.id,2);assert.equal(h.render().isAuthenticated,true);
});
