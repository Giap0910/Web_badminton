import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  Settings,
  Store,
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Save,
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  QrCode,
  Lock,
  Layers,
  Award
} from 'lucide-react';

const AdminSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('STORE'); // 'STORE' | 'STRINGING' | 'PAYMENT' | 'SHIPPING'
  const [toastMessage, setToastMessage] = useState('');

  // Form states
  const [storeInfo, setStoreInfo] = useState({
    brandName: 'APEX BADMINTON JSC',
    slogan: 'Pro Equipment & Tour Gear - Phân phối chính hãng số 1 Việt Nam',
    hotline: '1900 6886',
    email: 'support@apexbadminton.vn',
    addressHanoi: 'Số 182 Lê Duẩn, P. Nguyễn Du, Q. Hai Bà Trưng, Hà Nội',
    addressHcm: 'Tầng 12, Tòa nhà Landmark 81, 720A Điện Biên Phủ, Q. Bình Thạnh, TP. HCM',
    workingHours: '08:30 - 21:30 (Cả Thứ 7 & Chủ Nhật)'
  });

  const [stringingConfig, setStringingConfig] = useState({
    machineModel: 'Victor VE-50 Electronic & Yonex Precision 9.0',
    stringingFee: '50000',
    freeStringingThreshold: '6', // Miễn phí khi mua từ đơn thứ 6
    standardProtocol: '4 Nút BWF Chuẩn Quốc Tế',
    minTension: '8.5',
    maxTension: '14.5'
  });

  const [paymentConfig, setPaymentConfig] = useState({
    payosClientId: 'apex-payos-client-id-prod-89241',
    payosApiKey: '••••••••••••••••••••••••••••••••',
    checksumKey: '••••••••••••••••••••••••••••••••',
    bankName: 'VietinBank (Ngân hàng TMCP Công Thương Việt Nam)',
    accountNumber: '103876543210',
    accountName: 'APEX BADMINTON JSC'
  });

  const [shippingConfig, setShippingConfig] = useState({
    freeShippingMin: '1000000',
    standardFee: '30000',
    expressFee: '50000',
    deliveryTimeExpress: 'Giao nhanh 2H nội thành'
  });

  const handleSave = (e) => {
    e.preventDefault();
    setToastMessage('Đã lưu toàn bộ cấu hình hệ thống Apex Badminton thành công!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <AdminLayout title="Cài đặt" subtitle="Cài đặt hệ thống & Cấu hình dịch vụ">
      <div className="flex flex-col gap-6">
        {/* HEADER & ACTION BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Cài đặt hệ thống
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý thông tin cửa hàng, thông số kỹ thuật xưởng căng cước và cổng thanh toán PayOS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all text-xs font-bold shadow-md hover:shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu tất cả thay đổi</span>
          </button>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4 TABS NAVIGATION */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('STORE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'STORE'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Cửa hàng & Hotline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STRINGING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'STRINGING'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Dịch vụ xưởng căng cước BWF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYMENT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'PAYMENT'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Cổng thanh toán PayOS VietQR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SHIPPING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'SHIPPING'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Vận chuyển & Freeship</span>
          </button>
        </div>

        {/* TAB 1: STORE INFO */}
        {activeTab === 'STORE' && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-5">
            <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100">
              Thông tin thương hiệu & Trụ sở
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Tên thương hiệu doanh nghiệp</label>
                <input
                  type="text"
                  value={storeInfo.brandName}
                  onChange={(e) => setStoreInfo({ ...storeInfo, brandName: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Hotline đặt hàng & CSKH</label>
                <input
                  type="text"
                  value={storeInfo.hotline}
                  onChange={(e) => setStoreInfo({ ...storeInfo, hotline: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-bold text-secondary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Email tiếp nhận hỗ trợ</label>
                <input
                  type="email"
                  value={storeInfo.email}
                  onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Khung giờ hoạt động</label>
                <input
                  type="text"
                  value={storeInfo.workingHours}
                  onChange={(e) => setStoreInfo({ ...storeInfo, workingHours: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Địa chỉ showroom Hà Nội</label>
              <input
                type="text"
                value={storeInfo.addressHanoi}
                onChange={(e) => setStoreInfo({ ...storeInfo, addressHanoi: e.target.value })}
                className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900">Địa chỉ trung tâm TP. Hồ Chí Minh</label>
              <input
                type="text"
                value={storeInfo.addressHcm}
                onChange={(e) => setStoreInfo({ ...storeInfo, addressHcm: e.target.value })}
                className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#131b2e] text-white hover:bg-slate-800 text-xs font-bold shadow-sm"
              >
                Cập nhật thông tin cửa hàng
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: STRINGING SERVICE CONFIG */}
        {activeTab === 'STRINGING' && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-5">
            <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100">
              Quy chuẩn máy đan cước & Thợ chứng chỉ BWF
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Model máy căng cước điện tử</label>
                <input
                  type="text"
                  value={stringingConfig.machineModel}
                  onChange={(e) => setStringingConfig({ ...stringingConfig, machineModel: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Phí dịch vụ căng cước chuẩn (VNĐ/lần)</label>
                <input
                  type="number"
                  value={stringingConfig.stringingFee}
                  onChange={(e) => setStringingConfig({ ...stringingConfig, stringingFee: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Phương pháp đan</label>
                <input
                  type="text"
                  value={stringingConfig.standardProtocol}
                  onChange={(e) => setStringingConfig({ ...stringingConfig, standardProtocol: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Lực căng tối thiểu (kg)</label>
                <input
                  type="text"
                  value={stringingConfig.minTension}
                  onChange={(e) => setStringingConfig({ ...stringingConfig, minTension: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Lực căng tối đa khuyến nghị (kg)</label>
                <input
                  type="text"
                  value={stringingConfig.maxTension}
                  onChange={(e) => setStringingConfig({ ...stringingConfig, maxTension: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs flex flex-col gap-2">
              <span className="font-bold text-slate-900">Khuyến nghị kỹ thuật xưởng:</span>
              <p className="text-slate-600 leading-relaxed">
                Người mới tập: 9 - 10kg (19 - 22 lbs) • Người chơi phong trào: 10.5 - 11.5kg (23 - 25.5 lbs) • Vận động viên chuyên nghiệp: 12 - 13.5kg (26.5 - 30 lbs).
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#131b2e] text-white hover:bg-slate-800 text-xs font-bold shadow-sm"
              >
                Cập nhật cấu hình xưởng
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PAYMENT GATEWAY CONFIG */}
        {activeTab === 'PAYMENT' && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-5">
            <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100">
              Tích hợp Cổng thanh toán PayOS VietQR
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">PayOS Client ID</label>
                <input
                  type="text"
                  value={paymentConfig.payosClientId}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, payosClientId: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">PayOS API Key</label>
                <input
                  type="password"
                  value={paymentConfig.payosApiKey}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, payosApiKey: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Ngân hàng thụ hưởng</label>
                <input
                  type="text"
                  value={paymentConfig.bankName}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, bankName: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Số tài khoản nhận tiền</label>
                <input
                  type="text"
                  value={paymentConfig.accountNumber}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, accountNumber: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Tên chủ tài khoản</label>
                <input
                  type="text"
                  value={paymentConfig.accountName}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, accountName: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner uppercase font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#131b2e] text-white hover:bg-slate-800 text-xs font-bold shadow-sm"
              >
                Cập nhật cổng thanh toán
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: SHIPPING & FREESHIP CONFIG */}
        {activeTab === 'SHIPPING' && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 flex flex-col gap-5">
            <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100">
              Chính sách giao hàng & Hạn mức Freeship
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Hạn mức Miễn phí vận chuyển (VNĐ)</label>
                <input
                  type="number"
                  value={shippingConfig.freeShippingMin}
                  onChange={(e) => setShippingConfig({ ...shippingConfig, freeShippingMin: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-bold text-secondary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Phí giao hàng tiêu chuẩn (VNĐ)</label>
                <input
                  type="number"
                  value={shippingConfig.standardFee}
                  onChange={(e) => setShippingConfig({ ...shippingConfig, standardFee: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-900">Phí giao hàng hỏa tốc 2H (VNĐ)</label>
                <input
                  type="number"
                  value={shippingConfig.expressFee}
                  onChange={(e) => setShippingConfig({ ...shippingConfig, expressFee: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#131b2e] text-white hover:bg-slate-800 text-xs font-bold shadow-sm"
              >
                Cập nhật chính sách giao hàng
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
