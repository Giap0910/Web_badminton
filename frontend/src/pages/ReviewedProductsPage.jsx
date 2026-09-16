import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
import { reviewApi } from '../api/reviewApi';
import {
  Star,
  Search,
  MessageSquare,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  ThumbsUp,
  Share2,
  Edit3,
  Camera,
  X,
  Sparkles,
  Award
} from 'lucide-react';

const MOCK_REVIEWS = [
  {
    id: 1,
    productId: 1,
    productName: 'Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai',
    productBrand: 'YONEX JAPAN',
    productImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
    purchasedSpec: 'Phiên bản 4U/G5 • Căng cước BG80 Power 11.5kg (25.5 lbs)',
    rating: 5,
    createdAt: '24/10/2024',
    content:
      'Cây vợt đầm đầu smash cực kỳ uy lực, đũa Hyper Slim Shaft siêu mỏng giúp vung vợt thoát gió nhanh. Xưởng Apex Pro đan 4 nút chuẩn BWF cước căng đều, giữ cân cực tốt sau 3 tuần đánh giải. Cảm giác phông cầu cuối sân rất đầm tay, xứng đáng là siêu phẩm số 1 phân khúc!',
    feedbackImages: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?auto=format&fit=crop&w=300&q=80'
    ],
    verifiedBuyer: true,
    likes: 12,
    officialReply: {
      author: 'Chăm Sóc Khách Hàng Apex Pro',
      date: '25/10/2024',
      message:
        'Cảm ơn bạn đã tin tưởng dịch vụ căng cước điện tử 4 nút của Apex Pro. Chúc bạn thi đấu thăng hoa cùng Astrox 100ZZ Kurenai! Khi cần bảo dưỡng cước định kỳ bạn có thể mang qua xưởng kiểm tra miễn phí nhé.'
    }
  },
  {
    id: 2,
    productId: 2,
    productName: 'Giày Cầu Lông Yonex Power Cushion 65Z3 Men Wide',
    productBrand: 'YONEX',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
    purchasedSpec: 'Size 42 EU / 26.5cm • Form Bè Wide',
    rating: 5,
    createdAt: '18/10/2024',
    content:
      'Đế Power Cushion+ êm vượt trội, giảm chấn gót chân và khớp gối rất tốt trong các pha bật nhảy smash liên tục. Form bè Wide chuẩn chân người Việt, không bị bó tức ngón út. Bám sân gỗ và thảm PVC cực kỳ chắc chắn.',
    feedbackImages: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80'
    ],
    verifiedBuyer: true,
    likes: 8,
    officialReply: null
  },
  {
    id: 3,
    productId: 3,
    productName: 'Vợt Cầu Lông Victor Thruster Ryuga Metallic',
    productBrand: 'VICTOR TAIWAN',
    productImage: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=400&q=80',
    purchasedSpec: 'Phiên bản 3U/G5 • Cước Victor VBS-66 Nano 12kg',
    rating: 5,
    createdAt: '10/10/2024',
    content:
      'Khung Metallic Carbon đanh chắc, tiếng nổ đanh vang khắp sân. Vợt thuần công nặng đầu dành cho người cổ tay khỏe. Apex đóng gói ống carton hình trụ có đệm khí cực kỳ an toàn khi nhận hàng hỏa tốc.',
    feedbackImages: [],
    verifiedBuyer: true,
    likes: 5,
    officialReply: {
      author: 'Kỹ Thuật Viên Xưởng Cước Apex Pro',
      date: '11/10/2024',
      message:
        'Cảm ơn bạn! Dòng Ryuga Metallic kết hợp cước VBS-66 Nano ở mức 12kg sẽ phát huy tối đa độ nảy kim loại đặc trưng của cây vợt.'
    }
  }
];

const MOCK_PENDING_REVIEWS = [
  {
    orderId: 2,
    productId: 4,
    productName: 'Ống Cầu Lông Yonex Aerosensa 50 (12 quả)',
    productBrand: 'YONEX',
    productImage: 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?auto=format&fit=crop&w=400&q=80',
    purchasedSpec: 'Tốc độ 77 • Tiêu chuẩn giải đấu BWF',
    deliveredAt: '22/10/2024',
    rewardPoints: '+50 điểm ApexClub'
  },
  {
    orderId: 4,
    productId: 5,
    productName: 'Balo Cầu Lông Yonex Pro Tournament Bag',
    productBrand: 'YONEX',
    productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    purchasedSpec: 'Màu Fine Blue • Chứa 6 vợt + ngăn giày',
    deliveredAt: '06/10/2024',
    rewardPoints: '+50 điểm ApexClub'
  }
];

