'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePrices } from '@/hooks/usePrices';
import { Battle, BattlePlayer, PositionSide, Leverage, PerpPosition, TradeRecord } from '@/types';
import { ASSETS } from '@/lib/assets';
import { AssetIcon } from '@/components/AssetIcon';
import { TradingViewChart } from '@/components/TradingViewChart';
import { PositionsTable } from '@/components/battle/PositionsTable';
import {
  BattleHeader,
  PnLComparisonBar,
  OpponentActivityFeed,
  ForfeitButton,
  FighterData,
  ActivityEvent,
  BattlePhase,
} from '@/components/battle';

const LEVERAGE_OPTIONS: Leverage[] = [2, 5, 10, 20];

// Mock opponent trades for activity feed
const MOCK_OPPONENT_TRADES: TradeRecord[] = [
  { id: 't1', timestamp: Date.now() - 120000, asset: 'ETH', side: 'short', leverage: 20, size: 3000, entryPrice: 3450, type: 'open' },
  { id: 't2', timestamp: Date.now() - 300000, asset: 'BTC', side: 'long', leverage: 10, size: 2000, entryPrice: 97000, exitPrice: 97500, pnl: 51.55, type: 'close' },
  { id: 't3', timestamp: Date.now() - 420000, asset: 'BTC', side: 'long', leverage: 10, size: 2000, entryPrice: 97000, type: 'open' },
];

// Mock players
const createPlayer1 = (): BattlePlayer => ({
  walletAddress: 'DemoUser1234567890abcdef',
  account: {
    balance: 850,
    startingBalance: 1000,
    positions: [
      {
        id: 'pos-1',
        asset: 'BTC',
        side: 'long' as PositionSide,
        leverage: 10 as Leverage,
        size: 1500,
        entryPrice: 97500,
        currentPrice: 98200,
        liquidationPrice: 87750,
        liquidationDistance: 10.0, // 10% distance to liquidation
        unrealizedPnl: 10.77,
        unrealizedPnlPercent: 7.18,
        openedAt: Date.now() - 300000,
      },
    ],
    closedPnl: 25,
    totalPnlPercent: 0,
  },
  trades: [
    { id: 'u1', timestamp: Date.now() - 300000, asset: 'BTC', side: 'long', leverage: 10, size: 1500, entryPrice: 97500, type: 'open' },
  ],
});

const createPlayer2 = (): BattlePlayer => ({
  walletAddress: 'OpponentWallet9876543210xyz',
  account: {
    balance: 700,
    startingBalance: 1000,
    positions: [
      {
        id: 'pos-2',
        asset: 'ETH',
        side: 'short' as PositionSide,
        leverage: 20 as Leverage,
        size: 3000,
        entryPrice: 3450,
        currentPrice: 3420,
        liquidationPrice: 3622,
        liquidationDistance: 5.0, // 5% distance to liquidation
        unrealizedPnl: 26.09,
        unrealizedPnlPercent: 17.39,
        openedAt: Date.now() - 420000,
      },
    ],
    closedPnl: 51.55,
    totalPnlPercent: 0,
  },
  trades: MOCK_OPPONENT_TRADES,
});

// Create demo battle
const createDemoBattle = (): Battle => ({
  id: 'demo-battle-001',
  config: {
    entryFee: 0.5,
    duration: 1800,
    mode: 'paper',
    maxPlayers: 2,
  },
  status: 'active',
  players: [createPlayer1(), createPlayer2()],
  createdAt: Date.now() - 600000,
  startedAt: Date.now() - 600000,
  prizePool: 0.95,
  spectatorCount: 12,
});

