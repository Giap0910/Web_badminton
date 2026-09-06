import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingCart, 
  Layers, 
  Check, 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Sparkles,
  MessageSquare,
  Send,
  CheckCircle2
} from 'lucide-react';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  
  // New review form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const { addToCart } = useCart();
  const { toggleRacket, isInComparison } = useCompare();
  const { isAuthenticated } = useAuth();

  const isComparing = product ? isInComparison(product.id) : false;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [prodData, reviewData] = await Promise.all([
          productApi.getProductById(id),
          reviewApi.getProductReviews(id)
        ]);
        setProduct(prodData);
        setReviews(reviewData);
      } catch (err) {
        console.error('Lỗi khi tải chi tiết sản phẩm:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setReviewSubmitting(true);
    setReviewError('');
    setReviewSuccess(false);

    try {
      const newReview = await reviewApi.createReview({
        productId: product.id,
        rating,
        comment: comment.trim()
      });
      setReviews([newReview, ...reviews]);
      setComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Có lỗi khi gửi đánh giá');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Đang tải thông số kỹ thuật vợt...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy cây vợt này!</h2>
        <Link to="/products" className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs">
          Quay lại danh sách vợt
        </Link>
      </div>
    );
  }

  const inStock = product.stock > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 flex items-center gap-2">
        <Link to="/" className="hover:text-emerald-600">Trang chủ</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-emerald-600">Vợt Cầu Lông</Link>
        <span>/</span>
        <span className="text-slate-800 font-bold truncate">{product.name}</span>
      </nav>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
        
        {/* Left: Product Image */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-900 text-white shadow">
                {product.brand}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Product Details & Badminton Specs */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Chính Hãng 100%
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Mã sản phẩm: #{product.id}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 leading-snug">
              {product.name}
            </h1>

            {/* Rating Stars & Stock */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center text-amber-400 gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= Math.round(product.averageRating || 5) ? 'fill-amber-400' : 'text-slate-300'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold text-slate-700 ml-1.5">
                  {product.averageRating ? product.averageRating.toFixed(1) : '5.0'}
                </span>
                <span className="text-xs text-slate-400">({reviews.length} đánh giá)</span>
              </div>

              <div className="h-4 w-px bg-slate-200" />

              <div className="text-xs">
                {inStock ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Còn {product.stock} chiếc (Khóa tạm: {product.reservedStock})</span>
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">Tạm hết hàng</span>
                )}
              </div>
            </div>

            {/* Price Box */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-baseline gap-4">
              <span className="text-3xl font-extrabold text-emerald-700">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-sm font-semibold text-slate-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Badminton Technical Specifications Table */}
            <div className="mt-6">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3">
                Thông Số Kỹ Thuật Chuyên Sâu
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-medium">Trọng lượng / Chu vi cán:</span>
                  <strong className="text-slate-900">{product.weightGrip || '4U-G5'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-medium">Điểm cân bằng:</span>
                  <strong className="text-slate-900">{product.balancePoint || 'Head-Heavy'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-medium">Độ cứng thân vợt:</span>
                  <strong className="text-slate-900">{product.stiffness || 'Stiff'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-medium">Mức căng tối đa:</span>
                  <strong className="text-slate-900">{product.maxTension || '28-30 lbs'}</strong>
                </div>
                <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex justify-between">
                  <span className="text-emerald-800 font-medium">Phong cách chơi đề xuất:</span>
                  <strong className="text-emerald-900 font-bold">{product.playStyle || 'Tấn công uy lực'}</strong>
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="mt-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Quantity Picker */}
              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  -
                </button>
                <span className="px-4 py-2 text-sm font-bold text-slate-900 min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={() => addToCart(product, quantity)}
                disabled={!inStock}
                className={`flex-1 px-6 py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  inStock
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{inStock ? 'Thêm Vào Giỏ Hàng' : 'Hết Hàng'}</span>
              </button>

              {/* Compare Button */}
              <button
                onClick={() => toggleRacket(product)}
                className={`px-4 py-3.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                  isComparing
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {isComparing ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                <span>{isComparing ? 'Đã thêm so sánh' : 'So sánh vợt'}</span>
              </button>
            </div>

            {/* Atomic Reservation & Perks Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bảo hành chính hãng 90 ngày</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Giao hàng hỏa tốc toàn quốc</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Khóa kho 15 phút khi tạo mã QR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Anti-XSS Sanitation Section */}
      <section className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span>Đánh Giá Của Khách Hàng ({reviews.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Bình luận trải nghiệm thực tế từ các vận động viên và lông thủ
          </p>
        </div>

        {/* Add Review Form */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Gửi Đánh Giá Của Bạn Về Cây Vợt Này
          </h3>

          {!isAuthenticated ? (
            <div className="text-xs text-slate-600">
              Vui lòng{' '}
              <Link to="/login" className="font-bold text-emerald-600 hover:underline">
                Đăng nhập
              </Link>{' '}
              để gửi đánh giá sản phẩm.
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Chọn số sao đánh giá:
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-5 h-5 ${s <= rating ? 'fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{rating} / 5 sao</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Bình luận cảm nhận (độ đầm đầu, trợ lực, smash...):
                </label>
                <textarea
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm sử dụng vợt thực tế của bạn..."
                  required
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {reviewSuccess && (
                <div className="text-xs text-emerald-700 font-bold bg-emerald-100 p-3 rounded-xl">
                  ✓ Cảm ơn bạn! Đánh giá đã được làm sạch an toàn và xuất bản thành công.
                </div>
              )}
              {reviewError && (
                <div className="text-xs text-rose-700 font-bold bg-rose-100 p-3 rounded-xl">
                  {reviewError}
                </div>
              )}

              <button
                type="submit"
                disabled={reviewSubmitting || !comment.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{reviewSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              Chưa có đánh giá nào cho cây vợt này. Hãy là người đầu tiên để lại nhận xét!
            </p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{rev.userFullName || rev.username}</span>
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400' : 'text-slate-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
                {/* Safe JSX text rendering preventing stored XSS */}
                <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductDetailPage;
