import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
import ProductImage from '../components/ProductImage';
import OrderItemOptions from '../components/OrderItemOptions';
import { isEligibleReturnLine, returnApi } from '../api/returnApi';
import { formatDate } from '../utils/formatters';
import { formatOrderItemOptionsText } from '../utils/orderItemOptions';
import { Plus, RotateCcw, Loader2, X, ShieldCheck } from 'lucide-react';

export const WARRANTY_STATUSES = { PENDING: 'Chờ xét duyệt', APPROVED: 'Đã duyệt đổi sản phẩm',
  REJECTED: 'Đã từ chối', COMPLETED: 'Đã đổi sản phẩm' };

export function readWarrantyList(response) {
  const list = response?.data ?? response;
  if (!Array.isArray(list)) throw new Error('Danh sách bảo hành không hợp lệ.');
  return list;
}

export function normalizeWarrantyRequest(item) {
  return { ...item, productName: item.productName || 'Xem sản phẩm trong đơn hàng',
    productImage: item.productImageUrl || null, statusLabel: WARRANTY_STATUSES[item.status] || 'Chưa rõ trạng thái',
    size: item.size || item.selectedSize || null, color: item.color || item.selectedColor || null,
    weightGrip: item.weightGrip || item.selectedWeight || null,
    evidenceAvailable: item.evidenceAvailable === true };
}

export function buildWarrantyRequestPayload(form, eligibleItems) {
  const item = eligibleItems.find(line => isEligibleReturnLine(line) && String(line.orderItemId) === String(form.orderItemId));
  if (!item) throw new Error('Vui lòng chọn mặt hàng đủ điều kiện bảo hành từ máy chủ.');
  const quantity = Number(form.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > Math.min(item.remainingQuantity, 100))
    throw new Error('Số lượng yêu cầu tối đa 100 và không được vượt số lượng còn đủ điều kiện bảo hành.');
  const reason = String(form.reason || '').trim();
  const serialNumber = String(form.serialNumber || '').trim();
  if (!reason || reason.length > 2000) throw new Error('Mô tả tình trạng phải từ 1 đến 2.000 ký tự.');
  if (serialNumber.length > 100) throw new Error('Serial không được vượt 100 ký tự.');
  return { orderId: item.orderId, orderItemId: item.orderItemId, quantity, reason, serialNumber: serialNumber || null };
}

export function validateWarrantyEvidence(file) {
  if (!file || !['image/jpeg', 'image/png'].includes(file.type) || !Number.isInteger(file.size) || file.size < 1 || file.size > 5 * 1024 * 1024)
    throw new Error('Ảnh minh chứng phải là JPG hoặc PNG, dung lượng tối đa 5MB.');
  return file;
}

export async function submitWarrantyRequest(payload, file, existingRequest, onCreated) {
  if (file) validateWarrantyEvidence(file);
  let request = existingRequest;
  if (!request) {
    request = (await returnApi.createReturnRequest(payload));
    request = request?.data ?? request;
    if (!Number.isSafeInteger(request?.id) || request.id < 1) throw new Error('Chưa nhận được mã phiếu bảo hành.');
    onCreated(request);
  }
  if (file) await returnApi.uploadEvidence(request.id, file);
  return request;
}

