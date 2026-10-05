import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi.js';
import {
  getOrCreateReconciliationKey,
  clearStoredReconciliationIntent,
  getStoredReconciliationIntent,
} from '../utils/idempotency.js';
import {
  formatReviewReason,
  getPaymentStatusBadge,
} from '../utils/paymentFormatters.js';

export { formatReviewReason, getPaymentStatusBadge };
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  ShieldCheck,
  Building,
  ArrowUpRight,
  Copy,
  Check,
  AlertTriangle,
  X,
  FileCheck
} from 'lucide-react';

const AdminPaymentsPage = () => {
  const [dataError, setDataError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isVerifying, setIsVerifying] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [copiedId, setCopiedId] = useState(null);

  // Reconciliation modal & submission state
  const [reconcileModalTarget, setReconcileModalTarget] = useState(null);
  const [reconcileReason, setReconcileReason] = useState('');
  const [reconcileError, setReconcileError] = useState('');
  const [submittingIds, setSubmittingIds] = useState(new Set());

  // Synchronous in-flight guard for concurrent/double-click prevention
  const reconcileInFlightRef = useRef(new Set());
  // Stale request guard ref
  const activeRequestIdRef = useRef(0);
  // Unmount safety guard ref
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p || 0);

  const fetchPayments = async () => {
    const currentRequestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    try {
      if (adminApi?.getAllPayments) {
        const res = await adminApi.getAllPayments();
        // If user initiated a new request, discard stale response
        if (currentRequestId !== activeRequestIdRef.current) return;

        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.content)
          ? res.content
          : Array.isArray(res?.data)
          ? res.data
          : [];

        if (Array.isArray(list)) {
          const mapped = list.map((p) => ({
            id: p.id,
            orderId: p.orderId,
            orderCode: p.orderCode != null ? `#HG-${p.orderCode}` : p.orderId ? `#HG-${p.orderId}` : '—',
            provider: p.provider || 'PAYOS',
            amount: p.amount || 0,
            currency: p.currency || 'VND',
            status: p.status,
            reference: p.reference || null,
            paidAt: p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : null,
            createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '—',
            reviewReason: p.reviewReason || null,
            customer: p.customerName || 'Khách hàng HG',
            paymentMethod: p.paymentMethod || 'PAYOS_VIETQR',
            methodLabel: p.paymentMethod?.includes('PAYOS') ? 'VietQR Pro (PayOS)' : p.paymentMethod === 'COD' ? 'COD Đồng kiểm' : 'Chuyển khoản',
          }));
          setTransactions(mapped);
          setHasLoaded(true);
          setDataError('');
        }
      }
    } catch (err) {
      if (currentRequestId === activeRequestIdRef.current) {
        setDataError(err.response?.data?.message || 'Không thể tải dữ liệu giao dịch từ máy chủ. Vui lòng thử lại.');
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerifyWebhook = () => {
    setToastType('info');
    setToastMessage('Chưa có dữ liệu kiểm tra webhook. Không thể kết luận chữ ký hay giao dịch hợp lệ.');
  };

  const openReconcileModal = (payment) => {
    const stored = getStoredReconciliationIntent(payment.id);
    setReconcileModalTarget(payment);
    setReconcileReason(stored?.reason || '');
    setReconcileError('');
  };

  const closeReconcileModal = () => {
    setReconcileModalTarget(null);
    setReconcileReason('');
    setReconcileError('');
  };

  const handleConfirmReconcile = async () => {
    if (!reconcileModalTarget) return;
    const paymentId = reconcileModalTarget.id;
    const trimmedReason = reconcileReason.trim();

    if (!trimmedReason) {
      setReconcileError('Vui lòng nhập lý do đối soát.');
      return;
    }

    // BUG FE-1 FIX: Synchronous in-flight guard prevents rapid double-click race condition
    if (reconcileInFlightRef.current.has(paymentId)) return;
    reconcileInFlightRef.current.add(paymentId);

    // Asynchronous state for UI disable/spinner
    setSubmittingIds((prev) => new Set(prev).add(paymentId));
    setReconcileError('');

    try {
      const idempotencyKey = getOrCreateReconciliationKey(paymentId, trimmedReason);
      const res = await adminApi.reconcilePayment(paymentId, { reason: trimmedReason }, idempotencyKey);

      // Check authoritative response body
      const resBody = res?.data ?? res;
      // Check HTTP status from attached property or body semantics
      const httpStatus =
        resBody?._httpStatus ||
        res?._httpStatus ||
        (resBody?.status === 'PENDING' && resBody?.reviewReason === 'PAYMENT_NOT_CONFIRMED' ? 202 : 200);

      // BUG FE-2 & FE-3 FIX: Property-existence check ensures explicit null replaces previous value.
      // Never use truthiness fallback (|| or ??) when backend explicitly returns null!
      const hasField = (obj, field) => obj != null && Object.prototype.hasOwnProperty.call(obj, field);

      const returnedStatus = hasField(resBody, 'status') ? resBody.status : reconcileModalTarget.status;
      const returnedReference = hasField(resBody, 'reference') ? resBody.reference : reconcileModalTarget.reference;
      const returnedPaidAt = hasField(resBody, 'paidAt')
        ? (resBody.paidAt ? new Date(resBody.paidAt).toLocaleString('vi-VN') : null)
        : reconcileModalTarget.paidAt;
      const returnedReviewReason = hasField(resBody, 'reviewReason')
        ? resBody.reviewReason
        : reconcileModalTarget.reviewReason;

      // Update local transaction row with authoritative backend body data (both 200 and 202)
      if (isMountedRef.current) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === paymentId
              ? {
                  ...t,
                  status: returnedStatus,
                  reference: returnedReference,
                  paidAt: returnedPaidAt,
                  reviewReason: returnedReviewReason,
                }
              : t
          )
        );
      }

      if (httpStatus === 202) {
        // BUG FE-3 FIX: 202 Accepted means waiting/unresolved evidence, but body is authoritative.
        // Update table data with new reviewReason / status, retain intent & key for retry, no auto-POST loop.
        if (isMountedRef.current) {
          setToastType('warning');
          setToastMessage('Đối soát đang chờ xử lý: Bằng chứng từ cổng thanh toán chưa dứt khoát. Vui lòng thử lại sau.');
          closeReconcileModal();
        }
      } else {
        // 200 OK: Backend reached a definitive reconciliation outcome.
        // Clear stored idempotency intent upon definitive completed outcome
        clearStoredReconciliationIntent(paymentId);

        if (isMountedRef.current) {
          setToastType('success');
          if (returnedStatus === 'PAID') {
            setToastMessage(`Đối soát thành công giao dịch #${paymentId}: Đã ghi nhận thanh toán.`);
          } else {
            setToastMessage(`Đối soát hoàn tất giao dịch #${paymentId}: Trạng thái hiện tại là "${returnedStatus}" (${formatReviewReason(returnedReviewReason)}).`);
          }
          closeReconcileModal();
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const status = err.response?.status;
      if (status === 409) {
        setReconcileError(err.response?.data?.message || 'Xung đột khi đối soát giao dịch hoặc khóa đối soát đã được sử dụng.');
      } else if (status === 502 || status === 503 || status === 504 || err.code === 'ECONNABORTED') {
        setReconcileError('Cổng thanh toán tạm thời không phản hồi. Vui lòng thử lại sau (khóa đối soát và lý do đã được lưu giữ an toàn).');
      } else {
        setReconcileError(err.response?.data?.message || 'Có lỗi xảy ra khi đối soát giao dịch. Vui lòng kiểm tra lại.');
      }
    } finally {
      // Synchronous authority cleanup
      reconcileInFlightRef.current.delete(paymentId);
      if (isMountedRef.current) {
        setSubmittingIds((prev) => {
          const next = new Set(prev);
          next.delete(paymentId);
          return next;
        });
      }
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      String(t.id).toLowerCase().includes(q) ||
      t.orderCode.toLowerCase().includes(q) ||
      t.customer.toLowerCase().includes(q) ||
      (t.reference && t.reference.toLowerCase().includes(q)) ||
      (t.reviewReason && t.reviewReason.toLowerCase().includes(q));

    const matchesMethod =
      selectedMethod === 'ALL'
        ? true
        : selectedMethod === 'VIETQR'
        ? t.paymentMethod?.includes('PAYOS')
        : selectedMethod === 'COD'
        ? t.paymentMethod === 'COD'
        : !t.paymentMethod?.includes('PAYOS') && t.paymentMethod !== 'COD';

    const matchesStatus =
      selectedStatus === 'ALL'
        ? true
        : selectedStatus === 'PAID'
        ? t.status === 'PAID'
        : selectedStatus === 'NEEDS_REVIEW'
        ? t.status === 'NEEDS_REVIEW'
        : selectedStatus === 'PENDING'
        ? ['PENDING', 'CREATING'].includes(t.status)
        : ['FAILED', 'EXPIRED', 'CANCELLED'].includes(t.status);

    return matchesSearch && matchesMethod && matchesStatus;
  });

  return (
    <AdminLayout title="Giao dịch" subtitle="Quản lý giao dịch & Thanh toán PayOS VietQR">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl mb-4 font-bold text-xs">{dataError}</p>}
      <div className="flex flex-col gap-6 min-w-0 w-full max-w-full">
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 min-w-0">
          <div className="flex items-start xl:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words min-w-0">
                  Quản lý giao dịch PayOS VietQR
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black shrink-0">
                  Hệ thống đối soát thanh toán
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu sổ cái giao dịch và trạng thái thanh toán đối soát trực tiếp từ cổng PayOS.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleVerifyWebhook}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Kiểm tra Webhook Log</span>
            </button>
            <button
              type="button"
              onClick={() => alert('Xuất sổ đối soát chưa được tích hợp, chưa tạo tệp.')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2e] hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất sổ đối soát</span>
            </button>
          </div>
        </div>

        {toastMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
              toastType === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toastType === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0 w-full max-w-full">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng giao dịch</span>
            <span className="text-2xl font-black text-slate-900 mt-1">
              {hasLoaded && !dataError ? transactions.length : '—'}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Cập nhật từ sổ cái
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cần đối soát</span>
            <span className="text-2xl font-black text-amber-600 mt-1">
              {hasLoaded && !dataError ? transactions.filter((t) => t.status === 'NEEDS_REVIEW').length : '—'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-2">Giao dịch cần kiểm tra thủ công</span>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đã thanh toán</span>
            <span className="text-2xl font-black text-emerald-600 mt-1">
              {hasLoaded && !dataError ? transactions.filter((t) => t.status === 'PAID').length : '—'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-2">Khớp số tiền & nội dung đơn</span>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giao dịch hủy / Quá hạn</span>
            <span className="text-2xl font-black text-slate-400 mt-1">
              {hasLoaded && !dataError ? transactions.filter((t) => ['FAILED', 'EXPIRED', 'CANCELLED'].includes(t.status)).length : '—'}
            </span>
            <span className="text-[11px] text-slate-400 mt-2">Bao gồm PayOS hết hạn và hủy</span>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 min-w-0 w-full max-w-full">
          <div className="relative w-full xl:w-auto xl:flex-1 max-w-md min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã GD, mã đơn (#HG-...), Ref ngân hàng..."
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="VIETQR">VietQR Pro (PayOS)</option>
              <option value="COD">COD Tiền mặt</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PAID">Đã thanh toán (PAID)</option>
              <option value="NEEDS_REVIEW">Cần đối soát (NEEDS_REVIEW)</option>
              <option value="PENDING">Chờ thanh toán (PENDING)</option>
              <option value="FAILED">Hết hạn / Đã hủy (FAILED)</option>
            </select>
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col min-w-0 w-full max-w-full">
          <div className="w-full max-w-full overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Mã giao dịch & Đơn hàng</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Khách hàng & Cổng</th>
                  <th className="py-3.5 px-4">Số tiền quyết toán</th>
                  <th className="py-3.5 px-4">Phương thức</th>
                  <th className="py-3.5 px-6 text-right">Trạng thái & Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Đang tải dữ liệu giao dịch...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Không tìm thấy giao dịch nào.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => {
                    const badge = getPaymentStatusBadge(t.status);
                    const StatusIcon = badge.icon;
                    const isRowReconciling = submittingIds.has(t.id);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Cột 1: Mã GD & Đơn */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                              <span>#{t.id}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(String(t.id))}
                                className="text-slate-400 hover:text-slate-700"
                                title="Sao chép ID giao dịch"
                              >
                                {copiedId === String(t.id) ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <span className="text-[11px] text-blue-600 font-bold">Đơn hàng {t.orderCode}</span>
                          </div>
                        </td>

                        {/* Cột 2: Thời gian */}
                        <td className="py-4 px-4 align-top max-w-[220px]">
                          <span className="text-slate-600 block">{t.paidAt ? `Thanh toán: ${t.paidAt}` : `Tạo lúc: ${t.createdAt}`}</span>
                          <span className="text-[11px] text-slate-400 font-mono break-all whitespace-normal [overflow-wrap:anywhere] min-w-0 block">
                            Ref: {t.reference ? t.reference : '—'}
                          </span>
                        </td>

                        {/* Cột 3: Khách hàng & Cổng */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-bold text-slate-900 block">{t.customer}</span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            {t.provider}
                          </span>
                        </td>

                        {/* Cột 4: Số tiền */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-black text-secondary text-sm">{formatPrice(t.amount)}</span>
                        </td>

                        {/* Cột 5: Phương thức */}
                        <td className="py-4 px-4 align-top">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {t.methodLabel}
                          </span>
                        </td>

                        {/* Cột 6: Trạng thái & Thao tác */}
                        <td className="py-4 px-6 align-top text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs ${badge.bg}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{badge.label}</span>
                            </span>

                            {/* Lý do đối soát nếu có */}
                            {t.reviewReason && (
                              <span className="text-[11px] text-amber-700 font-medium max-w-[220px] text-right truncate" title={t.reviewReason}>
                                {formatReviewReason(t.reviewReason)}
                              </span>
                            )}

                            {/* Nút đối soát cho admin */}
                            {t.status === 'NEEDS_REVIEW' && (
                              <button
                                type="button"
                                disabled={isRowReconciling}
                                onClick={() => openReconcileModal(t)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  isRowReconciling
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 active:scale-95 cursor-pointer'
                                }`}
                              >
                                {isRowReconciling ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Đang xử lý...</span>
                                  </>
                                ) : (
                                  <>
                                    <FileCheck className="w-3 h-3 text-amber-800" />
                                    <span>Đối soát</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECONCILE MODAL */}
      {reconcileModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Đối soát giao dịch #{reconcileModalTarget.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReconcileModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-bold text-slate-900">{reconcileModalTarget.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền quyết toán:</span>
                <span className="font-bold text-secondary">{formatPrice(reconcileModalTarget.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái hiện tại:</span>
                <span className="font-bold text-amber-700">Cần đối soát</span>
              </div>
              {reconcileModalTarget.reviewReason && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Lý do kiểm tra:</span>
                  <span className="font-medium text-amber-800">{formatReviewReason(reconcileModalTarget.reviewReason)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reconcile-reason-input" className="block text-xs font-bold text-slate-700">
                Lý do đối soát <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reconcile-reason-input"
                rows={3}
                value={reconcileReason}
                onChange={(e) => setReconcileReason(e.target.value)}
                placeholder="Nhập lý do đối soát chi tiết (ví dụ: Đã đối chiếu sao kê ngân hàng lúc 14:00, số tiền khớp...)"
                className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs p-3 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner resize-none"
              />
            </div>

            {reconcileError && (
              <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {reconcileError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeReconcileModal}
                disabled={submittingIds.has(reconcileModalTarget.id)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingIds.has(reconcileModalTarget.id)}
                onClick={handleConfirmReconcile}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submittingIds.has(reconcileModalTarget.id) ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <span>Xác nhận đối soát</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPaymentsPage;
