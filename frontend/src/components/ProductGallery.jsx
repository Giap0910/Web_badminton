import React from 'react';
import { Heart, ZoomIn } from 'lucide-react';
import ProductImage, { internalProductImage } from './ProductImage';

export function productGallerySlots(product) {
  return Array.from({ length: 4 }, (_, index) => {
    const slot = product?.imageSlots?.[index];
    const url = slot?.status === 'READY' && internalProductImage(slot.url) ? slot.url : null;
    return { position: index + 1, url, status: url ? 'READY' : 'UPDATING' };
  });
}

export function nextGalleryIndex(index, key) {
  const movement = { ArrowLeft: -1, ArrowRight: 1 }[key];
  return movement ? (index + movement + 4) % 4 : index;
}

function GalleryThumbnails({ product, slots, activeIndex, onChange }) {
  return <div className="flex flex-col gap-2 sm:gap-3 shrink-0 w-14 sm:w-20" aria-label="Ảnh nhỏ sản phẩm">
    {slots.map((slot, index) => <button key={slot.position} type="button" onClick={() => onChange(index)}
      aria-label={`Xem ảnh ${slot.position} của ${product.name}`} aria-pressed={index === activeIndex}
      className={`relative h-16 sm:h-24 rounded-xl border overflow-hidden p-1 focus-visible:ring-2 focus-visible:ring-secondary ${index === activeIndex ? 'border-secondary ring-2 ring-secondary/20' : 'border-slate-200 hover:border-slate-400'}`}>
      <ProductImage compact src={slot.url} alt={`Ảnh ${slot.position} - ${product.name}`} className="w-full h-full" />
      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-500">{slot.position}</span>
    </button>)}
  </div>;
}

export default function ProductGallery({ product, activeIndex = 0, onChange, onZoom, favorite, onFavorite }) {
  const slots = productGallerySlots(product);
  const slot = slots[activeIndex] || slots[0];
  const keyboard = event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); onChange(nextGalleryIndex(activeIndex, event.key));
  };
  return <div className="lg:col-span-6 flex flex-row gap-3 sm:gap-4 min-w-0" onKeyDown={keyboard} aria-label={`Bộ ảnh của ${product.name}`}>
    <GalleryThumbnails {...{ product, slots, activeIndex, onChange }} />
    <div className="flex-1 min-w-0 relative bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center min-h-72 sm:min-h-96 lg:min-h-[540px]">
      <span className="absolute top-3 left-3 z-10 rounded-lg bg-slate-900 px-2 py-1 text-white text-[10px] sm:text-xs font-bold">{product.brand}</span>
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        <button type="button" onClick={onZoom} aria-label="Phóng to ảnh" className="bg-white p-2 rounded-full"><ZoomIn className="w-4 h-4" /></button>
        <button type="button" onClick={onFavorite} aria-label="Lưu yêu thích" aria-pressed={!!favorite} className="bg-white p-2 rounded-full"><Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : ''}`} /></button>
      </div>
      <ProductImage src={slot.url} alt={`${product.name} - ảnh ${slot.position}`} className="w-full h-full min-h-72 sm:min-h-96" imgClassName="w-full max-h-[460px] object-contain" onClick={onZoom} />
      <p aria-live="polite" className="absolute bottom-3 inset-x-3 text-center text-[10px] text-slate-500">Ảnh {slot.position}/4{!slot.url && ' — Hình ảnh đang cập nhật'}</p>
    </div>
  </div>;
}
