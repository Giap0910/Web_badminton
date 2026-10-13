import { normalizeSearch } from './adminCustomers.jsx';
export const PRODUCT_BRANDS = ['Yonex', 'Victor', 'Li-Ning', 'Mizuno', 'Kawasaki', 'Fleet'];

export const CATEGORY_FIELDS = {
  1: [['weightGrip', 'Trọng lượng và cán', 50], ['weightClass', 'Hạng trọng lượng', 50],
    ['balancePoint', 'Điểm cân bằng', 50], ['stiffness', 'Độ cứng', 50], ['maxTension', 'Lực căng tối đa', 50],
    ['playStyle', 'Lối chơi', 100], ['frameMaterial', 'Vật liệu khung', 150], ['shaftMaterial', 'Vật liệu thân', 150]],
  2: [['availableSizes', 'Kích cỡ (phân cách bằng dấu phẩy)', null], ['gender', 'Giới tính', 30],
    ['soleType', 'Loại đế', 100], ['cushionTechnology', 'Công nghệ đệm', 150], ['upperMaterial', 'Vật liệu thân giày', 150]],
  3: [['availableSizes', 'Kích cỡ (phân cách bằng dấu phẩy)', null], ['gender', 'Giới tính', 30], ['fabricType', 'Chất liệu vải', 150]],
  4: [['bagType', 'Loại túi', 50], ['capacity', 'Dung tích', 50], ['racketCapacity', 'Sức chứa vợt', null, 'number'], ['waterproof', 'Khả năng chống nước', 50]],
  5: [['accessoryType', 'Loại phụ kiện', 50], ['quantityPerPack', 'Số lượng mỗi gói', 50]],
};

export function canonicalProductBrand(value) {
  const name = String(value || '').trim();
  return /^(lining|li-ning)$/i.test(name) ? 'Li-Ning' : PRODUCT_BRANDS.find(brand => brand.toLowerCase() === name.toLowerCase()) || name;
}

function sizesForForm(raw) {
  if (!raw) return '';
  try {
    const sizes = JSON.parse(raw);
    if (Array.isArray(sizes) && sizes.every(size => typeof size === 'string' && size.trim())) return sizes.join(', ');
  } catch { /* Dữ liệu cũ được giữ nguyên cho đến khi người quản trị sửa. */ }
  return raw;
}

export function productToAdminForm(product = {}) {
  const fields = [...Object.values(CATEGORY_FIELDS).flat().map(([key]) => key),
    'sku', 'name', 'categoryId', 'price', 'originalPrice', 'stock', 'description', 'origin'];
  const form = Object.fromEntries(fields.map(key => [key, product[key] == null ? '' : String(product[key])]));
  return { ...form, brand: canonicalProductBrand(product.brand) || 'Yonex', availableSizes: sizesForForm(product.availableSizes),
    initialAvailableSizes: sizesForForm(product.availableSizes), originalAvailableSizes: product.availableSizes,
    expectedStock: product.stock, catalogVisible: product.catalogVisible, hasVariants: !!product.variants?.length };
}

function numberValue(value, label, max, positive = false) {
  const number = Number(value);
  if (String(value).trim() === '' || !Number.isSafeInteger(number) || number < (positive ? 1 : 0) || number > max)
    throw new Error(`${label} phải là số nguyên ${positive ? 'dương' : 'không âm'} trong giới hạn cho phép.`);
  return number;
}

function textValue(value, label, max, required = false) {
  const text = String(value ?? '').trim();
  if ((required && !text) || (max && text.length > max)) throw new Error(`${label} bị thiếu hoặc vượt quá ${max} ký tự.`);
  return text;
}

function addSpecifications(payload, form) {
  for (const [key, label, max, type] of CATEGORY_FIELDS[payload.categoryId] || []) {
    if (key === 'availableSizes') {
      if (form.originalAvailableSizes != null && form.availableSizes === form.initialAvailableSizes) continue;
      const sizes = String(form.availableSizes || '').split(',').map(size => size.trim()).filter(Boolean);
      payload.availableSizes = JSON.stringify([...new Set(sizes)]);
    } else if (type === 'number') {
      if (String(form[key] ?? '').trim()) payload[key] = numberValue(form[key], label, 2147483647);
    } else payload[key] = textValue(form[key], label, max);
  }
}

export function buildAdminProductPayload(form, categories, editing = false) {
  const categoryId = numberValue(form.categoryId, 'Danh mục', 2147483647, true);
  if (!categories.some(category => Number(category.id) === categoryId)) throw new Error('Vui lòng chọn danh mục từ máy chủ.');
  const brand = canonicalProductBrand(form.brand);
  if (!PRODUCT_BRANDS.includes(brand)) throw new Error('Chọn một trong sáu thương hiệu được phép trước khi lưu.');
  const price = numberValue(form.price, 'Giá bán', 9999999999, true);
  const originalPrice = String(form.originalPrice).trim() ? numberValue(form.originalPrice, 'Giá niêm yết', 9999999999) : price;
  if (originalPrice < price) throw new Error('Giá niêm yết không được nhỏ hơn giá bán.');
  const stock = numberValue(form.stock, 'Tồn kho', 2147483647);
  const payload = { name: textValue(form.name, 'Tên sản phẩm', 200, true), brand, categoryId, price, originalPrice,
    description: String(form.description || '').trim(), origin: textValue(form.origin, 'Xuất xứ', 100) };
  const sku = textValue(form.sku, 'SKU', 50);
  if (sku) payload.sku = sku;
  if (!editing || stock !== form.expectedStock) { payload.stock = stock; if (editing) payload.expectedStock = form.expectedStock; }
  addSpecifications(payload, form);
  return payload;
}

export function filterAdminProducts(products, search, category, brand, stockStatus, visibility) {
  const keyword = normalizeSearch(search);
  return products.filter(product => {
    const text = normalizeSearch([product.name, product.sku, product.brand].filter(Boolean).join(' '));
    const stock = product.stock;
    const matchesStock = stockStatus === 'ALL' || (stockStatus === 'IN_STOCK' && stock > 5)
      || (stockStatus === 'LOW_STOCK' && stock > 0 && stock <= 5) || (stockStatus === 'OUT_OF_STOCK' && stock === 0);
    const visible = product.catalogVisible === true && PRODUCT_BRANDS.includes(canonicalProductBrand(product.brand));
    return text.includes(keyword) && (category === 'ALL' || String(product.categoryId) === category)
      && (brand === 'ALL' || canonicalProductBrand(product.brand) === brand) && matchesStock
      && (visibility === 'ALL' || (visibility === 'VISIBLE' ? visible : !visible));
  });
}

export function adminProductFacts(product) {
  return (CATEGORY_FIELDS[product.categoryId] || []).map(([key, label]) => [label, product[key]])
    .filter(([, value]) => value != null && value !== '').slice(0, 2)
    .map(([label, value]) => `${label}: ${value}`).join(' · ') || 'Chưa có thông số';
}
