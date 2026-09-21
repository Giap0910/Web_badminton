import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Bolt, ChevronRight, CheckCircle2, Star, ShieldCheck, Truck, Sparkles, Wrench, RefreshCw, Layers, Zap } from 'lucide-react';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';

const StringDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('Vàng Chanh (Electric Yellow)');
  const [selectedGauge, setSelectedGauge] = useState('0.68 mm');
  const [selectedPackaging, setSelectedPackaging] = useState('set'); // 'set' | 'reel'
  const [includeStringing, setIncludeStringing] = useState(true);
  const [stringTension, setStringTension] = useState('11.0 kg (24.2 lbs) - Tiêu chuẩn đấu');
  const [activeTab, setActiveTab] = useState('desc');
  const [addedToast, setAddedToast] = useState(false);

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
        console.error('Error fetching string detail:', err);
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
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Đang tải chi tiết cước đan vợt BWF...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-sm font-bold text-slate-700 mb-4">Không tìm thấy sản phẩm cước đan vợt.</p>
        <Link to="/products" className="px-5 py-2.5 bg-[#0F172A] text-white text-xs font-bold uppercase rounded-xl">
          Quay lại danh mục
        </Link>
      </div>
    );
  }

  const galleryImages = [
    product.imageUrl || 'https://lh3.googleusercontent.com/aida/AEtjO1W1L7V4_k_Xw99v3yQ6KjI7i6-5B8Z7x0y1yU4_k_Xw99v3yQ6KjI7i6-5B8Z7x0y1',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCLFz_1z5a-7IM8iYwdGMMJuqRo6FY2rMCh9IcFIk7QP7Vi3ozjngIGZl-OsdhqWZUK8WCVnlM0czNrorRiaVV7MfasndXy3CzqTAWkP8uiGEvWYCY4gghGBDSeYvikeoNjowxtMsSI4dNlr8W6ZTA2LwxNIX2WkmcWa3HKitSJ9lPg9i5mX1-QnE0ZA9dSYFey7jIEOD2SqPd0kZ7jIKoiDojZDuKe-kXcduycA2NPw3h5CghR5HgD',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDI8-fLRhjWEOST87SL_dTRubiUU7xFHqkxq07c6U87MUGuzpJPOXELAySggE_TaYAxk8SipyZy6tFuhdoW_9u3LC0Gsnr0qcVEHJ5TmiCF9R6zIkqDVDQjewMnSyFiVSoFT66SKhZtpx6IV8ARv4UpHUrsZFp2Ig6jbdsowq2X1EPXPp05EnoSqVg7O38CrG-X0XUPQZl4jHZEVkxfBJwRxcrVnOaAp0DfSmAu6BEa9n9Fi_PIXGvO',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDT6kzmp2Vu8APo3xMFwK6vAHJ6QYM7LPwC1nkeXXeWe2MNtaAwkKZcyd103SShm4Ht72x70aTRg9gOBogxxCJJm9HoBU8c0ls3kWbwSrgtRnCUDXLCmbvduCkWCXj__q0GiDBUbSSsXgOcbYRPs-QYWvIAQTP_22yjegIzospVHXHrBqj1m2LzdghVcByat_a_NeXxuwM7YAOXQqsVPsRDjfZr2UDvDeJZmDwidFEjxom0GQsPHqwe'
  ];

  const colors = [
    { name: 'Vàng Chanh (Electric Yellow)', bg: 'bg-[#eab308]' },
    { name: 'Trắng Sứ (Optic White)', bg: 'bg-white' },
    { name: 'Đen Nhám (Matte Black)', bg: 'bg-[#1e293b]' },
    { name: 'Cam Neon (Vibrant Orange)', bg: 'bg-[#ea580c]' }
  ];

  const gauges = [
    { size: '0.65 mm', desc: 'Trợ lực mạnh, nảy bén' },
    { size: '0.68 mm', desc: 'Chuẩn cân bằng smash' },
    { size: '0.70 mm', desc: 'Độ bền cước tối đa' }
  ];

  const handleAdd = () => {
    addToCart(product, quantity, {
      color: selectedColor,
      gauge: selectedGauge,
      packaging: selectedPackaging,
      stringing: includeStringing ? stringTension : 'Không căng sẵn'
    });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    const cartItemId = addToCart(product, quantity, {
      color: selectedColor,
      gauge: selectedGauge,
      packaging: selectedPackaging,
      stringing: includeStringing ? stringTension : 'Không căng sẵn'
    });
    navigate('/checkout', { state: { selectedItemIds: cartItemId ? [cartItemId] : undefined } });
  };

  return (
    <div className="w-full bg-[#F8FAFC] py-6">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-500 py-3 mb-4">
          <nav className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
            <Link to="/" className="hover:text-secondary">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/products" className="hover:text-secondary">Phụ kiện</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-bold">{product.name}</span>
          </nav>
          <span className="hidden lg:flex items-center gap-2 text-secondary font-bold text-xs">
            <Zap className="w-3.5 h-3.5" />
            Hệ thống đan vợt điện tử 4 nút BWF chuẩn quốc tế
          </span>
        </div>

        {/* Product Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">

          {/* Left: Gallery & Trust */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-[#F2F4F6] rounded-2xl shadow-sm overflow-hidden flex items-center justify-center p-6 group">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                <span className="bg-[#0F172A] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary" /> BWF Approved
                </span>
                <span className="bg-secondary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Lực Nảy 9.5/10
                </span>
              </div>
              <img
                src={galleryImages[activeImage]}
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Thumbnail Rail */}
            <div className="grid grid-cols-4 gap-2.5">
              {galleryImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square rounded-xl bg-[#F2F4F6] p-1.5 shadow-sm overflow-hidden border ${
                    activeImage === i ? 'border-secondary ring-2 ring-secondary/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={src} alt={`Thumb ${i}`} className="w-full h-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>

            {/* Mini Trust Row */}
            <div className="bg-[#F2F4F6] rounded-2xl p-4 flex items-center justify-around text-xs text-slate-700">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span className="font-bold">100% Chính Hãng</span>
              </div>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-[#0F172A]" />
                <span className="font-bold">Đổi trả 7 ngày</span>
              </div>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-secondary" />
                <span className="font-bold">Giao hỏa tốc 2H</span>
              </div>
            </div>
          </div>

          {/* Right: Selectors & Buy Action */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase tracking-widest">
                  YONEX BADMINTON ACCESSORIES • JAPAN PRO SERIES
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-[10px] font-bold rounded">
                  #1 CƯỚC TẤN CÔNG BÁN CHẠY
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {product.name}
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trợ lực đẩy cầu bộc phát đỉnh cao, tiếng nổ smash đanh chát đặc trưng với công nghệ bện lõi Vectran thế hệ mới.
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-500 pb-2 border-b border-slate-100">
                <div className="flex text-amber-500 items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="font-bold text-slate-900">4.9</span>
                </div>
                <span>(685 đánh giá)</span>
                <span>•</span>
                <span>Đã bán: <strong className="text-slate-900">4.2k sợi</strong></span>
                <span>•</span>
                <span className="text-secondary font-semibold">Giao 2H HN & TP.HCM</span>
              </div>

              {/* Price */}
              <div className="bg-[#F2F4F6] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-secondary">{formatPrice(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                  <span className="bg-secondary text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">-16% GIẢM</span>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                  Bảo hành độ căng 72H
                </span>
              </div>

              {/* 3 Metric Boxes */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Độ bền dây</span>
                  <span className="text-base font-black text-slate-900">7.0 / 10</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Lõi Vectran hạn chế xù</span>
                </div>
                <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <span className="text-[10px] font-bold uppercase text-secondary block">Lực nảy smash</span>
                  <span className="text-base font-black text-secondary">9.5 / 10</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Trợ lực smash cắm sâu</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Lối chơi</span>
                  <span className="text-base font-black text-[#0F172A]">Tấn Công</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Tiếng nổ đanh chát</span>
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-bold text-slate-900">Màu sắc: <strong className="text-secondary">{selectedColor}</strong></span>
                  <span className="text-slate-400">Tone màu thi đấu BWF</span>
                </div>
                <div className="flex items-center gap-3">
                  {colors.map(c => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`w-9 h-9 rounded-full ${c.bg} border border-slate-300 flex items-center justify-center transition-all ${
                        selectedColor === c.name ? 'ring-2 ring-offset-2 ring-[#0F172A] scale-110 shadow-md' : 'hover:scale-105'
                      }`}
                      title={c.name}
                    >
                      {selectedColor === c.name && <CheckCircle2 className="w-4 h-4 text-[#0F172A]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gauge Selector */}
              <div>
                <span className="block text-xs font-bold text-slate-900 mb-2">Độ dày đường kính sợi (Gauge):</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {gauges.map(g => (
                    <button
                      key={g.size}
                      type="button"
                      onClick={() => setSelectedGauge(g.size)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        selectedGauge === g.size
                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-sm'
                          : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="font-bold">{g.size}</div>
                      <div className={`text-[10px] mt-0.5 ${selectedGauge === g.size ? 'text-slate-300' : 'text-slate-500'}`}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stringing Service Option */}
              <div className="bg-[#F2F4F6] p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                    <input
                      type="checkbox"
                      checked={includeStringing}
                      onChange={e => setIncludeStringing(e.target.checked)}
                      className="w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary cursor-pointer"
                    />
                    <span>Yêu cầu căng sẵn lên vợt gửi kèm (Miễn phí công đan BWF)</span>
                  </label>
                  <span className="text-secondary font-bold">0₫ Phí Công</span>
                </div>
                {includeStringing && (
                  <select
                    value={stringTension}
                    onChange={e => setStringTension(e.target.value)}
                    className="w-full bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none"
                  >
                    <option value="10.5 kg (23.1 lbs) - Người mới & phong trào">10.5 kg (23.1 lbs) - Người mới & phong trào</option>
                    <option value="11.0 kg (24.2 lbs) - Tiêu chuẩn đấu">11.0 kg (24.2 lbs) - Tiêu chuẩn bán chuyên / phong trào cứng</option>
                    <option value="11.5 kg (25.3 lbs) - Smash uy lực">11.5 kg (25.3 lbs) - Smash uy lực & kiểm soát cao</option>
                    <option value="12.0 kg (26.4 lbs) - Vận động viên chuyên nghiệp">12.0 kg (26.4 lbs) - VĐV chuyên nghiệp BWF</option>
                  </select>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <div className="flex items-center bg-[#ECEEF0] rounded-xl p-1 shrink-0 w-full sm:w-auto justify-between">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 rounded-lg bg-white font-bold">-</button>
                  <span className="w-12 text-center font-bold text-sm">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-9 h-9 rounded-lg bg-white font-bold">+</button>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 w-full py-3.5 px-5 rounded-xl bg-white border-2 border-[#0F172A] text-[#0F172A] font-bold text-xs uppercase tracking-wider hover:bg-[#0F172A] hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{addedToast ? 'Đã thêm giỏ hàng!' : 'Thêm giỏ hàng'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="flex-1 w-full py-3.5 px-6 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-secondary/25"
                >
                  <Bolt className="w-4 h-4" />
                  <span>Mua ngay</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 mb-6">
            {[
              { key: 'desc', label: 'Mô tả chi tiết & Cấu trúc sợi' },
              { key: 'specs', label: 'Bảng thông số kỹ thuật BWF' },
              { key: 'reviews', label: `Đánh giá khách hàng (${reviews.length > 0 ? reviews.length : 685})` }
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === t.key ? 'bg-[#0F172A] text-white' : 'bg-[#F2F4F6] text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'desc' && (
            <div className="max-w-4xl space-y-4 text-xs text-slate-600 leading-relaxed">
              <h3 className="text-base font-bold text-slate-900">Cước Đan Vợt Cầu Lông Yonex BG80 Power Chính Hãng</h3>
              <p>
                Sợi cước được cấu thành từ lõi đa sợi Polymer Nylon cường độ cao kết hợp sợi tổng hợp Vectran bện xoắn kép. Cung cấp âm thanh va chạm đanh rát đặc trưng và lực trợ lực tối đa cho những pha smash kết liễu trận đấu.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                  <span className="font-bold block text-slate-900">Lực đẩy</span>
                  <span className="text-secondary font-black">9.5/10</span>
                </div>
                <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                  <span className="font-bold block text-slate-900">Tiếng nổ</span>
                  <span className="text-secondary font-black">9.0/10</span>
                </div>
                <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                  <span className="font-bold block text-slate-900">Hấp thụ chấn</span>
                  <span className="text-slate-800 font-black">8.0/10</span>
                </div>
                <div className="p-3 bg-[#F2F4F6] rounded-xl text-center">
                  <span className="font-bold block text-slate-900">Kiểm soát</span>
                  <span className="text-slate-800 font-black">8.5/10</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl space-y-2 text-xs">
              {[
                ['Thương hiệu', product.brand || 'Yonex (Nhật Bản)'],
                ['Đường kính (Gauge)', selectedGauge],
                ['Chiều dài gói lẻ', '10 mét (Đan đủ 1 khung vợt)'],
                ['Lõi sợi', 'High-Intensity MULTIFILAMENT + Vectran'],
                ['Lớp phủ ngoài', 'Special Braided Oval Shaped High Polymer Nylon'],
                ['Xuất xứ', 'Made in Japan (Khắc laser JP)']
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5 px-4 bg-[#F2F4F6] rounded-xl">
                  <span className="text-slate-500 font-medium">{k}</span>
                  <span className="text-slate-900 font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-3xl space-y-3">
              {[
                { name: 'Phạm Thành Long (CLB Cầu Giấy)', comment: 'Căng 11.2kg đánh tiếng nổ như pháo cối, smash cắm sân cực sướng tay.' },
                { name: 'Lê Hoàng Dũng', comment: 'Shop căng máy điện tử 4 nút dây rất đều, độ chùng hầu như không có sau 2 tuần sử dụng.' }
              ].map((r, i) => (
                <div key={i} className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="text-slate-900">{r.name}</strong>
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, s) => <Star key={s} className="w-3 h-3 fill-amber-500" />)}
                    </div>
                  </div>
                  <p className="text-slate-600">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default StringDetailPage;
