import React, { useEffect, useRef, useState } from 'react';
import { adminApi } from '../api/adminApi';

export function saveAdminFile(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminProductImport({ onImported }) {
  const [open, setOpen] = useState(false), [file, setFile] = useState(null), [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [importedProducts, setImportedProducts] = useState([]);
  const lock = useRef(false), dialog = useRef(null), trigger = useRef(null);
  useImportDialog(open, dialog, trigger, lock, setOpen);
  const close = () => { if (!lock.current) setOpen(false); };
  const act = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (failure) { setError(failure.response?.data?.message || failure.message || 'Không xử lý được file.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const check = () => act(() => previewImportFile(file, setPreview));
  const commit = () => act(async () => {
    if (!preview?.valid || !window.confirm(`Nhập ${preview.total} sản phẩm mới? Giá và tồn kho sẽ lấy đúng từ file.`)) return;
    const result = await adminApi.importProducts(file, preview.sha256);
    setMessage(`Đã nhập ${result.importedIds.length} sản phẩm. Chọn sản phẩm bên dưới để xem trong quản trị.`);
    setImportedProducts(result.importedIds.map((id, index) => ({ id, product: result.rows?.[index]?.product })));
    setPreview(null); setFile(null); await onImported();
  });
  return <ImportPanel {...{ open, setOpen, close, dialog, trigger, file, setFile, preview, setPreview, busy, error, message, importedProducts, act, check, commit }} />;
}

async function previewImportFile(file, setPreview) {
  if (!file || !file.name.toLowerCase().endsWith('.xlsx') || file.size > 1000000) throw new Error('Chọn file .xlsx không quá 1 MB.');
  setPreview(await adminApi.previewProducts(file));
}

function useImportDialog(open, dialog, trigger, lock, setOpen) {
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const handler = event => handleImportDialogKey(event, dialog.current, lock, setOpen);
    const first = dialog.current?.querySelectorAll(importFocusableSelector)[0];
    (first || dialog.current)?.focus();
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      const target = trigger.current || previousFocus;
      if (target?.isConnected !== false) target?.focus();
    };
  }, [open]);
}

const importFocusableSelector = 'button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function handleImportDialogKey(event, dialog, lock, setOpen) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); event.stopPropagation(); return;
  }
  if (event.key === 'Escape') {
    event.preventDefault(); if (!lock.current) setOpen(false); return;
  }
  if (event.key !== 'Tab' || !dialog) return;
  const items = Array.from(dialog.querySelectorAll(importFocusableSelector));
  const first = items[0], last = items[items.length - 1];
  if (!items.length) { event.preventDefault(); dialog.focus(); return; }
  const outside = !dialog.contains(document.activeElement);
  if (outside || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
    event.preventDefault(); (event.shiftKey ? last : first).focus();
  }
}

