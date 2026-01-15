'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';
import { PredictionRound, PredictionSide, QuickBetAmount, FreeBetBalance, PredictionBet, FreeBetPosition } from '@/types';
import { RealtimeChart } from '@/components/RealtimeChart';
import { PageLoading } from '@/components/ui/skeleton';
import { useWinShare } from '@/hooks/useWinShare';
import { WinShareModal } from '@/components/WinShareModal';
import { useSessionBetting } from '@/hooks/useSessionBetting';

// Mobile panel tab type
type MobilePanel = 'none' | 'wagers' | 'history';

// Live wager display type (combines socket data with profile info)
interface LiveBetDisplay {
  id: string;
  bettor: string;
  username?: string;
  level?: number;
  side: PredictionSide;
  amount: number;
  placedAt: number;
}

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

// Hook to detect if screen is large enough for sidebars (lg breakpoint = 1024px)
function useIsLargeScreen(): boolean {
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsLarge(window.innerWidth >= 1024);
    };

    // Check on mount
    checkSize();

    // Listen for resize
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return isLarge;
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

// SOL wager amounts (in SOL, not USD)
const BET_AMOUNTS_SOL = [0.01, 0.05, 0.1, 0.25, 0.5] as const;
type BetAmountSol = typeof BET_AMOUNTS_SOL[number];

