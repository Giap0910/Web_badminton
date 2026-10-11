import React, { useState } from 'react';

/**
 * ProductImage Component
 * - Renders product image with graceful SVG fallback for null / broken URLs
 * - Avoids external unverified photos, preserving official brand design
 */
export const BadmintonPlaceholder = ({ className = 'w-full h-full' }) => (
  <div className={`flex flex-col items-center justify-center bg-slate-100/90 text-slate-400 p-4 select-none ${className}`}>
    <div className="w-12 h-12 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-400 mb-2 shadow-inner">
      {/* Shuttlecock SVG */}
      <svg className="w-7 h-7 transform -rotate-45 opacity-70" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C10.9 2 10 2.9 10 4C10 4.3 10.1 4.6 10.2 4.9L4.9 10.2C4.6 10.1 4.3 10 4 10C2.9 10 2 10.9 2 12C2 12.3 2.1 12.6 2.2 12.9L3 21H11.1C11.4 21.9 12.3 22 12 22C12.3 22 12.6 21.9 12.9 21.8L21 21L21.8 12.9C21.9 12.6 22 12.3 22 12C22 10.9 21.1 10 20 10C19.7 10 19.4 10.1 19.1 10.2L13.8 4.9C13.9 4.6 14 4.3 14 4C14 2.9 13.1 2 12 2ZM12 5.5L16.5 10L14.5 12L12 9.5L9.5 12L7.5 10L12 5.5ZM12 11L14.5 13.5L12 16L9.5 13.5L12 11Z" />
      </svg>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">HG Badminton</span>
    <span className="text-[9px] text-slate-400/80">Hình ảnh đang cập nhật</span>
  </div>
);

const ProductImage = ({
  src,
  alt = 'Sản phẩm cầu lông',
  className = '',
  imgClassName = 'w-full h-full object-contain',
  loading = 'lazy',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  // If no source provided or failed to load
  if (!src || typeof src !== 'string' || !src.trim() || hasError) {
    return <BadmintonPlaceholder className={className} />;
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setHasError(true)}
        className={imgClassName}
        {...props}
      />
    </div>
  );
};

export default ProductImage;
