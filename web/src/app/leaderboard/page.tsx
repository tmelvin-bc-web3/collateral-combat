'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import {
  RanksFiltersBar,
  GlobalStatsBar,
  TopThreePodium,
  LeaderboardTable,
  TimeFilter,
  GameMode,
  RankCategory,
  LeaderboardEntry,
  GlobalStats,
} from '@/components/ranks';
import { useProfileContext } from '@/contexts/ProfileContext';
import { BACKEND_URL } from '@/config/api';
import type { DrTier } from '@/components/profile';

const ITEMS_PER_PAGE = 20;

// ──────────────────────────────────────────────────────────
// Toggle this to false to switch back to real API data
const USE_MOCK_DATA = true;
// ──────────────────────────────────────────────────────────

// Mock data helpers
const MOCK_WALLETS = [
  'DGNx7v8K3P2tMBqAVFEJkR5mNQhz8osR1wpnFQo4pump',
  'Ay1U9DWphDgc7hq58Yj1yHabt91zTzvV2YJbAWkPNbaK',
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  'BRjpCHtyQLeSXwZuGERQBVQyNFT8hzmPAHbEZGPP7KGj',
  'E3g1MBL4p6P7MmbFBAWP6B2tQJK2AP3X6EJ8fTnKY5Xd',
  'FPn9eZZLAMpkhgLvMsqNE6wVfJTSnYBu5nMCHv6d7Dnk',
  'GHj2qJp8VF7b8DHKvQiZdwHzRvCHfb5NR3nqXDwkUeYF',
  'JKl3rMn9XG8c9EIKwSiAeIzStDCHgc6OR4oYZFxVfZGk',
  'LMn4tOp0YH9d0FJLxTjBfJATuEDIhd7PS5pZaGyWgHLn',
  'NPq5uQr1ZI0e1GKMyUkCgKBUvFEJie8QT6qaHzXhINo',
  'QRs6vSt2AJ1f2HLNzVlDhLCVwGFKjf9RU7rbIAYiJPr',
  'STu7wUv3BK2g3IMOaWmEiMDWxHGLkg0SV8scJBZjKQu',
  'UVw8xWx4CL3h4JNPbXnFjNEXyIHMlh1TW9tdKCAkLRx',
  'WXy9zYz5DM4i5KOQcYoGkOFZzJINmi2UX0ueLC8lMSA',
  'YZa0ABa6EN5j6LPRdZpHlPGAaKJOni3VY1vfMD9mNTD',
  '0Bc1CDc7FO6k7MQSe0qImpHBbLKPoj4WZ2wgNEAnOUG',
  '2De2EFe8GP7l8NRTf1rJnqICcMLQpk5X03xhOFBoQVJ',
  '4Fg3GHg9HQ8m9OSUg2sKorJDdNMRql6Y14yiPGCpRWM',
  '6Hi4IJi0IR9n0PTVh3tLpsKEeONSrm7Z25zjQHDqSXP',
  '8Jk5KLk1JS0o1QUWi4uMqtLFfPOTsn8026AkRIErTYS',
  'ALm6MNm2KT1p2RVXj5vNruMGgQPUto9137BlSJFsTZV',
  'CNn7OPo3LU2q3SWYk6wOsvNHhRQVup0248CmTKGtU0Y',
  'EPp8QRq4MV3r4TXZl7xPtwOIiSRWvq1359DnULHuV1b',
];

const MOCK_NAMES = [
  'SolMaxi', 'DumpETH', 'MoonBoy', 'PaperHandsPete', 'DiamondDegen',
  'RugPullRick', 'WhaleWatch', 'ApeInAndy', 'YieldFarmer', 'GasGuzzler',
  'BagHolder', 'FlipMaster', 'LiquidLarry', 'PumpItPaul', 'DegenDave',
  'TokenTina', 'SwapSally', 'StakeSteve', 'MintMike', 'BurnBetty',
  'HodlHank', 'FOMOFred', 'JeetJenny', 'AlphaAlex', 'SniperSam',
];

const MOCK_TIERS: { tier: DrTier; drRange: [number, number] }[] = [
  { tier: 'the_apex', drRange: [2700, 3200] },
  { tier: 'apex_elite', drRange: [2500, 2800] },
  { tier: 'apex_predator', drRange: [2350, 2600] },
  { tier: 'apex_contender', drRange: [2300, 2450] },
  { tier: 'oracle', drRange: [2000, 2299] },
  { tier: 'market_maker', drRange: [1700, 1999] },
  { tier: 'whale', drRange: [1400, 1699] },
  { tier: 'degen', drRange: [1100, 1399] },
  { tier: 'retail', drRange: [800, 1099] },
  { tier: 'paper_hands', drRange: [500, 799] },
  { tier: 'liquidated', drRange: [0, 499] },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateMockLeaderboard(count: number): { entries: LeaderboardEntry[]; stats: GlobalStats } {
  const rand = seededRandom(42);
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < count; i++) {
    // Higher-ranked players get better tiers
    const tierIndex = Math.min(
      Math.floor((i / count) * MOCK_TIERS.length),
      MOCK_TIERS.length - 1
    );
    const { tier, drRange } = MOCK_TIERS[tierIndex];
    const dr = Math.round(drRange[1] - rand() * (drRange[1] - drRange[0]));
    const division = Math.floor(rand() * 4) + 1;
    const wins = Math.round(20 + rand() * 200);
    const losses = Math.round(10 + rand() * 150);
    const totalBattles = wins + losses;
    const winRate = Math.round((wins / totalBattles) * 1000) / 10;
    const streak = rand() > 0.6 ? Math.round(rand() * 12) : 0;
    const profit = (rand() - 0.3) * 50;

    entries.push({
      id: MOCK_WALLETS[i % MOCK_WALLETS.length],
      rank: i + 1,
      rankChange: Math.round((rand() - 0.5) * 6),
      walletAddress: MOCK_WALLETS[i % MOCK_WALLETS.length],
      username: MOCK_NAMES[i % MOCK_NAMES.length],
      wins,
      losses,
      winRate,
      profit: Math.round(profit * 100) / 100,
      avgPnl: Math.round((profit / totalBattles) * 100) / 100,
      streak,
      isUser: false,
      dr,
      tier,
      division,
      isApex: tier.startsWith('apex') || tier === 'the_apex',
      isPlacement: false,
    });
  }

  // Sort by DR descending and re-assign ranks
  entries.sort((a, b) => (b.dr || 0) - (a.dr || 0));
  entries.forEach((e, i) => (e.rank = i + 1));

  const stats: GlobalStats = {
    totalBattles: 12847,
    totalVolume: 45230,
    activeWarriors: count,
    longestStreak: 17,
    biggestWin: 48.5,
  };

  return { entries, stats };
}

