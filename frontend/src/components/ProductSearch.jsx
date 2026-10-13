import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { productApi } from '../api/productApi';
import ProductImage from './ProductImage';
import { formatPrice } from '../utils/formatters';

export function useProductSuggestions(query) {
  const [state, setState] = useState({ items: [], loading: false, error: '' });
  useEffect(() => {
    setState({ items: [], loading: query.trim().length >= 2, error: '' });
    if (query.trim().length < 2) return;
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(async () => {
      try {
        const data = await productApi.getSuggestions(query.trim(), { signal: controller.signal });
        if (active) setState({ items: (data || []).filter(item => item.catalogVisible !== false), loading: false, error: '' });
      } catch (error) {
        if (active) setState({ items: [], loading: false, error: 'Chưa tải được gợi ý. Bấm Enter để tìm lại.' });
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query]);
  return state;
}

export default function ProductSearch({ onNavigate }) {
  const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [selected, setSelected] = useState(-1);
  const suggestions = useProductSuggestions(query), navigate = useNavigate(), container = useRef(null);
  useEffect(() => { setSelected(-1); }, [query]);
  useEffect(() => {
    const close = event => { if (!container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const go = path => { setOpen(false); setQuery(''); navigate(path); onNavigate?.(); };
  const submit = event => {
    event.preventDefault();
    if (query.trim()) go(selected >= 0 && suggestions.items[selected] ? `/products/${suggestions.items[selected].id}` : `/products?keyword=${encodeURIComponent(query.trim())}`);
  };
  const keyDown = event => {
    if (event.key === 'Escape') { setOpen(false); setSelected(-1); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setSelected(previous => !suggestions.items.length ? -1 : previous < 0
        ? (event.key === 'ArrowDown' ? 0 : suggestions.items.length - 1)
        : (previous + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.items.length) % suggestions.items.length);
    }
  };
  return <SearchForm {...{ container, query, setQuery, open, setOpen, selected, setSelected, suggestions, submit, keyDown, go }} />;
}

function SearchForm({ container, query, setQuery, open, setOpen, selected, setSelected, suggestions, submit, keyDown, go }) {
  return <form ref={container} onSubmit={submit} className="relative w-full lg:w-auto lg:flex-1 max-w-xl mx-0 lg:mx-4 order-3 lg:order-2 min-w-0">
    <div className="relative flex items-center w-full"><Search className="absolute left-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
      <input aria-label="Tìm kiếm sản phẩm" role="combobox" aria-autocomplete="list" aria-expanded={open && query.trim().length >= 2} aria-controls="product-search-suggestions"
        aria-activedescendant={open && selected >= 0 ? `product-suggestion-${selected}` : undefined} value={query} onFocus={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setOpen(true); }} onKeyDown={keyDown}
        placeholder="Tìm kiếm vợt, giày, phụ kiện Yonex, Lining, Victor..."
        className="w-full bg-slate-800/80 hover:bg-slate-800 focus:bg-white text-white focus:text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm pl-10 pr-9 py-2 rounded-full border border-slate-700 focus:border-royal focus:outline-none transition-all shadow-inner" />
      {query && <button type="button" aria-label="Xóa từ khóa tìm kiếm" onClick={() => { setQuery(''); setSelected(-1); }} className="absolute right-3 text-slate-400"><X className="w-4 h-4" /></button>}
    </div>
    {open && query.trim().length >= 2 && <SuggestionList {...{ suggestions, selected, setSelected, query, go }} />}
  </form>;
}

function SuggestionList({ suggestions, selected, setSelected, query, go }) {
  return <div className="absolute top-full mt-2 inset-x-0 rounded-xl bg-white text-slate-900 border border-slate-200 shadow-xl overflow-hidden z-50">
    {suggestions.loading && <p role="status" className="p-4 text-xs">Đang tìm sản phẩm...</p>}
    {suggestions.error && <p role="alert" className="p-4 text-xs text-red-700">{suggestions.error}</p>}
    {!suggestions.loading && !suggestions.error && !suggestions.items.length && <p className="p-4 text-xs">Không có sản phẩm phù hợp.</p>}
    <div id="product-search-suggestions" role="listbox" aria-label="Gợi ý sản phẩm">{suggestions.items.map((item, index) =>
      <button type="button" id={`product-suggestion-${index}`} role="option" aria-selected={selected === index} key={item.id}
        onMouseEnter={() => setSelected(index)} onClick={() => go(`/products/${item.id}`)}
        className={`w-full text-left p-3 flex gap-3 items-center ${selected === index ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
        <ProductImage src={item.imageUrl} alt={item.name} className="w-11 h-11 shrink-0 object-contain rounded-lg overflow-hidden !p-1 [&>span]:hidden [&>div]:w-7 [&>div]:h-7 [&>div]:mb-0" />
        <span className="min-w-0"><span className="block text-xs font-bold truncate">{item.name}</span><span className="text-xs text-secondary">{formatPrice(item.price)}</span></span>
      </button>)}</div>
    <button type="button" onClick={() => go(`/products?keyword=${encodeURIComponent(query.trim())}`)} className="p-3 w-full text-xs text-blue-600 border-t text-left">Xem tất cả kết quả</button>
  </div>;
}
