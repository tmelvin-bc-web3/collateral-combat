'use client';

import { Swords, Users, Trophy, Coins } from 'lucide-react';
import { TWPhase, LAMPORTS_PER_SOL } from './types';

interface TokenWarsHeaderProps {
  phase: TWPhase;
  timeRemaining: number;
  totalPool: number;
  battlesToday: number;
  betsThisBattle: number;
}

// Format time display
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Get phase label
const getPhaseLabel = (phase: TWPhase) => {
  switch (phase) {
    case 'betting': return 'BETTING OPEN';
    case 'in_progress': return 'BATTLE LIVE';
    case 'cooldown': return 'CALCULATING';
    case 'completed': return 'COMPLETE';
    default: return 'WAITING';
  }
};

// Get timer label
const getTimerLabel = (phase: TWPhase) => {
  switch (phase) {
    case 'betting': return 'PLACE BETS';
    case 'in_progress': return 'BATTLE ENDS IN';
    case 'cooldown': return 'NEXT BATTLE';
    default: return 'NEXT BATTLE';
  }
};

export function TokenWarsHeader({
  phase,
  timeRemaining,
  totalPool,
  battlesToday,
  betsThisBattle,
}: TokenWarsHeaderProps) {
  const isUrgent = timeRemaining < 30;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-white/[0.06]">
      {/* Left: Title + Phase Badge */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black" style={{ fontFamily: 'Impact, sans-serif' }}>
          <span className="text-white">TOKEN</span>
          <span className="text-warning">WARS</span>
        </h1>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          phase === 'betting'
            ? 'bg-success/10 border border-success/30 text-success'
            : phase === 'in_progress'
            ? 'bg-warning/10 border border-warning/30 text-warning animate-pulse'
            : 'bg-white/10 border border-white/20 text-white/60'
        }`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              phase === 'betting' ? 'bg-success' :
              phase === 'in_progress' ? 'bg-warning' : 'bg-white/40'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              phase === 'betting' ? 'bg-success' :
              phase === 'in_progress' ? 'bg-warning' : 'bg-white/40'
            }`}></span>
          </span>
          {getPhaseLabel(phase)}
        </div>
      </div>

      {/* Center: Timer */}
      <div className="text-center">
        <div className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">
          {getTimerLabel(phase)}
        </div>
        <div className={`text-4xl font-black tabular-nums ${
          isUrgent ? 'text-danger animate-pulse' : 'text-warning'
        }`} style={{ fontFamily: 'Impact, sans-serif' }}>
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-warning">
            <Coins className="w-4 h-4" />
            <span className="text-lg font-bold">{(totalPool / LAMPORTS_PER_SOL).toFixed(2)}</span>
          </div>
          <div className="text-[10px] text-white/40 uppercase">This Battle</div>
        </div>

        <div className="text-center hidden sm:block">
          <div className="flex items-center justify-center gap-1 text-white/60">
            <Swords className="w-4 h-4" />
            <span className="text-lg font-bold">{battlesToday}</span>
          </div>
          <div className="text-[10px] text-white/40 uppercase">Battles Today</div>
        </div>

        <div className="text-center hidden md:block">
          <div className="flex items-center justify-center gap-1 text-white/60">
            <Users className="w-4 h-4" />
            <span className="text-lg font-bold">{betsThisBattle}</span>
          </div>
          <div className="text-[10px] text-white/40 uppercase">Bets Placed</div>
        </div>
      </div>
    </div>
  );
}
