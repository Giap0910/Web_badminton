import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const CompareContext = createContext(null);
export function comparisonGroup(product) {
  const category = Number(product?.categoryId);
  if (![1, 2, 3, 4, 5].includes(category)) return null;
  if (category !== 5) return String(category);
  const subtype = String(product?.accessoryType || '').trim().toLowerCase();
  return subtype ? `5:${subtype}` : null;
}
export function comparisonRackets(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set(); let group = null;
  return value.filter(item => {
    const nextGroup = comparisonGroup(item);
    if (!Number.isSafeInteger(item?.id) || item.id <= 0 || !nextGroup || seen.has(item.id)) return false;
    if (group && group !== nextGroup) return false;
    group = nextGroup; seen.add(item.id); return true;
  }).slice(0, 3);
}
export const CompareProvider = ({ children }) => {
  const [selectedRackets, setSelectedRackets] = useState(() => {
    try { return comparisonRackets(JSON.parse(localStorage.getItem('badminton_compare') || '[]')); } catch { return []; }
  });
  const [comparisonError, setComparisonError] = useState('');
  const selection = useRef(selectedRackets); selection.current = selectedRackets;
  useEffect(() => {
    try { localStorage.setItem('badminton_compare', JSON.stringify(selectedRackets)); }
    catch { setComparisonError('Không lưu được danh sách so sánh trên thiết bị.'); }
  }, [selectedRackets]);
  const addRacket = product => {
    if (comparisonRackets([product]).length !== 1) { setComparisonError('Sản phẩm chưa có nhóm hoặc loại phụ kiện để so sánh.'); return; }
    setComparisonError('');
    if (selection.current.length && comparisonGroup(selection.current[0]) !== comparisonGroup(product)) {
      setComparisonError('Chỉ so sánh sản phẩm cùng nhóm và phụ kiện cùng loại. Hãy xóa lựa chọn hiện tại trước khi đổi nhóm.'); return;
    }
    if (selection.current.some(item => item.id === product.id)) return;
    if (selection.current.length >= 3) { setComparisonError('Chỉ chọn tối đa 3 sản phẩm.'); return; }
    const next = [...selection.current, { id: product.id, categoryId: Number(product.categoryId), accessoryType: product.accessoryType, name: product.name, imageUrl: product.imageUrl }];
    selection.current = next; setSelectedRackets(next);
  };
  const removeRacket = productId => { setComparisonError(''); selection.current = selection.current.filter(item => item.id !== productId); setSelectedRackets(selection.current); };
  const toggleRacket = product => selection.current.some(item => item.id === product.id) ? removeRacket(product.id) : addRacket(product);
  const clearComparison = () => { selection.current = []; setSelectedRackets([]); setComparisonError(''); };
  const isInComparison = productId => selectedRackets.some(item => item.id === productId);
  return <CompareContext.Provider value={{ selectedRackets, comparisonError, addRacket, removeRacket, toggleRacket, clearComparison, isInComparison }}>
    {children}</CompareContext.Provider>;
};
export const useCompare = () => useContext(CompareContext);
