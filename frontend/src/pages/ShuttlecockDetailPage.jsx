import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Bolt, ChevronRight, CheckCircle2, Star, ShieldCheck, RefreshCw, Layers, Zap, Info, Award } from 'lucide-react';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';

const ShuttlecockDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedFeather, setSelectedFeather] = useState('Lông vũ tự nhiên (Goose Feather)');
  const [selectedSpeed, setSelectedSpeed] = useState('Speed 77');
  const [selectedPack, setSelectedPack] = useState('tube'); // 'tube' (12 quả) | 'carton' (10 ống)
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
        console.error('Error fetching shuttlecock detail:', err);
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
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Đang tải chi tiết ống cầu lông BWF...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-sm font-bold text-slate-700 mb-4">Không tìm thấy sản phẩm ống cầu lông.</p>
        <Link to="/products" className="px-5 py-2.5 bg-[#0F172A] text-white text-xs font-bold uppercase rounded-xl">
          Quay lại danh mục
        </Link>
      </div>
    );
  }

  const galleryImages = [
    product.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrnGb1xVhU5HQLDsLjPqqqOlYLJXwY9R1qH49yTH9nkHeiOFT0DcfUboKSpwXOpfoK2p0bBxmzxJLvzqVGXJrUmc7xQazrS-c-LdFOKOby39vn9w1ui8rJu7R56UZz-sucOYX8CQbUS_-50Ov7RzaI8tuZNlhRwYAH8Gq5WxqbTUh2USlCoZiByILaiAVXmQVxkajqjosevgmfCSgMEqFuuXNJa0W0ll4LTSIxjr4k5BMq4Pil6WOB',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA7uHUpXmsHWqgWnPm1AknD7TVbUsTnESh1mMKxoJ66C1Vumxk_jrJbqx7ufbLSUjDrBU-cLhMQnl93Dozq8rmjLBc1rTuRQYMK59PNH2qFt3CFF4tbNn4zchcffjbKGURjKkTcRlxgH6c0bxQGkJ5EVdZ_dmwui2mnS8aCBzkdNBdO7VRBTUqV4IZ2LUecbz1LHH1mpCAOnpU_9Kf5kBeAp741g1xqVjkuez-gKE-8bjXtkNmXlvOI',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDeJxSbZyVJ0ViBbHrXigf-iLOxCEsxvJ775orE0XjZcUKT7ho0krp5DdNpglQ9P8pR0n2frqUrXRrlUG6r61GIPUjxQaWie6_Pfigb_TPRpM-P4sL5HHe-feMCY2ysmEaDhCa2rd6rHUaQ2XSJcnS4BFYkSDWcEVV7M_hE917XG876Sf9RDbAyCwdd1yjZwwrZFw8TfTVheGZGh73zS9YdlzF4SOTX-RK0QhNogVO9ZajPk3g8X9aK',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCxcSjKfL6aH-DphVBGebb6vpTm3IirxLJ4ixzafm9ijAk0uCF5SYSApIB4Sp-DHyQklZ9MM9gr7DcW2lPAEm4DQ81uNdNO9pBHPJLFHf1Pzvejn87AQVxfnoxxPYc8TfT5o6S3sp8CaBe1LFGYMS7s8vBQUTI6y6F9P60xwCbYNv_D03bJonZHp4keMFrj7bDwnq4GxInfiGEn5MwBS6rUWdXUAcnoLh0zAS_iXFvBAJMSGZYZUDcV'
  ];

  const thumbLabels = ['Ống chuẩn', 'Lông ngỗng A', 'Niêm phong 12', 'Thùng sỉ'];

  const speeds = [
    { code: 'Speed 77', sub: 'Tốc độ Chậm - Vừa', note: 'Sân máy lạnh hoặc < 26°C (Phổ biến)' },
    { code: 'Speed 76', sub: 'Tốc độ Chuẩn VN', note: 'Khí hậu miền Nam & Trung (26°C - 31°C)' },
    { code: 'Speed 75', sub: 'Tốc độ Nhanh', note: 'Vùng nóng ẩm hoặc trên 32°C' }
  ];

  const handleAdd = () => {
    addToCart(product, quantity, {
      feather: selectedFeather,
      speed: selectedSpeed,
      pack: selectedPack === 'tube' ? 'Ống 12 quả' : 'Thùng 10 ống'
    });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    const cartItemId = addToCart(product, quantity, {
      feather: selectedFeather,
      speed: selectedSpeed,
      pack: selectedPack === 'tube' ? 'Ống 12 quả' : 'Thùng 10 ống'
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
          <span className="hidden lg:flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Kho hàng: Sẵn sàng 380+ ống tại TP.HCM & Hà Nội
          </span>
        </div>

        {/* Product Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">

          {/* Left Gallery */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-[#F2F4F6] rounded-2xl shadow-sm overflow-hidden flex items-center justify-center p-6 group">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                <span className="bg-secondary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Chính Hãng Yonex Japan
                </span>
                <span className="bg-[#0F172A] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> BWF Approved Grade 1
                </span>
              </div>
              <img
                src={galleryImages[activeImage]}
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Thumbnail Row */}
            <div className="grid grid-cols-4 gap-2.5">
              {galleryImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-square rounded-xl bg-[#F2F4F6] p-1.5 shadow-sm overflow-hidden border ${
                    activeImage === i ? 'border-secondary ring-2 ring-secondary/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={src} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 py-0.5 bg-[#0F172A]/80 text-white text-[9px] font-bold text-center">
                    {thumbLabels[i]}
                  </span>
                </button>
              ))}
            </div>

            {/* Trust Grid */}
            <div className="bg-[#F2F4F6] rounded-2xl p-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="w-5 h-5 text-secondary" />
                <span className="font-bold text-slate-900 text-[11px]">100% Lông Ngỗng A</span>
                <span className="text-[10px] text-slate-500 leading-tight">Tuyển chọn đồng nhất</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Zap className="w-5 h-5 text-[#0F172A]" />
                <span className="font-bold text-slate-900 text-[11px]">Quỹ Đạo Parabol</span>
                <span className="text-[10px] text-slate-500 leading-tight">Đường bay siêu đầm</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RefreshCw className="w-5 h-5 text-secondary" />
                <span className="font-bold text-slate-900 text-[11px]">Đổi Mới 100%</span>
                <span className="text-[10px] text-slate-500 leading-tight">Nếu lỗi lắc đảo</span>
              </div>
            </div>
          </div>

          {/* Right Selectors & Buy */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#0F172A] text-white text-[10px] font-bold uppercase rounded">
                    Yonex Pro Official Series
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Mã SP: {product.sku || 'AS-50-JPN'}</span>
                </div>
                <span className="text-xs text-secondary font-bold">• Chuẩn thi đấu BWF Grade 1</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-500 pb-2 border-b border-slate-100">
                <div className="flex text-amber-500 items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="font-bold text-slate-900">4.9</span>
                </div>
                <span>(312 đánh giá)</span>
                <span>•</span>
                <span>Đã bán: <strong className="text-slate-900">12.5k ống</strong></span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">Bestseller Giải Đấu</span>
              </div>

              {/* Price Box */}
              <div className="bg-[#F2F4F6] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-secondary">{formatPrice(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                  <span className="bg-secondary text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">-10% GIẢM</span>
                </div>
                <div className="text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-lg shadow-sm">
                  Quy cách: <strong>Ống 12 quả cầu</strong>
                </div>
              </div>

              {/* Selector 1: Material */}
              <div>
                <span className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                  1. Phân loại chất liệu:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div
                    onClick={() => setSelectedFeather('Lông vũ tự nhiên (Goose Feather)')}
                    className="p-3 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-between cursor-pointer shadow-sm"
                  >
                    <div>
                      <strong className="block text-slate-900">Lông vũ tự nhiên (Goose Feather)</strong>
                      <span className="text-[11px] text-slate-500">100% Lông ngỗng cao cấp chuẩn BWF</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                  </div>
                  <div
                    onClick={() => setSelectedFeather('Cầu nhựa tập luyện (Mavis Nylon)')}
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between cursor-pointer opacity-70 hover:opacity-100"
                  >
                    <div>
                      <strong className="block text-slate-900">Cầu nhựa tập luyện (Mavis Nylon)</strong>
                      <span className="text-[11px] text-slate-500">Bền bỉ, dùng cho tập luyện/ngoài trời</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selector 2: Speed Option */}
              <div>
                <span className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                  2. Chọn Tốc Độ Cầu (Speed Rating):
                </span>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  {speeds.map(sp => (
                    <button
                      key={sp.code}
                      type="button"
                      onClick={() => setSelectedSpeed(sp.code)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        selectedSpeed === sp.code
                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                          : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{sp.code}</span>
                        {selectedSpeed === sp.code && <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />}
                      </div>
                      <div className={`text-[11px] font-semibold mt-1 ${selectedSpeed === sp.code ? 'text-sky-300' : 'text-slate-600'}`}>
                        {sp.sub}
                      </div>
                      <div className={`text-[10px] mt-0.5 leading-tight ${selectedSpeed === sp.code ? 'text-slate-300' : 'text-slate-400'}`}>
                        {sp.note}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advice box */}
              <div className="bg-[#F2F4F6] p-3 rounded-xl flex items-start gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-[#0F172A] shrink-0 mt-0.5" />
                <p>
                  <strong>Khuyên dùng:</strong> Tốc độ <strong>77</strong> là tiêu chuẩn vàng thi đấu tại các CLB có hệ thống điều hòa tại Hà Nội và TP.HCM, mang lại cảm giác đập smash cắm dội sàn và cầu không bị bay lướt quá đà.
                </p>
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

        {/* Tabs System */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 mb-6">
            {[
              { key: 'desc', label: 'Mô tả chi tiết & Cấu trúc đế bần' },
              { key: 'specs', label: 'Bảng tiêu chuẩn Olympic BWF' },
              { key: 'reviews', label: `Đánh giá từ các CLB (${reviews.length > 0 ? reviews.length : 312})` }
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
              <h3 className="text-base font-bold text-slate-900">Ống Cầu Lông Yonex Aerosensa 50 (AS-50)</h3>
              <p>
                Aerosensa 50 là quả cầu thi đấu chính thức được sử dụng tại Thế vận hội Olympic, Giải vô địch thế giới BWF World Championships và hệ thống giải Super 1000. Mỗi quả cầu đều trải qua quy trình kiểm định tốc độ bay nghiêm ngặt bằng máy phát cầu tại Nhật Bản.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-[#F2F4F6] rounded-xl">
                  <strong className="block text-slate-900 mb-1">16 Lông ngỗng cao cấp</strong>
                  <span>Góc nghiêng cánh lông đồng đều 100%, tạo độ xoay ổn định khi bay.</span>
                </div>
                <div className="p-3.5 bg-[#F2F4F6] rounded-xl">
                  <strong className="block text-slate-900 mb-1">Đế bần nguyên khối 3 lớp</strong>
                  <span>Gỗ sồi Bồ Đào Nha tự nhiên hấp thụ lực va chạm smash uy lực.</span>
                </div>
                <div className="p-3.5 bg-[#F2F4F6] rounded-xl">
                  <strong className="block text-slate-900 mb-1">Ống nhôm niêm phong khí</strong>
                  <span>Bảo quản độ ẩm tối ưu, chống gãy rụng cánh lông khi lưu kho.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl space-y-2 text-xs">
              {[
                ['Thương hiệu', product.brand || 'Yonex (Nhật Bản)'],
                ['Mã sản phẩm', product.sku || 'AS-50'],
                ['Số lượng', '12 quả / ống'],
                ['Chất liệu cánh', '100% Lông ngỗng tự nhiên tuyển chọn Grade A'],
                ['Chất liệu đế', 'Solid Natural Cork (Bần tự nhiên 3 lớp)'],
                ['Tốc độ bay', selectedSpeed],
                ['Chứng nhận', 'BWF Approved Grade 1 (Olympic & World Tour)']
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
                { name: 'HLV Trần Đình Tuấn (CLB Tân Bình)', comment: 'AS-50 đường bay chuẩn không cần chỉnh, đập smash cắm dội sân cảm giác rất đầm tay.' },
                { name: 'Nguyễn Tiến Minh Fanclub', comment: 'Cầu bền, 1 set đôi chỉ dùng khoảng 1-2 quả là quá tiết kiệm so với các loại cầu khác.' }
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

export default ShuttlecockDetailPage;
