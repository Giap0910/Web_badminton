import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { Package, Clock, CheckCircle2, XCircle, ArrowRight, ExternalLink } from 'lucide-react';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderApi.getMyOrders();
        setOrders(data);
      } catch (err) {
        console.error('Lỗi khi tải danh sách đơn hàng:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Chờ thanh toán</span>
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Đã thanh toán</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500">Đang tải lịch sử đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Lịch Sử Đơn Hàng Của Bạn
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi trạng thái thanh toán VietQR, khóa kho và hành trình giao hàng
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Bạn chưa có đơn hàng nào</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy lựa chọn những cây vợt cầu lông yêu thích và trải nghiệm cơ chế mua sắm thông minh của shop!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
          >
            <span>Mua Sắm Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <strong className="text-sm font-black text-slate-900">
                    Đơn hàng #{order.id}
                  </strong>
                  {getStatusBadge(order.status)}
                </div>
                <div className="text-xs text-slate-500">
                  Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')} • Mã PayOS: #{order.payosOrderCode}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {order.items?.length || 0} sản phẩm • Tổng tiền: <span className="text-emerald-700 text-sm font-black">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/orders/${order.id}`}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Xem Chi Tiết</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
