import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { productApi } from '../api/productApi';
import { normalizeSearch } from '../utils/adminCustomers.jsx';

export function searchResults(lists, query) {
  const term = normalizeSearch(query).replace(/^#(?=hg-)/, '');
  const groups = [['Sản phẩm', '/admin/products', row => [row.id, row.name, row.sku, row.brand],
    row => /^\d+$/.test(term) && String(row.id).includes(term) ? row.id : row.sku || row.name],
    ['Đơn hàng', '/admin/orders', row => [row.id, `HG-${row.id}`, row.payosOrderCode,
      row.payosOrderCode == null ? '' : `HG-${row.payosOrderCode}`, row.customerName, row.shippingPhone], row => `HG-${row.id}`],
    ['Khách hàng', '/admin/customers', row => [row.fullName, row.email, row.phone], row => row.email || row.fullName]];
  return groups.flatMap(([group, path, fields, key], index) => {
    const list = lists[index].status === 'fulfilled' && Array.isArray(lists[index].value) ? lists[index].value : [];
    return list.filter(row => (index !== 2 || row.role !== 'ROLE_ADMIN') && normalizeSearch(fields(row).join(' ')).includes(term)).slice(0, 5)
      .map(row => ({ group, id: row.id, label: row.name || row.fullName || `Đơn #HG-${row.id}`,
        productSku: index === 0 ? row.sku ?? null : null,
        providerCode: index === 1 ? row.payosOrderCode ?? null : null,
        href: `${path}?search=${encodeURIComponent(key(row))}` }));
  });
}

export default function AdminSearch() {
  const [query, setQuery] = useState(''), [results, setResults] = useState([]);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const input = useRef(null), queryRef = useRef(query), navigate = useNavigate();
  const changeQuery = value => {
    queryRef.current = value; setQuery(value); setResults([]); setLoading(!!value.trim()); setError(''); setActiveIndex(-1); setOpen(true);
  };
  useSearchShortcut(input, setOpen);
  useAdminSearchResults(query, queryRef, setResults, setLoading, setError, setActiveIndex);
  useEffect(() => {
    if (open && activeIndex >= 0) input.current?.ownerDocument?.getElementById(`admin-search-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);
  return <SearchBox {...{ input, query, changeQuery, open, setOpen, results, loading, error, navigate, activeIndex, setActiveIndex }} />;
}

function useAdminSearchResults(query, queryRef, setResults, setLoading, setError, setActiveIndex) {
  useEffect(() => {
    setActiveIndex(-1);
    if (!query.trim()) { setResults([]); setLoading(false); setError(''); return; }
    setResults([]); setLoading(true); setError('');
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      const lists = await Promise.allSettled([productApi.getProducts({ catalogScope: 'all' }), adminApi.getOrders(), adminApi.getAllUsers()]);
      if (!active || queryRef.current !== query) return;
      setResults(searchResults(lists, query)); setLoading(false);
      if (lists.some(list => list.status === 'rejected')) setError('Một số dữ liệu chưa tải được. Vui lòng thử lại.');
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
}

function useSearchShortcut(input, setOpen) {
  useEffect(() => {
    const handler = event => {
      if (event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        input.current?.focus(); setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

function handleSearchKey(event, { open, setOpen, results, loading, error, activeIndex, setActiveIndex, select }) {
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) { event.preventDefault(); return; }
  if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActiveIndex(-1); return; }
  if (loading || error || !results.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); setOpen(true);
    setActiveIndex(index => event.key === 'ArrowDown' ? (index + 1) % results.length : index <= 0 ? results.length - 1 : index - 1);
  } else if (event.key === 'Enter' && open) {
    event.preventDefault(); select(results[activeIndex >= 0 ? activeIndex : 0]);
  }
}

function SearchBox({ input, query, changeQuery, open, setOpen, results, loading, error, navigate, activeIndex, setActiveIndex }) {
  const select = result => { navigate(result.href); setOpen(false); setActiveIndex(-1); };
  const keyboard = { open, setOpen, results, loading, error, activeIndex, setActiveIndex, select };
  return <div className="relative w-44 sm:w-72 lg:w-96">
    <div className="flex items-center px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200">
      <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
      <input ref={input} aria-label="Tìm trong quản trị" role="combobox" aria-expanded={open && !!query.trim()} aria-controls="admin-search-results"
        aria-autocomplete="list" aria-activedescendant={open && activeIndex >= 0 && results[activeIndex] ? `admin-search-option-${activeIndex}` : undefined}
        value={query} onChange={event => changeQuery(event.target.value)} onFocus={() => setOpen(true)}
        onKeyDown={event => handleSearchKey(event, keyboard)}
        placeholder="Tìm đơn hàng, sản phẩm, khách hàng (Ctrl+K)..." className="w-full bg-transparent outline-none text-xs" />
    </div>
    {open && query.trim() && <div id="admin-search-results" role="listbox" aria-label="Kết quả tìm kiếm quản trị" className="absolute top-full mt-2 w-full max-h-96 overflow-auto rounded-xl bg-white border shadow-xl p-2 text-xs">
      {loading && <p className="p-2">Đang tìm...</p>}{error && <p role="alert" className="p-2 text-red-700">{error}</p>}
      {!loading && !results.length && <p className="p-2">Không tìm thấy kết quả.</p>}
      {results.map((result, index) => <button key={`${result.group}-${result.id}`} id={`admin-search-option-${index}`} role="option" type="button"
        aria-selected={activeIndex === index} disabled={loading || !!error} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(result)}
        className={`w-full text-left p-3 hover:bg-slate-50 rounded-lg ${activeIndex === index ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}><span className="block text-blue-600">{result.group}</span>{result.label}
        {result.group === 'Sản phẩm' && <span className="block text-slate-500">ID: {result.id}{result.productSku ? ` · ${result.productSku}` : ''}</span>}
        {result.providerCode != null && <span className="block text-slate-500">Mã PayOS: {result.providerCode}</span>}</button>)}
    </div>}
  </div>;
}