export default function BattleDemoPage() {
  const router = useRouter();
  const { prices } = usePrices();
  const [mounted, setMounted] = useState(false);
  const [battle, setBattle] = useState<Battle>(createDemoBattle);
  const [player1, setPlayer1] = useState<BattlePlayer>(createPlayer1);
  const [player2, setPlayer2] = useState<BattlePlayer>(createPlayer2);
  const [timeRemaining, setTimeRemaining] = useState(1200); // 20 minutes left
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [leverage, setLeverage] = useState<Leverage>(10);
  const [margin, setMargin] = useState('100');
  const [showOrderPanel, setShowOrderPanel] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update positions with live prices
  useEffect(() => {
    // Only update if we have at least one price
    const hasPrices = Object.keys(prices).length > 0;
    if (!hasPrices) return;

    setPlayer1(prev => ({
      ...prev,
      account: {
        ...prev.account,
        positions: prev.account.positions.map(pos => {
          const livePrice = prices[pos.asset] || pos.currentPrice;
          const priceDiff = pos.side === 'long'
            ? livePrice - pos.entryPrice
            : pos.entryPrice - livePrice;
          const pnlPercent = (priceDiff / pos.entryPrice) * 100 * pos.leverage;
          const marginAmount = pos.size / pos.leverage;
          const pnlDollar = marginAmount * (pnlPercent / 100);
          return {
            ...pos,
            currentPrice: livePrice,
            unrealizedPnl: pnlDollar,
            unrealizedPnlPercent: pnlPercent,
          };
        }),
      },
    }));

    setPlayer2(prev => ({
      ...prev,
      account: {
        ...prev.account,
        positions: prev.account.positions.map(pos => {
          const livePrice = prices[pos.asset] || pos.currentPrice;
          const priceDiff = pos.side === 'long'
            ? livePrice - pos.entryPrice
            : pos.entryPrice - livePrice;
          const pnlPercent = (priceDiff / pos.entryPrice) * 100 * pos.leverage;
          const marginAmount = pos.size / pos.leverage;
          const pnlDollar = marginAmount * (pnlPercent / 100);
          return {
            ...pos,
            currentPrice: livePrice,
            unrealizedPnl: pnlDollar,
            unrealizedPnlPercent: pnlPercent,
          };
        }),
      },
    }));
  }, [prices]);

  // Calculate P&L directly with useMemo
  const userPnL = useMemo(() => {
    const unrealizedPnl = player1.account.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalPnlDollar = unrealizedPnl + player1.account.closedPnl;
    const totalPnlPercent = (totalPnlDollar / player1.account.startingBalance) * 100;
    return { percent: totalPnlPercent, dollar: totalPnlDollar };
  }, [player1.account.positions, player1.account.closedPnl, player1.account.startingBalance]);

  const opponentPnL = useMemo(() => {
    const unrealizedPnl = player2.account.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalPnlDollar = unrealizedPnl + player2.account.closedPnl;
    const totalPnlPercent = (totalPnlDollar / player2.account.startingBalance) * 100;
    return { percent: totalPnlPercent, dollar: totalPnlDollar };
  }, [player2.account.positions, player2.account.closedPnl, player2.account.startingBalance]);

  // Get opponent activity
  const opponentActivity: ActivityEvent[] = useMemo(() => {
    return player2.trades
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(trade => ({
        id: trade.id,
        type: trade.type,
        asset: trade.asset,
        side: trade.side,
        leverage: trade.leverage,
        pnl: trade.pnl,
        timestamp: trade.timestamp,
      }));
  }, [player2.trades]);

  // Positions with live P&L
  const positionsWithLivePnL = useMemo(() => {
    return player1.account.positions.map(pos => ({
      ...pos,
      unrealizedPnl: pos.unrealizedPnl,
      unrealizedPnlPercent: pos.unrealizedPnlPercent,
    }));
  }, [player1.account.positions]);

  // Battle phase
  const getBattlePhase = (): BattlePhase => {
    if (timeRemaining < 60) return 'ending';
    return 'live';
  };

  // Fighter data
  const userFighter: FighterData = {
    walletAddress: player1.walletAddress,
    username: 'DemoTrader',
    avatar: null,
    level: 15,
    title: 'Warrior',
    pnlPercent: userPnL.percent,
    pnlDollar: userPnL.dollar,
    positions: positionsWithLivePnL.map(p => ({
      id: p.id,
      asset: p.asset,
      side: p.side,
      leverage: p.leverage,
      pnlPercent: p.unrealizedPnlPercent,
      pnlDollar: p.unrealizedPnl,
    })),
    isCurrentUser: true,
  };

  const opponentFighter: FighterData = {
    walletAddress: player2.walletAddress,
    username: 'CryptoChad',
    avatar: null,
    level: 22,
    title: 'Veteran',
    pnlPercent: opponentPnL.percent,
    pnlDollar: opponentPnL.dollar,
    positions: [],
    isCurrentUser: false,
  };

  // Order handling
  const currentPrice = prices[selectedAsset] || 0;
  const marginValue = parseFloat(margin) || 0;
  const positionSize = marginValue * leverage;
  const availableBalance = player1.account.balance;
  const hasExistingPosition = player1.account.positions.some(p => p.asset === selectedAsset);
  const isValid = marginValue >= 10 && marginValue <= availableBalance && !hasExistingPosition;

  const handleOpenPosition = (side: PositionSide) => {
    if (!isValid) return;
    const price = prices[selectedAsset] || 0;
    const liquidationDistance = price / leverage;
    const liquidationPrice = side === 'long' ? price - liquidationDistance : price + liquidationDistance;

    const newPosition: PerpPosition = {
      id: `pos-${Date.now()}`,
      asset: selectedAsset,
      side,
      leverage,
      size: positionSize,
      entryPrice: price,
      currentPrice: price,
      liquidationPrice,
      liquidationDistance: 100 / leverage, // Starts at max distance based on leverage
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      openedAt: Date.now(),
    };

    setPlayer1(prev => ({
      ...prev,
      account: {
        ...prev.account,
        balance: prev.account.balance - (positionSize / leverage),
        positions: [...prev.account.positions, newPosition],
      },
      trades: [
        { id: `t-${Date.now()}`, timestamp: Date.now(), asset: selectedAsset, side, leverage, size: positionSize, entryPrice: price, type: 'open' as const },
        ...prev.trades,
      ],
    }));
    setMargin('100');
  };

  const handleClosePosition = (positionId: string) => {
    setPlayer1(prev => {
      const position = prev.account.positions.find(p => p.id === positionId);
      if (!position) return prev;
      return {
        ...prev,
        account: {
          ...prev.account,
          balance: prev.account.balance + (position.size / position.leverage) + position.unrealizedPnl,
          positions: prev.account.positions.filter(p => p.id !== positionId),
          closedPnl: prev.account.closedPnl + position.unrealizedPnl,
        },
        trades: [
          { id: `t-${Date.now()}`, timestamp: Date.now(), asset: position.asset, side: position.side, leverage: position.leverage, size: position.size, entryPrice: position.entryPrice, exitPrice: position.currentPrice, pnl: position.unrealizedPnl, type: 'close' as const },
          ...prev.trades,
        ],
      };
    });
  };

  const handleQuickSize = (percent: number) => {
    const amount = Math.floor((availableBalance * percent) / 100);
    setMargin(amount.toString());
  };

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-warning border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading Demo Battle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-96px)] flex flex-col overflow-hidden animate-fadeIn">
      {/* Demo Banner */}
      <div className="bg-purple-500/20 border-b border-purple-500/30 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded">DEMO</span>
          <span className="text-sm text-purple-300">Preview of the new 1v1 Battle UI - no real funds</span>
          {Object.keys(prices).length > 0 ? (
            <span className="flex items-center gap-1 text-xs text-success">
              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              Live Prices
            </span>
          ) : (
            <span className="text-xs text-white/40">Connecting...</span>
          )}
        </div>
        <button
          onClick={() => router.push('/battle')}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Exit Demo
        </button>
      </div>

      {/* Battle Header - Fighter cards + timer + prize */}
      <BattleHeader
        userFighter={userFighter}
        opponentFighter={opponentFighter}
        timeRemaining={timeRemaining}
        phase={getBattlePhase()}
        prizePool={battle.prizePool}
        spectatorCount={battle.spectatorCount}
        isSoloPractice={false}
      />

      {/* P&L Comparison Bar - The HERO */}
      <PnLComparisonBar
        userPnL={userPnL.percent}
        opponentPnL={opponentPnL.percent}
        userPnLDollar={userPnL.dollar}
        opponentPnLDollar={opponentPnL.dollar}
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
                <div className="font-mono font-bold">${(availableBalance + positionsWithLivePnL.reduce((s, p) => s + p.size / p.leverage + p.unrealizedPnl, 0)).toFixed(0)}</div>
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

            {/* Opponent Activity Feed */}
            <OpponentActivityFeed
              activity={opponentActivity}
              opponentName={opponentFighter.username}
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

      {/* Bottom Panel */}
      <div className="h-[120px] md:h-[160px] flex-shrink-0 border-t border-white/10 bg-black/40 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex">
            <button className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium border-b-2 border-warning text-warning">
              Positions ({positionsWithLivePnL.length})
            </button>
          </div>
          <div className="pr-3">
            <ForfeitButton onForfeit={() => router.push('/battle')} entryFee={0.5} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <PositionsTable positions={positionsWithLivePnL} onClosePosition={handleClosePosition} />
        </div>
      </div>
    </div>
  );
}
