import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompare, comparisonRackets } from '../context/CompareContext';
import { productApi } from '../api/productApi';
import { formatPrice, productCategory } from '../utils/formatters';
import ProductImage from '../components/ProductImage';
import { productValue } from '../components/ProductFacts';
import { Layers, Trash2, Plus, ArrowLeft } from 'lucide-react';

export function comparisonResults(response, selected) {
  const value = response?.data ?? response;
  const rackets = comparisonRackets(value?.rackets);
  if (!Array.isArray(value?.rackets) || rackets.length !== selected.length
      || rackets.some(item => !selected.some(chosen => chosen.id === item.id))) throw new Error('Dữ liệu so sánh từ máy chủ không hợp lệ.');
  return selected.map(item => rackets.find(racket => racket.id === item.id));
}
export function comparisonCatalog(response) {
  const list = Array.isArray(response) ? response : response?.content;
  if (!Array.isArray(list)) throw new Error('Danh mục vợt không hợp lệ.');
  const seen = new Set();
  return list.filter(item => Number.isSafeInteger(item?.id) && item.id > 0 && productCategory(item) === 'RACKET'
    && item.catalogVisible !== false && !seen.has(item.id) && seen.add(item.id));
}
const comparisonFields = [['Thương hiệu', 'brand'], ['Trọng lượng & cán', 'weightGrip'], ['Độ cứng thân vợt', 'stiffness'],
  ['Điểm cân bằng', 'balancePoint'], ['Sức căng tối đa', 'maxTension'], ['Phong cách chơi', 'playStyle']];
const ComparePage = () => {
  const { selectedRackets, comparisonError, removeRacket, clearComparison, addRacket } = useCompare();
  const [allProducts, setAllProducts] = useState([]), [rackets, setRackets] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(false), [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState(''), [catalogError, setCatalogError] = useState(''), [retry, setRetry] = useState(0);
  const selectedKey = selectedRackets.map(item => item.id).join(',');
  useEffect(() => {
    let active = true; setCatalogError('');
    productApi.getProducts({ categoryId: 1 }).then(response => {
      const list = comparisonCatalog(response);
      if (active) setAllProducts(list);
    }).catch(() => { if (active) setCatalogError('Không tải được danh mục vợt.'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    let active = true; setRackets([]); setDataError(''); setLoading(selectedRackets.length > 0);
    if (selectedRackets.length === 0) return;
    productApi.compareRackets(selectedRackets.map(item => item.id)).then(response => {
      const result = comparisonResults(response, selectedRackets); if (active) setRackets(result);
    }).catch(error => { if (active) setDataError(error.response?.status === 404 ? 'Có vợt đã ngừng bán hoặc không còn tồn tại. Xóa lựa chọn đó để so sánh lại.' : 'Không tải được thông số so sánh. Vui lòng thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedKey, retry]);
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div>
      <p className="flex gap-2 text-xs font-bold text-blue-600"><Layers className="w-4 h-4" />SO SÁNH THÔNG SỐ VỢT</p>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Bảng so sánh vợt cầu lông ({selectedRackets.length}/3)</h1>
      <p className="text-xs text-slate-500 mt-1">Thông số được tải lại từ cửa hàng. Dữ liệu còn thiếu được ghi rõ.</p></div>
      <div className="flex gap-3">{selectedRackets.length < 3 && <button type="button" onClick={() => setSelectorOpen(value => !value)} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex gap-2"><Plus className="w-4 h-4" />Thêm vợt so sánh</button>}
        {selectedRackets.length > 0 && <button type="button" onClick={clearComparison} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs">Xóa tất cả</button>}</div></div>
    {(dataError || catalogError || comparisonError) && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
      {dataError || catalogError || comparisonError}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Thử lại</button></div>}
    {selectedRackets.length > 0 && <div className="flex gap-2 flex-wrap">{selectedRackets.map(item => <button key={item.id} type="button" onClick={() => removeRacket(item.id)} className="border rounded-lg p-2 text-xs">{item.name || `Vợt #${item.id}`} · Xóa</button>)}</div>}
    {selectorOpen && <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-md space-y-4">
      <h2 className="text-sm font-bold">Chọn vợt từ danh mục</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
        {allProducts.filter(item => !selectedRackets.some(chosen => chosen.id === item.id)).map(item => <div key={item.id} className="p-3 rounded-xl border flex items-center gap-3">
          <ProductImage compact src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg shrink-0" /><div className="min-w-0 flex-1"><h3 className="text-xs font-bold truncate">{item.name}</h3><p className="text-xs text-red-600">{formatPrice(item.price)}</p></div>
          <button type="button" onClick={() => addRacket(item)} className="px-3 py-2 rounded-lg bg-red-500 text-white text-xs">Chọn</button></div>)}
        {!catalogError && allProducts.length === 0 && <p>Chưa có vợt trong danh mục.</p>}</div></div>}
    {loading && <p role="status">Đang tải thông số so sánh...</p>}
    {!selectedRackets.length && <div className="bg-white rounded-3xl p-12 text-center border shadow-sm space-y-4"><h2 className="text-lg font-bold">Chưa chọn vợt để so sánh</h2>
      <Link to="/products?categoryId=1" className="inline-flex gap-2 text-red-600"><ArrowLeft className="w-4 h-4" />Xem danh sách vợt</Link></div>}
    {!loading && !dataError && rackets.length > 0 && <div className="bg-white rounded-3xl border shadow-sm overflow-x-auto"><table className="w-full text-left min-w-[650px]"><thead><tr className="border-b bg-slate-50"><th className="p-5 text-xs text-slate-500">Thuộc tính kỹ thuật</th>
      {rackets.map(item => <th key={item.id} className="p-5"><ProductImage src={item.imageUrl} alt={item.name} className="aspect-square max-w-[180px] rounded-xl" />
        <Link to={`/products/${item.id}`} className="block text-sm font-bold mt-3">{item.name}</Link><p className="text-red-600 font-black">{formatPrice(item.price)}</p>
        <Link to={`/products/${item.id}`} className="block mt-3 rounded-xl bg-red-500 text-white p-2 text-xs text-center">Xem chi tiết, chọn phiên bản</Link></th>)}</tr></thead>
      <tbody className="divide-y text-xs">{comparisonFields.map(([label,field]) => <tr key={field}><th className="p-5 bg-slate-50 text-slate-700">{label}</th>{rackets.map(item => <td key={item.id} className="p-5">{productValue(item[field])}</td>)}</tr>)}
        <tr><th className="p-5 bg-slate-50">Tình trạng</th>{rackets.map(item => <td key={item.id} className="p-5">{item.inStock === true ? 'Còn hàng' : 'Hết hàng'}</td>)}</tr></tbody></table></div>}
  </div>;
};
export default ComparePage;
