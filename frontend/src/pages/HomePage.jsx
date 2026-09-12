import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import { 
  Flame, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  CheckCircle2, 
  Wrench, 
  ShieldCheck, 
  Zap, 
  Layers, 
  ArrowUpRight,
  Footprints,
  Backpack,
  Shirt,
  Trophy,
  Swords
} from 'lucide-react';

// Danh sách Hero Slides theo đúng chuẩn thi đấu APEX BWF
const HERO_SLIDES = [
  {
    badgeText: 'Giải đấu Quốc tế 2024',
    tagline: 'Tournament Series 2024',
    titleLine1: 'APEX PRO TOUR 2024',
    titleGradient: 'BỨT PHÁ MỌI GIỚI HẠN SMASH',
    description: 'Khám phá bộ sưu tập vợt, giày và trang bị thi đấu chuyên nghiệp chuẩn BWF. Giảm tới 35% cho thành viên mới cùng dịch vụ căng cước chuẩn BWF Tournament.',
    ctaPrimary: 'Mua ngay',
    ctaPrimaryLink: '/products',
    ctaSecondary: 'Khám phá bộ sưu tập',
    ctaSecondaryLink: '/products?sale=true',
    slideCode: '01 / 04 SMASH EDITION',
    bgImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop'
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
    ctaPrimaryLink: '/products?category=SHOES',
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
    ctaPrimary: 'Đặt lịch ngay',
    ctaPrimaryLink: '/products?category=ACCESSORIES',
    ctaSecondary: 'Xem loại cước',
    ctaSecondaryLink: '/products?category=ACCESSORIES',
    slideCode: '04 / 04 STRINGING PRO',
    bgImage: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?q=80&w=2069&auto=format&fit=crop'
  }
];

