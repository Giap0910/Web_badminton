import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { productSpecSummary } from '../components/ProductFacts';
import { readCatalogQuery, updateCatalogQuery, buildCatalogParams, readCatalogPage, catalogFilterChips } from '../utils/productCatalogQuery.jsx';

import { SlidersHorizontal, Home, ChevronLeft, ChevronRight, ShieldCheck, CheckCircle2, LayoutGrid, List, X, Tag } from 'lucide-react';

// Dữ liệu 5 Banner chuyên biệt cho 5 Danh mục chuẩn thiết kế gốc
const CATEGORY_BANNERS = {
  RACKET: {
    title: 'VỢT CẦU LÔNG',
    gradientText: 'SỨC MẠNH TRONG TỪNG CÚ ĐÁNH',
    badge: "VỢT CẦU LÔNG",
    description: "Xem trọng lượng, độ cứng, sức căng và vật liệu của từng mẫu vợt.",
    perks: ["Trọng lượng","Độ cứng","Sức căng","Vật liệu"]
  },
  SHOES: {
    title: 'GIÀY CẦU LÔNG CHUYÊN NGHIỆP',
    gradientText: 'BỨT TỐC & TIẾP ĐẤT HOÀN HẢO',
    badge: "GIÀY CẦU LÔNG",
    description: "Xem kích cỡ, loại đế, công nghệ đệm và chất liệu của từng mẫu giày.",
    perks: ["Kích cỡ","Loại đế","Công nghệ đệm","Chất liệu"]
  },
  BAG: {
    title: 'BALO & BAO VỢT THI ĐẤU',
    gradientText: 'BẢO VỆ VỢT TIÊU CHUẨN TOUR',
    badge: "BALO VÀ BAO VỢT",
    description: "Xem loại túi, dung tích, sức chứa vợt và khả năng chống nước theo dữ liệu từng mẫu.",
    perks: ["Loại túi","Dung tích","Sức chứa vợt","Chống nước"]
  },
  APPAREL: {
    title: 'TRANG PHỤC CẦU LÔNG',
    gradientText: 'SIÊU THOÁNG MÁT & BỨT PHÁ TỐC ĐỘ',
    badge: "TRANG PHỤC CẦU LÔNG",
    description: "Xem kích cỡ, giới tính và chất liệu vải của từng mẫu trang phục.",
    perks: ["Kích cỡ","Giới tính","Chất liệu","Mô tả sản phẩm"]
  },
  ACCESSORIES: {
    title: 'PHỤ KIỆN CẦU LÔNG PRO',
    gradientText: 'ĐẦY ĐỦ TINH HOA CHO TỪNG TRẬN ĐẤU',
    badge: "PHỤ KIỆN CẦU LÔNG",
    description: "Xem loại phụ kiện và quy cách đóng gói của từng sản phẩm.",
    perks: ["Loại phụ kiện","Quy cách đóng gói","Thương hiệu","Mã sản phẩm"]
  },
  ALL: {
    title: 'TẤT CẢ TRANG BỊ CẦU LÔNG',
    gradientText: 'CHỌN TRANG BỊ PHÙ HỢP',
    badge: "TRANG BỊ CẦU LÔNG",
    description: "Khám phá sản phẩm và xem thông tin của từng mẫu trước khi lựa chọn.",
    perks: ["Thương hiệu","Danh mục","Thông số","Mã sản phẩm"]
  }
};

const CATEGORY_TABS = [
  { label: 'Tất cả sản phẩm', value: 'ALL' },
  { label: 'Vợt Cầu Lông', value: 'RACKET' },
  { label: 'Giày Cầu Lông', value: 'SHOES' },
  { label: 'Balo & Bao Vợt', value: 'BAG' },
  { label: 'Quần Áo Thi Đấu', value: 'APPAREL' },
  { label: 'Phụ Kiện Pro', value: 'ACCESSORIES' },
];

const CATEGORY_TO_ID = {
  RACKET: 1,
  SHOES: 2,
  APPAREL: 3,
  BAG: 4,
  ACCESSORIES: 5,
};

const BRANDS = ['Yonex', 'Victor', 'Li-Ning', 'Mizuno', 'Kawasaki', 'Fleet'];

const BALANCE_OPTIONS = [
  { label: 'Đầu nặng (Head-Heavy)', sub: 'Chuyên công, smash cắm sân', value: 'Head-Heavy' },
  { label: 'Cân bằng (Even Balance)', sub: 'Công thủ toàn diện', value: 'Even' },
  { label: 'Đầu nhẹ (Head-Light)', sub: 'Phản tạt tốc độ, thủ cầu', value: 'Head-Light' },
];

