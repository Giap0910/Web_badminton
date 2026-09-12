import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import { 
  Filter, 
  Search, 
  RotateCcw, 
  ChevronDown, 
  SlidersHorizontal,
  Home,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Gauge,
  Layers,
  ArrowUpDown,
  X
} from 'lucide-react';

const CATEGORY_TABS = [
  { label: 'Tất cả sản phẩm', value: 'ALL' },
  { label: 'Vợt Cầu Lông', value: 'RACKET' },
  { label: 'Giày Cầu Lông', value: 'SHOES' },
  { label: 'Balo & Bao Vợt', value: 'BAG' },
  { label: 'Quần Áo Thi Đấu', value: 'APPAREL' },
  { label: 'Phụ Kiện Pro', value: 'ACCESSORIES' },
];

const BRANDS = ['Yonex', 'Victor', 'Lining', 'Mizuno', 'Kawasaki', 'Fleet'];

const BALANCE_POINTS = [
  { label: 'Nặng đầu (Head-Heavy / Công kích)', value: 'Head-Heavy' },
  { label: 'Cân bằng (Even / Toàn diện)', value: 'Even' },
  { label: 'Nhẹ đầu (Head-Light / Thủ tốc độ)', value: 'Head-Light' },
];

const WEIGHT_GRIPS = ['3U-G5', '4U-G5', '5U'];
const STIFFNESS_OPTIONS = ['Extra Stiff', 'Stiff', 'Medium', 'Flexible'];
const SHOE_SIZES = ['39', '40', '41', '42', '43', '44'];
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL'];

