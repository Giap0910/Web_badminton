import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  Star,
  RotateCcw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  User,
  Package
} from 'lucide-react';

const AdminReviewsPage = () => {
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'returns'
  const [reviews, setReviews] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewData, returnData] = await Promise.all([
        adminApi.getAllReviews(),
        adminApi.getAllReturns()
      ]);
      setReviews(reviewData || []);
      setReturns(returnData || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu đánh giá & đổi trả:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Review Actions
  const handleDeleteReview = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa đánh giá này khỏi hệ thống?')) return;
    try {
      await adminApi.deleteReview(id);
      showToast('Đã xóa đánh giá thành công!');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('Không thể xóa đánh giá.');
    }
  };

  // Return Actions
  const handleUpdateReturnStatus = async (id, status) => {
    try {
      await adminApi.updateReturnStatus(id, status);
      showToast(`Đã chuyển yêu cầu #${id} sang ${status}!`);
      setReturns((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      alert('Không thể cập nhật trạng thái yêu cầu đổi trả.');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.productName?.toLowerCase().includes(term) ||
      r.userFullName?.toLowerCase().includes(term) ||
      r.username?.toLowerCase().includes(term) ||
      r.comment?.toLowerCase().includes(term)
    );
  });

  const filteredReturns = returns.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.id?.toString().includes(term) ||
      r.orderId?.toString().includes(term) ||
      r.userFullName?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term)
    );
  });

  return (
    <AdminLayout
      title="Đánh Giá & Đổi Trả Bảo Hành"
      subtitle="Kiểm duyệt phản hồi từ người mua và xử lý các yêu cầu bảo hành đổi trả"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => { setActiveTab('reviews'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'reviews'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Đánh Giá Khách Hàng ({reviews.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('returns'); setSearchTerm(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'returns'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Yêu Cầu Đổi Trả / Bảo Hành ({returns.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'reviews'
                ? 'Tìm theo tên sản phẩm, khách hàng hoặc nội dung...'
                : 'Tìm theo mã yêu cầu, mã đơn, khách hàng...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-red-500 transition"
          />
        </div>
      </div>

      {/* TAB 1: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[850px]">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Sản Phẩm</th>
                  <th className="p-4">Người Đánh Giá</th>
                  <th className="p-4">Điểm Số</th>
                  <th className="p-4">Nội Dung Nhận Xét</th>
                  <th className="p-4">Thời Gian</th>
                  <th className="p-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      Đang tải danh sách đánh giá...
                    </td>
                  </tr>
                ) : filteredReviews.length > 0 ? (
                  filteredReviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={r.productImageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=100'}
                            alt={r.productName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-white max-w-[200px] truncate">{r.productName}</p>
                            <p className="text-[10px] text-slate-400">{r.productBrand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-200">{r.userFullName || r.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">@{r.username}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <span>{r.rating}</span>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 max-w-[280px]">
                        <p className="line-clamp-2 leading-relaxed italic">{r.comment || 'Không có bình luận'}</p>
                      </td>
                      <td className="p-4 text-slate-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                          title="Xóa đánh giá vi phạm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      Không tìm thấy đánh giá nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RETURNS */}
      {activeTab === 'returns' && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Mã Yêu Cầu</th>
                  <th className="p-4">Mã Đơn Hàng</th>
                  <th className="p-4">Khách Hàng</th>
                  <th className="p-4">Lý Do Đổi Trả</th>
                  <th className="p-4">Mô Tả Chi Tiết</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4">Thời Gian Gửi</th>
                  <th className="p-4 text-center">Xử Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      Đang tải danh sách đổi trả...
                    </td>
                  </tr>
                ) : filteredReturns.length > 0 ? (
                  filteredReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-900/50 transition">
                      <td className="p-4 font-mono font-bold text-white">#{ret.id}</td>
                      <td className="p-4 font-mono font-bold text-red-400">#{ret.orderId}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-200">{ret.userFullName || 'Khách hàng'}</div>
                        <div className="text-[10px] text-slate-400">{ret.userEmail}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-200">{ret.reason}</td>
                      <td className="p-4 text-slate-300 max-w-[220px]">
                        <p className="line-clamp-2 leading-relaxed">{ret.description || '—'}</p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ret.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : ret.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : ret.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {ret.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                          {ret.status === 'PENDING' && <Clock className="w-3 h-3" />}
                          {ret.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                          {ret.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {ret.createdAt ? new Date(ret.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {ret.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleUpdateReturnStatus(ret.id, 'APPROVED')}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] transition"
                              >
                                Chấp thuận
                              </button>
                              <button
                                onClick={() => handleUpdateReturnStatus(ret.id, 'REJECTED')}
                                className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-[11px] transition"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          {ret.status === 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateReturnStatus(ret.id, 'COMPLETED')}
                              className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-semibold text-[11px] transition"
                            >
                              Hoàn tất
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      Không có yêu cầu đổi trả nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReviewsPage;
