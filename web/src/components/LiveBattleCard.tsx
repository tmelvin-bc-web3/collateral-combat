'use client';

import { useState, useEffect } from 'react';
import { LiveBattle } from '@/types';
import { UserAvatar } from './UserAvatar';

interface LiveBattleCardProps {
  battle: LiveBattle;
  featured?: boolean;
  onWatch: () => void;
}

export function LiveBattleCard({ battle, featured, onWatch }: LiveBattleCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!battle.startedAt) return;

    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - battle.startedAt!) / 1000);
      const remaining = Math.max(0, battle.config.duration - elapsed);
      setTimeRemaining(remaining);

      // Pulse effect when time is low
      if (remaining <= 60 && remaining > 0) {
        setPulse(true);
        setTimeout(() => setPulse(false), 500);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [battle.startedAt, battle.config.duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const player1 = battle.players[0];
  const player2 = battle.players[1];

  const player1Pnl = player1?.account.totalPnlPercent || 0;
  const player2Pnl = player2?.account.totalPnlPercent || 0;

  const player1Leading = player1Pnl > player2Pnl;
  const player2Leading = player2Pnl > player1Pnl;
  const isDraw = player1Pnl === player2Pnl;

  const leadDiff = Math.abs(player1Pnl - player2Pnl);
  const isClose = leadDiff < 2; // Within 2%

  const formatWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  // Calculate bar widths for visual comparison
  const maxPnl = Math.max(Math.abs(player1Pnl), Math.abs(player2Pnl), 1);
  const p1Width = Math.min(100, (Math.abs(player1Pnl) / maxPnl) * 100);
  const p2Width = Math.min(100, (Math.abs(player2Pnl) / maxPnl) * 100);

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-300 ${
        featured
          ? 'bg-gradient-to-br from-bg-secondary via-bg-secondary to-accent/5 border-2 border-accent/30'
          : 'bg-bg-secondary border border-border-primary hover:border-border-secondary'
      } ${pulse ? 'ring-2 ring-danger/50' : ''}`}
    >
      {/* Urgency overlay for final minute */}
      {timeRemaining <= 60 && timeRemaining > 0 && (
        <div className="absolute inset-0 bg-gradient-to-r from-danger/5 via-transparent to-danger/5 animate-pulse pointer-events-none" />
      )}

      <div className="relative p-5">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-danger/20 border border-danger/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
              </span>
              <span className="text-[10px] font-bold text-danger uppercase tracking-wider">Live</span>
            </div>

            {featured && (
              <div className="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Featured</span>
              </div>
            )}

            {isClose && !isDraw && (
              <div className="px-2.5 py-1 rounded-full bg-warning/10 border border-warning/30">
                <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Close Match</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className={`text-right ${timeRemaining <= 60 ? 'text-danger' : ''}`}>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">
                {timeRemaining <= 60 ? 'Final Minute' : 'Remaining'}
              </div>
              <div className={`text-xl font-mono font-bold tabular-nums ${timeRemaining <= 60 ? 'animate-pulse' : ''}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>

        {/* Players Battle Display */}
        <div className="relative">
          {/* Player 1 */}
          <div className={`relative p-4 rounded-lg mb-3 transition-all ${
            player1Leading ? 'bg-success/10 border border-success/30' : 'bg-bg-tertiary border border-transparent'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {player1Leading && (
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                )}
                {player1 && <UserAvatar walletAddress={player1.walletAddress} size="md" />}
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Player 1</div>
                  <div className="font-mono text-sm font-medium">
                    {player1 ? formatWallet(player1.walletAddress) : 'Waiting...'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold tabular-nums ${player1Pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {player1Pnl >= 0 ? '+' : ''}{player1Pnl.toFixed(2)}%
                </div>
                {battle.odds?.player1 && (
                  <div className="text-xs text-text-tertiary">
                    {battle.odds.player1.odds.toFixed(2)}x odds
                  </div>
                )}
              </div>
            </div>
            {/* PnL Bar */}
            <div className="h-1.5 bg-bg-primary/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${player1Pnl >= 0 ? 'bg-success' : 'bg-danger'}`}
                style={{ width: `${p1Width}%` }}
              />
            </div>
          </div>

          {/* VS Divider */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-10 h-10 rounded-full bg-bg-primary border-2 border-border-secondary flex items-center justify-center">
              <span className="text-xs font-bold text-text-tertiary">VS</span>
            </div>
          </div>

          {/* Player 2 */}
          <div className={`relative p-4 rounded-lg transition-all ${
            player2Leading ? 'bg-success/10 border border-success/30' : 'bg-bg-tertiary border border-transparent'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {player2Leading && (
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                )}
                {player2 && <UserAvatar walletAddress={player2.walletAddress} size="md" />}
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Player 2</div>
                  <div className="font-mono text-sm font-medium">
                    {player2 ? formatWallet(player2.walletAddress) : 'Waiting...'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold tabular-nums ${player2Pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {player2Pnl >= 0 ? '+' : ''}{player2Pnl.toFixed(2)}%
                </div>
                {battle.odds?.player2 && (
                  <div className="text-xs text-text-tertiary">
                    {battle.odds.player2.odds.toFixed(2)}x odds
                  </div>
                )}
              </div>
            </div>
            {/* PnL Bar */}
            <div className="h-1.5 bg-bg-primary/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${player2Pnl >= 0 ? 'bg-success' : 'bg-danger'}`}
                style={{ width: `${p2Width}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border-primary">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Prize Pool</div>
              <div className="font-bold text-accent">{battle.prizePool.toFixed(2)} SOL</div>
            </div>
            {battle.totalBetPool !== undefined && battle.totalBetPool > 0 && (
              <div>
                <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Bet Pool</div>
                <div className="font-bold">{battle.totalBetPool.toFixed(2)} SOL</div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Watching</div>
              <div className="font-bold">{battle.spectatorCount || 0}</div>
            </div>
          </div>

          <button
            onClick={onWatch}
            className="px-5 py-2.5 rounded-lg bg-accent text-bg-primary font-semibold text-sm hover:bg-accent-hover transition-all hover:shadow-[0_0_20px_rgba(0,212,170,0.3)] active:scale-[0.98]"
          >
            Watch Battle
          </button>
        </div>
      </div>
    </div>
  );
}
