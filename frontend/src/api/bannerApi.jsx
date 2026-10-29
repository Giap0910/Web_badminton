import axiosClient from './axiosClient.js';

export const emptyBannerSlots = () => Array.from({ length: 4 }, (_, index) =>
  ({ position: index + 1, url: null, status: 'UPDATING' }));

export const internalBannerImage = url => typeof url === 'string'
  && /^\/api\/media\/banners\/[1-4]\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(jpg|png)$/.test(url);

export function normalizeBannerSlot(slot) {
  if (!Number.isInteger(slot?.position) || slot.position < 1 || slot.position > 4
      || !['READY', 'UPDATING'].includes(slot.status)) throw new Error('Dữ liệu banner không hợp lệ.');
  if (slot.status === 'READY' && (!internalBannerImage(slot.url)
      || !slot.url.startsWith(`/api/media/banners/${slot.position}/`))) throw new Error('Đường dẫn banner không hợp lệ.');
  if (slot.status === 'UPDATING' && slot.url != null) throw new Error('Trạng thái banner không khớp ảnh.');
  return { position: slot.position, url: slot.status === 'READY' ? slot.url : null, status: slot.status };
}

export function normalizeBannerSlots(data) {
  if (!Array.isArray(data) || data.length !== 4) throw new Error('Máy chủ phải trả đủ 4 vị trí banner.');
  const slots = data.map(normalizeBannerSlot);
  if (new Set(slots.map(slot => slot.position)).size !== 4) throw new Error('Vị trí banner bị trùng.');
  return slots.sort((a, b) => a.position - b.position);
}

export function bannerImageSource(url) {
  if (!internalBannerImage(url)) return null;
  const origin = typeof window === 'undefined' ? 'http://localhost:8080' : window.location.origin;
  return new URL(url, new URL(axiosClient.defaults.baseURL, origin)).href;
}

export const bannerApi = {
  list: options => axiosClient.get('/banners', options).then(normalizeBannerSlots),
  upload: async (position, file, approved) => {
    const body = new FormData(); body.append('file', file); body.append('approved', String(approved));
    const result = normalizeBannerSlot(await axiosClient.put(`/admin/banners/${position}/image`, body,
      { headers: { 'Content-Type': undefined }, timeout: 60000 }));
    if (result.position !== position || result.status !== 'READY') throw new Error('Máy chủ chưa xác nhận lưu đúng banner.');
    return result;
  },
};
