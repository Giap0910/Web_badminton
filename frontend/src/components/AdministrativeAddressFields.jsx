import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

let catalogRequest;
export const loadAdministrativeCatalog = () => {
  if (!catalogRequest) catalogRequest = axiosClient.get('/administrative-units').catch(error => { catalogRequest = null; throw error; });
  return catalogRequest;
};
export default function AdministrativeAddressFields({ provinceCode, wardCode, onChange }) {
  const [catalog, setCatalog] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    loadAdministrativeCatalog().then(data => { if (active) setCatalog(data); })
      .catch(() => { if (active) setError('Chưa tải được tỉnh và phường/xã. Vui lòng tải lại trang.'); });
    return () => { active = false; };
  }, []);
  const chooseProvince = code => onChange({ provinceCode: code, province: catalog.provinces.find(p => p.code === code)?.name || '', wardCode: '', ward: '' });
  const chooseWard = code => onChange({ provinceCode, province: catalog.provinces.find(p => p.code === provinceCode)?.name || '', wardCode: code, ward: catalog.wards.find(w => w.code === code && w.provinceCode === provinceCode)?.name || '' });
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <AddressSelect label="Tỉnh / Thành phố" value={provinceCode} disabled={!catalog} options={catalog?.provinces || []} onChange={chooseProvince} />
    <AddressSelect label="Phường / Xã" value={wardCode} disabled={!catalog || !provinceCode} options={(catalog?.wards || []).filter(w => w.provinceCode === provinceCode)} onChange={chooseWard} />
    {error && <p role="alert" className="text-red-700 text-xs md:col-span-2">{error}</p>}
  </div>;
}
function AddressSelect({ label, value, disabled, options, onChange }) {
  return <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-900">{label} *
    <select aria-label={label} required value={value || ''} disabled={disabled} onChange={event => onChange(event.target.value)}
      className="w-full bg-slate-50 focus:bg-white text-slate-900 text-sm px-3.5 py-3 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner">
      <option value="">{disabled ? 'Đang chờ danh mục hoặc chọn tỉnh' : 'Chọn ' + label.toLowerCase()}</option>
      {options.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
    </select>
  </label>;
}
