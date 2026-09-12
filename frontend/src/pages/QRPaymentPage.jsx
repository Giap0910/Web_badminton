import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { formatPrice, formatTimer } from '../utils/formatters';
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
  RefreshCw
} from 'lucide-react';

const QRPaymentPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  // Time remaining countdown
  const [secondsRemaining, setSecondsRemaining] = useState(
    order?.timeRemainingSeconds || 15 * 60
  );

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2500);
  };

  // Fetch order details
  const fetchOrder = async () => {
    try {
      const res = await orderApi.getOrderById(orderId);
      const data = res?.data ?? res;
      setOrder(data);
      if (data && data.timeRemainingSeconds !== undefined) {
        setSecondsRemaining(data.timeRemainingSeconds);
      }

      // If already paid, redirect to success
      if (data && data.status === 'PAID') {
        navigate(`/order-success/${orderId}`, { state: { order: data } });
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin đơn hàng:', err);
      setError(err.response?.data?.message || 'Không tìm thấy thông tin đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Polling check order status every 4 seconds
  useEffect(() => {
    if (!order || order.status === 'PAID' || order.status === 'CANCELLED') return;

    const interval = setInterval(async () => {
      try {
        const res = await orderApi.getOrderById(orderId);
        const latest = res?.data ?? res;
        if (latest && latest.status === 'PAID') {
          clearInterval(interval);
          navigate(`/order-success/${orderId}`, { state: { order: latest } });
        }
      } catch (e) {
        // quiet error on background poll
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

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Manual verify check
  const handleCheckPayment = async () => {
    setIsVerifying(true);
    try {
      const res = await orderApi.getOrderById(orderId);
      const latest = res?.data ?? res;
      setOrder(latest);
      if (latest && latest.status === 'PAID') {
        navigate(`/order-success/${orderId}`, { state: { order: latest } });
      } else {
        alert('Hệ thống chưa nhận được tín hiệu chuyển khoản từ ngân hàng. Nếu bạn vừa chuyển, vui lòng đợi 10-30 giây để Napas xử lý!');
      }
    } catch (err) {
      alert('Không thể kiểm tra trạng thái lúc này. Vui lòng thử lại.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Dev Mock Webhook Trigger
  const handleSimulateSuccess = async () => {
    if (!order) return;
    setIsSimulatingPayment(true);
    try {
      await orderApi.triggerMockWebhook(order.payosOrderCode, order.totalAmount);
      await fetchOrder();
    } catch (err) {
      alert('Lỗi khi kích hoạt giả lập thanh toán: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="text-sm font-semibold text-slate-600">Đang khởi tạo mã QR thanh toán...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Không tìm thấy đơn hàng</h2>
        <p className="text-xs text-slate-500">{error || 'Đơn hàng không tồn tại hoặc đã bị hủy.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>
      </div>
    );
  }

  const memoContent = `BADMINTON ${order.payosOrderCode}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center space-y-6">
      {/* Mini Stepper Header */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Đổi phương thức thanh toán</span>
        </Link>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] flex items-center justify-center">✓</span>
            Giỏ hàng
          </span>
          <span className="w-8 h-[2px] bg-royal"></span>
          <span className="flex items-center gap-1.5 text-royal font-black">
            <span className="w-5 h-5 rounded-full bg-royal text-white text-[11px] flex items-center justify-center">2</span>
            Thanh toán QR
          </span>
          <span className="w-8 h-[2px] bg-slate-200"></span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[11px] flex items-center justify-center">3</span>
            Hoàn tất
          </span>
        </div>

        <span className="text-xs font-bold text-slate-500">Đơn hàng #{order.id}</span>
      </div>

      {/* Main Large White Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-200 p-6 sm:p-8 flex flex-col items-center relative overflow-hidden space-y-6">
        {/* Top Brand Color Stripe */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-royal via-primary to-secondary"></div>

        {/* Pending Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-bold text-amber-800 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          <span>Đang chờ thanh toán...</span>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Quét mã để thanh toán
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Sử dụng ứng dụng ngân hàng bất kỳ hoặc ví điện tử hỗ trợ <strong className="text-slate-800 font-bold">VietQR / Napas 247</strong>
          </p>
        </div>

        {/* Big QR Code Frame with Scanner Animation */}
        <div className="relative bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-md flex flex-col items-center w-full max-w-xs group">
          {/* Badge Napas / VietQR */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-royal border border-blue-200">
                VietQR
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Napas 247
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> QR Động
            </span>
          </div>

          {/* QR Image */}
          <div className="relative w-60 h-60 bg-slate-50 rounded-xl flex items-center justify-center p-2 overflow-hidden border border-slate-100">
            {order.qrCode ? (
              <img
                src={order.qrCode}
                alt="VietQR Payment Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center space-y-2">
                <QrCode className="w-16 h-16 text-slate-400 mx-auto animate-pulse" />
                <p className="text-xs text-slate-400">Đang tạo mã QR...</p>
              </div>
            )}
          </div>

          {/* Total Amount Pill below QR */}
          <div className="mt-3 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Số tiền cần thanh toán</span>
            <div className="text-2xl font-black text-secondary tracking-tight">
              {formatPrice(order.totalAmount)}
            </div>
          </div>
        </div>

        {/* 15-Minute Countdown Indicator */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs text-slate-600">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Thời gian thanh toán còn lại: <strong className="text-slate-900 font-bold">{formatTimer(secondsRemaining)}</strong></span>
        </div>

        {/* Bank Transfer Details Table */}
        <div className="w-full space-y-2.5 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-700 block text-center uppercase tracking-wider text-[11px]">
            Hoặc chuyển khoản thủ công theo thông tin:
          </span>

          {/* Bank */}
          <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
            <span className="text-slate-500">Ngân hàng:</span>
            <span className="font-bold text-slate-900 text-right">
              {order.bin === '970422' ? 'MBBank (Quân Đội)' : order.bin || 'MBBank'}
            </span>
          </div>

          {/* Account Number */}
          <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
            <span className="text-slate-500">Số tài khoản:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-slate-900 text-sm">{order.accountNo || '0987654321'}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(order.accountNo || '0987654321', 'accountNo')}
                className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                title="Sao chép"
              >
                {copiedField === 'accountNo' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Account Name */}
          <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
            <span className="text-slate-500">Chủ tài khoản:</span>
            <span className="font-bold text-slate-900 uppercase">
              {order.accountName || 'SHOP BADMINTON AI'}
            </span>
          </div>

          {/* Transfer Memo */}
          <div className="p-3 rounded-xl bg-red-50/40 border border-red-100 flex items-center justify-between">
            <div>
              <span className="text-slate-600 block font-semibold">Nội dung chuyển khoản (bắt buộc):</span>
              <span className="font-mono font-black text-secondary text-sm">{memoContent}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(memoContent, 'memo')}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] flex items-center gap-1 shadow-sm"
            >
              {copiedField === 'memo' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Actions Button */}
        <div className="w-full space-y-3 pt-2">
          <button
            type="button"
            onClick={handleCheckPayment}
            disabled={isVerifying}
            className="w-full py-3.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-sm tracking-wide shadow-md shadow-secondary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang kiểm tra giao dịch...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>TÔI ĐÃ CHUYỂN KHOẢN XONG</span>
              </>
            )}
          </button>

          {/* Localhost Dev Demo Helper */}
          <button
            type="button"
            onClick={handleSimulateSuccess}
            disabled={isSimulatingPayment}
            className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            {isSimulatingPayment ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>Mô phỏng ngân hàng báo có tiền (Test Webhook Dev)</span>
          </button>
        </div>

        {/* Security & Support Footer */}
        <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Xác thực tự động bởi PayOS</span>
          </div>
          <a href="tel:19006886" className="flex items-center gap-1 text-slate-700 font-bold hover:underline">
            <Phone className="w-3.5 h-3.5 text-secondary" /> 1900 6886
          </a>
        </div>
      </div>
    </div>
  );
};

export default QRPaymentPage;
