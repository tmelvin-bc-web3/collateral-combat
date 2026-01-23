'use client';

import { ChevronLeft, ChevronRight, Skull, Trophy } from 'lucide-react';
import { PnLComparisonBarProps } from './types';

export function PnLComparisonBar({
  userPnL,
  opponentPnL,
  userPnLDollar,
  opponentPnLDollar,
}: PnLComparisonBarProps) {
  // Calculate delta - positive means user is ahead
  const delta = userPnL - opponentPnL;
  const absDelta = Math.abs(delta);

  // Determine leader
  const leader = delta > 0.01 ? 'user' : delta < -0.01 ? 'opponent' : 'tied';

  // Convert delta to rope position (50% = center/tied)
  // Clamp delta effect: max swing is 40% in either direction
  const maxSwing = 40;
  const clampedDelta = Math.max(-maxSwing, Math.min(maxSwing, delta * 2));
  const ropePosition = 50 + clampedDelta;

  // Calculate danger level (0-1, where 1 = about to lose)
  // If rope is within 10% of edge, show danger
  const isUserInDanger = ropePosition > 80;
  const isOpponentInDanger = ropePosition < 20;

  return (
    <div className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-b from-black/80 to-black/40 backdrop-blur border-b border-white/10">
      {/* Fighter Labels */}
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        {/* User Side */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${leader === 'user' ? 'bg-success animate-pulse' : 'bg-success/50'}`} />
          <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wider">You</span>
        </div>

        {/* Status */}
        <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${
          leader === 'user'
            ? 'bg-success/20 text-success'
            : leader === 'opponent'
            ? 'bg-danger/20 text-danger'
            : 'bg-white/10 text-white/60'
        }`}>
          {leader === 'user' ? (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <ChevronLeft className="w-3 h-3" />
              <span className="hidden sm:inline">WINNING +{absDelta.toFixed(1)}%</span>
              <span className="sm:hidden">+{absDelta.toFixed(1)}%</span>
            </span>
          ) : leader === 'opponent' ? (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <span className="hidden sm:inline">LOSING -{absDelta.toFixed(1)}%</span>
              <span className="sm:hidden">-{absDelta.toFixed(1)}%</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          ) : (
            'TIED'
          )}
        </div>

        {/* Opponent Side */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wider">Opponent</span>
          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${leader === 'opponent' ? 'bg-danger animate-pulse' : 'bg-danger/50'}`} />
        </div>
      </div>

      {/* Tug of War Bar */}
      <div className="relative h-8 sm:h-10 rounded-lg overflow-hidden bg-gradient-to-r from-success/20 via-transparent to-danger/20">
        {/* Danger Zones */}
        <div className={`absolute left-0 top-0 bottom-0 w-[15%] bg-gradient-to-r from-success to-transparent transition-opacity duration-300 ${isOpponentInDanger ? 'opacity-100' : 'opacity-30'}`}>
          {isOpponentInDanger && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-success animate-pulse" />
            </div>
          )}
        </div>
        <div className={`absolute right-0 top-0 bottom-0 w-[15%] bg-gradient-to-l from-danger to-transparent transition-opacity duration-300 ${isUserInDanger ? 'opacity-100' : 'opacity-30'}`}>
          {isUserInDanger && (
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
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)',
              backgroundColor: 'rgba(255, 150, 50, 0.4)',
            }}
          />

          {/* Center knot/indicator */}
          <div className={`relative z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 transform -translate-x-1/2 shadow-lg transition-colors duration-300 ${
            leader === 'user'
              ? 'bg-success border-success/50 shadow-success/30'
              : leader === 'opponent'
              ? 'bg-danger border-danger/50 shadow-danger/30'
              : 'bg-warning border-warning/50 shadow-warning/30'
          }`}>
            <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current" />
          </div>
        </div>

        {/* Tick marks - hidden on mobile */}
        {[25, 50, 75].map(pos => (
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
          <div className={`text-xl sm:text-2xl font-black tabular-nums ${userPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {userPnL >= 0 ? '+' : ''}{userPnL.toFixed(2)}%
          </div>
          <div className="text-[10px] sm:text-xs text-white/40">
            {userPnLDollar >= 0 ? '+' : ''}${Math.abs(userPnLDollar).toFixed(2)}
          </div>
        </div>

        <div className="text-right">
          <div className={`text-xl sm:text-2xl font-black tabular-nums ${opponentPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {opponentPnL >= 0 ? '+' : ''}{opponentPnL.toFixed(2)}%
          </div>
          <div className="text-[10px] sm:text-xs text-white/40">
            {opponentPnLDollar >= 0 ? '+' : ''}${Math.abs(opponentPnLDollar).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