const PRICE_RANGES = [
  { label: 'Dưới 2 Triệu', min: 0, max: 2000000 },
  { label: '2 - 3.5 Triệu', min: 2000000, max: 3500000 },
  { label: '3.5 - 5 Triệu', min: 3500000, max: 5000000 },
  { label: 'Trên 5 Triệu', min: 5000000, max: 20000000 },
];

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'ALL');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || 'ALL');
  const [selectedBalance, setSelectedBalance] = useState(searchParams.get('balancePoint') || 'ALL');
  const [selectedWeight, setSelectedWeight] = useState(searchParams.get('weightGrip') || 'ALL');
  const [selectedStiffness, setSelectedStiffness] = useState(searchParams.get('stiffness') || 'ALL');
  const [selectedShoeSize, setSelectedShoeSize] = useState('ALL');
  const [selectedApparelSize, setSelectedApparelSize] = useState('ALL');
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Fetch with dynamic specs and pagination
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize,
        sortBy,
        sortDir
      };

      if (keyword.trim()) params.keyword = keyword.trim();
      if (selectedBrand !== 'ALL') params.brand = selectedBrand;
      if (selectedBalance !== 'ALL') params.balancePoint = selectedBalance;
      if (selectedWeight !== 'ALL') params.weightGrip = selectedWeight;
      if (selectedStiffness !== 'ALL') params.stiffness = selectedStiffness;
      if (selectedPriceRange) {
        params.minPrice = selectedPriceRange.min;
        params.maxPrice = selectedPriceRange.max;
      }

      const res = await productApi.getProducts(params);

      // Handle both PageResponse object and Array fallback
      if (res && res.content && Array.isArray(res.content)) {
        let list = res.content;
        // Category filter on frontend if category tab selected
        if (selectedCategory !== 'ALL') {
          list = list.filter(p => {
            const catStr = (p.categoryName || p.category || p.name || '').toUpperCase();
            return catStr.includes(selectedCategory);
          });
        }
        // Specific size filter for shoes & apparel
        if (selectedCategory === 'SHOES' && selectedShoeSize !== 'ALL') {
          list = list.filter(p => (p.description || p.name || '').includes(selectedShoeSize));
        }
        if (selectedCategory === 'APPAREL' && selectedApparelSize !== 'ALL') {
          list = list.filter(p => (p.description || p.name || '').includes(selectedApparelSize));
        }
        setProducts(list);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || list.length);
      } else if (Array.isArray(res)) {
        let list = res;
        if (selectedCategory !== 'ALL') {
          list = list.filter(p => {
            const catStr = (p.categoryName || p.category || p.name || '').toUpperCase();
            return catStr.includes(selectedCategory);
          });
        }
        if (selectedCategory === 'SHOES' && selectedShoeSize !== 'ALL') {
          list = list.filter(p => (p.description || p.name || '').includes(selectedShoeSize));
        }
        if (selectedCategory === 'APPAREL' && selectedApparelSize !== 'ALL') {
          list = list.filter(p => (p.description || p.name || '').includes(selectedApparelSize));
        }
        setProducts(list);
        setTotalPages(1);
        setTotalElements(list.length);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBrand, selectedBalance, selectedWeight, selectedStiffness, selectedShoeSize, selectedApparelSize, selectedPriceRange, sortBy, sortDir, page]);

  // Sync keyword from search bar
  useEffect(() => {
    const kw = searchParams.get('keyword');
    if (kw !== null && kw !== keyword) {
      setKeyword(kw);
    }
    const cat = searchParams.get('category');
    if (cat !== null && cat !== selectedCategory) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchProducts();
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    setSelectedBalance('ALL');
    setSelectedWeight('ALL');
    setSelectedStiffness('ALL');
    setSelectedShoeSize('ALL');
    setSelectedApparelSize('ALL');
    setSelectedPriceRange(null);
    setSortBy('id');
    setSortDir('desc');
    setPage(0);
    setSearchParams({});
  };

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC]">
      
      {/* 1. Top Hero Panoramic Category Banner */}
      <section className="relative w-full overflow-hidden bg-[#0F172A] text-white">
        <div className="absolute inset-0 z-0 opacity-35 mix-blend-luminosity bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/85 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent"></div>

        <div className="relative z-10 max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 flex flex-col justify-between">
          <div className="max-w-3xl flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-white w-fit shadow-md text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>OFFICIAL BWF TOURNAMENT APPROVED</span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight font-extrabold leading-tight">
              {selectedCategory === 'RACKET' ? 'VỢT CẦU LÔNG CHÍNH HÃNG' :
               selectedCategory === 'SHOES' ? 'GIÀY CẦU LÔNG CHUYÊN NGHIỆP' :
               selectedCategory === 'BAG' ? 'BALO & BAO VỢT THI ĐẤU' :
               selectedCategory === 'APPAREL' ? 'QUẦN ÁO THI ĐẤU DRY-FIT' :
               selectedCategory === 'ACCESSORIES' ? 'PHỤ KIỆN & CƯỚC THI ĐẤU BWF' :
               'TRANG BỊ CẦU LÔNG CHUYÊN NGHIỆP'} <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-blue-400">
                SỨC MẠNH TRONG TỪNG PHA CẦU
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Khám phá bộ sưu tập thi đấu đỉnh cao từ Yonex, Victor, Li-Ning & Mizuno. Đầy đủ tem cào chống giả, hỗ trợ đo thông số swing weight và miễn phí dịch vụ căng cước 4 mối gút chuẩn BWF.
            </p>

            {/* 4 Quick Feature Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg text-white text-xs font-medium">
                <CheckCircle2 className="text-secondary w-4 h-4 shrink-0" />
                <span>100% Chính Ngạch</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg text-white text-xs font-medium">
                <Wrench className="text-secondary w-4 h-4 shrink-0" />
                <span>Căng Cước 4 Mối Gút</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg text-white text-xs font-medium">
                <Gauge className="text-secondary w-4 h-4 shrink-0" />
                <span>Đo Swing Weight Pro</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg text-white text-xs font-medium">
                <ShieldCheck className="text-secondary w-4 h-4 shrink-0" />
                <span>Bảo Hành 90 Ngày</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Breadcrumb & Navigation Category Bar */}
      <div className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-[60px] z-30">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-slate-500 overflow-x-auto w-full sm:w-auto">
            <Link to="/" className="flex items-center gap-1 hover:text-secondary transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">Danh Mục Sản Phẩm</span>
          </nav>

          {/* Quick Categories Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setSelectedCategory(tab.value);
                  setPage(0);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === tab.value
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Main Filter & Product Grid Content */}
      <div className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile Filter Toggle & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm theo tên vợt, mã sản phẩm..."
              className="w-full bg-white pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-royal focus:ring-2 focus:ring-royal/15"
            />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm"
            >
              <Filter className="w-4 h-4 text-secondary" />
              <span>Bộ Lọc</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold hidden md:inline">Sắp xếp:</span>
              <select
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [sb, sd] = e.target.value.split('-');
                  setSortBy(sb);
                  setSortDir(sd);
                  setPage(0);
                }}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-royal"
              >
                <option value="id-desc">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="name-asc">Tên A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* DESKTOP FILTER SIDEBAR */}
          <aside className="w-full lg:w-[280px] shrink-0 hidden lg:flex flex-col gap-4">
            <div className="bg-white rounded-lg p-5 border border-[#E2E8F0] shadow-card-rest flex flex-col gap-5">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <SlidersHorizontal className="w-4 h-4 text-secondary" />
                  <span className="font-display text-sm uppercase">Bộ Lọc Thông Số</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-secondary hover:underline font-bold uppercase"
                >
                  Xóa tất cả
                </button>
              </div>

              {/* Group: Thương hiệu */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Thương hiệu</span>
                <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                  {BRANDS.map((b) => (
                    <label key={b} className="flex items-center justify-between cursor-pointer py-0.5 hover:text-secondary transition-colors">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedBrand.toLowerCase() === b.toLowerCase()}
                          onChange={() => {
                            setSelectedBrand(selectedBrand.toLowerCase() === b.toLowerCase() ? 'ALL' : b);
                            setPage(0);
                          }}
                          className="accent-secondary w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="font-medium">{b}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Group: Khoảng giá */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Khoảng giá (VNĐ)</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRICE_RANGES.map((pr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedPriceRange(selectedPriceRange === pr ? null : pr);
                        setPage(0);
                      }}
                      className={`p-2 rounded-lg text-[11px] font-bold text-center transition-all ${
                        selectedPriceRange === pr
                          ? 'bg-secondary text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Group based on Category */}
              {selectedCategory === 'SHOES' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Size Giày (EU)</span>
                    {selectedShoeSize !== 'ALL' && (
                      <button onClick={() => { setSelectedShoeSize('ALL'); setPage(0); }} className="text-[10px] text-secondary font-bold">Xóa chọn</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHOE_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setSelectedShoeSize(selectedShoeSize === sz ? 'ALL' : sz);
                          setPage(0);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                          selectedShoeSize === sz
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCategory === 'APPAREL' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kích cỡ Quần Áo</span>
                    {selectedApparelSize !== 'ALL' && (
                      <button onClick={() => { setSelectedApparelSize('ALL'); setPage(0); }} className="text-[10px] text-secondary font-bold">Xóa chọn</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {APPAREL_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setSelectedApparelSize(selectedApparelSize === sz ? 'ALL' : sz);
                          setPage(0);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                          selectedApparelSize === sz
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selectedCategory === 'RACKET' || selectedCategory === 'ALL') && (
                <>
                  {/* Group: Trọng lượng Vợt (U Rating) */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Trọng lượng (U Rating)</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {WEIGHT_GRIPS.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => {
                            setSelectedWeight(selectedWeight === w ? 'ALL' : w);
                            setPage(0);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                            selectedWeight === w
                              ? 'bg-secondary text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Group: Điểm cân bằng */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Điểm cân bằng</span>
                    <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                      {BALANCE_POINTS.map((bp) => (
                        <label key={bp.value} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-secondary transition-colors">
                          <input
                            type="radio"
                            name="balancePoint"
                            checked={selectedBalance === bp.value}
                            onChange={() => {
                              setSelectedBalance(selectedBalance === bp.value ? 'ALL' : bp.value);
                              setPage(0);
                            }}
                            className="accent-secondary w-4 h-4 cursor-pointer"
                          />
                          <span className="font-medium text-[11px]">{bp.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Group: Độ cứng đũa */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Độ cứng đũa vợt</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {STIFFNESS_OPTIONS.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setSelectedStiffness(selectedStiffness === st ? 'ALL' : st);
                            setPage(0);
                          }}
                          className={`p-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                            selectedStiffness === st
                              ? 'bg-secondary text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

            </div>
          </aside>

          {/* MAIN PRODUCT GRID */}
          <div className="flex-1 flex flex-col w-full">
            
            {/* Status Bar */}
            <div className="flex items-center justify-between mb-4 text-xs text-slate-500 font-medium">
              <span>
                Hiển thị <strong className="text-slate-900">{products.length}</strong> sản phẩm chính hãng
              </span>
            </div>

            {loading ? (
              <div className="w-full py-20 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Đang nạp sản phẩm...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="w-full py-16 bg-white rounded-lg border border-slate-200 p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900">Không tìm thấy sản phẩm phù hợp</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để có nhiều kết quả hơn.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-lg bg-secondary text-white text-xs font-bold hover:bg-secondary-hover transition-colors mt-2"
                >
                  Xóa toàn bộ bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-10">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Trang trước
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                      page === i
                        ? 'bg-secondary text-white shadow-sm'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Trang sau
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* MOBILE FILTER MODAL DRAWER */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm lg:hidden">
          <div className="relative ml-auto w-full max-w-xs bg-white h-full overflow-y-auto p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-display font-bold text-sm uppercase">Bộ Lọc Thông Số</span>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Filter Options */}
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase block mb-2">Thương hiệu</span>
                <div className="flex flex-wrap gap-1.5">
                  {BRANDS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedBrand(selectedBrand.toLowerCase() === b.toLowerCase() ? 'ALL' : b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        selectedBrand.toLowerCase() === b.toLowerCase() ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-900 uppercase block mb-2">Khoảng giá</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRICE_RANGES.map((pr, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPriceRange(selectedPriceRange === pr ? null : pr)}
                      className={`p-2 rounded-lg text-[11px] font-bold ${
                        selectedPriceRange === pr ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Category Specific Filters on Mobile */}
              {selectedCategory === 'SHOES' && (
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase block mb-2">Size Giày (EU)</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHOE_SIZES.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedShoeSize(selectedShoeSize === sz ? 'ALL' : sz)}
                        className={`py-1.5 rounded-lg text-xs font-bold ${
                          selectedShoeSize === sz ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCategory === 'APPAREL' && (
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase block mb-2">Size Quần Áo</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {APPAREL_SIZES.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedApparelSize(selectedApparelSize === sz ? 'ALL' : sz)}
                        className={`py-1.5 rounded-lg text-xs font-bold ${
                          selectedApparelSize === sz ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selectedCategory === 'RACKET' || selectedCategory === 'ALL') && (
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase block mb-2">Trọng lượng (U)</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {WEIGHT_GRIPS.map((w) => (
                      <button
                        key={w}
                        onClick={() => setSelectedWeight(selectedWeight === w ? 'ALL' : w)}
                        className={`py-1.5 rounded-lg text-xs font-bold ${
                          selectedWeight === w ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex gap-2">
                <button
                  onClick={handleResetFilters}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700"
                >
                  Xóa lọc
                </button>
                <button
                  onClick={() => {
                    setMobileFilterOpen(false);
                    setPage(0);
                    fetchProducts();
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-secondary text-white text-xs font-bold"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductsPage;
