'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/utils';
import { DRTierBadge, RecentFormIndicator, DrTier } from '@/components/profile';
import { getCachedProfile, setCachedProfile } from '@/lib/profileStorage';
import { PageLoading } from '@/components/ui/skeleton';
import { ProfileShareButton } from '@/components/ProfileShareButton';
import { UserProfile } from '@/types';
import Link from 'next/link';
import { BACKEND_URL } from '@/config/api';

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
  const [stats, setStats] = useState<UserStats | null>(null);
  const [rankData, setRankData] = useState<UserRankData | null>(null);
  const [wagerHistory, setWagerHistory] = useState<UserWager[]>([]);
  const [battleStats, setBattleStats] = useState<{ wins: number; losses: number; dr: number; tier: string; division: number; isPlacement: boolean; placementMatches: number } | null>(null);
  const [recentForm, setRecentForm] = useState<Array<{ result: 'win' | 'loss' | 'tie'; pnlPercent: number; endedAt: number }>>([]);
  const [battleStreaks, setBattleStreaks] = useState<{ currentStreak: number; bestStreak: number } | null>(null);
  const [roi, setRoi] = useState<{ roi: number; totalWagered: number; totalPayout: number } | null>(null);
  const [tradingStyle, setTradingStyle] = useState<{ totalPositions: number; avgLeverage: number; aggressionScore: number; longShortRatio: number } | null>(null);
  const [favoriteAssets, setFavoriteAssets] = useState<Array<{ asset: string; count: number; winRate: number }>>([]);
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [profileRes, statsRes, rankRes, historyRes, battleStatsRes, formRes, styleRes, favoritesRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/profile/${walletAddress}`),
          fetch(`${BACKEND_URL}/api/stats/${walletAddress}`),
          fetch(`${BACKEND_URL}/api/stats/${walletAddress}/rank`),
          fetch(`${BACKEND_URL}/api/predictions/history/${walletAddress}?limit=50`),
          fetch(`${BACKEND_URL}/api/battles/stats/${walletAddress}`),
          fetch(`${BACKEND_URL}/api/battles/form/${walletAddress}?limit=5`),
          fetch(`${BACKEND_URL}/api/battles/style/${walletAddress}`),
          fetch(`${BACKEND_URL}/api/battles/favorites/${walletAddress}`),
        ]);

        // Process profile
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          setCachedProfile(profileData);
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

        // Process battle stats for share button
        if (battleStatsRes.ok) {
          const battleStatsData = await battleStatsRes.json();
          setBattleStats({
            wins: battleStatsData.wins || 0,
            losses: battleStatsData.losses || 0,
            dr: battleStatsData.dr || battleStatsData.elo || 1000,
            tier: battleStatsData.tier || 'retail',
            division: battleStatsData.division || 4,
            isPlacement: battleStatsData.isPlacement ?? true,
            placementMatches: battleStatsData.placementMatches || 0,
          });

          // Calculate ROI from battle stats
          const totalBattles = (battleStatsData.wins || 0) + (battleStatsData.losses || 0);
          if (totalBattles > 0 && battleStatsData.totalPayout !== undefined && battleStatsData.totalWagered !== undefined) {
            const roiPercent = battleStatsData.totalWagered > 0
              ? ((battleStatsData.totalPayout - battleStatsData.totalWagered) / battleStatsData.totalWagered) * 100
              : 0;
            setRoi({
              roi: roiPercent,
              totalWagered: battleStatsData.totalWagered,
              totalPayout: battleStatsData.totalPayout,
            });
          }
        } else {
          // Default battle stats
          setBattleStats({
            wins: 0,
            losses: 0,
            dr: 1000,
            tier: 'retail',
            division: 4,
            isPlacement: true,
            placementMatches: 0,
          });
        }

        // Process recent form
        if (formRes.ok) {
          const formData = await formRes.json();
          const form = formData.form || [];
          setRecentForm(form);

          // Calculate current streak from form
          let currentStreak = 0;
          let bestStreak = 0;
          let tempStreak = 0;
          for (const battle of form) {
            if (battle.result === 'win') {
              tempStreak++;
              if (tempStreak > bestStreak) bestStreak = tempStreak;
            } else {
              tempStreak = 0;
            }
          }
          // Current streak is the consecutive wins from most recent
          for (const battle of form) {
            if (battle.result === 'win') currentStreak++;
            else break;
          }
          setBattleStreaks({ currentStreak, bestStreak });
        }

        // Process trading style
        if (styleRes.ok) {
          const styleData = await styleRes.json();
          setTradingStyle(styleData);
        }

        // Process favorite assets
        if (favoritesRes.ok) {
          const favoritesData = await favoritesRes.json();
          setFavoriteAssets(favoritesData.favorites || []);
        }

        // Generate referral code from wallet address
        const suffix = walletAddress.slice(-4).toUpperCase();
        setReferralCode(`DEGEN${suffix}`);
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  // Calculate biggest win from history
  const biggestWin = useMemo(() => {
    if (!wagerHistory.length) return 0;
    const wins = wagerHistory.filter(w => w.outcome === 'won' && w.profitLoss > 0);
    if (!wins.length) return 0;
    return Math.max(...wins.map(w => w.profitLoss));
  }, [wagerHistory]);

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
                <div className="flex items-center gap-2">
                  {battleStats && (
                    <DRTierBadge
                      tier={battleStats.tier as DrTier}
                      division={battleStats.division}
                      dr={battleStats.dr}
                      size="lg"
                      showDr
                    />
                  )}
                </div>
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
                {isOwnProfile && (
                  <Link
                    href="/leaderboard"
                    className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                  >
                    <span>View Leaderboard</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
                {battleStats && (
                  <ProfileShareButton
                    wallet={walletAddress}
                    displayName={profile?.username || formatWallet(walletAddress)}
                    wins={battleStats.wins}
                    losses={battleStats.losses}
                    elo={battleStats.dr}
                    tier={battleStats.tier}
                    referralCode={isOwnProfile ? referralCode : undefined}
                  />
                )}
                {/* Compare button - only show on other users' profiles when logged in */}
                {!isOwnProfile && connected && publicKey && (
                  <Link
                    href={`/profile/${walletAddress}/compare/${publicKey.toBase58()}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-fire/30 bg-fire/10 text-fire hover:bg-fire/20 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Compare
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

      {/* Battle Stats Section */}
      {battleStats && (battleStats.wins > 0 || battleStats.losses > 0) && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Battle Stats
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Battle Record */}
            <div className="card border border-danger/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-danger/20 flex items-center justify-center border border-danger/30">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Battle Record</span>
              </div>
              <div className="text-xl sm:text-2xl font-black">
                <span className="text-success">{battleStats.wins}</span>
                <span className="text-text-tertiary mx-1">-</span>
                <span className="text-danger">{battleStats.losses}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-text-tertiary mt-1">
                {battleStats.wins + battleStats.losses > 0
                  ? ((battleStats.wins / (battleStats.wins + battleStats.losses)) * 100).toFixed(0)
                  : 0}% win rate
              </div>
            </div>

            {/* Win Streak */}
            <div className="card border border-fire/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-fire/20 flex items-center justify-center border border-fire/30">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Win Streak</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-fire">
                {battleStreaks?.currentStreak || 0}
              </div>
              <div className="text-[10px] sm:text-xs text-text-tertiary mt-1">
                Best: {battleStreaks?.bestStreak || 0}
              </div>
            </div>

            {/* ROI */}
            <div className={cn(
              'card border p-3 sm:p-4',
              (roi?.roi || 0) >= 0 ? 'border-success/20' : 'border-danger/20'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border',
                  (roi?.roi || 0) >= 0 ? 'bg-success/20 border-success/30' : 'bg-danger/20 border-danger/30'
                )}>
                  <svg className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', (roi?.roi || 0) >= 0 ? 'text-success' : 'text-danger')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Battle ROI</span>
              </div>
              <div className={cn('text-xl sm:text-2xl font-black', (roi?.roi || 0) >= 0 ? 'text-success' : 'text-danger')}>
                {(roi?.roi || 0) >= 0 ? '+' : ''}{(roi?.roi || 0).toFixed(1)}%
              </div>
              <div className="text-[10px] sm:text-xs text-text-tertiary mt-1">
                from battles
              </div>
            </div>

            {/* Recent Form */}
            <div className="card border border-accent/20 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Recent Form</span>
              </div>
              <div className="mt-1">
                <RecentFormIndicator form={recentForm} maxItems={5} size="md" />
              </div>
              <div className="text-[10px] sm:text-xs text-text-tertiary mt-2">
                Last 5 battles
              </div>
            </div>

            {/* Trading Style */}
            {tradingStyle && tradingStyle.totalPositions > 0 && (
              <div className="card border border-violet-500/20 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Trading Style</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs text-text-tertiary">Aggression</span>
                    <span className="font-mono font-bold text-violet-400">{tradingStyle.aggressionScore}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs text-text-tertiary">Avg Leverage</span>
                    <span className="font-mono font-bold text-accent">{tradingStyle.avgLeverage.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs text-text-tertiary">Long/Short</span>
                    <span className={cn(
                      'font-mono font-bold',
                      tradingStyle.longShortRatio > 1 ? 'text-success' : tradingStyle.longShortRatio < 1 ? 'text-danger' : 'text-text-secondary'
                    )}>
                      {tradingStyle.longShortRatio.toFixed(2)}:1
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Favorite Assets */}
            {favoriteAssets.length > 0 && (
              <div className="card border border-amber-500/20 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wider">Favorite Assets</span>
                </div>
                <div className="space-y-1.5">
                  {favoriteAssets.map((asset) => (
                    <div key={asset.asset} className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm">{asset.asset}</span>
                      <span className={cn(
                        'text-xs font-medium',
                        asset.winRate >= 50 ? 'text-success' : 'text-danger'
                      )}>
                        {asset.winRate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}
