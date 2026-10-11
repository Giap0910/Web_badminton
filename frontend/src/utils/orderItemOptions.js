import React from 'react';

/**
 * Trích xuất các thuộc tính biến thể/options từ OrderItem snapshot.
 * Chuẩn hóa các trường: selectedWeight/weightGrip, selectedColor/color, selectedSize/size, stringingService (+ stringTension).
 */
export const getOrderItemOptions = (item = {}) => {
  if (!item || typeof item !== 'object') return [];
  const options = [];

  const rawWeight = item.selectedWeight || item.weightGrip || item.weightClass;
  const weight = typeof rawWeight === 'string' ? rawWeight.trim() : '';

  const rawColor = item.selectedColor || item.color;
  const color = typeof rawColor === 'string' ? rawColor.trim() : '';

  const rawSize = item.selectedSize || item.size;
  const size = typeof rawSize === 'string' ? rawSize.trim() : '';

  const rawStringService = item.stringingService;
  const stringService = typeof rawStringService === 'string' ? rawStringService.trim() : '';

  const rawTension = item.stringTension;
  const tension = typeof rawTension === 'string' ? rawTension.trim() : '';

  if (weight) {
    options.push({ type: 'weight', label: weight });
  }

  if (color) {
    options.push({ type: 'color', label: color });
  }

  if (size) {
    options.push({ type: 'size', label: `Size: ${size}` });
  }

  if (stringService) {
    options.push({
      type: 'string',
      label: `${stringService}${tension ? ` (${tension})` : ''}`,
      highlight: true
    });
  }

  return options;
};

/**
 * Format chuỗi tóm tắt options cho item (dùng cho bảng tóm tắt nếu cần)
 */
export const formatOrderItemOptionsText = (item = {}, fallback = '') => {
  const options = getOrderItemOptions(item);
  if (options.length === 0) return fallback;
  return options.map((opt) => opt.label).join(' • ');
};

/**
 * Component hiển thị các badges biến thể / options của OrderItem (viết bằng React.createElement cho Node compatibility).
 */
export function OrderItemOptions({ item, className = '' }) {
  const options = getOrderItemOptions(item);
  if (options.length === 0) return null;

  return React.createElement(
    'div',
    { className: `flex flex-wrap items-center gap-1.5 pt-0.5 ${className}` },
    options.map((opt, idx) =>
      React.createElement(
        'span',
        {
          key: idx,
          className: `inline-block text-[11px] px-2 py-0.5 rounded font-semibold ${
            opt.highlight
              ? 'bg-red-50 text-secondary border border-red-100'
              : 'bg-slate-100 text-slate-700'
          }`
        },
        opt.label
      )
    )
  );
}

export default OrderItemOptions;
