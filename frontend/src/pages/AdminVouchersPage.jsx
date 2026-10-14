import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '../api/adminApi';
import AdminLayout from '../components/AdminLayout';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Edit3,
  Trash2,
  Percent,
  TrendingUp,
  X,
  AlertCircle,
  Calendar
} from 'lucide-react';


export function buildAdminVoucherPayload(formData) {
  const amount = (value, label, optional = false) => {
    if (optional && String(value ?? '').trim() === '') return null;
    const number = Number(value);
    if (String(value ?? '').trim() === '' || !Number.isFinite(number) || number < 0 || number > 9999999999)
      throw new Error(`${label} không hợp lệ`);
    return number;
  };
  const discountValue = amount(formData.discountValue, 'Giá trị giảm');
  if (formData.discountType === 'PERCENT' && (discountValue <= 0 || discountValue > 100 || Number(discountValue.toFixed(2)) !== discountValue))
    throw new Error('Phần trăm giảm phải lớn hơn 0, không quá 100 và tối đa 2 chữ số thập phân');
  const payload = { code: formData.code.trim().toUpperCase(), description: formData.title.trim(),
    discountType: formData.discountType, discountValue, minOrderValue: amount(formData.minOrderValue || '0', 'Đơn tối thiểu'),
    maxDiscountAmount: amount(formData.maxDiscountAmount, 'Mức giảm tối đa', true),
    maxUses: amount(formData.maxUsage, 'Số lượt tối đa', true),
    expiresAt: formData.endDate ? `${formData.endDate}T23:59:59` : null, isActive: formData.isActive !== false };
  if (!/^[A-Z0-9_-]{1,50}$/.test(payload.code) || payload.description.length > 255) throw new Error('Mã hoặc mô tả voucher không hợp lệ');
  if (!['FIXED', 'PERCENT', 'SHIPPING'].includes(payload.discountType)) throw new Error('Loại voucher không hợp lệ');
  if ((payload.discountType !== 'PERCENT' && !Number.isInteger(discountValue))
    || ![payload.minOrderValue, payload.maxDiscountAmount, payload.maxUses].every(value => value === null || Number.isInteger(value)))
    throw new Error('Số tiền và số lượt phải là số nguyên');
  if (payload.maxUses !== null && payload.maxUses > 2147483647) throw new Error('Số lượt tối đa không hợp lệ');
  if (payload.discountType === 'SHIPPING' && discountValue === 0) throw new Error('Mức hỗ trợ vận chuyển phải từ 1 đồng');
  return payload;
}

