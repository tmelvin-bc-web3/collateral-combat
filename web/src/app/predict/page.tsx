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

  // Animation tick for smooth progress border (updates every 50ms)
  const [, setAnimationTick] = useState(0);

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

  // Smooth animation tick for progress border (50ms updates)
  useEffect(() => {
    if (!currentRound || (currentRound.status !== 'betting' && currentRound.status !== 'locked')) {
      return;
    }
    const animationInterval = setInterval(() => {
      setAnimationTick(t => t + 1);
    }, 50);
    return () => clearInterval(animationInterval);
  }, [currentRound?.status]);

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

  const getBaseOdds = (side: PredictionSide): number => {
    if (!currentRound) return 2.00;
    const myPool = side === 'long' ? currentRound.longPool : currentRound.shortPool;
    const theirPool = side === 'long' ? currentRound.shortPool : currentRound.longPool;
    if (myPool === 0) return 2.00;
    if (theirPool === 0) return 1.00;
    return 1 + (theirPool * 0.95) / myPool;
  };

  const getEarlyBirdMultiplier = (): number => {
    if (!currentRound || currentRound.status !== 'betting') return 1;
    const now = Date.now();
    const timeIntoRound = now - currentRound.startTime;
    const bettingDuration = currentRound.lockTime - currentRound.startTime;
    const timeRatio = Math.min(1, Math.max(0, timeIntoRound / bettingDuration));
    return 1 + (0.20 * (1 - timeRatio)); // 1.0 to 1.2
  };

  const getOdds = (side: PredictionSide): string => {
    const baseOdds = getBaseOdds(side);
    const boostedOdds = baseOdds * getEarlyBirdMultiplier();
    return boostedOdds.toFixed(2);
  };

  const getPotentialWin = (side: PredictionSide): number => {
    const boostedOdds = parseFloat(getOdds(side));
    return selectedAmountSol * boostedOdds;
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
    <div className="h-screen flex flex-col px-4 lg:px-6 py-2 overflow-hidden">
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
                <svg className={`w-16 h-16 md:w-24 md:h-24 text-success ${prefersReducedMotion ? '' : 'oracle-winner-flash-long'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className={`w-16 h-16 md:w-24 md:h-24 text-danger ${prefersReducedMotion ? '' : 'oracle-winner-flash-short'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-5xl md:text-7xl font-black tracking-tight ${lastWinner === 'long' ? 'text-success' : 'text-danger'} ${prefersReducedMotion ? '' : (lastWinner === 'long' ? 'oracle-winner-flash-long' : 'oracle-winner-flash-short')}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                {lastWinner === 'long' ? 'LONGS SURVIVE' : 'SHORTS SURVIVE'}
              </span>
            </div>
            <div className={`text-2xl md:text-4xl font-mono font-bold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </div>
          </div>
        </div>
      )}

      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>
            <span className="text-white/80">THE</span> <span className="text-warning">ORACLE</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Streak */}
        {streakInfo.streak >= 2 && (
          <div className={`flex items-center gap-1 text-sm font-bold ${streakInfo.side === 'long' ? 'text-success' : 'text-danger'}`}>
            <span>{streakInfo.streak}× {streakInfo.side === 'long' ? 'LONG' : 'SHORT'} streak</span>
          </div>
        )}
      </div>

      {/* 3-Column Layout: Left Sidebar | Main | Right Sidebar - fills remaining height */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* LEFT SIDEBAR - Live Bets (fixed width) */}
        <div className="hidden lg:flex lg:flex-col w-72 flex-shrink-0 overflow-hidden">
          <div className="bg-black/40 backdrop-blur border border-white/5 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-medium">Live Bets</div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {/* Mock data - clean rows with tier indicator */}
              {/* Gold tier whale - long */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold text-sm">CryptoKing</span>
                    <span className="text-[10px] text-yellow-400/60">Lv.42</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">7xKp...mN4q</div>
                </div>
                <span className="font-bold text-success text-sm">+2.50</span>
              </div>

              {/* Purple tier - long */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-400 to-purple-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-bold text-sm">SolDegen</span>
                    <span className="text-[10px] text-purple-400/60">Lv.28</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">9mNr...xP2k</div>
                </div>
                <span className="font-bold text-success text-sm">+0.50</span>
              </div>

              {/* No tier - short */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-white/20" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 font-mono text-sm">3vBx...k9Lm</span>
                    <span className="text-[10px] text-white/30">Lv.3</span>
                  </div>
                </div>
                <span className="font-bold text-danger text-sm">-1.00</span>
              </div>

              {/* Blue tier - long */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-bold text-sm">moonboy99</span>
                    <span className="text-[10px] text-blue-400/60">Lv.15</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">Dk4j...rT8w</div>
                </div>
                <span className="font-bold text-success text-sm">+0.25</span>
              </div>

              {/* Gold tier whale - short */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold text-sm">WhaleAlert</span>
                    <span className="text-[10px] text-yellow-400/60">Lv.51</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">8pQw...vN3m</div>
                </div>
                <span className="font-bold text-danger text-sm">-5.00</span>
              </div>

              {/* No tier newbie - short */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-white/20" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 font-mono text-sm">2nLm...xP4q</span>
                    <span className="text-[10px] text-white/30">Lv.1</span>
                  </div>
                </div>
                <span className="font-bold text-danger text-sm">-0.10</span>
              </div>

              {/* Purple tier - long */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-400 to-purple-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-bold text-sm">DiamondHands</span>
                    <span className="text-[10px] text-purple-400/60">Lv.33</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">Fy7z...qK9n</div>
                </div>
                <span className="font-bold text-success text-sm">+1.25</span>
              </div>

              {/* Blue tier - short */}
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-bold text-sm">ngmi_andy</span>
                    <span className="text-[10px] text-blue-400/60">Lv.19</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-mono">Ax9k...pL2j</div>
                </div>
                <span className="font-bold text-danger text-sm">-0.75</span>
              </div>

              {/* Real bets would render here with same format */}
              {currentRound?.longBets?.map((bet, idx) => (
                <div key={bet.id || idx} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-1 h-8 rounded-full bg-white/20" />
                  <div className="flex-1 min-w-0">
                    <span className="text-white/60 font-mono text-sm">{bet.bettor?.slice(0, 4)}...{bet.bettor?.slice(-4)}</span>
                  </div>
                  <span className="font-bold text-success text-sm">+{(bet.amount / (currentPrice || 1)).toFixed(2)}</span>
                </div>
              ))}
              {currentRound?.shortBets?.map((bet, idx) => (
                <div key={bet.id || idx} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-1 h-8 rounded-full bg-white/20" />
                  <div className="flex-1 min-w-0">
                    <span className="text-white/60 font-mono text-sm">{bet.bettor?.slice(0, 4)}...{bet.bettor?.slice(-4)}</span>
                  </div>
                  <span className="font-bold text-danger text-sm">-{(bet.amount / (currentPrice || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Pool Summary */}
            <div className="mt-auto pt-3 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-success font-bold text-lg">4.50</div>
                  <div className="text-[9px] text-white/30 uppercase">Long Pool</div>
                </div>
                <div>
                  <div className="text-danger font-bold text-lg">6.85</div>
                  <div className="text-[9px] text-white/30 uppercase">Short Pool</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GAME AREA - takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Chart - 50% with progress border */}
          {(() => {
            // Calculate smooth progress from timestamps (not integer timeRemaining)
            let progress = 0;
            if (currentRound && isBettingOpen) {
              const now = Date.now();
              const elapsed = now - currentRound.startTime;
              const bettingDuration = currentRound.lockTime - currentRound.startTime;
              progress = Math.min(1, Math.max(0, elapsed / bettingDuration));
            } else if (isLocked) {
              progress = 1;
            }

            // Fill from top, going both directions to meet at bottom
            const remainingAngle = (1 - progress) * 180;
            const isUrgent = isBettingOpen && timeRemaining <= 5;
            const isVeryUrgent = isBettingOpen && timeRemaining <= 3;
            const borderColor = isLocked
              ? 'rgba(251, 191, 36, 0.8)'
              : isVeryUrgent
                ? 'rgba(239, 68, 68, 1)'
                : isUrgent
                  ? 'rgba(239, 68, 68, 0.9)'
                  : 'rgba(251, 191, 36, 0.6)';

            // Gradient: starts from top (270deg), fills both sides, gap at bottom shrinks
            const gradientBg = isBettingOpen || isLocked
              ? `conic-gradient(from 270deg, ${borderColor} 0deg ${180 - remainingAngle}deg, rgba(255,255,255,0.1) ${180 - remainingAngle}deg ${180 + remainingAngle}deg, ${borderColor} ${180 + remainingAngle}deg 360deg)`
              : 'rgba(255,255,255,0.05)';

            return (
              <div
                className={`relative rounded-xl flex-1 min-h-0 ${isUrgent ? 'p-[3px]' : 'p-[2px]'}`}
                style={{
                  flexBasis: '50%',
                  background: gradientBg,
                  boxShadow: isVeryUrgent
                    ? '0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4), inset 0 0 30px rgba(239, 68, 68, 0.1)'
                    : isUrgent
                      ? '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2)'
                      : 'none',
                  animation: isVeryUrgent
                    ? 'urgentPulse 0.3s ease-in-out infinite'
                    : isUrgent
                      ? 'urgentPulse 0.5s ease-in-out infinite'
                      : 'none',
                }}
              >
                <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#09090b]">
                  <RealtimeChart
                    symbol={asset}
                    height="100%"
                    lockPrice={currentRound?.startPrice}
                    timeRemaining={timeRemaining}
                    isLocked={isLocked}
                  />
                </div>
              </div>
            );
          })()}

          {/* Betting Section - 50% */}
          <div className="flex-1 flex flex-col min-h-0 gap-2" style={{ flexBasis: '50%' }}>
            {/* Betting Buttons */}
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {/* Long Button */}
            <button
              onClick={() => handlePlaceBet('long')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`group relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-150 ${
                isBettingOpen
                  ? 'bg-gradient-to-b from-success/20 to-success/5 border-2 border-success/50 shadow-[0_0_60px_rgba(34,197,94,0.4)] hover:shadow-[0_0_80px_rgba(34,197,94,0.6)] hover:border-success cursor-pointer active:scale-[0.98]'
                  : 'bg-white/5 border-2 border-white/10 cursor-not-allowed'
              }`}
            >
              <div className="absolute inset-0 bg-success/0 group-active:bg-success/20 transition-colors" />
              <div className={`relative flex flex-col items-center gap-2 ${isLocked ? 'opacity-20' : ''}`}>
                <div className={`text-4xl md:text-6xl font-black ${isBettingOpen ? 'text-success' : 'text-white/30'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                  LONG
                </div>
                <div className={`text-2xl md:text-3xl font-bold ${isBettingOpen ? 'text-success' : 'text-white/30'}`}>
                  {getOdds('long')}×
                </div>
                <div className={`text-sm ${isBettingOpen ? 'text-white/60' : 'text-white/20'}`}>
                  Win {getPotentialWin('long').toFixed(2)} SOL
                </div>
              </div>
              {/* Lock overlay */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 md:w-16 md:h-16 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-warning font-bold text-sm uppercase tracking-wider">Locked</span>
                  </div>
                </div>
              )}
            </button>

            {/* Short Button */}
            <button
              onClick={() => handlePlaceBet('short')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`group relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-150 ${
                isBettingOpen
                  ? 'bg-gradient-to-b from-danger/20 to-danger/5 border-2 border-danger/50 shadow-[0_0_60px_rgba(239,68,68,0.4)] hover:shadow-[0_0_80px_rgba(239,68,68,0.6)] hover:border-danger cursor-pointer active:scale-[0.98]'
                  : 'bg-white/5 border-2 border-white/10 cursor-not-allowed'
              }`}
            >
              <div className="absolute inset-0 bg-danger/0 group-active:bg-danger/20 transition-colors" />
              <div className={`relative flex flex-col items-center gap-2 ${isLocked ? 'opacity-20' : ''}`}>
                <div className={`text-4xl md:text-6xl font-black ${isBettingOpen ? 'text-danger' : 'text-white/30'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                  SHORT
                </div>
                <div className={`text-2xl md:text-3xl font-bold ${isBettingOpen ? 'text-danger' : 'text-white/30'}`}>
                  {getOdds('short')}×
                </div>
                <div className={`text-sm ${isBettingOpen ? 'text-white/60' : 'text-white/20'}`}>
                  Win {getPotentialWin('short').toFixed(2)} SOL
                </div>
              </div>
              {/* Lock overlay */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 md:w-16 md:h-16 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-warning font-bold text-sm uppercase tracking-wider">Locked</span>
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Wager Selector */}
          <div className="flex-shrink-0 flex items-center justify-center gap-2">
            <span className="text-white/30 text-xs uppercase tracking-wider">Wager:</span>
            {BET_AMOUNTS_SOL.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmountSol(amount)}
                className={`py-1.5 px-3 rounded-lg text-sm font-bold transition-all ${
                  selectedAmountSol === amount
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60'
                }`}
              >
                {amount}
              </button>
            ))}
            {publicKey && freeBetBalance && freeBetBalance.balance > 0 && (
              <button
                onClick={() => setUseFreeBet(!useFreeBet)}
                className={`py-1.5 px-3 rounded-lg text-sm font-bold transition-all ${
                  useFreeBet
                    ? 'bg-warning/30 text-warning border border-warning/50'
                    : 'bg-warning/10 text-warning/60 border border-transparent hover:bg-warning/20'
                }`}
              >
                FREE
              </button>
            )}
          </div>

          {/* Success Message - compact */}
          {successTx && (
            <div className={`p-2 rounded-lg text-center text-sm font-medium flex-shrink-0 ${
              successTx === 'free_bet'
                ? 'bg-warning/10 border border-warning/30 text-warning'
                : 'bg-success/10 border border-success/30 text-success'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{successTx === 'free_bet' ? 'Free bet placed!' : 'Bet placed!'}</span>
              </div>
            </div>
          )}

          {/* My Position Display - compact */}
          {USE_ON_CHAIN_BETTING && myPosition && !myPosition.claimed && (
            <div className={`p-2 rounded-lg border flex-shrink-0 ${
              myPosition.side === 'up'
                ? 'bg-success/10 border-success/30'
                : 'bg-danger/10 border-danger/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm font-bold ${
                  myPosition.side === 'up' ? 'text-success' : 'text-danger'
                }`}>
                  {myPosition.side === 'up' ? 'LONG' : 'SHORT'} {myPosition.amount.toFixed(3)} SOL
                </div>
                {canClaim && (
                  <button
                    onClick={handleClaim}
                    disabled={isPlacing}
                    className="px-3 py-1 bg-accent text-white text-sm font-bold rounded-lg hover:opacity-90"
                  >
                    Claim
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-center text-sm font-medium animate-shake">
              {error}
            </div>
          )}
          </div>
        </div>

        {/* RIGHT SIDEBAR - History (fixed width) */}
        <div className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 overflow-hidden">
          <div className="bg-black/40 backdrop-blur border border-white/5 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-medium">History</div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {recentRounds.slice(0, 15).map((round) => {
                const change = round.endPrice && round.startPrice
                  ? ((round.endPrice - round.startPrice) / round.startPrice * 100)
                  : 0;
                const isLong = round.winner === 'long';
                const isShort = round.winner === 'short';

                return (
                  <div
                    key={round.id}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      isLong ? 'bg-success/10' : isShort ? 'bg-danger/10' : 'bg-white/5'
                    }`}
                  >
                    <span className={`font-bold text-sm ${isLong ? 'text-success' : isShort ? 'text-danger' : 'text-white/30'}`}>
                      {isLong ? 'LONG' : isShort ? 'SHORT' : 'PUSH'}
                    </span>
                    <span className={`font-mono text-sm ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </div>
                );
              })}

              {recentRounds.length === 0 && (
                <div className="text-white/20 text-xs text-center py-8">No rounds yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
