'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBattleContext } from '@/contexts/BattleContext';
import { useBattleOnChain } from '@/hooks/useBattleOnChain';
import { usePrices } from '@/hooks/usePrices';
import { Battle, PositionSide, Leverage } from '@/types';
import { ASSETS } from '@/lib/assets';
import { AssetIcon } from './AssetIcon';
import { TradingViewChart } from './TradingViewChart';
import { PositionsTable } from './battle/PositionsTable';
import { TradeHistoryTable } from './battle/TradeHistoryTable';
import { useWinShare } from '@/hooks/useWinShare';
import { WinShareModal } from './WinShareModal';
import { WinToast } from './WinToast';

interface BattleArenaProps {
  battle: Battle;
}

const LEVERAGE_OPTIONS: Leverage[] = [2, 5, 10, 20];

export function BattleArena({ battle }: BattleArenaProps) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const { currentPlayer, openPosition, closePosition, error, getTimeRemaining } = useBattleContext();
  const { prices } = usePrices();

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState('SOL');
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');

  // Order state
  const [leverage, setLeverage] = useState<Leverage>(5);
  const [margin, setMargin] = useState('100');

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

  // Calculate real-time P&L for positions using live prices
  const getPositionsWithLivePnL = useCallback(() => {
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

  const positionsWithLivePnL = getPositionsWithLivePnL();

  const getAccountValue = () => {
    if (!currentPlayer) return 0;
    const marginInPositions = positionsWithLivePnL.reduce(
      (sum, p) => sum + (p.size / p.leverage), 0
    );
    const unrealizedPnl = positionsWithLivePnL.reduce(
      (sum, p) => sum + p.unrealizedPnl, 0
    );
    return currentPlayer.account.balance + marginInPositions + unrealizedPnl;
  };

  const getTotalPnLPercent = () => {
    if (!currentPlayer) return 0;
    const totalUnrealizedPnl = positionsWithLivePnL.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const closedPnl = currentPlayer.account.closedPnl || 0;
    const totalPnl = totalUnrealizedPnl + closedPnl;
    const startingBalance = currentPlayer.account.startingBalance || 10000;
    return (totalPnl / startingBalance) * 100;
  };

  const marginValue = parseFloat(margin) || 0;
  const positionSize = marginValue * leverage;
  const availableBalance = currentPlayer?.account.balance || 0;
  const hasExistingPosition = currentPlayer?.account.positions.some(p => p.asset === selectedAsset) || false;
  const isValid = marginValue >= 10 && marginValue <= availableBalance && !hasExistingPosition;

  const handleOpenPosition = (side: PositionSide) => {
    if (!isValid) return;
    openPosition(selectedAsset, side, leverage, positionSize);
    setMargin('100');
  };

  const handleQuickSize = (percent: number) => {
    const amount = Math.floor((availableBalance * percent) / 100);
    setMargin(amount.toString());
  };

  if (battle.status === 'completed') {
    return <BattleResults battle={battle} walletAddress={walletAddress} />;
  }

  const totalPnl = getTotalPnLPercent();
  const isUrgent = timeRemaining < 60;
  const currentPrice = prices[selectedAsset] || 0;

  const [showOrderPanel, setShowOrderPanel] = useState(false);

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-96px)] flex flex-col overflow-hidden animate-fadeIn">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 right-4 z-50 p-3 md:p-4 rounded-xl bg-danger/20 border border-danger/30 text-danger text-sm flex items-center gap-2 md:gap-3 shadow-xl animate-fadeIn max-w-[90vw]">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Main Layout: Responsive - stacked on mobile, side-by-side on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Chart Area - Full width on mobile, flex-1 on desktop */}
        <div className="flex-1 flex flex-col min-w-0 lg:border-r border-white/10">
          {/* Chart Header - Compact on mobile */}
          <div className="flex items-center justify-between px-2 md:px-4 py-2 border-b border-white/10 bg-black/40 flex-shrink-0 gap-2">
            {/* Asset Selector & Price */}
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

            {/* Battle Stats - Responsive */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              {/* Timer - Always visible */}
              <div className="text-center">
                <div className="text-[8px] md:text-[10px] text-white/40 uppercase">Time</div>
                <div className={`text-base md:text-xl font-black font-mono tabular-nums ${isUrgent ? 'text-danger animate-pulse' : 'text-white'}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>

              {/* Account - Hidden on small */}
              <div className="text-center hidden md:block">
                <div className="text-[10px] text-white/40 uppercase">Account</div>
                <div className="font-mono font-bold">${getAccountValue().toFixed(0)}</div>
              </div>

              {/* P&L - Always visible */}
              <div className="text-center">
                <div className="text-[8px] md:text-[10px] text-white/40 uppercase">P&L</div>
                <div className={`text-sm md:text-base font-mono font-bold ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(1)}%
                </div>
              </div>

              {/* Prize - Compact on mobile */}
              <div className="px-2 md:px-3 py-1 rounded bg-warning/10 border border-warning/30 text-center hidden sm:block">
                <div className="text-[8px] md:text-[10px] text-warning uppercase">Prize</div>
                <div className="text-sm md:text-base font-bold text-warning">{(battle.prizePool * 0.95).toFixed(2)} SOL</div>
              </div>

              {/* Mobile Order Panel Toggle */}
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

          {/* Asset Pills - Scrollable */}
          <div className="flex items-center gap-1 px-2 py-1 md:py-1.5 border-b border-white/10 bg-black/20 overflow-x-auto hide-scrollbar flex-shrink-0">
            {ASSETS.map((asset) => {
              const isSelected = selectedAsset === asset.symbol;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`flex items-center gap-1 md:gap-1.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm font-medium transition-all flex-shrink-0 ${
                    isSelected
                      ? 'bg-warning/20 text-warning'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <AssetIcon symbol={asset.symbol} size="sm" />
                  <span className="hidden sm:inline">{asset.symbol}</span>
                </button>
              );
            })}
          </div>

          {/* Chart - Takes remaining space */}
          <div className="flex-1 min-h-[200px] bg-[#0d0d0d]">
            <TradingViewChart symbol={selectedAsset} height="100%" />
          </div>
        </div>

        {/* Order Panel - Slide-over on mobile, sidebar on desktop */}
        <div className={`
          ${showOrderPanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          fixed lg:relative inset-y-0 right-0 z-40
          w-[280px] md:w-[300px] lg:w-[280px]
          flex-shrink-0 bg-black/95 lg:bg-black/40
          flex flex-col
          transition-transform duration-300 ease-in-out
          border-l border-white/10 lg:border-l-0
        `}>
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
            <h2 className="font-bold text-sm uppercase tracking-wider text-white/60">Place Order</h2>
            <button
              onClick={() => setShowOrderPanel(false)}
              className="lg:hidden p-1 rounded text-white/40 hover:text-white hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Order Form */}
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
                      leverage === lev
                        ? 'bg-warning text-black'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-wider">Margin</span>
                <span className="text-xs text-white/40">
                  Avail: <span className="font-mono text-white/60">${availableBalance.toFixed(0)}</span>
                </span>
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
              {/* Quick size buttons */}
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

            {/* Warning */}
            {hasExistingPosition && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Already have {selectedAsset} position</span>
              </div>
            )}
          </div>

          {/* Long/Short Buttons - Fixed at bottom */}
          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenPosition('long')}
                disabled={!isValid}
                className="relative py-3 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-success/10 border-success/40 hover:bg-success/20 hover:border-success group"
              >
                <div className="text-success font-bold text-sm tracking-wide">LONG</div>
                <div className="text-success/60 text-[10px] font-mono mt-0.5 group-hover:text-success/80">
                  {leverage}x • ${positionSize.toFixed(0)}
                </div>
              </button>
              <button
                onClick={() => handleOpenPosition('short')}
                disabled={!isValid}
                className="relative py-3 rounded border transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-danger/10 border-danger/40 hover:bg-danger/20 hover:border-danger group"
              >
                <div className="text-danger font-bold text-sm tracking-wide">SHORT</div>
                <div className="text-danger/60 text-[10px] font-mono mt-0.5 group-hover:text-danger/80">
                  {leverage}x • ${positionSize.toFixed(0)}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Overlay */}
        {showOrderPanel && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setShowOrderPanel(false)}
          />
        )}
      </div>

      {/* Bottom: Positions Panel - Responsive height */}
      <div className="h-[120px] md:h-[160px] flex-shrink-0 border-t border-white/10 bg-black/40 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-all border-b-2 ${
              activeTab === 'positions'
                ? 'border-warning text-warning'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            Positions ({positionsWithLivePnL.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-all border-b-2 ${
              activeTab === 'history'
                ? 'border-warning text-warning'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            History ({currentPlayer?.trades.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'positions' ? (
            <PositionsTable
              positions={positionsWithLivePnL}
              onClosePosition={closePosition}
            />
          ) : (
            <TradeHistoryTable trades={currentPlayer?.trades || []} />
          )}
        </div>
      </div>
    </div>
  );
}

function BattleResults({ battle, walletAddress }: { battle: Battle; walletAddress: string | null }) {
  const { settlementTx } = useBattleContext();
  const { claimPlayerPrize, isLoading: isClaiming, error: claimError } = useBattleOnChain();
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claiming' | 'claimed' | 'error'>('idle');
  const [claimTxSignature, setClaimTxSignature] = useState<string | null>(null);

  // Win share modal hook
  const {
    pendingWin,
    toastWin,
    showWinShare,
    trackShare,
    hasSharedOn,
    dismissWin,
    dismissToast,
    expandToModal,
    referralCode,
    cooldownStatus,
    winBypassesCooldown,
  } = useWinShare();

  const sortedPlayers = [...battle.players].sort((a, b) => (b.finalPnl || 0) - (a.finalPnl || 0));
  const isWinner = battle.winnerId === walletAddress;
  const prize = battle.prizePool * 0.95;

  const hasOnChainBattle = !!battle.onChainBattleId;
  const isSettled = battle.onChainSettled || !!settlementTx;

  const handleClaimPrize = async () => {
    if (!battle.onChainBattleId) return;

    setClaimStatus('claiming');
    try {
      const tx = await claimPlayerPrize(0);
      if (tx) {
        setClaimStatus('claimed');
        setClaimTxSignature(tx);

        // Show win share modal after successful claim
        showWinShare({
          winAmount: prize,
          gameMode: 'battle',
          roundId: battle.id,
        });
      } else {
        setClaimStatus('error');
      }
    } catch (error) {
      console.error('[BattleResults] Claim error:', error);
      setClaimStatus('error');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16 px-4 animate-fadeIn">
      <div className="relative">
        <div className={`absolute inset-0 blur-3xl ${isWinner ? 'bg-warning/20' : 'bg-danger/10'}`} />

        <div className="relative bg-black/60 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
          {isWinner && (
            <div className="absolute inset-0 bg-gradient-to-b from-warning/10 via-transparent to-transparent" />
          )}

          <div className="relative p-8 text-center">
            {/* Trophy */}
            <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-xl ${
              isWinner
                ? 'bg-gradient-to-br from-warning to-fire shadow-warning/30'
                : 'bg-gradient-to-br from-white/10 to-white/5'
            }`}>
              {isWinner ? (
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <h1 className={`text-4xl font-black mb-3 ${isWinner ? 'text-warning' : 'text-white/60'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
              {isWinner ? 'VICTORY' : 'DEFEAT'}
            </h1>
            <p className="text-lg text-white/60 mb-8">
              {isWinner ? (
                <>You won <span className="font-bold text-warning">{prize.toFixed(2)} SOL</span></>
              ) : (
                'Better luck next time, champion'
              )}
            </p>

            {/* Claim Button */}
            {isWinner && hasOnChainBattle && (
              <div className="mb-6">
                {claimStatus === 'claimed' ? (
                  <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                    <div className="flex items-center justify-center gap-2 text-success font-semibold">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Prize Claimed!
                    </div>
                    {claimTxSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${claimTxSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/40 hover:text-warning mt-2 block"
                      >
                        View transaction
                      </a>
                    )}
                  </div>
                ) : !isSettled ? (
                  <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                    <div className="flex items-center justify-center gap-2 text-warning">
                      <div className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium">Settling on-chain...</span>
                    </div>
                  </div>
                ) : claimStatus === 'error' ? (
                  <div className="p-4 rounded-xl bg-danger/10 border border-danger/30">
                    <div className="flex items-center justify-center gap-2 text-danger font-medium">
                      {claimError || 'Failed to claim prize'}
                    </div>
                    <button
                      onClick={handleClaimPrize}
                      className="mt-3 px-4 py-2 rounded-lg bg-danger/20 text-danger text-sm font-medium hover:bg-danger/30 transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleClaimPrize}
                    disabled={isClaiming || claimStatus === 'claiming'}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-warning to-fire text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(255,85,0,0.4)] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isClaiming || claimStatus === 'claiming' ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Claiming...
                      </div>
                    ) : (
                      `Claim ${prize.toFixed(2)} SOL`
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Settlement TX Link */}
            {settlementTx && (
              <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-xs text-white/40">Battle settled on-chain</div>
                <a
                  href={`https://explorer.solana.com/tx/${settlementTx}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-warning hover:underline"
                >
                  View settlement transaction
                </a>
              </div>
            )}

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
                          ? 'bg-warning/10 border-2 border-warning/30'
                          : 'bg-white/10 border-2 border-white/20'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        isFirstPlace
                          ? 'bg-gradient-to-br from-warning to-fire text-white'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">
                          {isCurrentPlayer ? 'You' : `${player.walletAddress.slice(0, 4)}...${player.walletAddress.slice(-4)}`}
                        </div>
                        {isFirstPlace && (
                          <div className="text-xs text-warning font-medium">Winner</div>
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

            {/* Play Again */}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-lg hover:bg-white/20 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Play Again
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Win Share Modal */}
      <WinShareModal
        winData={pendingWin}
        onClose={dismissWin}
        onTrackShare={trackShare}
        hasSharedOn={hasSharedOn}
        referralCode={referralCode}
        cooldownStatus={cooldownStatus}
        winBypassesCooldown={winBypassesCooldown}
      />

      {/* Win Toast for smaller wins */}
      <WinToast
        winData={toastWin}
        onExpand={expandToModal}
        onDismiss={dismissToast}
        cooldownStatus={cooldownStatus}
        winBypassesCooldown={winBypassesCooldown}
      />
    </div>
  );
}
