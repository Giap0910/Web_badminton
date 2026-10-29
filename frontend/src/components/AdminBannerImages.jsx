import React, { useEffect, useRef, useState } from 'react';
import { bannerApi, bannerImageSource, emptyBannerSlots } from '../api/bannerApi.jsx';
import { validateProductImageFile } from './AdminProductImages';

const names = ['Vợt cầu lông', 'Giày cầu lông', 'Quần áo và túi', 'Phụ kiện'];

function useBannerDraft() {
  const [file, setFile] = useState(null), [preview, setPreview] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return { file, setFile, preview };
}

function BannerFilePicker({ position, disabled, select }) {
  return <div>
    <input id={`banner-image-${position}`} type="file" accept="image/jpeg,image/png" className="peer sr-only"
      disabled={disabled} onChange={event => { const file = event.target.files?.[0]; if (file) select(file); event.target.value = ''; }} />
    <label htmlFor={`banner-image-${position}`} className={`inline-flex rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-slate-200'}`}>
      Chọn ảnh banner {position}
    </label>
  </div>;
}

function useBannerEditor(slot, save) {
  const { file, setFile, preview } = useBannerDraft();
  const [approved, setApproved] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const select = selected => {
    setApproved(false); setNotice('');
    try { validateProductImageFile(selected); setFile(selected); setError(''); }
    catch (failure) { setError(failure.message); }
  };
  const submit = async () => {
    try {
      validateProductImageFile(file);
      if (!approved) throw new Error('Xác nhận quyền sử dụng ảnh trước khi lưu.');
      setError(''); setNotice(''); await save(slot.position, file, approved);
      if (active.current) { setFile(null); setApproved(false); setNotice(`Đã lưu banner ${slot.position}.`); }
    } catch (failure) { if (active.current) setError(failure.response?.data?.message || failure.message || 'Không lưu được banner. Ảnh cũ vẫn được giữ.'); }
  };
  return { file, setFile, preview, approved, setApproved, error, setError, notice, select, submit };
}

function BannerCardControls({ position, disabled, editor }) {
  const { file, approved, setApproved, error, notice, select, submit, setFile, setError } = editor;
  return <>
    <BannerFilePicker {...{ position, disabled, select }} />
    {file && <p className="text-xs text-slate-600 break-all">Đã chọn: {file.name}</p>}
    <label className="flex items-start gap-2 text-xs text-slate-700">
      <input type="checkbox" checked={approved} disabled={disabled} onChange={event => setApproved(event.target.checked)} />
      Tôi có quyền sử dụng ảnh banner này.
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled || !file || !approved} onClick={submit}
        className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">Lưu banner {position}</button>
      {file && <button type="button" disabled={disabled} onClick={() => { setFile(null); setApproved(false); setError(''); }}
        className="text-xs text-slate-600 underline">Bỏ ảnh vừa chọn</button>}
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
  </>;
}

export function BannerUploadCard({ slot, disabled, save }) {
  const editor = useBannerEditor(slot, save);
  const [failedImage, setFailedImage] = useState('');
  const source = editor.preview || bannerImageSource(slot.url);
  return <article aria-label={`Banner ${slot.position}`} className="rounded-xl border border-slate-200 p-4 space-y-3 min-w-0">
    <h3 className="text-sm font-bold">Banner {slot.position} — {names[slot.position - 1]}</h3>
    <div className="aspect-[8/3] rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
      {source && source !== failedImage ? <img src={source} alt={`Xem trước banner ${slot.position}`} className="w-full h-full object-cover"
        onError={() => setFailedImage(source)} /> : <p className="text-xs text-slate-500 px-3">{slot.url ? 'Chưa tải được ảnh đã lưu.' : 'Chưa có ảnh nền — trang chủ giữ giao diện hiện tại.'}</p>}
    </div>
    <BannerCardControls position={slot.position} disabled={disabled} editor={editor} />
  </article>;
}

export default function AdminBannerImages() {
  const [slots, setSlots] = useState(emptyBannerSlots), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const mounted = useRef(true), request = useRef(0), mutation = useRef(false);
  const load = async () => {
    if (mutation.current) return;
    const generation = ++request.current; setLoading(true); setError('');
    try { const data = await bannerApi.list(); if (mounted.current && generation === request.current) setSlots(data); }
    catch (failure) { if (mounted.current && generation === request.current) setError(failure.response?.data?.message || failure.message || 'Không tải được banner.'); }
    finally { if (mounted.current && generation === request.current) setLoading(false); }
  };
  useEffect(() => { mounted.current = true; load(); return () => { mounted.current = false; request.current++; }; }, []);
  const save = async (position, file, approved) => {
    if (mutation.current) throw new Error('Đang lưu banner khác. Vui lòng chờ.');
    mutation.current = true; setBusy(true);
    try {
      const result = await bannerApi.upload(position, file, approved);
      if (mounted.current) setSlots(previous => previous.map(slot => slot.position === position ? result : slot));
    } finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  return <BannerManagerPanel {...{ slots, loading, error, busy, load, save }} />;
}

function BannerManagerPanel({ slots, loading, error, busy, load, save }) {
  return <section aria-label="Quản lý banner trang chủ" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="font-black">Banner trang chủ</h2>
      <button type="button" disabled={loading || busy} onClick={load} className="text-xs font-bold underline">Tải lại banner</button></div>
    <p className="text-xs text-slate-600">Tải ảnh nền riêng cho 4 slide hiện có. JPG/PNG, tối đa 5 MB/ảnh. Nên dùng ảnh ngang khoảng 1600 × 600; ảnh sẽ được cắt vừa khung trên điện thoại. Nội dung chữ và nút bấm được giữ nguyên.</p>
    {loading && <p role="status" className="text-sm text-slate-600">Đang tải banner…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{slots.map(slot =>
      <BannerUploadCard key={slot.position} slot={slot} disabled={loading || busy || !!error} save={save} />)}</div>
  </section>;
}
