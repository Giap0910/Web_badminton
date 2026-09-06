import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  AlertCircle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';

const CheckoutPage = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!customerName || !shippingPhone || !shippingAddress) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin giao hàng');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Giỏ hàng của bạn đang trống');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const orderPayload = {
        customerName,
        shippingPhone,
        shippingAddress,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const createdOrder = await orderApi.createOrder(orderPayload);
      clearCart();
      // Navigate to Order details to view VietQR and live 15-min countdown
      navigate(`/orders/${createdOrder.id}`);
    } catch (err) {
      console.error('Lỗi khi tạo đơn hàng:', err);
      const msg = err.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Xác Nhận Đặt Hàng & Thanh Toán VietQR
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Hệ thống sẽ chuyển số lượng tồn kho sang kho khóa tạm thời (15 phút) ngay khi đơn hàng được khởi tạo.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Không thể khởi tạo đơn hàng:</strong>
            {errorMsg}
          </div>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping Information */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span>Thông Tin Người Nhận</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Họ và tên người nhận *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Số điện thoại liên hệ *</label>
              <input
                type="tel"
                value={shippingPhone}
                onChange={(e) => setShippingPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Địa chỉ giao hàng chi tiết *</label>
              <textarea
                rows="3"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Số nhà, ngõ, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
              Phương thức thanh toán
            </h3>
            <div className="p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mã VietQR Tự Động (Cổng PayOS)</h4>
                  <p className="text-[11px] text-slate-500">Quét mã bằng app ngân hàng bất kỳ, xác nhận tức thời</p>
                </div>
              </div>
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                ✓
              </span>
            </div>
          </div>
        </div>

        {/* Right: Order Preview & Action */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Đơn Hàng ({cart.length} món)
          </h2>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 rounded-lg object-cover border" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                    <span className="text-slate-500">x{item.quantity}</span>
                  </div>
                </div>
                <span className="font-extrabold text-slate-800 shrink-0">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tổng tiền hàng:</span>
              <span className="font-bold text-slate-800">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển:</span>
              <span className="font-bold text-emerald-700">Miễn phí</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t">
              <span>Cần thanh toán:</span>
              <span className="text-lg text-emerald-700">{formatPrice(cartTotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang Khóa Kho & Tạo VietQR...</span>
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <span>Sinh Mã VietQR & Khóa Kho 15 Phút</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
