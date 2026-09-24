import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productImages, productRating, productOptions, productCategory } from '../utils/formatters';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Star, Heart } from 'lucide-react';

const ProductCard = ({ product, onQuickView }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const needsSelection = ['SHOES', 'APPAREL'].includes(productCategory(product))
    || productOptions(product.weightGrip || product.weightClass).length > 0;
  const [isFavorite, setIsFavorite] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const inStock = Number.isInteger(product.stock) && product.stock > 0;
  const imageUrl = productImages(product)[0];

  // Format VND currency
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Xác định đường dẫn chi tiết tương ứng (hỗ trợ 4 loại phụ kiện chuyên biệt)
  const getProductDetailUrl = (prod) => {
    const sub = prod.subcategory || '';
    const nameLower = (prod.name || '').toLowerCase();
    if (sub === 'racket-grip' || nameLower.includes('quấn cán') || nameLower.includes('super grap')) {
      return `/product/racket-grip/${prod.id}`;
    }
    if (sub === 'string' || nameLower.includes('cước') || nameLower.includes('bg80') || nameLower.includes('bg65')) {
      return `/product/string/${prod.id}`;
    }
    if (sub === 'shuttlecock' || nameLower.includes('ống cầu') || nameLower.includes('quả cầu') || nameLower.includes('aerosensa')) {
      return `/product/shuttlecock/${prod.id}`;
    }
    if (sub === 'sweatband' || nameLower.includes('băng chặn') || nameLower.includes('headband') || nameLower.includes('wristband')) {
      return `/product/sweatband/${prod.id}`;
    }
    return `/products/${prod.id}`;
  };

  const productDetailUrl = getProductDetailUrl(product);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inStock && needsSelection) {
      navigate(productDetailUrl);
      return;
    }
    if (!inStock || !addToCart(product, 1)) {
      alert('Không đủ tồn kho để thêm sản phẩm.');
      return;
    }
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
  const badgeLabel = product.badge || (discountPercent ? `-${discountPercent}%` : (isNew ? 'Mới' : ''));

  // Specs pill label
  const specLabel = product.weightGrip || product.specification || 'Chưa có thông số';

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
        <Link to={productDetailUrl} className="w-full h-full flex items-center justify-center">
          {imageUrl ? <img 
            src={imageUrl} 
            alt={product.name} 
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          /> : <span>Chưa có ảnh sản phẩm</span>}
        </Link>

        {/* Hover Action Bar */}
        <div className="absolute inset-x-3 bottom-3 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            type="button"
            disabled={!inStock}
            onClick={handleAddToCart}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md transition-all ${
              addedAnimation 
                ? 'bg-emerald-600 text-white' 
                : 'bg-secondary hover:bg-secondary-hover text-white active:scale-95'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{!inStock ? 'Hết hàng' : addedAnimation ? 'Đã thêm!' : needsSelection ? 'Chọn phiên bản' : 'Thêm giỏ hàng'}</span>
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="flex flex-col pt-3 gap-1 flex-1 justify-between">
        <div>
          {/* Brand & Specification Tag */}
          <div className="flex items-center justify-between text-slate-600 text-xs mb-1">
            <span className="font-bold text-slate-900 uppercase">
              {product.brand || 'HG PRO'}
            </span>
            <span className="bg-[#ECEEF0] text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {specLabel}
            </span>
          </div>

          {/* Title */}
          <Link to={productDetailUrl}>
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 group-hover:text-secondary transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 my-1">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${product.reviewCount > 0 && i < Math.round(product.averageRating || 0) ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
              ))}
            </div>
            <span className="font-bold text-slate-900">
              {productRating(product)}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({product.reviewCount ?? 0} đánh giá)
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