// Dữ liệu fallback sản phẩm bán chạy chuẩn ảnh & thông số từ code.html
const MOCK_BESTSELLERS = [
  {
    id: 1,
    name: 'Vợt Yonex Astrox 100ZZ Kurenai Pro',
    brand: 'Yonex Japan',
    weightGrip: '3U/4U - Head Heavy',
    balancePoint: 'Head-Heavy (Nặng đầu)',
    stiffness: 'Extra Stiff',
    price: 4290000,
    originalPrice: 4850000,
    averageRating: 4.9,
    reviewCount: 128,
    badge: 'Bán chạy',
    stock: 15,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOFwZT1UJx5nkitITNFAjiR7oN1GVOk7tVqfi8VhTpi_UNiYyGmzZchQLR-OHFtbD6abTEHZ1tJeE3F9Ch-Sd5BalslPXTcg-0xfOsJI4H0MzHYnEGOCBg3H41UP0-a7I9elHE07OCDNkyrEKbdAtjgKbL6AAAZffbfOc0QBd8cLbdKs69D4qza-BkpsRhooyHwD-6K0zhrsEZs-tn7-0ACwfqU-7-NeA74IadD4DbLOFHRE7-iO06',
    category: 'racket'
  },
  {
    id: 2,
    name: 'Giày Yonex Power Cushion 65Z3 White Gold',
    brand: 'Yonex',
    weightGrip: 'Power Cushion+',
    balancePoint: 'Bám sân đệm khí',
    stiffness: 'Đế cao su chuyên dụng',
    price: 2790000,
    originalPrice: 3200000,
    averageRating: 5.0,
    reviewCount: 242,
    badge: 'Bán chạy',
    stock: 22,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1WQOsbdAY0gdyqL27VcunwdURledecu-PAk-FoeRnzROUi2tcKee5cL_jvVWz-CSSedLNOWu3-aGuoq4kv1knplN-0kimisZaf_W3B99gK1Cg_eivpFwQV4gPJvZAExISgqhpD15FMvPk2DqCEh2yGwQSmW9sCnPC6IYtjY2sZ1z41dhzhbVzRGgqA0O78EQ8uSU_AdFo5VjZ66kSW5W1tT5WqnQT7OS-mT6ixALyUEQRJusofCy2aOyDg',
    category: 'shoes'
  },
  {
    id: 3,
    name: 'Balo Cầu Lông Apex Pro Tour 30L Waterproof',
    brand: 'Apex Pro Gear',
    weightGrip: 'Chống nước IPX4',
    balancePoint: 'Ngăn vợt & giày riêng',
    stiffness: 'Quai đeo công thái học',
    price: 950000,
    originalPrice: 1250000,
    averageRating: 4.8,
    reviewCount: 96,
    badge: 'Bán chạy',
    stock: 18,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1WHKPki2jTlVwub3ImA3ty3gM2YAQwj5koLaf0fSdkA1LuWAdY1CBsHP_ppZPk9zEh0l-M5KIocq8iVle1sOytRFVPtigTvZP7_ClIXQClVzKNK14ZVnTBdBI1zaJd6nqGtq_r0g_p6kV1d26qIMBVzQ15bM7SOh_N1sejl0pFwtG-noTGsMEfgs57UzRAf1mZSxlshXJilwKAvskhFVytKmP_vfhaYIAZ9WtvTO2uAyLoxl5ZvQf0XRuI',
    category: 'bag'
  },
  {
    id: 4,
    name: 'Áo Đấu Apex Pro Tournament Navy Breathable',
    brand: 'Victor Pro',
    weightGrip: 'CoolMax -3°C',
    balancePoint: 'Co giãn 4 chiều',
    stiffness: 'Thoáng khí siêu nhẹ',
    price: 490000,
    originalPrice: 690000,
    averageRating: 4.9,
    reviewCount: 189,
    badge: 'Bán chạy',
    stock: 45,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1W33GfCrAL5kowciyMaLyni5RiJDVqbk2n_EqKL2ZUu8-7l4rJpBYxuOkJAscOJ_MFf4kmeTj_nNXVtrU2sNt89M5cQqE77l2ZvDxbzswmfmfupFgy6AE17krMf3pOsq22S_LGrxzpl9DFzncwlYIY6y_8Aq28C9TFcc4rYV7-_4C158Uker61uSG44C-W2N-OIb-bf52aaCcj0FySI-ujjYKPPiNUqvVwFVusMR4lJvHpu0QsYkKSc-IA',
    category: 'apparel'
  },
  {
    id: 5,
    name: 'Vợt Victor Thruster Ryuga II Pro Metallic',
    brand: 'Victor Taiwan',
    weightGrip: 'WES 2.0 Hard Flex',
    balancePoint: 'Head-Heavy (Nặng đầu)',
    stiffness: 'Stiff',
    price: 4100000,
    originalPrice: 4650000,
    averageRating: 4.9,
    reviewCount: 114,
    badge: 'Bán chạy',
    stock: 14,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2Esq-IZOOZqw_recVEoOclREp1RkcL3Ik6MbcPcxi2fZ0YeTqOyOxN9WZ5GHTn-DhvAPKmMsBYiTcaFATQOgYTdMB_ak6LUgbQ8MNzKXmW7qpRC2w614dQMYtZuYgWKxaYFE6e78wu9bsY_A2HcU2_9WgX8KGEafkHTuVgckreE1ihm9ttvCIPNYoJr-Ts6wvFjIFchvbkVX9B2PPPmIHyBGBrKw1_jO5nxsd1jwkrxSYLvAko4q1',
    category: 'racket'
  },
  {
    id: 6,
    name: 'Bao Vợt Nhiệt Apex Thermo Guard 9 Cây',
    brand: 'Apex Tour',
    weightGrip: 'Thermo Guard 9 Rackets',
    balancePoint: 'Lớp cách nhiệt cao cấp',
    stiffness: 'Chống thấm nước IPX4',
    price: 1180000,
    originalPrice: 1450000,
    averageRating: 4.8,
    reviewCount: 82,
    badge: 'Bán chạy',
    stock: 20,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1WXypl1zzVROpa9wlvi4aHEbpp6an-KUEQj3s1Zn_cBorV9-9KWZPeJRggWIGWLH0AOiulsUJO2BaScICZ_ir0hmbF_zg-BFWorXy38AotE9ULFdcYJHCzao8MB_shV3BSIFlRMuMm7Ov5H-snSVfWhJ4S_bu76eWxCLbNkrK2PuyU914LJ3ev3domHa8Ey-edUyvW-rKbWvrsfL3uZ_cxaAlDpJQRmadK5lHmKUp7cfkKwi1bQAneb3wQ',
    category: 'bag'
  },
  {
    id: 7,
    name: 'Vợt Li-Ning Halbertec 9000 Pro',
    brand: 'Li-Ning',
    weightGrip: '6.6mm High Modulus',
    balancePoint: 'Even-Balance (Toàn diện)',
    stiffness: 'Medium Stiff',
    price: 4450000,
    originalPrice: 4990000,
    averageRating: 5.0,
    reviewCount: 165,
    badge: 'Bán chạy',
    stock: 12,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAM0qvbH1USq-yBhuIezp7fYiKZOIdItHA4nY8t5fify70TE-mFZfYiuI5HpGQ6qIZZ2G-IuQP5fBDjb0FIxcZEaWy_KmsfpJiIW_OlwIqf1wLrFnO4OhWOaA2czSl1K8t83Aaxlglh-O8OOGvIM_-AWV3A7EFI4Vs_A-Pt5w1PBCvxlZBzjTQsOHukSOJTFGBqRyxEde8O4E3Z4-h5kQXeKoijPbQioLP9IRiq3zNYRGCJoAu1ROJf',
    category: 'racket'
  },
  {
    id: 8,
    name: 'Quấn cán Yonex AC102EX vỉ 3 cuộn',
    brand: 'Yonex',
    weightGrip: 'Super Grap 3-pack',
    balancePoint: 'Độ bám êm tay',
    stiffness: 'Chống mồ hôi tốt',
    price: 95000,
    originalPrice: 120000,
    averageRating: 5.0,
    reviewCount: 512,
    badge: 'Bán chạy',
    stock: 150,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AEtjO1Vi9OaVFBPd6y0h2lY1ChhCbZUxacPh47LeL-4-CqofIOg6PE0CkZFT4JTWaUEof84EMDCWgJBLhyg-rcznbAd0uWPkOi-mxEf83c6JB8z4pkwtbLGfpZWjz4s4mHde4DQEdPY2QevLbZ4tmfyl1c7Qi19ysYkscofFnYdTuKhBIl8p2XLG9UIFDb6AJ11Re3DD02bGTBRd1bAUUcZiLuZFstUxq2Ygr3qz8pcGdzUamC0Lrc_Tw2bDsIA',
    category: 'accessories'
  }
];

