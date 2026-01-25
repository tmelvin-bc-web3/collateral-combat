'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { LiveBattle } from '@/types';
import { SpectatorView } from '@/components/SpectatorView';
import { PageLoading } from '@/components/ui/skeleton';
import { BACKEND_URL } from '@/config/api';
import { QuickBetStrip } from '@/components/spectate/QuickBetStrip';
import { WatchViewer } from '@/components/watch';
import {
  StandsHero,
  StandsTabs,
  FiltersBar,
  BattleCard,
  EmptyState,
  UpcomingBattles,
  ResultsSection,
  MyBetsSection,
  TopBettorsLeaderboard,
  HowItWorks,
  StandsTab,
  StandsStats,
  TierFilter,
  SortOption,
  LiveBattleData,
  UpcomingBattle,
  BattleResult,
  UserBet,
  BettingStats,
  BettorLeaderboardEntry,
  RecentResult,
  GameType,
} from '@/components/stands';

// Mock data for features not yet backed by API
const MOCK_STATS: StandsStats = {
  liveBattles: 0,
  spectatorsOnline: 12,
  totalWageredToday: 5.4,
  biggestWinToday: 1.2,
};

const MOCK_UPCOMING: UpcomingBattle[] = [];

const MOCK_RESULTS: BattleResult[] = [
  {
    id: '1',
    gameType: 'arena',
    tier: 'Raider',
    prizePool: 1.0,
    timeAgo: '2h ago',
    endedAt: Date.now() - 2 * 60 * 60 * 1000,
    winner: 'fighter1',
    fighter1: { name: 'DegenKing', pnl: 12.5 },
    fighter2: { name: 'SolWarrior', pnl: -8.2 },
    spectatorPool: 2.4,
    spectatorWinners: 8,
  },
  {
    id: '2',
    gameType: 'token-wars',
    tier: 'Warlord',
    prizePool: 2.0,
    timeAgo: '5h ago',
    endedAt: Date.now() - 5 * 60 * 60 * 1000,
    winner: 'fighter2',
    fighter1: { name: 'MemeHunter', pnl: 3.1 },
    fighter2: { name: 'CryptoChad', pnl: 18.7 },
    spectatorPool: 4.8,
    spectatorWinners: 12,
  },
];

const MOCK_USER_STATS: BettingStats = {
  totalBets: 0,
  winRate: 0,
  pnl: 0,
  biggestWin: 0,
};

const MOCK_TOP_BETTORS: BettorLeaderboardEntry[] = [
  { id: '1', wallet: 'abc123', name: 'WhaleWatcher', totalBets: 45, winRate: 62, profit: 12.5, isUser: false },
  { id: '2', wallet: 'def456', name: 'BetMaster', totalBets: 38, winRate: 58, profit: 8.2, isUser: false },
  { id: '3', wallet: 'ghi789', name: 'LuckyDegen', totalBets: 52, winRate: 55, profit: 6.8, isUser: false },
  { id: '4', wallet: 'jkl012', name: 'SharpShooter', totalBets: 29, winRate: 52, profit: 4.1, isUser: false },
  { id: '5', wallet: 'mno345', name: 'RiskTaker', totalBets: 67, winRate: 48, profit: 2.3, isUser: false },
];

// Map entry fee to tier name
function getTierFromEntryFee(entryFee?: number): string {
  if (!entryFee) return 'Raider';
  if (entryFee <= 0.1) return 'Scavenger';
  if (entryFee <= 0.5) return 'Raider';
  if (entryFee <= 1) return 'Warlord';
  return 'Immortan';
}

