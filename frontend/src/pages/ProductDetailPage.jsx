import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { 
  ShoppingCart, 
  Layers, 
  Check, 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  CheckCircle2,
  Heart,
  ZoomIn,
  Home,
  ChevronRight,
  Wrench,
  Gauge,
  Bolt,
  Share2,
  QrCode,
  HelpCircle,
  MessageSquare,
  Send,
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
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('description'); // 'description' | 'specs' | 'reviews' | 'qa'

  // Variant selections
  const [selectedColor, setSelectedColor] = useState('Đỏ Kurenai');
  const [selectedWeightGrip, setSelectedWeightGrip] = useState('4U - G5');
  const [selectedStringService, setSelectedStringService] = useState('Căng sẵn Yonex BG65Ti (Lực căng 10.5kg / 23lbs - Miễn phí công BWF)');
  const [selectedShoeSize, setSelectedShoeSize] = useState('41');
  const [selectedApparelSize, setSelectedApparelSize] = useState('L');
  const [addedToast, setAddedToast] = useState(false);

  // Review form
  const [newRating, setNewRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const { addToCart } = useCart();
  const { toggleRacket, isInComparison } = useCompare();
  const { isAuthenticated } = useAuth();

  const isComparing = product ? isInComparison(product.id) : false;

  const catStr = (product?.categoryName || product?.category || product?.name || '').toUpperCase();
  const isShoes = catStr.includes('SHOE') || catStr.includes('GIÀY');
  const isApparel = catStr.includes('APPAREL') || catStr.includes('ÁO') || catStr.includes('QUẦN');
  const isBag = catStr.includes('BAG') || catStr.includes('BAO') || catStr.includes('BALO') || catStr.includes('TÚI');
  const isRacket = !isShoes && !isApparel && !isBag;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [prodData, reviewData, allProds] = await Promise.all([
          productApi.getProductById(id),
          reviewApi.getProductReviews(id).catch(() => []),
          productApi.getProducts({}).catch(() => [])
        ]);
        setProduct(prodData);
        setReviews(Array.isArray(reviewData) ? reviewData : []);
        
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
    window.scrollTo(0, 0);
  }, [id]);

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getProductOptions = () => {
    if (isShoes) return { size: selectedShoeSize, color: selectedColor };
    if (isApparel) return { size: selectedApparelSize, color: selectedColor };
    if (isBag) return { color: selectedColor };
    return {
      weightGrip: selectedWeightGrip,
      stringService: selectedStringService,
      color: selectedColor
    };
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity, getProductOptions());
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product, quantity, getProductOptions());
    navigate('/checkout');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setReviewSubmitting(true);
    try {
      const newRev = await reviewApi.createReview({
        productId: product.id,
        rating: newRating,
        comment: comment.trim()
      });
      setReviews([newRev, ...reviews]);
      setComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err) {
      console.warn('Gửi review qua API thất bại, lưu tạm local:', err);
      const fallbackRev = {
        id: Date.now(),
        rating: newRating,
        comment: comment.trim(),
        userFullName: 'Khách hàng',
        createdAt: new Date().toISOString()
      };
      setReviews([fallbackRev, ...reviews]);
      setComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[80rem] mx-auto px-4 py-24 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đang tải chi tiết thiết bị thi đấu...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900">Không tìm thấy thông tin sản phẩm!</h2>
        <p className="text-xs text-slate-500">Sản phẩm này có thể đã chuyển danh mục hoặc không tồn tại.</p>
        <Link to="/products" className="inline-block px-5 py-2.5 bg-secondary text-white rounded-lg font-bold text-xs">
          Quay lại danh mục sản phẩm
        </Link>
      </div>
    );
  }

  const galleryImages = [
    product.imageUrl,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCFBmenY63wmgZ4wg0GyAKWFdtFDlCP70iFakba_YL55SKkdbmNqPF3jW-EMZiWcwdfScOambxaG39rZ02yb6QKRy-q6cQialcQ9BxDXg8bapNbiUxVle3jjdQtyJIfFz22Umwhgspvzw474dD8x97tF5MfSr5r9Ln_yLMexIuwDDUz7Hx8fpLyohyp1n2mwl__ELun-PtfzqAhmhVC-MwgXFOmDASfd9dNGAV1A7y4HRk6O2V34V-u',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDI8-fLRhjWEOST87SL_dTRubiUU7xFHqkxq07c6U87MUGuzpJPOXELAySggE_TaYAxk8SipyZy6tFuhdoW_9u3LC0Gsnr0qcVEHJ5TmiCF9R6zIkqDVDQjewMnSyFiVSoFT66SKhZtpx6IV8ARv4UpHUrsZFp2Ig6jbdsowq2X1EPXPp05EnoSqVg7O38CrG-X0XUPQZl4jHZEVkxfBJwRxcrVnOaAp0DfSmAu6BEa9n9Fi_PIXGvO',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDT6kzmp2Vu8APo3xMFwK6vAHJ6QYM7LPwC1nkeXXeWe2MNtaAwkKZcyd103SShm4Ht72x70aTRg9gOBogxxCJJm9HoBU8c0ls3kWbwSrgtRnCUDXLCmbvduCkWCXj__q0GiDBUbSSsXgOcbYRPs-QYWvIAQTP_22yjegIzospVHXHrBqj1m2LzdghVcByat_a_NeXxuwM7YAOXQqsVPsRDjfZr2UDvDeJZmDwidFEjxom0GQsPHqwe'
  ];

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="w-full bg-[#F8FAFC] py-6">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Section */}
        <nav className="flex items-center gap-1.5 py-3 text-xs text-slate-500 overflow-x-auto whitespace-nowrap mb-4">
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

        {/* PRODUCT MAIN STAGE (2 Columns Asymmetric) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0]">
          
          {/* Left Column: Gallery & Angle Shots (5 cols) */}
          <div className="lg:col-span-6 flex flex-col-reverse md:flex-row gap-4">
            
            {/* Thumbnail Strip */}
            <div className="flex md:flex-col gap-2 shrink-0 overflow-x-auto pb-2 md:pb-0">
              {galleryImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(index)}
                  className={`w-16 h-20 md:w-20 md:h-24 rounded-lg bg-[#F2F4F6] p-1.5 flex items-center justify-center transition-all border ${
                    activeImage === index
                      ? 'border-secondary shadow-sm ring-1 ring-secondary'
                      : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>

            {/* Main Stage Image with Badges */}
            <div className="flex-1 relative bg-[#F2F4F6] rounded-xl flex items-center justify-center min-h-[380px] lg:min-h-[520px] p-6 overflow-hidden group">
              
              {/* Badges on top-left */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                <span className="px-3 py-1 bg-[#0F172A] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                  Chính Hãng Phân Phối
                </span>
                <span className="px-3 py-1 bg-secondary text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm">
                  Top Smash Speed
                </span>
              </div>

              {/* Actions top-right */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="w-9 h-9 rounded-full bg-white text-slate-700 hover:text-secondary shadow-md flex items-center justify-center transition-colors"
                  title="Lưu yêu thích"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-secondary text-secondary' : ''}`} />
                </button>
              </div>

              {/* Authentic Watermark */}
              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-slate-400 font-mono text-[11px] uppercase tracking-widest select-none pointer-events-none opacity-80">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Authentic BWF Approved</span>
              </div>

              {/* Active Hero Image */}
              <img 
                src={galleryImages[activeImage]} 
                alt={product.name} 
                className="max-h-[440px] w-auto object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              />
            </div>

          </div>

          {/* Right Column: Specs & Purchasing Architecture (7 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              {/* Brand line & SKU */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#131B2E] text-white text-xs font-bold uppercase tracking-widest rounded-lg">
                    {product.brand || 'APEX PRO'}
                  </span>
                  <span className="px-2.5 py-1 bg-[#ECEEF0] text-slate-800 text-xs font-semibold uppercase tracking-wider rounded-lg">
                    PRO TOURNAMENT SERIES
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  SKU: {product.brand ? product.brand.substring(0, 3).toUpperCase() : 'BWF'}-{product.id * 117}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl text-slate-900 font-bold tracking-tight leading-snug mb-3">
                {product.name}
              </h1>

              {/* Rating & Sales */}
              <div className="flex items-center gap-2 text-xs text-slate-500 pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="font-bold text-slate-900">{product.averageRating || '5.0'}</span>
                </div>
                <span className="text-slate-300">/</span>
                <span>{reviews.length || 186} Đánh giá</span>
                <span className="text-slate-300">/</span>
                <span>420 Đã bán toàn cầu</span>
              </div>

              {/* Pricing Card Highlight */}
              <div className="bg-[#F2F4F6] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 mb-6">
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
                      -{discountPercent}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Còn hàng (Kho Hà Nội & TP.HCM)</span>
                </div>
              </div>

              {/* 1. Color Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-bold text-slate-900">Phiên bản màu sắc:</span>
                  <span className="text-secondary font-semibold">{selectedColor}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedColor('Đỏ Kurenai')}
                    className={`w-9 h-9 rounded-full bg-secondary flex items-center justify-center shadow-sm transition-transform ${
                      selectedColor === 'Đỏ Kurenai' ? 'ring-2 ring-offset-2 ring-secondary scale-110' : ''
                    }`}
                    title="Đỏ Kurenai"
                  >
                    {selectedColor === 'Đỏ Kurenai' && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedColor('Dark Navy')}
                    className={`w-9 h-9 rounded-full bg-[#131B2E] flex items-center justify-center shadow-sm transition-transform ${
                      selectedColor === 'Dark Navy' ? 'ring-2 ring-offset-2 ring-[#131B2E] scale-110' : ''
                    }`}
                    title="Dark Navy"
                  >
                    {selectedColor === 'Dark Navy' && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedColor('Trắng Bạc')}
                    className={`w-9 h-9 rounded-full bg-[#E0E3E5] border border-slate-300 flex items-center justify-center shadow-sm transition-transform ${
                      selectedColor === 'Trắng Bạc' ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    }`}
                    title="Trắng Bạc"
                  >
                    {selectedColor === 'Trắng Bạc' && <Check className="w-4 h-4 text-slate-800" />}
                  </button>
                </div>
              </div>

              {/* 2. DYNAMIC VARIANT SELECTORS: FOR RACKETS */}
              {isRacket && (
                <>
                  {/* Weight / Grip Matrix (3 ô theo thiết kế) */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-900">Trọng lượng & Chu vi cán (Weight / Grip):</span>
                      <a href="#tech-specs" className="text-secondary hover:underline font-semibold">
                        Hướng dẫn chọn thông số
                      </a>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { label: '3U - G5', desc: '88g (Smash tối đa)' },
                        { label: '4U - G5', desc: '83g (Phổ thông)' },
                        { label: '4U - G6', desc: '83g (Cán tay nhỏ)' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setSelectedWeightGrip(item.label)}
                          className={`py-2.5 px-3 rounded-xl text-center transition-all border ${
                            selectedWeightGrip === item.label
                              ? 'bg-[#131B2E] text-white border-[#131B2E] shadow-md'
                              : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="font-bold text-xs">{item.label}</div>
                          <div className={`text-[10px] ${selectedWeightGrip === item.label ? 'text-slate-300' : 'text-slate-500'}`}>
                            {item.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fast Core Specs Highlight Pill Bar */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#F2F4F6] rounded-xl mb-5 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Điểm cân bằng</span>
                      <span className="font-bold text-slate-900">{product.balancePoint || '303mm (Head Heavy)'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Độ cứng đũa</span>
                      <span className="font-bold text-slate-900">{product.stiffness || 'Extra Stiff (Cực cứng)'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Sức căng tối đa</span>
                      <span className="font-bold text-slate-900">20 - 28 lbs (BWF)</span>
                    </div>
                  </div>

                  {/* Custom Stringing Service Dropdown Selector */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-900 mb-1.5">
                      Dịch vụ đan cước theo yêu cầu thi đấu:
                    </label>
                    <select
                      value={selectedStringService}
                      onChange={(e) => setSelectedStringService(e.target.value)}
                      className="w-full bg-white text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium border border-slate-200 focus:outline-none focus:border-royal shadow-sm"
                    >
                      <option value="Căng sẵn Yonex BG65Ti (Lực căng 10.5kg / 23lbs - Miễn phí công BWF)">
                        Căng sẵn Yonex BG65Ti (Lực căng 10.5kg / 23lbs - Miễn phí công BWF)
                      </option>
                      <option value="Căng sẵn Yonex Aerobite Pro Hybrid (Lực căng 11kg / 24.5lbs)">
                        Căng sẵn Yonex Aerobite Pro Hybrid (Lực căng 11kg / 24.5lbs)
                      </option>
                      <option value="Căng sẵn Yonex Exbolt 65 (Nảy trợ lực - 10.8kg / 24lbs)">
                        Căng sẵn Yonex Exbolt 65 (Nảy trợ lực - 10.8kg / 24lbs)
                      </option>
                      <option value="Không căng cước (Nhận khung vợt mộc & tặng kèm cước nguyên tem)">
                        Không căng cước (Nhận khung vợt mộc & tặng kèm cước nguyên tem)
                      </option>
                    </select>
                  </div>
                </>
              )}

              {/* 2. DYNAMIC VARIANT SELECTORS: FOR SHOES */}
              {isShoes && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-bold text-slate-900">Size Giày (EU):</span>
                    <span className="text-secondary font-semibold">Bảng đo chiều dài bàn chân</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-xs mb-4">
                    {['39', '40', '40.5', '41', '42', '42.5', '43', '44', '45'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedShoeSize(sz)}
                        className={`py-2 rounded-lg font-bold transition-all text-center ${
                          selectedShoeSize === sz
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>

                  {/* Shoe Specs Bar */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#F2F4F6] rounded-xl text-xs">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Đệm đế giữa</span>
                      <span className="font-bold text-slate-900">Power Cushion+</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Mặt đế ngoài</span>
                      <span className="font-bold text-slate-900">Radial Blade Sole</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Chống lật</span>
                      <span className="font-bold text-slate-900">Carbon 3D Plate</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DYNAMIC VARIANT SELECTORS: FOR APPAREL */}
              {isApparel && (
                <div className="mb-5">
                  <span className="block text-xs font-bold text-slate-900 mb-2">Size Trang Phục:</span>
                  <div className="grid grid-cols-5 gap-2 text-xs mb-4">
                    {['S', 'M', 'L', 'XL', '2XL'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedApparelSize(sz)}
                        className={`py-2 rounded-lg font-bold transition-all text-center ${
                          selectedApparelSize === sz
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Counter & CTA Actions Cluster */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 pt-2">
                {/* Quantity Box */}
                <div className="flex items-center bg-[#ECEEF0] rounded-xl p-1 shrink-0 w-full sm:w-auto justify-between">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-800 hover:bg-slate-100 font-bold"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900 text-sm">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white text-slate-800 hover:bg-slate-100 font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4 text-secondary" />
                  <span>{addedToast ? 'Đã thêm vào giỏ!' : 'Thêm giỏ hàng'}</span>
                </button>

                {/* Buy Now Crimson */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 w-full sm:w-auto py-3.5 px-6 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-secondary/25 active:scale-95"
                >
                  <Bolt className="w-4 h-4" />
                  <span>MUA NGAY</span>
                </button>
              </div>

              {/* Micro Actions: So sánh & Chia sẻ */}
              <div className="flex items-center gap-6 mb-6 text-xs text-slate-600">
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
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert('Đã sao chép liên kết thông số sản phẩm!');
                  }}
                  className="flex items-center gap-1.5 hover:text-secondary transition-colors font-medium"
                >
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>Chia sẻ thông số</span>
                </button>
              </div>
            </div>

            {/* Trust Badges & Guarantee Container (3 Perks Chuẩn Thiết Kế) */}
            <div className="bg-[#F2F4F6] rounded-xl p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Truck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Giao hàng hỏa tốc 2H</span>
                  <span className="text-slate-500">Áp dụng nội thành Hà Nội & TP.HCM. Chuyển phát bảo hiểm toàn quốc 2-3 ngày.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Bảo hành chính hãng 12 Tháng</span>
                  <span className="text-slate-500">1 đổi 1 trong vòng 30 ngày nếu phát sinh lỗi cấu trúc từ nhà sản xuất.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <QrCode className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">Tem chống giả Sunrise Sports & BWF QR</span>
                  <span className="text-slate-500">Kiểm định trực tiếp mã vạch cào laser phân phối độc quyền tại Việt Nam.</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 4 TECHNOLOGICAL TABS (Full Width) */}
        <section className="mt-10 bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0]" id="tech-specs">
          {/* Tab Headers */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
            {[
              { key: 'description', label: 'Mô tả chi tiết' },
              { key: 'specs', label: 'Thông số kỹ thuật' },
              { key: 'reviews', label: `Đánh giá & Nhận xét (${reviews.length})` },
              { key: 'qa', label: 'Hỏi đáp chuyên gia BWF' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#131B2E] text-white shadow-sm'
                    : 'bg-[#F2F4F6] text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Detailed Description */}
          {activeTab === 'description' && (
            <div className="pt-6 max-w-4xl space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Sức Mạnh Đập Cầu Hủy Diệt & Khả Năng Cơ Động Tối Thượng
              </h3>
              <p>
                {product.description ||
                  `${product.name} là sản phẩm cao cấp phân phối chính hãng đạt tiêu chuẩn quốc tế BWF. Được thiết kế tối ưu cho các trận đấu căng thẳng với độ bền vượt trội, khả năng kiểm soát đường cầu chuẩn xác và cảm giác tiếp xúc cầu chân thực nhất.`}
              </p>
              <p>
                Trang bị các vật liệu graphite mô-đun siêu cao cùng cấu trúc khung khí động học tiên tiến, sản phẩm mang lại tốc độ vung vợt chớp nhoáng và lực smash cắm sân uy lực không thể cản phá.
              </p>
            </div>
          )}

          {/* Tab 2: Technical Specifications Table */}
          {activeTab === 'specs' && (
            <div className="pt-6 max-w-3xl">
              <table className="w-full text-xs text-left border-collapse">
                <tbody>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-700 w-1/3">Thương hiệu</td>
                    <td className="py-2.5 px-4 text-slate-900">{product.brand || 'Apex Badminton Pro'}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-bold text-slate-700">Tiêu chuẩn thi đấu</td>
                    <td className="py-2.5 px-4 text-slate-900">BWF Tournament Certified</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-700">Trọng lượng / Grip</td>
                    <td className="py-2.5 px-4 text-slate-900">{product.weightGrip || '4U - G5 (83g)'}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-bold text-slate-700">Điểm cân bằng</td>
                    <td className="py-2.5 px-4 text-slate-900">{product.balancePoint || 'Head-Heavy (Nặng đầu)'}</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-700">Độ cứng đũa</td>
                    <td className="py-2.5 px-4 text-slate-900">{product.stiffness || 'Extra Stiff'}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-bold text-slate-700">Mức căng dây khuyến nghị</td>
                    <td className="py-2.5 px-4 text-slate-900">20 - 28 lbs (Tối đa 30 lbs)</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-700">Xuất xứ</td>
                    <td className="py-2.5 px-4 text-slate-900">Nhật Bản / Đài Loan chính ngạch</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Reviews */}
          {activeTab === 'reviews' && (
            <div className="pt-6 space-y-6">
              {/* Form submit review */}
              <form onSubmit={handleReviewSubmit} className="p-4 bg-[#F2F4F6] rounded-xl space-y-3 max-w-xl">
                <span className="font-bold text-xs text-slate-900 block">Viết đánh giá của bạn:</span>
                <div className="flex items-center gap-2 text-xs">
                  <span>Đánh giá:</span>
                  <div className="flex items-center gap-1 text-amber-500 cursor-pointer">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="hover:scale-125 transition-transform"
                      >
                        <Star className={`w-4 h-4 ${star <= newRating ? 'fill-amber-500' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận về lực smash, độ êm hoặc dịch vụ căng cước..."
                  className="w-full bg-white p-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-royal"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg text-xs font-bold uppercase transition-all shadow-sm"
                >
                  {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
                {reviewSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold block">
                    ✓ Cảm ơn bạn! Đánh giá đã được ghi nhận.
                  </span>
                )}
              </form>

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có đánh giá nào cho sản phẩm này.</p>
                ) : (
                  reviews.map((r, i) => (
                    <div key={r.id || i} className="p-4 border border-slate-100 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{r.userFullName || 'Vận động viên'}</span>
                        <div className="flex text-amber-500">
                          {[...Array(r.rating || 5)].map((_, s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-amber-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Q&A */}
          {activeTab === 'qa' && (
            <div className="pt-6 max-w-3xl space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block">Q: Cổ tay trung bình nên chọn bản 3U hay 4U?</span>
                <p className="text-slate-600">
                  A: Kỹ thuật viên BWF khuyến nghị người chơi phong trào và bán chuyên nên chọn bản 4U (83g) để đảm bảo độ linh hoạt xoay trở cổ tay trong các pha thủ cầu và phản tạt nhanh.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block">Q: Mức căng cước điện tử 4 nút có lợi ích gì hơn 2 nút?</span>
                <p className="text-slate-600">
                  A: Phương pháp 4 nút tiêu chuẩn BWF giúp lực căng dọc và ngang được phân bổ đồng đều, hạn chế tối đa nguy cơ méo khung hoặc biến dạng mặt vợt khi đập cầu lệch tâm.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <section className="mt-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold uppercase text-slate-900">
                Sản phẩm cùng phân khúc thi đấu
              </h2>
              <Link to="/products" className="text-xs font-bold text-secondary hover:underline uppercase">
                Xem tất cả
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default ProductDetailPage;
