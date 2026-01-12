'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { PredictionRound, PredictionSide, QuickBetAmount, FreeBetBalance } from '@/types';
import { RealtimeChart } from '@/components/RealtimeChart';
import { usePrediction } from '@/hooks/usePrediction';
import { PageLoading } from '@/components/ui/skeleton';

// SOL bet amounts (in SOL, not USD)
const BET_AMOUNTS_SOL = [0.01, 0.05, 0.1, 0.25, 0.5] as const;
type BetAmountSol = typeof BET_AMOUNTS_SOL[number];

// Free bet is always the minimum amount
const FREE_BET_AMOUNT_SOL = 0.01;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Feature flag for on-chain betting
const USE_ON_CHAIN_BETTING = process.env.NEXT_PUBLIC_USE_ON_CHAIN === 'true';

export default function PredictPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [mounted, setMounted] = useState(false);
  const [currentRound, setCurrentRound] = useState<PredictionRound | null>(null);
  const [recentRounds, setRecentRounds] = useState<PredictionRound[]>([]);
  const [selectedAmountSol, setSelectedAmountSol] = useState<BetAmountSol>(0.1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTx, setSuccessTx] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastWinner, setLastWinner] = useState<PredictionSide | 'push' | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [priceChange, setPriceChange] = useState(0);

  // Free bet state
  const [freeBetBalance, setFreeBetBalance] = useState<FreeBetBalance | null>(null);
  const [useFreeBet, setUseFreeBet] = useState(false);

  // On-chain prediction hook
  const {
    currentRound: onChainRound,
    myPosition,
    placeBet: placeBetOnChain,
    claimWinnings,
    canClaim,
    isLoading: isOnChainLoading,
    error: onChainError,
    refresh: refreshOnChain,
  } = usePrediction();

  const asset = 'SOL';

  // Fetch free bet balance
  const fetchFreeBetBalance = useCallback(async () => {
    if (!publicKey) {
      setFreeBetBalance(null);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/progression/${publicKey.toBase58()}/free-bets`);
      if (res.ok) {
        const balance = await res.json();
        setFreeBetBalance(balance);
      }
    } catch {
      // Failed to fetch free bet balance
    }
  }, [publicKey]);

  // Use free bet credit via API
  const useFreeBetCredit = async (): Promise<boolean> => {
    if (!publicKey) return false;
    try {
      const res = await fetch(`${BACKEND_URL}/api/progression/${publicKey.toBase58()}/free-bets/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameMode: 'oracle',
          description: `Oracle prediction - ${asset}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFreeBetBalance(data.balance);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [roundRes, historyRes, priceRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/prediction/${asset}/current`),
        fetch(`${BACKEND_URL}/api/prediction/${asset}/recent?limit=10`),
        fetch(`${BACKEND_URL}/api/prices`)
      ]);

      if (roundRes.ok) {
        const round = await roundRes.json();
        if (round) setCurrentRound(round);
      }
      if (historyRes.ok) {
        const history = await historyRes.json();
        setRecentRounds(history);
      }
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        setCurrentPrice(priceData.prices[asset] || 0);
      }
    } catch {
      // Failed to fetch prediction data
    }
  }, [asset]);

  useEffect(() => {
    setMounted(true);
    fetchData();

    const socket = getSocket();
    socket.emit('subscribe_prediction', asset);
    socket.emit('subscribe_prices', [asset]);

    socket.on('prediction_round', (round) => {
      setCurrentRound(round);
    });

    socket.on('prediction_history', (rounds) => {
      setRecentRounds(rounds);
    });

    socket.on('prediction_settled', (round) => {
      setRecentRounds(prev => [round, ...prev.slice(0, 9)]);
      if (round.winner && round.winner !== 'push') {
        setLastWinner(round.winner);
        setPriceChange(round.endPrice && round.startPrice
          ? ((round.endPrice - round.startPrice) / round.startPrice * 100)
          : 0
        );
        setShowWinnerAnimation(true);
        setTimeout(() => setShowWinnerAnimation(false), 3000);
      }
    });

    socket.on('price_update', (prices) => {
      if (prices[asset]) {
        setCurrentPrice(prices[asset]);
      }
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.emit('unsubscribe_prediction', asset);
      socket.off('prediction_round');
      socket.off('prediction_history');
      socket.off('prediction_settled');
      socket.off('price_update');
      socket.off('error');
    };
  }, [asset, fetchData]);

  // Fetch free bet balance when wallet connects
  useEffect(() => {
    fetchFreeBetBalance();
  }, [fetchFreeBetBalance]);

  useEffect(() => {
    if (!currentRound) return;

    const updateTimer = () => {
      const now = Date.now();
      if (currentRound.status === 'betting') {
        const remaining = Math.max(0, Math.floor((currentRound.lockTime - now) / 1000));
        setTimeRemaining(remaining);
      } else if (currentRound.status === 'locked') {
        const remaining = Math.max(0, Math.floor((currentRound.endTime - now) / 1000));
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [currentRound]);

  const handlePlaceBet = async (side: PredictionSide) => {
    if (!publicKey) {
      setError('Connect wallet to play');
      return;
    }

    if (!currentRound || currentRound.status !== 'betting') {
      setError('Wait for next round');
      return;
    }

    setIsPlacing(true);
    setError(null);
    setSuccessTx(null);

    // Handle free bet usage (always uses minimum bet amount)
    if (useFreeBet && freeBetBalance && freeBetBalance.balance > 0) {
      const success = await useFreeBetCredit();
      if (!success) {
        setError('Failed to use free bet');
        setIsPlacing(false);
        return;
      }
      // Place the bet - always uses minimum amount for free bets
      const socket = getSocket();
      const usdAmount = FREE_BET_AMOUNT_SOL * currentPrice;
      socket.emit('place_prediction', asset, side, usdAmount, publicKey.toBase58());
      setSuccessTx('free_bet');
      setTimeout(() => setSuccessTx(null), 3000);
      setIsPlacing(false);
      return;
    }

    if (USE_ON_CHAIN_BETTING) {
      // On-chain betting with real SOL
      const onChainSide = side === 'long' ? 'up' : 'down';
      const tx = await placeBetOnChain(onChainSide, selectedAmountSol);

      if (tx) {
        setSuccessTx(tx);
        setTimeout(() => setSuccessTx(null), 5000);
      } else if (onChainError) {
        setError(onChainError);
      }
      setIsPlacing(false);
    } else {
      // Off-chain betting (legacy mode for testing)
      const socket = getSocket();
      const usdAmount = selectedAmountSol * currentPrice;
      socket.emit('place_prediction', asset, side, usdAmount, publicKey.toBase58());
      setTimeout(() => setIsPlacing(false), 500);
    }
  };

  // Handle claim winnings
  const handleClaim = async () => {
    if (!onChainRound || !canClaim) return;

    setIsPlacing(true);
    setError(null);

    const tx = await claimWinnings(onChainRound.roundId);

    if (tx) {
      setSuccessTx(tx);
      setTimeout(() => setSuccessTx(null), 5000);
    } else if (onChainError) {
      setError(onChainError);
    }

    setIsPlacing(false);
  };

  const getOdds = (side: PredictionSide): string => {
    if (!currentRound) return '2.00';
    const myPool = side === 'long' ? currentRound.longPool : currentRound.shortPool;
    const theirPool = side === 'long' ? currentRound.shortPool : currentRound.longPool;
    if (myPool === 0) return '2.00';
    if (theirPool === 0) return '1.00';
    const odds = 1 + (theirPool * 0.95) / myPool;
    return odds.toFixed(2);
  };

  const getPotentialWin = (side: PredictionSide): number => {
    const odds = parseFloat(getOdds(side));
    return selectedAmountSol * odds;
  };

  // Get display value in SOL or USD
  const getDisplayAmount = (solAmount: number): string => {
    if (USE_ON_CHAIN_BETTING) {
      return `${solAmount.toFixed(3)} SOL`;
    }
    return `$${(solAmount * currentPrice).toFixed(0)}`;
  };

  const getStreak = () => {
    let streak = 0;
    let streakSide: PredictionSide | null = null;
    for (const round of recentRounds) {
      if (!round.winner || round.winner === 'push') break;
      if (!streakSide) {
        streakSide = round.winner;
        streak = 1;
      } else if (round.winner === streakSide) {
        streak++;
      } else {
        break;
      }
    }
    return { streak, side: streakSide };
  };

  const streakInfo = getStreak();

  if (!mounted) {
    return <PageLoading message="Consulting the Oracle..." />;
  }

  const isBettingOpen = currentRound?.status === 'betting';
  const isLocked = currentRound?.status === 'locked';

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn relative">
      {/* Winner Announcement Overlay */}
      {showWinnerAnimation && lastWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`text-center winner-announcement ${lastWinner === 'long' ? 'winner-long' : 'winner-short'}`}>
            <div className="flex items-center justify-center gap-4 mb-4">
              {lastWinner === 'long' ? (
                <svg className="w-16 h-16 md:w-24 md:h-24 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-16 h-16 md:w-24 md:h-24 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-5xl md:text-7xl font-black tracking-tight ${lastWinner === 'long' ? 'text-success' : 'text-danger'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                {lastWinner === 'long' ? 'LONGS SURVIVE' : 'SHORTS SURVIVE'}
              </span>
            </div>
            <div className={`text-2xl md:text-4xl font-mono font-bold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 mt-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black tracking-tight uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
              THE <span className="text-warning">ORACLE</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-danger/20 border border-danger/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
              </span>
              <span className="text-xs font-semibold text-danger uppercase tracking-wider">Live</span>
            </div>
            {USE_ON_CHAIN_BETTING && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">On-Chain</span>
              </div>
            )}
          </div>
          <p className="text-text-secondary">Predict or perish. 30 seconds. No second chances.</p>
        </div>

        {/* Streak Badge */}
        {streakInfo.streak >= 2 && (
          <div className={`px-3 py-2 rounded-lg ${streakInfo.side === 'long' ? 'bg-success/10 border border-success/30' : 'bg-danger/10 border border-danger/30'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold tabular-nums ${streakInfo.side === 'long' ? 'text-success' : 'text-danger'}`}>
                {streakInfo.streak}x
              </span>
              {streakInfo.side === 'long' ? (
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Strip */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Recent</span>
          <div className="flex-1 h-px bg-gradient-to-r from-border-primary to-transparent" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {recentRounds.slice(0, 10).map((round, idx) => {
            const change = round.endPrice && round.startPrice
              ? ((round.endPrice - round.startPrice) / round.startPrice * 100)
              : 0;
            const isLong = round.winner === 'long';
            const isShort = round.winner === 'short';
            return (
              <div
                key={round.id}
                className={`flex-shrink-0 w-10 h-10 rounded-md flex flex-col items-center justify-center ${
                  isLong
                    ? 'bg-success/10 border border-success/30'
                    : isShort
                    ? 'bg-danger/10 border border-danger/30'
                    : 'bg-bg-tertiary border border-border-primary'
                }`}
              >
                {isLong ? (
                  <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : isShort ? (
                  <svg className="w-3 h-3 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                ) : (
                  <div className="w-3 h-3 flex items-center justify-center">
                    <div className="w-1.5 h-0.5 bg-text-tertiary rounded-full" />
                  </div>
                )}
                <span className={`text-[8px] font-mono font-medium ${
                  isLong ? 'text-success' : isShort ? 'text-danger' : 'text-text-tertiary'
                }`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              </div>
            );
          })}
          {recentRounds.length === 0 && (
            <div className="text-text-tertiary text-xs py-1">Waiting for first round...</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-3">
          {/* Timer & Price Display */}
          <div className={`card py-4 px-5 relative overflow-hidden transition-all ${isLocked ? 'ring-2 ring-accent/50' : ''}`}>
            {isLocked && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent animate-shimmer" />
            )}

            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-text-tertiary text-xs font-medium uppercase tracking-wider">SOL/USD</span>
                  {currentRound && (
                    <span className="text-text-tertiary text-xs">
                      from <span className="font-mono text-text-secondary">${currentRound.startPrice.toFixed(2)}</span>
                    </span>
                  )}
                </div>
                <div className="text-4xl font-bold font-mono tracking-tight">${currentPrice.toFixed(2)}</div>
              </div>

              <div className="text-right">
                <div className={`text-xs font-semibold mb-1 uppercase tracking-wider ${
                  isLocked ? 'text-accent' : isBettingOpen ? 'text-success' : 'text-text-tertiary'
                }`}>
                  {isBettingOpen ? 'Place your wager' : isLocked ? 'Locked' : 'Starting...'}
                </div>
                <div className={`text-6xl font-black font-mono tabular-nums leading-none ${
                  timeRemaining <= 5 ? 'text-danger animate-pulse' :
                  timeRemaining <= 10 ? 'text-accent' :
                  'text-text-primary'
                }`}>
                  {timeRemaining}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {currentRound && (
              <div className="mt-3 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 rounded-full ${
                    isLocked ? 'bg-accent' : 'bg-success'
                  }`}
                  style={{ width: `${((30 - timeRemaining) / 30) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="card p-0 overflow-hidden">
            <RealtimeChart
              symbol={asset}
              height={240}
              lockPrice={currentRound?.startPrice}
            />
          </div>

          {/* Betting Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Long Button */}
            <button
              onClick={() => handlePlaceBet('long')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`group relative p-5 rounded-xl border-2 transition-all duration-200 ${
                isBettingOpen
                  ? 'border-success bg-success/5 hover:bg-success/10 hover:border-success hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] cursor-pointer active:scale-[0.98]'
                  : 'border-border-primary bg-bg-secondary cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                  isBettingOpen ? 'bg-success/20 group-hover:bg-success/30' : 'bg-bg-tertiary'
                }`}>
                  <svg className={`w-6 h-6 transition-transform ${isBettingOpen ? 'text-success group-hover:-translate-y-0.5' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className={`text-2xl font-bold ${isBettingOpen ? 'text-success' : 'text-text-tertiary'}`}>LONG</div>
                <div className={`font-mono text-xl font-bold ${isBettingOpen ? 'text-success' : 'text-text-tertiary'}`}>{getOdds('long')}x</div>
                <div className="text-text-secondary text-xs mt-1">
                  Pool: <span className="font-mono font-semibold">${currentRound?.longPool.toFixed(0) || 0}</span>
                </div>
              </div>
            </button>

            {/* Short Button */}
            <button
              onClick={() => handlePlaceBet('short')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`group relative p-5 rounded-xl border-2 transition-all duration-200 ${
                isBettingOpen
                  ? 'border-danger bg-danger/5 hover:bg-danger/10 hover:border-danger hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] cursor-pointer active:scale-[0.98]'
                  : 'border-border-primary bg-bg-secondary cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                  isBettingOpen ? 'bg-danger/20 group-hover:bg-danger/30' : 'bg-bg-tertiary'
                }`}>
                  <svg className={`w-6 h-6 transition-transform ${isBettingOpen ? 'text-danger group-hover:translate-y-0.5' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className={`text-2xl font-bold ${isBettingOpen ? 'text-danger' : 'text-text-tertiary'}`}>SHORT</div>
                <div className={`font-mono text-xl font-bold ${isBettingOpen ? 'text-danger' : 'text-text-tertiary'}`}>{getOdds('short')}x</div>
                <div className="text-text-secondary text-xs mt-1">
                  Pool: <span className="font-mono font-semibold">${currentRound?.shortPool.toFixed(0) || 0}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Success Message */}
          {successTx && (
            <div className={`p-4 rounded-xl text-center font-medium ${
              successTx === 'free_bet'
                ? 'bg-warning/10 border border-warning/30 text-warning'
                : 'bg-success/10 border border-success/30 text-success'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{successTx === 'free_bet' ? 'Free wager placed!' : 'Wager placed on-chain!'}</span>
              </div>
              {successTx === 'free_bet' ? (
                <p className="text-xs mt-1 opacity-80">Good luck! Winnings will be credited if you win.</p>
              ) : (
                <a
                  href={`https://explorer.solana.com/tx/${successTx}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline mt-1 block opacity-80 hover:opacity-100"
                >
                  View transaction
                </a>
              )}
            </div>
          )}

          {/* My Position Display */}
          {USE_ON_CHAIN_BETTING && myPosition && !myPosition.claimed && (
            <div className={`p-4 rounded-xl border ${
              myPosition.side === 'up'
                ? 'bg-success/10 border-success/30'
                : 'bg-danger/10 border-danger/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">Your Position</div>
                  <div className={`text-lg font-bold ${
                    myPosition.side === 'up' ? 'text-success' : 'text-danger'
                  }`}>
                    {myPosition.side === 'up' ? 'LONG' : 'SHORT'} - {myPosition.amount.toFixed(3)} SOL
                  </div>
                </div>
                {canClaim && (
                  <button
                    onClick={handleClaim}
                    disabled={isPlacing}
                    className="px-4 py-2 bg-accent text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isPlacing ? 'Claiming...' : 'Claim Winnings'}
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-center font-medium animate-shake">
              {error}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Bet Amount */}
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-text-secondary">
              Bet Amount {USE_ON_CHAIN_BETTING && <span className="text-accent">(SOL)</span>}
            </h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {BET_AMOUNTS_SOL.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmountSol(amount)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    selectedAmountSol === amount
                      ? 'bg-accent text-white shadow-lg'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Free Bet Balance */}
            {publicKey && freeBetBalance && freeBetBalance.balance > 0 && (
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <span className="text-sm font-semibold text-warning">Free Bets</span>
                  </div>
                  <span className="font-mono font-bold text-warning text-lg">
                    {freeBetBalance.balance}
                  </span>
                </div>
                <button
                  onClick={() => setUseFreeBet(!useFreeBet)}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    useFreeBet
                      ? 'bg-warning text-black'
                      : 'bg-warning/20 text-warning border border-warning/40 hover:bg-warning/30'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    useFreeBet ? 'bg-bg-primary border-bg-primary' : 'border-warning'
                  }`}>
                    {useFreeBet && (
                      <svg className="w-3 h-3 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {useFreeBet ? 'Using Free Bet!' : 'Use Free Bet (0.01 SOL)'}
                </button>
              </div>
            )}

            {/* Potential Winnings */}
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary">
              <div className="text-center text-xs text-text-tertiary mb-3 uppercase tracking-wider">Potential Return</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="text-[10px] text-success/70 mb-1 uppercase">If Long</div>
                  <div className="font-mono text-lg font-bold text-success">
                    {getDisplayAmount(getPotentialWin('long'))}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-danger/5 border border-danger/20">
                  <div className="text-[10px] text-danger/70 mb-1 uppercase">If Short</div>
                  <div className="font-mono text-lg font-bold text-danger">
                    {getDisplayAmount(getPotentialWin('short'))}
                  </div>
                </div>
              </div>
            </div>

            {!publicKey && (
              <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20 text-center">
                <span className="text-accent text-sm font-medium">Connect wallet to play</span>
              </div>
            )}
          </div>

          {/* Round Stats */}
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-text-secondary">This Round</h3>
            {currentRound && (
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-border-primary">
                  <span className="text-text-secondary text-sm">Total Pool</span>
                  <span className="font-mono font-bold text-accent">
                    ${currentRound.totalPool.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-primary">
                  <span className="text-text-secondary text-sm">Long Bets</span>
                  <span className="font-mono font-bold text-success">
                    {currentRound.longBets.length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-text-secondary text-sm">Short Bets</span>
                  <span className="font-mono font-bold text-danger">
                    {currentRound.shortBets.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* How it Works */}
          <div className="card border-warning/20">
            <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-warning">Rules of the Oracle</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center text-xs font-bold text-warning flex-shrink-0 border border-warning/30">1</div>
                <span className="text-text-secondary">Choose your fate: Long or Short</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center text-xs font-bold text-warning flex-shrink-0 border border-warning/30">2</div>
                <span className="text-text-secondary">30 seconds. No turning back.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center text-xs font-bold text-warning flex-shrink-0 border border-warning/30">3</div>
                <span className="text-text-secondary">Survivors claim the loot</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
