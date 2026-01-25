'use client';

import { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BetResult {
  won: boolean;
  bet: number;
  payout: number;
  fees: number;
  newBalance: number;
}

interface PayoutBreakdownProps {
  result: BetResult;
  className?: string;
}

/**
 * PayoutBreakdown - Expandable payout details component
 *
 * Features:
 * - Default state: collapsed, shows only net result
 * - Expanded state: shows Bet, Winnings, Fees (5%), New Balance
 * - Tap to expand interaction
 * - Smooth slide-down animation on expand
 *
 * @example
 * <PayoutBreakdown
 *   result={{ won: true, bet: 0.1, payout: 0.19, fees: 0.01, newBalance: 1.09 }}
 * />
 */
export function PayoutBreakdown({ result, className }: PayoutBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Calculate net result (winnings - bet - fees for wins, -bet for losses)
  const netResult = result.won
    ? result.payout - result.bet - result.fees
    : -result.bet;

  // Format number to 2 decimal places with SOL suffix
  const formatSol = (value: number): string => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)} SOL`;
  };

  // Format number without sign prefix
  const formatSolPlain = (value: number): string => {
    return `${value.toFixed(2)} SOL`;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Collapsed view - tap to expand */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="payout-details"
      >
        <span className="text-white/60 text-sm">Payout Details</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-bold',
              netResult >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {formatSol(netResult)}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-white/40 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expanded view - details */}
      <div
        id="payout-details"
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-2 px-3 pb-2">
          {/* Bet amount */}
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Your Bet</span>
            <span className="text-white/80">{formatSolPlain(result.bet)}</span>
          </div>

          {/* Winnings (gross payout for wins) */}
          {result.won && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Winnings</span>
              <span className="text-success">{formatSolPlain(result.payout)}</span>
            </div>
          )}

          {/* Fees (5%) */}
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Fees (5%)</span>
            <span className="text-white/60">-{formatSolPlain(result.fees)}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2" />

          {/* Net result */}
          <div className="flex justify-between text-sm font-medium">
            <span className="text-white/70">Net Result</span>
            <span
              className={cn(
                'font-bold',
                netResult >= 0 ? 'text-success' : 'text-danger'
              )}
            >
              {formatSol(netResult)}
            </span>
          </div>

          {/* New balance */}
          <div className="flex justify-between text-sm">
            <span className="text-white/50">New Balance</span>
            <span className="text-white/80">{formatSolPlain(result.newBalance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
