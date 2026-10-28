import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import { productApi } from '../api/productApi';
import { saveAdminFile } from '../components/AdminProductImport';
import { canonicalProductBrand } from '../utils/adminProductForm';
import { formatDate } from '../utils/formatters';
import {
  Star,
  ShieldCheck,
  RotateCcw,
  Search,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  CornerDownRight,
  Send,
  Calendar,
  X,
  Award,
  Check
} from 'lucide-react';



const RMA_STATUS_LABELS = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt, chờ đổi hàng', REJECTED: 'Đã từ chối', COMPLETED: 'Đã hoàn tất đổi hàng' };

export function normalizeAdminReview(review) {
  return { ...review, customerName: review.userFullName || review.username || 'Chưa có thông tin',
    productName: review.productName || 'Sản phẩm đã ngừng bán', productBrand: review.productBrand || 'Chưa có thông tin',
    rating: Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 ? review.rating : null,
    isVisible: review.visible === true, verifiedPurchase: review.verifiedPurchase === true,
    createdAtLabel: formatDate(review.createdAt), replyUpdatedAtLabel: formatDate(review.replyUpdatedAt),
    purchasedSpec: review.purchasedSpec || [review.selectedSize, review.selectedColor, review.selectedWeight].filter(Boolean).join(' / '),
    comment: review.comment || '', officialReply: review.officialReply || null };
}

export function normalizeAdminRma(rma) {
  return { ...rma, rmaCode: rma.id ? `RMA-${rma.id}` : '—', orderCode: rma.orderId ? `#HG-${rma.orderId}` : '—',
    createdAtLabel: formatDate(rma.createdAt), completedAtLabel: formatDate(rma.completedAt),
    customerName: rma.userFullName || 'Chưa có thông tin', customerPhone: rma.customerPhone || '—',
    productName: rma.productName || 'Chưa có thông tin', serial: rma.serialNumber || '—',
    reasonDetail: rma.reason || 'Chưa có thông tin', statusLabel: RMA_STATUS_LABELS[rma.status] || 'Chưa xác minh trạng thái' };
}

export function replacementOptions(rma, products) {
  const quantity = Number(rma.quantity), categoryId = Number(rma.categoryIdSnapshot);
  const brand = canonicalProductBrand(rma.brandSnapshot);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || !categoryId || !brand) return [];
  return products.filter(product => product.catalogVisible === true && Number.isSafeInteger(Number(product.id)) && Number(product.id) > 0
    && Number(product.categoryId) === categoryId && canonicalProductBrand(product.brand) === brand)
    .flatMap(product => (product.variants || []).filter(variant => variant.active === true && !variant.legacy
      && Number.isSafeInteger(Number(variant.id)) && Number(variant.id) > 0
      && Number.isSafeInteger(Number(variant.stock)) && Number(variant.stock) >= quantity)
      .map(variant => ({ id: variant.id, productId: product.id, sameProduct: Number(product.id) === Number(rma.productIdSnapshot),
        original: Number(product.id) === Number(rma.productIdSnapshot) && Number(variant.id) === Number(rma.originalVariantId),
        label: `${product.name} · ${[variant.color, variant.size, variant.weightGrip, variant.packaging].filter(Boolean).join(' / ') || 'Tiêu chuẩn'} · Khả dụng: ${variant.stock}`, stock: variant.stock })))
    .sort((a, b) => Number(b.original) - Number(a.original) || Number(b.sameProduct) - Number(a.sameProduct));
}