function ImportPanel({ open, setOpen, close, dialog, trigger, file, setFile, preview, setPreview, busy, error, message, importedProducts, act, check, commit }) {
  return <>
    <button ref={trigger} onClick={() => setOpen(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">Nhập Excel</button>
    {open && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Nhập sản phẩm từ Excel" aria-busy={busy} className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-4">
        <div className="flex justify-between"><h2 className="font-bold text-xl">Nhập sản phẩm từ Excel</h2><button disabled={busy} onClick={close} aria-label="Đóng nhập Excel">Đóng</button></div>
        <p className="text-xs text-slate-600">5 sheet: Vợt, Giày, Quần áo, Túi - Balo, Phụ kiện. Tối đa 1.000 dòng, 1 MB. Không nhập ảnh. Để catalogVisible trống sẽ nhập ở trạng thái ẩn; true để hiện, false để ẩn.</p>
        <p className="text-xs text-slate-600">File .xlsx có 5 sheet. Mỗi dòng là một biến thể: variantColor, variantSize, variantWeightGrip, variantPackaging, variantStock. Các dòng cùng SKU được gộp thành một sản phẩm; tên, giá và thông số chung phải giống nhau. Không dùng công thức, không nhập lại SKU đã có. catalogVisible mặc định false để kiểm tra trước khi hiện lên cửa hàng.</p>
        <button disabled={busy} onClick={() => act(async () => saveAdminFile(await adminApi.productTemplate(), 'product-import-template.xlsx'))} className="underline text-blue-600">Tải mẫu Excel</button>
        <input type="file" accept=".xlsx" disabled={busy} aria-label="File sản phẩm Excel" onChange={event => { setFile(event.target.files?.[0] || null); setPreview(null); }} />
        {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-emerald-700">{message}</p>}
        {importedProducts.length > 0 && <ImportedProducts products={importedProducts} />}
        <button disabled={busy || !file} onClick={check} className="px-4 py-2 bg-slate-100 rounded-xl">{busy ? 'Đang xử lý...' : 'Kiểm tra và xem trước'}</button>
        {preview && <PreviewTable preview={preview} />}
        {preview && <button disabled={busy || !preview.valid} onClick={commit} className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">Xác nhận nhập {preview.total} sản phẩm</button>}
      </div>
    </div>}
  </>;
}

function PreviewTable({ preview }) {
  const variantCount = preview.rows.reduce((total, row) => total + (row.product?.variants?.length || 0), 0);
  return <div className="text-xs overflow-x-auto"><p className="mb-2">{preview.total} sản phẩm · {variantCount} biến thể khai báo — {preview.valid ? 'Hợp lệ, chưa ghi Database' : 'Có lỗi, chưa thể nhập'}</p>
    <table className="w-full text-left"><thead><tr><th>Sheet / Dòng đầu</th><th>SKU / Tên</th><th>Giá / Tổng tồn</th><th>Biến thể / Tồn từng loại</th><th>Kết quả</th></tr></thead>
      <tbody>{preview.rows.map(row => <tr key={`${row.sheet}-${row.row}`} className="border-t"><td className="p-2">{row.sheet} / {row.row}</td>
        <td className="p-2">{row.product?.sku}<br />{row.product?.name}</td><td className="p-2">{row.product?.price?.toLocaleString('vi-VN')} ₫ / {row.product?.stock}</td>
        <td className="p-2"><PreviewVariants product={row.product} /></td>
        <td className="p-2">{row.errors.length ? row.errors.join('; ') : row.product?.catalogVisible ? 'Hợp lệ — Hiện' : 'Hợp lệ — Ẩn'}</td></tr>)}</tbody>
    </table></div>;
}

function PreviewVariants({ product }) {
  if (!product?.variants?.length) return <span>Chưa khai báo biến thể riêng.</span>;
  return <ul className="space-y-2 min-w-48">{product.variants.map((variant, index) => <li key={index} className="border-b border-slate-100 pb-1">
    <div>Màu: {variant.color?.trim() || product.colorName || '—'} · Size: {variant.size || '—'}</div>
    <div>Trọng lượng / cán: {variant.weightGrip || '—'}</div>
    <div>Quy cách: {variant.packaging?.trim() || product.quantityPerPack || '—'} · Tồn: {variant.stock ?? '—'}</div>
  </li>)}</ul>;
}

function ImportedProducts({ products }) {
  return <ul className="text-xs space-y-2">{products.map(({ id, product }) => <li key={id} className="rounded-lg border border-emerald-100 p-3">
    <a href={`/admin/products?search=${encodeURIComponent(id)}`} className="font-bold text-blue-600 underline">ID: {id} · {product?.sku || 'Chưa có SKU'} · {product?.name || 'Xem sản phẩm'}</a>
    <p className="mt-1 text-slate-600">{typeof product?.catalogVisible === 'boolean' ? product.catalogVisible ? 'Đang hiển thị' : 'Đang ẩn' : 'Kiểm tra trạng thái trong quản trị'}</p>
  </li>)}</ul>;
}
