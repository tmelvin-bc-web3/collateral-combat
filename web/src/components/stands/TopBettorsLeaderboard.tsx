'use client';

import { useState } from 'react';
import { BarChart3, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { BettorLeaderboardEntry, BettingStats } from './types';

type Period = 'week' | 'month' | 'all';

interface TopBettorsLeaderboardProps {
  topBettors: BettorLeaderboardEntry[];
  userPosition?: number;
  userStats?: BettingStats;
}

export function TopBettorsLeaderboard({
  topBettors,
  userPosition,
  userStats,
}: TopBettorsLeaderboardProps) {
  const [period, setPeriod] = useState<Period>('week');

  const getRankIcon = (index: number): React.ReactNode => {
    switch (index) {
      case 0:
        return <span className="text-lg">🥇</span>;
      case 1:
        return <span className="text-lg">🥈</span>;
      case 2:
        return <span className="text-lg">🥉</span>;
      default:
        return <span className="text-sm text-white/40">#{index + 1}</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-bold">Top Spectator Bettors</h2>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['week', 'month', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                period === p
                  ? 'bg-warning text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {topBettors.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
          <Medal className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No leaderboard data yet</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* List */}
          <div className="divide-y divide-white/[0.06]">
            {topBettors.map((bettor, index) => (
              <div
                key={bettor.id}
                className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                  bettor.isUser ? 'bg-warning/10' : 'hover:bg-white/5'
                } ${index < 3 ? 'bg-gradient-to-r from-transparent' : ''} ${
                  index === 0
                    ? 'to-yellow-500/5'
                    : index === 1
                    ? 'to-gray-400/5'
                    : index === 2
                    ? 'to-amber-700/5'
                    : ''
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center">{getRankIcon(index)}</div>

                {/* User Info */}
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                    {bettor.avatar || bettor.name[0]}
                  </span>
                  <span className="font-medium">
                    {bettor.name}
                    {bettor.isUser && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning rounded font-bold uppercase">
                        You
                      </span>
                    )}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-white/50">{bettor.totalBets} bets</span>
                  <span className="text-white/50">{bettor.winRate.toFixed(0)}% WR</span>
                </div>

                {/* Profit */}
                <div
                  className={`flex items-center gap-1 font-bold min-w-[100px] justify-end ${
                    bettor.profit >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {bettor.profit >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {bettor.profit >= 0 ? '+' : ''}
                  {bettor.profit.toFixed(2)} SOL
                </div>
              </div>
            ))}
          </div>

          {/* User Position if Outside Top */}
          {userPosition && userPosition > topBettors.length && userStats && (
            <>
              <div className="px-4 py-2 text-center text-white/20">• • •</div>
              <div className="flex items-center gap-4 px-4 py-3 bg-warning/10 border-t border-white/[0.06]">
                <div className="w-8 text-center text-sm text-white/40">
                  #{userPosition}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                    Y
                  </span>
                  <span className="font-medium">
                    You
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning rounded font-bold uppercase">
                      Your Rank
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-white/50">{userStats.totalBets} bets</span>
                  <span className="text-white/50">{userStats.winRate.toFixed(0)}% WR</span>
                </div>
                <div
                  className={`flex items-center gap-1 font-bold min-w-[100px] justify-end ${
                    userStats.pnl >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {userStats.pnl >= 0 ? '+' : ''}
                  {userStats.pnl.toFixed(2)} SOL
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
