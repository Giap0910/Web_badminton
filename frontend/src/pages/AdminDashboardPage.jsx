import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import AdminReportControls from '../components/AdminReportControls';
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

function reportNumber(value, label) {
  if (value == null || typeof value === 'string' && value.trim() === '' || !['number', 'string'].includes(typeof value)
    || !Number.isSafeInteger(Number(value)) || Number(value) < 0) throw new Error(`Dữ liệu ${label} không hợp lệ`);
  return Number(value);
}

export function normalizeDashboardOrder(order) {
  const id = Number.isSafeInteger(Number(order.id)) && Number(order.id) > 0 ? Number(order.id) : null;
  const created = order.createdAt ? new Date(order.createdAt) : null;
  return { id, code: id ? `#HG-${id}` : '—', customer: order.customerName || '—', phone: order.shippingPhone || '—',
    product: order.items?.[0]?.productName || '—', stringReq: order.items?.[0]?.stringingService
      ? `${order.items[0].stringingService}${order.items[0].stringTension ? ` (${order.items[0].stringTension})` : ''}` : '—',
    amount: order.totalAmount == null ? null : reportNumber(order.totalAmount, 'số tiền đơn'),
    time: created && Number.isFinite(created.getTime()) ? created.toLocaleString('vi-VN') : '—',
    statusLabel: order.status ? getOrderStatusLabel(order) : 'Chưa có thông tin' };
}

export function normalizeDashboardData(data) {
  if (!data || !Array.isArray(data.recentOrders) || !data.dailyRevenue || typeof data.dailyRevenue !== 'object'
    || Array.isArray(data.dailyRevenue)) throw new Error('Dữ liệu báo cáo không hợp lệ');
  const stats = Object.fromEntries([['totalRevenue', 'doanh thu'], ['totalOrders', 'tổng đơn hàng'],
    ['totalCustomers', 'tổng tài khoản'], ['pendingOrders', 'đơn chờ xử lý']].map(([key, label]) => [key, reportNumber(data[key], label)]));
  const entries = Object.entries(data.dailyRevenue).map(([day, value]) => [day, reportNumber(value, 'doanh thu theo ngày')]);
  const maximum = Math.max(...entries.map(([, value]) => value), 1);
  if (data.topSellingProducts != null && !Array.isArray(data.topSellingProducts)) throw new Error('Xếp hạng sản phẩm không hợp lệ');
  return { stats, chart: entries.map(([day, revenue]) => ({ day, revenue, height: Math.round(revenue / maximum * 100) })),
    recentOrders: data.recentOrders.map(normalizeDashboardOrder),
    unverified: data.unverifiedPaidOrders == null ? null : reportNumber(data.unverifiedPaidOrders, 'đơn chưa xác minh'),
    topSellingProducts: data.topSellingProducts?.map(product => ({ ...product,
      quantity: reportNumber(product.quantity, 'số lượng đã bán'),
      grossMerchandiseAmount: reportNumber(product.grossMerchandiseAmount, 'giá trị tiền hàng') })) ?? null };
}

