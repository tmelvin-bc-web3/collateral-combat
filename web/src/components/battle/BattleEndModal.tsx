'use client';

import { Trophy, Skull, RefreshCw, Swords, LogOut, Sparkles } from 'lucide-react';
import { FighterData } from './types';

interface BattleEndModalProps {
  isWinner: boolean;
  userFighter: FighterData;
  opponentFighter: FighterData;
  prizePool: number;
  entryFee: number;
  userTradeCount: number;
  bestTrade: number;
  xpEarned: number;
  onRematch?: () => void;
  onNewBattle: () => void;
  onExit: () => void;
  claimButton?: React.ReactNode;
}

export function BattleEndModal({
  isWinner,
  userFighter,
  opponentFighter,
  prizePool,
  entryFee,
  userTradeCount,
  bestTrade,
  xpEarned,
  onRematch,
  onNewBattle,
  onExit,
  claimButton,
}: BattleEndModalProps) {
  const prize = prizePool * 0.95;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with glow effect */}
      <div className={`absolute inset-0 ${isWinner ? 'bg-warning/5' : 'bg-danger/5'}`} />
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-fadeIn">
        {/* Glow effect behind card */}
        <div
          className={`absolute inset-0 blur-3xl ${isWinner ? 'bg-warning/20' : 'bg-danger/10'}`}
        />

        <div className="relative bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Victory/Defeat Banner */}
          <div
            className={`px-6 py-8 text-center ${
              isWinner
                ? 'bg-gradient-to-b from-warning/20 via-warning/10 to-transparent'
                : 'bg-gradient-to-b from-danger/10 via-danger/5 to-transparent'
            }`}
          >
            {/* Trophy/Skull Icon */}
            <div
              className={`w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center shadow-xl ${
                isWinner
                  ? 'bg-gradient-to-br from-warning to-fire shadow-warning/30'
                  : 'bg-gradient-to-br from-white/10 to-white/5'
              }`}
            >
              {isWinner ? (
                <Trophy className="w-10 h-10 text-white" />
              ) : (
                <Skull className="w-10 h-10 text-white/40" />
              )}
            </div>

            {/* Title */}
            <h1
              className={`text-4xl font-black mb-2 ${isWinner ? 'text-warning' : 'text-white/60'}`}
              style={{ fontFamily: 'Impact, sans-serif' }}
            >
              {isWinner ? 'VICTORY!' : 'DEFEAT'}
            </h1>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {/* P&L Comparison */}
            <div className="flex items-center justify-center gap-4 py-4 mb-4 border-y border-white/10">
              {/* You */}
              <div className="text-center">
                <div className="text-xs text-white/40 uppercase mb-1">You</div>
                <div
                  className={`text-2xl font-black ${
                    userFighter.pnlPercent >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {userFighter.pnlPercent >= 0 ? '+' : ''}
                  {userFighter.pnlPercent.toFixed(2)}%
                </div>
              </div>

              {/* VS */}
              <div className="text-white/20 font-bold text-lg">VS</div>

              {/* Opponent */}
              <div className="text-center">
                <div className="text-xs text-white/40 uppercase mb-1">{opponentFighter.username}</div>
                <div
                  className={`text-2xl font-black ${
                    opponentFighter.pnlPercent >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {opponentFighter.pnlPercent >= 0 ? '+' : ''}
                  {opponentFighter.pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Prize/Loss */}
            <div
              className={`p-4 rounded-xl text-center mb-4 ${
                isWinner ? 'bg-warning/10 border border-warning/20' : 'bg-danger/10 border border-danger/20'
              }`}
            >
              <div className="text-sm text-white/60 mb-1">{isWinner ? 'You Won' : 'You Lost'}</div>
              <div className={`text-3xl font-black ${isWinner ? 'text-warning' : 'text-danger'}`}>
                {isWinner ? '' : '-'}
                {isWinner ? prize.toFixed(2) : entryFee} SOL
              </div>
            </div>

            {/* Claim Button (if provided) */}
            {claimButton && <div className="mb-4">{claimButton}</div>}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-lg font-bold text-white">{userTradeCount}</div>
                <div className="text-[10px] text-white/40 uppercase">Trades</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className={`text-lg font-bold ${bestTrade >= 0 ? 'text-success' : 'text-danger'}`}>
                  {bestTrade >= 0 ? '+' : ''}${bestTrade.toFixed(0)}
                </div>
                <div className="text-[10px] text-white/40 uppercase">Best Trade</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-lg font-bold text-purple-400 flex items-center justify-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  {xpEarned}
                </div>
                <div className="text-[10px] text-white/40 uppercase">XP Earned</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {onRematch && (
                <button
                  onClick={onRematch}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold hover:bg-purple-500/30 transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Rematch
                </button>
              )}
              <button
                onClick={onNewBattle}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-warning to-fire text-white font-bold hover:shadow-lg hover:shadow-warning/30 transition-all active:scale-[0.98]"
              >
                <Swords className="w-4 h-4" />
                New Battle
              </button>
              <button
                onClick={onExit}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
