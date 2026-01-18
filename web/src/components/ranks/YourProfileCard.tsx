'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trophy, TrendingUp, TrendingDown, Flame, Target, Award } from 'lucide-react';
import { UserRankStats, getRankTierBgColor, getRankTierColor } from './types';

interface YourProfileCardProps {
  stats: UserRankStats | null;
  isLoading?: boolean;
}

function truncateAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function YourProfileCard({ stats, isLoading }: YourProfileCardProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#1a1a1a]/80 border border-warning/20 rounded-2xl p-6 mb-6 animate-pulse">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-[72px] h-[72px] rounded-full bg-white/10" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-white/10 rounded" />
              <div className="h-4 w-24 bg-white/10 rounded" />
            </div>
          </div>
          <div className="flex gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="h-8 w-16 bg-white/10 rounded mb-2" />
                <div className="h-3 w-12 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#1a1a1a]/80 border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="text-center py-4">
          <Award className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Connect your wallet to see your rank and stats</p>
        </div>
      </div>
    );
  }

  const handleViewProfile = () => {
    router.push(`/profile/${stats.walletAddress}`);
  };

  return (
    <div className="bg-gradient-to-r from-[#1a1a1a] to-warning/5 border border-warning/30 rounded-2xl p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Avatar & Identity */}
        <div className="flex items-center gap-4">
          {/* Avatar with Level Badge */}
          <div className="relative">
            {stats.avatar ? (
              <Image
                src={stats.avatar}
                alt={stats.username || 'Profile'}
                width={72}
                height={72}
                className="rounded-full border-[3px] border-warning"
                unoptimized
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full border-[3px] border-warning bg-warning/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-warning">
                  {(stats.username || stats.walletAddress)?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-warning rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-[#1a1a1a]">
              {stats.level}
            </div>
          </div>

          {/* Identity Info */}
          <div>
            <h2 className="text-xl font-bold">{stats.username || truncateAddress(stats.walletAddress)}</h2>
            {stats.username && (
              <span className="text-xs text-white/40">{truncateAddress(stats.walletAddress)}</span>
            )}
            <div className="mt-1">
              <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold uppercase border ${getRankTierBgColor(stats.rankTier)} ${getRankTierColor(stats.rankTier)}`}>
                {stats.rankTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Center: XP Progress */}
        <div className="lg:min-w-[200px]">
          <div className="flex justify-between mb-1">
            <span className="text-[13px] font-semibold">Level {stats.level}</span>
            <span className="text-xs text-white/50">{stats.xp} / {stats.xpToNext} XP</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-gradient-to-r from-warning to-yellow-400 rounded-full transition-all duration-300"
              style={{ width: `${stats.xpPercent}%` }}
            />
          </div>
          <span className="text-[11px] text-white/40">
            {stats.xpToNext - stats.xp} XP to Level {stats.level + 1}
          </span>
        </div>

        {/* Right: Quick Stats */}
        <div className="flex items-center gap-6 flex-wrap">
          {/* Global Rank */}
          <div className="text-center">
            <span className="block text-xl font-bold">#{stats.globalRank}</span>
            <span className="block text-[11px] text-white/40 uppercase tracking-wider">Global Rank</span>
            {stats.rankChange !== 0 && (
              <span className={`flex items-center justify-center gap-0.5 text-[10px] mt-0.5 ${stats.rankChange > 0 ? 'text-success' : 'text-danger'}`}>
                {stats.rankChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(stats.rankChange)} this week
              </span>
            )}
          </div>

          <div className="w-px h-10 bg-white/10" />

          {/* Win Rate */}
          <div className="text-center">
            <span className="block text-xl font-bold">{stats.winRate.toFixed(1)}%</span>
            <span className="block text-[11px] text-white/40 uppercase tracking-wider">Win Rate</span>
          </div>

          <div className="w-px h-10 bg-white/10" />

          {/* Total P&L */}
          <div className="text-center">
            <span className={`block text-xl font-bold ${stats.totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)} SOL
            </span>
            <span className="block text-[11px] text-white/40 uppercase tracking-wider">Total P&L</span>
          </div>

          <div className="w-px h-10 bg-white/10" />

          {/* Streak */}
          <div className="text-center">
            <span className="flex items-center justify-center gap-1 text-xl font-bold">
              {stats.streak > 0 && <Flame className="w-5 h-5 text-danger" />}
              {stats.streak}
            </span>
            <span className="block text-[11px] text-white/40 uppercase tracking-wider">Win Streak</span>
          </div>
        </div>

        {/* Far Right: Achievements Preview + View Profile */}
        <div className="flex flex-col items-end gap-2">
          {stats.recentAchievements.length > 0 && (
            <div>
              <span className="block text-[11px] text-white/40 uppercase tracking-wider text-right mb-1">
                Recent Achievements
              </span>
              <div className="flex gap-1.5">
                {stats.recentAchievements.slice(0, 4).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-lg"
                    title={achievement.name}
                  >
                    {achievement.icon}
                  </div>
                ))}
                {stats.totalAchievements > 4 && (
                  <span className="text-xs text-white/50 flex items-center">
                    +{stats.totalAchievements - 4}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleViewProfile}
            className="px-4 py-2 bg-warning hover:bg-warning/90 text-black text-[13px] font-semibold rounded-lg transition-colors"
          >
            View Full Profile
          </button>
        </div>
      </div>
    </div>
  );
}
