import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
import { orderApi } from '../api/orderApi';
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

const MOCK_ORDERS = [
  {
    id: 1,
    orderCode: '#APX-89241',
    createdAt: '14:35 - 24/10/2024',
    paymentMethod: 'VietQR Pro Đã xác nhận',
    productName: 'Vợt Yonex Astrox 100ZZ Kurenai (4U/G5)',
    productImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
    stringDetail: '+ Cước BG80 Power (Căng 11.5kg / 25.5 lbs)',
    giftDetail: 'Kèm 01 Cuốn cán Yonex AC102EX',
    quantitySummary: 'Số lượng: 1 sản phẩm chính (2 quà tặng)',
    totalPrice: 4550000,
    shippingFee: 0,
    status: 'PROCESSING',
    statusLabel: 'Đang xử lý',
    statusSub: 'Kỹ thuật viên đang vào cước',
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0988 123 456',
    shippingAddress: 'Tầng 12, Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. HCM'
  },
  {
    id: 2,
    orderCode: '#APX-88910',
    createdAt: '09:15 - 22/10/2024',
    paymentMethod: 'COD - Thanh toán khi nhận',
    productName: 'Giày Cầu Lông Yonex Power Cushion 65Z3 Men',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
    stringDetail: 'Size 42 EU / 26.5cm (Form bè Wide)',
    giftDetail: 'Tặng 01 đôi vớ thi đấu dệt kim Apex Pro',
    quantitySummary: 'Số lượng: 1 đôi giày',
    totalPrice: 2890000,
    shippingFee: 0,
    status: 'SHIPPING',
    statusLabel: 'Đang giao',
    statusSub: 'Tài xế công nghệ đang giao hỏa tốc 2H',
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0988 123 456',
    shippingAddress: 'Số 182 Lê Duẩn, Phường Nguyễn Du, Quận Hai Bà Trưng, TP. Hà Nội'
  },
  {
    id: 3,
    orderCode: '#APX-87422',
    createdAt: '18:40 - 15/10/2024',
    paymentMethod: 'VNPAY-QR Thành công',
    productName: 'Vợt Victor Thruster Ryuga Metallic (3U/G5)',
    productImage: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=400&q=80',
    stringDetail: '+ Cước Victor VBS-66 Nano (Căng 12.0kg)',
    giftDetail: 'Tặng bao vợt đơn nhung cao cấp',
    quantitySummary: 'Số lượng: 1 sản phẩm chính',
    totalPrice: 4200000,
    shippingFee: 0,
    status: 'DELIVERED',
    statusLabel: 'Đã giao',
    statusSub: 'Ký nhận lúc 11:20 - 17/10/2024',
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0988 123 456',
    shippingAddress: 'Tầng 12, Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh'
  },
  {
    id: 4,
    orderCode: '#APX-86105',
    createdAt: '11:00 - 05/10/2024',
    paymentMethod: 'Chuyển khoản Vietcombank',
    productName: 'Ống Cầu Lông Yonex Aerosensa 50 (12 quả)',
    productImage: 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?auto=format&fit=crop&w=400&q=80',
    stringDetail: 'Tốc độ 77 - Tiêu chuẩn giải đấu quốc tế',
    giftDetail: 'Tích lũy 150 điểm ApexClub',
    quantitySummary: 'Số lượng: 5 ống',
    totalPrice: 2250000,
    shippingFee: 0,
    status: 'DELIVERED',
    statusLabel: 'Đã giao',
    statusSub: 'Ký nhận lúc 15:00 - 06/10/2024',
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0988 123 456',
    shippingAddress: 'Sân số 4, CLB Cầu Lông Kỳ Hòa 2, Sư Vạn Hạnh, Q10, TP. HCM'
  },
  {
    id: 5,
    orderCode: '#APX-85219',
    createdAt: '16:20 - 28/09/2024',
    paymentMethod: 'VietQR - Hết hạn thanh toán',
    productName: 'Balo Cầu Lông Yonex Pro Tournament Bag',
    productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    stringDetail: 'Màu Fine Blue (Chứa 3-6 cây vợt + ngăn để giày riêng)',
    giftDetail: 'Hủy đơn do người dùng đổi nhu cầu',
    quantitySummary: 'Số lượng: 1 balo',
    totalPrice: 1650000,
    shippingFee: 30000,
    status: 'CANCELLED',
    statusLabel: 'Đã hủy',
    statusSub: 'Hủy theo yêu cầu khách hàng',
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0988 123 456',
    shippingAddress: 'Số 182 Lê Duẩn, Hai Bà Trưng, Hà Nội'
  }
];

