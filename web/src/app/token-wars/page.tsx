'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';
import { PageLoading } from '@/components/ui/skeleton';
import { useSessionBetting } from '@/hooks/useSessionBetting';

// Token Wars Types
type TWBetSide = 'token_a' | 'token_b';
type TWPhase = 'betting' | 'in_progress' | 'cooldown' | 'completed';

interface TWBattle {
  id: string;
  tokenA: string;
  tokenB: string;
  status: string;
  bettingStartTime: number;
  bettingEndTime: number;
  battleStartTime: number | null;
  battleEndTime: number | null;
  tokenAStartPrice: number | null;
  tokenAEndPrice: number | null;
  tokenBStartPrice: number | null;
  tokenBEndPrice: number | null;
  tokenAPercentChange: number | null;
  tokenBPercentChange: number | null;
  winner: TWBetSide | 'tie' | null;
  totalBetsTokenA: number;
  totalBetsTokenB: number;
  totalBettors: number;
}

interface TWBattleState {
  battle: TWBattle;
  phase: TWPhase;
  timeRemaining: number;
  tokenAPriceNow?: number;
  tokenBPriceNow?: number;
  tokenAChangeNow?: number;
  tokenBChangeNow?: number;
  odds: {
    tokenA: number;
    tokenB: number;
  };
}

interface TWBet {
  id: string;
  battleId: string;
  walletAddress: string;
  side: TWBetSide;
  amountLamports: number;
  payoutLamports: number;
  status: string;
}

interface TWConfig {
  bettingDurationSeconds: number;
  battleDurationSeconds: number;
  cooldownDurationSeconds: number;
  minBetSol: number;
  maxBetSol: number;
  rakePercent: number;
}

interface TokenInfo {
  symbol: string;
  name: string;
}

// Lamports per SOL
const LAMPORTS_PER_SOL = 1_000_000_000;

// Bet amount options
const BET_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1] as const;

