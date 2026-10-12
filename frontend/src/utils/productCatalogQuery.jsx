const CATEGORY_IDS = { RACKET: 1, SHOES: 2, APPAREL: 3, BAG: 4, ACCESSORIES: 5 };
const PRICE_RANGES = { '<2m': { maxPrice: 2000000 }, '2-3.5m': { minPrice: 2000000, maxPrice: 3500000 },
  '3.5-5m': { minPrice: 3500000, maxPrice: 5000000 }, '>5m': { minPrice: 5000000 } };

export function normalizeCategory(value) {
  if (!value || /^(all|tat-ca|tất cả)$/i.test(String(value).trim())) return 'ALL';
  const text = String(value).trim().toUpperCase();
  if (/^(4|BAG|BALO|BAO-VOT|BALO-VA-BAO-VOT)$|BALO|BAO VỢT|BACKPACK|TÚI|TUI/.test(text)) return 'BAG';
  if (/^(2|SHOES?|GIAY-CAU-LONG)$|GIÀY|GIAY|FOOTWEAR/.test(text)) return 'SHOES';
  if (/^(3|APPAREL|QUAN-AO(-THI-DAU|-DAU)?)$|QUẦN|ÁO|CLOTHING|TRANG PHỤC/.test(text)) return 'APPAREL';
  if (/^(5|ACCESSOR(Y|IES)|PHU-KIEN(-PRO)?)$|PHỤ KIỆN|CUOC|CƯỚC|GRIP/.test(text)) return 'ACCESSORIES';
  if (/^(1|RACKET|VOT-CAU-LONG)$|VỢT|VOT/.test(text)) return 'RACKET';
  return 'INVALID';
}

function pageNumber(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}

function filterValue(params, key) {
  const value = params.get(key)?.trim();
  return value && value.toLowerCase() !== 'all' ? value : 'ALL';
}

export function readCatalogQuery(params) {
  const selectedCategory = normalizeCategory(params.get('categoryId') || params.get('category'));
  const legacySort = params.get('sortBy') === 'price' ? `price-${params.get('sortDir') === 'asc' ? 'asc' : 'desc'}` : 'newest';
  const sort = params.get('sort') || legacySort;
  const productSize = filterValue(params, 'productSize');
  return { selectedCategory, currentPage: pageNumber(params.get('page')), keyword: params.get('keyword')?.trim() || '',
    selectedBrand: filterValue(params, 'brand'), selectedBalance: filterValue(params, 'balancePoint'),
    selectedWeight: filterValue(params, 'weightGrip'), selectedGender: filterValue(params, 'gender'),
    productSize, selectedShoeSize: selectedCategory === 'SHOES' ? productSize : 'ALL',
    selectedApparelSize: selectedCategory === 'APPAREL' ? productSize : 'ALL',
    selectedBagType: filterValue(params, 'bagFilter'), selectedAccessoryType: filterValue(params, 'accessoryType'),
    selectedPriceRange: filterValue(params, 'priceRange'), sortBy: ['newest', 'price-asc', 'price-desc'].includes(sort) ? sort : 'newest',
    minPrice: params.get('minPrice'), maxPrice: params.get('maxPrice'), sale: params.get('sale') === 'true',
    bagType: params.get('bagType'), racketCapacity: params.get('racketCapacity'),
    stiffness: params.get('stiffness'), playStyle: params.get('playStyle') };
}

export function updateCatalogQuery(previous, patch) {
  const next = new URLSearchParams(previous);
  if ('categoryId' in patch) {
    ['category', 'productSize', 'gender', 'bagFilter', 'bagType', 'racketCapacity', 'accessoryType',
      'weightGrip', 'balancePoint', 'stiffness', 'playStyle'].forEach(key => next.delete(key));
  }
  if ('sort' in patch) ['sortBy', 'sortDir'].forEach(key => next.delete(key));
  if ('priceRange' in patch) ['minPrice', 'maxPrice'].forEach(key => next.delete(key));
  if ('bagFilter' in patch) ['bagType', 'racketCapacity'].forEach(key => next.delete(key));
  if (!('page' in patch)) next.delete('page');
  Object.entries(patch).forEach(([key, value]) => {
    if (value == null || value === '' || value === 'ALL' || (key === 'page' && Number(value) === 1)) next.delete(key);
    else next.set(key, String(value));
  });
  return next;
}

function addNonNegative(params, key, value) {
  if (value == null || value === '') return;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error('Giá hoặc sức chứa không hợp lệ. Vui lòng đặt lại bộ lọc.');
  params[key] = number;
}

