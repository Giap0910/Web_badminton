import React, { useState, useEffect } from 'react';
import { productApi } from '../api/productApi';
import { orderApi } from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Package, 
  ShoppingBag, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  X,
  Layers,
  AlertCircle
} from 'lucide-react';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'orders'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Product Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Yonex',
    price: '',
    originalPrice: '',
    stock: '',
    weightGrip: '4U-G5',
    stiffness: 'Stiff',
    balancePoint: 'Head-Heavy',
    maxTension: '28 lbs',
    playStyle: 'Tấn công uy lực',
    imageUrl: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodList, orderList] = await Promise.all([
        productApi.getProducts({}),
        orderApi.getAllOrders()
      ]);
      setProducts(prodList);
      setOrders(orderList);
    } catch (err) {
      console.error('Lỗi tải dữ liệu quản trị:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: 'Yonex',
      price: '',
      originalPrice: '',
      stock: '10',
      weightGrip: '4U-G5',
      stiffness: 'Stiff',
      balancePoint: 'Head-Heavy',
      maxTension: '28 lbs',
      playStyle: 'Tấn công uy lực',
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
      description: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      brand: p.brand,
      price: p.price,
      originalPrice: p.originalPrice || p.price,
      stock: p.stock,
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

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi hệ thống?')) return;
    try {
      await productApi.deleteProduct(id);
      fetchData();
    } catch (e) {
      alert('Không thể xóa sản phẩm');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productApi.updateProduct(editingProduct.id, formData);
      } else {
        await productApi.createProduct(formData);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi lưu sản phẩm');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      fetchData();
    } catch (e) {
      alert('Không thể cập nhật trạng thái đơn hàng');
    }
  };

  const totalRevenue = orders
    .filter((o) => o.status === 'PAID' || o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-8 rounded-3xl shadow-sm border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>KHU VỰC QUẢN TRỊ VIÊN (ROLE_ADMIN)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Quản Trị Hệ Thống SmashZone
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý kho hàng thời gian thực, điều phối đơn VietQR và kiểm soát tồn kho khóa tạm
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Cây Vợt Mới</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Tổng Mặt Hàng Vợt</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{products.length}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Đã nạp thông số kỹ thuật</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Tổng Đơn Hàng</span>
            <ShoppingBag className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{orders.length}</div>
          <span className="text-[11px] text-teal-700 font-semibold">Qua cổng VietQR PayOS</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Đơn Đã Thanh Toán (PAID)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {orders.filter((o) => o.status === 'PAID').length}
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">Khóa kho đã trừ đứt</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
            <span>Tổng Doanh Thu</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{formatPrice(totalRevenue)}</div>
          <span className="text-[11px] text-amber-700 font-semibold">Đối soát HMAC-SHA256</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Quản Lý Tồn Kho & Vợt Cầu Lông ({products.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Quản Lý Đơn Hàng VietQR ({orders.length})</span>
        </button>
      </div>

      {/* Tab Content: Products */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
              <tr>
                <th className="p-4">Hình ảnh</th>
                <th className="p-4">Tên Vợt</th>
                <th className="p-4">Hãng</th>
                <th className="p-4">Giá bán</th>
                <th className="p-4">Kho Khả Dụng</th>
                <th className="p-4">Khóa Tạm (15p)</th>
                <th className="p-4">Thông số kỹ thuật</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="p-4">
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover border" />
                  </td>
                  <td className="p-4 font-bold text-slate-900 max-w-[200px] truncate">
                    {p.name}
                  </td>
                  <td className="p-4 font-extrabold uppercase text-slate-700">
                    {p.brand}
                  </td>
                  <td className="p-4 font-black text-emerald-700">
                    {formatPrice(p.price)}
                  </td>
                  <td className="p-4 font-extrabold text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {p.stock} cây
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-bold ${p.reservedStock > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}>
                      {p.reservedStock || 0} cây
                    </span>
                  </td>
                  <td className="p-4 text-[11px] text-slate-500">
                    {p.weightGrip} • {p.balancePoint} • {p.stiffness}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
              <tr>
                <th className="p-4">Mã Đơn</th>
                <th className="p-4">Khách Hàng</th>
                <th className="p-4">SĐT</th>
                <th className="p-4">Tổng Tiền</th>
                <th className="p-4">Mã PayOS</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4">Ngày Tạo</th>
                <th className="p-4">Cập Nhật Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="p-4 font-black text-slate-900">#{o.id}</td>
                  <td className="p-4 font-bold text-slate-800">{o.customerName}</td>
                  <td className="p-4 text-slate-600">{o.shippingPhone}</td>
                  <td className="p-4 font-black text-emerald-700">{formatPrice(o.totalAmount)}</td>
                  <td className="p-4 font-mono font-bold text-slate-500">{o.payosOrderCode}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                      o.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      o.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      o.status === 'SHIPPING' ? 'bg-sky-100 text-sky-800' :
                      o.status === 'COMPLETED' ? 'bg-teal-100 text-teal-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">
                    {new Date(o.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-4">
                    <select
                      value={o.status}
                      onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PAID">PAID</option>
                      <option value="SHIPPING">SHIPPING</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b">
              <h3 className="text-lg font-black text-slate-900">
                {editingProduct ? 'Chỉnh Sửa Thông Số Vợt' : 'Thêm Cây Vợt Mới Vào Hệ Thống'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Tên Vợt *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Vợt Yonex Astrox 100ZZ Kurenai"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thương Hiệu *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Yonex">Yonex</option>
                    <option value="Victor">Victor</option>
                    <option value="Lining">Lining</option>
                    <option value="Mizuno">Mizuno</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số Lượng Tồn Kho Khả Dụng *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giá Bán (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giá Gốc Niêm Yết (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trọng Lượng & Cán (Weight/Grip)</label>
                  <input
                    type="text"
                    value={formData.weightGrip}
                    onChange={(e) => setFormData({ ...formData, weightGrip: e.target.value })}
                    placeholder="3U-G5 hoặc 4U-G5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Điểm Cân Bằng (Balance Point)</label>
                  <input
                    type="text"
                    value={formData.balancePoint}
                    onChange={(e) => setFormData({ ...formData, balancePoint: e.target.value })}
                    placeholder="Head-Heavy / Even / Head-Light"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Độ Cứng Thân Vợt (Stiffness)</label>
                  <input
                    type="text"
                    value={formData.stiffness}
                    onChange={(e) => setFormData({ ...formData, stiffness: e.target.value })}
                    placeholder="Extra Stiff / Stiff / Medium / Flexible"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mức Căng Tối Đa</label>
                  <input
                    type="text"
                    value={formData.maxTension}
                    onChange={(e) => setFormData({ ...formData, maxTension: e.target.value })}
                    placeholder="28 lbs (12.5 kg)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Lối Chơi Đề Xuất (Play Style)</label>
                  <input
                    type="text"
                    value={formData.playStyle}
                    onChange={(e) => setFormData({ ...formData, playStyle: e.target.value })}
                    placeholder="Ví dụ: Tấn công uy lực, smash bùng nổ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Link Ảnh Sản Phẩm (URL)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Mô Tả Sản Phẩm</label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow"
                >
                  {editingProduct ? 'Lưu Thay Đổi' : 'Thêm Vợt Vào Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
