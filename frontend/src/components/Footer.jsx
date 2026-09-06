import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Award, Phone, Mail, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Perks Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-800 text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Chính Hãng 100%</h4>
              <p className="text-xs text-slate-400">Cam kết phân phối Yonex, Victor, Lining chính ngạch</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Khóa Kho Tức Thời</h4>
              <p className="text-xs text-slate-400">Giữ hàng 15 phút chống đụng hàng khi thanh toán QR</p>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Tư Vấn AI Độc Quyền</h4>
              <p className="text-xs text-slate-400">Gemini AI hiểu sâu kỹ thuật, gợi ý đúng lối đánh</p>
            </div>
          </div>
        </div>

        {/* Links & Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 py-12">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">SmashZone Badminton</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Hệ thống bán lẻ vợt và dụng cụ cầu lông cao cấp số 1 Việt Nam. Tích hợp công nghệ khóa kho nguyên tử và trợ lý AI tư vấn chuẩn chuyên gia.
            </p>
            <div className="text-xs text-slate-500">
              © 2026 SmashZone Badminton. All rights reserved.
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Danh Mục Sản Phẩm</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/products?brand=Yonex" className="hover:text-emerald-400 transition-colors">Vợt Yonex (Astrox, Nanoflare)</Link></li>
              <li><Link to="/products?brand=Victor" className="hover:text-emerald-400 transition-colors">Vợt Victor (Ryuga, Auraspeed)</Link></li>
              <li><Link to="/products?brand=Lining" className="hover:text-emerald-400 transition-colors">Vợt Lining (Axforce, Halbertec)</Link></li>
              <li><Link to="/products?brand=Mizuno" className="hover:text-emerald-400 transition-colors">Vợt Mizuno (Fortius, Altius)</Link></li>
              <li><Link to="/compare" className="hover:text-emerald-400 transition-colors">Bảng So Sánh Thông Số Vợt</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Hỗ Trợ Khách Hàng</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Chính sách bảo hành gãy nứt</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Hướng dẫn thanh toán VietQR PayOS</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Cẩm nang chọn mức căng cước (lbs)</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Phân biệt vợt nặng đầu & nhẹ đầu</a></li>
            </ul>
          </div>

          <div className="space-y-3 text-xs text-slate-400">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Liên Hệ Hệ Thống</h4>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hotline kỹ thuật: 1900 8888 (8:00 - 22:00)</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>hotro@smashzone.badminton.vn</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Sân cầu lông SmashZone Complex, TP. Hồ Chí Minh & Hà Nội</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
