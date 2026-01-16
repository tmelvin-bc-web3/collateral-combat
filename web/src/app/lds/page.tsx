'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';
import { RealtimeChart } from '@/components/RealtimeChart';
import { PageLoading } from '@/components/ui/skeleton';
import { useSessionBetting } from '@/hooks/useSessionBetting';

// LDS Types
type LDSPrediction = 'up' | 'down';
type LDSGamePhase = 'registering' | 'starting' | 'predicting' | 'resolving' | 'completed' | 'cancelled';
type LDSPlayerStatus = 'alive' | 'eliminated' | 'winner';

interface LDSPlayer {
  walletAddress: string;
  status: LDSPlayerStatus;
  eliminatedAtRound: number | null;
  payoutLamports: number;
  placement: number | null;
}

interface LDSRound {
  roundNumber: number;
  startPrice: number;
  endPrice: number | null;
  result: 'up' | 'down' | null;
  playersAliveBefore: number;
  playersAliveAfter: number | null;
  predictionDeadline: number;
}

interface LDSGameState {
  game: {
    id: string;
    status: string;
    scheduledStartTime: number;
    playerCount: number;
    prizePoolLamports: number;
    currentRound: number;
  };
  players: LDSPlayer[];
  currentRound: LDSRound | null;
  alivePlayers: number;
  timeRemaining: number;
  phase: LDSGamePhase;
}

interface LDSConfig {
  entryFeeSol: number;
  maxPlayers: number;
  minPlayers: number;
  gameIntervalMinutes: number;
  roundDurationSeconds: number;
  predictionWindowSeconds: number;
  maxRounds: number;
  rakePercent: number;
  payoutTiers: Array<{
    minPlayers: number;
    maxPlayers: number;
    payouts: number[];
  }>;
}

// Animation constants
const PRICE_INTERPOLATION_MS = 150;
const WINNER_FLASH_MS = 350;

