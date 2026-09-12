import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Gift, 
  Trophy, 
  Zap 
} from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('user');
  const [password, setPassword] = useState('user123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(redirectPath);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-800 antialiased flex flex-col justify-between relative overflow-x-hidden selection:bg-secondary selection:text-white">
      
      {/* Background Watermark Pattern: Badminton Racket & Court vector graphics */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-[0.05]">
        <svg className="w-[1200px] h-[1200px] text-white -rotate-12 transform" viewBox="0 0 800 800" fill="none" stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="400" cy="260" rx="190" ry="240" strokeWidth="6" />
          <ellipse cx="400" cy="260" rx="180" ry="230" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="260" y1="150" x2="260" y2="370" strokeWidth="1" />
          <line x1="300" y1="90" x2="300" y2="430" strokeWidth="1" />
          <line x1="340" y1="50" x2="340" y2="470" strokeWidth="1" />
          <line x1="380" y1="30" x2="380" y2="490" strokeWidth="1.5" />
          <line x1="420" y1="30" x2="420" y2="490" strokeWidth="1.5" />
          <line x1="460" y1="50" x2="460" y2="470" strokeWidth="1" />
          <line x1="500" y1="90" x2="500" y2="430" strokeWidth="1" />
          <line x1="540" y1="150" x2="540" y2="370" strokeWidth="1" />
          <line x1="230" y1="180" x2="570" y2="180" strokeWidth="1" />
          <line x1="215" y1="220" x2="585" y2="220" strokeWidth="1" />
          <line x1="210" y1="260" x2="590" y2="260" strokeWidth="1.5" />
          <line x1="215" y1="300" x2="585" y2="300" strokeWidth="1" />
          <line x1="230" y1="340" x2="570" y2="340" strokeWidth="1" />
          <path d="M380 500 L400 520 L420 500 Z" fill="currentColor" />
          <rect x="394" y="520" width="12" height="200" rx="3" fill="currentColor" />
          <rect x="390" y="720" width="20" height="240" rx="5" strokeWidth="3" />
        </svg>
      </div>

      {/* Decorative ambient radial glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-royal/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Minimal Top Bar Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium group">
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <span>Về trang chủ</span>
        </Link>

        <div className="flex items-center gap-5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Bảo mật SSL 256-bit</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-secondary" />
            <span>Hotline: <strong className="text-slate-200 font-semibold">1900 6886</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content Center: Card Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Brand Logo Section above the Card */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-secondary via-red-500 to-rose-400 flex items-center justify-center shadow-lg shadow-secondary/25 ring-2 ring-white/20">
              <svg className="w-7 h-7 text-white transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C10.9 2 10 2.9 10 4C10 4.3 10.1 4.6 10.2 4.9L4.9 10.2C4.6 10.1 4.3 10 4 10C2.9 10 2 10.9 2 12C2 12.3 2.1 12.6 2.2 12.9L3 21H11.1C11.4 21.9 12.3 22 12 22C12.3 22 12.6 21.9 12.9 21.8L21 21L21.8 12.9C21.9 12.6 22 12.3 22 12C22 10.9 21.1 10 20 10C19.7 10 19.4 10.1 19.1 10.2L13.8 4.9C13.9 4.6 14 4.3 14 4C14 2.9 13.1 2 12 2ZM12 5.5L16.5 10L14.5 12L12 9.5L9.5 12L7.5 10L12 5.5ZM12 11L14.5 13.5L12 16L9.5 13.5L12 11Z" opacity="0.9" />
              </svg>
            </div>
            <div className="text-left">
              <span className="block text-2xl font-extrabold tracking-wider text-white uppercase leading-none font-display">
                HG<span className="text-secondary ml-1">BADMINTON</span>
              </span>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Pro Performance Gear & Stringing
              </span>
            </div>
          </div>
        </div>

        {/* Main White Card */}
        <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl shadow-black/50 border border-slate-100 overflow-hidden transition-all duration-300">
          
          {/* Card Top Accent Bar (Gradient Red to Blue) */}
          <div className="h-1.5 w-full bg-gradient-to-r from-secondary via-rose-500 to-royal"></div>

          <div className="p-8 sm:p-10">
            {/* Tab Switcher (Đăng nhập / Đăng ký) */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-7 relative select-none">
              <button
                type="button"
                className="flex-1 py-2.5 text-center text-sm font-bold rounded-lg transition-all duration-200 bg-white text-[#0F172A] shadow-sm"
              >
                Đăng nhập
              </button>
              <Link
                to="/register"
                className="flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-all duration-200 text-slate-500 hover:text-slate-900"
              >
                Đăng ký tài khoản
              </Link>
            </div>

            {/* Form Đăng Nhập */}
            <div className="space-y-5">
              <div className="mb-2">
                <h1 className="text-xl font-bold text-slate-900 font-display">Chào mừng trở lại!</h1>
                <p className="text-xs text-slate-500 mt-1">Đăng nhập để nhận ưu đãi thành viên & theo dõi đơn hàng</p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identifier Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên đăng nhập hoặc Email <span className="text-secondary">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="user hoặc admin"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mật khẩu <span className="text-secondary">*</span>
                    </label>
                  </div>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu của bạn"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-secondary border-slate-300 rounded focus:ring-secondary cursor-pointer accent-secondary"
                    />
                    <span className="text-xs font-medium text-slate-600">Ghi nhớ đăng nhập</span>
                  </label>
                  <span className="text-xs font-semibold text-royal hover:underline cursor-pointer">
                    Quên mật khẩu?
                  </span>
                </div>

                {/* Submit CTA Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-secondary hover:bg-secondary-hover active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-secondary/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    <span>{submitting ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>

              {/* Quick Fill Test Accounts for Demo */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Tài khoản dùng thử có sẵn:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillCredentials('user', 'user123')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 text-center transition-colors"
                  >
                    User: user / user123
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin', 'admin123')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 text-center transition-colors"
                  >
                    Admin: admin / admin123
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Card Footer Notice */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Bảo mật chuẩn mã hóa PCI-DSS</span>
            </div>
            <span className="text-royal font-medium">Trợ giúp 24/7</span>
          </div>

        </div>

        {/* Quick Benefit Badges under Card */}
        <div className="mt-8 grid grid-cols-3 gap-6 max-w-[480px] w-full text-center">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 mb-1.5 backdrop-blur-sm">
              <Gift className="w-4 h-4 text-secondary" />
            </div>
            <span className="text-[11px] font-medium text-slate-400">Voucher 100K cho thành viên mới</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 mb-1.5 backdrop-blur-sm">
              <Trophy className="w-4 h-4 text-royal" />
            </div>
            <span className="text-[11px] font-medium text-slate-400">Tích lũy điểm đổi quà BWF</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 mb-1.5 backdrop-blur-sm">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[11px] font-medium text-slate-400">Ưu tiên căng cước hỏa tốc 2H</span>
          </div>
        </div>

      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 gap-3">
        <div>
          © 2026 HG Badminton JSC. Tất cả quyền được bảo lưu.
        </div>
        <div className="flex items-center gap-5">
          <Link to="/" className="hover:text-slate-300 transition-colors">Điều khoản dịch vụ</Link>
          <Link to="/" className="hover:text-slate-300 transition-colors">Chính sách bảo mật</Link>
          <Link to="/" className="hover:text-slate-300 transition-colors">Quy chế hoạt động</Link>
        </div>
      </footer>

    </div>
  );
};

export default LoginPage;
