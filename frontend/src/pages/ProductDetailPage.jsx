import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { reviewApi, useProductReviews, buildReviewPayload } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { productCategory } from '../utils/formatters';
import { ProductBenefits, ProductDescription, ProductSpecifications, ProductSelections, ProductRating, ProductReviewList, productCartOptions, availableProductSizes, productVariants, productValue, useProductFavorite, copyProductLink } from '../components/ProductFacts';
import ProductImage, { BadmintonPlaceholder } from '../components/ProductImage';
import ProductGallery, { productGallerySlots } from '../components/ProductGallery';
import { ShoppingCart, Layers, Star, CheckCircle2, Heart, ZoomIn, Home, ChevronRight, ChevronLeft, Bolt, Share2, AlertCircle, X } from 'lucide-react';

const ProductDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reviewRoute = useRef(id), reviewLock = useRef(false), reviewAttempt = useRef(0); reviewRoute.current = id;
  useEffect(() => { reviewRoute.current = id; reviewLock.current = false; reviewAttempt.current++; setReviewSubmitting(false);
    return () => { reviewRoute.current = null; reviewAttempt.current++; }; }, [id]);
  const [product, setProduct] = useState(null);
  const { reviews, reviewsError, reviewsLoading, setReviews, retryReviews } = useProductReviews(id);

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [shareError, setShareError] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [addedToast, setAddedToast] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [zoomModal, setZoomModal] = useState(false);

  // Variant selections
  const [selectedShoeSize, setSelectedShoeSize] = useState('');
  const [selectedApparelSize, setSelectedApparelSize] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  // Review form
  const [newRating, setNewRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [cartError, setCartError] = useState('');

  // Accordion state for QA

  const { addToCart } = useCart();
  const { toggleRacket, isInComparison } = useCompare();
  const { isAuthenticated, token, user } = useAuth();
  const { isFavorite, toggleFavorite, favoriteError } = useProductFavorite(user?.id, Number(id));

  const isComparing = product ? isInComparison(product.id) : false;

  const categoryKind = productCategory(product);
  const isShoes = categoryKind === 'SHOES';
  const isApparel = categoryKind === 'APPAREL';
  const isBag = categoryKind === 'BAG';
  const isAccessories = categoryKind === 'ACCESSORIES';
  const isRacket = categoryKind === 'RACKET';

  useEffect(() => {
    const sizes = availableProductSizes(product);
    setSelectedShoeSize(sizes[0] || '');
    setSelectedApparelSize(sizes[0] || '');
    setActiveImage(0);
    setSelectedVariantId(productVariants(product).find(v => v.inStock)?.id ?? null);
    setQuantity(1);
    setActiveTab(/^#review-\d+$/.test(location.hash) ? 'reviews' : 'description');
  }, [product?.id, isShoes, isApparel, isBag, isAccessories]);
  useEffect(() => {
    if (!/^#review-\d+$/.test(location.hash)) return;
    setActiveTab('reviews');
    if (!reviewsLoading) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [location.hash, reviewsLoading, activeTab]);

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      setLoading(true);
      setDataError('');

      try {
        const [prodData, allProds, galleryApi] = await Promise.all([
          productApi.getProductById(id),
          productApi.getProducts({ size: 8 }).catch(() => []),
          productApi.getProductImages(id).catch(() => [])
        ]);
        if (!active) return;

        // Merge gallery from endpoint if imageUrls is missing or empty
        if (prodData) {
          const existingGallery = Array.isArray(prodData.imageUrls) ? prodData.imageUrls : [];
          const extraGallery = Array.isArray(galleryApi) ? galleryApi : [];
          prodData.imageUrls = [...new Set([...existingGallery, ...extraGallery])];
        }

        setProduct(prodData);

        const list = Array.isArray(allProds) ? allProds : (allProds?.content || []);
        const filtered = list.filter(p => p.id !== Number(id) && p.categoryId === prodData?.categoryId).slice(0, 4);
        setRelatedProducts(filtered);
      } catch (err) {
        if (active) setDataError(err.response?.status === 404 ? 'Sản phẩm không tồn tại.' : 'Không tải được thông tin sản phẩm.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDetails();
    window.scrollTo(0, 0);
    return () => { active = false; };
  }, [id]);

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getProductOptions = () => productCartOptions(product, isShoes ? selectedShoeSize : selectedApparelSize, selectedVariantId);

  const handleAddToCart = () => {
    if (!product) return;
    const cartItemId = addToCart(product, quantity, getProductOptions());
    if (cartItemId) {
      setCartError('');
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2500);
    } else {
      setAddedToast(false);
      setCartError('Không thể thêm vào giỏ: Số lượng yêu cầu vượt quá tồn kho hiện có!');
      setTimeout(() => setCartError(''), 3500);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    const cartItemId = addToCart(product, quantity, getProductOptions());
    if (cartItemId) {
      setCartError('');
      navigate('/checkout', { state: { selectedItemIds: [cartItemId] } });
    } else {
      setAddedToast(false);
      setCartError('Không thể mua ngay: Số lượng yêu cầu vượt quá tồn kho hiện có!');
      setTimeout(() => setCartError(''), 3500);
    }
  };

  const handleShare = async () => {
    setShareError(''); setShareToast(false);
    try { await copyProductLink(Number(id)); setShareToast(true); setTimeout(() => setShareToast(false), 2500); }
    catch (error) { setShareError(error.message || 'Không sao chép được liên kết.'); }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || reviewLock.current) return;
    if (!isAuthenticated) {
      setReviewError('Vui lòng đăng nhập tài khoản để gửi đánh giá sản phẩm.');
      setTimeout(() => setReviewError(''), 4000);
      return;
    }
    reviewLock.current = true; const submittedId = id, attempt = ++reviewAttempt.current; setReviewSubmitting(true);
    setReviewError('');
    try {
      const newRev = await reviewApi.createReview(buildReviewPayload({ productId: product.id }, newRating, comment), { headers: { Authorization: `Bearer ${token}` } });
      if (reviewRoute.current !== submittedId || reviewAttempt.current !== attempt) return;
      if (newRev && (newRev.id || newRev.productId)) {
        setReviews(prev => [newRev, ...prev]);
        productApi.getProductById(id).then(data => { if (reviewRoute.current === submittedId) setProduct(data); }).catch(() => {});
        setComment('');
        setReviewSuccess(true);
        setTimeout(() => setReviewSuccess(false), 4000);
      }
    } catch (err) {
      if (reviewRoute.current !== submittedId || reviewAttempt.current !== attempt) return;
      console.error('Review submission error:', err);
      setReviewSuccess(false);
      if (err?.response?.status === 401) {
        setReviewError('Vui lòng đăng nhập tài khoản để gửi đánh giá sản phẩm.');
      } else if (err?.response?.status === 403) {
        setReviewError('Bạn không có quyền thực hiện đánh giá sản phẩm này.');
      } else {
        setReviewError(err?.response?.data?.message || 'Chưa thể gửi đánh giá, vui lòng thử lại sau.');
      }
      setTimeout(() => setReviewError(''), 4000);
    } finally {
      if (reviewRoute.current === submittedId && reviewAttempt.current === attempt) { reviewLock.current = false; setReviewSubmitting(false); }
    }
  };

  if (loading) {
    return (
      <div className="max-w-[80rem] mx-auto px-4 py-28 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Đang tải chi tiết sản phẩm...</span>
      </div>
    );
  }

  if (dataError || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 mb-6">
          <p className="font-bold text-sm mb-1">{dataError || 'Sản phẩm không khả dụng.'}</p>
          <p className="text-xs text-slate-600">Vui lòng quay lại danh sách sản phẩm hoặc tìm kiếm sản phẩm khác.</p>
        </div>
        <Link to="/products" className="inline-block px-6 py-3 bg-[#0F172A] text-white text-xs font-bold uppercase rounded-xl hover:bg-slate-800 transition-colors shadow-md">
          Quay lại cửa hàng
        </Link>
      </div>
    );
  }

  const galleryImages = productGallerySlots(product).map(slot => slot.url);
  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="w-full bg-[#F8FAFC] py-6">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">

        {/* BREADCRUMB */}
        <nav className="flex items-center gap-2 py-3 text-xs text-slate-500 overflow-x-auto whitespace-nowrap mb-4">
          <Link to="/" className="hover:text-secondary flex items-center gap-1 transition-colors">
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/products" className="hover:text-secondary transition-colors">
            {isRacket ? 'Vợt cầu lông' : isShoes ? 'Giày cầu lông' : isBag ? 'Balo & Bao vợt' : isApparel ? 'Quần áo thi đấu' : 'Phụ kiện pro'}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-bold truncate max-w-md">{product.name}</span>
        </nav>

        {/* ========================================================================= */}
        {/* MAIN PRODUCT HERO STAGE (2 COLUMNS ASYMMETRIC)                           */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">

          <ProductGallery product={product} activeIndex={activeImage} onChange={setActiveImage}
            onZoom={() => setZoomModal(true)} favorite={isFavorite} onFavorite={toggleFavorite} />

          {/* RIGHT COLUMN: SPECS & PURCHASING ARCHITECTURE (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            {favoriteError && <p role="alert" className="text-xs text-red-700">{favoriteError}</p>}
            <div>
              {/* Brand line & SKU Header */}
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#131B2E] text-white text-xs font-bold uppercase tracking-widest rounded-lg">
                    {productValue(product.brand)}
                  </span>
                  <span className="px-2.5 py-1 bg-[#ECEEF0] text-slate-800 text-xs font-semibold uppercase tracking-wider rounded-lg">
                    {productValue(product.categoryName)}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Mã SP: {productValue(product.sku)}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl text-slate-900 font-bold tracking-tight leading-snug mb-3">
                {product.name}
              </h1>

              <div className="pb-3 mb-4 border-b border-slate-100"><ProductRating product={product} /></div>

              {/* Pricing Card Highlight */}
              <div className="bg-[#F2F4F6] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl sm:text-3xl font-black text-secondary tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  {discountPercent && (
                    <span className="px-2 py-0.5 bg-secondary text-white text-xs font-bold rounded-full">
                      -{discountPercent}% OFF
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{product.inStock ? 'Còn hàng' : 'Hết hàng'}</span>
                </div>
              </div>

              <ProductSelections product={product} selectedVariantId={selectedVariantId} onVariantChange={setSelectedVariantId}
                selectedSize={isShoes ? selectedShoeSize : selectedApparelSize}
                onSizeChange={isShoes ? setSelectedShoeSize : setSelectedApparelSize} />
              <ProductBenefits product={product} />

              {/* QUANTITY COUNTER & ACTION BUTTONS CLUSTER */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 pt-2">
                {/* Stepper */}
                <div className="flex items-center bg-[#ECEEF0] rounded-xl p-1 shrink-0 w-full sm:w-auto justify-between">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-800 hover:bg-slate-100 font-bold transition-colors shadow-sm"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900 text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-800 hover:bg-slate-100 font-bold transition-colors shadow-sm"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart} disabled={!product.inStock || !selectedVariantId}
                  className="flex-1 w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{addedToast ? 'Đã thêm giỏ hàng!' : 'THÊM VÀO GIỎ HÀNG'}</span>
                </button>

                {/* Buy Now Crimson */}
                <button
                  type="button"
                  onClick={handleBuyNow} disabled={!product.inStock || !selectedVariantId}
                  className="flex-1 w-full sm:w-auto py-3.5 px-6 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-secondary/25 active:scale-95"
                >
                  <Bolt className="w-4 h-4" />
                  <span>MUA NGAY</span>
                </button>
              </div>

              {/* Cart Error Banner if reject */}
              {cartError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{cartError}</span>
                </div>
              )}

              {/* Auxiliary Compare & Share Links */}
              <div className="flex items-center justify-between text-xs text-slate-600 mb-6 pt-1">
                <div className="flex items-center gap-6">
                  {isRacket && (
                    <button
                      type="button"
                      onClick={() => toggleRacket(product)}
                      className="flex items-center gap-1.5 hover:text-secondary transition-colors font-medium"
                    >
                      <Layers className="w-4 h-4 text-royal" />
                      <span>{isComparing ? 'Đã chọn so sánh (bỏ)' : 'So sánh thông số kỹ thuật'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1.5 hover:text-secondary transition-colors font-medium"
                  >
                    <Share2 className="w-4 h-4 text-slate-400" />
                    <span>{shareToast ? 'Đã sao chép liên kết!' : 'Chia sẻ thông số'}</span>
                  </button>
                  {shareError && <p role="alert" className="text-xs text-red-700">{shareError}</p>}
                </div>
                {isShoes && (
                  <span className="font-semibold text-slate-700">
                    Đối chiếu kích cỡ và thông số của từng mẫu trước khi đặt hàng.
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#F2F4F6] rounded-2xl p-4 text-xs text-slate-600">
              Kiểm tra thông số và kích cỡ trước khi đặt hàng. Liên hệ cửa hàng để xác nhận thông tin còn thiếu.
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* TECHNOLOGICAL TABS & COMPREHENSIVE SPECIFICATIONS SECTION                */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12" id="tech-specs">

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 mb-6">
            {[
              { key: 'description', label: 'Mô tả chi tiết' },
              { key: 'specs', label: 'Thông số kỹ thuật' },
              { key: 'reviews', label: `Đánh giá & Nhận xét (${product.reviewCount ?? 0})` }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'bg-[#F2F4F6] text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: MÔ TẢ CHI TIẾT & CÔNG NGHỆ */}
          {activeTab === 'description' && <ProductDescription product={product} />}

          {/* TAB 2: THÔNG SỐ KỸ THUẬT (BWF SPEC SHEET) */}
          {activeTab === 'specs' && <ProductSpecifications product={product} />}

          {/* TAB 3: ĐÁNH GIÁ & NHẬN XÉT */}
          {activeTab === 'reviews' && (
            <div className="space-y-8 max-w-4xl">

              {/* Form Submit Review */}
              <form onSubmit={handleReviewSubmit} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <span className="font-bold text-xs text-slate-900 block">Viết đánh giá của bạn về sản phẩm:</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-slate-600">Đánh giá sao:</span>
                  <div className="flex items-center gap-1 text-amber-500 cursor-pointer">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="hover:scale-125 transition-transform p-0.5"
                      >
                        <Star className={`w-4 h-4 ${star <= newRating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  required
                  maxLength={2000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận về lực smash, độ êm hoặc cảm giác thi đấu thực tế..."
                  className="w-full bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-secondary"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-6 py-2.5 bg-secondary hover:bg-secondary-hover text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md active:scale-95"
                  >
                    {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                  {reviewSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Đánh giá đã được ghi nhận thành công!
                    </span>
                  )}
                  {reviewError && (
                    <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {reviewError}
                    </span>
                  )}
                </div>
              </form>

              {/* Review List */}
              <ProductReviewList product={product} reviews={reviews} error={reviewsError} loading={reviewsLoading} onRetry={retryReviews} />
            </div>
          )}

          {/* TAB 4: HỎI ĐÁP CHUYÊN GIA BWF */}

        </section>

        {/* ========================================================================= */}
        {/* RELATED PRODUCTS / SAME COLLECTION CAROUSEL SECTION                      */}
        {/* ========================================================================= */}
        {relatedProducts.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Tournament Collection</span>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Sản Phẩm Cùng Danh Mục
                </h2>
              </div>
              <Link to="/products" className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-blue-700 transition-colors">
                <span>Xem tất cả thiết bị</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* SIZE GUIDE MODAL (FOR SHOES & APPAREL) */}

      {/* ZOOM / LIGHTBOX IMAGE MODAL */}
      {zoomModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomModal(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-white pb-3 px-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate max-w-md">
                  {product.name}
                </span>
                {galleryImages.length > 1 && (
                  <span className="px-2 py-0.5 rounded bg-white/20 text-xs font-mono font-bold shrink-0">
                    {activeImage + 1} / {galleryImages.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomModal(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stage */}
            <div className="relative w-full flex items-center justify-center bg-white rounded-2xl p-6 sm:p-10 shadow-2xl overflow-hidden min-h-[350px]">
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-md z-10"
                  title="Ảnh trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <ProductImage
                src={galleryImages[activeImage] || galleryImages[0]}
                alt={product.name}
                className="max-h-[75vh] w-auto max-w-full"
                imgClassName="max-h-[75vh] w-auto max-w-full object-contain"
              />

              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImage((prev) => (prev + 1) % galleryImages.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-all shadow-md z-10"
                  title="Ảnh kế tiếp"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetailPage;