export function buildCatalogParams(query) {
  if (query.selectedCategory === 'INVALID') throw new Error('Danh mục không hợp lệ. Vui lòng chọn lại danh mục.');
  const params = { page: query.currentPage - 1, size: 12, sortBy: query.sortBy === 'newest' ? 'id' : 'price',
    sortDir: query.sortBy === 'price-asc' ? 'asc' : 'desc' };
  if (CATEGORY_IDS[query.selectedCategory]) params.categoryId = CATEGORY_IDS[query.selectedCategory];
  const fields = { keyword: query.keyword, brand: query.selectedBrand, balancePoint: query.selectedBalance,
    weightGrip: query.selectedWeight, gender: query.selectedGender, productSize: query.productSize,
    accessoryType: query.selectedAccessoryType, bagType: query.bagType, stiffness: query.stiffness, playStyle: query.playStyle };
  Object.entries(fields).forEach(([key, value]) => { if (value && value !== 'ALL') params[key] = value; });
  Object.assign(params, PRICE_RANGES[query.selectedPriceRange] || {});
  if (!PRICE_RANGES[query.selectedPriceRange]) {
    addNonNegative(params, 'minPrice', query.minPrice); addNonNegative(params, 'maxPrice', query.maxPrice);
  }
  addNonNegative(params, 'racketCapacity', query.racketCapacity);
  if (['6-racket', '9-racket'].includes(query.selectedBagType)) params.racketCapacity = Number(query.selectedBagType[0]);
  if (query.selectedBagType === 'backpack') params.bagType = 'balo';
  if (query.selectedBagType === 'holdall') params.bagType = 'tui_holdall';
  if (query.sale) params.sale = true;
  return params;
}

export function readCatalogPage(response) {
  if (!response || !Array.isArray(response.content) || !Number.isSafeInteger(response.totalElements)
    || response.totalElements < 0 || !Number.isSafeInteger(response.totalPages) || response.totalPages < 0
    || !Number.isInteger(response.pageNo) || response.pageNo < 0 || !Number.isInteger(response.pageSize)
    || response.pageSize <= 0) throw new Error('API không trả thông tin phân trang hợp lệ.');
  return response;
}

export function catalogDisplayRange(currentPage, count, total, pageSize = 12) {
  return count && total ? [(currentPage - 1) * pageSize + 1, Math.min((currentPage - 1) * pageSize + count, total)] : [0, 0];
}

export function catalogFilterChips(query) {
  const bagLabels = { backpack: 'Balo', holdall: 'Túi Holdall', '6-racket': 'Bao vợt 6 cây', '9-racket': 'Bao vợt 9 cây' };
  const accessories = { day_cuoc: 'Dây cước', quan_can: 'Quấn cán', qua_cau: 'Quả cầu', bang_do: 'Băng chặn mồ hôi' };
  const prices = { '<2m': 'Đến 2 triệu', '2-3.5m': '2–3,5 triệu', '3.5-5m': '3,5–5 triệu', '>5m': 'Từ 5 triệu' };
  return [
    ['keyword', 'Từ khóa', query.keyword], ['brand', 'Hãng', query.selectedBrand],
    ['balancePoint', 'Điểm cân bằng', query.selectedBalance], ['weightGrip', 'Trọng lượng', query.selectedWeight],
    ['productSize', 'Kích cỡ', query.productSize], ['gender', 'Giới tính', query.selectedGender],
    ['priceRange', 'Khoảng giá', prices[query.selectedPriceRange] || query.selectedPriceRange],
    ['bagFilter', 'Loại túi', bagLabels[query.selectedBagType] || query.selectedBagType],
    ['accessoryType', 'Phụ kiện', accessories[query.selectedAccessoryType] || query.selectedAccessoryType],
    ['sale', 'Khuyến mãi', query.sale ? 'Đang giảm giá' : null],
    ['bagType', 'Loại túi', query.selectedBagType === 'ALL' ? ({ balo: 'Balo', tui_holdall: 'Túi Holdall', bao_vot_nhiet: 'Bao vợt cách nhiệt' }[query.bagType] || query.bagType) : null],
    ['racketCapacity', 'Sức chứa vợt', query.selectedBagType === 'ALL' ? query.racketCapacity : null],
    ['minPrice', 'Giá tối thiểu', query.selectedPriceRange === 'ALL' ? query.minPrice : null],
    ['maxPrice', 'Giá tối đa', query.selectedPriceRange === 'ALL' ? query.maxPrice : null],
  ].filter(([, , value]) => value != null && value !== '' && value !== 'ALL')
    .map(([key, label, value]) => ({ key, label, value, patch: { [key]: null } }));
}
