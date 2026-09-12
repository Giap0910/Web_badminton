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
