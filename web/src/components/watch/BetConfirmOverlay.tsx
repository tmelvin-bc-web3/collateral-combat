'use client';

import { cn } from '@/lib/utils';

interface BetConfirmOverlayProps {
  amount: number;
  fighter: string;
  fighterWallet: string;
  odds: number;
  potentialPayout: number;
  isPlacing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

// Minimum touch target height (project standard)
const MIN_TOUCH_HEIGHT = 44;

/**
 * BetConfirmOverlay - Two-tap bet confirmation modal
 *
 * Shows a confirmation overlay when user swipes to bet.
 * Displays bet amount, fighter, odds, and potential payout.
 * Provides confirm and cancel buttons.
 *
 * Features:
 * - Slides up from bottom
 * - Loading state during bet placement
 * - Prominent confirm button (bg-warning)
 * - Secondary cancel button
 *
 * @example
 * <BetConfirmOverlay
 *   amount={0.1}
 *   fighter="8xK4...9pQ2"
 *   fighterWallet="8xK4..."
 *   odds={2.15}
 *   potentialPayout={0.215}
 *   isPlacing={false}
 *   onConfirm={() => placeBet()}
 *   onCancel={() => cancelBet()}
 * />
 */
export function BetConfirmOverlay({
  amount,
  fighter,
  fighterWallet,
  odds,
  potentialPayout,
  isPlacing,
  onConfirm,
  onCancel,
  className,
}: BetConfirmOverlayProps) {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 animate-slideUp',
        className
      )}
      style={{
        bottom: 'calc(120px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-lg mx-auto px-3">
        <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-xl">
          {/* Bet summary */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-white mb-1">
              Confirm Bet
            </h3>
            <p className="text-white/70 text-sm">
              Bet <span className="text-warning font-bold">{amount} SOL</span> on{' '}
              <span className="text-white font-medium">{fighter}</span>
            </p>
          </div>

          {/* Payout calculation */}
          <div className="bg-white/5 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Odds</span>
              <span className="font-mono text-white">{odds.toFixed(2)}x</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-white/50">Potential Payout</span>
              <span className="font-mono text-success font-bold">
                {potentialPayout.toFixed(4)} SOL
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isPlacing}
              style={{ minHeight: MIN_TOUCH_HEIGHT }}
              className={cn(
                'min-h-[44px] flex-1 py-3 px-4 rounded-xl font-semibold touch-manipulation',
                'bg-white/10 text-white/80 hover:bg-white/20',
                'transition-transform duration-150 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100'
              )}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPlacing}
              style={{ minHeight: MIN_TOUCH_HEIGHT }}
              className={cn(
                'min-h-[44px] flex-1 py-3 px-4 rounded-xl font-bold touch-manipulation flex items-center justify-center gap-2',
                'bg-warning text-black hover:bg-warning/90',
                'transition-transform duration-150 active:scale-95',
                isPlacing && 'opacity-70 cursor-not-allowed scale-100'
              )}
            >
              {isPlacing ? (
                <>
                  <LoadingSpinner />
                  <span>Placing...</span>
                </>
              ) : (
                'Confirm Bet'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple loading spinner component
 */
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
