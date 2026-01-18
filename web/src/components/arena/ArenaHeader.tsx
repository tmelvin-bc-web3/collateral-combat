'use client';

import { Swords, Users, Calendar, Trophy } from 'lucide-react';
import { ArenaStats } from './types';

interface ArenaHeaderProps {
  stats: ArenaStats;
}

export function ArenaHeader({ stats }: ArenaHeaderProps) {
  return (
    <div className="mb-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        {/* Title + Live Badge */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider" style={{ fontFamily: 'Impact, sans-serif' }}>
            <span className="text-white">THE </span>
            <span className="text-warning">ARENA</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs font-bold text-success uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6">
          <StatItem
            icon={<Swords className="w-4 h-4" />}
            value={stats.liveBattles}
            label="Live Battles"
          />
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <StatItem
            icon={<Users className="w-4 h-4" />}
            value={stats.playersInQueue}
            label="In Queue"
            highlight
          />
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          <StatItem
            icon={<Calendar className="w-4 h-4" />}
            value={stats.battlesToday}
            label="Battles Today"
            className="hidden md:flex"
          />
          <div className="h-4 w-px bg-white/10 hidden lg:block" />
          <StatItem
            icon={<Trophy className="w-4 h-4 text-warning" />}
            value={`${stats.biggestWin} SOL`}
            label="Biggest Win"
            className="hidden lg:flex"
          />
        </div>
      </div>

      {/* Queue Status */}
      <div className="mt-4">
        {stats.playersInQueue > 0 ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-sm text-success font-medium">
              {stats.playersInQueue} warrior{stats.playersInQueue !== 1 ? 's' : ''} waiting for battle
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-sm text-white/60">Be the first to enter the arena!</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({
  icon,
  value,
  label,
  highlight = false,
  className = '',
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={highlight ? 'text-success' : 'text-white/40'}>{icon}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-bold text-sm ${highlight ? 'text-success' : 'text-white'}`}>{value}</span>
        <span className="text-white/40 text-[10px] uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}
