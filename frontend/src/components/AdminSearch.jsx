import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { productApi } from '../api/productApi';
import { normalizeSearch } from '../utils/adminCustomers.jsx';

function searchResults(lists, query) {
  const groups = [['Sản phẩm', '/admin/products', row => [row.name, row.sku, row.brand], row => row.sku || row.name],
    ['Đơn hàng', '/admin/orders', row => [row.id, `HG-${row.payosOrderCode || row.id}`, row.customerName, row.shippingPhone], row => `HG-${row.payosOrderCode || row.id}`],
    ['Khách hàng', '/admin/customers', row => [row.fullName, row.email, row.phone], row => row.email || row.fullName]];
  return groups.flatMap(([group, path, fields, key], index) => {
    const list = lists[index].status === 'fulfilled' && Array.isArray(lists[index].value) ? lists[index].value : [];
    return list.filter(row => (index !== 2 || row.role !== 'ROLE_ADMIN') && normalizeSearch(fields(row).join(' ')).includes(normalizeSearch(query))).slice(0, 5)
      .map(row => ({ group, id: row.id, label: row.name || row.fullName || `Đơn HG-${row.payosOrderCode || row.id}`,
        href: `${path}?search=${encodeURIComponent(key(row))}` }));
  });
}

export default function AdminSearch() {
  const [query, setQuery] = useState(''), [results, setResults] = useState([]);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const input = useRef(null), navigate = useNavigate();
  useSearchShortcut(input, setOpen);
  useEffect(() => {
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setResults([]); setLoading(true);
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      const lists = await Promise.allSettled([productApi.getProducts({ catalogScope: 'all' }), adminApi.getOrders(), adminApi.getAllUsers()]);
      if (!active) return;
      setResults(searchResults(lists, query)); setLoading(false);
      if (lists.some(list => list.status === 'rejected')) setError('Một số dữ liệu chưa tải được. Vui lòng thử lại.');
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  return <SearchBox {...{ input, query, setQuery, open, setOpen, results, loading, error, navigate }} />;
}

function useSearchShortcut(input, setOpen) {
  useEffect(() => {
    const handler = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); input.current?.focus(); setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

function SearchBox({ input, query, setQuery, open, setOpen, results, loading, error, navigate }) {
  return <div className="relative w-44 sm:w-72 lg:w-96">
    <div className="flex items-center px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200">
      <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
      <input ref={input} aria-label="Tìm trong quản trị" role="combobox" aria-expanded={open} aria-controls="admin-search-results"
        value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={event => { if (event.key === 'Enter' && results[0]) { navigate(results[0].href); setOpen(false); } }}
        placeholder="Tìm đơn hàng, sản phẩm, khách hàng (Ctrl+K)..." className="w-full bg-transparent outline-none text-xs" />
    </div>
    {open && query.trim() && <div id="admin-search-results" className="absolute top-full mt-2 w-full max-h-96 overflow-auto rounded-xl bg-white border shadow-xl p-2 text-xs">
      {loading && <p className="p-2">Đang tìm...</p>}{error && <p role="alert" className="p-2 text-red-700">{error}</p>}
      {!loading && !results.length && <p className="p-2">Không tìm thấy kết quả.</p>}
      {results.map(result => <button key={`${result.group}-${result.id}`} onClick={() => { navigate(result.href); setOpen(false); }}
        className="w-full text-left p-3 hover:bg-slate-50 rounded-lg"><span className="block text-blue-600">{result.group}</span>{result.label}</button>)}
    </div>}
  </div>;
}
