import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import { 
  Filter, 
  Search, 
  SlidersHorizontal,
  Home,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Gauge,
  LayoutGrid,
  List,
  X,
  Footprints,
  Backpack,
  Shirt,
  Trophy,
  Swords,
  Zap,
  Tag,
  Eye
} from 'lucide-react';

// Dữ liệu 5 Banner chuyên biệt cho 5 Danh mục chuẩn thiết kế gốc
const CATEGORY_BANNERS = {
  RACKET: {
    title: 'VỢT CẦU LÔNG CHÍNH HÃNG',
    gradientText: 'SỨC MẠNH TRONG TỪNG CÚ ĐÁNH',
    badge: 'OFFICIAL BWF TOURNAMENT RACKETS',
    description: 'Khám phá bộ sưu tập vợt thi đấu đỉnh cao từ Yonex, Victor, Li-Ning & Mizuno. Đầy đủ tem cào chống giả, hỗ trợ đo thông số swing weight và miễn phí dịch vụ căng cước 4 mối gút chuẩn BWF.',
    bgImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyZXdxJpoFOlwmtmeFFODdaKMjWEGX2OyWaSaX_Nvho97g9G2jdBvtbw6G-jedPZbN32CxgmEkgRM3S-HegblDFAiod0n2Gjju2TfcNgFCii_3MP2QTxgImjoE-EMDMz6DzpghRiVk84mNGTCq0VlQNL1kz8U66lFDhXa23U3u2XwIzUacKys-q-Bc_tXkQxsol67tQfYIxOVssAac6PCMfc2Iuw1t2zRoQH1i6yEmZ8_xDLFh4U1b',
    perks: ['100% Chính Ngạch', 'Căng Cước 4 Mối Gút', 'Đo Swing Weight Pro', 'Bảo Hành Khung 90 Ngày']
  },
  SHOES: {
    title: 'GIÀY CẦU LÔNG CHUYÊN NGHIỆP',
    gradientText: 'BỨT TỐC & TIẾP ĐẤT HOÀN HẢO',
    badge: 'TOP CÔNG NGHỆ BẢO VỆ CỔ CHÂN & KHỚP GỐI',
    description: 'Hệ thống giày thi đấu chính hãng tích hợp đệm Power Cushion+, đế cao su Radial Blade bám sân tuyệt đối, tấm Carbon 3D chống lật cổ chân từ Yonex, Victor, Lining, Mizuno.',
    bgImage: 'https://lh3.googleusercontent.com/aida/AEtjO1Wn2o8ScP8jjmX0LuN3xMttSNjH6JSYW7AymRR785owkRwdGoywlzZHDUM1pyPmG_yiMGAU3IVHKwxjw2Eh7DD4vn6Y0S--ejVbrHHEnUwS7NqcdaJxK-xf9ttcOK1yEy1jgmkrHFpyWUM01kYgJI8AZXqWjsR-3HczLz5sBfNgTXG3IVxK8KK8niMRkmR8_FjXl1NJ7RuUTpJJw9c35hxfQL-fWcCfETFyokX_buRjYQH9MGw-BuQrng',
    perks: ['Đệm Power Cushion+', 'Đế Radial Blade Sole', 'Tấm Carbon 3D chống lật', 'Double Russel Mesh']
  },
  BAG: {
    title: 'BALO & BAO VỢT THI ĐẤU',
    gradientText: 'BẢO VỆ VỢT TIÊU CHUẨN TOUR',
    badge: 'THIẾT KẾ CHUYÊN NGHIỆP BWF TOURNAMENT',
    description: 'Bao vợt cách nhiệt Thermo Guard cao cấp, balo ngăn giày riêng biệt khử mùi, chất liệu chống thấm nước IPX4 đồng hành cùng bạn trên mọi chuyến du đấu.',
    bgImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWD-k6lHEcXn9J84Xjd7_QcDz680mSkQcdsp8iBVkfdo5VODDUCsbC5FIZgIkRB3AvM3qHiNmI7l-Tjl7XD_b7pGrQMyiKqDKO4Lro8vi6lg7Z3e2LQBTYwSztI6AR8B_n7O8cfTp_XTHq4fNYPFrmYBow03iYqCuH-I7GTXjuZaers7BI85NotMTjPFTN4dm9MMs-ZbMyunfH9yNam-wBmtZy_aW7ik6iIQ1oVi7DYorDbLbWGkpL',
    perks: ['Lớp Nhiệt Thermo Guard', 'Ngăn Giày Khử Mùi', 'Chống Nước IPX4', 'Quai Đeo Công Thái Học']
  },
  APPAREL: {
    title: 'TRANG PHỤC THI ĐẤU DRY-FIT',
    gradientText: 'SIÊU THOÁNG MÁT & BỨT PHÁ TỐC ĐỘ',
    badge: 'CÔNG NGHỆ LÀM MÁT COOLMAX HẠ NHIỆT -3°C',
    description: 'Bộ sưu tập áo đấu, quần short và váy thi đấu chính hãng Yonex, Victor, Lining. Sợi vải công nghệ cao thấm hút mồ hôi cực nhanh và co giãn 4 chiều.',
    bgImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9IEUCgLlL3GW5QIfUXCh_OdodRH7_6SUEKaSHWhU2Rq7VfJrxtbjPPayQDVW8hFirkY66GGyXt4mapHlXYaz5SC0f97d_1FG2RYqn-9sLHN1UsBdfzolgv4YaHRJjIUyrDoWE6q-W0rItCRvyHVaCEhY4dwLJ6tKRyNPX90TiUNrWJtKtelXtDOssE73al0GyFMYTUUitzmd0XenPGkYPuqF1-dgHtMIg-zx0QBbQRbc2COOA9jMP',
    perks: ['Hạ Nhiệt CoolMax -3°C', 'Thấm Hút Dry-Fit Siêu Tốc', 'Co Giãn 4 Chiều Linh Hoạt', 'Chống Tia UV 50+']
  },
  ACCESSORIES: {
    title: 'PHỤ KIỆN CẦU LÔNG PRO',
    gradientText: 'ĐẦY ĐỦ TINH HOA CHO TỪNG TRẬN ĐẤU',
    badge: 'DỤNG CỤ THI ĐẤU CHUẨN QUỐC TẾ BWF',
    description: 'Cước BG65Ti, BG80, Aerobite; quấn cán Yonex AC102EX chống trượt; quả cầu thi đấu tiêu chuẩn BWF và dụng cụ bảo hộ thể thao cao cấp.',
    bgImage: 'https://lh3.googleusercontent.com/aida/AEtjO1Vi9OaVFBPd6y0h2lY1ChhCbZUxacPh47LeL-4-CqofIOg6PE0CkZFT4JTWaUEof84EMDCWgJBLhyg-rcznbAd0uWPkOi-mxEf83c6JB8z4pkwtbLGfpZWjz4s4mHde4DQEdPY2QevLbZ4tmfyl1c7Qi19ysYkscofFnYdTuKhBIl8p2XLG9UIFDb6AJ11Re3DD02bGTBRd1bAUUcZiLuZFstUxq2Ygr3qz8pcGdzUamC0Lrc_Tw2bDsIA',
    perks: ['Cước Căng BWF Approved', 'Quấn Cán Super Grap', 'Cầu Lông Tiêu Chuẩn', 'Băng Khớp & Phục Hồi']
  },
  ALL: {
    title: 'TẤT CẢ TRANG BỊ CẦU LÔNG',
    gradientText: 'CHÍNH HÃNG APEX BADMINTON PRO',
    badge: 'TOURNAMENT EQUIPMENT & STRINGING',
    description: 'Trải nghiệm hệ sinh thái dụng cụ cầu lông đỉnh cao từ các thương hiệu số 1 thế giới với chế độ bảo hành chính hãng và dịch vụ căng cước chuẩn BWF.',
    bgImage: 'https://lh3.googleusercontent.com/aida/AEtjO1WnCri4_js0e8_-uBsfS2jif7zSpzBPOHaHnHP0kIUHp3v5h6_D5sR-XfIHJytBPt3KgbcRUEHT6PMS9K52OI_DaS-Ro61enM8us2nebGYymeA-IrL3Bzt_a_Q5BwTJj2Hjp2WaCT_yDorE3D9Zr2YfwifheyDXtK4J3AfimAlwfYF-c29Yv-Dj7ydJVciQMv6RwTtr9zmzgTew16-rgAneEdC0a9lpAb99jsq4WApfao2LO-yx73JDa2I',
    perks: ['100% Chính Ngạch', 'Căng Cước Điện Tử 4 Nút', 'Giao Hỏa Tốc 2H', 'Bảo Hành 1 Đổi 1']
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

const SHOE_SIZES = ['39', '40', '40.5', '41', '42', '42.5', '43', '44', '45'];
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL'];
const GENDER_OPTIONS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Nam', value: 'Nam' },
  { label: 'Nữ', value: 'Nữ' },
  { label: 'Unisex', value: 'Unisex' },
];

const BAG_TYPES = [
  { label: 'Bao Vợt 6 Cây', value: '6-racket' },
  { label: 'Bao Vợt 9 Cây', value: '9-racket' },
  { label: 'Balo Du Đấu 30L', value: 'backpack' },
  { label: 'Túi Holdall 45L', value: 'holdall' },
];

const ACCESSORY_TYPES = [
  { label: 'Cước Đan Vợt', value: 'string' },
  { label: 'Quấn Cán Overgrip', value: 'grip' },
  { label: 'Quả Cầu Thi Đấu', value: 'shuttlecock' },
  { label: 'Băng Bảo Vệ Khớp', value: 'support' },
];

// Helper chuẩn hóa category từ URL param linh hoạt mọi biến thể
const normalizeCategory = (cat) => {
  if (!cat) return 'ALL';
  const s = String(cat).trim().toUpperCase();
  if (s === 'ALL' || s === 'TAT-CA' || s === 'TẤT CẢ') return 'ALL';

  // 1. Vợt Cầu Lông
  if (s === '1' || s === 'RACKET' || s === 'VOT-CAU-LONG' || s.includes('VOT') || s.includes('VỢT')) return 'RACKET';

  // 2. Giày Cầu Lông
  if (s === '2' || s === 'SHOES' || s === 'SHOE' || s === 'GIAY-CAU-LONG' || s.includes('GIAY') || s.includes('GIÀY') || s.includes('FOOTWEAR')) return 'SHOES';

  // 3. Quần Áo Thi Đấu
  if (s === '3' || s === 'APPAREL' || s === 'QUAN-AO' || s === 'QUAN-AO-THI-DAU' || s === 'QUAN-AO-DAU' || s.includes('QUẦN') || s.includes('ÁO') || s.includes('CLOTHING') || s.includes('TRANG PHỤC')) return 'APPAREL';

  // 4. Balo & Bao Vợt
  if (s === '4' || s === 'BAG' || s === 'BALO-VA-BAO-VOT' || s === 'BALO' || s === 'BAO-VOT' || s.includes('BALO') || s.includes('BAO VỢT') || s.includes('TUI') || s.includes('TÚI') || s.includes('BACKPACK')) return 'BAG';

  // 5. Phụ Kiện Pro
  if (s === '5' || s === 'ACCESSORIES' || s === 'ACCESSORY' || s === 'PHU-KIEN' || s === 'PHU-KIEN-PRO' || s.includes('PHU-KIEN') || s.includes('PHỤ KIỆN') || s.includes('CUOC') || s.includes('CƯỚC') || s.includes('GRIP')) return 'ACCESSORIES';

  return s;
};

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // URL State Synced
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedCategory, setSelectedCategory] = useState(
    normalizeCategory(searchParams.get('category') || searchParams.get('categoryId'))
  );
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || 'ALL');
  const [selectedBalance, setSelectedBalance] = useState(searchParams.get('balancePoint') || 'ALL');
  const [selectedWeight, setSelectedWeight] = useState(searchParams.get('weightGrip') || 'ALL');
  const [selectedShoeSize, setSelectedShoeSize] = useState('ALL');
  const [selectedApparelSize, setSelectedApparelSize] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState(searchParams.get('gender') || 'ALL');
  const [selectedBagType, setSelectedBagType] = useState('ALL');
  const [selectedAccessoryType, setSelectedAccessoryType] = useState('ALL');
  const [selectedPriceRange, setSelectedPriceRange] = useState('ALL');
  
  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('bestseller');
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const productListTopRef = useRef(null);
  const ITEMS_PER_PAGE = 12;

  // Sync with URL query changes
  useEffect(() => {
    const rawCat = searchParams.get('category') || searchParams.get('categoryId');
    const normalizedCat = normalizeCategory(rawCat);
    setSelectedCategory(normalizedCat);

    const kw = searchParams.get('keyword');
    if (kw !== null) setKeyword(kw);
    const br = searchParams.get('brand');
    if (br) setSelectedBrand(br);
    const gen = searchParams.get('gender');
    if (gen) setSelectedGender(gen);

    const pageParam = parseInt(searchParams.get('page'), 10);
    if (!isNaN(pageParam) && pageParam > 0) {
      setCurrentPage(pageParam);
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Load products
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await productApi.getProducts({});
        const list = Array.isArray(res) ? res : (res?.content || []);
        setProducts(list);
      } catch (err) {
        console.warn('Lỗi tải sản phẩm từ backend API:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Helper phân loại sản phẩm chuẩn xác vào 5 danh mục nghiệp vụ
  const getItemCategory = (item) => {
    if (!item) return 'OTHER';

    // 1. Ưu tiên cao nhất: categoryId từ CSDL MySQL (1: Racket, 2: Shoes, 3: Apparel, 4: Bag, 5: Accessories)
    const catId = Number(item.categoryId || item.category?.id);
    if (catId === 1) return 'RACKET';
    if (catId === 2) return 'SHOES';
    if (catId === 3) return 'APPAREL';
    if (catId === 4) return 'BAG';
    if (catId === 5) return 'ACCESSORIES';

    const cat = (item.categoryName || (typeof item.category === 'string' ? item.category : item.category?.name) || '').toUpperCase();
    const name = (item.name || '').toUpperCase();

    // 2. Kiểm tra chuỗi categoryName
    if (cat.includes('GIÀY') || cat.includes('SHOE') || cat.includes('FOOTWEAR')) return 'SHOES';
    if (cat.includes('QUẦN ÁO') || cat.includes('ÁO') || cat.includes('QUẦN') || cat.includes('APPAREL') || cat.includes('TRANG PHỤC') || cat.includes('CLOTHING')) return 'APPAREL';
    if (cat.includes('BALO') || cat.includes('TÚI') || cat.includes('BAG') || cat.includes('BACKPACK')) return 'BAG';
    if (cat.includes('CƯỚC') || cat.includes('PHỤ KIỆN') || cat.includes('ACCESSOR') || cat.includes('GRIP') || cat.includes('QUẤN CÁN')) return 'ACCESSORIES';
    if (cat.includes('VỢT') || cat.includes('RACKET')) return 'RACKET';

    // 3. Phân loại theo thuộc tính kỹ thuật đặc thù
    if (item.soleType || item.cushionTechnology || name.startsWith('GIÀY') || name.includes('GIÀY CẦU LÔNG') || name.includes('SHOE')) return 'SHOES';
    if (item.bagType || item.capacity || item.racketCapacity || name.startsWith('BALO') || name.startsWith('TÚI') || name.includes('BAO VỢT') || name.includes('TÚI VỢT')) return 'BAG';
    if (item.fabricType || (item.gender && (name.includes('ÁO') || name.includes('QUẦN') || name.includes('VÁY'))) || name.startsWith('ÁO ') || name.startsWith('QUẦN ') || name.includes('ÁO ĐẤU') || name.includes('QUẦN SHORTS') || name.includes('ÁO THUN')) return 'APPAREL';
    if (item.accessoryType || name.includes('CƯỚC') || name.includes('QUẤN CÁN') || name.includes('QUẢ CẦU') || name.includes('HỘP CẦU') || name.includes('BĂNG CỔ TAY') || name.includes('TẤT ') || name.includes('VỚ ')) return 'ACCESSORIES';
    if (item.weightGrip || item.balancePoint || item.stiffness || item.maxTension || item.playStyle || name.includes('VỢT')) return 'RACKET';

    return 'OTHER';
  };

  // Filter and Sort Logic - So khớp CHÍNH XÁC (Exact Match) trên từng field tương ứng
  const filteredProducts = products.filter((item) => {
    // 1. Lọc Danh mục (Category Filter) - Loại trừ tuyệt đối việc match lẫn giữa Vợt, Balo và Phụ kiện
    if (selectedCategory !== 'ALL') {
      const itemCat = getItemCategory(item);
      if (itemCat !== selectedCategory) return false;
    }

    // 2. Lọc Từ khóa (Keyword Search) - Tìm kiếm linh hoạt trên tên hoặc thương hiệu
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      const match = item.name?.toLowerCase().includes(kw) || item.brand?.toLowerCase().includes(kw);
      if (!match) return false;
    }

    // 3. Lọc Thương hiệu (Brand Filter) - SO KHỚP CHÍNH XÁC (EXACT MATCH) TRÊN FIELD BRAND
    // Tuyệt đối không kiểm tra chuỗi con trên name/description để không dính sản phẩm sai
    if (selectedBrand !== 'ALL') {
      const itemBrand = (item.brand || '').trim().toLowerCase();
      const targetBrand = selectedBrand.trim().toLowerCase();
      const cleanBrand = (s) => s.replace(/[\s\-_]/g, '');
      if (itemBrand !== targetBrand && cleanBrand(itemBrand) !== cleanBrand(targetBrand)) {
        return false;
      }
    }

    // 4. Lọc Điểm cân bằng (Chỉ áp dụng khi xem Vợt hoặc ALL)
    if (selectedBalance !== 'ALL' && (selectedCategory === 'RACKET' || selectedCategory === 'ALL')) {
      const bal = (item.balancePoint || '').toLowerCase();
      const targetBal = selectedBalance.toLowerCase();
      if (!bal.includes(targetBal)) return false;
    }

    // 5. Lọc Trọng lượng (Chỉ áp dụng khi xem Vợt hoặc ALL)
    if (selectedWeight !== 'ALL' && (selectedCategory === 'RACKET' || selectedCategory === 'ALL')) {
      const wGrip = (item.weightGrip || item.weightClass || '').toUpperCase();
      const targetU = selectedWeight.toUpperCase();
      const matchU = new RegExp(`(^|[^A-Z0-9])${targetU}([^A-Z0-9]|$)`, 'i');
      if (!matchU.test(wGrip)) return false;
    }

    // 6. Lọc Size Giày (Chỉ áp dụng khi xem Giày hoặc ALL)
    if (selectedShoeSize !== 'ALL' && (selectedCategory === 'SHOES' || selectedCategory === 'ALL')) {
      let sizes = [];
      if (Array.isArray(item.sizes)) {
        sizes = item.sizes.map(s => String(s).trim());
      } else if (item.availableSizes) {
        try {
          const parsed = typeof item.availableSizes === 'string' ? JSON.parse(item.availableSizes) : item.availableSizes;
          if (Array.isArray(parsed)) sizes = parsed.map(s => String(s).trim());
        } catch {
          sizes = String(item.availableSizes).split(/[,;|\s]+/).map(s => s.trim());
        }
      }
      const targetSize = String(selectedShoeSize).trim();
      if (sizes.length > 0) {
        if (!sizes.includes(targetSize)) return false;
      } else {
        const sizeRegex = new RegExp(`(?:size\\s*[:\\-]?\\s*|eu\\s*|\\b)(${targetSize})(?:\\b|\\s*eu|\\s*[,\\/])`, 'i');
        if (!sizeRegex.test(item.availableSizes || item.name || '')) return false;
      }
    }

    // 7. Lọc Size Quần Áo (Chỉ áp dụng khi xem Quần Áo hoặc ALL)
    if (selectedApparelSize !== 'ALL' && (selectedCategory === 'APPAREL' || selectedCategory === 'ALL')) {
      let sizes = [];
      if (Array.isArray(item.sizes)) {
        sizes = item.sizes.map(s => String(s).trim().toUpperCase());
      } else if (item.availableSizes) {
        try {
          const parsed = typeof item.availableSizes === 'string' ? JSON.parse(item.availableSizes) : item.availableSizes;
          if (Array.isArray(parsed)) sizes = parsed.map(s => String(s).trim().toUpperCase());
        } catch {
          sizes = String(item.availableSizes).split(/[,;|\s]+/).map(s => s.trim().toUpperCase());
        }
      }
      const targetSize = selectedApparelSize.trim().toUpperCase();
      if (sizes.length > 0) {
        if (!sizes.includes(targetSize)) return false;
      } else {
        const sizeRegex = new RegExp(`(?:size\\s*[:\\-]?\\s*|\\b)(${targetSize})(?:\\b|\\s*[,\\/])`, 'i');
        if (!sizeRegex.test(item.availableSizes || item.name || '')) return false;
      }
    }

    // 8. Lọc Giới tính (Chỉ áp dụng khi xem Quần Áo hoặc ALL)
    if (selectedGender !== 'ALL' && (selectedCategory === 'APPAREL' || selectedCategory === 'ALL')) {
      const itemGender = (item.gender || '').trim().toLowerCase();
      const targetGender = selectedGender.trim().toLowerCase();
      if (itemGender === 'unisex') {
        // Unisex phù hợp cả Nam và Nữ
      } else if (itemGender !== targetGender) {
        const name = (item.name || '').toLowerCase();
        if (!name.includes(targetGender)) return false;
      }
    }

    // 9. Lọc Dung tích / Loại Balo & Bao vợt (Chỉ áp dụng khi xem Balo hoặc ALL)
    if (selectedBagType !== 'ALL' && (selectedCategory === 'BAG' || selectedCategory === 'ALL')) {
      const bType = (item.bagType || '').toLowerCase();
      const cap = (item.capacity || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const target = selectedBagType.toLowerCase();
      
      if (target === 'backpack') {
        if (!bType.includes('balo') && !bType.includes('backpack') && !name.includes('balo')) return false;
      } else if (target === '6-racket') {
        if (item.racketCapacity !== 6 && !name.includes('6 cây') && !bType.includes('6-racket')) return false;
      } else if (target === '9-racket') {
        if (item.racketCapacity !== 9 && !name.includes('9 cây') && !bType.includes('9-racket')) return false;
      } else if (target === 'holdall') {
        if (!bType.includes('holdall') && !cap.includes('45l') && !name.includes('holdall') && !name.includes('túi du đấu')) return false;
      }
    }

    // 10. Lọc Loại Phụ Kiện (Chỉ áp dụng khi xem Phụ Kiện hoặc ALL)
    if (selectedAccessoryType !== 'ALL' && (selectedCategory === 'ACCESSORIES' || selectedCategory === 'ALL')) {
      const acc = (item.accessoryType || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const target = selectedAccessoryType.toLowerCase();

      if (target === 'string') {
        if (!acc.includes('string') && !acc.includes('cuoc') && !name.includes('cước')) return false;
      } else if (target === 'grip') {
        if (!acc.includes('grip') && !acc.includes('quan_can') && !name.includes('quấn cán')) return false;
      } else if (target === 'shuttlecock') {
        if (!acc.includes('shuttlecock') && !acc.includes('cau') && !name.includes('quả cầu') && !name.includes('hộp cầu')) return false;
      } else if (target === 'support') {
        if (!acc.includes('support') && !acc.includes('bao_ve') && !name.includes('bảo vệ') && !name.includes('băng cổ tay') && !name.includes('vớ') && !name.includes('tất')) return false;
      }
    }

    // 11. Lọc Khoảng giá: So sánh số học chính xác trên item.price
    if (selectedPriceRange !== 'ALL') {
      const price = Number(item.price) || 0;
      if (selectedPriceRange === '<2m' && price >= 2000000) return false;
      if (selectedPriceRange === '2-3.5m' && (price < 2000000 || price > 3500000)) return false;
      if (selectedPriceRange === '3.5-5m' && (price < 3500000 || price > 5000000)) return false;
      if (selectedPriceRange === '>5m' && price <= 5000000) return false;
    }

    return true;
  });

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
    return (b.id || 0) - (a.id || 0);
  });

  // Phân trang: 12 sản phẩm mỗi trang theo thiết kế
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== validCurrentPage) {
      setCurrentPage(newPage);
      if (productListTopRef.current) {
        const yOffset = -90; // Khoảng đệm cho sticky header
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
    setKeyword('');
    setSelectedBrand('ALL');
    setSelectedBalance('ALL');
    setSelectedWeight('ALL');
    setSelectedShoeSize('ALL');
    setSelectedApparelSize('ALL');
    setSelectedGender('ALL');
    setSelectedBagType('ALL');
    setSelectedAccessoryType('ALL');
    setSelectedPriceRange('ALL');
    setSortBy('bestseller');
    setCurrentPage(1);
    setSearchParams(selectedCategory !== 'ALL' ? { category: selectedCategory } : {});
  };

  const currentBanner = CATEGORY_BANNERS[selectedCategory] || CATEGORY_BANNERS.ALL;

  return (
    <div className="w-full flex flex-col bg-[#F8FAFC]">
      
      {/* 1. TOP PANORAMIC CATEGORY HERO BANNER */}
      <section className="relative w-full overflow-hidden bg-[#131B2E] text-white">
        <div 
          className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity bg-cover bg-center transition-all duration-700" 
          style={{ backgroundImage: `url('${currentBanner.bgImage}')` }}
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
                onClick={() => {
                  setSelectedCategory(tab.value);
                  setCurrentPage(1);
                  // Reset các bộ lọc con đặc thù khi chuyển danh mục chính
                  setSelectedBalance('ALL');
                  setSelectedWeight('ALL');
                  setSelectedShoeSize('ALL');
                  setSelectedApparelSize('ALL');
                  setSelectedGender('ALL');
                  setSelectedBagType('ALL');
                  setSelectedAccessoryType('ALL');
                  if (tab.value === 'ALL') {
                    setSearchParams({});
                  } else {
                    setSearchParams({ category: tab.value });
                  }
                }}
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
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Size Giày (EU)</span>
                  <span className="text-[11px] text-secondary font-bold">Chuẩn form BWF</span>
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
              <span className="font-bold text-slate-900 block">Kỹ Thuật Viên BWF Trực Tuyến</span>
              <p className="text-[11px] leading-relaxed">
                Cần tư vấn lực căng dây hoặc chọn form giày cho bàn chân bè? Hotline: <strong className="text-secondary">1900 6886</strong>
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
                  <span className="text-xs text-slate-500">
                    Hiển thị <strong className="text-slate-900">{sortedProducts.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, sortedProducts.length)}</strong> trong tổng số <strong className="text-slate-900">{sortedProducts.length}</strong> mẫu trang bị cao cấp chuẩn BWF
                  </span>
                </div>

                {/* Sắp xếp & Chế độ xem */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#F2F4F6] rounded-lg px-3 py-1.5 gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Sắp xếp:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="bestseller">Bán chạy nhất</option>
                      <option value="rating">Đánh giá cao nhất</option>
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
              {(selectedBrand !== 'ALL' || selectedBalance !== 'ALL' || selectedWeight !== 'ALL' || selectedShoeSize !== 'ALL' || selectedApparelSize !== 'ALL' || selectedPriceRange !== 'ALL') && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-bold uppercase text-[11px]">Đang lọc:</span>
                  
                  {selectedBrand !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECEEF0] text-slate-900 font-medium">
                      Hãng: {selectedBrand}
                      <button onClick={() => setSelectedBrand('ALL')} className="hover:text-secondary">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedBalance !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECEEF0] text-slate-900 font-medium">
                      Điểm cân bằng: {selectedBalance}
                      <button onClick={() => setSelectedBalance('ALL')} className="hover:text-secondary">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedWeight !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECEEF0] text-slate-900 font-medium">
                      Trọng lượng: {selectedWeight}
                      <button onClick={() => setSelectedWeight('ALL')} className="hover:text-secondary">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedShoeSize !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECEEF0] text-slate-900 font-medium">
                      Size Giày: {selectedShoeSize}
                      <button onClick={() => setSelectedShoeSize('ALL')} className="hover:text-secondary">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedApparelSize !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECEEF0] text-slate-900 font-medium">
                      Size Áo/Quần: {selectedApparelSize}
                      <button onClick={() => setSelectedApparelSize('ALL')} className="hover:text-secondary">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedPriceRange !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECEEF0] text-slate-900 font-medium">
                      Giá: {selectedPriceRange}
                      <button onClick={() => setSelectedPriceRange('ALL')} className="hover:text-secondary">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  <button
                    onClick={handleResetFilters}
                    className="text-secondary hover:underline font-bold text-xs ml-1"
                  >
                    Xóa tất cả lọc
                  </button>
                </div>
              )}
            </div>

            {/* Product Grid / List View */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-xs text-slate-500 font-bold uppercase">Đang tải danh sách thiết bị...</span>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border border-[#E2E8F0] text-center flex flex-col items-center gap-3">
                <Tag className="w-12 h-12 text-slate-300" />
                <h3 className="font-display text-base font-bold text-slate-900">Không tìm thấy sản phẩm phù hợp!</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Vui lòng thử điều chỉnh lại bộ lọc thông số kỹ thuật hoặc tìm kiếm với từ khóa khác.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-2 px-5 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary-hover transition-colors"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* List Mode */
              <div className="flex flex-col gap-4">
                {paginatedProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center gap-5"
                  >
                    <div className="w-full sm:w-44 h-44 bg-[#F2F4F6] rounded-lg p-2 flex items-center justify-center shrink-0">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="max-h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold text-slate-900 uppercase">{product.brand}</span>
                        <span className="bg-[#ECEEF0] text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {product.weightGrip || 'Chính Hãng BWF'}
                        </span>
                      </div>
                      <Link to={`/products/${product.id}`}>
                        <h3 className="font-display text-base font-bold text-slate-900 hover:text-secondary transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {product.description || 'Thiết bị thi đấu thể thao cầu lông chuyên nghiệp, phân phối chính hãng đạt chuẩn quốc tế BWF.'}
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
            {sortedProducts.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                <span className="text-xs sm:text-sm text-slate-500">
                  Hiển thị <strong className="text-slate-900">{startIndex + 1} - {Math.min(endIndex, sortedProducts.length)}</strong> trong tổng số <strong className="text-slate-900">{sortedProducts.length}</strong> sản phẩm
                </span>

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
