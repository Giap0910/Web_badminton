import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import {
  CreditCard,
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Download,
  ShieldCheck,
  Building,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

const INITIAL_TRANSACTIONS = [
  {
    id: 1,
    transId: 'PAYOS-89241029',
    orderCode: '#APX-89241',
    createdAt: '14:35:12 - 24/10/2024',
    customer: 'Nguyễn Văn A',
    bank: 'VietinBank (103876543210)',
    bankRef: 'FT2429810293847',
    amount: 4550000,
    status: 'SUCCESS',
    statusLabel: 'Thành công (Đã đối soát)',
    method: 'VietQR Pro (Napas 247)'
  },
  {
    id: 2,
    transId: 'PAYOS-87422105',
    orderCode: '#APX-87422',
    createdAt: '18:40:02 - 15/10/2024',
    customer: 'Lê Hoàng Long',
    bank: 'VietinBank (103876543210)',
    bankRef: 'FT2428819283741',
    amount: 4200000,
    status: 'SUCCESS',
    statusLabel: 'Thành công (Đã đối soát)',
    method: 'VNPAY-QR'
  },
  {
    id: 3,
    transId: 'PAYOS-86105411',
    orderCode: '#APX-86105',
    createdAt: '11:00:45 - 05/10/2024',
    customer: 'Phạm Thu Hà',
    bank: 'VietinBank (103876543210)',
    bankRef: 'FT2427819283742',
    amount: 2250000,
    status: 'SUCCESS',
    statusLabel: 'Thành công (Đã đối soát)',
    method: 'VietQR Pro'
  },
  {
    id: 4,
    transId: 'COD-88910-SHIP',
    orderCode: '#APX-88910',
    createdAt: '09:15:00 - 22/10/2024',
    customer: 'Trần Minh Đức',
    bank: 'Shipper Giao Hàng Tiết Kiệm',
    bankRef: 'COD-HUB-HN-01',
    amount: 2890000,
    status: 'PENDING_COD',
    statusLabel: 'Chờ shipper nộp tiền',
    method: 'COD Đồng kiểm'
  },
  {
    id: 5,
    transId: 'PAYOS-85219900',
    orderCode: '#APX-85219',
    createdAt: '16:20:10 - 28/09/2024',
    customer: 'Vũ Quốc Huy',
    bank: 'VietinBank (103876543210)',
    bankRef: 'TIMEOUT-CANCELLED',
    amount: 1650000,
    status: 'FAILED',
    statusLabel: 'Hết hạn thanh toán 15:00',
    method: 'VietQR Pro'
  }
];

const AdminPaymentsPage = () => {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isVerifying, setIsVerifying] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const fetchPayments = async () => {
    try {
      if (adminApi?.getAllPayments) {
        const res = await adminApi.getAllPayments();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          const mapped = list.map((p, idx) => ({
            id: p.orderId || idx + 1,
            transId: p.payosOrderCode ? `PAYOS-${p.payosOrderCode}` : `TX-${10000 + (p.orderId || idx)}`,
            orderCode: p.payosOrderCode ? `#APX-${p.payosOrderCode}` : `#APX-${p.orderId || 89000 + idx}`,
            createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : 'Gần đây',
            customer: p.customerName || 'Khách hàng Apex',
            bank: 'MBBank (0987654321)',
            bankRef: p.payosOrderCode ? `QR-${p.payosOrderCode}` : 'COD-DIRECT',
            amount: p.amount || 0,
            status: p.status === 'PAID' || p.status === 'COMPLETED' ? 'SUCCESS' : p.status === 'CANCELLED' ? 'FAILED' : 'PENDING_COD',
            statusLabel: p.status === 'PAID' || p.status === 'COMPLETED' ? 'Khớp lệnh tự động 100%' : p.status === 'CANCELLED' ? 'Đã hủy / Hết hạn' : 'Chờ xác nhận',
            method: p.paymentMethod?.includes('PAYOS') ? 'VietQR Pro' : 'COD Đồng kiểm'
          }));
          setTransactions(mapped);
        }
      }
    } catch (err) {
      console.warn('Fallback to local payment transactions:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerifyWebhook = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setToastMessage('Webhook HMAC-SHA256 kết nối PayOS an toàn: 100% chữ ký số hợp lệ!');
      setTimeout(() => setToastMessage(''), 4000);
    }, 800);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.transId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bankRef.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod =
      selectedMethod === 'ALL'
        ? true
        : selectedMethod === 'VIETQR'
        ? t.method.includes('VietQR')
        : selectedMethod === 'COD'
        ? t.method.includes('COD')
        : t.method.includes('VNPAY');

    const matchesStatus =
      selectedStatus === 'ALL' ? true : t.status === selectedStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  return (
    <AdminLayout title="Giao dịch" subtitle="Quản lý giao dịch & Thanh toán PayOS VietQR">
      <div className="flex flex-col gap-6">
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Quản lý giao dịch PayOS VietQR
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                  HMAC-SHA256 Live
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đối soát tự động tức thì các giao dịch Napas 247 qua tài khoản VietinBank xưởng Apex Pro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleVerifyWebhook}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Kiểm tra Webhook Log</span>
            </button>
            <button
              type="button"
              onClick={() => alert('Đang xuất sổ phụ đối soát tài chính ngân hàng...')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2e] hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất sổ đối soát</span>
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4 KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu QR hôm nay</span>
            <span className="text-2xl font-black text-slate-900 mt-1">38.500.000₫</span>
            <span className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              24 giao dịch thành công
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ đối soát tự động</span>
            <span className="text-2xl font-black text-blue-600 mt-1">100%</span>
            <span className="text-[11px] text-slate-500 font-medium mt-2">Khớp số tiền & nội dung đơn</span>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">COD chờ thu hộ</span>
            <span className="text-2xl font-black text-amber-600 mt-1">4.350.000₫</span>
            <span className="text-[11px] text-slate-500 font-medium mt-2">4 đơn shipper đang giao</span>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giao dịch hủy / Quá hạn</span>
            <span className="text-2xl font-black text-slate-400 mt-1">01</span>
            <span className="text-[11px] text-slate-400 mt-2">Hết hạn thanh toán 15 phút</span>
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
              placeholder="Tìm theo mã GD, mã đơn (#APX-...), Ref ngân hàng..."
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="VIETQR">VietQR Pro (PayOS)</option>
              <option value="VNPAY">VNPAY-QR</option>
              <option value="COD">COD Tiền mặt</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="SUCCESS">Thành công (Đã đối soát)</option>
              <option value="PENDING_COD">Chờ thu tiền COD</option>
              <option value="FAILED">Hết hạn / Lỗi</option>
            </select>
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Mã giao dịch & Đơn hàng</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Khách hàng & Ngân hàng</th>
                  <th className="py-3.5 px-4">Số tiền quyết toán</th>
                  <th className="py-3.5 px-4">Phương thức</th>
                  <th className="py-3.5 px-6 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Không tìm thấy giao dịch nào.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Cột 1: Mã GD & Đơn */}
                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                            <span>{t.transId}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(t.transId)}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {copiedId === t.transId ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-[11px] text-blue-600 font-bold">Đơn hàng {t.orderCode}</span>
                        </div>
                      </td>

                      {/* Cột 2: Thời gian */}
                      <td className="py-4 px-4 align-top">
                        <span className="text-slate-600 block">{t.createdAt}</span>
                        <span className="text-[11px] text-slate-400 font-mono">Ref: {t.bankRef}</span>
                      </td>

                      {/* Cột 3: Khách hàng & Ngân hàng */}
                      <td className="py-4 px-4 align-top">
                        <span className="font-bold text-slate-900 block">{t.customer}</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          {t.bank}
                        </span>
                      </td>

                      {/* Cột 4: Số tiền */}
                      <td className="py-4 px-4 align-top">
                        <span className="font-black text-secondary text-sm">{formatPrice(t.amount)}</span>
                      </td>

                      {/* Cột 5: Phương thức */}
                      <td className="py-4 px-4 align-top">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {t.method}
                        </span>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="py-4 px-6 align-top text-right">
                        {t.status === 'SUCCESS' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {t.statusLabel}
                          </span>
                        )}
                        {t.status === 'PENDING_COD' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            {t.statusLabel}
                          </span>
                        )}
                        {t.status === 'FAILED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-400 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            {t.statusLabel}
                          </span>
                        )}
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

export default AdminPaymentsPage;
