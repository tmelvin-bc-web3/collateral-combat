'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { PredictionRound, PredictionSide, QuickBetAmount } from '@/types';
import { RealtimeChart } from '@/components/RealtimeChart';

const BET_AMOUNTS: QuickBetAmount[] = [5, 15, 25, 50, 100];
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function PredictPage() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [currentRound, setCurrentRound] = useState<PredictionRound | null>(null);
  const [recentRounds, setRecentRounds] = useState<PredictionRound[]>([]);
  const [selectedAmount, setSelectedAmount] = useState<QuickBetAmount>(25);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lastWinner, setLastWinner] = useState<PredictionSide | 'push' | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [priceChange, setPriceChange] = useState(0);

  const asset = 'SOL';

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
    } catch (err) {
      console.error('Failed to fetch prediction data:', err);
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

    const socket = getSocket();
    socket.emit('place_prediction', asset, side, selectedAmount, publicKey.toBase58());

    setTimeout(() => setIsPlacing(false), 500);
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
    return selectedAmount * odds;
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 spinner" />
      </div>
    );
  }

  const isBettingOpen = currentRound?.status === 'betting';
  const isLocked = currentRound?.status === 'locked';

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn relative">
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
              <span className={`text-5xl md:text-7xl font-black tracking-tight ${lastWinner === 'long' ? 'text-success' : 'text-danger'}`}>
                {lastWinner === 'long' ? 'LONGS WIN' : 'SHORTS WIN'}
              </span>
            </div>
            <div className={`text-2xl md:text-4xl font-mono font-bold ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 mt-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">UP or DOWN</h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-danger/20 border border-danger/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
              </span>
              <span className="text-xs font-semibold text-danger uppercase tracking-wider">Live</span>
            </div>
          </div>
          <p className="text-text-secondary">Predict SOL's next move. 30 seconds. Winner takes all.</p>
        </div>

        {/* Streak Badge */}
        {streakInfo.streak >= 2 && (
          <div className={`px-4 py-3 rounded-xl ${streakInfo.side === 'long' ? 'bg-success/10 border border-success/30' : 'bg-danger/10 border border-danger/30'}`}>
            <div className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Streak</div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold tabular-nums ${streakInfo.side === 'long' ? 'text-success' : 'text-danger'}`}>
                {streakInfo.streak}x
              </span>
              {streakInfo.side === 'long' ? (
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Strip */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">Recent Results</span>
          <div className="flex-1 h-px bg-gradient-to-r from-border-primary to-transparent" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {recentRounds.slice(0, 10).map((round, idx) => {
            const change = round.endPrice && round.startPrice
              ? ((round.endPrice - round.startPrice) / round.startPrice * 100)
              : 0;
            const isLong = round.winner === 'long';
            const isShort = round.winner === 'short';
            return (
              <div
                key={round.id}
                className={`flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                  isLong
                    ? 'bg-success/10 border border-success/30'
                    : isShort
                    ? 'bg-danger/10 border border-danger/30'
                    : 'bg-bg-tertiary border border-border-primary'
                }`}
              >
                {isLong ? (
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : isShort ? (
                  <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-text-tertiary rounded-full" />
                  </div>
                )}
                <span className={`text-[9px] font-mono font-medium mt-0.5 ${
                  isLong ? 'text-success' : isShort ? 'text-danger' : 'text-text-tertiary'
                }`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </span>
              </div>
            );
          })}
          {recentRounds.length === 0 && (
            <div className="text-text-tertiary text-sm py-2">Waiting for first round...</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Timer & Price Display */}
          <div className={`card relative overflow-hidden transition-all ${isLocked ? 'ring-2 ring-accent/50' : ''}`}>
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
                <div className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                  isLocked ? 'text-accent' : isBettingOpen ? 'text-success' : 'text-text-tertiary'
                }`}>
                  {isBettingOpen ? 'Place your bets' : isLocked ? 'Locked' : 'Starting...'}
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
              <div className="mt-4 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
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
              height={280}
              lockPrice={currentRound?.startPrice}
            />
          </div>

          {/* Betting Buttons */}
          <div className="grid grid-cols-2 gap-4">
            {/* Long Button */}
            <button
              onClick={() => handlePlaceBet('long')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`group relative p-6 rounded-xl border-2 transition-all duration-200 ${
                isBettingOpen
                  ? 'border-success bg-success/5 hover:bg-success/10 hover:border-success hover:shadow-[0_0_30px_rgba(34,197,94,0.15)] cursor-pointer active:scale-[0.98]'
                  : 'border-border-primary bg-bg-secondary cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all ${
                  isBettingOpen ? 'bg-success/20 group-hover:bg-success/30' : 'bg-bg-tertiary'
                }`}>
                  <svg className={`w-7 h-7 transition-transform ${isBettingOpen ? 'text-success group-hover:-translate-y-0.5' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className={`text-2xl font-bold mb-1 ${isBettingOpen ? 'text-success' : 'text-text-tertiary'}`}>LONG</div>
                <div className={`font-mono text-xl font-bold ${isBettingOpen ? 'text-success' : 'text-text-tertiary'}`}>{getOdds('long')}x</div>
                <div className="text-text-secondary text-xs mt-2">
                  Pool: <span className="font-mono font-semibold">${currentRound?.longPool.toFixed(0) || 0}</span>
                </div>
              </div>
            </button>

            {/* Short Button */}
            <button
              onClick={() => handlePlaceBet('short')}
              disabled={!isBettingOpen || isPlacing || !publicKey}
              className={`group relative p-6 rounded-xl border-2 transition-all duration-200 ${
                isBettingOpen
                  ? 'border-danger bg-danger/5 hover:bg-danger/10 hover:border-danger hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] cursor-pointer active:scale-[0.98]'
                  : 'border-border-primary bg-bg-secondary cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all ${
                  isBettingOpen ? 'bg-danger/20 group-hover:bg-danger/30' : 'bg-bg-tertiary'
                }`}>
                  <svg className={`w-7 h-7 transition-transform ${isBettingOpen ? 'text-danger group-hover:translate-y-0.5' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className={`text-2xl font-bold mb-1 ${isBettingOpen ? 'text-danger' : 'text-text-tertiary'}`}>SHORT</div>
                <div className={`font-mono text-xl font-bold ${isBettingOpen ? 'text-danger' : 'text-text-tertiary'}`}>{getOdds('short')}x</div>
                <div className="text-text-secondary text-xs mt-2">
                  Pool: <span className="font-mono font-semibold">${currentRound?.shortPool.toFixed(0) || 0}</span>
                </div>
              </div>
            </button>
          </div>

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
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-text-secondary">Bet Amount</h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {BET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                    selectedAmount === amount
                      ? 'bg-accent text-bg-primary shadow-lg'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Potential Winnings */}
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary">
              <div className="text-center text-xs text-text-tertiary mb-3 uppercase tracking-wider">Potential Return</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="text-[10px] text-success/70 mb-1 uppercase">If Long</div>
                  <div className="font-mono text-lg font-bold text-success">
                    ${getPotentialWin('long').toFixed(0)}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-danger/5 border border-danger/20">
                  <div className="text-[10px] text-danger/70 mb-1 uppercase">If Short</div>
                  <div className="font-mono text-lg font-bold text-danger">
                    ${getPotentialWin('short').toFixed(0)}
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
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-text-secondary">This Round</h3>
            {currentRound && (
              <div className="space-y-3">
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
          <div className="card">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-text-secondary">How It Works</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">1</div>
                <span className="text-text-secondary">Pick Long or Short</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">2</div>
                <span className="text-text-secondary">Wait 30 seconds</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">3</div>
                <span className="text-text-secondary">Winners split the pot</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
