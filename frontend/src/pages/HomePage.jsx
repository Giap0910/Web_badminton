import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import { 
  Zap, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Flame, 
  ChevronRight,
  Target,
  Wind,
  Shield
} from 'lucide-react';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productApi.getProducts({});
        setFeaturedProducts(data.slice(0, 4));
      } catch (err) {
        console.error('Lỗi tải sản phẩm nổi bật:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white mx-4 sm:mx-6 lg:mx-8 mt-6 shadow-2xl border border-slate-800">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-28 lg:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HỆ THỐNG CẦU LÔNG TÍCH HỢP AI ĐẦU TIÊN TẠI VIỆT NAM</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
              Chinh Phục Mọi Pha Smash Cùng <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Vợt Đỉnh Cao</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
              Khám phá bộ sưu tập vợt Yonex, Victor, Lining chính hãng. Cơ chế <strong className="text-white">Atomic Stock Reservation</strong> khóa kho thời gian thực 15 phút, kết hợp trợ lý <strong className="text-emerald-300">Gemini AI</strong> tư vấn chuẩn xác theo lối đánh của bạn.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/products"
                className="px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Khám Phá Vợt Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/compare"
                className="px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 text-white font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Layers className="w-4 h-4 text-teal-400" />
                <span>So Sánh Thông Số</span>
              </Link>
            </div>
          </div>

          {/* Hero Banner Visual */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl group">
              <img
                src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1000&auto=format&fit=crop&q=80"
                alt="Badminton Smash Racket"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Tâm Điểm Tuần</span>
                    <h3 className="text-sm font-extrabold text-white">Yonex Astrox 100ZZ Kurenai</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-200 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                    4.250.000₫
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Logos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-around gap-6">
          <Link to="/products?brand=Yonex" className="text-xl font-black tracking-widest text-slate-700 hover:text-emerald-600 transition-colors">
            YONEX
          </Link>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <Link to="/products?brand=Victor" className="text-xl font-black tracking-widest text-slate-700 hover:text-emerald-600 transition-colors">
            VICTOR
          </Link>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <Link to="/products?brand=Lining" className="text-xl font-black tracking-widest text-slate-700 hover:text-emerald-600 transition-colors">
            LI-NING
          </Link>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <Link to="/products?brand=Mizuno" className="text-xl font-black tracking-widest text-slate-700 hover:text-emerald-600 transition-colors">
            MIZUNO
          </Link>
        </div>
      </div>

      {/* Racket Playstyle Finder Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Chọn Vợt Theo Phong Cách Đánh Của Bạn
          </h2>
          <p className="text-sm text-slate-500">
            Mỗi cây vợt sinh ra để tối ưu hóa một vị trí và kỹ năng sở trường trên sân đấu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Attacking */}
          <Link
            to="/products?balancePoint=Head-Heavy"
            className="group relative bg-white p-7 rounded-3xl border border-slate-200/80 hover:border-rose-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
              Tấn Công Uy Lực (Smash)
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Dòng vợt nặng đầu (Head-Heavy) trợ lực tối đa, góc đập cắm sàn, phù hợp đánh đơn hoặc vị trí cầu sau đánh đôi.
            </p>
            <div className="mt-5 text-xs font-bold text-rose-600 flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Xem các mẫu vợt công</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Speed / Drive */}
          <Link
            to="/products?balancePoint=Head-Light"
            className="group relative bg-white p-7 rounded-3xl border border-slate-200/80 hover:border-sky-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Wind className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
              Tốc Độ & Phản Tạt (Drive)
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Dòng vợt nhẹ đầu (Head-Light) vung vợt chớp nhoáng, bắt lưới tì đè, thủ cầu linh hoạt phản xạ cực nhạy.
            </p>
            <div className="mt-5 text-xs font-bold text-sky-600 flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Xem các mẫu vợt tốc độ</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: All-around */}
          <Link
            to="/products?balancePoint=Even"
            className="group relative bg-white p-7 rounded-3xl border border-slate-200/80 hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Công Thủ Toàn Diện (Control)
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Điểm cân bằng ở giữa (Even Balance), thân dẻo vừa phải, kiểm soát trận đấu và điều cầu chuẩn xác từng centimet.
            </p>
            <div className="mt-5 text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">
              <span>Xem các mẫu toàn diện</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vợt Thi Đấu Chuyên Nghiệp Mới Nhất
            </h2>
            <p className="text-sm text-slate-500">
              Được các tay vợt hàng đầu thế giới tin dùng tại Olympic và giải đấu BWF World Tour
            </p>
          </div>
          <Link
            to="/products"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
          >
            <span>Xem tất cả vợt</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
