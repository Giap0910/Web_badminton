import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  Users,
  Search,
  Award,
  Crown,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  X,
  TrendingUp,
  Receipt
} from 'lucide-react';

const INITIAL_CUSTOMERS = [
  {
    id: 1,
    fullName: 'Nguyễn Văn A',
    email: 'van.nguyen@apexpro.vn',
    phone: '0988 123 456',
    tier: 'GOLD',
    tierLabel: 'Hạng Vàng',
    points: 1250,
    totalOrders: 5,
    totalSpent: 18450000,
    joinedDate: '15/03/2023',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 2,
    fullName: 'Trần Minh Đức',
    email: 'duc.tran@badminton.vn',
    phone: '0912 456 789',
    tier: 'DIAMOND',
    tierLabel: 'Hạng Kim Cương',
    points: 3840,
    totalOrders: 14,
    totalSpent: 52100000,
    joinedDate: '10/01/2023',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 3,
    fullName: 'Lê Hoàng Long',
    email: 'long.le@gmail.com',
    phone: '0903 888 999',
    tier: 'GOLD',
    tierLabel: 'Hạng Vàng',
    points: 1100,
    totalOrders: 4,
    totalSpent: 15200000,
    joinedDate: '20/06/2023',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 4,
    fullName: 'Phạm Thu Hà',
    email: 'ha.pham@outlook.com',
    phone: '0977 111 222',
    tier: 'SILVER',
    tierLabel: 'Hạng Bạc',
    points: 620,
    totalOrders: 2,
    totalSpent: 6450000,
    joinedDate: '05/08/2024',
    status: 'ACTIVE',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 5,
    fullName: 'Vũ Quốc Huy',
    email: 'huy.vu@yahoo.com',
    phone: '0944 333 555',
    tier: 'STANDARD',
    tierLabel: 'Tiêu chuẩn',
    points: 150,
    totalOrders: 1,
    totalSpent: 1650000,
    joinedDate: '12/09/2024',
    status: 'LOCKED',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80'
  }
];

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [toastMessage, setToastMessage] = useState('');
  const [viewCustomer, setViewCustomer] = useState(null);

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const handleToggleLock = (id) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newStatus = c.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
          setToastMessage(`Đã ${newStatus === 'ACTIVE' ? 'mở khóa' : 'tạm khóa'} tài khoản của ${c.fullName}.`);
          setTimeout(() => setToastMessage(''), 3000);
          return { ...c, status: newStatus };
        }
        return c;
      })
    );
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);

    const matchesTier = selectedTier === 'ALL' ? true : c.tier === selectedTier;
    const matchesStatus = selectedStatus === 'ALL' ? true : c.status === selectedStatus;

    return matchesSearch && matchesTier && matchesStatus;
  });

  return (
    <AdminLayout title="Khách hàng" subtitle="Quản lý khách hàng & Thành viên ApexClub">
      <div className="flex flex-col gap-6">
        {/* HEADER & ACTION STRIP */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Khách hàng & Hội viên
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                  1.420 thành viên
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chính sách tích điểm ApexClub, quản lý cấp bậc VIP và hạn mức ưu đãi xưởng BWF
              </p>
            </div>
          </div>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 3 STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng khách hàng</span>
              <span className="text-2xl font-black text-slate-900 mt-1">1.420</span>
              <span className="text-[11px] text-emerald-600 font-bold mt-1">+24 đăng ký tuần này</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hội viên VIP Gold & Diamond</span>
              <span className="text-2xl font-black text-secondary mt-1">385</span>
              <span className="text-[11px] text-slate-500 font-medium mt-1">Chiếm 27.1% doanh thu</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-secondary flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giá trị đơn TB (AOV)</span>
              <span className="text-2xl font-black text-slate-900 mt-1">3.650.000₫</span>
              <span className="text-[11px] text-emerald-600 font-bold mt-1">+12% so với tháng trước</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả cấp bậc</option>
              <option value="DIAMOND">Kim Cương (Diamond)</option>
              <option value="GOLD">Hạng Vàng (Gold)</option>
              <option value="SILVER">Hạng Bạc (Silver)</option>
              <option value="STANDARD">Tiêu chuẩn</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đang tạm khóa</option>
            </select>
          </div>
        </div>

        {/* CUSTOMERS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Hội viên & Cấp bậc</th>
                  <th className="py-3.5 px-4">Thông tin liên hệ</th>
                  <th className="py-3.5 px-4">Điểm ApexClub</th>
                  <th className="py-3.5 px-4">Đơn hàng</th>
                  <th className="py-3.5 px-4">Tổng chi tiêu</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Không tìm thấy khách hàng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isDiamond = c.tier === 'DIAMOND';
                    const isGold = c.tier === 'GOLD';
                    const isSilver = c.tier === 'SILVER';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Cột 1: Avatar, Tên & Cấp bậc */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex items-center gap-3">
                            <img
                              src={c.avatar}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 line-clamp-1">{c.fullName}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isDiamond && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                                    <Crown className="w-3 h-3 text-blue-600" />
                                    {c.tierLabel}
                                  </span>
                                )}
                                {isGold && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
                                    <Award className="w-3 h-3 text-amber-600" />
                                    {c.tierLabel}
                                  </span>
                                )}
                                {isSilver && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                    {c.tierLabel}
                                  </span>
                                )}
                                {!isDiamond && !isGold && !isSilver && (
                                  <span className="text-[10px] text-slate-400 font-medium">{c.tierLabel}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Email & SĐT */}
                        <td className="py-4 px-4 align-top">
                          <span className="text-slate-800 block">{c.email}</span>
                          <span className="text-[11px] text-slate-400">{c.phone}</span>
                        </td>

                        {/* Cột 3: Điểm ApexClub */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-black text-slate-900">{c.points.toLocaleString()} pts</span>
                        </td>

                        {/* Cột 4: Đơn hàng */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-bold text-slate-800">{c.totalOrders} đơn</span>
                        </td>

                        {/* Cột 5: Tổng chi tiêu */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-black text-secondary">{formatPrice(c.totalSpent)}</span>
                        </td>

                        {/* Cột 6: Trạng thái */}
                        <td className="py-4 px-4 align-top">
                          {c.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[11px]">
                              <Lock className="w-3 h-3 text-red-600" />
                              Tạm khóa
                            </span>
                          )}
                        </td>

                        {/* Cột 7: Thao tác */}
                        <td className="py-4 px-6 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setViewCustomer(c)}
                              title="Xem chi tiết"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLock(c.id)}
                              title={c.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                c.status === 'ACTIVE'
                                  ? 'text-slate-400 hover:text-secondary hover:bg-red-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {c.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL VIEW CUSTOMER */}
        {viewCustomer && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Hồ sơ hội viên ApexClub</h3>
                <button
                  type="button"
                  onClick={() => setViewCustomer(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center gap-2">
                <img
                  src={viewCustomer.avatar}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-100 shadow-md"
                />
                <h4 className="font-black text-base text-slate-900">{viewCustomer.fullName}</h4>
                <p className="text-xs text-slate-500">{viewCustomer.email} • {viewCustomer.phone}</p>
                <span className="px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                  {viewCustomer.tierLabel} (Tích lũy {viewCustomer.points} pts)
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tổng số đơn:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewCustomer.totalOrders} đơn</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tổng chi tiêu:</span>
                  <span className="font-black text-secondary text-sm">{formatPrice(viewCustomer.totalSpent)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Ngày tham gia:</span>
                  <span className="font-medium text-slate-700">{viewCustomer.joinedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Đặc quyền:</span>
                  <span className="font-bold text-blue-600">Miễn phí cân cước BWF</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setViewCustomer(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCustomersPage;
