'use client';

import { Target, Check, X, Eye, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { UserBet, BettingStats } from './types';

interface MyBetsSectionProps {
  activeBets: UserBet[];
  betHistory: UserBet[];
  stats: BettingStats;
  isConnected: boolean;
  onWatchBattle: (battleId: string) => void;
  onViewLive: () => void;
}

function StatCard({
  value,
  label,
  icon: Icon,
  variant = 'default',
}: {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'positive' | 'negative' | 'highlight';
}) {
  const colorClass = {
    default: 'text-white',
    positive: 'text-success',
    negative: 'text-danger',
    highlight: 'text-warning',
  }[variant];

  return (
    <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4 text-center">
      {Icon && <Icon className={`w-5 h-5 mx-auto mb-1 ${colorClass}`} />}
      <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
      <span className="block text-[11px] text-white/40 uppercase tracking-wider mt-1">
        {label}
      </span>
    </div>
  );
}

export function MyBetsSection({
  activeBets,
  betHistory,
  stats,
  isConnected,
  onWatchBattle,
  onViewLive,
}: MyBetsSectionProps) {
  if (!isConnected) {
    return (
      <div className="text-center py-12 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
        <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <h3 className="font-bold mb-2">Identity Required</h3>
        <p className="text-white/50 text-sm">Connect your wallet to view your betting history</p>
      </div>
    );
  }

  const hasNoBets = activeBets.length === 0 && betHistory.length === 0;

  if (hasNoBets) {
    return (
      <div className="text-center py-12 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
        <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <h3 className="font-bold mb-2">No Wagers Yet</h3>
        <p className="text-white/50 text-sm mb-4">
          You haven&apos;t backed any warriors yet. Watch a battle and place your first wager!
        </p>
        <button
          onClick={onViewLive}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-warning text-black rounded-lg font-semibold text-sm hover:bg-warning/90 transition-colors"
        >
          Find a Battle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard value={stats.totalBets.toString()} label="Total Bets" />
        <StatCard value={`${stats.winRate.toFixed(0)}%`} label="Win Rate" />
        <StatCard
          value={`${stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)} SOL`}
          label="Net P&L"
          icon={stats.pnl >= 0 ? TrendingUp : TrendingDown}
          variant={stats.pnl >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          value={`${stats.biggestWin.toFixed(2)} SOL`}
          label="Biggest Win"
          icon={Award}
          variant="highlight"
        />
      </div>

      {/* Active Bets */}
      {activeBets.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            Active Bets
          </h3>
          <div className="space-y-2">
            {activeBets.map((bet) => (
              <div
                key={bet.id}
                className="bg-[#1a1a1a] border border-warning/30 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="flex-1">
                  <div className="text-sm mb-1">
                    <span className="text-white/50">Backed: </span>
                    <strong>{bet.backedFighter}</strong>
                    <span className="text-white/40 ml-1">vs {bet.opponent}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{bet.amount} SOL @ {bet.odds.toFixed(2)}x</span>
                    <span className="text-success font-semibold">
                      Potential: {bet.potentialWin.toFixed(2)} SOL
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onWatchBattle(bet.battleId)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-warning text-black rounded-lg text-sm font-semibold hover:bg-warning/90 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Watch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bet History */}
      {betHistory.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Bet History</h3>
          <div className="space-y-2">
            {betHistory.map((bet) => (
              <div
                key={bet.id}
                className={`bg-[#1a1a1a] border rounded-xl p-4 flex items-center gap-3 ${
                  bet.status === 'won'
                    ? 'border-success/30'
                    : 'border-danger/30'
                }`}
              >
                {/* Status Icon */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    bet.status === 'won' ? 'bg-success/20' : 'bg-danger/20'
                  }`}
                >
                  {bet.status === 'won' ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <X className="w-5 h-5 text-danger" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="text-sm">
                    Backed <strong>{bet.backedFighter}</strong> vs {bet.opponent}
                  </div>
                  <div className="text-xs text-white/40">{bet.timeAgo}</div>
                </div>

                {/* Outcome */}
                <div
                  className={`text-right font-bold ${
                    bet.status === 'won' ? 'text-success' : 'text-danger'
                  }`}
                >
                  {bet.status === 'won'
                    ? `+${bet.payout?.toFixed(2) || bet.potentialWin.toFixed(2)}`
                    : `-${bet.amount.toFixed(2)}`}{' '}
                  SOL
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
