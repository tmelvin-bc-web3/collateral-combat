'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminData } from '@/hooks/useAdminData';
import { BACKEND_URL } from '@/config/api';
import Link from 'next/link';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatCard } from '@/components/admin/StatCard';
import { HealthIndicator, HealthBadge, HealthStatus } from '@/components/admin/HealthIndicator';
import { AdminTable, Column } from '@/components/admin/AdminTable';

// ===================
// Types
// ===================

interface WaitlistEntry {
  id: string;
  email: string;
  walletAddress?: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  position: number;
  tier: string;
  createdAt: number;
  utmSource?: string;
  utmCampaign?: string;
}

interface WaitlistData {
  entries: WaitlistEntry[];
  total: number;
  stats: {
    totalSignups: number;
    totalReferrals: number;
    tierBreakdown: Record<string, number>;
  };
}

const TIER_COLORS: Record<string, string> = {
  standard: 'bg-white/10 text-white/60',
  priority: 'bg-blue-500/20 text-blue-400',
  vip: 'bg-purple-500/20 text-purple-400',
  founding: 'bg-warning/20 text-warning',
};

// ===================
// Admin Page Content (needs Suspense boundary)
// ===================

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const { isAuthenticated, isLoading: authLoading, signIn, authenticatedFetch, error: authError } = useAuth();

  // Admin verification state - uses JWT token, NO separate signature required
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const hasCheckedAdmin = useRef(false);

  // Tab state from URL
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Admin data hook
  const {
    overview,
    userStats,
    userList,
    gameStats,
    oracleRounds,
    health,
    isLoading,
    error: dataError,
    fetchOverview,
    fetchUserStats,
    fetchUserList,
    fetchGameStats,
    fetchOracleRounds,
    fetchHealth,
    refresh,
  } = useAdminData({ autoRefresh, refreshInterval: 30000 });

  // Waitlist data (kept separate for now)
  const [waitlistData, setWaitlistData] = useState<WaitlistData | null>(null);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'referral_count' | 'position'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ===================
  // Admin Verification (uses JWT token - NO additional signature)
  // ===================

  // Check admin status via authenticated API call (no signature needed)
  const checkAdminStatus = useCallback(async () => {
    if (!isAuthenticated || hasCheckedAdmin.current) return;

    hasCheckedAdmin.current = true;
    setIsVerifying(true);
    setVerificationError(null);

    try {
      // Use the JWT token to check admin status - NO signature required
      const response = await authenticatedFetch(`${BACKEND_URL}/api/admin/check`);

      if (response.ok) {
        const data = await response.json();
        if (data.isAdmin) {
          setIsVerifiedAdmin(true);
        } else {
          setVerificationError('Access denied');
        }
      } else if (response.status === 403) {
        setVerificationError('Access denied');
      } else if (response.status === 401) {
        // Token invalid - will need to re-authenticate
        setVerificationError('Session expired');
        hasCheckedAdmin.current = false;
      } else {
        setVerificationError('Verification failed');
        hasCheckedAdmin.current = false;
      }
    } catch (err: any) {
      console.error('Admin check error:', err);
      setVerificationError('Verification failed');
      hasCheckedAdmin.current = false;
    } finally {
      setIsVerifying(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  // Check admin status once authenticated (AuthContext handles the single signature)
  useEffect(() => {
    if (isAuthenticated && !isVerifiedAdmin && !isVerifying && !hasCheckedAdmin.current) {
      checkAdminStatus();
    }
  }, [isAuthenticated, isVerifiedAdmin, isVerifying, checkAdminStatus]);

  // Reset verification state when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setIsVerifiedAdmin(false);
      setVerificationError(null);
      hasCheckedAdmin.current = false;
    }
  }, [connected]);

  // ===================
  // Data Fetching
  // ===================

  // Fetch tab-specific data when tab changes or auth state changes
  useEffect(() => {
    if (!isVerifiedAdmin || !isAuthenticated) return;

    switch (activeTab) {
      case 'overview':
        fetchOverview();
        fetchHealth();
        break;
      case 'users':
        fetchUserStats();
        fetchUserList();
        break;
      case 'games':
        fetchGameStats();
        fetchOracleRounds();
        break;
      case 'system':
        fetchHealth();
        break;
      case 'waitlist':
        fetchWaitlistData();
        break;
    }
    setLastRefresh(Date.now());
  }, [activeTab, isVerifiedAdmin, isAuthenticated]);

  // Fetch waitlist data
  const fetchWaitlistData = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoadingWaitlist(true);
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/waitlist/admin/entries?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=500`
      );
      if (res.ok) {
        const json = await res.json();
        setWaitlistData(json);
      }
    } catch (err) {
      console.error('Failed to fetch waitlist data:', err);
    } finally {
      setIsLoadingWaitlist(false);
    }
  }, [isAuthenticated, authenticatedFetch, sortBy, sortOrder]);

  useEffect(() => {
    if (isVerifiedAdmin && isAuthenticated && activeTab === 'waitlist') {
      fetchWaitlistData();
    }
  }, [sortBy, sortOrder, isVerifiedAdmin, isAuthenticated, activeTab, fetchWaitlistData]);

  // ===================
  // Tab Change Handler
  // ===================

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin?tab=${value}`, { scroll: false });
  };

  // ===================
  // Manual Refresh
  // ===================

  const handleRefresh = () => {
    if (activeTab === 'waitlist') {
      fetchWaitlistData();
    } else {
      refresh();
    }
    setLastRefresh(Date.now());
  };

  // ===================
  // CSV Export
  // ===================

  const exportCSV = () => {
    if (!waitlistData) return;

    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();
    const headers = ['Position', 'Email', 'Wallet', 'Referral Code', 'Referred By', 'Referrals', 'Tier', 'Source', 'Joined'];
    const rows = waitlistData.entries.map((e) => [
      e.position,
      e.email,
      e.walletAddress || '',
      e.referralCode,
      e.referredBy || '',
      e.referralCount,
      e.tier,
      e.utmSource || '',
      formatDate(e.createdAt),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ===================
  // Render States
  // ===================

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Restricted Area</h1>
          <p className="text-white/60 mb-6">Connect wallet to continue</p>
          <WalletMultiButton className="!bg-white/10 !border !border-white/20 !rounded-xl" />
        </div>
      </div>
    );
  }

  // Waiting for authentication (AuthContext will auto sign-in with ONE signature)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
          {authLoading ? (
            <>
              <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60">Signing in...</p>
            </>
          ) : authError ? (
            <>
              <p className="text-white/40 text-sm mb-4">{authError}</p>
              <button
                onClick={signIn}
                className="px-4 py-2 bg-warning/20 border border-warning/40 rounded-lg text-warning text-sm hover:bg-warning/30"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60">Connecting...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Verifying admin status (uses JWT, no additional signature)
  if (isVerifying || (!isVerifiedAdmin && !verificationError)) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isVerifiedAdmin && verificationError) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <p className="text-white/40 text-sm">{verificationError}</p>
        </div>
      </div>
    );
  }

  // ===================
  // Main Dashboard
  // ===================

  return (
    <div className="min-h-screen bg-[#0a0908] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-warning hover:underline text-sm mb-2 inline-block">
              &larr; Back to site
            </Link>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/60">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isLoadingWaitlist}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {isLoading || isLoadingWaitlist ? 'Loading...' : 'Refresh'}
            </button>
            <span className="text-xs text-white/40">
              Last: {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Error */}
        {(dataError || authError) && (
          <div className="bg-danger/20 border border-danger/40 rounded-xl p-4 mb-6 text-danger">
            {dataError || authError}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-black/60 border border-white/10 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <OverviewTab overview={overview} health={health} />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UsersTab userStats={userStats} userList={userList} isLoading={isLoading} />
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <GamesTab gameStats={gameStats} oracleRounds={oracleRounds} isLoading={isLoading} />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <SystemTab health={health} isLoading={isLoading} />
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist">
            <WaitlistTab
              data={waitlistData}
              isLoading={isLoadingWaitlist}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
              onExportCSV={exportCSV}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ===================
// Tab Components
// ===================

function OverviewTab({ overview, health }: { overview: any; health: any }) {
  if (!overview) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={overview.users.total}
          sublabel={`${overview.users.active24h} active today`}
          variant="warning"
        />
        <StatCard
          label="Oracle Rounds Today"
          value={overview.games.oracleRoundsToday}
          sublabel={`${(overview.games.volumeToday / 1e9).toFixed(2)} SOL volume`}
        />
        <StatCard
          label="System Status"
          value={
            <HealthBadge
              status={overview.health.status as HealthStatus}
              className="mt-1"
            />
          }
          sublabel={`${overview.health.activeConnections} connections`}
        />
      </div>

      {/* Health Summary */}
      {health && (
        <div className="bg-black/60 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <HealthIndicator status={health.backend.status} />
              <span className="text-sm text-white/60">Backend</span>
            </div>
            <div className="flex items-center gap-3">
              <HealthIndicator status={health.database.status} />
              <span className="text-sm text-white/60">Database</span>
            </div>
            <div className="flex items-center gap-3">
              <HealthIndicator status={health.priceService.status} />
              <span className="text-sm text-white/60">Price Service</span>
            </div>
            <div className="flex items-center gap-3">
              <HealthIndicator status={health.rpc.status} />
              <span className="text-sm text-white/60">RPC</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab({ userStats, userList, isLoading }: { userStats: any; userList: any; isLoading: boolean }) {
  const columns: Column<any>[] = [
    { key: 'walletAddress', header: 'Wallet', render: (item) => (
      <span className="font-mono text-white/60">
        {item.walletAddress.slice(0, 4)}...{item.walletAddress.slice(-4)}
      </span>
    )},
    { key: 'totalWagered', header: 'Volume', sortable: true, render: (item) => (
      <span>{(item.totalWagered / 1e9).toFixed(2)} SOL</span>
    )},
    { key: 'totalProfitLoss', header: 'P&L', sortable: true, render: (item) => (
      <span className={item.totalProfitLoss >= 0 ? 'text-success' : 'text-danger'}>
        {item.totalProfitLoss >= 0 ? '+' : ''}{(item.totalProfitLoss / 1e9).toFixed(4)} SOL
      </span>
    )},
    { key: 'lastActivity', header: 'Last Active', render: (item) => (
      <span className="text-white/60 text-sm">
        {item.lastActivity ? new Date(item.lastActivity).toLocaleDateString() : '-'}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      {userStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={userStats.totalUsers} />
          <StatCard label="Active Users" value={userStats.usersWithActivity} />
          <StatCard
            label="Total Volume"
            value={`${(userStats.totalVolumeAllTime / 1e9).toFixed(2)} SOL`}
          />
          <StatCard
            label="Avg Wager"
            value={`${(userStats.avgWagerSize / 1e9).toFixed(4)} SOL`}
          />
        </div>
      )}

      {/* User List */}
      <AdminTable
        columns={columns}
        data={userList?.users || []}
        keyExtractor={(item) => item.walletAddress}
        isLoading={isLoading}
        emptyMessage="No users found"
        pageSize={20}
      />
    </div>
  );
}

function GamesTab({ gameStats, oracleRounds, isLoading }: { gameStats: any; oracleRounds: any[]; isLoading: boolean }) {
  const roundColumns: Column<any>[] = [
    { key: 'id', header: 'Round', render: (item) => (
      <span className="font-mono text-white/60">#{item.id.slice(0, 8)}</span>
    )},
    { key: 'asset', header: 'Asset' },
    { key: 'status', header: 'Status', render: (item) => (
      <span className={
        item.status === 'settled' ? 'text-success' :
        item.status === 'betting' ? 'text-warning' : 'text-white/60'
      }>
        {item.status}
      </span>
    )},
    { key: 'startPrice', header: 'Start', render: (item) => `$${item.startPrice.toFixed(2)}` },
    { key: 'endPrice', header: 'End', render: (item) => item.endPrice ? `$${item.endPrice.toFixed(2)}` : '-' },
    { key: 'totalPool', header: 'Pool', render: (item) => `${(item.totalPool / 1e9).toFixed(3)} SOL` },
    { key: 'winner', header: 'Winner', render: (item) => (
      <span className={
        item.winner === 'long' ? 'text-success' :
        item.winner === 'short' ? 'text-danger' : 'text-white/40'
      }>
        {item.winner || '-'}
      </span>
    )},
    { key: 'startTime', header: 'Time', render: (item) => (
      <span className="text-white/60 text-sm">
        {new Date(item.startTime).toLocaleTimeString()}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      {gameStats && (
        <>
          <h3 className="text-lg font-semibold">Oracle Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Rounds" value={gameStats.oracle.totalRounds} />
            <StatCard label="Rounds Today" value={gameStats.oracle.roundsToday} variant="warning" />
            <StatCard
              label="Total Volume"
              value={`${(gameStats.oracle.totalVolume / 1e9).toFixed(2)} SOL`}
            />
            <StatCard
              label="Total Fees"
              value={`${(gameStats.oracle.totalFees / 1e9).toFixed(4)} SOL`}
              variant="success"
            />
          </div>

          <h3 className="text-lg font-semibold mt-6">Battle Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Active Battles" value={gameStats.battle.activeBattles} variant="warning" />
            <StatCard label="Completed Today" value={gameStats.battle.completedToday} />
            <StatCard
              label="Volume Today"
              value={`${(gameStats.battle.volumeToday / 1e9).toFixed(2)} SOL`}
            />
          </div>
        </>
      )}

      {/* Recent Rounds */}
      <h3 className="text-lg font-semibold mt-6">Recent Oracle Rounds</h3>
      <AdminTable
        columns={roundColumns}
        data={oracleRounds}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No oracle rounds found"
        pageSize={10}
      />
    </div>
  );
}

function SystemTab({ health, isLoading }: { health: any; isLoading: boolean }) {
  if (!health) {
    return (
      <div className="flex items-center justify-center py-12">
        {isLoading ? (
          <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin" />
        ) : (
          <p className="text-white/40">No health data available</p>
        )}
      </div>
    );
  }

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Backend</h3>
            <HealthBadge status={health.backend.status} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Uptime</span>
              <span>{formatUptime(health.backend.uptime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Connections</span>
              <span>{health.backend.connections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Memory</span>
              <span>{health.backend.memoryUsage}%</span>
            </div>
          </div>
        </div>

        {/* Database */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Database</h3>
            <HealthBadge status={health.database.status} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Connected</span>
              <span>{health.database.connected ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Price Service */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Price Service</h3>
            <HealthBadge status={health.priceService.status} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Assets</span>
              <span>{health.priceService.assetCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Last Update</span>
              <span>
                {health.priceService.lastUpdate
                  ? new Date(health.priceService.lastUpdate).toLocaleTimeString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* RPC */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">RPC</h3>
            <HealthBadge status={health.rpc.status} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Latency</span>
              <span>{health.rpc.latency ? `${health.rpc.latency}ms` : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Transactions */}
      <div className="bg-black/60 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Pending Transactions</h3>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold">{health.pendingTx.count}</div>
          <span className="text-white/60">pending transactions</span>
        </div>
      </div>
    </div>
  );
}

function WaitlistTab({
  data,
  isLoading,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
  onExportCSV,
}: {
  data: WaitlistData | null;
  isLoading: boolean;
  sortBy: string;
  sortOrder: string;
  onSortByChange: (value: any) => void;
  onSortOrderChange: (value: any) => void;
  onExportCSV: () => void;
}) {
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Signups" value={data.stats.totalSignups} variant="warning" />
          <StatCard label="Total Referrals" value={data.stats.totalReferrals} />
          <StatCard
            label="Priority+"
            value={
              (data.stats.tierBreakdown.priority || 0) +
              (data.stats.tierBreakdown.vip || 0) +
              (data.stats.tierBreakdown.founding || 0)
            }
            variant="success"
          />
          <StatCard label="Founding Members" value={data.stats.tierBreakdown.founding || 0} variant="warning" />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-sm"
          >
            <option value="created_at">Date Joined</option>
            <option value="referral_count">Referrals</option>
            <option value="position">Position</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
            className="bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        <button
          onClick={onExportCSV}
          disabled={!data || data.entries.length === 0}
          className="px-4 py-2 bg-warning/20 border border-warning/40 rounded-lg text-warning text-sm hover:bg-warning/30 transition-colors disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-black/60 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Wallet</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Referred By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Refs</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-white/60">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : data && data.entries.length > 0 ? (
                data.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm font-mono text-white/60">{entry.position}</td>
                    <td className="px-4 py-3 text-sm">{entry.email}</td>
                    <td className="px-4 py-3 text-sm font-mono text-white/60">
                      {entry.walletAddress ? `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-warning">{entry.referralCode}</td>
                    <td className="px-4 py-3 text-sm font-mono text-white/60">{entry.referredBy || '-'}</td>
                    <td className="px-4 py-3 text-sm font-bold">{entry.referralCount}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS[entry.tier] || TIER_COLORS.standard}`}>
                        {entry.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">{entry.utmSource || 'direct'}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-white/60">
                    No entries yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total > 0 && (
        <p className="text-sm text-white/40">
          Showing {data.entries.length} of {data.total} entries
        </p>
      )}
    </div>
  );
}

// ===================
// Main Export with Suspense
// ===================

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
