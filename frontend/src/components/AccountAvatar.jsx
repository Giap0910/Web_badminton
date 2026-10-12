import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';
export const avatarSource = url => !url ? '' : new URL(url, axiosClient.defaults.baseURL).href;
export default function AccountAvatar({ url, name, className = 'w-full h-full' }) {
  const [broken, setBroken] = useState('');
  const src = avatarSource(url);
  return src && broken !== src ? <img src={src} alt="Ảnh đại diện" className={className + ' object-cover'} onError={() => setBroken(src)} />
    : <span className={className + ' flex items-center justify-center font-bold bg-slate-100 text-slate-800'}>{(name || 'HG')[0].toUpperCase()}</span>;
}
