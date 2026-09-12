import React, { useState, useEffect } from 'react';
import UserLayout from '../components/UserLayout';
import { shippingAddressApi } from '../api/shippingAddressApi';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  Loader2,
  AlertCircle,
  Home,
  Phone,
  User,
  X
} from 'lucide-react';

const ShippingAddressPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Hà Nội');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await shippingAddressApi.getMyAddresses();
      const list = Array.isArray(res) ? res : res?.data || [];
      setAddresses(list);
    } catch (err) {
      console.error('Lỗi tải danh sách địa chỉ:', err);
      setError('Không thể tải danh sách địa chỉ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setFullName('');
    setPhone('');
    setProvince('Hà Nội');
    setDistrict('');
    setWard('');
    setAddress('');
    setIsDefault(addresses.length === 0);
    setShowModal(true);
  };

  const openEditModal = (addr) => {
    setEditingAddress(addr);
    setFullName(addr.fullName || '');
    setPhone(addr.phone || '');
    setProvince(addr.province || 'Hà Nội');
    setDistrict(addr.district || '');
    setWard(addr.ward || '');
    setAddress(addr.address || '');
    setIsDefault(addr.isDefault || false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const payload = {
      fullName,
      phone,
      province,
      district,
      ward,
      address,
      isDefault
    };

    try {
      if (editingAddress) {
        await shippingAddressApi.updateAddress(editingAddress.id, payload);
        setSuccess('Cập nhật địa chỉ nhận hàng thành công!');
      } else {
        await shippingAddressApi.createAddress(payload);
        setSuccess('Thêm mới địa chỉ nhận hàng thành công!');
      }
      setShowModal(false);
      await fetchAddresses();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu địa chỉ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await shippingAddressApi.setDefaultAddress(id);
      await fetchAddresses();
      setSuccess('Đã cập nhật địa chỉ mặc định!');
    } catch (err) {
      setError('Không thể đặt làm địa chỉ mặc định.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ địa chỉ?')) return;

    try {
      await shippingAddressApi.deleteAddress(id);
      await fetchAddresses();
      setSuccess('Xóa địa chỉ thành công!');
    } catch (err) {
      setError('Không thể xóa địa chỉ này.');
    }
  };

  return (
    <UserLayout
      title="Sổ Địa Chỉ Nhận Hàng"
      subtitle="Quản lý danh sách địa chỉ giao hàng để đặt hàng nhanh chóng và chính xác"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Bạn có <strong className="text-slate-900 font-bold">{addresses.length}</strong> địa chỉ đã lưu
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-secondary/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Địa Chỉ Mới</span>
          </button>
        </div>

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="text-slate-400 hover:text-slate-600 text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="text-slate-400 hover:text-slate-600 text-xs">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Address Cards Grid */}
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-secondary mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Đang tải danh sách địa chỉ...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-black text-base text-slate-900">Chưa có địa chỉ giao hàng nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Thêm địa chỉ giao hàng để tiện lợi đặt vợt và phụ kiện mà không cần nhập lại nhiều lần.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-secondary text-white font-bold text-xs shadow-md"
            >
              <Plus className="w-4 h-4" /> Thêm địa chỉ đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`bg-white rounded-2xl border p-5 space-y-3 relative transition-all ${
                  addr.isDefault
                    ? 'border-secondary shadow-md shadow-secondary/5'
                    : 'border-slate-200/80 shadow-sm hover:border-slate-300'
                }`}
              >
                {addr.isDefault && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-secondary text-white px-2.5 py-0.5 rounded-full shadow-sm">
                    <Star className="w-3 h-3 fill-current" /> Mặc định
                  </span>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-sm text-slate-900">{addr.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{addr.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-700 min-h-[48px]">
                  <Home className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {addr.address}
                    {addr.ward && `, ${addr.ward}`}
                    {addr.district && `, ${addr.district}`}
                    {addr.province && `, ${addr.province}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {!addr.isDefault ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className="font-bold text-royal hover:underline"
                    >
                      Đặt làm mặc định
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-semibold">Địa chỉ giao chính</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(addr)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Add / Edit Address */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-5 p-6 sm:p-7">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                {editingAddress ? 'Chỉnh Sửa Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Họ và tên người nhận *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0988 123 456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Tỉnh / Thành phố *</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                  >
                    <option>Hà Nội</option>
                    <option>TP. Hồ Chí Minh</option>
                    <option>Đà Nẵng</option>
                    <option>Hải Phòng</option>
                    <option>Cần Thơ</option>
                    <option>Bắc Ninh</option>
                    <option>Bình Dương</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Quận / Huyện</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Quận Đống Đa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Phường / Xã</label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="Phường Khâm Thiên"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Địa chỉ cụ thể *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số 182 Lê Duẩn"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary font-medium"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-secondary accent-secondary cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Đặt làm địa chỉ nhận hàng mặc định</span>
              </label>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black uppercase tracking-wider shadow-md shadow-secondary/20 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu Địa Chỉ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default ShippingAddressPage;
