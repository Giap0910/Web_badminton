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
  AlertCircle,
  Sparkles,
  ShoppingBag,
  Ruler,
  Lightbulb,
  X
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
  const [selectedGender, setSelectedGender] = useState('Nam');
  const [selectedCapacity, setSelectedCapacity] = useState('30L - 35L Tour');
  const [selectedPackaging, setSelectedPackaging] = useState('Vỉ 3 cuộn (Phổ biến)');
  const [addedToast, setAddedToast] = useState(false);
  const [sizeGuideModal, setSizeGuideModal] = useState(null); // 'shoes' | 'apparel' | null

  // Review form
  const [newRating, setNewRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const { addToCart } = useCart();
  const { toggleRacket, isInComparison } = useCompare();
  const { isAuthenticated } = useAuth();

  const isComparing = product ? isInComparison(product.id) : false;

  const catStr = (product?.categoryName || product?.category?.name || product?.category || '').toUpperCase();
  const prodName = (product?.name || '').toUpperCase();

  const isShoes = catStr.includes('SHOE') || catStr.includes('GIÀY') || prodName.includes('GIÀY') || Boolean(product?.soleType || product?.cushionTechnology);
  const isApparel = catStr.includes('APPAREL') || catStr.includes('ÁO') || catStr.includes('QUẦN') || catStr.includes('TRANG PHỤC') || catStr.includes('CLOTHING') || catStr.includes('VÁY') || prodName.includes('ÁO') || prodName.includes('QUẦN') || prodName.includes('VÁY') || Boolean(product?.fabricType);
  const isBag = catStr.includes('BAG') || catStr.includes('BAO') || catStr.includes('BALO') || catStr.includes('TÚI') || catStr.includes('BACKPACK') || prodName.includes('BALO') || prodName.includes('BAO VỢT') || prodName.includes('TÚI VỢT') || prodName.includes('TÚI') || prodName.includes('HOLDALL') || prodName.includes('BACKPACK') || Boolean(product?.bagType || product?.capacity || product?.racketCapacity);
  const isAccessories = catStr.includes('ACCESSOR') || catStr.includes('PHỤ KIỆN') || catStr.includes('CƯỚC') || catStr.includes('QUẤN CÁN') || catStr.includes('GRIP') || prodName.includes('CƯỚC') || prodName.includes('QUẤN CÁN') || prodName.includes('QUẢ CẦU') || prodName.includes('HỘP CẦU') || prodName.includes('DÂY CƯỚC') || prodName.includes('BĂNG CỔ TAY') || prodName.includes('BĂNG GỐI') || prodName.includes('TẤT') || prodName.includes('VỚ') || prodName.includes('BĂNG BẢO VỆ') || Boolean(product?.accessoryType);
  const isRacket = !isShoes && !isApparel && !isBag && !isAccessories;

  // Khởi tạo màu sắc mặc định theo từng loại sản phẩm
  useEffect(() => {
    if (isShoes) setSelectedColor('Trắng Đỏ Sunrise');
    else if (isApparel) setSelectedColor('Xanh Navy Đậm Phối Đỏ');
    else if (isBag) setSelectedColor('Đen Nhám / Đỏ');
    else if (isAccessories) setSelectedColor('Vàng Chanh (Yellow Neon)');
    else setSelectedColor('Đỏ Kurenai');
  }, [product?.id, isShoes, isApparel, isBag, isAccessories]);

  const getCategoryColors = () => {
    if (isShoes) {
      return [
        { name: 'Trắng Đỏ Sunrise', colorClass: 'bg-[#EF4444]', borderClass: 'border-slate-300' },
        { name: 'Xanh Navy Pro', colorClass: 'bg-[#131B2E]', borderClass: 'border-slate-700' },
        { name: 'Đen Neon', colorClass: 'bg-[#1E293B]', borderClass: 'border-slate-800' },
      ];
    }
    if (isApparel) {
      return [
        { name: 'Xanh Navy Đậm Phối Đỏ', colorClass: 'bg-[#131B2E]', borderClass: 'border-slate-700' },
        { name: 'Trắng Băng Tuyết', colorClass: 'bg-[#F8FAFC]', borderClass: 'border-slate-300', darkText: true },
        { name: 'Đỏ Laser Tour', colorClass: 'bg-secondary', borderClass: 'border-secondary' },
        { name: 'Xanh Mint Cyan', colorClass: 'bg-[#2DD4BF]', borderClass: 'border-teal-400' },
      ];
    }
    if (isBag) {
      return [
        { name: 'Đen Nhám / Đỏ', colorClass: 'bg-[#1E293B]', borderClass: 'border-slate-800' },
        { name: 'Xanh Navy / Trắng BWF', colorClass: 'bg-[#131B2E]', borderClass: 'border-slate-700' },
        { name: 'Xám Tro / Đen', colorClass: 'bg-[#64748B]', borderClass: 'border-slate-400' },
      ];
    }
    if (isAccessories) {
      return [
        { name: 'Vàng Chanh (Yellow Neon)', colorClass: 'bg-[#FACC15]', borderClass: 'border-amber-400', darkText: true },
        { name: 'Đen Matte', colorClass: 'bg-[#0F172A]', borderClass: 'border-slate-800' },
        { name: 'Trắng Tuyết', colorClass: 'bg-white', borderClass: 'border-slate-300', darkText: true },
        { name: 'Đỏ Kurenai', colorClass: 'bg-secondary', borderClass: 'border-secondary' },
        { name: 'Cam Neon', colorClass: 'bg-[#F97316]', borderClass: 'border-orange-400' },
      ];
    }
    return [
      { name: 'Đỏ Kurenai', colorClass: 'bg-secondary', borderClass: 'border-secondary' },
      { name: 'Dark Navy', colorClass: 'bg-[#131B2E]', borderClass: 'border-slate-700' },
      { name: 'Trắng Bạc', colorClass: 'bg-[#E0E3E5]', borderClass: 'border-slate-300', darkText: true },
    ];
  };

  const getProductOptions = () => {
    if (isShoes) return { size: selectedShoeSize, color: selectedColor };
    if (isApparel) return { gender: selectedGender, size: selectedApparelSize, color: selectedColor };
    if (isBag) return { capacity: selectedCapacity, color: selectedColor };
    if (isAccessories) return { packaging: selectedPackaging, color: selectedColor };
    return {
      weightGrip: selectedWeightGrip,
      stringService: selectedStringService,
      color: selectedColor
    };
  };

  const handleAddCombo = () => {
    addToCart(
      {
        id: 99901,
        name: 'Combo Thi Đấu Tiết Kiệm: Vỉ AC102EX + Cước Yonex BG65Ti Pro',
        price: 205000,
        originalPrice: 245000,
        imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=60',
        brand: 'Yonex',
        categoryName: 'Cước & Phụ Kiện'
      },
      1,
      { combo: 'Combo Tiết Kiệm 15%' }
    );
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

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
                  {getCategoryColors().map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`w-9 h-9 rounded-full ${c.colorClass} ${c.borderClass || ''} border flex items-center justify-center shadow-sm transition-transform ${
                        selectedColor === c.name ? 'ring-2 ring-offset-2 ring-secondary scale-110' : 'hover:scale-105'
                      }`}
                      title={c.name}
                    >
                      {selectedColor === c.name && (
                        <Check className={`w-4 h-4 ${c.darkText ? 'text-slate-800' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. DYNAMIC VARIANT SELECTORS: FOR RACKETS */}
              {isRacket && (
                <>
                  {/* Weight / Grip Matrix (2U/3U/4U/5U) */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-slate-900">Trọng lượng & Chu vi cán (Weight / Grip):</span>
                      <a href="#tech-specs" className="text-secondary hover:underline font-semibold">
                        Hướng dẫn chọn thông số U
                      </a>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '2U - G4', desc: '90-94g' },
                        { label: '3U - G5', desc: '85-89g' },
                        { label: '4U - G5', desc: '80-84g' },
                        { label: '5U - G6', desc: '75-79g' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setSelectedWeightGrip(item.label)}
                          className={`py-2 px-1 rounded-xl text-center transition-all border ${
                            selectedWeightGrip === item.label
                              ? 'bg-[#131B2E] text-white border-[#131B2E] shadow-md font-bold'
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
                      <span className="font-bold text-slate-900">{product.maxTension || '20 - 28 lbs (BWF)'}</span>
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
                    <span className="font-bold text-slate-900">Size Giày Thi Đấu (EU):</span>
                    <button
                      type="button"
                      onClick={() => setSizeGuideModal('shoes')}
                      className="inline-flex items-center gap-1 text-[#2563EB] hover:text-blue-700 font-semibold transition-colors group cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5 text-[#2563EB] group-hover:scale-110 transition-transform" />
                      <span>Hướng dẫn chọn size (Bảng đo chân)</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-xs mb-4">
                    {['39', '40', '40.5', '41', '42', '42.5', '43', '44', '45'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedShoeSize(sz)}
                        className={`py-2 rounded-lg font-bold transition-all text-center border ${
                          selectedShoeSize === sz
                            ? 'bg-secondary text-white border-secondary shadow-sm'
                            : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
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
                      <span className="font-bold text-slate-900">{product.cushionTechnology || 'Power Cushion+'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Mặt đế ngoài</span>
                      <span className="font-bold text-slate-900">{product.soleType || 'Radial Blade Sole'}</span>
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
                <div className="mb-5 space-y-4">
                  {/* Gender Switcher (Nam/Nữ) */}
                  <div>
                    <span className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                      Phân loại giới tính:
                    </span>
                    <div className="inline-flex p-1 bg-[#ECEEF0] rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedGender('Nam')}
                        className={`py-1.5 px-6 rounded-lg text-xs font-bold transition-all ${
                          selectedGender === 'Nam'
                            ? 'bg-[#131B2E] text-white shadow-sm'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        Nam
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedGender('Nữ')}
                        className={`py-1.5 px-6 rounded-lg text-xs font-bold transition-all ${
                          selectedGender === 'Nữ'
                            ? 'bg-[#131B2E] text-white shadow-sm'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        Nữ
                      </button>
                    </div>
                  </div>

                  {/* Size Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="font-bold text-slate-900 uppercase tracking-wider">Chọn Kích Thước (Size):</span>
                      <button
                        type="button"
                        onClick={() => setSizeGuideModal('apparel')}
                        className="inline-flex items-center gap-1 text-secondary hover:text-rose-700 font-semibold transition-colors group cursor-pointer"
                      >
                        <Ruler className="w-3.5 h-3.5 text-secondary group-hover:scale-110 transition-transform" />
                        <span>Bảng đo ngực & eo thi đấu</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      {['S', 'M', 'L', 'XL', '2XL'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedApparelSize(sz)}
                          className={`py-2 rounded-lg font-bold transition-all text-center border ${
                            selectedApparelSize === sz
                              ? 'bg-[#131B2E] text-white border-[#131B2E] shadow-sm'
                              : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 italic mt-1.5">
                      Gợi ý: VĐV cân nặng 64-68kg, chiều cao 1m68-1m72 mặc Size M chuẩn form ôm thi đấu.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. DYNAMIC VARIANT SELECTORS: FOR BAGS */}
              {isBag && (
                <div className="mb-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 uppercase tracking-wider">Dung tích / Kích cỡ chứa:</span>
                    <span className="text-secondary font-semibold">Chuẩn BWF Tournament</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '20L Gọn Nhẹ', sub: '1-2 Cây vợt' },
                      { label: '30L - 35L Tour', sub: '2-3 Vợt + Giày & Đồ' },
                      { label: '45L Du Đấu', sub: '4-6 Vợt + Full Set' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setSelectedCapacity(item.label)}
                        className={`p-2.5 rounded-xl text-left transition-all border ${
                          selectedCapacity === item.label
                            ? 'bg-[#131B2E] text-white border-[#131B2E] shadow-md'
                            : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className={`text-[10px] ${selectedCapacity === item.label ? 'text-slate-300' : 'text-slate-500'}`}>
                          {item.sub}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Bag Mini Highlights */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-[#F2F4F6] rounded-xl text-xs">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Sức chứa tối ưu</span>
                      <span className="font-bold text-slate-900">{product.racketCapacity ? product.racketCapacity + ' Vợt' : '2-3 Vợt + 1 Đôi giày'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Chất liệu vỏ</span>
                      <span className="font-bold text-slate-900">{product.waterproof || '900D PU IPX4'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500">Hệ thống kéo</span>
                      <span className="font-bold text-slate-900">Khóa kép YKK Pro</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DYNAMIC VARIANT SELECTORS: FOR ACCESSORIES */}
              {isAccessories && (
                <div className="mb-5 space-y-4">
                  {/* Packaging Specs */}
                  <div>
                    <span className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Quy cách đóng gói:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {[
                        { label: 'Vỉ 3 cuộn (Phổ biến)', sub: '95.000₫ • 31.6k/c' },
                        { label: 'Cuộn lẻ 1 chiếc', sub: '35.000₫ / cuộn' },
                        { label: 'Hộp 30 cuộn Club', sub: 'Tiết kiệm 20% • 850.000₫' },
                      ].map((pkg) => (
                        <button
                          key={pkg.label}
                          type="button"
                          onClick={() => setSelectedPackaging(pkg.label)}
                          className={`p-2.5 rounded-xl text-left transition-all border ${
                            selectedPackaging === pkg.label
                              ? 'bg-[#131B2E] text-white border-[#131B2E] shadow-sm'
                              : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="font-bold text-xs">{pkg.label}</div>
                          <div className={`text-[10px] ${selectedPackaging === pkg.label ? 'text-slate-300' : 'text-slate-500'}`}>
                            {pkg.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Combo Tiết Kiệm Box (Cross-sell chuẩn thiết kế) */}
                  <div className="w-full bg-[#F2F4F6] rounded-xl p-3.5 border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-secondary" />
                        <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          Combo Thi Đấu Tiết Kiệm (Giảm 15%)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-secondary text-[11px] font-bold">
                        Tiết kiệm 40.000₫
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#F2F4F6] p-1 shrink-0 flex items-center justify-center">
                          <img
                            src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=200&auto=format&fit=crop&q=60"
                            alt="Combo Quấn cán & Cước"
                            className="max-h-full object-contain mix-blend-multiply"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-slate-900">Vỉ AC102EX + Cước Yonex BG65Ti Pro</span>
                          <span className="text-[11px] text-slate-500">Trợ lực smash nảy & tay cầm bám chuẩn BWF</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-sm text-secondary">205.000₫</span>
                          <span className="text-xs text-slate-400 line-through">245.000₫</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCombo}
                          className="px-3 py-1.5 rounded-lg bg-[#131B2E] hover:bg-slate-800 text-white text-xs font-bold transition-colors shrink-0 shadow-sm"
                        >
                          Thêm combo
                        </button>
                      </div>
                    </div>
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
                {isShoes && 'Bứt Tốc Linh Hoạt & Tiếp Đất Bảo Vệ Cổ Chân Toàn Diện'}
                {isApparel && 'Chất Vải Thoáng Mát Dry-Fit & Kháng Khuẩn Bứt Phá Giới Hạn'}
                {isBag && 'Bảo Vệ Vợt Tiêu Chuẩn Tour & Cơ Động Trên Mọi Hành Trình'}
                {isAccessories && 'Trang Bị Chuyên Sâu Chuẩn Thi Đấu Đỉnh Cao BWF'}
                {isRacket && 'Sức Mạnh Đập Cầu Hủy Diệt & Khả Năng Cơ Động Tối Thượng'}
              </h3>
              <p>
                {product.description ||
                  `${product.name} là sản phẩm cao cấp phân phối chính hãng đạt tiêu chuẩn quốc tế BWF. Được thiết kế tối ưu cho các trận đấu căng thẳng với độ bền vượt trội, khả năng kiểm soát đường cầu chuẩn xác và cảm giác tiếp xúc chân thực nhất.`}
              </p>
              <p>
                {isShoes && 'Tích hợp đệm Power Cushion+ hấp thụ rung chấn đa hướng cùng đế cao su Radial Blade Sole bám dính tuyệt đối, cho phép chuyển hướng phản xạ chớp nhoáng mà không lo lật cổ chân.'}
                {isApparel && 'Sợi vải công nghệ CoolMax hạ nhiệt tức thì, cấu trúc dệt thoáng khí đa chiều không bết dính mồ hôi, giữ cơ thể luôn khô thoáng và tự tin trong từng pha cầu dài.'}
                {isBag && 'Vải 900D tráng PU chống thấm IPX4 bảo vệ vợt trước mọi điều kiện thời tiết. Ngăn chứa vợt cách nhiệt Thermo Guard duy trì độ căng cước hoàn hảo và ngăn giày độc lập khử mùi.'}
                {isAccessories && 'Được chế tạo từ vật liệu cao cấp theo tiêu chuẩn BWF, hỗ trợ tối đa cảm giác cầm nắm, độ nảy của dây cước và độ bền bỉ trong suốt quá trình tập luyện và thi đấu.'}
                {isRacket && 'Trang bị các vật liệu graphite mô-đun siêu cao cùng cấu trúc khung khí động học tiên tiến, sản phẩm mang lại tốc độ vung vợt chớp nhoáng và lực smash cắm sân uy lực không thể cản phá.'}
              </p>
            </div>
          )}

          {/* Tab 2: Technical Specifications Table (Chuyên biệt theo từng Category) */}
          {activeTab === 'specs' && (
            <div className="pt-6 max-w-3xl">
              <h3 className="font-display text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-secondary" />
                <span>
                  {isShoes && 'Bảng Thông Số Kỹ Thuật Giày Thi Đấu Tiêu Chuẩn BWF'}
                  {isApparel && 'Bảng Thông Số Kỹ Thuật & Tiêu Chuẩn Vải Thi Đấu'}
                  {isBag && 'Bảng Thông Số Kỹ Thuật Balo & Túi Thi Đấu Chuyên Nghiệp'}
                  {isAccessories && 'Bảng Thông Số Kỹ Thuật Phụ Kiện Cầu Lông Pro'}
                  {isRacket && 'Bảng Thông Số Kỹ Thuật Vợt Cầu Lông Tiêu Chuẩn BWF'}
                </span>
              </h3>

              <table className="w-full text-xs text-left border-collapse rounded-xl overflow-hidden shadow-sm">
                <tbody>
                  {/* RACKET SPECS */}
                  {isRacket && (
                    <>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700 w-1/3">Thương hiệu</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.brand || 'Yonex'} (Chính Hãng BWF)</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Trọng lượng / Grip</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.weightGrip || selectedWeightGrip || '4U - G5 (83g)'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Điểm cân bằng</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.balancePoint || 'Head-Heavy (Nặng đầu)'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Độ cứng đũa vợt (Stiffness)</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.stiffness || 'Extra Stiff (Cực cứng)'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Mức căng dây khuyến nghị</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.maxTension || '20 - 28 lbs (Tối đa 30 lbs)'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Vật liệu khung & đũa</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.frameMaterial || 'HM Graphite + Namd / Ultra PE Fiber'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Lối chơi phù hợp</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.playStyle || 'Tấn công uy lực, smash áp đảo đối thủ'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Xuất xứ & Phân phối</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.origin || 'Nhật Bản / Đài Loan (Sunrise Sports)'}</td>
                      </tr>
                    </>
                  )}

                  {/* SHOES SPECS */}
                  {isShoes && (
                    <>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700 w-1/3">Thương hiệu</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.brand || 'Yonex'} (Chính Hãng BWF)</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Trọng lượng giày</td>
                        <td className="py-2.5 px-4 text-slate-900">Khoảng 310 gram / chiếc (Chuẩn Size 41 EU)</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Cấu trúc đế ngoài (Outsole)</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.soleType || 'Radial Blade Sole - Cao su non tự nhiên, bám sàn gỗ & thảm BWF vượt trội'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Công nghệ đệm đế giữa (Midsole)</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.cushionTechnology || 'Power Cushion+ (Hấp thụ chấn động 28%, nảy trợ lực 62%)'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Lót giày & Cấu trúc chống lật</td>
                        <td className="py-2.5 px-4 text-slate-900">Synchro-Fit Insole ôm sát gót chân + Tấm Carbon 3D chống lật cổ chân</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Chất liệu thân trên (Upper)</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.upperMaterial || 'Da tổng hợp High-Grade + Lưới Double Russel Mesh siêu thoáng khí'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Kiểu dáng & Form chân</td>
                        <td className="py-2.5 px-4 text-slate-900">Cổ thấp (Low-cut), Form chuẩn Standard Fit (3E) tương thích bàn chân châu Á</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Bảo hành & Đổi size</td>
                        <td className="py-2.5 px-4 text-slate-900">Bảo hành keo chỉ 6 tháng, Đổi size miễn phí 7 ngày tận nơi</td>
                      </tr>
                    </>
                  )}

                  {/* APPAREL SPECS */}
                  {isApparel && (
                    <>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700 w-1/3">Thương hiệu</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.brand || 'Yonex'} (Chính Hãng BWF)</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Phân loại & Giới tính</td>
                        <td className="py-2.5 px-4 text-slate-900">{selectedGender === 'Nam' ? 'Trang phục thi đấu Nam (Cộc tay)' : 'Trang phục thi đấu Nữ (Cộc tay/Váy)'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Chất liệu cấu thành</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.fabricType || '92% High-Grade Micro Polyester + 8% Spandex co giãn 4 chiều'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Công nghệ sợi vải</td>
                        <td className="py-2.5 px-4 text-slate-900">CoolMax Air Dry hạ nhiệt bề mặt -3°C + Dải thoát khí Micro-Mesh sống lưng</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Chỉ số chống nắng (UV)</td>
                        <td className="py-2.5 px-4 text-slate-900">UPF 50+ ngăn ngừa 98% tác động tia cực tím dưới ánh đèn đấu trường</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Trọng lượng áo</td>
                        <td className="py-2.5 px-4 text-slate-900">Siêu nhẹ ~135 gram (Size L) - Tối ưu lực vung vợt đập smash</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Hướng dẫn giặt & bảo quản</td>
                        <td className="py-2.5 px-4 text-slate-900">Giặt nước lạnh dưới 30°C, không ngâm chất tẩy clo, lộn mặt trái khi là ủi nhẹ</td>
                      </tr>
                    </>
                  )}

                  {/* BAG SPECS */}
                  {isBag && (
                    <>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700 w-1/3">Thương hiệu</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.brand || 'Apex Pro Gear'} (Tour Series)</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Dung tích / Kích cỡ</td>
                        <td className="py-2.5 px-4 text-slate-900">{selectedCapacity || product.capacity || '30L - 35L Tour'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Sức chứa vợt tối ưu</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.racketCapacity ? product.racketCapacity + ' Cây vợt' : '2-3 Vợt + 1 Đôi giày + Phụ kiện & Đồ đấu'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Chất liệu thân vỏ</td>
                        <td className="py-2.5 px-4 text-slate-900">Vải 900D Oxford Polyester cao cấp phủ tráng PU 3 lớp siêu bền</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Khả năng kháng nước</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.waterproof || 'IPX4 Hydro-Repellent (Chống thấm nước mưa vừa & văng nước)'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Cơ cấu khoang chứa</td>
                        <td className="py-2.5 px-4 text-slate-900">5 Khoang chức năng riêng biệt (Khoang vợt nhiệt Thermo Guard, khoang giày khử mùi)</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Kích thước chuẩn (D x R x C)</td>
                        <td className="py-2.5 px-4 text-slate-900">33cm x 22cm x 50cm (Trọng lượng rỗng ~880g)</td>
                      </tr>
                    </>
                  )}

                  {/* ACCESSORIES SPECS */}
                  {isAccessories && (
                    <>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700 w-1/3">Thương hiệu</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.brand || 'Yonex'} (Chính Hãng)</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Phân loại phụ kiện</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.accessoryType || 'Phụ kiện thi đấu chuyên nghiệp'}</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Chất liệu cấu thành</td>
                        <td className="py-2.5 px-4 text-slate-900">Polyurethane (PU) cao su tổng hợp cao cấp bám dính, chống trơn trượt tối đa</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Kích thước & Độ dày</td>
                        <td className="py-2.5 px-4 text-slate-900">Chiều rộng 25mm • Chiều dài 1.200mm • Độ dày bề mặt 0.6mm</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Quy cách đóng gói</td>
                        <td className="py-2.5 px-4 text-slate-900">{selectedPackaging || product.quantityPerPack || 'Vỉ 3 cuộn + 3 dải băng dán cố định'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Tiêu chuẩn thi đấu</td>
                        <td className="py-2.5 px-4 text-slate-900">BWF Tour Approved (Dụng cụ được BWF chứng nhận trong các giải đấu chuyên nghiệp)</td>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-700">Xuất xứ sản xuất</td>
                        <td className="py-2.5 px-4 text-slate-900">{product.origin || 'Made in Japan (Nhật Bản chính ngạch)'}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Apex Expert Tip for Accessories */}
              {isAccessories && (
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-start gap-2.5 mt-4 text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 font-bold">Mẹo chuyên gia Apex:</strong> Nên thay quấn cán sau 4-6 buổi thi đấu để duy trì độ dính tối ưu, tránh vi khuẩn tích tụ và giảm nguy cơ trượt tuột vợt khi smash lực mạnh.
                  </p>
                </div>
              )}
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
              {isShoes && (
                <>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Bàn chân bè dày có mang vừa form giày 3E này không?</span>
                    <p className="text-slate-600">
                      A: Form chuẩn 3E của các dòng giày BWF được thiết kế tối ưu riêng cho bàn chân người châu Á với phần mu mũi rộng rãi, không gây bó ngón hay đau móng chân khi dậm nhảy tiếp đất liên tục.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Đệm Power Cushion+ sử dụng bao lâu thì giảm độ nảy?</span>
                    <p className="text-slate-600">
                      A: Vật liệu đệm cao cấp giữ được hiệu suất hấp thụ phản lực và trợ lực lên tới 12-18 tháng thi đấu cường độ 3-4 buổi/tuần trước khi có dấu hiệu lún nhẹ tự nhiên.
                    </p>
                  </div>
                </>
              )}

              {isApparel && (
                <>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Áo giặt máy có bị phai màu hoặc co rút sợi vải không?</span>
                    <p className="text-slate-600">
                      A: Vải sợi Micro-Polymer cao cấp áp dụng công nghệ nhuộm nhiệt thăng hoa chống phai màu tuyệt đối. Bạn hoàn toàn có thể giặt máy ở chế độ thường (khuyên dùng túi giặt).
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Chất vải CoolMax có gây kích ứng khi vận động ra nhiều mồ hôi?</span>
                    <p className="text-slate-600">
                      A: Sợi vải đã qua xử lý kháng khuẩn và kiểm định da liễu đạt chuẩn thi đấu BWF, hoàn toàn lành tính, ngăn mùi hôi ẩm mốc và không gây cọ xát rát da.
                    </p>
                  </div>
                </>
              )}

              {isBag && (
                <>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Ngăn chứa giày độc lập có đựng vừa giày size lớn 44-45 không?</span>
                    <p className="text-slate-600">
                      A: Khoang chứa giày đáy túi được gia công mở rộng với lỗ thoát khí đa chiều, chứa thoải mái giày size 45 EU kèm 1 đôi dép bơi mà không chèn ép vào ngăn chứa vợt.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Lớp màng Thermo Guard cách nhiệt có thực sự bảo vệ cước vợt?</span>
                    <p className="text-slate-600">
                      A: Lớp bạc phản xạ nhiệt ngăn chặn nhiệt độ môi trường bên ngoài (cốp xe máy, trời nắng gắt) làm chùng hoặc giòn dây cước đan và khung carbon của vợt.
                    </p>
                  </div>
                </>
              )}

              {isAccessories && (
                <>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Quấn cán Yonex AC102EX này có dùng được cho vợt Tennis không?</span>
                    <p className="text-slate-600">
                      A: Có. Với chiều dài chuẩn 1.200mm, cuộn quấn cán dùng tốt cho cả cán vợt cầu lông và cán vợt tennis kích thước lớn (G2/G3).
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-900 block">Q: Người hay ra mồ hôi tay nhiều có nên dùng loại quấn cán này không?</span>
                    <p className="text-slate-600">
                      A: Dòng AC102EX Super Grap sở hữu độ bám dính Tacky độc quyền, khi tay ẩm mồ hôi độ bám càng tăng lên, giúp vợt không bị trượt xoay khi vung cổ tay đập cầu.
                    </p>
                  </div>
                </>
              )}

              {isRacket && (
                <>
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
                </>
              )}
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

        {/* MODAL: SIZE GUIDE MODAL (SHOES & APPAREL) */}
        {sizeGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSizeGuideModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                aria-label="Đóng bảng size"
              >
                <X className="w-5 h-5" />
              </button>

              {/* SHOES SIZE GUIDE */}
              {sizeGuideModal === 'shoes' && (
                <div className="space-y-4 text-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Ruler className="w-5 h-5 text-[#2563EB]" />
                    <h3 className="font-bold text-base text-slate-900">
                      Bảng Quy Đổi Size Giày Cầu Lông Chuẩn BWF (Bàn Chân Châu Á 3E)
                    </h3>
                  </div>

                  <div className="p-3 bg-blue-50/70 rounded-xl text-xs text-blue-900 leading-relaxed border border-blue-100">
                    <strong>Cách đo chân chuẩn:</strong> Đặt gót chân sát mép tường trên tờ giấy trắng A4, vạch điểm ngón chân dài nhất rồi dùng thước đo khoảng cách (cm). Hãy cộng thêm <strong>0.5cm - 1.0cm</strong> để chừa không gian đi tất dệt dày chuyên dụng khi thi đấu.
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#131B2E] text-white">
                          <th className="py-2.5 px-3 rounded-l-lg">Size EU</th>
                          <th className="py-2.5 px-3">Chiều Dài Bàn Chân</th>
                          <th className="py-2.5 px-3">Độ Rộng (Fit)</th>
                          <th className="py-2.5 px-3">Size US Nam</th>
                          <th className="py-2.5 px-3 rounded-r-lg">Size US Nữ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">39 EU</td>
                          <td className="py-2 px-3">24.5 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">6.5</td>
                          <td className="py-2 px-3">8.0</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">40 EU</td>
                          <td className="py-2 px-3">25.0 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">7.0</td>
                          <td className="py-2 px-3">8.5</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">40.5 EU</td>
                          <td className="py-2 px-3">25.5 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">7.5</td>
                          <td className="py-2 px-3">9.0</td>
                        </tr>
                        <tr className="hover:bg-slate-50 bg-blue-50/40">
                          <td className="py-2 px-3 font-bold text-secondary">41 EU</td>
                          <td className="py-2 px-3 font-bold text-slate-900">26.0 cm (Phổ biến)</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">8.0</td>
                          <td className="py-2 px-3">9.5</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">42 EU</td>
                          <td className="py-2 px-3">26.5 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">8.5</td>
                          <td className="py-2 px-3">10.0</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">42.5 EU</td>
                          <td className="py-2 px-3">27.0 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">9.0</td>
                          <td className="py-2 px-3">10.5</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">43 EU</td>
                          <td className="py-2 px-3">27.5 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">9.5</td>
                          <td className="py-2 px-3">11.0</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">44 EU</td>
                          <td className="py-2 px-3">28.0 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">10.0</td>
                          <td className="py-2 px-3">11.5</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">45 EU</td>
                          <td className="py-2 px-3">28.5 - 29.0 cm</td>
                          <td className="py-2 px-3 text-slate-500">Chuẩn 3E (Rộng)</td>
                          <td className="py-2 px-3">11.0</td>
                          <td className="py-2 px-3">12.5</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 italic">Cam kết hỗ trợ đổi size miễn phí trong 7 ngày nếu mang không vừa.</span>
                    <button
                      type="button"
                      onClick={() => setSizeGuideModal(null)}
                      className="px-4 py-2 bg-[#131B2E] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                    >
                      Đã hiểu
                    </button>
                  </div>
                </div>
              )}

              {/* APPAREL SIZE GUIDE */}
              {sizeGuideModal === 'apparel' && (
                <div className="space-y-4 text-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Ruler className="w-5 h-5 text-secondary" />
                    <h3 className="font-bold text-base text-slate-900">
                      Bảng Thông Số Chọn Size Quần Áo Cầu Lông Chuẩn VĐV
                    </h3>
                  </div>

                  <div className="p-3 bg-rose-50/70 rounded-xl text-xs text-rose-900 leading-relaxed border border-rose-100">
                    <strong>Gợi ý chọn form:</strong> Vải áo thể thao cao cấp có độ co giãn 4 chiều Dry-Fit. Nếu thích mặc ôm body chuẩn VĐV chuyên nghiệp hãy chọn đúng theo bảng cân nặng, nếu thích mặc thoải mái rộng rãi hãy tăng lên 1 size.
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#131B2E] text-white">
                          <th className="py-2.5 px-3 rounded-l-lg">Size Áo</th>
                          <th className="py-2.5 px-3">Chiều Cao Khuyến Nghị</th>
                          <th className="py-2.5 px-3">Cân Nặng Khuyến Nghị</th>
                          <th className="py-2.5 px-3">Vòng Ngực</th>
                          <th className="py-2.5 px-3 rounded-r-lg">Chiều Dài Áo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">S</td>
                          <td className="py-2 px-3">1m55 - 1m62</td>
                          <td className="py-2 px-3">50 - 58 kg</td>
                          <td className="py-2 px-3">86 - 90 cm</td>
                          <td className="py-2 px-3">66 cm</td>
                        </tr>
                        <tr className="hover:bg-slate-50 bg-rose-50/30">
                          <td className="py-2 px-3 font-bold text-secondary">M</td>
                          <td className="py-2 px-3 font-bold text-slate-900">1m63 - 1m70</td>
                          <td className="py-2 px-3 font-bold text-slate-900">59 - 68 kg</td>
                          <td className="py-2 px-3">91 - 96 cm</td>
                          <td className="py-2 px-3">68 cm</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">L</td>
                          <td className="py-2 px-3">1m71 - 1m77</td>
                          <td className="py-2 px-3">69 - 76 kg</td>
                          <td className="py-2 px-3">97 - 102 cm</td>
                          <td className="py-2 px-3">70 cm</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">XL</td>
                          <td className="py-2 px-3">1m78 - 1m83</td>
                          <td className="py-2 px-3">77 - 85 kg</td>
                          <td className="py-2 px-3">103 - 108 cm</td>
                          <td className="py-2 px-3">72 cm</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-secondary">2XL</td>
                          <td className="py-2 px-3">1m84 - 1m90</td>
                          <td className="py-2 px-3">86 - 95 kg</td>
                          <td className="py-2 px-3">109 - 116 cm</td>
                          <td className="py-2 px-3">74 cm</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 italic">Đội ngũ kỹ thuật hỗ trợ đổi trả linh hoạt trong vòng 7 ngày.</span>
                    <button
                      type="button"
                      onClick={() => setSizeGuideModal(null)}
                      className="px-4 py-2 bg-[#131B2E] text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                    >
                      Đã hiểu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductDetailPage;
