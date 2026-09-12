import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { productApi } from '../api/productApi';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Layers,
  Sparkles
} from 'lucide-react';

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const initialForm = {
    name: '',
    brand: 'Yonex',
    categoryId: 1,
    price: '',
    originalPrice: '',
    stock: 10,
    weightGrip: '4U-G5',
    stiffness: 'Stiff',
    balancePoint: 'Head-Heavy',
    maxTension: '28 lbs',
    playStyle: 'Tấn công uy lực',
    imageUrl: '',
    description: ''
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productApi.getProducts({});
      setProducts(data);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData(initialForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name || '',
      brand: p.brand || 'Yonex',
      categoryId: p.categoryId || 1,
      price: p.price || '',
      originalPrice: p.originalPrice || p.price || '',
      stock: p.stock ?? 10,
      weightGrip: p.weightGrip || '4U-G5',
      stiffness: p.stiffness || 'Stiff',
      balancePoint: p.balancePoint || 'Head-Heavy',
      maxTension: p.maxTension || '28 lbs',
      playStyle: p.playStyle || '',
      imageUrl: p.imageUrl || '',
      description: p.description || ''
    });
    setModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" khỏi hệ thống?`)) return;
    try {
      await productApi.deleteProduct(id);
      showToast('Đã xóa sản phẩm thành công!');
      fetchProducts();
    } catch (err) {
      alert('Không thể xóa sản phẩm do có đơn hàng liên quan.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : Number(formData.price),
        stock: Number(formData.stock),
        categoryId: Number(formData.categoryId)
      };

      if (editingProduct) {
        await productApi.updateProduct(editingProduct.id, payload);
        showToast('Cập nhật sản phẩm thành công!');
      } else {
        await productApi.createProduct(payload);
        showToast('Thêm sản phẩm mới thành công!');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'ALL' || p.brand?.toUpperCase() === selectedBrand.toUpperCase();
    return matchesSearch && matchesBrand;
  });

  return (
    <AdminLayout
      title="Quản Lý Sản Phẩm & Tồn Kho"
      subtitle="Quản lý toàn bộ danh mục vợt, giày, phụ kiện và theo dõi tồn kho thực tế"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action Header & Search */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm hoặc thương hiệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-red-500 transition"
            />
          </div>

          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Tất cả thương hiệu</option>
              <option value="YONEX">Yonex</option>
              <option value="VICTOR">Victor</option>
              <option value="LINING">Lining</option>
              <option value="MIZUNO">Mizuno</option>
            </select>
          </div>
        </div>

        {/* Add Product Button */}
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Sản Phẩm Mới</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4 w-16">Hình Ảnh</th>
                <th className="p-4">Tên Sản Phẩm</th>
                <th className="p-4">Hãng</th>
                <th className="p-4">Giá Bán</th>
                <th className="p-4">Giá Gốc</th>
                <th className="p-4">Tồn Kho</th>
                <th className="p-4">Khóa Tạm</th>
                <th className="p-4">Thông Số Kỹ Thuật</th>
                <th className="p-4 text-center w-24">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-4">
                      <img
                        src={p.imageUrl || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=200'}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                      />
                    </td>
                    <td className="p-4 font-bold text-white max-w-[240px]">
                      <div className="truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">ID: #{p.id}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[11px] border border-slate-700">
                        {p.brand}
                      </span>
                    </td>
                    <td className="p-4 font-black text-red-400">
                      {formatPrice(p.price)}
                    </td>
                    <td className="p-4 text-slate-400 line-through">
                      {p.originalPrice ? formatPrice(p.originalPrice) : '—'}
                    </td>
                    <td className="p-4 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          p.stock > 5
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.stock > 0
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.stock} cây
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[11px] font-medium ${
                          p.reservedStock > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {p.reservedStock || 0} cây
                      </span>
                    </td>
                    <td className="p-4 text-[11px] text-slate-400 max-w-[180px]">
                      <div className="truncate">{p.weightGrip || '4U-G5'} • {p.balancePoint || 'Head-Heavy'}</div>
                      <div className="text-[10px] text-slate-500 truncate">{p.playStyle || p.stiffness}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500">
                    Không tìm thấy sản phẩm nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-red-500" />
                  {editingProduct ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Thêm Sản Phẩm Mới Vào Hệ Thống'}
                </h3>
                <p className="text-xs text-slate-400">Điền thông số chuẩn BWF để hiển thị tối ưu trên trang chi tiết</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tên sản phẩm */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-300 block mb-1">Tên Sản Phẩm *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Vợt Cầu Lông Yonex Astrox 100ZZ Kurenai"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Hãng */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Thương Hiệu *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="Yonex">Yonex</option>
                    <option value="Victor">Victor</option>
                    <option value="Lining">Lining</option>
                    <option value="Mizuno">Mizuno</option>
                  </select>
                </div>

                {/* Danh mục */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Danh Mục Sản Phẩm *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value={1}>Vợt cầu lông</option>
                    <option value={2}>Giày cầu lông</option>
                    <option value={3}>Balo & Túi vợt</option>
                    <option value={4}>Phụ kiện & Cước đan</option>
                    <option value={5}>Quần áo thể thao</option>
                  </select>
                </div>

                {/* Giá bán */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Giá Bán Khuyến Mãi (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Ví dụ: 4350000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Giá gốc */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Giá Gốc Niêm Yết (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    placeholder="Ví dụ: 4800000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Tồn kho */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Số Lượng Tồn Kho Thực Tế *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Trọng lượng / Cán */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Trọng Lượng & Cán Vợt (Weight/Grip)</label>
                  <input
                    type="text"
                    value={formData.weightGrip}
                    onChange={(e) => setFormData({ ...formData, weightGrip: e.target.value })}
                    placeholder="4U-G5 hoặc 3U-G5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Điểm cân bằng */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Điểm Cân Bằng (Balance Point)</label>
                  <input
                    type="text"
                    value={formData.balancePoint}
                    onChange={(e) => setFormData({ ...formData, balancePoint: e.target.value })}
                    placeholder="Head-Heavy / Even / Head-Light"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Độ cứng thân vợt */}
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Độ Cứng (Stiffness)</label>
                  <input
                    type="text"
                    value={formData.stiffness}
                    onChange={(e) => setFormData({ ...formData, stiffness: e.target.value })}
                    placeholder="Stiff / Extra Stiff / Medium"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Lối chơi */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-300 block mb-1">Lối Chơi Phù Hợp (Play Style)</label>
                  <input
                    type="text"
                    value={formData.playStyle}
                    onChange={(e) => setFormData({ ...formData, playStyle: e.target.value })}
                    placeholder="Tấn công áp đảo, đập cầu uy lực từ cuối sân"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* URL Ảnh */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-300 block mb-1">Đường Dẫn Ảnh Đại Diện (Image URL)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Mô tả */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-300 block mb-1">Mô Tả Chi Tiết & Công Nghệ</label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Công nghệ Namd, Rotational Generator System..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-lg shadow-red-600/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : editingProduct ? 'Lưu Thay Đổi' : 'Tạo Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProductsPage;
