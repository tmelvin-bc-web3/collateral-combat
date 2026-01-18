'use client';

import { ArrowUp, ArrowDown, Crown, Trophy } from 'lucide-react';
import Image from 'next/image';
import { TWPhase, TWBetSide, LAMPORTS_PER_SOL } from './types';
import { getTokenLogo, getTokenColor, getTokenConfig } from '@/config/tokenLogos';

interface TokenCardProps {
  symbol: string;
  name: string;
  side: TWBetSide;
  price: number | null;
  change: number | null;
  pool: number;
  poolPercent: number;
  multiplier: number;
  betCount: number;
  phase: TWPhase;
  isLeading: boolean;
  isWinner: boolean;
  userBetAmount: number | null;
  potentialWin: number;
  canBet: boolean;
  onPlaceBet: () => void;
}

export function TokenCard({
  symbol,
  name,
  side,
  price,
  change,
  pool,
  poolPercent,
  multiplier,
  betCount,
  phase,
  isLeading,
  isWinner,
  userBetAmount,
  potentialWin,
  canBet,
  onPlaceBet,
}: TokenCardProps) {
  const logoUrl = getTokenLogo(symbol);
  const color = getTokenColor(symbol);
  const isTokenA = side === 'token_a';
  const accentColor = isTokenA ? 'success' : 'danger';

  // Determine card state classes
  const getCardClasses = () => {
    const base = 'flex-1 rounded-2xl p-5 relative transition-all duration-300';

    if (isWinner) {
      return `${base} border-2 border-success bg-gradient-to-br from-success/20 to-success/5 shadow-[0_0_40px_rgba(34,197,94,0.3)] animate-winner-glow`;
    }
    if (isLeading && phase === 'in_progress') {
      return `${base} border-2 border-${accentColor} bg-gradient-to-br from-${accentColor}/10 to-transparent`;
    }
    if (canBet) {
      return `${base} border-2 border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]`;
    }
    return `${base} border-2 border-white/[0.06] bg-white/[0.02] ${userBetAmount === null ? 'opacity-60' : ''}`;
  };

  return (
    <div className={getCardClasses()}>
      {/* Leading Badge */}
      {isLeading && phase === 'in_progress' && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-${accentColor} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-bounce`}>
          <Crown className="w-3 h-3" />
          LEADING
        </div>
      )}

      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 animate-winner-bounce">
          <Trophy className="w-4 h-4" />
          WINNER
        </div>
      )}

      {/* Token Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="relative w-14 h-14 rounded-full overflow-hidden"
          style={{ boxShadow: `0 0 20px ${color}40` }}
        >
          <Image
            src={logoUrl}
            alt={symbol}
            width={56}
            height={56}
            className="rounded-full"
            unoptimized
          />
        </div>
        <div>
          <div className={`text-2xl font-black text-${accentColor}`} style={{ fontFamily: 'Impact, sans-serif' }}>
            {symbol}
          </div>
          <div className="text-sm text-white/50">{name}</div>
        </div>
      </div>

      {/* Price & Change - Key metric */}
      <div className="flex justify-between items-end mb-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="text-[11px] text-white/40 uppercase">Price</div>
          <div className="text-lg font-semibold text-white">
            {price !== null ? `$${price.toFixed(6)}` : '-'}
          </div>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${
          change !== null && change >= 0
            ? 'bg-success/10'
            : 'bg-danger/10'
        }`}>
          {change !== null ? (
            <>
              {change >= 0 ? (
                <ArrowUp className="w-5 h-5 text-success" />
              ) : (
                <ArrowDown className="w-5 h-5 text-danger" />
              )}
              <span className={`text-xl font-bold ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="text-xl font-bold text-white/40">--.--</span>
          )}
        </div>
      </div>

      {/* Pool Info */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-white/40 uppercase">Pool</span>
          <span className={`text-sm font-bold text-${accentColor}`}>{multiplier.toFixed(2)}x</span>
        </div>
        <div className={`text-2xl font-bold text-${accentColor}`}>
          {(pool / LAMPORTS_PER_SOL).toFixed(2)} SOL
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-2 mb-1">
          <div
            className={`h-full bg-${accentColor} rounded-full transition-all duration-300`}
            style={{ width: `${poolPercent}%` }}
          />
        </div>
        <div className="text-xs text-white/40">{poolPercent.toFixed(0)}% of bets</div>
      </div>

      {/* Bet Count */}
      <div className="text-sm text-white/50 mb-4">{betCount} bets</div>

      {/* User Bet Badge */}
      {userBetAmount !== null && (
        <div className={`px-3 py-2 rounded-lg bg-${accentColor} text-${isTokenA ? 'black' : 'white'} text-center font-bold mb-4`}>
          YOUR BET: {(userBetAmount / LAMPORTS_PER_SOL).toFixed(2)} SOL
        </div>
      )}

      {/* Place Bet Button (during betting phase) */}
      {canBet && (
        <button
          className={`w-full py-3 rounded-xl font-semibold transition-all border-2 border-${accentColor} text-${accentColor} hover:bg-${accentColor} hover:text-white`}
          onClick={onPlaceBet}
        >
          Bet on {symbol}
        </button>
      )}

      {/* Potential Win */}
      {canBet && (
        <div className={`text-center text-sm text-${accentColor}/80 mt-3`}>
          Win ~{potentialWin.toFixed(2)} SOL
        </div>
      )}
    </div>
  );
}
