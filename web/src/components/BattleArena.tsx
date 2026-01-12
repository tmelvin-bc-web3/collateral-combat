'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBattleContext } from '@/contexts/BattleContext';
import { usePrices } from '@/hooks/usePrices';
import { TradingViewChart } from './TradingViewChart';
import { AssetIcon } from './AssetIcon';
import { ASSETS } from '@/lib/assets';
import { Battle, PerpPosition, Leverage, PositionSide } from '@/types';
import { Card } from './ui/Card';

const LEVERAGE_OPTIONS: Leverage[] = [2, 5, 10, 20];

interface BattleArenaProps {
  battle: Battle;
}

export function BattleArena({ battle }: BattleArenaProps) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const { currentPlayer, openPosition, closePosition, error, getTimeRemaining } = useBattleContext();
  const { prices } = usePrices();

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState('SOL');
  const [selectedSide, setSelectedSide] = useState<PositionSide>('long');
  const [selectedLeverage, setSelectedLeverage] = useState<Leverage>(5);
  const [margin, setMargin] = useState('100');
  const [showChart, setShowChart] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [getTimeRemaining]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOpenPosition = () => {
    const marginNum = parseFloat(margin);
    if (isNaN(marginNum) || marginNum < 10) return;
    if (marginNum > (currentPlayer?.account.balance || 0)) return;
    const positionSize = marginNum * selectedLeverage;
    openPosition(selectedAsset, selectedSide, selectedLeverage, positionSize);
    setMargin('100');
  };

  const getAccountValue = () => {
    if (!currentPlayer) return 0;
    const marginInPositions = currentPlayer.account.positions.reduce(
      (sum, p) => sum + (p.size / p.leverage), 0
    );
    const unrealizedPnl = currentPlayer.account.positions.reduce(
      (sum, p) => sum + p.unrealizedPnl, 0
    );
    return currentPlayer.account.balance + marginInPositions + unrealizedPnl;
  };

  if (battle.status === 'completed') {
    return <BattleResults battle={battle} walletAddress={walletAddress} />;
  }

  const totalPnl = currentPlayer?.account.totalPnlPercent || 0;
  const isUrgent = timeRemaining < 60;
  const progressPercent = battle.startedAt
    ? Math.min(100, ((Date.now() - battle.startedAt) / (battle.config.duration * 1000)) * 100)
    : 0;

  return (
    <div className="animate-fadeIn">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-xl bg-danger/20 border border-danger/30 text-danger text-sm flex items-center gap-3 shadow-xl animate-fadeIn">
          <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          {error}
        </div>
      )}

      {/* Battle Header - Sports Broadcast Style */}
      <div className={`relative rounded-2xl overflow-hidden mb-6 mt-8 ${isUrgent ? 'ring-2 ring-danger/50' : ''}`}>
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg-secondary via-bg-tertiary to-bg-secondary" />

        {/* Urgency overlay */}
        {isUrgent && (
          <div className="absolute inset-0 bg-gradient-to-r from-danger/10 via-transparent to-danger/10 animate-pulse" />
        )}

        <div className="relative p-6">
          {/* Top Row - Live Badge & Timer */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/20 border border-danger/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                </span>
                <span className="text-xs font-bold text-danger uppercase tracking-wider">Live Battle</span>
              </div>
              {isUrgent && (
                <div className="px-3 py-1.5 rounded-full bg-warning/20 border border-warning/30">
                  <span className="text-xs font-bold text-warning uppercase tracking-wider">Final Minute</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-4xl font-black font-mono tabular-nums ${isUrgent ? 'text-danger animate-pulse' : ''}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-bg-primary rounded-full mb-6 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${isUrgent ? 'bg-danger' : 'bg-accent'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {/* Your P&L */}
            <div className="p-4 rounded-xl bg-bg-primary/50 border border-border-primary">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Your P&L</div>
              <div className={`text-2xl font-black tabular-nums ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}%
              </div>
            </div>

            {/* Account Value */}
            <div className="p-4 rounded-xl bg-bg-primary/50 border border-border-primary">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Account Value</div>
              <div className="text-2xl font-bold font-mono">${getAccountValue().toFixed(0)}</div>
            </div>

            {/* Available */}
            <div className="p-4 rounded-xl bg-bg-primary/50 border border-border-primary">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Available</div>
              <div className="text-2xl font-bold font-mono">${(currentPlayer?.account.balance || 0).toFixed(0)}</div>
            </div>

            {/* Prize Pool */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30">
              <div className="text-xs text-accent uppercase tracking-wider mb-1">Prize Pool</div>
              <div className="text-2xl font-black text-accent">{(battle.prizePool * 0.95).toFixed(2)} SOL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-tertiary/50">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">{selectedAsset}/USD</span>
            {prices[selectedAsset] && (
              <span className="text-text-secondary font-mono">${prices[selectedAsset].toFixed(2)}</span>
            )}
          </div>
          <button
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${showChart ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {showChart ? 'Hide' : 'Show'} Chart
          </button>
        </div>
        {showChart && (
          <div className="p-0">
            <TradingViewChart symbol={selectedAsset} height={350} />
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Account & Positions - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Open Positions */}
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg">Open Positions</h2>
                  <p className="text-text-tertiary text-xs">{currentPlayer?.account.positions.length || 0} active</p>
                </div>
              </div>

              {(currentPlayer?.account.closedPnl || 0) !== 0 && (
                <div className="text-right">
                  <div className="text-xs text-text-tertiary">Realized P&L</div>
                  <div className={`font-mono font-bold ${(currentPlayer?.account.closedPnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {(currentPlayer?.account.closedPnl || 0) >= 0 ? '+' : ''}${(currentPlayer?.account.closedPnl || 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {currentPlayer?.account.positions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-bg-tertiary flex items-center justify-center">
                  <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4M12 4v16" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-1">No Open Positions</h3>
                <p className="text-text-secondary text-sm">Open a position to start trading</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentPlayer?.account.positions.map((position) => (
                  <PositionRow key={position.id} position={position} onClose={() => closePosition(position.id)} />
                ))}
              </div>
            )}
          </Card>

          {/* Trade History */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg">Trade History</h2>
                <p className="text-text-tertiary text-xs">{currentPlayer?.trades.length || 0} trades</p>
              </div>
            </div>

            {currentPlayer?.trades.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary text-sm">No trades yet</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {currentPlayer?.trades.slice().reverse().map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        trade.side === 'long' ? 'bg-success/20' : 'bg-danger/20'
                      }`}>
                        <svg className={`w-4 h-4 ${trade.side === 'long' ? 'text-success' : 'text-danger'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {trade.side === 'long' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          )}
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{trade.asset}</div>
                        <div className="text-xs text-text-tertiary">{trade.leverage}x {trade.side}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {trade.pnl !== undefined && (
                        <div className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Trading Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                <svg className="w-5 h-5 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg">Open Position</h2>
                <p className="text-text-tertiary text-xs">Trade with leverage</p>
              </div>
            </div>

            {/* Asset Selection */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Select Asset
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {ASSETS.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset.symbol)}
                    className={`relative p-2 rounded-xl border-2 transition-all ${
                      selectedAsset === asset.symbol
                        ? 'border-accent bg-accent/5'
                        : 'border-transparent bg-bg-tertiary hover:bg-bg-hover'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <AssetIcon symbol={asset.symbol} size="sm" />
                    </div>
                    <div className={`text-[10px] text-center font-medium ${selectedAsset === asset.symbol ? 'text-text-primary' : 'text-text-tertiary'}`}>
                      {asset.symbol}
                    </div>
                    {selectedAsset === asset.symbol && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent flex items-center justify-center">
                        <svg className="w-2 h-2 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Direction
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedSide('long')}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    selectedSide === 'long'
                      ? 'border-success bg-success/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                      : 'border-border-primary bg-bg-tertiary hover:border-success/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className={`w-5 h-5 ${selectedSide === 'long' ? 'text-success' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span className={`font-bold ${selectedSide === 'long' ? 'text-success' : 'text-text-secondary'}`}>Long</span>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedSide('short')}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    selectedSide === 'short'
                      ? 'border-danger bg-danger/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                      : 'border-border-primary bg-bg-tertiary hover:border-danger/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className={`w-5 h-5 ${selectedSide === 'short' ? 'text-danger' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span className={`font-bold ${selectedSide === 'short' ? 'text-danger' : 'text-text-secondary'}`}>Short</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Leverage */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Leverage
              </label>
              <div className="grid grid-cols-4 gap-2">
                {LEVERAGE_OPTIONS.map((lev) => (
                  <button
                    key={lev}
                    onClick={() => setSelectedLeverage(lev)}
                    className={`py-2.5 rounded-xl font-bold transition-all ${
                      selectedLeverage === lev
                        ? 'bg-accent text-bg-primary'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Input */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Margin
                </label>
                <span className="text-sm text-text-tertiary">
                  Size: <span className="font-mono font-bold text-text-primary">${(parseFloat(margin) * selectedLeverage || 0).toFixed(0)}</span>
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary font-medium">$</span>
                <input
                  type="number"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  placeholder="100"
                  className="w-full py-3 pl-8 pr-4 rounded-xl bg-bg-tertiary border border-border-primary focus:border-accent focus:ring-1 focus:ring-accent/50 font-mono text-lg transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[50, 100, 250, 500].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setMargin(preset.toString())}
                    className="py-2 rounded-lg text-xs font-medium bg-bg-hover text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleOpenPosition}
              disabled={
                !margin ||
                parseFloat(margin) < 10 ||
                parseFloat(margin) > (currentPlayer?.account.balance || 0) ||
                currentPlayer?.account.positions.some(p => p.asset === selectedAsset)
              }
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
                selectedSide === 'long'
                  ? 'bg-gradient-to-r from-success to-success/80 text-white hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                  : 'bg-gradient-to-r from-danger to-danger/80 text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {selectedSide === 'long' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {selectedSide === 'long' ? 'Long' : 'Short'} {selectedAsset}
              </div>
            </button>

            {currentPlayer?.account.positions.some(p => p.asset === selectedAsset) && (
              <div className="mt-3 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-2">
                <svg className="w-4 h-4 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-warning text-sm">Already have {selectedAsset} position</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PositionRow({ position, onClose }: { position: PerpPosition; onClose: () => void }) {
  const isLong = position.side === 'long';
  const isProfit = position.unrealizedPnl >= 0;

  return (
    <div className={`relative p-5 rounded-xl border-2 transition-all ${
      isProfit
        ? 'bg-success/5 border-success/20'
        : 'bg-danger/5 border-danger/20'
    }`}>
      {/* Position Badge */}
      <div className="absolute -top-3 left-4">
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          isLong ? 'bg-success text-white' : 'bg-danger text-white'
        }`}>
          {position.leverage}x {position.side.toUpperCase()}
        </div>
      </div>

      <div className="flex items-start justify-between pt-2">
        <div className="flex items-center gap-3">
          <AssetIcon symbol={position.asset} size="lg" />
          <div>
            <div className="font-bold text-lg">{position.asset}</div>
            <div className="text-sm text-text-tertiary">Size: ${position.size.toFixed(0)}</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-bg-hover border border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary transition-all text-sm font-medium"
        >
          Close Position
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border-primary">
        <div>
          <div className="text-xs text-text-tertiary mb-1">Entry Price</div>
          <div className="font-mono font-semibold">${position.entryPrice.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary mb-1">Mark Price</div>
          <div className="font-mono font-semibold">${position.currentPrice.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary mb-1">Liq. Price</div>
          <div className="font-mono font-semibold text-warning">${position.liquidationPrice.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-tertiary mb-1">Unrealized P&L</div>
          <div className={`font-mono font-bold text-lg ${isProfit ? 'text-success' : 'text-danger'}`}>
            {isProfit ? '+' : ''}{position.unrealizedPnlPercent.toFixed(2)}%
          </div>
          <div className={`text-sm font-mono ${isProfit ? 'text-success' : 'text-danger'}`}>
            {isProfit ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BattleResults({ battle, walletAddress }: { battle: Battle; walletAddress: string | null }) {
  const sortedPlayers = [...battle.players].sort((a, b) => (b.finalPnl || 0) - (a.finalPnl || 0));
  const isWinner = battle.winnerId === walletAddress;
  const prize = battle.prizePool * 0.95;

  return (
    <div className="max-w-xl mx-auto mt-16 animate-fadeIn">
      <div className="relative">
        {/* Background glow */}
        <div className={`absolute inset-0 blur-3xl ${isWinner ? 'bg-accent/20' : 'bg-danger/10'}`} />

        <Card className="relative overflow-hidden">
          {/* Confetti effect for winner */}
          {isWinner && (
            <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
          )}

          <div className="relative p-8 text-center">
            {/* Trophy/Icon */}
            <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-xl ${
              isWinner
                ? 'bg-gradient-to-br from-accent to-accent/70 shadow-accent/30'
                : 'bg-gradient-to-br from-bg-tertiary to-bg-hover'
            }`}>
              {isWinner ? (
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <h1 className={`text-4xl font-black mb-3 ${isWinner ? 'text-accent' : 'text-text-secondary'}`}>
              {isWinner ? 'Victory!' : 'Defeat'}
            </h1>
            <p className="text-lg text-text-secondary mb-8">
              {isWinner ? (
                <>You won <span className="font-bold text-accent">{prize.toFixed(2)} SOL</span></>
              ) : (
                'Better luck next time, champion'
              )}
            </p>

            {/* Results */}
            <div className="space-y-3 mb-8">
              {sortedPlayers.map((player, index) => {
                const isCurrentPlayer = player.walletAddress === walletAddress;
                const isFirstPlace = index === 0;

                return (
                  <div
                    key={player.walletAddress}
                    className={`relative flex items-center justify-between p-4 rounded-xl transition-all ${
                      isCurrentPlayer
                        ? isFirstPlace
                          ? 'bg-accent/10 border-2 border-accent/30'
                          : 'bg-bg-tertiary border-2 border-border-primary'
                        : 'bg-bg-tertiary border border-border-primary'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        isFirstPlace
                          ? 'bg-gradient-to-br from-accent to-accent/70 text-bg-primary'
                          : 'bg-bg-hover text-text-tertiary'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">
                          {isCurrentPlayer ? 'You' : `${player.walletAddress.slice(0, 4)}...${player.walletAddress.slice(-4)}`}
                        </div>
                        {isFirstPlace && (
                          <div className="text-xs text-accent font-medium">Winner</div>
                        )}
                      </div>
                    </div>
                    <div className={`text-xl font-mono font-bold ${(player.finalPnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {(player.finalPnl || 0) >= 0 ? '+' : ''}{(player.finalPnl || 0).toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Play Again Button */}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-bg-primary font-bold text-lg hover:shadow-[0_0_30px_rgba(0,212,170,0.4)] transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Play Again
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
