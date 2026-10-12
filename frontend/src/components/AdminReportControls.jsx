import React, { useRef, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { saveAdminFile } from './AdminProductImport';

export default function AdminReportControls({ range, onRangeChange }) {
  const [draft, setDraft] = useState(range), [format, setFormat] = useState('xlsx');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const download = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { saveAdminFile(await adminApi.exportReport({ ...range, format }), `badminton-report.${format}`); }
    catch (failure) { setError(await downloadError(failure)); }
    finally { lock.current = false; setBusy(false); }
  };
  const apply = event => {
    event.preventDefault(); setError('');
    if (!draft.from || !draft.to || draft.from > draft.to) { setError('Chọn đủ khoảng ngày hợp lệ.'); return; }
    onRangeChange(draft);
  };
  const reset = () => { setDraft({ from: '', to: '' }); setError(''); onRangeChange({ from: '', to: '' }); };
  return <div className="space-y-2"><DateFilter {...{ draft, setDraft, apply, reset }} />
    <div className="flex gap-2 justify-end"><select aria-label="Định dạng báo cáo" value={format} onChange={event => setFormat(event.target.value)} className="text-xs bg-slate-50 border rounded-xl px-3">
      <option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV UTF-8</option></select>
      <button disabled={busy} onClick={download} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs">{busy ? 'Đang xuất...' : 'Xuất báo cáo'}</button></div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}

function DateFilter({ draft, setDraft, apply, reset }) {
  return <form onSubmit={apply} className="flex flex-wrap items-center gap-2 text-xs">
    <label>Từ ngày <input type="date" value={draft.from || ''} onInput={event => setDraft({ ...draft, from: event.target.value })} onChange={event => setDraft({ ...draft, from: event.target.value })} className="border rounded-lg px-2 py-1" /></label>
    <label>Đến ngày <input type="date" value={draft.to || ''} onInput={event => setDraft({ ...draft, to: event.target.value })} onChange={event => setDraft({ ...draft, to: event.target.value })} className="border rounded-lg px-2 py-1" /></label>
    <button type="submit" className="px-3 py-2 rounded-lg bg-slate-100 font-bold">Áp dụng</button>
    <button type="button" onClick={reset} className="underline">Toàn thời gian</button>
  </form>;
}

async function downloadError(error) {
  if (error.response?.data instanceof Blob) {
    try { return JSON.parse(await error.response.data.text()).message || 'Không xuất được báo cáo.'; } catch {}
  }
  return error.response?.data?.message || 'Không xuất được báo cáo. Vui lòng thử lại.';
}
