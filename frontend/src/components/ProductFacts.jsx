import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { productCategory, productRating, formatDate } from '../utils/formatters';

export const UNKNOWN_PRODUCT_INFO = 'Chưa có thông tin';

export function favoriteIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 500) : [];
}
const readFavorites = owner => {
  try { return favoriteIds(JSON.parse(localStorage.getItem(`hg_favorites_${owner}`) || '[]')); } catch { return []; }
};
export function useProductFavorite(ownerId, productId) {
  const [record, setRecord] = useState({ owner: null, ids: [] }), [favoriteError, setError] = useState('');
  const owner = useRef(ownerId); owner.current = ownerId;
  useEffect(() => {
    owner.current = ownerId;
    setRecord({ owner: ownerId, ids: ownerId ? readFavorites(ownerId) : [] }); setError('');
    const changed = event => {
      if (event.type === 'storage' && event.key !== `hg_favorites_${ownerId}`) return;
      if (event.type === 'hg:favorites' && event.detail?.owner !== ownerId) return;
      setRecord({ owner: ownerId, ids: ownerId ? readFavorites(ownerId) : [] });
    };
    window.addEventListener('hg:favorites', changed); window.addEventListener('storage', changed);
    return () => { owner.current = null; window.removeEventListener('hg:favorites', changed); window.removeEventListener('storage', changed); };
  }, [ownerId]);
  const toggleFavorite = () => {
    if (owner.current !== ownerId) return;
    if (!Number.isSafeInteger(ownerId) || ownerId < 1) { setError('Đăng nhập để lưu yêu thích trên thiết bị này.'); return; }
    if (!Number.isSafeInteger(productId) || productId < 1) return;
    const ids = readFavorites(ownerId);
    if (!ids.includes(productId) && ids.length >= 500) { setError('Danh sách yêu thích trên thiết bị đã đủ 500 sản phẩm.'); return; }
    const next = favoriteIds(ids.includes(productId) ? ids.filter(id => id !== productId) : [...ids, productId]);
    try {
      localStorage.setItem(`hg_favorites_${ownerId}`, JSON.stringify(next)); setRecord({ owner: ownerId, ids: next }); setError('');
      window.dispatchEvent(new CustomEvent('hg:favorites', { detail: { owner: ownerId } }));
    } catch { setError('Không lưu được yêu thích trên thiết bị này.'); }
  };
  return { isFavorite: record.owner === ownerId && record.ids.includes(productId), toggleFavorite, favoriteError };
}
export async function copyProductLink(productId, reviewId) {
  if (!Number.isSafeInteger(productId) || productId < 1) throw new Error('Không còn trang sản phẩm để chia sẻ.');
  if (!navigator.clipboard?.writeText) throw new Error('Trình duyệt chưa hỗ trợ sao chép liên kết.');
  const fragment = Number.isSafeInteger(reviewId) && reviewId > 0 ? `#review-${reviewId}` : '';
  await navigator.clipboard.writeText(`${window.location.origin}/products/${productId}${fragment}`);
}
const CATEGORY_FIELDS = {
  RACKET: [['Trọng lượng / Chu vi cán', 'weightGrip'], ['Hạng trọng lượng', 'weightClass'],
    ['Điểm cân bằng', 'balancePoint'], ['Độ cứng', 'stiffness'], ['Sức căng tối đa', 'maxTension'],
    ['Phong cách chơi', 'playStyle'], ['Vật liệu khung', 'frameMaterial'], ['Vật liệu thân', 'shaftMaterial']],
  SHOES: [['Kích cỡ', 'availableSizes'], ['Loại đế', 'soleType'],
    ['Công nghệ đệm', 'cushionTechnology'], ['Chất liệu mặt giày', 'upperMaterial'], ['Giới tính', 'gender']],
  APPAREL: [['Kích cỡ', 'availableSizes'], ['Giới tính', 'gender'], ['Chất liệu vải', 'fabricType']],
  BAG: [['Loại túi', 'bagType'], ['Sức chứa / Dung tích', 'capacity'],
    ['Sức chứa vợt', 'racketCapacity'], ['Khả năng chống nước', 'waterproof']],
  ACCESSORIES: [['Loại phụ kiện', 'accessoryType'], ['Quy cách đóng gói', 'quantityPerPack']],
};

export function productValue(value) {
  if (typeof value === 'string') return value.trim() || UNKNOWN_PRODUCT_INFO;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return UNKNOWN_PRODUCT_INFO;
}

export function productAccessoryLabel(value) {
  const labels = { day_cuoc: 'Dây cước', quan_can: 'Quấn cán', qua_cau: 'Quả cầu', bang_do: 'Băng chặn mồ hôi' };
  return labels[value] || productValue(value);
}

export function availableProductSizes(product) {
  let sizes = product?.availableSizes;
  if (typeof sizes === 'string') {
    try { sizes = JSON.parse(sizes); } catch { return []; }
  }
  return Array.isArray(sizes)
    ? [...new Set(sizes.filter(size => typeof size === 'string' && size.trim()).map(size => size.trim()))] : [];
}

