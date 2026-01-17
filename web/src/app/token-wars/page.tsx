'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';
import { PageLoading } from '@/components/ui/skeleton';
import { useSessionBetting } from '@/hooks/useSessionBetting';
import { getTokenLogo, getTokenColor, getTokenConfig } from '@/config/tokenLogos';
import Image from 'next/image';

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

// Additional types for new panels
interface RecentBattle {
  id: string;
  tokenA: string;
  tokenB: string;
  winner: TWBetSide | 'tie' | null;
  tokenAPercentChange: number;
  tokenBPercentChange: number;
  totalPool: number;
  completedAt: number;
}

interface BetHistory {
  battleId: string;
  tokenA: string;
  tokenB: string;
  side: TWBetSide;
  amountLamports: number;
  payoutLamports: number;
  status: string;
  winner: TWBetSide | 'tie' | null;
  createdAt: number;
}

interface LeaderboardEntry {
  walletAddress: string;
  totalWinnings: number;
  totalBets: number;
  winRate: number;
}

interface PlayerStats {
  totalBets: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  netProfit: number;
}

type InfoTab = 'recent' | 'history' | 'leaderboard' | 'stats';

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

  // Info panel state
  const [activeTab, setActiveTab] = useState<InfoTab>('recent');
  const [recentBattles, setRecentBattles] = useState<RecentBattle[]>([]);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);

  // Free bet state
  const [freeBetBalance, setFreeBetBalance] = useState(0);
  const [useFreeBet, setUseFreeBet] = useState(false);

  // Fetch free bet balance
  const fetchFreeBetBalance = useCallback(async () => {
    if (!publicKey) {
      setFreeBetBalance(0);
      return;
    }
    try {
      const walletAddress = publicKey.toBase58();
      const res = await fetch(`${BACKEND_URL}/api/progression/${walletAddress}/free-bets`, {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFreeBetBalance(data.balance || 0);
      }
    } catch (e) {
      console.error('Failed to fetch free bet balance:', e);
    }
  }, [publicKey]);

  // Fetch recent battles
  const fetchRecentBattles = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/token-wars/battles/recent`);
      if (res.ok) {
        const data = await res.json();
        setRecentBattles(data);
      }
    } catch (e) {
      console.error('Failed to fetch recent battles:', e);
    }
  }, []);

  // Fetch bet history
  const fetchBetHistory = useCallback(async () => {
    if (!publicKey) {
      setBetHistory([]);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/token-wars/player/${publicKey.toBase58()}/history`);
      if (res.ok) {
        const data = await res.json();
        setBetHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch bet history:', e);
    }
  }, [publicKey]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/token-wars/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  }, []);

  // Fetch player stats
  const fetchPlayerStats = useCallback(async () => {
    if (!publicKey) {
      setPlayerStats(null);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/token-wars/player/${publicKey.toBase58()}/stats`);
      if (res.ok) {
        const data = await res.json();
        setPlayerStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch player stats:', e);
    }
  }, [publicKey]);

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

  // Fetch panel data on mount and periodically
  useEffect(() => {
    fetchRecentBattles();
    fetchLeaderboard();

    // Refresh recent battles every 30 seconds
    const interval = setInterval(() => {
      fetchRecentBattles();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchRecentBattles, fetchLeaderboard]);

  // Fetch user-specific data when wallet changes
  useEffect(() => {
    fetchBetHistory();
    fetchPlayerStats();
    fetchFreeBetBalance();
  }, [fetchBetHistory, fetchPlayerStats, fetchFreeBetBalance]);

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

    // Free bets are fixed at 0.01 SOL
    const FREE_BET_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL
    const amountLamports = useFreeBet ? FREE_BET_AMOUNT_LAMPORTS : Math.floor(selectedAmount * LAMPORTS_PER_SOL);

    // Check balance (skip if using free bet)
    if (!useFreeBet) {
      if (balanceInSol < selectedAmount) {
        setError(`Insufficient balance. Need ${selectedAmount} SOL`);
        setShowDepositModal(true);
        return;
      }
    } else {
      // Using free bet - check if user has free bets available
      if (freeBetBalance < 1) {
        setError('No free bets available');
        return;
      }
    }

    setIsPlacingBet(true);
    setError(null);

    const socket = getSocket();
    socket.emit('token_wars_place_bet', {
      wallet: publicKey.toBase58(),
      side,
      amountLamports,
      useFreeBet,
    });

    // Refresh free bet balance after placing bet
    if (useFreeBet) {
      setTimeout(() => fetchFreeBetBalance(), 1000);
    }
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
    const config = getTokenConfig(symbol);
    if (config) return config.name;
    const token = tokens.find(t => t.symbol === symbol);
    return token?.name || symbol;
  };

  // Format wallet address
  const formatWallet = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Token Logo Component
  const TokenLogo = ({ symbol, size = 48 }: { symbol: string; size?: number }) => {
    const logoUrl = getTokenLogo(symbol);
    const color = getTokenColor(symbol);

    return (
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 20px ${color}40`
        }}
      >
        <Image
          src={logoUrl}
          alt={symbol}
          width={size}
          height={size}
          className="rounded-full"
          unoptimized // External URL
        />
      </div>
    );
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
            <div className="flex items-center justify-center gap-4 mb-4">
              <TokenLogo symbol={lastWinner === 'token_a' ? battle.tokenA : battle.tokenB} size={80} />
            </div>
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

      {/* Main Layout - Two Column on Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
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
                {/* Token Logo */}
                <div className="mb-3">
                  <TokenLogo symbol={battle.tokenA} size={64} />
                </div>
                <div className="text-3xl sm:text-5xl font-black text-success mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
                  {battle.tokenA}
                </div>
                <div className="text-sm text-white/60 mb-3">{getTokenName(battle.tokenA)}</div>

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
                {/* Token Logo */}
                <div className="mb-3">
                  <TokenLogo symbol={battle.tokenB} size={64} />
                </div>
                <div className="text-3xl sm:text-5xl font-black text-danger mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
                  {battle.tokenB}
                </div>
                <div className="text-sm text-white/60 mb-3">{getTokenName(battle.tokenB)}</div>

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
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                {/* Free Bet Toggle - always visible, disabled if no free bets */}
                <button
                  onClick={() => {
                    if (freeBetBalance > 0) {
                      setUseFreeBet(!useFreeBet);
                    }
                  }}
                  disabled={freeBetBalance === 0}
                  title={freeBetBalance === 0 ? 'Earn free bets by leveling up!' : `You have ${freeBetBalance} free bet${freeBetBalance !== 1 ? 's' : ''}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    freeBetBalance === 0
                      ? 'bg-white/5 text-text-tertiary border border-white/10 cursor-not-allowed opacity-50'
                      : useFreeBet
                        ? 'bg-success/20 text-success border border-success/50'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    freeBetBalance === 0
                      ? 'border-white/20'
                      : useFreeBet ? 'border-success bg-success' : 'border-white/40'
                  }`}>
                    {useFreeBet && freeBetBalance > 0 && (
                      <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  {freeBetBalance > 0 ? `Use Free Bet (${freeBetBalance} available)` : 'Free Bet (0 available)'}
                </button>

                {/* Amount selector - hidden when using free bet */}
                {!useFreeBet && (
                  <div className="flex items-center gap-2">
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

                {/* Show free bet info when selected */}
                {useFreeBet && (
                  <div className="text-sm text-success/80">
                    Free bet: 0.01 SOL value - Keep only winnings!
                  </div>
                )}
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

        {/* Info Panels Sidebar */}
        <div className="lg:w-80 flex-shrink-0 flex flex-col gap-3 min-h-0">
          {/* Stats Summary - Always visible for connected users */}
          {publicKey && playerStats && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="text-xs text-white/40 uppercase mb-2">Your Stats</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-white">{playerStats.totalBets}</div>
                  <div className="text-[10px] text-white/40">Bets</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${playerStats.winRate >= 50 ? 'text-success' : 'text-danger'}`}>
                    {playerStats.winRate.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-white/40">Win Rate</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${playerStats.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {playerStats.netProfit >= 0 ? '+' : ''}{(playerStats.netProfit / LAMPORTS_PER_SOL).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-white/40">P&L (SOL)</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex bg-white/5 rounded-lg p-1">
            {[
              { key: 'recent' as InfoTab, label: 'Recent' },
              { key: 'history' as InfoTab, label: 'History' },
              { key: 'leaderboard' as InfoTab, label: 'Leaders' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-md transition-all ${
                  activeTab === tab.key
                    ? 'bg-warning/20 text-warning'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden min-h-0">
            <div className="h-full overflow-y-auto">
              {/* Recent Battles Tab */}
              {activeTab === 'recent' && (
                <div className="p-3 space-y-2">
                  <div className="text-xs text-white/40 uppercase mb-2">Recent Battles</div>
                  {recentBattles.length === 0 ? (
                    <div className="text-center text-white/30 text-sm py-4">No recent battles</div>
                  ) : (
                    recentBattles.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white/5 rounded-lg p-2 flex items-center gap-2"
                      >
                        <div className="flex items-center gap-1">
                          <TokenLogo symbol={b.tokenA} size={24} />
                          <span className={`text-xs font-bold ${b.winner === 'token_a' ? 'text-success' : 'text-white/40'}`}>
                            {b.tokenA}
                          </span>
                        </div>
                        <span className="text-white/20 text-xs">vs</span>
                        <div className="flex items-center gap-1">
                          <TokenLogo symbol={b.tokenB} size={24} />
                          <span className={`text-xs font-bold ${b.winner === 'token_b' ? 'text-danger' : 'text-white/40'}`}>
                            {b.tokenB}
                          </span>
                        </div>
                        <div className="ml-auto text-right">
                          <div className="text-xs font-bold text-white">
                            {(b.totalPool / LAMPORTS_PER_SOL).toFixed(2)} SOL
                          </div>
                          <div className="text-[10px] text-white/30">
                            {b.completedAt ? formatTimeAgo(b.completedAt) : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="p-3 space-y-2">
                  <div className="text-xs text-white/40 uppercase mb-2">Your Betting History</div>
                  {!publicKey ? (
                    <div className="text-center text-white/30 text-sm py-4">Connect wallet to view history</div>
                  ) : betHistory.length === 0 ? (
                    <div className="text-center text-white/30 text-sm py-4">No betting history yet</div>
                  ) : (
                    betHistory.map((bet) => (
                      <div
                        key={bet.battleId}
                        className="bg-white/5 rounded-lg p-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <TokenLogo symbol={bet.side === 'token_a' ? bet.tokenA : bet.tokenB} size={20} />
                            <span className={`text-xs font-bold ${bet.side === 'token_a' ? 'text-success' : 'text-danger'}`}>
                              {bet.side === 'token_a' ? bet.tokenA : bet.tokenB}
                            </span>
                          </div>
                          <div className={`text-xs font-bold ${
                            bet.status === 'won' ? 'text-success' :
                            bet.status === 'lost' ? 'text-danger' :
                            'text-warning'
                          }`}>
                            {bet.status === 'won' ? 'WON' : bet.status === 'lost' ? 'LOST' : 'PENDING'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-white/40">
                            Bet: {(bet.amountLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL
                          </span>
                          {bet.status === 'won' && (
                            <span className="text-success">
                              +{((bet.payoutLamports - bet.amountLamports) / LAMPORTS_PER_SOL).toFixed(2)} SOL
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Leaderboard Tab */}
              {activeTab === 'leaderboard' && (
                <div className="p-3">
                  <div className="text-xs text-white/40 uppercase mb-2">Top Winners</div>
                  {leaderboard.length === 0 ? (
                    <div className="text-center text-white/30 text-sm py-4">No leaderboard data</div>
                  ) : (
                    <div className="space-y-1">
                      {leaderboard.map((entry, index) => (
                        <div
                          key={entry.walletAddress}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            index < 3 ? 'bg-warning/10' : 'bg-white/5'
                          }`}
                        >
                          <div className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-300 text-black' :
                            index === 2 ? 'bg-amber-700 text-white' :
                            'bg-white/10 text-white/40'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono text-white truncate">
                              {formatWallet(entry.walletAddress)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-success">
                              +{(entry.totalWinnings / LAMPORTS_PER_SOL).toFixed(2)} SOL
                            </div>
                            <div className="text-[10px] text-white/30">
                              {entry.winRate.toFixed(0)}% WR
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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
