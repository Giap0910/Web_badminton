import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

const url = position => `/api/media/banners/${position}/11111111-2222-3333-4444-555555555555.png`;
const flush = async () => { for (let i=0;i<6;i++) await Promise.resolve(); };

function homeBannerHarness(list) {
  const cells=[], effects=[];let cursor=0;
  const react={...React,useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;
    return[cells[i],next=>{cells[i]=typeof next==='function'?next(cells[i]):next;}];},
    useEffect(fn,deps){const i=cursor++,old=cells[i];if(!old||deps.some((value,j)=>value!==old.deps[j]))
      effects.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()};});}};
  const modules={react,'../api/bannerApi.jsx':{bannerApi:{list},bannerImageSource:value=>value?'http://localhost:8080'+value:null}};
  const instance={exports:{}},code=transformSync(fs.readFileSync('src/components/HomeBannerImage.jsx','utf8'),{loader:'jsx',format:'cjs'}).code;
  new Function('require','module','exports',code)(name=>modules[name],instance,instance.exports);
  return{render(position){cursor=0;const node=instance.exports.default({position});effects.splice(0).forEach(fn=>fn());return node;},
    unmount(){cells.forEach(cell=>cell?.cleanup?.());}};
}

test('Trang chủ lấy ảnh đúng slide 1–2–3–4, đổi slide không gọi API lại',async()=>{
  let calls=0;
  const h=homeBannerHarness(async()=>{calls++;return[1,2,3,4].map(position=>({position,url:url(position),status:'READY'}));});
  try{
    assert.equal(h.render(1),null);await flush();
    for(let position=1;position<=4;position++){
      const image=h.render(position);assert.equal(image.props.src,'http://localhost:8080'+url(position));
      assert.equal(image.props['data-banner-position'],position);assert.match(image.props.className,/object-cover/);
      assert.equal(image.props.alt,'');assert.equal(image.props['aria-hidden'],'true');
    }
    assert.equal(calls,1);
  }finally{h.unmount();}
});

test('Chưa có ảnh hoặc lỗi API giữ nền và nội dung hiện tại, không lấy ảnh slot khác lấp vào',async()=>{
  for(const list of [async()=>{throw new Error('Mạng lỗi');},async()=>[{position:3,url:url(3),status:'READY'}]]){
    const h=homeBannerHarness(list);
    try{h.render(1);await flush();assert.equal(h.render(1),null);assert.equal(h.render(4),null);}
    finally{h.unmount();}
  }
});

test('Ảnh lỗi không phá carousel; slide tiếp theo vẫn hiện ảnh đúng',async()=>{
  const h=homeBannerHarness(async()=>[1,2].map(position=>({position,url:url(position),status:'READY'})));
  try{h.render(1);await flush();h.render(1).props.onError();assert.equal(h.render(1),null);
    assert.equal(h.render(2).props.src,'http://localhost:8080'+url(2));}
  finally{h.unmount();}
});

test('Đã rời trang thì kết quả API muộn không phục hồi ảnh',async()=>{
  let finish;const pending=new Promise(resolve=>{finish=resolve;});let signal;
  const h=homeBannerHarness(options=>{signal=options.signal;return pending;});
  h.render(1);h.unmount();assert.equal(signal.aborted,true);
  finish([{position:1,url:url(1),status:'READY'}]);await flush();assert.equal(h.render(1),null);
});
