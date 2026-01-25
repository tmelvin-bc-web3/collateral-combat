'use client';

import { useState, useEffect } from 'react';
import { LiveBattle } from '@/types';
import { TradingViewChart } from '@/components/TradingViewChart';
import { SpectatorPnLBar } from '@/components/spectate/SpectatorPnLBar';
import { UrgentTimer } from '@/components/animations';
import { Eye } from 'lucide-react';

interface BattleSlideProps {
  battle: LiveBattle;
  isActive: boolean;
  onBetPlaced?: () => void;
  className?: string;
}

/**
 * BattleSlide - Single battle view for the TikTok-style vertical feed
 * Mobile-optimized with 40/60 chart/betting split (MOB-01, MOB-06)
 *
 * Layout:
 * - Top 40vh: Chart area with fighter overlay
 * - Bottom 60vh: Betting area with fighter cards and odds
 */
export function BattleSlide({
  battle,
  isActive,
  onBetPlaced,
  className = '',
}: BattleSlideProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  const player1 = battle.players[0];
  const player2 = battle.players[1];

  const player1Pnl = player1?.account.totalPnlPercent || 0;
  const player2Pnl = player2?.account.totalPnlPercent || 0;

  const player1Leading = player1Pnl > player2Pnl;
  const player2Leading = player2Pnl > player1Pnl;

  // Calculate battle end time for UrgentTimer
  const battleEndTime = battle.startedAt
    ? battle.startedAt + battle.config.duration * 1000
    : Date.now() + 300000; // 5 min default if not started

  // Track timeRemaining for the "Final Minute" label
  useEffect(() => {
    if (!battle.startedAt) return;

    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - battle.startedAt!) / 1000);
      const remaining = Math.max(0, battle.config.duration - elapsed);
      setTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [battle.startedAt, battle.config.duration]);

  const isUrgent = timeRemaining <= 60 && timeRemaining > 0;
  const isWaiting = battle.status === 'waiting';
  const isCompleted = battle.status === 'completed';

  return (
    <div className={`h-screen w-full snap-start bg-bg-primary flex flex-col ${className}`}>
      {/* Chart Area - 40vh */}
      <div className="h-[40vh] relative overflow-hidden">
        {/* TradingView Chart (view-only, no interactions) */}
        <div className="absolute inset-0 pointer-events-none">
          <TradingViewChart symbol="SOL" height="100%" minimal />
        </div>

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />

        {/* Top overlay: Live badge + Spectators */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {/* Live Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/20 border border-danger/30 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
            </span>
            <span className="text-xs font-bold text-danger uppercase tracking-wider">
              {isWaiting ? 'Waiting' : isCompleted ? 'Ended' : 'Live'}
            </span>
          </div>

          {/* Spectator Count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
            <Eye className="w-3.5 h-3.5 text-white/60" />
            <span className="text-xs font-semibold text-white/80">{battle.spectatorCount || 0}</span>
          </div>
        </div>

        {/* Bottom overlay: Timer + Prize Pool */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <div className="flex items-end justify-between">
            {/* Timer with progressive urgency */}
            <div>
              <div className={`text-xs uppercase tracking-wider mb-0.5 ${isUrgent ? 'text-danger font-bold' : 'text-white/50'}`}>
                {isUrgent ? 'Final Minute' : 'Time Left'}
              </div>
              <UrgentTimer
                endTime={battleEndTime}
                className="text-2xl font-black"
              />
            </div>

            {/* Prize Pool */}
            <div className="text-right">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-0.5">Prize Pool</div>
              <div className="text-xl font-bold text-accent">{battle.prizePool.toFixed(2)} SOL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Betting Area - 60vh */}
      <div className="h-[60vh] flex flex-col overflow-y-auto">
        {/* Tug-of-War PnL Bar */}
        <div className="px-3 pt-3">
          <SpectatorPnLBar
            fighter1={{
              pnl: player1Pnl,
              pnlDollar:
                (player1?.account.closedPnl || 0) +
                (player1?.account.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) || 0),
              wallet: player1?.walletAddress || '',
            }}
            fighter2={{
              pnl: player2Pnl,
              pnlDollar:
                (player2?.account.closedPnl || 0) +
                (player2?.account.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) || 0),
              wallet: player2?.walletAddress || '',
            }}
          />
        </div>

        {/* Fighter Cards */}
        <div className="flex-1 px-3 py-3 space-y-3">
          {/* Fighter 1 */}
          <FighterCard
            label="Fighter 1"
            wallet={player1?.walletAddress}
            pnl={player1Pnl}
            isLeading={player1Leading}
            odds={battle.odds?.player1?.odds}
            stake={player1?.account.balance}
            onBet={() => onBetPlaced?.()}
          />

          {/* Fighter 2 */}
          <FighterCard
            label="Fighter 2"
            wallet={player2?.walletAddress}
            pnl={player2Pnl}
            isLeading={player2Leading}
            odds={battle.odds?.player2?.odds}
            stake={player2?.account.balance}
            onBet={() => onBetPlaced?.()}
          />
        </div>

        {/* Space for QuickBetStrip (positioned by parent) */}
        <div className="h-16 flex-shrink-0" />
      </div>
    </div>
  );
}

interface FighterCardProps {
  label: string;
  wallet?: string;
  pnl: number;
  isLeading: boolean;
  odds?: number;
  stake?: number;
  onBet: () => void;
}

function FighterCard({ label, wallet, pnl, isLeading, odds, stake, onBet }: FighterCardProps) {
  const formatWallet = (addr?: string) =>
    addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : 'Waiting...';

  return (
    <div className={`p-4 rounded-xl border transition-all ${isLeading ? 'bg-success/10 border-success/50' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center justify-between">
        {/* Left: Fighter Info */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/50 uppercase tracking-wider">{label}</span>
            {isLeading && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold text-success bg-success/20 rounded uppercase">
                Leading
              </span>
            )}
          </div>
          <div className="font-mono text-sm text-white/80">{formatWallet(wallet)}</div>
        </div>

        {/* Right: PnL */}
        <div className="text-right">
          <div className={`text-2xl font-black tabular-nums ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {pnl >= 0 ? '+' : ''}
            {pnl.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Bottom row: Odds + Bet button */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-4">
          {odds && (
            <div>
              <span className="text-xs text-white/40">Odds</span>
              <span className="ml-1.5 font-mono font-bold text-white">{odds.toFixed(2)}x</span>
            </div>
          )}
          {stake !== undefined && (
            <div>
              <span className="text-xs text-white/40">Stake</span>
              <span className="ml-1.5 font-mono text-white/80">${stake.toFixed(0)}</span>
            </div>
          )}
        </div>

        <button
          onClick={onBet}
          className="min-h-[44px] px-6 py-2 rounded-lg font-bold text-sm bg-accent hover:bg-accent/80 text-bg-primary transition-colors touch-manipulation"
        >
          Bet
        </button>
      </div>
    </div>
  );
}
