import React, { useRef, useState } from 'react';
import { productApi } from '../api/productApi';
import { buildAdminVariantPayload, buildAdminVariantStockPayload } from '../utils/adminProductForm';

export async function saveVariantInventory(productId, variant, stock, active, onSaved) {
  await productApi.updateVariant(productId, variant.id, buildAdminVariantStockPayload(variant, stock, active));
  if (await onSaved() === false) throw new Error('Đã lưu biến thể nhưng chưa tải lại được dữ liệu. Vui lòng tải lại danh sách.');
}

export async function createVariantInventory(product, form, onSaved) {
  const created = await productApi.createVariant(product.id, buildAdminVariantPayload(form, product.categoryId));
  if (await onSaved() === false) throw new Error('Đã thêm biến thể nhưng chưa tải lại được dữ liệu. Vui lòng tải lại danh sách trước khi thêm tiếp.');
  return created;
}

function VariantRow({ productId, variant, busy, run }) {
  const [value, setValue] = useState(String(variant.stock ?? 0));
  const [active, setActive] = useState(variant.active === true);
  const [error, setError] = useState('');
  const save = async () => {
    setError('');
    try { await run(onSaved => saveVariantInventory(productId, variant, value, active, onSaved)); }
    catch (failure) { setError(failure.response?.data?.message || failure.message || 'Không cập nhật được biến thể.'); }
  };
  return <tr className="border-t"><td className="py-2 pr-3 max-w-56 break-words">
    {[variant.color, variant.size, variant.weightGrip, variant.packaging].filter(Boolean).join(' / ') || 'Tiêu chuẩn'}
    {variant.legacy && <span className="block text-amber-700">Hàng cũ cần đối soát</span>}
    <span className="block text-slate-400">{variant.sku}</span></td>
    <td className="px-2">{variant.reservedStock ?? 0}</td><td className="px-2"><input type="number" min="0" max="1000000"
      aria-label={`Tồn kho ${variant.sku}`} disabled={busy || variant.legacy} value={value} onChange={e => setValue(e.target.value)} className="w-20 rounded border p-1" /></td>
    <td className="px-2"><label className="whitespace-nowrap"><input type="checkbox" checked={active}
      aria-label={`Đang bán ${variant.sku}`} onChange={event => setActive(event.target.checked)}
      disabled={busy || variant.legacy || Number(variant.reservedStock) > 0} /> Đang bán</label>
      {Number(variant.reservedStock) > 0 && <span className="block text-amber-700">Chưa thể ngừng bán khi đang giữ chỗ</span>}</td>
    <td><button type="button" disabled={busy || variant.legacy} onClick={save} className="text-blue-700 font-bold disabled:text-slate-400">{busy ? 'Đang lưu' : 'Lưu'}</button>
      {error && <p role="alert" className="text-red-700">{error}</p>}</td></tr>;
}

function NewVariantForm({ product, busy, run }) {
  const [form, setForm] = useState({ color: '', size: '', weightGrip: '', packaging: '', stock: '20' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const category = Number(product.categoryId);
  const fields = [['color', 'Màu sắc (tùy chọn)', 200], ...([2, 3].includes(category) ? [['size', 'Kích cỡ', 50]] : []),
    ...(category === 1 ? [['weightGrip', 'Trọng lượng và cán', 50]] : []), ...([4, 5].includes(category) ? [['packaging', 'Quy cách (tùy chọn)', 100]] : [])];
  const submit = async event => {
    event.preventDefault(); setError(''); setSuccess('');
    try {
      await run(onSaved => createVariantInventory(product, form, onSaved));
      setForm({ color: '', size: '', weightGrip: '', packaging: '', stock: '20' }); setSuccess('Đã thêm tổ hợp mới.');
    } catch (failure) { setError(failure.response?.data?.message || failure.message || 'Không thêm được biến thể.'); }
  };
  return <form onSubmit={submit} className="mt-4 border-t pt-3 space-y-2">
    <p className="font-bold">Thêm tổ hợp mới</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {fields.map(([key, label, maxLength]) => <label key={key}>{label}<input aria-label={label} value={form[key]}
        disabled={busy} maxLength={maxLength} required={key === 'size' || key === 'weightGrip'}
        placeholder={key === 'weightGrip' ? 'Ví dụ: 4U-G5' : key === 'size' && category === 2 ? '35 đến 42' : undefined}
        onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} className="block w-full rounded border p-2" /></label>)}
      <label>Tồn kho khả dụng<input aria-label="Tồn kho tổ hợp mới" type="number" required min="0" max="1000000" step="1"
        disabled={busy} value={form.stock} onChange={event => setForm(previous => ({ ...previous, stock: event.target.value }))} className="block w-full rounded border p-2" /></label>
    </div><p className="text-slate-600">Mỗi dòng là một tổ hợp màu/kích cỡ/trọng lượng/quy cách; giá dùng chung theo sản phẩm.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}{success && <p role="status" className="text-emerald-700">{success}</p>}
    <button type="submit" disabled={busy} className="rounded bg-blue-600 text-white px-3 py-2 disabled:opacity-50">{busy ? 'Đang lưu...' : 'Thêm biến thể'}</button>
  </form>;
}

export default function AdminVariantInventory({ product, onSaved }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = async operation => {
    if (lock.current) throw new Error('Đang xử lý biến thể. Vui lòng chờ hoàn tất.');
    lock.current = true; setBusy(true);
    try { return await operation(onSaved); }
    finally { lock.current = false; setBusy(false); }
  };
  return <details className="mt-2 text-xs"><summary className="cursor-pointer text-blue-700">Tồn từng biến thể</summary>
    <div className="overflow-x-auto rounded border bg-white p-3 mt-2">
      {product.variants?.length ? <table className="min-w-[550px]">
        <thead><tr><th className="text-left">Biến thể</th><th>Giữ chỗ</th><th>Khả dụng</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>{product.variants.map(v => <VariantRow key={`${v.id}-${v.stock}-${v.active}-${v.reservedStock}`} productId={product.id} variant={v} busy={busy} run={run} />)}</tbody>
      </table> : <p>Chưa có biến thể. Thêm tổ hợp cụ thể trước khi bán sản phẩm có lựa chọn.</p>}
      <NewVariantForm product={product} busy={busy} run={run} />
    </div></details>;
}
