import React from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { Layers, X, ArrowRight } from 'lucide-react';

const RacketComparisonBar = () => {
  const { selectedRackets, removeRacket, clearComparison } = useCompare();

  if (selectedRackets.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center gap-4 max-w-xl w-[92%] animate-fade-in-up">
      <div className="flex items-center gap-2 text-xs font-bold text-teal-400 shrink-0">
        <Layers className="w-4 h-4" />
        <span className="hidden sm:inline">So Sánh ({selectedRackets.length}/3)</span>
      </div>

      {/* Rackets Preview Avatars */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto py-1">
        {selectedRackets.map((racket) => (
          <div
            key={racket.id}
            className="relative group bg-slate-800 rounded-lg p-1 flex items-center gap-2 border border-slate-700 shrink-0"
          >
            <img
              src={racket.imageUrl}
              alt={racket.name}
              className="w-8 h-8 rounded object-cover"
            />
            <span className="text-[11px] font-medium max-w-[100px] truncate hidden md:inline">
              {racket.name}
            </span>
            <button
              onClick={() => removeRacket(racket.id)}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={clearComparison}
          className="text-xs text-slate-400 hover:text-white px-2 py-1"
        >
          Xóa
        </button>
        <Link
          to="/compare"
          className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95 transition-transform"
        >
          <span>Xem Bảng</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default RacketComparisonBar;
