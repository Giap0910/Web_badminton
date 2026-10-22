import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCompare, comparisonRackets, comparisonGroup } from '../context/CompareContext';
import { productApi } from '../api/productApi';
import { formatPrice } from '../utils/formatters';
import ProductImage from '../components/ProductImage';
import { productSpecRows } from '../components/ProductFacts';
import { Layers, Plus, ArrowLeft } from 'lucide-react';

export function comparisonResults(response, selected) {
  const value = response?.data ?? response;
  const rackets = comparisonRackets(value?.rackets);
  if (!Array.isArray(value?.rackets) || rackets.length !== selected.length
      || rackets.some(item => !selected.some(chosen => chosen.id === item.id && comparisonGroup(chosen) === comparisonGroup(item)))) throw new Error('Dữ liệu so sánh từ máy chủ không hợp lệ.');
  return selected.map(item => rackets.find(racket => racket.id === item.id));
}
export function comparisonCatalog(response, selected = []) {
  const list = Array.isArray(response) ? response : response?.content;
  if (!Array.isArray(list)) throw new Error('Danh mục sản phẩm không hợp lệ.');
  const seen = new Set();
  return list.filter(item => Number.isSafeInteger(item?.id) && item.id > 0 && comparisonGroup(item) && (!selected.length || comparisonGroup(item) === comparisonGroup(selected[0]))
    && item.catalogVisible !== false && !seen.has(item.id) && seen.add(item.id));
}
const ComparePage = () => {
  const { selectedRackets, comparisonError, removeRacket, clearComparison, addRacket } = useCompare();
  const [allProducts, setAllProducts] = useState([]), [rackets, setRackets] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(false), [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState(''), [catalogError, setCatalogError] = useState(''), [retry, setRetry] = useState(0);
  const specRows = rackets.length ? productSpecRows(rackets[0]) : [];
  const availableProducts = comparisonCatalog(allProducts, selectedRackets).filter(item => !selectedRackets.some(chosen => chosen.id === item.id));
  const selectedKey = selectedRackets.map(item => item.id).join(',');
  useEffect(() => {
    let active = true; setCatalogError('');
    productApi.getProducts({}).then(response => {
      const list = comparisonCatalog(response);
      if (active) setAllProducts(list);
    }).catch(() => { if (active) setCatalogError('Không tải được danh mục sản phẩm.'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    let active = true; setRackets([]); setDataError(''); setLoading(selectedRackets.length > 0);
    if (selectedRackets.length === 0) return;
    productApi.compareRackets(selectedRackets.map(item => item.id)).then(response => {
      const result = comparisonResults(response, selectedRackets); if (active) setRackets(result);
    }).catch(error => { if (active) setDataError(error.response?.status === 404 ? 'Có sản phẩm đã ngừng bán hoặc không còn tồn tại. Xóa lựa chọn đó để so sánh lại.' : 'Không tải được thông số so sánh. Vui lòng thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedKey, retry]);
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div>
      <p className="flex gap-2 text-xs font-bold text-blue-600"><Layers className="w-4 h-4" />SO SÁNH SẢN PHẨM</p>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Bảng so sánh sản phẩm ({selectedRackets.length}/3)</h1>
      <p className="text-xs text-slate-500 mt-1">Thông số được tải lại từ cửa hàng. Dữ liệu còn thiếu được ghi rõ.</p></div>
      <div className="flex gap-3">{selectedRackets.length < 3 && <button type="button" onClick={() => setSelectorOpen(value => !value)} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex gap-2"><Plus className="w-4 h-4" />Thêm sản phẩm so sánh</button>}
        {selectedRackets.length > 0 && <button type="button" onClick={clearComparison} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs">Xóa tất cả</button>}</div></div>
    {(dataError || catalogError || comparisonError) && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
      {dataError || catalogError || comparisonError}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Thử lại</button></div>}
    {selectedRackets.length > 0 && <div className="flex gap-2 flex-wrap">{selectedRackets.map(item => <button key={item.id} type="button" onClick={() => removeRacket(item.id)} className="border rounded-lg p-2 text-xs">{item.name || `Sản phẩm #${item.id}`} · Xóa</button>)}</div>}
    {selectorOpen && <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-md space-y-4">
      <h2 className="text-sm font-bold">Chọn sản phẩm cùng nhóm</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
        {availableProducts.map(item => <div key={item.id} className="p-3 rounded-xl border flex items-center gap-3">
          <ProductImage compact src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg shrink-0" /><div className="min-w-0 flex-1"><h3 className="text-xs font-bold truncate">{item.name}</h3><p className="text-xs text-red-600">{formatPrice(item.price)}</p></div>
          <button type="button" onClick={() => addRacket(item)} className="px-3 py-2 rounded-lg bg-red-500 text-white text-xs">Chọn</button></div>)}
        {!catalogError && availableProducts.length === 0 && <p>Chưa có sản phẩm phù hợp.</p>}</div></div>}
    {loading && <p role="status">Đang tải thông số so sánh...</p>}
    {!selectedRackets.length && <div className="bg-white rounded-3xl p-12 text-center border shadow-sm space-y-4"><h2 className="text-lg font-bold">Chưa chọn sản phẩm để so sánh</h2>
      <Link to="/products" className="inline-flex gap-2 text-red-600"><ArrowLeft className="w-4 h-4" />Xem danh sách sản phẩm</Link></div>}
    {!loading && !dataError && rackets.length > 0 && <div className="bg-white rounded-3xl border shadow-sm overflow-x-auto"><table className="w-full text-left min-w-[650px]"><thead><tr className="border-b bg-slate-50"><th className="p-5 text-xs text-slate-500">Thuộc tính kỹ thuật</th>
      {rackets.map(item => <th key={item.id} className="p-5"><ProductImage src={item.imageUrl} alt={item.name} className="aspect-square max-w-[180px] rounded-xl" />
        <Link to={`/products/${item.id}`} className="block text-sm font-bold mt-3">{item.name}</Link><p className="text-red-600 font-black">{formatPrice(item.price)}</p>
        <Link to={`/products/${item.id}`} className="block mt-3 rounded-xl bg-red-500 text-white p-2 text-xs text-center">Xem chi tiết, chọn phiên bản</Link></th>)}</tr></thead>
      <tbody className="divide-y text-xs">{specRows.map(([label], index) => <tr key={label}><th className="p-5 bg-slate-50 text-slate-700">{label}</th>{rackets.map(item => <td key={item.id} className="p-5">{productSpecRows(item)[index]?.[1] || 'Chưa có thông tin'}</td>)}</tr>)}
        <tr><th className="p-5 bg-slate-50">Tình trạng</th>{rackets.map(item => <td key={item.id} className="p-5">{item.inStock === true ? 'Còn hàng' : 'Hết hàng'}</td>)}</tr></tbody></table></div>}
  </div>;
};
export default ComparePage;
