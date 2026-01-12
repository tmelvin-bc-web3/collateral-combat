'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { PredictionRound, PredictionSide, QuickBetAmount, FreeBetBalance } from '@/types';
import { RealtimeChart } from '@/components/RealtimeChart';
import { usePrediction } from '@/hooks/usePrediction';
import { PageLoading } from '@/components/ui/skeleton';

// Animation constants
const PRICE_INTERPOLATION_MS = 150; // 120-180ms range
const WINNER_FLASH_MS = 350; // 300-400ms range

// Hook for prefers-reduced-motion
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Hook for smooth price interpolation
function useAnimatedPrice(targetPrice: number, duration: number, enabled: boolean): number {
  const [displayPrice, setDisplayPrice] = useState(targetPrice);
  const animationRef = useRef<number | null>(null);
  const startPriceRef = useRef(targetPrice);
  const startTimeRef = useRef<number | null>(null);
  const prevTargetRef = useRef(targetPrice);

  useEffect(() => {
    // Skip animation if disabled or price is 0 or same as previous
    if (!enabled || targetPrice === 0 || targetPrice === prevTargetRef.current) {
      if (targetPrice !== 0) {
        setDisplayPrice(targetPrice);
        prevTargetRef.current = targetPrice;
      }
      return;
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startPriceRef.current = displayPrice;
    startTimeRef.current = performance.now();
    prevTargetRef.current = targetPrice;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (startTimeRef.current || 0);
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const newPrice = startPriceRef.current + (targetPrice - startPriceRef.current) * eased;

      setDisplayPrice(newPrice);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetPrice, duration, enabled, displayPrice]);

  return displayPrice;
}

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
  const [showRoundEndDim, setShowRoundEndDim] = useState(false);

  // Track if user has placed a bet this round (for pre/post-bet UI states)
  const [hasBetThisRound, setHasBetThisRound] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

  // Motion preferences
  const prefersReducedMotion = usePrefersReducedMotion();

  // Animated price display (respects reduced motion)
  const animatedPrice = useAnimatedPrice(
    currentPrice,
    PRICE_INTERPOLATION_MS,
    !prefersReducedMotion
  );

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
      // Reset bet state when a new round starts
      if (round.id !== currentRoundId) {
        setCurrentRoundId(round.id);
        setHasBetThisRound(false);
      }
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
        // Show dim overlay and winner animation
        setShowRoundEndDim(true);
        setShowWinnerAnimation(true);
        // Hide dim after flash duration, winner text stays longer
        setTimeout(() => setShowRoundEndDim(false), WINNER_FLASH_MS);
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
      setHasBetThisRound(true);
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
        setHasBetThisRound(true);
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
      setHasBetThisRound(true);
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
      {/* Round End Dim Overlay */}
      {showRoundEndDim && (
        <div
          className={`fixed inset-0 z-40 bg-black pointer-events-none ${
            prefersReducedMotion ? '' : 'oracle-round-end-dim'
          }`}
          style={{ opacity: prefersReducedMotion ? 0.5 : undefined }}
        />
      )}

      {/* Winner Announcement Overlay */}
      {showWinnerAnimation && lastWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`text-center ${prefersReducedMotion ? '' : 'winner-announcement'} ${lastWinner === 'long' ? 'winner-long' : 'winner-short'}`}>
            <div className="flex items-center justify-center gap-4 mb-4">
              {lastWinner === 'long' ? (
                <svg
                  className={`w-16 h-16 md:w-24 md:h-24 text-success ${prefersReducedMotion ? '' : 'oracle-winner-flash-long'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg
                  className={`w-16 h-16 md:w-24 md:h-24 text-danger ${prefersReducedMotion ? '' : 'oracle-winner-flash-short'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span
                className={`text-5xl md:text-7xl font-black tracking-tight ${lastWinner === 'long' ? 'text-success' : 'text-danger'} ${
                  prefersReducedMotion ? '' : (lastWinner === 'long' ? 'oracle-winner-flash-long' : 'oracle-winner-flash-short')
                }`}
                style={{ fontFamily: 'Impact, sans-serif' }}
              >
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
      <div className="mb-6 md:mb-8 mt-4 md:mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
              THE <span className="text-warning">ORACLE</span>
            </h1>
            <div className="flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-danger/20 border border-danger/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
              </span>
              <span className="text-[10px] md:text-xs font-semibold text-danger uppercase tracking-wider">Live</span>
            </div>
            {USE_ON_CHAIN_BETTING && (
              <div className="flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-accent/20 border border-accent/40">
                <span className="text-[10px] md:text-xs font-semibold text-accent uppercase tracking-wider">On-Chain</span>
              </div>
            )}
          </div>
          <p className="text-text-secondary text-sm md:text-base">Predict or perish. 30 seconds. No second chances.</p>
        </div>

        {/* Streak Badge */}
        {streakInfo.streak >= 2 && (
          <div className={`self-start sm:self-auto px-3 py-2 rounded-lg ${streakInfo.side === 'long' ? 'bg-success/10 border border-success/30' : 'bg-danger/10 border border-danger/30'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-lg md:text-xl font-bold tabular-nums ${streakInfo.side === 'long' ? 'text-success' : 'text-danger'}`}>
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
            // Progressive fade: newer (left) = full opacity, older (right) = faded
            const opacity = 1 - (idx * 0.08); // Fade from 100% to ~20% over 10 items
            // Add extra spacing every 5 ticks
            const addSpacing = idx > 0 && idx % 5 === 0;
            return (
              <div
                key={round.id}
                className="relative group"
                style={{ marginLeft: addSpacing ? '12px' : undefined }}
              >
                {/* Spacing marker every 5 ticks */}
                {addSpacing && (
                  <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-px h-6 bg-border-primary/50" />
                )}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-md flex flex-col items-center justify-center transition-opacity duration-150 hover:opacity-100 ${
                    isLong
                      ? 'bg-success/10 border border-success/30'
                      : isShort
                      ? 'bg-danger/10 border border-danger/30'
                      : 'bg-bg-tertiary border border-border-primary'
                  }`}
                  style={{ opacity }}
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
                {/* Hover tooltip with % change */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-bg-primary border border-border-primary shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10 whitespace-nowrap">
                  <div className={`text-xs font-mono font-semibold ${
                    isLong ? 'text-success' : isShort ? 'text-danger' : 'text-text-tertiary'
                  }`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(3)}%
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border-primary" />
                </div>
              </div>
            );
          })}
          {recentRounds.length === 0 && (
            <div className="text-text-tertiary text-xs py-1">Waiting for first round...</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-3 oracle-commitment-container">
        {/* Main Game Area - Flow: Chart+Countdown → Buttons → Amount */}
        <div className="lg:col-span-3 space-y-3">
          {/* 1. SEE: Chart - First thing user sees to assess the trend */}
          <div className="card p-0 overflow-hidden oracle-dimmable">
            <div className="hidden md:block">
              <RealtimeChart
                symbol={asset}
                height={240}
                lockPrice={currentRound?.startPrice}
                timeRemaining={timeRemaining}
                isLocked={isLocked}
              />
            </div>
            <div className="block md:hidden">
              <RealtimeChart
                symbol={asset}
                height={180}
                lockPrice={currentRound?.startPrice}
                timeRemaining={timeRemaining}
                isLocked={isLocked}
              />
            </div>
          </div>

          {/* 2. Price Display - Simple price info (countdown is in chart) */}
          <div className={`card py-2 md:py-3 px-4 md:px-5 relative overflow-hidden transition-all oracle-dimmable ${isLocked ? 'ring-2 ring-accent/50' : ''}`}>
            {isLocked && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent animate-shimmer" />
            )}

            <div className="relative flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-text-tertiary text-[10px] md:text-xs font-medium uppercase tracking-wider mb-1">SOL/USD</div>
                <div className="text-2xl md:text-4xl font-bold font-mono tracking-tight">${animatedPrice.toFixed(2)}</div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider ${
                  isLocked ? 'text-accent' : isBettingOpen ? 'text-success' : 'text-text-tertiary'
                }`}>
                  {isBettingOpen ? 'Betting Open' : isLocked ? 'Locked' : 'Starting...'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {currentRound && (
              <div className="mt-2 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 rounded-full ${
                    isLocked ? 'bg-accent' : 'bg-success'
                  }`}
                  style={{ width: `${((30 - timeRemaining) / 30) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* 3. CLICK: Betting Buttons - Strict 3-line format */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {/* Long Button */}
            <button
              onClick={() => handlePlaceBet('long')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`oracle-btn-long group relative py-6 px-4 md:py-10 md:px-6 rounded-2xl border-3 transition-all duration-200 overflow-hidden ${
                isBettingOpen
                  ? 'border-success bg-success/10 hover:bg-success/20 hover:border-success shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:shadow-[0_0_60px_rgba(34,197,94,0.45)] cursor-pointer active:scale-[0.97] active:brightness-125'
                  : 'border-border-primary bg-bg-secondary cursor-not-allowed opacity-40'
              }`}
            >
              {/* Click flash overlay */}
              <div className="absolute inset-0 bg-success/0 group-active:bg-success/30 transition-colors duration-100 pointer-events-none" />
              <div className="relative flex flex-col items-center text-center gap-2 md:gap-3">
                {/* Line 1: Arrow + LONG */}
                <div className={`text-2xl md:text-4xl font-black tracking-tight ${isBettingOpen ? 'text-success' : 'text-text-tertiary'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                  ↑ LONG
                </div>
                {/* Line 2: Bet-to-Win */}
                <div className={`text-sm md:text-lg font-semibold ${isBettingOpen ? 'text-text-primary' : 'text-text-tertiary'}`}>
                  {selectedAmountSol} SOL → Win {getPotentialWin('long').toFixed(2)} SOL
                </div>
                {/* Line 3: Odds */}
                <div className={`text-base md:text-xl font-bold ${isBettingOpen ? 'text-success' : 'text-text-tertiary'}`}>
                  {getOdds('long')}× odds
                </div>
              </div>
            </button>

            {/* Short Button */}
            <button
              onClick={() => handlePlaceBet('short')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`oracle-btn-short group relative py-6 px-4 md:py-10 md:px-6 rounded-2xl border-3 transition-all duration-200 overflow-hidden ${
                isBettingOpen
                  ? 'border-danger bg-danger/10 hover:bg-danger/20 hover:border-danger shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_rgba(239,68,68,0.45)] cursor-pointer active:scale-[0.97] active:brightness-125'
                  : 'border-border-primary bg-bg-secondary cursor-not-allowed opacity-40'
              }`}
            >
              {/* Click flash overlay */}
              <div className="absolute inset-0 bg-danger/0 group-active:bg-danger/30 transition-colors duration-100 pointer-events-none" />
              <div className="relative flex flex-col items-center text-center gap-2 md:gap-3">
                {/* Line 1: Arrow + SHORT */}
                <div className={`text-2xl md:text-4xl font-black tracking-tight ${isBettingOpen ? 'text-danger' : 'text-text-tertiary'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                  ↓ SHORT
                </div>
                {/* Line 2: Bet-to-Win */}
                <div className={`text-sm md:text-lg font-semibold ${isBettingOpen ? 'text-text-primary' : 'text-text-tertiary'}`}>
                  {selectedAmountSol} SOL → Win {getPotentialWin('short').toFixed(2)} SOL
                </div>
                {/* Line 3: Odds */}
                <div className={`text-base md:text-xl font-bold ${isBettingOpen ? 'text-danger' : 'text-text-tertiary'}`}>
                  {getOdds('short')}× odds
                </div>
              </div>
            </button>
          </div>

          {/* 4. AMOUNT: Bet Amount Selector - After buttons (de-emphasized, secondary to direction choice) */}
          <div className="card p-2 md:p-3 opacity-80 border-border-primary/50">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-medium text-[10px] md:text-xs uppercase tracking-wider text-text-tertiary">
                Amount {USE_ON_CHAIN_BETTING && <span className="text-text-secondary">(SOL)</span>}
              </h3>
              {!publicKey && (
                <span className="text-accent/70 text-[10px] md:text-xs">Connect wallet to play</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
              {BET_AMOUNTS_SOL.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmountSol(amount)}
                  className={`py-1 px-2.5 md:py-1.5 md:px-3 rounded-md text-[10px] md:text-xs font-medium transition-all duration-150 ${
                    selectedAmountSol === amount
                      ? 'bg-accent/80 text-white ring-1 ring-accent/50 ring-offset-1 ring-offset-bg-primary'
                      : 'bg-bg-tertiary/70 text-text-tertiary hover:text-text-secondary hover:bg-bg-hover border border-transparent hover:border-border-primary'
                  }`}
                >
                  {amount}
                </button>
              ))}
              {/* MAX Button */}
              <button
                onClick={() => setSelectedAmountSol(BET_AMOUNTS_SOL[BET_AMOUNTS_SOL.length - 1])}
                className={`py-1 px-2.5 md:py-1.5 md:px-3 rounded-md text-[10px] md:text-xs font-semibold transition-all duration-150 ${
                  selectedAmountSol === BET_AMOUNTS_SOL[BET_AMOUNTS_SOL.length - 1]
                    ? 'bg-warning/70 text-black ring-1 ring-warning/50 ring-offset-1 ring-offset-bg-primary'
                    : 'bg-warning/10 text-warning/70 border border-warning/20 hover:bg-warning/20 hover:border-warning/30'
                }`}
              >
                MAX
              </button>

              {/* Free Bet Toggle - inline when available */}
              {publicKey && freeBetBalance && freeBetBalance.balance > 0 && (
                <button
                  onClick={() => setUseFreeBet(!useFreeBet)}
                  className={`py-1 px-2.5 md:py-1.5 md:px-3 rounded-md text-[10px] md:text-xs font-medium transition-all flex items-center gap-1.5 ${
                    useFreeBet
                      ? 'bg-warning/70 text-black ring-1 ring-warning/50 ring-offset-1 ring-offset-bg-primary'
                      : 'bg-warning/10 text-warning/70 border border-warning/20 hover:bg-warning/20'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  FREE ({freeBetBalance.balance})
                </button>
              )}
            </div>
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
                <span>{successTx === 'free_bet' ? 'Free bet placed!' : 'Bet placed on-chain!'}</span>
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

        {/* Sidebar - Post-bet stats only */}
        <div className="space-y-3 oracle-dimmable">
          {/* POST-BET STATE: Full stats revealed */}
          {hasBetThisRound && (
            <div className="space-y-3 animate-fadeIn">
              {/* Bet Confirmation Banner */}
              <div className="card p-3 bg-accent/10 border-accent/30 transition-all duration-300 ease-out">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-accent uppercase tracking-wider">Bet Locked</h3>
                    <p className="text-[9px] text-text-tertiary">Watching the action...</p>
                  </div>
                </div>
              </div>

              {/* Full Round Stats - Now visible */}
              <div className="card p-3 border-accent/20 transition-all duration-300 ease-out">
                <h3 className="font-bold mb-2 text-xs uppercase tracking-wider text-accent flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Live Stats
                </h3>
                {currentRound && (
                  <div className="space-y-2">
                    {/* Total Pool */}
                    <div className="p-2 rounded-lg bg-bg-tertiary border border-border-primary text-center">
                      <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-0.5">Total Pool</div>
                      <div className="font-mono text-base font-bold text-text-primary">
                        ${currentRound.totalPool.toFixed(0)}
                      </div>
                    </div>

                    {/* Long vs Short */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-2 rounded-lg bg-success/5 border border-success/20 text-center">
                        <div className="text-[9px] text-success/70 uppercase tracking-wider">Longs</div>
                        <div className="font-mono text-sm font-bold text-success">{currentRound.longBets.length}</div>
                        <div className="font-mono text-[9px] text-text-tertiary">${currentRound.longPool.toFixed(0)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-danger/5 border border-danger/20 text-center">
                        <div className="text-[9px] text-danger/70 uppercase tracking-wider">Shorts</div>
                        <div className="font-mono text-sm font-bold text-danger">{currentRound.shortBets.length}</div>
                        <div className="font-mono text-[9px] text-text-tertiary">${currentRound.shortPool.toFixed(0)}</div>
                      </div>
                    </div>

                    {/* Pool Ratio Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-text-tertiary">
                        <span>{currentRound.totalPool > 0 ? ((currentRound.longPool / currentRound.totalPool) * 100).toFixed(0) : 50}%</span>
                        <span>{currentRound.totalPool > 0 ? ((currentRound.shortPool / currentRound.totalPool) * 100).toFixed(0) : 50}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden flex">
                        <div
                          className="h-full bg-success transition-all duration-300"
                          style={{ width: `${currentRound.totalPool > 0 ? (currentRound.longPool / currentRound.totalPool) * 100 : 50}%` }}
                        />
                        <div
                          className="h-full bg-danger transition-all duration-300"
                          style={{ width: `${currentRound.totalPool > 0 ? (currentRound.shortPool / currentRound.totalPool) * 100 : 50}%` }}
                        />
                      </div>
                    </div>

                    {/* Live Odds */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <div className="text-center p-1.5 rounded bg-success/5 border border-success/20">
                        <div className="text-[8px] text-success/70 uppercase">Long Odds</div>
                        <div className="font-mono text-xs font-bold text-success">{getOdds('long')}x</div>
                      </div>
                      <div className="text-center p-1.5 rounded bg-danger/5 border border-danger/20">
                        <div className="text-[8px] text-danger/70 uppercase">Short Odds</div>
                        <div className="font-mono text-xs font-bold text-danger">{getOdds('short')}x</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Rules - de-emphasized */}
              <div className="card p-2 opacity-50 border-warning/10">
                <div className="flex items-center gap-1.5 text-[9px] text-text-tertiary">
                  <svg className="w-3 h-3 text-warning/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Final price after 30s determines the winner</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
