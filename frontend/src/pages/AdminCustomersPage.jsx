import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';

const AdminCustomersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.isActive;
    const confirmMsg = newStatus
      ? `Mở khóa cho tài khoản "${user.username}"?`
      : `Bạn có chắc muốn KHÓA tài khoản "${user.username}"? Người dùng này sẽ không thể đăng nhập.`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(user.id);
    try {
      await adminApi.updateUserStatus(user.id, newStatus);
      showToast(newStatus ? 'Đã kích hoạt tài khoản thành công!' : 'Đã khóa tài khoản thành công!');
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err) {
      alert('Không thể cập nhật trạng thái người dùng.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phoneNumber?.includes(term)
    );
  });

  return (
    <AdminLayout
      title="Quản Lý Khách Hàng"
      subtitle="Quản trị danh sách hội viên, phân quyền và kiểm soát quyền truy cập tài khoản"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action Header & Search */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Họ tên, Username, Email hoặc SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Tổng cộng: <span className="font-bold text-white">{filteredUsers.length}</span> người dùng
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">Khách Hàng</th>
                <th className="p-4">Email</th>
                <th className="p-4">Số Điện Thoại</th>
                <th className="p-4">Vai Trò</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4">Ngày Tham Gia</th>
                <th className="p-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    Đang tải danh sách khách hàng...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                          {u.fullName?.charAt(0) || u.username?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.fullName || 'Chưa đặt họ tên'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{u.phoneNumber || '—'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {u.role === 'ROLE_ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          <Shield className="w-3 h-3" /> ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <Users className="w-3 h-3" /> USER
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {u.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <UserCheck className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <UserX className="w-3 h-3" /> Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="p-4 text-center">
                      {u.role !== 'ROLE_ADMIN' ? (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={updatingId === u.id}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 mx-auto ${
                            u.isActive !== false
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {u.isActive !== false ? (
                            <>
                              <UserX className="w-3 h-3" /> Khóa
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" /> Mở khóa
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Quản trị tối cao</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    Không tìm thấy khách hàng nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomersPage;
