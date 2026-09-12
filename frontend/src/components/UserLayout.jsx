import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  MapPin,
  Package,
  Star,
  RotateCcw,
  LogOut,
  ShieldCheck,
  Award
} from 'lucide-react';

const UserLayout = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Thông tin cá nhân', path: '/profile', icon: User },
    { name: 'Sổ địa chỉ nhận hàng', path: '/shipping-addresses', icon: MapPin },
    { name: 'Quản lý đơn hàng', path: '/my-orders', icon: Package },
    { name: 'Đánh giá của tôi', path: '/reviewed-products', icon: Star },
    { name: 'Đổi trả & Bảo hành', path: '/returns', icon: RotateCcw },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Account Navigation Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-5">
          {/* User Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-slate-900 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md ring-4 ring-slate-100">
                {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Tài khoản đã kích hoạt">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="font-black text-base text-slate-900 truncate">
                {user?.fullName || user?.username}
              </h2>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'Thành viên Apex'}</p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  <Award className="w-3 h-3 text-amber-500" /> BWF Pro Member
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-secondary text-white shadow-md shadow-secondary/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            <div className="pt-2 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Right Column: Main Content */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {(title || subtitle) && (
            <div className="pb-3 border-b border-slate-200">
              {title && <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>}
              {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
