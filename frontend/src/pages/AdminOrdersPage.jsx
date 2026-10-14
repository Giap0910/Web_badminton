import React, { useState, useEffect, useRef } from 'react';
import { formatDate, getOrderStatusLabel, getNextOrderStatuses, isOrderPaid } from '../utils/formatters';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import { orderApi } from '../api/orderApi';
import { normalizeSearch } from '../utils/adminCustomers.jsx';
import OrderItemOptions, { formatOrderItemOptionsText } from '../components/OrderItemOptions';
import ProductImage from '../components/ProductImage';
import { saveAdminFile } from '../components/AdminProductImport';
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
  const [searchQuery, setSearchQuery] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('search') || '');
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false), requestId = useRef(0);

  const fetchOrders = async () => {
    const request = ++requestId.current;
    try {
      if (adminApi?.getOrders) {
        const res = await adminApi.getOrders();
        if (request !== requestId.current) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        if (Array.isArray(list)) {
          const mapped = list.map(normalizeAdminOrder);
          setOrders(mapped);
          setDataError('');
          setSelectedOrder(previous => previous ? mapped.find(order => order.id === previous.id) || null : null);
        }
      }
    } catch (e) {
      if (request === requestId.current) setDataError(e.response?.data?.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const timer = setInterval(() => { if (!actionLock.current && document.visibilityState === 'visible') fetchOrders(); }, 15000);
    return () => { clearInterval(timer); requestId.current++; };
  }, []);

  const formatPrice = (p) => p == null ? 'Chưa có thông tin' :
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true);
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
    } finally { actionLock.current = false; setBusy(false); }
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleReconcileQR = () => { window.location.assign('/admin/payments'); };

  const confirmCash = async order => {
    if (actionLock.current || !window.confirm(`Xác nhận đã nhận đủ ${formatPrice(order.totalAmount)} tiền mặt/COD cho ${order.code}? Chỉ xác nhận khi thực tế đã thu tiền.`)) return;
    actionLock.current = true; setBusy(true);
    try { await adminApi.confirmCash(order.id, order.totalAmount); await fetchOrders(); setToastMessage('Đã ghi nhận thu tiền mặt/COD.'); }
    catch (error) { setToastMessage(error.response?.data?.message || 'Không xác nhận được thu tiền.'); }
    finally { actionLock.current = false; setBusy(false); }
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
      normalizeSearch([o.code, o.customerName, o.customerPhone, ...o.items.map(item => item.productName)].join(' ')).includes(normalizeSearch(searchQuery));

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
              disabled={loading || !!dataError || filteredOrders.length === 0}
              onClick={() => exportAdminOrderSheet(filteredOrders)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất phiếu đơn hàng CSV</span>
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
                          <ProductImage compact
                            src={order.productImage}
                            alt={order.productName}
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
                            {order.isPaid ? 'Đã ghi nhận thanh toán' : 'Chưa xác nhận thu tiền'}
                          </span>
                          {order.rawPaymentMethod === 'COD' && !order.isPaid && ['SHIPPING', 'COMPLETED'].includes(order.status) &&
                            <button disabled={busy} onClick={() => confirmCash(order)} className="mt-2 text-xs underline text-blue-600">Xác nhận đã thu tiền</button>}
                        </div>
                      </td>

                      {/* Cột 5: Đổi trạng thái trực tiếp */}
                      <td className="py-4 px-4 align-top">
                        <select
                          value={order.status}
                          disabled={busy}
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

                {/* Danh sách sản phẩm đầy đủ */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Danh sách sản phẩm ({selectedOrder.items.length} mặt hàng)
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {selectedOrder.items.length === 0 && <p className="text-slate-500">Chưa có thông tin sản phẩm của đơn.</p>}
                    {selectedOrder.items.map((it, itIdx) => {
                      const itemSubtotal = it.subtotal ?? (it.price != null && it.quantity != null ? it.price * it.quantity : null);
                      return (
                        <div key={it.id || itIdx} className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <ProductImage compact
                                src={it.productImageUrl}
                                alt={it.productName || 'Sản phẩm'}
                                className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0 p-1"
                              />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{it.productName || it.product?.name || 'Sản phẩm'}</p>
                              <OrderItemOptions item={it} />
                              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Số lượng: x{it.quantity ?? '—'}</p>
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
                  onClick={() => exportAdminOrderSheet([selectedOrder])}
                  className="px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm"
                >
                  Xuất phiếu đơn hàng CSV
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

export function normalizeAdminOrder(item) {
  const items = Array.isArray(item.items) ? item.items : Array.isArray(item.orderItems) ? item.orderItems : [];
  const first = items[0];
  const checked = { ...item, cashCollected: item.cashCollected ?? false };
  return {
    id: item.id, code: item.id != null ? `#HG-${item.id}` : 'Chưa có mã đơn', createdAt: formatDate(item.createdAt),
    customerName: item.customerName || item.shippingName || 'Chưa có thông tin',
    customerPhone: item.shippingPhone || 'Chưa có thông tin', customerAddress: item.shippingAddress || 'Chưa có thông tin',
    productName: first?.productName || first?.product?.name || 'Chưa có thông tin sản phẩm',
    productImage: first?.productImageUrl || first?.product?.imageUrl || null,
    stringReq: formatOrderItemOptionsText(first), items, totalAmount: item.totalAmount ?? null,
    rawPaymentMethod: item.paymentMethod, paymentMethod: { PAYOS_VIETQR: 'VietQR Pro', COD: 'COD' }[item.paymentMethod] || 'Chưa có thông tin',
    paymentRef: item.paymentReference || item.reference || '—', isPaid: item.paymentMethod === 'COD'
      ? checked.cashCollected === true : item.paymentMethod === 'PAYOS_VIETQR' && isOrderPaid(checked),
    cashCollected: checked.cashCollected, cashCollectedAt: item.cashCollectedAt,
    nextStatuses: getNextOrderStatuses(checked), status: item.status || 'UNKNOWN', statusLabel: getOrderStatusLabel(checked),
  };
}

export function exportAdminOrderSheet(orders) {
  const headers = ['Mã đơn', 'Ngày tạo', 'Người nhận', 'Số điện thoại', 'Địa chỉ', 'Phương thức', 'Trạng thái đơn',
    'Xác nhận thanh toán', 'Tổng tiền đơn (không cộng lặp)', 'Tham chiếu thanh toán', 'SKU', 'Sản phẩm',
    'Kích cỡ', 'Màu sắc', 'Trọng lượng/cán', 'Dịch vụ cước', 'Mức căng', 'Số lượng', 'Đơn giá', 'Tiền dòng'];
  const rows = orders.flatMap(order => (order.items.length ? order.items : [null]).map(item => orderSheetRow(order, item)));
  const csv = '\ufeff' + [headers, ...rows].map(row => row.map(orderSheetCell).join(',')).join('\r\n');
  saveAdminFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'phieu-don-hang.csv');
}

function orderSheetRow(order, item) {
  return [order.code, order.createdAt, order.customerName, order.customerPhone, order.customerAddress,
    order.rawPaymentMethod, order.statusLabel, order.isPaid ? 'Đã ghi nhận thanh toán' : 'Chưa xác nhận thu tiền',
    order.totalAmount, order.paymentRef, item?.productSku, item?.productName, item?.selectedSize, item?.selectedColor,
    item?.selectedWeight || item?.weightGrip, item?.stringingService, item?.stringTension, item?.quantity,
    item?.price, item?.subtotal ?? (item?.price != null && item?.quantity != null ? item.price * item.quantity : null)];
}

function orderSheetCell(value) {
  let text = String(value ?? '');
  if (!(typeof value === 'number') && /^[=+@-]/.test(text.trimStart())) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
