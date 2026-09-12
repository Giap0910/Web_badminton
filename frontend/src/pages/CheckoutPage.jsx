import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import { voucherApi } from '../api/voucherApi';
import { shippingAddressApi } from '../api/shippingAddressApi';
import { formatPrice, formatTimer } from '../utils/formatters';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
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
  Truck
} from 'lucide-react';

const CheckoutPage = () => {
  const { cart, clearCart } = useCart();
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
  const [province, setProvince] = useState('Hà Nội');
  const [district, setDistrict] = useState('Quận Đống Đa');
  const [ward, setWard] = useState('Phường Khâm Thiên');
  const [addressDetail, setAddressDetail] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PAYOS_VIETQR'); // 'PAYOS_VIETQR' or 'COD'

  // Voucher state
  const [voucherCode, setVoucherCode] = useState(locationState.voucherCode || '');
  const [discountAmount, setDiscountAmount] = useState(locationState.discountAmount || 0);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState(
    locationState.discountAmount > 0 ? `Đã áp dụng mã ${locationState.voucherCode}` : ''
  );
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 15-minute reservation timer
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
          setCustomerName(defaultAddr.fullName || customerName);
          setShippingPhone(defaultAddr.phone || shippingPhone);
          setProvince(defaultAddr.province || province);
          setDistrict(defaultAddr.district || district);
          setWard(defaultAddr.ward || ward);
          setAddressDetail(defaultAddr.address || addressDetail);
        }
      } catch (err) {
        // user might not have addresses saved yet
      }
    };
    fetchAddresses();
  }, []);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setCustomerName(addr.fullName || '');
    setShippingPhone(addr.phone || '');
    setProvince(addr.province || province);
    setDistrict(addr.district || district);
    setWard(addr.ward || ward);
    setAddressDetail(addr.address || '');
  };

  // Financial Calculations
  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.product.price || 0) * item.quantity,
    0
  );
  const isFreeShipping = subtotal >= 1000000;
  const shippingFee = subtotal === 0 || isFreeShipping ? 0 : 30000;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setIsValidatingVoucher(true);
    setVoucherError('');
    setVoucherSuccess('');

    try {
      const res = await voucherApi.validateVoucher(voucherCode.trim(), subtotal);
      const vData = res?.data ?? res;
      if (vData && vData.valid) {
        setDiscountAmount(vData.discountAmount || 0);
        setVoucherSuccess(`Áp dụng mã ${vData.code} thành công! Giảm ${formatPrice(vData.discountAmount)}`);
      }
    } catch (err) {
      setDiscountAmount(0);
      setVoucherError(err.response?.data?.message || 'Mã giảm giá không hợp lệ.');
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setDiscountAmount(0);
    setVoucherSuccess('');
    setVoucherError('');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!customerName.trim() || !shippingPhone.trim() || !addressDetail.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.');
      return;
    }

    if (checkoutItems.length === 0) {
      setErrorMsg('Không có sản phẩm nào được chọn để thanh toán.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // Combine full address string
    const fullAddress = `${addressDetail.trim()}, ${ward}, ${district}, ${province}`;

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        shippingPhone: shippingPhone.trim(),
        shippingAddress: fullAddress,
        paymentMethod: paymentMethod,
        voucherCode: voucherCode.trim() || null,
        note: note.trim() || null,
        items: checkoutItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await orderApi.createOrder(orderPayload);
      const createdOrder = res?.data ?? res;

      // Clear purchased items from cart
      clearCart();

      // Route based on payment method
      if (paymentMethod === 'PAYOS_VIETQR') {
        navigate(`/payment/qr/${createdOrder.id}`, { state: { order: createdOrder } });
      } else {
        navigate(`/order-success/${createdOrder.id}`, { state: { order: createdOrder } });
      }
    } catch (err) {
      console.error('Lỗi khi tạo đơn hàng:', err);
      const msg = err.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại sau.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-5">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-2xl font-black text-slate-900">Không có sản phẩm để thanh toán</h2>
        <p className="text-xs text-slate-500">Giỏ hàng của bạn đang trống hoặc chưa chọn sản phẩm nào.</p>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-white font-bold text-xs shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại giỏ hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Progress Stepper */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Quay lại giỏ hàng</span>
        </Link>

        {/* Stepper Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <Link to="/cart" className="flex items-center gap-1 text-slate-600 hover:text-slate-900">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] flex items-center justify-center">✓</span>
            Giỏ hàng
          </Link>
          <span className="w-8 h-[2px] bg-secondary"></span>
          <span className="flex items-center gap-1 text-secondary font-extrabold">
            <span className="w-5 h-5 rounded-full bg-secondary text-white text-[11px] flex items-center justify-center">2</span>
            Thanh toán
          </span>
          <span className="w-8 h-[2px] bg-slate-200"></span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[11px] flex items-center justify-center">3</span>
            Hoàn tất
          </span>
        </div>

        {/* Reservation Countdown Notice */}
        <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span>Đơn hàng được giữ trong <strong className="text-slate-900">{formatTimer(timeLeft)}</strong></span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Không thể tạo đơn hàng:</strong>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Main Checkout Form Layout */}
      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery Info & Payment Methods (~62%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: Delivery Information */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">1. Thông tin giao hàng</h2>
                  <p className="text-xs text-slate-500">Vui lòng điền địa chỉ chính xác để nhận hàng nhanh nhất</p>
                </div>
              </div>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                Bước 1/2
              </span>
            </div>

            {/* Saved addresses selector if available */}
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Địa chỉ đã lưu trong sổ địa chỉ:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectSavedAddress(addr)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-secondary bg-red-50/20 text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{addr.fullName}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-bold">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">{addr.phone}</p>
                      <p className="text-[11px] text-slate-500 truncate">{addr.address}, {addr.province}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inputs: Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex justify-between">
                <span>Họ và tên người nhận <span className="text-secondary">*</span></span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
              />
            </div>

            {/* Inputs: Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Số điện thoại <span className="text-secondary">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  placeholder="Ví dụ: 0988 123 456"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Email nhận hóa đơn & thông báo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>
            </div>

            {/* Inputs: Region Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tỉnh / Thành phố *</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option>Hà Nội</option>
                  <option>TP. Hồ Chí Minh</option>
                  <option>Đà Nẵng</option>
                  <option>Hải Phòng</option>
                  <option>Cần Thơ</option>
                  <option>Bắc Ninh</option>
                  <option>Bình Dương</option>
                  <option>Đồng Nai</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Quận / Huyện *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Quận Đống Đa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Phường / Xã *</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Phường Khâm Thiên"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
            </div>

            {/* Inputs: Detail Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Địa chỉ cụ thể (Số nhà, tên ngõ, tên đường) <span className="text-secondary">*</span>
              </label>
              <input
                type="text"
                required
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Số 182 Lê Duẩn"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
              />
            </div>

            {/* Inputs: Technical Stringing Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Ghi chú kỹ thuật & giao nhận</span>
                <span className="text-[10px] bg-blue-50 text-royal px-2 py-0.5 rounded font-bold">
                  Khuyên dùng cho đơn căng vợt
                </span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Căng cước Yonex BG65Ti 11kg theo chuẩn 4 nút, bọc kỹ quấn cán, gọi trước khi giao..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
              />
            </div>
          </div>

          {/* SECTION 2: Payment Methods */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">2. Phương thức thanh toán</h2>
                  <p className="text-xs text-slate-500">Chọn kênh giao dịch thuận tiện và được bảo chứng an toàn</p>
                </div>
              </div>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                Bước 2/2
              </span>
            </div>

            <div className="space-y-3">
              {/* Option 1: Dynamic QR VietQR / PayOS */}
              <label
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === 'PAYOS_VIETQR'
                    ? 'border-secondary bg-red-50/15 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="PAYOS_VIETQR"
                  checked={paymentMethod === 'PAYOS_VIETQR'}
                  onChange={() => setPaymentMethod('PAYOS_VIETQR')}
                  className="mt-1 accent-secondary cursor-pointer"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Thanh toán QR Động (PayOS / VietQR)</span>
                    <span className="text-[10px] font-black uppercase bg-secondary text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Khuyên dùng • Xử lý 5s
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Mở app ngân hàng bất kỳ (MBBank, Vietcombank, Techcombank, VPBank...) hoặc ví điện tử để quét mã thanh toán không cần nhập STK.
                  </p>
                </div>
                <QrCode className="w-6 h-6 text-royal shrink-0" />
              </label>

              {/* Option 2: Cash On Delivery (COD) */}
              <label
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  paymentMethod === 'COD'
                    ? 'border-secondary bg-red-50/15 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="mt-1 accent-secondary cursor-pointer"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Thanh toán khi nhận hàng (COD)</span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Phí thu hộ 0₫
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Kiểm tra hàng chính hãng và tem niêm phong Apex Badminton trước khi thanh toán tiền mặt cho shipper.
                  </p>
                </div>
                <Truck className="w-6 h-6 text-slate-400 shrink-0" />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary (~38%) */}
        <div className="lg:col-span-5 sticky top-24 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Tóm Tắt Đơn Hàng ({checkoutItems.length} mặt hàng)
            </h2>

            {/* Item List Preview */}
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
              {checkoutItems.map((item) => (
                <div key={item.cartItemId || item.product.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.product.name}</p>
                      {/* Option tags */}
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.options?.selectedWeightGrip && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                            {item.options.selectedWeightGrip}
                          </span>
                        )}
                        {item.options?.selectedStringService && (
                          <span className="text-[10px] bg-blue-50 text-royal px-1.5 py-0.2 rounded font-semibold">
                            🏸 {item.options.selectedStringService}
                          </span>
                        )}
                        {item.options?.size && (
                          <span className="text-[10px] bg-red-50 text-secondary px-1.5 py-0.2 rounded font-semibold">
                            Size: {item.options.size}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatPrice(item.product.price)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900 shrink-0">
                    {formatPrice((item.product.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Voucher Box in Checkout */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-secondary" />
                <span>Mã ưu đãi / Voucher</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Mã giảm giá (HG10K, BWF50K...)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={isValidatingVoucher || !voucherCode.trim()}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0"
                >
                  {isValidatingVoucher ? 'Đang xét...' : 'Áp dụng'}
                </button>
              </div>

              {voucherSuccess && (
                <div className="flex items-center justify-between text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg font-medium">
                  <span>{voucherSuccess}</span>
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="text-slate-400 hover:text-slate-600 text-[11px] underline ml-2"
                  >
                    Gỡ
                  </button>
                </div>
              )}

              {voucherError && (
                <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg font-medium">
                  {voucherError}
                </p>
              )}
            </div>

            {/* Fee Calculations */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span className="font-bold text-slate-800">{formatPrice(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Giảm giá Voucher ({voucherCode})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                {isFreeShipping ? (
                  <span className="font-bold text-emerald-600">Miễn phí toàn quốc</span>
                ) : (
                  <span className="font-bold text-slate-800">{formatPrice(shippingFee)}</span>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-black text-slate-900 block">Tổng thanh toán</span>
                  <span className="text-[11px] text-slate-400">Đã bao gồm VAT 8%</span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-secondary block tracking-tight">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-sm tracking-wide shadow-lg shadow-secondary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang khởi tạo đơn hàng...</span>
                </>
              ) : paymentMethod === 'PAYOS_VIETQR' ? (
                <>
                  <QrCode className="w-5 h-5" />
                  <span>XÁC NHẬN & QUÉT MÃ QR ({formatPrice(finalTotal)})</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>XÁC NHẬN ĐẶT HÀNG COD</span>
                </>
              )}
            </button>

            {/* Security Assurances */}
            <div className="space-y-1.5 text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bảo chứng phân phối chính hãng 100%</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-royal shrink-0" />
                <span>Giao dịch mã hóa an toàn SSL 256-bit</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
