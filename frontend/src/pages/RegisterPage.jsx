import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [activeTab, setActiveTab] = useState('register');
  
  // Register form state
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerIdentifier, setRegisterIdentifier] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordConfirm, setShowRegisterPasswordConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Login form state (if switched to login)
  const [loginIdentifier, setLoginIdentifier] = useState('nguyenvana@gmail.com');
  const [loginPassword, setLoginPassword] = useState('user123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (registerPassword !== registerPasswordConfirm) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư');
      return;
    }

    setSubmitting(true);
    try {
      const isEmail = registerIdentifier.includes('@');
      const generatedUsername = isEmail 
        ? registerIdentifier.split('@')[0] + Math.floor(Math.random() * 100)
        : registerIdentifier;
      const finalEmail = isEmail ? registerIdentifier : `${registerIdentifier}@apexbadminton.vn`;

      await register({
        username: generatedUsername,
        email: finalEmail,
        password: registerPassword,
        fullName: registerFullName,
        phone: !isEmail ? registerIdentifier : '',
      });
      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const actualPassword = loginPassword === '••••••••••••' ? 'user123' : loginPassword;
      const actualUsername = loginIdentifier === 'nguyenvana@gmail.com' ? 'user' : loginIdentifier;
      await login(actualUsername, actualPassword);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Email/Số điện thoại hoặc mật khẩu không chính xác');
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (u, p) => {
    setLoginIdentifier(u);
    setLoginPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-800 antialiased flex flex-col justify-between relative overflow-x-hidden selection:bg-red-500 selection:text-white font-sans">
      
      {/* Background Watermark Pattern: Badminton Racket & Shuttlecock vector graphics */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center opacity-[0.06]">
        <svg className="w-[1400px] h-[1400px] text-white -rotate-12 transform" viewBox="0 0 800 800" fill="none" stroke="currentColor" strokeWidth="1.5">
          {/* Racket Head */}
          <ellipse cx="400" cy="260" rx="190" ry="240" strokeWidth="6" />
          <ellipse cx="400" cy="260" rx="180" ry="230" strokeWidth="1.5" strokeDasharray="4 4" />
          {/* Grid Strings */}
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
          <line x1="260" y1="380" x2="540" y2="380" strokeWidth="1" />
          <line x1="300" y1="420" x2="500" y2="420" strokeWidth="1" />
          <line x1="340" y1="460" x2="460" y2="460" strokeWidth="1" />
          
          {/* T-Joint */}
          <path d="M380 500 L400 520 L420 500 Z" fill="currentColor" />
          {/* Shaft */}
          <rect x="394" y="520" width="12" height="200" rx="3" fill="currentColor" />
          {/* Handle / Grip */}
          <rect x="390" y="720" width="20" height="240" rx="5" strokeWidth="3" />
          <line x1="390" y1="750" x2="410" y2="760" strokeWidth="1.5" />
          <line x1="390" y1="780" x2="410" y2="790" strokeWidth="1.5" />
          <line x1="390" y1="810" x2="410" y2="820" strokeWidth="1.5" />
          <line x1="390" y1="840" x2="410" y2="850" strokeWidth="1.5" />
          <line x1="390" y1="870" x2="410" y2="880" strokeWidth="1.5" />
          <line x1="390" y1="900" x2="410" y2="910" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Decorative ambient radial glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Minimal Top Bar Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium group">
          <svg className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Về trang chủ</span>
        </Link>

        <div className="flex items-center gap-5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="hidden sm:inline">Bảo mật SSL 256-bit</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Hotline: <strong className="text-slate-200 font-semibold">1900 6886</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content Center: Card Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        
        {/* Brand Logo Section above the Card */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 via-red-500 to-rose-400 flex items-center justify-center shadow-lg shadow-red-500/25 ring-2 ring-white/20">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a5 5 0 0 0-5 5c0 1.63.78 3.08 2 4l-4 9h14l-4-9c1.22-.92 2-2.37 2-4a5 5 0 0 0-5-5z" />
                <line x1="8" y1="7" x2="16" y2="7" strokeWidth="1.5" />
                <line x1="12" y1="2" x2="12" y2="12" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="text-left">
              <span className="block text-2xl font-extrabold tracking-wider text-white uppercase leading-none">
                APEX<span className="text-red-500 ml-1">BADMINTON</span>
              </span>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                Pro Performance Gear & Service
              </span>
            </div>
          </div>
        </div>

        {/* Main White Card */}
        <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl shadow-black/40 border border-slate-100 overflow-hidden transition-all duration-300">
          
          {/* Card Top Accent Bar (Gradient Red to Blue) */}
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-blue-600"></div>

          <div className="p-8 sm:p-10">
            {/* Tab Switcher (Đăng nhập / Đăng ký) */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-7 relative select-none">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
                className={`flex-1 py-2.5 text-center text-sm rounded-lg transition-all duration-200 ${
                  activeTab === 'login'
                    ? 'font-bold bg-white text-[#0F172A] shadow-sm'
                    : 'font-semibold text-slate-500 hover:text-slate-800'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
                className={`flex-1 py-2.5 text-center text-sm rounded-lg transition-all duration-200 ${
                  activeTab === 'register'
                    ? 'font-bold bg-white text-[#0F172A] shadow-sm'
                    : 'font-semibold text-slate-500 hover:text-slate-800'
                }`}
              >
                Đăng ký tài khoản
              </button>
            </div>

            {/* Error / Success Notifications */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 2: FORM ĐĂNG KÝ (Mặc định ở route /register) */}
            {activeTab === 'register' && (
              <div className="space-y-4 transition-opacity duration-200">
                <div className="mb-3">
                  <h1 className="text-xl font-bold text-slate-900">Tạo tài khoản Apex Club</h1>
                  <p className="text-xs text-slate-500 mt-1">Đăng ký thành viên để nhận voucher 100K và tích điểm đổi quà</p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {/* Họ và Tên Input */}
                  <div>
                    <label htmlFor="register-fullname" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Họ và tên của bạn <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="register-fullname"
                        required
                        value={registerFullName}
                        onChange={(e) => setRegisterFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  {/* Email hoặc SĐT Input */}
                  <div>
                    <label htmlFor="register-identifier" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email hoặc Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="register-identifier"
                        required
                        value={registerIdentifier}
                        onChange={(e) => setRegisterIdentifier(e.target.value)}
                        placeholder="Email hoặc số điện thoại kích hoạt"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  {/* Mật khẩu */}
                  <div>
                    <label htmlFor="register-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tạo mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showRegisterPassword ? 'text' : 'password'}
                        id="register-password"
                        required
                        minLength={6}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showRegisterPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Xác nhận Mật khẩu */}
                  <div>
                    <label htmlFor="register-password-confirm" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Xác nhận mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <input
                        type={showRegisterPasswordConfirm ? 'text' : 'password'}
                        id="register-password-confirm"
                        required
                        minLength={6}
                        value={registerPasswordConfirm}
                        onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                        placeholder="Nhập lại mật khẩu vừa tạo"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPasswordConfirm(!showRegisterPasswordConfirm)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showRegisterPasswordConfirm ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Điều khoản dịch vụ Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer accent-red-600"
                      />
                      <span className="text-xs text-slate-500 leading-tight">
                        Tôi đồng ý với <a href="#" onClick={(e) => { e.preventDefault(); alert('Điều khoản Apex Badminton: Cam kết hàng chính hãng BWF 100%, bảo mật thanh toán SSL.'); }} className="text-blue-600 font-medium hover:underline">Điều khoản dịch vụ</a> và <a href="#" onClick={(e) => { e.preventDefault(); alert('Chính sách bảo mật: Tuân thủ quy chuẩn bảo mật PCI-DSS và bảo vệ dữ liệu người dùng.'); }} className="text-blue-600 font-medium hover:underline">Chính sách quyền riêng tư</a> của Apex Badminton.
                      </span>
                    </label>
                  </div>

                  {/* CTA Button: Đăng ký */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      <span>{submitting ? 'ĐANG TẠO TÀI KHOẢN...' : 'TẠO TÀI KHOẢN NGAY'}</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 1: FORM ĐĂNG NHẬP (Nếu chuyển tab) */}
            {activeTab === 'login' && (
              <div className="space-y-5 transition-opacity duration-200">
                <div className="mb-4">
                  <h1 className="text-xl font-bold text-slate-900">Chào mừng trở lại!</h1>
                  <p className="text-xs text-slate-500 mt-1">Đăng nhập để nhận ưu đãi thành viên & theo dõi đơn hàng</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="reg-login-identifier" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email hoặc Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="reg-login-identifier"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="name@example.com hoặc 0988..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="reg-login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                    </div>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        id="reg-login-password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Nhập mật khẩu của bạn"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showLoginPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 focus:ring-offset-0 cursor-pointer accent-red-600"
                      />
                      <span className="text-xs font-medium text-slate-600">Ghi nhớ đăng nhập</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Vui lòng liên hệ hotline 1900 6886 hoặc nhập email để đặt lại mật khẩu.')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      <span>{submitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </form>

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Hoặc tiếp tục với</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      fillCredentials('user', 'user123');
                      alert('Đã kết nối tài khoản mẫu Google thành công! Nhấn ĐĂNG NHẬP để tiếp tục.');
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27a7.2 7.2 0 010-4.54V6.58H1.25a11.98 11.98 0 000 10.84l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      fillCredentials('admin', 'admin123');
                      alert('Đã kết nối tài khoản mẫu Facebook thành công! Nhấn ĐĂNG NHẬP để tiếp tục.');
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Card Footer Notice / Benefits Bar */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Bảo mật dữ liệu chuẩn mã hóa PCI-DSS</span>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); alert('Tổng đài hỗ trợ 24/7: 1900 6886 hoặc email support@apexbadminton.vn'); }} className="text-blue-600 hover:underline font-medium">Trợ giúp 24/7</a>
          </div>

        </div>

        {/* Quick Benefit Badges under Card */}
        <div className="mt-8 grid grid-cols-3 gap-6 max-w-[480px] w-full text-center">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 mb-1.5 backdrop-blur-sm">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2m0 13l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Voucher 100K cho thành viên mới</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 mb-1.5 backdrop-blur-sm">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Tích lũy điểm cược đổi quà BWF</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 mb-1.5 backdrop-blur-sm">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Ưu tiên căng cước hỏa tốc 2H</span>
          </div>
        </div>

      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 gap-3">
        <div>
          © 2025 Apex Badminton Store Co., Ltd. Tất cả quyền được bảo lưu.
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-slate-300 transition-colors">Điều khoản dịch vụ</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Chính sách bảo mật</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Quy chế hoạt động</a>
        </div>
      </footer>

    </div>
  );
};

export default RegisterPage;
