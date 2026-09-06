import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import { 
  Filter, 
  Search, 
  RotateCcw, 
  ChevronDown, 
  Sparkles, 
  SlidersHorizontal 
} from 'lucide-react';

const brands = ['All', 'Yonex', 'Victor', 'Lining', 'Mizuno'];
const balancePoints = [
  { label: 'Tất cả', value: 'All' },
  { label: 'Nặng đầu (Head-Heavy / Công)', value: 'Head-Heavy' },
  { label: 'Cân bằng (Even / Toàn diện)', value: 'Even' },
  { label: 'Nhẹ đầu (Head-Light / Thủ)', value: 'Head-Light' },
];
const weightGrips = ['All', '3U-G5', '4U-G5', '5U'];
const stiffnessList = ['All', 'Extra Stiff', 'Stiff', 'Medium', 'Flexible'];

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || 'All');
  const [balancePoint, setBalancePoint] = useState(searchParams.get('balancePoint') || 'All');
  const [weightGrip, setWeightGrip] = useState(searchParams.get('weightGrip') || 'All');
  const [stiffness, setStiffness] = useState(searchParams.get('stiffness') || 'All');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch with dynamic specs
  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (brand !== 'All') params.brand = brand;
      if (balancePoint !== 'All') params.balancePoint = balancePoint;
      if (weightGrip !== 'All') params.weightGrip = weightGrip;
      if (stiffness !== 'All') params.stiffness = stiffness;
      if (maxPrice) params.maxPrice = maxPrice;

      const data = await productApi.getProducts(params);
      setProducts(data);
    } catch (err) {
      console.error('Lỗi tải danh sách vợt:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredProducts();
  }, [brand, balancePoint, weightGrip, stiffness, maxPrice]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFilteredProducts();
  };

  const handleResetFilters = () => {
    setKeyword('');
    setBrand('All');
    setBalancePoint('All');
    setWeightGrip('All');
    setStiffness('All');
    setMaxPrice('');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-8 rounded-3xl shadow-sm border border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Kho Vợt Cầu Lông Cao Cấp
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
            Lọc động đa tiêu chí JPA • Khóa tồn kho nguyên tử • Đảm bảo 100% chính hãng
          </p>
        </div>
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="md:hidden flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2.5 rounded-xl font-bold text-xs"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Bộ Lọc Thông Số</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Filter Sidebar (Desktop) */}
        <aside className={`md:col-span-4 lg:col-span-3 space-y-6 ${mobileFilterOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>Bộ Lọc Kỹ Thuật</span>
              </h2>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                title="Làm mới bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Tìm kiếm từ khóa</label>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Tên vợt (Astrox, Ryuga...)"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </form>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Hãng sản xuất</label>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBrand(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      brand === b
                        ? 'bg-slate-900 text-white shadow'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {b === 'All' ? 'Tất cả' : b}
                  </button>
                ))}
              </div>
            </div>

            {/* Balance Point */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Điểm cân bằng</label>
              <div className="space-y-1.5">
                {balancePoints.map((bp) => (
                  <label
                    key={bp.value}
                    className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer hover:text-emerald-700"
                  >
                    <input
                      type="radio"
                      name="balancePoint"
                      checked={balancePoint === bp.value}
                      onChange={() => setBalancePoint(bp.value)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{bp.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Weight & Grip */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Trọng lượng (Weight / Grip)</label>
              <div className="grid grid-cols-2 gap-2">
                {weightGrips.map((wg) => (
                  <button
                    key={wg}
                    onClick={() => setWeightGrip(wg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                      weightGrip === wg
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {wg === 'All' ? 'Tất cả' : wg}
                  </button>
                ))}
              </div>
            </div>

            {/* Stiffness */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Độ cứng đũa vợt</label>
              <select
                value={stiffness}
                onChange={(e) => setStiffness(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 bg-white"
              >
                {stiffnessList.map((st) => (
                  <option key={st} value={st}>
                    {st === 'All' ? 'Tất cả độ cứng' : st}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Mức giá tối đa</label>
              <select
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 bg-white"
              >
                <option value="">Tất cả mức giá</option>
                <option value="3500000">Dưới 3.500.000₫</option>
                <option value="4000000">Dưới 4.000.000₫</option>
                <option value="4500000">Dưới 4.500.000₫</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="md:col-span-8 lg:col-span-9 space-y-6">
          {/* Results Summary Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Tìm thấy <strong className="text-emerald-700 font-extrabold">{products.length}</strong> cây vợt sẵn hàng
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Đồng bộ dữ liệu thời gian thực
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Không tìm thấy cây vợt phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Thử nới lỏng các tiêu chí lọc (hãng, độ cứng, điểm cân bằng) hoặc bấm đặt lại bộ lọc.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Đặt lại toàn bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductsPage;
