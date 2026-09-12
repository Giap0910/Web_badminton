import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('badminton_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('badminton_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1, options = {}) => {
    const specKey = options.selectedWeightGrip || options.size || '';
    const stringKey = options.selectedStringService || '';
    const cartItemId = `${product.id}_${specKey}_${stringKey}`;

    setCart((prev) => {
      const existing = prev.find((item) => (item.cartItemId || item.product.id) === cartItemId);
      if (existing) {
        return prev.map((item) =>
          (item.cartItemId || item.product.id) === cartItemId
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock || 100), options: { ...item.options, ...options } }
            : item
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          product,
          quantity: Math.min(quantity, product.stock || 100),
          options: {
            selectedWeightGrip: options.selectedWeightGrip || '',
            size: options.size || '',
            selectedStringService: options.selectedStringService || '',
            ...options
          }
        }
      ];
    });
  };

  const removeFromCart = (cartItemId) => {
    setCart((prev) => prev.filter((item) => (item.cartItemId || item.product.id) !== cartItemId));
  };

  const updateQuantity = (cartItemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        (item.cartItemId || item.product.id) === cartItemId
          ? { ...item, quantity: Math.min(quantity, item.product.stock || 100) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('badminton_cart');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product.price || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
