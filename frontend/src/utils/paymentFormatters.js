import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

/**
 * Format deterministic review reasons from backend to friendly Vietnamese labels.
 * Always preserves raw reason string as safe fallback.
 */
export const formatReviewReason = (reason) => {
  if (!reason) return '';
  const map = {
    AMOUNT_MISMATCH: 'Sai lệch số tiền thanh toán',
    CURRENCY_MISMATCH: 'Sai lệch loại tiền tệ',
    IDENTITY_MISMATCH: 'Không khớp thông tin đơn hàng',
    LATE_PAYMENT_CANCELLED_ORDER: 'Thanh toán muộn cho đơn đã hủy',
    LATE_PAYMENT_EXPIRED: 'Thanh toán sau khi liên kết hết hạn',
    EVENT_IDENTITY_CONFLICT: 'Xung đột định danh giao dịch',
    PAYMENT_NOT_CONFIRMED: 'Chưa xác nhận từ ngân hàng',
  };
  return map[reason] || `Yêu cầu kiểm tra: ${reason}`;
};

/**
 * Get badge styling and icon for admin payment ledger statuses.
 */
export const getPaymentStatusBadge = (status) => {
  switch (status) {
    case 'PAID':
      return {
        label: 'Đã thanh toán',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
      };
    case 'NEEDS_REVIEW':
      return {
        label: 'Cần đối soát',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: AlertTriangle,
      };
    case 'PENDING':
      return {
        label: 'Chờ thanh toán',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Clock,
      };
    case 'CREATING':
      return {
        label: 'Đang tạo liên kết',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: Clock,
      };
    case 'FAILED':
      return {
        label: 'Thất bại',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: XCircle,
      };
    case 'EXPIRED':
      return {
        label: 'Hết hạn',
        bg: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: XCircle,
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        bg: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: XCircle,
      };
    default:
      return {
        label: status || 'Chưa xác định',
        bg: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: AlertCircle,
      };
  }
};

/**
 * Get payment status metadata for order detail view.
 * Separates order fulfillment status from payment status.
 */
export const getPaymentStatusInfo = (payment, order) => {
  if (!payment) {
    if (order?.paymentMethod === 'COD') {
      return {
        label: 'COD - Thanh toán khi nhận hàng',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: Clock,
      };
    }
    return {
      label: 'Chưa có bản ghi thanh toán',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: Clock,
    };
  }

  switch (payment.status) {
    case 'PAID':
      return {
        label: 'Thanh toán: Đã thanh toán',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: CheckCircle2,
      };
    case 'NEEDS_REVIEW':
      return {
        label: 'Thanh toán: Cần đối soát',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: AlertTriangle,
      };
    case 'PENDING':
      return {
        label: 'Thanh toán: Chờ thanh toán',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: Clock,
      };
    case 'CREATING':
      return {
        label: 'Thanh toán: Đang tạo liên kết',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        icon: Clock,
      };
    case 'FAILED':
      return {
        label: 'Thanh toán: Thất bại',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        icon: XCircle,
      };
    case 'EXPIRED':
      return {
        label: 'Thanh toán: Hết hạn',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: XCircle,
      };
    case 'CANCELLED':
      return {
        label: 'Thanh toán: Đã hủy',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: XCircle,
      };
    default:
      return {
        label: `Thanh toán: ${payment.status || 'Chưa xác định'}`,
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: Clock,
      };
  }
};
