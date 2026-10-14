import useBannerCarousel from '../hooks/useBannerCarousel';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import { ProductRating } from '../components/ProductFacts';
import { productCategory } from '../utils/formatters';
import { Flame, ArrowRight, ChevronRight, ArrowUpRight, Footprints, Backpack, Shirt, Trophy, Swords, X, ShoppingCart, Check, ShieldCheck, Truck, Shield, Headphones } from 'lucide-react';

export const HERO_SLIDES = [
  { badgeText: 'Danh mục vợt cầu lông', tagline: 'Lựa chọn theo lối chơi', titleLine1: 'VỢT CẦU LÔNG',
    titleGradient: 'CHỌN ĐÚNG TRANG BỊ', description: 'Xem thông số và các phiên bản còn hàng của Yonex, Victor, Li-Ning, Mizuno, Kawasaki và Fleet.',
    ctaPrimary: 'Xem vợt', ctaPrimaryLink: '/products?categoryId=1', ctaSecondary: 'So sánh thông số', ctaSecondaryLink: '/compare' },
  { badgeText: 'Danh mục giày cầu lông', tagline: 'Chọn kích cỡ phù hợp', titleLine1: 'GIÀY CẦU LÔNG',
    titleGradient: 'SẴN SÀNG DI CHUYỂN', description: 'Đối chiếu kích cỡ, màu sắc và thông số từng mẫu trước khi chọn mua.',
    ctaPrimary: 'Xem giày', ctaPrimaryLink: '/products?categoryId=2', ctaSecondary: 'Xem sản phẩm', ctaSecondaryLink: '/products' },
  { badgeText: 'Quần áo và túi cầu lông', tagline: 'Trang bị cho buổi tập', titleLine1: 'QUẦN ÁO & TÚI',
    titleGradient: 'LỰA CHỌN THEO NHU CẦU', description: 'Kiểm tra chất liệu, kích cỡ và quy cách của từng sản phẩm trong danh mục.',
    ctaPrimary: 'Xem quần áo', ctaPrimaryLink: '/products?categoryId=3', ctaSecondary: 'Xem balo & bao vợt', ctaSecondaryLink: '/products?categoryId=4' },
  { badgeText: 'Danh mục phụ kiện', tagline: 'Hoàn thiện trang bị', titleLine1: 'PHỤ KIỆN CẦU LÔNG',
    titleGradient: 'CHỌN ĐÚNG QUY CÁCH', description: 'Tìm dây cước, quấn cán, quả cầu và các phụ kiện theo thông số trong cửa hàng.',
    ctaPrimary: 'Xem phụ kiện', ctaPrimaryLink: '/products?categoryId=5', ctaSecondary: 'Tìm dây cước', ctaSecondaryLink: '/products?categoryId=5&keyword=c%C6%B0%E1%BB%9Bc' }
];
export function homeCatalog(response) {
  const list = Array.isArray(response) ? response : response?.content;
  if (!Array.isArray(list)) throw new Error('Danh sách sản phẩm không hợp lệ.');
  return list.filter(item => Number.isSafeInteger(item?.id) && item.id > 0 && item.catalogVisible !== false);
}
export const newHomeProducts = products => products.filter(item => item.isNew === true).slice(0, 4);
const HomePage = () => {
  const { activeSlide, dragging, offset, handlers } = useBannerCarousel(HERO_SLIDES.length);
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true), [dataError, setDataError] = useState(''), [retry, setRetry] = useState(0);


  // Danh sách công khai từ API.
  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setLoading(true); setDataError(''); setProducts([]);
      try {
        const res = await productApi.getProducts({});
        const list = homeCatalog(res);
        if (active) setProducts(list);
      } catch (err) {
        if (active) setDataError('Không tải được sản phẩm. Vui lòng thử lại.');
      } finally { if (active) setLoading(false); }
    };
    loadProducts();
    return () => { active = false; };
  }, [retry]);

  // Filter products by tab
  const filteredProducts = products.filter(item => {
    const categories = { racket: 'RACKET', shoes: 'SHOES', apparel: 'APPAREL', bag: 'BAG', accessory: 'ACCESSORIES' };
    return activeTab === 'all' || productCategory(item) === categories[activeTab];
  });

  const currentHero = HERO_SLIDES[activeSlide];

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC]">
      
      {/* 1. HERO BANNER SLIDER (Full-bleed sports smash energy) */}
      <section role="region" aria-label="Banner quảng cáo" tabIndex={0} {...handlers}
        style={{ touchAction: 'pan-y' }} className="relative w-full overflow-hidden bg-[#131B2E] text-white py-14 lg:py-24 select-none cursor-grab active:cursor-grabbing">
        {/* Background Image & Layered Lighting */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#131B2E] via-[#131B2E]/90 to-transparent" />
        <div className="absolute -right-32 -bottom-32 w-[550px] h-[550px] rounded-full bg-secondary/15 blur-[120px] pointer-events-none" />
        <div className="absolute right-1/4 top-0 w-[400px] h-[400px] rounded-full bg-[#497CFF]/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8"
          style={{ transform: 'translateX(' + offset * 0.18 + 'px)', transition: dragging ? 'none' : 'transform 180ms ease' }}>
          <div className="max-w-2xl flex flex-col items-start gap-5">
            
            {/* Trust/Tournament Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold tracking-wide">
                <span className="text-secondary font-bold">★</span> {currentHero.badgeText}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-white text-xs tracking-wider uppercase font-bold shadow-sm">
                THÔNG SỐ THEO TỪNG MẪU
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#7C839B] text-xs">
                Xem điều kiện bảo hành bên dưới
              </span>
            </div>

            {/* Hero Typography */}
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-secondary font-extrabold">
                {currentHero.tagline}
              </span>
              <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-normal text-white leading-[1.18] drop-shadow-sm">
                {currentHero.titleLine1} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  {currentHero.titleGradient}
                </span>
              </h1>
            </div>

            <p className="text-sm sm:text-base text-[#7C839B] leading-relaxed max-w-xl">
              {currentHero.description}
            </p>

            {/* CTA Action Cluster */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link 
                to={currentHero.ctaPrimaryLink}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-secondary/30 active:scale-95"
              >
                <span>{currentHero.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                to={currentHero.ctaSecondaryLink}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors"
              >
                <span>{currentHero.ctaSecondary}</span>
              </Link>
            </div>


          </div>
        </div>
      </section>

      {/* 2. SECTION: DANH MỤC NỔI BẬT (5 Category Cards) */}
      <section className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
              <span className="text-xs uppercase tracking-wider text-secondary font-bold">Hạng mục tuyển chọn</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-slate-900 font-extrabold uppercase tracking-tight">
              DANH MỤC NỔI BẬT
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Lựa chọn trang bị theo từng danh mục sản phẩm.
            </p>
          </div>
          <Link 
            to="/products"
            className="inline-flex items-center gap-1 text-xs uppercase text-secondary hover:text-secondary-hover transition-colors font-bold pb-1"
          >
            <span>Xem tất cả danh mục</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
          {/* 1. Vợt cầu lông */}
          <Link 
            to="/products?categoryId=1"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden border border-[#E2E8F0] hover:border-[#CBD5E1]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#F2F4F6] rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-[#F2F4F6] group-hover:bg-secondary group-hover:text-white text-slate-800 flex items-center justify-center transition-colors shadow-sm">
                <Swords className="w-6 h-6" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6E8EA] text-slate-700 group-hover:bg-secondary group-hover:text-white transition-colors">
                20+
              </span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">
                Vợt cầu lông
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                Astrox, Nanoflare, Thruster, Halbertec
              </p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* 2. Giày cầu lông */}
          <Link 
            to="/products?categoryId=2"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden border border-[#E2E8F0] hover:border-[#CBD5E1]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#F2F4F6] rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-[#F2F4F6] group-hover:bg-secondary group-hover:text-white text-slate-800 flex items-center justify-center transition-colors shadow-sm">
                <Footprints className="w-6 h-6" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6E8EA] text-slate-700 group-hover:bg-secondary group-hover:text-white transition-colors">
                20+
              </span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">
                Giày cầu lông
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                Chọn kích cỡ và xem công nghệ của từng mẫu giày
              </p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* 3. Balo & Bao vợt */}
          <Link 
            to="/products?categoryId=4"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden border border-[#E2E8F0] hover:border-[#CBD5E1]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#F2F4F6] rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-[#F2F4F6] group-hover:bg-secondary group-hover:text-white text-slate-800 flex items-center justify-center transition-colors shadow-sm">
                <Backpack className="w-6 h-6" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6E8EA] text-slate-700 group-hover:bg-secondary group-hover:text-white transition-colors">
                20+
              </span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">
                Balo & Bao vợt
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                Xem dung tích và sức chứa vợt theo từng mẫu
              </p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* 4. Quần áo đấu */}
          <Link 
            to="/products?categoryId=3"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden border border-[#E2E8F0] hover:border-[#CBD5E1]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#F2F4F6] rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-[#F2F4F6] group-hover:bg-secondary group-hover:text-white text-slate-800 flex items-center justify-center transition-colors shadow-sm">
                <Shirt className="w-6 h-6" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6E8EA] text-slate-700 group-hover:bg-secondary group-hover:text-white transition-colors">
                20+
              </span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">
                Quần áo đấu
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                Chọn kích cỡ và chất liệu vải theo từng mẫu
              </p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* 5. Phụ kiện pro */}
          <Link 
            to="/products?categoryId=5"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden border border-[#E2E8F0] hover:border-[#CBD5E1]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#F2F4F6] rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-[#F2F4F6] group-hover:bg-secondary group-hover:text-white text-slate-800 flex items-center justify-center transition-colors shadow-sm">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6E8EA] text-slate-700 group-hover:bg-secondary group-hover:text-white transition-colors">
                20+
              </span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">
                Phụ kiện pro
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                Cước BG65Ti/BG80, Quấn cán, Quả cầu thi đấu
              </p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 3. SECTION: SẢN PHẨM BÁN CHẠY NHẤT (Top Best Sellers Grid) */}
      <section className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <Flame className="w-6 h-6 fill-secondary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase text-slate-900">
                  SẢN PHẨM NỔI BẬT
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-secondary text-white">
                  TRONG CỬA HÀNG
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Xem sản phẩm đang hiển thị trong từng danh mục.
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center p-1 bg-[#ECEEF0] rounded-xl overflow-x-auto">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'all' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setActiveTab('racket')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'racket' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vợt cầu lông
            </button>
            <button 
              onClick={() => setActiveTab('shoes')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'shoes' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giày cầu lông
            </button>
            <button onClick={() => setActiveTab('apparel')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'apparel' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              Quần áo
            </button>
            <button 
              onClick={() => setActiveTab('bag')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'bag' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Balo & Túi
            </button>
            <button 
              onClick={() => setActiveTab('accessory')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'accessory' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phụ Kiện Pro
            </button>
          </div>
        </div>

        {/* 8 Product Cards Grid */}
        {loading && <p role="status">Đang tải sản phẩm...</p>}
        {dataError && <div role="alert" className="mb-4 text-red-700">{dataError}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Thử lại</button></div>}
        {!loading && !dataError && filteredProducts.length === 0 && <p>Chưa có sản phẩm trong danh mục này.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {filteredProducts.slice(0, 8).map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
            />
          ))}
        </div>
      </section>

      {/* 4. SECTION: GIÁ TRỊ VƯỢT TRỘI - VÌ SAO CHỌN CHÚNG TÔI (WHY CHOOSE US) */}
      <section id="shop-policy" className="w-full bg-[#131B2E] text-white py-14 lg:py-20 border-t border-slate-800">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-2 mb-12">
            <span className="px-3.5 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase tracking-widest">
              GIÁ TRỊ VƯỢT TRỘI
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-white tracking-tight">
              VÌ SAO CHỌN CHÚNG TÔI
            </h2>
            <div className="w-12 h-1 bg-secondary rounded-full mt-1"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center p-4 pt-6 md:pt-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-1">
                <ShieldCheck className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Thông số sản phẩm
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                Xem thông số, màu sắc, kích cỡ và quy cách theo từng mẫu trước khi đặt hàng.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center p-4 pt-6 md:pt-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-1">
                <Truck className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Phí giao hàng
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                Phí giao hàng 30.000đ; miễn phí từ 1.000.000đ tiền hàng. Voucher vận chuyển giảm theo phí thực tế.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center p-4 pt-6 md:pt-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-1">
                <Shield className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Bảo hành 1 đổi 1 trong 90 ngày
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                Áp dụng vợt, giày, quần áo và balo/bao vợt sau khi thanh toán và giao hoàn tất. Phụ kiện không có ưu đãi này.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-center text-center p-4 pt-6 md:pt-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-1">
                <Headphones className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Điểm tích lũy HGClub
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                Mỗi 10.000đ tiền hàng đã thanh toán nhận 1 điểm; 1 điểm đổi 100đ, tối đa 10% tiền hàng sau voucher. Không tính phí giao hàng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: BỘ SƯU TẬP MỚI VỀ (New Arrivals 2024 - 4 Columns) */}
      <section className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs uppercase tracking-wider text-[#2563EB] font-bold">SẢN PHẨM MỚI VỀ</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-slate-900 font-extrabold uppercase tracking-tight">
              BỘ SƯU TẬP MỚI VỀ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Các sản phẩm được đánh dấu mới trong 14 ngày từ ngày về hàng do cửa hàng ghi nhận.
            </p>
          </div>
          <Link 
            to="/products"
            className="inline-flex items-center gap-1 text-xs uppercase text-[#2563EB] hover:text-secondary transition-colors font-bold pb-1"
          >
            <span>XEM TẤT CẢ BỘ SƯU TẬP</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {newHomeProducts(products).map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
            />
          ))}
        </div>
        {!loading && !dataError && newHomeProducts(products).length === 0 && <p>Hiện chưa có sản phẩm mới về trong 14 ngày gần đây.</p>}
      </section>

      {/* 6. SECTION: ĐÁNH GIÁ KHÁCH HÀNG (Customer Reviews - 3 Cards) */}
      <section className="w-full bg-[#F2F4F6] py-14 lg:py-20 border-y border-[#E2E8F0]">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-slate-900">ĐÁNH GIÁ SẢN PHẨM</h2>
            <p className="text-xs sm:text-sm text-slate-500">Điểm và số đánh giá được lấy từ dữ liệu của từng sản phẩm.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.slice(0, 3).map(product => <div key={product.id} className="bg-white p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-md border border-[#E2E8F0] transition-all flex flex-col justify-between gap-6">
              <h3 className="font-display text-sm font-bold text-slate-900">{product.name}</h3>
              <ProductRating product={product} />
              <Link to={`/products/${product.id}`} className="text-xs text-secondary font-bold">Xem đánh giá sản phẩm</Link>
            </div>)}
          </div>
        </div>
      </section>

      {/* 7. SECTION: ĐỐI TÁC THƯƠNG HIỆU CHIẾN LƯỢC (Brand Ribbon) */}
      <section className="w-full bg-white py-12 border-b border-[#E2E8F0]">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
              ĐỐI TÁC THƯƠNG HIỆU CHIẾN LƯỢC
            </span>
            <span className="w-12 h-0.5 bg-secondary mt-2"></span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center opacity-70 hover:opacity-100 transition-opacity">
            <Link to="/products?brand=YONEX" className="flex items-center justify-center h-14 w-36 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-2xl font-black tracking-tighter text-slate-900 hover:text-secondary transition-colors">YONEX</span>
            </Link>
            <Link to="/products?brand=VICTOR" className="flex items-center justify-center h-14 w-36 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-2xl font-black tracking-wider text-slate-900 hover:text-[#2563EB] transition-colors">VICTOR</span>
            </Link>
            <Link to="/products?brand=LINING" className="flex items-center justify-center h-14 w-36 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-2xl font-black tracking-tight text-slate-900 hover:text-secondary transition-colors">LI-NING</span>
            </Link>
            <Link to="/products?brand=MIZUNO" className="flex items-center justify-center h-14 w-36 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-2xl font-black tracking-widest text-slate-900 hover:text-[#2563EB] transition-colors">MIZUNO</span>
            </Link>
            <Link to="/products?brand=KAWASAKI" className="flex items-center justify-center h-14 w-36 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-2xl font-extrabold tracking-normal text-slate-900 hover:text-secondary transition-colors">KAWASAKI</span>
            </Link>
            <Link to="/products?brand=FLEET" className="flex items-center justify-center h-14 w-36 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-2xl font-black tracking-widest text-slate-900 hover:text-primary transition-colors">FLEET</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
