'use client';

import { Trophy, PartyPopper, Frown } from 'lucide-react';
import Image from 'next/image';
import { TWBetSide, LAMPORTS_PER_SOL } from './types';
import { getTokenLogo } from '@/config/tokenLogos';

interface ResultOverlayProps {
  show: boolean;
  winner: TWBetSide | 'tie' | null;
  winnerSymbol: string;
  winnerChange: number;
  loserSymbol: string;
  loserChange: number;
  userBetSide: TWBetSide | null;
  userBetAmount: number;
  userPayout: number;
  nextBattleIn: number;
}

export function ResultOverlay({
  show,
  winner,
  winnerSymbol,
  winnerChange,
  loserSymbol,
  loserChange,
  userBetSide,
  userBetAmount,
  userPayout,
  nextBattleIn,
}: ResultOverlayProps) {
  if (!show || !winner || winner === 'tie') return null;

  const userWon = userBetSide === winner;
  const winnerLogo = getTokenLogo(winnerSymbol);
  const isTokenA = winner === 'token_a';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative text-center animate-result-appear">
        {/* Winner Token */}
        <div className="flex items-center justify-center mb-6">
          <div
            className="relative w-24 h-24 rounded-full overflow-hidden animate-winner-pulse"
            style={{
              boxShadow: `0 0 60px ${isTokenA ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
            }}
          >
            <Image
              src={winnerLogo}
              alt={winnerSymbol}
              width={96}
              height={96}
              className="rounded-full"
              unoptimized
            />
          </div>
        </div>

        {/* Winner Text */}
        <div
          className={`text-5xl md:text-7xl font-black mb-4 ${
            isTokenA ? 'text-success' : 'text-danger'
          }`}
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          {winnerSymbol} WINS!
        </div>

        {/* Final Changes */}
        <div className="flex items-center justify-center gap-8 text-xl mb-8">
          <div className={isTokenA ? 'text-success' : 'text-white/40'}>
            {winnerSymbol}: {winnerChange >= 0 ? '+' : ''}{winnerChange.toFixed(2)}%
          </div>
          <span className="text-white/20">vs</span>
          <div className={!isTokenA ? 'text-danger' : 'text-white/40'}>
            {loserSymbol}: {loserChange >= 0 ? '+' : ''}{loserChange.toFixed(2)}%
          </div>
        </div>

        {/* User Result */}
        {userBetSide && (
          <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-8 ${
            userWon
              ? 'bg-success/20 border-2 border-success'
              : 'bg-danger/20 border-2 border-danger'
          }`}>
            {userWon ? (
              <>
                <PartyPopper className="w-8 h-8 text-success" />
                <div className="text-left">
                  <div className="text-success font-bold text-lg">You Won!</div>
                  <div className="text-success/80 text-2xl font-black">
                    +{((userPayout - userBetAmount) / LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </div>
                </div>
              </>
            ) : (
              <>
                <Frown className="w-8 h-8 text-danger" />
                <div className="text-left">
                  <div className="text-danger font-bold text-lg">Better luck next time</div>
                  <div className="text-danger/80 text-2xl font-black">
                    -{(userBetAmount / LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Next Battle */}
        <div className="text-white/40 text-sm">
          Next battle in {nextBattleIn}s
        </div>
      </div>
    </div>
  );
}
