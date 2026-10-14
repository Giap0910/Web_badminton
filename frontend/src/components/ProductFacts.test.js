import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import fs from 'node:fs';
import { transformSync } from 'esbuild';

const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const facts = await server.ssrLoadModule('/src/components/ProductFacts.jsx');
const reviewsApi = await server.ssrLoadModule('/src/api/reviewApi.js');
after(() => server.close());
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const shoe = { id: 51, categoryId: 2, categoryName: 'Giày cầu lông', name: 'Mizuno Wave Claw',
  brand: 'Mizuno', sku: 'SH-MZ-01', availableSizes: '["40", "40.5", "41"]',
  cushionTechnology: 'Mizuno Wave', soleType: 'Cao su', averageRating: 0, reviewCount: 0 };

test('Mô tả không chèn bảng thông số', () => {
  const html = render(facts.ProductDescription, { product: { ...shoe, description: 'Giày Mizuno hỗ trợ di chuyển linh hoạt.' } });
  assert.match(html, /hỗ trợ di chuyển linh hoạt/);
  assert.doesNotMatch(html, /Loại đế|Chất liệu mặt giày|Mã sản phẩm/);
});

test('Giày dùng thông số giày và ưu tiên danh mục API trước từ khóa trong tên', () => {
  const html = render(facts.ProductSpecifications, { product: { ...shoe, name: 'Giày dùng sân cầu lông' } });
  assert.match(html, /Mizuno Wave/);
  assert.match(html, /40, 40.5, 41/);
  assert.doesNotMatch(html, /Sức căng|Vật liệu khung|Power Cushion|Namd/);
});

test('Mỗi danh mục có trường riêng, dữ liệu thiếu không tạo thông số', () => {
  const cases = [[1, 'maxTension', '28 lbs', 'Sức căng tối đa'],
    [3, 'fabricType', 'Polyester', 'Chất liệu vải'],
    [4, 'waterproof', false, 'Khả năng chống nước'],
    [5, 'quantityPerPack', 'Vỉ 3 chiếc', 'Quy cách đóng gói']];
  for (const [categoryId, field, value, label] of cases) {
    const rows = facts.productSpecRows({ categoryId, [field]: value });
    assert.deepEqual(rows.find(row => row[0] === label), [label, String(value === false ? 'Không' : value)]);
    assert.deepEqual(rows.find(row => row[0] === 'Màu sắc'), ['Màu sắc', 'Chưa có thông tin']);
  }
  assert.equal(facts.productValue(0), '0');
  assert.equal(facts.productValue('  '), 'Chưa có thông tin');
  assert.equal(facts.productAccessoryLabel('qua_cau'), 'Quả cầu');
  assert.equal(facts.productAccessoryLabel('bang_do'), 'Băng chặn mồ hôi');
});

test('Chỉ cho chọn kích cỡ API, giữ kích cỡ thập phân và không giả hết cỡ 44', () => {
  assert.deepEqual(facts.availableProductSizes({ availableSizes: '["40.5", "44", "44", " ", null]' }), ['40.5', '44']);
  assert.deepEqual(facts.availableProductSizes({ availableSizes: '40,41' }), []);
  const html = render(facts.ProductSelections, { product: { ...shoe, availableSizes: '["40.5","44"]' }, selectedSize: '44' });
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /disabled|White Gold|Hết cỡ|EU/);
});

test('Giỏ hàng không nhận màu, quy cách, dịch vụ hay phụ phí tự tạo', () => {
  assert.deepEqual(facts.productCartOptions(shoe, '40.5'), { size: '40.5' });
  assert.deepEqual(facts.productCartOptions(shoe, '99'), {});
  assert.deepEqual(facts.productCartOptions({ categoryId: 5, quantityPerPack: 'Vỉ 3 chiếc' }), { packaging: 'Vỉ 3 chiếc' });
  assert.deepEqual(facts.productCartOptions({ categoryId: 1, weightGrip: '4U/G5', colorName: 'Đỏ' }), { weightGrip: '4U/G5', color: 'Đỏ' });
});

