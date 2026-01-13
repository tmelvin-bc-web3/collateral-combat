'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBattleContext } from '@/contexts/BattleContext';
import { useBattleOnChain } from '@/hooks/useBattleOnChain';
import { usePrices } from '@/hooks/usePrices';
import { Battle, PositionSide, Leverage } from '@/types';

import { MarketsSidebar } from './battle/MarketsSidebar';
import { ChartSection } from './battle/ChartSection';
import { OrderPanel } from './battle/OrderPanel';
import { PositionsTable } from './battle/PositionsTable';
import { TradeHistoryTable } from './battle/TradeHistoryTable';

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
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');

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

  const handleOpenPosition = (side: PositionSide, leverage: Leverage, size: number) => {
    openPosition(selectedAsset, side, leverage, size);
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
      const margin = position.size / position.leverage;
      const pnlDollar = margin * (pnlPercent / 100);

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

  // Calculate total P&L with live prices
  const getTotalPnLPercent = () => {
    if (!currentPlayer) return 0;
    const totalUnrealizedPnl = positionsWithLivePnL.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const closedPnl = currentPlayer.account.closedPnl || 0;
    const totalPnl = totalUnrealizedPnl + closedPnl;
    const startingBalance = currentPlayer.account.startingBalance || 10000;
    return (totalPnl / startingBalance) * 100;
  };

  if (battle.status === 'completed') {
    return <BattleResults battle={battle} walletAddress={walletAddress} />;
  }

  const totalPnl = getTotalPnLPercent();
  const isUrgent = timeRemaining < 60;
  const availableBalance = currentPlayer?.account.balance || 0;
  const hasExistingPosition = currentPlayer?.account.positions.some(p => p.asset === selectedAsset) || false;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col animate-fadeIn">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-xl bg-danger/20 border border-danger/30 text-danger text-sm flex items-center gap-3 shadow-xl animate-fadeIn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Battle Header - Slim */}
      <div className={`flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border-primary ${isUrgent ? 'bg-danger/5' : ''}`}>
        <div className="flex items-center gap-4">
          {/* Live Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-danger/20 border border-danger/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
            </span>
            <span className="text-xs font-bold text-danger uppercase">Live</span>
          </div>

          {/* Timer */}
          <div className={`text-2xl font-black font-mono tabular-nums ${isUrgent ? 'text-danger animate-pulse' : ''}`}>
            {formatTime(timeRemaining)}
          </div>

          {isUrgent && (
            <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-xs font-bold uppercase">
              Final Minute
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Account Value */}
          <div className="text-right">
            <div className="text-xs text-text-tertiary">Account Value</div>
            <div className="font-mono font-bold">${getAccountValue().toFixed(0)}</div>
          </div>

          {/* Total P&L */}
          <div className="text-right">
            <div className="text-xs text-text-tertiary">Total P&L</div>
            <div className={`font-mono font-bold ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}%
            </div>
          </div>

          {/* Prize Pool */}
          <div className="text-right px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/30">
            <div className="text-xs text-accent">Prize Pool</div>
            <div className="font-bold text-accent">{(battle.prizePool * 0.95).toFixed(2)} SOL</div>
          </div>
        </div>
      </div>

      {/* Main Trading Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Markets */}
        <MarketsSidebar
          selectedAsset={selectedAsset}
          onSelectAsset={setSelectedAsset}
          prices={prices}
          balance={getAccountValue()}
          totalPnl={totalPnl}
          availableMargin={availableBalance}
        />

        {/* Center - Chart */}
        <ChartSection
          symbol={selectedAsset}
          price={prices[selectedAsset] || 0}
        />

        {/* Right - Order Panel */}
        <OrderPanel
          selectedAsset={selectedAsset}
          availableBalance={availableBalance}
          hasExistingPosition={hasExistingPosition}
          onOpenPosition={handleOpenPosition}
        />
      </div>

      {/* Bottom Panel - Positions & History */}
      <div className="h-[250px] flex flex-col bg-bg-secondary border-t border-border-primary">
        {/* Tabs */}
        <div className="flex border-b border-border-primary">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'positions'
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Positions ({positionsWithLivePnL.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab === 'history'
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
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

  const sortedPlayers = [...battle.players].sort((a, b) => (b.finalPnl || 0) - (a.finalPnl || 0));
  const isWinner = battle.winnerId === walletAddress;
  const prize = battle.prizePool * 0.95;

  // Check if this is an on-chain battle that can be claimed
  const hasOnChainBattle = !!battle.onChainBattleId;
  const isSettled = battle.onChainSettled || !!settlementTx;
  const canClaim = isWinner && hasOnChainBattle && isSettled && claimStatus === 'idle';

  const handleClaimPrize = async () => {
    if (!battle.onChainBattleId) return;

    setClaimStatus('claiming');
    try {
      // The on-chain battle ID is the PDA string, but we need to get the battle ID number
      // For now, we'll use the claimPlayerPrize which expects a number
      // We'll need to extract the battle ID from somewhere...
      // Actually the useBattleOnChain hook has fetchBattle which takes battleId number

      // For MVP, let's try using the battle account directly
      const tx = await claimPlayerPrize(0); // TODO: Need to pass actual battle ID
      if (tx) {
        setClaimStatus('claimed');
        setClaimTxSignature(tx);
        console.log('[BattleResults] Prize claimed:', tx);
      } else {
        setClaimStatus('error');
      }
    } catch (error) {
      console.error('[BattleResults] Claim error:', error);
      setClaimStatus('error');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16 animate-fadeIn">
      <div className="relative">
        {/* Background glow */}
        <div className={`absolute inset-0 blur-3xl ${isWinner ? 'bg-accent/20' : 'bg-danger/10'}`} />

        <div className="relative bg-bg-secondary border border-border-primary rounded-2xl overflow-hidden">
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

            {/* Claim Prize Button for Winner */}
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
                        className="text-xs text-text-tertiary hover:text-accent mt-2 block"
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
                    <p className="text-xs text-text-tertiary mt-2">
                      Please wait for the battle to be settled on-chain
                    </p>
                  </div>
                ) : claimStatus === 'error' ? (
                  <div className="p-4 rounded-xl bg-danger/10 border border-danger/30">
                    <div className="flex items-center justify-center gap-2 text-danger font-medium">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
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
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-warning to-fire text-bg-primary font-bold text-lg hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isClaiming || claimStatus === 'claiming' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                          Claiming Prize...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Claim {prize.toFixed(2)} SOL
                        </>
                      )}
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Settlement TX Link */}
            {settlementTx && (
              <div className="mb-6 p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                <div className="text-xs text-text-tertiary">Battle settled on-chain</div>
                <a
                  href={`https://explorer.solana.com/tx/${settlementTx}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
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
        </div>
      </div>
    </div>
  );
}
