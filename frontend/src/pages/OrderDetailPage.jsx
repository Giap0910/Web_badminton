import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { 
  Clock, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  Zap, 
  ArrowLeft,
  Truck,
  RotateCcw
} from 'lucide-react';

const OrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copiedField, setCopiedField] = useState(null);
  const [mockTriggering, setMockTriggering] = useState(false);
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  const fetchOrder = async () => {
    try {
      const data = await orderApi.getOrderById(id);
      setOrder(data);
      setTimeLeft(data.timeRemainingSeconds || 0);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll order status every 5 seconds if still PENDING
    const interval = setInterval(() => {
      if (order?.status === 'PENDING') {
        fetchOrder();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id, order?.status]);

  // Live countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchOrder(); // Refresh to catch cancelled status from backend
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Toàn bộ số lượng vợt đã khóa tạm thời sẽ được hoàn trả lại kho.')) {
      return;
    }
    setActionError('');
    try {
      const updated = await orderApi.cancelOrder(order.id);
      setOrder(updated);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Không thể hủy đơn');
    }
  };

  // Mock Webhook Trigger for 100% Localhost Testing
  const handleMockWebhookTrigger = async () => {
    setMockTriggering(true);
    setActionError('');
    try {
      await orderApi.triggerMockWebhook(order.payosOrderCode, order.totalAmount);
      await fetchOrder();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Lỗi khi kích hoạt Mock Webhook');
    } finally {
      setMockTriggering(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy đơn hàng!</h2>
        <Link to="/my-orders" className="text-xs font-bold text-emerald-600 hover:underline">
          Xem các đơn hàng của bạn
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb & Status Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/my-orders" className="text-xs font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại lịch sử đơn hàng</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Đơn Hàng #{order.id}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mã giao dịch PayOS: <strong className="text-slate-800">{order.payosOrderCode}</strong> • Ngày tạo: {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>

        {/* Order Status Badge */}
        <div>
          {order.status === 'PENDING' && (
            <span className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs flex items-center gap-2 animate-pulse">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>Chờ Thanh Toán (Hạn 15 phút)</span>
            </span>
          )}
          {order.status === 'PAID' && (
            <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Đã Thanh Toán Thành Công</span>
            </span>
          )}
          {order.status === 'CANCELLED' && (
            <span className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-slate-500" />
              <span>Đã Hủy Đơn (Đã hoàn kho)</span>
            </span>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {actionError}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Col: VietQR Payment Box (If PENDING) */}
        {order.status === 'PENDING' ? (
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
            {/* Live Countdown Timer */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 animate-spin-slow" />
                <div>
                  <div className="text-xs font-medium text-amber-100 uppercase tracking-wider">Thời gian giữ kho còn lại</div>
                  <div className="text-2xl font-black tracking-widest">{formatTimer(timeLeft)}</div>
                </div>
              </div>
              <span className="text-[11px] bg-white/20 px-3 py-1 rounded-full font-bold backdrop-blur">
                Tự hủy khi hết giờ
              </span>
            </div>

            {/* QR Code & Banking Information */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* Dynamic QR Code Image */}
              <div className="p-3 bg-white border-2 border-emerald-600 rounded-2xl shadow-sm shrink-0">
                <img
                  src={order.qrCode}
                  alt="VietQR PayOS"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
                <span className="block text-center text-[10px] font-bold text-slate-500 mt-2">
                  Quét bằng ứng dụng ngân hàng
                </span>
              </div>

              {/* Banking Transfer Details */}
              <div className="flex-1 w-full space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Ngân hàng</span>
                  <strong className="text-slate-900 text-sm">MBBank (Quân Đội)</strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Số tài khoản</span>
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border">
                    <strong className="text-slate-900 text-sm font-mono">{order.accountNo}</strong>
                    <button
                      onClick={() => copyToClipboard(order.accountNo, 'acc')}
                      className="p-1 text-slate-400 hover:text-emerald-600"
                    >
                      {copiedField === 'acc' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Chủ tài khoản</span>
                  <strong className="text-slate-800">{order.accountName}</strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Số tiền chuyển</span>
                  <strong className="text-emerald-700 text-base font-extrabold">{formatPrice(order.totalAmount)}</strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nội dung chuyển khoản (Memo)</span>
                  <div className="flex items-center justify-between bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <strong className="text-amber-900 font-mono font-bold">BADMINTON {order.payosOrderCode}</strong>
                    <button
                      onClick={() => copyToClipboard(`BADMINTON ${order.payosOrderCode}`, 'memo')}
                      className="p-1 text-amber-600 hover:text-amber-800"
                    >
                      {copiedField === 'memo' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel Order Action */}
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">Đổi ý không muốn mua nữa?</span>
              <button
                onClick={handleCancelOrder}
                className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition-colors"
              >
                Hủy Đơn & Hoàn Tồn Kho
              </button>
            </div>

            {/* 100% LOCALHOST DEV TESTING RUNNER */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>CHẾ ĐỘ MÔ PHỎNG THANH TOÁN LOCALHOST (DEV RUNNER)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Khi chạy 100% trên localhost không có Ngrok, bấm nút bên dưới để backend tự động sinh payload Webhook có chữ ký HMAC-SHA256 hợp lệ và chuyển trạng thái sang <strong className="text-emerald-400">PAID</strong>.
              </p>
              <button
                onClick={handleMockWebhookTrigger}
                disabled={mockTriggering}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{mockTriggering ? 'Đang Xử Lý Webhook...' : 'Mô Phỏng Thanh Toán Thành Công Ngay'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* When PAID or CANCELLED */
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 text-center space-y-5">
            {order.status === 'PAID' && (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Thanh Toán Thành Công!
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Đơn hàng của bạn đã được xác nhận qua cổng PayOS. Nhân viên sẽ tiến hành kiểm tra thông số kỹ thuật, đóng gói cẩn thận và bàn giao đơn vị vận chuyển.
                </p>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs inline-block text-left space-y-1">
                  <div>Mã đối soát: <strong className="font-mono">PAYOS_{order.payosOrderCode}</strong></div>
                  <div>Trạng thái kho: <strong className="text-emerald-700">Đã trừ đứt tồn kho khả dụng</strong></div>
                </div>
              </>
            )}
            {order.status === 'CANCELLED' && (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Đơn Hàng Đã Hủy
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Đơn hàng đã được hủy do quá hạn 15 phút hoặc theo yêu cầu của bạn. Toàn bộ số lượng vợt đã được hoàn trả lại kho hàng.
                </p>
              </>
            )}
          </div>
        )}

        {/* Right Col: Order Items & Delivery Info */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Thông Tin Giao Hàng & Sản Phẩm
          </h3>

          <div className="space-y-2 text-xs text-slate-600">
            <div><span className="text-slate-400">Người nhận:</span> <strong className="text-slate-800">{order.customerName}</strong></div>
            <div><span className="text-slate-400">Số điện thoại:</span> <strong className="text-slate-800">{order.shippingPhone}</strong></div>
            <div><span className="text-slate-400">Địa chỉ nhận hàng:</span> <strong className="text-slate-800">{order.shippingAddress}</strong></div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Danh sách vợt đã đặt
            </span>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={item.productImageUrl} alt={item.productName} className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{item.productName}</h4>
                      <span className="text-[11px] text-slate-500">{item.weightGrip} • SL: x{item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-extrabold text-slate-800 shrink-0">
                    {formatPrice(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
            <span>Tổng đơn hàng:</span>
            <span className="text-lg text-emerald-700">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
