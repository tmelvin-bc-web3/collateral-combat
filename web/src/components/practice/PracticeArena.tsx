'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBattleContext } from '@/contexts/BattleContext';
import { usePrices } from '@/hooks/usePrices';
import { Battle, PositionSide, Leverage } from '@/types';
import { ASSETS } from '@/lib/assets';
import { AssetIcon } from '@/components/AssetIcon';
import { TradingViewChart } from '@/components/TradingViewChart';
import { PositionsTable } from '@/components/battle/PositionsTable';
import { TradeHistoryTable } from '@/components/battle/TradeHistoryTable';
import { PracticeHeader } from './PracticeHeader';
import { TipsPanel } from './TipsPanel';
import { PracticeSessionStats, Tip, PRACTICE_TIPS } from './types';

interface PracticeArenaProps {
  battle: Battle;
  onReset: () => void;
}

const LEVERAGE_OPTIONS: Leverage[] = [2, 5, 10, 20];

export function PracticeArena({ battle, onReset }: PracticeArenaProps) {
  const router = useRouter();
  const { currentPlayer, openPosition, closePosition, error, getTimeRemaining, leaveBattle } = useBattleContext();
  const { prices } = usePrices();

  const [sessionStartTime] = useState(Date.now());
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState('SOL');
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [showOrderPanel, setShowOrderPanel] = useState(false);

  // Order state
  const [leverage, setLeverage] = useState<Leverage>(5);
  const [margin, setMargin] = useState('100');

  // Tips state
  const [tipCategory, setTipCategory] = useState<'basics' | 'strategy' | 'risk'>('basics');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Session time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Get current tip based on category
  const currentTip = useMemo(() => {
    const categoryTips = PRACTICE_TIPS.filter(t => t.category === tipCategory);
    return categoryTips[currentTipIndex % categoryTips.length];
  }, [tipCategory, currentTipIndex]);

  const handleRefreshTip = () => {
    const categoryTips = PRACTICE_TIPS.filter(t => t.category === tipCategory);
    setCurrentTipIndex((prev) => (prev + 1) % categoryTips.length);
  };

  const handleCategoryChange = (category: 'basics' | 'strategy' | 'risk') => {
    setTipCategory(category);
    setCurrentTipIndex(0);
  };

  // Calculate real-time P&L for positions
  const positionsWithLivePnL = useMemo(() => {
    if (!currentPlayer) return [];

    return currentPlayer.account.positions.map(position => {
      const livePrice = prices[position.asset] || position.currentPrice;
      const priceDiff = position.side === 'long'
        ? livePrice - position.entryPrice
        : position.entryPrice - livePrice;
      const pnlPercent = (priceDiff / position.entryPrice) * 100 * position.leverage;
      const marginAmount = position.size / position.leverage;
      const pnlDollar = marginAmount * (pnlPercent / 100);

      return {
        ...position,
        currentPrice: livePrice,
        unrealizedPnl: pnlDollar,
        unrealizedPnlPercent: pnlPercent,
      };
    });
  }, [currentPlayer, prices]);

  // Calculate session stats
  const sessionStats: PracticeSessionStats = useMemo(() => {
    if (!currentPlayer) {
      return {
        sessionTime,
        virtualBalance: 1000,
        startingBalance: 1000,
        sessionPnL: 0,
        sessionPnLDollar: 0,
        tradesThisSession: 0,
        winningTrades: 0,
      };
    }

    const marginInPositions = positionsWithLivePnL.reduce(
      (sum, p) => sum + (p.size / p.leverage), 0
    );
    const unrealizedPnl = positionsWithLivePnL.reduce(
      (sum, p) => sum + p.unrealizedPnl, 0
    );
    const virtualBalance = currentPlayer.account.balance + marginInPositions + unrealizedPnl;
    const startingBalance = currentPlayer.account.startingBalance || 1000;
    const closedPnl = currentPlayer.account.closedPnl || 0;
    const totalPnlDollar = unrealizedPnl + closedPnl;
    const sessionPnL = (totalPnlDollar / startingBalance) * 100;

    const trades = currentPlayer.trades || [];
    const closedTrades = trades.filter(t => t.type === 'close');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;

    return {
      sessionTime,
      virtualBalance,
      startingBalance,
      sessionPnL,
      sessionPnLDollar: totalPnlDollar,
      tradesThisSession: closedTrades.length,
      winningTrades,
    };
  }, [currentPlayer, positionsWithLivePnL, sessionTime]);

  // Order calculations
  const currentPrice = prices[selectedAsset] || 0;
  const marginValue = parseFloat(margin) || 0;
  const positionSize = marginValue * leverage;
  const availableBalance = currentPlayer?.account.balance || 0;
  const hasExistingPosition = currentPlayer?.account.positions.some(p => p.asset === selectedAsset);
  const isValid = marginValue >= 10 && marginValue <= availableBalance && !hasExistingPosition;

  const handleOpenPosition = async (side: PositionSide) => {
    if (!isValid) return;
    await openPosition(selectedAsset, side, leverage, positionSize);
    setMargin('100');
  };

  const handleClosePosition = async (positionId: string) => {
    await closePosition(positionId);
  };

  const handleQuickSize = (percent: number) => {
    const amount = Math.floor((availableBalance * percent) / 100);
    setMargin(amount.toString());
  };

  const handleEnterRealBattle = () => {
    leaveBattle();
    router.push('/battle');
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-96px)] flex flex-col overflow-hidden animate-fadeIn">
      {/* Practice Header */}
      <PracticeHeader
        stats={sessionStats}
        onReset={onReset}
        onEnterRealBattle={handleEnterRealBattle}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:border-r border-white/10">
          {/* Asset Header */}
          <div className="flex items-center justify-between px-2 md:px-4 py-2 border-b border-white/10 bg-black/40 flex-shrink-0 gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2">
                <AssetIcon symbol={selectedAsset} size="sm" />
                <div className="min-w-0">
                  <div className="font-bold text-sm md:text-lg truncate">{selectedAsset}<span className="text-white/40">/USD</span></div>
                  <div className="text-[10px] md:text-xs text-white/40 hidden sm:block">Perpetual</div>
                </div>
              </div>
              <div className="text-lg md:text-2xl font-mono font-bold whitespace-nowrap">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <div className="text-center hidden md:block">
                <div className="text-[10px] text-white/40 uppercase">Account</div>
                <div className="font-mono font-bold">${sessionStats.virtualBalance.toFixed(0)}</div>
              </div>
              <button
                onClick={() => setShowOrderPanel(!showOrderPanel)}
                className="lg:hidden p-2 rounded bg-warning/20 text-warning border border-warning/30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Asset Pills */}
          <div className="flex items-center gap-1 px-2 py-1 md:py-1.5 border-b border-white/10 bg-black/20 overflow-x-auto hide-scrollbar flex-shrink-0">
            {ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={`flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm font-medium transition-all flex-shrink-0 ${
                  selectedAsset === asset.symbol
                    ? 'bg-warning/20 text-warning'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <AssetIcon symbol={asset.symbol} size="sm" />
                <span className="hidden sm:inline">{asset.symbol}</span>
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-[200px] bg-[#0d0d0d]">
            <TradingViewChart symbol={selectedAsset} height="100%" />
          </div>
        </div>

        {/* Right Panel */}
        <div className={`
          ${showOrderPanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          fixed lg:relative inset-y-0 right-0 z-40
          w-[280px] md:w-[300px] lg:w-[280px]
          flex-shrink-0 bg-black/95 lg:bg-black/40
          flex flex-col
          transition-transform duration-300 ease-in-out
          border-l border-white/10 lg:border-l-0
        `}>
          <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
            <h2 className="font-bold text-sm uppercase tracking-wider text-white/60">Place Order</h2>
            <button onClick={() => setShowOrderPanel(false)} className="lg:hidden p-1 rounded text-white/40 hover:text-white hover:bg-white/10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Leverage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-wider">Leverage</span>
                <span className="text-sm font-mono font-bold text-warning">{leverage}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {LEVERAGE_OPTIONS.map((lev) => (
                  <button
                    key={lev}
                    onClick={() => setLeverage(lev)}
                    className={`py-2 text-sm font-bold rounded transition-all ${
                      leverage === lev ? 'bg-warning text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-wider">Margin</span>
                <span className="text-xs text-white/40">Avail: <span className="font-mono text-white/60">${availableBalance.toFixed(0)}</span></span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <input
                  type="number"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  placeholder="0"
                  className="w-full py-3 pl-7 pr-3 rounded-lg bg-white/5 border border-white/10 focus:border-warning focus:outline-none font-mono text-lg text-right text-white"
                />
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => handleQuickSize(percent)}
                    className="py-1.5 text-xs font-medium rounded bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-all"
                  >
                    {percent === 100 ? 'MAX' : `${percent}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Size */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40 uppercase">Position Size</span>
                <span className="font-mono font-bold text-lg">${positionSize.toFixed(0)}</span>
              </div>
            </div>

            {hasExistingPosition && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Already have {selectedAsset} position</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            {/* Tips Panel */}
            <TipsPanel
              currentTip={currentTip}
              onRefresh={handleRefreshTip}
              category={tipCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {/* Long/Short Buttons */}
          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenPosition('long')}
                disabled={!isValid}
                className="relative py-3 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-success/10 border-success/40 hover:bg-success/20 hover:border-success group"
              >
                <div className="text-success font-bold text-sm tracking-wide">LONG</div>
                <div className="text-success/60 text-[10px] font-mono mt-0.5 group-hover:text-success/80">{leverage}x  ${positionSize.toFixed(0)}</div>
              </button>
              <button
                onClick={() => handleOpenPosition('short')}
                disabled={!isValid}
                className="relative py-3 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-danger/10 border-danger/40 hover:bg-danger/20 hover:border-danger group"
              >
                <div className="text-danger font-bold text-sm tracking-wide">SHORT</div>
                <div className="text-danger/60 text-[10px] font-mono mt-0.5 group-hover:text-danger/80">{leverage}x  ${positionSize.toFixed(0)}</div>
              </button>
            </div>
          </div>
        </div>

        {showOrderPanel && (
          <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setShowOrderPanel(false)} />
        )}
      </div>

      {/* Bottom Panel - Positions/History */}
      <div className="h-[120px] md:h-[160px] flex-shrink-0 border-t border-white/10 bg-black/40 flex flex-col">
        <div className="flex items-center border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'positions'
                ? 'border-warning text-warning'
                : 'border-transparent text-white/50 hover:text-white/70'
            }`}
          >
            Positions ({positionsWithLivePnL.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-warning text-warning'
                : 'border-transparent text-white/50 hover:text-white/70'
            }`}
          >
            History ({currentPlayer?.trades?.filter(t => t.type === 'close').length || 0})
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'positions' ? (
            <PositionsTable positions={positionsWithLivePnL} onClosePosition={handleClosePosition} />
          ) : (
            <TradeHistoryTable trades={currentPlayer?.trades?.filter(t => t.type === 'close') || []} />
          )}
        </div>
      </div>
    </div>
  );
}
