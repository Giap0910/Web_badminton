import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Eye, Star, Heart } from 'lucide-react';

const ProductCard = ({ product, onQuickView }) => {
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Format VND currency
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  // Badge logic matching design: "Bán chạy" (red), "Mới" (blue), or discount %
  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const isNew = product.badge === 'MỚI 2024' || product.badge === 'Mới' || product.isNew;
  const badgeLabel = product.badge || (discountPercent ? `-${discountPercent}%` : (isNew ? 'Mới' : 'Bán chạy'));

  // Specs pill label
  const specLabel = product.weightGrip || product.specification || (product.category === 'shoes' ? 'Power Cushion+' : 'Head Heavy');

  return (
    <div className="group relative flex flex-col bg-white rounded-xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 border border-[#E2E8F0] hover:border-[#CBD5E1]">
      
      {/* Upper Badge Row */}
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs uppercase tracking-wide ${
          isNew 
            ? 'bg-[#2563EB] text-white' 
            : 'bg-secondary text-white'
        }`}>
          {badgeLabel}
        </span>
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          aria-label="Yêu thích" 
          className="text-slate-400 hover:text-secondary transition-colors p-1"
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-secondary text-secondary' : ''}`} />
        </button>
      </div>

      {/* Product Image Stage with Hover Quick-Actions */}
      <div className="relative w-full h-56 bg-[#F2F4F6] rounded-lg overflow-hidden flex items-center justify-center p-3">
        <Link to={`/products/${product.id}`} className="w-full h-full flex items-center justify-center">
          <img 
            src={product.imageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOFwZT1UJx5nkitITNFAjiR7oN1GVOk7tVqfi8VhTpi_UNiYyGmzZchQLR-OHFtbD6abTEHZ1tJeE3F9Ch-Sd5BalslPXTcg-0xfOsJI4H0MzHYnEGOCBg3H41UP0-a7I9elHE07OCDNkyrEKbdAtjgKbL6AAAZffbfOc0QBd8cLbdKs69D4qza-BkpsRhooyHwD-6K0zhrsEZs-tn7-0ACwfqU-7-NeA74IadD4DbLOFHRE7-iO06'} 
            alt={product.name} 
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>

        {/* Hover Action Bar */}
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            type="button"
            onClick={handleAddToCart}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md transition-all ${
              addedAnimation 
                ? 'bg-emerald-600 text-white' 
                : 'bg-secondary hover:bg-secondary-hover text-white active:scale-95'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{addedAnimation ? 'Đã thêm!' : 'Thêm giỏ hàng'}</span>
          </button>
          
          <button 
            type="button"
            onClick={handleQuickView}
            aria-label="Xem nhanh" 
            className="w-9 h-9 bg-white text-slate-800 hover:text-secondary rounded-lg flex items-center justify-center shadow-md transition-colors shrink-0"
            title="Xem nhanh thông số"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="flex flex-col pt-3 gap-1 flex-1 justify-between">
        <div>
          {/* Brand & Specification Tag */}
          <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
            <span className="font-bold text-slate-900 uppercase">
              {product.brand || 'APEX PRO'}
            </span>
            <span className="bg-[#ECEEF0] text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {specLabel}
            </span>
          </div>

          {/* Title */}
          <Link to={`/products/${product.id}`}>
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 my-1">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              ))}
            </div>
            <span className="font-bold text-slate-900">
              {product.averageRating ? product.averageRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({product.reviewCount || 128} đánh giá)
            </span>
          </div>
        </div>

        {/* Price Row */}
        <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
          <span className="font-display text-base sm:text-lg font-extrabold text-secondary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>

    </div>
  );
};

export default ProductCard;
