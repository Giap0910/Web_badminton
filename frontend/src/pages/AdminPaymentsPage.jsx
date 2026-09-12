import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  CreditCard,
  QrCode,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Send,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Mock Webhook Modal State
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockOrderCode, setMockOrderCode] = useState('');
  const [mockAmount, setMockAmount] = useState('');
  const [mockLoading, setMockLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllPayments();
      setPayments(data);
    } catch (err) {
      console.error('Lỗi tải danh sách thanh toán:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTriggerMockWebhook = async (e) => {
    e.preventDefault();
    if (!mockOrderCode || !mockAmount) {
      alert('Vui lòng nhập đầy đủ Mã PayOS (orderCode) và Số tiền!');
      return;
    }

    setMockLoading(true);
    try {
      await adminApi.triggerMockWebhook(Number(mockOrderCode), Number(mockAmount));
      showToast('Giả lập PayOS Webhook thành công! Đơn hàng đã được xác nhận thanh toán.');
      setMockModalOpen(false);
      setMockOrderCode('');
      setMockAmount('');
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi khi kích hoạt Webhook giả lập.');
    } finally {
      setMockLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.orderId?.toString().includes(searchTerm) ||
      p.payosOrderCode?.toString().includes(searchTerm) ||
      p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shippingPhone?.includes(searchTerm);
    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <AdminLayout
      title="Đối Soát Thanh Toán & VietQR"
      subtitle="Giám sát luồng tiền VietQR PayOS, đối soát chữ ký số HMAC-SHA256 và giao dịch COD"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold">Cổng VietQR PayOS</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">
            {payments.filter((p) => p.paymentMethod === 'PAYOS_VIETQR').length} Giao Dịch
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Chữ ký HMAC-SHA256 tự động
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold">Thanh Toán Tiền Mặt (COD)</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white">
            {payments.filter((p) => p.paymentMethod === 'COD').length} Giao Dịch
          </div>
          <p className="text-[11px] text-amber-400 font-semibold mt-2">
            Thu hộ tiền mặt khi nhận hàng
          </p>
        </div>

        {/* Action Button: Mock Webhook */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
              Kiểm Thử Localhost (No Ngrok)
            </span>
            <p className="text-[11px] text-slate-400">Tự tạo chữ ký HMAC giả lập tín hiệu ngân hàng</p>
          </div>
          <button
            onClick={() => setMockModalOpen(true)}
            className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Kích Hoạt Mock Webhook</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn, Mã PayOS, Khách hàng hoặc SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="PAYOS_VIETQR">Cổng PayOS VietQR</option>
              <option value="COD">Tiền mặt khi nhận (COD)</option>
            </select>
          </div>

          <button
            onClick={fetchPayments}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">Mã Đơn</th>
                <th className="p-4">Mã PayOS (orderCode)</th>
                <th className="p-4">Khách Hàng</th>
                <th className="p-4">Số Tiền</th>
                <th className="p-4">Phương Thức</th>
                <th className="p-4">Trạng Thái Đơn</th>
                <th className="p-4">Thời Gian Tạo</th>
                <th className="p-4 text-center">Kiểm Tra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    Đang tải lịch sử giao dịch...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.orderId} className="hover:bg-slate-900/50 transition">
                    <td className="p-4 font-mono font-bold text-white">#{p.orderId}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      {p.payosOrderCode ? p.payosOrderCode : '— (COD)'}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200">{p.customerName}</div>
                      <div className="text-[11px] text-slate-400">{p.shippingPhone}</div>
                    </td>
                    <td className="p-4 font-black text-red-400 text-sm">
                      {formatPrice(p.amount)}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          p.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {p.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="p-4 text-center">
                      {p.status === 'PENDING' && p.payosOrderCode && (
                        <button
                          onClick={() => {
                            setMockOrderCode(p.payosOrderCode);
                            setMockAmount(p.amount);
                            setMockModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold transition"
                        >
                          Giả lập thanh toán
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    Không tìm thấy giao dịch nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mock Webhook Modal */}
      {mockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Giả Lập Tín Hiệu PayOS Webhook
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống sẽ tạo payload chuẩn PayOS, ký chữ ký số <strong className="text-white">HMAC-SHA256</strong> bằng Checksum Key bảo mật và gửi tới endpoint <code className="text-red-400 bg-slate-950 px-1 py-0.5 rounded">/api/payment/payos-webhook</code>.
            </p>

            <form onSubmit={handleTriggerMockWebhook} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Mã PayOS (OrderCode) *</label>
                <input
                  type="number"
                  required
                  value={mockOrderCode}
                  onChange={(e) => setMockOrderCode(e.target.value)}
                  placeholder="Ví dụ: 171892019283"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Số Tiền Thanh Toán (VNĐ) *</label>
                <input
                  type="number"
                  required
                  value={mockAmount}
                  onChange={(e) => setMockAmount(e.target.value)}
                  placeholder="Ví dụ: 4350000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-amber-400/80 mt-1">
                  * Số tiền phải khớp 100% với giá trị đơn hàng để qua bước đối soát chống gian lận.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMockModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={mockLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-lg shadow-red-600/20 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {mockLoading ? 'Đang gửi...' : 'Gửi Tín Hiệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPaymentsPage;
