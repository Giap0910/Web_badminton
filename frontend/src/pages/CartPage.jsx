import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { voucherApi } from '../api/voucherApi';
import { formatPrice } from '../utils/formatters';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Truck,
  CheckCircle2,
  PhoneCall,
  Percent,
  Lock,
  Tag,
  Gift
} from 'lucide-react';

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Selected items state (default all selected using cartItemId or fallback)
  const [selectedItemIds, setSelectedItemIds] = useState(
    () => new Set(cart.map((item) => item.cartItemId || item.product.id))
  );

  const toggleSelectAll = () => {
    if (selectedItemIds.size === cart.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(cart.map((item) => item.cartItemId || item.product.id)));
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const removeSelectedItems = () => {
    selectedItemIds.forEach((id) => removeFromCart(id));
    setSelectedItemIds(new Set());
  };

  // Calculate subtotal based on selected items
  const selectedSubtotal = cart
    .filter((item) => selectedItemIds.has(item.cartItemId || item.product.id))
    .reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);

  // Free shipping threshold: 1,000,000 VND
  const freeShippingThreshold = 1000000;
  const isFreeShipping = selectedSubtotal >= freeShippingThreshold;
  const shippingFee = selectedSubtotal === 0 || isFreeShipping ? 0 : 30000;
  const shippingProgress = Math.min(100, Math.round((selectedSubtotal / freeShippingThreshold) * 100));

  // Final Total
  const finalTotal = Math.max(0, selectedSubtotal - couponDiscount + shippingFee);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await voucherApi.validateVoucher(couponCode.trim(), selectedSubtotal);
      const vData = res?.data ?? res;
      if (vData && vData.valid) {
        setCouponDiscount(vData.discountAmount || 0);
        setAppliedVoucher(vData);
        setCouponSuccess(`Áp dụng thành công mã ${vData.code}! Giảm ${formatPrice(vData.discountAmount)}`);
      }
    } catch (err) {
      setCouponDiscount(0);
      setAppliedVoucher(null);
      setCouponError(err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedVoucher(null);
    setCouponSuccess('');
    setCouponError('');
  };

  const handleCheckoutClick = () => {
    if (selectedItemIds.size === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để tiến hành thanh toán!');
      return;
    }
    // Pass applied voucher to checkout via state or query
    const checkoutState = {
      voucherCode: appliedVoucher?.code || '',
      discountAmount: couponDiscount,
      selectedItemIds: Array.from(selectedItemIds)
    };

    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout', { state: checkoutState });
    } else {
      navigate('/checkout', { state: checkoutState });
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-12 h-12" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Giỏ hàng của bạn đang trống
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Chưa có cây vợt hay phụ kiện nào trong giỏ. Hãy dạo quanh bộ sưu tập để chọn cho mình vũ khí đắc lực nhất nhé!
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold text-sm shadow-md shadow-secondary/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Khám phá bộ sưu tập ngay</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Progress Stepper */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            Giỏ Hàng Của Bạn
          </h1>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
            {cart.length} sản phẩm
          </span>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="flex items-center gap-1 text-secondary font-extrabold">
            <span className="w-5 h-5 rounded-full bg-secondary text-white text-[11px] flex items-center justify-center">1</span>
            Giỏ hàng
          </span>
          <span className="w-8 h-[2px] bg-slate-200"></span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[11px] flex items-center justify-center">2</span>
            Thanh toán
          </span>
          <span className="w-8 h-[2px] bg-slate-200"></span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[11px] flex items-center justify-center">3</span>
            Hoàn tất
          </span>
        </div>
      </div>

      {/* Free Shipping Progress Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isFreeShipping ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-secondary'
        }`}>
          <Truck className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-slate-800">
            {isFreeShipping ? (
              <span>
                Chúc mừng! Đơn hàng của bạn đã đủ điều kiện{' '}
                <strong className="text-emerald-600 font-bold">Miễn phí vận chuyển toàn quốc</strong>.
              </span>
            ) : (
              <span>
                Mua thêm <strong className="text-secondary font-bold">{formatPrice(freeShippingThreshold - selectedSubtotal)}</strong> để được{' '}
                <strong className="text-slate-900 font-bold">Miễn phí vận chuyển toàn quốc</strong>.
              </span>
            )}
          </p>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isFreeShipping ? 'bg-emerald-500' : 'bg-secondary'
              }`}
              style={{ width: `${shippingProgress}%` }}
            ></div>
          </div>
        </div>
        {isFreeShipping && (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 hidden sm:block" />
        )}
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 items-center px-5 py-3.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-6 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedItemIds.size === cart.length && cart.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-secondary focus:ring-0 accent-secondary cursor-pointer"
                  id="selectAll"
                />
                <label htmlFor="selectAll" className="cursor-pointer">Sản phẩm ({cart.length})</label>
              </div>
              <div className="col-span-2 text-right hidden sm:block">Đơn giá</div>
              <div className="col-span-2 text-center">Số lượng</div>
              <div className="col-span-2 text-right">Thành tiền</div>
            </div>

            {/* Cart Items Rows */}
            <div className="divide-y divide-slate-100">
              {cart.map((item) => {
                const itemId = item.cartItemId || item.product.id;
                const isSelected = selectedItemIds.has(itemId);
                const itemSubtotal = (item.product.price || 0) * item.quantity;

                return (
                  <div
                    key={itemId}
                    className={`p-5 transition-colors flex flex-col gap-3 ${
                      isSelected ? 'bg-white' : 'bg-slate-50/50 opacity-70'
                    }`}
                  >
                    <div className="grid grid-cols-12 items-start sm:items-center gap-3">
                      {/* Product Identity */}
                      <div className="col-span-12 sm:col-span-6 flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(itemId)}
                          className="w-4 h-4 rounded accent-secondary mt-1 sm:mt-0 shrink-0 cursor-pointer"
                        />
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col min-w-0 space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {item.product.brand}
                          </span>
                          <Link
                            to={`/products/${item.product.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-secondary transition-colors line-clamp-1"
                          >
                            {item.product.name}
                          </Link>
                          {/* Option Badges */}
                          <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                            {item.options?.selectedWeightGrip && (
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-bold">
                                {item.options.selectedWeightGrip}
                              </span>
                            )}
                            {item.options?.selectedStringService && (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-royal text-[11px] font-bold border border-blue-100">
                                🏸 {item.options.selectedStringService}
                              </span>
                            )}
                            {item.options?.size && (
                              <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[11px] font-bold border border-secondary/20">
                                Size: {item.options.size}
                              </span>
                            )}
                            {item.product.category?.name && !item.options?.selectedStringService && !item.options?.size && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                                {item.product.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 sm:col-span-2 text-left sm:text-right">
                        <div className="font-bold text-sm text-slate-900">
                          {formatPrice(item.product.price)}
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="col-span-4 sm:col-span-2 flex justify-center">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(itemId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Subtotal & Delete Action */}
                      <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2">
                        <span className="font-black text-sm text-slate-900 text-right">
                          {formatPrice(itemSubtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(itemId)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-secondary hover:bg-red-50 transition-colors"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Free Gift Strip */}
                    <div className="ml-7 sm:ml-9 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs">
                      <Gift className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span>
                        <strong className="font-bold text-slate-800">Tặng kèm:</strong> 01 Bao vợt nhung Apex Tour + 02 Quấn cán Yonex AC102EX (0₫)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={removeSelectedItems}
                  disabled={selectedItemIds.size === 0}
                  className="font-semibold text-slate-500 hover:text-secondary disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa các mục đã chọn ({selectedItemIds.size})</span>
                </button>
              </div>

              <Link
                to="/products"
                className="text-xs font-bold text-royal hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Tiếp tục chọn thêm sản phẩm khác</span>
              </Link>
            </div>
          </div>

          {/* Stringing Advisory Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-royal flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold text-sm text-slate-900 block">Cần tư vấn thông số căng cước chính xác?</span>
                Đội ngũ kỹ thuật viên đan vợt chứng chỉ Victor & Yonex sẵn sàng hỗ trợ trực tiếp.
              </div>
            </div>
            <a
              href="tel:19006886"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-secondary font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Hotline 1900 6886</span>
            </a>
          </div>
        </div>

        {/* Right Column: Sticky Order Summary */}
        <div className="lg:col-span-4 sticky top-24 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Tóm Tắt Đơn Hàng
            </h2>

            {/* Voucher / Promo Code Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-secondary" />
                <span>Mã khuyến mãi / Voucher</span>
              </label>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: HG10K, BWF50K"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <button
                  type="submit"
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-50 transition-colors shrink-0"
                >
                  {isValidatingCoupon ? 'Kiểm tra...' : 'Áp dụng'}
                </button>
              </form>

              {couponSuccess && (
                <div className="flex items-center justify-between text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg font-medium">
                  <span>{couponSuccess}</span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-slate-400 hover:text-slate-600 text-[11px] underline ml-2"
                  >
                    Gỡ
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg font-medium">
                  {couponError}
                </p>
              )}

              {/* Quick voucher suggestion pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['HG10K', 'BWF50K', 'FREESHIP'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setCouponCode(code);
                    }}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                  >
                    +{code}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính ({selectedItemIds.size} món)</span>
                <span className="font-bold text-slate-800">{formatPrice(selectedSubtotal)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Giảm giá Voucher ({appliedVoucher?.code})</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                {isFreeShipping ? (
                  <span className="font-bold text-emerald-600">Miễn phí</span>
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

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckoutClick}
              disabled={selectedItemIds.size === 0}
              className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-black text-sm tracking-wide shadow-lg shadow-secondary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span>TIẾN HÀNH THANH TOÁN</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            {/* Trust Assurances */}
            <div className="space-y-2 pt-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Phân phối chính hãng Yonex, Victor, Li-Ning</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-royal shrink-0" />
                <span>Bảo mật giao dịch VietQR / SSL 256-bit</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Bảo hành đứt cước 24h & Cân lực điện tử</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
