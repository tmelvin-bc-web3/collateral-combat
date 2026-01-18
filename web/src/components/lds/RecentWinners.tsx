'use client';

import { Trophy, Medal } from 'lucide-react';
import { RecentWinner, PlatformStats } from './types';

interface RecentWinnersProps {
  winners: RecentWinner[];
  stats?: PlatformStats;
}

function formatSOL(amount: number): string {
  return amount.toFixed(2);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function RecentWinners({ winners, stats }: RecentWinnersProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <span>Recent Winners</span>
        </h3>
      </div>

      {/* Winners List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {winners.length > 0 ? (
          winners.map((winner, i) => (
            <div key={i} className="flex gap-3 p-3 bg-[#333] rounded-lg hover:bg-[#3a3a3a] transition-colors">
              <div className="flex items-center justify-center w-8 h-8 bg-warning/20 rounded-full">
                <Medal className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {winner.username || formatWallet(winner.walletAddress)}
                </div>
                <div className="text-sm text-success">
                  Won {formatSOL(winner.payout)} SOL vs {winner.totalPlayers} players
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {formatTimeAgo(winner.completedAt)}
                </div>
              </div>
            </div>
          ))
        ) : (
          // Placeholder winners when no data
          <>
            <div className="flex gap-3 p-3 bg-[#333] rounded-lg animate-pulse">
              <div className="flex items-center justify-center w-8 h-8 bg-white/5 rounded-full">
                <Medal className="w-4 h-4 text-white/20" />
              </div>
              <div className="flex-1">
                <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                <div className="h-3 w-32 bg-white/5 rounded" />
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-[#333] rounded-lg animate-pulse">
              <div className="flex items-center justify-center w-8 h-8 bg-white/5 rounded-full">
                <Medal className="w-4 h-4 text-white/20" />
              </div>
              <div className="flex-1">
                <div className="h-4 w-20 bg-white/10 rounded mb-2" />
                <div className="h-3 w-28 bg-white/5 rounded" />
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-[#333] rounded-lg animate-pulse">
              <div className="flex items-center justify-center w-8 h-8 bg-white/5 rounded-full">
                <Medal className="w-4 h-4 text-white/20" />
              </div>
              <div className="flex-1">
                <div className="h-4 w-28 bg-white/10 rounded mb-2" />
                <div className="h-3 w-24 bg-white/5 rounded" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Platform Stats */}
      <div className="mt-auto pt-4 border-t border-white/[0.06]">
        <div className="flex gap-4">
          <div className="flex-1 text-center">
            <div className="text-xl font-bold text-white">
              {stats?.totalGamesPlayed?.toLocaleString() || '---'}
            </div>
            <div className="text-[10px] text-white/40 uppercase">Games Played</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-xl font-bold text-success">
              {stats?.totalSolWon ? `${formatSOL(stats.totalSolWon)} SOL` : '--- SOL'}
            </div>
            <div className="text-[10px] text-white/40 uppercase">Total Won</div>
          </div>
        </div>
      </div>
    </div>
  );
}
