/**
 * Danh sách kịch bản mô phỏng PayOS đã được phê duyệt trong API_CHANGES.md (FIX-058)
 */
export const MOCK_SCENARIOS = [
  {
    category: 'Thành công (Settlement)',
    items: [
      {
        scenario: 'PAYMENT_PAID_WEBHOOK',
        label: 'Webhook thanh toán thành công',
        desc: 'Gửi webhook PayOS thanh toán thành công với số tiền đầy đủ',
        variant: 'emerald',
      },
      {
        scenario: 'PAYMENT_PAID_QUERY',
        label: 'Query thanh toán thành công',
        desc: 'Cập nhật trạng thái provider sang PAID cho reconcile/query tiêu thụ',
        variant: 'emerald',
      },
    ],
  },
  {
    category: 'Thất bại & Hủy',
    items: [
      {
        scenario: 'PAYMENT_FAILED',
        label: 'Mô phỏng thanh toán thất bại',
        desc: 'Chuyển provider sang FAILED, không ghi nhận tiền',
        variant: 'rose',
      },
      {
        scenario: 'PAYMENT_CANCELLED',
        label: 'Mô phỏng hủy từ cổng',
        desc: 'Ghi nhận giao dịch đã bị hủy trên cổng PayOS',
        variant: 'slate',
      },
      {
        scenario: 'PAYMENT_EXPIRED',
        label: 'Mô phỏng hết hạn mã thanh toán',
        desc: 'Ghi nhận giao dịch đã hết hạn trên cổng PayOS',
        variant: 'amber',
      },
    ],
  },
  {
    category: 'Đối soát & Bất thường (Review)',
    items: [
      {
        scenario: 'PARTIAL_PAYMENT',
        label: 'Thanh toán thiếu tiền (Underpaid)',
        desc: 'Giao dịch thiếu tiền -> chuyển sang diện Cần đối soát (NEEDS_REVIEW)',
        variant: 'amber',
      },
      {
        scenario: 'NON_SUCCESS_WEBHOOK',
        label: 'Webhook mã không thành công',
        desc: 'Gửi webhook signed với mã trạng thái không thành công',
        variant: 'amber',
      },
      {
        scenario: 'REPLAY_WEBHOOK',
        label: 'Webhook lặp lại (Duplicate)',
        desc: 'Gửi lại webhook đã từng xử lý để kiểm tra tính duy nhất (idempotency)',
        variant: 'blue',
      },
      {
        scenario: 'CONFLICTING_WEBHOOK',
        label: 'Webhook xung đột dữ liệu',
        desc: 'Gửi webhook có số tiền hoặc thông tin xung đột',
        variant: 'amber',
      },
      {
        scenario: 'LATE_PAYMENT_WEBHOOK',
        label: 'Thanh toán đến muộn (Late webhook)',
        desc: 'Mô phỏng nhận tiền sau khi đơn đã hủy hoặc đã đổi sang COD',
        variant: 'amber',
      },
    ],
  },
  {
    category: 'Khôi phục & Xóa lỗi',
    items: [
      {
        scenario: 'CLEAR_FAULTS',
        label: 'Xóa lỗi mô phỏng (Clear faults)',
        desc: 'Xóa toàn bộ fault injection một lần chưa tiêu thụ',
        variant: 'slate',
      },
    ],
  },
];