export function WarrantyFormFields({ form, eligibleItems, disabled, onChange }) {
  const selected = eligibleItems.find(item => String(item.orderItemId) === String(form.orderItemId));
  return <fieldset disabled={disabled} className="space-y-3 disabled:opacity-70">
    <label className="block text-xs font-bold">Sản phẩm đủ điều kiện bảo hành<select required aria-label="Sản phẩm bảo hành" value={form.orderItemId}
      onChange={event => onChange('orderItemId', event.target.value)} className="mt-1 block w-full rounded-xl border p-3 bg-slate-50">
      <option value="">Chọn mặt hàng đã giao thành công</option>{eligibleItems.filter(isEligibleReturnLine).map(item => <option key={item.orderItemId} value={item.orderItemId}>
        {`Đơn #${item.orderId} · ${item.productName} · ${formatOrderItemOptionsText(item)} · Còn ${item.remainingQuantity}`}</option>)}
    </select></label>
    {selected && <p className="text-xs text-slate-600">Hạn bảo hành: {formatDate(selected.warrantyDeadline)}. Còn {selected.remainingQuantity} sản phẩm có thể yêu cầu.</p>}
    <label className="block text-xs font-bold">Số lượng<input required aria-label="Số lượng bảo hành" type="number" min="1" max={Math.min(selected?.remainingQuantity || 1, 100)} step="1"
      value={form.quantity} onChange={event => onChange('quantity', event.target.value)} className="mt-1 block w-full rounded-xl border p-3 bg-slate-50" /></label>
    <label className="block text-xs font-bold">Serial / mã tem phân phối (nếu có)<input aria-label="Serial bảo hành" maxLength={100} value={form.serialNumber}
      onChange={event => onChange('serialNumber', event.target.value)} className="mt-1 block w-full rounded-xl border p-3 bg-slate-50" /></label>
    <label className="block text-xs font-bold">Mô tả chi tiết tình trạng<textarea required aria-label="Lý do bảo hành" maxLength={2000} rows={3} value={form.reason}
      onChange={event => onChange('reason', event.target.value)} className="mt-1 block w-full rounded-xl border p-3 bg-slate-50" /></label>
  </fieldset>;
}

