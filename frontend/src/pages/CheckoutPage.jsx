import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import { voucherApi } from '../api/voucherApi';
import { shippingAddressApi } from '../api/shippingAddressApi';
import { formatPrice } from '../utils/formatters';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Lock,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  Tag,
  Zap,
  Check,
  Clock,
  Truck,
  ShoppingBag,
  Edit3,
  Gift,
  BadgeCheck,
  Banknote,
  Sparkles
} from 'lucide-react';

const CheckoutPage = () => {
  const { cart, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Selected items from CartPage if any
  const locationState = location.state || {};
  const selectedItemIds = locationState.selectedItemIds || cart.map((i) => i.cartItemId || i.product.id);
  const checkoutItems = cart.filter((i) => selectedItemIds.includes(i.cartItemId || i.product.id));

  // Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Form Fields
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressDetail, setAddressDetail] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [saveInfo, setSaveInfo] = useState(true);

  // Payment Method: 'PAYOS_VIETQR', 'MANUAL_BANK', 'COD'
  const [paymentMethod, setPaymentMethod] = useState('PAYOS_VIETQR');

  // Voucher state
  const [voucherCode, setVoucherCode] = useState(locationState.voucherCode || '');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load saved shipping addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const res = await shippingAddressApi.getMyAddresses();
        const addrs = Array.isArray(res) ? res : res?.data || [];
        setSavedAddresses(addrs);

        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          if (defaultAddr.fullName) setCustomerName(defaultAddr.fullName);
          if (defaultAddr.phone) setShippingPhone(defaultAddr.phone);
          if (defaultAddr.province) setProvince(defaultAddr.province);
          if (defaultAddr.district) setDistrict(defaultAddr.district);
          if (defaultAddr.ward) setWard(defaultAddr.ward);
          if (defaultAddr.address) setAddressDetail(defaultAddr.address);
        }
      } catch (err) {
        // quiet fallback
      }
    };
    fetchAddresses();
  }, []);

  // Financial Calculations
  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.product.price || 0) * item.quantity,
    0
  );
  const isFreeShipping = subtotal >= 1000000;
  const shippingFee = subtotal === 0 || isFreeShipping ? 0 : 30000;
  const voucherKey = JSON.stringify([voucherCode, checkoutItems.map((item) =>
    [item.cartItemId, item.quantity, item.product.price])]);
  const voucherKeyRef = useRef(voucherKey);
  voucherKeyRef.current = voucherKey;
  useEffect(() => {
    setDiscountAmount(0);
    setVoucherSuccess('');
    setVoucherError('');
    setIsValidatingVoucher(false);
  }, [voucherKey]);
  const effectiveDiscount = subtotal > 0 ? Math.min(subtotal, discountAmount) : 0;
  const finalTotal = Math.max(0, subtotal - effectiveDiscount + shippingFee);

  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    const requestKey = voucherKey;
    setDiscountAmount(0);
    setIsValidatingVoucher(true);
    setVoucherError('');
    setVoucherSuccess('');

    try {
      const res = await voucherApi.validateVoucher(voucherCode.trim(), subtotal);
      if (voucherKeyRef.current !== requestKey) return;
      const vData = res?.data ?? res;
      if (vData && vData.valid) {
        setDiscountAmount(vData.discountAmount || 0);
        setVoucherSuccess(`Áp dụng mã ${vData.code} thành công! Giảm ${formatPrice(vData.discountAmount)}`);
      } else {
        setDiscountAmount(0);
        setVoucherError('Mã giảm giá không hợp lệ.');
      }
    } catch (err) {
      if (voucherKeyRef.current !== requestKey) return;
      setDiscountAmount(0);
      setVoucherError(err.response?.data?.message || 'Không thể xác thực mã giảm giá.');
    } finally {
      if (voucherKeyRef.current === requestKey) setIsValidatingVoucher(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (loading || isValidatingVoucher) return;
    if (voucherCode.trim() && !voucherSuccess) {
      setErrorMsg('Vui lòng áp dụng lại mã giảm giá hoặc xóa mã trước khi đặt hàng.');
      return;
    }
    if (!customerName || !shippingPhone || !addressDetail) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng.');
      return;
    }

    if (checkoutItems.length === 0) {
      setErrorMsg('Không có sản phẩm nào được chọn để thanh toán.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const fullShippingAddress = `${addressDetail}, ${ward}, ${district}, ${province}`;
      const payload = {
        customerName,
        shippingAddress: fullShippingAddress,
        shippingPhone,
        paymentMethod,
        voucherCode: voucherCode.trim() || null,
        note: [note, ...checkoutItems.map((item, index) => {
          const extra = [item.options?.gender, item.options?.capacity, item.options?.packaging].filter(Boolean);
          return extra.length ? `Dòng ${index + 1} - ${item.product.name}: ${extra.join(', ')}` : '';
        })].filter(Boolean).join('\n'),
        items: checkoutItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          selectedSize: item.selectedSize || '',
          selectedColor: item.selectedColor || '',
          selectedWeight: item.selectedWeight || '',
          stringingService: item.stringingService || '',
          stringTension: item.stringTension || '',
        })),
      };

      const res = await orderApi.createOrder(payload);
      const createdOrder = res?.data ?? res;

      if (!createdOrder?.id) throw new Error('Máy chủ chưa trả về mã đơn hàng hợp lệ.');
      checkoutItems.forEach((item) => removeFromCart(item.cartItemId));

      // Route based on payment method
      if (paymentMethod === 'COD') {
        navigate(`/order-success/${createdOrder.id}`, { state: { order: createdOrder } });
      } else {
        // PAYOS_VIETQR or MANUAL_BANK
        navigate(`/payment/qr/${createdOrder.id}`, { state: { order: createdOrder } });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể tạo đơn hàng. Giỏ hàng được giữ nguyên, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Stepper Header */}
        <div className="hidden md:flex items-center justify-center mb-6">
          <nav className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <Link to="/cart" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-700">Giỏ hàng</span>
            </Link>
            <div className="h-[2px] w-12 bg-red-600"></div>
            <div className="flex items-center gap-2 text-slate-900">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs ring-2 ring-red-500/30">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">Thanh toán</span>
            </div>
            <div className="h-[2px] w-12 bg-slate-200"></div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs">
                3
              </div>
              <span>Hoàn tất</span>
            </div>
          </nav>
        </div>

        {/* Top Breadcrumb & Reservation Timer */}
        <div className="flex items-center justify-between pb-6">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Quay lại giỏ hàng</span>
          </Link>
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full text-slate-600 text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>Tồn kho được kiểm tra khi tạo đơn</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2-Column Checkout Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Customer & Delivery + Payment (~60% / 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* SECTION 1: Customer & Delivery Info */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Thông tin giao hàng</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Vui lòng điền địa chỉ để nhận hàng chính xác và nhanh nhất</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  Bước 1/2
                </span>
              </div>

              <div className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                {/* Phone & Email (2-col grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        value={shippingPhone}
                        onChange={(e) => setShippingPhone(e.target.value)}
                        placeholder="0988 123 456"
                        className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email xác nhận hóa đơn <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nguyenvana@gmail.com"
                        className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Region dropdowns (3-cols grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tỉnh / Thành phố <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Bắc Ninh">Bắc Ninh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Quận / Huyện <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Quận Đống Đa">Quận Đống Đa</option>
                      <option value="Quận Ba Đình">Quận Ba Đình</option>
                      <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
                      <option value="Quận Hoàn Kiếm">Quận Hoàn Kiếm</option>
                      <option value="Quận Thanh Xuân">Quận Thanh Xuân</option>
                      <option value="Quận 1">Quận 1</option>
                      <option value="Quận 3">Quận 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phường / Xã <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Phường Khâm Thiên">Phường Khâm Thiên</option>
                      <option value="Phường Văn Chương">Phường Văn Chương</option>
                      <option value="Phường Ô Chợ Dừa">Phường Ô Chợ Dừa</option>
                      <option value="Phường Hàng Bột">Phường Hàng Bột</option>
                      <option value="Phường Bến Nghé">Phường Bến Nghé</option>
                    </select>
                  </div>
                </div>

                {/* Detailed Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Địa chỉ cụ thể (Số nhà, ngõ ngách, tên đường...) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="Số 182 Lê Duẩn, Phường Khâm Thiên"
                    className="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  />
                </div>

                {/* Technical Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ghi chú kỹ thuật & giao nhận
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      Khuyên dùng cho đơn căng cước
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Căng cước 11kg theo chuẩn Yonex 4 nút trước khi gửi, bọc kỹ quấn cán, gọi điện hẹn giờ trước khi giao..."
                    className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>

                {/* Save info checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={saveInfo}
                    onChange={(e) => setSaveInfo(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 accent-red-600 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Lưu thông tin giao nhận cho lần đặt hàng thi đấu kế tiếp
                  </span>
                </label>
              </div>
            </section>

            {/* SECTION 2: Payment Methods */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Phương thức thanh toán</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Chọn kênh giao dịch thuận tiện và được bảo chứng an toàn</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  Bước 2/2
                </span>
              </div>

              <div className="flex flex-col gap-3">
                
                {/* OPTION 1: Dynamic QR (Default Selected) */}
                <label
                  onClick={() => setPaymentMethod('PAYOS_VIETQR')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3 ${
                    paymentMethod === 'PAYOS_VIETQR'
                      ? 'border-red-600 bg-red-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'PAYOS_VIETQR'}
                        onChange={() => setPaymentMethod('PAYOS_VIETQR')}
                        className="w-4 h-4 accent-red-600 mt-1 cursor-pointer"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            Thanh toán QR Động (PayOS / VietQR)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-current" /> Chưa tích hợp PayOS thật
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Chỉ chuyển tiền khi hệ thống cung cấp mã thanh toán đã xác thực. Hiện chưa tích hợp PayOS thật.
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <span className="text-[11px] font-black text-slate-800 tracking-tight">VIET<span className="text-red-600">QR</span></span>
                    </div>
                  </div>

                  {/* Active Preview Nested Box */}
                  {paymentMethod === 'PAYOS_VIETQR' && (
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-slate-100 flex items-center justify-center rounded-lg text-slate-800 shrink-0">
                          <QrCode className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Mã QR chính xác theo số tiền {formatPrice(finalTotal)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Tự điền nội dung, tự chuẩn hoá số tiền, không sợ chuyển nhầm
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">VCB</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">MB</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">TCB</span>
                        <span className="px-2 py-0.5 bg-pink-500 text-white rounded text-[10px] font-bold">MoMo</span>
                      </div>
                    </div>
                  )}
                </label>

                {/* OPTION 2: Manual Bank Transfer */}
                <label
                  aria-disabled="true"
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    paymentMethod === 'MANUAL_BANK'
                      ? 'border-red-600 bg-red-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        disabled
                        checked={false}
                        className="w-4 h-4 accent-red-600 mt-1 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-bold text-slate-900">
                          Chuyển khoản thủ công — chưa hỗ trợ
                        </span>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Chưa hỗ trợ phương thức này. Vui lòng chọn COD hoặc PayOS khi đã được tích hợp.
                        </p>
                      </div>
                    </div>
                    <Building className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </label>

                {/* OPTION 3: Cash On Delivery (COD) */}
                <label
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    paymentMethod === 'COD'
                      ? 'border-red-600 bg-red-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="w-4 h-4 accent-red-600 mt-1 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            Thanh toán khi nhận hàng (COD)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Đồng kiểm
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Nhận hàng, kiểm tra tem niêm phong và ngoại quan vợt trước khi thanh toán tiền mặt cho shipper.
                        </p>
                      </div>
                    </div>
                    <Truck className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </label>

              </div>
            </section>

            {/* Main Primary CTA Button */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={loading || isValidatingVoucher}
                className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-base uppercase tracking-wider rounded-xl shadow-xl shadow-red-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>ĐANG KHỞI TẠO ĐƠN HÀNG...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>ĐẶT HÀNG NGAY ({formatPrice(finalTotal)})</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-2 px-1 text-xs text-slate-400">
                <p>
                  Bằng cách nhấn Đặt hàng, bạn đồng ý với <span className="text-blue-600 hover:underline cursor-pointer">Điều khoản mua hàng</span> và <span className="text-blue-600 hover:underline cursor-pointer">Chính sách bảo mật</span> của Apex Badminton.
                </p>
                <div className="flex items-center gap-1 shrink-0 text-slate-600 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Bảo mật PCI-DSS</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Order Summary (~40% / 5 cols) */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-4">
              
              {/* Summary Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-red-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Đơn hàng của bạn ({checkoutItems.length} sản phẩm)
                  </h3>
                </div>
                <Link
                  to="/cart"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Sửa</span>
                  <Edit3 className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {checkoutItems.map((item) => {
                  const itemId = item.cartItemId || item.product.id;
                  const itemPrice = item.product.price || 0;
                  return (
                    <div key={itemId} className="py-3 flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 shrink-0 overflow-hidden relative flex items-center justify-center p-1 border border-slate-100">
                        <img
                          src={item.product.imageUrl || item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute bottom-0 right-0 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-md">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {item.product.name}
                          </h4>
                          <span className="text-xs font-black text-red-600 shrink-0">
                            {formatPrice(itemPrice * item.quantity)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 font-semibold">
                          {item.selectedWeight && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.selectedWeight}</span>}
                          {item.selectedSize && <span className="bg-slate-100 px-1.5 py-0.5 rounded">Size {item.selectedSize}</span>}
                          {item.selectedColor && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.selectedColor}</span>}
                          {item.stringingService && item.stringingService !== 'none' && (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                              Căng: {item.stringingService}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
                          <Gift className="w-3 h-3 text-emerald-500" />
                          <span>Tặng bao vợt Pro + quấn cán (0₫)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Voucher Input & Applied Box */}
              <div className="pt-2 flex flex-col gap-2">
                <form onSubmit={handleApplyVoucher} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Mã giảm giá"
                      className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl text-xs font-bold uppercase text-slate-800 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isValidatingVoucher}
                    className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
                  >
                    Áp dụng
                  </button>
                </form>

                {voucherSuccess && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-1.5 text-red-600 font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{voucherSuccess}</span>
                    </div>
                    <span className="text-red-600 font-extrabold">-{formatPrice(effectiveDiscount)}</span>
                  </div>
                )}
                {voucherError && (
                  <p className="text-[11px] font-semibold text-red-600">{voucherError}</p>
                )}
              </div>

              {/* Cost Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-2 text-xs text-slate-600 border border-slate-200/60">
                <div className="flex justify-between">
                  <span>Tạm tính ({checkoutItems.length} sản phẩm)</span>
                  <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Giảm giá Voucher Apex</span>
                  <span>-{formatPrice(effectiveDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span className="text-emerald-600 font-bold">
                    {shippingFee === 0 ? '0₫ (Miễn phí Apex VIP)' : formatPrice(shippingFee)}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-black text-slate-900">Tổng thanh toán</span>
                  <span className="text-xl font-black text-red-600 tracking-tight">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cam kết 100% chính hãng BWF - Đền gấp 10 nếu giả</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Giao hàng hỏa tốc 2H tại Hà Nội & TP.HCM</span>
                </div>
              </div>

            </div>
          </aside>

        </div>

      </div>
    </div>
  );
};

export default CheckoutPage;