export default function TokenWarsPage() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [battleState, setBattleState] = useState<TWBattleState | null>(null);
  const [config, setConfig] = useState<TWConfig | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [myBet, setMyBet] = useState<TWBet | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0.1);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [lastWinner, setLastWinner] = useState<TWBetSide | 'tie' | null>(null);
  const [showResultAnimation, setShowResultAnimation] = useState(false);

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

  // Fetch config and tokens
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/token-wars/config`)
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error);

    fetch(`${BACKEND_URL}/api/token-wars/tokens`)
      .then(res => res.json())
      .then(setTokens)
      .catch(console.error);
  }, []);

  // Fetch user's bet for current battle
  const fetchMyBet = useCallback(async () => {
    if (!publicKey) {
      setMyBet(null);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/token-wars/bet/${publicKey.toBase58()}`);
      if (res.ok) {
        const bet = await res.json();
        setMyBet(bet);
      } else {
        setMyBet(null);
      }
    } catch {
      setMyBet(null);
    }
  }, [publicKey]);

  // Fetch initial battle state
  const fetchBattleState = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/token-wars/battle`);
      if (res.ok) {
        const data = await res.json();
        if (data.battle) {
          setBattleState(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Token Wars battle state:', e);
    }
  }, []);

  // Socket connection
  useEffect(() => {
    setMounted(true);
    fetchBattleState();
    fetchMyBet();

    const socket = getSocket();
    socket.emit('subscribe_token_wars');

    // Initial battle state
    socket.on('token_wars_battle_state', (state: TWBattleState) => {
      setBattleState(state);
    });

    // Real-time events
    socket.on('token_wars_event', (event: any) => {
      console.log('[TokenWars] Event:', event.type, event.data);

      switch (event.type) {
        case 'battle_created':
          fetchBattleState();
          setMyBet(null);
          break;

        case 'bet_placed':
          fetchBattleState();
          break;

        case 'betting_ended':
        case 'battle_started':
          fetchBattleState();
          break;

        case 'price_update':
          setBattleState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              tokenAPriceNow: event.data.tokenA?.price,
              tokenBPriceNow: event.data.tokenB?.price,
              tokenAChangeNow: event.data.tokenA?.change,
              tokenBChangeNow: event.data.tokenB?.change,
            };
          });
          break;

        case 'battle_ended':
          setLastWinner(event.data.winner);
          setShowResultAnimation(true);
          setTimeout(() => setShowResultAnimation(false), 4000);
          fetchBattleState();
          fetchBalance();
          break;

        case 'cooldown_started':
        case 'payout_processed':
          fetchBattleState();
          fetchBalance();
          break;
      }
    });

    // Bet responses
    socket.on('token_wars_bet_success', (data: { bet: TWBet }) => {
      setIsPlacingBet(false);
      setMyBet(data.bet);
      setSuccess('Bet placed!');
      setTimeout(() => setSuccess(null), 3000);
      fetchBattleState();
      fetchBalance();
    });

    socket.on('token_wars_bet_error', (data: { error: string }) => {
      setIsPlacingBet(false);
      setError(data.error);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.emit('unsubscribe_token_wars');
      socket.off('token_wars_battle_state');
      socket.off('token_wars_event');
      socket.off('token_wars_bet_success');
      socket.off('token_wars_bet_error');
    };
  }, [fetchBattleState, fetchMyBet, fetchBalance]);

  // Refetch bet when battle changes
  useEffect(() => {
    if (battleState?.battle.id) {
      fetchMyBet();
    }
  }, [battleState?.battle.id, fetchMyBet]);

  // Timer update
  useEffect(() => {
    if (!battleState) return;

    const updateTimer = () => {
      const now = Date.now();

      if (battleState.phase === 'betting') {
        const remaining = Math.max(0, Math.floor((battleState.battle.bettingEndTime - now) / 1000));
        setTimeRemaining(remaining);
      } else if (battleState.phase === 'in_progress' && battleState.battle.battleStartTime) {
        const battleEnd = battleState.battle.battleStartTime + (config?.battleDurationSeconds || 300) * 1000;
        const remaining = Math.max(0, Math.floor((battleEnd - now) / 1000));
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(battleState.timeRemaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [battleState, config]);

  // Handlers
  const handlePlaceBet = (side: TWBetSide) => {
    if (!publicKey) {
      setError('Connect wallet to bet');
      return;
    }

    if (!battleState || battleState.phase !== 'betting') {
      setError('Betting is closed');
      return;
    }

    if (myBet) {
      setError('You already have a bet on this battle');
      return;
    }

    const amountLamports = Math.floor(selectedAmount * LAMPORTS_PER_SOL);

    if (balanceInSol < selectedAmount) {
      setError(`Insufficient balance. Need ${selectedAmount} SOL`);
      setShowDepositModal(true);
      return;
    }

    setIsPlacingBet(true);
    setError(null);

    const socket = getSocket();
    socket.emit('token_wars_place_bet', {
      wallet: publicKey.toBase58(),
      side,
      amountLamports,
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

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  // Get token name
  const getTokenName = (symbol: string) => {
    const token = tokens.find(t => t.symbol === symbol);
    return token?.name || symbol;
  };

  if (!mounted) {
    return <PageLoading message="Loading Token Wars..." />;
  }

  const phase = battleState?.phase || 'betting';
  const canBet = phase === 'betting' && !myBet && !isPlacingBet;
  const battle = battleState?.battle;

  // Calculate potential winnings
  const getPotentialWin = (side: TWBetSide): number => {
    if (!battleState) return selectedAmount * 2;
    const totalPool = battle?.totalBetsTokenA! + battle?.totalBetsTokenB!;
    if (totalPool === 0) return selectedAmount * 2;

    const myPool = side === 'token_a' ? battle?.totalBetsTokenA! : battle?.totalBetsTokenB!;
    const theirPool = side === 'token_a' ? battle?.totalBetsTokenB! : battle?.totalBetsTokenA!;
    const amountLamports = selectedAmount * LAMPORTS_PER_SOL;

    if (myPool + amountLamports === 0) return selectedAmount * 2;
    const rake = 0.05;
    const distributablePool = (totalPool + amountLamports) * (1 - rake);
    const share = amountLamports / (myPool + amountLamports);
    return (distributablePool * share) / LAMPORTS_PER_SOL;
  };

  return (
    <div className="h-screen flex flex-col px-3 sm:px-4 lg:px-6 py-2 overflow-hidden safe-area-inset">
      {/* Result Animation Overlay */}
      {showResultAnimation && lastWinner && lastWinner !== 'tie' && battle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
          <div className="text-center winner-announcement">
            <div className={`text-4xl sm:text-6xl md:text-8xl font-black tracking-tight mb-4 ${lastWinner === 'token_a' ? 'text-success' : 'text-danger'}`} style={{ fontFamily: 'Impact, sans-serif' }}>
              {lastWinner === 'token_a' ? battle.tokenA : battle.tokenB} WINS!
            </div>
            {battleState && (
              <div className="flex items-center justify-center gap-8 text-2xl">
                <div className={`${lastWinner === 'token_a' ? 'text-success' : 'text-white/40'}`}>
                  {battle.tokenA}: {(battle.tokenAPercentChange || 0) >= 0 ? '+' : ''}{(battle.tokenAPercentChange || 0).toFixed(2)}%
                </div>
                <div className="text-white/20">vs</div>
                <div className={`${lastWinner === 'token_b' ? 'text-danger' : 'text-white/40'}`}>
                  {battle.tokenB}: {(battle.tokenBPercentChange || 0) >= 0 ? '+' : ''}{(battle.tokenBPercentChange || 0).toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-lg sm:text-2xl font-black tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>
            <span className="text-warning">TOKEN</span> <span className="text-white/80">WARS</span>
          </h1>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Battle Info */}
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
            phase === 'betting' ? 'bg-success/20 text-success' :
            phase === 'in_progress' ? 'bg-warning/20 text-warning' :
            'bg-white/10 text-white/40'
          }`}>
            {phase === 'betting' ? 'Place Bets' :
             phase === 'in_progress' ? 'Battle!' :
             phase === 'cooldown' ? 'Cooldown' : 'Waiting'}
          </div>
          <div className="text-2xl font-bold text-warning">{formatTime(timeRemaining)}</div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Token Battle Display */}
        {battle && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* VS Display */}
            <div className="flex items-stretch gap-4 flex-1 min-h-0">
              {/* Token A */}
              <button
                onClick={() => handlePlaceBet('token_a')}
                disabled={!canBet}
                className={`flex-1 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all ${
                  canBet
                    ? 'bg-gradient-to-b from-success/20 to-success/5 border-2 border-success/50 hover:border-success cursor-pointer shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:shadow-[0_0_60px_rgba(34,197,94,0.5)]'
                    : myBet?.side === 'token_a'
                      ? 'bg-success/30 border-2 border-success'
                      : 'bg-white/5 border-2 border-white/10'
                } ${!canBet && myBet?.side !== 'token_a' ? 'opacity-50' : ''}`}
              >
                <div className="text-4xl sm:text-6xl font-black text-success mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
                  {battle.tokenA}
                </div>
                <div className="text-sm text-white/60 mb-4">{getTokenName(battle.tokenA)}</div>

                {/* Price/Change during battle */}
                {phase === 'in_progress' && battleState?.tokenAPriceNow && (
                  <div className="text-center mb-4">
                    <div className="text-2xl font-mono text-white">${battleState.tokenAPriceNow.toFixed(2)}</div>
                    <div className={`text-xl font-bold ${(battleState.tokenAChangeNow || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {(battleState.tokenAChangeNow || 0) >= 0 ? '+' : ''}{(battleState.tokenAChangeNow || 0).toFixed(3)}%
                    </div>
                  </div>
                )}

                {/* Pool info */}
                <div className="text-center">
                  <div className="text-lg font-bold text-success">
                    {((battle.totalBetsTokenA || 0) / LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </div>
                  <div className="text-xs text-white/40">Pool ({battleState?.odds.tokenA.toFixed(0)}%)</div>
                </div>

                {myBet?.side === 'token_a' && (
                  <div className="mt-4 px-3 py-1 bg-success text-black text-sm font-bold rounded">
                    YOUR BET: {(myBet.amountLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </div>
                )}

                {canBet && (
                  <div className="mt-4 text-sm text-success/80">
                    Win ~{getPotentialWin('token_a').toFixed(2)} SOL
                  </div>
                )}
              </button>

              {/* VS Divider */}
              <div className="flex flex-col items-center justify-center px-2">
                <div className="text-3xl sm:text-5xl font-black text-warning/50" style={{ fontFamily: 'Impact, sans-serif' }}>
                  VS
                </div>
              </div>

              {/* Token B */}
              <button
                onClick={() => handlePlaceBet('token_b')}
                disabled={!canBet}
                className={`flex-1 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center transition-all ${
                  canBet
                    ? 'bg-gradient-to-b from-danger/20 to-danger/5 border-2 border-danger/50 hover:border-danger cursor-pointer shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_rgba(239,68,68,0.5)]'
                    : myBet?.side === 'token_b'
                      ? 'bg-danger/30 border-2 border-danger'
                      : 'bg-white/5 border-2 border-white/10'
                } ${!canBet && myBet?.side !== 'token_b' ? 'opacity-50' : ''}`}
              >
                <div className="text-4xl sm:text-6xl font-black text-danger mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
                  {battle.tokenB}
                </div>
                <div className="text-sm text-white/60 mb-4">{getTokenName(battle.tokenB)}</div>

                {/* Price/Change during battle */}
                {phase === 'in_progress' && battleState?.tokenBPriceNow && (
                  <div className="text-center mb-4">
                    <div className="text-2xl font-mono text-white">${battleState.tokenBPriceNow.toFixed(2)}</div>
                    <div className={`text-xl font-bold ${(battleState.tokenBChangeNow || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {(battleState.tokenBChangeNow || 0) >= 0 ? '+' : ''}{(battleState.tokenBChangeNow || 0).toFixed(3)}%
                    </div>
                  </div>
                )}

                {/* Pool info */}
                <div className="text-center">
                  <div className="text-lg font-bold text-danger">
                    {((battle.totalBetsTokenB || 0) / LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </div>
                  <div className="text-xs text-white/40">Pool ({battleState?.odds.tokenB.toFixed(0)}%)</div>
                </div>

                {myBet?.side === 'token_b' && (
                  <div className="mt-4 px-3 py-1 bg-danger text-white text-sm font-bold rounded">
                    YOUR BET: {(myBet.amountLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </div>
                )}

                {canBet && (
                  <div className="mt-4 text-sm text-danger/80">
                    Win ~{getPotentialWin('token_b').toFixed(2)} SOL
                  </div>
                )}
              </button>
            </div>

            {/* Bet Amount Selector */}
            {phase === 'betting' && !myBet && (
              <div className="flex items-center justify-center gap-2 flex-shrink-0">
                <span className="text-white/30 text-xs uppercase tracking-wider">Bet:</span>
                {BET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`min-h-[44px] min-w-[44px] py-2 px-3 rounded-lg text-sm font-bold transition-all touch-manipulation ${
                      selectedAmount === amount
                        ? 'bg-warning/20 text-warning border border-warning/50'
                        : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            )}

            {/* Progress Bar */}
            {phase === 'in_progress' && battleState?.tokenAChangeNow !== undefined && battleState?.tokenBChangeNow !== undefined && (
              <div className="flex-shrink-0">
                <div className="h-4 bg-white/5 rounded-full overflow-hidden flex">
                  {(() => {
                    const aChange = battleState.tokenAChangeNow || 0;
                    const bChange = battleState.tokenBChangeNow || 0;
                    // Normalize to percentage width
                    const total = Math.abs(aChange) + Math.abs(bChange);
                    const aWidth = total > 0 ? (Math.max(0, aChange) / total) * 100 : 50;
                    const bWidth = total > 0 ? (Math.max(0, bChange) / total) * 100 : 50;

                    return (
                      <>
                        <div
                          className="bg-success transition-all duration-500"
                          style={{ width: `${aWidth}%` }}
                        />
                        <div
                          className="bg-danger transition-all duration-500"
                          style={{ width: `${bWidth}%` }}
                        />
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>{battle.tokenA} {battleState.tokenAChangeNow! >= 0 ? '+' : ''}{battleState.tokenAChangeNow!.toFixed(3)}%</span>
                  <span>{battle.tokenB} {battleState.tokenBChangeNow! >= 0 ? '+' : ''}{battleState.tokenBChangeNow!.toFixed(3)}%</span>
                </div>
              </div>
            )}

            {/* Instructions */}
            {phase === 'betting' && !myBet && (
              <div className="text-center text-sm text-white/40 flex-shrink-0">
                Pick the token you think will have the better % price change over 5 minutes!
              </div>
            )}

            {phase === 'in_progress' && (
              <div className="text-center text-sm text-white/40 flex-shrink-0">
                Battle in progress! Watching price changes in real-time...
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
        )}

        {!battle && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white/40 mb-2">Waiting for next battle...</div>
              <div className="text-white/20">New battles start every few minutes</div>
            </div>
          </div>
        )}
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
