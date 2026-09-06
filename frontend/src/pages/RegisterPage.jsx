import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, ArrowRight } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    address: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đăng Ký Thành Viên</h1>
          <p className="text-xs text-slate-500">Gia nhập cộng đồng lông thủ chuyên nghiệp tại SmashZone</p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tên đăng nhập *</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="nguyenvana"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Email chính xác *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="vana@gmail.com"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mật khẩu (tối thiểu 6 ký tự) *</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Họ và tên đầy đủ *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Số điện thoại</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0912345678"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Địa chỉ</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="TP. Hồ Chí Minh"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <span>{submitting ? 'Đang tạo tài khoản...' : 'Hoàn Tất Đăng Ký'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-bold text-emerald-600 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
