import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import ProductImage from '../components/ProductImage';
import AdminProductFields from '../components/AdminProductFields';
import AdminProductImport from '../components/AdminProductImport';
import AdminVariantInventory from '../components/AdminVariantInventory';
import { PRODUCT_BRANDS, productToAdminForm, buildAdminProductPayload, filterAdminProducts, adminProductFacts } from '../utils/adminProductForm';
import { adminApi } from '../api/adminApi';
import { productApi } from '../api/productApi';
import {
  Plus,
  Search,
  Edit3,
  Eye,
  EyeOff,
  Package,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';


const AdminProductsPage = () => {
  const [dataError, setDataError] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState('ALL');

  const [selectedVisibility, setSelectedVisibility] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(() => productToAdminForm());
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notification, setNotification] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const operationLock = useRef(false);

  const fetchProducts = async (signal) => {
    setLoading(true); setDataError('');
    try {
      const list = await productApi.getProducts({ catalogScope: 'all' }, { signal });
      if (signal?.aborted) return false;
      if (!Array.isArray(list)) throw new Error('Danh sách sản phẩm không hợp lệ.');
      setProducts(list);
      return true;
    } catch (error) {
      if (signal?.aborted) return false;
      setProducts([]);
      setDataError(error.response?.data?.message || 'Không tải được sản phẩm. Vui lòng thử lại.');
      return false;
    } finally { if (!signal?.aborted) setLoading(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    productApi.getCategories().then(list => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(list)) throw new Error();
      setCategories(list);
    }).catch(() => { if (!controller.signal.aborted) setCategoryError('Không tải được danh mục. Vui lòng tải lại trang trước khi lưu.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!showModal || saving) return;
    const closeOnEscape = event => { if (event.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showModal, saving]);

  const formatPrice = price => price == null ? 'Chưa có giá' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  const changeField = (key, value) => setFormData(previous => ({ ...previous, [key]: value }));
  const handleOpenAdd = () => {
    setEditingId(null); setFormError(''); setNotification('');
    setFormData(productToAdminForm());
    setShowModal(true);
  };

  const handleOpenEdit = async (product) => {
    if (operationLock.current) return;
    operationLock.current = true; setBusyId(product.id); setActionError(''); setNotification('');
    try {
      const current = await productApi.getProductById(product.id, { catalogScope: 'all' });
      setEditingId(current.id); setFormError('');
      setFormData(productToAdminForm(current)); setShowModal(true);
    } catch (error) { setActionError(error.response?.data?.message || 'Không tải được chi tiết sản phẩm.'); }
    finally { operationLock.current = false; setBusyId(null); }
  };

  const handleToggleStatus = async (product) => {
    if (operationLock.current) return;
    const visible = product.catalogVisible !== true;
    if (!window.confirm(`${visible ? 'Hiện' : 'Ẩn'} sản phẩm “${product.name}” ${visible ? 'trên' : 'khỏi'} cửa hàng? Dữ liệu và lịch sử đơn hàng được giữ nguyên.`)) return;
    operationLock.current = true; setBusyId(product.id); setActionError(''); setNotification('');
    try {
      await adminApi.updateProductVisibility(product.id, visible);
      setNotification(visible ? 'Đã hiện sản phẩm trên cửa hàng.' : 'Đã ẩn sản phẩm khỏi cửa hàng.');
      await fetchProducts();
    } catch (error) { setActionError(error.response?.data?.message || 'Không lưu được trạng thái sản phẩm.'); }
    finally { operationLock.current = false; setBusyId(null); }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (operationLock.current) return;
    let payload;
    try {
      if (categoryError) throw new Error('Vui lòng tải lại danh mục trước khi lưu.');
      payload = buildAdminProductPayload(formData, categories, editingId != null);
    } catch (error) { setFormError(error.message); return; }
    operationLock.current = true; setSaving(true); setFormError(''); setNotification('');
    try {
      if (editingId != null) await adminApi.updateProduct(editingId, payload);
      else await adminApi.createProduct(payload);
      setShowModal(false);
      setNotification(editingId != null ? 'Đã lưu thông tin sản phẩm.' : 'Đã thêm sản phẩm.');
      await fetchProducts();
    } catch (error) { setFormError(error.response?.data?.message || 'Không lưu được sản phẩm. Vui lòng kiểm tra và thử lại.'); }
    finally { operationLock.current = false; setSaving(false); }
  };

  const handleDelete = async product => {
    if (operationLock.current || !window.confirm(`Xóa sản phẩm “${product.name}” khỏi danh mục kinh doanh? Lịch sử đơn hàng và đánh giá được giữ lại. Đơn đang xử lý/giao hàng hoặc đổi trả chưa hoàn tất sẽ chặn xóa. Thao tác xóa không có nút khôi phục.`)) return;
    operationLock.current = true; setBusyId(product.id); setActionError('');
    try {
      await adminApi.deleteProduct(product.id); setNotification('Đã xóa sản phẩm khỏi danh mục; lịch sử giao dịch được giữ nguyên.');
      await fetchProducts();
    } catch (error) { setActionError(error.response?.data?.message || 'Không thể xóa sản phẩm.'); }
    finally { operationLock.current = false; setBusyId(null); }
  };

  const filteredProducts = filterAdminProducts(products, searchQuery, selectedCategory, selectedBrand, selectedStockStatus, selectedVisibility);
  const visibleCount = products.filter(product => product.catalogVisible === true && PRODUCT_BRANDS.includes(product.brand)).length;

  return (
    <AdminLayout title="Sản phẩm" subtitle="Quản lý sản phẩm & Kho hàng">
      {categoryError && <p role="alert" className="p-4 text-red-700">{categoryError}</p>}
      {dataError && <div role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{dataError} <button type="button" onClick={() => fetchProducts()} disabled={loading} className="ml-3 underline font-bold">Thử lại</button></div>}
      {actionError && <p role="alert" className="p-4 text-red-700 bg-red-50 rounded-xl">{actionError}</p>}
      <div className="flex flex-col gap-6">
        {/* HEADER & ACTION BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Quản lý sản phẩm
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                  {products.length} mặt hàng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý đủ 5 danh mục, thông số sản phẩm và trạng thái hiển thị
              </p>
            </div>
          </div>

          <div className="flex gap-2"><AdminProductImport onImported={fetchProducts} /><button
            type="button"
            onClick={handleOpenAdd}
            disabled={loading || saving || busyId != null || !!categoryError}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all text-xs font-bold shadow-md hover:shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm mới</span>
          </button></div>
        </div>

        {notification && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        {/* CONTROLS & FILTER ROW */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, mã SKU, hãng..."
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>

          {/* FILTER DROPDOWNS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select aria-label="Trạng thái hiển thị" value={selectedVisibility} onChange={event => setSelectedVisibility(event.target.value)} className="bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200">
              <option value="ALL">Tất cả trạng thái</option><option value="VISIBLE">Đang hiển thị</option><option value="HIDDEN">Đang ẩn</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả danh mục</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả thương hiệu</option>
              {PRODUCT_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
              {[...new Set(products.map(product => product.brand))].filter(brand => brand && !PRODUCT_BRANDS.includes(brand))
                .map(brand => <option key={brand} value={brand}>{brand} (ngoài phạm vi)</option>)}
            </select>

            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả tồn kho</option>
              <option value="IN_STOCK">Còn hàng (&gt;5)</option>
              <option value="LOW_STOCK">Sắp hết hàng (1-5)</option>
              <option value="OUT_OF_STOCK">Hết hàng (0)</option>
            </select>
          </div>
        </div>

        <p role="status" className="text-xs text-slate-600">{loading ? 'Đang tải sản phẩm...' : `Hiển thị ${filteredProducts.length}/${products.length} sản phẩm quản trị · ${visibleCount} trên cửa hàng · ${products.length - visibleCount} đang ẩn`}</p>
        {/* PRODUCTS TABLE VIEW */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3.5 px-6">Sản phẩm & SKU</th>
                  <th className="py-3.5 px-4">Danh mục & Hãng</th>
                  <th className="py-3.5 px-4">Giá niêm yết</th>
                  <th className="py-3.5 px-4">Tồn kho</th>
                  <th className="py-3.5 px-4">Thông số</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Không tìm thấy sản phẩm nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const isLowStock = prod.stock > 0 && prod.stock <= 5;
                    const isOutOfStock = prod.stock === 0;
                    const isVisible = prod.catalogVisible === true && PRODUCT_BRANDS.includes(prod.brand);
                    const visibilityDisabled = busyId != null || saving || (!isVisible && !PRODUCT_BRANDS.includes(prod.brand));

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Cột 1: Sản phẩm & SKU */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                              <ProductImage
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 line-clamp-1">{prod.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5">{prod.sku}</span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Danh mục & Hãng */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-bold text-slate-800 block">{prod.brand}</span>
                          <span className="text-[11px] text-slate-400">{prod.categoryName || 'Chưa có danh mục'}</span>
                        </td>

                        {/* Cột 3: Giá niêm yết */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-black text-secondary block">{formatPrice(prod.price)}</span>
                          {prod.originalPrice > prod.price && (
                            <span className="text-[11px] text-slate-400 line-through">
                              {formatPrice(prod.originalPrice)}
                            </span>
                          )}
                        </td>

                        {/* Cột 4: Tồn kho */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                isOutOfStock
                                  ? 'bg-red-50 text-red-700'
                                  : isLowStock
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {prod.stock} cái
                            </span>
                            {isLowStock && (
                              <span className="text-[10px] text-amber-600 font-bold">Sắp hết</span>
                            )}
                          </div>
                          <AdminVariantInventory product={prod} onSaved={fetchProducts} />
                        </td>

                        {/* Cột 5: Lực căng */}
                        <td className="py-4 px-4 align-top">
                          <span className="text-slate-600 font-medium">{adminProductFacts(prod)}</span>
                        </td>

                        {/* Cột 6: Trạng thái */}
                        <td className="py-4 px-4 align-top">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(prod)}
                            disabled={visibilityDisabled}
                            aria-label={`${isVisible ? 'Ẩn' : 'Hiện'} sản phẩm ${prod.name}`}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                              isVisible
                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {isVisible ? 'Đang hiển thị' : 'Đang ẩn'}
                          </button>
                        </td>

                        {/* Cột 7: Thao tác */}
                        <td className="py-4 px-6 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(prod)}
                              title="Chỉnh sửa"
                              aria-label={`Chỉnh sửa ${prod.name}`}
                              disabled={busyId != null || saving}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(prod)}
                              title={isVisible ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
                              aria-label={`${isVisible ? 'Ẩn khỏi' : 'Hiện trên'} cửa hàng: ${prod.name}`}
                              disabled={visibilityDisabled}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-red-50 transition-colors"
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}<span className="ml-1">{isVisible ? 'Ẩn' : 'Hiện'}</span>
                            </button>
                            <button type="button" onClick={() => handleDelete(prod)} disabled={busyId != null || saving}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" aria-label={`Xóa sản phẩm ${prod.name}`}>Xóa</button>
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

        {/* MODAL THÊM / SỬA SẢN PHẨM */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="product-modal-title" className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="product-modal-title" className="text-base font-black text-slate-900">
                      {editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                    </h3>
                    <p className="text-xs text-slate-400">Nhập thông tin thực tế theo danh mục đã chọn</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  aria-label="Đóng form sản phẩm"
                  disabled={saving}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {formError && <p role="alert" className="text-xs text-red-700 bg-red-50 p-3 rounded-xl">{formError}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-sku" className="text-xs font-bold text-slate-900">Mã SKU nội bộ (tùy chọn)</label>
                    <input id="product-sku"
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Để trống để máy chủ cấp mã HG theo danh mục"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-brand" className="text-xs font-bold text-slate-900">Thương hiệu <span className="text-secondary">*</span></label>
                    <select id="product-brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    >
                      {!PRODUCT_BRANDS.includes(formData.brand) && <option value={formData.brand}>{formData.brand} (ngoài phạm vi, cần chọn lại)</option>}
                      {PRODUCT_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="product-name" className="text-xs font-bold text-slate-900">Tên sản phẩm <span className="text-secondary">*</span></label>
                  <input id="product-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai"
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-categoryId" className="text-xs font-bold text-slate-900">Danh mục</label>
                    <select id="product-categoryId"
                      value={formData.categoryId}
                      disabled={editingId != null && formData.hasVariants}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                </div>

                <AdminProductFields form={formData} onChange={changeField} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-price" className="text-xs font-bold text-slate-900">Giá bán (VNĐ) <span className="text-secondary">*</span></label>
                    <input id="product-price"
                      type="number" min="1" max="9999999999" step="1"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="4550000"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-originalPrice" className="text-xs font-bold text-slate-900">Giá niêm yết (VNĐ)</label>
                    <input id="product-originalPrice"
                      type="number" min="0" max="9999999999" step="1"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      placeholder="4890000"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-stock" className="text-xs font-bold text-slate-900">{editingId != null ? 'Tồn kho khả dụng' : 'Tồn kho ban đầu'} <span className="text-secondary">*</span></label>
                    <input id="product-stock"
                      disabled={editingId != null && formData.hasVariants}
                      type="number" min="0" max="2147483647" step="1"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="20"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                    {editingId != null && formData.hasVariants && <p className="text-xs text-slate-500">Tổng được cộng tự động. Sửa số lượng tại “Tồn từng biến thể” trong bảng sản phẩm.</p>}
                  </div>
                </div>

                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">Ảnh sản phẩm đang tạm hoãn. Thao tác lưu này giữ nguyên ảnh hiện có.</p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !!categoryError}
                    className="px-6 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu sản phẩm'}
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

export default AdminProductsPage;
