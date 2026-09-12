import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
import { reviewApi } from '../api/reviewApi';
import {
  Star,
  MessageSquare,
  ArrowRight,
  Loader2,
  Package,
  Calendar,
  ExternalLink
} from 'lucide-react';

const ReviewedProductsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await reviewApi.getMyReviews();
        const list = Array.isArray(res) ? res : res?.data || [];
        setReviews(list);
      } catch (err) {
        console.error('Lỗi khi tải danh sách đánh giá:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <UserLayout
      title="Đánh Giá Của Tôi"
      subtitle="Quản lý và xem lại những nhận xét thực tế bạn đã chia sẻ về các sản phẩm thi đấu"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-secondary mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Đang tải danh sách đánh giá...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-black text-base text-slate-900">Bạn chưa viết đánh giá nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Sau khi mua và trải nghiệm vợt, giày hoặc phụ kiện, hãy để lại đánh giá để giúp cộng đồng lông thủ chọn được cây vợt ưng ý nhất!
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-secondary text-white font-bold text-xs shadow-md"
            >
              <span>Xem danh mục sản phẩm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Bạn đã chia sẻ <strong className="text-slate-900 font-bold">{reviews.length}</strong> bài đánh giá
            </p>

            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={rev.productImageUrl}
                        alt={rev.productName}
                        className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-100 p-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">
                          {rev.productBrand}
                        </span>
                        <Link
                          to={`/products/${rev.productId}`}
                          className="font-bold text-sm text-slate-900 hover:text-secondary transition-colors truncate block"
                        >
                          {rev.productName}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating ? 'fill-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black text-slate-900">{rev.rating}.0 / 5</span>
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl leading-relaxed">
                    “{rev.comment}”
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>

                    <Link
                      to={`/products/${rev.productId}`}
                      className="font-bold text-royal hover:underline flex items-center gap-1 text-xs"
                    >
                      <span>Xem sản phẩm</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default ReviewedProductsPage;
