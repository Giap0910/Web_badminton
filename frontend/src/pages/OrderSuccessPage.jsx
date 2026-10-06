import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { formatPrice, isOrderPaid, getOrderStatusLabel } from '../utils/formatters';
import {
  Tag,
  CheckCircle2,
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
  AlertCircle,
  Phone,
  MessageSquare,
  Wrench,
  Receipt,
  Zap,
  Store,
  FileCheck,
  RefreshCw,
  XCircle,
  AlertTriangle
} from 'lucide-react';

const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [paymentLoadStatus, setPaymentLoadStatus] = useState('idle'); // 'idle' | 'loading' | 'loaded' | 'absent' | 'error'
  const [paymentError, setPaymentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const currentOrderIdRef = useRef(orderId);
  currentOrderIdRef.current = orderId;
  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const displayOrderCode = order?.orderCode || `#HG-${orderId || '89241'}`;

  const copyOrderId = () => {
    navigator.clipboard.writeText(displayOrderCode.replace('#', ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchOrderData = async (targetId, isManualCheck = false) => {
    if (!targetId) {
      setError('Thiếu mã đơn hàng, chưa thể xác minh thanh toán.');
      setLoading(false);
      return;
    }

    if (isManualCheck) {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      setIsChecking(true);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const res = await orderApi.getOrderById(targetId);
      const oData = (res && typeof res === 'object' && 'data' in res) ? res.data : res;
      if (currentOrderIdRef.current !== targetId || !isMountedRef.current) return;
      setOrder(oData);

      let pData = null;
      let pStatus = 'idle';
      let pErrMessage = '';
      try {
        const payRes = await orderApi.getOrderPayment(targetId);
        pData = (payRes && typeof payRes === 'object' && 'data' in payRes) ? payRes.data : payRes;
        if (pData && pData.status) {
          pStatus = 'loaded';
        } else {
          // Canonical contract: HTTP 200 with null body confirms no payment attempt
          pStatus = 'absent';
          pData = null;
        }
      } catch (pErr) {
        // HTTP 4xx/5xx, timeout, network failure -> PAYMENT LOAD FAILED (never treat as absent)
        pStatus = 'error';
        pData = null;
        const pErrStatus = pErr?.response?.status;
        if (pErrStatus === 401) {
          pErrMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xác minh thanh toán.';
        } else if (pErrStatus === 403) {
          pErrMessage = 'Bạn không có quyền truy cập thông tin thanh toán của đơn hàng này.';
        } else if (pErrStatus === 404) {
          pErrMessage = 'Không tìm thấy dữ liệu thanh toán cho đơn hàng này.';
        } else {
          pErrMessage = 'Chưa thể xác minh trạng thái thanh toán. Vui lòng kiểm tra lại.';
        }
      }

      if (currentOrderIdRef.current !== targetId || !isMountedRef.current) return;
      setPayment(pData);
      setPaymentLoadStatus(pStatus);
      setPaymentError(pErrMessage);
    } catch (err) {
      if (currentOrderIdRef.current !== targetId || !isMountedRef.current) return;
      const status = err.response?.status;
      if (status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else if (status === 403) {
        setError('Bạn không có quyền truy cập thông tin đơn hàng này.');
      } else if (status === 404) {
        setError('Không tìm thấy thông tin đơn hàng.');
      } else {
        setError(err.response?.data?.message || 'Không thể xác minh đơn hàng. Vui lòng kiểm tra lại danh sách đơn hàng.');
      }
    } finally {
      if (currentOrderIdRef.current === targetId && isMountedRef.current) {
        setLoading(false);
        setIsChecking(false);
      }
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    setOrder(null);
    setPayment(null);
    setPaymentLoadStatus('idle');
    setPaymentError('');
    setError('');
    fetchOrderData(orderId, false);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
        <p className="text-sm font-semibold text-slate-600">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  // =========================================================================
  // PAYMENT ATTEMPT EXCLUSIVE AUTHORITY & ERROR PRIORITY (FIX-004 Round 5)
  // When PaymentAttempt exists (payment != null), payment.status is the SOLE
  // authority for payment UI. Order.status must NOT override any payment state.
  // When payment GET fails (paymentLoadStatus === 'error'), payment verification
  // error is displayed; order.status MUST NEVER be used as a success fallback.
  // When payment is confirmed absent (paymentLoadStatus === 'absent'), safe fallback
  // is derived from order/paymentMethod.
  // =========================================================================
  const isPaymentError = paymentLoadStatus === 'error';
  const isPaid = payment
    ? payment?.status === 'PAID'
    : (paymentLoadStatus === 'absent' ? isOrderPaid(order) : false);

  const isNeedsReview = payment?.status === 'NEEDS_REVIEW';
  const isFailed = payment?.status === 'FAILED';
  const isExpired = payment?.status === 'EXPIRED';
  const isPaymentCancelled = payment?.status === 'CANCELLED';
  const isCancelled = payment?.status === 'CANCELLED' || (!payment && order?.status === 'CANCELLED');
  const isOrderCancelled = order?.status === 'CANCELLED';
  const isCreating = payment?.status === 'CREATING';

  // isPending: only for payment PENDING attempt, or fallback for PayOS order when attempt is confirmed absent
  const isPending = payment
    ? payment?.status === 'PENDING'
    : (!isPaid && !isOrderCancelled && order?.paymentMethod === 'PAYOS_VIETQR' && order?.status === 'PENDING' && paymentLoadStatus === 'absent');

  // Derive explicit payment display info based on exclusive precedence:
  let statusBadgeLabel = 'Thông báo';
  let statusBadgeClass = 'bg-slate-100 text-slate-800';
  let statusHeading = 'Trạng thái đơn hàng';
  let statusDetailMessage = '';

  if (payment) {
    // When payment attempt exists, PAYMENT UI is derived EXCLUSIVELY from payment.status
    if (isNeedsReview) {
      statusBadgeLabel = 'Cần đối soát';
      statusBadgeClass = 'bg-amber-100 text-amber-800';
      statusHeading = 'Thanh toán đang chờ đối soát';
      statusDetailMessage = 'Giao dịch thanh toán cần được đối soát bởi quản trị viên. Vui lòng theo dõi tiến trình trong chi tiết đơn hàng hoặc liên hệ hỗ trợ.';
    } else if (isFailed) {
      statusBadgeLabel = 'Thanh toán thất bại';
      statusBadgeClass = 'bg-red-100 text-red-800';
      statusHeading = 'Thanh toán thất bại';
      statusDetailMessage = 'Giao dịch thanh toán không thành công. Bạn có thể quay lại trang thanh toán để thử lại.';
    } else if (isExpired) {
      statusBadgeLabel = 'Đã hết hạn';
      statusBadgeClass = 'bg-red-100 text-red-800';
      statusHeading = 'Mã thanh toán đã hết hạn';
      statusDetailMessage = 'Mã thanh toán VietQR đã hết hạn. Vui lòng quay lại đơn hàng để tạo mã thanh toán mới.';
    } else if (isPaymentCancelled) {
      statusBadgeLabel = 'Đã hủy';
      statusBadgeClass = 'bg-red-100 text-red-800';
      statusHeading = 'Giao dịch thanh toán đã bị hủy';
      statusDetailMessage = 'Giao dịch thanh toán đã bị hủy trên cổng thanh toán.';
    } else if (isCreating) {
      statusBadgeLabel = 'Đang khởi tạo';
      statusBadgeClass = 'bg-amber-100 text-amber-800';
      statusHeading = 'Đang chuẩn bị liên kết thanh toán';
      statusDetailMessage = 'Liên kết thanh toán đang được chuẩn bị. Vui lòng chờ trong giây lát hoặc bấm nút "Kiểm tra lại".';
    } else if (isPending) {
      statusBadgeLabel = 'Đang xác nhận thanh toán';
      statusBadgeClass = 'bg-amber-100 text-amber-800';
      statusHeading = 'Đang kiểm tra giao dịch';
      statusDetailMessage = 'Đơn hàng đang chờ cổng thanh toán xác nhận. Nếu bạn vừa hoàn tất chuyển khoản, vui lòng chờ trong giây lát hoặc bấm nút "Kiểm tra lại".';
    }
  } else if (isPaymentError) {
    statusBadgeLabel = 'Lỗi xác minh';
    statusBadgeClass = 'bg-amber-100 text-amber-800';
    statusHeading = 'Không thể xác minh trạng thái thanh toán';
    statusDetailMessage = paymentError || 'Chưa thể xác minh trạng thái thanh toán. Vui lòng kiểm tra lại.';
  } else {
    // Safe fallback when payment attempt is confirmed absent
    if (isOrderCancelled) {
      statusBadgeLabel = 'Đã hủy';
      statusBadgeClass = 'bg-red-100 text-red-800';
      statusHeading = 'Đơn hàng đã bị hủy';
      statusDetailMessage = 'Đơn hàng này đã bị hủy.';
    } else if (order?.paymentMethod === 'COD' && order?.status === 'PENDING') {
      statusBadgeLabel = 'Chờ xử lý COD';
      statusBadgeClass = 'bg-blue-100 text-blue-800';
      statusHeading = 'Đơn hàng đã được ghi nhận';
      statusDetailMessage = 'Đơn hàng đã được ghi nhận, chưa thanh toán. Thanh toán khi nhận hàng.';
    } else if (order?.paymentMethod === 'PAYOS_VIETQR' && order?.status === 'PENDING') {
      statusBadgeLabel = 'Đang xác nhận thanh toán';
      statusBadgeClass = 'bg-amber-100 text-amber-800';
      statusHeading = 'Đang kiểm tra giao dịch';
      statusDetailMessage = 'Đơn hàng đang chờ cổng thanh toán xác nhận. Nếu bạn vừa hoàn tất chuyển khoản, vui lòng chờ trong giây lát hoặc bấm nút "Kiểm tra lại".';
    } else if (order) {
      statusDetailMessage = getOrderStatusLabel(order);
    } else {
      statusDetailMessage = 'Chưa có xác nhận thanh toán thành công cho đơn hàng này.';
    }
  }

  if (error || !order || !isPaid) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pt-6 pb-20">
        {/* Top Stepper Banner */}
        <div className="w-full bg-slate-100/70 py-4 mb-8 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mx-auto flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600">1. Giỏ hàng</span>
              </div>
              <div className="h-[2px] flex-1 bg-slate-900 mx-3"></div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-600">2. Thanh toán QR</span>
              </div>
              <div className="h-[2px] flex-1 bg-amber-400 mx-3"></div>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full ${
                  (isNeedsReview || isPaymentError) ? 'bg-amber-500' : (isPending || isCreating) ? 'bg-amber-500' : (isFailed || isExpired || isPaymentCancelled || (!payment && isOrderCancelled)) ? 'bg-red-600' : 'bg-slate-700'
                } text-white flex items-center justify-center text-xs font-bold shadow-md`}>
                  {(isNeedsReview || isPaymentError) ? <AlertCircle className="w-4 h-4" /> : (isPending || isCreating) ? <Clock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <span className="text-xs font-extrabold text-slate-700">3. Trạng thái</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-white rounded-2xl shadow-md border border-slate-200/80 space-y-5">
          {/* Separate Order Lifecycle Notice when Order is CANCELLED */}
          {isOrderCancelled && (payment || isPaymentError) && (
            <div data-testid="order-lifecycle-notice" className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                <strong>Thông báo đơn hàng:</strong> Đơn hàng đã bị hủy.
              </span>
            </div>
          )}

          <div data-testid="payment-result-section" className="flex items-center gap-3">
            {isNeedsReview || isPaymentError ? (
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
            ) : (isPending || isCreating) ? (
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
            ) : (isFailed || isExpired || isPaymentCancelled || (!payment && isOrderCancelled)) ? (
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}

            <div>
              <span data-testid="payment-result-badge" className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadgeClass}`}>
                {statusBadgeLabel}
              </span>
              <h1 data-testid="payment-result-heading" className="text-xl font-bold text-slate-900 mt-1">
                {statusHeading}
              </h1>
              {orderId && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã đơn hàng: <strong className="font-semibold text-slate-700">#{order?.orderCode || orderId}</strong>
                </p>
              )}
            </div>
          </div>

          <p role="status" data-testid="payment-result-detail" className="text-sm text-slate-600 leading-relaxed">
            {error || statusDetailMessage}
          </p>

          {/* Preserved Order Details when Order has loaded */}
          {order && (
            <div data-testid="order-summary-preserved" className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="font-semibold text-slate-800 flex items-center justify-between">
                <span>Thông tin đơn hàng đã ghi nhận:</span>
                <span className="font-bold text-slate-900">{formatPrice(order.totalAmount || 0)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500">
                <span>Phương thức: <strong>{order.paymentMethod === 'PAYOS_VIETQR' ? 'VietQR (PayOS)' : (order.paymentMethod || 'Chưa xác định')}</strong></span>
                <span>Trạng thái đơn: <strong>{getOrderStatusLabel(order)}</strong></span>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isChecking}
              onClick={() => fetchOrderData(orderId, true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Kiểm tra lại</span>
                </>
              )}
            </button>

            {(isPending || isCreating || isFailed || isExpired) && !isOrderCancelled && order?.paymentMethod === 'PAYOS_VIETQR' && !isPaymentError && (
              <Link
                to={`/payment/qr/${orderId}`}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition"
              >
                <span>Quay lại trang thanh toán QR</span>
              </Link>
            )}

            <Link
              to="/my-orders"
              className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition"
            >
              <span>Xem danh sách đơn hàng</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = order?.items || [];

  const subtotal = order?.subtotal || items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const discountAmount = order?.discountAmount || 0;
  const shippingFee = order?.shippingFee !== undefined ? order.shippingFee : 0;
  const totalAmount = order?.totalAmount || Math.max(0, subtotal - discountAmount + shippingFee);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pt-6 pb-20">
      
      {/* Top Stepper Banner */}
      <div className="w-full bg-slate-100/70 py-4 mb-8 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between relative">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">1. Giỏ hàng</span>
            </div>
            <div className="h-[2px] flex-1 bg-slate-900 mx-3"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">2. Thanh toán QR</span>
            </div>
            <div className="h-[2px] flex-1 bg-red-600 mx-3"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-red-500/30">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-red-600">3. Hoàn tất</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center">
        
        {/* Separate Order Lifecycle Notice when Order is CANCELLED */}
        {isOrderCancelled && (
          <div data-testid="order-lifecycle-notice" className="w-full max-w-xl mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>
              <strong>Thông báo đơn hàng:</strong> Đơn hàng đã bị hủy.
            </span>
          </div>
        )}

        {/* Success Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-4 border border-slate-100">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <CheckCircle2 className="w-11 h-11" />
            </div>
          </div>
          <span data-testid="payment-result-badge" className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-3.5 py-1 rounded-full mb-2">
            Giao dịch đã xác thực
          </span>
          <h1 data-testid="payment-result-heading" className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Đặt hàng thành công!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Cảm ơn bạn <strong className="font-semibold text-slate-800">{order?.customerName || 'Chưa có thông tin'}</strong> đã tin tưởng lựa chọn <strong className="font-bold text-slate-900">HG Badminton</strong>. Vui lòng theo dõi tình trạng xử lý trong danh sách đơn hàng.
          </p>

          {/* 4 Summary Cards Grid */}
          <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã đơn hàng</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-extrabold text-slate-900">{displayOrderCode}</span>
                <button
                  type="button"
                  onClick={copyOrderId}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                  title="Sao chép mã đơn"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái thanh toán</span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" /> VietQR Tự động
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian tạo</span>
              <span className="text-xs font-semibold text-slate-800 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Hôm nay, 14:35
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dự kiến nhận hàng</span>
              <span className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-current" /> Hỏa tốc 2H (Hà Nội)
              </span>
            </div>
          </div>
        </div>

        {/* Big Order Detail Card */}
        <div className="w-full bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden mb-8">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-red-500" />
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight">Chi tiết đơn hàng {displayOrderCode}</h2>
                <p className="text-[11px] text-slate-400">Được phân phối chính thức bởi HG Badminton Center</p>
              </div>
            </div>
            <span data-testid="order-lifecycle-badge" className="text-[10px] font-bold uppercase bg-white/10 text-white px-2.5 py-1 rounded-md tracking-wider">
              {isOrderCancelled ? 'Đã hủy' : (order?.status === 'SHIPPING' ? 'Đang giao hàng' : (order?.status === 'COMPLETED' ? 'Hoàn thành' : 'Chuẩn bị hàng'))}
            </span>
          </div>

          {/* Customer & Technical Notes 2-Col Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60 border-b border-slate-100">
            
            {/* Delivery Info */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-800" /> Thông tin nhận hàng
              </span>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-1 h-full">
                <span className="text-sm font-bold text-slate-900">
                  {order?.customerName || 'Chưa có thông tin'} <span className="text-xs font-normal text-slate-500">| {order?.shippingPhone || 'Chưa có thông tin'}</span>
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {order?.shippingAddress || 'Chưa có thông tin'}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-red-600 text-xs font-semibold">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Lịch giao hàng sẽ được xác nhận sau.</span>
                </div>
              </div>
            </div>

            {/* Stringing & Notes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-800" /> Yêu cầu kỹ thuật & Ghi chú
              </span>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-full gap-2">
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  “{order?.note || 'Chưa có thông tin'}”
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-slate-700 font-medium">
                    <Wrench className="w-3.5 h-3.5 text-red-500" /> Theo dõi tiến độ trong đơn hàng
                  </span>
                  <span className="font-bold text-slate-900">Chưa có thông tin kỹ thuật viên</span>
                </div>
              </div>
            </div>

          </div>

          {/* Products List */}
          <div className="p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center justify-between">
              <span>Danh sách sản phẩm ({items.length} mặt hàng)</span>
              <span className="text-xs font-normal text-slate-400">Cam kết 100% Chính hãng phân phối</span>
            </h3>

            <div className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50 rounded-xl gap-3 border border-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-white shrink-0 overflow-hidden shadow-sm flex items-center justify-center p-1 border border-slate-200/60">
                      <img
                        src={item.imageUrl || item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                        Chính hãng phân phối
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                        {item.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-xs text-slate-500 mt-1">
                        {item.selectedWeight && (
                          <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {item.selectedWeight}
                          </span>
                        )}
                        {item.selectedSize && (
                          <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                            Size {item.selectedSize}
                          </span>
                        )}
                        {item.stringingService && (
                          <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {item.stringingService}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <Gift className="w-3 h-3 text-red-500" /> Tặng 01 Bao vợt nhung + 02 Quấn cán Yonex AC102EX
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:self-center shrink-0">
                    <span className="text-xs text-slate-400 block">Số lượng: 0{item.quantity || 1}</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatPrice((item.price || 0) * (item.quantity || 1))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown Bottom Bar */}
          <div className="bg-slate-50 p-6 border-t border-slate-100">
            <div className="max-w-md ml-auto flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Tạm tính ({items.length} sản phẩm):</span>
                <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-red-600 font-bold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Voucher HG (HG100K):
                </span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Phí vận chuyển hỏa tốc:</span>
                <span className="font-bold text-emerald-600">0₫ (Miễn phí HG VIP)</span>
              </div>
              <div className="w-full h-px bg-slate-200 my-1"></div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-sm font-black text-slate-900 block">Tổng thanh toán:</span>
                  <span className="text-[11px] text-red-600 font-semibold">Máy chủ đã ghi nhận thanh toán</span>
                </div>
                <span className="text-2xl font-black text-red-600 tracking-tight">
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 2 Main Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xl mb-10">
          <Link
            to="/my-orders"
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3.5 px-6 rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg shadow-red-500/25 transition-all"
          >
            <FileCheck className="w-4 h-4" />
            <span>Xem đơn hàng của tôi</span>
          </Link>
          <Link
            to="/products"
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 py-3.5 px-6 rounded-xl text-sm font-bold uppercase tracking-wider border border-slate-200 shadow-sm transition-all"
          >
            <Store className="w-4 h-4" />
            <span>Tiếp tục mua sắm</span>
          </Link>
        </div>

        {/* Advisory & Customer Service */}
        <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Cần thay đổi thông số căng cước hoặc địa chỉ giao?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Liên hệ đội ngũ thợ căng chuyên nghiệp trước khi kiện hàng xuất kho.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="tel:19006886"
                className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Hotline 1900 6886
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); alert('Đang kết nối tới Zalo CSKH HG Badminton...'); }}
                className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Zalo CSKH
              </a>
            </div>
          </div>

          {/* 3 Guarantee Badges */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <ShieldCheck className="w-7 h-7 text-red-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">100% Chính Hãng</span>
                <span className="text-[11px] text-slate-500">Bồi hoàn gấp 10 lần nếu phát hiện hàng giả</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <CheckCircle2 className="w-7 h-7 text-red-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Đổi Size Trong 7 Ngày</span>
                <span className="text-[11px] text-slate-500">Hỗ trợ đổi size giày miễn phí tận nơi</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Award className="w-7 h-7 text-red-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Bảo Hành Điện Tử</span>
                <span className="text-[11px] text-slate-500">Tự động kích hoạt theo số điện thoại nhận hàng</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccessPage;
