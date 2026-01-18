'use client';

import { Clock, Coins, Users, Swords, FileText } from 'lucide-react';
import { WarPartyStats, WarPartyPhase } from './types';

interface WarPartyHeroProps {
  stats: WarPartyStats;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

function PhaseIndicator({ phase }: { phase: WarPartyPhase }) {
  const config = {
    enrollment: {
      icon: FileText,
      text: 'ENROLLMENT OPEN',
      detail: 'Draft your squad now!',
      bgClass: 'bg-success/10 border-success/30',
      textClass: 'text-success',
    },
    active: {
      icon: Swords,
      text: 'WAR IN PROGRESS',
      detail: 'Battles are live!',
      bgClass: 'bg-warning/10 border-warning/30',
      textClass: 'text-warning',
    },
    calculating: {
      icon: Clock,
      text: 'CALCULATING RESULTS',
      detail: 'Winners announced soon!',
      bgClass: 'bg-accent/10 border-accent/30',
      textClass: 'text-accent',
    },
  };

  const { icon: Icon, text, detail, bgClass, textClass } = config[phase];

  return (
    <div className={`inline-flex flex-col items-center px-6 py-3 rounded-xl border ${bgClass}`}>
      <Icon className={`w-6 h-6 ${textClass} mb-1`} />
      <span className={`text-sm font-bold ${textClass}`}>{text}</span>
      <span className="text-xs text-white/50">{detail}</span>
    </div>
  );
}

export function WarPartyHero({ stats }: WarPartyHeroProps) {
  const { week, phase, timeRemaining, totalPrizePool, totalWarriors } = stats;

  return (
    <div className="text-center py-8 mb-6 border-b border-white/[0.06]">
      {/* Week Badge */}
      <div className="inline-block px-4 py-1.5 rounded-full bg-warning text-black text-xs font-bold tracking-widest mb-4">
        WEEK {week}
      </div>

      {/* Title */}
      <h1
        className="text-5xl md:text-6xl font-black tracking-tight mb-3"
        style={{ fontFamily: 'Impact, sans-serif' }}
      >
        WAR <span className="text-warning">PARTY</span>
      </h1>

      {/* Subtitle */}
      <p className="text-base text-white/60 max-w-lg mx-auto mb-6">
        Assemble your squad of 6 memecoins. Best gains over the week claims the throne.
      </p>

      {/* Stats Row */}
      <div className="flex justify-center items-center gap-8 flex-wrap mb-6">
        {/* Countdown */}
        <div className="text-center">
          <div className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider mb-1">
            <Clock className="w-3.5 h-3.5" />
            {phase === 'enrollment' ? 'Enrollment Ends' : 'War Ends'}
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCountdown(timeRemaining)}
          </div>
        </div>

        <div className="w-px h-10 bg-white/10" />

        {/* Total Prize Pool */}
        <div className="text-center">
          <div className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider mb-1">
            <Coins className="w-3.5 h-3.5" />
            Total War Chest
          </div>
          <div className="text-2xl font-bold text-success">
            {totalPrizePool.toFixed(1)} SOL
          </div>
        </div>

        <div className="w-px h-10 bg-white/10" />

        {/* Warriors */}
        <div className="text-center">
          <div className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            Warriors Enlisted
          </div>
          <div className="text-2xl font-bold text-white">
            {totalWarriors}
          </div>
        </div>
      </div>

      {/* Phase Indicator */}
      <PhaseIndicator phase={phase} />
    </div>
  );
}
