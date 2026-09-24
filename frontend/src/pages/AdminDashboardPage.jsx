import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import { getOrderStatusLabel } from '../utils/formatters';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Eye,
  Check,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';

const REVENUE_DATA = [];


const TOP_PRODUCTS = [];

const AdminDashboardPage = () => {
  const [dataError, setDataError] = useState('');
  const [timeRange, setTimeRange] = useState('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState({
    todayRevenue: 'Chưa tải',
    newOrders: 'Chưa tải',
    newCustomers: 'Chưa tải',
    inventoryAlerts: 'Chưa tải'
  });

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (adminApi?.getDashboardStats) {
        const res = await adminApi.getDashboardStats();
        const data = res?.data ?? res;
        if (data) {
          setStats({
            todayRevenue: formatPrice(data.totalRevenue || 0),
            newOrders: data.totalOrders ?? 0,
            newCustomers: data.totalCustomers ?? 0,
            inventoryAlerts: data.pendingOrders ?? 0
          });
          if (Array.isArray(data.recentOrders)) {
            const mappedOrders = data.recentOrders.map((o, idx) => ({
              id: o.id || idx + 1,
              code: o.payosOrderCode ? `#HG-${o.payosOrderCode}` : `#HG-${o.id || 89000 + idx}`,
              customer: o.customerName || 'Khách hàng HG',
              phone: o.shippingPhone || '0988 123 456',
              product: o.items?.[0]?.productName || 'Vợt Cầu Lông HG',
              stringReq: o.items?.[0]?.stringingService
                ? `${o.items[0].stringingService}${o.items[0].stringTension ? ` (${o.items[0].stringTension})` : ''}`
                : 'Đan vợt tiêu chuẩn BWF',
              amount: o.totalAmount || 0,
              time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString('vi-VN') : 'Vừa xong',
              status: o.status || 'PENDING',
              statusLabel: getOrderStatusLabel(o)
            }));
            setRecentOrders(mappedOrders);
          }
        }
      }
    } catch (err) {
      setDataError(err.response?.data?.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <AdminLayout title="Dashboard" subtitle="Báo cáo tổng quan hoạt động">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
      <div className="flex flex-col gap-6">
        {/* HEADER / ACTION BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Báo cáo tổng quan hoạt động
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#131b2e] text-blue-300 text-[10px] font-black uppercase tracking-wider ml-1">
                Live Ops
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Dữ liệu kinh doanh và vận hành xưởng căng cước theo thời gian thực — Cập nhật lúc 15:30 hôm nay
            </p>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl border-none outline-none cursor-pointer transition-colors"
            >
              <option value="today">Hôm nay (24/10/2024)</option>
              <option value="7days">7 ngày qua</option>
              <option value="month">Tháng này</option>
              <option value="quarter">Quý IV / 2024</option>
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => alert('Xuất báo cáo chưa được tích hợp, chưa tạo tệp.')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#131b2e] hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất báo cáo</span>
            </button>
          </div>
        </div>

        {/* 4 KPI STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Doanh thu */}
          <div className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tổng doanh thu
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  {stats.todayRevenue}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-red-50 text-secondary flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-2 border-t border-slate-100">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                <ArrowUpRight className="w-3 h-3" />
                —
              </span>
              <span className="text-[11px] text-slate-500">Chưa có số liệu so sánh</span>
            </div>
          </div>

          {/* Card 2: Tổng đơn hàng */}
          <div className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tổng đơn hàng
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {stats.newOrders}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">đơn</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-1.5 border-t border-slate-100">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-[11px] text-slate-600 font-bold">Xem chi tiết trong danh sách đơn hàng</span>
            </div>
          </div>

          {/* Card 3: Tổng khách hàng */}
          <div className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0F172A]"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tổng khách hàng
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {stats.newCustomers}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">khách</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-2 border-t border-slate-100">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                —
              </span>
              <span className="text-[11px] text-slate-500">Chưa có thống kê hội viên</span>
            </div>
          </div>

          {/* Card 4: Cảnh báo kho */}
          <div className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Đơn chờ thanh toán
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-amber-600 tracking-tight">
                    {stats.inventoryAlerts}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">mặt hàng</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-1.5 border-t border-slate-100">
              <span className="text-[11px] text-amber-700 font-bold">Không phải số liệu tồn kho</span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN SECTION: REVENUE CHART & TOP PRODUCTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* REVENUE CHART (7 COLS) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Biểu đồ doanh thu 7 ngày qua</h3>
                <p className="text-xs text-slate-500">Đơn vị: VNĐ (Bao gồm cả phí dịch vụ căng cước)</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase">Tổng tuần</span>
                <p className="text-sm font-black text-secondary">Chưa có dữ liệu</p>
              </div>
            </div>

            {/* CHART BARS */}
            <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
              {REVENUE_DATA.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap pointer-events-none z-10 shadow-md">
                    {formatPrice(item.revenue)}
                  </div>
                  <div className="w-full bg-slate-100 rounded-t-xl h-44 flex items-end justify-center overflow-hidden">
                    <div
                      className={`w-full transition-all duration-500 rounded-t-xl ${
                        idx === REVENUE_DATA.length - 1
                          ? 'bg-secondary'
                          : 'bg-blue-600 group-hover:bg-blue-500'
                      }`}
                      style={{ height: `${item.height}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{item.day.split(' ')[0]}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600"></span> Doanh thu ngày thường
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-secondary"></span> Hôm nay (Chủ nhật cao điểm)
              </span>
            </div>
          </div>

          {/* TOP SELLING PRODUCTS (5 COLS) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Sản phẩm bán chạy nhất</h3>
                <p className="text-xs text-slate-500">Xếp hạng theo sản lượng tuần này</p>
              </div>
              <Link
                to="/admin/products"
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5"
              >
                Xem kho <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
              {TOP_PRODUCTS.map((prod, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                      0{idx + 1}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate">{prod.name}</span>
                      <span className="text-[11px] text-slate-400">{prod.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-black text-slate-900">{prod.sales} cái</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{prod.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT ORDERS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Tổng đơn hàng nhất cần điều phối</h3>
              <p className="text-xs text-slate-500">Ưu tiên đơn có yêu cầu kỹ thuật đan cước xưởng BWF</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả đơn</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Mã đơn & Thời gian</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Sản phẩm & Yêu cầu cước</th>
                  <th className="py-3 px-4">Tổng tiền</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 align-top">
                      <span className="font-bold text-slate-900 block">{order.code}</span>
                      <span className="text-[11px] text-slate-400">{order.time}</span>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <span className="font-bold text-slate-900 block">{order.customer}</span>
                      <span className="text-[11px] text-slate-500">{order.phone}</span>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <span className="font-bold text-slate-900 block">{order.product}</span>
                      <span className="text-[11px] text-secondary font-semibold">{order.stringReq}</span>
                    </td>
                    <td className="py-4 px-4 align-top font-black text-slate-900">
                      {formatPrice(order.amount)}
                    </td>
                    <td className="py-4 px-4 align-top">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {order.statusLabel}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-top text-right">
                      <Link
                        to={`/admin/orders`}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors inline-block"
                      >
                        Điều phối
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