export function productSpecRows(product = {}) {
  const common = [['Thương hiệu', 'brand'], ['Mã sản phẩm', 'sku'],
    ['Danh mục', 'categoryName'], ['Xuất xứ', 'origin'], ['Màu sắc', 'colorName'], ['Phiên bản', 'edition']];
  return [...common, ...(CATEGORY_FIELDS[productCategory(product)] || [])].map(([label, field]) => {
    const value = field === 'availableSizes' ? availableProductSizes(product).join(', ') : product[field];
    return [label, field === 'accessoryType' ? productAccessoryLabel(value) : productValue(value)];
  });
}

export function productSpecSummary(product) {
  const fields = CATEGORY_FIELDS[productCategory(product)] || [];
  for (const [, field] of fields) {
    const value = field === 'availableSizes' ? availableProductSizes(product).join(', ') : product?.[field];
    if (productValue(value) !== UNKNOWN_PRODUCT_INFO) return field === 'accessoryType' ? productAccessoryLabel(value) : productValue(value);
  }
  return UNKNOWN_PRODUCT_INFO;
}

export function productVariants(product) {
  return Array.isArray(product?.variants) ? product.variants.filter(v => v.active && !v.legacy) : [];
}

export function productCartOptions(product, selectedSize = '', variantId = null) {
  const variants = productVariants(product);
  if (variants.length) {
    const variant = variants.find(v => v.id === variantId) ||
      (variants.length === 1 ? variants[0] : variants.find(v => v.size === selectedSize && v.inStock));
    return variant?.inStock ? { variantId: variant.id, size: variant.size || '', color: variant.color || '',
      weightGrip: variant.weightGrip || '', packaging: variant.packaging || '' } : {};
  }
  const category = productCategory(product);
  const options = {};
  if (['SHOES', 'APPAREL'].includes(category) && availableProductSizes(product).includes(selectedSize)) options.size = selectedSize;
  if (category === 'RACKET' && product?.weightGrip) options.weightGrip = product.weightGrip;
  if (category === 'APPAREL' && product?.gender) options.gender = product.gender;
  if (category === 'BAG' && product?.capacity) options.capacity = product.capacity;
  if (category === 'ACCESSORIES' && product?.quantityPerPack) options.packaging = product.quantityPerPack;
  if (product?.colorName) options.color = product.colorName;
  return options;
}

export function ProductSpecifications({ product }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
    {productSpecRows(product).map(([label, value]) => <div key={label}
      className="flex justify-between gap-4 py-2.5 bg-[#F2F4F6] px-4 rounded-xl">
      <span className="text-slate-600 shrink-0">{label}</span>
      <span className="font-bold text-slate-900 text-right break-words min-w-0">{value}</span>
    </div>)}
  </div>;
}

export function ProductDescription({ product }) {
  return <div className="space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
    <div className="space-y-3"><h3 className="text-base font-bold text-slate-900">{product?.name}</h3>
      <p className="whitespace-pre-line">{productValue(product?.description)}</p></div>
  </div>;
}