// API response types
interface LeaderboardApiEntry {
  rank: number;
  wallet: string;
  dr: number;
  tier: DrTier;
  division: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  isPlacement: boolean;
  peakDr: number;
  currentStreak: number;
}

interface LeaderboardApiResponse {
  entries: LeaderboardApiEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface GlobalStatsApiResponse {
  totalPlayers: number;
  avgDr: number;
  maxDr: number;
  totalMatches: number;
  totalWins: number;
}

export default function LeaderboardPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const walletAddress = publicKey?.toBase58();

  const { ownProfile } = useProfileContext();

  // Filter states
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [gameMode, setGameMode] = useState<GameMode>('all');
  const [category, setCategory] = useState<RankCategory>('dr');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Data
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalBattles: 0,
    totalVolume: 0,
    activeWarriors: 0,
    longestStreak: 0,
    biggestWin: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data (or use mock data)
  useEffect(() => {
    if (USE_MOCK_DATA) {
      const { entries, stats } = generateMockLeaderboard(25);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const page = entries.slice(offset, offset + ITEMS_PER_PAGE);
      setLeaderboardData(page);
      setTotalPlayers(entries.length);
      setGlobalStats(stats);
      setIsLoading(false);
      return;
    }

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const [leaderboardRes, statsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/rating/leaderboard?limit=${ITEMS_PER_PAGE}&offset=${offset}`),
          fetch(`${BACKEND_URL}/api/rating/stats`),
        ]);

        if (leaderboardRes.ok) {
          const data: LeaderboardApiResponse = await leaderboardRes.json();
          const entries: LeaderboardEntry[] = data.entries.map((entry, index) => {
            const totalBattles = entry.wins + entry.losses;
            const winRate = totalBattles > 0 ? (entry.wins / totalBattles) * 100 : 0;

            return {
              id: entry.wallet,
              rank: entry.rank,
              rankChange: 0,
              walletAddress: entry.wallet,
              username: `${entry.wallet.slice(0, 4)}...${entry.wallet.slice(-4)}`,
              wins: entry.wins,
              losses: entry.losses,
              winRate: Math.round(winRate * 10) / 10,
              profit: 0, // Would need separate API for profit data
              avgPnl: 0,
              streak: entry.currentStreak > 0 ? entry.currentStreak : 0,
              isUser: walletAddress === entry.wallet,
              dr: entry.dr,
              tier: entry.tier,
              division: entry.division,
              isApex: entry.tier.startsWith('apex') || entry.tier === 'the_apex',
              isPlacement: entry.isPlacement,
            };
          });

          setLeaderboardData(entries);
          setTotalPlayers(data.total);
        } else {
          setError('Failed to load leaderboard');
        }

        if (statsRes.ok) {
          const statsData: GlobalStatsApiResponse = await statsRes.json();
          setGlobalStats({
            totalBattles: statsData.totalMatches,
            totalVolume: 0,
            activeWarriors: statsData.totalPlayers,
            longestStreak: 0,
            biggestWin: 0,
          });
        }
      } catch (err) {
        console.error('[Leaderboard] Failed to fetch data:', err);
        setError('Failed to connect to server');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPage, walletAddress]);

  // Filter and sort leaderboard (client-side for search/sort)
  const filteredLeaderboard = useMemo(() => {
    let entries = [...leaderboardData];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.username.toLowerCase().includes(query) ||
          e.walletAddress.toLowerCase().includes(query)
      );
    }

    // Sort by category (DR is default from API, apply client sort for other categories)
    switch (category) {
      case 'dr':
        entries.sort((a, b) => (b.dr || 0) - (a.dr || 0));
        break;
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
  }, [leaderboardData, searchQuery, category]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalPlayers / ITEMS_PER_PAGE));

  // Top 3 for podium (only on first page without search)
  const showPodium = !searchQuery.trim() && currentPage === 1 && category === 'dr';
  const top3 = showPodium ? filteredLeaderboard.slice(0, 3) : [];
  const tableEntries = showPodium ? filteredLeaderboard.slice(3) : filteredLeaderboard;

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
      <GlobalStatsBar stats={globalStats} />

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-danger/10 flex items-center justify-center border border-danger/30">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="font-bold mb-1 uppercase text-danger">Connection Error</h3>
          <p className="text-white/50 text-sm">{error}</p>
        </div>
      )}

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
          isLoading={isLoading}
        />
      </div>

      {/* Results Info */}
      {filteredLeaderboard.length > 0 && (
        <div className="text-center mt-4 text-sm text-white/40">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
          {Math.min(currentPage * ITEMS_PER_PAGE, totalPlayers)} of{' '}
          {totalPlayers} warriors
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredLeaderboard.length === 0 && searchQuery && (
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
    </div>
  );
}
