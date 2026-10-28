import React, { useState } from 'react';
import { adminApi } from '../api/adminApi';

export default function AdminPaymentLog() {
  const [rows, setRows] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const load = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { setRows(await adminApi.paymentEvents()); }
    catch (failure) { setError(failure.response?.data?.message || 'Không đọc được log thanh toán.'); setRows([]); }
    finally { setBusy(false); }
  };
  return <><button disabled={busy} onClick={load} className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-bold">{busy ? 'Đang tải...' : 'Kiểm tra Webhook Log'}</button>
    {rows && <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"><div role="dialog" aria-label="Log thanh toán" className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
      <div className="flex justify-between mb-4"><h2 className="font-bold">50 sự kiện thanh toán gần nhất</h2><button onClick={() => setRows(null)}>Đóng</button></div>
      {error && <p role="alert" className="text-red-700">{error}</p>}{!rows.length && !error && <p>Chưa có sự kiện thanh toán được ghi nhận.</p>}
      <table className="text-xs w-full"><thead><tr><th>Mã đơn</th><th>Số tiền</th><th>Thời điểm nhận</th><th>Nguồn</th><th>Xử lý</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-2">{row.orderCode}</td><td>{row.amount?.toLocaleString('vi-VN')} ₫</td><td>{row.receivedAt}</td><td>{row.source}</td><td>{row.processingResult}<br />{row.reviewReason}</td></tr>)}</tbody></table>
    </div></div>}</>;
}
