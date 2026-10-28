import React, { useState, useEffect, useRef } from 'react';
import AdministrativeAddressFields from '../components/AdministrativeAddressFields';
import UserLayout from '../components/UserLayout';
import { shippingAddressApi } from '../api/shippingAddressApi';
import { useAuth } from '../context/AuthContext';
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


const ShippingAddressPage = () => {
  const { token } = useAuth();
  const requestConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const mounted = useRef(true), saveLock = useRef(false), generation = useRef(0);
  const [dataError, setDataError] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formWard, setFormWard] = useState('');
  const [provinceCode, setProvinceCode] = useState(''), [wardCode, setWardCode] = useState('');
  const chooseAddress = value => { setProvinceCode(value.provinceCode); setWardCode(value.wardCode); setFormCity(value.province); setFormWard(value.ward); };
  const [formDetail, setFormDetail] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formTag, setFormTag] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);

  const fetchAddresses = async () => {
    const attempt = ++generation.current; setLoading(true); setDataError('');
    try {
      const res = await shippingAddressApi.getMyAddresses(requestConfig);
      if (!mounted.current || generation.current !== attempt) return;
      const list = Array.isArray(res) ? res : res?.data || [];
      if (Array.isArray(list)) {
        setAddresses(list);
      }
    } catch (err) {
      if (!mounted.current || generation.current !== attempt) return;
      setDataError(err.response?.data?.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    } finally {
      if (mounted.current && generation.current === attempt) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    fetchAddresses();
    return () => { mounted.current = false; generation.current++; };
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormCity(''); setFormWard(''); setProvinceCode(''); setWardCode('');
    setFormDetail('');
    setFormNote('');
    setFormTag('');
    setFormIsDefault(addresses.length === 0);
    setShowForm(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingId(addr.id);
    setFormName(addr.fullName || '');
    setFormPhone(addr.phone || '');
    setFormDetail(addr.addressDetail || addr.address || '');
    setFormCity(addr.province || ''); setFormWard(addr.ward || '');
    setProvinceCode(addr.provinceCode || ''); setWardCode(addr.wardCode || '');
    setFormNote(addr.note || '');
    setFormIsDefault(addr.isDefault || false);
    setFormTag(addr.tag || '');
    setShowForm(true);
  };

  const handleSetDefault = async (id) => {
    try {
      await shippingAddressApi.setDefaultAddress(id, requestConfig);
      if (!mounted.current) return;
      await fetchAddresses();
      setMessageError(false); setMessage('Đã đặt làm địa chỉ mặc định thành công!');
    } catch (err) {
      setMessageError(true);
      setMessage(err.response?.data?.message || 'Không thể cập nhật địa chỉ. Vui lòng thử lại.');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      await shippingAddressApi.deleteAddress(id, requestConfig);
      if (!mounted.current) return;
      await fetchAddresses();
      setMessageError(false); setMessage('Đã xóa địa chỉ nhận hàng.');
    } catch (err) {
      setMessageError(true);
      setMessage(err.response?.data?.message || 'Không thể cập nhật địa chỉ. Vui lòng thử lại.');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);

    const fullAddrString = [formDetail, formWard, formCity].filter(Boolean).join(', ');
    const payload = {
      fullName: formName,
      phone: formPhone,
      address: fullAddrString,
      province: formCity, provinceCode, wardCode, ward: formWard, addressDetail: formDetail,
      isDefault: formIsDefault, note: formNote.trim() || null, tag: formTag || null
    };

    try {
      if (editingId) {
        await shippingAddressApi.updateAddress(editingId, payload, requestConfig);
        if (!mounted.current) return;
        setMessageError(false);
        setMessage('Cập nhật địa chỉ nhận hàng thành công!');
      } else {
        await shippingAddressApi.createAddress(payload, requestConfig);
        if (!mounted.current) return;
        setMessageError(false);
        setMessage('Thêm địa chỉ mới thành công!');
      }
      await fetchAddresses();
      setShowForm(false);
    } catch (err) {
      setMessageError(true);
      setMessage(err.response?.data?.message || 'Không thể lưu địa chỉ. Dữ liệu chưa được lưu.');
    } finally {
      saveLock.current = false; if (mounted.current) setSaving(false);

      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <UserLayout currentPage="Sổ địa chỉ" counts={{ addresses: addresses.length }}>
      {dataError && <div role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}
        <button type="button" onClick={fetchAddresses} className="ml-3 underline">Thử lại</button></div>}
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
            <div role={messageError ? 'alert' : 'status'} className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${messageError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              {messageError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
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

              <AdministrativeAddressFields {...{ provinceCode, wardCode }} onChange={chooseAddress} />
              {editingId && !addresses.find(a => a.id === editingId)?.addressDetail && <p className="text-xs text-amber-700">Địa chỉ cũ chưa tách tỉnh và phường/xã. Hãy chọn lại và kiểm tra ô địa chỉ chi tiết trước khi lưu.</p>}

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
                    maxLength={1000}
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
                    <option value="">Không phân loại</option>
                    <option value="Nhà riêng">Nhà riêng</option>
                    <option value="Văn phòng">Văn phòng</option>
                    <option value="Khác">Khác</option>
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
                Bảo hành 1 đổi 1 trong 90 ngày cho vợt, giày, quần áo và balo/bao vợt đủ điều kiện. Phụ kiện không có ưu đãi này.
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Phí giao hàng</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Phí giao hàng 30.000đ, miễn phí từ 1.000.000đ tiền hàng. Phí cuối cùng được kiểm tra tại thanh toán.
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900">Thông tin liên hệ</span>
              <span className="text-[11px] text-slate-500 leading-snug mt-0.5">
                Hotline và giờ hỗ trợ của cửa hàng chưa được xác minh.
              </span>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default ShippingAddressPage;
