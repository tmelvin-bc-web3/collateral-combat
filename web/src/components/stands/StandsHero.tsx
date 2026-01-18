'use client';

import { Eye, Coins, Trophy } from 'lucide-react';
import { StandsStats } from './types';

interface StandsHeroProps {
  stats: StandsStats;
}

export function StandsHero({ stats }: StandsHeroProps) {
  const { liveBattles, spectatorsOnline, totalWageredToday, biggestWinToday } = stats;

  return (
    <div className="flex flex-wrap items-center justify-between gap-6 py-6 mb-6 border-b border-white/[0.06]">
      {/* Title Section */}
      <div>
        <h1
          className="text-4xl md:text-5xl font-black tracking-tight mb-1"
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          THE <span className="text-danger">STANDS</span>
        </h1>
        <p className="text-sm text-white/50 max-w-md">
          Watch degens battle for glory. Back your champion to claim a share of the spoils.
        </p>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Live Count */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {liveBattles > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-white/30" />
            )}
          </div>
          <span className={`text-2xl font-bold ${liveBattles > 0 ? 'text-danger' : 'text-white'}`}>
            {liveBattles}
          </span>
          <span className="block text-[11px] text-white/40 uppercase tracking-wider">Live Now</span>
        </div>

        <div className="w-px h-10 bg-white/10" />

        {/* Spectators */}
        <div className="text-center">
          <Eye className="w-4 h-4 text-white/40 mx-auto mb-1" />
          <span className="text-2xl font-bold">{spectatorsOnline}</span>
          <span className="block text-[11px] text-white/40 uppercase tracking-wider">Watching</span>
        </div>

        <div className="w-px h-10 bg-white/10" />

        {/* Wagered Today */}
        <div className="text-center">
          <Coins className="w-4 h-4 text-warning mx-auto mb-1" />
          <span className="text-2xl font-bold text-warning">{totalWageredToday.toFixed(1)}</span>
          <span className="block text-[11px] text-white/40 uppercase tracking-wider">Wagered Today</span>
        </div>

        <div className="w-px h-10 bg-white/10" />

        {/* Biggest Win */}
        <div className="text-center">
          <Trophy className="w-4 h-4 text-success mx-auto mb-1" />
          <span className="text-2xl font-bold text-success">{biggestWinToday.toFixed(2)}</span>
          <span className="block text-[11px] text-white/40 uppercase tracking-wider">Biggest Win</span>
        </div>
      </div>

    </div>
  );
}
