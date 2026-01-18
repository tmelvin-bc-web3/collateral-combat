'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { TrendingUp, TrendingDown, Flame, User, Swords, ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaderboardEntry, getRankTierBgColor, getRankTierColor } from './types';
import { LevelBadge } from '@/components/progression/LevelBadge';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  userPosition?: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onChallenge?: (player: LeaderboardEntry) => void;
  isLoading?: boolean;
}

export function LeaderboardTable({
  entries,
  userPosition,
  currentPage,
  totalPages,
  onPageChange,
  onChallenge,
  isLoading,
}: LeaderboardTableProps) {
  const router = useRouter();

  const viewProfile = (player: LeaderboardEntry) => {
    router.push(`/profile/${player.walletAddress}`);
  };

  if (isLoading) {
    return (
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-4 animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Table Header - Desktop */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 bg-white/[0.02] border-b border-white/[0.06] text-[11px] font-semibold text-white/40 uppercase tracking-wider">
        <div className="col-span-1">Rank</div>
        <div className="col-span-3">Warrior</div>
        <div className="col-span-1 text-center">Level</div>
        <div className="col-span-2 text-center">Record</div>
        <div className="col-span-2 text-center">Win Rate</div>
        <div className="col-span-2 text-right">Total Profit</div>
        <div className="col-span-1 text-right">Streak</div>
      </div>

      {/* Table Rows - Desktop */}
      <div className="hidden md:block divide-y divide-white/[0.03]">
        {entries.map((player) => (
          <div
            key={player.id}
            className={`grid grid-cols-12 gap-4 px-5 py-4 items-center cursor-pointer transition-colors hover:bg-white/[0.02] ${
              player.isUser ? 'bg-warning/10 border-l-[3px] border-l-warning' : ''
            }`}
            onClick={() => viewProfile(player)}
          >
            {/* Rank */}
            <div className="col-span-1 flex items-center gap-2">
              <RankBadge rank={player.rank} />
              {player.rankChange !== 0 && (
                <span className={`flex items-center text-[10px] font-semibold ${player.rankChange > 0 ? 'text-success' : 'text-danger'}`}>
                  {player.rankChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(player.rankChange)}
                </span>
              )}
            </div>

            {/* Warrior */}
            <div className="col-span-3 flex items-center gap-3">
              {player.avatar ? (
                <Image
                  src={player.avatar}
                  alt={player.username}
                  width={36}
                  height={36}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-warning">{player.username[0]?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <span className="block font-semibold">{player.username}</span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getRankTierBgColor(player.rankTier)} ${getRankTierColor(player.rankTier)}`}>
                  {player.rankTitle}
                </span>
              </div>
            </div>

            {/* Level */}
            <div className="col-span-1 flex justify-center">
              <LevelBadge level={player.level} size="sm" />
            </div>

            {/* Record */}
            <div className="col-span-2 text-center">
              <span className="text-success font-semibold">{player.wins}W</span>
              <span className="text-white/30 mx-1">/</span>
              <span className="text-danger font-semibold">{player.losses}L</span>
            </div>

            {/* Win Rate */}
            <div className="col-span-2 flex items-center justify-center gap-2">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full"
                  style={{ width: `${player.winRate}%` }}
                />
              </div>
              <span className="font-semibold text-success">{player.winRate.toFixed(1)}%</span>
            </div>

            {/* Profit */}
            <div className={`col-span-2 text-right font-mono font-semibold ${player.profit >= 0 ? 'text-success' : 'text-danger'}`}>
              {player.profit >= 0 ? '+' : ''}{player.profit.toFixed(2)} SOL
            </div>

            {/* Streak */}
            <div className="col-span-1 flex items-center justify-end gap-2">
              {player.streak > 0 ? (
                <span className="flex items-center gap-1 text-sm">
                  <Flame className="w-4 h-4 text-danger" />
                  {player.streak}
                </span>
              ) : (
                <span className="text-white/30">-</span>
              )}

              {/* Action Buttons */}
              <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewProfile(player);
                  }}
                  className="w-7 h-7 bg-white/5 border border-white/[0.06] rounded-md flex items-center justify-center hover:border-warning/50 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChallenge?.(player);
                  }}
                  className="w-7 h-7 bg-white/5 border border-white/[0.06] rounded-md flex items-center justify-center hover:border-warning/50 transition-colors"
                >
                  <Swords className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-white/[0.03]">
        {entries.map((player) => (
          <div
            key={player.id}
            className={`p-4 cursor-pointer transition-colors hover:bg-white/[0.02] ${
              player.isUser ? 'bg-warning/10 border-l-[3px] border-l-warning' : ''
            }`}
            onClick={() => viewProfile(player)}
          >
            <div className="flex items-center gap-3 mb-3">
              <RankBadge rank={player.rank} />
              {player.avatar ? (
                <Image
                  src={player.avatar}
                  alt={player.username}
                  width={40}
                  height={40}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <span className="font-bold text-warning">{player.username[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{player.username}</span>
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${getRankTierBgColor(player.rankTier)} ${getRankTierColor(player.rankTier)}`}>
                    {player.rankTitle}
                  </span>
                  <LevelBadge level={player.level} size="xs" />
                </div>
              </div>
              {player.streak >= 3 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-danger/10 border border-danger/30 rounded">
                  <Flame className="w-3 h-3 text-danger" />
                  <span className="text-xs font-bold text-danger">{player.streak}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-white/5 rounded-lg">
                <div className="text-[10px] text-white/40 uppercase mb-0.5">Record</div>
                <div className="text-sm font-semibold">
                  <span className="text-success">{player.wins}W</span>
                  <span className="text-white/30">/</span>
                  <span className="text-danger">{player.losses}L</span>
                </div>
              </div>
              <div className="p-2 bg-white/5 rounded-lg">
                <div className="text-[10px] text-white/40 uppercase mb-0.5">Win Rate</div>
                <div className="text-sm font-semibold text-success">{player.winRate.toFixed(1)}%</div>
              </div>
              <div className="p-2 bg-white/5 rounded-lg">
                <div className="text-[10px] text-white/40 uppercase mb-0.5">Profit</div>
                <div className={`text-sm font-mono font-semibold ${player.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {player.profit >= 0 ? '+' : ''}{player.profit.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User Position (if not visible) */}
      {userPosition && userPosition > entries.length && (
        <>
          <div className="px-5 py-2 text-center text-white/30 text-sm">...</div>
          <div className="px-5 py-4 bg-warning/10 border-l-[3px] border-l-warning text-center text-sm">
            Your position: #{userPosition}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t border-white/[0.06]">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                    currentPage === pageNum
                      ? 'bg-warning text-black'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30 text-lg">
        &#x1F947;
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg shadow-gray-400/30 text-lg">
        &#x1F948;
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-600/30 text-lg">
        &#x1F949;
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
      <span className="text-lg font-bold text-white/50">{rank}</span>
    </div>
  );
}
