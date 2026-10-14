import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import { normalizeCustomer, normalizeSearch } from '../utils/adminCustomers.jsx';
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


const AdminCustomersPage = () => {
  const [dataError, setDataError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [toastMessage, setToastMessage] = useState('');
  const [viewCustomer, setViewCustomer] = useState(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const mounted = useRef(true), loadGeneration = useRef(0), mutationLock = useRef(false);

  const formatPrice = (p) =>
    p == null ? 'Chưa có thông tin' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const fetchUsers = async () => {
    const generation = ++loadGeneration.current;setLoading(true);
    try {
      const res = await adminApi.getAllUsers(), list = Array.isArray(res) ? res : res?.data;
      if (!Array.isArray(list)) throw new Error('Dữ liệu khách hàng không hợp lệ');
      const mapped = list.filter(user => user.role !== 'ROLE_ADMIN').map(normalizeCustomer);
      if (mounted.current && generation === loadGeneration.current) {
        setCustomers(mapped);setDataError('');
        setViewCustomer(previous => previous ? mapped.find(customer => customer.id === previous.id) || null : null);
      }
      return mapped;
    } catch (err) {
      if (mounted.current && generation === loadGeneration.current)
        setDataError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
      return null;
    } finally {if (mounted.current && generation === loadGeneration.current) setLoading(false);}
  };

  useEffect(() => {
    mounted.current = true;
    fetchUsers();
    return () => {mounted.current = false;loadGeneration.current += 1;};
  }, []);

  const handleToggleLock = async (id) => {
    if (mutationLock.current) return;
    const target = customers.find((c) => c.id === id);
    if (!target) return;
    const isActive = target.status !== 'ACTIVE';
    mutationLock.current = true;setBusy(true);setToastMessage('');setDataError('');loadGeneration.current += 1;
    try {
      await adminApi.updateUserStatus(id, isActive);
      if (!mounted.current) return;
      const reloaded = await fetchUsers();
      const current = reloaded?.find(customer => customer.id === id);
      if (!current || (current.status === 'ACTIVE') !== isActive) throw new Error('Chưa xác nhận được trạng thái tài khoản. Vui lòng tải lại.');
      if (mounted.current) setToastMessage(`Đã ${isActive ? 'mở khóa' : 'tạm khóa'} tài khoản của ${target.fullName}.`);
    } catch (err) {
      if (mounted.current) setDataError(err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái tài khoản.');
    } finally {mutationLock.current = false;if (mounted.current) setBusy(false);}
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      normalizeSearch([c.fullName, c.email, c.phone, c.code].join(' ')).includes(normalizeSearch(searchQuery));

    const matchesStatus = selectedStatus === 'ALL' ? true : c.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="Khách hàng" subtitle="Quản lý khách hàng & Thành viên HGClub">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
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
                  {customers.length} khách hàng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Thông tin tài khoản, điểm từ số tiền đã thanh toán và lịch sử đơn hàng
              </p>
            </div>
          </div>
          <button type="button" disabled={busy || loading} onClick={fetchUsers} className="rounded-xl border px-3 py-2 text-xs font-bold">Làm mới khách hàng</button>
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
              <span className="text-2xl font-black text-slate-900 mt-1">{customers.length}</span>
              <span className="text-[11px] text-emerald-600 font-bold mt-1">Không gồm tài khoản quản trị</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tài khoản hoạt động</span>
              <span className="text-2xl font-black text-secondary mt-1">{customers.filter(customer => customer.status === 'ACTIVE').length}</span>
              <span className="text-[11px] text-slate-500 font-medium mt-1">Theo trạng thái đã lưu trên máy chủ</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-secondary flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng điểm tích lũy</span>
              <span className="text-2xl font-black text-slate-900 mt-1">{customers.every(customer => customer.points != null) ? customers.reduce((sum, customer) => sum + customer.points, 0).toLocaleString('vi-VN') : 'Chưa có thông tin'}</span>
              <span className="text-[11px] text-emerald-600 font-bold mt-1">Không cộng điểm theo số lượng đơn</span>
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
                  <th className="py-3.5 px-6">Khách hàng</th>
                  <th className="py-3.5 px-4">Thông tin liên hệ</th>
                  <th className="py-3.5 px-4">Điểm HGClub</th>
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
                      {loading ? 'Đang tải khách hàng...' : dataError ? 'Chưa tải được danh sách khách hàng.' : 'Không tìm thấy khách hàng nào phù hợp với bộ lọc.'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Cột 1: Avatar, Tên & Cấp bậc */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 border border-slate-200 shrink-0">{c.fullName.charAt(0)}</span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 line-clamp-1">{c.fullName}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">{c.code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Email & SĐT */}
                        <td className="py-4 px-4 align-top">
                          <span className="text-slate-800 block">{c.email}</span>
                          <span className="text-[11px] text-slate-400">{c.phone}</span>
                        </td>

                        {/* Cột 3: Điểm HGClub */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-black text-slate-900">{c.points == null ? 'Chưa có thông tin' : `${c.points.toLocaleString('vi-VN')} pts`}</span>
                        </td>

                        {/* Cột 4: Đơn hàng */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-bold text-slate-800">{c.totalOrders == null ? 'Chưa có thông tin' : `${c.totalOrders} đơn`}</span>
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
                              disabled={busy || loading}
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
                <h3 className="text-base font-black text-slate-900">Hồ sơ hội viên HGClub</h3>
                <button
                  type="button"
                  onClick={() => setViewCustomer(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center gap-2">
                <span className="w-20 h-20 rounded-full flex items-center justify-center bg-slate-100 text-2xl">{viewCustomer.fullName.charAt(0)}</span>
                <h4 className="font-black text-base text-slate-900">{viewCustomer.fullName}</h4>
                <p className="text-xs text-slate-500">{viewCustomer.email} • {viewCustomer.phone}</p>
                <span className="text-xs text-slate-500">{viewCustomer.status === 'ACTIVE' ? 'Tài khoản hoạt động' : 'Tài khoản tạm khóa'}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tổng số đơn:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewCustomer.totalOrders ?? 'Chưa có thông tin'}</span>
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
                  <span className="text-slate-400 block text-[11px]">Điểm tích lũy:</span>
                  <span className="font-bold text-blue-600">{viewCustomer.points == null ? 'Chưa có thông tin' : viewCustomer.points.toLocaleString('vi-VN')}</span>
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
