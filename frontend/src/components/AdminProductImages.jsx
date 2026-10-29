import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { internalProductImage } from '../utils/productMedia.js';

export const emptyProductImageFiles = () => Array(4).fill(null);

export function validateProductImageFile(file) {
  if (!file || !['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Chọn ảnh JPG hoặc PNG.');
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Mỗi ảnh phải lớn hơn 0 và tối đa 5 MB.');
}

export function validateProductImageSelection({ files, slots, approved, isNew }) {
  files.filter(Boolean).forEach(validateProductImageFile);
  if (files.some(Boolean) && !approved) throw new Error('Xác nhận quyền sử dụng và ảnh đúng sản phẩm trước khi lưu.');
  if (isNew && files.some((file, index) => !file && !internalProductImage(slots?.[index]?.url)))
    throw new Error('Sản phẩm mới cần đủ ảnh 1–2–3–4 trước khi công khai.');
}

export async function saveProductWithImages(options) {
  const { payload, files, approved, isNew, onDraft, onUploaded, onProgress } = options;
  validateProductImageSelection(options);
  let id = options.productId;
  if (id == null) {
    const draft = await adminApi.createProductDraft(payload);
    if (!Number.isSafeInteger(draft?.id) || draft.id <= 0) throw new Error('Máy chủ chưa xác nhận ID bản nháp.');
    id = draft.id; onDraft(draft);
  } else await adminApi.updateProduct(id, payload);
  for (let index = 0; index < 4; index++) {
    if (!files[index]) continue;
    onProgress(index + 1);
    const slots = await adminApi.uploadProductImage(id, index + 1, files[index], approved);
    if (!Array.isArray(slots) || slots.length !== 4 || slots[index]?.position !== index + 1
        || !internalProductImage(slots[index]?.url)) throw new Error(`Chưa xác nhận lưu ảnh ${index + 1}. Vui lòng thử lại.`);
    onUploaded(index, slots);
  }
  if (isNew) await adminApi.publishProduct(id);
  return id;
}

function useImagePreview(productId, position, file, savedUrl) {
  const [preview, setPreview] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    let active = true, objectUrl;
    const controller = new AbortController(); setPreview(''); setError('');
    const load = async () => {
      try {
        const blob = file || (savedUrl && productId ? await adminApi.getProductImagePreview(productId, position, controller.signal) : null);
        if (!blob || !active) return;
        objectUrl = URL.createObjectURL(blob); setPreview(objectUrl);
      } catch { if (active) setError('Chưa tải được ảnh xem trước; ảnh đã lưu vẫn được giữ.'); }
    };
    load();
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [productId, position, file, savedUrl]);
  return { preview, error };
}

function ProductImageSlot({ index, file, slot, productId, disabled, uploading, onSelect }) {
  const { preview, error } = useImagePreview(productId, index + 1, file, slot?.url);
  return <div className="rounded-xl border border-slate-200 p-3 min-w-0 space-y-2">
    <p className="text-xs font-bold text-slate-900">Ảnh {index + 1}{index === 0 && ' — Ảnh đại diện'}</p>
    <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center">
      {preview ? <img src={preview} alt={`Xem trước ảnh ${index + 1}`} className="w-full h-full object-contain" />
        : <span className="text-xs text-slate-500 px-2 text-center">{slot?.url ? 'Ảnh đã lưu' : 'Chưa có ảnh'}</span>}
    </div>
    <input id={`product-image-${index + 1}`} type="file" accept="image/jpeg,image/png" disabled={disabled}
      className="peer sr-only"
      onChange={event => { const selected = event.target.files?.[0]; if (selected) onSelect(index, selected); event.target.value = ''; }} />
    <label htmlFor={`product-image-${index + 1}`} className={`inline-flex rounded-lg bg-slate-100 p-2 text-xs font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-200'}`}>
      {slot?.url ? 'Thay ảnh' : 'Chọn ảnh'} {index + 1}
    </label>
    {file && <button type="button" disabled={disabled} onClick={() => onSelect(index, null)} className="text-xs text-slate-600 underline">Bỏ ảnh vừa chọn</button>}
    <p className="text-xs text-slate-600 break-words" role="status">{uploading ? 'Đang tải…' : file ? `Đã chọn: ${file.name}` : slot?.url ? 'Đã lưu' : 'Chưa tải'}</p>
    {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
  </div>;
}

export default function AdminProductImages({ productId, files, slots, approved, onApproved, onSelect, disabled, uploading }) {
  return <section aria-label="Bốn ảnh sản phẩm" className="space-y-3 border-t border-slate-100 pt-4">
    <h3 className="text-sm font-bold">Ảnh sản phẩm 1–2–3–4</h3>
    <p className="text-xs text-slate-600">JPG/PNG, tối đa 5 MB/ảnh. Ảnh 1 là ảnh đại diện. Ảnh mới chỉ được tải khi bấm Lưu sản phẩm; thay ảnh giữ nguyên file cũ.</p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {files.map((file, index) => <ProductImageSlot key={index} {...{ index, file, productId, disabled, onSelect }}
        slot={slots?.[index]} uploading={uploading === index + 1} />)}
    </div>
    <label className="flex items-start gap-2 text-xs text-slate-700">
      <input type="checkbox" checked={approved} disabled={disabled} onChange={event => onApproved(event.target.checked)} />
      Tôi xác nhận có quyền sử dụng và các ảnh đã chọn đúng sản phẩm này.
    </label>
    {productId && <p className="text-xs text-slate-500">ID sản phẩm: {productId}. Các ảnh đã tải thành công được giữ khi thử lại.</p>}
  </section>;
}
