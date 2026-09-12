import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Globe, 
  Youtube, 
  Video, 
  Camera 
} from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="w-full bg-[#0F172A] text-white pt-12 sm:pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 4 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-12 border-b border-slate-800/80">
          
          {/* Col 1: Brand Info */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-secondary to-amber-500 flex items-center justify-center text-white font-black text-sm">
                HG
              </div>
              <span className="font-display text-xl tracking-tight font-extrabold text-white">
                HG <span className="text-secondary">BADMINTON</span>
              </span>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Hệ thống phân phối dụng cụ cầu lông chuyên nghiệp, chính hãng số 1 Việt Nam (Yonex, Victor, Li-Ning, Mizuno). Đỉnh cao công nghệ và tinh hoa thể thao.
            </p>
            
            <div className="flex flex-col gap-2.5 text-xs text-slate-300 mt-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>Số 182 Lê Duẩn, Quận Hai Bà Trưng, Hà Nội</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-secondary shrink-0" />
                <span>1900 6886 - 0988 123 456</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-secondary shrink-0" />
                <span>support@hgbadminton.vn</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-secondary shrink-0" />
                <span>08:30 - 21:30 (Cả Thứ 7 & CN)</span>
              </div>
            </div>
          </div>

          {/* Col 2: Policies */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Chính Sách
            </span>
            <Link to="/products" className="text-xs text-slate-300 hover:text-white transition-colors">
              Chính sách đổi trả 7 ngày
            </Link>
            <Link to="/products" className="text-xs text-slate-300 hover:text-white transition-colors">
              Bảo hành chính hãng 90 ngày
            </Link>
            <Link to="/products" className="text-xs text-slate-300 hover:text-white transition-colors">
              Chính sách giao hàng hỏa tốc 2H
            </Link>
            <Link to="/products" className="text-xs text-slate-300 hover:text-white transition-colors">
              Hình thức thanh toán VietQR & Trả góp
            </Link>
            <Link to="/products" className="text-xs text-slate-300 hover:text-white transition-colors">
              Chính sách bảo mật thông tin khách hàng
            </Link>
          </div>

          {/* Col 3: Customer Support */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Hỗ Trợ Khách Hàng
            </span>
            <Link to="/compare" className="text-xs text-slate-300 hover:text-white transition-colors">
              Hướng dẫn chọn vợt theo lối chơi (Smash/Speed)
            </Link>
            <Link to="/products" className="text-xs text-slate-300 hover:text-white transition-colors">
              Bảng đo lực & hướng dẫn căng cước 4 nút điện tử
            </Link>
            <Link to="/my-orders" className="text-xs text-slate-300 hover:text-white transition-colors">
              Tra cứu đơn hàng trực tuyến
            </Link>
            <a href="#faq" className="text-xs text-slate-300 hover:text-white transition-colors">
              Câu hỏi thường gặp (FAQ)
            </a>
            <a href="#consulting" className="text-xs text-slate-300 hover:text-white transition-colors">
              Cộng đồng & Tư vấn kỹ thuật cầu lông
            </a>
          </div>

          {/* Col 4: Newsletter & Trust */}
          <div className="flex flex-col gap-4">
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Đăng Ký Nhận Tin
            </span>
            <p className="text-xs text-slate-300">
              Nhận mã giảm giá 10% cho đơn hàng đầu tiên và thông báo các đợt mở bán phiên bản giới hạn sớm nhất.
            </p>

            <form onSubmit={handleSubscribe} className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email của bạn..."
                className="w-full bg-slate-800 text-white placeholder:text-slate-400 text-xs px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-royal transition-colors"
              />
              <button
                type="submit"
                className="bg-secondary text-white hover:bg-secondary-container px-4 py-2 text-xs rounded-lg font-bold transition-all shadow shrink-0 active:scale-95"
              >
                GỬI
              </button>
            </form>
            {subscribed && (
              <span className="text-xs text-emerald-400 font-semibold">
                ✓ Đăng ký nhận tin thành công! Cảm ơn bạn.
              </span>
            )}

            {/* Social Connect */}
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Kết nối với chúng tôi
              </span>
              <div className="flex items-center gap-2.5">
                <a href="#facebook" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-royal flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                  <Globe className="w-4 h-4" />
                </a>
                <a href="#youtube" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-secondary flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
                <a href="#tiktok" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                  <Video className="w-4 h-4" />
                </a>
                <a href="#instagram" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-pink-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                  <Camera className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Ministry of Industry and Trade Badge */}
            <div className="mt-1 flex items-center gap-2.5 p-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold text-white">ĐÃ THÔNG BÁO</span>
                <span className="text-[10px] text-slate-400">Bộ Công Thương Việt Nam</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span className="text-center md:text-left">
            © 2026 HG Badminton JSC. Tất cả quyền được bảo lưu. Thiết kế cho vận động viên chuyên nghiệp.
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold hidden sm:inline">
              Phương thức thanh toán:
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-slate-300">
              <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">VISA</span>
              <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">MASTERCARD</span>
              <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-secondary">VNPAY-QR</span>
              <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-pink-400">MOMO</span>
              <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">COD</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
