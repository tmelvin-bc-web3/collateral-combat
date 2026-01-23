'use client';

import { ChevronLeft, ChevronRight, Skull, Trophy } from 'lucide-react';

interface SpectatorPnLBarProps {
  fighter1: {
    pnl: number;
    pnlDollar: number;
    wallet: string;
  };
  fighter2: {
    pnl: number;
    pnlDollar: number;
    wallet: string;
  };
}

export function SpectatorPnLBar({ fighter1, fighter2 }: SpectatorPnLBarProps) {
  // Format wallet address for display
  const formatWallet = (addr: string) =>
    addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : '---';

  // Calculate delta - positive means fighter1 is ahead
  const delta = fighter1.pnl - fighter2.pnl;
  const absDelta = Math.abs(delta);

  // Determine leader
  const leader =
    delta > 0.01 ? 'fighter1' : delta < -0.01 ? 'fighter2' : 'tied';

  // Convert delta to rope position (50% = center/tied)
  // Clamp delta effect: max swing is 40% in either direction
  const maxSwing = 40;
  const clampedDelta = Math.max(-maxSwing, Math.min(maxSwing, delta * 2));
  const ropePosition = 50 + clampedDelta;

  // Calculate danger level (0-1, where 1 = about to lose)
  // If rope is within 20% of edge, show danger icons
  const isFighter2InDanger = ropePosition < 20;
  const isFighter1InDanger = ropePosition > 80;

  return (
    <div className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-b from-black/80 to-black/40 backdrop-blur border border-white/10 rounded-xl">
      {/* Fighter Labels */}
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        {/* Fighter 1 Side */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                leader === 'fighter1' ? 'bg-success animate-pulse' : 'bg-success/50'
              }`}
            />
            <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wider">
              Fighter 1
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-mono text-white/40 ml-4 sm:ml-0">
            {formatWallet(fighter1.wallet)}
          </span>
        </div>

        {/* Status */}
        <div
          className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${
            leader === 'fighter1'
              ? 'bg-success/20 text-success'
              : leader === 'fighter2'
              ? 'bg-danger/20 text-danger'
              : 'bg-white/10 text-white/60'
          }`}
        >
          {leader === 'fighter1' ? (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <ChevronLeft className="w-3 h-3" />
              <span className="hidden sm:inline">LEADING +{absDelta.toFixed(1)}%</span>
              <span className="sm:hidden">+{absDelta.toFixed(1)}%</span>
            </span>
          ) : leader === 'fighter2' ? (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="hidden sm:inline">LEADING +{absDelta.toFixed(1)}%</span>
              <span className="sm:hidden">+{absDelta.toFixed(1)}%</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          ) : (
            'TIED'
          )}
        </div>

        {/* Fighter 2 Side */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-2">
          <span className="text-[9px] sm:text-[10px] font-mono text-white/40 mr-4 sm:mr-0 order-2 sm:order-1">
            {formatWallet(fighter2.wallet)}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2">
            <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wider">
              Fighter 2
            </span>
            <div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                leader === 'fighter2' ? 'bg-danger animate-pulse' : 'bg-danger/50'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Tug of War Bar */}
      <div className="relative h-8 sm:h-10 rounded-lg overflow-hidden bg-gradient-to-r from-success/20 via-transparent to-danger/20">
        {/* Danger Zones */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[15%] bg-gradient-to-r from-success to-transparent transition-opacity duration-300 ${
            isFighter2InDanger ? 'opacity-100' : 'opacity-30'
          }`}
        >
          {isFighter2InDanger && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-success animate-pulse" />
            </div>
          )}
        </div>
        <div
          className={`absolute right-0 top-0 bottom-0 w-[15%] bg-gradient-to-l from-danger to-transparent transition-opacity duration-300 ${
            isFighter1InDanger ? 'opacity-100' : 'opacity-30'
          }`}
        >
          {isFighter1InDanger && (
            <div className="absolute inset-0 flex items-center justify-center animate-shake">
              <Skull className="w-4 h-4 sm:w-5 sm:h-5 text-danger animate-pulse" />
            </div>
          )}
        </div>

        {/* Center Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2" />

        {/* Rope Indicator (the moving part) */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2"
          style={{
            left: `${ropePosition}%`,
            transition: 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Rope line connecting to edges */}
          <div
            className="absolute top-1/2 h-0.5 sm:h-1 transform -translate-y-1/2"
            style={{
              left: '-50vw',
              right: '-50vw',
              width: '100vw',
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
              backgroundColor: 'rgba(255, 150, 50, 0.4)',
            }}
          />

          {/* Center knot/indicator */}
          <div
            className={`relative z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 transform -translate-x-1/2 shadow-lg transition-colors duration-300 ${
              leader === 'fighter1'
                ? 'bg-success border-success/50 shadow-success/30'
                : leader === 'fighter2'
                ? 'bg-danger border-danger/50 shadow-danger/30'
                : 'bg-warning border-warning/50 shadow-warning/30'
            }`}
          >
            <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current" />
          </div>
        </div>

        {/* Tick marks - hidden on mobile */}
        {[25, 50, 75].map((pos) => (
          <div
            key={pos}
            className="absolute top-0 bottom-0 w-px bg-white/10 hidden sm:block"
            style={{ left: `${pos}%` }}
          />
        ))}
      </div>

      {/* PnL Numbers */}
      <div className="flex justify-between mt-2 sm:mt-3">
        <div className="text-left">
          <div
            className={`text-xl sm:text-2xl font-black tabular-nums ${
              fighter1.pnl >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {fighter1.pnl >= 0 ? '+' : ''}
            {fighter1.pnl.toFixed(2)}%
          </div>
          <div className="text-[10px] sm:text-xs text-white/40">
            {fighter1.pnlDollar >= 0 ? '+' : ''}$
            {Math.abs(fighter1.pnlDollar).toFixed(2)}
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-xl sm:text-2xl font-black tabular-nums ${
              fighter2.pnl >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {fighter2.pnl >= 0 ? '+' : ''}
            {fighter2.pnl.toFixed(2)}%
          </div>
          <div className="text-[10px] sm:text-xs text-white/40">
            {fighter2.pnlDollar >= 0 ? '+' : ''}$
            {Math.abs(fighter2.pnlDollar).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