// Dữ liệu sản phẩm mới về (New Arrivals 2024)
const MOCK_NEW_ARRIVALS = [
  {
    id: 9,
    name: 'Vợt Yonex Nanoflare 1000Z Lightning Yellow',
    brand: 'Yonex',
    weightGrip: 'Sonic Flare System',
    balancePoint: 'Head-Light (Phản tạt tốc độ)',
    stiffness: 'Extra Stiff',
    price: 4590000,
    originalPrice: null,
    averageRating: 5.0,
    reviewCount: 38,
    badge: 'MỚI 2024',
    stock: 10,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmLNbW-eutvqdp-D_qWa1Kt5afba6rGnYKRLUYULayW5U1dV2LIVFuGONfyrTJHkhY5LgC3l2GS15eIPXGxRtRAE94-fGGV1L71GFUFwm34U4ORrN3kQa2I6z-kUiXyFJWic8-s8Xm1UB55nYEdTiUQ-GI8hxvA2fdj8UMyt1zcVpTbFjKClkhsvwB8kMpD_OILzDmZ0JbZAduuQ7hHfniB7amwVacSdTXiFzfLKOeGG8myJ0bGuJW'
  },
  {
    id: 10,
    name: 'Giày Victor P9200III Nitrolite Tournament',
    brand: 'Victor',
    weightGrip: 'Nitrolite Midsole',
    balancePoint: 'Siêu nhẹ bật nhảy',
    stiffness: 'Đế chống trượt cao cấp',
    price: 3150000,
    originalPrice: null,
    averageRating: 4.9,
    reviewCount: 28,
    badge: 'MỚI 2024',
    stock: 16,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAa3BURE1I88sAdw_GsaUYIqq1caWqE8iyzExCZvTRSoG8LXFEm3Y5tDDNdg1EP5_rnW57ii5KdbEGYTW3BgjDWJWBpBY5iKBbXHdaf8z-FDARP0V5p_6nHyc55QPdiGrFaWKbP1ys3_rdeP61J9RD78Wmt6lq5sTME6NbpQXT4IBd_u0BRkOpaqCeTKqcsHumbEu1PPOVuF2RM1MTPDyorVAlbDMEYiAAMvWLDp18XI2ksU_MM1Ck'
  },
  {
    id: 11,
    name: 'Túi Du Đấu Apex Tour Pro Holdall 45L',
    brand: 'Apex Tour',
    weightGrip: 'Dung tích 45L',
    balancePoint: 'Chống thấm nước',
    stiffness: 'Chứa 6 cây vợt + giày',
    price: 1350000,
    originalPrice: null,
    averageRating: 5.0,
    reviewCount: 19,
    badge: 'MỚI 2024',
    stock: 12,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWD-k6lHEcXn9J84Xjd7_QcDz680mSkQcdsp8iBVkfdo5VODDUCsbC5FIZgIkRB3AvM3qHiNmI7l-Tjl7XD_b7pGrQMyiKqDKO4Lro8vi6lg7Z3e2LQBTYwSztI6AR8B_n7O8cfTp_XTHq4fNYPFrmYBow03iYqCuH-I7GTXjuZaers7BI85NotMTjPFTN4dm9MMs-ZbMyunfH9yNam-wBmtZy_aW7ik6iIQ1oVi7DYorDbLbWGkpL'
  },
  {
    id: 12,
    name: 'Áo Khoác Gió Khởi Động Apex Pro Windbreaker',
    brand: 'Apex Apparel',
    weightGrip: 'Cản gió Warm-up',
    balancePoint: 'Màng thở công nghệ cao',
    stiffness: 'Khóa kéo kháng nước',
    price: 790000,
    originalPrice: null,
    averageRating: 4.8,
    reviewCount: 43,
    badge: 'MỚI 2024',
    stock: 25,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9IEUCgLlL3GW5QIfUXCh_OdodRH7_6SUEKaSHWhU2Rq7VfJrxtbjPPayQDVW8hFirkY66GGyXt4mapHlXYaz5SC0f97d_1FG2RYqn-9sLHN1UsBdfzolgv4YaHRJjIUyrDoWE6q-W0rItCRvyHVaCEhY4dwLJ6tKRyNPX90TiUNrWJtKtelXtDOssE73al0GyFMYTUUitzmd0XenPGkYPuqF1-dgHtMIg-zx0QBbQRbc2COOA9jMP'
  }
];

