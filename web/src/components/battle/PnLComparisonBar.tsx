'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PnLComparisonBarProps } from './types';

export function PnLComparisonBar({
  userPnL,
  opponentPnL,
  userPnLDollar,
  opponentPnLDollar,
}: PnLComparisonBarProps) {
  // Determine who's winning
  const leader = userPnL > opponentPnL ? 'you' : opponentPnL > userPnL ? 'opponent' : 'tied';
  const pnlGap = Math.abs(userPnL - opponentPnL);

  // Calculate bar widths (scale based on relative performance)
  const getBarWidth = (pnl: number) => {
    // Clamp between -50 and +50 for display purposes
    const clamped = Math.max(-50, Math.min(50, pnl));
    // Convert to 0-50 range (50% is the center)
    return Math.max(5, (clamped + 50) / 2);
  };

  const userBarWidth = getBarWidth(userPnL);
  const opponentBarWidth = getBarWidth(opponentPnL);

  return (
    <div className="px-4 py-3 bg-[#0d0d0d] border-b border-white/[0.06]">
      <div className="flex items-center gap-4">
        {/* Your P&L */}
        <div className="w-[120px] text-left">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Your P&L</div>
          <div className={`text-xl font-black ${userPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {userPnL >= 0 ? '+' : ''}{userPnL.toFixed(2)}%
          </div>
          <div className="text-xs text-white/40">
            ({userPnLDollar >= 0 ? '+' : ''}${Math.abs(userPnLDollar).toFixed(2)})
          </div>
        </div>

        {/* Visual Comparison Bar */}
        <div className="flex-1">
          {/* Bar Container */}
          <div className="relative h-6 flex items-center">
            {/* Center Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20 z-10" />

            {/* Your Bar (grows from center to left) */}
            <div className="absolute right-1/2 h-full flex justify-end">
              <div
                className={`h-full rounded-l transition-all duration-300 ${
                  leader === 'you' ? 'shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''
                }`}
                style={{
                  width: `${userBarWidth}%`,
                  background: userPnL >= 0
                    ? 'linear-gradient(270deg, #22c55e, rgba(34, 197, 94, 0.3))'
                    : 'linear-gradient(270deg, #ef4444, rgba(239, 68, 68, 0.3))',
                }}
              />
            </div>

            {/* Opponent Bar (grows from center to right) */}
            <div className="absolute left-1/2 h-full flex justify-start">
              <div
                className={`h-full rounded-r transition-all duration-300 ${
                  leader === 'opponent' ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''
                }`}
                style={{
                  width: `${opponentBarWidth}%`,
                  background: opponentPnL >= 0
                    ? 'linear-gradient(90deg, #22c55e, rgba(34, 197, 94, 0.3))'
                    : 'linear-gradient(90deg, #ef4444, rgba(239, 68, 68, 0.3))',
                }}
              />
            </div>
          </div>

          {/* Winner Indicator */}
          <div className="flex justify-center mt-2">
            <div
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                leader === 'you'
                  ? 'bg-success/20 text-success'
                  : leader === 'opponent'
                  ? 'bg-danger/20 text-danger'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {leader === 'you' && <ChevronLeft className="w-3 h-3" />}
              <span>
                {leader === 'you'
                  ? `YOU LEAD BY ${pnlGap.toFixed(2)}%`
                  : leader === 'opponent'
                  ? `THEY LEAD BY ${pnlGap.toFixed(2)}%`
                  : 'TIED'}
              </span>
              {leader === 'opponent' && <ChevronRight className="w-3 h-3" />}
            </div>
          </div>
        </div>

        {/* Opponent P&L */}
        <div className="w-[120px] text-right">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Opponent P&L</div>
          <div className={`text-xl font-black ${opponentPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {opponentPnL >= 0 ? '+' : ''}{opponentPnL.toFixed(2)}%
          </div>
          <div className="text-xs text-white/40">
            ({opponentPnLDollar >= 0 ? '+' : ''}${Math.abs(opponentPnLDollar).toFixed(2)})
          </div>
        </div>
      </div>
    </div>
  );
}
