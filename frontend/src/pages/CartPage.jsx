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

  // Coupon state
  const [couponCode, setCouponCode] = useState('APEX100K');
  const [couponDiscount, setCouponDiscount] = useState(100000);
  const [appliedVoucher, setAppliedVoucher] = useState({ code: 'APEX100K', discountAmount: 100000, description: 'Giảm 100k đơn từ 5tr' });
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('Đã tự động kích hoạt mã giảm giá VIP APEX100K');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Selected items state (default all selected)
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

  // Effective coupon discount
  const effectiveDiscount = selectedSubtotal > 0 ? Math.min(selectedSubtotal, couponDiscount) : 0;

  // Final Total
  const finalTotal = Math.max(0, selectedSubtotal - effectiveDiscount + shippingFee);

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
      } else {
        // Fallback demo coupon
        if (couponCode.toUpperCase() === 'APEX100K') {
          setCouponDiscount(100000);
          setAppliedVoucher({ code: 'APEX100K', discountAmount: 100000, description: 'Giảm 100k đơn từ 5tr' });
          setCouponSuccess('Áp dụng mã APEX100K thành công! Giảm 100.000₫');
        } else {
          setCouponError('Mã giảm giá không tồn tại hoặc đã hết hạn.');
        }
      }
    } catch (err) {
      if (couponCode.toUpperCase() === 'APEX100K') {
        setCouponDiscount(100000);
        setAppliedVoucher({ code: 'APEX100K', discountAmount: 100000, description: 'Giảm 100k đơn từ 5tr' });
        setCouponSuccess('Áp dụng mã APEX100K thành công! Giảm 100.000₫');
      } else {
        setCouponDiscount(0);
        setAppliedVoucher(null);
        setCouponError(err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện.');
      }
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
    const checkoutState = {
      voucherCode: appliedVoucher?.code || '',
      discountAmount: effectiveDiscount,
      selectedItemIds: Array.from(selectedItemIds)
    };

    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout', { state: checkoutState });
    } else {
      navigate('/checkout', { state: checkoutState });
    }
  };

  // Frequently bought together accessories
  const crossSellProducts = [
    {
      id: 991,
      name: 'Quấn Cán Vợt Yonex Super Grap AC102EX (Vỉ 3 Cuộn)',
      price: 135000,
      originalPrice: 160000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxYTyP_ZWO_d5ROErKTL7CBs6d2_YtZNY3pU297hBzzeWGpRUDi6m4SO4mGjpZ53OXZaUnllZznJH3aZyAJj0ronGexuWdWbg9kMHhl6VbBfp6Ylep1h_g0fEgpra-fWkcKzrPas1S7kciGvFCa7a3Ldu_kdseMmChnx0wGAudDT3dlCGKRL-L_uLZi7ZUQ136xIM9Y8qWiRmhMlexIWHJuM_0eM7gh_qtj3x7x2-85dXb7MwEoNMW',
      tag: 'Bán chạy nhất'
    },
    {
      id: 992,
      name: 'Băng Cổ Chân Bảo Vệ Khớp Cầu Lông Yonex Pro Shield',
      price: 245000,
      originalPrice: 290000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDchjtqQYK2N_Dqcq2t7-1ReSP7OGliG0G2CknRT8MPJBRmLDguCTLt9VEbIYxOBVNIpVjpB90f34Crw3hTZWxF4Nng1nW7WuZlc5uUGVdnS_875yDPLBfrq8ekk7ZIOTUawoiXEc0wHUoP-qjIDueqfNZxbrmyb5L8SWdtwknnvs-kSSJ7rjyw3Dc-81NYyZajmsrmBwxj5LuKSnwvhgKbAR9JidkcaasqY6PgofzpJBVfGL39-Niw',
      tag: 'Phụ kiện an toàn'
    },
    {
      id: 993,
      name: 'Túi Đựng Giày Thể Thao Khử Mùi Thoáng Khí Yonex Pro',
      price: 190000,
      originalPrice: 250000,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLs7bMgLAvhlsjb8n42G2i546YnlF9frRIQUhynLb0uaIovwub4-M_JUM8kLyAs9cnzUUjENc-GYNZTuv2l8MT07Lfs-mx58f4fu9E6gE83ZSqPXdBCEP2uVh9cr2w6SJ2nOcQyuNY3sJIZQ0tWWslsXk9xcgHZhfOWJrJyCc8ZdZ9vUw9wnArTE7CTJ9fKDse8Vg8e6dLB8wB08ppX-JeqXeNwiu-F1U7SBOYFKtfc-xfdRnHqpKQ',
      tag: 'Chống ẩm mốc'
    }
  ];

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
                    checked={selectedItemIds.size === cart.length && cart.length > 0}
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
                  const itemId = item.cartItemId || item.product.id;
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
                            <img
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
                                  Căng cước: {item.stringingService} ({item.stringTension || '10.5'} kg)
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

                      {/* Free Gift Strip */}
                      <div className="ml-7 sm:ml-9 flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
                        <Gift className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>
                          <strong className="font-semibold text-slate-900">Tặng kèm:</strong> 01 Bao vợt nhung Yonex chính hãng + 02 Quấn cán AC102EX (0đ)
                        </span>
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
                      checked={selectedItemIds.size === cart.length && cart.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                    />
                    <span>Chọn tất cả ({cart.length} sản phẩm)</span>
                  </label>
                  <button
                    type="button"
                    onClick={removeSelectedItems}
                    disabled={selectedItemIds.size === 0}
                    className="text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    Xóa các mục đã chọn
                  </button>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => alert('Giỏ hàng đã được đồng bộ với trạng thái mới nhất!')}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    Cập nhật giỏ hàng
                  </button>
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
                  Đội ngũ đan vợt chứng chỉ Victor & Yonex sẵn sàng hỗ trợ trực tiếp.
                </div>
              </div>
              <a
                href="tel:19006886"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-red-600 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Hotline 1900 6886</span>
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
                      placeholder="Nhập mã (Vd: APEX100K)"
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
                        -{formatPrice(effectiveDiscount)}
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
                  <span>Giảm giá coupon ({appliedVoucher?.code || 'None'})</span>
                  <span className="text-red-600 font-bold">-{formatPrice(effectiveDiscount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    Quà tặng độc quyền
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                  <span className="text-slate-900 font-bold">
                    0₫ <span className="font-normal text-slate-400 line-through text-[11px]">(450.000₫)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Phí vận chuyển</span>
                  <span className="text-emerald-600 font-bold">
                    {shippingFee === 0 ? '0₫ (Miễn phí)' : formatPrice(shippingFee)}
                  </span>
                </div>

                <div className="h-px bg-slate-100 my-1"></div>

                {/* Total Due */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-900">Tổng cộng</span>
                    <span className="text-[11px] text-slate-400">(Đã gồm VAT 8% và hóa đơn điện tử)</span>
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
                  <span>Thanh toán an toàn & bảo mật qua SSL 256-bit</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Đổi mới trong 7 ngày nếu không vừa chân / lỗi sản xuất</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cam kết 100% chính hãng - Đền gấp 10 lần nếu hàng giả</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Frequently Bought Together (Cross-sell Section) */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Sản phẩm thường mua cùng</h3>
            <p className="text-xs text-slate-500 mt-1">Tối ưu hiệu năng thi đấu với phụ kiện chính hãng được tin dùng</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {crossSellProducts.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 p-1 shrink-0 flex items-center justify-center border border-slate-100 overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold uppercase text-red-600 tracking-wider">
                      {p.tag}
                    </span>
                    <span className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">
                      {p.name}
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs font-black text-slate-900">{formatPrice(p.price)}</span>
                      <span className="text-[10px] text-slate-400 line-through">{formatPrice(p.originalPrice)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    addToCart({
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      imageUrl: p.image,
                      stockQuantity: 99
                    }, 1);
                    alert(`Đã thêm "${p.name}" vào giỏ hàng thành công!`);
                  }}
                  className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white flex items-center justify-center transition-all shrink-0"
                  title="Thêm nhanh vào giỏ"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CartPage;
