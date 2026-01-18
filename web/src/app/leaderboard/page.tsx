'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  YourProfileCard,
  RanksTabs,
  RanksFiltersBar,
  GlobalStatsBar,
  TopThreePodium,
  LeaderboardTable,
  ProgressionTab,
  RanksTab,
  TimeFilter,
  GameMode,
  RankCategory,
  UserRankStats,
  LeaderboardEntry,
  GlobalStats,
  RankTier,
  Achievement,
  getRankTierFromLevel,
  getRankNameFromLevel,
} from '@/components/ranks';
import { useProgressionContext } from '@/contexts/ProgressionContext';
import { useProfileContext } from '@/contexts/ProfileContext';

const ITEMS_PER_PAGE = 20;

// Mock data generators
function generateMockLeaderboard(multiplier: number, seed: number): LeaderboardEntry[] {
  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };

  const usernames = [
    'WarLord_Alpha', 'DegenKing99', 'CryptoNinja', 'SolanaSlayer', 'MoonHunter',
    'ApeBrain420', 'DiamondHands', 'WhaleTamer', 'RektRevenge', 'BullRunner',
    'FloorSweeper', 'GigaBrain', 'TokenHoarder', 'YieldFarmer', 'LiquidityKing',
    'AlphaCaller', 'BetaTester', 'GammaRays', 'DeltaForce', 'OmegaWolf',
    'SigmaGrind', 'ChainChamp', 'BlockBuster', 'HashHero', 'NodeNinja',
    'ValidatorVic', 'StakerSteve', 'MinterMike', 'HodlHank', 'SwapSam',
  ];

  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < 75; i++) {
    const baseWinRate = 80 - i * 0.5;
    const wins = Math.floor((20 + seededRandom(i) * 40) * multiplier);
    const losses = Math.floor(wins * (100 - baseWinRate) / baseWinRate);
    const profit = (30 - i * 0.35 + seededRandom(i + 100) * 10) * multiplier;
    // Level based on position - top players have higher levels
    const level = Math.max(1, Math.floor(100 - i * 1.2 + seededRandom(i + 200) * 15));

    // Get rank tier based on level (uses our new progression system)
    const rankTier = getRankTierFromLevel(level);
    const rankTitle = getRankNameFromLevel(level);

    entries.push({
      id: `player-${i}`,
      rank: i + 1,
      rankChange: Math.floor(seededRandom(i + 300) * 6) - 3,
      walletAddress: `${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`.toUpperCase(),
      username: usernames[i] || `Warrior${i + 1}`,
      level,
      rankTier,
      rankTitle,
      wins,
      losses,
      winRate: Math.round(baseWinRate * 10) / 10,
      profit: Math.round(profit * 100) / 100,
      avgPnl: Math.round((3 - i * 0.03 + seededRandom(i + 400) * 0.5) * 100) / 100,
      streak: seededRandom(i + 500) > 0.7 ? Math.floor(seededRandom(i + 600) * 8) : 0,
      isUser: false,
    });
  }

  return entries.sort((a, b) => b.profit - a.profit).map((e, i) => ({ ...e, rank: i + 1 }));
}

const MOCK_LEADERBOARDS: Record<TimeFilter, LeaderboardEntry[]> = {
  weekly: generateMockLeaderboard(0.25, 1),
  monthly: generateMockLeaderboard(0.5, 2),
  all: generateMockLeaderboard(1, 3),
};

const MOCK_GLOBAL_STATS: GlobalStats = {
  totalBattles: 2847,
  totalVolume: 15234,
  activeWarriors: 892,
  longestStreak: 12,
  biggestWin: 156.32,
};

const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: '1', name: 'First Blood', description: 'Win your first battle', icon: '⚔️', rarity: 'common', category: 'battles', unlocked: true, unlockedDate: '2 days ago', reward: '50 XP' },
  { id: '2', name: 'Triple Threat', description: 'Win 3 battles in a row', icon: '🔥', rarity: 'rare', category: 'streaks', unlocked: true, unlockedDate: '1 week ago', reward: '150 XP' },
  { id: '3', name: 'Whale Watcher', description: 'Win a battle worth 10+ SOL', icon: '🐋', rarity: 'epic', category: 'profit', unlocked: false, progress: 65, progressText: '6.5 / 10 SOL', reward: '300 XP' },
  { id: '4', name: 'Centurion', description: 'Win 100 battles', icon: '🏛️', rarity: 'legendary', category: 'wins', unlocked: false, progress: 47, progressText: '47 / 100', reward: '500 XP' },
];