const AdminDashboardPage = () => {
  const [dataError, setDataError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [range, setRange] = useState({ from: '', to: '' });
  const [unverified, setUnverified] = useState(null), [topSellingProducts, setTopSellingProducts] = useState(null);
  const requestId = useRef(0);
  const [stats, setStats] = useState({
    totalRevenue: 'Chưa tải',
    totalOrders: 'Chưa tải',
    totalCustomers: 'Chưa tải',
    pendingOrders: 'Chưa tải'
  });

  const formatPrice = (p) =>
    p == null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const handleRefresh = async () => {
    const request = ++requestId.current;
    setIsRefreshing(true);
    setDataError('');
    try {
      const res = await adminApi.getDashboardStats({ from: range.from || undefined, to: range.to || undefined });
      if (request !== requestId.current) return;
      const data = normalizeDashboardData(res?.data ?? res);
      setStats({ ...data.stats, totalRevenue: formatPrice(data.stats.totalRevenue) });setUnverified(data.unverified);
      setChartData(data.chart);setRecentOrders(data.recentOrders);setTopSellingProducts(data.topSellingProducts);
    } catch (err) {
      if (request === requestId.current) setDataError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.');
    } finally {
      if (request === requestId.current) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') handleRefresh(); }, 15000);
    return () => { clearInterval(timer); requestId.current++; };
  }, [range.from, range.to]);

  return (
    <AdminLayout title="Dashboard" subtitle="Báo cáo tổng quan hoạt động">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
      <div className="flex flex-col gap-6">
        {/* HEADER / ACTION BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Báo cáo tổng quan hoạt động
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Thống kê tổng hợp từ máy chủ theo dữ liệu đơn hàng và tài khoản hiện hành
            </p>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <AdminReportControls range={range} onRangeChange={setRange} />

            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
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
                  Tổng doanh thu ghi nhận
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                  {stats.totalRevenue}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-red-50 text-secondary flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Doanh thu tiền hàng sau ưu đãi, không bao gồm phí vận chuyển. Chỉ ghi nhận tiền PayOS đã xác nhận và tiền mặt/COD đã xác nhận thu. {unverified > 0 && `${unverified} đơn chưa có bằng chứng thu tiền.`}{unverified == null && ' Chưa có thống kê đơn chưa xác minh.'}</span>
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
                    {stats.totalOrders}
                  </span>
                  {stats.totalOrders !== 'Chưa tải' && (
                    <span className="text-xs text-slate-400 font-bold">đơn</span>
                  )}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-1.5 border-t border-slate-100">
              <span className="text-[11px] text-slate-600 font-bold">{range.from ? 'Đơn tạo hoặc thu tiền trong kỳ' : 'Toàn bộ đơn trong hệ thống'}</span>
            </div>
          </div>

          {/* Card 3: Tổng tài khoản */}
          <div className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0F172A]"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tổng tài khoản
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {stats.totalCustomers}
                  </span>
                  {stats.totalCustomers !== 'Chưa tải' && (
                    <span className="text-xs text-slate-400 font-bold">tài khoản</span>
                  )}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">Bao gồm tất cả tài khoản người dùng</span>
            </div>
          </div>

          {/* Card 4: Đơn chờ xử lý/thanh toán */}
          <div className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col justify-between">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Đơn hàng chờ xử lý/thanh toán
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-amber-600 tracking-tight">
                    {stats.pendingOrders}
                  </span>
                  {stats.pendingOrders !== 'Chưa tải' && (
                    <span className="text-xs text-slate-400 font-bold">đơn</span>
                  )}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-2 flex items-center gap-1.5 border-t border-slate-100">
              <span className="text-[11px] text-amber-700 font-bold">Trạng thái PENDING từ hệ thống</span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN SECTION: REVENUE CHART & TOP PRODUCTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* REVENUE CHART (7 COLS) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Doanh thu theo ngày nhận tiền</h3>
                <p className="text-xs text-slate-500">Theo khoảng báo cáo đã chọn; đơn gồm ngày tạo hoặc ngày thu tiền trong kỳ.</p>
              </div>
            </div>

            {/* CHART BARS */}
            {chartData.length > 0 ? (
              <div className="h-56 flex items-end gap-3 pt-6 px-2 border-b border-slate-100 overflow-x-auto">
                {chartData.map((item, idx) => (
                  <div key={idx} className="flex-1 min-w-16 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap pointer-events-none z-10 shadow-md">
                      {formatPrice(item.revenue)}
                    </div>
                    <div className="w-full bg-slate-100 rounded-t-xl h-44 flex items-end justify-center overflow-hidden">
                      <div
                        className={`w-full transition-all duration-500 rounded-t-xl ${
                          idx === chartData.length - 1
                            ? 'bg-secondary'
                            : 'bg-blue-600 group-hover:bg-blue-500'
                        }`}
                        style={{ height: `${Math.max(item.height, item.revenue > 0 ? 8 : 2)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{item.day}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                {stats.totalOrders === 'Chưa tải' ? 'Chưa tải được biểu đồ doanh thu' : 'Chưa có dữ liệu biểu đồ doanh thu'}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600"></span> Ngày nhận tiền trong báo cáo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-secondary"></span> Ngày cuối trên biểu đồ
              </span>
            </div>
          </div>

          {/* TOP SELLING PRODUCTS (5 COLS) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Sản phẩm bán chạy nhất</h3>
                <p className="text-xs text-slate-500">Xếp hạng theo số lượng đã bán trên đơn có bằng chứng thanh toán trong kỳ</p>
              </div>
              <Link
                to="/admin/products"
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-0.5"
              >
                Xem kho <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {topSellingProducts == null ? <div className="py-12 flex flex-col items-center justify-center text-center p-4">
              <Package className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">Chưa tải được xếp hạng</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Danh sách xếp hạng chưa được máy chủ cung cấp. Hãy làm mới báo cáo.
              </p>
            </div> : topSellingProducts.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Chưa có sản phẩm bán được xác minh trong kỳ.</p>
              : <ol className="space-y-3">{topSellingProducts.map((product, index) => <li key={`${product.productId ?? 'retired'}-${product.productSku ?? index}`}
                className="flex items-start gap-3 border-b border-slate-100 pb-3">
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">{index + 1}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900">{product.productName || 'Chưa có tên sản phẩm'}</p>
                  <p className="text-xs text-slate-500">{product.productSku || 'Chưa có mã sản phẩm'}{product.productDeleted === true && ' · Đã ngừng bán'}</p>
                  <p className="text-xs text-slate-600">{product.quantity.toLocaleString('vi-VN')} sản phẩm · Tiền hàng: {formatPrice(product.grossMerchandiseAmount)}</p></div>
              </li>)}</ol>}
            <p className="text-[11px] text-slate-500">Tiền hàng theo giá từng dòng đơn, trước voucher và đổi điểm, không gồm phí vận chuyển; chưa phân bổ giảm giá theo sản phẩm.</p>
          </div>
        </div>

        {/* RECENT ORDERS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Đơn hàng gần đây</h3>
              <p className="text-xs text-slate-500">5 đơn hàng mới nhất nhận từ hệ thống</p>
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
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      {stats.totalOrders === 'Chưa tải' ? 'Chưa tải được đơn hàng gần đây' : 'Chưa có đơn hàng nào'}
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
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
                          to={order.id ? `/admin/orders?search=${encodeURIComponent(order.code)}` : '/admin/orders'}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors inline-block"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
