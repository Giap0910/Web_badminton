import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, getOrderStatusLabel } from '../utils/formatters';
import UserLayout from '../components/UserLayout';
import ProductImage from '../components/ProductImage';
import { orderApi } from '../api/orderApi';
import OrderItemOptions, { formatOrderItemOptionsText } from '../components/OrderItemOptions';
import {
  Search,
  Download,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Star,
  Eye,
  Loader2,
  X,
  Calendar,
  AlertCircle,
  PackageCheck
} from 'lucide-react';

export function normalizeUserOrder(item) {
  const items = Array.isArray(item.items) ? item.items : Array.isArray(item.orderItems) ? item.orderItems : [];
  const first = items[0];
  const quantity = items.reduce((sum, line) => sum + (Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : 0), 0);
  return { id: item.id, orderCode: item.payosOrderCode ? `#HG-${item.payosOrderCode}` : item.orderNumber ? `#${item.orderNumber}` : `#HG-${item.id}`,
    createdAt: formatDate(item.createdAt), paymentMethod: item.paymentMethod === 'PAYOS_VIETQR' ? 'PayOS / VietQR'
      : item.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chưa xác định',
    productName: first?.productName || first?.product?.name || 'Xem sản phẩm trong chi tiết đơn hàng',
    productImage: first?.productImageUrl || first?.product?.imageUrl || null,
    stringDetail: formatOrderItemOptionsText(first, ''), items, quantity, quantitySummary: `Số lượng: ${quantity} sản phẩm`,
    totalPrice: item.totalAmount ?? item.totalPrice ?? 0, shippingFee: item.shippingFee ?? 0,
    status: item.status || 'UNKNOWN', statusLabel: getOrderStatusLabel(item), statusSub: getOrderStatusLabel(item),
    receiverName: item.customerName || item.shippingName || '', receiverPhone: item.shippingPhone || '', shippingAddress: item.shippingAddress || '' };
}

export function userOrderSlipCsv(orders) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const header = ['Mã đơn', 'Thời gian', 'Người nhận', 'Điện thoại', 'Địa chỉ', 'Sản phẩm và số lượng', 'Tổng số lượng', 'Phí vận chuyển (đồng)', 'Tổng đơn (đồng)', 'Phương thức', 'Trạng thái'];
  const rows = orders.map(order => [order.orderCode, order.createdAt, order.receiverName, order.receiverPhone,
    order.shippingAddress, order.items.map(item => `${item.productName || 'Sản phẩm'} × ${item.quantity}; ${formatOrderItemOptionsText(item, '')}`).join('\n'),
    order.quantity, order.shippingFee, order.totalPrice, order.paymentMethod, order.statusLabel]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
}

