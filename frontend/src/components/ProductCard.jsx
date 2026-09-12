import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { ShoppingCart, Layers, Check, Star, Heart } from 'lucide-react';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleRacket, isInComparison } = useCompare();
  const [isFavorite, setIsFavorite] = useState(false);

  const isComparing = isInComparison(product.id);
  const inStock = product.stock === undefined || product.stock > 0;

  // Format VND currency
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Helper tính phần trăm giảm giá
  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  // Helper badge color
  const getBadgeContent = () => {
    if (product.badge) return product.badge;
    if (discountPercent) return `-${discountPercent}%`;
    if (product.averageRating && product.averageRating >= 4.9) return 'BESTSELLER';
    return 'CHÍNH HÃNG';
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-card-rest hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 p-4">
      
      {/* Top Badges & Actions */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
          discountPercent
            ? 'bg-secondary text-white'
            : getBadgeContent() === 'BESTSELLER'
            ? 'bg-[#0F172A] text-white'
            : 'bg-slate-100 text-slate-700'
        }`}>
          {getBadgeContent()}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Nút chọn So sánh vợt */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleRacket(product);
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              isComparing
                ? 'bg-royal text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title={isComparing ? 'Đang so sánh cây này (click để bỏ)' : 'Chọn so sánh thông số'}
          >
            {isComparing ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isComparing ? 'Đã chọn' : 'So sánh'}</span>
          </button>

          {/* Nút Yêu thích */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setIsFavorite(!isFavorite);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              isFavorite
                ? 'bg-rose-50 text-secondary'
                : 'bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-secondary'
            }`}
            title={isFavorite ? 'Đã lưu yêu thích' : 'Thêm vào yêu thích'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-secondary text-secondary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Product Image Stage */}
      <Link
        to={`/products/${product.id}`}
        className="w-full aspect-square rounded-xl overflow-hidden bg-[#F7F9FB] flex items-center justify-center mb-4 p-2 relative group-hover:bg-slate-100/80 transition-colors"
      >
        <img
          src={product.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqP5-09-en3WHRlPNRnH8cZ3V9kAaku_b2OVd_I_6x9q6_T1H_Hr0Gc5kqOYT7k9MVkPKZ3ODsvaZBO7ROpQIeObNz3biRuM5JcNCzBk2-cWr6dNqexDRZ2Idaw-Be30kS3ZjHNHCpJNphpTD3rTXuxKEHu59aWDnQIs5xRH14FbIfSuTbSuvqT6k5-hBAnLXC5QAwMpKHBqi65lpTxERKcdNJWz567VGTnLxYv1eMhtINnN7fiKR5'}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </Link>

      {/* Specs & Info */}
      <div className="flex flex-col flex-1">
        {/* Brand & Specs Tag */}
        <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">
          {product.brand || 'CHÍNH HÃNG'} {product.weightGrip ? `• ${product.weightGrip}` : ''} {product.balancePoint ? `• ${product.balancePoint.split('(')[0].trim()}` : ''}
        </span>

        {/* Product Name */}
        <Link to={`/products/${product.id}`}>
          <h4 className="font-display text-sm sm:text-base font-bold text-slate-900 mt-1 mb-2 line-clamp-2 group-hover:text-secondary transition-colors leading-snug">
            {product.name}
          </h4>
        </Link>

        {/* Star Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-800">
            {product.averageRating ? product.averageRating.toFixed(1) : '5.0'}
          </span>
          <span className="text-xs text-slate-400">
            ({product.reviewCount || 88})
          </span>
        </div>

        {/* Price & Add to Cart CTA */}
        <div className="mt-auto flex items-end justify-between pt-2 border-t border-slate-100">
          <div className="flex flex-col">
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="font-display text-base sm:text-lg font-extrabold text-secondary leading-tight">
              {formatPrice(product.price)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => addToCart(product, 1)}
            disabled={!inStock}
            className={`p-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center ${
              inStock
                ? 'bg-secondary text-white hover:bg-secondary-hover active:scale-95 hover:shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={inStock ? 'Thêm nhanh vào giỏ hàng' : 'Tạm hết hàng'}
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