const U_RATINGS = [
  { label: '2U', weight: '90-94g' },
  { label: '3U', weight: '85-89g' },
  { label: '4U', weight: '80-84g' },
  { label: '5U', weight: '75-79g' },
];

export const SHOE_SIZES = ['35', '35.5', '36', '36.5', '37', '37.5', '38', '38.5', '39', '39.5', '40', '40.5', '41', '41.5', '42'];
export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const GENDER_OPTIONS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Nam', value: 'Nam' },
  { label: 'Nữ', value: 'Nữ' },
  { label: 'Unisex', value: 'Unisex' },
];

const BAG_TYPES = [
  { label: 'Bao Vợt 6 Cây', value: '6-racket' },
  { label: 'Bao Vợt 9 Cây', value: '9-racket' },
  { label: 'Balo', value: 'backpack' },
  { label: 'Túi Holdall', value: 'holdall' },
];

const ACCESSORY_TYPES = [
  { label: 'Cước Cầu Lông', value: 'day_cuoc' },
  { label: 'Quấn Cán Vợt', value: 'quan_can' },
  { label: 'Quả / Ống Cầu Lông', value: 'qua_cau' },
  { label: 'Băng Chặn Mồ Hôi', value: 'bang_do' },
];

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const queryKey = searchParams.toString();
  const query = readCatalogQuery(searchParams);
  const activeFilters = catalogFilterChips(query);
  const { keyword, selectedCategory, selectedBrand, selectedBalance, selectedWeight,
    selectedShoeSize, selectedApparelSize, selectedGender, selectedBagType, selectedAccessoryType,
    selectedPriceRange, sortBy, currentPage } = query;
  const setFilter = patch => setSearchParams(previous => updateCatalogQuery(previous, patch));
  const setSelectedBrand = value => setFilter({ brand: value });
  const setSelectedBalance = value => setFilter({ balancePoint: value });
  const setSelectedWeight = value => setFilter({ weightGrip: value });
  const setSelectedShoeSize = value => setFilter({ productSize: value });
  const setSelectedApparelSize = value => setFilter({ productSize: value });
  const setSelectedGender = value => setFilter({ gender: value });
  const setSelectedBagType = value => setFilter({ bagFilter: value });
  const setSelectedAccessoryType = value => setFilter({ accessoryType: value });
  const setSelectedPriceRange = value => setFilter({ priceRange: value });
  const setSortBy = value => setFilter({ sort: value });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const productListTopRef = useRef(null);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setDataError('');
    const load = async () => {
      try {
        const page = readCatalogPage(await productApi.getProducts(buildCatalogParams(query), { signal: controller.signal }));
        if (controller.signal.aborted) return;
        setProducts(page.content);
        setTotalElements(page.totalElements);
        setTotalPages(page.totalPages);
        const lastPage = Math.max(1, page.totalPages);
        if (currentPage > lastPage) setSearchParams(previous => updateCatalogQuery(previous, { page: lastPage }), { replace: true });
      } catch (error) {
        if (controller.signal.aborted) return;
        setProducts([]); setTotalElements(0); setTotalPages(0);
        setDataError(error.response?.data?.message || (error.message?.startsWith('Danh mục') || error.message?.startsWith('API không trả') || error.message?.startsWith('Giá')
          ? error.message : error.response?.status === 400 ? 'Bộ lọc không hợp lệ. Vui lòng đặt lại bộ lọc.' : 'Không tải được danh sách sản phẩm. Vui lòng thử lại sau.'));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [queryKey, reloadVersion]);

  const displayedProducts = products;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), Math.max(1, totalPages));
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== validCurrentPage) {
      setFilter({ page: newPage });
      if (productListTopRef.current) {
        const yOffset = -90;
        const y = productListTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (validCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages];
  };

  const handleResetFilters = () => {
    const categoryId = CATEGORY_TO_ID[selectedCategory];
    setSearchParams(categoryId ? { categoryId: String(categoryId) } : {});
  };

  const currentBanner = CATEGORY_BANNERS[selectedCategory] || CATEGORY_BANNERS.ALL;

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC]">
      {dataError && <div role="alert" className="p-4 text-red-700 bg-red-50 flex items-center justify-between gap-3">
        <p>{dataError}</p><button type="button" onClick={() => setReloadVersion(value => value + 1)}
          className="rounded-lg border border-red-200 px-3 py-2 font-bold text-xs focus-visible:ring-2 focus-visible:ring-secondary">Thử lại</button>
      </div>}

      {/* 1. TOP PANORAMIC CATEGORY HERO BANNER */}
      <section className="relative w-full overflow-hidden bg-[#131B2E] text-white">
        <div
          className="absolute inset-0 z-0 bg-gradient-to-br from-[#131B2E] via-blue-950 to-[#131B2E]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#131B2E] via-[#131B2E]/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131B2E] via-transparent to-transparent" />

        <div className="relative z-10 max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 flex flex-col justify-between">
          <div className="max-w-3xl flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-white w-fit shadow-md text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>{currentBanner.badge}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight font-extrabold leading-tight">
              {currentBanner.title} <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-blue-400">
                {currentBanner.gradientText}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {currentBanner.description}
            </p>

            {/* 4 Category-Specific Quick Feature Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              {currentBanner.perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs font-medium border border-white/10">
                  <CheckCircle2 className="text-secondary w-4 h-4 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. BREADCRUMB & 5-CATEGORY SUB-NAV RIBBON */}
      <div className="w-full bg-white border-b border-[#E2E8F0] shadow-sm sticky top-[60px] z-30">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">

          {/* Breadcrumb path */}
          <nav className="flex items-center gap-1.5 text-slate-500 overflow-x-auto w-full sm:w-auto">
            <Link to="/" className="flex items-center gap-1 hover:text-secondary transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold">
              {CATEGORY_TABS.find(t => t.value === selectedCategory)?.label || 'Tất cả sản phẩm'}
            </span>
          </nav>

          {/* Category Tabs Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter({ categoryId: CATEGORY_TO_ID[tab.value] || null })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === tab.value
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: DYNAMIC SIDEBAR FILTERS + PRODUCT GRID */}
      <div className="max-w-[80rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT SIDEBAR: DYNAMIC TECHNICAL FILTERS (280px) */}
          <aside className="w-full lg:w-[280px] shrink-0 bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col gap-5">

            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <SlidersHorizontal className="w-4 h-4 text-secondary" />
                <h3 className="font-display text-sm uppercase">Bộ Lọc Thông Số</h3>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-secondary hover:underline font-bold uppercase"
              >
                Xóa tất cả
              </button>
            </div>

            {/* Filter Group: Thương hiệu */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Thương hiệu</span>
              <div className="flex flex-col gap-1.5 text-xs text-slate-700">
                {BRANDS.map((b) => (
                  <label key={b} className="flex items-center justify-between cursor-pointer py-1 hover:text-secondary transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBrand.toLowerCase() === b.toLowerCase()}
                        onChange={() => setSelectedBrand(selectedBrand === b ? 'ALL' : b)}
                        className="accent-secondary w-4 h-4 cursor-pointer rounded"
                      />
                      <span>{b}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Group: Khoảng giá */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Khoảng giá (VNĐ)</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedPriceRange(selectedPriceRange === '<2m' ? 'ALL' : '<2m')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold transition-colors ${
                    selectedPriceRange === '<2m'
                      ? 'bg-[#131B2E] text-white font-bold'
                      : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  &lt; 2 Triệu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPriceRange(selectedPriceRange === '2-3.5m' ? 'ALL' : '2-3.5m')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold transition-colors ${
                    selectedPriceRange === '2-3.5m'
                      ? 'bg-[#131B2E] text-white font-bold'
                      : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  2 - 3.5 Triệu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPriceRange(selectedPriceRange === '3.5-5m' ? 'ALL' : '3.5-5m')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold transition-colors ${
                    selectedPriceRange === '3.5-5m'
                      ? 'bg-[#131B2E] text-white font-bold'
                      : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  3.5 - 5 Triệu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPriceRange(selectedPriceRange === '>5m' ? 'ALL' : '>5m')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold transition-colors ${
                    selectedPriceRange === '>5m'
                      ? 'bg-[#131B2E] text-white font-bold'
                      : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  &gt; 5 Triệu
                </button>
              </div>
            </div>

            {/* DYNAMIC FILTERS: DÀNH RIÊNG CHO VỢT CẦU LÔNG */}
            {(selectedCategory === 'RACKET' || selectedCategory === 'ALL') && (
              <>
                {/* Trọng lượng (U Rating) */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Trọng lượng (U Rating)</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {U_RATINGS.map((u) => (
                      <button
                        key={u.label}
                        type="button"
                        onClick={() => setSelectedWeight(selectedWeight === u.label ? 'ALL' : u.label)}
                        className={`py-2 px-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                          selectedWeight === u.label
                            ? 'bg-secondary text-white font-bold shadow-sm'
                            : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-bold">{u.label}</span>
                        <span className="text-[10px] opacity-80">{u.weight}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Điểm cân bằng & Lối chơi */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Điểm cân bằng & Lối chơi</span>
                  <div className="flex flex-col gap-2 text-xs">
                    {BALANCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedBalance(selectedBalance === opt.value ? 'ALL' : opt.value)}
                        className={`p-2.5 rounded-lg flex flex-col text-left transition-all ${
                          selectedBalance === opt.value
                            ? 'bg-rose-50 border border-secondary text-slate-900'
                            : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-bold text-xs">{opt.label}</span>
                        <span className="text-[11px] text-slate-500">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* DYNAMIC FILTERS: DÀNH RIÊNG CHO GIÀY CẦU LÔNG */}
            {selectedCategory === 'SHOES' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kích cỡ giày</span>
                  <span className="text-[11px] text-secondary font-bold">Xem kích cỡ từng mẫu</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-xs">
                  {SHOE_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedShoeSize(selectedShoeSize === sz ? 'ALL' : sz)}
                      className={`py-1.5 rounded font-bold transition-all text-center ${
                        selectedShoeSize === sz
                          ? 'bg-secondary text-white shadow-sm'
                          : 'bg-[#F2F4F6] hover:border-secondary border border-transparent text-slate-800'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DYNAMIC FILTERS: DÀNH RIÊNG CHO QUẦN ÁO ĐẤU */}
            {selectedCategory === 'APPAREL' && (
              <>
                {/* Giới tính */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Phân Loại Giới Tính</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setSelectedGender(selectedGender === g.value ? 'ALL' : g.value)}
                        className={`py-1.5 px-1.5 rounded font-bold transition-all text-center ${
                          selectedGender === g.value
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-[#F2F4F6] hover:border-secondary border border-transparent text-slate-800'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Trang Phục */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Size Trang Phục</span>
                  <div className="grid grid-cols-5 gap-1.5 text-xs">
                    {APPAREL_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedApparelSize(selectedApparelSize === sz ? 'ALL' : sz)}
                        className={`py-1.5 rounded font-bold transition-all text-center ${
                          selectedApparelSize === sz
                            ? 'bg-secondary text-white shadow-sm'
                            : 'bg-[#F2F4F6] hover:border-secondary border border-transparent text-slate-800'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* DYNAMIC FILTERS: DÀNH RIÊNG CHO BALO & BAO VỢT */}
            {selectedCategory === 'BAG' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Loại Túi & Sức Chứa</span>
                <div className="flex flex-col gap-1.5 text-xs">
                  {BAG_TYPES.map((bg) => (
                    <button
                      key={bg.value}
                      type="button"
                      onClick={() => setSelectedBagType(selectedBagType === bg.value ? 'ALL' : bg.value)}
                      className={`p-2 rounded-lg flex items-center justify-between text-left transition-all ${
                        selectedBagType === bg.value
                          ? 'bg-rose-50 border border-secondary text-slate-900 font-bold'
                          : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DYNAMIC FILTERS: DÀNH RIÊNG CHO CƯỚC & PHỤ KIỆN */}
            {selectedCategory === 'ACCESSORIES' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Phân Loại Phụ Kiện</span>
                <div className="flex flex-col gap-1.5 text-xs">
                  {ACCESSORY_TYPES.map((acc) => (
                    <button
                      key={acc.value}
                      type="button"
                      onClick={() => setSelectedAccessoryType(selectedAccessoryType === acc.value ? 'ALL' : acc.value)}
                      className={`p-2 rounded-lg flex items-center justify-between text-left transition-all ${
                        selectedAccessoryType === acc.value
                          ? 'bg-rose-50 border border-secondary text-slate-900 font-bold'
                          : 'bg-[#F2F4F6] hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{acc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dịch vụ & Tư vấn hỗ trợ */}
            <div className="p-3 bg-[#F2F4F6] rounded-xl text-xs text-slate-600 mt-2 space-y-1">
              <span className="font-bold text-slate-900 block">Kiểm tra thông số trước khi chọn</span>
              <p className="text-[11px] leading-relaxed">
                Xem lực căng, kích cỡ và thông số theo từng sản phẩm. Thông tin hotline cửa hàng chưa được xác minh.
              </p>
            </div>

          </aside>

          {/* RIGHT COLUMN: TOOLBAR & PRODUCT GRID */}
          <section ref={productListTopRef} className="flex-1 w-full min-w-0 flex flex-col gap-5">

            {/* Header Toolbar */}
            <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 leading-tight">
                    {CATEGORY_TABS.find(t => t.value === selectedCategory)?.label || 'Tất cả sản phẩm'}
                  </h2>
                </div>

                {/* Sắp xếp & Chế độ xem */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#F2F4F6] rounded-lg px-3 py-1.5 gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Sắp xếp:</span>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="price-asc">Giá tăng dần</option>
                      <option value="price-desc">Giá giảm dần</option>
                    </select>
                  </div>

                  {/* Toggle Grid/List */}
                  <div className="flex items-center border border-[#E2E8F0] rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 transition-colors ${
                        viewMode === 'grid' ? 'bg-[#ECEEF0] text-secondary' : 'bg-white text-slate-400'
                      }`}
                      title="Dạng lưới 3 cột"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 transition-colors ${
                        viewMode === 'list' ? 'bg-[#ECEEF0] text-secondary' : 'bg-white text-slate-400'
                      }`}
                      title="Dạng danh sách"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {activeFilters.length > 0 && <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-bold uppercase text-[11px]">Đang lọc:</span>
                  {activeFilters.map(filter => <span key={filter.key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECEEF0] text-slate-900 font-medium">
                    {filter.label}: {filter.value}
                    <button type="button" aria-label={`Bỏ lọc ${filter.label}`} onClick={() => setFilter(filter.patch)} className="hover:text-secondary focus-visible:ring-2 focus-visible:ring-secondary rounded">
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </span>)}
                </div>}
            </div>

            {/* Product Grid / List View / Skeleton Loading */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm animate-pulse flex flex-col p-4">
                    <div className="w-full aspect-[4/3] bg-slate-200 rounded-lg mb-4" />
                    <div className="h-3 bg-slate-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
                    <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-100">
                      <div className="h-5 bg-slate-200 rounded w-1/3" />
                      <div className="h-8 bg-slate-200 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border border-[#E2E8F0] text-center flex flex-col items-center gap-3">
                <Tag className="w-12 h-12 text-slate-300" />
                <h3 className="font-display text-base font-bold text-slate-900">Không tìm thấy sản phẩm phù hợp!</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Vui lòng thử điều chỉnh lại bộ lọc thông số kỹ thuật hoặc tìm kiếm với từ khóa khác.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-2 px-5 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary-hover transition-colors shadow-sm"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* List Mode */
              <div className="flex flex-col gap-4">
                {displayedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center gap-5"
                  >
                    <div className="w-full sm:w-44 h-44 bg-[#F2F4F6] rounded-lg p-2 flex items-center justify-center shrink-0 overflow-hidden">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="max-h-full w-auto object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold text-slate-900 uppercase">{product.brand}</span>
                        <span className="bg-[#ECEEF0] text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {productSpecSummary(product)}
                        </span>
                      </div>
                      <Link to={`/products/${product.id}`}>
                        <h3 className="font-display text-base font-bold text-slate-900 hover:text-secondary transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {product.description || 'Chưa có mô tả sản phẩm.'}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="font-display text-xl font-black text-secondary">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                        </span>
                        <Link
                          to={`/products/${product.id}`}
                          className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-hover text-white text-xs font-bold uppercase transition-colors"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Thanh Phân Trang (Pagination Bar) Chuẩn Design System */}
            {totalElements > 0 && (
              <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex items-center justify-center gap-4 mt-2">

                <div className="flex items-center gap-1.5">
                  {/* Nút Trước (Prev) */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(validCurrentPage - 1)}
                    disabled={validCurrentPage <= 1}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      validCurrentPage <= 1
                        ? 'bg-slate-100 text-slate-400 border border-[#E2E8F0] cursor-not-allowed opacity-50'
                        : 'bg-white text-slate-700 border border-[#E2E8F0] hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                    }`}
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Danh sách các trang */}
                  {getPageNumbers().map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="w-8 text-center text-slate-400 font-bold select-none text-xs">
                          ...
                        </span>
                      );
                    }
                    const isActive = p === validCurrentPage;
                    return (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-[#EF4444] text-white shadow-sm font-black'
                            : 'bg-white text-slate-700 border border-[#E2E8F0] hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  {/* Nút Sau (Next) */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(validCurrentPage + 1)}
                    disabled={validCurrentPage >= totalPages}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      validCurrentPage >= totalPages
                        ? 'bg-slate-100 text-slate-400 border border-[#E2E8F0] cursor-not-allowed opacity-50'
                        : 'bg-white text-slate-700 border border-[#E2E8F0] hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                    }`}
                    title="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </section>

        </div>
      </div>

    </div>
  );
};

export default ProductsPage;
