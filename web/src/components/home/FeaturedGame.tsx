'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock, Coins, Target, ChevronRight, Zap } from 'lucide-react';
import { OracleData } from './types';

interface FeaturedGameProps {
  oracle: OracleData;
}

export function FeaturedGame({ oracle }: FeaturedGameProps) {
  const { currentRound, playersInGame } = oracle;
  const totalPool = currentRound.upPool + currentRound.downPool;
  const upPercent = totalPool > 0 ? (currentRound.upPool / totalPool) * 100 : 50;

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="mb-12 mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            Most Popular Right Now
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-white/60">{playersInGame} players in game</span>
        </div>
      </div>

      {/* Featured Card */}
      <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-warning/20 rounded-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-warning/5 to-transparent pointer-events-none" />

        <div className="grid lg:grid-cols-2 gap-6 p-6">
          {/* Left side - Game info */}
          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 border border-warning/30 text-warning text-xs font-bold uppercase tracking-wider mb-4">
              <Target className="w-3 h-3" />
              Easiest to Start
            </div>

            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
              THE ORACLE
            </h3>
            <p className="text-sm text-warning/80 uppercase tracking-wider mb-4">Predict or Perish</p>

            <p className="text-white/60 mb-6 max-w-md">
              SOL goes up or down in 30 seconds. Call it right or get rekt. Simple. Fast. Brutal.
            </p>

            {/* Stats */}
            <div className="flex gap-6 mb-6">
              <div>
                <div className="text-2xl font-bold text-white">30s</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Per Round</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">0.01 SOL</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Min Bet</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">~2x</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Potential</div>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/predict"
              className="group inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-warning to-fire text-black font-bold text-lg hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              Play Oracle Now
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {currentRound.timeRemaining > 0 && (
              <div className="inline-flex items-center gap-1.5 ml-4 text-xs text-white/40">
                <Clock className="w-3 h-3" />
                Next round in {formatTime(currentRound.timeRemaining)}
              </div>
            )}
          </div>

          {/* Right side - Live preview */}
          <div className="relative z-10 bg-black/30 rounded-xl border border-white/[0.06] p-4">
            {/* Preview header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Live Round</span>
              <div className="flex items-center gap-1.5 text-white/60">
                <Clock className="w-3 h-3" />
                <span className="font-mono font-bold">{formatTime(currentRound.timeRemaining)}</span>
              </div>
            </div>

            {/* Price display */}
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-white font-mono">
                ${currentRound.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-white/40">SOL/USD</div>
            </div>

            {/* Pool distribution bar */}
            <div className="mb-4">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-success to-success/80 transition-all duration-500"
                  style={{ width: `${upPercent}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-danger/80 to-danger transition-all duration-500"
                  style={{ width: `${100 - upPercent}%` }}
                />
              </div>
            </div>

            {/* Pools */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-success mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-bold uppercase text-sm">UP</span>
                </div>
                <div className="text-lg font-bold text-white">{currentRound.upPool.toFixed(2)} SOL</div>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-danger mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-bold uppercase text-sm">DOWN</span>
                </div>
                <div className="text-lg font-bold text-white">{currentRound.downPool.toFixed(2)} SOL</div>
              </div>
            </div>

            {/* Total pool */}
            <div className="mt-3 text-center">
              <span className="text-xs text-white/40">Total Pool: </span>
              <span className="text-sm font-bold text-warning">{totalPool.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
