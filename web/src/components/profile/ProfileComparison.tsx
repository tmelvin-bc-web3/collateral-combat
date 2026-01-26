'use client';

import { cn } from '@/lib/utils';
import { DRTierBadge, DrTier } from './EloTierBadge';
import { RecentFormIndicator } from './RecentFormIndicator';

interface FighterData {
  wallet: string;
  displayName: string;
  elo: number;
  tier: DrTier;
  battleCount: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  roi: number;
  recentForm: Array<{ result: 'win' | 'loss' | 'tie'; pnlPercent: number; endedAt: number }>;
}

interface ProfileComparisonProps {
  fighter1: FighterData;
  fighter2: FighterData;
}

// Format wallet address
function formatWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Comparison stat row component
function ComparisonStat({
  label,
  value1,
  value2,
  format = 'number',
  higherIsBetter = true,
}: {
  label: string;
  value1: number;
  value2: number;
  format?: 'number' | 'percent' | 'streak';
  higherIsBetter?: boolean;
}) {
  const winner = higherIsBetter
    ? value1 > value2 ? 1 : value1 < value2 ? 2 : 0
    : value1 < value2 ? 1 : value1 > value2 ? 2 : 0;

  const formatValue = (v: number) => {
    if (format === 'percent') return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
    if (format === 'streak') return `${v}`;
    return v.toFixed(0);
  };

  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-border-primary/50">
      <div className={cn(
        'text-right font-bold text-lg',
        winner === 1 ? 'text-success' : 'text-text-primary'
      )}>
        {formatValue(value1)}
        {winner === 1 && <span className="ml-1 text-xs">+</span>}
      </div>
      <div className="text-center text-text-tertiary text-sm uppercase tracking-wider">
        {label}
      </div>
      <div className={cn(
        'text-left font-bold text-lg',
        winner === 2 ? 'text-success' : 'text-text-primary'
      )}>
        {formatValue(value2)}
        {winner === 2 && <span className="ml-1 text-xs">+</span>}
      </div>
    </div>
  );
}

export function ProfileComparison({ fighter1, fighter2 }: ProfileComparisonProps) {
  return (
    <div className="space-y-6">
      {/* Fighter Headers */}
      <div className="grid grid-cols-2 gap-6 relative">
        {/* Fighter 1 */}
        <div className="card border border-accent/30 p-4 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center border-4 border-accent/30">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">{fighter1.displayName || formatWallet(fighter1.wallet)}</h3>
          <DRTierBadge tier={fighter1.tier} dr={fighter1.elo} showDr />
        </div>

        {/* VS Divider */}
        <div className="absolute left-1/2 -translate-x-1/2 top-20 z-10">
          <div className="w-12 h-12 rounded-full bg-danger flex items-center justify-center shadow-lg shadow-danger/50">
            <span className="text-white font-black text-sm">VS</span>
          </div>
        </div>

        {/* Fighter 2 */}
        <div className="card border border-fire/30 p-4 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-fire/30 to-fire/10 flex items-center justify-center border-4 border-fire/30">
            <svg className="w-8 h-8 text-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">{fighter2.displayName || formatWallet(fighter2.wallet)}</h3>
          <DRTierBadge tier={fighter2.tier} dr={fighter2.elo} showDr />
        </div>
      </div>

      {/* Stats Comparison */}
      <div className="card border border-border-primary p-4">
        <h4 className="text-center text-text-tertiary uppercase tracking-wider text-sm mb-4">
          Head to Head Stats
        </h4>

        <ComparisonStat
          label="DR Rating"
          value1={fighter1.elo}
          value2={fighter2.elo}
        />
        <ComparisonStat
          label="Win Rate"
          value1={fighter1.winRate}
          value2={fighter2.winRate}
          format="percent"
        />
        <ComparisonStat
          label="Battles"
          value1={fighter1.battleCount}
          value2={fighter2.battleCount}
        />
        <ComparisonStat
          label="Wins"
          value1={fighter1.wins}
          value2={fighter2.wins}
        />
        <ComparisonStat
          label="Current Streak"
          value1={fighter1.currentStreak}
          value2={fighter2.currentStreak}
          format="streak"
        />
        <ComparisonStat
          label="Best Streak"
          value1={fighter1.bestStreak}
          value2={fighter2.bestStreak}
          format="streak"
        />
        <ComparisonStat
          label="ROI"
          value1={fighter1.roi}
          value2={fighter2.roi}
          format="percent"
        />
      </div>

      {/* Recent Form Comparison */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card border border-accent/20 p-4">
          <h4 className="text-center text-text-tertiary uppercase tracking-wider text-xs mb-3">Recent Form</h4>
          <div className="flex justify-center">
            <RecentFormIndicator form={fighter1.recentForm} maxItems={5} />
          </div>
        </div>
        <div className="card border border-fire/20 p-4">
          <h4 className="text-center text-text-tertiary uppercase tracking-wider text-xs mb-3">Recent Form</h4>
          <div className="flex justify-center">
            <RecentFormIndicator form={fighter2.recentForm} maxItems={5} />
          </div>
        </div>
      </div>
    </div>
  );
}
