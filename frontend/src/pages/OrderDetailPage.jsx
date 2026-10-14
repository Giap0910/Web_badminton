import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getOrderStatusLabel } from '../utils/formatters';
import UserLayout from '../components/UserLayout';
import { orderApi } from '../api/orderApi.js';
import { isEligibleReturnLine, returnApi } from '../api/returnApi.js';
import OrderItemOptions from '../components/OrderItemOptions';
import ProductImage from '../components/ProductImage';
import {
  formatReviewReason,
  getPaymentStatusInfo,
} from '../utils/paymentFormatters.js';

export { getPaymentStatusInfo };
export const canRequestOrderWarranty = (order, items) => order?.status === 'COMPLETED'
  && items.some(item => String(item.orderId) === String(order.id) && isEligibleReturnLine(item));
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
  Loader2,
  CreditCard,
  AlertCircle
} from 'lucide-react';

const OrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copiedField, setCopiedField] = useState(null);
  const [actionError, setActionError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [warrantyItems, setWarrantyItems] = useState([]);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [warrantyError, setWarrantyError] = useState('');
  const [warrantyNote, setWarrantyNote] = useState('');
  const [warrantyRetry, setWarrantyRetry] = useState(0);
  const navigate = useNavigate();

  const activeOrderPaymentIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentOrderIdRef = useRef(id);
  currentOrderIdRef.current = id;
  const orderFetchGenerationRef = useRef(0);
  const paymentFetchGenerationRef = useRef(0);
  const warrantyFetchGenerationRef = useRef(0);
  const currentOrderRef = useRef(order);
  currentOrderRef.current = order;

  const fetchWarrantyEligibility = async (signal) => {
    const targetId = String(id); const generation = ++warrantyFetchGenerationRef.current;
    const active = () => isMountedRef.current && !signal?.aborted && String(currentOrderIdRef.current) === targetId
      && warrantyFetchGenerationRef.current === generation;
    setWarrantyLoading(true); setWarrantyError('');
    try {
      const response = await returnApi.getEligibleItems({ signal, params: { orderId: targetId } }); const items = response?.data ?? response;
      if (!active()) return;
      if (!Array.isArray(items)) throw new Error('Dữ liệu điều kiện bảo hành không hợp lệ.');
      const orderItems = items.filter(item => String(item.orderId) === targetId);
      setWarrantyItems(orderItems.filter(isEligibleReturnLine));
      setWarrantyNote(orderItems.filter(item => !isEligibleReturnLine(item)).map(item => item.ineligibleReason).filter(Boolean).join(' · '));
    } catch (failure) {
      if (active()) { setWarrantyItems([]); setWarrantyNote(''); setWarrantyError(failure.response?.data?.message || 'Không kiểm tra được điều kiện bảo hành.'); }
    } finally { if (active()) setWarrantyLoading(false); }
  };
  useEffect(() => {
    setWarrantyItems([]); setWarrantyError(''); setWarrantyNote(''); setWarrantyLoading(false);
    if (order?.status !== 'COMPLETED' || String(order.id) !== String(id)) return;
    const controller = new AbortController(); fetchWarrantyEligibility(controller.signal);
    return () => { controller.abort(); warrantyFetchGenerationRef.current++; };
  }, [id, order?.status, warrantyRetry]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPaymentOnly = async (targetOrderId) => {
    if (!isMountedRef.current || String(currentOrderIdRef.current) !== String(targetOrderId)) return;
    const generation = ++paymentFetchGenerationRef.current;
    const active = () => isMountedRef.current && String(currentOrderIdRef.current) === String(targetOrderId)
      && paymentFetchGenerationRef.current === generation;
    activeOrderPaymentIdRef.current = targetOrderId;
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const payRes = await orderApi.getOrderPayment(targetOrderId);
      if (!active()) return;
      const payData = payRes?.data ?? payRes;
      setPayment(payData || null);
      setPaymentError(null);
    } catch (payErr) {
      if (!active()) return;
      const status = payErr.response?.status;
      if (status === 404) {
        // 404 is a valid state meaning no payment record yet
        setPayment(null);
        setPaymentError(null);
      } else {
        // 500, network error, timeout, etc.: Must trigger error state, NOT empty state!
        setPayment(null);
        setPaymentError(
          payErr.response?.data?.message || 'Không thể tải thông tin thanh toán từ máy chủ. Vui lòng thử lại.'
        );
      }
    } finally {
      if (active()) {
        setPaymentLoading(false);
      }
    }
  };

  const fetchOrderAndPayment = async () => {
    if (!isMountedRef.current || String(currentOrderIdRef.current) !== String(id)) return;
    const targetId = id;
    const generation = ++orderFetchGenerationRef.current;
    const active = () => isMountedRef.current && String(currentOrderIdRef.current) === String(targetId)
      && orderFetchGenerationRef.current === generation;
    try {
      const res = await orderApi.getOrderById(targetId);
      const data = res?.data ?? res;
      if (!active()) return;
      if (!data || String(data.id) !== String(targetId)) throw new Error('Dữ liệu đơn hàng không khớp mã yêu cầu.');
      setOrder(data);
      setOrderError(''); setTimeLeft(data.timeRemainingSeconds || 0);
      fetchPaymentOnly(targetId);
    } catch (err) {
      if (!active()) return;
      const status = err.response?.status;
      if ([401, 403, 404].includes(status)) { setOrder(null); setPayment(null); }
      setOrderError(err.response?.data?.message || (status === 404 ? 'Không tìm thấy đơn hàng.'
        : status === 403 ? 'Bạn không có quyền xem đơn hàng này.' : 'Không tải được đơn hàng. Vui lòng kiểm tra kết nối và thử lại.'));
    } finally {
      if (active()) setLoading(false);
    }
  };

  useEffect(() => {
    setOrder(null); setPayment(null); setOrderError(''); setPaymentError(null);
    setLoading(true); setPaymentLoading(true); setTimeLeft(0); setActionError('');
    fetchOrderAndPayment();
    return () => { orderFetchGenerationRef.current++; paymentFetchGenerationRef.current++; activeOrderPaymentIdRef.current = null; };
  }, [id]);

  useEffect(() => {
    if (order?.status !== 'PENDING') return;
    const interval = setInterval(() => {
      if (currentOrderRef.current?.status === 'PENDING') fetchOrderAndPayment();
    }, 5000);
    return () => clearInterval(interval);
  }, [id, order?.status]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchOrderAndPayment();
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
    const targetId = order.id;
    try {
      const res = await orderApi.cancelOrder(targetId);
      if (!isMountedRef.current || String(currentOrderIdRef.current) !== String(targetId)) return;
      orderFetchGenerationRef.current++;
      setOrder(res?.data ?? res);
      fetchPaymentOnly(targetId);
    } catch (err) {
      if (!isMountedRef.current || String(currentOrderIdRef.current) !== String(targetId)) return;
      setActionError(err.response?.data?.message || 'Không thể hủy đơn');
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
      <UserLayout currentPage="Chi tiết đơn hàng">
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-secondary mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Đang tải thông tin đơn hàng...</p>
        </div>
      </UserLayout>
    );
  }

  if (!order) {
    return (
      <UserLayout currentPage="Chi tiết đơn hàng">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
          <h2 role="alert" className="text-base font-bold text-slate-900">{orderError || 'Không tìm thấy đơn hàng!'}</h2>
          <button type="button" onClick={() => { setLoading(true); fetchOrderAndPayment(); }} className="block mx-auto text-xs font-bold text-secondary underline">Thử tải lại</button>
          <Link to="/my-orders" className="text-xs font-bold text-secondary hover:underline">
            Quay lại danh sách đơn hàng
          </Link>
        </div>
      </UserLayout>
    );
  }

  const paymentStatus = paymentError
    ? {
        label: 'Thanh toán: Lỗi tải dữ liệu',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertCircle,
      }
    : getPaymentStatusInfo(payment, order);
  const PaymentStatusIcon = paymentStatus.icon;

  return (
    <UserLayout
      currentPage={`Chi tiết đơn hàng #${order.id}`}
    >
      <div className="space-y-6">
        {orderError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <p>{orderError}</p><button type="button" onClick={fetchOrderAndPayment} className="mt-2 font-bold underline">Thử tải lại dữ liệu</button>
        </div>}
        {/* Top Action Back Link & Status Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Quay lại danh sách đơn hàng</span>
          </Link>

          {/* DUAL STATUS: ORDER STATUS AND PAYMENT STATUS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Trạng thái đơn hàng */}
            {order.status === 'PENDING' && (
              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Đơn hàng: {getOrderStatusLabel(order)}{order.paymentMethod === 'PAYOS_VIETQR' ? ` (${formatTimer(timeLeft)})` : ''}</span>
              </span>
            )}
            {['PAID', 'SHIPPING', 'COMPLETED'].includes(order.status) && (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đơn hàng: {getOrderStatusLabel(order)}</span>
              </span>
            )}
            {order.status === 'CANCELLED' && (
              <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Đơn hàng: Đã hủy</span>
              </span>
            )}

            {/* Trạng thái thanh toán (độc lập với đơn hàng) */}
            <span className={`px-3.5 py-1.5 rounded-full border font-bold text-xs flex items-center gap-1.5 ${paymentStatus.badgeClass}`}>
              <PaymentStatusIcon className="w-3.5 h-3.5" />
              <span>{paymentStatus.label}</span>
            </span>
          </div>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {actionError}
          </div>
        )}

        {/* LATE PAYMENT & CANCELLED NOTICE */}
        {order.status === 'CANCELLED' && payment?.status === 'NEEDS_REVIEW' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 min-w-0">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cảnh báo: Đơn hàng đã hủy nhưng ghi nhận giao dịch thanh toán muộn</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed min-w-0">
              Đơn hàng này hiện ở trạng thái <strong>Đã hủy</strong>. Giao dịch thanh toán (Ref: <span className="font-mono font-semibold break-all [overflow-wrap:anywhere]">{payment.reference || '—'}</span>) được ghi nhận và đang chuyển sang diện <strong>Cần đối soát</strong> ({formatReviewReason(payment.reviewReason)}). Nhân viên hỗ trợ sẽ liên hệ đối soát và xử lý hoàn tiền nếu hợp lệ.
            </p>
          </div>
        )}

        {/* If PENDING: Show VietQR Payment Box */}
        {order.status === 'PENDING' && order.paymentMethod === 'COD' && (
          <div className="bg-white p-6 rounded-2xl space-y-3">
            <p>Đơn COD đang chờ xử lý. Thanh toán khi nhận hàng; không áp dụng thời hạn QR.</p>
            <button className="border rounded px-4 py-2" onClick={handleCancelOrder}>Hủy đơn</button>
          </div>
        )}
        {order.status === 'PENDING' && order.paymentMethod === 'PAYOS_VIETQR' && (
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
                  to={`/checkout?orderId=${order.id}`}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
                  title="Thanh toán QR tạm hoãn trong demo. Bấm để đổi sang COD."
                >
                  Đổi sang COD (QR tạm hoãn)
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
          </div>
        )}

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6">
          {/* Shipping & Payment Summary Info */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/50 border-b border-slate-100 text-xs">
            {/* Cột 1: Thông tin nhận hàng */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-4 h-4 text-royal" /> Thông tin nhận hàng
              </span>
              <p className="font-bold text-sm text-slate-900">
                {order.customerName} <span className="text-slate-500 font-normal">| {order.shippingPhone}</span>
              </p>
              <p className="text-slate-600">{order.shippingAddress}</p>
              <p className="text-[11px] font-bold text-secondary pt-1">
                Phương thức: {order.paymentMethod === 'COD' ? 'Thanh toán tiền mặt (COD)' : 'Chuyển khoản QR (VietQR)'}
              </p>
            </div>

            {/* Cột 2: Yêu cầu kỹ thuật căng cước */}
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

            {/* Cột 3: Chi tiết thanh toán & Đối soát */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Chi tiết thanh toán
                </span>
                {(order.paymentMode === 'MOCK' || payment?.paymentMode === 'MOCK') && (
                  <span
                    data-testid="mock-payment-badge"
                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
                  >
                    MOCK
                  </span>
                )}
              </div>

              {paymentLoading ? (
                <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải thông tin thanh toán...</span>
                </div>
              ) : paymentError ? (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Không thể tải thông tin thanh toán</span>
                  </div>
                  <p className="text-rose-700 text-[11px] leading-relaxed break-words">
                    {paymentError}
                  </p>
                  <button
                    type="button"
                    onClick={() => fetchPaymentOnly(order?.id || id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Thử lại</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-slate-600 text-xs">
                  <div className="flex justify-between">
                    <span>Cổng thanh toán:</span>
                    <span className="font-bold text-slate-900">
                      {payment?.provider || (order.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'PayOS')}
                    </span>
                  </div>
                  {payment?.mockProviderStatus && (
                    <div className="flex justify-between">
                      <span className="text-amber-800 font-semibold">Trạng thái Mock:</span>
                      <span className="font-bold text-amber-900">{payment.mockProviderStatus}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-2">
                    <span className="shrink-0">Mã tham chiếu (Ref):</span>
                    <span className="font-mono text-slate-900 font-semibold break-all whitespace-normal [overflow-wrap:anywhere] min-w-0 text-right">
                      {payment?.reference ? payment.reference : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thời gian thanh toán:</span>
                    <span className="text-slate-900">
                      {payment?.paidAt ? new Date(payment.paidAt).toLocaleString('vi-VN') : '—'}
                    </span>
                  </div>
                  {payment?.reviewReason && (
                    <div className="pt-1 border-t border-slate-100 flex flex-col">
                      <span className="text-amber-700 font-bold text-[11px]">Lý do kiểm tra:</span>
                      <span className="text-amber-800 text-[11px] break-all whitespace-normal [overflow-wrap:anywhere]">
                        {formatReviewReason(payment.reviewReason)}
                      </span>
                    </div>
                  )}
                  {!payment && (
                    <div className="pt-1 text-[11px] text-slate-500 italic">
                      {order.paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi giao hàng.' : 'Chưa có bản ghi thanh toán.'}
                    </div>
                  )}
                </div>
              )}
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
                    <ProductImage compact
                      src={item.productImageUrl}
                      alt={item.productName}
                      className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-slate-400">{item.productBrand}</span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{item.productName}</h4>
                      <OrderItemOptions item={item} />
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
                <span>Bảo hành 1 đổi 1 trong 90 ngày cho vợt, giày, quần áo và balo/bao vợt đủ điều kiện; phụ kiện không áp dụng.</span>
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
                <span className={`font-bold ${order.shippingFee && order.shippingFee > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                  {order.shippingFee && order.shippingFee > 0 ? formatPrice(order.shippingFee) : 'Miễn phí toàn quốc'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-900">Tổng thanh toán:</span>
                <span className="text-xl font-black text-secondary">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Row */}
        {warrantyLoading && <p role="status" className="text-xs text-slate-600">Đang kiểm tra điều kiện bảo hành...</p>}
        {warrantyError && <p role="alert" className="text-xs text-red-700">{warrantyError}
          <button type="button" onClick={() => setWarrantyRetry(value => value + 1)} className="ml-2 underline">Thử lại</button></p>}
        {!warrantyLoading && warrantyNote && !canRequestOrderWarranty(order, warrantyItems) && <p className="text-xs text-slate-600">Bảo hành: {warrantyNote}</p>}
        {canRequestOrderWarranty(order, warrantyItems) && (
          <div className="flex justify-end">
            <Link
              to={`/returns?orderId=${order.id}`}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Gửi yêu cầu bảo hành 1 đổi 1</span>
            </Link>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default OrderDetailPage;
