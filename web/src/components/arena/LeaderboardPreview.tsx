'use client';

import { useState } from 'react';
import { Medal, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { LeaderboardEntry } from './types';

interface LeaderboardPreviewProps {
  leaders: LeaderboardEntry[];
}

type Period = 'week' | 'all';

export function LeaderboardPreview({ leaders }: LeaderboardPreviewProps) {
  const [period, setPeriod] = useState<Period>('week');

  // In a real app, you'd filter by period
  const displayedLeaders = leaders.slice(0, 5);

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-white/40';
    }
  };

  const getMedalBg = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400/30 to-yellow-400/10';
      case 2: return 'from-gray-300/30 to-gray-300/10';
      case 3: return 'from-amber-600/30 to-amber-600/10';
      default: return 'from-white/10 to-white/5';
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Medal className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-bold uppercase tracking-wider">Top Warriors</h2>
        </div>

        {/* Period Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02]">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              period === 'week'
                ? 'bg-warning text-black'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              period === 'all'
                ? 'bg-warning text-black'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {displayedLeaders.length > 0 ? (
        <>
          <div className="space-y-2">
            {displayedLeaders.map((leader, index) => {
              const rank = index + 1;
              return (
                <div
                  key={leader.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    rank <= 3
                      ? 'bg-gradient-to-r ' + getMedalBg(rank) + ' border border-white/[0.06]'
                      : 'bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 text-center">
                    {rank <= 3 ? (
                      <Medal className={`w-5 h-5 mx-auto ${getMedalColor(rank)}`} />
                    ) : (
                      <span className="text-sm font-bold text-white/40">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      rank <= 3
                        ? `bg-gradient-to-br ${getMedalBg(rank)}`
                        : 'bg-white/5'
                    }`}>
                      <span className="text-xs font-bold">{leader.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white/90 truncate">{leader.name}</div>
                      <div className="text-xs text-white/40">
                        {leader.wins}W - {leader.losses}L
                      </div>
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${leader.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {leader.profit >= 0 ? '+' : ''}{leader.profit.toFixed(2)} SOL
                    </div>
                    <div className="text-[10px] text-white/40">
                      {((leader.wins / (leader.wins + leader.losses)) * 100 || 0).toFixed(0)}% WR
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View Full Leaderboard */}
          <Link
            href="/leaderboard"
            className="mt-4 w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white/80 transition-all flex items-center justify-center gap-2"
          >
            View Full Leaderboard
            <ChevronRight className="w-4 h-4" />
          </Link>
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3">
            <Medal className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-sm text-white/40">No warriors ranked yet</p>
          <p className="text-xs text-white/30 mt-1">Win battles to climb the ranks!</p>
        </div>
      )}
    </div>
  );
}
