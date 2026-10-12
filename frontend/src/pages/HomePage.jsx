import useBannerCarousel from '../hooks/useBannerCarousel';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { ProductRating, productSpecSummary, productValue, productCartOptions } from '../components/ProductFacts';
import { productCategory } from '../utils/formatters';
import { Flame, ArrowRight, ChevronRight, ArrowUpRight, Footprints, Backpack, Shirt, Trophy, Swords, X, ShoppingCart, Check, ShieldCheck, Truck, Shield, Headphones } from 'lucide-react';

// Danh sách Hero Slides theo đúng chuẩn thi đấu HG BWF
const HERO_SLIDES = [
  {
    badgeText: 'Giải đấu Quốc tế 2024',
    tagline: 'Tournament Series 2024',
    titleLine1: 'HG PRO TOUR 2024',
    titleGradient: 'BỨT PHÁ MỌI GIỚI HẠN SMASH',
    description: 'Khám phá bộ sưu tập vợt, giày và trang bị thi đấu chuyên nghiệp chuẩn BWF. Giảm tới 35% cho thành viên mới cùng dịch vụ căng cước chuẩn BWF Tournament.',
    ctaPrimary: 'Mua ngay',
    ctaPrimaryLink: '/products',
    ctaSecondary: 'Khám phá bộ sưu tập',
    ctaSecondaryLink: '/products?sale=true',
    slideCode: '01 / 04 SMASH EDITION',
    bgImage: 'https://lh3.googleusercontent.com/aida/AEtjO1WnCri4_js0e8_-uBsfS2jif7zSpzBPOHaHnHP0kIUHp3v5h6_D5sR-XfIHJytBPt3KgbcRUEHT6PMS9K52OI_DaS-Ro61enM8us2nebGYymeA-IrL3Bzt_a_Q5BwTJj2Hjp2WaCT_yDorE3D9Zr2YfwifheyDXtK4J3AfimAlwfYF-c29Yv-Dj7ydJVciQMv6RwTtr9zmzgTew16-rgAneEdC0a9lpAb99jsq4WApfao2LO-yx73JDa2I'
  },
  {
    badgeText: 'Bản Đột Phá Carbon 2025',
    tagline: 'Hyper Slim Shaft Series',
    titleLine1: 'YONEX ASTROX 100ZZ',
    titleGradient: 'KURENAI TOURNAMENT EDITION',
    description: 'Trang bị khung nặng đầu tích hợp hệ thống Rotational Generator và đũa siêu mỏng Hyper Slim Shaft cho cú smash cắm sàn không thể cản phá.',
    ctaPrimary: 'Xem chi tiết',
    ctaPrimaryLink: '/products?keyword=Astrox',
    ctaSecondary: 'So sánh thông số',
    ctaSecondaryLink: '/compare',
    slideCode: '02 / 04 POWER SMASH',
    bgImage: 'https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?q=80&w=2070&auto=format&fit=crop'
  },
  {
    badgeText: 'Công Nghệ Đệm Khí Power Cushion+',
    tagline: 'Court Agility 2024',
    titleLine1: 'GIÀY THI ĐẤU YONEX 65Z3',
    titleGradient: 'TỐI ƯU TỐC ĐỘ BƯỚC DI CHUYỂN',
    description: 'Khả năng hấp thụ chấn động và hoàn trả lực vượt trội giúp bạn làm chủ từng pha bật nhảy cứu cầu góc sân hiểm hóc nhất.',
    ctaPrimary: 'Khám phá giày',
    ctaPrimaryLink: '/products?categoryId=2',
    ctaSecondary: 'Xem ưu đãi',
    ctaSecondaryLink: '/products?sale=true',
    slideCode: '03 / 04 SPEED & AGILITY',
    bgImage: 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?q=80&w=2076&auto=format&fit=crop'
  },
  {
    badgeText: 'Dịch Vụ Chuẩn BWF Certified',
    tagline: 'Electronic Precision 9.0',
    titleLine1: 'CĂNG CƯỚC 4 NÚT ĐIỆN TỬ',
    titleGradient: 'CHUẨN LỰC ĐẾN TỪNG LBS',
    description: 'Đội ngũ KTV chứng chỉ quốc tế căng vợt điện tử lấy liền sau 20 phút. Bảo hành đứt cước 24H an tâm tuyệt đối trên mọi giải đấu.',
    ctaPrimary: 'Khám phá ngay',
    ctaPrimaryLink: '/products?categoryId=5',
    ctaSecondary: 'Xem loại cước',
    ctaSecondaryLink: '/product/string/string-bg80p',
    slideCode: '04 / 04 STRINGING PRO',
    bgImage: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?q=80&w=2069&auto=format&fit=crop'
  }
];

