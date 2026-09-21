import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ShoppingCart, Bolt, ChevronRight, CheckCircle2, Star, ShieldCheck, 
  RefreshCw, Droplets, Sparkles, Send, HelpCircle, Heart, ZoomIn, 
  Truck, ArrowRight, Check, PackageCheck
} from 'lucide-react';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';

const SweatbandDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('combo'); // 'headband' | 'wristband' | 'combo'
  const [selectedColor, setSelectedColor] = useState('Trắng Tuyết (Classic White)');
  const [includeAddon, setIncludeAddon] = useState(false);
  const [activeTab, setActiveTab] = useState('desc');
  const [addedToast, setAddedToast] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchProd = async () => {
      setLoading(true);
      try {
        const [prodData, revData] = await Promise.all([
          productApi.getProductById(id),
          reviewApi.getProductReviews(id).catch(() => [])
        ]);
        if (!active) return;
        setProduct(prodData);
        setReviews(Array.isArray(revData) ? revData : (revData?.items || []));
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

  const galleryImages = [
    product.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdo5KNuzfekgT0wF4XCKIiGzta39WAqP4hz7PMkhtXWvafrHhwoxqQPGvIwrXRaqCpSSFxUFQSqqj4iTFoRzkE5KJRHNWX0hJFtgDlp1F3NAGKQ9VHLTRFu85PiSXqlB6tuTGxdKt8O09zmOlNciDbHwTZv_D3Id0U5E7TFgMBjV8HJwE3Gnuu_KlE-kR2yjNB-CQrIoVCd9WtEy6966f1aMHQIHDqh3LLzA02WVypshwlr49YxknP',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDfmWta0bYtclH3LYJnMOnO-FfGTh7q0PIn2wxU7jGiHeUQ33ymO-fsub5I2WLrw7oUOjcY4zA3XaytvxV6FKB-k_XkKeRbNzzaEa_trW43FCjnDx-x2vOouxeIZo3c6dDCO-dx1s0M3ADy8vc-8-dB0Xb9FhA9f3zixpZW8h-0saWlEuYkhdVg-ACekfxWylvUCW9yogk-N9IfYJ5TvBoxMzi2fKqm5LZq4mLMtePDxrCLMJ_VuT4C',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB33wuwWltTwO8RGi6k5O3COKQUJ4Z2qPJwW4BmAhdKHS05dMhyGoOqc6VZToHLzDmzA43eOnWzjdG4knYnG1UmXhOnn20uLCEXUMCEp2cuSh8cStcyIHXpsKIj3TdaIy-zzXULF2pV2XBbEBXgUdfGHylj0hwQloJN9oxaHzTwVsGdXKn0-EmdUTMRLy2YfcxxpN1l5oE5e4YyEDoa8Nwbzl6fajwPorn1BgXYy-bctsDdvXWYIJdm',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAt2hflfFhbMBYYqURQ3Qi8Jaoyb97JLjuvjSXT0sxcmQutAOIKdxXcA8u4xmgfBGUkqbv2TyzTUbq9cXgyOn8qUge5nSu7aXfyhN8x6_8A0iAzBW9SmV9Jwpq01n8MIuhzUksBAWZ-EC4g5um0GpCKvS-uWUj-cGFebwMzphsCGyw7BUC61dk1Oz2zZ98540UWkyuJpFiCgqBIjvgj7KoHjs6qGH1IfBaYh_E6PbO5r8yanB2UMpqW'
  ];

  const variants = {
    headband: { label: 'Băng đầu (Head)', price: 75000, origPrice: 95000, discount: '-21%' },
    wristband: { label: 'Băng cổ tay (Cặp)', price: 85000, origPrice: 110000, discount: '-22%' },
    combo: { label: 'Combo 1 Đầu + 2 Tay', price: 175000, origPrice: 220000, discount: '-20% COMBO' }
  };

  const currentVariant = variants[selectedVariant];
  const unitPrice = (product.price && selectedVariant === 'combo') ? Number(product.price) : currentVariant.price;
  const originalPrice = currentVariant.origPrice;
  const finalPrice = unitPrice + (includeAddon ? 55000 : 0);

  const colors = [
    { name: 'Trắng Tuyết (Classic White)', bg: 'bg-white', border: 'border-slate-300', dot: 'bg-[#131b2e]' },
    { name: 'Xanh Navy (Navy Blue)', bg: 'bg-[#131b2e]', border: 'border-transparent' },
    { name: 'Đỏ Laser (Laser Red)', bg: 'bg-[#da3437]', border: 'border-transparent' },
    { name: 'Đen Obsidian (Black)', bg: 'bg-[#191c1e]', border: 'border-transparent' },
    { name: 'Xanh Electric (Electric Blue)', bg: 'bg-[#003ea8]', border: 'border-transparent' }
  ];

  const handleAdd = () => {
    addToCart({ ...product, price: finalPrice }, quantity, {
      variant: currentVariant.label,
      color: selectedColor,
      addon: includeAddon ? 'Kèm Vỉ Yonex AC102EX (+55k)' : 'Không kèm'
    });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    const cartItemId = addToCart({ ...product, price: finalPrice }, quantity, {
      variant: currentVariant.label,
      color: selectedColor,
      addon: includeAddon ? 'Kèm Vỉ Yonex AC102EX (+55k)' : 'Không kèm'
    });
    navigate('/checkout', { state: { selectedItemIds: cartItemId ? [cartItemId] : undefined } });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setReviewSubmitting(true);
    try {
      const newRev = await reviewApi.createReview({
        productId: product.id,
        rating: reviewRating,
        comment: reviewComment,
        userFullName: reviewerName.trim() || 'Khách hàng thể thao'
      });
      setReviews(prev => [newRev, ...prev]);
      setReviewComment('');
      setReviewerName('');
      alert('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
    } catch (err) {
      console.error(err);
      alert('Chưa thể gửi đánh giá, vui lòng thử lại sau.');
    } finally {
      setReviewSubmitting(false);
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
                  <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                  BWF Tournament Approved
                </span>
                <span className="px-3 py-1 bg-secondary text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm">
                  Chính Hãng 100%
                </span>
              </div>

              <button 
                type="button" 
                aria-label="Yêu thích"
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 text-slate-500 shadow flex items-center justify-center hover:text-secondary transition-colors"
              >
                <Heart className="w-4 h-4" />
              </button>

              <img 
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
                  <img src={src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>

            {/* Trust Badges Strip */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <Droplets className="w-5 h-5 text-secondary" />
                <span className="font-bold text-xs text-slate-800">100% Cotton Terry</span>
                <span className="text-[11px] text-slate-500">Kháng khuẩn khử mùi</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RefreshCw className="w-5 h-5 text-secondary" />
                <span className="font-bold text-xs text-slate-800">Đổi trả 7 ngày</span>
                <span className="text-[11px] text-slate-500">Nếu lỗi nhà sản xuất</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <PackageCheck className="w-5 h-5 text-secondary" />
                <span className="font-bold text-xs text-slate-800">Đồng kiểm khi nhận</span>
                <span className="text-[11px] text-slate-500">Kiểm tra trước trả tiền</span>
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
                    {product.brand || 'Apex Badminton'} x Yonex OEM Edition
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-secondary text-[10px] uppercase rounded-md font-bold">
                    Bán chạy #1 Phụ Kiện
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Mã SP: {product.sku || 'APX-SWT-TR'}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] leading-snug">
                {product.name}
              </h1>

              {/* Rating & stats */}
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <div className="flex text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                  </div>
                  <span className="font-bold text-slate-800">4.9</span>
                  <span className="text-slate-400">({reviews.length || 328} đánh giá)</span>
                </div>
                <span>|</span>
                <span>Đã bán <strong className="text-slate-800 font-bold">2.440+</strong> bộ</span>
                <span>|</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Còn hàng sẵn kho
                </span>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-black text-secondary tracking-tight">
                  {formatPrice(finalPrice)}
                </span>
                <span className="text-sm text-slate-400 line-through">
                  {formatPrice(originalPrice + (includeAddon ? 70000 : 0))}
                </span>
                <span className="px-2 py-0.5 bg-secondary text-white rounded-full text-[11px] font-bold">
                  {currentVariant.discount}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-secondary block uppercase tracking-wider font-bold">Giá ưu đãi giải đấu</span>
                <span className="text-[10px] text-slate-400">Đã bao gồm VAT</span>
              </div>
            </div>

            {/* Product Variant Selection */}
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Phân loại sản phẩm</span>
                <span className="text-xs text-secondary underline cursor-pointer hover:opacity-80">Bảng chọn kích thước</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Object.entries(variants).map(([key, item]) => {
                  const isActive = selectedVariant === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedVariant(key)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                        isActive
                          ? 'bg-[#131B2E] text-white border-[#131B2E] shadow-md'
                          : 'bg-[#F8FAFC] text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>
                          {item.label}
                        </span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />}
                      </div>
                      <span className={`text-[11px] ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Màu sắc: <span className="text-secondary font-black">{selectedColor}</span>
                </span>
                <span className="text-[11px] text-slate-400">5 phối màu thi đấu</span>
              </div>
              <div className="flex items-center gap-3">
                {colors.map((c) => {
                  const isSelected = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`w-9 h-9 rounded-full ${c.bg} ${c.border} shadow-md flex items-center justify-center transition-all ${
                        isSelected ? 'ring-2 ring-offset-2 ring-[#131B2E] scale-110' : 'hover:scale-105'
                      }`}
                    >
                      {c.dot && <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />}
                      {!c.dot && isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

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
              <span className="text-xs text-slate-500">Sẵn có 142 bộ tại showroom</span>
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
                <Bolt className="w-4 h-4 fill-white" />
                Mua ngay - Giao hỏa tốc
              </button>
            </div>

            {/* Service Guarantee Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-secondary shrink-0" />
                <span>Giao hỏa tốc 2H nội thành</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary shrink-0" />
                <span>Tích lũy 180đ ApexClub</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                <span>Freeship đơn từ 300k</span>
              </div>
            </div>

            {/* Add-on Upsell Box */}
            <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              includeAddon ? 'bg-red-50 border-secondary/40' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg p-2 shadow-sm shrink-0 flex items-center justify-center border border-slate-200">
                  <Sparkles className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-slate-800">Ưu đãi mua kèm chuyên nghiệp:</span>
                  <span className="text-slate-500 text-[11px]">Vỉ quấn cán Yonex AC102EX hoặc Khăn lau mặt Pro</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncludeAddon(!includeAddon)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  includeAddon 
                    ? 'bg-secondary text-white' 
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {includeAddon ? '✓ Đã chọn +55.000₫' : '+55.000₫ Thêm ngay'}
              </button>
            </div>

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
              { id: 'reviews', label: `Đánh giá (${reviews.length || 328})` },
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
          {activeTab === 'desc' && (
            <div className="pt-6 flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <span className="text-xs text-secondary uppercase tracking-widest font-black">
                    Công nghệ hấp thụ xung lực ẩm
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] leading-tight">
                    Giữ tầm nhìn thông thoáng &amp; Cầm chắc tay vợt tuyệt đối trong từng set đấu
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Dòng phụ kiện băng chặn mồ hôi <strong>Apex Pro Tour Sweatband</strong> được thiết kế theo tiêu chuẩn thi đấu đỉnh cao của Liên đoàn Cầu lông Thế giới (BWF). Sản phẩm giải quyết dứt điểm nỗi lo mồ hôi trán chảy vào cay mắt hoặc trơn tuột cán vợt khi thực hiện các pha smash dứt điểm tốc độ cao.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-secondary">
                        <Droplets className="w-5 h-5" />
                        <span className="text-xs font-black text-slate-800 uppercase">Thấm hút tức thì 1.5s</span>
                      </div>
                      <p className="text-xs text-slate-500">Cấu trúc dệt vòng xoắn kép Terry Loop giúp chất lỏng thoát nhanh vào lõi trữ ẩm.</p>
                    </div>

                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-secondary">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-black text-slate-800 uppercase">Kháng khuẩn Bạc Ag+</span>
                      </div>
                      <p className="text-xs text-slate-500">Ngăn chặn 99.2% vi khuẩn gây mùi ẩm mốc khó chịu sau thời gian dài tập luyện.</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="w-full aspect-video bg-[#F8FAFC] rounded-xl overflow-hidden shadow-sm border border-slate-200">
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDr8osAVIWe-ZYKTi5rxTbC0Gq6VrioCxtJBpEuguuDx17cvoyXufT_UkY4RzSfyuISFkzE0bGNCgAWQY9LIbOhq7XtQrqcFIB8WV-0N4jtiii13WOdAWbriKwfRkcfe3oMEbgY1Z1WKtcDj8e-T2uQrpEVAoktjtUvS3sGT7lcason6dWW3cAZjnxzlKbnxDbARNO4T1VUsPmD-9FVxLWPJ2Khk0Ky1bveKAygQa4-F5vk_sFNFPXT"
                      alt="Action shot sweatband in tournament"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Bento Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-5 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-2">
                  <Sparkles className="w-6 h-6 text-secondary" />
                  <h3 className="text-sm font-black text-[#0F172A]">4-Way High Stretch</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Độ co giãn 4 chiều hoàn hảo ôm sát chu vi đầu và cổ tay mà không gây siết thắt tuần hoàn máu, tạo sự thoải mái 100% khi vận động mạnh.
                  </p>
                </div>

                <div className="p-5 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-2">
                  <RefreshCw className="w-6 h-6 text-secondary" />
                  <h3 className="text-sm font-black text-[#0F172A]">Bền Bỉ Hơn 50 Lần Giặt</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sợi tổng hợp gia cường Elastodiene hạn chế tình trạng nhão vải, biến dạng form dáng sau khi giặt máy hoặc tiếp xúc liên tục với mồ hôi muối.
                  </p>
                </div>

                <div className="p-5 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-2">
                  <Award className="w-6 h-6 text-secondary" />
                  <h3 className="text-sm font-black text-[#0F172A]">Thêu Nổi Thủ Công 3D</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Logo biểu tượng quả cầu lông Apex được thêu vi tính mật độ cao, đường nét sắc sảo, chống bong tróc hoàn toàn so với công nghệ in nhiệt thông thường.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THÔNG SỐ KỸ THUẬT */}
          {activeTab === 'specs' && (
            <div className="pt-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-800">Bảng Thông Số Kỹ Thuật Chi Tiết</h3>
                <span className="text-[11px] text-slate-400 uppercase">Mã kiểm định: ISO-9001-BWF</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <tbody>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-700 w-1/3">Chất liệu sợi vải chính</td>
                      <td className="py-3 px-4 text-slate-600">72% Organic Cotton, 20% Elastodiene đàn hồi, 8% High-Grade Nylon</td>
                    </tr>
                    <tr className="bg-white border-b border-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-700">Tốc độ thấm hút mồ hôi</td>
                      <td className="py-3 px-4 text-slate-600">1.5 giây (hấp thụ gấp 4 lần trọng lượng khô của sản phẩm)</td>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-700">Độ co giãn &amp; Đàn hồi</td>
                      <td className="py-3 px-4 text-slate-600">4-Way Stretch (Đã thử nghiệm qua 50 lần giặt máy tiêu chuẩn)</td>
                    </tr>
                    <tr className="bg-white border-b border-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-700">Kích thước tiêu chuẩn</td>
                      <td className="py-3 px-4 text-slate-600">Băng đầu: 18cm x 5cm (co giãn tới 32cm) | Băng cổ tay: 8cm x 8cm</td>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-700">Trọng lượng tịnh</td>
                      <td className="py-3 px-4 text-slate-600">35g (Băng trán) / 28g (Băng tay đơn)</td>
                    </tr>
                    <tr className="bg-white border-b border-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-700">Công nghệ xử lý bề mặt</td>
                      <td className="py-3 px-4 text-slate-600">Kháng khuẩn Nano Silver ion Bạc khử mùi mồ hôi tức thời</td>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-700">Hướng dẫn giặt &amp; bảo quản</td>
                      <td className="py-3 px-4 text-slate-600">Giặt máy chế độ nhẹ hoặc giặt tay dưới 30°C. Tránh phơi nắng gắt trực tiếp</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="py-3 px-4 font-bold text-slate-700">Xuất xứ &amp; Chứng nhận</td>
                      <td className="py-3 px-4 text-slate-600">Made in Taiwan / Đạt chuẩn thiết bị thi đấu BWF Tour</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ĐÁNH GIÁ */}
          {activeTab === 'reviews' && (
            <div className="pt-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-[#F8FAFC] p-6 rounded-xl border border-slate-100">
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black text-slate-800">4.9 / 5</span>
                  <div className="flex text-amber-500 py-1">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                    <Star className="w-4 h-4 fill-amber-500" />
                  </div>
                  <span className="text-xs text-slate-500">Dựa trên 328 đánh giá thực tế từ vận động viên</span>
                </div>

                <div className="md:col-span-8 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-right font-bold text-slate-600">5 sao</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[92%]" />
                    </div>
                    <span className="w-8 text-slate-400">92%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-right font-bold text-slate-600">4 sao</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[6%]" />
                    </div>
                    <span className="w-8 text-slate-400">6%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-right font-bold text-slate-600">3 sao</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[2%]" />
                    </div>
                    <span className="w-8 text-slate-400">2%</span>
                  </div>
                </div>
              </div>

              {/* Add review form */}
              <form onSubmit={handleReviewSubmit} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Viết nhận xét của bạn</span>
                <div className="flex flex-wrap gap-4 items-center">
                  <input
                    type="text"
                    placeholder="Họ tên của bạn..."
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-secondary flex-1 min-w-[200px]"
                  />
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
              <div className="flex flex-col gap-3">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{rev.userFullName || 'Vận động viên'}</span>
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-bold">
                            ĐÃ MUA HÀNG
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">Vừa xong</span>
                      </div>
                      <div className="flex text-amber-500">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-500" />
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">Nguyễn Hoàng Long (VĐV Phong trào TP.HCM)</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-bold">
                          ĐÃ MUA HÀNG
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">2 ngày trước</span>
                    </div>
                    <div className="flex text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" /><Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" /><Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Chất cotton dày dặn hơn hẳn mấy mẫu rẻ ngoài chợ, thấm hút mồ hôi cực kỳ nhanh. Mình đánh liền 3 set đôi nam mà trán khô ráo, không bị cay mắt. Băng tay ôm vừa khít, cầm cán vợt không lo mồ hôi chảy xuống grip. Rất đáng tiền!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: HỎI ĐÁP CHUYÊN GIA */}
          {activeTab === 'faq' && (
            <div className="pt-6 flex flex-col gap-4">
              <h3 className="text-base font-black text-slate-800">Giải đáp thắc mắc cùng ban chuyên môn Apex</h3>
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-secondary" />
                    Hỏi: Băng trán có bị dão sau khi giặt máy không?
                  </span>
                  <p className="text-xs text-slate-600 pl-6">
                    Trả lời: Băng chặn Apex có thành phần 20% sợi đàn hồi Elastodiene kết hợp dệt mật độ cao nên giữ form rất tốt. Khuyến khích bạn bỏ vào túi giặt lưới và giặt chế độ nhẹ để tuổi thọ sản phẩm được hơn 1 năm sử dụng.
                  </p>
                </div>

                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-100 flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-secondary" />
                    Hỏi: Đeo băng tay có bị cản trở động tác gập cổ tay khi đập cầu?
                  </span>
                  <p className="text-xs text-slate-600 pl-6">
                    Trả lời: Không hề bạn nhé. Chiều dài 8cm được thiết kế vừa khít vùng xương cổ tay, hỗ trợ ổn định khớp nhẹ nhàng mà không gây cứng hay hạn chế biên độ vung vợt cầu lông.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RELATED PRODUCTS */}
      <div className="max-w-[80rem] mx-auto px-4 mt-12 flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs text-secondary uppercase tracking-widest font-black">Tournament Gear &amp; Essentials</span>
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A]">Sản Phẩm Cùng Phân Khúc Phụ Kiện Pro</h2>
          </div>
          <Link to="/products?category=accessories" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1">
            Xem tất cả phụ kiện <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Item 1 */}
          <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="relative aspect-square bg-slate-50 p-4 flex items-center justify-center">
              <span className="absolute top-3 left-3 px-2 py-0.5 bg-secondary text-white rounded-full text-[10px] font-bold">
                -15%
              </span>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDERTcBcxwsCKA3dlZZ-5sfV2hHU2hdbXO4UcvZaHOyElOZ_9--1v99qs-FQ5y-G2k-sMHPJDgV8hYwICp2Aa2gE-6jTipjs1cGGTZ5xB4A0YSbpAAwZCfk--p6oEwy6julUu4bYXQdWM9gvjSFeE_xMtlJBNQDci5kiyOBHvSPbhtMMn8TyO6SkoKfNkeZOJVZuUZ1kk9zWeSk2hQ2Ano2ac-Q1xoZzg1yDzyc03KbPdN4u7Ah6zfg"
                alt="Quấn Cán Vợt Yonex Super Grap AC102EX" 
                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-500 text-[11px]">
                  <Star className="w-3 h-3 fill-amber-500" />
                  <span className="font-bold text-slate-800">4.9</span>
                  <span className="text-slate-400">(1.2k)</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mt-1">
                  Quấn Cán Vợt Yonex Super Grap AC102EX (Vỉ 3 cuộn)
                </h3>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 line-through block">115.000₫</span>
                  <span className="text-xs font-black text-secondary">95.000₫</span>
                </div>
                <button
                  type="button"
                  aria-label="Thêm giỏ hàng"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-secondary hover:text-white flex items-center justify-center transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Item 2 */}
          <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="relative aspect-square bg-slate-50 p-4 flex items-center justify-center">
              <span className="absolute top-3 left-3 px-2 py-0.5 bg-secondary text-white rounded-full text-[10px] font-bold">
                HOT
              </span>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_y1FMvwHOKrT_y4Qu8GZLCBdk1u3oFuESihffxoq1Vx9uFGXeM0aX_NxcjmfLazqTGjwMi5-klGIVfxwUp15QgRO5k4Aahamv-5uiGpgn1hHPWbzNWi_nwjh16QlxGrmXKg9m4opxwArHd3Moffa8HSS8ydm3ZySOJkmLg8fW0f338cRndgCvshk9DBp2kFHLkk-HzjWQU0XfMKNIZvAQ8oLI7Cje1OJSxbfP1dIyqm7_kunwM6VL"
                alt="Băng Cổ Tay Yonex AC489" 
                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-500 text-[11px]">
                  <Star className="w-3 h-3 fill-amber-500" />
                  <span className="font-bold text-slate-800">4.8</span>
                  <span className="text-slate-400">(482)</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mt-1">
                  Băng Cổ Tay Chống Lật Khớp &amp; Thấm Mồ Hôi Yonex AC489
                </h3>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 line-through block">135.000₫</span>
                  <span className="text-xs font-black text-secondary">110.000₫</span>
                </div>
                <button
                  type="button"
                  aria-label="Thêm giỏ hàng"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-secondary hover:text-white flex items-center justify-center transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="relative aspect-square bg-slate-50 p-4 flex items-center justify-center">
              <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#131B2E] text-white rounded-full text-[10px] font-bold">
                BWF GEAR
              </span>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtgdyJOtDOSWbsLhboMqeQGLfEYqYOeBtrXMiosCQgctrN_ksIxc_9wtifzmRYLRTXPk71sBR-9pHVJvBEE9oW5KU9RCXelMLK77eQuO1kOESBT6X_DZHeNJ6wOTMXPq1JyFMhlHta4fj2bthLfPGbAx_dwp9rkdPw89SQUDh0nmt0gWPgUoCHcHqIOUECSadxWBeVm6z4hRVBVLw1QieS59Jaa9GmMT_e3p7sDO9oh8Ogm2OZ_HDh"
                alt="Dây Cước Cầu Lông Yonex BG65Ti" 
                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-500 text-[11px]">
                  <Star className="w-3 h-3 fill-amber-500" />
                  <span className="font-bold text-slate-800">5.0</span>
                  <span className="text-slate-400">(890)</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mt-1">
                  Dây Cước Cầu Lông Yonex BG65Ti Trợ Lực Bền Bỉ
                </h3>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 line-through block">150.000₫</span>
                  <span className="text-xs font-black text-secondary">135.000₫</span>
                </div>
                <button
                  type="button"
                  aria-label="Thêm giỏ hàng"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-secondary hover:text-white flex items-center justify-center transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Item 4 */}
          <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="relative aspect-square bg-slate-50 p-4 flex items-center justify-center">
              <span className="absolute top-3 left-3 px-2 py-0.5 bg-secondary text-white rounded-full text-[10px] font-bold">
                TOURNAMENT
              </span>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAR307yihQ0t2JLm2zNaGVw0ukqATC_eOpWet1j4rGeGhARKMUqtZT7cuSVz_RXUctbDksXYOsaxazwttF91vqSZQKu5nvJtHXa0gkjKKM6Oexu92vOrXdOkWex1yiwbVSFR3KymUUc_a6N9mLqsGuVFafIihlYAoqi5j1UHIkSHxLR4nppoppDuyWIqpVv7IOuwg7F-uiK-BlliIvdHRHcbplo92IERyrgAPMIkQKFBzed3pdeB80P"
                alt="Quả Cầu Lông Thi Đấu Yonex Aerosensa 50" 
                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-500 text-[11px]">
                  <Star className="w-3 h-3 fill-amber-500" />
                  <span className="font-bold text-slate-800">4.9</span>
                  <span className="text-slate-400">(610)</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-2 mt-1">
                  Quả Cầu Lông Thi Đấu Yonex Aerosensa 50 (Ống 12 quả)
                </h3>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 line-through block">580.000₫</span>
                  <span className="text-xs font-black text-secondary">520.000₫</span>
                </div>
                <button
                  type="button"
                  aria-label="Thêm giỏ hàng"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-secondary hover:text-white flex items-center justify-center transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SweatbandDetailPage;
