import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const fillTestCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đăng Nhập</h1>
          <p className="text-xs text-slate-500">Đăng nhập tài khoản để đặt hàng và quản lý đơn</p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên đăng nhập hoặc Email</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user hoặc admin"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mật khẩu</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <span>{submitting ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Test Accounts Filler */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Tài khoản dùng thử có sẵn (Nạp tự động):
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillTestCredentials('user', 'user123')}
              className="flex-1 py-1.5 px-2 bg-white border border-slate-300 hover:border-emerald-500 rounded-lg text-[11px] font-bold text-slate-700 hover:text-emerald-700 text-center transition-colors"
            >
              User: user / user123
            </button>
            <button
              type="button"
              onClick={() => fillTestCredentials('admin', 'admin123')}
              className="flex-1 py-1.5 px-2 bg-white border border-slate-300 hover:border-amber-500 rounded-lg text-[11px] font-bold text-slate-700 hover:text-amber-700 text-center transition-colors"
            >
              Admin: admin / admin123
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-bold text-emerald-600 hover:underline">
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
