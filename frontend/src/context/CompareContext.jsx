import React, { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext(null);

export const CompareProvider = ({ children }) => {
  const [selectedRackets, setSelectedRackets] = useState(() => {
    try {
      const saved = localStorage.getItem('badminton_compare');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('badminton_compare', JSON.stringify(selectedRackets));
  }, [selectedRackets]);

  const addRacket = (product) => {
    if (selectedRackets.find((r) => r.id === product.id)) return;
    if (selectedRackets.length >= 3) {
      alert('Bạn chỉ có thể chọn tối đa 3 cây vợt để so sánh thông số cùng một lúc!');
      return;
    }
    setSelectedRackets((prev) => [...prev, product]);
  };

  const removeRacket = (productId) => {
    setSelectedRackets((prev) => prev.filter((r) => r.id !== productId));
  };

  const toggleRacket = (product) => {
    if (selectedRackets.some((r) => r.id === product.id)) {
      removeRacket(product.id);
    } else {
      addRacket(product);
    }
  };

  const clearComparison = () => {
    setSelectedRackets([]);
    localStorage.removeItem('badminton_compare');
  };

  const isInComparison = (productId) => {
    return selectedRackets.some((r) => r.id === productId);
  };

  return (
    <CompareContext.Provider
      value={{
        selectedRackets,
        addRacket,
        removeRacket,
        toggleRacket,
        clearComparison,
        isInComparison,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => useContext(CompareContext);
