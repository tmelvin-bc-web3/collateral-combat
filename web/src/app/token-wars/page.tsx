'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';
import { PageLoading } from '@/components/ui/skeleton';
import { useSessionBetting } from '@/hooks/useSessionBetting';
import { getTokenLogo, getTokenConfig } from '@/config/tokenLogos';

// Import new components
import {
  TokenWarsHeader,
  TokenCard,
  BettingBar,
  BottomSections,
  ResultOverlay,
  TWBattle,
  TWBattleState,
  TWBet,
  TWConfig,
  TWPhase,
  TWBetSide,
  TokenInfo,
  RecentBattle,
  LiveBet,
  UpcomingMatchup,
  BetHistory,
  LeaderboardEntry,
  PlayerStats,
  LAMPORTS_PER_SOL,
  BET_AMOUNTS,
} from '@/components/token-wars';

// Info tab type
type InfoTab = 'recent' | 'history' | 'leaderboard';

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

  // Live bets feed
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);

  // Upcoming matchups
  const [upcomingMatchups, setUpcomingMatchups] = useState<UpcomingMatchup[]>([]);

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

  // Fetch upcoming matchups
  const fetchUpcomingMatchups = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/token-wars/upcoming?count=1`);
      if (res.ok) {
        const data = await res.json();
        // Transform backend TokenInfo to UpcomingMatchup format with logos
        const matchups: UpcomingMatchup[] = data.map((m: { tokenA: TokenInfo; tokenB: TokenInfo }, i: number) => ({
          tokenA: { symbol: m.tokenA.symbol, logo: getTokenLogo(m.tokenA.symbol) },
          tokenB: { symbol: m.tokenB.symbol, logo: getTokenLogo(m.tokenB.symbol) },
          startsIn: 6, // Approximate timing: 1min bet + 5min battle
        }));
        setUpcomingMatchups(matchups);
      }
    } catch (e) {
      console.error('Failed to fetch upcoming matchups:', e);
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
    fetchUpcomingMatchups();

    const interval = setInterval(() => {
      fetchRecentBattles();
      fetchUpcomingMatchups();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchRecentBattles, fetchLeaderboard, fetchUpcomingMatchups]);

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
          setLiveBets([]);
          fetchUpcomingMatchups();
          break;

        case 'bet_placed':
          fetchBattleState();
          // Add to live bets feed
          if (event.data) {
            const newBet: LiveBet = {
              id: `${Date.now()}-${Math.random()}`,
              user: event.data.wallet || 'Anonymous',
              token: event.data.side,
              tokenSymbol: event.data.side === 'token_a'
                ? battleState?.battle.tokenA || 'A'
                : battleState?.battle.tokenB || 'B',
              amount: (event.data.amount || 0) / LAMPORTS_PER_SOL,
              timestamp: Date.now(),
            };
            setLiveBets(prev => [newBet, ...prev.slice(0, 9)]);
          }
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
          fetchRecentBattles();
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
  }, [fetchBattleState, fetchMyBet, fetchBalance, fetchRecentBattles, fetchUpcomingMatchups]);

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

    const FREE_BET_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL
    const amountLamports = useFreeBet ? FREE_BET_AMOUNT_LAMPORTS : Math.floor(selectedAmount * LAMPORTS_PER_SOL);

    if (!useFreeBet) {
      if (balanceInSol < selectedAmount) {
        setError(`Insufficient balance. Need ${selectedAmount} SOL`);
        setShowDepositModal(true);
        return;
      }
    } else {
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

  // Calculate potential winnings
  const getPotentialWin = (side: TWBetSide): number => {
    if (!battleState || !battle) return selectedAmount * 2;
    const totalPool = (battle.totalBetsTokenA || 0) + (battle.totalBetsTokenB || 0);
    if (totalPool === 0) return selectedAmount * 2;

    const myPool = side === 'token_a' ? (battle.totalBetsTokenA || 0) : (battle.totalBetsTokenB || 0);
    const amountLamports = selectedAmount * LAMPORTS_PER_SOL;

    if (myPool + amountLamports === 0) return selectedAmount * 2;
    const rake = 0.05;
    const distributablePool = (totalPool + amountLamports) * (1 - rake);
    const share = amountLamports / (myPool + amountLamports);
    return (distributablePool * share) / LAMPORTS_PER_SOL;
  };

  // Calculate multiplier
  const getMultiplier = (side: TWBetSide): number => {
    if (!battle) return 2;
    const totalPool = (battle.totalBetsTokenA || 0) + (battle.totalBetsTokenB || 0);
    if (totalPool === 0) return 2;
    const myPool = side === 'token_a' ? (battle.totalBetsTokenA || 0) : (battle.totalBetsTokenB || 0);
    if (myPool === 0) return 2;
    return (totalPool * 0.95) / myPool;
  };

  if (!mounted) {
    return <PageLoading message="Loading Token Wars..." />;
  }

  const phase = battleState?.phase || 'betting';
  const canBet = phase === 'betting' && !myBet && !isPlacingBet;
  const battle = battleState?.battle;

  // Determine if a token is leading during battle
  const tokenAChange = battleState?.tokenAChangeNow ?? 0;
  const tokenBChange = battleState?.tokenBChangeNow ?? 0;
  const tokenALeading = phase === 'in_progress' && tokenAChange > tokenBChange;
  const tokenBLeading = phase === 'in_progress' && tokenBChange > tokenAChange;

  // Total pool for display
  const totalPool = battle ? ((battle.totalBetsTokenA || 0) + (battle.totalBetsTokenB || 0)) : 0;
  const tokenAPoolPercent = totalPool > 0 ? ((battle?.totalBetsTokenA || 0) / totalPool) * 100 : 50;
  const tokenBPoolPercent = totalPool > 0 ? ((battle?.totalBetsTokenB || 0) / totalPool) * 100 : 50;

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
      {/* Result Overlay */}
      <ResultOverlay
        show={showResultAnimation && lastWinner !== null && lastWinner !== 'tie' && !!battle}
        winner={lastWinner}
        winnerSymbol={lastWinner === 'token_a' ? (battle?.tokenA || '') : (battle?.tokenB || '')}
        winnerChange={lastWinner === 'token_a' ? (battle?.tokenAPercentChange || 0) : (battle?.tokenBPercentChange || 0)}
        loserSymbol={lastWinner === 'token_a' ? (battle?.tokenB || '') : (battle?.tokenA || '')}
        loserChange={lastWinner === 'token_a' ? (battle?.tokenBPercentChange || 0) : (battle?.tokenAPercentChange || 0)}
        userBetSide={myBet?.side || null}
        userBetAmount={myBet?.amountLamports || 0}
        userPayout={myBet?.payoutLamports || 0}
        nextBattleIn={timeRemaining}
      />

      {/* Header */}
      <TokenWarsHeader
        phase={phase}
        timeRemaining={timeRemaining}
        totalPool={totalPool}
        battlesToday={34}
        betsThisBattle={battle?.totalBettors || 0}
      />

      {/* Battle Arena */}
      {battle ? (
        <>
          <div className="flex items-stretch gap-4 mb-6">
            {/* Token A Card */}
            <TokenCard
              symbol={battle.tokenA}
              name={getTokenName(battle.tokenA)}
              side="token_a"
              price={battleState?.tokenAPriceNow ?? null}
              change={battleState?.tokenAChangeNow ?? null}
              pool={battle.totalBetsTokenA || 0}
              poolPercent={tokenAPoolPercent}
              multiplier={getMultiplier('token_a')}
              betCount={0}
              phase={phase}
              isLeading={tokenALeading}
              isWinner={phase === 'completed' && battle.winner === 'token_a'}
              userBetAmount={myBet?.side === 'token_a' ? myBet.amountLamports : null}
              potentialWin={getPotentialWin('token_a')}
              canBet={canBet}
              onPlaceBet={() => handlePlaceBet('token_a')}
            />

            {/* VS Section */}
            <div className="flex flex-col items-center justify-center px-4">
              <div className="w-16 h-16 flex items-center justify-center bg-[#1a1a1a] border-2 border-white/10 rounded-full mb-3">
                <span className="text-xl font-black text-white/40" style={{ fontFamily: 'Impact, sans-serif' }}>
                  VS
                </span>
              </div>
              <div className="text-center">
                <div className="text-xs text-white/40">5 min battle</div>
                <div className="text-sm font-semibold text-warning">
                  {(totalPool / LAMPORTS_PER_SOL).toFixed(2)} SOL
                </div>
              </div>
            </div>

            {/* Token B Card */}
            <TokenCard
              symbol={battle.tokenB}
              name={getTokenName(battle.tokenB)}
              side="token_b"
              price={battleState?.tokenBPriceNow ?? null}
              change={battleState?.tokenBChangeNow ?? null}
              pool={battle.totalBetsTokenB || 0}
              poolPercent={tokenBPoolPercent}
              multiplier={getMultiplier('token_b')}
              betCount={0}
              phase={phase}
              isLeading={tokenBLeading}
              isWinner={phase === 'completed' && battle.winner === 'token_b'}
              userBetAmount={myBet?.side === 'token_b' ? myBet.amountLamports : null}
              potentialWin={getPotentialWin('token_b')}
              canBet={canBet}
              onPlaceBet={() => handlePlaceBet('token_b')}
            />
          </div>

          {/* Betting Bar */}
          <BettingBar
            phase={phase}
            selectedAmount={selectedAmount}
            onAmountChange={setSelectedAmount}
            freeBetCount={freeBetBalance}
            useFreeBet={useFreeBet}
            onFreeBetToggle={() => setUseFreeBet(!useFreeBet)}
            isPlacingBet={isPlacingBet}
            hasBet={!!myBet}
          />

          {/* Progress Bar during battle */}
          {phase === 'in_progress' && (
            <div className="mb-6">
              <div className="h-3 bg-white/5 rounded-full overflow-hidden flex">
                <div
                  className="bg-success transition-all duration-500"
                  style={{ width: `${tokenAChange >= 0 ? Math.min(100, (tokenAChange / (Math.abs(tokenAChange) + Math.abs(tokenBChange) + 0.001)) * 100) : 0}%` }}
                />
                <div
                  className="bg-danger transition-all duration-500"
                  style={{ width: `${tokenBChange >= 0 ? Math.min(100, (tokenBChange / (Math.abs(tokenAChange) + Math.abs(tokenBChange) + 0.001)) * 100) : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>{battle.tokenA}: {tokenAChange >= 0 ? '+' : ''}{tokenAChange.toFixed(3)}%</span>
                <span>{battle.tokenB}: {tokenBChange >= 0 ? '+' : ''}{tokenBChange.toFixed(3)}%</span>
              </div>
            </div>
          )}

          {/* Bottom Sections */}
          <BottomSections
            liveBets={liveBets}
            recentBattles={recentBattles}
            upcomingMatchups={upcomingMatchups}
            betsThisBattle={battle.totalBettors || 0}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-2xl font-bold text-white/40 mb-2">Waiting for next battle...</div>
            <div className="text-white/20">New battles start every few minutes</div>
          </div>
        </div>
      )}

      {/* Balance Bar */}
      {publicKey && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-white/40 uppercase">Balance:</span>
                <span className="text-white font-bold ml-2">{balanceInSol.toFixed(4)} SOL</span>
              </div>
              {playerStats && (
                <>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="text-sm">
                    <span className="text-white/40">Win Rate: </span>
                    <span className={playerStats.winRate >= 50 ? 'text-success' : 'text-danger'}>
                      {playerStats.winRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white/40">P&L: </span>
                    <span className={playerStats.netProfit >= 0 ? 'text-success' : 'text-danger'}>
                      {playerStats.netProfit >= 0 ? '+' : ''}{(playerStats.netProfit / LAMPORTS_PER_SOL).toFixed(2)} SOL
                    </span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowDepositModal(true)}
              className="px-4 py-2 rounded-lg bg-warning text-black text-sm font-bold hover:bg-warning/90 transition-colors"
            >
              Deposit
            </button>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-danger/90 text-white font-medium shadow-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-success/90 text-white font-medium shadow-lg">
          {success}
        </div>
      )}

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

      {/* Add padding for bottom bar */}
      {publicKey && <div className="h-16" />}

      <style jsx global>{`
        @keyframes winner-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 60px rgba(34, 197, 94, 0.5); }
        }

        @keyframes winner-bounce {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.1); }
        }

        @keyframes winner-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes result-appear {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes slide-in {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        .animate-winner-glow {
          animation: winner-glow 1s ease-in-out infinite;
        }

        .animate-winner-bounce {
          animation: winner-bounce 0.5s ease-in-out infinite;
        }

        .animate-winner-pulse {
          animation: winner-pulse 1s ease-in-out infinite;
        }

        .animate-result-appear {
          animation: result-appear 0.3s ease-out;
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