test('Chưa có đánh giá không điền 4.9, số người mua hay sao vàng', () => {
  const html = render(facts.ProductRating, { product: shoe });
  assert.match(html, /Chưa có đánh giá/);
  assert.doesNotMatch(html, /fill-amber-500/);
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /4\.9|218|850/);
  assert.doesNotMatch(render(facts.ProductRating, { product: { averageRating: 7, reviewCount: 2 } }), /fill-amber-500/);
});

test('Phân bố sao tính từ đánh giá đã tải, bỏ điểm không hợp lệ', () => {
  const rows = facts.reviewDistribution([{ rating: 5 }, { rating: 5 }, { rating: 3 }, { rating: 9 }]);
  assert.deepEqual(rows[0], { stars: 5, count: 2, percent: 67 });
  assert.deepEqual(rows[2], { stars: 3, count: 1, percent: 33 });
  assert.ok(facts.reviewDistribution([]).every(row => row.count === 0 && row.percent === 0));
});

test('Danh sách nhận xét hiển thị dữ liệu thật và tách lỗi tải khỏi danh sách trống', () => {
  assert.match(render(facts.ProductReviewEntries, {}), /Chưa có đánh giá/);
  const failed = render(facts.ProductReviewEntries, { error: 'Chưa thể tải đánh giá.' });
  assert.match(failed, /role="alert"/);
  assert.doesNotMatch(failed, /Chưa có đánh giá/);
  const actual = render(facts.ProductReviewEntries, { reviews: [{ id: 1, userFullName: 'Phong', rating: 4, comment: 'Vừa chân' }] });
  assert.match(actual, /Phong/);
  assert.match(actual, /Vừa chân/);
  assert.doesNotMatch(actual, /Đã mua hàng|Tuyển Trẻ|92%/);
});

test('Giảm giá được tính từ giá API, không tự tạo mức giảm', () => {
  assert.match(render(facts.ProductDiscount, { product: { price: 80000, originalPrice: 100000 } }), /-20%/);
  assert.equal(render(facts.ProductDiscount, { product: { price: 80000 } }), '');
  assert.equal(render(facts.ProductDiscount, { product: { price: 100000, originalPrice: 80000 } }), '');
});

test('Biến thể hết cỡ bị khóa chọn, không lộ số lượng tồn hoặc tự tạo màu', () => {
  const product = { ...shoe, inStock: true, variants: [
    { id: 1, active: true, color: 'Trắng / Đen', size: '40', inStock: false, stock: null },
    { id: 2, active: true, color: 'Trắng / Đen', size: '41', inStock: true, stock: null },
    { id: 3, active: false, legacy: true, size: '44', inStock: false, stock: null }] };
  const html = render(facts.ProductSelections, { product, selectedVariantId: 2 });
  assert.match(html, /disabled=""[^>]*>40</);
  assert.match(html, /aria-pressed="true"[^>]*>41</);
  assert.doesNotMatch(html, />44<|20 sản phẩm|Tồn kho/);
  assert.deepEqual(facts.productCartOptions(product, '', 2), { variantId: 2, size: '41', color: 'Trắng / Đen', weightGrip: '', packaging: '' });
  assert.deepEqual(facts.productCartOptions(product, '', 1), {});
  assert.doesNotMatch(render(facts.ProductSelections, { product: { variants: [{ id: 1, active: true, inStock: true, packaging: '10m' }] } }), /Màu sắc/);
});

