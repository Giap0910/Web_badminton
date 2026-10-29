import React, { useEffect, useRef, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import AdminBannerImages from '../components/AdminBannerImages';
import { adminApi } from '../api/adminApi';
import { Settings, Store, Award, QrCode, Truck, Image } from 'lucide-react';

const TABS = [ ['STORE', 'Cửa hàng & Liên hệ', Store], ['STRINGING', 'Dịch vụ căng cước', Award],
  ['PAYMENT', 'Thanh toán PayOS VietQR', QrCode], ['SHIPPING', 'Vận chuyển & Chính sách', Truck],
  ['BANNERS', 'Banner trang chủ', Image] ];
const amount = value => Number.isSafeInteger(value) && value >= 0 ? `${value.toLocaleString('vi-VN')} đ` : 'Chưa có thông tin';

export function normalizeAdminSettings(data) {
  if (data?.readOnly !== true || data.store?.verified !== false && data.store?.verified !== true
    || !['REAL', 'MOCK'].includes(data.payment?.mode) || typeof data.payment?.connectionVerified !== 'boolean')
    throw new Error('Cấu hình chỉ đọc từ máy chủ không hợp lệ');
  for (const value of [data.shipping?.fee, data.shipping?.freeShippingThreshold, data.loyalty?.paidAmountPerPoint,
    data.loyalty?.pointValue, data.loyalty?.maxDiscountPercent, data.warranty?.days])
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Thông số chính sách từ máy chủ không hợp lệ');
  if (!Array.isArray(data.warranty.categoryIds)) throw new Error('Phạm vi bảo hành từ máy chủ không hợp lệ');
  return data;
}

function SettingValue({ label, value }) {
  return <div className="space-y-1"><dt className="text-xs font-bold text-slate-500">{label}</dt>
    <dd className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-800">{value || 'Chưa có thông tin'}</dd></div>;
}

const AdminSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('STORE'), [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const mounted = useRef(true), generation = useRef(0);
  const load = async () => {
    const request = ++generation.current;setLoading(true);setError('');
    try {
      const response = await adminApi.getSettings(), data = normalizeAdminSettings(response?.data ?? response);
      if (mounted.current && request === generation.current) setSettings(data);
    } catch (failure) {
      if (mounted.current && request === generation.current) setError(failure.response?.data?.message || failure.message || 'Không tải được chính sách.');
    } finally {if (mounted.current && request === generation.current) setLoading(false);}
  };
  useEffect(() => {mounted.current = true;load();return () => {mounted.current = false;generation.current += 1;};}, []);
  return <AdminLayout title="Cài đặt" subtitle="Thông tin và chính sách đang áp dụng">
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-3"><Settings className="w-5 h-5 text-slate-700" /><div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Thông tin hệ thống</h1>
          <p className="text-xs text-slate-500 mt-1">Chính sách chỉ đọc; ảnh banner được quản lý tại mục riêng.</p></div></div>
        <button type="button" disabled={loading} onClick={load} className="rounded-xl border px-4 py-2 text-xs font-bold">Làm mới chính sách</button>
      </div>
      {error && <p role="alert" className="p-4 rounded-xl bg-red-50 text-red-800">{error}</p>}
      {loading && <p role="status" className="text-sm text-slate-600">Đang tải chính sách...</p>}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">{TABS.map(([id, label, Icon]) =>
        <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap ${activeTab === id ? 'bg-[#131b2e] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
          <Icon className="w-4 h-4" />{label}</button>)}</div>
      {activeTab === 'BANNERS' ? <AdminBannerImages /> : settings && <SettingsPanel activeTab={activeTab} settings={settings} />}
    </div>
  </AdminLayout>;
};

function SettingsPanel({ activeTab, settings }) {
  const { store, shipping, loyalty, warranty, payment } = settings;
  const storeValue = key => store.verified ? store[key] : null;
  return <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 space-y-5">
    {activeTab === 'STORE' && <><h2 className="font-black text-slate-900">Thông tin cửa hàng</h2>
      {!store.verified && <p className="text-sm text-slate-600">Thông tin liên hệ cửa hàng chưa được cấu hình và xác minh.</p>}
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4"><SettingValue label="Tên cửa hàng" value={storeValue('name')} />
        <SettingValue label="Điện thoại" value={storeValue('phone')} /><SettingValue label="Email" value={storeValue('email')} />
        <SettingValue label="Địa chỉ" value={storeValue('address')} /></dl></>}
    {activeTab === 'STRINGING' && <><h2 className="font-black text-slate-900">Dịch vụ căng cước</h2>
      <p className="text-sm text-slate-600">Chưa có cấu hình máy, phí dịch vụ hoặc chứng nhận xưởng được xác minh.</p>
      <p className="text-sm text-slate-600">Lựa chọn cước và lực căng được ghi theo từng sản phẩm, biến thể và dòng đơn hàng.</p></>}
    {activeTab === 'PAYMENT' && <><h2 className="font-black text-slate-900">Thanh toán PayOS VietQR</h2>
      <dl><SettingValue label="Chế độ máy chủ" value={payment.mode === 'REAL' ? 'REAL — Dịch vụ thanh toán thật' : 'MOCK — Môi trường kiểm thử'} /></dl>
      <p className="text-sm text-slate-600">{payment.connectionVerified ? 'Kết nối đã được xác minh bởi máy chủ.' : 'Chưa xác minh kết nối cổng thanh toán. Chế độ REAL không xác nhận kênh PayOS đang hoạt động.'}</p>
      <p className="text-sm text-slate-600">Khóa bí mật được quản lý tại cấu hình máy chủ. Trang này không tiếp nhận hoặc hiển thị khóa.</p></>}
    {activeTab === 'SHIPPING' && <><h2 className="font-black text-slate-900">Vận chuyển và chính sách khách hàng</h2>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4"><SettingValue label="Phí giao hàng tiêu chuẩn" value={amount(shipping.fee)} />
        <SettingValue label="Miễn phí vận chuyển từ tiền hàng trước voucher" value={amount(shipping.freeShippingThreshold)} />
        <SettingValue label="Mức chi tiêu đã thanh toán để tích 1 điểm" value={amount(loyalty.paidAmountPerPoint)} />
        <SettingValue label="Giá trị khi đổi 1 điểm" value={amount(loyalty.pointValue)} />
        <SettingValue label="Giới hạn đổi điểm trên tiền hàng sau voucher" value={`${loyalty.maxDiscountPercent}%`} />
        <SettingValue label="Bảo hành 1 đổi 1" value={`${warranty.days} ngày từ ngày hoàn tất đơn`} /></dl>
      <p className="text-sm text-slate-600">Điểm được tính từ tiền hàng đã thu và xác minh, không tính phí vận chuyển hoặc số lượng đơn hàng.</p>
      <p className="text-sm text-slate-600">Bảo hành áp dụng cho vợt, giày, quần áo, balo và bao vợt; phụ kiện không áp dụng.</p></>}
  </div>;
}

export default AdminSettingsPage;
