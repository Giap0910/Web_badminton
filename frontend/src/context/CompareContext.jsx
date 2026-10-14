import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { productCategory } from '../utils/formatters';

const CompareContext = createContext(null);
export function comparisonRackets(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(item => Number.isSafeInteger(item?.id) && item.id > 0 && productCategory(item) === 'RACKET'
    && !seen.has(item.id) && seen.add(item.id)).slice(0, 3);
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
    if (comparisonRackets([product]).length !== 1) { setComparisonError('Chỉ có thể so sánh vợt cầu lông.'); return; }
    setComparisonError('');
    if (selection.current.some(item => item.id === product.id)) return;
    if (selection.current.length >= 3) { setComparisonError('Chỉ chọn tối đa 3 cây vợt.'); return; }
    const next = [...selection.current, { id: product.id, categoryId: 1, name: product.name, imageUrl: product.imageUrl }];
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