const MyOrdersPage = () => {
  const [orders, setOrders] = useState(MOCK_ORDERS);
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
        if (list.length > 0) {
          // Merge API fields with design-specific fields
          const formatted = list.map((item, idx) => {
            const firstItem = item.items?.[0] || item.orderItems?.[0];
            const techString = firstItem?.stringingService
              ? `${firstItem.stringingService}${firstItem.stringTension ? ` (Căng ${firstItem.stringTension})` : ''}`
              : firstItem?.selectedWeight
              ? `Phiên bản: ${firstItem.selectedWeight}`
              : item.stringOption || 'Kỹ thuật viên đan tiêu chuẩn BWF';

            return {
              id: item.id || idx + 1,
              orderCode: item.payosOrderCode ? `#APX-${item.payosOrderCode}` : item.orderNumber ? `#${item.orderNumber}` : `#APX-${item.id || 89000 + idx}`,
              createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '14:35 - 24/10/2024',
              paymentMethod: item.paymentMethod?.includes('PAYOS') ? 'VietQR Pro Chuyển khoản' : 'COD Đồng kiểm',
              productName: firstItem?.productName || firstItem?.product?.name || item.productName || 'Vợt Cầu Lông Apex',
              productImage: firstItem?.productImageUrl || firstItem?.product?.imageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
              stringDetail: techString,
              giftDetail: 'Kèm 01 Cuốn cán Yonex AC102EX',
              quantitySummary: `Số lượng: ${item.items?.length || item.orderItems?.length || 1} sản phẩm`,
              totalPrice: item.totalAmount || item.totalPrice || 0,
              shippingFee: item.shippingFee || 0,
              status: item.status || 'PROCESSING',
              statusLabel: item.status === 'CANCELLED' ? 'Đã hủy' : item.status === 'PAID' ? 'Đã thanh toán' : item.status === 'PENDING' ? 'Chờ thanh toán VietQR' : item.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đang xử lý',
              statusSub: item.status === 'PAID' ? 'Kỹ thuật viên đang vào cước' : item.status === 'PENDING' ? 'Vui lòng quét VietQR thanh toán' : item.status === 'COMPLETED' ? 'Đã giao thành công' : item.status === 'CANCELLED' ? 'Đơn hàng đã được hoàn kho' : 'Hệ thống đã tiếp nhận',
              receiverName: item.customerName || item.shippingName || 'Khách hàng Apex',
              receiverPhone: item.shippingPhone || '',
              shippingAddress: item.shippingAddress || ''
            };
          });
          setOrders(formatted);
        }
      } catch (err) {
        console.warn('API orders fallback to mock orders:', err);
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
      console.warn('Cancel order via API fallback to local state:', e);
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
    { key: 'PROCESSING', label: 'Đang xử lý', count: orders.filter((o) => o.status === 'PROCESSING' || o.status === 'PENDING').length },
    { key: 'SHIPPING', label: 'Đang giao', count: orders.filter((o) => o.status === 'SHIPPING' || o.status === 'CONFIRMED').length },
    { key: 'DELIVERED', label: 'Đã giao', count: orders.filter((o) => o.status === 'DELIVERED' || o.status === 'PAID').length },
    { key: 'CANCELLED', label: 'Đã hủy', count: orders.filter((o) => o.status === 'CANCELLED').length },
  ];

  const filteredOrders = orders.filter((order) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'PROCESSING'
        ? order.status === 'PROCESSING' || order.status === 'PENDING'
        : activeTab === 'SHIPPING'
        ? order.status === 'SHIPPING' || order.status === 'CONFIRMED'
        : activeTab === 'DELIVERED'
        ? order.status === 'DELIVERED' || order.status === 'PAID'
        : order.status === 'CANCELLED';

    const matchesSearch =
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <UserLayout currentPage="Lịch sử đơn hàng" counts={{ orders: orders.length }}>
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
                onClick={() => alert('Hệ thống đang trích xuất hóa đơn GTGT điện tử (e-Invoice) của các đơn hàng...')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Xuất hóa đơn điện tử</span>
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
                  placeholder="Tìm theo mã đơn (#APX-...) hoặc tên vợt, giày..."
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
                    const isProcessing = order.status === 'PROCESSING' || order.status === 'PENDING';
                    const isShipping = order.status === 'SHIPPING' || order.status === 'CONFIRMED';
                    const isDelivered = order.status === 'DELIVERED' || order.status === 'PAID';
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
                              <img
                                src={order.productImage}
                                alt={order.productName}
                                className="w-full h-full object-cover rounded-lg"
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
                          {isProcessing && (
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

                            {isProcessing && (
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

                {/* Thông tin sản phẩm */}
                <div className="border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <img
                    src={selectedOrder.productImage}
                    alt={selectedOrder.productName}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="font-bold text-slate-900 text-sm">{selectedOrder.productName}</span>
                    <span className="text-slate-600 mt-0.5">{selectedOrder.stringDetail}</span>
                    <span className="text-secondary font-bold mt-0.5">{selectedOrder.giftDetail}</span>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-slate-400">{selectedOrder.paymentMethod}</span>
                      <span className="font-black text-secondary text-sm">{formatPrice(selectedOrder.totalPrice)}</span>
                    </div>
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
                {selectedOrder.status === 'DELIVERED' && (
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
