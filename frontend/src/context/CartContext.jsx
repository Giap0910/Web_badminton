import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const CartContext = createContext(null);
const textOption = (value) => typeof value === 'string' ? value.trim() : '';

export const normalizeOptions = (options = {}) => ({
  selectedSize: textOption(options.selectedSize || options.size),
  selectedColor: textOption(options.selectedColor || options.color),
  selectedWeight: textOption(options.selectedWeight || options.selectedWeightGrip || options.weightGrip),
  stringingService: textOption(options.stringingService || options.selectedStringService || options.stringService),
  stringTension: textOption(options.stringTension) ||
    (textOption(options.stringingService || options.stringService || options.selectedStringService).match(/\d+(?:\.\d+)?kg\s*\/\s*[\d.]+lbs/)?.[0] || ''),
  gender: textOption(options.gender),
  capacity: textOption(options.capacity),
  packaging: textOption(options.packaging),
});

export const cartLineId = (product, options) => JSON.stringify([product.id, normalizeOptions(options)]);
const stockLimit = (product) => Number.isInteger(product.stock) ? Math.max(0, product.stock) : 0;

const readCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('badminton_cart') || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((item) => item?.product?.id && Number.isInteger(item.quantity) && item.quantity > 0)
      .map((item) => {
        const options = normalizeOptions({ ...item, ...item.options });
        return { ...item, ...options, options, cartItemId: cartLineId(item.product, options) };
      });
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(readCart);
  const cartRef = useRef(cart);
  const commitCart = (next) => {
    cartRef.current = next;
    setCart(next);
  };

  useEffect(() => {
    localStorage.setItem('badminton_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1, rawOptions = {}) => {
    const prev = cartRef.current;
    if (!product?.id || !Number.isInteger(quantity) || quantity <= 0) return null;
    const used = prev.filter((item) => item.product.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
    if (used + quantity > stockLimit(product) || used + quantity > 100) return null;
    const options = normalizeOptions(rawOptions);
    const cartItemId = cartLineId(product, options);
    const existing = prev.find((item) => item.cartItemId === cartItemId);
    const next = existing
      ? prev.map((item) => item.cartItemId === cartItemId ? { ...item, product, quantity: item.quantity + quantity } : item)
      : [...prev, { cartItemId, product, quantity, options, ...options }];
    commitCart(next);
    return cartItemId;
  };

  const removeFromCart = (cartItemId) => {
    commitCart(cartRef.current.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 0) return;
    if (quantity === 0) return removeFromCart(cartItemId);
    const prev = cartRef.current;
    const target = prev.find((item) => item.cartItemId === cartItemId);
    if (!target) return;
    const others = prev.filter((item) => item.product.id === target.product.id && item.cartItemId !== cartItemId)
      .reduce((sum, item) => sum + item.quantity, 0);
    if (quantity + others > stockLimit(target.product) || quantity + others > 100) return;
    commitCart(prev.map((item) => item.cartItemId === cartItemId ? { ...item, quantity } : item));
  };

  const clearCart = () => commitCart([]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
