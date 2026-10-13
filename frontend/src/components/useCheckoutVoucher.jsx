import { useEffect, useRef, useState } from 'react';
import { voucherApi } from '../api/voucherApi';
import { formatPrice } from '../utils/formatters';

export default function useCheckoutVoucher(code, subtotal, cartKey) {
  const [state, setState] = useState({ discountAmount: 0, error: '', success: '', validating: false });
  const key = JSON.stringify([code.trim(), subtotal, cartKey]);
  const current = useRef(key);
  current.current = key;
  const apply = async event => {
    event?.preventDefault();
    if (!code.trim()) return;
    const requestKey = key;
    setState({ discountAmount: 0, error: '', success: '', validating: true });
    try {
      const response = await voucherApi.validateVoucher(code.trim(), subtotal);
      if (current.current !== requestKey) return;
      const data = response?.data ?? response;
      if (!data?.valid) throw new Error('Mã giảm giá không hợp lệ.');
      sessionStorage.setItem('hg_voucher_code', data.code);
      setState({ discountAmount: data.discountAmount || 0, error: '', validating: false,
        success: `Áp dụng mã ${data.code} thành công! Giảm ${formatPrice(data.discountAmount)}` });
    } catch (error) {
      if (current.current === requestKey) setState({ discountAmount: 0, success: '', validating: false,
        error: error.response?.data?.message || error.message || 'Không thể xác thực mã giảm giá.' });
    }
  };
  useEffect(() => {
    current.current = key;
    setState({ discountAmount: 0, error: '', success: '', validating: Boolean(code.trim()) });
    if (!code.trim()) { sessionStorage.removeItem('hg_voucher_code'); return; }
    const timer = setTimeout(() => apply(), 250);
    return () => { clearTimeout(timer); current.current = ''; };
  }, [key]);
  return { ...state, apply };
}