const HomePage = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto slide interval
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Fetch products from Spring Boot API
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const res = await productApi.getProducts({});
        if (Array.isArray(res) && res.length > 0) {
          setProducts(res);
        } else {
          setProducts(MOCK_BESTSELLERS);
        }
      } catch (err) {
        console.warn('Backend chưa có dữ liệu hoặc offline, dùng sản phẩm thiết kế chuẩn:', err);
        setProducts(MOCK_BESTSELLERS);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Filter products by tab
  const filteredProducts = products.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'racket') {
      return item.category === 'racket' || item.categoryName?.toLowerCase().includes('vợt') || item.name?.toLowerCase().includes('vợt');
    }
    if (activeTab === 'shoes') {
      return item.category === 'shoes' || item.categoryName?.toLowerCase().includes('giày') || item.name?.toLowerCase().includes('giày');
    }
    if (activeTab === 'bag') {
      return item.category === 'bag' || item.categoryName?.toLowerCase().includes('bao') || item.categoryName?.toLowerCase().includes('balo') || item.name?.toLowerCase().includes('bao') || item.name?.toLowerCase().includes('balo');
    }
    return true;
  });

  const currentHero = HERO_SLIDES[activeSlide];

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC]">
      
      {/* 1. HERO BANNER SLIDER (Full-bleed feel with athletic smash energy) */}
      <section className="relative w-full overflow-hidden bg-[#0F172A] text-white py-14 lg:py-24">
        {/* Background Image & Layered Lighting */}
        <div 
          className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity bg-cover bg-center transition-all duration-700 scale-105"
          style={{ backgroundImage: `url('${currentHero.bgImage}')` }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/90 to-transparent" />
        <div className="absolute -right-32 -bottom-32 w-[550px] h-[550px] rounded-full bg-secondary/15 blur-[120px] pointer-events-none" />
        <div className="absolute right-1/4 top-0 w-[400px] h-[400px] rounded-full bg-royal/15 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl flex flex-col items-start gap-5">
            
            {/* Trust/Tournament Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold tracking-wide">
                <span className="text-secondary font-bold">★</span> {currentHero.badgeText}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-white text-xs tracking-wider uppercase font-bold shadow-sm">
                100% Chính hãng BWF Approved
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-300 text-xs">
                Bảo hành 1 đổi 1
              </span>
            </div>

            {/* Hero Typography */}
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-secondary font-extrabold">
                {currentHero.tagline}
              </span>
              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white leading-[1.08] drop-shadow-sm">
                {currentHero.titleLine1} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  {currentHero.titleGradient}
                </span>
              </h1>
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              {currentHero.description}
            </p>

            {/* CTA Action Cluster */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link 
                to={currentHero.ctaPrimaryLink}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary hover:bg-secondary-hover text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-secondary/30 active:scale-95"
              >
                <span>{currentHero.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                to={currentHero.ctaSecondaryLink}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors"
              >
                <span>{currentHero.ctaSecondary}</span>
              </Link>
            </div>

            {/* Slider Controls / Pagination Indicators */}
            <div className="flex items-center gap-4 pt-6">
              <div className="flex items-center gap-1.5">
                {HERO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      activeSlide === idx ? 'w-8 bg-secondary' : 'w-2.5 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 text-white">
                <button 
                  onClick={() => setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-secondary transition-colors flex items-center justify-center"
                  aria-label="Slide trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-secondary transition-colors flex items-center justify-center"
                  aria-label="Slide sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-slate-400 font-mono tracking-widest pl-2">
                {currentHero.slideCode}
              </span>
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
            <h2 className="font-display text-2xl sm:text-3xl text-slate-900 font-extrabold uppercase tracking-tight">DANH MỤC NỔI BẬT</h2>
            <p className="text-xs sm:text-sm text-slate-500">Lựa chọn theo từng dòng trang bị thi đấu chuyên nghiệp chuẩn thi đấu BWF</p>
          </div>
          <Link 
            to="/products"
            className="inline-flex items-center gap-1 text-xs uppercase text-secondary hover:text-secondary-hover transition-colors font-bold"
          >
            <span>Xem tất cả danh mục</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {/* 1. Vợt cầu lông */}
          <Link 
            to="/products?category=RACKET"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-lg border border-[#E2E8F0] shadow-card-rest hover:shadow-card-hover hover:border-[#CBD5E1] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-11 h-11 rounded-lg bg-slate-100 group-hover:bg-secondary group-hover:text-white text-slate-700 flex items-center justify-center transition-colors shadow-sm">
                <Swords className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 group-hover:bg-secondary group-hover:text-white transition-colors">48+ mẫu</span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">Vợt cầu lông</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">Astrox, Nanoflare, Thruster, Halbertec</p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* 2. Giày cầu lông */}
          <Link 
            to="/products?category=SHOES"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-lg border border-[#E2E8F0] shadow-card-rest hover:shadow-card-hover hover:border-[#CBD5E1] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-11 h-11 rounded-lg bg-slate-100 group-hover:bg-secondary group-hover:text-white text-slate-700 flex items-center justify-center transition-colors shadow-sm">
                <Footprints className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 group-hover:bg-secondary group-hover:text-white transition-colors">32+ mẫu</span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">Giày cầu lông</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">Power Cushion, All-Court Grip, Shock Cushion</p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* 3. Balo & Bao vợt */}
          <Link 
            to="/products?category=BAG"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-lg border border-[#E2E8F0] shadow-card-rest hover:shadow-card-hover hover:border-[#CBD5E1] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-11 h-11 rounded-lg bg-slate-100 group-hover:bg-secondary group-hover:text-white text-slate-700 flex items-center justify-center transition-colors shadow-sm">
                <Backpack className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 group-hover:bg-secondary group-hover:text-white transition-colors">26+ mẫu</span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">Balo & Bao vợt</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">Thermo Guard, Chống nước IPX4, 6-9 Rackets</p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* 4. Quần áo đấu */}
          <Link 
            to="/products?category=APPAREL"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-lg border border-[#E2E8F0] shadow-card-rest hover:shadow-card-hover hover:border-[#CBD5E1] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-11 h-11 rounded-lg bg-slate-100 group-hover:bg-secondary group-hover:text-white text-slate-700 flex items-center justify-center transition-colors shadow-sm">
                <Shirt className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 group-hover:bg-secondary group-hover:text-white transition-colors">65+ mẫu</span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">Quần áo đấu</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">Dry-Fit, CoolMax -3°C, Co giãn 4 chiều</p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* 5. Phụ kiện pro */}
          <Link 
            to="/products?category=ACCESSORIES"
            className="group relative flex flex-col justify-between p-5 bg-white rounded-lg border border-[#E2E8F0] shadow-card-rest hover:shadow-card-hover hover:border-[#CBD5E1] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full transition-all group-hover:bg-secondary/10" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-11 h-11 rounded-lg bg-slate-100 group-hover:bg-secondary group-hover:text-white text-slate-700 flex items-center justify-center transition-colors shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 group-hover:bg-secondary group-hover:text-white transition-colors">80+ mẫu</span>
            </div>
            <div className="relative z-10 pt-8 flex flex-col">
              <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">Phụ kiện pro</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1">Cước BG65Ti/BG80, Quấn cán, Quả cầu thi đấu</p>
              <div className="flex items-center gap-1 pt-3 text-secondary text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Khám phá ngay</span>
                <ChevronRight className="w-3.5 h-3.5" />
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
              <p className="text-xs text-slate-500">Lựa chọn hàng đầu của các tay vợt chuyên nghiệp & vận động viên tuyển quốc gia</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-200/60 rounded-xl">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setActiveTab('racket')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'racket' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vợt Hot
            </button>
            <button 
              onClick={() => setActiveTab('shoes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'shoes' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giày Đấu
            </button>
            <button 
              onClick={() => setActiveTab('bag')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bag' ? 'bg-white text-secondary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bao Vợt
            </button>
          </div>
        </div>

        {/* Product Cards Grid 4 Cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {filteredProducts.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. INTERMEDIATE PRO PROMO BANNER (Technical Customization Service) */}
      <section className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="relative rounded-2xl bg-gradient-to-r from-[#0F172A] via-slate-800 to-[#0F172A] p-8 lg:p-12 text-white overflow-hidden shadow-xl border border-slate-700/50">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-white text-xs font-bold uppercase tracking-wider w-fit">
                <Wrench className="w-3.5 h-3.5" />
                <span>Dịch vụ kỹ thuật chuẩn BWF Tour</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight">
                CĂNG CƯỚC ĐIỆN TỬ 4 NÚT - CHUẨN LỰC ĐẾN TỪNG LBS
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Sở hữu máy căng cước điện tử Yonex Precision 9.0 độc quyền. Đội ngũ KTV chứng chỉ quốc tế đảm bảo dây không bị chùng sụt cân sau trận đấu nảy lửa. Miễn phí tư vấn loại cước theo lối đánh tấn công hay phản tạt.
              </p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="text-secondary w-4 h-4 shrink-0" />
                  <span>Đo độ căng điện tử</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="text-secondary w-4 h-4 shrink-0" />
                  <span>Bảo hành đứt cước 24h</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <CheckCircle2 className="text-secondary w-4 h-4 shrink-0" />
                  <span>Lấy liền sau 20 phút</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
              <Link
                to="/products?category=ACCESSORIES"
                className="px-6 py-3 rounded-xl bg-white text-[#0F172A] font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-secondary hover:text-white transition-all shadow-lg active:scale-95 text-center"
              >
                Đặt lịch căng vợt
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: BỘ SƯU TẬP MỚI VỀ (New Arrivals 2024 - 4 Columns) */}
      <section className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-royal"></span>
              <span className="text-xs uppercase tracking-wider text-royal font-bold">New Arrivals 2024</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-slate-900 font-extrabold uppercase tracking-tight">BỘ SƯU TẬP MỚI VỀ</h2>
            <p className="text-xs sm:text-sm text-slate-500">Cập nhật những công nghệ vật liệu mới nhất vừa cập bến HG Showroom</p>
          </div>
          <Link 
            to="/products"
            className="inline-flex items-center gap-1 text-xs uppercase text-royal hover:underline transition-colors font-bold"
          >
            <span>Xem toàn bộ hàng mới</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {MOCK_NEW_ARRIVALS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. SECTION: ĐÁNH GIÁ KHÁCH HÀNG (Customer Reviews - 3 Cards) */}
      <section className="w-full bg-slate-100/70 py-14 lg:py-20 border-y border-slate-200">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center gap-1 mb-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="text-xs uppercase tracking-wider text-secondary font-bold">Cộng đồng cầu lông HG</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-slate-900">
              VẬN ĐỘNG VIÊN & KHÁCH HÀNG NÓI GÌ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Cảm nhận thực tế từ các vận động viên và huấn luyện viên thi đấu hàng tuần tại các giải phong trào và chuyên nghiệp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Review Card 1 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-card-rest hover:shadow-card-hover border border-[#E2E8F0] transition-all flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                  “Dịch vụ căng cước chuẩn giải đấu 4 nút rất đều tay. Vợt Astrox 100ZZ đập cầu đầm tay và thoát lực tốt. Giao hỏa tốc 2h chuẩn giờ.”
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop" 
                    alt="Nguyễn Hoàng Nam" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold text-slate-900">Nguyễn Hoàng Nam</span>
                  <span className="text-[11px] text-slate-500 font-medium">Cầu thủ phong trào giải VBS</span>
                </div>
              </div>
            </div>

            {/* Review Card 2 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-card-rest hover:shadow-card-hover border border-[#E2E8F0] transition-all flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                  “Giày Yonex 65Z3 đi ôm chân và bám thảm tuyệt vời, đệm power cushion giảm chấn tối đa cho khớp gối. Hàng chính hãng 100% có tem bảo hành.”
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop" 
                    alt="HLV Trần Thu Trang" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold text-slate-900">HLV Trần Thu Trang</span>
                  <span className="text-[11px] text-slate-500 font-medium">HG Badminton Club</span>
                </div>
              </div>
            </div>

            {/* Review Card 3 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-card-rest hover:shadow-card-hover border border-[#E2E8F0] transition-all flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                  “Balo Apex Pro 30L chống thấm nước rất tốt, có ngăn giày riêng thoáng khí không bị ám mùi. Rất hài lòng với dịch vụ tư vấn kỹ thuật.”
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop" 
                    alt="Anh Lê Minh Đức" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold text-slate-900">Anh Lê Minh Đức</span>
                  <span className="text-[11px] text-slate-500 font-medium">Cầu thủ bán chuyên Hà Nội</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION: ĐỐI TÁC THƯƠNG HIỆU CHIẾN LƯỢC (Brand Ribbon) */}
      <section className="w-full bg-white py-12 border-b border-slate-200">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
              ĐỐI TÁC THƯƠNG HIỆU CHIẾN LƯỢC
            </span>
            <span className="w-12 h-0.5 bg-secondary mt-2"></span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center opacity-75 hover:opacity-100 transition-opacity">
            <Link to="/products?brand=YONEX" className="flex items-center justify-center h-12 w-32 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-xl font-black tracking-tighter text-slate-800 hover:text-secondary">YONEX</span>
            </Link>
            <Link to="/products?brand=VICTOR" className="flex items-center justify-center h-12 w-32 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-xl font-black tracking-wider text-slate-800 hover:text-royal">VICTOR</span>
            </Link>
            <Link to="/products?brand=LINING" className="flex items-center justify-center h-12 w-32 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-xl font-black tracking-tight text-slate-800 hover:text-secondary">LI-NING</span>
            </Link>
            <Link to="/products?brand=MIZUNO" className="flex items-center justify-center h-12 w-32 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-xl font-black tracking-widest text-slate-800 hover:text-royal">MIZUNO</span>
            </Link>
            <Link to="/products?brand=KAWASAKI" className="flex items-center justify-center h-12 w-32 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-xl font-extrabold text-slate-800 hover:text-secondary">KAWASAKI</span>
            </Link>
            <Link to="/products?brand=FLEET" className="flex items-center justify-center h-12 w-32 grayscale hover:grayscale-0 transition-all">
              <span className="font-display text-xl font-black tracking-widest text-slate-800 hover:text-[#0F172A]">FLEET</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