// 8 Sản phẩm bán chạy chuẩn thiết kế gốc

// 4 Sản phẩm mới về (New Arrivals 2024)

const HomePage = () => {
  const { activeSlide, dragging, offset, handlers } = useBannerCarousel(HERO_SLIDES.length);
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Danh sách công khai từ API.
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await productApi.getProducts({});
        const list = Array.isArray(res) ? res : (res?.content || []);
        if (list.length > 0) {
          setProducts(list);
        }
      } catch (err) {
        console.warn('Không thể tải sản phẩm:', err);
      }
    };
    loadProducts();
  }, []);

  // Filter products by tab
  const filteredProducts = products.filter(item => {
    const categories = { racket: 'RACKET', shoes: 'SHOES', bag: 'BAG', accessory: 'ACCESSORIES' };
    return activeTab === 'all' || productCategory(item) === categories[activeTab];
  });

  const currentHero = HERO_SLIDES[activeSlide];

  const handleOpenQuickView = (product) => {
    setQuickViewProduct(product);
    setQuickViewQty(1);
    setAddedSuccess(false);
  };

  const handleCloseQuickView = () => {
    setQuickViewProduct(null);
  };

  const handleQuickAdd = () => {
    if (quickViewProduct) {
      if (!addToCart(quickViewProduct, quickViewQty, productCartOptions(quickViewProduct))) {
        alert('Không đủ tồn kho hoặc số lượng không hợp lệ.');
        return;
      }
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        handleCloseQuickView();
      }, 1200);
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC]">
      
      {/* 1. HERO BANNER SLIDER (Full-bleed sports smash energy) */}
      <section role="region" aria-label="Banner quảng cáo" tabIndex={0} {...handlers}
        style={{ touchAction: 'pan-y' }} className="relative w-full overflow-hidden bg-[#131B2E] text-white py-14 lg:py-24 select-none cursor-grab active:cursor-grabbing">
        {/* Background Image & Layered Lighting */}
        <div 
          className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${currentHero.bgImage}')` }}
        />
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
                100% Chính hãng BWF Approved
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#7C839B] text-xs">
                Bảo hành 1 đổi 1
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
              Lựa chọn theo từng dòng trang bị thi đấu chuyên nghiệp chuẩn thi đấu BWF
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
                  SẢN PHẨM BÁN CHẠY NHẤT
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-secondary text-white">
                  TOP BEST SELLERS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Lựa chọn hàng đầu của các tay vợt chuyên nghiệp & vận động viên tuyển quốc gia
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
              Vợt Hot
            </button>
            <button 
              onClick={() => setActiveTab('shoes')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'shoes' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giày Siêu Bám Sân
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {filteredProducts.slice(0, 8).map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onQuickView={handleOpenQuickView}
            />
          ))}
        </div>
      </section>

      {/* 4. SECTION: GIÁ TRỊ VƯỢT TRỘI - VÌ SAO CHỌN CHÚNG TÔI (WHY CHOOSE US) */}
      <section className="w-full bg-[#131B2E] text-white py-14 lg:py-20 border-t border-slate-800">
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
                Hàng chính hãng 100%
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                Nhập khẩu trực tiếp từ Yonex, Victor, Lining, Mizuno với tem chống hàng giả chuẩn Bộ Công An.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center p-4 pt-6 md:pt-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-1">
                <Truck className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Giao hàng nhanh 2-3 ngày
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500.000đ. Đóng gói hộp chống va đập 3 lớp.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center p-4 pt-6 md:pt-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-1">
                <Shield className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Bảo hành chính hãng
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                12 tháng cho vợt, 6 tháng cho giày và phụ kiện. Kích hoạt bảo hành điện tử nhanh qua hotline.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-center text-center p-4 pt-6 md:pt-4 gap-3">
              <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mb-1">
                <Headphones className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                Hỗ trợ tận tâm 24/7
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
                Đội ngũ chuyên gia tư vấn chọn vợt theo lối đánh, cân lực cổ tay và hỗ trợ chọn size giày chuẩn xác.
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
              <span className="text-xs uppercase tracking-wider text-[#2563EB] font-bold">HÀNG CHÍNH HÃNG MỚI VỀ 2024</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-slate-900 font-extrabold uppercase tracking-tight">
              BỘ SƯU TẬP MỚI VỀ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Cập nhật những công nghệ đột phá mới nhất cho vận động viên HG Badminton
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
          {products.slice(0, 4).map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onQuickView={handleOpenQuickView}
            />
          ))}
        </div>
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

      {/* QUICK VIEW MODAL (Xem Nhanh Sản Phẩm) */}
      {quickViewProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={handleCloseQuickView}
        >
          <div 
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={handleCloseQuickView}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Image Stage */}
            <div className="w-full md:w-1/2 bg-[#F2F4F6] p-6 flex items-center justify-center relative min-h-[260px]">
              <img 
                src={quickViewProduct.imageUrl} 
                alt={quickViewProduct.name}
                className="max-h-64 object-contain mix-blend-multiply"
              />
              <span className="absolute top-4 left-4 px-2.5 py-0.5 rounded-full bg-secondary text-white text-xs font-bold uppercase tracking-wider">
                {productValue(quickViewProduct.categoryName)}
              </span>
            </div>

            {/* Right Product Details */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold text-slate-900 uppercase">
                    {productValue(quickViewProduct.brand)}
                  </span>
                  <span className="bg-[#ECEEF0] text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                    {productSpecSummary(quickViewProduct)}
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-slate-900 leading-snug">
                  {quickViewProduct.name}
                </h3>

                {/* Rating */}
                <ProductRating product={quickViewProduct} />

                {/* Price */}
                <div className="flex items-baseline gap-2 my-3">
                  <span className="font-display text-2xl font-black text-secondary">
                    {formatPrice(quickViewProduct.price)}
                  </span>
                  {quickViewProduct.originalPrice > quickViewProduct.price && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(quickViewProduct.originalPrice)}
                    </span>
                  )}
                </div>

                {/* Tech Highlights */}
                <div className="border-t border-slate-100 pt-3 my-3 text-xs text-slate-600 space-y-1">
                  <p>Mã sản phẩm: {productValue(quickViewProduct.sku)}</p>
                  <p>Danh mục: {productValue(quickViewProduct.categoryName)}</p>
                  <p className="line-clamp-3">{productValue(quickViewProduct.description)}</p>
                </div>
              </div>

              {/* Action Cluster */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                {/* Quantity */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Số lượng:</span>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                    >
                      -
                    </button>
                    <span className="px-4 py-1 text-xs font-bold text-slate-900">
                      {quickViewQty}
                    </span>
                    <button 
                      onClick={() => setQuickViewQty(quickViewQty + 1)}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add to cart CTA */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleQuickAdd}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                      addedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-secondary hover:bg-secondary-hover text-white'
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Đã thêm vào giỏ!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>{['SHOES', 'APPAREL'].includes(productCategory(quickViewProduct)) ? 'Chọn kích cỡ' : 'Thêm vào giỏ hàng'}</span>
                      </>
                    )}
                  </button>
                  <Link
                    to={`/products/${quickViewProduct.id}`}
                    onClick={handleCloseQuickView}
                    className="py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-400 text-slate-700 font-bold text-xs uppercase tracking-wider text-center transition-colors"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;
