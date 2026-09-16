import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import UserLayout from '../components/UserLayout';
import { returnApi } from '../api/returnApi';
import { orderApi } from '../api/orderApi';
import {
  RotateCcw,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Image,
  FileText,
  Calendar,
  Check,
  X,
  PhoneCall,
  Search,
  UploadCloud,
  ChevronRight,
  ExternalLink,
  Award
} from 'lucide-react';

const MOCK_RETURNS = [
  {
    id: 1,
    rmaCode: '#RMA-2024-089',
    createdAt: '25/10/2024',
    status: 'IN_REVIEW',
    statusLabel: 'Đang thẩm định phòng lab',
    productName: 'Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai (4U/G5)',
    productImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
    serialNumber: 'SN: YNX-892410-JP',
    reasonCategory: 'Bảo hành khung vợt 90 ngày',
    reasonDetail: 'Nứt ngầm khung góc 10h khi đan cước BG80 Power mức 11.5kg, nghi ngờ lỗi carbon từ nhà sản xuất.',
    evidenceImages: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=300&q=80'
    ],
    timelineStep: 3, // 1: Tiếp nhận, 2: Gửi về xưởng, 3: Thẩm định BWF, 4: Đổi mới
    technicianNote: 'Kỹ thuật viên BWF đang soi laser kiểm tra vết nứt không có dấu hiệu va chạm ngoại lực. Dự kiến phản hồi kết quả trong 24h.'
  },
  {
    id: 2,
    rmaCode: '#RMA-2024-071',
    createdAt: '19/10/2024',
    status: 'COMPLETED',
    statusLabel: 'Đã đổi mới 100%',
    productName: 'Giày Cầu Lông Yonex Power Cushion 65Z3 Men',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
    serialNumber: 'SN: SH-65Z3-42EU',
    reasonCategory: 'Đổi size giày 7 ngày tận nhà',
    reasonDetail: 'Mang thử size 42 EU bị kích ngón út khi di chuyển bước chéo, yêu cầu đổi sang size 42.5 EU Form Wide.',
    evidenceImages: [],
    timelineStep: 4,
    technicianNote: 'Đã thu hồi size 42 và giao tận nhà đôi mới size 42.5 EU hoàn toàn miễn phí.'
  },
  {
    id: 3,
    rmaCode: '#RMA-2024-055',
    createdAt: '08/10/2024',
    status: 'COMPLETED',
    statusLabel: 'Đã xử lý xong',
    productName: 'Vợt Victor Thruster Ryuga Metallic (3U/G5)',
    productImage: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=400&q=80',
    serialNumber: 'SN: VIC-RYU-0941',
    reasonCategory: 'Bảo hành lót gen chống đứt cước',
    reasonDetail: 'Gen số 6 bị mòn gây cứa cước khi đập cầu smash.',
    evidenceImages: [],
    timelineStep: 4,
    technicianNote: 'Xưởng Apex Pro đã thay thế toàn bộ dải gen liên hoàn chính hãng Victor và căng lại cước mới miễn phí.'
  },
  {
    id: 4,
    rmaCode: '#RMA-2024-042',
    createdAt: '28/09/2024',
    status: 'RECEIVED',
    statusLabel: 'Chờ tiếp nhận tại xưởng',
    productName: 'Balo Cầu Lông Yonex Pro Tournament Bag',
    productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    serialNumber: 'SN: BAG-YXP-77',
    reasonCategory: 'Bảo hành khóa kéo phụ kiện',
    reasonDetail: 'Khóa kéo ngăn đựng giày bị kẹt đường rãnh.',
    evidenceImages: [],
    timelineStep: 1,
    technicianNote: 'Đã tạo vận đơn thu hồi qua bưu cục Viettel Post. Shipper sẽ đến lấy hàng trong ngày mai.'
  }
];

const ReturnRequestPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get('orderId');

  const [returnRequests, setReturnRequests] = useState(MOCK_RETURNS);
  const [paidOrders, setPaidOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Modal Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(preselectedOrderId || '1');
  const [selectedProduct, setSelectedProduct] = useState('Vợt Yonex Astrox 100ZZ Kurenai (4U/G5)');
  const [reasonCategory, setReasonCategory] = useState('Bảo hành khung vợt 90 ngày (Lỗi NSX/Nứt ngầm)');
  const [reasonDetail, setReasonDetail] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [returnsRes, ordersRes] = await Promise.all([
          returnApi.getMyReturns(),
          orderApi.getMyOrders(),
        ]);
        const returnsList = Array.isArray(returnsRes) ? returnsRes : returnsRes?.data || [];
        if (returnsList.length > 0) {
          const formatted = returnsList.map((item, idx) => ({
            id: item.id || idx + 1,
            rmaCode: `#RMA-2024-0${item.id || 89}`,
            createdAt: item.createdAt || '25/10/2024',
            status: item.status || 'IN_REVIEW',
            statusLabel: item.status === 'COMPLETED' ? 'Đã đổi mới 100%' : 'Đang thẩm định phòng lab',
            productName: item.productName || 'Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai (4U/G5)',
            productImage: item.productImage || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
            serialNumber: item.serialNumber || 'SN: YNX-892410-JP',
            reasonCategory: 'Bảo hành khung vợt 90 ngày',
            reasonDetail: item.reason || 'Nứt ngầm khung góc 10h khi đan cước.',
            evidenceImages: item.imageUrl ? [item.imageUrl] : [],
            timelineStep: item.status === 'COMPLETED' ? 4 : 3,
            technicianNote: 'Kỹ thuật viên BWF đang thẩm định độ giãn khung carbon.'
          }));
          setReturnRequests(formatted);
        }

        const ordersList = Array.isArray(ordersRes) ? ordersRes : ordersRes?.data || [];
        setPaidOrders(ordersList);
      } catch (err) {
        console.warn('API returns fallback to mock data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    if (preselectedOrderId) {
      setShowCreateModal(true);
    }
  }, [preselectedOrderId]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const newRMA = {
      id: Date.now(),
      rmaCode: `#RMA-2024-0${Math.floor(Math.random() * 900) + 100}`,
      createdAt: 'Vừa xong',
      status: 'RECEIVED',
      statusLabel: 'Tiếp nhận yêu cầu',
      productName: selectedProduct,
      productImage: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80',
      serialNumber: serialNumber || 'SN: APEX-SERIES-PRO',
      reasonCategory: reasonCategory,
      reasonDetail: reasonDetail,
      evidenceImages: [
        'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=300&q=80'
      ],
      timelineStep: 1,
      technicianNote: 'Hệ thống đã tự động tạo phiếu tiếp nhận. Kỹ thuật viên bảo hành Apex Lab sẽ liên hệ xác nhận trong 24 giờ làm việc.'
    };

    try {
      await returnApi.createReturnRequest({
        orderId: Number(selectedOrderId) || 1,
        reason: `${reasonCategory}: ${reasonDetail}`,
        imageUrl: null
      });
    } catch (err) {
      console.warn('API create return fallback to local state:', err);
    }

    setReturnRequests([newRMA, ...returnRequests]);
    setSubmitting(false);
    setShowCreateModal(false);
    setReasonDetail('');
    setSerialNumber('');
    setSuccessMsg('Tạo phiếu yêu cầu đổi trả & bảo hành thành công!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredReturns = returnRequests.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'RECEIVED') return r.status === 'RECEIVED';
    if (activeTab === 'IN_REVIEW') return r.status === 'IN_REVIEW';
    if (activeTab === 'COMPLETED') return r.status === 'COMPLETED';
    return true;
  });

  return (
    <UserLayout currentPage="Yêu cầu đổi trả & bảo hành" counts={{ returns: returnRequests.length }}>
      <div className="flex flex-col gap-6">
        {/* HEADER STRIP WITH TITLE & TRIGGER CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#131b2e] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">Yêu cầu đổi trả & bảo hành</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                  {returnRequests.length} yêu cầu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi sát sao tình trạng thẩm định phòng lab BWF và tiến độ gửi sản phẩm thay thế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all text-xs font-bold shadow-md hover:shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo yêu cầu mới</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* QUICK STATS & PROMO BANNER ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Yêu cầu hoàn tất</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">02</span>
              <span className="text-[11px] text-emerald-700 font-bold">Tỷ lệ hài lòng 100%</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/70 flex flex-col justify-between">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đang thẩm định phòng lab</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-secondary">01</span>
              <span className="text-[11px] text-slate-400">Phản hồi trong 24h</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#131b2e] to-[#00174b] text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-blue-200">Apex Lab Tech</span>
              <PhoneCall className="w-4 h-4 text-secondary" />
            </div>
            <div className="mt-1">
              <span className="text-xs font-bold block text-slate-200">Hotline Kỹ Thuật Bảo Hành</span>
              <span className="text-sm font-black text-white">1900 6886 (Nhánh 2)</span>
            </div>
          </div>
        </div>

        {/* TAB FILTERS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            Tất cả ({returnRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'RECEIVED'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            Chờ tiếp nhận (1)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('IN_REVIEW')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'IN_REVIEW'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            Đang thẩm định khung vợt (1)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'COMPLETED'
                ? 'bg-[#131b2e] text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
            }`}
          >
            Đã đổi mới / Hoàn tất (2)
          </button>
        </div>

        {/* RETURN CARDS LIST */}
        <div className="flex flex-col gap-5">
          {filteredReturns.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-7 flex flex-col gap-5 hover:border-slate-300 transition-all"
            >
              {/* TOP STRIP: RMA CODE & STATUS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black text-slate-900">{item.rmaCode}</span>
                  <span className="text-slate-300 text-xs">|</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Ngày gửi: {item.createdAt}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'IN_REVIEW' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      {item.statusLabel}
                    </span>
                  )}
                  {item.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {item.statusLabel}
                    </span>
                  )}
                  {item.status === 'RECEIVED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {item.statusLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* PRODUCT INFO & REASON */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 flex items-start gap-3.5">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 line-clamp-2">{item.productName}</span>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5">{item.serialNumber}</span>
                    <span className="text-[10px] bg-red-50 text-secondary px-2 py-0.5 rounded font-bold w-fit mt-1">
                      {item.reasonCategory}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Mô tả tình trạng từ khách hàng:</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {item.reasonDetail}
                  </p>

                  {item.evidenceImages && item.evidenceImages.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      {item.evidenceImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Minh chứng"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4-STEP PROGRESS TIMELINE */}
              <div className="pt-2">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                      item.timelineStep >= 1 ? 'bg-emerald-600' : 'bg-slate-200 text-slate-400'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">1. Tiếp nhận</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                      item.timelineStep >= 2 ? 'bg-emerald-600' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {item.timelineStep >= 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">2. Thu hồi xưởng</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                      item.timelineStep >= 3 ? (item.timelineStep === 3 ? 'bg-blue-600' : 'bg-emerald-600') : 'bg-slate-200 text-slate-400'
                    }`}>
                      {item.timelineStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">3. Thẩm định BWF</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                      item.timelineStep >= 4 ? 'bg-emerald-600' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {item.timelineStep >= 4 ? <Check className="w-3.5 h-3.5" /> : '4'}
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">4. Đổi mới 100%</span>
                  </div>
                </div>
              </div>

              {/* TECHNICIAN COMMENT BOX */}
              {item.technicianNote && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                  <Award className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-blue-900">Ý kiến chuyên viên Apex Lab:</span>
                    <span className="text-xs text-blue-800 leading-relaxed mt-0.5 font-normal">
                      {item.technicianNote}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* MODAL: TẠO YÊU CẦU ĐỔI TRẢ & BẢO HÀNH */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-secondary flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Tạo yêu cầu đổi trả & bảo hành</h3>
                    <p className="text-xs text-slate-400">Áp dụng cho đơn hàng trong vòng 90 ngày</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Chọn đơn hàng áp dụng <span className="text-secondary">*</span>
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  >
                    <option value="1">Đơn #APX-89241 - Vợt Yonex Astrox 100ZZ Kurenai (4U/G5)</option>
                    <option value="2">Đơn #APX-88910 - Giày Yonex Power Cushion 65Z3 Men</option>
                    <option value="3">Đơn #APX-87422 - Vợt Victor Thruster Ryuga Metallic</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Loại yêu cầu <span className="text-secondary">*</span>
                  </label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  >
                    <option value="Bảo hành khung vợt 90 ngày (Lỗi NSX/Nứt ngầm)">
                      Bảo hành khung vợt 90 ngày (Lỗi NSX / Nứt ngầm khi căng cước)
                    </option>
                    <option value="Đổi size giày 7 ngày miễn phí tận nhà">
                      Đổi size giày 7 ngày miễn phí tận nhà (Kích ngón / Không vừa)
                    </option>
                    <option value="Bảo hành phụ kiện đan cước / Lót gen BWF">
                      Bảo hành phụ kiện đan cước / Lót gen xưởng BWF
                    </option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Mã Serial khung vợt / Mã tem phân phối
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Ví dụ: YNX-892410-JP hoặc xem trên chóp cán vợt"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Mô tả chi tiết sự cố <span className="text-secondary">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    placeholder="Mô tả cụ thể góc nứt trên mặt vợt, mức cân cước lúc gặp lỗi, hoặc tình trạng kích size giày..."
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs p-3.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  ></textarea>
                </div>

                {/* IMAGE UPLOAD SIMULATION */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Ảnh chụp vết nứt / Tem phân phối</label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50">
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Tải ảnh chụp vết nứt hoặc tem bảo hành</span>
                    <span className="text-[11px] text-slate-400">Định dạng JPG, PNG tối đa 10MB</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi yêu cầu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default ReturnRequestPage;
