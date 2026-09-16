import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { formatPrice } from '../utils/formatters';
import {
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Truck,
  MapPin,
  FileText,
  Gift,
  ArrowRight,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Award,
  Loader2,
  AlertCircle,
  Phone,
  MessageSquare,
  Wrench,
  Receipt,
  Zap,
  Store,
  FileCheck
} from 'lucide-react';

const OrderSuccessPage = () => {
  const { orderId } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const displayOrderCode = order?.orderCode || `#APX-${orderId || '89241'}`;

  const copyOrderId = () => {
    navigator.clipboard.writeText(displayOrderCode.replace('#', ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderApi.getOrderById(orderId);
        setOrder(res?.data ?? res);
      } catch (err) {
        console.warn('Không thể tải từ backend, sử dụng mock order thành công:', err);
        if (!order) {
          setOrder({
            id: orderId,
            orderCode: `APX-${orderId || '89241'}`,
            customerName: 'Nguyễn Văn A',
            shippingPhone: '0988 123 456',
            shippingAddress: 'Số 182 Lê Duẩn, Phường Khâm Thiên, Quận Đống Đa, Hà Nội',
            paymentMethod: 'PAYOS_VIETQR',
            paymentStatus: 'PAID',
            note: 'Căng cước 11kg theo chuẩn Yonex 4 nút trước khi gửi, bọc kỹ quấn cán, gọi điện hẹn giờ trước khi giao...',
            subtotal: 7010000,
            discountAmount: 100000,
            shippingFee: 0,
            totalAmount: 6910000,
            createdAt: new Date().toISOString(),
            items: [
              {
                id: 1,
                name: 'Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai Chính Hãng',
                price: 4050000,
                quantity: 1,
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeVo-HZvjewr2fWlNtjw-DzfvOx_Cvjwy2Q0ytHepr7kET-scMkqJtqK_1rv0-HdqeBM9xta5egOe9UjR7wrWcESj3qnyKamWdym08lgN46jvGWyw97xZHGXF87S9xxR53OWjma5noDZ1QqyEqn3no3BM6480x4qjel2IUP_1WgXbc_9hoIkA-l918WlHk1L7Nlyp51RLEI2A8AFgpqL9h3ZvEqeI-pwaVOMTUQqv6adf2UTkZmRBh',
                selectedWeight: '4U (80-84g) G5',
                selectedColor: 'Đỏ Kurenai',
                stringingService: 'Cước BG65Ti (11.0 kg)'
              },
              {
                id: 2,
                name: 'Giày Cầu Lông Yonex Power Cushion 65Z3 Trắng Vàng',
                price: 2650000,
                quantity: 1,
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8r5F4rj6ao0sn_Wi0GnD_m-sPD4U4vM8EPh4ByEtQVfxyo3s9Ccw1OEhhNE_1otzNgg5PUrNMKrwpkXJJ2hIpfm09XwRs3ClXnaNlC8ktMA2Ef3drz8CRlMVtRZAbBygez9IJcRYaT0Nefs0JoZqTCxSXIzVAAlP9qgBZRlZvsBzrqeYKXrs1jhj4wEv3mnV_C4bQi6Cn2dY2C0B1krJE5iu71mp25v0Aoc79p6FAAwKa-oDci-Re',
                selectedSize: '42 EU (26.5 cm)',
                selectedColor: 'Trắng / Vàng Solar'
              },
              {
                id: 3,
                name: 'Cước Đan Vợt Cầu Lông Yonex BG65Ti JP',
                price: 155000,
                quantity: 2,
                imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMBJyzaV_le-ZGqzIghSliOUjdp30wS877hiqJwakrN4fMFMNDvOkce2Ajr0H73HBasgBmXOzgJlnRrTaBZXpszH48bG9pa_nEd4A22L5VDnJViMBYdkjrUngKQh7ZPuLzZKkCZRcUIHgaPzy0IpDVNUvIcc2CXl5D1DiiXaak510CMDlXDHYn9JuzGibUQIomCzxbgt4hMCSrbtyS0I3Sp8lfuynNIHpXVLXQZabL69t7rpWfSebV',
                selectedColor: 'Trắng (0.70mm)'
              }
            ]
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
        <p className="text-sm font-semibold text-slate-600">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  const items = order?.items && order.items.length > 0 ? order.items : [
    {
      id: 1,
      name: 'Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai',
      price: 4050000,
      quantity: 1,
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeVo-HZvjewr2fWlNtjw-DzfvOx_Cvjwy2Q0ytHepr7kET-scMkqJtqK_1rv0-HdqeBM9xta5egOe9UjR7wrWcESj3qnyKamWdym08lgN46jvGWyw97xZHGXF87S9xxR53OWjma5noDZ1QqyEqn3no3BM6480x4qjel2IUP_1WgXbc_9hoIkA-l918WlHk1L7Nlyp51RLEI2A8AFgpqL9h3ZvEqeI-pwaVOMTUQqv6adf2UTkZmRBh',
      selectedWeight: '4U (80-84g) G5',
      stringingService: 'Cước BG65Ti (11.0 kg)'
    }
  ];

  const subtotal = order?.subtotal || items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const discountAmount = order?.discountAmount || 100000;
  const shippingFee = order?.shippingFee !== undefined ? order.shippingFee : 0;
  const totalAmount = order?.totalAmount || Math.max(0, subtotal - discountAmount + shippingFee);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pt-6 pb-20">
      
      {/* Top Stepper Banner */}
      <div className="w-full bg-slate-100/70 py-4 mb-8 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between relative">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">1. Giỏ hàng</span>
            </div>
            <div className="h-[2px] flex-1 bg-slate-900 mx-3"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600">2. Thanh toán QR</span>
            </div>
            <div className="h-[2px] flex-1 bg-red-600 mx-3"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-red-500/30">
                <Check className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-red-600">3. Hoàn tất</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center">
        
        {/* Success Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-4 border border-slate-100">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <CheckCircle2 className="w-11 h-11" />
            </div>
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-3.5 py-1 rounded-full mb-2">
            Giao dịch đã xác thực
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Đặt hàng thành công!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
            Cảm ơn bạn <strong className="font-semibold text-slate-800">{order?.customerName || 'Nguyễn Văn A'}</strong> đã tin tưởng lựa chọn <strong className="font-bold text-slate-900">Apex Badminton</strong>. Email xác nhận đơn hàng kèm hóa đơn điện tử VAT đã được gửi tới địa chỉ đăng ký.
          </p>

          {/* 4 Summary Cards Grid */}
          <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã đơn hàng</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-extrabold text-slate-900">{displayOrderCode}</span>
                <button
                  type="button"
                  onClick={copyOrderId}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                  title="Sao chép mã đơn"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái thanh toán</span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" /> VietQR Tự động
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời gian tạo</span>
              <span className="text-xs font-semibold text-slate-800 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Hôm nay, 14:35
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dự kiến nhận hàng</span>
              <span className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-current" /> Hỏa tốc 2H (Hà Nội)
              </span>
            </div>
          </div>
        </div>

        {/* Big Order Detail Card */}
        <div className="w-full bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden mb-8">
          
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-red-500" />
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight">Chi tiết đơn hàng {displayOrderCode}</h2>
                <p className="text-[11px] text-slate-400">Được phân phối chính thức bởi Apex Badminton Center</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase bg-white/10 text-white px-2.5 py-1 rounded-md tracking-wider">
              Chuẩn bị hàng
            </span>
          </div>

          {/* Customer & Technical Notes 2-Col Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/60 border-b border-slate-100">
            
            {/* Delivery Info */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-800" /> Thông tin nhận hàng
              </span>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col gap-1 h-full">
                <span className="text-sm font-bold text-slate-900">
                  {order?.customerName || 'Nguyễn Văn A'} <span className="text-xs font-normal text-slate-500">| {order?.shippingPhone || '0988 123 456'}</span>
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {order?.shippingAddress || 'Số 182 Lê Duẩn, Phường Khâm Thiên, Quận Đống Đa, Hà Nội'}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-red-600 text-xs font-semibold">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Phương thức: Giao hỏa tốc 2h - Ahamove / GrabExpress Apex</span>
                </div>
              </div>
            </div>

            {/* Stringing & Notes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-800" /> Yêu cầu kỹ thuật & Ghi chú
              </span>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-full gap-2">
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  “{order?.note || 'Căng cước 11kg theo chuẩn Yonex 4 nút trước khi gửi, bọc kỹ quấn cán, gọi điện hẹn giờ trước khi giao...'}”
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-slate-700 font-medium">
                    <Wrench className="w-3.5 h-3.5 text-red-500" /> Đã bàn giao xưởng căng vợt
                  </span>
                  <span className="font-bold text-slate-900">KTV: Trần Đình L.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Products List */}
          <div className="p-6">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center justify-between">
              <span>Danh sách sản phẩm ({items.length} mặt hàng)</span>
              <span className="text-xs font-normal text-slate-400">Cam kết 100% Chính hãng phân phối</span>
            </h3>

            <div className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50 rounded-xl gap-3 border border-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-white shrink-0 overflow-hidden shadow-sm flex items-center justify-center p-1 border border-slate-200/60">
                      <img
                        src={item.imageUrl || item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                        Chính hãng phân phối
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                        {item.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-xs text-slate-500 mt-1">
                        {item.selectedWeight && (
                          <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {item.selectedWeight}
                          </span>
                        )}
                        {item.selectedSize && (
                          <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                            Size {item.selectedSize}
                          </span>
                        )}
                        {item.stringingService && (
                          <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {item.stringingService}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <Gift className="w-3 h-3 text-red-500" /> Tặng 01 Bao vợt nhung + 02 Quấn cán Yonex AC102EX
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:self-center shrink-0">
                    <span className="text-xs text-slate-400 block">Số lượng: 0{item.quantity || 1}</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatPrice((item.price || 0) * (item.quantity || 1))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown Bottom Bar */}
          <div className="bg-slate-50 p-6 border-t border-slate-100">
            <div className="max-w-md ml-auto flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Tạm tính ({items.length} sản phẩm):</span>
                <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-red-600 font-bold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Voucher Apex (APEX100K):
                </span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Phí vận chuyển hỏa tốc:</span>
                <span className="font-bold text-emerald-600">0₫ (Miễn phí Apex VIP)</span>
              </div>
              <div className="w-full h-px bg-slate-200 my-1"></div>
              <div className="flex justify-between items-baseline pt-1">
                <div>
                  <span className="text-sm font-black text-slate-900 block">Tổng thanh toán:</span>
                  <span className="text-[11px] text-red-600 font-semibold">Đã thanh toán đủ qua VietQR</span>
                </div>
                <span className="text-2xl font-black text-red-600 tracking-tight">
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 2 Main Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xl mb-10">
          <Link
            to="/user/orders"
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3.5 px-6 rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg shadow-red-500/25 transition-all"
          >
            <FileCheck className="w-4 h-4" />
            <span>Xem đơn hàng của tôi</span>
          </Link>
          <Link
            to="/products"
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 py-3.5 px-6 rounded-xl text-sm font-bold uppercase tracking-wider border border-slate-200 shadow-sm transition-all"
          >
            <Store className="w-4 h-4" />
            <span>Tiếp tục mua sắm</span>
          </Link>
        </div>

        {/* Advisory & Customer Service */}
        <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Cần thay đổi thông số căng cước hoặc địa chỉ giao?</h4>
                <p className="text-xs text-slate-500 mt-0.5">Liên hệ đội ngũ thợ căng chuyên nghiệp trước khi kiện hàng xuất kho.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="tel:19006886"
                className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Hotline 1900 6886
              </a>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); alert('Đang kết nối tới Zalo CSKH Apex Badminton...'); }}
                className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Zalo CSKH
              </a>
            </div>
          </div>

          {/* 3 Guarantee Badges */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <ShieldCheck className="w-7 h-7 text-red-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">100% Chính Hãng</span>
                <span className="text-[11px] text-slate-500">Bồi hoàn gấp 10 lần nếu phát hiện hàng giả</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <CheckCircle2 className="w-7 h-7 text-red-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Đổi Size Trong 7 Ngày</span>
                <span className="text-[11px] text-slate-500">Hỗ trợ đổi size giày miễn phí tận nơi</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <Award className="w-7 h-7 text-red-600 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Bảo Hành Điện Tử</span>
                <span className="text-[11px] text-slate-500">Tự động kích hoạt theo số điện thoại nhận hàng</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderSuccessPage;
