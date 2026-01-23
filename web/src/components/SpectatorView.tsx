'use client';

import { useState, useEffect } from 'react';
import { LiveBattle } from '@/types';
import { BettingPanel } from './BettingPanel';
import { TradingViewChart } from './TradingViewChart';
import { Card } from './ui/Card';
import { SpectatorPnLBar } from '@/components/spectate/SpectatorPnLBar';
import { FighterPositionCard } from '@/components/spectate/FighterPositionCard';

interface SpectatorViewProps {
  battle: LiveBattle;
  onBack: () => void;
  walletAddress?: string;
}

export function SpectatorView({ battle, onBack, walletAddress }: SpectatorViewProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState('SOL');
  const [leadChange, setLeadChange] = useState<'p1' | 'p2' | null>(null);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  const player1 = battle.players[0];
  const player2 = battle.players[1];

  const player1Pnl = player1?.account.totalPnlPercent || 0;
  const player2Pnl = player2?.account.totalPnlPercent || 0;

  const player1Leading = player1Pnl > player2Pnl;
  const player2Leading = player2Pnl > player1Pnl;

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

  // Track lead changes for animation
  useEffect(() => {
    if (player1Leading) {
      setLeadChange('p1');
    } else if (player2Leading) {
      setLeadChange('p2');
    }
  }, [player1Leading, player2Leading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const isUrgent = timeRemaining <= 60 && timeRemaining > 0;
  const leadDiff = Math.abs(player1Pnl - player2Pnl);
  const isClose = leadDiff < 2;

  // Calculate progress percentage
  const progressPercent = battle.startedAt
    ? Math.min(100, ((Date.now() - battle.startedAt) / (battle.config.duration * 1000)) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn pb-20 lg:pb-0">
      {/* Top Bar - responsive with wrapping */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6 mt-4 sm:mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">All Battles</span>
        </button>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Live Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/20 border border-danger/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
            </span>
            <span className="text-xs font-bold text-danger uppercase tracking-wider">Live</span>
          </div>

          {/* Spectators */}
          <div className="flex items-center gap-2 text-text-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="font-semibold">{battle.spectatorCount || 0}</span>
            <span className="text-sm hidden sm:inline">watching</span>
          </div>
        </div>
      </div>

      {/* Main Battle Header - Sports Broadcast Style - responsive */}
      <div className={`relative rounded-2xl overflow-hidden mb-4 sm:mb-6 ${isUrgent ? 'ring-2 ring-danger/50' : ''}`}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-secondary via-bg-tertiary to-bg-secondary" />

        {/* Urgency overlay */}
        {isUrgent && (
          <div className="absolute inset-0 bg-gradient-to-r from-danger/10 via-transparent to-danger/10 animate-pulse" />
        )}

        <div className="relative p-4 sm:p-6">
          {/* Timer Row */}
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <div className="text-center">
              <div className={`text-xs uppercase tracking-wider mb-1 ${isUrgent ? 'text-danger font-bold' : 'text-text-tertiary'}`}>
                {isUrgent ? 'Final Minute' : 'Time Remaining'}
              </div>
              <div className={`text-3xl sm:text-5xl font-black font-mono tabular-nums ${isUrgent ? 'text-danger animate-pulse' : ''}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-bg-primary rounded-full mb-4 sm:mb-6 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${isUrgent ? 'bg-danger' : 'bg-accent'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Players Head to Head - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Player 1 */}
            <div className={`relative p-4 sm:p-5 rounded-xl transition-all ${
              player1Leading
                ? 'bg-success/10 border-2 border-success/50 shadow-[0_0_30px_rgba(34,197,94,0.1)]'
                : 'bg-bg-primary/50 border border-border-primary'
            }`}>
              {player1Leading && (
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
              )}
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Fighter 1</div>
              <div className="font-mono font-semibold mb-3">
                {player1 ? formatWallet(player1.walletAddress) : 'Waiting...'}
              </div>
              <div className={`text-3xl sm:text-4xl font-black tabular-nums ${player1Pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {player1Pnl >= 0 ? '+' : ''}{player1Pnl.toFixed(2)}%
              </div>
              <div className="text-sm text-text-tertiary mt-2 hidden sm:block">
                Balance: ${((player1?.account.balance || 0) + (player1?.account.positions.reduce((sum, p) => sum + p.size + p.unrealizedPnl, 0) || 0)).toFixed(0)}
              </div>
              {battle.odds?.player1 && (
                <div className="mt-3 pt-3 border-t border-border-primary">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Odds</span>
                    <span className="font-mono font-bold">{battle.odds.player1.odds.toFixed(2)}x</span>
                  </div>
                </div>
              )}
            </div>

            {/* VS / Prize Pool */}
            <div className="text-center py-2 sm:py-0">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-bg-primary border-2 border-border-secondary mb-2 sm:mb-3">
                <span className="text-lg sm:text-xl font-black text-text-tertiary">VS</span>
              </div>
              <div>
                <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Prize Pool</div>
                <div className="text-xl sm:text-2xl font-bold text-accent">{battle.prizePool.toFixed(2)} SOL</div>
              </div>
              {isClose && (
                <div className="mt-2 sm:mt-3 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/30 inline-block">
                  <span className="text-xs font-bold text-warning uppercase tracking-wider">Neck and Neck</span>
                </div>
              )}
            </div>

            {/* Player 2 */}
            <div className={`relative p-4 sm:p-5 rounded-xl transition-all ${
              player2Leading
                ? 'bg-success/10 border-2 border-success/50 shadow-[0_0_30px_rgba(34,197,94,0.1)]'
                : 'bg-bg-primary/50 border border-border-primary'
            }`}>
              {player2Leading && (
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
              )}
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Fighter 2</div>
              <div className="font-mono font-semibold mb-3">
                {player2 ? formatWallet(player2.walletAddress) : 'Waiting...'}
              </div>
              <div className={`text-3xl sm:text-4xl font-black tabular-nums ${player2Pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {player2Pnl >= 0 ? '+' : ''}{player2Pnl.toFixed(2)}%
              </div>
              <div className="text-sm text-text-tertiary mt-2 hidden sm:block">
                Balance: ${((player2?.account.balance || 0) + (player2?.account.positions.reduce((sum, p) => sum + p.size + p.unrealizedPnl, 0) || 0)).toFixed(0)}
              </div>
              {battle.odds?.player2 && (
                <div className="mt-3 pt-3 border-t border-border-primary">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Odds</span>
                    <span className="font-mono font-bold">{battle.odds.player2.odds.toFixed(2)}x</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tug-of-War PnL Bar */}
      <div className="mb-4 sm:mb-6">
        <SpectatorPnLBar
          fighter1={{
            pnl: player1Pnl,
            pnlDollar: (player1?.account.closedPnl || 0) + (player1?.account.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) || 0),
            wallet: player1?.walletAddress || '',
          }}
          fighter2={{
            pnl: player2Pnl,
            pnlDollar: (player2?.account.closedPnl || 0) + (player2?.account.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) || 0),
            wallet: player2?.walletAddress || '',
          }}
        />
      </div>

      {/* Main Content Grid - mobile-first responsive */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main battle content - 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6 order-1">
          {/* Chart Section - Collapsible on mobile, always visible on desktop */}
          <Card className="p-0 overflow-hidden">
            {/* Header - Always visible */}
            <button
              onClick={() => setIsChartExpanded(!isChartExpanded)}
              className="w-full flex items-center justify-between p-3 sm:p-4 border-b border-border-primary bg-bg-tertiary/50 lg:cursor-default"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary uppercase tracking-wider">Price Chart</span>
                {/* Asset buttons */}
                <div className="hidden sm:flex gap-1">
                  {['SOL', 'BTC', 'ETH'].map((asset) => (
                    <button
                      key={asset}
                      onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); }}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                        selectedAsset === asset
                          ? 'bg-accent text-bg-primary'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>
              {/* Collapse indicator - only on mobile/tablet */}
              <div className="lg:hidden flex items-center gap-2 text-text-tertiary">
                <span className="text-xs">{isChartExpanded ? 'Collapse' : 'Expand'}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isChartExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Mobile asset selector when expanded */}
            {isChartExpanded && (
              <div className="flex sm:hidden gap-1 p-3 border-b border-border-primary bg-bg-tertiary/30">
                {['SOL', 'BTC', 'ETH'].map((asset) => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      selectedAsset === asset
                        ? 'bg-accent text-bg-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            )}

            {/* Chart Content - Conditional visibility */}
            <div className={`transition-all duration-300 overflow-hidden ${
              isChartExpanded ? 'h-[250px] sm:h-[300px]' : 'h-0 lg:h-[350px]'
            }`}>
              <TradingViewChart symbol={selectedAsset} />
            </div>
          </Card>

          {/* Fighter Position Cards - responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
            {player1 && (
              <FighterPositionCard
                fighter={player1}
                label="Fighter 1"
                isLeading={player1Leading}
              />
            )}
            {player2 && (
              <FighterPositionCard
                fighter={player2}
                label="Fighter 2"
                isLeading={player2Leading}
              />
            )}
          </div>
        </div>

        {/* Betting panel - sidebar on desktop, below content on mobile */}
        <div className="lg:col-span-1 order-2">
          <BettingPanel
            battle={battle}
            walletAddress={walletAddress}
          />
        </div>
      </div>
    </div>
  );
}
