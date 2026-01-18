'use client';

import { Swords, Coins, Users, Flame, Trophy } from 'lucide-react';
import { GlobalStats, formatNumber } from './types';

interface GlobalStatsBarProps {
  stats: GlobalStats;
}

export function GlobalStatsBar({ stats }: GlobalStatsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-warning/20 border border-warning/30 flex items-center justify-center">
          <Swords className="w-5 h-5 text-warning" />
        </div>
        <div>
          <span className="block text-lg font-bold">{formatNumber(stats.totalBattles)}</span>
          <span className="text-[11px] text-white/40 uppercase tracking-wider">Total Battles</span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-success/20 border border-success/30 flex items-center justify-center">
          <Coins className="w-5 h-5 text-success" />
        </div>
        <div>
          <span className="block text-lg font-bold">{formatNumber(stats.totalVolume)} SOL</span>
          <span className="text-[11px] text-white/40 uppercase tracking-wider">Total Volume</span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <span className="block text-lg font-bold">{formatNumber(stats.activeWarriors)}</span>
          <span className="text-[11px] text-white/40 uppercase tracking-wider">Active Warriors</span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-danger/20 border border-danger/30 flex items-center justify-center">
          <Flame className="w-5 h-5 text-danger" />
        </div>
        <div>
          <span className="block text-lg font-bold">{stats.longestStreak}</span>
          <span className="text-[11px] text-white/40 uppercase tracking-wider">Longest Streak</span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-warning/20 rounded-xl col-span-2 sm:col-span-1">
        <div className="w-10 h-10 rounded-lg bg-warning/20 border border-warning/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-warning" />
        </div>
        <div>
          <span className="block text-lg font-bold text-warning">{stats.biggestWin} SOL</span>
          <span className="text-[11px] text-white/40 uppercase tracking-wider">Biggest Win</span>
        </div>
      </div>
    </div>
  );
}
