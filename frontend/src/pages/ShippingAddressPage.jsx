import React, { useState, useEffect } from 'react';
import UserLayout from '../components/UserLayout';
import { shippingAddressApi } from '../api/shippingAddressApi';
import {
  MapPin,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Check,
  X,
  Building,
  Building2,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';

const INITIAL_MOCK_ADDRESSES = [
  {
    id: 1,
    fullName: 'Nguyễn Văn A',
    phone: '(+84) 0988 123 456',
    address: 'Tầng 12, Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    note: 'Gọi điện trước khi giao hàng 15 phút, gửi lễ tân nếu vắng mặt.',
    type: 'default',
    tag: 'Nhà riêng / Mặc định',
    isDefault: true
  },
  {
    id: 2,
    fullName: 'Nguyễn Văn A - Cty Apex Pro',
    phone: '(+84) 0912 345 678',
    address: 'Số 182 Lê Duẩn, Phường Nguyễn Du, Quận Hai Bà Trưng, TP. Hà Nội',
    note: 'Chỉ giao trong giờ hành chính từ Thứ 2 đến Thứ 6.',
    type: 'office',
    tag: 'Văn phòng',
    isDefault: false
  },
  {
    id: 3,
    fullName: 'Nguyễn Văn A (CLB Cầu Lông Kỳ Hòa 2)',
    phone: '(+84) 0988 123 456',
    address: 'Sân số 4, CLB Cầu Lông Kỳ Hòa 2, Sư Vạn Hạnh, Phường 12, Quận 10, TP. Hồ Chí Minh',
    note: 'Giao vào buổi tối sau 18:00 các ngày Thứ 3 - 5 - 7.',
    type: 'court',
    tag: 'Sân cầu lông',
    isDefault: false
  }
];

const ShippingAddressPage = () => {
  const [addresses, setAddresses] = useState(INITIAL_MOCK_ADDRESSES);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('TP. Hồ Chí Minh');
  const [formDistrict, setFormDistrict] = useState('Quận Bình Thạnh');
  const [formWard, setFormWard] = useState('Phường 22');
  const [formDetail, setFormDetail] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formTag, setFormTag] = useState('Nhà riêng');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAddresses = async () => {
    try {
      const res = await shippingAddressApi.getMyAddresses();
      const list = Array.isArray(res) ? res : res?.data || [];
      if (list.length > 0) {
        setAddresses(list);
      }
    } catch (err) {
      console.warn('API addresses fallback to mock list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormCity('TP. Hồ Chí Minh');
    setFormDistrict('Quận Bình Thạnh');
    setFormWard('Phường 22');
    setFormDetail('');
    setFormNote('');
    setFormTag('Nhà riêng');
    setFormIsDefault(addresses.length === 0);
    setShowForm(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingId(addr.id);
    setFormName(addr.fullName || '');
    setFormPhone(addr.phone || '');
    setFormDetail(addr.address || '');
    setFormNote(addr.note || '');
    setFormIsDefault(addr.isDefault || false);
    setFormTag(addr.tag || 'Nhà riêng');
    setShowForm(true);
  };

  const handleSetDefault = (id) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id
      }))
    );
    setMessage('Đã đặt làm địa chỉ mặc định thành công!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setMessage('Đã xóa địa chỉ nhận hàng.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSaving(true);

    const fullAddrString = `${formDetail}, ${formWard}, ${formDistrict}, ${formCity}`;
    const newEntry = {
      id: editingId || Date.now(),
      fullName: formName,
      phone: formPhone,
      address: fullAddrString,
      note: formNote,
      tag: formTag,
      isDefault: formIsDefault
    };

    if (formIsDefault) {
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: false }))
      );
    }

    if (editingId) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editingId ? { ...newEntry } : a))
      );
      setMessage('Cập nhật địa chỉ nhận hàng thành công!');
    } else {
      setAddresses((prev) => [newEntry, ...prev]);
      setMessage('Thêm địa chỉ mới thành công!');
    }

    setSaving(false);
    setShowForm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <UserLayout currentPage="Sổ địa chỉ" counts={{ addresses: addresses.length }}>
      <div className="flex flex-col gap-6">
        {/* MAIN ADDRESS LIST CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-black text-slate-900">Sổ địa chỉ</h2>
              <p className="text-xs text-slate-500">
                Quản lý danh sách địa chỉ nhận hàng để thanh toán nhanh chóng và nhận diện kỹ thuật đan vợt tận nơi
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm địa chỉ mới</span>
            </button>
          </div>

          {message && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          {/* ADDRESS ITEMS LIST */}
          <div className="flex flex-col gap-4">
            {addresses.map((addr) => {
              const isDefault = addr.isDefault;
              return (
                <div
                  key={addr.id}
                  className={`p-5 rounded-2xl bg-white shadow-sm flex flex-col gap-3 relative transition-all ${
                    isDefault
                      ? 'border border-blue-500/40 ring-1 ring-blue-500/10'
                      : 'border border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{addr.fullName}</span>
                      <span className="text-slate-300 text-xs">|</span>
                      <span className="text-xs text-slate-700 font-medium">{addr.phone}</span>

                      {isDefault ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold inline-flex items-center gap-1 border border-blue-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Mặc định
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {addr.tag || 'Địa chỉ'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {!isDefault && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr.id)}
                            className="text-blue-600 hover:underline text-xs font-bold cursor-pointer"
                          >
                            Đặt làm mặc định
                          </button>
                          <span className="text-slate-300 text-xs">|</span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(addr)}
                        className="text-blue-600 hover:underline text-xs font-bold cursor-pointer"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(addr.id)}
                        className="text-secondary hover:underline text-xs font-bold cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-800 leading-relaxed font-normal">{addr.address}</span>
                    </div>
                    {addr.note && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pl-6">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Ghi chú: {addr.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORM THÊM / SỬA ĐỊA CHỈ */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-5 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Điền thông tin chính xác để hệ thống giao hàng và bảo hành nhanh nhất
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Họ và tên người nhận <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Số điện thoại liên hệ <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Nhập số điện thoại (10 chữ số)"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Tỉnh / Thành phố <span className="text-secondary">*</span>
                  </label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  >
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="TP. Hà Nội">TP. Hà Nội</option>
                    <option value="TP. Đà Nẵng">TP. Đà Nẵng</option>
                    <option value="Bình Dương">Bình Dương</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Quận / Huyện <span className="text-secondary">*</span>
                  </label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  >
                    <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                    <option value="Quận 1">Quận 1</option>
                    <option value="Quận 3">Quận 3</option>
                    <option value="Quận 10">Quận 10</option>
                    <option value="Quận Hai Bà Trưng">Quận Hai Bà Trưng</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Phường / Xã <span className="text-secondary">*</span>
                  </label>
                  <select
                    value={formWard}
                    onChange={(e) => setFormWard(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  >
                    <option value="Phường 22">Phường 22</option>
                    <option value="Phường 19">Phường 19</option>
                    <option value="Phường 25">Phường 25</option>
                    <option value="Phường 12">Phường 12</option>
                    <option value="Phường Nguyễn Du">Phường Nguyễn Du</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">
                  Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  placeholder="Ví dụ: Tầng 12, Tòa nhà Landmark 81, 720A Điện Biên Phủ"
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Ghi chú giao hàng (Tùy chọn)</label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Loại địa chỉ</label>
                  <select
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  >
                    <option value="Nhà riêng">Nhà riêng</option>
                    <option value="Văn phòng">Văn phòng</option>
                    <option value="Sân cầu lông">Sân cầu lông</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4 text-secondary accent-secondary rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 font-medium">Đặt làm địa chỉ nhận hàng mặc định</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Lưu địa chỉ</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3 POLICY GUARANTEE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-secondary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Bảo hành 90 ngày</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Bảo hành khung vợt chính hãng 1 đổi 1 do lỗi sản xuất từ Yonex, Victor, Lining.
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Đổi size giày 7 ngày</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Đổi size miễn phí tận nhà trong vòng 7 ngày nếu mang không vừa chân.
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Hotline Kỹ Thuật</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Tư vấn chọn cước, chỉnh thông số vợt: <strong className="text-secondary font-bold">1900 6886</strong> (8:30 - 21:30)
              </span>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default ShippingAddressPage;
