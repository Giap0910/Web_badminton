import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Bolt, ChevronRight, CheckCircle2, ShieldCheck, RefreshCw, Zap, Award, AlertCircle } from 'lucide-react';
import { productApi } from '../api/productApi';
import ProductImage from '../components/ProductImage';
import { useProductReviews } from '../api/reviewApi';
import { useCart } from '../context/CartContext';
import { formatPrice, productImages } from '../utils/formatters';

import { ProductDescription, ProductSpecifications, ProductSelections, ProductRating, ProductReviewList, ProductDiscount, productCartOptions, productValue, productAccessoryLabel } from '../components/ProductFacts';

const ShuttlecockDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const { reviews, reviewsError, reviewsLoading, retryReviews } = useProductReviews(id);

  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedFeather, setSelectedFeather] = useState('Lông vũ tự nhiên (Goose Feather)');

  const [activeTab, setActiveTab] = useState('desc');
  const [addedToast, setAddedToast] = useState(false);
  const [cartError, setCartError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchProd = async () => {
      setLoading(true);
      setProduct(null);


      try {
        const [prodData] = await Promise.all([
          productApi.getProductById(id),
        ]);
        if (!active) return;
        setProduct(prodData);
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
        <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Đang tải chi tiết cầu lông...</span>
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

  const galleryImages = productImages(product);

  const thumbLabels = ['Ống chuẩn', 'Lông ngỗng A', 'Niêm phong 12', 'Thùng sỉ'];


  const handleAdd = () => {
    if (!product) return;
    const cartItemId = addToCart(product, quantity, productCartOptions(product));
    if (cartItemId) {
      setCartError('');
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2500);
    } else {
      setAddedToast(false);
      setCartError('Số lượng yêu cầu vượt quá tồn kho hiện có!');
      setTimeout(() => setCartError(''), 3000);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    const cartItemId = addToCart(product, quantity, productCartOptions(product));
    if (cartItemId) {
      navigate('/checkout', { state: { selectedItemIds: [cartItemId] } });
    } else {
      setCartError('Số lượng yêu cầu vượt quá tồn kho hiện có!');
      setTimeout(() => setCartError(''), 3000);
    }
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />Tồn kho: {productValue(product.stock)} sản phẩm</span>
        </div>

        {/* Product Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">

          {/* Left Gallery */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-[#F2F4F6] rounded-2xl shadow-sm overflow-hidden flex items-center justify-center p-6 group">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                <span className="bg-secondary text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />{productValue(product.brand)}</span>
                <span className="bg-[#0F172A] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />{productValue(product.brand)}</span>
              </div>
              <ProductImage
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
                  <ProductImage src={src} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
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
                <span className="font-bold text-slate-900 text-[11px]">{productAccessoryLabel(product.accessoryType)}</span>
                <span className="text-[10px] text-slate-500 leading-tight">Loại phụ kiện</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Zap className="w-5 h-5 text-[#0F172A]" />
                <span className="font-bold text-slate-900 text-[11px]">{productValue(product.quantityPerPack)}</span>
                <span className="text-[10px] text-slate-500 leading-tight">Quy cách đóng gói</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RefreshCw className="w-5 h-5 text-secondary" />
                <span className="font-bold text-slate-900 text-[11px]">{productValue(product.origin)}</span>
                <span className="text-[10px] text-slate-500 leading-tight">Xuất xứ</span>
              </div>
            </div>
          </div>

          {/* Right Selectors & Buy */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#0F172A] text-white text-[10px] font-bold uppercase rounded">{productValue(product.brand)}</span>
                  <span className="text-xs text-slate-400 font-mono">Mã SP: {productValue(product.sku)}</span>
                </div>
                <span className="text-xs text-secondary font-bold">{productValue(product.categoryName)}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {product.name}
              </h1>

              <ProductRating product={product} />

              {/* Price Box */}
              <div className="bg-[#F2F4F6] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-secondary">{formatPrice(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
                  )}
                  <span className="bg-secondary text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase"><ProductDiscount product={product} /></span>
                </div>
                <div className="text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-lg shadow-sm">
                  Quy cách: <strong>{productValue(product.quantityPerPack)}</strong>
                </div>
              </div>

              <ProductSelections product={product} />

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

              {cartError && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{cartError}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tabs System */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E2E8F0] mb-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 mb-6">
            {[
              { key: 'desc', label: 'Mô tả chi tiết' },
              { key: 'specs', label: 'Thông số kỹ thuật' },
              { key: 'reviews', label: `Đánh giá từ các CLB (${product.reviewCount ?? 0})` }
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

          {activeTab === 'desc' && <ProductDescription product={product} />}

          {activeTab === 'specs' && <ProductSpecifications product={product} />}

          {activeTab === 'reviews' && <ProductReviewList product={product} reviews={reviews} error={reviewsError} loading={reviewsLoading} onRetry={retryReviews} />}
        </section>

      </div>
    </div>
  );
};

export default ShuttlecockDetailPage;
