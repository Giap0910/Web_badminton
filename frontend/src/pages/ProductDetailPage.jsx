import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { formatPrice } from '../utils/formatters';
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
  CheckCircle2,
  Heart,
  ZoomIn,
  Home,
  ChevronRight,
  Wrench,
  Gauge,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Selected specs
  const [selectedColor, setSelectedColor] = useState('Đỏ Kurenai');
  const [selectedWeightGrip, setSelectedWeightGrip] = useState('4U - G5');
  const [selectedStringService, setSelectedStringService] = useState('BG65Ti (28 lbs)');
  const [selectedShoeSize, setSelectedShoeSize] = useState('41');
  const [selectedApparelSize, setSelectedApparelSize] = useState('L');
  const [addedToast, setAddedToast] = useState(false);

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

  const catUpper = (product?.categoryName || product?.category || '').toUpperCase();
  const isShoes = catUpper.includes('SHOE') || catUpper.includes('GIÀY');
  const isApparel = catUpper.includes('APPAREL') || catUpper.includes('ÁO') || catUpper.includes('QUẦN');
  const isRacket = !isShoes && !isApparel;

  const getProductOptions = () => {
    if (isShoes) {
      return { size: selectedShoeSize };
    }
    if (isApparel) {
      return { size: selectedApparelSize };
    }
    return {
      selectedWeightGrip,
      selectedStringService,
    };
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity, getProductOptions());
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, quantity, getProductOptions());
    navigate('/checkout');
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [prodData, reviewData, allProds] = await Promise.all([
          productApi.getProductById(id),
          reviewApi.getProductReviews(id),
          productApi.getProducts({})
        ]);
        setProduct(prodData);
        setReviews(reviewData || []);
        
        // Related products
        const list = Array.isArray(allProds) ? allProds : (allProds?.content || []);
        const filtered = list.filter(p => p.id !== Number(id)).slice(0, 4);
        setRelatedProducts(filtered);
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

  if (loading) {
    return (
      <div className="max-w-[80rem] mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đang tải thông số kỹ thuật sản phẩm...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">Không tìm thấy sản phẩm này!</h2>
        <p className="text-xs text-slate-500">Sản phẩm có thể đã ngừng kinh doanh hoặc đường dẫn không chính xác.</p>
        <Link to="/products" className="inline-block px-5 py-2.5 bg-secondary text-white rounded-lg font-bold text-xs">
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  const inStock = product.stock === undefined || product.stock > 0;
  
  // Prepare gallery images
  const images = (product.imageUrls && product.imageUrls.length > 0) 
    ? product.imageUrls 
    : [product.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOFwZT1UJx5nkitITNFAjiR7oN1GVOk7tVqfi8VhTpi_UNiYyGmzZchQLR-OHFtbD6abTEHZ1tJeE3F9Ch-Sd5BalslPXTcg-0xfOsJI4H0MzHYnEGOCBg3H41UP0-a7I9elHE07OCDNkyrEKbdAtjgKbL6AAAZffbfOc0QBd8cLbdKs69D4qza-BkpsRhooyHwD-6K0zhrsEZs-tn7-0ACwfqU-7-NeA74IadD4DbLOFHRE7-iO06'];

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC]">
      
      {/* Top Breadcrumb */}
      <div className="w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-secondary flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link to="/products" className="hover:text-secondary">
            {product.categoryName || 'Sản phẩm cầu lông'}
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold truncate max-w-sm">{product.name}</span>
        </div>
      </div>

      <main className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
        
        {/* Product Main Stage (2 Columns Asymmetric) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-xl p-6 sm:p-8 border border-[#E2E8F0] shadow-card-rest">
          
          {/* Left Column: Gallery (6 cols) */}
          <div className="lg:col-span-6 flex flex-col-reverse md:flex-row gap-4">
            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex md:flex-col gap-2 shrink-0 overflow-x-auto pb-2 md:pb-0">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-20 md:w-20 md:h-24 rounded-lg bg-slate-50 p-1 flex items-center justify-center border transition-all ${
                      selectedImageIndex === idx
                        ? 'border-secondary ring-2 ring-secondary/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} className="max-h-full max-w-full object-contain pointer-events-none" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Stage Image with Badges */}
            <div className="flex-1 relative bg-slate-50/80 rounded-xl flex items-center justify-center min-h-[380px] lg:min-h-[500px] p-6 border border-slate-100 overflow-hidden group">
              {/* Top Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                <span className="px-2.5 py-1 bg-[#0F172A] text-white text-[11px] font-bold uppercase tracking-wider rounded-md shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                  Chính Hãng Phân Phối
                </span>
                <span className="px-2.5 py-1 bg-secondary text-white text-[11px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                  Top Performance
                </span>
              </div>

              {/* Action Buttons (Favorite & Zoom) */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="w-9 h-9 rounded-full bg-white text-slate-700 hover:text-secondary shadow-md flex items-center justify-center transition-colors"
                  title="Lưu yêu thích"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-secondary text-secondary' : ''}`} />
                </button>
              </div>

              {/* Watermark */}
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-widest pointer-events-none select-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Authentic BWF Standard</span>
              </div>

              {/* Active Hero Image */}
              <img
                src={images[selectedImageIndex] || images[0]}
                alt={product.name}
                className="max-h-[420px] w-auto object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Right Column: Specs & Purchasing Architecture (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Brand & SKU */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#0F172A] text-white text-xs font-bold uppercase tracking-widest rounded-md">
                    {product.brand || 'CHÍNH HÃNG'}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider rounded-md">
                    PRO TOURNAMENT
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">MÃ: #{product.id}</span>
              </div>

              {/* Product Title */}
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & Sales metrics */}
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-1">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-900 ml-1">
                    {product.averageRating ? product.averageRating.toFixed(1) : '5.0'}
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{product.reviewCount || reviews.length || 88} Đánh giá</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-600 font-semibold">Đã bán 350+</span>
              </div>

              {/* Pricing Card Highlight */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-secondary tracking-tight">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  {discountPercent && (
                    <span className="px-2 py-0.5 bg-secondary text-white text-[11px] font-bold rounded-full">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={`w-2.5 h-2.5 rounded-full ${inStock ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className={inStock ? 'text-slate-800' : 'text-rose-600'}>
                    {inStock ? `Còn hàng (Tồn kho: ${product.stock})` : 'Tạm hết hàng'}
                  </span>
                </div>
              </div>

              {/* Category-Adaptive Core Specs Highlight Pills */}
              {isRacket && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Điểm cân bằng</span>
                    <span className="font-bold text-slate-900">{product.balancePoint || '303mm (Head Heavy)'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Độ cứng thân</span>
                    <span className="font-bold text-slate-900">{product.stiffness || 'Extra Stiff'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Sức căng max</span>
                    <span className="font-bold text-slate-900">{product.maxTension || '28 - 30 LBS'}</span>
                  </div>
                </div>
              )}

              {isShoes && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Công nghệ đệm</span>
                    <span className="font-bold text-slate-900">Power Cushion+</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Mặt đế</span>
                    <span className="font-bold text-slate-900">Hexagrip bám sàn</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Form chân</span>
                    <span className="font-bold text-slate-900">Ergoshape 3E</span>
                  </div>
                </div>
              )}

              {isApparel && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Chất liệu</span>
                    <span className="font-bold text-slate-900">100% Poly Quick-Dry</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Thoát mồ hôi</span>
                    <span className="font-bold text-slate-900">VeryCool Giảm 3°C</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[11px]">Độ co giãn</span>
                    <span className="font-bold text-slate-900">Co giãn 4 chiều</span>
                  </div>
                </div>
              )}

              {/* Dynamic Option Selectors */}
              {isRacket && (
                <>
                  {/* Weight / Grip Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Trọng lượng & Chu vi cán (Weight / Grip):</span>
                      <Link to="/compare" className="text-secondary hover:underline font-semibold">
                        Xem so sánh
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['3U - G5 (88g Smash)', '4U - G5 (83g Chuẩn)', '5U (78g Nhẹ)'].map((spec) => (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => setSelectedWeightGrip(spec)}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                            selectedWeightGrip === spec
                              ? 'bg-[#0F172A] text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Stringing Option */}
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-royal">
                        <Wrench className="w-4 h-4" />
                        <span>Dịch vụ căng cước chuẩn BWF Tournament</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-bold">Miễn phí công đan</span>
                    </div>
                    <select
                      value={selectedStringService}
                      onChange={(e) => setSelectedStringService(e.target.value)}
                      className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-royal"
                    >
                      <option value="BG65Ti (28 lbs)">Cước Yonex BG65Ti (Titanium nổ cầu, căng 28 lbs)</option>
                      <option value="BG80 Power (29 lbs)">Cước Yonex BG80 Power (Smash uy lực, căng 29 lbs)</option>
                      <option value="Exbolt 65 (27 lbs)">Cước Yonex Exbolt 65 (Phục hồi nhanh, căng 27 lbs)</option>
                      <option value="Khung Vợt Chưa Căng">Không căng cước (Nhận khung vợt nguyên bản)</option>
                    </select>
                  </div>
                </>
              )}

              {isShoes && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Chọn Size Giày Cầu Lông (EU):</span>
                    <span className="text-secondary text-[11px] font-semibold">Bảng đo size chuẩn</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {['39', '40', '41', '42', '43', '44'].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedShoeSize(size)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                          selectedShoeSize === size
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isApparel && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Chọn Kích Cỡ Áo / Quần Thi Đấu:</span>
                    <span className="text-secondary text-[11px] font-semibold">Bảng số đo cơ thể</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedApparelSize(size)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all text-center ${
                          selectedApparelSize === size
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toast confirmation */}
              {addedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã thêm vào giỏ hàng thành công với thông số bạn đã chọn!</span>
                </div>
              )}

              {/* Quantity & CTA Cluster */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-slate-300 rounded-lg p-1 bg-white shrink-0 w-full sm:w-auto justify-between">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-slate-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className="flex-1 w-full py-3 px-4 rounded-lg bg-secondary hover:bg-secondary-hover text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-secondary/30 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Thêm Vào Giỏ Hàng</span>
                </button>

                {/* Buy Now */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!inStock}
                  className="flex-1 w-full py-3 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50 transition-all"
                >
                  <span>Mua Ngay</span>
                </button>
              </div>

              {/* Compare Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => toggleRacket(product)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    isComparing
                      ? 'bg-royal text-white border-royal shadow-sm'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{isComparing ? 'Đã thêm vào bảng so sánh (Click để bỏ)' : 'Thêm cây này vào danh sách so sánh'}</span>
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* Specifications & Description Tabs */}
        <section className="bg-white rounded-xl p-6 sm:p-8 border border-[#E2E8F0] shadow-card-rest space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center gap-4">
            <h2 className="font-display text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Gauge className="w-5 h-5 text-secondary" />
              <span>Bảng Thông Số Kỹ Thuật Chi Tiết</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Thương hiệu</span>
              <span className="font-bold text-slate-900">{product.brand || 'Yonex Japan'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Trọng lượng / Chu vi cán</span>
              <span className="font-bold text-slate-900">{product.weightGrip || '3U/4U - G5'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Điểm cân bằng</span>
              <span className="font-bold text-slate-900">{product.balancePoint || 'Head-Heavy (Nặng đầu)'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Độ cứng đũa vợt</span>
              <span className="font-bold text-slate-900">{product.stiffness || 'Extra Stiff'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Sức căng tối đa</span>
              <span className="font-bold text-slate-900">{product.maxTension || '28 - 30 LBS'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Lối chơi sở trường</span>
              <span className="font-bold text-slate-900">{product.playStyle || 'Tấn công dồn dập, smash cắm'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Vật liệu khung</span>
              <span className="font-bold text-slate-900">HM Graphite + Namd + Tungsten</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Chính sách bảo hành</span>
              <span className="font-bold text-emerald-600">90 Ngày 1 đổi 1 lỗi nhà sản xuất</span>
            </div>
          </div>

          {/* Description text */}
          {product.description && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Mô tả sản phẩm</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </section>

        {/* Customer Reviews Section */}
        <section className="bg-white rounded-xl p-6 sm:p-8 border border-[#E2E8F0] shadow-card-rest space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-secondary" />
              <span>Đánh Giá Từ Khách Hàng ({reviews.length})</span>
            </h2>
          </div>

          {/* Write Review Form */}
          {isAuthenticated ? (
            <form onSubmit={handleReviewSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Viết đánh giá của bạn
              </span>

              {reviewSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đánh giá của bạn đã được gửi thành công!</span>
                </div>
              )}

              {reviewError && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{reviewError}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Đánh giá sao:</span>
                <div className="flex gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-0.5 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-5 h-5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cảm nhận thực tế về độ đầm tay, cảm giác cầu hoặc dịch vụ căng cước..."
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-royal focus:ring-2 focus:ring-royal/15"
              />

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{reviewSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}</span>
              </button>
            </form>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Đăng nhập để viết đánh giá và nhận điểm tích lũy đổi quà</span>
              <Link to="/login" className="px-3 py-1.5 bg-[#0F172A] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {/* Review List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên trải nghiệm!</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {rev.userFullName || rev.username || 'Khách hàng'}
                      </span>
                      <div className="flex text-amber-400">
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 uppercase tracking-tight">
                Sản Phẩm Tương Tự
              </h2>
              <Link to="/products" className="text-xs text-secondary font-bold hover:underline">
                Xem tất cả
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

      </main>

    </div>
  );
};

export default ProductDetailPage;
