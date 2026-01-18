'use client';

import { Swords, Gift, Info } from 'lucide-react';
import { TWPhase, BET_AMOUNTS } from './types';

interface BettingBarProps {
  phase: TWPhase;
  selectedAmount: number;
  onAmountChange: (amount: number) => void;
  freeBetCount: number;
  useFreeBet: boolean;
  onFreeBetToggle: () => void;
  isPlacingBet: boolean;
  hasBet: boolean;
}

export function BettingBar({
  phase,
  selectedAmount,
  onAmountChange,
  freeBetCount,
  useFreeBet,
  onFreeBetToggle,
  isPlacingBet,
  hasBet,
}: BettingBarProps) {
  const isBettingDisabled = phase !== 'betting' || hasBet || isPlacingBet;

  return (
    <div className="relative bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-5 mb-6">
      {/* Disabled Overlay */}
      {isBettingDisabled && !hasBet && (
        <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-white font-semibold">
            {phase === 'in_progress' ? (
              <>
                <Swords className="w-5 h-5 text-warning" />
                Battle in progress!
              </>
            ) : phase === 'cooldown' ? (
              <>
                <span className="text-warning">Calculating results...</span>
              </>
            ) : (
              <span>Waiting for next battle...</span>
            )}
          </div>
        </div>
      )}

      {/* Already Bet Message */}
      {hasBet && (
        <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center z-10">
          <div className="text-success font-semibold">
            Bet placed! Good luck!
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Wager Selection */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 uppercase font-semibold">BET AMOUNT:</span>

          {/* Amount Buttons */}
          <div className="flex gap-1.5">
            {BET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => onAmountChange(amount)}
                disabled={isBettingDisabled || useFreeBet}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedAmount === amount && !useFreeBet
                    ? 'bg-warning text-black'
                    : 'bg-white/5 border border-white/[0.06] text-white/60 hover:border-white/10'
                } ${useFreeBet ? 'opacity-50' : ''}`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Free Bet Toggle */}
        <button
          onClick={onFreeBetToggle}
          disabled={freeBetCount === 0 || isBettingDisabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            freeBetCount === 0 || isBettingDisabled
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : useFreeBet
              ? 'bg-success/20 border border-success/50 text-success'
              : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
          }`}
        >
          <Gift className="w-4 h-4" />
          {useFreeBet ? 'Using Free Bet (0.01 SOL)' : `Free Bet (${freeBetCount})`}
        </button>
      </div>

      {/* Hint */}
      <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-white/40">
          <Info className="w-4 h-4" />
          Pick the token you think will have the better % price change over 5 minutes!
        </div>
      </div>
    </div>
  );
}
