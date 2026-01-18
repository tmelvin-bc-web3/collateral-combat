'use client';

import Link from 'next/link';
import { Eye, Swords, Trophy, Crown } from 'lucide-react';
import { RecentResult, UpcomingBattle } from './types';

interface EmptyStateProps {
  recentResults: RecentResult[];
  upcomingBattles: UpcomingBattle[];
  onViewResults: () => void;
}

export function EmptyState({
  recentResults,
  upcomingBattles,
  onViewResults,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-8">
      {/* Main Empty State */}
      <div className="text-center max-w-lg mb-8">
        <Eye className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">The Arena Awaits</h2>
        <p className="text-white/50 mb-6">
          No warriors are fighting right now. Here&apos;s what you can do:
        </p>

        {/* Action Cards */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/battle"
            className="flex flex-col items-center p-5 min-w-[140px] bg-[#1a1a1a] border border-white/[0.06] rounded-xl hover:border-warning/30 hover:-translate-y-1 transition-all"
          >
            <Swords className="w-7 h-7 text-warning mb-2" />
            <span className="font-semibold text-sm mb-0.5">Start a Battle</span>
            <span className="text-[11px] text-white/40">Enter the Arena and fight</span>
          </Link>

          <button
            onClick={onViewResults}
            className="flex flex-col items-center p-5 min-w-[140px] bg-[#1a1a1a] border border-white/[0.06] rounded-xl hover:border-warning/30 hover:-translate-y-1 transition-all"
          >
            <Trophy className="w-7 h-7 text-warning mb-2" />
            <span className="font-semibold text-sm mb-0.5">View Results</span>
            <span className="text-[11px] text-white/40">See recent battle outcomes</span>
          </button>
        </div>
      </div>

      {/* Recent Results Mini */}
      {recentResults.length > 0 && (
        <div className="w-full max-w-md bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-white/60 mb-3">Recent Battles</h3>
          <div className="space-y-2">
            {recentResults.slice(0, 3).map((result) => (
              <div key={result.id} className="flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-success" />
                <span className="text-success font-medium">{result.winner}</span>
                <span className="text-white/40">beat</span>
                <span className="text-white/60">{result.loser}</span>
                <span className="ml-auto text-xs text-white/30">{result.timeAgo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Mini */}
      {upcomingBattles.length > 0 && (
        <div className="w-full max-w-md bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white/60 mb-3">Coming Up</h3>
          <div className="space-y-2">
            {upcomingBattles.slice(0, 2).map((battle) => (
              <div key={battle.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {battle.fighter1.name} vs {battle.fighter2.name}
                </span>
                <span className="text-warning text-xs">Starts in {battle.startsIn}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
