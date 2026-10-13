import React, { useState } from 'react';
import { productApi } from '../api/productApi';

function VariantRow({ productId, variant, onSaved }) {
  const [value, setValue] = useState(String(variant.stock ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) { setError('Nhập số nguyên từ 0 đến 1.000.000'); return; }
    setBusy(true); setError('');
    try {
      await productApi.updateVariant(productId, variant.id, { stock, expectedStock: variant.stock });
      await onSaved();
    } catch (failure) { setError(failure.response?.data?.message || 'Không cập nhật được tồn kho.'); }
    finally { setBusy(false); }
  };
  return <tr className="border-t"><td className="py-2 pr-3 max-w-56 break-words">
    {[variant.color, variant.size, variant.weightGrip, variant.packaging].filter(Boolean).join(' / ') || 'Tiêu chuẩn'}
    {variant.legacy && <span className="block text-amber-700">Hàng cũ cần đối soát</span>}
    <span className="block text-slate-400">{variant.sku}</span></td>
    <td className="px-2">{variant.reservedStock ?? 0}</td><td className="px-2"><input type="number" min="0" max="1000000"
      aria-label={`Tồn kho ${variant.sku}`} disabled={busy || variant.legacy} value={value} onChange={e => setValue(e.target.value)} className="w-20 rounded border p-1" /></td>
    <td><button type="button" disabled={busy || variant.legacy} onClick={save} className="text-blue-700 font-bold disabled:text-slate-400">{busy ? 'Đang lưu' : 'Lưu'}</button>
      {error && <p role="alert" className="text-red-700">{error}</p>}</td></tr>;
}

export default function AdminVariantInventory({ product, onSaved }) {
  if (!product.variants?.length) return null;
  return <details className="mt-2 text-xs"><summary className="cursor-pointer text-blue-700">Tồn từng biến thể</summary>
    <div className="overflow-x-auto rounded border bg-white p-3 mt-2"><table className="min-w-96">
      <thead><tr><th className="text-left">Biến thể</th><th>Giữ chỗ</th><th>Khả dụng</th><th /></tr></thead>
      <tbody>{product.variants.map(v => <VariantRow key={`${v.id}-${v.stock}`} productId={product.id} variant={v} onSaved={onSaved} />)}</tbody>
    </table></div></details>;
}
