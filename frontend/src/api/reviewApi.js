import axiosClient from './axiosClient';
import { useEffect, useRef, useState } from 'react';

export function readReviewList(response) {
  const list = response?.data ?? response;
  if (!Array.isArray(list)) throw new Error('Danh sách đánh giá từ máy chủ không hợp lệ.');
  return list;
}
export function normalizeReview(item) {
  return { ...item, productName: item.productName || 'Sản phẩm đã ngừng bán', productBrand: item.productBrand || '',
    productImage: item.productImageUrl || null, purchasedSpec: item.purchasedSpec || '',
    rating: Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5 ? item.rating : 0,
    createdAt: item.createdAt || null, content: item.comment || '', feedbackImages: [],
    verifiedBuyer: item.verifiedPurchase === true, visible: item.visible !== false,
    officialReply: typeof item.officialReply === 'string' && item.officialReply.trim()
      ? { author: 'Phản hồi cửa hàng', date: item.replyUpdatedAt || null, message: item.officialReply } : null };
}
export function buildReviewPayload(product, rating, comment) {
  const content = String(comment || '').trim();
  if (!Number.isSafeInteger(product?.productId) || product.productId < 1) throw new Error('Sản phẩm đánh giá không hợp lệ.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Vui lòng chọn từ 1 đến 5 sao.');
  if (!content || content.length > 2000) throw new Error('Nhận xét phải từ 1 đến 2.000 ký tự.');
  const payload = { productId: product.productId, rating, comment: content };
  if (Number.isSafeInteger(product.orderItemId) && product.orderItemId > 0) payload.orderItemId = product.orderItemId;
  return payload;
}

export function useProductReviews(productId) {
  const [reviews, updateReviews] = useState([]), [reviewsError, setError] = useState('');
  const [reviewsLoading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    let active = true; const attempt = ++generation.current;
    updateReviews([]); setError(''); setLoading(true);
    reviewApi.getProductReviews(productId).then(response => {
      const list = readReviewList(response);
      if (active && generation.current === attempt) updateReviews(list.filter(item => item.visible !== false));
    }).catch(error => {
      if (active && generation.current === attempt) setError(error.response?.data?.message || 'Không tải được đánh giá.');
    }).finally(() => { if (active && generation.current === attempt) setLoading(false); });
    return () => { active = false; generation.current++; };
  }, [productId, retry]);
  const setReviews = updater => {
    generation.current++; setLoading(false); setError('');
    updateReviews(previous => (typeof updater === 'function' ? updater(previous) : updater).filter(item => item.visible !== false));
  };
  return { reviews, reviewsError, reviewsLoading, setReviews, retryReviews: () => setRetry(value => value + 1) };
}

export const reviewApi = {
  getProductReviews: (productId) => axiosClient.get(`/reviews/product/${productId}`),
  getMyReviews: (config) => axiosClient.get('/reviews/my-reviews', config),
  getEligibleProducts: (config) => axiosClient.get('/reviews/eligible-products', config),
  createReview: (data, config) => axiosClient.post('/reviews', data, config),
};
