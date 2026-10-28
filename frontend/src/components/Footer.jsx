import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck, ShoppingBag, Layers } from 'lucide-react';

const Footer = () => <footer className="w-full bg-[#0F172A] text-white pt-12 sm:pt-16 pb-8 border-t border-slate-800">
  <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-12 border-b border-slate-800/80">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5"><span className="font-display text-xl font-extrabold">HG <span className="text-secondary">BADMINTON</span></span>
          <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-bold">PRO</span></div>
        <p className="text-xs text-slate-300 leading-relaxed">Danh mục vợt, giày, quần áo, balo và phụ kiện cầu lông của Yonex, Victor, Li-Ning, Mizuno, Kawasaki và Fleet.</p>
        <p className="flex gap-2 text-xs text-slate-400"><MapPin className="w-4 h-4 shrink-0" />Địa chỉ, hotline và email cửa hàng chưa được xác minh.</p>
      </div>
      <div className="flex flex-col gap-3 text-xs text-slate-300">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Chính sách cửa hàng</h2>
        <a href="/#shop-policy" className="hover:text-white">Phí giao hàng và điểm tích lũy</a>
        <a href="/#shop-policy" className="hover:text-white">Bảo hành 1 đổi 1 trong 90 ngày</a>
        <p className="leading-relaxed">Áp dụng vợt, giày, quần áo và balo/bao vợt đủ điều kiện. Phụ kiện không có ưu đãi bảo hành này.</p>
        <Link to="/returns" className="hover:text-white">Xem yêu cầu bảo hành của tôi</Link>
      </div>
      <div className="flex flex-col gap-3 text-xs text-slate-300">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Hỗ trợ mua hàng</h2>
        <Link to="/products" className="hover:text-white flex gap-2"><ShoppingBag className="w-4 h-4" />Xem danh mục sản phẩm</Link>
        <Link to="/compare" className="hover:text-white flex gap-2"><Layers className="w-4 h-4" />So sánh thông số vợt</Link>
        <Link to="/my-orders" className="hover:text-white">Tra cứu đơn hàng</Link>
        <Link to="/shipping-addresses" className="hover:text-white">Quản lý địa chỉ nhận hàng</Link>
        <Link to="/profile" className="hover:text-white">Thông tin tài khoản</Link>
      </div>
      <div className="flex flex-col gap-4 text-xs text-slate-300">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Thông tin mua hàng</h2>
        <p className="leading-relaxed">Giá, kích cỡ, màu sắc và tình trạng còn hàng được hiển thị trên trang từng sản phẩm.</p>
        <p className="p-3 bg-slate-800 rounded-lg border border-slate-700">Đăng ký nhận tin và các kênh mạng xã hội chưa được tích hợp.</p>
        <p className="leading-relaxed">Có thể thanh toán COD. Thanh toán QR cần cổng PayOS/VietQR đang hoạt động; lựa chọn khả dụng được xác minh tại bước thanh toán.</p>
      </div>
    </div>
    <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
      <span>© {new Date().getFullYear()} HG Badminton</span>
      <p className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Kiểm tra thông tin đơn hàng và phương thức thanh toán trước khi xác nhận.</p>
    </div>
  </div>
</footer>;
export default Footer;
