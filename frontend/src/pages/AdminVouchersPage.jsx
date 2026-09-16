import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { voucherApi } from '../api/voucherApi';
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

const INITIAL_VOUCHERS = [
  {
    id: 1,
    code: 'APEX100K',
    title: 'Giảm 100K cho đơn vợt từ 1.000.000₫',
    discountType: 'FIXED',
    discountValue: 100000,
    minOrderValue: 1000000,
    usedCount: 85,
    maxUsage: 100,
    startDate: '01/10/2024',
    endDate: '31/12/2024',
    status: 'ACTIVE'
  },
  {
    id: 2,
    code: 'FREESHIP',
    title: 'Miễn phí vận chuyển toàn quốc cho đơn từ 1.000.000₫',
    discountType: 'SHIPPING',
    discountValue: 30000,
    minOrderValue: 1000000,
    usedCount: 240,
    maxUsage: 500,
    startDate: '01/09/2024',
    endDate: '31/12/2024',
    status: 'ACTIVE'
  },
  {
    id: 3,
    code: 'VIPGOLD200K',
    title: 'Đặc quyền thành viên VIP Hạng Vàng',
    discountType: 'FIXED',
    discountValue: 200000,
    minOrderValue: 2500000,
    usedCount: 42,
    maxUsage: 150,
    startDate: '15/10/2024',
    endDate: '30/11/2024',
    status: 'ACTIVE'
  },
  {
    id: 4,
    code: 'WELCOME50K',
    title: 'Tặng khách hàng mới đăng ký tài khoản',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderValue: 500000,
    usedCount: 110,
    maxUsage: 110,
    startDate: '01/08/2024',
    endDate: '30/09/2024',
    status: 'EXPIRED'
  }
];

const AdminVouchersPage = () => {
  const [vouchers, setVouchers] = useState(INITIAL_VOUCHERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    discountType: 'FIXED',
    discountValue: '',
    minOrderValue: '',
    maxUsage: '100',
    startDate: '2024-10-24',
    endDate: '2024-12-31'
  });

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      code: `APEX${Math.floor(Math.random() * 90) + 10}K`,
      title: '',
      discountType: 'FIXED',
      discountValue: '100000',
      minOrderValue: '1000000',
      maxUsage: '100',
      startDate: '2024-10-24',
      endDate: '2024-12-31'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (v) => {
    setEditingId(v.id);
    setFormData({
      code: v.code,
      title: v.title,
      discountType: v.discountType,
      discountValue: v.discountValue.toString(),
      minOrderValue: v.minOrderValue.toString(),
      maxUsage: v.maxUsage.toString(),
      startDate: '2024-10-24',
      endDate: '2024-12-31'
    });
    setShowModal(true);
  };

  const fetchVouchers = async () => {
    try {
      if (adminApi?.getAllVouchers) {
        const res = await adminApi.getAllVouchers();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          const mapped = list.map((v, idx) => ({
            id: v.id || idx + 1,
            code: v.code || 'APEX100K',
            title: v.title || v.description || 'Khuyến mãi Apex Badminton',
            discountType: v.discountType || 'FIXED',
            discountValue: v.discountValue || v.discountAmount || 50000,
            minOrderValue: v.minOrderValue || 500000,
            usedCount: v.usedCount || 0,
            maxUsage: v.maxUsage || v.usageLimit || 100,
            startDate: v.startDate ? new Date(v.startDate).toLocaleDateString('vi-VN') : '01/10/2024',
            endDate: v.endDate ? new Date(v.endDate).toLocaleDateString('vi-VN') : '31/12/2024',
            status: v.active !== false ? 'ACTIVE' : 'INACTIVE'
          }));
          setVouchers(mapped);
        }
      }
    } catch (err) {
      console.warn('Fallback to local vouchers:', err);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa mã giảm giá này?')) return;
    try {
      if (adminApi?.deleteVoucher) await adminApi.deleteVoucher(id);
      await fetchVouchers();
    } catch (err) {
      console.warn('Lỗi xóa voucher:', err);
      setVouchers((prev) => prev.filter((v) => v.id !== id));
    }
    setToastMessage('Đã xóa mã giảm giá.');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleToggleStatus = (id) => {
    setVouchers((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
          : v
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      code: formData.code.toUpperCase(),
      title: formData.title,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue) || 0,
      minOrderValue: Number(formData.minOrderValue) || 0,
      maxUsage: Number(formData.maxUsage) || 100,
      startDate: formData.startDate,
      endDate: formData.endDate,
      active: true
    };

    try {
      if (editingId) {
        if (adminApi?.updateVoucher) await adminApi.updateVoucher(editingId, payload);
        setToastMessage('Đã cập nhật mã giảm giá thành công!');
      } else {
        if (adminApi?.createVoucher) await adminApi.createVoucher(payload);
        setToastMessage('Đã tạo mã giảm giá mới thành công!');
      }
      await fetchVouchers();
    } catch (err) {
      console.warn('Lỗi gọi API voucher, lưu dự phòng cục bộ:', err);
      if (editingId) {
        setVouchers((prev) =>
          prev.map((v) => (v.id === editingId ? { ...v, ...payload } : v))
        );
        setToastMessage('Đã cập nhật mã giảm giá thành công!');
      } else {
        const newEntry = {
          id: Date.now(),
          usedCount: 0,
          ...payload,
          status: 'ACTIVE'
        };
        setVouchers([newEntry, ...vouchers]);
        setToastMessage('Đã tạo mã giảm giá mới thành công!');
      }
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
                  {vouchers.filter((v) => v.status === 'ACTIVE').length} mã đang chạy
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all text-xs font-bold shadow-md hover:shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mã Voucher mới</span>
          </button>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 3 STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doanh số qua Voucher</span>
              <span className="text-2xl font-black text-slate-900 mt-1">124.500.000₫</span>
              <span className="text-[11px] text-emerald-600 font-bold mt-1">+18.5% so với tháng trước</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lượt dùng thành công</span>
              <span className="text-2xl font-black text-secondary mt-1">477 lượt</span>
              <span className="text-[11px] text-slate-500 font-medium mt-1">Chiếm 38.2% tổng đơn hàng</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-secondary flex items-center justify-center">
              <Tag className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiết kiệm cho khách</span>
              <span className="text-2xl font-black text-emerald-600 mt-1">18.240.000₫</span>
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
              placeholder="Tìm theo mã coupon (APEX...), mô tả..."
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
                        <span className="font-bold text-slate-900">{v.usedCount} / {v.maxUsage}</span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, (v.usedCount / v.maxUsage) * 100)}%` }}
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
                        onClick={() => handleToggleStatus(v.id)}
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
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
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
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
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Mã Code <span className="text-secondary">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ví dụ: APEX100K"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Loại giảm giá</label>
                    <select
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
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ví dụ: Giảm 100K cho đơn vợt từ 1 triệu"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Giá trị giảm (VNĐ)</label>
                    <input
                      type="number"
                      required
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
                      required
                      value={formData.minOrderValue}
                      onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                      placeholder="1000000"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Lượt phát hành tối đa</label>
                    <input
                      type="number"
                      required
                      value={formData.maxUsage}
                      onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                      placeholder="100"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Ngày hết hạn</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

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
                    Lưu mã Voucher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVouchersPage;
