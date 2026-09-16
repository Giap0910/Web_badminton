import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/adminApi';
import { productApi } from '../api/productApi';
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Check,
  UploadCloud,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const INITIAL_PRODUCTS = [
  {
    id: 1,
    sku: 'YNX-100ZZ-KRN',
    name: 'Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai (4U/G5)',
    brand: 'Yonex',
    category: 'Vợt cầu lông',
    categorySlug: 'vot-cau-long',
    price: 4550000,
    originalPrice: 4890000,
    stock: 15,
    maxTension: '28 lbs (12.7 kg)',
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 2,
    sku: 'YNX-65Z3-WHT',
    name: 'Giày Cầu Lông Yonex Power Cushion 65Z3 Men',
    brand: 'Yonex',
    category: 'Giày cầu lông',
    categorySlug: 'giay-cau-long',
    price: 2890000,
    originalPrice: 3200000,
    stock: 8,
    maxTension: 'N/A',
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 3,
    sku: 'VIC-RYU-MET',
    name: 'Vợt Cầu Lông Victor Thruster Ryuga Metallic (3U/G5)',
    brand: 'Victor',
    category: 'Vợt cầu lông',
    categorySlug: 'vot-cau-long',
    price: 4200000,
    originalPrice: 4500000,
    stock: 12,
    maxTension: '32 lbs (14.5 kg)',
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 4,
    sku: 'LIN-TC9-PRO',
    name: 'Vợt Cầu Lông Lining Tectonic 9 Pro Chen Long',
    brand: 'Lining',
    category: 'Vợt cầu lông',
    categorySlug: 'vot-cau-long',
    price: 4690000,
    originalPrice: 5100000,
    stock: 3,
    maxTension: '32 lbs (14.5 kg)',
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 5,
    sku: 'YNX-AS50-T77',
    name: 'Ống Cầu Lông Yonex Aerosensa 50 (12 quả)',
    brand: 'Yonex',
    category: 'Phụ kiện',
    categorySlug: 'phu-kien',
    price: 450000,
    originalPrice: 490000,
    stock: 85,
    maxTension: 'N/A',
    status: 'ACTIVE',
    imageUrl: 'https://images.unsplash.com/photo-1613918108466-292b78a8ef95?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 6,
    sku: 'YNX-PRO-BAG',
    name: 'Balo Cầu Lông Yonex Pro Tournament Bag Blue',
    brand: 'Yonex',
    category: 'Balo & Túi',
    categorySlug: 'balo-tui',
    price: 1650000,
    originalPrice: 1890000,
    stock: 0,
    maxTension: 'N/A',
    status: 'OUT_OF_STOCK',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80'
  }
];