export function exportRmaSheet(rma) {
  const safe = value => {
    const text = String(value ?? '');
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`;
  };
  const rows = [['Mã RMA', 'Đơn hàng', 'Sản phẩm', 'Mã sản phẩm', 'Kích cỡ', 'Màu sắc', 'Trọng lượng', 'Số lượng', 'Serial',
    'Khách hàng', 'Ngày gửi', 'Trạng thái', 'Lý do', 'Ghi chú quản trị', 'Biến thể đổi', 'Sản phẩm đổi', 'Mã hàng đổi',
    'Kích cỡ đổi', 'Màu đổi', 'Trọng lượng đổi', 'Quy cách đổi', 'Ngày hoàn tất'],
    [rma.rmaCode, rma.orderCode, rma.productName, rma.productSku, rma.selectedSize, rma.selectedColor, rma.selectedWeight,
      rma.quantity, rma.serial, rma.customerName, rma.createdAtLabel, rma.statusLabel, rma.reason, rma.adminNote, rma.replacementVariantId,
      rma.replacementProductName, rma.replacementSku, rma.replacementSize, rma.replacementColor, rma.replacementWeightGrip, rma.replacementPackaging, rma.completedAtLabel]];
  saveAdminFile(new Blob(['\uFEFF' + rows.map(row => row.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `phieu-rma-${rma.id}.csv`);
}

const AdminReviewsPage = () => {
  const [dataError, setDataError] = useState('');
  const [mainTab, setMainTab] = useState('REVIEWS'); // 'REVIEWS' | 'RMAS'
  const [reviews, setReviews] = useState([]);
  const [rmas, setRmas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Reply Modal State
  const [replyModalReview, setReplyModalReview] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [rmaError, setRmaError] = useState('');
  const [rmaLoading, setRmaLoading] = useState(true);
  const [rmaBusy, setRmaBusy] = useState(false);
  const [rmaToast, setRmaToast] = useState('');
  const [rmaModal, setRmaModal] = useState(null);
  const [replacementChoices, setReplacementChoices] = useState([]);
  const [replacementVariantId, setReplacementVariantId] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [replacementLoading, setReplacementLoading] = useState(false);
  const rmaLock = useRef(false), replacementGeneration = useRef(0), rmaLoadGeneration = useRef(0), mounted = useRef(true);
  const [reviewLoading, setReviewLoading] = useState(true), [reviewBusy, setReviewBusy] = useState(false);
  const reviewLock = useRef(false), reviewLoadGeneration = useRef(0);

  const fetchRmas = async () => {
    const generation = ++rmaLoadGeneration.current;
    setRmaLoading(true);
    try {
      const res = await adminApi.getAllReturns(), list = Array.isArray(res) ? res : res?.data;
      if (!Array.isArray(list)) throw new Error('Dữ liệu yêu cầu bảo hành không hợp lệ');
      if (mounted.current && generation === rmaLoadGeneration.current) { setRmas(list.map(normalizeAdminRma)); setRmaError(''); }
      return true;
    } catch (err) {
      if (mounted.current && generation === rmaLoadGeneration.current) setRmaError(err.response?.data?.message || err.message || 'Không thể tải yêu cầu bảo hành.');
      return false;
    } finally { if (mounted.current && generation === rmaLoadGeneration.current) setRmaLoading(false); }
  };

  const fetchReviewsAndRmas = async () => {
    const generation = ++reviewLoadGeneration.current;setReviewLoading(true);
    try {
      const res = await adminApi.getAllReviews(), list = Array.isArray(res) ? res : res?.data;
      if (!Array.isArray(list)) throw new Error('Dữ liệu đánh giá không hợp lệ');
      if (mounted.current && generation === reviewLoadGeneration.current) {setReviews(list.map(normalizeAdminReview));setDataError('');}
      return true;
    } catch (err) {
      if (mounted.current && generation === reviewLoadGeneration.current)
        setDataError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu đánh giá. Vui lòng thử lại.');
      return false;
    } finally {if (mounted.current && generation === reviewLoadGeneration.current) setReviewLoading(false);}
  };

  useEffect(() => {
    mounted.current = true;
    fetchReviewsAndRmas();
    fetchRmas();
    return () => { mounted.current = false; replacementGeneration.current += 1; rmaLoadGeneration.current += 1; reviewLoadGeneration.current += 1; };
  }, []);

  const saveReviewMutation = async (review, operation, confirm, message) => {
    if (reviewLock.current) return false;
    reviewLock.current = true;setReviewBusy(true);setDataError('');setToastMessage('');reviewLoadGeneration.current += 1;
    try {
      const response = await operation(), result = response?.data ?? response;
      if (Number(result?.id) !== Number(review.id) || !confirm(result)) throw new Error('Chưa xác nhận được kết quả đánh giá từ máy chủ. Vui lòng tải lại.');
      if (!mounted.current) return false;
      setReviews(previous => previous.map(item => Number(item.id) === Number(review.id) ? normalizeAdminReview(result) : item));
      if (!await fetchReviewsAndRmas()) throw new Error('Đã lưu đánh giá nhưng chưa tải lại được danh sách. Vui lòng làm mới.');
      if (!mounted.current) return false;
      setToastMessage(message);return true;
    } catch (error) {
      if (mounted.current) setDataError(error.response?.data?.message || error.message || 'Không thể cập nhật đánh giá.');
      return false;
    } finally {reviewLock.current = false;if (mounted.current) setReviewBusy(false);}
  };

  const handleToggleVisibility = async (id) => {
    const review = reviews.find(item => item.id === id);if (!review) return;
    const visible = !review.isVisible;
    await saveReviewMutation(review, () => adminApi.updateReviewVisibility(id, visible),
      result => result.visible === visible, visible ? 'Đã hiển thị đánh giá.' : 'Đã ẩn đánh giá.');
  };

  const handleOpenReply = (review) => {
    setReplyModalReview(review);
    setReplyContent(review.officialReply || '');
  };

  const handleSaveReply = async (e) => {
    e.preventDefault();
    if (!replyModalReview || replyContent.length > 2000) {setDataError('Phản hồi tối đa 2000 ký tự.');return;}
    const reply = replyContent.trim() || null;
    const done = await saveReviewMutation(replyModalReview, () => adminApi.replyReview(replyModalReview.id, reply),
      result => reply === null ? !result.officialReply : typeof result.officialReply === 'string' && !!result.officialReply.trim(),
      reply === null ? 'Đã xóa phản hồi.' : 'Đã lưu phản hồi.');
    if (done) setReplyModalReview(null);
  };

  const handleUpdateRMAStatus = async (rma, status, note = '', variantId) => {
    if (rmaLock.current) return;
    rmaLock.current = true; setRmaBusy(true); setRmaError(''); setRmaToast('');
    try {
      const result = await adminApi.updateReturnStatus(rma.id, status, note, variantId);
      if (Number(result?.id) !== Number(rma.id) || result.status !== status) throw new Error('Chưa xác nhận được trạng thái bảo hành từ máy chủ. Vui lòng tải lại.');
      if (status === 'COMPLETED' && Number(result.replacementVariantId) !== Number(variantId))
        throw new Error('Chưa xác nhận được đúng hàng đổi từ máy chủ. Vui lòng tải lại yêu cầu.');
      if (!mounted.current) return;
      setRmas(previous => previous.map(item => item.id === rma.id ? normalizeAdminRma(result) : item));
      if (await fetchRmas() === false) throw new Error('Đã lưu trạng thái nhưng chưa tải lại được danh sách. Vui lòng làm mới trước khi tiếp tục.');
      setRmaModal(null); setRmaToast(`Đã cập nhật: ${RMA_STATUS_LABELS[status]}`);
    } catch (err) {
      if (mounted.current) setRmaError(err.response?.data?.message || err.message || 'Không thể cập nhật yêu cầu bảo hành.');
    } finally { rmaLock.current = false; if (mounted.current) setRmaBusy(false); }
  };

  const closeRmaModal = () => {
    if (rmaLock.current) return;
    replacementGeneration.current += 1; setRmaModal(null); setReplacementLoading(false);
  };

  const openRmaModal = async (rma, status) => {
    if (rmaLock.current) return;
    const generation = ++replacementGeneration.current;
    setRmaModal({ rma, status }); setAdminNote(rma.adminNote || ''); setReplacementVariantId('');
    setRmaError(''); setRmaToast(''); setReplacementChoices([]);
    if (status !== 'COMPLETED') return;
    setReplacementLoading(true);
    try {
      if (!rma.categoryIdSnapshot || !rma.brandSnapshot) throw new Error('Yêu cầu cũ thiếu thông tin sản phẩm; cần đối soát trước khi đổi hàng.');
      const res = await productApi.getProducts({ categoryId: rma.categoryIdSnapshot, brand: rma.brandSnapshot, catalogScope: 'all' });
      const products = Array.isArray(res) ? res : res?.content;
      if (!Array.isArray(products)) throw new Error('Dữ liệu hàng đổi không hợp lệ');
      if (mounted.current && generation === replacementGeneration.current) setReplacementChoices(replacementOptions(rma, products));
    } catch (err) {
      if (mounted.current && generation === replacementGeneration.current) setRmaError(err.response?.data?.message || err.message || 'Không tải được hàng đổi.');
    } finally { if (mounted.current && generation === replacementGeneration.current) setReplacementLoading(false); }
  };

  const submitRma = async event => {
    event.preventDefault();
    const choice = replacementChoices.find(item => String(item.id) === replacementVariantId);
    if (rmaModal.status === 'COMPLETED' && (!choice || (!choice.original && !adminNote.trim()))) {
      setRmaError('Chọn hàng đổi đủ tồn kho. Đổi mẫu hoặc biến thể khác phải ghi nhận sự đồng ý của khách hàng.'); return;
    }
    if (rmaModal.status === 'REJECTED' && !adminNote.trim()) { setRmaError('Nhập lý do từ chối bảo hành.'); return; }
    await handleUpdateRMAStatus(rmaModal.rma, rmaModal.status, adminNote.trim(), choice?.id);
  };

  const downloadEvidence = async rma => {
    if (rmaLock.current) return;
    rmaLock.current = true; setRmaBusy(true); setRmaError('');
    try {
      const blob = await adminApi.getReturnEvidence(rma.id);
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[blob?.type];
      if (!extension || !blob.size) throw new Error('Minh chứng không phải ảnh hợp lệ');
      if (mounted.current) saveAdminFile(blob, `minh-chung-rma-${rma.id}.${extension}`);
    } catch (err) { if (mounted.current) setRmaError(err.response?.data?.message || err.message || 'Không tải được minh chứng hoặc không còn quyền truy cập.'); }
    finally { rmaLock.current = false; if (mounted.current) setRmaBusy(false); }
  };

  const filteredReviews = reviews.filter(
    (r) =>
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRmas = rmas.filter(
    (item) =>
      item.rmaCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const ratedReviews = reviews.filter(review => review.isVisible && review.rating != null);
  const ratingLabel = ratedReviews.length ? `${(ratedReviews.reduce((sum, review) => sum + review.rating, 0) / ratedReviews.length).toFixed(1)}★` : 'Chưa có đánh giá công khai';

  return (
    <AdminLayout title="Đánh giá & RMA" subtitle="Quản lý đánh giá & Yêu cầu đổi trả bảo hành">
      {dataError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError}</p>}
      <div className="flex flex-col gap-6">
        {/* HEADER & MAIN TAB SWITCHER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Đánh giá & Bảo hành RMA
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                  {ratingLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chăm sóc khách hàng, phản hồi đánh giá và bảo hành 1 đổi 1 trong 90 ngày
              </p>
            </div>
          </div>

          {/* 2 MAIN TABS */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setMainTab('REVIEWS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'REVIEWS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đánh giá sản phẩm ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setMainTab('RMAS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'RMAS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Yêu cầu bảo hành RMA ({rmas.length})
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* SEARCH ROW */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                mainTab === 'REVIEWS'
                  ? 'Tìm theo khách hàng, tên vợt, nhận xét...'
                  : 'Tìm theo mã RMA, số serial, tên khách...'
              }
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* TAB 1: PRODUCT REVIEWS */}
        {mainTab === 'REVIEWS' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-600">Mỗi khách hàng được đánh giá một lần cho sản phẩm đã thanh toán và hoàn tất đơn. Đánh giá không cộng điểm tích lũy.</p>
            <button type="button" disabled={reviewBusy || reviewLoading} onClick={fetchReviewsAndRmas} className="self-start rounded-xl border px-3 py-2 text-xs">Làm mới đánh giá</button>
            {reviewLoading && <p role="status">Đang tải đánh giá...</p>}
            {!reviewLoading && !dataError && !filteredReviews.length && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Không có đánh giá phù hợp.</p>}
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{rev.customerName}</span>
                      {rev.verifiedPurchase && <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Đã mua hàng
                      </span>}
                    </div>
                    <p className="text-xs text-blue-600 font-bold mt-1">{rev.productName}</p>
                    <span className="text-[11px] text-slate-400 font-medium">{rev.purchasedSpec}</span>
                    {rev.productDeleted && <span className="block text-xs text-amber-700">Sản phẩm đã ngừng bán</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{rev.createdAtLabel}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                {/* OFFICIAL REPLY */}
                {rev.officialReply ? (
                  <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-secondary flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-secondary" />
                        Phản hồi từ Ban Quản Trị HG Pro:
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed mt-0.5">{rev.officialReply}</p>
                    <span className="text-slate-400">Cập nhật: {rev.replyUpdatedAtLabel}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={reviewBusy || reviewLoading}
                    onClick={() => handleOpenReply(rev)}
                    className="self-start inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Trả lời đánh giá này với tư cách Quản trị viên</span>
                  </button>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Trạng thái: <strong className={rev.isVisible ? 'text-emerald-600' : 'text-slate-400'}>{rev.isVisible ? 'Đang hiển thị công khai' : 'Đã ẩn'}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    {rev.officialReply && (
                      <button
                        type="button"
                        disabled={reviewBusy || reviewLoading}
                        onClick={() => handleOpenReply(rev)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-bold"
                      >
                        Sửa phản hồi
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={reviewBusy || reviewLoading}
                      onClick={() => handleToggleVisibility(rev.id)}
                      className={`text-xs font-bold ${
                        rev.isVisible ? 'text-slate-500 hover:text-secondary' : 'text-blue-600 hover:underline'
                      }`}
                    >
                      {rev.isVisible ? 'Ẩn đánh giá' : 'Hiển thị lại'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: WARRANTY & RETURN RMA */}
        {mainTab === 'RMAS' && (
          <div className="flex flex-col gap-4">
            {rmaError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{rmaError}</p>}
            {rmaToast && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{rmaToast}</p>}
            <p className="text-xs text-slate-600">Bảo hành 1 đổi 1 trong 90 ngày cho vợt, giày, quần áo và balo/bao vợt; phụ kiện không áp dụng.</p>
            <button type="button" disabled={rmaBusy || rmaLoading} onClick={fetchRmas} className="self-start rounded-xl border px-3 py-2 text-xs">Làm mới yêu cầu bảo hành</button>
            {rmaLoading && <p role="status">Đang tải yêu cầu bảo hành...</p>}
            {!rmaLoading && !rmaError && !filteredRmas.length && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Không có yêu cầu bảo hành phù hợp.</p>}
            {filteredRmas.map((rma) => (
              <div
                key={rma.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-slate-900">{rma.rmaCode}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-bold text-slate-700">{rma.customerName}</span>
                    <span className="text-[10px] bg-red-50 text-secondary font-bold px-2 py-0.5 rounded">
                      {rma.orderCode}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                    {rma.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Sản phẩm & Mã Serial:</span>
                    <span className="font-bold text-slate-900">{rma.productName}</span>
                    {rma.productDeleted && <span className="block text-amber-700 mt-1">Sản phẩm gốc đã ngừng bán; đối chiếu thông tin đã lưu trên đơn hàng.</span>}
                    <span className="block text-slate-500 mt-1">{[rma.selectedSize && `Kích cỡ: ${rma.selectedSize}`, rma.selectedColor && `Màu: ${rma.selectedColor}`, rma.selectedWeight && `Trọng lượng: ${rma.selectedWeight}`].filter(Boolean).join(' · ') || 'Biến thể: chưa có thông tin'}</span>
                    <span className="block text-slate-500 mt-1">Số lượng bảo hành: {rma.quantity ?? '—'} · Ngày gửi: {rma.createdAtLabel}</span>
                    <span className="block text-slate-500 mt-1">Hạn bảo hành: {formatDate(rma.warrantyDeadline, false)}</span>
                    <span className="block text-slate-500 font-mono text-[11px] mt-0.5">Serial: {rma.serial}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Chi tiết phản ánh sự cố:</span>
                    <p className="text-slate-700 leading-relaxed mt-0.5">{rma.reasonDetail}</p>
                    <p className="text-slate-500 mt-1">Ghi chú quản trị: {rma.adminNote || '—'}</p>
                    {rma.evidenceAvailable === true ? <button type="button" disabled={rmaBusy} onClick={() => downloadEvidence(rma)} className="mt-1 text-blue-700 underline">Tải minh chứng bảo hành</button>
                      : <span className="block text-slate-500 mt-1">Chưa có minh chứng được lưu và xác thực.</span>}
                    {rma.status === 'COMPLETED' && <p className="mt-1 text-slate-500">Hàng đổi: {rma.replacementProductName || 'Chưa có thông tin'} · biến thể #{rma.replacementVariantId ?? '—'}
                      {[rma.replacementSize, rma.replacementColor, rma.replacementWeightGrip, rma.replacementPackaging].filter(Boolean).length > 0 && ` · ${[rma.replacementSize, rma.replacementColor, rma.replacementWeightGrip, rma.replacementPackaging].filter(Boolean).join(' / ')}`}
                      {` · Hoàn tất: ${rma.completedAtLabel}`}</p>}
                  </div>
                </div>

                {/* TIMELINE PROGRESS & ACTIONS */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Trạng thái bảo hành:</span>
                    <span className="font-bold text-slate-900">{rma.statusLabel}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {rma.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={rmaBusy || rmaLoading}
                        onClick={() => handleUpdateRMAStatus(rma, 'APPROVED')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold"
                      >
                        Duyệt bảo hành
                      </button>
                    )}
                    {rma.status === 'APPROVED' && (
                      <button
                        type="button"
                        disabled={rmaBusy || rmaLoading}
                        onClick={() => openRmaModal(rma, 'COMPLETED')}
                        className="px-3 py-1.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold"
                      >
                        Hoàn tất đổi hàng
                      </button>
                    )}
                    {['PENDING', 'APPROVED'].includes(rma.status) && <button type="button" disabled={rmaBusy || rmaLoading}
                      onClick={() => openRmaModal(rma, 'REJECTED')} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">Từ chối bảo hành</button>}
                    <button
                      type="button"
                      onClick={() => exportRmaSheet(rma)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                    >
                      Xuất phiếu RMA CSV
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {rmaModal && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={submitRma} role="dialog" aria-modal="true" aria-label="Xử lý yêu cầu bảo hành" className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="font-bold">{rmaModal.status === 'COMPLETED' ? 'Hoàn tất đổi hàng' : 'Từ chối bảo hành'} · {rmaModal.rma.rmaCode}</h3>
            <p className="text-sm text-slate-600">{rmaModal.rma.productName} · Số lượng: {rmaModal.rma.quantity ?? '—'}</p>
            {rmaError && <p role="alert" className="text-red-700">{rmaError}</p>}
            {rmaModal.status === 'COMPLETED' && <>
              <label className="block text-sm">Biến thể hàng đổi<select name="replacementVariantId" required value={replacementVariantId}
                disabled={rmaBusy || replacementLoading} onChange={event => setReplacementVariantId(event.target.value)} className="block w-full border rounded-xl p-2 mt-1">
                <option value="">{replacementLoading ? 'Đang tải hàng đổi...' : 'Chọn biến thể đủ tồn kho'}</option>
                {replacementChoices.map(choice => <option key={choice.id} value={choice.id}>{choice.original ? 'Đúng biến thể đã mua: ' : choice.sameProduct ? 'Cùng sản phẩm, khác biến thể: ' : 'Mẫu thay thế: '}{choice.label}</option>)}
              </select></label>
              {!replacementLoading && !replacementChoices.length && <p className="text-sm text-amber-700">Chưa có biến thể đủ hàng cùng hãng và danh mục. Bổ sung tồn kho rồi mở lại yêu cầu.</p>}
              <p className="text-xs text-slate-600">Ưu tiên đúng biến thể đã mua. Đổi kích cỡ, màu hoặc mẫu khác cùng hãng và danh mục phải ghi chú xác nhận khách đồng ý. Hàng lỗi không nhập lại kho bán.</p>
            </>}
            <label className="block text-sm">{rmaModal.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú đồng ý của khách (bắt buộc khi đổi mẫu, màu hoặc kích cỡ khác)'}
              <textarea name="rmaNote" maxLength={2000} required={rmaModal.status === 'REJECTED'} disabled={rmaBusy}
                value={adminNote} onChange={event => setAdminNote(event.target.value)} className="block w-full border rounded-xl p-2 mt-1" rows={3} /></label>
            <div className="flex gap-3 justify-end"><button type="button" disabled={rmaBusy} onClick={closeRmaModal} className="rounded-xl border px-4 py-2">Hủy</button>
              <button type="submit" disabled={rmaBusy || replacementLoading || (rmaModal.status === 'COMPLETED' && !replacementChoices.length)} className="rounded-xl bg-blue-600 text-white px-4 py-2 disabled:opacity-50">{rmaBusy ? 'Đang lưu...' : 'Xác nhận bảo hành'}</button></div>
          </form>
        </div>}

        {/* MODAL TRẢ LỜI ĐÁNH GIÁ */}
        {replyModalReview && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-label="Phản hồi đánh giá" className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Phản hồi bài đánh giá</h3>
                  <p className="text-xs text-slate-400">Khách hàng: {replyModalReview.customerName}</p>
                </div>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => setReplyModalReview(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <span className="font-bold text-slate-800">{replyModalReview.productName}</span>
                <p className="text-slate-600 mt-1 italic">"{replyModalReview.comment}"</p>
              </div>

              <form onSubmit={handleSaveReply} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Nội dung phản hồi chính thức</label>
                  <textarea
                    rows={4}
                    maxLength={2000}
                    disabled={reviewBusy}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Gửi lời cảm ơn khách hàng, tư vấn bảo dưỡng cước định kỳ hoặc hướng dẫn xử lý..."
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs p-3.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  ></textarea>
                  <span className="text-xs text-slate-500">Tối đa 2000 ký tự. Để trống và lưu để xóa phản hồi hiện tại.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={reviewBusy}
                    onClick={() => setReplyModalReview(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={reviewBusy || reviewLoading}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{reviewBusy ? 'Đang lưu...' : 'Lưu phản hồi'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReviewsPage;
