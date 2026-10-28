import React from 'react';
import { CATEGORY_FIELDS, VARIANT_CHOICE_FIELDS } from '../utils/adminProductForm';

const inputClass = 'w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none transition-all shadow-inner';
const choices = { gender: [['Nam', 'Nam'], ['Nữ', 'Nữ'], ['Unisex', 'Unisex']],
  bagType: [['bao_vot_nhiet', 'Bao vợt cách nhiệt'], ['balo', 'Balo'], ['tui_holdall', 'Túi Holdall']],
  accessoryType: [['day_cuoc', 'Dây cước'], ['quan_can', 'Quấn cán'], ['qua_cau', 'Quả cầu'], ['bang_do', 'Băng chặn mồ hôi']] };

function ProductField({ field, form, onChange }) {
  const [key, label, maxLength, type = 'text'] = field;
  const options = choices[key];
  const props = { id: `product-${key}`, value: form[key] ?? '', disabled: form.hasVariants && VARIANT_CHOICE_FIELDS.includes(key),
    onChange: event => onChange(key, event.target.value), className: `${inputClass} disabled:opacity-60` };
  return <div className="flex flex-col gap-1.5">
    <label htmlFor={props.id} className="text-xs font-bold text-slate-900">{label}</label>
    {options ? <select {...props}><option value="">Chưa có thông tin</option>
      {form[key] && !options.some(([value]) => value === form[key]) && <option value={form[key]}>{form[key]}</option>}
      {options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
    </select> : <input {...props} type={type} maxLength={maxLength || undefined} min={type === 'number' ? 0 : undefined}
      step={type === 'number' ? 1 : undefined} placeholder={key === 'availableSizes' ? 'Ví dụ: 39, 40, 40.5 hoặc S, M, L' : undefined} />}
  </div>;
}

export default function AdminProductFields({ form, onChange }) {
  const fields = CATEGORY_FIELDS[form.categoryId] || [];
  return <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProductField field={['origin', 'Xuất xứ', 100]} form={form} onChange={onChange} />
      <ProductField field={['colorName', 'Màu sắc', 200]} form={form} onChange={onChange} />
      {fields.map(field => <ProductField key={field[0]} field={field} form={form} onChange={onChange} />)}
    </div>
    {form.hasVariants && <p className="text-xs text-slate-600">Màu, kích cỡ, trọng lượng và quy cách được tổng hợp từ biến thể. Thêm hoặc ngừng bán từng tổ hợp tại “Tồn từng biến thể”.</p>}
    <div className="flex flex-col gap-1.5"><label htmlFor="product-description" className="text-xs font-bold text-slate-900">Mô tả sản phẩm</label>
      <textarea id="product-description" value={form.description} onChange={event => onChange('description', event.target.value)} rows={3} className={inputClass} />
    </div>
  </>;
}
