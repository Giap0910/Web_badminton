import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
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
  RotateCcw,
  MapPin,
  FileText,
  Gift,
  ShieldCheck,
  Award,
  Loader2
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
      const res = await orderApi.getOrderById(id);
      const data = res?.data ?? res;
      setOrder(data);
      if (data) {
        setTimeLeft(data.timeRemainingSeconds || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      if (order?.status === 'PENDING') {
        fetchOrder();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id, order?.status]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchOrder();
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
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Số lượng tồn kho sẽ được hoàn trả ngay.')) {
      return;
    }
    setActionError('');
    try {
      const res = await orderApi.cancelOrder(order.id);
      setOrder(res?.data ?? res);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Không thể hủy đơn');
    }
  };

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
      <UserLayout title="Chi Tiết Đơn Hàng">
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-secondary mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Đang tải thông tin đơn hàng...</p>
        </div>
      </UserLayout>
    );
  }

  if (!order) {
    return (
      <UserLayout title="Chi Tiết Đơn Hàng">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
          <h2 className="text-base font-bold text-slate-900">Không tìm thấy đơn hàng!</h2>
          <Link to="/my-orders" className="text-xs font-bold text-secondary hover:underline">
            Quay lại danh sách đơn hàng
          </Link>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title={`Chi Tiết Đơn Hàng #${order.id}`}
      subtitle={`Ngày đặt: ${new Date(order.createdAt).toLocaleString('vi-VN')} • Mã PayOS: ${order.payosOrderCode || 'N/A'}`}
    >
      <div className="space-y-6">
        {/* Top Action Back Link & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Quay lại danh sách đơn hàng</span>
          </Link>

          <div>
            {order.status === 'PENDING' && (
              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Chờ thanh toán QR ({formatTimer(timeLeft)})</span>
              </span>
            )}
            {order.status === 'PAID' && (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã thanh toán thành công</span>
              </span>
            )}
            {order.status === 'CANCELLED' && (
              <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Đơn hàng đã hủy</span>
              </span>
            )}
          </div>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {actionError}
          </div>
        )}

        {/* If PENDING: Show VietQR Payment Box */}
        {order.status === 'PENDING' && (
          <div className="bg-white rounded-2xl border-2 border-secondary/40 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-secondary" />
                  <span>Quét mã VietQR để hoàn tất thanh toán</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Thời gian giữ hàng trong kho còn: <strong className="text-secondary font-bold">{formatTimer(timeLeft)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/payment/qr/${order.id}`}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all"
                >
                  Mở toàn màn hình QR
                </Link>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-bold text-xs transition-colors"
                >
                  Hủy đơn
                </button>
              </div>
            </div>

            {/* Mock Webhook Helper for dev testing */}
            <button
              type="button"
              onClick={handleMockWebhookTrigger}
              disabled={mockTriggering}
              className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {mockTriggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Mô phỏng ngân hàng báo có tiền (Test Webhook Dev)</span>
            </button>
          </div>
        )}

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6">
          {/* Shipping & Technical Note */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 border-b border-slate-100 text-xs">
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-4 h-4 text-royal" /> Thông tin nhận hàng
              </span>
              <p className="font-bold text-sm text-slate-900">
                {order.customerName} <span className="text-slate-500 font-normal">| {order.shippingPhone}</span>
              </p>
              <p className="text-slate-600">{order.shippingAddress}</p>
              <p className="text-[11px] font-bold text-secondary pt-1">
                Phương thức thanh toán: {order.paymentMethod === 'COD' ? 'Thanh toán tiền mặt (COD)' : 'Chuyển khoản QR (VietQR)'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <Award className="w-4 h-4 text-secondary" /> Yêu cầu kỹ thuật căng cước
              </span>
              <p className="text-slate-600 italic">
                {order.note ? `“${order.note}”` : 'Không có yêu cầu kỹ thuật đặc biệt.'}
              </p>
              <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg text-slate-600">
                <span>Kỹ thuật viên đan vợt:</span>
                <span className="font-bold text-slate-900">Yonex Tour Certified Master</span>
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="px-6 space-y-3">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
              Danh sách sản phẩm ({order.items?.length || 0} mặt hàng)
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {(order.items || []).map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={item.productImageUrl}
                      alt={item.productName}
                      className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 p-1 object-contain shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-slate-400">{item.productBrand}</span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{item.productName}</h4>
                      {item.weightGrip && (
                        <span className="inline-block text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {item.weightGrip}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[11px] text-secondary font-medium">
                        <Gift className="w-3.5 h-3.5 shrink-0" />
                        <span>Tặng kèm bao vợt nhung + quấn cán chính hãng (0₫)</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs text-slate-500 block">Số lượng: {item.quantity}</span>
                    <span className="font-black text-sm text-slate-900">
                      {formatPrice((item.price || 0) * (item.quantity || 1))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bảo hành chính hãng 1 đổi 1 và bảo hành đứt cước 24h.</span>
              </div>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
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

        {/* Action Row */}
        {order.status === 'PAID' && (
          <div className="flex justify-end">
            <Link
              to={`/returns?orderId=${order.id}`}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Gửi yêu cầu Đổi trả / Bảo hành</span>
            </Link>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default OrderDetailPage;