export function ProductBenefits({ product }) {
  if (!Array.isArray(product?.benefits) || !product.benefits.length) return null;
  return <section className="mt-5 rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs">
    <h3 className="font-bold text-slate-900 mb-3">Ưu đãi sản phẩm</h3>
    <ul className="space-y-2 text-slate-700">{product.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
  </section>;
}

export function ProductSelections({ product, selectedSize = '', onSizeChange = () => {}, selectedVariantId, onVariantChange = () => {} }) {
  if (productVariants(product).length) return <VariantSelections product={product} selectedVariantId={selectedVariantId} onChange={onVariantChange} />;
  const sizes = availableProductSizes(product);
  const hasSizes = ['SHOES', 'APPAREL'].includes(productCategory(product));
  return <div className="space-y-4 mb-5 text-xs">
    <div className="flex justify-between gap-3"><span className="font-bold text-slate-900">Màu sắc:</span>
      <span className="text-slate-600 min-w-0 break-words text-right">{productValue(product?.colorName)}</span></div>
    {hasSizes ? <div><span className="block font-bold text-slate-900 mb-2">Kích cỡ:</span>
      {sizes.length ? <div className="flex flex-wrap gap-2">{sizes.map(size => <button key={size} type="button"
        onClick={() => onSizeChange(size)} aria-pressed={selectedSize === size}
        className={`min-w-11 h-11 px-3 rounded-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${selectedSize === size
          ? 'bg-[#0F172A] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50'}`}>
        {size}</button>)}</div> : <p className="text-slate-500">{UNKNOWN_PRODUCT_INFO}</p>}</div>
      : <div className="bg-[#F2F4F6] rounded-xl p-3 text-slate-700">{productSpecSummary(product)}</div>}
  </div>;
}

function VariantSelections({ product, selectedVariantId, onChange }) {
  const variants = productVariants(product);
  const selected = variants.find(v => v.id === selectedVariantId);
  const fields = [['color', 'Màu sắc'], ['size', 'Kích cỡ'], ['weightGrip', 'Trọng lượng / Cỡ cán'], ['packaging', 'Quy cách']];
  const compatible = (variant, field) => field === 'color' || !selected?.color || variant.color === selected.color;
  return <div className="space-y-4 mb-5 text-xs">{fields.map(([field, label]) => {
    const values = [...new Set(variants.map(v => v[field]).filter(Boolean))];
    if (!values.length) return null;
    return <div key={field}><span className="block font-bold text-slate-900 mb-2">{label}:</span>
      <div className="flex flex-wrap gap-2">{values.map(value => {
        const matching = variants.filter(v => v[field] === value && compatible(v, field));
        const target = matching.find(v => v.inStock && (field !== 'color' || !selected?.size || v.size === selected.size)) || matching.find(v => v.inStock);
        return <button key={value} type="button" disabled={!target} aria-pressed={selected?.[field] === value}
          onClick={() => target && onChange(target.id)}
          className={`min-w-11 min-h-11 px-3 py-2 rounded-xl font-bold border ${!target ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : selected?.[field] === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 hover:bg-slate-50'}`}>{value}</button>;
      })}</div></div>;
  })}</div>;
}

export function ReviewStars({ rating }) {
  const score = Number.isFinite(Number(rating)) && Number(rating) >= 0 && Number(rating) <= 5 ? Number(rating) : 0;
  return <span className="inline-flex text-amber-500" aria-label={`${score} trên 5 sao`}>
    {Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true"
      className={`w-3.5 h-3.5 ${index < Math.round(score) ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />)}
  </span>;
}

export function ProductRating({ product }) {
  const label = productRating(product);
  return <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
    <ReviewStars rating={label === 'Chưa có đánh giá' ? 0 : product.averageRating} />
    <span className="font-bold text-slate-900">{label}</span>
    {Number.isInteger(product?.reviewCount) && product.reviewCount >= 0 && <span>({product.reviewCount} đánh giá)</span>}
  </div>;
}

export function reviewDistribution(reviews = []) {
  const rated = reviews.filter(review => Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
  return [5, 4, 3, 2, 1].map(stars => ({ stars,
    count: rated.filter(review => review.rating === stars).length,
    percent: rated.length ? Math.round(rated.filter(review => review.rating === stars).length / rated.length * 100) : 0,
  }));
}

export function ReviewSummary({ product, reviews = [] }) {
  return <div className="bg-[#F2F4F6] p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
    <ProductRating product={product} />
    <div className="flex-1 max-w-md w-full space-y-1.5 text-xs text-slate-600">
      <p className="mb-2">Phân bố các đánh giá đã tải ({reviews.length})</p>
      {reviewDistribution(reviews).map(({ stars, count, percent }) => <div key={stars} className="flex items-center gap-3">
        <span className="w-12 text-right font-medium">{stars} sao</span>
        <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-secondary h-full" style={{ width: `${percent}%` }} /></div>
        <span className="w-16 text-right">{count} ({percent}%)</span>
      </div>)}
    </div>
  </div>;
}

export function ProductReviewEntries({ reviews = [], error = '', loading = false, onRetry }) {
  return <div className="space-y-4">{error ? <div role="alert" className="text-sm text-slate-600">{error}
    {onRetry && <button type="button" className="ml-3 underline" onClick={onRetry}>Thử lại</button>}</div>
      : loading ? <p role="status">Đang tải đánh giá...</p>
      : reviews.length === 0 ? <p className="text-sm text-slate-500">Chưa có đánh giá.</p>
        : reviews.filter(review => review.visible !== false).map((review, index) => <div key={review.id ?? index} id={`review-${review.id}`}
          className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 space-y-2 text-xs">
          <strong className="text-slate-900 break-words">{productValue(review.userFullName) === UNKNOWN_PRODUCT_INFO ? 'Khách hàng' : review.userFullName}</strong>
          {review.verifiedPurchase === true && <span className="ml-3 text-emerald-700">Đã mua hàng</span>}
          {review.createdAt && <p className="text-slate-400">{formatDate(review.createdAt)}</p>}
          <div><ReviewStars rating={review.rating} /></div><p className="text-slate-600 break-words whitespace-pre-line">{review.comment}</p>
          {typeof review.officialReply === 'string' && review.officialReply.trim() && <div className="border-l-4 border-blue-500 p-3 bg-blue-50">
            <strong>Phản hồi cửa hàng</strong>{review.replyUpdatedAt && <span className="ml-3">{formatDate(review.replyUpdatedAt)}</span>}
            <p className="whitespace-pre-line break-words">{review.officialReply}</p></div>}
        </div>)}
  </div>;
}

export function ProductReviewList({ product, reviews = [], error = '', loading = false, onRetry }) {
  return <div className="space-y-4">{!error && !loading && <ReviewSummary product={product} reviews={reviews} />}
    <ProductReviewEntries reviews={reviews} error={error} loading={loading} onRetry={onRetry} /></div>;
}

export function ProductDiscount({ product }) {
  const price = Number(product?.price), original = Number(product?.originalPrice);
  if (!Number.isFinite(price) || !Number.isFinite(original) || price <= 0 || original <= price) return null;
  return <span className="bg-secondary text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
    -{Math.round((original - price) / original * 100)}%
  </span>;
}