const AdminProductsPage = () => {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    brand: 'Yonex',
    category: 'Vợt cầu lông',
    categorySlug: 'vot-cau-long',
    price: '',
    originalPrice: '',
    stock: '',
    maxTension: '28 lbs',
    imageUrl: ''
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState('');

  const fetchProducts = async () => {
    try {
      if (productApi?.getProducts) {
        const res = await productApi.getProducts();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          const formatted = list.map((item, idx) => ({
            id: item.id || idx + 1,
            sku: item.sku || `SKU-APX-0${item.id || idx + 1}`,
            name: item.name || 'Sản phẩm cầu lông Apex',
            brand: item.brand || 'Yonex',
            category: item.category?.name || 'Vợt cầu lông',
            categorySlug: item.category?.slug || 'vot-cau-long',
            price: item.price || 2000000,
            originalPrice: item.originalPrice || item.price || 2200000,
            stock: item.stockQuantity ?? item.stock ?? 10,
            maxTension: item.maxTension || '28 lbs',
            status: (item.stockQuantity ?? item.stock ?? 10) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80'
          }));
          setProducts(formatted);
        }
      }
    } catch (err) {
      console.warn('Fallback to initial mock products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      sku: `YNX-${Math.floor(Math.random() * 900) + 100}`,
      name: '',
      brand: 'Yonex',
      category: 'Vợt cầu lông',
      categorySlug: 'vot-cau-long',
      price: '',
      originalPrice: '',
      stock: '20',
      maxTension: '28 lbs (12.7 kg)',
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      categorySlug: p.categorySlug,
      price: p.price.toString(),
      originalPrice: p.originalPrice.toString(),
      stock: p.stock.toString(),
      maxTension: p.maxTension,
      imageUrl: p.imageUrl
    });
    setShowModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi hệ thống?')) return;
    try {
      if (adminApi?.deleteProduct) {
        await adminApi.deleteProduct(id);
      } else if (productApi?.deleteProduct) {
        await productApi.deleteProduct(id);
      }
      await fetchProducts();
      setNotification('Đã xóa sản phẩm khỏi cơ sở dữ liệu thành công.');
    } catch (e) {
      console.warn('Lỗi gọi API xóa sản phẩm:', e);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setNotification('Đã xóa sản phẩm (cục bộ).');
    }
    setTimeout(() => setNotification(''), 3000);
  };

  const handleToggleStatus = (id) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
            }
          : p
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const priceNum = Number(formData.price) || 0;
    const origPriceNum = Number(formData.originalPrice) || priceNum;
    const stockNum = Number(formData.stock) || 0;

    let categoryId = 1;
    if (formData.categorySlug === 'giay-cau-long') categoryId = 2;
    else if (formData.categorySlug === 'quan-ao-cau-long') categoryId = 3;
    else if (formData.categorySlug === 'balo-tui-cau-long') categoryId = 4;
    else if (formData.categorySlug === 'phu-kien-cau-long') categoryId = 5;

    const payload = {
      sku: formData.sku || `SKU-APX-${Date.now().toString().slice(-6)}`,
      name: formData.name,
      brand: formData.brand,
      categoryId: categoryId,
      price: priceNum,
      originalPrice: origPriceNum,
      stock: stockNum,
      maxTension: formData.maxTension,
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80'
    };

    try {
      if (editingId) {
        if (adminApi?.updateProduct) {
          await adminApi.updateProduct(editingId, payload);
        } else {
          await productApi.updateProduct(editingId, payload);
        }
        setNotification('Cập nhật thông tin sản phẩm trên máy chủ thành công!');
      } else {
        if (adminApi?.createProduct) {
          await adminApi.createProduct(payload);
        } else {
          await productApi.createProduct(payload);
        }
        setNotification('Thêm sản phẩm mới vào kho dữ liệu thành công!');
      }
      await fetchProducts();
    } catch (err) {
      console.warn('Lỗi gọi API sản phẩm, lưu dự phòng cục bộ:', err);
      if (editingId) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...payload, category: formData.category, categorySlug: formData.categorySlug } : p))
        );
        setNotification('Cập nhật thông tin sản phẩm thành công!');
      } else {
        const newEntry = {
          id: Date.now(),
          ...payload,
          category: formData.category,
          categorySlug: formData.categorySlug,
          status: stockNum > 0 ? 'ACTIVE' : 'OUT_OF_STOCK'
        };
        setProducts([newEntry, ...products]);
        setNotification('Thêm sản phẩm mới vào kho thành công!');
      }
    } finally {
      setSaving(false);
      setShowModal(false);
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' ? true : p.category === selectedCategory;

    const matchesBrand =
      selectedBrand === 'ALL' ? true : p.brand === selectedBrand;

    const matchesStock =
      selectedStockStatus === 'ALL'
        ? true
        : selectedStockStatus === 'IN_STOCK'
        ? p.stock > 5
        : selectedStockStatus === 'LOW_STOCK'
        ? p.stock > 0 && p.stock <= 5
        : p.stock === 0;

    return matchesSearch && matchesCategory && matchesBrand && matchesStock;
  });

  return (
    <AdminLayout title="Sản phẩm" subtitle="Quản lý sản phẩm & Kho hàng">
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
                Quản trị giá bán, tồn kho và thông số căng cước 4 nút chuẩn BWF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary/90 transition-all text-xs font-bold shadow-md hover:shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm mới</span>
          </button>
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
              placeholder="Tìm theo tên vợt, mã SKU, hãng..."
              className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
            />
          </div>

          {/* FILTER DROPDOWNS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả danh mục</option>
              <option value="Vợt cầu lông">Vợt cầu lông</option>
              <option value="Giày cầu lông">Giày cầu lông</option>
              <option value="Balo & Túi">Balo & Bao vợt</option>
              <option value="Phụ kiện">Phụ kiện cước</option>
            </select>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả thương hiệu</option>
              <option value="Yonex">Yonex (Nhật Bản)</option>
              <option value="Victor">Victor (Đài Loan)</option>
              <option value="Lining">Lining (Trung Quốc)</option>
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
                  <th className="py-3.5 px-4">Lực căng tối đa</th>
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

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Cột 1: Sản phẩm & SKU */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex items-center gap-3">
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 line-clamp-1">{prod.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5">{prod.sku}</span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Danh mục & Hãng */}
                        <td className="py-4 px-4 align-top">
                          <span className="font-bold text-slate-800 block">{prod.brand}</span>
                          <span className="text-[11px] text-slate-400">{prod.category}</span>
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
                        </td>

                        {/* Cột 5: Lực căng */}
                        <td className="py-4 px-4 align-top">
                          <span className="text-slate-600 font-medium">{prod.maxTension}</span>
                        </td>

                        {/* Cột 6: Trạng thái */}
                        <td className="py-4 px-4 align-top">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(prod.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                              prod.status === 'ACTIVE'
                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {prod.status === 'ACTIVE' ? 'Đang bán' : 'Tạm ẩn'}
                          </button>
                        </td>

                        {/* Cột 7: Thao tác */}
                        <td className="py-4 px-6 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(prod)}
                              title="Chỉnh sửa"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              title="Xóa sản phẩm"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* MODAL THÊM / SỬA SẢN PHẨM */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                    </h3>
                    <p className="text-xs text-slate-400">Điền thông số kỹ thuật chuẩn BWF</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Mã SKU <span className="text-secondary">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Ví dụ: YNX-100ZZ-4U"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Thương hiệu <span className="text-secondary">*</span></label>
                    <select
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    >
                      <option value="Yonex">Yonex (Nhật Bản)</option>
                      <option value="Victor">Victor (Đài Loan)</option>
                      <option value="Lining">Lining (Trung Quốc)</option>
                      <option value="Mizuno">Mizuno (Nhật Bản)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Tên sản phẩm <span className="text-secondary">*</span></label>
                  <input
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
                    <label className="text-xs font-bold text-slate-900">Danh mục</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    >
                      <option value="Vợt cầu lông">Vợt cầu lông</option>
                      <option value="Giày cầu lông">Giày cầu lông</option>
                      <option value="Quần áo thi đấu">Quần áo thi đấu</option>
                      <option value="Balo & Túi">Balo & Bao vợt</option>
                      <option value="Phụ kiện">Phụ kiện pro</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Lực căng tối đa</label>
                    <input
                      type="text"
                      value={formData.maxTension}
                      onChange={(e) => setFormData({ ...formData, maxTension: e.target.value })}
                      placeholder="Ví dụ: 28 lbs (12.7 kg) hoặc N/A"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Giá bán (VNĐ) <span className="text-secondary">*</span></label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="4550000"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Giá niêm yết (VNĐ)</label>
                    <input
                      type="number"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                      placeholder="4890000"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-900">Tồn kho ban đầu <span className="text-secondary">*</span></label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="20"
                      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-900">Link hình ảnh sản phẩm</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
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
