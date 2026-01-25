'use client';

import { useEffect } from 'react';
import { useConfetti } from '@/components/Confetti';
import { PayoutBreakdown, BetResult } from './PayoutBreakdown';
import { cn } from '@/lib/utils';

interface WinModalProps {
  /** The bet result to display */
  result: BetResult;
  /** Callback when the modal is dismissed */
  onDismiss: () => void;
}

/**
 * WinModal - Contained celebration modal for bet wins
 *
 * Features:
 * - Card overlay (NOT full-screen takeover per CONTEXT.md)
 * - Triggers confetti via useConfetti hook on mount
 * - Shows net result prominently: "You won +{net} SOL" in success color
 * - Contains PayoutBreakdown component (collapsed by default)
 * - Has "Continue" button to dismiss
 * - z-index: 50 (above QuickBetStrip z-40)
 * - Fade-in animation on entrance
 *
 * @example
 * <WinModal
 *   result={{ won: true, bet: 0.1, payout: 0.19, fees: 0.01, newBalance: 1.09 }}
 *   onDismiss={() => setShowWinModal(false)}
 * />
 */
export function WinModal({ result, onDismiss }: WinModalProps) {
  const { triggerConfetti, ConfettiComponent } = useConfetti();

  // Trigger confetti on mount
  useEffect(() => {
    triggerConfetti();

    // Haptic feedback for celebration (progressive enhancement)
    if ('vibrate' in navigator) {
      // Celebration pattern: short-pause-short
      navigator.vibrate([100, 50, 100]);
    }
  }, [triggerConfetti]);

  // Calculate net winnings (payout - bet - fees)
  const netWinnings = result.payout - result.bet - result.fees;

  // Format to 2 decimal places
  const formatSol = (value: number): string => {
    return `+${value.toFixed(2)}`;
  };

  return (
    <>
      {/* Confetti overlay */}
      {ConfettiComponent}

      {/* Modal backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onDismiss}
        role="dialog"
        aria-modal="true"
        aria-labelledby="win-modal-title"
      >
        {/* Modal card - stop click propagation */}
        <div
          className={cn(
            'w-full max-w-sm bg-black/90 border border-success/30 rounded-2xl p-6',
            'shadow-[0_0_40px_rgba(127,186,0,0.3)]',
            'animate-scaleIn'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Victory header */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-2" role="img" aria-label="trophy">
              &#127942;
            </div>
            <h2
              id="win-modal-title"
              className="text-2xl font-bold text-success mb-1"
            >
              You Won!
            </h2>
            <p className="text-4xl font-bold text-white">
              <span className="text-success">{formatSol(netWinnings)}</span>
              <span className="text-white/60 text-lg ml-2">SOL</span>
            </p>
          </div>

          {/* Payout breakdown */}
          <PayoutBreakdown result={result} className="mb-6" />

          {/* Continue button */}
          <button
            onClick={onDismiss}
            className={cn(
              'w-full py-3 px-4 rounded-xl font-bold text-lg',
              'bg-success text-black',
              'hover:bg-success/90 active:bg-success/80',
              'transition-colors duration-150',
              'touch-manipulation'
            )}
            style={{ minHeight: 48 }}
          >
            Continue
          </button>
        </div>
      </div>

      {/* Inline styles for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out forwards;
        }
      `}</style>
    </>
  );
}
