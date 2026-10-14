import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformSync } from 'esbuild';
import React from 'react';

function createProfileHarness(initial, failLoad = false, overrides = {}) {
  let state = [], index = 0, effects = [], saved = { ...initial }, calls = [], navigation = [], cleared = 0;
  const user = { username: 'qa_storefront', fullName: 'Tài khoản kiểm tra' };
  const react = { ...React, useState(value) {
    const slot = index++; if (!(slot in state)) state[slot] = value;
    return [state[slot], next => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }];
  }, useRef(value) {
    const slot = index++; if (!(slot in state)) state[slot] = { current: value }; return state[slot];
  }, useEffect(effect) { const slot = index++; if (!(slot in state)) { state[slot] = {}; effects.push(() => { state[slot].cleanup = effect(); }); } } };
  const api = { getProfile: async () => { if (failLoad) throw new Error('Mất kết nối'); return saved; }, updateProfile: async payload => {
    calls.push(payload); saved = { ...saved, ...payload }; return saved;
  }, changePassword: async () => ({ message: 'Đã đổi mật khẩu' }), ...overrides };
  const code = transformSync(fs.readFileSync(new URL('./ProfilePage.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs' }).code;
  const module = { exports: {} };
  const load = name => name === 'react' ? react : name === 'react-router-dom' ? { useNavigate: () => (...args) => navigation.push(args) }
    : name.includes('AuthContext') ? { useAuth: () => ({ user, token: 'token-A', setProfile() {}, clearLocalSession() { cleared++; } }) }
    : name.includes('userApi') ? { userApi: api }
    : name === 'lucide-react' ? Object.fromEntries('Camera Check Lock BadgeCheck History Eye EyeOff RotateCcw ShieldCheck RefreshCw PhoneCall Loader2 AlertCircle'.split(' ').map(key => [key, () => null]))
    : () => null;
  new Function('require', 'module', 'exports', 'setTimeout', code)(load, module, module.exports, () => 0);
  return { render() { index = 0; return module.exports.default(); },
    async load() { effects.splice(0).forEach(effect => effect()); await Promise.resolve(); await Promise.resolve(); },
    reset() { state.forEach(cell => cell?.cleanup?.()); state = []; },
    unmount() { state.forEach(cell => cell?.cleanup?.()); }, calls, saved: () => saved, navigation, cleared: () => cleared };
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
  assert.deepEqual(harness.calls[0], { fullName: 'Tài khoản kiểm tra', phone: '0901234567', dob: '1999-12-31', gender: null });
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

test('Giới tính nullable giữ nguyên sau reload, thay đổi đúng canonical và xóa explicitnull', async () => {
  const h=createProfileHarness({fullName:'Phong',phone:'0901234567',dob:null,gender:'nu'});h.render();await h.load();
  let tree=nodes(h.render());assert.equal(tree.find(node=>node.type==='input'&&node.props.name==='gender'&&node.props.value==='nu').props.checked,true);
  tree.find(node=>node.type==='input'&&node.props.name==='gender'&&node.props.value==='khac').props.onChange();
  await nodes(h.render()).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});assert.equal(h.saved().gender,'khac');
  h.reset();h.render();await h.load();tree=nodes(h.render());
  assert.equal(tree.find(node=>node.type==='input'&&node.props.name==='gender'&&node.props.value==='khac').props.checked,true);
  tree.find(node=>node.type==='input'&&node.props.name==='gender'&&node.props.value==='').props.onChange();
  await nodes(h.render()).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});assert.equal(h.saved().gender,null);
});
test('Đổi mật khẩu thành công clearlocal và chuyểnlogin với thông báo thu hồi phiên',async()=>{
  const h=createProfileHarness({fullName:'Phong',phone:'0901234567'});h.render();await h.load();
  let tree=nodes(h.render()),passwords=tree.filter(node=>node.type==='input'&&node.props.type==='password');
  passwords[0].props.onChange({target:{value:'oldpass'}});passwords[1].props.onChange({target:{value:'newpass'}});passwords[2].props.onChange({target:{value:'newpass'}});
  tree=nodes(h.render());await tree.filter(node=>node.type==='form')[1].props.onSubmit({preventDefault(){}});
  assert.equal(h.cleared(),1);assert.equal(h.navigation[0][0],'/login');assert.match(h.navigation[0][1].state.message,/thu hồi mọi phiên/);
});
test('Profile không hứa xác thực điện thoại hoặc bảng xếp hạng khi Backend chưa có',()=>{
  const source=fs.readFileSync(new URL('./ProfilePage.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/Đã xác thực|bảng xếp hạng/);
});
test('Địa chỉ thật gửi note/tag canonical hoặc null, không thêm quận huyện',async()=>{
  const source=fs.readFileSync(new URL('./ShippingAddressPage.jsx',import.meta.url),'utf8');
  const match=source.match(/const handleSaveAddress = async \(e\) => \{([\s\S]*?)\n  \};/);assert.ok(match);
  for(const values of [{formNote:' Gọi trước ',formTag:'Khác'},{formNote:'',formTag:''}]) {
    let payload,config;const scope={saveLock:{current:false},mounted:{current:true},requestConfig:{headers:{Authorization:'Bearer token-A'}},saving:false,formName:'Phong',formPhone:'0901234567',formDetail:'Số 1',formWard:'Xã Quốc Oai',formCity:'Hà Nội',provinceCode:'01',wardCode:'001',formIsDefault:false,editingId:null,...values,
      setSaving(){},setMessage(){},setShowForm(){},fetchAddresses:async()=>{},setTimeout:()=>0,
      shippingAddressApi:{createAddress:async(data,options)=>{payload=data;config=options;}}};
    const save=new Function(...Object.keys(scope),'return async e=>{'+match[1]+'}')( ...Object.values(scope));
    await save({preventDefault(){}});assert.equal(payload.note,values.formNote.trim()||null);assert.equal(payload.tag,values.formTag||null);
    assert.equal(config.headers.Authorization,'Bearer token-A');
    assert.equal(Object.hasOwn(payload,'district'),false);
  }
  assert.match(source,/<option value="Khác">/);assert.doesNotMatch(source,/<option value="Sân cầu lông">/);
});

test('Password response sauunmount không logoutaccountmới; request giữAuthorizationđãchụp',async()=>{
  let resolve,config;const pending=new Promise(yes=>resolve=yes);
  const h=createProfileHarness({fullName:'Phong'},false,{changePassword:async(body,options)=>{config=options;return pending;}});
  h.render();await h.load();let tree=nodes(h.render()),passwords=tree.filter(node=>node.type==='input'&&node.props.type==='password');
  passwords[0].props.onChange({target:{value:'oldpass'}});passwords[1].props.onChange({target:{value:'newpass'}});passwords[2].props.onChange({target:{value:'newpass'}});
  const call=nodes(h.render()).filter(node=>node.type==='form')[1].props.onSubmit({preventDefault(){}});h.unmount();resolve({message:'Đã đổi'});await call;
  assert.equal(config.headers.Authorization,'Bearer token-A');assert.equal(h.cleared(),0);assert.deepEqual(h.navigation,[]);
});