export default function LeaderboardPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const walletAddress = publicKey?.toBase58();

  // Get real progression data
  const { progression, isLoading: progressionLoading } = useProgressionContext();
  const { ownProfile } = useProfileContext();

  // Tab state - check URL param for initial tab
  const initialTab = searchParams.get('tab') as RanksTab | null;
  const [activeTab, setActiveTab] = useState<RanksTab>(
    initialTab && ['leaderboard', 'progression', 'achievements', 'profile'].includes(initialTab)
      ? initialTab
      : 'leaderboard'
  );

  // Filter states
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [gameMode, setGameMode] = useState<GameMode>('all');
  const [category, setCategory] = useState<RankCategory>('profit');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // User stats from real progression data
  const userStats: UserRankStats | null = useMemo(() => {
    if (!connected || !walletAddress) return null;

    // Get data from progression context (uses API types)
    const currentLevel = progression?.currentLevel || 1;
    const xpProgress = progression?.xpProgress || 0;
    const xpToNextLevel = progression?.xpToNextLevel || 100;

    // Get rank from level
    const rankTier = getRankTierFromLevel(currentLevel);
    const rankTitle = progression?.title || getRankNameFromLevel(currentLevel);

    // Get avatar URL based on profile type
    const avatarUrl = ownProfile?.pfpType === 'nft' ? ownProfile.nftImageUrl : undefined;

    return {
      walletAddress,
      username: ownProfile?.username,
      avatar: avatarUrl,
      level: currentLevel,
      xp: Math.round(xpProgress * xpToNextLevel / 100), // Approx XP in current level
      xpToNext: xpToNextLevel,
      xpPercent: xpProgress,
      rankTier,
      rankTitle,
      globalRank: 127, // Would come from leaderboard API
      rankChange: 0, // Would come from leaderboard API
      winRate: 0, // Would come from battle stats API
      totalPnL: 0, // Would come from battle stats API
      streak: 0, // Would come from battle stats API
      wins: 0, // Would come from battle stats API
      losses: 0, // Would come from battle stats API
      totalBattles: 0, // Would come from battle stats API
      recentAchievements: MOCK_ACHIEVEMENTS.filter(a => a.unlocked),
      totalAchievements: 8,
    };
  }, [connected, walletAddress, progression, ownProfile]);

  // Filter and sort leaderboard
  const filteredLeaderboard = useMemo(() => {
    let entries = [...MOCK_LEADERBOARDS[timeFilter]];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.username.toLowerCase().includes(query) ||
          e.walletAddress.toLowerCase().includes(query)
      );
    }

    // Mark user's entry
    if (walletAddress) {
      entries = entries.map((e) => ({
        ...e,
        isUser: e.walletAddress === walletAddress,
      }));
    }

    // Sort by category
    switch (category) {
      case 'profit':
        entries.sort((a, b) => b.profit - a.profit);
        break;
      case 'winrate':
        entries.sort((a, b) => b.winRate - a.winRate);
        break;
      case 'streak':
        entries.sort((a, b) => b.streak - a.streak);
        break;
      case 'battles':
        entries.sort((a, b) => b.wins - a.wins);
        break;
      case 'volume':
        entries.sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
        break;
      case 'roi':
        entries.sort((a, b) => b.avgPnl - a.avgPnl);
        break;
    }

    // Re-assign ranks after sorting
    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [timeFilter, searchQuery, category, walletAddress]);

  // Pagination
  const totalPages = Math.ceil(filteredLeaderboard.length / ITEMS_PER_PAGE);
  const paginatedLeaderboard = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeaderboard.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLeaderboard, currentPage]);

  // Top 3 for podium (only on first page without search)
  const showPodium = !searchQuery.trim() && currentPage === 1 && activeTab === 'leaderboard';
  const top3 = showPodium ? paginatedLeaderboard.slice(0, 3) : [];
  const tableEntries = showPodium ? paginatedLeaderboard.slice(3) : paginatedLeaderboard;

  // Handlers
  const handleTimeFilterChange = useCallback((filter: TimeFilter) => {
    setIsTransitioning(true);
    setTimeFilter(filter);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((cat: RankCategory) => {
    setCategory(cat);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;
    setIsTransitioning(true);
    setCurrentPage(page);
  }, [totalPages]);

  const handleChallenge = useCallback((player: LeaderboardEntry) => {
    // Navigate to battle page with challenge context
    router.push(`/battle?challenge=${player.walletAddress}`);
  }, [router]);

  // Reset transition state
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  // Find user position if not in current view
  const userPosition = useMemo(() => {
    const userIndex = filteredLeaderboard.findIndex((e) => e.isUser);
    return userIndex >= 0 ? userIndex + 1 : undefined;
  }, [filteredLeaderboard]);

  return (
    <div className="max-w-6xl mx-auto px-4 animate-fadeIn">
      {/* Hero Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30 text-warning text-sm font-bold uppercase tracking-wider mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Greatest Warriors
        </div>
        <h1
          className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2"
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          HALL OF <span className="text-warning">WARLORDS</span>
        </h1>
        <p className="text-white/50 max-w-xl mx-auto">
          The deadliest degens in the wasteland. Legends forged in fire and blood.
        </p>
      </div>

      {/* Your Profile Card */}
      <YourProfileCard stats={userStats} isLoading={progressionLoading && connected} />

      {/* Tabs */}
      <RanksTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        newAchievements={2}
      />

      {/* Content based on active tab */}
      {activeTab === 'leaderboard' && (
        <>
          {/* Filters */}
          <RanksFiltersBar
            gameMode={gameMode}
            timeFilter={timeFilter}
            category={category}
            searchQuery={searchQuery}
            onGameModeChange={setGameMode}
            onTimeFilterChange={handleTimeFilterChange}
            onCategoryChange={handleCategoryChange}
            onSearchChange={handleSearchChange}
          />

          {/* Global Stats */}
          <GlobalStatsBar stats={MOCK_GLOBAL_STATS} />

          {/* Top 3 Podium */}
          {showPodium && top3.length >= 3 && (
            <TopThreePodium leaders={top3} onChallenge={handleChallenge} />
          )}

          {/* Leaderboard Table */}
          <div className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
            <LeaderboardTable
              entries={tableEntries}
              userPosition={userPosition}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onChallenge={handleChallenge}
            />
          </div>

          {/* Results Info */}
          {filteredLeaderboard.length > 0 && (
            <div className="text-center mt-4 text-sm text-white/40">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeaderboard.length)} of{' '}
              {filteredLeaderboard.length} warriors
            </div>
          )}

          {/* No Results */}
          {filteredLeaderboard.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-warning/10 flex items-center justify-center border border-warning/30">
                <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-bold mb-1 uppercase">No Warriors Found</h3>
              <p className="text-white/50 text-sm">No warriors match &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'progression' && (
        <ProgressionTab userStats={userStats} />
      )}

      {activeTab === 'achievements' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-warning/10 flex items-center justify-center border border-warning/30">
            <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-bold mb-1 uppercase">Achievements Coming Soon</h3>
          <p className="text-white/50 text-sm">
            Track your accomplishments and earn rewards. Stay tuned!
          </p>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="text-center py-12">
          {connected ? (
            <>
              <p className="text-white/50 mb-4">View your full profile with detailed statistics.</p>
              <button
                onClick={() => router.push(`/profile/${walletAddress}`)}
                className="px-6 py-3 bg-warning hover:bg-warning/90 text-black font-semibold rounded-lg transition-colors"
              >
                Go to My Profile
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-white/10 flex items-center justify-center border border-white/[0.06]">
                <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-bold mb-1 uppercase">Connect Wallet</h3>
              <p className="text-white/50 text-sm">Connect your wallet to view your profile</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
