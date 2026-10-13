import React, { useRef, useState } from 'react';
import { adminApi } from '../api/adminApi';

export function saveAdminFile(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminProductImport({ onImported }) {
  const [open, setOpen] = useState(false), [file, setFile] = useState(null), [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const lock = useRef(false);
  const act = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (failure) { setError(failure.response?.data?.message || failure.message || 'Không xử lý được file.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const check = () => act(async () => {
    if (!file || !file.name.toLowerCase().endsWith('.xlsx') || file.size > 1000000) throw new Error('Chọn file .xlsx không quá 1 MB.');
    setPreview(await adminApi.previewProducts(file));
  });
  const commit = () => act(async () => {
    if (!preview?.valid || !window.confirm(`Nhập ${preview.total} sản phẩm mới? Giá và tồn kho sẽ lấy đúng từ file.`)) return;
    const result = await adminApi.importProducts(file, preview.sha256);
    setMessage(`Đã nhập ${result.importedIds.length} sản phẩm. ID: ${result.importedIds.join(', ')}`);
    setPreview(null); setFile(null); await onImported();
  });
  return <ImportPanel {...{ open, setOpen, file, setFile, preview, setPreview, busy, error, message, act, check, commit }} />;
}

function ImportPanel({ open, setOpen, file, setFile, preview, setPreview, busy, error, message, act, check, commit }) {
  return <>
    <button onClick={() => setOpen(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">Nhập Excel</button>
    {open && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Nhập sản phẩm từ Excel" className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-4">
        <div className="flex justify-between"><h2 className="font-bold text-xl">Nhập sản phẩm từ Excel</h2><button disabled={busy} onClick={() => setOpen(false)} aria-label="Đóng nhập Excel">Đóng</button></div>
        <p className="text-xs text-slate-600">5 sheet: Vợt, Giày, Quần áo, Túi - Balo, Phụ kiện. Tối đa 1.000 dòng, 1 MB. Không nhập ảnh. Để catalogVisible trống sẽ nhập ở trạng thái ẩn; true để hiện, false để ẩn.</p>
        <p className="text-xs text-slate-600">File .xlsx có 5 sheet. Mỗi dòng là một biến thể: variantColor, variantSize, variantWeightGrip, variantPackaging, variantStock. Các dòng cùng SKU được gộp thành một sản phẩm; tên, giá và thông số chung phải giống nhau. Không dùng công thức, không nhập lại SKU đã có. catalogVisible mặc định false để kiểm tra trước khi hiện lên cửa hàng.</p>
        <button disabled={busy} onClick={() => act(async () => saveAdminFile(await adminApi.productTemplate(), 'product-import-template.xlsx'))} className="underline text-blue-600">Tải mẫu Excel</button>
        <input type="file" accept=".xlsx" disabled={busy} aria-label="File sản phẩm Excel" onChange={event => { setFile(event.target.files?.[0] || null); setPreview(null); }} />
        {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-emerald-700">{message}</p>}
        <button disabled={busy || !file} onClick={check} className="px-4 py-2 bg-slate-100 rounded-xl">{busy ? 'Đang xử lý...' : 'Kiểm tra và xem trước'}</button>
        {preview && <PreviewTable preview={preview} />}
        {preview && <button disabled={busy || !preview.valid} onClick={commit} className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">Xác nhận nhập {preview.total} sản phẩm</button>}
      </div>
    </div>}
  </>;
}

function PreviewTable({ preview }) {
  return <div className="text-xs"><p className="mb-2">{preview.total} dòng — {preview.valid ? 'Hợp lệ, chưa ghi Database' : 'Có lỗi, chưa thể nhập'}</p>
    <table className="w-full text-left"><thead><tr><th>Sheet / Dòng</th><th>SKU / Tên</th><th>Giá / Tồn</th><th>Kết quả</th></tr></thead>
      <tbody>{preview.rows.map(row => <tr key={`${row.sheet}-${row.row}`} className="border-t"><td className="p-2">{row.sheet} / {row.row}</td>
        <td className="p-2">{row.product?.sku}<br />{row.product?.name}</td><td className="p-2">{row.product?.price?.toLocaleString('vi-VN')} ₫ / {row.product?.stock}</td>
        <td className="p-2">{row.errors.length ? row.errors.join('; ') : row.product?.catalogVisible ? 'Hợp lệ — Hiện' : 'Hợp lệ — Ẩn'}</td></tr>)}</tbody>
    </table></div>;
}