// Free wager is always the minimum amount
const FREE_BET_AMOUNT_SOL = 0.01;


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

  // Track if user has placed a wager this round (for pre/post-wager UI states)
  const [hasBetThisRound, setHasWagerThisRound] = useState(false);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

  // Live wagers from socket stream
  const [liveBets, setLiveBets] = useState<LiveBetDisplay[]>([]);


  // Animation tick for smooth progress border (updates every 50ms)
  const [, setAnimationTick] = useState(0);

  // Motion preferences
  const prefersReducedMotion = usePrefersReducedMotion();

  // Screen size for sidebar visibility
  const isLargeScreen = useIsLargeScreen();

  // Animated price display (respects reduced motion)
  const animatedPrice = useAnimatedPrice(
    currentPrice,
    PRICE_INTERPOLATION_MS,
    !prefersReducedMotion
  );

  // Free wager state
  const [freeBetBalance, setFreeBetBalance] = useState<FreeBetBalance | null>(null);
  const [useFreeBet, setUseFreeWager] = useState(false);
  const [freeBetPositions, setFreeBetPositions] = useState<FreeBetPosition[]>([]);
  const [isPlacingFreeBet, setIsPlacingFreeWager] = useState(false);
  const [freeBetError, setFreeBetError] = useState<string | null>(null);

  // Mobile panel state
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('none');

  // Win share modal hook
  const {
    pendingWin,
    showWinShare,
    trackShare,
    hasSharedOn,
    dismissWin,
    referralCode,
  } = useWinShare();

  // Session betting hook for balance management
  const {
    balanceInSol,
    deposit,
    fetchBalance,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useSessionBetting();

  // Show deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.5');

  const asset = 'SOL';

  // Fetch free wager balance
  const fetchFreeBetBalance = useCallback(async () => {
    if (!publicKey) {
      setFreeBetBalance(null);
      return;
    }
    try {
      const walletAddress = publicKey.toBase58();
      const res = await fetch(`${BACKEND_URL}/api/progression/${walletAddress}/free-bets`, {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      if (res.ok) {
        const balance = await res.json();
        setFreeBetBalance(balance);
      }
    } catch {
      // Failed to fetch free wager balance
    }
  }, [publicKey]);

  // Fetch free wager positions
  const fetchFreeBetPositions = useCallback(async () => {
    if (!publicKey) {
      setFreeBetPositions([]);
      return;
    }
    try {
      const walletAddress = publicKey.toBase58();
      const res = await fetch(`${BACKEND_URL}/api/prediction/${walletAddress}/free-bet-positions`, {
        headers: { 'X-Wallet-Address': walletAddress },
      });
      if (res.ok) {
        const positions = await res.json();
        setFreeBetPositions(positions);
      }
    } catch {
      // Failed to fetch free wager positions
    }
  }, [publicKey]);


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
      // Reset wager state when a new round starts
      if (round.id !== currentRoundId) {
        setCurrentRoundId(round.id);
        setHasWagerThisRound(false);
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

    // Listen for real-time bets from other users
    socket.on('prediction_bet_placed', (bet: PredictionBet) => {
      const newBet: LiveBetDisplay = {
        id: bet.id,
        bettor: bet.bettor,
        side: bet.side,
        amount: bet.amount,
        placedAt: bet.placedAt,
      };
      setLiveBets(prev => [newBet, ...prev].slice(0, 10)); // Keep last 10 bets
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
      socket.off('prediction_bet_placed');
      socket.off('error');
    };
  }, [asset, fetchData]);

  // Fetch free wager balance and positions when wallet connects
  useEffect(() => {
    fetchFreeBetBalance();
    fetchFreeBetPositions();
  }, [fetchFreeBetBalance, fetchFreeBetPositions]);

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

  const handlePlaceWager = async (side: PredictionSide) => {
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

    // Handle free wager usage via escrow API (always uses minimum wager amount)
    if (useFreeBet && freeBetBalance && freeBetBalance.balance > 0) {
      setIsPlacingFreeWager(true);
      setFreeBetError(null);

      try {
        const walletAddress = publicKey.toBase58();
        const res = await fetch(`${BACKEND_URL}/api/prediction/free-bet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Wallet-Address': walletAddress,
          },
          body: JSON.stringify({
            walletAddress,
            roundId: parseInt(currentRound.id) || 1, // Use numeric round ID
            side: side === 'long' ? 'long' : 'short',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSuccessTx('free_bet');
          setHasWagerThisRound(true);
          setTimeout(() => setSuccessTx(null), 3000);
          // Refresh free wager balance and positions
          fetchFreeBetBalance();
          fetchFreeBetPositions();
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Failed to place free wager' }));
          setFreeBetError(errorData.error || 'Failed to place free wager');
          setError(errorData.error || 'Failed to place free wager');
        }
      } catch (err) {
        setFreeBetError('Network error placing free wager');
        setError('Network error placing free wager');
      } finally {
        setIsPlacingFreeWager(false);
        setIsPlacing(false);
      }
      return;
    }

    // Check session balance before placing bet
    if (balanceInSol < selectedAmountSol) {
      setError(`Insufficient balance. Need ${selectedAmountSol} SOL, have ${balanceInSol.toFixed(4)} SOL`);
      setShowDepositModal(true);
      setIsPlacing(false);
      return;
    }

    // Place bet via backend (uses PDA balance)
    try {
      const walletAddress = publicKey.toBase58();
      const socket = getSocket();

      // Emit bet via socket
      socket.emit('place_prediction_bet', {
        asset,
        side,
        amount: selectedAmountSol,
        bettor: walletAddress,
      });

      // Wait for response
      const response = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Bet placement timed out' });
        }, 10000);

        socket.once('prediction_bet_result', (result: { success: boolean; error?: string }) => {
          clearTimeout(timeout);
          resolve(result);
        });

        socket.once('error', (error: string) => {
          clearTimeout(timeout);
          resolve({ success: false, error });
        });
      });

      if (response.success) {
        setSuccessTx('bet_placed');
        setHasWagerThisRound(true);
        setTimeout(() => setSuccessTx(null), 5000);
        // Refresh balance after bet
        fetchBalance();
      } else {
        setError(response.error || 'Failed to place bet');
      }
    } catch (err) {
      setError('Network error placing bet');
    } finally {
      setIsPlacing(false);
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    try {
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Invalid deposit amount');
        return;
      }
      await deposit(amount);
      setShowDepositModal(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to deposit');
    }
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
    <div className="h-screen flex flex-col px-3 sm:px-4 lg:px-6 py-2 overflow-hidden safe-area-inset">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
          <div className={`text-center ${prefersReducedMotion ? '' : 'winner-announcement'} ${lastWinner === 'long' ? 'winner-long' : 'winner-short'}`}>
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-4">
              {lastWinner === 'long' ? (
                <svg className={`w-10 h-10 sm:w-16 sm:h-16 md:w-24 md:h-24 text-success ${prefersReducedMotion ? '' : 'oracle-winner-flash-long'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className={`w-10 h-10 sm:w-16 sm:h-16 md:w-24 md:h-24 text-danger ${prefersReducedMotion ? '' : 'oracle-winner-flash-short'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-2xl sm:text-5xl md:text-7xl font-black tracking-tight ${lastWinner === 'long' ? 'text-success' : 'text-danger'} ${prefersReducedMotion ? '' : (lastWinner === 'long' ? 'oracle-winner-flash-long' : 'oracle-winner-flash-short')}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                {lastWinner === 'long' ? 'LONGS SURVIVE' : 'SHORTS SURVIVE'}
              </span>
            </div>
            <div className={`text-xl sm:text-2xl md:text-4xl font-mono font-bold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </div>
          </div>
        </div>
      )}

      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-lg sm:text-2xl font-black tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>
            <span className="text-white/80">THE</span> <span className="text-warning">ORACLE</span>
          </h1>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Desktop: Streak display | Mobile: Panel toggle buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile panel toggle buttons - 44px touch targets */}
          <div className="flex lg:hidden gap-1">
            <button
              onClick={() => setMobilePanel(mobilePanel === 'wagers' ? 'none' : 'wagers')}
              className={`min-h-[44px] min-w-[44px] p-2 rounded-lg transition-all touch-manipulation active:scale-95 ${
                mobilePanel === 'wagers'
                  ? 'bg-warning/20 border border-warning/50 text-warning'
                  : 'bg-white/5 border border-white/10 text-white/60'
              }`}
              aria-label="Toggle live wagers panel"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <button
              onClick={() => setMobilePanel(mobilePanel === 'history' ? 'none' : 'history')}
              className={`min-h-[44px] min-w-[44px] p-2 rounded-lg transition-all touch-manipulation active:scale-95 ${
                mobilePanel === 'history'
                  ? 'bg-warning/20 border border-warning/50 text-warning'
                  : 'bg-white/5 border border-white/10 text-white/60'
              }`}
              aria-label="Toggle history panel"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* Streak - visible on all screens */}
          {streakInfo.streak >= 2 && (
            <div className={`flex items-center gap-1 text-xs sm:text-sm font-bold ${streakInfo.side === 'long' ? 'text-success' : 'text-danger'}`}>
              <span className="hidden sm:inline">{streakInfo.streak}× {streakInfo.side === 'long' ? 'LONG' : 'SHORT'} streak</span>
              <span className="sm:hidden">{streakInfo.streak}×</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Panel - Slides in from top */}
      {mobilePanel !== 'none' && (
        <div className="lg:hidden mb-2 flex-shrink-0 animate-slideUp">
          <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-3 max-h-[200px] overflow-y-auto mobile-scroll hide-scrollbar-mobile">
            {mobilePanel === 'wagers' ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Live Wagers</span>
                  <button
                    onClick={() => setMobilePanel('none')}
                    className="min-h-[32px] min-w-[32px] p-1 text-white/40 hover:text-white touch-manipulation"
                    aria-label="Close panel"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1">
                  {liveBets.length > 0 ? (
                    liveBets.slice(0, 5).map((bet) => (
                      <div key={bet.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5">
                        <span className="text-white/60 font-mono text-xs">
                          {bet.bettor?.slice(0, 4)}...{bet.bettor?.slice(-4)}
                        </span>
                        <span className={`font-bold text-xs ${bet.side === 'long' ? 'text-success' : 'text-danger'}`}>
                          {bet.side === 'long' ? '+' : '-'}{(bet.amount / (currentPrice || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-white/20 text-xs text-center py-4">No wagers yet this round</div>
                  )}
                </div>
                {/* Pool Summary - Mobile */}
                <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <div className="text-success font-bold text-sm">
                      {currentRound ? (currentRound.longPool / (currentPrice || 1)).toFixed(2) : '0.00'}
                    </div>
                    <div className="text-[9px] text-white/30 uppercase">Long</div>
                  </div>
                  <div>
                    <div className="text-danger font-bold text-sm">
                      {currentRound ? (currentRound.shortPool / (currentPrice || 1)).toFixed(2) : '0.00'}
                    </div>
                    <div className="text-[9px] text-white/30 uppercase">Short</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-medium">History</span>
                  <button
                    onClick={() => setMobilePanel('none')}
                    className="min-h-[32px] min-w-[32px] p-1 text-white/40 hover:text-white touch-manipulation"
                    aria-label="Close panel"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {recentRounds.slice(0, 10).map((round) => {
                    const isLong = round.winner === 'long';
                    const isShort = round.winner === 'short';
                    return (
                      <div
                        key={round.id}
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          isLong ? 'bg-success/20 text-success' : isShort ? 'bg-danger/20 text-danger' : 'bg-white/10 text-white/30'
                        }`}
                      >
                        {isLong ? 'L' : isShort ? 'S' : 'P'}
                      </div>
                    );
                  })}
                  {recentRounds.length === 0 && (
                    <div className="text-white/20 text-xs py-2">No rounds yet</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3-Column Layout: Left Sidebar | Main | Right Sidebar - fills remaining height */}
      <div className="flex gap-2 sm:gap-4 flex-1 min-h-0">

        {/* LEFT SIDEBAR - Live Wagers (fixed width) - only render on large screens */}
        {isLargeScreen && (
          <aside className="w-72 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="bg-black/40 backdrop-blur border border-white/5 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-medium">Live Wagers</div>

              <div className="flex-1 overflow-y-auto space-y-1">
              {/* Real-time wagers from socket stream */}
              {liveBets.length > 0 ? (
                liveBets.map((bet) => (
                  <div key={bet.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors animate-fadeIn">
                    <div className="w-1 h-8 rounded-full bg-white/20" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 font-mono text-sm">
                          {bet.bettor?.slice(0, 4)}...{bet.bettor?.slice(-4)}
                        </span>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${bet.side === 'long' ? 'text-success' : 'text-danger'}`}>
                      {bet.side === 'long' ? '+' : '-'}{(bet.amount / (currentPrice || 1)).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                // Show wagers from current round if no live wagers yet
                <>
                  {currentRound?.longBets?.map((bet, idx) => (
                    <div key={bet.id || `long-${idx}`} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="w-1 h-8 rounded-full bg-white/20" />
                      <div className="flex-1 min-w-0">
                        <span className="text-white/60 font-mono text-sm">{bet.bettor?.slice(0, 4)}...{bet.bettor?.slice(-4)}</span>
                      </div>
                      <span className="font-bold text-success text-sm">+{(bet.amount / (currentPrice || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  {currentRound?.shortBets?.map((bet, idx) => (
                    <div key={bet.id || `short-${idx}`} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="w-1 h-8 rounded-full bg-white/20" />
                      <div className="flex-1 min-w-0">
                        <span className="text-white/60 font-mono text-sm">{bet.bettor?.slice(0, 4)}...{bet.bettor?.slice(-4)}</span>
                      </div>
                      <span className="font-bold text-danger text-sm">-{(bet.amount / (currentPrice || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  {(!currentRound?.longBets?.length && !currentRound?.shortBets?.length) && (
                    <div className="text-white/20 text-xs text-center py-8">No wagers yet this round</div>
                  )}
                </>
              )}
            </div>

            {/* Pool Summary - show real pool data */}
            <div className="mt-auto pt-3 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-success font-bold text-lg">
                    {currentRound ? (currentRound.longPool / (currentPrice || 1)).toFixed(2) : '0.00'}
                  </div>
                  <div className="text-[9px] text-white/30 uppercase">Long Pool</div>
                </div>
                <div>
                  <div className="text-danger font-bold text-lg">
                    {currentRound ? (currentRound.shortPool / (currentPrice || 1)).toFixed(2) : '0.00'}
                  </div>
                  <div className="text-[9px] text-white/30 uppercase">Short Pool</div>
                </div>
              </div>
              </div>
            </div>
          </aside>
        )}

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

          {/* Wagerting Section - 50% */}
          <div className="flex-1 flex flex-col min-h-0 gap-2" style={{ flexBasis: '50%' }}>
            {/* Wagerting Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-1 min-h-0">
            {/* Long Button - min height 120px for mobile tap target */}
            <button
              onClick={() => handlePlaceWager('long')}
              disabled={!isBettingOpen || isPlacing || isPlacingFreeBet || !publicKey}
              className={`group relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-150 min-h-[120px] touch-manipulation ${
                isBettingOpen
                  ? 'bg-gradient-to-b from-success/20 to-success/5 border-2 border-success/50 shadow-[0_0_60px_rgba(34,197,94,0.4)] hover:shadow-[0_0_80px_rgba(34,197,94,0.6)] hover:border-success cursor-pointer active:scale-[0.98] active:bg-success/20'
                  : 'bg-white/5 border-2 border-white/10 cursor-not-allowed'
              }`}
            >
              <div className="absolute inset-0 bg-success/0 group-active:bg-success/20 transition-colors" />
              <div className={`relative flex flex-col items-center gap-1 sm:gap-2 ${isLocked ? 'opacity-20' : ''}`}>
                <div className={`text-3xl sm:text-4xl md:text-6xl font-black ${isBettingOpen ? 'text-success' : 'text-white/30'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                  LONG
                </div>
                <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${isBettingOpen ? 'text-success' : 'text-white/30'}`}>
                  {getOdds('long')}×
                </div>
                <div className={`text-xs sm:text-sm ${isBettingOpen ? 'text-white/60' : 'text-white/20'}`}>
                  Win {getPotentialWin('long').toFixed(2)} SOL
                </div>
              </div>
              {/* Lock overlay */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-warning font-bold text-xs sm:text-sm uppercase tracking-wider">Locked</span>
                  </div>
                </div>
              )}
            </button>

            {/* Short Button - min height 120px for mobile tap target */}
            <button
              onClick={() => handlePlaceWager('short')}
              disabled={!isBettingOpen || isPlacing || isPlacingFreeBet || !publicKey}
              className={`group relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-150 min-h-[120px] touch-manipulation ${
                isBettingOpen
                  ? 'bg-gradient-to-b from-danger/20 to-danger/5 border-2 border-danger/50 shadow-[0_0_60px_rgba(239,68,68,0.4)] hover:shadow-[0_0_80px_rgba(239,68,68,0.6)] hover:border-danger cursor-pointer active:scale-[0.98] active:bg-danger/20'
                  : 'bg-white/5 border-2 border-white/10 cursor-not-allowed'
              }`}
            >
              <div className="absolute inset-0 bg-danger/0 group-active:bg-danger/20 transition-colors" />
              <div className={`relative flex flex-col items-center gap-1 sm:gap-2 ${isLocked ? 'opacity-20' : ''}`}>
                <div className={`text-3xl sm:text-4xl md:text-6xl font-black ${isBettingOpen ? 'text-danger' : 'text-white/30'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                  SHORT
                </div>
                <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${isBettingOpen ? 'text-danger' : 'text-white/30'}`}>
                  {getOdds('short')}×
                </div>
                <div className={`text-xs sm:text-sm ${isBettingOpen ? 'text-white/60' : 'text-white/20'}`}>
                  Win {getPotentialWin('short').toFixed(2)} SOL
                </div>
              </div>
              {/* Lock overlay */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-warning font-bold text-xs sm:text-sm uppercase tracking-wider">Locked</span>
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Wager Selector - scrollable on mobile */}
          <div className="flex-shrink-0 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
            <span className="text-white/30 text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap flex-shrink-0">Wager:</span>
            {/* Show amount buttons only when NOT using free wager */}
            {!useFreeBet && BET_AMOUNTS_SOL.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmountSol(amount)}
                className={`min-h-[44px] min-w-[44px] py-2 px-3 sm:py-1.5 sm:px-3 rounded-lg text-sm font-bold transition-all touch-manipulation flex-shrink-0 active:scale-95 ${
                  selectedAmountSol === amount
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/60 active:bg-white/15'
                }`}
              >
                {amount}
              </button>
            ))}
            {/* Show locked 0.01 SOL when using free wager */}
            {useFreeBet && (
              <div className="min-h-[44px] py-2 px-3 sm:py-1.5 sm:px-3 rounded-lg text-sm font-bold bg-warning/20 text-warning border border-warning/40 flex items-center gap-1.5">
                <span>0.01</span>
                <span className="text-[10px] text-warning/60">(fixed)</span>
              </div>
            )}
            {/* FREE button - toggle */}
            {publicKey && freeBetBalance && freeBetBalance.balance > 0 && (
              <button
                onClick={() => setUseFreeWager(!useFreeBet)}
                className={`min-h-[44px] min-w-[44px] py-2 px-3 sm:py-1.5 sm:px-3 rounded-lg text-sm font-bold transition-all touch-manipulation flex-shrink-0 active:scale-95 ${
                  useFreeBet
                    ? 'bg-warning/30 text-warning border border-warning/50'
                    : 'bg-warning/10 text-warning/60 border border-transparent hover:bg-warning/20 active:bg-warning/25'
                }`}
              >
                {useFreeBet ? `FREE (${freeBetBalance.balance})` : 'FREE'}
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
                <span>{successTx === 'free_bet' ? 'Free wager placed!' : 'Wager placed!'}</span>
              </div>
            </div>
          )}

          {/* Balance Display */}
          {publicKey && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs uppercase">Balance:</span>
                <span className="text-white font-bold">{balanceInSol.toFixed(4)} SOL</span>
              </div>
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-3 py-1 rounded-lg bg-warning/20 text-warning text-xs font-bold hover:bg-warning/30 transition-colors touch-manipulation"
              >
                Deposit
              </button>
            </div>
          )}

          {/* Pending Free Wager Positions */}
          {freeBetPositions.length > 0 && (
            <div className="flex-shrink-0 space-y-1">
              <div className="text-[10px] text-warning/60 uppercase tracking-wider font-medium">Free Wager Positions</div>
              {freeBetPositions.filter(p => p.status === 'pending' || p.status === 'won').map((position) => (
                <div
                  key={position.id}
                  className={`p-2 rounded-lg border ${
                    position.status === 'won'
                      ? 'bg-accent/10 border-accent/30'
                      : position.side === 'long'
                        ? 'bg-warning/10 border-warning/30'
                        : 'bg-warning/10 border-warning/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-warning bg-warning/20 px-1.5 py-0.5 rounded uppercase font-bold">Free</span>
                      <span className={`text-sm font-bold ${
                        position.side === 'long' ? 'text-success' : 'text-danger'
                      }`}>
                        {position.side === 'long' ? 'LONG' : 'SHORT'}
                      </span>
                      <span className="text-xs text-white/40">
                        {(position.amountLamports / 1e9).toFixed(3)} SOL
                      </span>
                    </div>
                    <div className={`text-xs font-medium ${
                      position.status === 'won' ? 'text-accent' : 'text-warning/60'
                    }`}>
                      {position.status === 'won' ? 'Won!' : position.status === 'pending' ? 'Pending' : position.status}
                    </div>
                  </div>
                  {position.status === 'won' && position.payoutLamports && (
                    <div className="text-xs text-accent mt-1">
                      Payout: {(position.payoutLamports / 1e9).toFixed(4)} SOL
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-center text-sm font-medium animate-shake">
              {error}
            </div>
          )}
          </div>
        </div>

        {/* RIGHT SIDEBAR - History (fixed width) - only render on large screens */}
        {isLargeScreen && (
          <aside className="w-64 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="bg-black/40 backdrop-blur border border-white/5 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-medium">History</div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {recentRounds.slice(0, 15).map((round) => {
                  const change = round.endPrice && round.startPrice
                    ? ((round.endPrice - round.startPrice) / round.startPrice * 100)
                    : 0;
                  const isLongWinner = round.winner === 'long';
                  const isShortWinner = round.winner === 'short';

                  return (
                    <div
                      key={round.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isLongWinner ? 'bg-success/10' : isShortWinner ? 'bg-danger/10' : 'bg-white/5'
                      }`}
                    >
                      <span className={`font-bold text-sm ${isLongWinner ? 'text-success' : isShortWinner ? 'text-danger' : 'text-white/30'}`}>
                        {isLongWinner ? 'LONG' : isShortWinner ? 'SHORT' : 'PUSH'}
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
          </aside>
        )}
      </div>

      {/* Win Share Modal */}
      <WinShareModal
        winData={pendingWin}
        onClose={dismissWin}
        onTrackShare={trackShare}
        hasSharedOn={hasSharedOn}
        referralCode={referralCode}
      />

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Deposit SOL</h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-white/60 text-sm mb-4">
              Deposit SOL to your game balance. Winnings are automatically credited to this balance.
            </p>

            <div className="mb-4">
              <label className="text-white/40 text-xs uppercase mb-1 block">Amount (SOL)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="0.01"
                step="0.1"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:border-warning/50 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 mb-4">
              {['0.1', '0.5', '1', '2'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                    depositAmount === amount
                      ? 'bg-warning/20 text-warning border border-warning/50'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            <button
              onClick={handleDeposit}
              disabled={isSessionLoading}
              className="w-full py-3 rounded-xl bg-warning text-black font-bold hover:bg-warning/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSessionLoading ? 'Depositing...' : 'Deposit'}
            </button>

            {sessionError && (
              <p className="text-danger text-sm mt-2 text-center">{sessionError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
