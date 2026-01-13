'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/utils';
import { LevelBadge } from '@/components/progression/LevelBadge';
import { getCachedProfile, setCachedProfile } from '@/lib/profileStorage';
import { PageLoading } from '@/components/ui/skeleton';
import { UserProfile, UserProgression, UserStreak, RakeRebate, RebateSummary } from '@/types';
import Link from 'next/link';

// User stats from the backend
interface UserStats {
  walletAddress: string;
  totalWagers: number;
  totalWins: number;
  totalLosses: number;
  totalPushes: number;
  totalWagered: number;
  totalProfitLoss: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
  lastWagerAt: number | null;
}

// Wager history item
interface UserWager {
  id: number;
  walletAddress: string;
  wagerType: 'spectator' | 'prediction' | 'battle' | 'draft';
  amount: number;
  outcome: 'won' | 'lost' | 'push' | 'cancelled';
  profitLoss: number;
  gameId?: string;
  createdAt: number;
}

// Rank data from backend
interface UserRankData {
  walletAddress: string;
  rank: number | null;
  totalProfitLoss: number;
  totalWagers: number;
}

// Level tier data
const LEVEL_TIERS = [
  { minLevel: 1, maxLevel: 5, title: 'Rookie', color: 'text-gray-400' },
  { minLevel: 6, maxLevel: 10, title: 'Contender', color: 'text-green-400' },
  { minLevel: 11, maxLevel: 20, title: 'Warrior', color: 'text-blue-400' },
  { minLevel: 21, maxLevel: 35, title: 'Veteran', color: 'text-red-400' },
  { minLevel: 36, maxLevel: 50, title: 'Champion', color: 'text-cyan-400' },
  { minLevel: 51, maxLevel: 75, title: 'Legend', color: 'text-amber-400' },
  { minLevel: 76, maxLevel: 100, title: 'Mythic', color: 'text-violet-400' },
];

function getTierForLevel(level: number): { title: string; color: string } {
  const tier = LEVEL_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel);
  return tier || { title: 'Rookie', color: 'text-gray-400' };
}

// Format wallet address
function formatWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format date
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get wager type icon and color
function getWagerTypeInfo(type: string): { icon: React.ReactNode; color: string; label: string } {
  switch (type) {
    case 'prediction':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        ),
        color: 'text-amber-400',
        label: 'Oracle',
      };
    case 'battle':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        color: 'text-red-400',
        label: 'Battle',
      };
    case 'spectator':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
        color: 'text-blue-400',
        label: 'Spectate',
      };
    case 'draft':
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
        color: 'text-purple-400',
        label: 'Draft',
      };
    default:
      return {
        icon: null,
        color: 'text-text-tertiary',
        label: type,
      };
  }
}

// Get outcome badge
function getOutcomeBadge(outcome: string): { text: string; color: string; bg: string } {
  switch (outcome) {
    case 'won':
      return { text: 'WON', color: 'text-success', bg: 'bg-success/20 border-success/30' };
    case 'lost':
      return { text: 'LOST', color: 'text-danger', bg: 'bg-danger/20 border-danger/30' };
    case 'push':
      return { text: 'PUSH', color: 'text-warning', bg: 'bg-warning/20 border-warning/30' };
    case 'cancelled':
      return { text: 'CANCELLED', color: 'text-text-tertiary', bg: 'bg-bg-tertiary border-border-primary' };
    default:
      return { text: outcome.toUpperCase(), color: 'text-text-tertiary', bg: 'bg-bg-tertiary border-border-primary' };
  }
}

