import { useEffect, useRef, useState } from 'react';
import { voucherApi } from '../api/voucherApi';
import { formatPrice } from '../utils/formatters';

export function checkoutVoucherQuote(subtotal, validation = {}) {
  const baseShippingFee = subtotal === 0 || subtotal >= 1000000 ? 0 : 30000;
  const amount = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const discountAmount = Math.min(Math.max(0, subtotal), amount(validation.discountAmount));
  const shippingDiscount = Math.min(baseShippingFee, amount(validation.shippingDiscountAmount));
  const serverShippingFee = validation.finalShippingFee;
  const finalShippingFee = Number.isInteger(serverShippingFee) && serverShippingFee >= 0 && serverShippingFee <= baseShippingFee
    ? serverShippingFee : baseShippingFee - shippingDiscount;
  return { discountAmount, shippingDiscountAmount: baseShippingFee - finalShippingFee, finalShippingFee };
}

export function checkoutVoucherSuccess(code, quote) {
  const benefit = quote.shippingDiscountAmount > 0 ? `Giảm phí vận chuyển ${formatPrice(quote.shippingDiscountAmount)}`
    : `Giảm tiền hàng ${formatPrice(quote.discountAmount)}`;
  return `Áp dụng mã ${code} thành công! ${benefit}`;
}

export default function useCheckoutVoucher(code, subtotal, cartKey) {
  const key = JSON.stringify([code.trim(), subtotal, cartKey]);
  const blank = { ...checkoutVoucherQuote(subtotal), key, appliedVoucher: null, error: '', success: '', validating: Boolean(code.trim()) };
  const [state, setState] = useState(blank);
  const current = useRef(key);
  const generation = useRef(0);
  const timerRef = useRef(null);
  current.current = key;
  const apply = async event => {
    event?.preventDefault();
    if (!code.trim()) return;
    clearTimeout(timerRef.current);
    const requestKey = key;
    const requestGeneration = ++generation.current;
    const active = () => current.current === requestKey && generation.current === requestGeneration;
    setState({ ...blank, validating: true });
    try {
      const response = await voucherApi.validateVoucher(code.trim(), subtotal);
      if (!active()) return;
      const data = response?.data ?? response;
      if (!data?.valid) throw new Error('Mã giảm giá không hợp lệ.');
      const quote = checkoutVoucherQuote(subtotal, data);
      sessionStorage.setItem('hg_voucher_code', data.code);
      setState({ ...quote, key, appliedVoucher: data, error: '', validating: false,
        success: checkoutVoucherSuccess(data.code, quote) });
    } catch (error) {
      if (active()) setState({ ...blank, validating: false,
        error: error.response?.data?.message || error.message || 'Không thể xác thực mã giảm giá.' });
    }
  };
  useEffect(() => {
    current.current = key;
    generation.current += 1; setState(blank);
    sessionStorage.removeItem('hg_voucher_code');
    if (code.trim()) timerRef.current = setTimeout(() => apply(), 250);
    return () => { clearTimeout(timerRef.current); generation.current += 1; current.current = ''; };
  }, [key]);
  return { ...(state.key === key ? state : blank), apply };
}
