'use client';

import { useState } from 'react';
import { Flag, X, Swords } from 'lucide-react';
import { ForfeitButtonProps } from './types';

export function ForfeitButton({ onForfeit, entryFee, disabled = false }: ForfeitButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleForfeit = () => {
    setShowConfirm(false);
    onForfeit();
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs font-medium hover:bg-white/5 hover:text-white/70 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>Forfeit</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl animate-fadeIn">
            {/* Close Button */}
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 text-center">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-danger/20 border border-danger/30 flex items-center justify-center">
                <Flag className="w-8 h-8 text-danger" />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold mb-2">Forfeit Battle?</h2>

              {/* Description */}
              <p className="text-white/60 text-sm mb-6">
                You will lose your entry fee of{' '}
                <span className="text-warning font-semibold">{entryFee} SOL</span>.
                Your opponent will win the prize pool.
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-success to-emerald-600 text-white font-bold hover:shadow-lg hover:shadow-success/30 transition-all active:scale-[0.98]"
                >
                  <Swords className="w-4 h-4" />
                  Keep Fighting
                </button>
                <button
                  onClick={handleForfeit}
                  className="flex-1 py-3 rounded-xl border border-danger/50 text-danger font-bold hover:bg-danger/10 transition-all active:scale-[0.98]"
                >
                  Yes, Forfeit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