// Transform LiveBattle from API to our component format
function transformBattle(battle: LiveBattle): LiveBattleData {
  const player1 = battle.players?.[0];
  const player2 = battle.players?.[1];

  const player1Pnl = player1?.account?.totalPnlPercent || 0;
  const player2Pnl = player2?.account?.totalPnlPercent || 0;

  const total = battle.totalBetPool || 0;
  const player1Odds = battle.odds?.player1?.odds || 2;
  const player2Odds = battle.odds?.player2?.odds || 2;

  // Calculate pool percentages from odds (odds = total / pool for that side)
  // So pool = total / odds, percent = pool / total * 100 = 100 / odds
  const pool1Pct = player1Odds > 0 ? Math.min(100, 100 / player1Odds * (player1Odds / (player1Odds + player2Odds)) * 2) : 50;
  const pool2Pct = 100 - pool1Pct;

  const p1Winning = player1Pnl > player2Pnl;

  // Calculate end time
  const endTime = battle.startedAt ? battle.startedAt + (battle.config?.duration || 300) * 1000 : Date.now();
  const timeRemainingMs = Math.max(0, endTime - Date.now());

  return {
    id: battle.id,
    gameType: 'arena' as GameType,
    tier: getTierFromEntryFee(battle.config?.entryFee),
    prizePool: battle.prizePool || 0,
    timeRemaining: formatTimeRemaining(timeRemainingMs),
    timeRemainingMs,
    fighter1: {
      wallet: player1?.walletAddress || '',
      name: truncateAddress(player1?.walletAddress || ''),
      pnl: player1Pnl,
      isWinning: p1Winning,
      spectatorPercent: pool1Pct,
      spectatorOdds: player1Odds,
    },
    fighter2: {
      wallet: player2?.walletAddress || '',
      name: truncateAddress(player2?.walletAddress || ''),
      pnl: player2Pnl,
      isWinning: !p1Winning && player2Pnl !== player1Pnl,
      spectatorPercent: pool2Pct,
      spectatorOdds: player2Odds,
    },
    spectatorPool: total,
    spectators: battle.spectatorCount || 0,
    featured: battle.featured,
  };
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function truncateAddress(addr: string): string {
  if (!addr) return 'Unknown';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function SpectatePage() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<StandsTab>('live');
  const [liveBattles, setLiveBattles] = useState<LiveBattle[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<LiveBattle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('wagered');

  // User bets (mock for now)
  const [activeBets] = useState<UserBet[]>([]);
  const [betHistory] = useState<UserBet[]>([]);

  useEffect(() => {
    setMounted(true);
    const socket = getSocket();

    const fetchLiveBattles = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/battles/live`);
        if (res.ok) {
          const battles = await res.json();
          setLiveBattles(battles);
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };

    fetchLiveBattles();
    socket.emit('subscribe_live_battles');

    socket.on('live_battles', (battles) => {
      setLiveBattles(battles);
      setIsLoading(false);
    });

    socket.on('spectator_battle_update', (battle) => {
      setLiveBattles((prev) =>
        prev.map((b) => (b.id === battle.id ? battle : b))
      );
      if (selectedBattle?.id === battle.id) {
        setSelectedBattle(battle);
      }
    });

    // Socket provides real-time updates, only poll as a fallback every 30s
    const interval = setInterval(fetchLiveBattles, 30000);

    return () => {
      clearInterval(interval);
      socket.emit('unsubscribe_live_battles');
      socket.off('live_battles');
      socket.off('spectator_battle_update');
    };
  }, [selectedBattle?.id]);

  // Transform battles for display
  const transformedBattles = useMemo(() => {
    return liveBattles.map(transformBattle);
  }, [liveBattles]);

  // Filter and sort battles
  const filteredBattles = useMemo(() => {
    let result = [...transformedBattles];

    // Apply game filter
    if (gameFilter !== 'all') {
      result = result.filter((b) => b.gameType === gameFilter);
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      result = result.filter((b) =>
        b.tier.toLowerCase().includes(tierFilter.toLowerCase())
      );
    }

    // Apply sort
    switch (sortBy) {
      case 'wagered':
        result.sort((a, b) => b.spectatorPool - a.spectatorPool);
        break;
      case 'spectators':
        result.sort((a, b) => b.spectators - a.spectators);
        break;
      case 'ending':
        result.sort((a, b) => a.timeRemainingMs - b.timeRemainingMs);
        break;
      case 'recent':
        result.sort((a, b) => b.timeRemainingMs - a.timeRemainingMs);
        break;
    }

    return result;
  }, [transformedBattles, gameFilter, tierFilter, sortBy]);

  // Build stats
  const stats: StandsStats = useMemo(() => ({
    ...MOCK_STATS,
    liveBattles: liveBattles.length,
    spectatorsOnline: liveBattles.reduce((sum, b) => sum + (b.spectatorCount || 0), 0) + 12,
  }), [liveBattles]);

  // Recent results for empty state
  const recentResults: RecentResult[] = useMemo(() => {
    return MOCK_RESULTS.slice(0, 3).map((r) => ({
      id: r.id,
      winner: r.winner === 'fighter1' ? r.fighter1.name : r.fighter2.name,
      loser: r.winner === 'fighter1' ? r.fighter2.name : r.fighter1.name,
      timeAgo: r.timeAgo,
    }));
  }, []);

  const handleSelectBattle = useCallback((battle: LiveBattle) => {
    setSelectedBattle(battle);
    const socket = getSocket();
    socket.emit('spectate_battle', battle.id);
  }, []);

  const handleBackToList = useCallback(() => {
    if (selectedBattle) {
      const socket = getSocket();
      socket.emit('leave_spectate', selectedBattle.id);
    }
    setSelectedBattle(null);
  }, [selectedBattle]);

  const handleBet = useCallback((battleId: string, side: 'fighter1' | 'fighter2') => {
    // Find the original battle and select it for betting
    const battle = liveBattles.find((b) => b.id === battleId);
    if (battle) {
      handleSelectBattle(battle);
    }
  }, [liveBattles, handleSelectBattle]);

  const handleWatch = useCallback((battleId: string) => {
    const battle = liveBattles.find((b) => b.id === battleId);
    if (battle) {
      handleSelectBattle(battle);
    }
  }, [liveBattles, handleSelectBattle]);

  const handleSetReminder = useCallback((battleId: string) => {
    // TODO: Implement reminder functionality
    console.log('Set reminder for battle:', battleId);
  }, []);

  if (!mounted) {
    return <PageLoading message="Entering the stands..." />;
  }

  if (selectedBattle) {
    return (
      <>
        <SpectatorView
          battle={selectedBattle}
          onBack={handleBackToList}
          walletAddress={walletAddress}
        />
        <QuickBetStrip
          battle={selectedBattle}
          odds={selectedBattle.odds || null}
          walletAddress={walletAddress}
        />
      </>
    );
  }

  return (
    <>
      {/* Mobile: TikTok-style WatchViewer */}
      <div className="lg:hidden">
        <WatchViewer onSelectBattle={handleSelectBattle} />
      </div>

      {/* Desktop: Full spectate experience */}
      <div className="hidden lg:block w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-fadeIn overflow-x-hidden">
        {/* Hero Section */}
        <StandsHero stats={stats} />

        {/* Tabs */}
        <StandsTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          liveBattlesCount={liveBattles.length}
          upcomingCount={MOCK_UPCOMING.length}
          activeBetsCount={activeBets.length}
        />

        {/* Filters (only show on Live tab) */}
        {activeTab === 'live' && (
          <FiltersBar
            gameFilter={gameFilter}
            tierFilter={tierFilter}
            sortBy={sortBy}
            onGameFilterChange={setGameFilter}
            onTierFilterChange={setTierFilter}
            onSortChange={setSortBy}
          />
        )}

        {/* Content Area */}
        <div className="min-h-[300px] sm:min-h-[400px]">
          {activeTab === 'live' && (
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-64 sm:h-80 bg-[#1a1a1a] border border-white/[0.06] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredBattles.length === 0 ? (
                <EmptyState
                  recentResults={recentResults}
                  upcomingBattles={MOCK_UPCOMING}
                  onViewResults={() => setActiveTab('results')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {filteredBattles.map((battle) => (
                    <BattleCard
                      key={battle.id}
                      battle={battle}
                      onWatch={() => handleWatch(battle.id)}
                      onBet={(side) => handleBet(battle.id, side)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'upcoming' && (
            <UpcomingBattles
              battles={MOCK_UPCOMING}
              onSetReminder={handleSetReminder}
            />
          )}

          {activeTab === 'mybets' && (
            <MyBetsSection
              activeBets={activeBets}
              betHistory={betHistory}
              stats={MOCK_USER_STATS}
              isConnected={!!walletAddress}
              onWatchBattle={handleWatch}
              onViewLive={() => setActiveTab('live')}
            />
          )}

          {activeTab === 'results' && (
            <ResultsSection results={MOCK_RESULTS} />
          )}

          {activeTab === 'leaderboard' && (
            <TopBettorsLeaderboard
              topBettors={MOCK_TOP_BETTORS}
              userPosition={undefined}
              userStats={walletAddress ? MOCK_USER_STATS : undefined}
            />
          )}
        </div>

        {/* How It Works */}
        <HowItWorks />
      </div>
    </>
  );
}
