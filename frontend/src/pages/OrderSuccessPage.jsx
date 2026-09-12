import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import {
  CheckCircle,
  Copy,
  Check,
  Calendar,
  Truck,
  MapPin,
  FileText,
  Gift,
  ArrowRight,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Award,
  Loader2,
  AlertCircle
} from 'lucide-react';

const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const copyOrderId = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.id.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderApi.getOrderById(orderId);
        setOrder(res?.data ?? res);
      } catch (err) {
        console.error('Lỗi khi tải chi tiết đơn hàng:', err);
        setError('Không thể tải thông tin đơn hàng.');
      } finally {
        setLoading(false);
      }
    };

    if (!order) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="text-sm font-semibold text-slate-600">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Không tìm thấy thông tin đơn hàng</h2>
        <p className="text-xs text-slate-500">{error || 'Đơn hàng không tồn tại.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  // Calculate items subtotal
  const itemsSubtotal = (order.items || []).reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Stepper */}
      <div className="w-full flex items-center justify-center pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] flex items-center justify-center">✓</span>
            Giỏ hàng
          </span>
          <span className="w-8 h-[2px] bg-secondary"></span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] flex items-center justify-center">✓</span>
            Thanh toán
          </span>
          <span className="w-8 h-[2px] bg-secondary"></span>
          <span className="flex items-center gap-1.5 text-secondary font-black">
            <span className="w-5 h-5 rounded-full bg-secondary text-white text-[11px] flex items-center justify-center">3</span>
            Hoàn tất
          </span>
        </div>
      </div>

      {/* Success Badge & Headline */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-500/10 text-emerald-600">
            <CheckCircle className="w-10 h-10" />
          </div>
        </div>

        <span className="inline-block text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          Giao dịch đã xác thực
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Đặt hàng thành công!
        </h1>

        <p className="text-xs sm:text-sm text-slate-500">
          Cảm ơn bạn <strong className="text-slate-800 font-bold">{order.customerName}</strong> đã tin tưởng lựa chọn{' '}
          <strong className="text-slate-900 font-bold">Apex Badminton</strong>. Thông tin chi tiết đơn hàng đã được ghi nhận và gửi thông báo xác nhận.
        </p>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Order ID */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mã đơn hàng</span>
          <div className="flex items-center justify-between">
            <span className="font-mono font-black text-base text-slate-900">#{order.id}</span>
            <button
              type="button"
              onClick={copyOrderId}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Sao chép"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Card 2: Payment Status */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trạng thái thanh toán</span>
          <div className="flex items-center gap-1.5">
            {order.status === 'PAID' ? (
              <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Đã thanh toán VietQR
              </span>
            ) : order.paymentMethod === 'COD' ? (
              <span className="text-xs font-bold text-royal bg-blue-50 px-2 py-0.5 rounded-full">
                Thanh toán khi nhận (COD)
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                Chờ thanh toán QR
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Created At */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian tạo</span>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(order.createdAt || Date.now()).toLocaleString('vi-VN')}</span>
          </div>
        </div>

        {/* Card 4: Estimated Delivery */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Dự kiến nhận hàng</span>
          <div className="flex items-center gap-1 text-xs font-bold text-secondary">
            <Truck className="w-3.5 h-3.5" />
            <span>Hỏa tốc 2H - 24H</span>
          </div>
        </div>
      </div>

      {/* Main Order Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6">
        {/* Card Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:px-6 flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary" />
              <span>Chi tiết đơn hàng #{order.id}</span>
            </h2>
            <p className="text-[11px] text-slate-400">Được chuẩn bị bởi Trung tâm thể thao Apex Badminton</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {order.status || 'PENDING'}
          </span>
        </div>

        {/* Shipping & Technical Note 2-Col Grid */}
        <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Receiver Info */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <span className="font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <MapPin className="w-4 h-4 text-royal" /> Thông tin nhận hàng
            </span>
            <p className="font-bold text-sm text-slate-900">
              {order.customerName} <span className="text-slate-500 font-normal">| {order.shippingPhone}</span>
            </p>
            <p className="text-slate-600">{order.shippingAddress}</p>
            <p className="text-[11px] font-bold text-secondary pt-1">
              Phương thức: Giao nhanh tiêu chuẩn BWF
            </p>
          </div>

          {/* Technical Stringing Note */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <span className="font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Award className="w-4 h-4 text-secondary" /> Yêu cầu kỹ thuật & Căng cước
            </span>
            <p className="text-slate-600 italic">
              {order.note ? `“${order.note}”` : 'Không có yêu cầu kỹ thuật đặc biệt.'}
            </p>
            <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-500">Kỹ thuật viên đan vợt:</span>
              <span className="font-bold text-slate-900">Chứng chỉ Yonex Tour Master</span>
            </div>
          </div>
        </div>

        {/* Product Items List */}
        <div className="px-6 space-y-3">
          <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
            Danh sách sản phẩm ({order.items?.length || 0} mặt hàng)
          </h3>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {(order.items || []).map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={item.productImageUrl}
                      alt={item.productName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {item.productBrand}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {item.productName}
                    </h4>
                    {item.weightGrip && (
                      <span className="inline-block text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {item.weightGrip}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-secondary font-medium pt-0.5">
                      <Gift className="w-3.5 h-3.5 shrink-0" />
                      <span>Tặng kèm bao vợt nhung + quấn cán chính hãng (0₫)</span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 space-y-0.5">
                  <span className="text-xs text-slate-500 block">Số lượng: 0{item.quantity}</span>
                  <span className="font-black text-sm text-slate-900 block">
                    {formatPrice((item.price || 0) * (item.quantity || 1))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Summary Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-xs text-slate-500 text-center sm:text-left">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Cam kết 100% hàng chính hãng phân phối, bảo hành 1 đổi 1.</span>
            </div>
            <p>Mọi thắc mắc về bảo hành hoặc vận chuyển, vui lòng gọi Hotline 1900 6886.</p>
          </div>

          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-bold text-slate-800">{formatPrice(itemsSubtotal)}</span>
            </div>

            {order.discountAmount && order.discountAmount > 0 ? (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Giảm giá Voucher ({order.voucherCode}):</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            ) : null}

            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển:</span>
              <span className="font-bold text-emerald-600">Miễn phí toàn quốc</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-black text-slate-900">Tổng thanh toán:</span>
              <span className="text-xl font-black text-secondary">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/my-orders"
          className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md text-center"
        >
          Xem Đơn Hàng Của Tôi
        </Link>
        <Link
          to="/products"
          className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-secondary/20 flex items-center justify-center gap-2"
        >
          <span>Tiếp Tục Mua Sắm</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
