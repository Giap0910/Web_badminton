import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  Trash2, 
  ArrowRight, 
  ShoppingBag, 
  ShieldCheck, 
  Sparkles,
  ArrowLeft 
} from 'lucide-react';

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Giỏ hàng của bạn đang trống</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Chưa có cây vợt nào trong giỏ. Hãy dạo quanh bộ sưu tập để chọn cho mình vũ khí đắc lực nhất nhé!
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Khám Phá Danh Mục Vợt</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Giỏ Hàng Của Bạn ({cart.length} sản phẩm)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Kiểm tra danh sách vợt trước khi sinh mã VietQR và kích hoạt cơ chế khóa tồn kho nguyên tử 15 phút
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Item List */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chi tiết mặt hàng
            </span>
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {cart.map((item) => (
              <div key={item.product.id} className="py-4 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                />

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {item.product.brand}
                  </span>
                  <Link to={`/products/${item.product.id}`}>
                    <h3 className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors truncate">
                      {item.product.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-500">
                    {item.product.weightGrip} • {item.product.balancePoint}
                  </p>
                  <div className="text-xs font-bold text-emerald-700">
                    Đơn giá: {formatPrice(item.product.price)}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-bold text-slate-900 min-w-[32px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div className="text-right shrink-0 min-w-[120px]">
                  <div className="text-sm font-extrabold text-slate-900">
                    {formatPrice(item.product.price * item.quantity)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-xs text-slate-400 hover:text-rose-600 mt-1"
                    title="Xóa sản phẩm"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Tóm Tắt Thanh Toán
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-bold text-slate-800">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển:</span>
              <span className="font-bold text-emerald-700">Miễn phí (Toàn quốc)</span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
              <span>Tổng thanh toán:</span>
              <span className="text-lg text-emerald-700">{formatPrice(cartTotal)}</span>
            </div>
          </div>

          {/* Atomic stock warning */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Khi bạn bấm <strong>"Tiến Hành Đặt Hàng"</strong>, hệ thống sẽ tự động khóa kho nguyên tử giữ hàng cho bạn trong <strong>15 phút</strong>.
            </p>
          </div>

          <button
            onClick={handleCheckoutClick}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
          >
            <span>Tiến Hành Đặt Hàng</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
