'use client';

import { useState } from 'react';
import { LiveBattle, BattleOdds } from '@/types';
import { getSocket } from '@/lib/socket';

interface QuickBetStripProps {
  battle: LiveBattle;
  odds: BattleOdds | null;
  walletAddress?: string;
  onBetPlaced?: () => void;
}

const QUICK_BET_AMOUNTS = [0.1, 0.25, 0.5, 1];

export function QuickBetStrip({ battle, odds, walletAddress, onBetPlaced }: QuickBetStripProps) {
  const [selectedAmount, setSelectedAmount] = useState(0.25);
  const [isPlacing, setIsPlacing] = useState(false);

  const player1 = battle.players[0];
  const player2 = battle.players[1];

  const formatWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const handleQuickBet = (playerWallet: string) => {
    if (!walletAddress) {
      // Could emit toast or handle differently
      return;
    }

    setIsPlacing(true);
    const socket = getSocket();
    socket.emit('place_bet', battle.id, playerWallet, selectedAmount, walletAddress);

    // Optimistic UI - assume success
    setTimeout(() => {
      setIsPlacing(false);
      onBetPlaced?.();
    }, 500);
  };

  // Odds come from parent via props - updated when spectator_battle_update fires
  const player1Odds = odds?.player1.odds ?? 2.0;
  const player2Odds = odds?.player2.odds ?? 2.0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Glass background */}
      <div className="bg-black/90 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
        <div className="max-w-lg mx-auto px-3 py-2">
          {/* Amount selector row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Quick Bet</span>
            <div className="flex gap-1 flex-1 justify-end">
              {QUICK_BET_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    selectedAmount === amt
                      ? 'bg-accent text-black'
                      : 'bg-white/10 text-white/60 active:bg-white/20'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Fighter bet buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => player1 && handleQuickBet(player1.walletAddress)}
              disabled={isPlacing || !walletAddress || !player1}
              className="flex-1 py-3 rounded-xl bg-success/20 border border-success/30
                       active:scale-95 transition-all disabled:opacity-50 touch-manipulation"
            >
              <div className="flex flex-col items-center">
                <span className="text-success font-bold text-sm">
                  {player1 ? formatWallet(player1.walletAddress) : '---'}
                </span>
                <span className="text-success/80 text-xs font-mono">
                  {player1Odds.toFixed(2)}x
                </span>
              </div>
            </button>

            <button
              onClick={() => player2 && handleQuickBet(player2.walletAddress)}
              disabled={isPlacing || !walletAddress || !player2}
              className="flex-1 py-3 rounded-xl bg-danger/20 border border-danger/30
                       active:scale-95 transition-all disabled:opacity-50 touch-manipulation"
            >
              <div className="flex flex-col items-center">
                <span className="text-danger font-bold text-sm">
                  {player2 ? formatWallet(player2.walletAddress) : '---'}
                </span>
                <span className="text-danger/80 text-xs font-mono">
                  {player2Odds.toFixed(2)}x
                </span>
              </div>
            </button>
          </div>

          {/* Connect wallet prompt if not connected */}
          {!walletAddress && (
            <div className="text-center mt-2 text-xs text-white/40">
              Connect wallet to bet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
