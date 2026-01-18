'use client';

import { PayoutTier } from './types';

interface PayoutTiersProps {
  playerCount: number;
  prizePool: number;
  tiers: PayoutTier[];
}

// Styled place badges instead of emojis
function PlaceBadge({ place, size = 'sm' }: { place: number; size?: 'sm' | 'lg' }) {
  const colors: Record<number, string> = {
    1: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black',
    2: 'bg-gradient-to-br from-gray-300 to-gray-500 text-black',
    3: 'bg-gradient-to-br from-amber-600 to-amber-800 text-white',
  };
  const defaultColor = 'bg-[#444] text-white/70';
  const sizeClasses = size === 'lg' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs';

  return (
    <div className={`${sizeClasses} rounded-full flex items-center justify-center font-bold ${colors[place] || defaultColor}`}>
      {place}
    </div>
  );
}

function getPayoutStructure(count: number, tiers: PayoutTier[]): number[] {
  // Find the applicable tier
  const tier = tiers.find(t => count >= t.minPlayers && count <= t.maxPlayers);
  if (tier) return tier.payouts;

  // Default fallbacks
  if (count < 10) return [100];
  if (count < 20) return [60, 25, 15];
  if (count < 35) return [45, 25, 15, 10, 5];
  return [35, 20, 15, 10, 8, 7, 5];
}

function formatSOL(amount: number): string {
  if (amount < 0.01) return '<0.01';
  return amount.toFixed(2);
}

export function PayoutTiers({ playerCount, prizePool, tiers }: PayoutTiersProps) {
  const payouts = getPayoutStructure(playerCount, tiers);

  // Get top 3 for podium
  const top3 = payouts.slice(0, 3);
  const remaining = payouts.slice(3);

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [1, 0, 2];

  return (
    <div className="bg-[#2a2a2a] border border-white/[0.06] rounded-xl p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Payouts</h3>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-2 mb-4">
        {podiumOrder.map((idx, displayIdx) => {
          if (!top3[idx]) return null;
          const percent = top3[idx];
          const amount = (prizePool * percent) / 100;
          const heights = ['pb-4', 'pb-6', 'pb-3'];

          return (
            <div
              key={idx}
              className={`flex flex-col items-center p-3 rounded-lg min-w-[70px] ${heights[displayIdx]} ${
                displayIdx === 1
                  ? 'bg-gradient-to-br from-warning/20 to-transparent border border-warning/30'
                  : 'bg-[#333]'
              }`}
            >
              <PlaceBadge place={idx + 1} size="lg" />
              <span className="text-sm font-bold text-white mt-2">{percent}%</span>
              <span className="text-xs text-success">{formatSOL(amount)} SOL</span>
            </div>
          );
        })}
      </div>

      {/* Remaining Places */}
      {remaining.length > 0 && (
        <div className="space-y-1">
          {remaining.map((percent, i) => {
            const placeNum = i + 4;
            const amount = (prizePool * percent) / 100;

            return (
              <div key={placeNum} className="flex items-center justify-between py-2 px-3 text-sm text-white/60">
                <PlaceBadge place={placeNum} />
                <span>{percent}%</span>
                <span className="text-success">{formatSOL(amount)} SOL</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tier Indicator */}
      {playerCount > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-white/40 text-center">
            Payout structure for {playerCount} players
          </div>
        </div>
      )}
    </div>
  );
}
