export function normalizeCustomer(user, index = 0) {
  return { id: user.id ?? index + 1, code: `KH-${user.id ?? index + 1}`,
    fullName: String(user.fullName || user.username || 'Khách hàng'), email: String(user.email || 'Chưa cập nhật'),
    phone: String(user.phone || 'Chưa cập nhật'), tier: user.tier || 'UNKNOWN',
    tierLabel: user.tierLabel || 'Chưa có hạng hội viên',
    points: user.loyaltyPoints != null && Number.isSafeInteger(Number(user.loyaltyPoints)) && Number(user.loyaltyPoints) >= 0 ? Number(user.loyaltyPoints) : null,
    totalSpent: Number.isFinite(Number(user.totalSpent)) && user.totalSpent != null ? Number(user.totalSpent) : null,
    totalOrders: Number.isInteger(user.totalOrders) ? user.totalOrders : null,
    joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Chưa có thông tin',
    status: user.isActive === false ? 'LOCKED' : 'ACTIVE', role: user.role };
}

export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}
