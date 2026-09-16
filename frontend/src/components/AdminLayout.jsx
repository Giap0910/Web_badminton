import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  CreditCard,
  Tag,
  Star,
  Settings,
  Search,
  Bell,
  MessageSquare,
  LogOut,
  Store,
  ShieldCheck,
  ChevronDown,
  Activity
} from 'lucide-react';

const AdminLayout = ({ children, title, subtitle, activeBadge }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navOverview = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, badge: null }
  ];

  const navSales = [
    { to: '/admin/products', label: 'Sản phẩm', icon: Package, badge: '248', badgeClass: 'bg-slate-800 text-slate-300' },
    { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag, badge: '12 mới', badgeClass: 'bg-secondary text-white' },
    { to: '/admin/customers', label: 'Khách hàng', icon: Users, badge: null },
    { to: '/admin/vouchers', label: 'Khuyến mãi', icon: Tag, badge: null },
    { to: '/admin/reviews', label: 'Đánh giá & RMA', icon: Star, badge: '4.9★', badgeClass: 'bg-amber-500/20 text-amber-300' },
    { to: '/admin/payments', label: 'Giao dịch', icon: CreditCard, badge: null }
  ];

  const navSystem = [
    { to: '/admin/settings', label: 'Cài đặt', icon: Settings, badge: null }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      {/* SIDEBAR FIXED (Width 256px / 64) */}
      <aside className="w-64 bg-[#0F172A] text-white flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 select-none shadow-xl border-r border-slate-800">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* BRAND HEADER */}
          <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-[#0B1120]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-secondary to-red-500 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-md shadow-red-600/30">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight text-white uppercase leading-none">
                APEX <span className="text-secondary">ADMIN</span>
              </span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1">
                Pro Badminton Portal
              </span>
            </div>
          </div>

          {/* MENU SECTIONS */}
          <div className="px-3 py-4 space-y-5">
            {/* TỔNG QUAN */}
            <div>
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                TỔNG QUAN
              </div>
              <nav className="space-y-1">
                {navOverview.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* QUẢN LÝ BÁN HÀNG */}
            <div>
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                QUẢN LÝ BÁN HÀNG
              </div>
              <nav className="space-y-1">
                {navSales.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${item.badgeClass || 'bg-slate-800 text-slate-300'}`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* HỆ THỐNG */}
            <div>
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                HỆ THỐNG
              </div>
              <nav className="space-y-1">
                {navSystem.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* ADMIN FOOTER */}
        <div className="p-3 bg-[#0B1120] border-t border-slate-800 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-secondary font-black text-xs">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.fullName || 'Admin Hoàng Nam'}</p>
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Super Admin BWF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <Link
              to="/"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Cửa hàng</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-secondary text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN AREA (Offset by 256px on md+) */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* TOPBAR HEADER */}
        <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80 z-40 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="flex items-center w-72 lg:w-96 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200/60 focus-within:border-blue-500 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm đơn hàng, sản phẩm, khách hàng (Ctrl+K)..."
                className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Live System Indicator */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-emerald-700">Hệ thống hoạt động ổn định</span>
            </div>
          </div>

          {/* Topbar Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title="Tin nhắn CSKH"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
            </button>

            <button
              type="button"
              className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title="Thông báo đơn mới"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary"></span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-2 pl-1 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                HN
              </div>
              <span className="hidden md:inline-block text-xs font-bold text-slate-800">Hoàng Nam</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="pt-16 p-4 md:p-8 flex-1 bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
