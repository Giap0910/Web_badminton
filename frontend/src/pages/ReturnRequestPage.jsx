import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
import { returnApi } from '../api/returnApi';
import { orderApi } from '../api/orderApi';
import {
  RotateCcw,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Image,
  FileText,
  Package,
  Calendar,
  Check
} from 'lucide-react';

const ReturnRequestPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get('orderId');

  const [returnRequests, setReturnRequests] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [orderId, setOrderId] = useState(preselectedOrderId || '');
  const [reason, setReason] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    try {
      const [returnsRes, ordersRes] = await Promise.all([
        returnApi.getMyReturns(),
        orderApi.getMyOrders(),
      ]);
      const returnsList = Array.isArray(returnsRes) ? returnsRes : returnsRes?.data || [];
      setReturnRequests(returnsList);
      // Only PAID or eligible orders can be returned
      const ordersList = Array.isArray(ordersRes) ? ordersRes : ordersRes?.data || [];
      const eligible = ordersList.filter(
        (o) => o.status === 'PAID' || o.status === 'CONFIRMED' || o.status === 'SHIPPED' || o.status === 'DELIVERED'
      );
      setPaidOrders(eligible);
      if (preselectedOrderId) {
        setOrderId(preselectedOrderId);
      } else if (eligible.length > 0 && !orderId) {
        setOrderId(eligible[0].id.toString());
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin bảo hành:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [preselectedOrderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderId || !reason.trim()) {
      setErrorMsg('Vui lòng chọn đơn hàng và ghi rõ lý do yêu cầu đổi trả/bảo hành.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await returnApi.createReturnRequest({
        orderId: Number(orderId),
        reason: reason.trim(),
        imageUrl: imageUrl.trim() || null,
      });
      setSuccessMsg('Gửi yêu cầu đổi trả / bảo hành thành công! Kỹ thuật viên sẽ liên hệ trong 24h.');
      setReason('');
      setImageUrl('');
      await fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể gửi yêu cầu lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Đang chờ xét duyệt</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-royal border border-blue-200 font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-royal" />
            <span>Đã chấp thuận (Gửi hàng về shop)</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Đã hoàn tất đổi mới</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px] flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Từ chối yêu cầu</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
            {status}
          </span>
        );
    }
  };

  return (
    <UserLayout
      title="Đổi Trả & Bảo Hành"
      subtitle="Chính sách bảo hành 1 đổi 1 và bảo hành đứt cước 24h theo tiêu chuẩn BWF Approved"
    >
      <div className="space-y-8">
        {/* Assurance Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-royal flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-bold text-sm text-slate-900 block">Cam kết bảo hành chính hãng Apex Badminton</span>
              Đổi mới 1-1 trong 7 ngày nếu lỗi từ nhà sản xuất. Bảo hành đứt cước 24h đối với vợt căng tại xưởng.
            </div>
          </div>
          <a
            href="tel:19006886"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-secondary font-bold text-xs shrink-0 transition-colors"
          >
            Hotline Kỹ Thuật: 1900 6886
          </a>
        </div>

        {/* Form: Create Return Request */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Gửi yêu cầu đổi trả / bảo hành mới</h2>
              <p className="text-xs text-slate-500">Điền thông tin và mô tả chi tiết tình trạng sản phẩm để được hỗ trợ nhanh nhất</p>
            </div>
          </div>

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Select Order */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Chọn đơn hàng cần bảo hành / đổi trả *</label>
              {paidOrders.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 text-slate-500 border border-slate-200">
                  Bạn chưa có đơn hàng nào đã thanh toán đủ điều kiện đổi trả.
                </div>
              ) : (
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary font-medium"
                >
                  {paidOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      Đơn hàng #{o.id} • Ngày đặt: {new Date(o.createdAt).toLocaleDateString('vi-VN')} • Tổng tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.totalAmount)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                Mô tả chi tiết lý do & hiện trạng sản phẩm *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Vợt bị rạn nứt góc 11h khi đánh cầu bình thường, đứt cước ngay sau trận đầu tiên, đế giày bị hở keo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary font-medium resize-none"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Link hình ảnh / video minh chứng (tùy chọn)</span>
                <span className="text-[10px] text-slate-400">Google Drive / Imgur / URL ảnh</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/anh-loi-vot.jpg"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary font-medium"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || paidOrders.length === 0}
                className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-secondary/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <span>Gửi Yêu Cầu Hỗ Trợ</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* List of Sent Requests */}
        <div className="space-y-4">
          <h3 className="font-black text-base text-slate-900">
            Lịch sử yêu cầu đổi trả & bảo hành ({returnRequests.length})
          </h3>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-secondary mx-auto" />
            </div>
          ) : returnRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500">
              Bạn chưa có yêu cầu đổi trả hoặc bảo hành nào.
            </div>
          ) : (
            <div className="space-y-3">
              {returnRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-xs text-slate-900">Yêu cầu #{req.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <Link
                        to={`/orders/${req.orderId}`}
                        className="text-xs font-bold text-royal hover:underline"
                      >
                        Đơn hàng #{req.orderId}
                      </Link>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl">
                    <span className="font-bold text-slate-900 block mb-0.5">Lý do của bạn:</span>
                    {req.reason}
                  </div>

                  {req.imageUrl && (
                    <div className="text-xs">
                      <a
                        href={req.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-royal hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Image className="w-3.5 h-3.5" /> Xem ảnh minh chứng lỗi
                      </a>
                    </div>
                  )}

                  {req.adminNote && (
                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-800 space-y-0.5">
                      <span className="font-bold text-royal flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Phản hồi từ Apex Badminton:
                      </span>
                      <p className="italic">“{req.adminNote}”</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default ReturnRequestPage;
