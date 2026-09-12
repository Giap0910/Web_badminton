import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { 
  Search, 
  ShoppingCart, 
  Layers, 
  Phone, 
  User, 
  LogOut, 
  Flame, 
  Menu, 
  X
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const { selectedRackets } = useCompare();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navCategories = [
    { label: 'Vợt Cầu Lông', path: '/products?category=RACKET' },
    { label: 'Giày Cầu Lông', path: '/products?category=SHOES' },
    { label: 'Balo & Bao Vợt', path: '/products?category=BAG' },
    { label: 'Quần Áo Thi Đấu', path: '/products?category=APPAREL' },
    { label: 'Phụ Kiện Pro', path: '/products?category=ACCESSORIES' },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-[#0F172A] text-white shadow-header-sticky border-b border-slate-800">
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between pt-3 pb-2">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Logo HG Badminton */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-secondary via-red-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-secondary/30 group-hover:scale-105 transition-transform">
              {/* Badminton Shuttlecock Icon Custom SVG */}
              <svg className="w-6 h-6 transform -rotate-45" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C10.9 2 10 2.9 10 4C10 4.3 10.1 4.6 10.2 4.9L4.9 10.2C4.6 10.1 4.3 10 4 10C2.9 10 2 10.9 2 12C2 12.3 2.1 12.6 2.2 12.9L3 21H11.1C11.4 21.9 12.3 22 12 22C12.3 22 12.6 21.9 12.9 21.8L21 21L21.8 12.9C21.9 12.6 22 12.3 22 12C22 10.9 21.1 10 20 10C19.7 10 19.4 10.1 19.1 10.2L13.8 4.9C13.9 4.6 14 4.3 14 4C14 2.9 13.1 2 12 2ZM12 5.5L16.5 10L14.5 12L12 9.5L9.5 12L7.5 10L12 5.5ZM12 11L14.5 13.5L12 16L9.5 13.5L12 11Z" opacity="0.9" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                HG <span className="text-secondary font-black tracking-wider">BADMINTON</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase hidden sm:inline">
                Chuyên Nghiệp • Đỉnh Cao
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-2 sm:mx-4">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm vợt, giày, phụ kiện Yonex, Lining, Victor..."
                className="w-full bg-slate-800/80 hover:bg-slate-800 focus:bg-white text-white focus:text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm pl-10 pr-4 py-2 rounded-full border border-slate-700 focus:border-royal focus:outline-none transition-all shadow-inner"
              />
            </div>
          </form>

          {/* Top Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Hotline (Desktop) */}
            <div className="hidden xl:flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-secondary">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hotline</span>
                <span className="text-xs font-bold text-white tracking-wide">1900 6886</span>
              </div>
            </div>

            {/* Compare Button */}
            <Link
              to="/compare"
              className="relative flex items-center gap-1.5 text-slate-200 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
              title="So sánh vợt (tối đa 3 cây)"
            >
              <div className="relative">
                <Layers className="w-5 h-5 text-slate-300 hover:text-white" />
                {selectedRackets.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-royal text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow animate-pulse">
                    {selectedRackets.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold hidden md:inline text-slate-300">So sánh</span>
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative flex items-center gap-1.5 text-slate-200 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
              title="Giỏ hàng"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-slate-300 hover:text-white" />
                <span className="absolute -top-1.5 -right-2 bg-secondary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow">
                  {cartCount}
                </span>
              </div>
              <span className="text-xs font-semibold hidden md:inline text-slate-300">Giỏ hàng</span>
            </Link>

            {/* Auth / Account Action */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={isAdmin ? "/admin" : "/profile"}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/80 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="hidden lg:flex flex-col leading-tight">
                    <span className="text-xs font-bold text-white line-clamp-1 max-w-[100px]">
                      {user?.fullName || user?.username}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {isAdmin ? 'Quản Trị Viên' : 'Tài Khoản'}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-secondary rounded-lg hover:bg-slate-800/80 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary-container text-white shadow-sm transition-all"
                >
                  Đăng Ký
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Secondary Navigation Row (Categories & Hot Promo) */}
        <nav className="hidden lg:flex items-center justify-between border-t border-slate-800/80 pt-2 mt-2">
          <div className="flex items-center gap-6 overflow-x-auto">
            {navCategories.map((cat, idx) => (
              <Link
                key={idx}
                to={cat.path}
                className="text-xs font-bold text-slate-300 hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 border-transparent hover:border-royal"
              >
                {cat.label}
              </Link>
            ))}
          </div>

          <Link
            to="/products?sale=true"
            className="text-[11px] uppercase tracking-wider font-extrabold bg-secondary text-white px-3.5 py-1 rounded-full whitespace-nowrap hover:bg-secondary-container transition-all flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95"
          >
            <Flame className="w-3.5 h-3.5 fill-white animate-pulse" />
            <span>Khuyến Mãi Hot</span>
          </Link>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden pt-3 pb-2 border-t border-slate-800 mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {navCategories.map((cat, idx) => (
                <Link
                  key={idx}
                  to={cat.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80"
                >
                  {cat.label}
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <Link
                to="/products?sale=true"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-white text-xs font-extrabold uppercase"
              >
                <Flame className="w-3.5 h-3.5 fill-white" />
                Khuyến Mãi Hot
              </Link>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Phone className="w-3.5 h-3.5 text-secondary" />
                <span>1900 6886</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