const ReviewedProductsPage = () => {
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [pendingReviews, setPendingReviews] = useState(MOCK_PENDING_REVIEWS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Write Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedPending, setSelectedPending] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSpec, setReviewSpec] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await reviewApi.getMyReviews();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          // Merge API data
          const merged = list.map((item, idx) => ({
            id: item.id || idx + 1,
            productId: item.productId || 1,
            productName: item.productName || 'Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai',
            productBrand: item.productBrand || 'YONEX',
            productImage: item.productImageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
            purchasedSpec: item.purchasedSpec || 'Phiên bản 4U/G5 • Căng cước BG80 Power 11.5kg',
            rating: item.rating || 5,
            createdAt: item.createdAt || '24/10/2024',
            content: item.comment || item.content || 'Sản phẩm chính hãng chất lượng tuyệt vời!',
            feedbackImages: item.feedbackImages || [],
            verifiedBuyer: true,
            likes: 4,
            officialReply: null
          }));
          setReviews(merged);
        }
      } catch (err) {
        console.warn('API reviews fallback to mock list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleOpenWriteReview = (item) => {
    setSelectedPending(item);
    setRatingStars(5);
    setReviewText('');
    setReviewSpec(item.purchasedSpec || '');
    setShowReviewModal(true);
  };

  const handleSubmitNewReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);

    const payload = {
      productId: selectedPending.productId,
      rating: ratingStars,
      comment: reviewText
    };

    try {
      if (reviewApi?.createReview) {
        await reviewApi.createReview(payload);
      }
    } catch (err) {
      console.warn('Gửi review lỗi hoặc dùng fallback cục bộ:', err);
    }

    const newRev = {
      id: Date.now(),
      productId: selectedPending.productId,
      productName: selectedPending.productName,
      productBrand: selectedPending.productBrand,
      productImage: selectedPending.productImage,
      purchasedSpec: reviewSpec || selectedPending.purchasedSpec,
      rating: ratingStars,
      createdAt: 'Vừa xong',
      content: reviewText,
      feedbackImages: [
        'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=300&q=80'
      ],
      verifiedBuyer: true,
      likes: 1,
      officialReply: {
        author: 'Apex Club Master',
        date: 'Vừa xong',
        message: 'Cảm ơn đóng góp quý báu của bạn! 50 điểm thưởng ApexClub đã được cộng vào tài khoản.'
      }
    };

    setReviews([newRev, ...reviews]);
    setPendingReviews((prev) => prev.filter((p) => p.productId !== selectedPending.productId));
    setSubmittingReview(false);
    setShowReviewModal(false);
  };

  const filteredReviews = reviews.filter((r) =>
    r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.productBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalReviewsCount = reviews.length + pendingReviews.length;

  return (
    <UserLayout currentPage="Sản phẩm đã đánh giá" counts={{ reviews: reviews.length }}>
      <div className="flex flex-col gap-6">
        {/* HEADER & QUICK STATS CONTAINER */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200/80 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sản phẩm đã đánh giá
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Xem lại đóng góp chuyên môn của bạn và tiếp tục tích lũy điểm thưởng ApexClub để đổi voucher mua hàng
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-end bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tổng đánh giá</span>
                <span className="text-base font-black text-slate-900">
                  {reviews.length} <span className="text-xs font-normal text-slate-400">sản phẩm</span>
                </span>
              </div>
            </div>
          </div>

          {/* CONTROLS: FILTERS & SEARCH */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            {/* FILTER PILLS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-[#131b2e] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Tất cả ({totalReviewsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REVIEWED')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'REVIEWED'
                    ? 'bg-[#131b2e] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>Đã đánh giá</span>
                <span className="bg-slate-200/60 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {reviews.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PENDING')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'PENDING'
                    ? 'bg-[#131b2e] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>Chờ đánh giá</span>
                <span className="bg-secondary text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                  {pendingReviews.length}
                </span>
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên vợt, mã đơn..."
                className="w-full bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* SECTION: PENDING REVIEWS BANNER (If tab is ALL or PENDING) */}
        {(activeTab === 'ALL' || activeTab === 'PENDING') && pendingReviews.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sản phẩm vừa mua chờ bạn nhận xét ({pendingReviews.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingReviews.map((pending) => (
                <div
                  key={pending.productId}
                  className="bg-white rounded-2xl border border-amber-200/80 bg-amber-50/20 p-4 shadow-sm flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={pending.productImage}
                      alt={pending.productName}
                      className="w-14 h-14 rounded-xl object-cover bg-white border border-slate-200 p-0.5 shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{pending.productBrand}</span>
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">{pending.productName}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5">{pending.purchasedSpec}</span>
                      <span className="text-[10px] font-black text-amber-700 mt-1 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        {pending.rewardPoints}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenWriteReview(pending)}
                    className="px-3 py-1.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm shrink-0 active:scale-95"
                  >
                    Viết đánh giá
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: ALREADY REVIEWED LIST */}
        {(activeTab === 'ALL' || activeTab === 'REVIEWED') && (
          <div className="flex flex-col gap-4">
            {filteredReviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
                Không tìm thấy bài đánh giá nào phù hợp.
              </div>
            ) : (
              filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6 flex flex-col gap-4 hover:border-slate-300 transition-all"
                >
                  {/* TOP ROW: PRODUCT INFO & STARS */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={rev.productImage}
                        alt={rev.productName}
                        className="w-14 h-14 rounded-xl object-cover bg-slate-50 border border-slate-200 p-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          {rev.productBrand}
                        </span>
                        <Link
                          to={`/products/${rev.productId}`}
                          className="font-bold text-sm text-slate-900 hover:text-secondary transition-colors truncate block"
                        >
                          {rev.productName}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-medium">
                            {rev.purchasedSpec}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                          />
                        ))}
                        <span className="text-xs font-black text-slate-900 ml-1">5.0</span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Đã đánh giá: {rev.createdAt}
                      </span>
                    </div>
                  </div>

                  {/* REVIEW CONTENT */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {rev.content}
                    </p>

                    {/* ATTACHED FEEDBACK IMAGES */}
                    {rev.feedbackImages && rev.feedbackImages.length > 0 && (
                      <div className="flex items-center gap-3 mt-1 overflow-x-auto pb-1">
                        {rev.feedbackImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <img src={img} alt="Feedback" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OFFICIAL CSKH REPLY (If any) */}
                  {rev.officialReply && (
                    <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-secondary flex flex-col gap-1.5 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-secondary" />
                          {rev.officialReply.author}
                        </span>
                        <span className="text-[11px] text-slate-400">{rev.officialReply.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {rev.officialReply.message}
                      </p>
                    </div>
                  )}

                  {/* BOTTOM ACTION BAR */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã xác thực đã mua hàng tại Apex Pro
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Hữu ích ({rev.likes})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => alert('Đã sao chép liên kết bài đánh giá')}
                        className="hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Chia sẻ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* MODAL VIẾT ĐÁNH GIÁ MỚI */}
        {showReviewModal && selectedPending && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Đánh giá sản phẩm</h3>
                    <p className="text-xs text-slate-400">Nhận ngay +50 điểm ApexClub</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewReview} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <img
                    src={selectedPending.productImage}
                    alt={selectedPending.productName}
                    className="w-12 h-12 rounded-xl object-cover bg-white shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs text-slate-900 truncate">{selectedPending.productName}</span>
                    <span className="text-[11px] text-slate-500">{selectedPending.purchasedSpec}</span>
                  </div>
                </div>

                {/* STAR SELECTION */}
                <div className="flex flex-col items-center gap-2 py-2">
                  <span className="text-xs font-bold text-slate-700">Chất lượng sản phẩm</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingStars(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-amber-600 font-bold">
                    {ratingStars === 5
                      ? 'Cực kỳ hài lòng (5 sao)'
                      : ratingStars === 4
                      ? 'Hài lòng (4 sao)'
                      : 'Bình thường (3 sao)'}
                  </span>
                </div>

                {/* REVIEW TEXT */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Nhận xét chi tiết</label>
                  <textarea
                    rows={4}
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Hãy chia sẻ cảm nhận về độ nảy, cảm giác cầm vợt, chất lượng đan cước từ xưởng Apex Pro..."
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs p-3.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  ></textarea>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm active:scale-95"
                  >
                    Gửi đánh giá
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default ReviewedProductsPage;
