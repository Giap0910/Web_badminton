import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { transformSync } from 'esbuild';
import fs from 'node:fs';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => server.close());
const banner = await server.ssrLoadModule('/src/components/AdminBannerImages.jsx');
const tools = await server.ssrLoadModule('/src/api/bannerApi.jsx');
const images = await server.ssrLoadModule('/src/components/AdminProductImages.jsx');
const { default: axios } = await server.ssrLoadModule('/src/api/axiosClient.js');
const url = position => `/api/media/banners/${position}/11111111-2222-3333-4444-555555555555.png`;
const ready = position => ({ position, url: url(position), status: 'READY' });
const file = () => new File([new Uint8Array([1, 2])], 'banner.png', { type: 'image/png' });

test('Quản trị có đúng 4 vị trí và nút chọn/lưu từng banner; không mở nhập khóa hoặc nội dung chính sách', () => {
  const html = renderToStaticMarkup(React.createElement(banner.default));
  assert.equal((html.match(/type="file"/g) || []).length, 4);
  for (let i = 1; i <= 4; i++) { assert.match(html, new RegExp(`banner-image-${i}`)); assert.match(html, new RegExp(`Lưu banner ${i}`)); }
  assert.match(html, /1600/); assert.match(html, /5 MB/); assert.match(html, /quyền sử dụng/);
  assert.doesNotMatch(html, /type="password"|API_KEY/);
});

test('Danh sách phải đủ 4 vị trí duy nhất, không nhận URL bên ngoài hoặc ảnh thuộc slot khác', () => {
  const reverse = [ready(4), ready(3), ready(2), ready(1)];
  assert.deepEqual(tools.normalizeBannerSlots(reverse).map(slot => slot.position), [1,2,3,4]);
  for (const data of [[], [ready(1),ready(1),ready(3),ready(4)], [ready(1),ready(2),ready(3),ready(5)]])
    assert.throws(() => tools.normalizeBannerSlots(data));
  assert.throws(() => tools.normalizeBannerSlot({ ...ready(1), url: 'https://outside.test/a.png' }));
  assert.throws(() => tools.normalizeBannerSlot({ ...ready(1), url: url(2) }));
  assert.throws(() => tools.normalizeBannerSlot({ ...ready(1), status: 'UPDATING' }));
  assert.equal(tools.bannerImageSource(url(2)), 'http://localhost:8080' + url(2));
  assert.equal(tools.bannerImageSource('javascript:alert(1)'), null);
});

test('API tải ảnh dùng đúng multipart và vị trí; chỉ xác nhận khi máy chủ trả READY đúng vị trí', async () => {
  const old = axios.put; const calls = [];
  axios.put = async (...args) => { calls.push(args); return ready(3); };
  try {
    const result = await tools.bannerApi.upload(3, file(), true);
    assert.equal(result.position, 3); assert.equal(calls[0][0], '/admin/banners/3/image');
    assert.equal(calls[0][1].get('approved'), 'true'); assert.equal(calls[0][1].get('file').name, 'banner.png');
    assert.equal(calls[0][2].headers['Content-Type'], undefined);
    await assert.rejects(tools.bannerApi.upload(2, file(), true), /đúng banner/);
  } finally { axios.put = old; }
});

function visit(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => visit(child,type));
  if (!React.isValidElement(node)) return [];
  if (typeof node.type === 'function') return visit(node.type(node.props),type);
  return [...(node.type === type ? [node] : []),...visit(node.props.children,type)];
}

function cardHarness(save) {
  const cells = [], pending = []; let cursor = 0;
  const react = { ...React, useState(initial) { const i=cursor++; if (!(i in cells)) cells[i]=typeof initial==='function'?initial():initial;
    return [cells[i], next=>{cells[i]=typeof next==='function'?next(cells[i]):next;}]; },
    useRef(initial) { const i=cursor++; return cells[i] ||= { current:initial }; },
    useEffect(fn, deps) { const i=cursor++, old=cells[i]; if (!old || deps.some((value,j)=>value!==old.deps[j]))
      pending.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()};}); } };
  const modules = { react, '../api/bannerApi.jsx': tools, './AdminProductImages': images };
  const instance={exports:{}}; const code=transformSync(fs.readFileSync('src/components/AdminBannerImages.jsx','utf8'),{loader:'jsx',format:'cjs'}).code;
  new Function('require','module','exports',code)(name=>modules[name],instance,instance.exports);
  const props={slot:ready(2),disabled:false,save};
  return { nodes(type) { cursor=0;const view=instance.exports.BannerUploadCard(props);pending.splice(0).forEach(run=>run());return visit(view,type); },
    unmount() { cells.forEach(cell=>cell?.cleanup?.()); },
    html() { cursor=0;return renderToStaticMarkup(instance.exports.BannerUploadCard(props)); } };
}

test('Chọn ảnh cần xác nhận trước khi lưu; lỗi giữ ảnh đang chọn và cho thử lại', async () => {
  let attempts=0;
  const h=cardHarness(async(position,upload,approved)=>{
    assert.equal(position,2);assert.equal(upload.name,'banner.png');assert.equal(approved,true);
    if (++attempts===1) throw new Error('Mất kết nối');
  });
  try {
    h.nodes('input').find(node=>node.props.type==='file').props.onChange({target:{files:[file()],value:'x'}});
    const saveButton=()=>h.nodes('button').find(node=>Array.isArray(node.props.children) && node.props.children.join('')==='Lưu banner 2');
    assert.equal(saveButton().props.disabled,true);
    h.nodes('input').find(node=>node.props.type==='checkbox').props.onChange({target:{checked:true}});
    await saveButton().props.onClick(); assert.match(h.html(),/Mất kết nối/);assert.match(h.html(),/banner.png/);
    await saveButton().props.onClick(); assert.match(h.html(),/Đã lưu banner 2/);assert.doesNotMatch(h.html(),/Đã chọn:/);
    assert.equal(attempts,2);
  } finally { h.unmount(); }
});

test('File không hợp lệ không thể tận dụng xác nhận cũ để lưu, bỏ ảnh chỉ bỏ lựa chọn local', () => {
  const h=cardHarness(async()=>assert.fail('Không được tự tải khi chọn hoặc bỏ ảnh'));
  try {
    const select = upload => h.nodes('input').find(node=>node.props.type==='file').props.onChange({target:{files:[upload],value:'x'}});
    select(file());h.nodes('input').find(node=>node.props.type==='checkbox').props.onChange({target:{checked:true}});
    select(new File(['bad'],'x.svg',{type:'image/svg+xml'}));
    assert.match(h.html(),/JPG hoặc PNG/);
    assert.equal(h.nodes('input').find(node=>node.props.type==='checkbox').props.checked,false);
    h.nodes('button').find(node=>node.props.children==='Bỏ ảnh vừa chọn').props.onClick();
    assert.doesNotMatch(h.html(),/Đã chọn:/);
  } finally { h.unmount(); }
});

test('Phản hồi lưu muộn sau khi rời tab không cập nhật giao diện đã unmount', async () => {
  let finish; const pending=new Promise(resolve=>{finish=resolve;}); const h=cardHarness(()=>pending);
  h.nodes('input').find(node=>node.props.type==='file').props.onChange({target:{files:[file()],value:'x'}});
  h.nodes('input').find(node=>node.props.type==='checkbox').props.onChange({target:{checked:true}});
  const saving=h.nodes('button').find(node=>Array.isArray(node.props.children)&&node.props.children.join('')==='Lưu banner 2').props.onClick();
  h.unmount();finish();await saving;
  assert.doesNotMatch(h.html(),/Đã lưu banner 2/);
});