// Avatar component
function ProfileAvatar({ profile, size = 'lg' }: { profile: UserProfile | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  if (profile?.pfpType === 'nft' && profile.nftImageUrl) {
    return (
      <div className={cn('rounded-full overflow-hidden border-4 border-accent/30', sizeClasses[size])}>
        <img src={profile.nftImageUrl} alt="Profile" className="w-full h-full object-cover" />
      </div>
    );
  }

  // Default avatar
  return (
    <div className={cn('rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center border-4 border-accent/30', sizeClasses[size])}>
      <svg className={cn('text-accent', size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-8 h-8' : 'w-5 h-5')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const walletAddress = params.wallet as string;
  const { publicKey, connected } = useWallet();
  const isOwnProfile = connected && publicKey?.toBase58() === walletAddress;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [rankData, setRankData] = useState<UserRankData | null>(null);
  const [wagerHistory, setWagerHistory] = useState<UserWager[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [rebateHistory, setRebateHistory] = useState<RakeRebate[]>([]);
  const [rebateSummary, setRebateSummary] = useState<RebateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Fetch all profile data
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check cache first for profile
        const cachedProfile = getCachedProfile(walletAddress);
        if (cachedProfile) {
          setProfile(cachedProfile);
        }

        // Fetch all data in parallel
        const [profileRes, progressionRes, statsRes, rankRes, historyRes, streakRes, rebatesRes, rebateSummaryRes] = await Promise.all([
          fetch(`${backendUrl}/api/profile/${walletAddress}`),
          fetch(`${backendUrl}/api/progression/${walletAddress}`),
          fetch(`${backendUrl}/api/stats/${walletAddress}`),
          fetch(`${backendUrl}/api/stats/${walletAddress}/rank`),
          fetch(`${backendUrl}/api/predictions/history/${walletAddress}?limit=50`),
          fetch(`${backendUrl}/api/progression/${walletAddress}/streak`),
          fetch(`${backendUrl}/api/progression/${walletAddress}/rebates`),
          fetch(`${backendUrl}/api/progression/${walletAddress}/rebates/summary`),
        ]);

        // Process profile
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          setCachedProfile(profileData);
        }

        // Process progression
        if (progressionRes.ok) {
          const progressionData = await progressionRes.json();
          setProgression(progressionData);
        }

        // Process stats
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Process rank
        if (rankRes.ok) {
          const rankDataRes = await rankRes.json();
          setRankData(rankDataRes);
        }

        // Process wager history
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setWagerHistory(historyData.bets || []);
        }

        // Process streak
        if (streakRes.ok) {
          const streakData = await streakRes.json();
          setStreak(streakData);
        }

        // Process rebate history
        if (rebatesRes.ok) {
          const rebatesData = await rebatesRes.json();
          setRebateHistory(rebatesData.rebates || rebatesData || []);
        }

        // Process rebate summary
        if (rebateSummaryRes.ok) {
          const summaryData = await rebateSummaryRes.json();
          setRebateSummary(summaryData);
        }
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [walletAddress, backendUrl]);

  // Calculate biggest win from history
  const biggestWin = useMemo(() => {
    if (!wagerHistory.length) return 0;
    const wins = wagerHistory.filter(w => w.outcome === 'won' && w.profitLoss > 0);
    if (!wins.length) return 0;
    return Math.max(...wins.map(w => w.profitLoss));
  }, [wagerHistory]);

  // Get tier info
  const tierInfo = getTierForLevel(progression?.currentLevel || 1);

  if (loading) {
    return <PageLoading message="Loading profile..." />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="card border border-danger/30 p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
          <p className="text-text-secondary mb-4">{error}</p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 animate-fadeIn">
      {/* Profile Header */}
      <div className="card mt-6 sm:mt-8 border border-accent/30 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-fire to-danger" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <ProfileAvatar profile={profile} size="lg" />

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                  {profile?.username || formatWallet(walletAddress)}
                </h1>
                {progression && (
                  <LevelBadge level={progression.currentLevel} size="lg" showTitle title={tierInfo.title} />
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-text-secondary mb-3">
                <span className="font-mono text-sm">{formatWallet(walletAddress)}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(walletAddress)}
                  className="p-1 rounded hover:bg-bg-tertiary transition-colors"
                  title="Copy wallet address"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              {/* XP Progress Bar */}
              {progression && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-tertiary uppercase tracking-wider">Level {progression.currentLevel} Progress</span>
                    <span className="font-mono text-text-secondary">{progression.xpProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-bg-tertiary overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-fire rounded-full transition-all duration-500"
                      style={{ width: `${progression.xpProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs mt-1">
                    <span className="text-text-tertiary">{progression.totalXp.toLocaleString()} XP total</span>
                    <span className="text-text-tertiary">{progression.xpToNextLevel.toLocaleString()} XP to next level</span>
                  </div>
                </div>
              )}

              {/* Quick Stats Row */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
                {rankData?.rank && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded bg-warning/20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <span className="text-sm">
                      <span className="text-text-tertiary">Rank </span>
                      <span className="font-bold text-warning">#{rankData.rank}</span>
                    </span>
                  </div>
                )}
                {streak && streak.currentStreak > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded bg-fire/20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                    </div>
                    <span className="text-sm">
                      <span className="font-bold text-fire">{streak.currentStreak}</span>
                      <span className="text-text-tertiary"> day streak</span>
                    </span>
                  </div>
                )}
                {isOwnProfile && (
                  <Link
                    href="/progression"
                    className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                  >
                    <span>View Progression</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
        {/* Win Rate */}
        <div className="card border border-success/20 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-success/20 flex items-center justify-center border border-success/30">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Win Rate</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-success">{stats?.winRate.toFixed(1) || 0}%</div>
          <div className="text-[10px] sm:text-xs text-text-tertiary mt-1">
            {stats?.totalWins || 0}W / {stats?.totalLosses || 0}L
          </div>
        </div>

        {/* Total Wagered */}
        <div className="card border border-accent/20 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Total Wagered</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-accent">${stats?.totalWagered.toFixed(0) || 0}</div>
          <div className="text-[10px] sm:text-xs text-text-tertiary mt-1">
            {stats?.totalWagers || 0} wagers
          </div>
        </div>

        {/* Total P/L */}
        <div className={cn(
          'card border p-3 sm:p-4',
          (stats?.totalProfitLoss || 0) >= 0 ? 'border-success/20' : 'border-danger/20'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border',
              (stats?.totalProfitLoss || 0) >= 0 ? 'bg-success/20 border-success/30' : 'bg-danger/20 border-danger/30'
            )}>
              <svg className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', (stats?.totalProfitLoss || 0) >= 0 ? 'text-success' : 'text-danger')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Total P/L</span>
          </div>
          <div className={cn(
            'text-lg sm:text-2xl font-black font-mono',
            (stats?.totalProfitLoss || 0) >= 0 ? 'text-success' : 'text-danger'
          )}>
            {(stats?.totalProfitLoss || 0) >= 0 ? '+' : ''}{stats?.totalProfitLoss.toFixed(2) || '0.00'}
          </div>
          <div className="text-[10px] sm:text-xs text-text-tertiary mt-1">
            Biggest: ${biggestWin.toFixed(2)}
          </div>
        </div>

        {/* Streaks */}
        <div className="card border border-fire/20 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-fire/20 flex items-center justify-center border border-fire/30">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Win Streak</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-fire">{stats?.currentStreak || 0}</div>
          <div className="text-[10px] sm:text-xs text-text-tertiary mt-1">
            Best: {stats?.bestStreak || 0}
          </div>
        </div>
      </div>

      {/* Bet History */}
      <div className="card mt-6 border border-rust/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-rust/20 flex items-center justify-center border border-rust/30">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg uppercase tracking-wide">Wager History</h2>
              <p className="text-text-tertiary text-[10px] sm:text-xs">Last 50 wagers</p>
            </div>
          </div>
        </div>

        {wagerHistory.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-lg bg-rust/10 flex items-center justify-center border border-rust/30">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-rust" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-bold mb-1 uppercase text-sm sm:text-base">No Wagers Yet</h3>
            <p className="text-text-secondary text-xs sm:text-sm">This user hasn&apos;t placed any wagers yet</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-rust/20 text-text-tertiary text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Outcome</th>
                    <th className="text-right py-3 px-4">P/L</th>
                    <th className="text-right py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {wagerHistory.map((wager) => {
                    const typeInfo = getWagerTypeInfo(wager.wagerType);
                    const outcomeBadge = getOutcomeBadge(wager.outcome);
                    return (
                      <tr key={wager.id} className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={cn('p-1.5 rounded bg-bg-tertiary', typeInfo.color)}>
                              {typeInfo.icon}
                            </div>
                            <span className={cn('font-medium text-sm', typeInfo.color)}>{typeInfo.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium">${wager.amount.toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                            outcomeBadge.bg,
                            outcomeBadge.color
                          )}>
                            {outcomeBadge.text}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            'font-mono font-bold',
                            wager.profitLoss > 0 ? 'text-success' : wager.profitLoss < 0 ? 'text-danger' : 'text-text-tertiary'
                          )}>
                            {wager.profitLoss > 0 ? '+' : ''}{wager.profitLoss.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-text-tertiary text-sm">
                          {formatDate(wager.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {wagerHistory.map((wager) => {
                const typeInfo = getWagerTypeInfo(wager.wagerType);
                const outcomeBadge = getOutcomeBadge(wager.outcome);
                return (
                  <div key={wager.id} className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded bg-bg-secondary', typeInfo.color)}>
                          {typeInfo.icon}
                        </div>
                        <span className={cn('font-medium text-sm', typeInfo.color)}>{typeInfo.label}</span>
                      </div>
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                        outcomeBadge.bg,
                        outcomeBadge.color
                      )}>
                        {outcomeBadge.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-text-tertiary text-xs">Amount: </span>
                        <span className="font-mono font-medium text-sm">${wager.amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary text-xs">P/L: </span>
                        <span className={cn(
                          'font-mono font-bold text-sm',
                          wager.profitLoss > 0 ? 'text-success' : wager.profitLoss < 0 ? 'text-danger' : 'text-text-tertiary'
                        )}>
                          {wager.profitLoss > 0 ? '+' : ''}{wager.profitLoss.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-text-tertiary mt-1">
                      {formatDate(wager.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Rebate Summary & History */}
      {(rebateSummary || rebateHistory.length > 0) && (
        <div className="card mt-6 border border-success/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-success/20 flex items-center justify-center border border-success/30">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-base sm:text-lg uppercase tracking-wide">Rake Rebates</h2>
                <p className="text-text-tertiary text-[10px] sm:text-xs">SOL refunded from reduced rake</p>
              </div>
            </div>
          </div>

          {/* Rebate Summary Stats */}
          {rebateSummary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {/* Total Rebates Earned */}
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider mb-1">Total Rebates</div>
                <div className="text-lg sm:text-xl font-black text-success font-mono">
                  {(rebateSummary.totalRebatesEarned / 1e9).toFixed(4)} SOL
                </div>
              </div>

              {/* Effective Rake Rate */}
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider mb-1">Effective Rake</div>
                <div className="text-lg sm:text-xl font-black text-accent">
                  {(rebateSummary.effectiveRakeBps / 100).toFixed(1)}%
                </div>
                {rebateSummary.perkType && (
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    via {rebateSummary.perkType.replace('_', ' ')} perk
                  </div>
                )}
              </div>

              {/* Rebate Count */}
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary col-span-2 md:col-span-1">
                <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider mb-1">Rebate Count</div>
                <div className="text-lg sm:text-xl font-black">
                  {rebateSummary.totalRebateCount}
                </div>
              </div>
            </div>
          )}

          {/* Rebate History Table */}
          {rebateHistory.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-lg bg-success/10 flex items-center justify-center border border-success/30">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-success/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold mb-1 uppercase text-sm">No Rebates Yet</h3>
              <p className="text-text-secondary text-xs">Activate an Oracle rake reduction perk to earn rebates</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-success/20 text-text-tertiary text-xs uppercase tracking-wider">
                      <th className="text-left py-3 px-4">Round</th>
                      <th className="text-left py-3 px-4">Gross Win</th>
                      <th className="text-left py-3 px-4">Effective Rate</th>
                      <th className="text-right py-3 px-4">Rebate</th>
                      <th className="text-right py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rebateHistory.map((rebate) => (
                      <tr key={rebate.id} className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">#{rebate.roundId}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium">{(rebate.grossWinningsLamports / 1e9).toFixed(4)} SOL</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-accent font-medium">{(rebate.effectiveFeeBps / 100).toFixed(1)}%</span>
                          {rebate.perkType && (
                            <span className="ml-1 text-[10px] text-text-tertiary">({rebate.perkType.replace('_', ' ')})</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-success">+{(rebate.rebateLamports / 1e9).toFixed(4)} SOL</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                            rebate.status === 'sent' ? 'bg-success/20 border-success/30 text-success' :
                            rebate.status === 'pending' ? 'bg-warning/20 border-warning/30 text-warning' :
                            'bg-danger/20 border-danger/30 text-danger'
                          )}>
                            {rebate.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-text-tertiary text-sm">
                          {formatDate(rebate.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {rebateHistory.map((rebate) => (
                  <div key={rebate.id} className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-text-secondary">Round #{rebate.roundId}</span>
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                        rebate.status === 'sent' ? 'bg-success/20 border-success/30 text-success' :
                        rebate.status === 'pending' ? 'bg-warning/20 border-warning/30 text-warning' :
                        'bg-danger/20 border-danger/30 text-danger'
                      )}>
                        {rebate.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-text-tertiary text-xs">Gross Win: </span>
                        <span className="font-mono text-sm">{(rebate.grossWinningsLamports / 1e9).toFixed(4)} SOL</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary text-xs">Rate: </span>
                        <span className="text-accent font-medium text-sm">{(rebate.effectiveFeeBps / 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-success text-sm">+{(rebate.rebateLamports / 1e9).toFixed(4)} SOL</span>
                      <span className="text-[10px] text-text-tertiary">{formatDate(rebate.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}
