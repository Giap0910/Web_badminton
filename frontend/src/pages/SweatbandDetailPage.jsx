import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Bolt, ChevronRight, CheckCircle2, Star, RefreshCw, Droplets, Sparkles, Send, Heart, ZoomIn, Truck, PackageCheck, Award, AlertCircle } from 'lucide-react';
import { productApi } from '../api/productApi';
import { reviewApi, useProductReviews, buildReviewPayload } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, productImages } from '../utils/formatters';

import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { ProductDescription, ProductSpecifications, ProductSelections, ProductRating, ProductReviewEntries, ReviewSummary, ProductDiscount, productCartOptions, productValue, productAccessoryLabel, useProductFavorite } from '../components/ProductFacts';

const SweatbandDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reviewRoute = useRef(id), reviewLock = useRef(false), reviewAttempt = useRef(0); reviewRoute.current = id;
  useEffect(() => { reviewRoute.current = id; reviewLock.current = false; reviewAttempt.current++; setReviewSubmitting(false);
    return () => { reviewRoute.current = null; reviewAttempt.current++; }; }, [id]);
  const { addToCart } = useCart();
  const { token, isAuthenticated, user } = useAuth();
  const { isFavorite, toggleFavorite, favoriteError } = useProductFavorite(user?.id, Number(id));

  const [product, setProduct] = useState(null);
  const { reviews, reviewsError, reviewsLoading, setReviews, retryReviews } = useProductReviews(id);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const [activeTab, setActiveTab] = useState('desc');
  const [addedToast, setAddedToast] = useState(false);
  const [errorToast, setErrorToast] = useState('');

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchProd = async () => {
      setLoading(true);
      setProduct(null);


      try {
        const [prodData, relatedData] = await Promise.all([
          productApi.getProductById(id),
          productApi.getProducts({ page: 0, size: 5, categoryId: 5 }).catch(() => ({ content: [] }))
        ]);
        if (!active) return;
        setProduct(prodData);
        setRelatedProducts((relatedData?.content || []).filter(item => item.id !== prodData.id).slice(0, 4));
      } catch (err) {
        console.error('Error fetching sweatband detail:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProd();
    window.scrollTo(0, 0);
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[80rem] mx-auto px-4 py-28 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Đang tải chi tiết băng chặn mồ hôi...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-sm font-bold text-slate-700 mb-4">Không tìm thấy sản phẩm băng chặn mồ hôi.</p>
        <Link to="/products" className="px-5 py-2.5 bg-[#0F172A] text-white text-xs font-bold uppercase rounded-xl">
          Quay lại danh mục
        </Link>
      </div>
    );
  }

  const galleryImages = productImages(product);


  const currentVariant = { label: product.name };
  const unitPrice = Number(product.price);
  const originalPrice = product.originalPrice;
  const finalPrice = unitPrice;


  const handleAdd = () => {
    if (!product) return;
    const cartItemId = addToCart(product, quantity, productCartOptions(product));
    if (cartItemId) {
      setErrorToast('');
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2500);
    } else {
      setAddedToast(false);
      setErrorToast('Số lượng yêu cầu vượt quá tồn kho hiện có!');
      setTimeout(() => setErrorToast(''), 3000);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    const cartItemId = addToCart(product, quantity, productCartOptions(product));
    if (cartItemId) {
      navigate('/checkout', { state: { selectedItemIds: [cartItemId] } });
    } else {
      setErrorToast('Số lượng yêu cầu vượt quá tồn kho hiện có!');
      setTimeout(() => setErrorToast(''), 3000);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    if (!isAuthenticated) { alert('Vui lòng đăng nhập để đánh giá sản phẩm đã mua.'); return; }
    if (reviewLock.current) return; reviewLock.current = true; const submittedId = id, attempt = ++reviewAttempt.current; setReviewSubmitting(true);
    try {
      const newRev = await reviewApi.createReview(buildReviewPayload({ productId: product.id }, reviewRating, reviewComment), { headers: { Authorization: `Bearer ${token}` } });
      if (reviewRoute.current !== submittedId || reviewAttempt.current !== attempt) return;
      setReviews(prev => [newRev, ...prev]);
      productApi.getProductById(id).then(data => { if (reviewRoute.current === submittedId) setProduct(data); }).catch(console.error);
      setReviewComment('');
      alert('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
    } catch (err) {
      if (reviewRoute.current !== submittedId || reviewAttempt.current !== attempt) return;
      console.error(err);
      alert('Chưa thể gửi đánh giá, vui lòng thử lại sau.');
    } finally {
      if (reviewRoute.current === submittedId && reviewAttempt.current === attempt) { reviewLock.current = false; setReviewSubmitting(false); }
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-slate-800 antialiased font-sans pb-16">
      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div className="text-xs font-semibold">
            Đã thêm <span className="text-emerald-400 font-bold">{currentVariant.label}</span> vào giỏ hàng!
          </div>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-rose-500/50 animate-bounce">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs font-semibold text-rose-200">
            {errorToast}
          </div>
        </div>
      )}

      {/* BREADCRUMB */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[80rem] mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/products?category=accessories" className="hover:text-primary transition-colors">
              Phụ kiện
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/accessories/sweatband" className="hover:text-primary transition-colors">
              Băng chặn mồ hôi
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-800 truncate max-w-md">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-[80rem] mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: GALLERY */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center p-6 group">
              {/* Badges overlay */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start">
                <span className="px-3 py-1 bg-[#131B2E] text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />{productValue(product.brand)}</span>
                <span className="px-3 py-1 bg-secondary text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm">{productValue(product.categoryName)}</span>
              </div>

              <button 
                type="button" 
                aria-label="Yêu thích"
                onClick={toggleFavorite} aria-pressed={isFavorite} title="Lưu yêu thích trên thiết bị này"
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 text-slate-500 shadow flex items-center justify-center hover:text-secondary transition-colors"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-secondary text-secondary' : ''}`} />
              </button>
              {favoriteError && <p role="alert" className="absolute bottom-3 left-3 right-3 text-xs text-red-700">{favoriteError}</p>}

              <ProductImage
                src={galleryImages[activeImage]} 
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              />

              <div className="absolute bottom-4 right-4 px-2.5 py-1 bg-[#131B2E]/80 text-white font-bold text-[10px] rounded-lg backdrop-blur-sm flex items-center gap-1.5 opacity-80">
                <ZoomIn className="w-3.5 h-3.5" />
                Rê chuột để phóng to
              </div>
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square bg-white rounded-xl p-1.5 border shadow-sm cursor-pointer transition-all flex items-center justify-center overflow-hidden ${
                    activeImage === idx ? 'border-secondary ring-2 ring-secondary/20 scale-95' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <ProductImage src={src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>

            {/* Trust Badges Strip */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <Droplets className="w-5 h-5 text-secondary" />
                <span className="font-bold text-xs text-slate-800">{productAccessoryLabel(product.accessoryType)}</span>
                <span className="text-[11px] text-slate-500">Loại phụ kiện</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RefreshCw className="w-5 h-5 text-secondary" />
                <span className="font-bold text-xs text-slate-800">{productValue(product.quantityPerPack)}</span>
                <span className="text-[11px] text-slate-500">Quy cách đóng gói</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <PackageCheck className="w-5 h-5 text-secondary" />
                <span className="font-bold text-xs text-slate-800">{productValue(product.origin)}</span>
                <span className="text-[11px] text-slate-500">Xuất xứ</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PRODUCT BUYING INFO */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            {/* Title & Brand */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {productValue(product.brand)}
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-secondary text-[10px] uppercase rounded-md font-bold">{productAccessoryLabel(product.accessoryType)}</span>
                </div>
                <span className="text-[11px] text-slate-400">Mã SP: {productValue(product.sku)}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] leading-snug">
                {product.name}
              </h1>

              {/* Rating & stats */}
              <ProductRating product={product} />
            </div>

            {/* Pricing Section */}
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">
                  {formatPrice(finalPrice)}
                </span>
                {originalPrice > finalPrice && <span className="text-sm text-slate-400 line-through">
                  {formatPrice(originalPrice)}
                </span>}
                <ProductDiscount product={product} />
              </div>
              <div className="text-right">
                <span className="text-[11px] text-secondary block uppercase tracking-wider font-bold">Giá sản phẩm</span>
                <span className="text-[10px] text-slate-400">Theo dữ liệu cửa hàng</span>
              </div>
            </div>

            {/* Product Variant Selection */}
            <ProductSelections product={product} />

            {/* Color Swatches */}

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Số lượng:</span>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-md bg-white text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center font-bold disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-black text-xs text-slate-800">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-md bg-white text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="text-xs text-slate-500">Còn {product.stock ?? 0} sản phẩm</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 transition-all shadow-sm"
              >
                <ShoppingCart className="w-4 h-4 text-slate-700" />
                Thêm vào giỏ hàng
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-3.5 px-4 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-secondary/20 transition-all"
              >
                <Bolt className="w-4 h-4 fill-white" />Mua ngay</button>
            </div>

            {/* Service Guarantee Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-secondary shrink-0" />
                <span>{productValue(product.brand)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary shrink-0" />
                <span>{productValue(product.quantityPerPack)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                <span>{productValue(product.categoryName)}</span>
              </div>
            </div>

            {/* Add-on Upsell Box */}

          </div>

        </div>
      </div>

      {/* SPECIFICATIONS & DETAILS TABS */}
      <div className="max-w-[80rem] mx-auto px-4 mt-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          
          {/* Tab Header Buttons */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4 overflow-x-auto">
            {[
              { id: 'desc', label: 'Mô tả chi tiết' },
              { id: 'specs', label: 'Thông số kỹ thuật' },
              { id: 'reviews', label: `Đánh giá (${product.reviewCount ?? 0})` },
              { id: 'faq', label: 'Hỏi đáp chuyên gia' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#131B2E] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: MÔ TẢ CHI TIẾT */}
          {activeTab === 'desc' && <ProductDescription product={product} />}

          {/* TAB 2: THÔNG SỐ KỸ THUẬT */}
          {activeTab === 'specs' && <ProductSpecifications product={product} />}

          {/* TAB 3: ĐÁNH GIÁ */}
          {activeTab === 'reviews' && (
            <div className="pt-6 flex flex-col gap-6">
              {!reviewsError && !reviewsLoading && <ReviewSummary product={product} reviews={reviews} />}

              {/* Add review form */}
              <form onSubmit={handleReviewSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Viết nhận xét của bạn</span>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <span>Đánh giá:</span>
                    <div className="flex text-amber-500 cursor-pointer">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          onClick={() => setReviewRating(st)}
                          className={`w-4 h-4 ${st <= reviewRating ? 'fill-amber-500' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <textarea
                  maxLength={2000}
                  rows="2"
                  placeholder="Cảm nhận về độ thấm hút, độ co giãn, chất liệu..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-secondary resize-none"
                />
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="self-end px-4 py-2 bg-[#131B2E] text-white rounded-lg text-xs font-bold uppercase hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </form>

              {/* Reviews list */}
              <ProductReviewEntries reviews={reviews} error={reviewsError} loading={reviewsLoading} onRetry={retryReviews} />
            </div>
          )}

          {/* TAB 4: HỎI ĐÁP CHUYÊN GIA */}
          {activeTab === 'faq' && <p className="pt-6 text-sm text-slate-600">Liên hệ cửa hàng để xác nhận thông tin còn thiếu của sản phẩm.</p>}

        </div>
      </div>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && <section className="max-w-[80rem] mx-auto px-4 mt-12 space-y-6">
 <h2 className="text-xl font-bold text-slate-900">Sản phẩm cùng danh mục</h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {relatedProducts.map(item => <ProductCard key={item.id} product={item} />)}
 </div>
</section>}
    </div>
  );
};

export default SweatbandDetailPage;
