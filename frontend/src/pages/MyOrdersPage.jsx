import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
import { orderApi } from '../api/orderApi';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  QrCode,
  RotateCcw,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await orderApi.getMyOrders();
      const list = Array.isArray(res) ? res : res?.data || [];
      setOrders(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Số lượng tồn kho sẽ được hoàn trả ngay lập tức.')) return;

    setActionLoading(orderId);
    try {
      await orderApi.cancelOrder(orderId);
      await fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy đơn hàng.');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ thanh toán' },
    { key: 'PAID', label: 'Đã thanh toán' },
    { key: 'CANCELLED', label: 'Đã hủy' },
  ];

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Chờ thanh toán QR</span>
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Đã thanh toán</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-bold text-[11px] flex items-center gap-1">
            <XCircle className="w-3 h-3 text-slate-400" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
            {status}
          </span>
        );
    }
  };

  return (
    <UserLayout
      title="Quản Lý Đơn Hàng"
      subtitle="Theo dõi tiến độ xử lý đơn, lịch sử thanh toán VietQR và bảo hành sản phẩm"
    >
      <div className="space-y-6">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {tabs.map((tab) => {
            const count = tab.key === 'ALL' ? orders.length : orders.filter((o) => o.status === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Order Cards List */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-secondary mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-black text-base text-slate-900">Không tìm thấy đơn hàng nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Chưa có đơn hàng nào trong mục này. Hãy dạo quanh cửa hàng để sắm cho mình cây vợt ưng ý nhé!
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-secondary text-white font-bold text-xs shadow-md"
            >
              <span>Khám phá sản phẩm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:border-slate-300 transition-all space-y-4 p-5 sm:p-6"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-slate-900">#{order.id}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Items Preview */}
                <div className="divide-y divide-slate-100">
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.productImageUrl}
                          alt={item.productName}
                          className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{item.productName}</p>
                          <p className="text-[11px] text-slate-500">
                            Số lượng: {item.quantity} {item.weightGrip && `• ${item.weightGrip}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-800 shrink-0">
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Technical Note if any */}
                {order.note && (
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 text-xs italic">
                    <span className="font-bold not-italic text-slate-700">Yêu cầu căng cước: </span>
                    “{order.note}”
                  </div>
                )}

                {/* Bottom Row: Total & Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-slate-500">Tổng thanh toán:</span>
                    <span className="text-base font-black text-secondary">
                      {formatPrice(order.totalAmount)}
                    </span>
                    {order.voucherCode && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                        Mã {order.voucherCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {order.status === 'PENDING' && (
                      <>
                        <Link
                          to={`/payment/qr/${order.id}`}
                          className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Thanh toán VietQR</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={actionLoading === order.id}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          {actionLoading === order.id ? 'Đang hủy...' : 'Hủy đơn'}
                        </button>
                      </>
                    )}

                    {order.status === 'PAID' && (
                      <Link
                        to={`/returns?orderId=${order.id}`}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Đổi trả / Bảo hành</span>
                      </Link>
                    )}

                    <Link
                      to={`/orders/${order.id}`}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Xem chi tiết</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default MyOrdersPage;
