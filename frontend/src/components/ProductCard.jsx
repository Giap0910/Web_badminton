import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { ShoppingCart, Layers, Check, Star } from 'lucide-react';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleRacket, isInComparison } = useCompare();

  const isComparing = isInComparison(product.id);
  const inStock = product.stock > 0;

  // Format VND currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Helper badge color for balance point
  const getBalanceBadge = (point) => {
    if (!point) return 'bg-slate-100 text-slate-700';
    if (point.toLowerCase().includes('heavy')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (point.toLowerCase().includes('light')) return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group">
      
      {/* Product Image & Badges */}
      <div className="relative pt-[90%] bg-slate-100/70 overflow-hidden">
        <Link to={`/products/${product.id}`} className="absolute inset-0">
          <img
            src={product.imageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>

        {/* Brand Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide bg-slate-900/80 backdrop-blur text-white shadow">
            {product.brand}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow">
              GIẢM {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
            </span>
          )}
        </div>

        {/* Compare Toggle Button */}
        <button
          onClick={() => toggleRacket(product)}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur transition-all shadow-sm ${
            isComparing
              ? 'bg-teal-600 text-white shadow-teal-500/30'
              : 'bg-white/90 text-slate-600 hover:text-teal-600 hover:bg-white'
          }`}
          title={isComparing ? 'Bỏ chọn so sánh' : 'Chọn để so sánh'}
        >
          {isComparing ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
        </button>

        {/* Stock Badge */}
        <div className="absolute bottom-2.5 left-3">
          {inStock ? (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100/90 text-emerald-800 backdrop-blur">
              Kho: <strong className="font-bold">{product.stock}</strong> chiếc
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
              Tạm hết hàng
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Badminton Specs Badges */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {product.weightGrip && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
                {product.weightGrip}
              </span>
            )}
            {product.balancePoint && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getBalanceBadge(product.balancePoint)}`}>
                {product.balancePoint.split('(')[0].trim()}
              </span>
            )}
            {product.stiffness && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600">
                {product.stiffness}
              </span>
            )}
          </div>

          {/* Product Name */}
          <Link to={`/products/${product.id}`}>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 hover:text-emerald-600 transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Playstyle / Subtitle */}
          {product.playStyle && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
              Lối chơi: {product.playStyle}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
            </div>
            <span className="text-xs font-bold text-slate-700">
              {product.averageRating ? product.averageRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-[11px] text-slate-400">
              ({product.reviewCount || 0} đánh giá)
            </span>
          </div>
        </div>

        {/* Pricing & Cart Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-700">
              {formatPrice(product.price)}
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="text-xs text-slate-400 line-through">
                {formatPrice(product.originalPrice)}
              </div>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={!inStock}
            className={`p-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              inStock
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={inStock ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