// Hook for smooth price interpolation
function useAnimatedPrice(targetPrice: number, duration: number, enabled: boolean): number {
  const [displayPrice, setDisplayPrice] = useState(targetPrice);
  const animationRef = useRef<number | null>(null);
  const startPriceRef = useRef(targetPrice);
  const startTimeRef = useRef<number | null>(null);
  const prevTargetRef = useRef(targetPrice);

  useEffect(() => {
    if (!enabled || targetPrice === 0 || targetPrice === prevTargetRef.current) {
      if (targetPrice !== 0) {
        setDisplayPrice(targetPrice);
        prevTargetRef.current = targetPrice;
      }
      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startPriceRef.current = displayPrice;
    startTimeRef.current = performance.now();
    prevTargetRef.current = targetPrice;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (startTimeRef.current || 0);
      const progress = Math.min(elapsed / duration, 1);
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

export default function LDSPage() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<LDSGameState | null>(null);
  const [config, setConfig] = useState<LDSConfig | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<'up' | 'down' | null>(null);
  const [showResultAnimation, setShowResultAnimation] = useState(false);
  const [myPrediction, setMyPrediction] = useState<LDSPrediction | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Session betting for balance
  const {
    balanceInSol,
    deposit,
    fetchBalance,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useSessionBetting();

  // Deposit modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.5');

  // Animated price
  const animatedPrice = useAnimatedPrice(currentPrice, PRICE_INTERPOLATION_MS, true);

  // Fetch config
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/lds/config`)
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  // Fetch initial game state
  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/lds/game`);
      if (res.ok) {
        const data = await res.json();
        if (data.game) {
          setGameState(data.game);
        }
      }
    } catch (e) {
      console.error('Failed to fetch LDS game state:', e);
    }
  }, []);

  // Socket connection
  useEffect(() => {
    setMounted(true);
    fetchGameState();

    const socket = getSocket();
    socket.emit('subscribe_lds');
    socket.emit('subscribe_prices', ['SOL']);

    // Initial game state
    socket.on('lds_game_state', (state: LDSGameState) => {
      setGameState(state);
    });

    // Real-time events
    socket.on('lds_event', (event: any) => {
      console.log('[LDS] Event:', event.type, event.data);

      switch (event.type) {
        case 'game_created':
        case 'player_joined':
        case 'player_left':
        case 'game_starting':
        case 'game_started':
          fetchGameState();
          break;

        case 'round_started':
          fetchGameState();
          setMyPrediction(null);
          break;

        case 'round_resolved':
          setLastRoundResult(event.data.result);
          setShowResultAnimation(true);
          setTimeout(() => setShowResultAnimation(false), 3000);
          fetchGameState();
          break;

        case 'player_eliminated':
          fetchGameState();
          break;

        case 'game_ended':
        case 'game_cancelled':
          fetchGameState();
          break;
      }
    });

    // Price updates
    socket.on('price_update', (prices: Record<string, number>) => {
      if (prices.SOL) {
        setCurrentPrice(prices.SOL);
      }
    });

    // Join/leave/predict responses
    socket.on('lds_join_success', () => {
      setIsJoining(false);
      setSuccess('Joined game!');
      setTimeout(() => setSuccess(null), 3000);
      fetchGameState();
      fetchBalance();
    });

    socket.on('lds_join_error', (data: { error: string }) => {
      setIsJoining(false);
      setError(data.error);
      setTimeout(() => setError(null), 5000);
    });

    socket.on('lds_leave_success', () => {
      setIsLeaving(false);
      setSuccess('Left game');
      setTimeout(() => setSuccess(null), 3000);
      fetchGameState();
      fetchBalance();
    });

    socket.on('lds_leave_error', (data: { error: string }) => {
      setIsLeaving(false);
      setError(data.error);
      setTimeout(() => setError(null), 5000);
    });

    socket.on('lds_prediction_success', () => {
      setIsPredicting(false);
    });

    socket.on('lds_prediction_error', (data: { error: string }) => {
      setIsPredicting(false);
      setMyPrediction(null);
      setError(data.error);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.emit('unsubscribe_lds');
      socket.off('lds_game_state');
      socket.off('lds_event');
      socket.off('price_update');
      socket.off('lds_join_success');
      socket.off('lds_join_error');
      socket.off('lds_leave_success');
      socket.off('lds_leave_error');
      socket.off('lds_prediction_success');
      socket.off('lds_prediction_error');
    };
  }, [fetchGameState, fetchBalance]);

  // Timer update
  useEffect(() => {
    if (!gameState) return;

    const updateTimer = () => {
      const now = Date.now();

      if (gameState.phase === 'registering' && gameState.game.scheduledStartTime) {
        const remaining = Math.max(0, Math.floor((gameState.game.scheduledStartTime - now) / 1000));
        setTimeRemaining(remaining);
      } else if (gameState.phase === 'predicting' && gameState.currentRound) {
        const remaining = Math.max(0, Math.floor((gameState.currentRound.predictionDeadline - now) / 1000));
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(gameState.timeRemaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [gameState]);

  // Check if player is in game
  const myPlayer = gameState?.players.find(p => p.walletAddress === publicKey?.toBase58());
  const isInGame = !!myPlayer;
  const isAlive = myPlayer?.status === 'alive';
  const isEliminated = myPlayer?.status === 'eliminated';

  // Handlers
  const handleJoin = () => {
    if (!publicKey) {
      setError('Connect wallet to play');
      return;
    }

    if (config && balanceInSol < config.entryFeeSol) {
      setError(`Insufficient balance. Need ${config.entryFeeSol} SOL`);
      setShowDepositModal(true);
      return;
    }

    setIsJoining(true);
    setError(null);
    const socket = getSocket();
    socket.emit('lds_join_game', publicKey.toBase58());
  };

  const handleLeave = () => {
    if (!publicKey) return;
    setIsLeaving(true);
    setError(null);
    const socket = getSocket();
    socket.emit('lds_leave_game', publicKey.toBase58());
  };

  const handlePredict = (prediction: LDSPrediction) => {
    if (!publicKey || !gameState?.game.id) return;

    setIsPredicting(true);
    setMyPrediction(prediction);
    setError(null);

    const socket = getSocket();
    socket.emit('lds_submit_prediction', {
      gameId: gameState.game.id,
      wallet: publicKey.toBase58(),
      prediction,
    });
  };

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

  if (!mounted) {
    return <PageLoading message="Loading Last Degen Standing..." />;
  }

  const phase = gameState?.phase || 'registering';
  const isPredictionPhase = phase === 'predicting';
  const isResolvingPhase = phase === 'resolving';
  const canPredict = isPredictionPhase && isAlive && !myPrediction && !isPredicting;

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="h-screen flex flex-col px-3 sm:px-4 lg:px-6 py-2 overflow-hidden safe-area-inset">
      {/* Result Animation Overlay */}
      {showResultAnimation && lastRoundResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
          <div className={`text-center winner-announcement ${lastRoundResult === 'up' ? 'winner-long' : 'winner-short'}`}>
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-4">
              {lastRoundResult === 'up' ? (
                <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-24 md:h-24 text-success oracle-winner-flash-long" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-10 h-10 sm:w-16 sm:h-16 md:w-24 md:h-24 text-danger oracle-winner-flash-short" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-2xl sm:text-5xl md:text-7xl font-black tracking-tight ${lastRoundResult === 'up' ? 'text-success' : 'text-danger'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                {lastRoundResult === 'up' ? 'UP WINS' : 'DOWN WINS'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-lg sm:text-2xl font-black tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>
            <span className="text-white/80">LAST</span> <span className="text-danger">DEGEN</span> <span className="text-white/80">STANDING</span>
          </h1>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Game Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          {gameState && (
            <>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-warning">{gameState.alivePlayers}</div>
                <div className="text-[9px] sm:text-[10px] text-white/40 uppercase">Alive</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">R{gameState.game.currentRound}</div>
                <div className="text-[9px] sm:text-[10px] text-white/40 uppercase">Round</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-2 sm:gap-4 flex-1 min-h-0">
        {/* Left Sidebar - Players */}
        <aside className="hidden lg:flex w-72 flex-col flex-shrink-0 overflow-hidden">
          <div className="bg-black/40 backdrop-blur border border-white/5 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-medium">
              Players ({gameState?.players.length || 0}/{config?.maxPlayers || 50})
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {gameState?.players.map((player) => (
                <div
                  key={player.walletAddress}
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                    player.status === 'alive' ? 'bg-success/10' :
                    player.status === 'winner' ? 'bg-warning/20' :
                    'bg-white/5 opacity-50'
                  } ${player.walletAddress === publicKey?.toBase58() ? 'border border-warning/50' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    player.status === 'alive' ? 'bg-success' :
                    player.status === 'winner' ? 'bg-warning' :
                    'bg-danger'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-white/80 font-mono text-sm truncate block">
                      {player.walletAddress.slice(0, 4)}...{player.walletAddress.slice(-4)}
                      {player.walletAddress === publicKey?.toBase58() && (
                        <span className="text-warning ml-1">(you)</span>
                      )}
                    </span>
                  </div>
                  <span className={`text-xs font-bold ${
                    player.status === 'alive' ? 'text-success' :
                    player.status === 'winner' ? 'text-warning' :
                    'text-danger'
                  }`}>
                    {player.status === 'eliminated' && player.eliminatedAtRound ? `R${player.eliminatedAtRound}` : player.status.toUpperCase()}
                  </span>
                </div>
              ))}

              {(!gameState?.players.length) && (
                <div className="text-white/20 text-xs text-center py-8">No players yet</div>
              )}
            </div>

            {/* Prize Pool */}
            <div className="mt-auto pt-3 border-t border-white/10 text-center">
              <div className="text-2xl font-bold text-warning">
                {gameState ? ((gameState.game.prizePoolLamports || 0) / 1e9).toFixed(2) : '0.00'} SOL
              </div>
              <div className="text-[9px] text-white/30 uppercase">Prize Pool</div>
            </div>
          </div>
        </aside>

        {/* Main Game Area */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {/* Chart */}
          <div
            className="relative rounded-xl flex-1 min-h-0 p-[2px] bg-white/5"
            style={{ flexBasis: '50%' }}
          >
            <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#09090b]">
              <RealtimeChart
                symbol="SOL"
                height="100%"
                lockPrice={gameState?.currentRound?.startPrice}
                timeRemaining={timeRemaining}
                isLocked={isResolvingPhase}
              />
            </div>
          </div>

          {/* Game Controls */}
          <div className="flex-1 flex flex-col min-h-0 gap-2" style={{ flexBasis: '50%' }}>
            {/* Phase-specific UI */}
            {phase === 'registering' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="text-center">
                  <div className="text-sm text-white/40 uppercase tracking-wider mb-1">Game Starting In</div>
                  <div className="text-4xl sm:text-6xl font-black text-warning" style={{ fontFamily: 'Impact, sans-serif' }}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">{gameState?.players.length || 0}</div>
                    <div className="text-xs text-white/40">Players</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <div className="text-2xl font-bold text-warning">{config?.entryFeeSol || 0.1} SOL</div>
                    <div className="text-xs text-white/40">Entry Fee</div>
                  </div>
                </div>

                {isInGame ? (
                  <button
                    onClick={handleLeave}
                    disabled={isLeaving}
                    className="px-8 py-4 rounded-xl bg-danger/20 border-2 border-danger text-danger font-bold text-lg hover:bg-danger/30 transition-all disabled:opacity-50"
                  >
                    {isLeaving ? 'Leaving...' : 'Leave Game'}
                  </button>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={isJoining || !publicKey}
                    className="px-8 py-4 rounded-xl bg-success/20 border-2 border-success text-success font-bold text-lg hover:bg-success/30 transition-all disabled:opacity-50"
                  >
                    {isJoining ? 'Joining...' : publicKey ? 'Join Game' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            )}

            {(phase === 'predicting' || phase === 'resolving') && (
              <>
                {/* Status Bar */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isAlive ? 'bg-success/20 text-success' :
                      isEliminated ? 'bg-danger/20 text-danger' :
                      'bg-white/10 text-white/40'
                    }`}>
                      {isAlive ? 'ALIVE' : isEliminated ? 'ELIMINATED' : 'SPECTATING'}
                    </div>
                    {myPrediction && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        myPrediction === 'up' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                      }`}>
                        Predicted: {myPrediction.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={`text-lg font-bold ${isPredictionPhase ? 'text-warning' : 'text-white/40'}`}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>

                {/* Prediction Buttons */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-1 min-h-0">
                  {/* UP Button */}
                  <button
                    onClick={() => handlePredict('up')}
                    disabled={!canPredict}
                    className={`group relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-150 min-h-[120px] touch-manipulation ${
                      canPredict
                        ? 'bg-gradient-to-b from-success/20 to-success/5 border-2 border-success/50 shadow-[0_0_60px_rgba(34,197,94,0.4)] hover:shadow-[0_0_80px_rgba(34,197,94,0.6)] hover:border-success cursor-pointer active:scale-[0.98]'
                        : myPrediction === 'up'
                          ? 'bg-success/30 border-2 border-success'
                          : 'bg-white/5 border-2 border-white/10 cursor-not-allowed'
                    }`}
                  >
                    <div className={`relative flex flex-col items-center gap-1 sm:gap-2 ${!canPredict && myPrediction !== 'up' ? 'opacity-20' : ''}`}>
                      <svg className={`w-12 h-12 sm:w-16 sm:h-16 ${canPredict || myPrediction === 'up' ? 'text-success' : 'text-white/30'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <div className={`text-3xl sm:text-4xl md:text-5xl font-black ${canPredict || myPrediction === 'up' ? 'text-success' : 'text-white/30'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                        UP
                      </div>
                    </div>
                    {myPrediction === 'up' && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-success text-black text-xs font-bold rounded">
                        YOUR PICK
                      </div>
                    )}
                  </button>

                  {/* DOWN Button */}
                  <button
                    onClick={() => handlePredict('down')}
                    disabled={!canPredict}
                    className={`group relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-150 min-h-[120px] touch-manipulation ${
                      canPredict
                        ? 'bg-gradient-to-b from-danger/20 to-danger/5 border-2 border-danger/50 shadow-[0_0_60px_rgba(239,68,68,0.4)] hover:shadow-[0_0_80px_rgba(239,68,68,0.6)] hover:border-danger cursor-pointer active:scale-[0.98]'
                        : myPrediction === 'down'
                          ? 'bg-danger/30 border-2 border-danger'
                          : 'bg-white/5 border-2 border-white/10 cursor-not-allowed'
                    }`}
                  >
                    <div className={`relative flex flex-col items-center gap-1 sm:gap-2 ${!canPredict && myPrediction !== 'down' ? 'opacity-20' : ''}`}>
                      <svg className={`w-12 h-12 sm:w-16 sm:h-16 ${canPredict || myPrediction === 'down' ? 'text-danger' : 'text-white/30'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <div className={`text-3xl sm:text-4xl md:text-5xl font-black ${canPredict || myPrediction === 'down' ? 'text-danger' : 'text-white/30'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
                        DOWN
                      </div>
                    </div>
                    {myPrediction === 'down' && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-danger text-white text-xs font-bold rounded">
                        YOUR PICK
                      </div>
                    )}
                  </button>
                </div>

                {/* Instructions */}
                {canPredict && (
                  <div className="text-center text-sm text-white/40 flex-shrink-0">
                    Predict if SOL price will go UP or DOWN. Wrong prediction = eliminated!
                  </div>
                )}

                {isEliminated && (
                  <div className="text-center p-4 rounded-xl bg-danger/10 border border-danger/30 flex-shrink-0">
                    <div className="text-danger font-bold text-lg mb-1">You've been eliminated!</div>
                    <div className="text-white/60 text-sm">You finished in round {myPlayer?.eliminatedAtRound}</div>
                  </div>
                )}
              </>
            )}

            {phase === 'completed' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="text-4xl sm:text-6xl font-black text-warning" style={{ fontFamily: 'Impact, sans-serif' }}>
                  GAME OVER
                </div>
                {gameState?.players.find(p => p.status === 'winner') && (
                  <div className="text-center">
                    <div className="text-sm text-white/40 uppercase mb-1">Winner</div>
                    <div className="text-xl font-mono text-success">
                      {gameState.players.find(p => p.status === 'winner')?.walletAddress.slice(0, 8)}...
                    </div>
                  </div>
                )}
                <div className="text-white/60">Next game starts in {formatTime(timeRemaining)}</div>
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
                  className="px-3 py-1 rounded-lg bg-warning/20 text-warning text-xs font-bold hover:bg-warning/30 transition-colors"
                >
                  Deposit
                </button>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-center text-sm font-medium animate-shake flex-shrink-0">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-center text-sm font-medium flex-shrink-0">
                {success}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Mobile: Players (hidden on desktop) */}
        <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 overflow-hidden">
          <div className="bg-black/40 backdrop-blur border border-white/5 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 font-medium">Payout Tiers</div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {config?.payoutTiers?.map((tier: any, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-white/5">
                  <div className="text-xs text-white/60 mb-1">{tier.minPlayers}-{tier.maxPlayers} players</div>
                  <div className="flex flex-wrap gap-1">
                    {tier.payouts.map((payout: number, pIdx: number) => (
                      <div key={pIdx} className="text-xs font-bold text-warning">
                        #{pIdx + 1}: {payout}%
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-3 border-t border-white/10 text-xs text-white/30">
              Entry: {config?.entryFeeSol || 0.1} SOL | {config?.rakePercent || 5}% rake
            </div>
          </div>
        </aside>
      </div>

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
