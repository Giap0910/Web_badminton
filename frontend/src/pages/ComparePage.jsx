import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { useCart } from '../context/CartContext';
import { productApi } from '../api/productApi';
import { 
  Layers, 
  Trash2, 
  Plus, 
  ShoppingCart, 
  Check, 
  ArrowLeft,
  Flame,
  Wind,
  Target
} from 'lucide-react';

const ComparePage = () => {
  const { selectedRackets, removeRacket, clearComparison, addRacket } = useCompare();
  const { addToCart } = useCart();
  const [allProducts, setAllProducts] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const data = await productApi.getProducts({});
        setAllProducts(data);
      } catch (e) {
        console.error('Lỗi tải danh mục so sánh:', e);
      }
    };
    fetchAll();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getBalanceStyle = (point) => {
    if (!point) return 'bg-slate-100 text-slate-700';
    if (point.toLowerCase().includes('heavy')) return 'bg-rose-50 text-rose-700 font-bold border border-rose-200';
    if (point.toLowerCase().includes('light')) return 'bg-sky-50 text-sky-700 font-bold border border-sky-200';
    return 'bg-amber-50 text-amber-700 font-bold border border-amber-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-600 mb-1">
            <Layers className="w-4 h-4" />
            <span>TÍNH NĂNG ĐỘT PHÁ 1: CÔNG CỤ SO SÁNH THÔNG SỐ VỢT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bảng So Sánh Chi Tiết Vợt Cầu Lông ({selectedRackets.length}/3)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đặt cạnh tối đa 3 cây vợt để phân tích điểm cân bằng, độ cứng, trọng lượng và sức căng
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedRackets.length < 3 && (
            <button
              onClick={() => setSelectorOpen(!selectorOpen)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Vợt So Sánh</span>
            </button>
          )}
          {selectedRackets.length > 0 && (
            <button
              onClick={clearComparison}
              className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Racket Dropdown Panel */}
      {selectorOpen && (
        <div className="bg-white p-6 rounded-2xl border border-teal-200 shadow-md space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Chọn một cây vợt từ danh mục để thêm vào bảng so sánh:
            </h3>
            <button
              onClick={() => setSelectorOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Đóng
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
            {allProducts
              .filter((p) => !selectedRackets.some((r) => r.id === p.id))
              .map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                      <p className="text-[11px] text-emerald-700 font-bold">{formatPrice(p.price)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      addRacket(p);
                      if (selectedRackets.length >= 2) setSelectorOpen(false);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0"
                  >
                    Chọn
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {selectedRackets.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Chưa có cây vợt nào được chọn để so sánh</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy ghé qua trang sản phẩm và bấm biểu tượng "So Sánh" trên các cây vợt bạn đang phân vân!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Xem Danh Sách Vợt</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            {/* Header: Product Avatars */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="p-5 text-xs font-black uppercase text-slate-400 w-1/4">
                  Thuộc Tính Kỹ Thuật
                </th>
                {selectedRackets.map((racket) => (
                  <th key={racket.id} className="p-5 w-1/4">
                    <div className="space-y-3">
                      <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 max-w-[200px]">
                        <img
                          src={racket.imageUrl}
                          alt={racket.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeRacket(racket.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                          title="Xóa khỏi so sánh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {racket.brand}
                        </span>
                        <Link to={`/products/${racket.id}`}>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-emerald-600 transition-colors">
                            {racket.name}
                          </h3>
                        </Link>
                        <div className="text-sm font-black text-emerald-700 mt-1">
                          {formatPrice(racket.price)}
                        </div>
                      </div>
                      <button
                        onClick={() => addToCart(racket, 1)}
                        disabled={racket.stock <= 0}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                          racket.stock > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{racket.stock > 0 ? 'Thêm giỏ' : 'Hết hàng'}</span>
                      </button>
                    </div>
                  </th>
                ))}
                {/* Empty placeholder columns if less than 3 */}
                {[...Array(3 - selectedRackets.length)].map((_, i) => (
                  <th key={i} className="p-5 text-center w-1/4 border-l border-slate-100">
                    <button
                      onClick={() => setSelectorOpen(true)}
                      className="w-full aspect-square max-w-[200px] mx-auto rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-400 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-bold">Thêm vợt khác</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Row 1: Balance Point */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-700 bg-slate-50/30">
                  Điểm Cân Bằng (Balance Point)
                </td>
                {selectedRackets.map((r) => (
                  <td key={r.id} className="p-5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getBalanceStyle(r.balancePoint)}`}>
                      {r.balancePoint || 'Chưa rõ'}
                    </span>
                  </td>
                ))}
                {[...Array(3 - selectedRackets.length)].map((_, i) => (
                  <td key={i} className="p-5 text-slate-300">-</td>
                ))}
              </tr>

              {/* Row 2: Stiffness */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-700 bg-slate-50/30">
                  Độ Cứng Thân Vợt (Stiffness)
                </td>
                {selectedRackets.map((r) => (
                  <td key={r.id} className="p-5 font-bold text-slate-800">
                    {r.stiffness || 'Medium'}
                  </td>
                ))}
                {[...Array(3 - selectedRackets.length)].map((_, i) => (
                  <td key={i} className="p-5 text-slate-300">-</td>
                ))}
              </tr>

              {/* Row 3: Weight / Grip */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-700 bg-slate-50/30">
                  Trọng Lượng & Cán (Weight / Grip)
                </td>
                {selectedRackets.map((r) => (
                  <td key={r.id} className="p-5 font-semibold text-slate-700">
                    {r.weightGrip || '4U-G5'}
                  </td>
                ))}
                {[...Array(3 - selectedRackets.length)].map((_, i) => (
                  <td key={i} className="p-5 text-slate-300">-</td>
                ))}
              </tr>

              {/* Row 4: Max Tension */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-700 bg-slate-50/30">
                  Mức Căng Tối Đa (Max Tension)
                </td>
                {selectedRackets.map((r) => (
                  <td key={r.id} className="p-5 font-bold text-slate-800">
                    {r.maxTension || '28-30 lbs'}
                  </td>
                ))}
                {[...Array(3 - selectedRackets.length)].map((_, i) => (
                  <td key={i} className="p-5 text-slate-300">-</td>
                ))}
              </tr>

              {/* Row 5: Play Style */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-700 bg-slate-50/30">
                  Lối Chơi Đề Xuất (Play Style)
                </td>
                {selectedRackets.map((r) => (
                  <td key={r.id} className="p-5 font-semibold text-emerald-800 leading-relaxed">
                    {r.playStyle || 'Toàn diện'}
                  </td>
                ))}
                {[...Array(3 - selectedRackets.length)].map((_, i) => (
                  <td key={i} className="p-5 text-slate-300">-</td>
                ))}
              </tr>

              {/* Row 6: Stock */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-700 bg-slate-50/30">
                  Tồn Kho Sẵn Có
                </td>
                {selectedRackets.map((r) => (
                  <td key={r.id} className="p-5 font-bold text-slate-700">
                    {r.stock > 0 ? (
                      <span className="text-emerald-700 font-extrabold">{r.stock} chiếc</span>
                    ) : (
                      <span className="text-rose-600 font-bold">Hết hàng</span>
                    )}
                  </td>
                ))}
                {[...Array(3 - selectedRackets.length)].map((_, i) => (
                  <td key={i} className="p-5 text-slate-300">-</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ComparePage;
