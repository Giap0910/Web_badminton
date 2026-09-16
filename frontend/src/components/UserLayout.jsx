import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  MapPin,
  ShoppingBag,
  Star,
  RotateCcw,
  LogOut,
  BadgeCheck,
  Award,
  Medal,
  Receipt,
  Phone,
  ArrowRight,
  ChevronRight,
  Home
} from 'lucide-react';

const UserLayout = ({
  children,
  currentPage = 'Thông tin cá nhân',
  breadcrumbs = [],
  counts = { addresses: 2, orders: 5, reviews: 8, returns: 4 }
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Thông tin cá nhân',
      path: '/profile',
      icon: User,
      badge: null
    },
    {
      name: 'Sổ địa chỉ',
      path: '/shipping-addresses',
      icon: MapPin,
      badge: counts.addresses || 2,
      badgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      name: 'Lịch sử đơn hàng',
      path: '/my-orders',
      icon: ShoppingBag,
      badge: counts.orders || 5,
      badgeClass: 'bg-secondary text-white'
    },
    {
      name: 'Sản phẩm đã đánh giá',
      path: '/reviewed-products',
      icon: Star,
      badge: counts.reviews || null,
      badgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      name: 'Yêu cầu đổi trả & bảo hành',
      path: '/returns',
      icon: RotateCcw,
      badge: counts.returns || 4,
      badgeClass: 'bg-slate-100 text-slate-700'
    },
  ];

  return (
    <div className="bg-[#f7f9fb] min-h-[calc(100vh-112px)] py-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
        {/* BREADCRUMB & HEADER GREETING */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link to="/" className="hover:text-slate-900 transition-colors flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                Trang chủ
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <Link to="/profile" className="hover:text-slate-900 transition-colors">
                Tài khoản của tôi
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-secondary font-bold">{currentPage}</span>
            </nav>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Tài khoản của tôi
              </h1>
              <span className="text-sm text-slate-600 flex items-center gap-1.5">
                Xin chào, <strong className="text-slate-900 font-bold">{user?.fullName || user?.username || 'Khách hàng Apex'}</strong>
                <span className="inline-flex items-center gap-1 ml-1 px-2.5 py-0.5 rounded-full bg-[#131b2e] text-white text-[11px] font-black tracking-wider shadow-sm">
                  <Award className="w-3 h-3 text-amber-400" />
                  APEX VIP
                </span>
              </span>
            </div>
          </div>

          {/* QUICK STATS PILLS */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200/60">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-secondary">
                <Medal className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Điểm tích lũy</span>
                <span className="text-base font-black text-slate-900 mt-0.5">
                  1.250 <span className="text-xs font-normal text-slate-400">pts</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200/60">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Tổng đơn hàng</span>
                <span className="text-base font-black text-slate-900 mt-0.5">
                  05 <span className="text-xs font-normal text-slate-400">đơn</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2-COLUMN MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT SIDEBAR (~3 cols) */}
          <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-5">
            {/* USER PROFILE CARD */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/70 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#131b2e] via-secondary to-[#131b2e]"></div>
              
              <div className="relative mt-2 mb-3">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 font-black text-2xl overflow-hidden shadow-inner ring-4 ring-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span className="fallback">{(user?.fullName || user?.username || 'A')[0].toUpperCase()}</span>
                </div>
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center shadow-md border-2 border-white">
                  <BadgeCheck className="w-3.5 h-3.5" />
                </span>
              </div>

              <h2 className="font-black text-base text-slate-900">
                {user?.fullName || user?.username || 'Nguyễn Văn A'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'van.nguyen@apexpro.vn'}</p>

              {/* TIER PROGRESSION */}
              <div className="w-full mt-4 pt-3 bg-slate-50 rounded-xl p-3 flex flex-col gap-2 text-left border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Apex VIP Club</span>
                  <span className="text-secondary font-black">Hạng Vàng</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: '72%' }}></div>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Còn 250 điểm nữa để lên hạng <strong className="text-slate-900 font-bold">Apex Diamond</strong>
                </span>
              </div>
            </div>

            {/* NAVIGATION MENU */}
            <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200/70 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/80'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{item.name}</span>
                        {item.badge !== null && (
                          <span
                            className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-black ${
                              isActive ? 'bg-blue-600 text-white' : item.badgeClass
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}

              <div className="h-px bg-slate-100 my-1 mx-2"></div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-secondary hover:bg-red-50 font-bold text-xs transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>

            {/* ANCILLARY PROMO CARD: RACQUET STRING SERVICE */}
            <div className="bg-gradient-to-br from-[#131b2e] to-[#00174b] text-white rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wider uppercase font-black text-blue-200 bg-blue-900/40 px-2 py-0.5 rounded">
                  Dịch vụ Apex Pro
                </span>
                <span className="text-secondary font-black text-xs">BWF Standard</span>
              </div>
              <h3 className="font-black text-sm text-white leading-snug">
                Gói Căng Cước Điện Tử 4 Nút Chuẩn BWF
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Miễn phí 1 lần cân cước & cuốn cán chính hãng khi đặt đơn thứ 6 trong tháng này.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <a
                  href="/products?category=vot-cau-long"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors"
                >
                  Xem biểu đồ cước & lực căng
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT COLUMN (~9 cols) */}
          <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
