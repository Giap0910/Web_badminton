import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import useCheckoutVoucher from '../components/useCheckoutVoucher';
import ProductImage from '../components/ProductImage';
import { formatPrice } from '../utils/formatters';
import {
  Trash2,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
  ArrowLeft,
  Truck,
  CheckCircle2,
  PhoneCall,
  Lock,
  Tag,
  Gift,
  Plus,
  Minus,
  Sparkles,
  Receipt,
  RotateCcw,
  Award,
  Check
} from 'lucide-react';

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart, addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cartError, setCartError] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState(() => sessionStorage.getItem('hg_voucher_code') || '');

  const getItemId = (item) => item.cartItemId || item.product.id;

  const [selectedItemIds, setSelectedItemIds] = useState(
    () => new Set(cart.map(getItemId))
  );
  const selectedItems = cart.filter((item) => selectedItemIds.has(getItemId(item)));
  const allItemsSelected = cart.length > 0 && selectedItems.length === cart.length;

  useEffect(() => {
    const currentIds = new Set(cart.map(getItemId));
    setSelectedItemIds((previous) => {
      const next = new Set([...previous].filter((id) => currentIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [cart]);

  const toggleSelectAll = () => {
    if (allItemsSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(cart.map(getItemId)));
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
    selectedItems.forEach((item) => removeFromCart(getItemId(item)));
    setSelectedItemIds(new Set());
  };

  // Calculate subtotal based on selected items
  const selectedSubtotal = selectedItems
    .reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);

  // Free shipping threshold: 1,000,000 VND
  const freeShippingThreshold = 1000000;
  const isFreeShipping = selectedSubtotal >= freeShippingThreshold;
  const shippingProgress = Math.min(100, Math.round((selectedSubtotal / freeShippingThreshold) * 100));

  const voucherKey = JSON.stringify([couponCode, selectedItems
    .map((item) => [getItemId(item), item.quantity, item.product.price])]);
  const voucher = useCheckoutVoucher(couponCode, selectedSubtotal, voucherKey, selectedItems);
  const { discountAmount: couponDiscount, appliedVoucher, error: couponError, success: couponSuccess,
    validating: isValidatingCoupon, apply: handleApplyCoupon, shippingDiscountAmount, finalShippingFee: shippingFee } = voucher;

  // Effective coupon discount
  const effectiveDiscount = selectedSubtotal > 0 ? Math.min(selectedSubtotal, couponDiscount) : 0;
  const displayedShippingFee = shippingFee + shippingDiscountAmount;

  // Final Total
  const finalTotal = Math.max(0, selectedSubtotal - effectiveDiscount + shippingFee);

  const handleRemoveCoupon = () => {
    sessionStorage.removeItem('hg_voucher_code');
    setCouponCode('');
  };

  const handleCheckoutClick = () => {
    if (isValidatingCoupon) return;
    if (selectedItems.length === 0) {
      setCartError('Vui lòng chọn ít nhất một sản phẩm để tiến hành thanh toán.');
      return;
    }
    const checkoutState = {
      voucherCode: appliedVoucher?.code || '',
      discountAmount: effectiveDiscount,
      selectedItemIds: selectedItems.map(getItemId)
    };

    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout', { state: checkoutState });
    } else {
      navigate('/checkout', { state: checkoutState });
    }
  };


  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#F8FAFC] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-slate-100 space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Chưa có cây vợt hay trang thiết bị thi đấu nào trong giỏ. Hãy dạo quanh bộ sưu tập chính hãng để chọn vũ khí phù hợp nhất nhé!
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-500/25 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Khám phá bộ sưu tập ngay</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {cartError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{cartError}</p>}

        {/* Top Header Stepper */}
        <div className="hidden md:flex items-center justify-center mb-8">
          <nav className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-2 text-slate-900">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">
                1
              </div>
              <span className="text-sm font-extrabold text-slate-900">Giỏ hàng</span>
            </div>
            <div className="h-[2px] w-12 bg-slate-200"></div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">
                2
              </div>
              <span>Thanh toán</span>
            </div>
            <div className="h-[2px] w-12 bg-slate-200"></div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">
                3
              </div>
              <span>Hoàn tất</span>
            </div>
          </nav>
        </div>

        {/* Headline & Free Shipping Notice */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Giỏ Hàng Của Bạn
              </h1>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                ({cart.length} sản phẩm)
              </span>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Tiếp tục mua thêm sản phẩm</span>
            </Link>
          </div>

          {/* Free Shipping Banner */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-800">
                {isFreeShipping ? (
                  <>
                    Đơn hàng của bạn đã đủ điều kiện <span className="text-red-600 font-extrabold">Miễn phí vận chuyển toàn quốc</span> <span className="font-normal text-slate-400">(Đơn từ 1.000.000đ)</span>
                  </>
                ) : (
                  <>
                    Mua thêm <span className="text-red-600 font-extrabold">{formatPrice(freeShippingThreshold - selectedSubtotal)}</span> để được <span className="text-red-600 font-bold">Miễn phí vận chuyển toàn quốc</span>
                  </>
                )}
              </p>
              <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </div>
            <CheckCircle2 className={`w-6 h-6 shrink-0 ${isFreeShipping ? 'text-emerald-500' : 'text-slate-300'}`} />
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Products Cart Table (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              
              {/* Table Header */}
              <div className="grid grid-cols-12 items-center px-5 py-3.5 bg-slate-50 border-b border-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <div className="col-span-6 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="selectAllTop"
                    checked={allItemsSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-red-600 focus:ring-0 cursor-pointer accent-red-600"
                  />
                  <label htmlFor="selectAllTop" className="cursor-pointer">Sản phẩm</label>
                </div>
                <div className="col-span-2 text-right hidden sm:block">Đơn giá</div>
                <div className="col-span-2 text-center">Số lượng</div>
                <div className="col-span-2 text-right">Thành tiền</div>
              </div>

              {/* Cart Rows */}
              <div className="divide-y divide-slate-100">
                {cart.map((item) => {
                  const itemId = getItemId(item);
                  const isChecked = selectedItemIds.has(itemId);
                  const itemPrice = item.product.price || 0;
                  const originalPrice = item.product.originalPrice || Math.round(itemPrice * 1.2);
                  const itemTotal = itemPrice * item.quantity;

                  return (
                    <div key={itemId} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col gap-2">
                      <div className="grid grid-cols-12 items-start sm:items-center gap-3">
                        
                        {/* Product Identity */}
                        <div className="col-span-12 sm:col-span-6 flex items-start gap-3.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(itemId)}
                            className="w-4 h-4 rounded accent-red-600 mt-2 sm:mt-0 shrink-0 cursor-pointer"
                          />
                          <div className="w-20 h-20 rounded-xl bg-slate-50 p-1 shrink-0 flex items-center justify-center border border-slate-100 overflow-hidden">
                            <ProductImage compact
                              src={item.product.imageUrl || item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <Link
                              to={`/products/${item.product.id}`}
                              className="text-sm font-bold text-slate-900 hover:text-red-600 transition-colors line-clamp-1"
                            >
                              {item.product.name}
                            </Link>

                            {/* Attributes Badges */}
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {item.selectedWeight && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">
                                  {item.selectedWeight}
                                </span>
                              )}
                              {item.selectedSize && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">
                                  Size {item.selectedSize}
                                </span>
                              )}
                              {item.selectedColor && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600">
                                  {item.selectedColor}
                                </span>
                              )}
                              {item.stringingService && item.stringingService !== 'none' && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[11px] font-bold text-blue-700">
                                  Căng cước: {item.stringingService}
                                  {item.stringTension && !item.stringingService.includes(item.stringTension) ? ` (${item.stringTension})` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-4 sm:col-span-2 text-left sm:text-right">
                          <div className="text-sm font-bold text-slate-900">
                            {formatPrice(itemPrice)}
                          </div>
                          {originalPrice > itemPrice && (
                            <div className="text-xs text-slate-400 line-through">
                              {formatPrice(originalPrice)}
                            </div>
                          )}
                        </div>

                        {/* Quantity Selector */}
                        <div className="col-span-4 sm:col-span-2 flex justify-center">
                          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemId, Math.max(1, item.quantity - 1))}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-slate-600 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(itemId, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-slate-600 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Subtotal & Delete Action */}
                        <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2">
                          <div className="text-sm font-extrabold text-slate-900 text-right">
                            {formatPrice(itemTotal)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(itemId)}
                            title="Xóa sản phẩm"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>


                    </div>
                  );
                })}
              </div>

              {/* Table Bottom Action Bar */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={allItemsSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                    />
                    <span>Chọn tất cả ({cart.length} sản phẩm)</span>
                  </label>
                  <button
                    type="button"
                    onClick={removeSelectedItems}
                    disabled={selectedItems.length === 0}
                    className="text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    Xóa các mục đã chọn
                  </button>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <span className="text-xs text-slate-500">Thay đổi số lượng được lưu tự động; tồn kho được kiểm tra khi đặt hàng.</span>
                </div>
              </div>
            </div>

            {/* Stringing Advisory Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-xs text-slate-500">
                  <span className="font-bold text-slate-900 block text-sm">Cần hỗ trợ tư vấn thông số căng cước chính xác?</span>
                  Xem thông số đã công bố của từng mẫu sản phẩm.
                </div>
              </div>
              <a
                href="/products?categoryId=1"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-red-600 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Xem vợt và thông số</span>
              </a>
            </div>
          </div>

          {/* Right Column: Sticky Order Summary (4 cols) */}
          <div className="lg:col-span-4 sticky top-24 flex flex-col gap-4">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col gap-4">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  Tóm Tắt Đơn Hàng
                </h2>
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>

              {/* Coupon Input Area */}
              <div className="flex flex-col gap-2">
                <form onSubmit={handleApplyCoupon} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Nhập mã (Vd: HG100K)"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isValidatingCoupon}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isValidatingCoupon ? 'Kiểm tra...' : 'Áp dụng'}
                  </button>
                </form>

                {couponError && (
                  <p className="text-[11px] font-semibold text-red-600">{couponError}</p>
                )}
                {couponSuccess && <p role="status" className="text-[11px] text-emerald-700">{couponSuccess}</p>}

                {/* Applied Coupon Tag */}
                {appliedVoucher && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase">
                        {appliedVoucher.code}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {appliedVoucher.description || 'Giảm giá VIP'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-600">
                        -{formatPrice(shippingDiscountAmount || effectiveDiscount)}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-slate-400 hover:text-red-500 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Price Calculations */}
              <div className="flex flex-col gap-2.5 pt-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Tạm tính</span>
                  <span className="text-slate-900 font-bold">{formatPrice(selectedSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Giảm tiền hàng{appliedVoucher && effectiveDiscount > 0 ? ` (${appliedVoucher.code})` : ''}</span>
                  <span className="text-red-600 font-bold">-{formatPrice(effectiveDiscount)}</span>
                </div>
                {shippingDiscountAmount > 0 && <div className="flex items-center justify-between">
                  <span>Giảm phí vận chuyển ({appliedVoucher?.code})</span>
                  <span className="text-red-600 font-bold">-{formatPrice(shippingDiscountAmount)}</span>
                </div>}

                <div className="flex items-center justify-between">
                  <span>{shippingDiscountAmount > 0 ? 'Phí vận chuyển trước ưu đãi' : 'Phí vận chuyển'}</span>
                  <span className="text-emerald-600 font-bold">
                    {displayedShippingFee === 0 ? '0₫ (Miễn phí)' : formatPrice(displayedShippingFee)}
                  </span>
                </div>

                <div className="h-px bg-slate-100 my-1"></div>

                {/* Total Due */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-900">Tổng cộng</span>
                    <span className="text-[11px] text-slate-400">Tổng tiền dự kiến; máy chủ xác nhận khi đặt đơn</span>
                  </div>
                  <span className="text-2xl font-black text-red-600 tracking-tight">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Main Checkout CTA */}
              <button
                type="button"
                onClick={handleCheckoutClick}
                disabled={isValidatingCoupon}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 group"
              >
                <Lock className="w-4 h-4" />
                <span>Tiến Hành Thanh Toán</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Trust Badges & Policies */}
              <div className="pt-2 flex flex-col gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Trạng thái thanh toán được xác minh từ máy chủ</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Bảo hành 1 đổi 1 trong 90 ngày; không áp dụng phụ kiện</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Thông tin sản phẩm theo mẫu đã đối chiếu</span>
                </div>
              </div>

            </div>
          </div>

        </div>


      </div>
    </div>
  );
};

export default CartPage;
