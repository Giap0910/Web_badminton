import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Lỗi tải thống kê dashboard:', err);
      setError('Không thể kết nối đến máy chủ để tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  // Tính max doanh thu ngày để vẽ biểu đồ thanh (bar chart)
  const dailyData = stats?.dailyRevenue ? Object.entries(stats.dailyRevenue) : [];
  const maxDailyRevenue = Math.max(...dailyData.map(([, val]) => Number(val) || 0), 1000000);

  return (
    <AdminLayout
      title="Bảng Thống Kê Hoạt Động"
      subtitle="Theo dõi doanh thu thực tế, tiến độ đơn hàng và chỉ số khách hàng"
    >
      {/* Top Banner & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Cập nhật thời gian thực từ cơ sở dữ liệu MySQL
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Doanh Thu Đã Thu</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {loading ? '...' : formatPrice(stats?.totalRevenue)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Đối soát chuẩn xác VietQR PayOS</span>
          </div>
        </div>

        {/* Tổng đơn hàng */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tổng Đơn Hàng</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {loading ? '...' : stats?.totalOrders || 0}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="text-emerald-400 font-semibold">{stats?.paidOrders || 0} Đã trả tiền</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{stats?.pendingOrders || 0} Chờ xử lý</span>
          </div>
        </div>

        {/* Khách hàng */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Khách Hàng Đăng Ký</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {loading ? '...' : stats?.totalCustomers || 0}
          </div>
          <div className="mt-3 text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tài khoản bảo mật JWT</span>
          </div>
        </div>

        {/* Sản phẩm */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition"></div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Mặt Hàng Trong Kho</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {loading ? '...' : stats?.totalProducts || 0}
          </div>
          <div className="mt-3 text-[11px] text-slate-400 font-medium">
            <span>Quản lý tồn kho đa tầng BWF</span>
          </div>
        </div>
      </div>

      {/* Grid: Biểu đồ doanh thu 7 ngày + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Chart */}
        <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                Doanh Thu 7 Ngày Gần Nhất
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Biểu đồ tổng giá trị đơn hàng thanh toán thành công theo ngày</p>
            </div>
          </div>

          {/* CSS Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-800/80">
            {dailyData.length > 0 ? (
              dailyData.map(([date, amount]) => {
                const heightPercent = Math.min(100, Math.max(8, Math.round((Number(amount) / maxDailyRevenue) * 100)));
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-12 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap border border-slate-700 z-10">
                      {formatPrice(amount)}
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[42px] rounded-t-lg transition-all duration-500 ${
                        Number(amount) > 0
                          ? 'bg-gradient-to-t from-red-600 to-rose-500 shadow-lg shadow-red-600/20 group-hover:brightness-125'
                          : 'bg-slate-800/60'
                      }`}
                    ></div>
                    <span className="text-[11px] font-medium text-slate-400 group-hover:text-white transition">
                      {date}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-xs text-slate-500 py-12">
                Chưa có dữ liệu giao dịch 7 ngày qua
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>Dữ liệu tính từ 00:00 hàng ngày</span>
            <span className="font-semibold text-slate-300">Đơn vị: VNĐ</span>
          </div>
        </div>

        {/* Quick Operations Panel */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Lối Tắt Thao Tác
            </h3>
            <p className="text-xs text-slate-400">Điều hướng nhanh tới các phân hệ quản lý quan trọng</p>
          </div>

          <div className="space-y-2.5">
            <Link
              to="/admin/products"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Thêm / Sửa Sản Phẩm</p>
                  <p className="text-[11px] text-slate-400">Nhập kho và chỉnh thông số vợt</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>

            <Link
              to="/admin/orders"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Xử Lý Đơn Hàng</p>
                  <p className="text-[11px] text-slate-400">Đổi trạng thái vận chuyển</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>

            <Link
              to="/admin/payments"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Đối Soát PayOS VietQR</p>
                  <p className="text-[11px] text-slate-400">Kiểm tra webhook và chữ ký HMAC</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>

            <Link
              to="/admin/vouchers"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Quản Lý Mã Giảm Giá</p>
                  <p className="text-[11px] text-slate-400">Cấu hình khuyến mãi và min spend</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5 Recent Orders Table */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Đơn Hàng Mới Nhất
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">5 giao dịch phát sinh gần đây nhất trong hệ thống</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <span>Xem tất cả đơn</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">Mã Đơn</th>
                <th className="p-4">Khách Hàng</th>
                <th className="p-4">Mã PayOS</th>
                <th className="p-4">Tổng Tiền</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4">Thời Gian</th>
                <th className="p-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4 font-mono font-bold text-white">#{order.id}</td>
                    <td className="p-4 font-semibold text-slate-200">
                      {order.customerName || 'Khách vãng lai'}
                      <div className="text-[10px] text-slate-400 font-normal">{order.shippingPhone}</div>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{order.payosOrderCode || '—'}</td>
                    <td className="p-4 font-black text-red-400">{formatPrice(order.totalAmount)}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : order.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : order.status === 'SHIPPED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : order.status === 'DELIVERED'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
                      >
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    Chưa có đơn hàng nào được ghi nhận.
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

export default AdminDashboardPage;
