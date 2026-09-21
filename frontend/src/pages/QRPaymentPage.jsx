import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { formatPrice, formatTimer, isOrderPaid } from '../utils/formatters';
import {
  QrCode,
  Copy,
  Check,
  Clock,
  ArrowLeft,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
  CheckCircle2,
  Download,
  XCircle,
  RefreshCw
} from 'lucide-react';

const QRPaymentPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Time remaining countdown (15 minutes default)
  const [secondsRemaining, setSecondsRemaining] = useState(
    order?.timeRemainingSeconds ?? 0
  );

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Fetch order details
  const fetchOrder = async () => {
    try {
      setError('');
      const res = await orderApi.getOrderById(orderId);
      const data = res?.data ?? res;
      setOrder(data);
      if (data && data.timeRemainingSeconds !== undefined) {
        setSecondsRemaining(data.timeRemainingSeconds);
      }

      if (isOrderPaid(data)) {
        navigate(`/order-success/${orderId}`, { state: { order: data } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải đơn hàng để xác minh thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Polling check order status every 4 seconds
  useEffect(() => {
    if (!order || order.status !== 'PENDING' || order.paymentMethod !== 'PAYOS_VIETQR') return;

    const interval = setInterval(async () => {
      try {
        const res = await orderApi.getOrderById(orderId);
        const latest = res?.data ?? res;
        setOrder(latest);
        setSecondsRemaining(latest?.timeRemainingSeconds ?? 0);
        if (isOrderPaid(latest)) {
          clearInterval(interval);
          navigate(`/order-success/${orderId}`, { state: { order: latest } });
        }
      } catch (e) {
        setError('Không thể đồng bộ trạng thái thanh toán. Vui lòng kiểm tra lại.');
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderId, order]);

  // 1-second interval countdown
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formatTimerDisplay = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Manual verify check
  const handleCheckPayment = async () => {
    setIsVerifying(true);
    try {
      const res = await orderApi.getOrderById(orderId);
      const latest = res?.data ?? res;
      setOrder(latest);
      if (isOrderPaid(latest)) {
        navigate(`/order-success/${orderId}`, { state: { order: latest } });
      } else {
        alert('Chưa có xác nhận thanh toán từ máy chủ. Vui lòng kiểm tra lại trạng thái đơn hàng.');
      }
    } catch (err) {
      setError('Không thể kiểm tra thanh toán. Vui lòng thử lại.');
    } finally {
      setIsVerifying(false);
    }
  };

  const displayOrderCode = order?.orderCode || `#APX-${orderId || '89241'}`;
  const displayAmount = order?.totalAmount ?? 0;

  if (loading) return <p className="p-8" role="status">Đang tải đơn hàng...</p>;
  if (error || !order || !order.qrCode || order.status !== 'PENDING' || order.paymentMethod !== 'PAYOS_VIETQR' || secondsRemaining <= 0) {
    return <div className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-xl font-bold">Thanh toán đơn hàng #{orderId}</h1>
      <p role="alert">{error || (order?.status === 'PENDING'
        ? 'Chưa có mã thanh toán được xác thực. Vui lòng không chuyển tiền theo thông tin mẫu.'
        : 'Đơn hàng không ở trạng thái chờ thanh toán.')}</p>
      <button className="border rounded px-4 py-2" onClick={fetchOrder}>Kiểm tra lại</button>
      <Link className="block text-red-600 underline" to="/my-orders">Xem đơn hàng</Link>
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between antialiased selection:bg-red-500 selection:text-white">

      {/* Inline scanner animation styles */}
      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 96%; opacity: 0.8; }
        }
        .scanner-line {
          animation: scanline 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }
      `}</style>

      {/* Header Tối Giản */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-wider text-slate-900 leading-tight">
                APEX<span className="text-red-600">BADMINTON</span>
              </span>
              <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em] -mt-0.5">
                PRO SPORT & GEAR
              </span>
            </div>
          </Link>

          {/* Stepper mini */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1 text-slate-500">
              <Check className="w-4 h-4 text-emerald-500" />
              Giỏ hàng
            </span>
            <span className="w-6 h-[1.5px] bg-emerald-300"></span>
            <span className="flex items-center gap-1.5 text-blue-600 font-bold">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">
                2
              </span>
              Thanh toán QR
            </span>
            <span className="w-6 h-[1.5px] bg-slate-200"></span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[11px] flex items-center justify-center">
                3
              </span>
              Hoàn tất
            </span>
          </div>

          {/* Hotline & Security */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Mã hóa SSL 256-bit</span>
            </div>
            <a
              href="tel:19006886"
              className="flex items-center gap-1.5 text-slate-700 font-bold bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition"
            >
              <Phone className="w-3.5 h-3.5 text-red-600" />
              <span>1900 6886</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content - Căn giữa tối giản */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">

        {/* Link quay lại & Thông báo */}
        <div className="w-full max-w-[540px] flex items-center justify-between mb-4">
          <Link
            to="/checkout"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Đổi phương thức thanh toán</span>
          </Link>
          <span className="text-xs text-slate-400 font-medium">Đơn hàng {displayOrderCode}</span>
        </div>

        {/* Card Trắng Lớn Ở Giữa */}
        <div className="w-full max-w-[540px] bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200 p-6 sm:p-8 flex flex-col items-center relative overflow-hidden">

          {/* Viền màu thương hiệu trang trí trên đỉnh card */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-slate-900 to-red-600"></div>

          {/* Trạng thái "Đang chờ thanh toán" */}
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-800 mb-5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Đang chờ thanh toán...</span>
          </div>

          {/* Tiêu đề phía trên mã QR */}
          <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 text-center mb-1">
            Quét mã để thanh toán
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 text-center mb-6 max-w-sm">
            Sử dụng ứng dụng ngân hàng hoặc ví điện tử bất kỳ hỗ trợ <strong className="font-bold text-slate-700">VietQR / PayOS</strong>
          </p>

          {/* Khung Mã QR To Ở Giữa */}
          <div className="relative bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 shadow-md flex flex-col items-center mb-5 group w-full max-w-[340px]">

            {/* Header frame */}
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                  VietQR
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  Napas 247
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> QR Động
              </span>
            </div>

            {/* Hình QR & Tia quét scanner animation */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 bg-slate-50 rounded-xl flex items-center justify-center p-2 overflow-hidden border border-slate-100">
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent scanner-line z-10 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>

              {(order?.qrCode || order?.qrCodeUrl) ? (
                <img
                  src={order.qrCode || order.qrCodeUrl}
                  alt="VietQR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                /* Authentic SVG QR Graphic */
                <p>Chưa có mã QR được xác thực.</p>
              )}
            </div>

            {/* Supported Banks Text */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <span className="text-slate-400">Hỗ trợ tự động:</span>
              <span className="font-bold text-slate-700">Vietcombank</span>
              <span>•</span>
              <span className="font-bold text-slate-700">MB Bank</span>
              <span>•</span>
              <span className="font-bold text-slate-700">Techcombank</span>
              <span>•</span>
              <span className="font-bold text-pink-600">MoMo</span>
            </div>
          </div>

          {/* Số tiền cần thanh toán */}
          <div className="text-center mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              Số tiền thanh toán
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-red-600 tracking-tight">
              {formatPrice(displayAmount)}
            </div>
          </div>

          {/* Thông tin Mã đơn hàng & Đồng hồ đếm ngược */}
          <div className="w-full bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 mb-5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-slate-400">Mã đơn hàng</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 tracking-wide">
                  {displayOrderCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(displayOrderCode, 'orderCode')}
                  title="Sao chép mã"
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                >
                  {copiedField === 'orderCode' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-200"></div>

            {/* Đồng hồ đếm ngược */}
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-medium text-slate-400">Thời gian còn lại</span>
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm sm:text-base">
                <Clock className="w-4 h-4 animate-pulse" />
                <span className="font-mono tracking-wider font-extrabold text-blue-600">
                  {formatTimerDisplay(secondsRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Bước Đơn Giản */}
          <div className="w-full mb-6">
            <div className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              3 Bước Đơn Giản
            </div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-700 bg-blue-50/60 border border-blue-100 rounded-lg py-2.5 px-3">
              <span className="flex items-center gap-1 text-slate-900">
                <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                Mở app ngân hàng
              </span>
              <span className="text-slate-300 font-normal">›</span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                Quét QR
              </span>
              <span className="text-slate-300 font-normal">›</span>
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                Xác nhận
              </span>
            </div>
          </div>

          {/* Nút "Tôi đã thanh toán" */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleCheckPayment}
              disabled={isVerifying}
              className="w-full py-3.5 px-5 rounded-xl border-2 border-slate-900 text-slate-900 font-bold text-sm sm:text-base hover:bg-slate-900 hover:text-white transition-all duration-200 shadow-sm flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang kiểm tra giao dịch...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                  <span>Tôi đã thanh toán</span>
                </>
              )}
            </button>

            {/* Thao tác phụ: Tải ảnh QR / Hủy */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 px-1">
              <button
                type="button"
                onClick={() => alert('Đang lưu mã QR vào thư viện ảnh...')}
                className="inline-flex items-center gap-1 hover:text-blue-600 transition font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải mã QR về máy</span>
              </button>
              <Link to="/checkout" className="hover:text-red-500 transition font-medium">
                Hủy giao dịch
              </Link>
            </div>

            {/* Dev Mock Simulation Button for Fast Testing */}
            <div className="pt-2 border-t border-slate-100 flex justify-center">

            </div>
          </div>

        </div>

        {/* Hỗ trợ & Thông báo bảo mật chân trang card */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 text-center">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tự động kích hoạt đơn hàng trong 3-5 giây</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Gặp sự cố? Gọi ngay <strong className="font-bold text-slate-700">1900 6886</strong></span>
          </div>
        </div>

      </main>

      {/* Footer Tối Giản */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2025 Apex Badminton Store Co., Ltd. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
            <span>Bảo mật PCI-DSS</span>
            <span>•</span>
            <span>VietQR Powered</span>
            <span>•</span>
            <span>Chính sách hoàn tiền</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default QRPaymentPage;
