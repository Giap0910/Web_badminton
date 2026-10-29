export const internalProductImage = src => typeof src === 'string'
  && /^\/api\/media\/products\/\d+\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(src);

export function productCoverImage(product) {
  if (Array.isArray(product?.imageSlots)) {
    const numbered = product.imageSlots.some(slot => slot?.position != null);
    const first = numbered ? product.imageSlots.find(slot => slot?.position === 1) : product.imageSlots[0];
    return first?.status === 'READY' && internalProductImage(first.url) ? first.url : null;
  }
  return internalProductImage(product?.imageUrl) ? product.imageUrl : null;
}

export function productImageSource(src) {
  if (!internalProductImage(src)) return src;
  try {
    const origin = typeof window === 'undefined' ? 'http://localhost:8080' : window.location.origin;
    const base = new URL(import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080/api', origin);
    return new URL(src, base).href;
  }
  catch { return undefined; }
}