function EvidenceControls({ request, onSaved }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);
  const previewRef = useRef('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (previewRef.current) URL.revokeObjectURL(previewRef.current); }; }, []);
  const perform = async operation => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (failure) { if (mounted.current) setError(failure.response?.data?.message || failure.message || 'Không xử lý được minh chứng.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const view = () => perform(async () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = ''; setPreview('');
    const result = await returnApi.getEvidence(request.id); const blob = result?.data ?? result;
    if (!mounted.current) return;
    if (!(blob instanceof Blob) || !['image/jpeg', 'image/png'].includes(blob.type)) throw new Error('Máy chủ không trả dữ liệu ảnh hợp lệ.');
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(blob); setPreview(previewRef.current);
  });
  const upload = () => perform(async () => {
    await returnApi.uploadEvidence(request.id, validateWarrantyEvidence(file));
    if (!mounted.current) return;
    setFile(null); if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = ''; setPreview(''); await onSaved();
  });
  return <div className="text-xs space-y-2">
    {request.evidenceAvailable && <button type="button" disabled={busy} onClick={view} className="text-blue-700 underline">Xem ảnh minh chứng riêng tư</button>}
    {preview && <img src={preview} alt="Minh chứng bảo hành" className="max-h-56 rounded-xl border" />}
    {request.status === 'PENDING' && <div className="flex flex-wrap gap-2 items-center">
      <input type="file" accept="image/jpeg,image/png" aria-label={`Ảnh minh chứng RMA ${request.id}`} disabled={busy} onChange={event => setFile(event.target.files?.[0] || null)} />
      <button type="button" disabled={busy || !file} onClick={upload} className="rounded-lg border px-3 py-2 text-blue-700">{busy ? 'Đang tải...' : 'Gửi ảnh minh chứng'}</button>
    </div>}{error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}

export function WarrantyRequestCard({ request, onSaved }) {
  const item = normalizeWarrantyRequest(request);
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><div><strong>RMA #{item.id}</strong>
      <span className="block text-xs text-slate-500">Ngày gửi: {formatDate(item.createdAt)}</span></div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{item.statusLabel}</span></div>
    <div className="flex gap-3"><div className="w-16 h-16 shrink-0"><ProductImage compact src={item.productImage} alt={item.productName} className="h-full w-full rounded-xl object-contain" /></div>
      <div className="space-y-1 text-xs"><strong>{item.productName}</strong><OrderItemOptions item={item} />
        <p>Số lượng yêu cầu: {item.quantity ?? 'Chưa có thông tin'}</p>{item.serialNumber && <p>Serial: {item.serialNumber}</p>}
        <Link to={`/orders/${item.orderId}`} className="text-blue-700 underline">Xem đơn #{item.orderId}</Link></div></div>
    <p className="rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap break-words">{item.reason}</p>
    {item.adminNote && <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs whitespace-pre-wrap break-words">Phản hồi của cửa hàng: {item.adminNote}</p>}
    {item.status === 'COMPLETED' && <p className="text-xs text-emerald-700">Cửa hàng đã hoàn tất đổi sản phẩm theo phiếu bảo hành.</p>}
    {item.replacementProductName && <div className="rounded-xl border bg-slate-50 p-3 text-xs space-y-1">
      <p>Sản phẩm đổi: <strong>{item.replacementProductName}</strong>{item.replacementSku ? ` · ${item.replacementSku}` : ''}</p>
      <OrderItemOptions item={{ size: item.replacementSize, color: item.replacementColor, weightGrip: item.replacementWeightGrip }} />
      {item.completedAt && <p>Hoàn tất: {formatDate(item.completedAt)}</p>}
    </div>}
    <EvidenceControls request={item} onSaved={onSaved} />
  </article>;
}

const blankForm = () => ({ orderItemId: '', quantity: '1', reason: '', serialNumber: '' });

export default function ReturnRequestPage() {
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get('orderId');
  const [returnRequests, setReturnRequests] = useState([]);
  const [eligibleItems, setEligibleItems] = useState([]);
  const [eligibilityReasons, setEligibilityReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibleLoading, setEligibleLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [eligibleError, setEligibleError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(Boolean(preselectedOrderId));
  const [form, setForm] = useState(blankForm);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submissionSnapshot, setSubmissionSnapshot] = useState(null);
  const [createdRequest, setCreatedRequest] = useState(null);
  const mounted = useRef(true);
  const listGeneration = useRef(0);
  const eligibleGeneration = useRef(0);
  const submissionLock = useRef(false);
  const payloadRef = useRef(null);
  const createdRef = useRef(null);

  const loadReturns = async () => {
    const generation = ++listGeneration.current; setLoading(true); setDataError('');
    try {
      const items = readWarrantyList(await returnApi.getMyReturns());
      if (mounted.current && generation === listGeneration.current) setReturnRequests(items);
    } catch (failure) {
      if (mounted.current && generation === listGeneration.current) {
        if ([401, 403].includes(failure.response?.status)) setReturnRequests([]);
        setDataError(failure.response?.data?.message || 'Không tải được phiếu bảo hành. Vui lòng thử lại.');
      }
    } finally { if (mounted.current && generation === listGeneration.current) setLoading(false); }
  };
  const loadEligibleItems = async () => {
    const generation = ++eligibleGeneration.current; setEligibleLoading(true); setEligibleError('');
    try {
      const items = readWarrantyList(await returnApi.getEligibleItems(preselectedOrderId ? { params: { orderId: preselectedOrderId } } : {}));
      if (mounted.current && generation === eligibleGeneration.current) {
        setEligibleItems(items.filter(isEligibleReturnLine));
        setEligibilityReasons(items.filter(item => !isEligibleReturnLine(item)).map(item => ({ id: item.orderItemId, name: item.productName, reason: item.ineligibleReason })));
      }
    } catch (failure) {
      if (mounted.current && generation === eligibleGeneration.current) {
        setEligibleItems([]); setEligibilityReasons([]); setEligibleError(failure.response?.data?.message || 'Không kiểm tra được điều kiện bảo hành. Vui lòng thử lại.');
      }
    } finally { if (mounted.current && generation === eligibleGeneration.current) setEligibleLoading(false); }
  };
  const refresh = () => Promise.all([loadReturns(), loadEligibleItems()]);
  useEffect(() => { mounted.current = true; refresh(); return () => { mounted.current = false; listGeneration.current++; eligibleGeneration.current++; }; }, []);
  useEffect(() => {
    if (preselectedOrderId && !payloadRef.current && !form.orderItemId) {
      const item = eligibleItems.find(line => String(line.orderId) === String(preselectedOrderId));
      if (item) setForm(previous => ({ ...previous, orderItemId: String(item.orderItemId) }));
    }
  }, [eligibleItems, preselectedOrderId]);
  const openNew = () => {
    if (payloadRef.current && !createdRef.current) { setShowCreateModal(true); return; }
    setForm(blankForm()); setFile(null); setFormError(''); setSuccessMsg('');
    payloadRef.current = null; createdRef.current = null; setSubmissionSnapshot(null); setCreatedRequest(null); setShowCreateModal(true);
    loadEligibleItems();
  };
  const onCreated = request => {
    createdRef.current = request; if (!mounted.current) return; setCreatedRequest(request);
    listGeneration.current++; setLoading(false);
    setReturnRequests(previous => [request, ...previous.filter(item => item.id !== request.id)]);
  };
  const handleCreateRequest = async (event) => {
    event.preventDefault(); if (submissionLock.current) return;
    let payload;
    try { if (file) validateWarrantyEvidence(file); payload = payloadRef.current || buildWarrantyRequestPayload(form, eligibleItems); }
    catch (failure) { setFormError(failure.message); return; }
    payloadRef.current = payload; setSubmissionSnapshot(payload); submissionLock.current = true; setSubmitting(true); setFormError('');
    try {
      await submitWarrantyRequest(payload, file, createdRef.current, onCreated);
      if (!mounted.current) return;
      setShowCreateModal(false); payloadRef.current = null; createdRef.current = null; setSubmissionSnapshot(null); setCreatedRequest(null);
      setForm(blankForm()); setFile(null); setSuccessMsg('Đã gửi phiếu bảo hành. Theo dõi kết quả xét duyệt từ cửa hàng.'); await refresh();
    } catch (failure) {
      if (!mounted.current) return;
      if (!createdRef.current && [400, 403, 404, 409, 422].includes(failure.response?.status)) { payloadRef.current = null; setSubmissionSnapshot(null); loadEligibleItems(); }
      setFormError(createdRef.current ? `Phiếu RMA #${createdRef.current.id} đã được tạo. ${failure.response?.data?.message || 'Chưa gửi được ảnh minh chứng.'} Bấm gửi lại ảnh cho phiếu này.`
        : failure.response?.data?.message || 'Chưa xác định được kết quả gửi phiếu. Kiểm tra lại cùng yêu cầu để tránh trùng.');
    } finally { submissionLock.current = false; if (mounted.current) setSubmitting(false); }
  };
  const filtered = returnRequests.filter(item => activeTab === 'ALL' || item.status === activeTab);
  const count = status => returnRequests.filter(item => item.status === status).length;
  return <UserLayout currentPage="Yêu cầu bảo hành" counts={{ returns: returnRequests.length }}>
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div><h1 className="text-xl font-black flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-secondary" />Yêu cầu bảo hành</h1>
          <p className="text-xs text-slate-600 mt-2">Bảo hành 1 đổi 1 trong 90 ngày từ ngày giao thành công được xác nhận; áp dụng cho vợt, giày, quần áo và túi. Phụ kiện không có ưu đãi bảo hành này.</p></div>
        <button type="button" onClick={openNew} disabled={submitting} className="rounded-xl bg-secondary text-white font-bold text-xs px-4 py-3 flex items-center gap-2"><Plus className="w-4 h-4" />Tạo yêu cầu mới</button>
      </div>
      {successMsg && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{successMsg}</p>}
      {dataError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{dataError} <button type="button" disabled={loading} onClick={loadReturns} className="underline">Thử lại</button></p>}
      <div className="grid sm:grid-cols-3 gap-3">{[['PENDING', 'Chờ xét duyệt'], ['APPROVED', 'Đã duyệt'], ['COMPLETED', 'Đã đổi sản phẩm']].map(([status, label]) =>
        <div key={status} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-600">{label}</p><strong className="text-2xl">{loading ? '—' : count(status)}</strong></div>)}</div>
      <div className="flex flex-wrap gap-2">{[['ALL', 'Tất cả'], ...Object.entries(WARRANTY_STATUSES)].map(([status, label]) =>
        <button key={status} type="button" onClick={() => setActiveTab(status)} className={`rounded-full px-4 py-2 text-xs font-bold ${activeTab === status ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>
          {label} ({status === 'ALL' ? returnRequests.length : count(status)})</button>)}</div>
      {loading ? <p role="status" className="text-sm text-slate-600 flex gap-2"><Loader2 className="w-4 h-4 animate-spin" />Đang tải phiếu bảo hành...</p>
        : filtered.length === 0 ? <p className="rounded-xl border bg-white p-6 text-sm text-slate-600">Chưa có phiếu bảo hành trong mục này.</p>
          : filtered.map(request => <WarrantyRequestCard key={request.id} request={request} onSaved={refresh} />)}
    </div>
    {showCreateModal && <div className="fixed inset-0 z-50 bg-slate-900/60 p-4 flex justify-center items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="warranty-modal-title" className="rounded-3xl bg-white border shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-center"><h2 id="warranty-modal-title" className="font-black flex gap-2"><RotateCcw className="w-5 h-5" />Tạo yêu cầu bảo hành</h2>
          <button type="button" aria-label="Đóng yêu cầu bảo hành" disabled={submitting} onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button></div>
        {eligibleLoading && <p role="status" className="text-xs text-slate-600">Đang kiểm tra mặt hàng đủ điều kiện...</p>}
        {eligibleError && <p role="alert" className="text-xs text-red-700">{eligibleError} <button type="button" onClick={loadEligibleItems} className="underline">Thử lại</button></p>}
        {!eligibleLoading && !eligibleError && eligibleItems.length === 0 && !createdRequest && <p className="text-xs text-slate-600">Chưa có mặt hàng đủ điều kiện hoặc đã hết hạn/số lượng có thể bảo hành.</p>}
        {!eligibleLoading && eligibilityReasons.length > 0 && <ul className="text-xs text-slate-600 space-y-1">{eligibilityReasons.map(item =>
          <li key={item.id}>{item.name}: {item.reason || 'Chưa đủ điều kiện bảo hành.'}</li>)}</ul>}
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <WarrantyFormFields form={form} eligibleItems={eligibleItems} disabled={submitting || Boolean(submissionSnapshot) || eligibleLoading || Boolean(eligibleError)}
            onChange={(key, value) => setForm(previous => ({ ...previous, [key]: value, ...(key === 'orderItemId' ? { quantity: '1' } : {}) }))} />
          <label className="block text-xs font-bold">Ảnh minh chứng riêng tư (tùy chọn, JPG/PNG tối đa 5MB)<input type="file" accept="image/jpeg,image/png" aria-label="Ảnh minh chứng bảo hành"
            disabled={submitting} onChange={event => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full" /></label>
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{formError}</p>}
          {submissionSnapshot && !createdRequest && !submitting && <p className="text-xs text-amber-800">Yêu cầu trước chưa có kết quả chắc chắn. Kiểm tra lại sẽ giữ nguyên mặt hàng, số lượng, lý do và serial.</p>}
          <button type="submit" disabled={submitting || (!submissionSnapshot && (eligibleLoading || Boolean(eligibleError) || eligibleItems.length === 0)) || Boolean(createdRequest && !file)}
            className="w-full rounded-xl bg-secondary text-white font-bold text-xs p-3 disabled:opacity-50">
            {submitting ? 'Đang gửi...' : createdRequest ? 'Gửi lại ảnh cho phiếu đã tạo' : submissionSnapshot ? 'Kiểm tra lại yêu cầu đã gửi' : 'Gửi yêu cầu'}</button>
        </form>
      </div>
    </div>}
  </UserLayout>;
}
