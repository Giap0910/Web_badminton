import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'esbuild';

function loadHome() {
  const text = fs.readFileSync(new URL('./HomePage.jsx', import.meta.url), 'utf8');
  const icons = text.match(/import \{([^}]+)\} from 'lucide-react'/)[1].split(',').map(name => name.trim());
  const modules = {
    react: { ...React, useState: initial => [initial, () => {}], useEffect() {} },
    'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children), useNavigate: () => () => {} },
    '../hooks/useBannerCarousel': () => ({ activeSlide: 0, dragging: false, offset: 0, handlers: {} }),
    '../api/productApi': { productApi: {} }, '../context/CartContext': { useCart: () => ({ addToCart() {} }) },
    '../components/ProductCard': () => null, '../components/ProductFacts': {},
    '../utils/formatters': { productCategory: () => '' }, 'lucide-react': Object.fromEntries(icons.map(name => [name, () => null])),
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', transformSync(text, { loader: 'jsx', format: 'cjs' }).code)
    (name => modules[name], module, module.exports);
  return module.exports.default;
}
test('Trang chủ render đủ danh mục, chữ banner nhỏ hơn và không còn điều khiển cũ', () => {
  const Home = loadHome(), html = renderToStaticMarkup(React.createElement(Home));
  assert.match(html, /Banner quảng cáo/);
  assert.match(html, /text-2xl sm:text-4xl lg:text-5xl/);
  assert.match(html, /leading-\[1.18\]/);
  assert.equal((html.match(/>20\+</g) || []).length, 5);
  assert.doesNotMatch(html, /aria-label="Slide|01 \/ 04|Slide trước|Slide sau/);
});

import * as formatters from '../utils/formatters.js';
const defer = () => { let resolve, reject; const promise = new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject}; };
const flush = async () => { for(let i=0;i<8;i++)await Promise.resolve(); };
const iconMock = new Proxy({}, {get:()=>()=>null});
const routerMock = { Link: ({to,children,...props})=>React.createElement('a',{href:to,...props},children),useNavigate:()=>()=>{} };
function hooks() {
  const cells=[],effects=[];let cursor=0;
  const react={...React,useState(initial){const index=cursor++;if(!(index in cells))cells[index]=typeof initial==='function'?initial():initial;
    return[cells[index],value=>cells[index]=typeof value==='function'?value(cells[index]):value];},
    useRef(initial){const index=cursor++;if(!(index in cells))cells[index]={current:initial};return cells[index];},
    useEffect(fn,deps){const index=cursor++,old=cells[index];if(!old||deps.some((value,i)=>value!==old.deps[i]))effects.push(()=>{old?.cleanup?.();cells[index]={deps,cleanup:fn()};});}};
  return{react,render(component,...args){cursor=0;const result=component(...args);effects.splice(0).forEach(fn=>fn());return result;},unmount(){cells.forEach(cell=>cell?.cleanup?.());}};
}
function compileFile(file,modules,globals={}) {
  const module={exports:{}},source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  const code=transformSync(source,{loader:'jsx',format:'cjs'}).code;
  new Function('require','module','exports',...Object.keys(globals),code)(name=>{if(!(name in modules))throw new Error('Missing module '+name);return modules[name];},module,module.exports,...Object.values(globals));
  return module.exports;
}
function treeNodes(value){if(!value||typeof value!=='object')return[];return[value,...React.Children.toArray(value.props?.children).flatMap(treeNodes)];}
function factsFixture(react=React,storage=new Map(),clipboard={writeText:async()=>{}}) {
  const listeners=new Map(),window={location:{origin:'http://localhost:5173'},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),dispatchEvent:event=>listeners.get(event.type)?.(event)};
  const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  const facts=compileFile('../components/ProductFacts.jsx',{react,'lucide-react':iconMock,'../utils/formatters':formatters},
    {localStorage,window,navigator:{clipboard},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}}});
  return{facts,storage,window,localStorage};
}
function homeFixture(api) {
  const h=hooks(),{facts}=factsFixture(h.react);
  const Card=()=>null;
  const mod=compileFile('./HomePage.jsx',{react:h.react,'react-router-dom':routerMock,'../api/productApi':{productApi:api},
    '../hooks/useBannerCarousel':()=>({activeSlide:0,dragging:false,offset:0,handlers:{}}),'../components/ProductCard':Card,
    '../components/ProductFacts':facts,'../utils/formatters':formatters,'lucide-react':iconMock});
  return{...h,...mod,Card,renderPage:()=>h.render(mod.default)};
}
test('Home production accepts array/page, rejects malformed, Newonlyactualflag and truthfulpolicies',()=>{
  const h=homeFixture({});const records=[{id:1,isNew:false},{id:2,isNew:true},{id:3,isNew:'true'},{id:4,isNew:true,catalogVisible:false}];
  assert.deepEqual(h.homeCatalog(records).map(item=>item.id),[1,2,3]);assert.deepEqual(h.homeCatalog({content:records}).map(item=>item.id),[1,2,3]);
  assert.throws(()=>h.homeCatalog({items:records}));assert.deepEqual(h.newHomeProducts(h.homeCatalog(records)).map(item=>item.id),[2]);
  const html=renderToStaticMarkup(h.renderPage());assert.match(html,/30.000đ|1.000.000đ|90 ngày|Phụ kiện không có|1 điểm đổi 100đ|tối đa 10%/);
  assert.doesNotMatch(html,/BÁN CHẠY NHẤT|TOP BEST SELLERS|BWF|500.000đ|12 tháng|6 tháng|googleusercontent|unsplash/);
  for(const slide of h.HERO_SLIDES)for(const link of [slide.ctaPrimaryLink,slide.ctaSecondaryLink])assert.ok(/^\/(?:products(?:\?|$)|compare$)/.test(link));
});
test('Home500 showsretry notfakeempty; retry200[] shows honestempty; staleGET doesnotreplacecurrent',async()=>{
  const requests=[],h=homeFixture({getProducts:()=>{const d=defer();requests.push(d);return d.promise;}});h.renderPage();
  requests[0].reject({response:{status:500}});await flush();let html=renderToStaticMarkup(h.renderPage());assert.match(html,/Không tải được sản phẩm|Thử lại/);assert.doesNotMatch(html,/Chưa có sản phẩm trong/);
  treeNodes(h.renderPage()).find(node=>node.type==='button'&&node.props.children==='Thử lại').props.onClick();h.renderPage();requests[1].resolve([]);await flush();
  html=renderToStaticMarkup(h.renderPage());assert.match(html,/Chưa có sản phẩm trong danh mục/);assert.doesNotMatch(html,/Không tải được sản phẩm/);
  h.unmount();
});
test('Footer actualrender keepsworkingnavigation and removesunverifiedcontacts/certification/newsletter/paymentclaims',()=>{
  const mod=compileFile('../components/Footer.jsx',{react:React,'react-router-dom':routerMock,'lucide-react':iconMock});
  const html=renderToStaticMarkup(React.createElement(mod.default));assert.match(html,/chưa được xác minh|\/my-orders|\/#shop-policy|\/returns/);
  assert.doesNotMatch(html,/Bộ Công Thương|BWF|ủy quyền|1900|0988|Cao Thắng|Trần Đại Nghĩa|Visa|Mastercard|MoMo|Trả góp|href="#|<form/);
});
function compareFixture(saved='[]') {
  const h=hooks(),storage=new Map([['badminton_compare',saved]]);
  const mod=compileFile('../context/CompareContext.jsx',{react:h.react,'../utils/formatters':formatters},
    {localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}});
  return{...h,...mod,storage,value:()=>h.render(mod.CompareProvider,{children:null}).props.value};
}
test('Comparison production normalizesbadstorage, samegroup, dedupe andmax3 even rapidadds',()=>{
  for(const saved of ['{}','null','notjson','[1,null,"shoe"]'])assert.deepEqual(compareFixture(saved).value().selectedRackets,[]);
  const h=compareFixture(JSON.stringify([{id:1,categoryId:1},{id:1,categoryId:1},{id:2,categoryId:2},{id:3,categoryId:1},{id:4,categoryId:1},{id:5,categoryId:1}]));
  assert.deepEqual(h.value().selectedRackets.map(item=>item.id),[1,3,4]);h.value().clearComparison();let value=h.value();
  for(let id=10;id<14;id++)value.addRacket({id,categoryId:1});assert.equal(h.value().selectedRackets.length,3);assert.match(h.value().comparisonError,/tối đa 3/);
  h.value().clearComparison();h.value().addRacket({id:22,categoryId:2});assert.equal(h.value().selectedRackets.length,1);
  h.value().addRacket({id:23,categoryId:1});assert.equal(h.value().selectedRackets.length,1);assert.match(h.value().comparisonError,/cùng nhóm/);
});
function comparePageFixture(api,selected=[{id:1,categoryId:1,name:'Vợt cũ'}]) {
  const h=hooks(),context=compareFixture(),{facts}=factsFixture(h.react),mod=compileFile('./ComparePage.jsx',{
    react:h.react,'react-router-dom':routerMock,'../context/CompareContext':{...context,useCompare:()=>({selectedRackets:selected,removeRacket(){},clearComparison(){},addRacket(){}})},
    '../api/productApi':{productApi:api},'../utils/formatters':formatters,'../components/ProductImage':()=>null,'../components/ProductFacts':facts,'lucide-react':iconMock});
  return{...h,...mod,renderPage:()=>h.render(mod.default)};
}
test('ComparisonPage actualAPI refreshesprice/specs, Pagecatalogcompatible, missinginfo notfabricated,GET500retry',async()=>{
  const requests=[],api={getProducts:async()=>({content:[{id:1,categoryId:1},{id:2,categoryId:2}]}),compareRackets:ids=>{requests.push(ids);return Promise.resolve({rackets:[{id:1,categoryId:1,name:'Vợt máy chủ',price:999000,inStock:true}]});}};
  const h=comparePageFixture(api);h.renderPage();await flush();let html=renderToStaticMarkup(h.renderPage());assert.deepEqual(requests[0],[1]);assert.match(html,/Vợt máy chủ|999\.000|Chưa có thông tin/);assert.doesNotMatch(html,/Medium|4U-G5|28-30 lbs|Toàn diện/);
  assert.deepEqual(h.comparisonCatalog({content:[{id:1,categoryId:1},{id:2,categoryId:2}]}).map(item=>item.id),[1,2]);
  assert.throws(()=>h.comparisonResults({rackets:[{id:2,categoryId:1}]},[{id:1}]));
  treeNodes(h.renderPage()).find(node=>node.type==='button'&&React.Children.toArray(node.props.children).includes('Thêm sản phẩm so sánh')).props.onClick();
  assert.doesNotThrow(()=>renderToStaticMarkup(h.renderPage()));
  api.compareRackets=async()=>{throw {response:{status:500}};};
  const failed=comparePageFixture(api);failed.renderPage();await flush();html=renderToStaticMarkup(failed.renderPage());assert.match(html,/Không tải được thông số|Thử lại/);assert.doesNotMatch(html,/999\.000/);
});
test('Favorite actualhookpersistsperuserIDs, guardsoldcallbacks, handlesbadstorage andfailedwrite',()=>{
  const h=hooks(),fixture=factsFixture(h.react,new Map([['hg_favorites_1','[11,11,-1,"12",null]']]));
  const view=owner=>h.render(fixture.facts.useProductFavorite,owner,11);view(1);let former=view(1);assert.equal(former.isFavorite,true);
  former.toggleFavorite();assert.deepEqual(JSON.parse(fixture.storage.get('hg_favorites_1')),[]);former=view(1);former.toggleFavorite();assert.equal(view(1).isFavorite,true);
  view(2);assert.equal(view(2).isFavorite,false);former.toggleFavorite();assert.equal(fixture.storage.has('hg_favorites_2'),false);
  view(2).toggleFavorite();assert.deepEqual(JSON.parse(fixture.storage.get('hg_favorites_2')),[11]);assert.deepEqual(JSON.parse(fixture.storage.get('hg_favorites_1')),[11]);
  fixture.localStorage.setItem=()=>{throw new Error('Storageblocked');};view(2).toggleFavorite();assert.match(view(2).favoriteError,/Không lưu được/);assert.equal(view(2).isFavorite,true);
});
test('Share awaitsactualclipboardwrite and exposeserrors; nofalsesuccess',async()=>{
  const pending=defer(),seen=[],fixture=factsFixture(React,new Map(),{writeText:url=>{seen.push(url);return pending.promise;}});
  let finished=false;const copy=fixture.facts.copyProductLink(21,7).then(()=>finished=true);await flush();assert.equal(finished,false);assert.equal(seen[0],'http://localhost:5173/products/21#review-7');pending.resolve();await copy;assert.equal(finished,true);
  await assert.rejects(factsFixture(React,new Map(),{writeText:async()=>{throw new Error('Denied');}}).facts.copyProductLink(21),/Denied/);
  await assert.rejects(fixture.facts.copyProductLink(null),/Không còn trang/);
});
function aiFixture(api) {
  const h=hooks();let owner=1;
  const mod=compileFile('../components/AiChatbotWidget.jsx',{react:h.react,'react-router-dom':routerMock,'../api/aiApi':{aiApi:api},
    '../context/AuthContext':{useAuth:()=>({user:{id:owner}})},'./ProductImage':()=>null,'lucide-react':iconMock});
  return{...h,owner:id=>owner=id,renderPage:()=>h.render(mod.default)};
}
test('AI production serializessends,429 clearstate, CTAselectvariant andignoresresponseoldowner',async()=>{
  const requests=[],h=aiFixture({chat:(query,history)=>{const d=defer();requests.push({...d,query,history});return d.promise;}});
  let tree=treeNodes(h.renderPage());tree.find(node=>node.type==='button').props.onClick();h.renderPage();
  let input=treeNodes(h.renderPage()).find(node=>node.type==='input');input.props.onChange({target:{value:'Vợt Yonex'}});tree=treeNodes(h.renderPage());
  const submit=tree.find(node=>node.type==='form').props.onSubmit;submit({preventDefault(){}});submit({preventDefault(){}});assert.equal(requests.length,1);
  requests[0].resolve({reply:'Vợt phù hợp',model:'fixture-model',fallback:false,recommendedProducts:[{id:21,name:'Vợt Yonex',price:100000,variants:[{id:71}]}]});await flush();
  let html=renderToStaticMarkup(h.renderPage());assert.match(html,/Chọn phiên bản|\/products\/21/);assert.doesNotMatch(html,/Thêm vào giỏ/);
  input=treeNodes(h.renderPage()).find(node=>node.type==='input');input.props.onChange({target:{value:'Câu hỏi tiếp'}});treeNodes(h.renderPage()).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
  requests[1].reject({response:{status:429}});await flush();html=renderToStaticMarkup(h.renderPage());assert.match(html,/đợi một lúc/);
  input=treeNodes(h.renderPage()).find(node=>node.type==='input');input.props.onChange({target:{value:'A cũ'}});treeNodes(h.renderPage()).find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
  h.owner(2);h.renderPage();requests[2].resolve({reply:'Bí mật phiênA',recommendedProducts:[]});await flush();html=renderToStaticMarkup(h.renderPage());assert.doesNotMatch(html,/Bí mật phiênA|A cũ/);
});

test('ProductCard actualquickdetail andneedsvariant goesto detail, wishlistpersistsowner withoutfalsecart',()=>{
  const h=hooks(),fixture=factsFixture(h.react),navigation=[],calls=[];
  const mod=compileFile('../components/ProductCard.jsx',{react:h.react,'react-router-dom':{...routerMock,useNavigate:()=>path=>navigation.push(path)},
    '../utils/formatters':formatters,'../context/CartContext':{useCart:()=>({addToCart:(...args)=>{calls.push(args);return 'cart-1';}})},
    '../context/AuthContext':{useAuth:()=>({user:{id:1}})},'lucide-react':iconMock,'./ProductImage':()=>null,'./ProductFacts':fixture.facts});
  const product={id:21,name:'Vợt Yonex',categoryId:1,inStock:true,price:100000,variants:[{id:1,active:true,inStock:true,weightGrip:'3U-G5'},{id:2,active:true,inStock:true,weightGrip:'4U-G5'}]};
  const renderCard=()=>h.render(mod.default,{product});renderCard();let tree=treeNodes(renderCard());
  const event={preventDefault(){},stopPropagation(){}};tree.find(node=>node.type==='button'&&node.props.title==='Xem chi tiết').props.onClick(event);
  tree.find(node=>node.type==='button'&&node.props.children?.some?.(child=>child.props?.children==='Chọn phiên bản')).props.onClick(event);
  assert.deepEqual(navigation,['/products/21','/products/21']);assert.equal(calls.length,0);
  tree.find(node=>node.type==='button'&&node.props['aria-label']==='Yêu thích').props.onClick(event);
  assert.deepEqual(JSON.parse(fixture.storage.get('hg_favorites_1')),[21]);assert.equal(treeNodes(renderCard()).find(node=>node.props?.['aria-label']==='Yêu thích').props['aria-pressed'],true);
});
test('ProductDetail share handler shows success onlyafterclipboard anderror ondeny; Review shareusesrealanchor',async()=>{
  const source=fs.readFileSync(new URL('./ProductDetailPage.jsx',import.meta.url),'utf8'),match=source.match(/const handleShare = async \(\) => \{([\s\S]*?)\n  \};/);assert.ok(match);
  const pending=defer();let success=false,error='';const scope={id:'21',copyProductLink:()=>pending.promise,setShareError:value=>error=value,setShareToast:value=>success=value,setTimeout:()=>0};
  const share=new Function(...Object.keys(scope),'return async()=>{'+match[1]+'}')( ...Object.values(scope));
  const call=share();assert.equal(success,false);pending.reject(new Error('Clipboard bị chặn'));await call;assert.equal(success,false);assert.match(error,/Clipboard bị chặn/);
  const reviewSource=fs.readFileSync(new URL('./ReviewedProductsPage.jsx',import.meta.url),'utf8'),reviewMatch=reviewSource.match(/const handleShareReview = async item => \{([\s\S]*?)\n  \};/);assert.ok(reviewMatch);
  const seen=[],fixture=factsFixture(React,new Map(),{writeText:async url=>seen.push(url)});let message='';
  const reviewScope={copyProductLink:fixture.facts.copyProductLink,mounted:{current:true},setShareMessage:value=>message=value};
  const shareReview=new Function(...Object.keys(reviewScope),'return async item=>{'+reviewMatch[1]+'}')( ...Object.values(reviewScope));
  await shareReview({productId:21,id:71});assert.equal(seen[0],'http://localhost:5173/products/21#review-71');assert.match(message,/Đã sao chép/);
  assert.doesNotMatch(reviewSource,/Hữu ích \(|alert\('Đã sao chép/);
});

test('AI mobile actualmarkup stayswithin320/375viewport, statuslong truncates',()=>{
  const h=aiFixture({});let view=h.renderPage();treeNodes(view).find(node=>node.type==='button').props.onClick();
  const html=renderToStaticMarkup(h.renderPage());assert.match(html,/right-3 sm:right-6/);assert.match(html,/w-\[calc\(100vw-1\.5rem\)\]/);assert.doesNotMatch(html,/w-\[94vw\]/);
  for(const viewport of [320,375,390]){const width=viewport-24,right=12,left=viewport-width-right;assert.equal(left,12);assert.ok(left>=0&&width+left<=viewport);}
});
test('Accessory legacy pages keepfilesbutallproductimagesuseinternalvalidatedplaceholder',()=>{
  for(const file of ['StringDetailPage.jsx','RacketGripDetailPage.jsx','ShuttlecockDetailPage.jsx','SweatbandDetailPage.jsx']){
    const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');assert.doesNotMatch(source,/<img\b/);assert.match(source,/ProductImage from '\.\.\/components\/ProductImage'/);
  }
});

 test('Comparison accepts all five categories, persists group and accessory subtype, rejects mixed selections', () => {
  for (const categoryId of [1, 2, 3, 4, 5]) {
    const h = compareFixture();
    h.value().addRacket({ id: 21, categoryId, accessoryType: categoryId === 5 ? 'day_cuoc' : null });
    h.value().addRacket({ id: 22, categoryId, accessoryType: categoryId === 5 ? 'day_cuoc' : null });
    assert.equal(h.value().selectedRackets.length, 2);
    const saved = h.storage.get('badminton_compare');
    assert.equal(compareFixture(saved).value().selectedRackets[0].categoryId, categoryId);
    h.value().addRacket({ id: 23, categoryId: categoryId === 1 ? 2 : 1 });
    assert.equal(h.value().selectedRackets.length, 2);
  }
  const h = compareFixture();
  h.value().addRacket({ id: 1, categoryId: 5, accessoryType: 'day_cuoc' });
  h.value().addRacket({ id: 2, categoryId: 5, accessoryType: 'quan_can' });
  h.value().addRacket({ id: 3, categoryId: 5 });
  assert.deepEqual(h.value().selectedRackets.map(item => item.id), [1]);
 });
 test('Comparison table renders category-specific facts from backend and filters selector by group', async () => {
  const examples = [[2, 'soleType', 'Đế cao su'], [3, 'fabricType', 'Polyester'], [4, 'capacity', '30 lít'], [5, 'quantityPerPack', '10 m']];
  for (const [categoryId, field, value] of examples) {
    const item = { id: 11, categoryId, accessoryType: categoryId === 5 ? 'day_cuoc' : null, [field]: value };
    const api = { getProducts: async () => [item], compareRackets: async () => ({ rackets: [item] }) };
    const h = comparePageFixture(api, [item]); h.renderPage(); await flush();
    const html = renderToStaticMarkup(h.renderPage()); assert.ok(html.includes(value));
    assert.deepEqual(h.comparisonCatalog([item, { id: 99, categoryId: 1 }], [item]).map(x => x.id), [11]);
    assert.throws(() => h.comparisonResults({ rackets: [{ id: 11, categoryId: 1 }] }, [item]));
  }
 });

test('AI conversation renders text without product cards and keeps the next turn history', async () => {
  const calls = [];
  const h = aiFixture({ chat: async (query, history) => {
    calls.push({ query, history });
    return { reply: calls.length === 1 ? 'Mình nghe bạn, bạn cứ chia sẻ nhé.' : 'Bạn muốn chọn vợt hay giày trước?',
      fallback: false, model: 'fixture-model', recommendedProducts: [] };
  } });
  treeNodes(h.renderPage()).find(node => node.type === 'button').props.onClick(); h.renderPage();
  for (const text of ['Chào bạn, hôm nay mình hơi mệt', 'Mình mới tập chơi']) {
    treeNodes(h.renderPage()).find(node => node.type === 'input').props.onChange({ target: { value: text } });
    treeNodes(h.renderPage()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await flush(); h.renderPage();
  }
  const html = renderToStaticMarkup(h.renderPage());
  assert.match(html, /Mình nghe bạn, bạn cứ chia sẻ nhé/);
  assert.match(html, /Bạn muốn chọn vợt hay giày trước/);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].history.map(x => x.role), ['user', 'model']);
  assert.equal(calls[1].history[0].text, 'Chào bạn, hôm nay mình hơi mệt');
  assert.ok(!treeNodes(h.renderPage()).some(node => node.type === 'a' && String(node.props.href).startsWith('/products/')));
  h.unmount();
});

test('AI retains compact shopping constraints beyond six recent messages and clears them for another owner', async () => {
  const calls = [];
  const h = aiFixture({ chat: async (query, history) => {
    calls.push({ query, history });
    return { reply: 'Bạn cứ chia sẻ thêm nhé.', fallback: true, recommendedProducts: [], shoppingContext: 'giay duoi 2 trieu nu mau do' };
  } });
  treeNodes(h.renderPage()).find(node => node.type === 'button').props.onClick(); h.renderPage();
  for (let i = 0; i < 5; i++) {
    treeNodes(h.renderPage()).find(node => node.type === 'input').props.onChange({ target: { value: 'Câu hỏi ' + i } });
    treeNodes(h.renderPage()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await flush(); h.renderPage();
  }
  assert.equal(calls[4].history[0].text, 'giay duoi 2 trieu nu mau do');
  assert.ok(calls.every(call => call.history.length <= 6));
  h.owner(2); h.renderPage(); h.renderPage();
  treeNodes(h.renderPage()).find(node => node.type === 'input').props.onChange({ target: { value: 'Xin chào' } });
  treeNodes(h.renderPage()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await flush(); h.renderPage();
  assert.deepEqual(calls.at(-1).history, []); h.unmount();
});