test('Review thật chỉ có badgeverified khi đúng cờ; reply/timestamp thật, loading/error không giảempty',()=>{
  const base={id:71,userFullName:'Phong',rating:2,comment:'Vừa chân',officialReply:'Cửa hàng đã tiếp nhận',replyUpdatedAt:'2026-10-13T10:00:00'};
  const unverified=render(facts.ProductReviewEntries,{reviews:[base]});assert.doesNotMatch(unverified,/Đã mua hàng/);assert.match(unverified,/Cửa hàng đã tiếp nhận|Phản hồi cửa hàng/);
  const verified=render(facts.ProductReviewEntries,{reviews:[{...base,verifiedPurchase:true}]});assert.match(verified,/Đã mua hàng/);
  assert.doesNotMatch(render(facts.ProductReviewEntries,{reviews:[{...base,verifiedPurchase:'true'}]}),/Đã mua hàng/);
  assert.doesNotMatch(render(facts.ProductReviewEntries,{reviews:[{...base,visible:false}]}),/Vừa chân/);
  const loading=render(facts.ProductReviewList,{product:shoe,loading:true});assert.match(loading,/Đang tải đánh giá/);assert.doesNotMatch(loading,/Chưa có đánh giá|Phân bố/);
  const error=render(facts.ProductReviewList,{product:shoe,error:'Máy chủ500',onRetry(){}});assert.match(error,/Thử lại|Máy chủ500/);assert.doesNotMatch(error,/Chưa có đánh giá|Phân bố/);
});
test('Review payload giữorderItemId nguồn đãmua; không thưởng điểm hoặc bịa ngày/rating/verification',()=>{
  assert.deepEqual(reviewsApi.buildReviewPayload({productId:12,orderItemId:31},2,' Vừa chân '),{productId:12,orderItemId:31,rating:2,comment:'Vừa chân'});
  assert.deepEqual(reviewsApi.buildReviewPayload({productId:12},4,'Tốt'),{productId:12,rating:4,comment:'Tốt'});
  assert.throws(()=>reviewsApi.buildReviewPayload({productId:12},0,'Tốt'));assert.throws(()=>reviewsApi.buildReviewPayload({productId:12},5,'x'.repeat(2001)));
  const normalized=reviewsApi.normalizeReview({id:31,productId:12,rating:2,visible:false,verifiedPurchase:true,officialReply:'Đã tiếp nhận',replyUpdatedAt:'2026-10-13'});
  assert.equal(normalized.rating,2);assert.equal(normalized.createdAt,null);assert.equal(normalized.verifiedBuyer,true);assert.equal(normalized.visible,false);
  assert.equal(normalized.officialReply.message,'Đã tiếp nhận');assert.equal(reviewsApi.normalizeReview({verifiedBuyer:true}).verifiedBuyer,false);
  assert.throws(()=>reviewsApi.readReviewList({items:[]}),/không hợp lệ/);
});
function hookRuntime() {
  const cells=[],effects=[],requests=[];let index=0;
  const react={...React,useState(initial){const slot=index++;if(!(slot in cells))cells[slot]=initial;return[cells[slot],next=>cells[slot]=typeof next==='function'?next(cells[slot]):next];},
    useRef(initial){const slot=index++;if(!(slot in cells))cells[slot]={current:initial};return cells[slot];},
    useEffect(fn,deps){const slot=index++,old=cells[slot];if(!old||deps.some((value,i)=>value!==old.deps[i]))effects.push(()=>{old?.cleanup?.();cells[slot]={deps,cleanup:fn()};});}};
  const api={get(url){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});requests.push({url,resolve,reject});return promise;},post:async()=>{}};
  const module={exports:{}},source=fs.readFileSync(new URL('../api/reviewApi.js',import.meta.url),'utf8');
  const code=transformSync(source,{format:'cjs'}).code;
  new Function('require','module','exports',code)(name=>name==='react'?react:api,module,module.exports);
  return{react,module,requests,render(id){index=0;const value=module.exports.useProductReviews(id);effects.splice(0).forEach(fn=>fn());return value;},
    reset(){index=0;},runEffects(){effects.splice(0).forEach(fn=>fn());},unmount(){cells.forEach(cell=>cell?.cleanup?.());}};
}
const reviewFlush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('GETreview production500 khácempty; retry200rỗng; oldroute/no-mount không ghiđè dữliệu mới',async()=>{
  const h=hookRuntime();h.render(1);h.requests[0].reject({response:{status:500}});await reviewFlush();
  let view=h.render(1);assert.match(view.reviewsError,/Không tải/);assert.equal(view.reviewsLoading,false);
  view.retryReviews();h.render(1);h.requests[1].resolve([]);await reviewFlush();view=h.render(1);assert.equal(view.reviewsError,'');assert.deepEqual(view.reviews,[]);
  h.render(2);h.render(3);h.requests[3].resolve([{id:3,comment:'B'}]);await reviewFlush();h.requests[2].resolve([{id:2,comment:'A'}]);await reviewFlush();
  assert.equal(h.render(3).reviews[0].id,3);h.render(4);h.unmount();h.requests[4].resolve([{id:4}]);await reviewFlush();assert.deepEqual(h.render(4).reviews,[]);
});
function reviewPageRuntime() {
  const h=hookRuntime(),api=h.module.exports.reviewApi;
  const source=fs.readFileSync(new URL('../pages/ReviewedProductsPage.jsx',import.meta.url),'utf8');
  const module={exports:{}},code=transformSync(source,{loader:'jsx',format:'cjs'}).code;
  const mocks={react:h.react,'../api/reviewApi':h.module.exports,'react-router-dom':{Link:'a'},
    '../context/AuthContext':{useAuth:()=>({token:'token-A'})},
    'lucide-react':new Proxy({}, {get:()=>()=>null}),'../utils/formatters':{formatDate:value=>String(value)},
    '../components/ProductImage':()=>null,'../components/UserLayout':()=>null};
  new Function('require','module','exports',code)(name=>mocks[name],module,module.exports);
  return{...h,api,renderPage(){h.reset();const value=module.exports.default();h.runEffects();return value;}};
}
function reviewNodes(value){if(!value||typeof value!=='object')return[];return[value,...React.Children.toArray(value.props?.children).flatMap(reviewNodes)];}
test('ReviewedProducts gọieligible thật, POSTline/rating/comment thật và phản hồi verified/reply, không+50điểm',async()=>{
  const h=reviewPageRuntime();h.renderPage();assert.equal(h.requests[0].url,'/reviews/my-reviews');assert.equal(h.requests[1].url,'/reviews/eligible-products');
  h.requests[0].resolve([]);h.requests[1].resolve([{productId:12,productName:'Giày Yonex',orderItemId:31,purchasedSpec:'Màu Trắng ·40'}]);await reviewFlush();
  let tree=reviewNodes(h.renderPage());tree.find(node=>node.type==='button'&&node.props.children==='Viết đánh giá').props.onClick();
  tree=reviewNodes(h.renderPage());tree.find(node=>node.type==='textarea').props.onChange({target:{value:'Vừa chân'}});
  let payload,config,calls=0,resolve;const pending=new Promise(yes=>resolve=yes);h.api.createReview=async(data,options)=>{calls++;payload=data;config=options;return pending;};
  tree=reviewNodes(h.renderPage());const submit=tree.find(node=>node.type==='form').props.onSubmit;const first=submit({preventDefault(){}});const second=submit({preventDefault(){}});
  assert.equal(calls,1);assert.deepEqual(payload,{productId:12,orderItemId:31,rating:5,comment:'Vừa chân'});
  assert.equal(config.headers.Authorization,'Bearer token-A');
  resolve({id:71,productId:12,productName:'Giày Yonex',rating:2,comment:'Vừa chân',verifiedPurchase:true,officialReply:'Đã tiếp nhận',replyUpdatedAt:'2026-10-13'});
  await first;await second;tree=reviewNodes(h.renderPage());assert.equal(tree.filter(node=>node.type==='form').length,0);
  const text=tree.flatMap(node=>React.Children.toArray(node.props?.children).filter(child=>typeof child==='string')).join(' ');
  assert.match(text,/2\.0|Đã tiếp nhận|Đã xác thực đã mua hàng/);assert.doesNotMatch(text,/\+50|24\/10\/2024/);
});
