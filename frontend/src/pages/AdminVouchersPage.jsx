import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  Ticket,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  X,
  Calendar,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react';

const AdminVouchersPage = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const initialForm = {
    code: '',
    description: '',
    discountType: 'FIXED',
    discountValue: '',
    minOrderValue: '',
    maxDiscountAmount: '',
    maxUses: 100,
    expiresAt: '',
    isActive: true
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllVouchers();
      setVouchers(data);
    } catch (err) {
      console.error('Lỗi tải danh sách voucher:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingVoucher(null);
    setFormData(initialForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVoucher(v);
    setFormData({
      code: v.code || '',
      description: v.description || '',
      discountType: v.discountType || 'FIXED',
      discountValue: v.discountValue || '',
      minOrderValue: v.minOrderValue || '',
      maxDiscountAmount: v.maxDiscountAmount || '',
      maxUses: v.maxUses || 100,
      expiresAt: v.expiresAt ? v.expiresAt.substring(0, 16) : '',
      isActive: v.isActive !== false
    });
    setModalOpen(true);
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mã giảm giá "${code}"?`)) return;
    try {
      await adminApi.deleteVoucher(id);
      showToast(`Đã xóa voucher ${code} thành công!`);
      fetchVouchers();
    } catch (err) {
      alert('Không thể xóa voucher.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        discountValue: Number(formData.discountValue),
        minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
        maxUses: Number(formData.maxUses),
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      };

      if (editingVoucher) {
        await adminApi.updateVoucher(editingVoucher.id, payload);
        showToast('Cập nhật mã giảm giá thành công!');
      } else {
        await adminApi.createVoucher(payload);
        showToast('Tạo mã giảm giá mới thành công!');
      }
      setModalOpen(false);
      fetchVouchers();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi lưu mã giảm giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const filteredVouchers = vouchers.filter((v) => {
    const term = searchTerm.toLowerCase();
    return v.code?.toLowerCase().includes(term) || v.description?.toLowerCase().includes(term);
  });

  return (
    <AdminLayout
      title="Quản Lý Mã Giảm Giá (Vouchers)"
      subtitle="Thiết lập các chương trình khuyến mãi, chiết khấu và giới hạn sử dụng"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Mã code hoặc Mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Mã Mới</span>
        </button>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">Mã Code</th>
                <th className="p-4">Mô Tả Khuyến Mãi</th>
                <th className="p-4">Loại Giảm</th>
                <th className="p-4">Giá Trị Giảm</th>
                <th className="p-4">Đơn Tối Thiểu</th>
                <th className="p-4">Lượt Dùng</th>
                <th className="p-4">Hạn Dùng</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    Đang tải danh sách voucher...
                  </td>
                </tr>
              ) : filteredVouchers.length > 0 ? (
                filteredVouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4">
                      <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 inline-block">
                        {v.code}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-200 max-w-[220px]">
                      {v.description}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {v.discountType === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền cố định'}
                      </span>
                    </td>
                    <td className="p-4 font-black text-emerald-400">
                      {v.discountType === 'PERCENT' ? `${v.discountValue}%` : formatPrice(v.discountValue)}
                      {v.maxDiscountAmount && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          Tối đa: {formatPrice(v.maxDiscountAmount)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-slate-300">
                      {v.minOrderValue ? formatPrice(v.minOrderValue) : '0₫'}
                    </td>
                    <td className="p-4">
                      <span className="text-slate-300 font-bold">
                        {v.usedCount || 0}
                      </span>
                      <span className="text-slate-500"> / {v.maxUses || '∞'}</span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                    </td>
                    <td className="p-4">
                      {v.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Đang bật
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-3 h-3" /> Đã tắt
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id, v.code)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500">
                    Không tìm thấy mã giảm giá nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Voucher */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-red-500" />
                {editingVoucher ? 'Cập Nhật Voucher' : 'Tạo Mã Giảm Giá Mới'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Mã Giảm Giá (Code) *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ví dụ: SMASH50K"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono font-bold focus:outline-none focus:border-red-500 uppercase"
                  />
                </div>

                {/* Loại giảm */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Loại Chiết Khấu *</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="FIXED">Số tiền cố định (VNĐ)</option>
                    <option value="PERCENT">Phần trăm (%)</option>
                  </select>
                </div>

                {/* Giá trị giảm */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {formData.discountType === 'PERCENT' ? 'Tỷ lệ giảm (%) *' : 'Số tiền giảm (VNĐ) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === 'PERCENT' ? 'Ví dụ: 10' : 'Ví dụ: 50000'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Giảm tối đa nếu là percent */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Giảm Tối Đa (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="Ví dụ: 100000 (nếu dùng %)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Đơn tối thiểu */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Đơn Tối Thiểu (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    placeholder="Ví dụ: 500000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Lượt dùng */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Số Lượt Tối Đa</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="100"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Hạn dùng */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-300 block mb-1">Ngày Hết Hạn</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Mô tả */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-300 block mb-1">Mô Tả Hiển Thị *</label>
                  <textarea
                    rows="2"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ví dụ: Giảm ngay 50.000₫ cho đơn hàng từ 1.000.000₫"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Kích hoạt */}
                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="isActive" className="font-bold text-slate-300 cursor-pointer">
                    Kích hoạt áp dụng mã giảm giá này ngay lập tức
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-lg shadow-red-600/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : editingVoucher ? 'Cập Nhật' : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminVouchersPage;