const AdminVouchersPage = () => {
  const [dataError, setDataError] = useState('');
  const [vouchers, setVouchers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    discountType: 'FIXED',
    discountValue: '',
    minOrderValue: '',
    maxDiscountAmount: '',
    maxUsage: '100',
    startDate: '',
    endDate: '',
    isActive: true
  });
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenAdd = () => {
    if (mutationLock.current) return;
    setToastMessage('');
    setEditingId(null);
    setFormData({
      code: `HG${Math.floor(Math.random() * 90) + 10}K`,
      title: '',
      discountType: 'FIXED',
      discountValue: '100000',
      minOrderValue: '1000000',
      maxDiscountAmount: '',
      maxUsage: '100',
      startDate: '',
      endDate: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (v) => {
    if (mutationLock.current) return;
    setToastMessage('');
    setEditingId(v.id);
    setFormData({
      code: v.code,
      title: v.title,
      discountType: v.discountType,
      discountValue: v.discountValue.toString(),
      minOrderValue: v.minOrderValue.toString(),
      maxUsage: v.maxUsage == null ? '' : v.maxUsage.toString(),
      maxDiscountAmount: v.maxDiscountAmount == null ? '' : v.maxDiscountAmount.toString(),
      startDate: '',
      endDate: v.expiresAt?.slice(0, 10) || '',
      isActive: v.status === 'ACTIVE'
    });
    setShowModal(true);
  };

  const fetchVouchers = async () => {
    try {
      {
        const res = await adminApi.getAllVouchers();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (Array.isArray(list)) {
          const mapped = list.map((v, idx) => ({
            id: v.id || idx + 1,
            code: v.code || 'HG100K',
            title: v.title || v.description || 'Khuyến mãi HG Badminton',
            discountType: v.discountType || 'FIXED',
            discountValue: v.discountValue ?? 0,
            minOrderValue: v.minOrderValue ?? 0,
            usedCount: v.usedCount || 0,
            maxUsage: v.maxUses ?? null,
            maxDiscountAmount: v.maxDiscountAmount ?? null,
            startDate: v.startDate ? new Date(v.startDate).toLocaleDateString('vi-VN') : 'Không hỗ trợ lịch bắt đầu',
            expiresAt: v.expiresAt,
            endDate: v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn',
            status: v.isActive !== false ? 'ACTIVE' : 'INACTIVE'
          }));
          setVouchers(mapped);
          setDataError('');
        }
      }
    } catch (err) {
      setDataError(err.response?.data?.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleDelete = async (id) => {
    if (mutationLock.current) return;
    if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    mutationLock.current = true; setBusy(true);
    try {
      await adminApi.deleteVoucher(id);
      await fetchVouchers();
    } catch (err) {
      console.warn('Lỗi xóa voucher:', err);
      setToastMessage(err.response?.data?.message || 'Không thể xóa mã giảm giá.');
      setToastError(true);
      return;
    } finally {
      mutationLock.current = false; setBusy(false);
    }
    setToastMessage('Đã xóa mã giảm giá.');
    setToastError(false);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleToggleStatus = async (voucher) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true);
    try {
      await adminApi.updateVoucher(voucher.id, { isActive: voucher.status !== 'ACTIVE' });
      await fetchVouchers();
      setToastMessage(voucher.status === 'ACTIVE' ? 'Đã tắt mã giảm giá.' : 'Đã kích hoạt mã giảm giá.');
      setToastError(false);
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Không thể cập nhật trạng thái mã giảm giá.');
      setToastError(true);
    } finally {
      mutationLock.current = false; setBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mutationLock.current) return;
    try {
      const payload = buildAdminVoucherPayload(formData);
      mutationLock.current = true; setBusy(true);
      if (editingId) {
        await adminApi.updateVoucher(editingId, payload);
        setToastMessage('Đã cập nhật mã giảm giá thành công!');
      } else {
        await adminApi.createVoucher(payload);
        setToastMessage('Đã tạo mã giảm giá mới thành công!');
      }
      await fetchVouchers();
      setToastError(false);
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || 'Không thể lưu mã giảm giá.');
      setToastError(true);
      return;
    } finally {
      mutationLock.current = false; setBusy(false);
    }
    setShowModal(false);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const filteredVouchers = vouchers.filter(
    (v) =>
      v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Khuyến mãi" subtitle="Quản lý khuyến mãi & Mã Voucher">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
      <div className="flex flex-col gap-6">
        {/* HEADER & ACTION BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-secondary flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Quản lý mã Voucher & Khuyến mãi
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary text-white text-xs font-black">
                  {vouchers.filter((v) => v.status === 'ACTIVE').length} mã đang kích hoạt
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập chương trình giảm giá, mã coupon VIP và chính sách Freeship toàn quốc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all text-xs font-bold shadow-md hover:shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mã Voucher mới</span>
          </button>
        </div>

        {toastMessage && (
          <div role={toastError ? 'alert' : 'status'} className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${toastError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {toastError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 3 STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doanh số qua Voucher</span>
              <span className="text-2xl font-black text-slate-900 mt-1">Chưa có dữ liệu</span>
              <span className="text-[11px] text-emerald-600 font-bold mt-1">Chưa có dữ liệu</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lượt dùng thành công</span>
              <span className="text-2xl font-black text-secondary mt-1">Chưa có dữ liệu</span>
              <span className="text-[11px] text-slate-500 font-medium mt-1">Chưa có dữ liệu</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-secondary flex items-center justify-center">
              <Tag className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiết kiệm cho khách</span>
              <span className="text-2xl font-black text-emerald-600 mt-1">Chưa có dữ liệu</span>
              <span className="text-[11px] text-emerald-700 font-bold mt-1">Tăng độ gắn kết khách quen</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* SEARCH ROW */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã coupon (HG...), mô tả..."
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* VOUCHERS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Mã Coupon & Ưu đãi</th>
                  <th className="py-3.5 px-4">Đơn tối thiểu</th>
                  <th className="py-3.5 px-4">Lượt đã dùng</th>
                  <th className="py-3.5 px-4">Thời hạn</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-red-50 text-secondary font-mono font-black text-xs border border-red-200">
                            {v.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(v.code)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {copiedCode === v.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <span className="text-slate-900 font-bold leading-tight">{v.title}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <span className="font-bold text-slate-900">{formatPrice(v.minOrderValue)}</span>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-900">{v.usedCount} / {v.maxUsage ?? 'Không giới hạn'}</span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${v.maxUsage > 0 ? Math.min(100, (v.usedCount / v.maxUsage) * 100) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <span className="text-slate-600 block">{v.endDate}</span>
                      <span className="text-[11px] text-slate-400">Bắt đầu: {v.startDate}</span>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(v)}
                        disabled={busy}
                        title="Bật hoặc tắt mã giảm giá"
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {v.status === 'ACTIVE' ? 'Đang kích hoạt' : 'Tạm tắt'}
                      </button>
                    </td>

                    <td className="py-4 px-6 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(v)}
                          disabled={busy}
                          title="Chỉnh sửa voucher"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          disabled={busy}
                          title="Xóa voucher"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL TẠO / SỬA VOUCHER */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingId ? 'Chỉnh sửa Voucher' : 'Tạo mã Voucher mới'}
                  </h3>
                  <p className="text-xs text-slate-400">Áp dụng cho giỏ hàng và thanh toán trực tuyến</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={busy}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <fieldset disabled={busy} className="contents">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Mã Code <span className="text-secondary">*</span></label>
                    <input
                      type="text"
                      name="code"
                      required
                      disabled={Boolean(editingId)}
                      maxLength={50}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ví dụ: HG100K"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Loại giảm giá</label>
                    <select
                      name="discountType"
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    >
                      <option value="FIXED">Số tiền cố định (VNĐ)</option>
                      <option value="SHIPPING">Freeship (Miễn phí vận chuyển)</option>
                      <option value="PERCENT">Phần trăm (%)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Mô tả hiển thị</label>
                  <input
                    type="text"
                    name="description"
                    required
                    maxLength={255}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ví dụ: Giảm 100K cho đơn vợt từ 1 triệu"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">{formData.discountType === 'PERCENT' ? 'Giá trị giảm (%)' : formData.discountType === 'SHIPPING' ? 'Hỗ trợ phí vận chuyển tối đa (VNĐ)' : 'Giá trị giảm (VNĐ)'}</label>
                    <input
                      type="number"
                      name="discountValue"
                      required
                      min={formData.discountType === 'FIXED' ? 0 : formData.discountType === 'PERCENT' ? 0.01 : 1}
                      max={formData.discountType === 'PERCENT' ? 100 : 9999999999}
                      step={formData.discountType === 'PERCENT' ? 0.01 : 1}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      placeholder="100000"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Đơn hàng tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      name="minOrderValue"
                      required
                      min={0}
                      max={9999999999}
                      step={1}
                      value={formData.minOrderValue}
                      onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                      placeholder="1000000"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Giảm tiền hàng tối đa cho mã phần trăm (VNĐ, để trống nếu không giới hạn)</label>
                  <input name="maxDiscountAmount" type="number" min={0} max={9999999999} step={1} value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Lượt phát hành tối đa</label>
                    <input
                      type="number"
                      name="maxUses"
                      min={0}
                      max={2147483647}
                      step={1}
                      value={formData.maxUsage}
                      onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                      placeholder="Để trống: không giới hạn"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Ngày hết hạn</label>
                    <input
                      type="date"
                      name="expiresAt"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input name="isActive" type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                  Kích hoạt mã giảm giá
                </label>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm"
                  >
                    {busy ? 'Đang lưu...' : 'Lưu mã Voucher'}
                  </button>
                </div>
                </fieldset>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVouchersPage;
