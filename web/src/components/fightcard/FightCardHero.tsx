'use client';

import { Zap } from 'lucide-react';
import { EmptyState } from './EmptyState';
import type { FightCardBattle } from '@/types/fightcard';

interface FightCardHeroProps {
  mainEvent: FightCardBattle | null;
  onWatchLive?: () => void;
  onBetNow?: () => void;
}

export function FightCardHero({
  mainEvent,
  onWatchLive,
  onBetNow,
}: FightCardHeroProps) {
  if (!mainEvent) {
    return (
      <section className="relative mb-8">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-black/80 via-black/60 to-warning/5 border border-white/10">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-fire/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-warning/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 py-12">
            <EmptyState type="no-battles" />
          </div>
        </div>
      </section>
    );
  }

  const { fighter1, fighter2, stakes, leverage, status, startTime, spectatorCount, asset } = mainEvent;

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(/[\s.]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Fighter display component for hero
  const HeroFighter = ({
    fighter,
    side,
  }: {
    fighter: typeof fighter1 | null;
    side: 'left' | 'right';
  }) => {
    if (!fighter) {
      return (
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center mb-3">
            <span className="text-3xl text-white/40">?</span>
          </div>
          <span className="text-lg font-bold text-white/40">Awaiting Challenger</span>
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center ${side === 'left' ? 'text-left' : 'text-right'}`}>
        {/* Avatar */}
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-warning/40 to-fire/40 border-4 border-warning/50 shadow-lg shadow-warning/20 flex items-center justify-center mb-3 transition-transform hover:scale-105">
          {fighter.avatarUrl ? (
            <img
              src={fighter.avatarUrl}
              alt={fighter.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-warning font-black text-2xl md:text-3xl">
              {getInitials(fighter.displayName)}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-xl md:text-2xl font-black text-white mb-1">
          {fighter.displayName}
        </h3>

        {/* Record */}
        {fighter.record && (
          <span className="text-sm text-white/40">
            {fighter.record.wins}W - {fighter.record.losses}L
          </span>
        )}

        {/* ELO */}
        {fighter.elo && (
          <span className="text-xs text-warning/60 mt-1">
            ELO: {fighter.elo}
          </span>
        )}
      </div>
    );
  };

  return (
    <section className="relative mb-8">
      {/* Main hero container */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-black/80 via-black/60 to-warning/5 border border-white/10">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Ember particles effect (CSS-based) */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-fire/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-warning/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-danger/5 rounded-full blur-3xl" />
        </div>

        {/* Header badge */}
        <div className="relative z-10 flex justify-center pt-6 pb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30">
            <Zap className="w-4 h-4 text-warning" />
            <span className="text-sm font-bold text-warning uppercase tracking-wider">
              Main Event
            </span>
          </div>
        </div>

        {/* Fighter face-off */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 lg:gap-20 px-6 py-8">
          {/* Fighter 1 */}
          <HeroFighter fighter={fighter1} side="left" />

          {/* VS Section */}
          <div className="flex flex-col items-center">
            {/* Lightning effects */}
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-fire animate-pulse" />
              <span
                className="text-3xl md:text-4xl lg:text-5xl font-black text-warning"
                style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '4px', textShadow: '0 0 20px rgba(249, 115, 22, 0.5)' }}
              >
                VS
              </span>
              <Zap className="w-6 h-6 text-fire animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Asset */}
            <span className="text-xs text-white/40 mt-2 uppercase tracking-wider">
              {asset}
            </span>
          </div>

          {/* Fighter 2 */}
          <HeroFighter fighter={fighter2} side="right" />
        </div>

        {/* Stakes and info */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 px-6 pb-6">
          {/* Stakes */}
          <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/30 rounded-lg">
            <span className="text-lg font-bold text-success">{stakes} SOL</span>
            <span className="text-xs text-white/40">Stakes</span>
          </div>

          {/* Leverage */}
          <div className="flex items-center gap-2 px-4 py-2 bg-fire/10 border border-fire/30 rounded-lg">
            <Zap className="w-4 h-4 text-fire" />
            <span className="text-lg font-bold text-fire">{leverage}x</span>
            <span className="text-xs text-white/40">Leverage</span>
          </div>

          {/* Status */}
          {status === 'live' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/30 rounded-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
              </span>
              <span className="text-lg font-bold text-danger">LIVE NOW</span>
            </div>
          ) : status === 'upcoming' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-lg">
              <CountdownDisplay targetTime={startTime} />
            </div>
          ) : null}

          {/* Spectators */}
          {spectatorCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-white/50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm">{spectatorCount} watching</span>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 px-6 pb-8">
          <button
            onClick={onWatchLive}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-warning to-fire text-black font-bold text-lg hover:opacity-90 hover:scale-[1.02] transition-all"
          >
            {status === 'live' ? 'Watch Live' : 'View Battle'}
          </button>

          {status === 'live' && (
            <button
              onClick={onBetNow}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-lg hover:bg-white/20 transition-colors"
            >
              Bet Now
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// Simple countdown display for hero section
function CountdownDisplay({ targetTime }: { targetTime: number }) {
  const now = Date.now();
  const diff = Math.max(0, targetTime - now);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (diff <= 0) {
    return <span className="text-lg font-bold text-danger">Starting Now!</span>;
  }

  return (
    <div className="flex items-center gap-1 text-white">
      <span className="text-xs text-white/40 mr-1">Starts in</span>
      {hours > 0 && (
        <>
          <span className="text-lg font-bold font-mono">{hours}</span>
          <span className="text-xs text-white/40">h</span>
        </>
      )}
      <span className="text-lg font-bold font-mono">{minutes.toString().padStart(2, '0')}</span>
      <span className="text-xs text-white/40">m</span>
      <span className="text-lg font-bold font-mono">{seconds.toString().padStart(2, '0')}</span>
      <span className="text-xs text-white/40">s</span>
    </div>
  );
}