function downloadUserOrderSlips(orders) {
  const url = URL.createObjectURL(new Blob([userOrderSlipCsv(orders)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'phieu-don-hang-HG.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MyOrdersPage = () => {
  const [dataError, setDataError] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await orderApi.getMyOrders();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (Array.isArray(list)) {
          setOrders(list.map(normalizeUserOrder));
        }
      } catch (err) {
        setDataError(err.response?.data?.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Số lượng tồn kho sẽ được hoàn trả ngay lập tức.')) return;
    try {
      await orderApi.cancelOrder(orderId);
    } catch (e) {
      alert(e.response?.data?.message || 'Không thể hủy đơn hàng.');
      return;
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'CANCELLED',
              statusLabel: 'Đã hủy',
              statusSub: 'Hủy theo yêu cầu khách hàng'
            }
          : o
      )
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả', count: orders.length },
    { key: 'PROCESSING', label: 'Đang xử lý', count: orders.filter((o) => o.status === 'PAID' || o.status === 'PENDING').length },
    { key: 'SHIPPING', label: 'Đang giao', count: orders.filter((o) => o.status === 'SHIPPING').length },
    { key: 'DELIVERED', label: 'Đã giao', count: orders.filter((o) => o.status === 'COMPLETED').length },
    { key: 'CANCELLED', label: 'Đã hủy', count: orders.filter((o) => o.status === 'CANCELLED').length },
  ];

  const filteredOrders = orders.filter((order) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PROCESSING'
        ? order.status === 'PAID' || order.status === 'PENDING'
        : activeTab === 'SHIPPING'
        ? order.status === 'SHIPPING'
        : activeTab === 'DELIVERED'
        ? order.status === 'COMPLETED'
        : order.status === 'CANCELLED';

    const matchesSearch =
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <UserLayout currentPage="Lịch sử đơn hàng" counts={{ orders: orders.length }}>
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
      <div className="flex flex-col gap-6">
        {/* MAIN ORDER HISTORY CONTAINER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          {/* SECTION HEADER & CONTROLS */}
          <div className="p-6 md:p-8 bg-white flex flex-col gap-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-900">Lịch sử đơn hàng</h2>
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                  {orders.length} đơn hàng
                </span>
              </div>
              <button
                type="button"
                disabled={loading || Boolean(dataError) || orders.length === 0}
                onClick={() => downloadUserOrderSlips(filteredOrders)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Xuất phiếu đơn hàng (CSV)</span>
              </button>
            </div>

            {/* SEARCH & FILTER ROW */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-1">
              {/* SEARCH BOX */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo mã đơn (#HG-...) hoặc tên vợt, giày..."
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                />
              </div>

              {/* STATUS PILLS / TABS */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-[#131b2e] text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ORDERS TABLE VIEW */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6 font-bold">Mã đơn & Thời gian</th>
                  <th className="py-3.5 px-4 font-bold">Sản phẩm & Chi tiết căng cước</th>
                  <th className="py-3.5 px-4 font-bold">Tổng thanh toán</th>
                  <th className="py-3.5 px-4 font-bold">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isProcessing = order.status === 'PAID' || order.status === 'PENDING';
                    const isShipping = order.status === 'SHIPPING';
                    const isDelivered = order.status === 'COMPLETED';
                    const isCancelled = order.status === 'CANCELLED';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Cột 1: Mã đơn & thời gian */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 text-sm">{order.orderCode}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(order.orderCode)}
                                className="text-slate-400 hover:text-slate-700 transition-colors"
                                title="Sao chép mã đơn"
                              >
                                {copiedCode === order.orderCode ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {order.createdAt}
                            </span>
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-fit mt-1 font-bold">
                              {order.paymentMethod}
                            </span>
                          </div>
                        </td>

                        {/* Cột 2: Sản phẩm & chi tiết đan cước */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center p-1 shrink-0 overflow-hidden border border-slate-200">
                              <ProductImage compact
                                src={order.productImage}
                                alt={order.productName}
                                className="w-full h-full rounded-lg"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs line-clamp-1">
                                {order.productName}
                              </span>
                              <span className="text-[11px] text-slate-600 font-medium mt-0.5">
                                {order.stringDetail}
                              </span>
                              <span className="text-[10px] text-secondary font-bold mt-0.5">
                                {order.giftDetail}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {order.quantitySummary}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Tổng thanh toán */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex flex-col">
                            <span className="font-black text-secondary text-sm">
                              {formatPrice(order.totalPrice)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {order.shippingFee === 0 ? 'Miễn phí vận chuyển' : `Phí ship: ${formatPrice(order.shippingFee)}`}
                            </span>
                          </div>
                        </td>

                        {/* Cột 4: Trạng thái */}
                        <td className="py-4 px-4 align-top">
                          {order.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-[11px] shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                              {order.statusLabel}
                            </span>
                          )}
                          {isShipping && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] shadow-sm">
                              <Truck className="w-3.5 h-3.5 text-amber-600" />
                              {order.statusLabel}
                            </span>
                          )}
                          {isDelivered && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {order.statusLabel}
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px]">
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              {order.statusLabel}
                            </span>
                          )}
                          <span className="block text-[11px] text-slate-500 mt-1 leading-tight">
                            {order.statusSub}
                          </span>
                        </td>

                        {/* Cột 5: Thao tác */}
                        <td className="py-4 px-6 align-top text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="px-3 py-1.5 rounded-xl bg-[#131b2e] text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                              Xem chi tiết
                            </button>

                            {order.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order.id)}
                                className="text-[11px] text-slate-400 hover:text-secondary transition-colors underline"
                              >
                                Hủy đơn hàng
                              </button>
                            )}

                            {isDelivered && (
                              <Link
                                to={`/returns?orderId=${order.id}`}
                                className="text-[11px] text-blue-600 hover:underline transition-colors font-medium flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Đổi trả / Bảo hành
                              </Link>
                            )}

                            {isCancelled && (
                              <Link
                                to="/products"
                                className="text-[11px] text-slate-500 hover:text-slate-800 transition-colors underline"
                              >
                                Mua lại
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAIL MODAL */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-secondary flex items-center justify-center">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Chi tiết đơn hàng {selectedOrder.orderCode}</h3>
                    <p className="text-xs text-slate-400">{selectedOrder.createdAt}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4 text-xs">
                {/* Thông tin nhận hàng */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Địa chỉ giao hàng</span>
                  <p className="font-bold text-slate-900">{selectedOrder.receiverName} - {selectedOrder.receiverPhone}</p>
                  <p className="text-slate-600 leading-relaxed">{selectedOrder.shippingAddress}</p>
                </div>

                {/* Thông tin danh sách sản phẩm */}
                <div className="border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                    Sản phẩm trong đơn ({selectedOrder.quantity} sản phẩm)
                  </span>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {(selectedOrder.items || []).map((it, itIdx) => {
                      const itemSubtotal = it.subtotal != null ? it.subtotal : (it.price ? it.price * (it.quantity || 1) : 0);
                      return (
                        <div key={it.id || itIdx} className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 min-w-0">
                              <ProductImage compact
                                src={it.productImageUrl}
                                alt={it.productName || 'Sản phẩm'}
                                className="w-12 h-12 rounded-lg bg-white border border-slate-100 shrink-0 p-1"
                              />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{it.productName || it.product?.name || 'Sản phẩm'}</p>
                              <OrderItemOptions item={it} />
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Số lượng: x{it.quantity || 1}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-900">{formatPrice(itemSubtotal)}</span>
                            {it.quantity > 1 && it.price && (
                              <span className="block text-[10px] text-slate-400">{formatPrice(it.price)} / cái</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">{selectedOrder.paymentMethod}</span>
                    <span className="font-black text-secondary text-base">{formatPrice(selectedOrder.totalPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Đóng
                </button>
                {selectedOrder.status === 'COMPLETED' && (
                  <Link
                    to={`/returns?orderId=${selectedOrder.id}`}
                    className="px-5 py-2 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm"
                  >
                    Tạo yêu cầu bảo hành
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default MyOrdersPage;
