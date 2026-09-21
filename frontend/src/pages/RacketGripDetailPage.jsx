import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Bolt, ChevronRight, CheckCircle2, Star, Heart, ZoomIn, ShieldCheck, Truck, RefreshCw, Layers } from 'lucide-react';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { formatPrice, productCategory, productImages, productRating } from '../utils/formatters';

const RacketGripDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('Vàng Chanh Neon (Yellow)');
  const [selectedTexture, setSelectedTexture] = useState('Ướt / Wet (Tacky)');
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
        console.error('Error fetching grip detail:', err);
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
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Đang tải phụ kiện quấn cán...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-sm font-bold text-slate-700 mb-4">Không tìm thấy sản phẩm quấn cán.</p>
        <Link to="/products" className="px-5 py-2.5 bg-[#0F172A] text-white text-xs font-bold uppercase rounded-xl">
          Quay lại danh mục
        </Link>
      </div>
    );
  }

  const galleryImages = [
    product.imageUrl || 'https://lh3.googleusercontent.com/aida/AEtjO1ULqG2pjkYDmyPQ0IN88Bk2nVUMX_hkwGQ5mKuL1wqjriT3HGSdcHn-u2vTs8vCqtWT_TWg-PvESmtOAy8Amg77cPe4mBmVwkEP0hZvdPWYHGy7YRvd9sol_5HD2D2RCOoOWodHNTjZI8M3P0S0cSVE78B6pcYHp82FuGNdNsfeO1zQE3h-BtRxy2RlaP2Id9Pc9DKMSGs0f3NIFkJliOUQKcttpdyS9bXHQdAg9I4PCoLDFvWfnA8W6Po',
    'https://lh3.googleusercontent.com/aida/AEtjO1UYxkKhvl-V-jTO7Law9SnbZpfkjTBvFFiProbAxnZV0vZhOMFfHCMJvSvZP-HTEDYyaCc1EbnYwb0--C7HXpKfN1d3GY3dk7DgS2UFBtMKaFwfPQkOY3dtGksUkabG83Irdtz0N1sqo0imkwgArDKKbcq_8uVw0r32cKEKUd-t8yPmMelUPg2NaxzKQ3uODONOEJ63VP6ViXa9_7chq4giA_dxV7BtGQOLhrFwgrM-sl6QyKYuHbrr9Xc',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBo4fI1hHjOQdDvuGtK3DLLtaxrzpVhSkhLlCypUWl_exwH69sO0TmcZ9VtHb-96yaLpMp59wbhMJSVOgLMe6mJAJw1mGKgkkNLD4YN42kCyDcBp3lmTMeT849sNb2lOI7DbMjEO5vc3XQQvgqWQ4vA8ExwfEztKA6taqZNteTQwpUa7kHv3g-DxAwMw3hhEKNF3mVS-74cHcyP5wsy8CmSbb5eU-bN8qHdM1CXhLPzFsbtpoBdX1Yn',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCsLoDf0K8mIIcqd79U7deE4HdtPAb0CTbfacxXKR27CltLdOvIlHJo-TjcRFM73DXy1xTNqrsUsreRZdeG1TXeoXZAJgdgI_qxGcIc2ExZPH9rJGPwKb53OxKytOyzveLTYfhqRFjnGbNCegRX2RO8x7_j0bJhhEFMNuUuV3uwyM9EFbPv13V1YVfE54WAgOO22T1jX9iEAP9q_RSuUH9PpNKN43YGdDiso44zbp6cj17Oi7of6fKJ'
  ];

  const thumbLabels = ['Vỉ 3 Cuộn', 'Cận cảnh PU', 'Lên vợt', 'Tem Sunrise'];

  const colors = [
    { name: 'Vàng Chanh Neon (Yellow)', bg: 'bg-[#facc15]' },
    { name: 'Trắng Tinh Khiết (White)', bg: 'bg-white' },
    { name: 'Đen Matte (Black)', bg: 'bg-[#18181b]' },
    { name: 'Đỏ Kurenai (Deep Red)', bg: 'bg-[#dc2626]' },
    { name: 'Xanh Hoàng Gia (Royal Blue)', bg: 'bg-[#2563eb]' },
    { name: 'Cam Sáng (Neon Orange)', bg: 'bg-[#f97316]' },
    { name: 'Hồng Phấn (Pastel Pink)', bg: 'bg-[#f472b6]' }
  ];

  const textures = [
    { label: 'Ướt / Wet (Tacky)', desc: 'Độ bám dính cực cao, không trơn trượt' },
    { label: 'Khô / Dry (Absorbent)', desc: 'Siêu hút ẩm mồ hôi cho bàn tay nhiều mồ hôi' },
    { label: 'Lưới / Mesh (Perforated)', desc: 'Đục lỗ thoát khí thoáng mát nhanh' }
  ];

  const handleAdd = () => {
    addToCart(product, quantity, { color: selectedColor, texture: selectedTexture });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  const handleBuyNow = () => {
    const cartItemId = addToCart(product, quantity, { color: selectedColor, texture: selectedTexture });
    navigate('/checkout', { state: { selectedItemIds: cartItemId ? [cartItemId] : undefined } });
  };

  const handleAddCombo = () => {
    addToCart(
      {
        id: 99901,
        name: 'Combo Thi Đấu Tiết Kiệm: Vỉ AC102EX + Kéo Bấm Cắt Cán Yonex AC1053',
        price: 195000,
        originalPrice: 235000,
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCg5OYCQs4x3ztVT7O4Cq3hOzApdAmkjQK_rmSNvrUAY0mJlE5LVBFjDIJK8jj-Jiwpl-gOIDey1EH4YXo_-4Cg2o8y0Gl3AT-RpLs-MVTbruOVwNTFjmleEsNRo6bHCwg3Q4p87AepWif6qlwDDfJ2dVtpJDQg_h6vSaAHyRYHLaZ9YbMmrMBiJycjfg6_2wezOPgBnG3hehpKWPhadXlsHT91mfdlNmmCJGxo7u5CvVbXhC0X2G0l',
        brand: 'Yonex',
        categoryName: 'Phụ kiện pro'
      },
      1,
      { combo: 'Combo Tiết Kiệm 40k' }
    );
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
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
          <span className="hidden lg:flex items-center gap-2 text-slate-600 font-semibold text-xs">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            Phân phối chính thức độc quyền Sunrise Sports Việt Nam
          </span>
        </div>

        {/* Product Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">
          {/* Left: Gallery */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-[#F2F4F6] rounded-2xl shadow-sm overflow-hidden flex items-center justify-center p-6 group">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                <span className="bg-secondary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Chính Hãng
                </span>
                <span className="bg-[#0F172A] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Top 1 Bán Chạy Toàn Cầu
                </span>
              </div>
              <img
                src={galleryImages[activeImage]}
                alt={product.name}
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Thumbnail Rail */}
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
                  <img src={src} alt={`Thumb ${i}`} className="w-full h-full object-contain" />
                  <span className="absolute inset-x-0 bottom-0 py-0.5 bg-[#0F172A]/80 text-white text-[9px] font-bold text-center">
                    {thumbLabels[i]}
                  </span>
                </button>
              ))}
            </div>

            {/* Trust credentials */}
            <div className="bg-[#F2F4F6] rounded-2xl p-4 flex flex-col gap-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900 uppercase">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span>Tiêu chuẩn thi đấu BWF Tournament</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-secondary" /> Tem cào QR Sunrise</div>
                <div className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-secondary" /> Đổi mới 7 ngày</div>
                <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-secondary" /> Giao hỏa tốc 2H</div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Nhập khẩu Nhật Bản</div>
              </div>
            </div>
          </div>

          {/* Right: Info & Selectors */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm uppercase tracking-widest text-[#0F172A]">{product.brand || 'YONEX'}</span>
                  <span className="px-2 py-0.5 bg-[#0F172A] text-white rounded text-[10px] font-bold uppercase">BWF APPROVED</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">Mã SP: {product.sku || 'AC102EX-3IN1'}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-500 pb-3 border-b border-slate-100">
                <div className="flex text-amber-500 items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span className="font-bold text-slate-900">4.9</span>
                </div>
                <span>(1.240 đánh giá)</span>
                <span>•</span>
                <span>Đã bán: <strong className="text-slate-900">14.8k vỉ</strong></span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">Còn hàng (Kho sẵn)</span>
              </div>

              {/* Price Box */}
              <div className="bg-[#F2F4F6] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-secondary">{formatPrice(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                  <span className="bg-secondary text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">-21%</span>
                </div>
                <div className="text-xs text-slate-700 bg-white px-3 py-1.5 rounded-lg shadow-sm font-semibold">
                  Tích luỹ <strong className="text-secondary">+950 ApexClub</strong>
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-bold text-slate-900">Màu sắc lựa chọn: <strong className="text-secondary">{selectedColor}</strong></span>
                  <span className="text-slate-400">Quy cách: Vỉ 3 cuộn cùng màu</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
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

              {/* Texture Pills */}
              <div>
                <span className="block text-xs font-bold text-slate-900 mb-2">Đặc tính tiếp xúc bề mặt:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {textures.map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setSelectedTexture(t.label)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        selectedTexture === t.label
                          ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-sm'
                          : 'bg-[#F2F4F6] border-transparent hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <span className="font-bold block">{t.label}</span>
                      <span className={`text-[11px] block mt-0.5 ${selectedTexture === t.label ? 'text-slate-300' : 'text-slate-500'}`}>
                        {t.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Cluster */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
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

              {/* Combo Suggestion Box */}
              <div className="bg-[#F2F4F6] rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCg5OYCQs4x3ztVT7O4Cq3hOzApdAmkjQK_rmSNvrUAY0mJlE5LVBFjDIJK8jj-Jiwpl-gOIDey1EH4YXo_-4Cg2o8y0Gl3AT-RpLs-MVTbruOVwNTFjmleEsNRo6bHCwg3Q4p87AepWif6qlwDDfJ2dVtpJDQg_h6vSaAHyRYHLaZ9YbMmrMBiJycjfg6_2wezOPgBnG3hehpKWPhadXlsHT91mfdlNmmCJGxo7u5CvVbXhC0X2G0l"
                    alt="Combo"
                    className="w-12 h-12 rounded-lg bg-white object-contain p-1"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase block">Combo Thi Đấu Tiết Kiệm</span>
                    <span className="text-xs font-bold text-slate-900 block">Vỉ Quấn AC102EX + Kéo Bấm Cắt Cán AC1053</span>
                    <span className="text-xs font-bold text-secondary">195.000₫ <span className="line-through text-slate-400 font-normal">235.000₫</span></span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCombo}
                  className="w-full sm:w-auto px-4 py-2 bg-[#0F172A] text-white text-xs font-bold uppercase rounded-lg hover:bg-slate-800 shrink-0"
                >
                  Thêm combo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs System */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 mb-6">
            {[
              { key: 'desc', label: 'Mô tả chi tiết & Hướng dẫn' },
              { key: 'specs', label: 'Thông số kỹ thuật chuẩn' },
              { key: 'reviews', label: `Đánh giá & Nhận xét (${reviews.length > 0 ? reviews.length : 1240})` }
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
              <h3 className="text-base font-bold text-slate-900">Quấn Cán Vợt Cầu Lông Yonex Super Grap AC102EX</h3>
              <p>
                Ra mắt lần đầu vào năm 1987, Yonex Super Grap AC102EX là loại quấn cán bán chạy nhất mọi thời đại với hơn 200 triệu cuộn được bán ra trên toàn cầu. Đạt độ bám dính tối ưu ngay cả khi đổ nhiều mồ hôi, giúp người chơi kiểm soát hoàn hảo từng cú vung vợt và đập cầu smash.
              </p>
              <h4 className="font-bold text-slate-900 pt-2">Hướng dẫn quấn cán đúng chuẩn:</h4>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Bóc lớp nilon trong suốt bảo vệ bề mặt quấn cán.</li>
                <li>Bắt đầu dán từ đáy cán vợt, quấn đè chéo khoảng 1/3 bề rộng dải quấn.</li>
                <li>Giữ lực căng vừa phải khi quấn lên đến nắp chụp cán vợt.</li>
                <li>Dùng kéo cắt vát chéo phần thừa và cố định chắc chắn bằng dải băng dính đen Yonex đi kèm.</li>
              </ol>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl space-y-2 text-xs">
              {[
                ['Thương hiệu', product.brand || 'Yonex (Nhật Bản)'],
                ['Mã sản phẩm', product.sku || 'AC102EX'],
                ['Quy cách đóng gói', product.quantityPerPack || 'Vỉ 3 cuộn'],
                ['Chất liệu', product.fabricType || 'Polyurethane (PU) cao cấp'],
                ['Bề rộng', '25 mm'],
                ['Độ dày', '0.6 mm'],
                ['Chiều dài', '1.200 mm (Quấn đủ cho mọi cán vợt)'],
                ['Xuất xứ', 'Made in Indonesia / Japan']
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5 px-4 bg-[#F2F4F6] rounded-xl">
                  <span className="text-slate-500 font-medium">{k}</span>
                  <span className="text-slate-900 font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-3xl space-y-4">
              <div className="p-4 bg-[#F2F4F6] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-slate-900">4.9</span>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-500" />)}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">100% đánh giá mua hàng thực tế</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Vũ Hải Long', comment: 'Quấn bám tay kinh khủng, đánh 2 tiếng mồ hôi ướt sũng mà không trượt chút nào.' },
                  { name: 'Nguyễn Văn Đức', comment: 'Chuẩn hàng Sunrise có tem QR, màu vàng chanh lên vợt rất nổi.' }
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
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default RacketGripDetailPage;
