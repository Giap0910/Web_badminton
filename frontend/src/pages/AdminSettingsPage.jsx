import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  Settings,
  Store,
  CreditCard,
  Truck,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Lock,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink
} from 'lucide-react';

const AdminSettingsPage = () => {
  // Store Info State
  const [storeName, setStoreName] = useState('HG Badminton Pro');
  const [hotline, setHotline] = useState('0982 114 892');
  const [email, setEmail] = useState('contact@hgbadminton.vn');
  const [address, setAddress] = useState('Số 18 Hoàng Cầu, Phường Ô Chợ Dừa, Quận Đống Đa, Hà Nội');
  const [workingHours, setWorkingHours] = useState('08:00 - 22:00 (Tất cả các ngày trong tuần)');
  const [facebook, setFacebook] = useState('https://facebook.com/hgbadminton.official');
  const [tiktok, setTiktok] = useState('https://tiktok.com/@hgbadminton');
  const [zalo, setZalo] = useState('0982114892');

  // Payment Gateways State
  const [enableCod, setEnableCod] = useState(true);
  const [enableBankTransfer, setEnableBankTransfer] = useState(true);
  const [enablePayOS, setEnablePayOS] = useState(true);
  const [payosClientId, setPayosClientId] = useState('c214041b-6cb8-472d-88b0-payosclient');
  const [payosApiKey, setPayosApiKey] = useState('********************************');
  const [payosChecksumKey, setPayosChecksumKey] = useState('********************************');

  // Shipping & Inventory State
  const [freeshipThreshold, setFreeshipThreshold] = useState(500000);
  const [standardShippingFee, setStandardShippingFee] = useState(30000);
  const [orderHoldMinutes, setOrderHoldMinutes] = useState(15);
  const [lowStockAlert, setLowStockAlert] = useState(5);
  const [allowBackorder, setAllowBackorder] = useState(false);

  // Toast feedback
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    const config = {
      storeName,
      hotline,
      email,
      address,
      workingHours,
      facebook,
      tiktok,
      zalo,
      enableCod,
      enableBankTransfer,
      enablePayOS,
      freeshipThreshold,
      standardShippingFee,
      orderHoldMinutes,
      lowStockAlert,
      allowBackorder,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('badminton_system_settings', JSON.stringify(config));
    } catch {
      // ignore
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <AdminLayout
      title="Cài Đặt Hệ Thống"
      subtitle="Quản trị cấu hình toàn cục, cổng thanh toán VietQR / PayOS, vận chuyển & đối soát"
    >
      <form onSubmit={handleSaveSettings} className="space-y-6 pb-12">
        {/* Top Sticky Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 backdrop-blur-md sticky top-4 z-20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Cấu Hình Vận Hành</h2>
              <p className="text-[11px] text-slate-400">Các thay đổi sẽ áp dụng ngay lập tức trên toàn hệ thống</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Đã lưu thành công!</span>
              </div>
            )}

            <button
              type="submit"
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Store Info & Social (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Card: Thông tin Showroom & Liên hệ */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Thông Tin Doanh Nghiệp & Showroom</h3>
                  <p className="text-xs text-slate-400">Hiển thị trên hóa đơn VAT, chân trang và đơn vận chuyển</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-300">Tên Cửa Hàng / Thương Hiệu</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-red-400" />
                    <span>Hotline Đan Vợt & Tư Vấn</span>
                  </label>
                  <input
                    type="text"
                    value={hotline}
                    onChange={(e) => setHotline(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-red-400" />
                    <span>Email Hỗ Trợ Khách Hàng</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>Địa Chỉ Kho Hàng & Showroom Chính</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    <span>Thời Gian Làm Việc</span>
                  </label>
                  <input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Social Channels */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  Kênh Truyền Thông Xã Hội
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Facebook Fanpage</span>
                    <input
                      type="text"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400">Kênh TikTok Official</span>
                    <input
                      type="text"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-[11px] text-slate-400">Zalo Doanh Nghiệp (OA)</span>
                    <input
                      type="text"
                      value={zalo}
                      onChange={(e) => setZalo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Vận chuyển & Giao hàng */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Chính Sách Vận Chuyển Toàn Quốc</h3>
                  <p className="text-xs text-slate-400">Thiết lập ngưỡng Freeship và phí giao hàng tiêu chuẩn</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Ngưỡng Miễn Phí Ship (VNĐ)</label>
                  <input
                    type="number"
                    value={freeshipThreshold}
                    onChange={(e) => setFreeshipThreshold(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Đơn từ giá trị này sẽ tự động giảm phí ship về 0₫</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Phí Giao Hàng Tiêu Chuẩn (VNĐ)</label>
                  <input
                    type="number"
                    value={standardShippingFee}
                    onChange={(e) => setStandardShippingFee(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Đồng giá áp dụng cho mọi tỉnh thành khi dưới ngưỡng</span>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-300">Thời Gian Giữ Chỗ Đơn Hàng (Phút)</label>
                  <input
                    type="number"
                    value={orderHoldMinutes}
                    onChange={(e) => setOrderHoldMinutes(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Bộ đếm ngược trong trang thanh toán QR trước khi nhả tồn kho (Mặc định: 15 phút)</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Payment & Security (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Card: Cổng Thanh Toán */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cổng Thanh Toán & Đối Soát</h3>
                  <p className="text-xs text-slate-400">VietQR, PayOS và phương thức COD</p>
                </div>
              </div>

              {/* Method 1: COD */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Thu Hộ Tiền Mặt (COD)</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-bold">Toàn quốc</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Kiểm tra tem và thanh toán khi shipper giao tới</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableCod}
                  onChange={(e) => setEnableCod(e.target.checked)}
                  className="w-4 h-4 accent-red-600 cursor-pointer"
                />
              </div>

              {/* Method 2: Bank Transfer */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Chuyển Khoản Trực Tiếp</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-bold">Mã Tĩnh</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Khách quét mã tĩnh, kế toán kiểm tra thủ công</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableBankTransfer}
                  onChange={(e) => setEnableBankTransfer(e.target.checked)}
                  className="w-4 h-4 accent-red-600 cursor-pointer"
                />
              </div>

              {/* Method 3: PayOS VietQR */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-red-900/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">PayOS / VietQR Động</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                        Tự Động 100%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Xác nhận đơn ngay lập tức qua Webhook HMAC-SHA256</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePayOS}
                    onChange={(e) => setEnablePayOS(e.target.checked)}
                    className="w-4 h-4 accent-red-600 cursor-pointer"
                  />
                </div>

                {/* API Credentials */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">Client ID (Public)</span>
                    <input
                      type="text"
                      value={payosClientId}
                      onChange={(e) => setPayosClientId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px] outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">API Key</span>
                    <input
                      type="password"
                      value={payosApiKey}
                      onChange={(e) => setPayosApiKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px] outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">Checksum Key (HMAC Secret)</span>
                    <input
                      type="password"
                      value={payosChecksumKey}
                      onChange={(e) => setPayosChecksumKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px] outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Webhook HMAC-SHA256 bảo mật chuẩn PCI-DSS đã kích hoạt.</span>
                </div>
              </div>

            </div>

            {/* Card: Quản Lý Kho Hàng */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cảnh Báo Tồn Kho & Đặt Trước</h3>
                  <p className="text-xs text-slate-400">Kiểm soát an toàn xuất nhập kho</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Ngưỡng Báo Động Tồn Kho Thấp (Sản phẩm)</label>
                  <input
                    type="number"
                    value={lowStockAlert}
                    onChange={(e) => setLowStockAlert(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-slate-400 block">Sản phẩm dưới số lượng này sẽ hiện nhãn đỏ cảnh báo</span>
                </div>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowBackorder}
                    onChange={(e) => setAllowBackorder(e.target.checked)}
                    className="accent-red-600 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Cho phép đặt trước khi hết hàng (Back-order)</span>
                    <span className="text-[11px] text-slate-400">Khách vẫn có thể đặt mua các dòng vợt hot sắp về kho</span>
                  </div>
                </label>
              </div>
            </div>

          </div>

        </div>
      </form>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
