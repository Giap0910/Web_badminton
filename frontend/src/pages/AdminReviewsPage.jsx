import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  Star,
  ShieldCheck,
  RotateCcw,
  Search,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  CornerDownRight,
  Send,
  Calendar,
  X,
  Award,
  Check
} from 'lucide-react';



const AdminReviewsPage = () => {
  const [dataError, setDataError] = useState('');
  const [mainTab, setMainTab] = useState('REVIEWS'); // 'REVIEWS' | 'RMAS'
  const [reviews, setReviews] = useState([]);
  const [rmas, setRmas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Reply Modal State
  const [replyModalReview, setReplyModalReview] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const fetchReviewsAndRmas = async () => {
    try {
      if (adminApi?.getAllReviews) {
        const res = await adminApi.getAllReviews();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (Array.isArray(list)) {
          const mappedReviews = list.map((r, idx) => ({
            id: r.id || idx + 1,
            productName: r.productName || 'Vợt Cầu Lông Apex',
            productBrand: 'Apex Series',
            productImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
            customerName: r.userFullName || r.userName || 'Khách hàng ẩn danh',
            customerPhone: '',
            customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            purchasedSpec: '',
            rating: r.rating || 5,
            comment: r.comment || '',
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            isVisible: true,
            likes: 0,
            officialReply: null
          }));
          setReviews(mappedReviews);
        }
      }

      if (adminApi?.getAllReturns) {
        const res = await adminApi.getAllReturns();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (Array.isArray(list)) {
          const mappedRmas = list.map((rma, idx) => ({
            id: rma.id || idx + 1,
            rmaCode: `RMA-${1000 + (rma.id || idx)}`,
            orderCode: `#APX-${rma.orderId || 89000}`,
            createdAt: rma.createdAt ? new Date(rma.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
            customerName: rma.customerName || 'Khách hàng Apex',
            customerPhone: rma.customerPhone || '0988 123 456',
            productName: rma.productName || 'Sản phẩm bảo hành',
            serial: `SN-${rma.id || 100}`,
            reasonCategory: rma.reason || 'Bảo hành khung vợt',
            reasonDetail: rma.reason || 'Yêu cầu kiểm tra kỹ thuật',
            timelineStep: rma.status === 'COMPLETED' ? 4 : rma.status === 'APPROVED' ? 2 : 1,
            status: rma.status || 'PENDING',
            statusLabel: rma.status === 'COMPLETED' ? 'Đã hoàn tất' : rma.status === 'APPROVED' ? 'Đã tiếp nhận xưởng' : 'Chờ duyệt'
          }));
          setRmas(mappedRmas);
        }
      }
    } catch (err) {
      setDataError(err.response?.data?.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    fetchReviewsAndRmas();
  }, []);

  const handleToggleVisibility = () => {
    setToastMessage('Chức năng ẩn/hiện đánh giá chưa được kết nối máy chủ.');
  };

  const handleOpenReply = (review) => {
    setReplyModalReview(review);
    setReplyContent(review.officialReply || '');
  };

  const handleSaveReply = (e) => {
    e.preventDefault();
    setToastMessage('Chức năng phản hồi chưa được kết nối máy chủ. Chưa gửi phản hồi.');
  };

  const handleUpdateRMAStatus = async (id, newStep, newStatus, newLabel) => {
    try {
      if (adminApi?.updateReturnStatus) {
        await adminApi.updateReturnStatus(id, newStatus);
      }
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Không thể cập nhật yêu cầu đổi trả.');
      return;
    }

    setRmas((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              timelineStep: newStep,
              status: newStatus,
              statusLabel: newLabel
            }
          : item
      )
    );
    setToastMessage(`Đã cập nhật tiến độ RMA sang: "${newLabel}"`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const filteredReviews = reviews.filter(
    (r) =>
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRmas = rmas.filter(
    (item) =>
      item.rmaCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Đánh giá & RMA" subtitle="Quản lý đánh giá & Yêu cầu đổi trả bảo hành">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
      <div className="flex flex-col gap-6">
        {/* HEADER & MAIN TAB SWITCHER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Đánh giá & Bảo hành RMA
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                  4.9★ Apex Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chăm sóc khách hàng, phản hồi đánh giá và quy trình bảo hành nứt khung vợt 90 ngày
              </p>
            </div>
          </div>

          {/* 2 MAIN TABS */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setMainTab('REVIEWS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'REVIEWS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đánh giá sản phẩm ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setMainTab('RMAS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'RMAS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Yêu cầu bảo hành RMA ({rmas.length})
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* SEARCH ROW */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mainTab === 'REVIEWS'
                  ? 'Tìm theo khách hàng, tên vợt, nhận xét...'
                  : 'Tìm theo mã RMA, số serial, tên khách...'
              }
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* TAB 1: PRODUCT REVIEWS */}
        {mainTab === 'REVIEWS' && (
          <div className="flex flex-col gap-4">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{rev.customerName}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-500">{rev.customerPhone}</span>
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Đã mua hàng
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 font-bold mt-1">{rev.productName}</p>
                    <span className="text-[11px] text-slate-400 font-medium">{rev.spec}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{rev.createdAt}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                {/* OFFICIAL REPLY */}
                {rev.officialReply ? (
                  <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-secondary flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-secondary" />
                        Phản hồi từ Ban Quản Trị Apex Pro:
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed mt-0.5">{rev.officialReply}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenReply(rev)}
                    className="self-start inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Trả lời đánh giá này với tư cách Quản trị viên</span>
                  </button>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Trạng thái: <strong className={rev.isVisible ? 'text-emerald-600' : 'text-slate-400'}>{rev.isVisible ? 'Đang hiển thị công khai' : 'Đã ẩn'}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    {rev.officialReply && (
                      <button
                        type="button"
                        onClick={() => handleOpenReply(rev)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-bold"
                      >
                        Sửa phản hồi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(rev.id)}
                      className={`text-xs font-bold ${
                        rev.isVisible ? 'text-slate-500 hover:text-secondary' : 'text-blue-600 hover:underline'
                      }`}
                    >
                      {rev.isVisible ? 'Ẩn đánh giá' : 'Hiển thị lại'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: WARRANTY & RETURN RMA */}
        {mainTab === 'RMAS' && (
          <div className="flex flex-col gap-4">
            {filteredRmas.map((rma) => (
              <div
                key={rma.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-slate-900">{rma.rmaCode}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-bold text-slate-700">{rma.customerName}</span>
                    <span className="text-[10px] bg-red-50 text-secondary font-bold px-2 py-0.5 rounded">
                      {rma.reasonCategory}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                    {rma.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Sản phẩm & Mã Serial:</span>
                    <span className="font-bold text-slate-900">{rma.productName}</span>
                    <span className="block text-slate-500 font-mono text-[11px] mt-0.5">Serial: {rma.serial}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Chi tiết phản ánh sự cố:</span>
                    <p className="text-slate-700 leading-relaxed mt-0.5">{rma.reasonDetail}</p>
                  </div>
                </div>

                {/* TIMELINE PROGRESS & ACTIONS */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Tiến độ quy trình BWF:</span>
                    <span className="font-bold text-slate-900">Bước {rma.timelineStep}/4</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {rma.timelineStep < 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateRMAStatus(
                            rma.id,
                            3,
                            'IN_REVIEW',
                            'Đang thẩm định phòng lab BWF'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold"
                      >
                        Chuyển vào Phòng Lab
                      </button>
                    )}
                    {rma.timelineStep === 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateRMAStatus(
                            rma.id,
                            4,
                            'COMPLETED',
                            'Đã phê duyệt đổi mới 100%'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold"
                      >
                        Duyệt đổi mới 100%
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => alert(`In phiếu kết quả thẩm định cho phiếu ${rma.rmaCode}`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                    >
                      In kết quả thẩm định
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL TRẢ LỜI ĐÁNH GIÁ */}
        {replyModalReview && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Phản hồi bài đánh giá</h3>
                  <p className="text-xs text-slate-400">Khách hàng: {replyModalReview.customerName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyModalReview(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-800">{replyModalReview.productName}</span>
                <p className="text-slate-600 mt-1 italic">"{replyModalReview.comment}"</p>
              </div>

              <form onSubmit={handleSaveReply} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Nội dung phản hồi chính thức</label>
                  <textarea
                    rows={4}
                    required
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Gửi lời cảm ơn khách hàng, tư vấn bảo dưỡng cước định kỳ hoặc hướng dẫn xử lý..."
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs p-3.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  ></textarea>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReplyModalReview(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Đăng phản hồi</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReviewsPage;
