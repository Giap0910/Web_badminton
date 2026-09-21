/**
 * Format currency to Vietnamese Dong (VNĐ)
 * @param {number|string} price
 * @returns {string} Formatted price string (e.g., "2.500.000 ₫")
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return '0 ₫';
  const num = Number(price);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

/**
 * Format ISO date string to Vietnamese localized format
 * @param {string|Date} date
 * @param {boolean} includeTime
 * @returns {string} Formatted date (e.g., "14:30 12/09/2026")
 */
export const formatDate = (date, includeTime = true) => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    if (!includeTime) return `${day}/${month}/${year}`;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return '—';
  }
};

/**
 * Format remaining seconds into mm:ss display
 * @param {number} totalSeconds
 * @returns {string} Formatted timer (e.g., "14:59")
 */
export const formatTimer = (totalSeconds) => {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const isOrderPaid = (order) => !!order && (
  order.status === 'PAID' ||
  (order.paymentMethod === 'PAYOS_VIETQR' && order.status === 'SHIPPING') ||
  order.status === 'COMPLETED'
);

export const getOrderStatusLabel = (order) => {
  if (order.status === 'PENDING') {
    return order.paymentMethod === 'COD' ? 'Chờ xử lý COD' : 'Chờ thanh toán PayOS';
  }
  return { PAID: 'Đã thanh toán, chờ giao', SHIPPING: 'Đang giao hàng',
    COMPLETED: 'Đã giao và thanh toán', CANCELLED: 'Đã hủy' }[order.status] || 'Chưa xác định';
};

export const getNextOrderStatuses = (order) => {
  if (order.status === 'PENDING') {
    return order.paymentMethod === 'COD' ? ['SHIPPING', 'CANCELLED'] : ['CANCELLED'];
  }
  if (order.status === 'PAID' && order.paymentMethod === 'PAYOS_VIETQR') return ['SHIPPING'];
  if (order.status === 'SHIPPING') return ['COMPLETED'];
  return [];
};

export const productOptions = (value) => {
  if (value == null || value === '') return [];
  let values = value;
  if (typeof value === 'string') {
    try { values = JSON.parse(value); } catch { values = value.split(/[,;|]+/); }
  }
  if (!Array.isArray(values)) values = [values];
  return [...new Set(values.filter((v) => typeof v === 'string' || typeof v === 'number')
    .map((v) => String(v).trim()).filter(Boolean))];
};

export const productCategory = (product) => {
  const category = String(product?.categoryName || product?.category?.name || '').toUpperCase();
  const name = String(product?.name || '').toUpperCase();
  const classify = (text) => {
    if (/GIÀY|SHOE|FOOTWEAR/.test(text)) return 'SHOES';
    if (/BALO|BAO VỢT|TÚI|BAG|BACKPACK/.test(text)) return 'BAG';
    if (/QUẦN|ÁO|VÁY|APPAREL|CLOTHING|TRANG PHỤC/.test(text)) return 'APPAREL';
    if (/CƯỚC|PHỤ KIỆN|ACCESSOR|GRIP|QUẤN CÁN|QUẢ CẦU|HỘP CẦU|ỐNG CẦU|BĂNG/.test(text)) return 'ACCESSORIES';
    if (/VỢT|RACKET/.test(text)) return 'RACKET';
    return null;
  };
  return classify(category) || classify(name) || 'OTHER';
};

export const productImages = (product) => [...new Set([
  product?.imageUrl, ...(Array.isArray(product?.imageUrls) ? product.imageUrls : [])
].filter((url) => typeof url === 'string' && url.trim()))];

export const productRating = (product) => Number(product?.reviewCount) > 0
  && product?.averageRating != null && Number.isFinite(Number(product.averageRating))
  ? Number(product.averageRating).toFixed(1) : 'Chưa có đánh giá';
