import React, { useState, useEffect } from 'react';
import { getOrderStatusLabel, getNextOrderStatuses, isOrderPaid } from '../utils/formatters';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import { orderApi } from '../api/orderApi';
import {
  ShoppingBag,
  Search,
  Filter,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  QrCode,
  Printer,
  FileSpreadsheet,
  Copy,
  Eye,
  X,
  ChevronDown,
  AlertCircle
} from 'lucide-react';


const AdminOrdersPage = () => {
  const [dataError, setDataError] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchOrders = async () => {
    try {
      if (adminApi?.getOrders) {
        const res = await adminApi.getOrders();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (Array.isArray(list)) {
          const mapped = list.map((item, idx) => {
            const firstItem = item.items?.[0] || item.orderItems?.[0];
            const techStr = firstItem?.stringingService
              ? `${firstItem.stringingService}${firstItem.stringTension ? ` (${firstItem.stringTension})` : ''}`
              : firstItem?.selectedWeight
              ? `Phiên bản: ${firstItem.selectedWeight}`
              : item.stringOption || 'Kỹ thuật viên vào cước BWF';

            const statusLabel = getOrderStatusLabel(item);

            return {
              id: item.id || idx + 1,
              code: item.payosOrderCode ? `#HG-${item.payosOrderCode}` : item.orderNumber ? `#${item.orderNumber}` : `#HG-${item.id || 89000 + idx}`,
              createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '24/10/2024',
              customerName: item.customerName || item.shippingName || 'Khách hàng HG',
              customerPhone: item.shippingPhone || '0988 123 456',
              customerAddress: item.shippingAddress || 'TP. Hồ Chí Minh',
              productName: firstItem?.productName || firstItem?.product?.name || 'Vợt Cầu Lông HG',
              productImage: firstItem?.productImageUrl || firstItem?.product?.imageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
              stringReq: techStr,
              gift: 'Cuốn cán Yonex chính hãng',
              totalAmount: item.totalAmount || 0,
              rawPaymentMethod: item.paymentMethod,
              nextStatuses: getNextOrderStatuses(item),
              paymentMethod: item.paymentMethod?.includes('PAYOS') ? 'VietQR Pro' : 'COD',
              paymentRef: item.payosOrderCode ? `PAYOS-${item.payosOrderCode}` : `REF-${item.id || 999}`,
              isPaid: isOrderPaid(item),
              status: item.status || 'PENDING',
              statusLabel: statusLabel
            };
          });
          setOrders(mapped);
        }
      }
    } catch (e) {
      setDataError(e.response?.data?.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    let label = 'Đang xử lý';
    if (newStatus === 'STRINGING') label = 'Đang vào cước';
    if (newStatus === 'SHIPPING') label = 'Đang giao hỏa tốc';
    if (newStatus === 'COMPLETED') label = 'Đã hoàn tất';
    if (newStatus === 'CANCELLED') label = 'Đã hủy';
    if (newStatus === 'PAID') label = 'Đã thanh toán';

    try {
      const response = await adminApi.updateOrderStatus(orderId, newStatus);
      const updated = response?.data ?? response;
      if (!updated?.id) throw new Error('Máy chủ chưa xác nhận trạng thái đơn');
      await fetchOrders();
      setSelectedOrder(null);
      setToastMessage(`Đã cập nhật trạng thái đơn sang: "${label}"`);
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng.');
    }
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleReconcileQR = () => {
    setToastMessage('Chức năng đối soát PayOS chưa được tích hợp. Chưa có kết quả xác minh.');
    setTimeout(() => setToastMessage(''), 4000);
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PENDING', label: 'Chờ xử lý / thanh toán' },
    { key: 'PAID', label: 'Đã thanh toán' },
    { key: 'SHIPPING', label: 'Đang giao hàng' },
    { key: 'COMPLETED', label: 'Đã hoàn tất' },
    { key: 'CANCELLED', label: 'Đã hủy' }
  ];

  const filteredOrders = orders.filter((o) => {
    const matchesTab = activeTab === 'ALL' ? true : o.status === activeTab;
    const matchesSearch =
      o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <AdminLayout title="Đơn hàng" subtitle="Quản lý đơn hàng & Đối soát VietQR">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
      <div className="flex flex-col gap-6">
        {/* HEADER & ACTION STRIP */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-secondary flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Quản lý đơn hàng
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary text-white text-xs font-black">
                  {orders.length} đơn hàng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Điều phối kỹ thuật xưởng căng cước 4 nút và đối soát giao dịch VietQR tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleReconcileQR}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Đối soát VietQR tự động</span>
            </button>
            <button
              type="button"
              onClick={() => alert('Đang tạo phiếu xuất kho & nhãn vận đơn giao hàng hàng loạt...')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu giao</span>
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* SEARCH & TABS ROW */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn (#HG-...), SĐT, tên khách, vợt..."
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#131b2e] text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ORDERS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Mã đơn & Thời gian</th>
                  <th className="py-3.5 px-4">Khách hàng & Địa chỉ</th>
                  <th className="py-3.5 px-4">Sản phẩm & Cước xưởng</th>
                  <th className="py-3.5 px-4">Tổng tiền & VietQR</th>
                  <th className="py-3.5 px-4">Cập nhật trạng thái</th>
                  <th className="py-3.5 px-6 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cột 1: Mã đơn & Thời gian */}
                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-sm">{order.code}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(order.code)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Sao chép"
                            >
                              {copiedCode === order.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-400">{order.createdAt}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded w-fit font-bold mt-0.5">
                            {order.paymentMethod}
                          </span>
                        </div>
                      </td>

                      {/* Cột 2: Khách hàng */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-bold text-slate-900">{order.customerName}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{order.customerPhone}</span>
                          <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={order.customerAddress}>
                            {order.customerAddress}
                          </span>
                        </div>
                      </td>

                      {/* Cột 3: Sản phẩm & Yêu cầu cước */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-start gap-2.5 max-w-[260px]">
                          <img
                            src={order.productImage}
                            alt=""
                            className="w-11 h-11 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 line-clamp-1">{order.productName}</span>
                            <span className="text-[11px] text-secondary font-semibold leading-tight mt-0.5">
                              {order.stringReq}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{order.gift}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Tổng tiền */}
                      <td className="py-4 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-black text-secondary text-sm">{formatPrice(order.totalAmount)}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {order.paymentRef}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {order.isPaid ? 'Đã ghi nhận thanh toán' : 'Chưa thu tiền'}
                          </span>
                        </div>
                      </td>

                      {/* Cột 5: Đổi trạng thái trực tiếp */}
                      <td className="py-4 px-4 align-top">
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer outline-none transition-colors"
                        >
                          <option value={order.status}>{order.statusLabel}</option>
                          {order.nextStatuses.map((status) => (
                            <option key={status} value={status}>
                              {getOrderStatusLabel({ status, paymentMethod: order.rawPaymentMethod })}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="py-4 px-6 align-top text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-xs"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL CHI TIẾT ĐƠN HÀNG */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Chi tiết đơn hàng {selectedOrder.code}</h3>
                  <p className="text-xs text-slate-400">Thời gian tạo: {selectedOrder.createdAt}</p>
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
                {/* Khách hàng */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Người nhận hàng</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedOrder.customerName} - {selectedOrder.customerPhone}</p>
                  <p className="text-slate-600 leading-relaxed mt-0.5">{selectedOrder.customerAddress}</p>
                </div>

                {/* Yêu cầu đan vợt */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-blue-600">Yêu cầu xưởng căng cước BWF</span>
                  <p className="font-bold text-slate-900">{selectedOrder.productName}</p>
                  <p className="text-secondary font-bold text-xs mt-0.5">{selectedOrder.stringReq}</p>
                  <p className="text-slate-500 mt-0.5">{selectedOrder.gift}</p>
                </div>

                {/* Thanh toán VietQR */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Đối soát giao dịch</span>
                    <span className="font-mono text-xs text-slate-800">{selectedOrder.paymentRef} ({selectedOrder.paymentMethod})</span>
                  </div>
                  <span className="font-black text-base text-secondary">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Đã in lệnh chuyển giao xưởng đan vợt đơn ${selectedOrder.code}`)}
                  className="px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm"
                >
                  In lệnh xưởng BWF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOrdersPage;
