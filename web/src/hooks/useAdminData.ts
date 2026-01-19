'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/config/api';

// ===================
// Type Definitions
// ===================

export interface OverviewStats {
  users: {
    total: number;
    active24h: number;
    withBalance: number;
  };
  games: {
    oracleRoundsToday: number;
    volumeToday: number;
    feesToday: number;
  };
  progression: {
    totalXpAwarded: number;
    freeBetsIssued: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'down';
    activeConnections: number;
  };
}

export interface UserStatsOverview {
  totalUsers: number;
  usersWithActivity: number;
  totalVolumeAllTime: number;
  totalProfitLossAllTime: number;
  avgWagerSize: number;
}

export interface UserListEntry {
  walletAddress: string;
  totalXp: number;
  currentLevel: number;
  totalWagered: number;
  totalProfitLoss: number;
  lastActivity: number | null;
}

export interface GameModeBalance {
  totalLocked: number;
  totalPaidOut: number;
  activeGames: number;
}

export interface GameStatsOverview {
  oracle: {
    totalRounds: number;
    totalVolume: number;
    totalFees: number;
    roundsToday: number;
    volumeToday: number;
  };
  battle: {
    activeBattles: number;
    completedToday: number;
    volumeToday: number;
  };
  gameModeBalances: Record<string, GameModeBalance>;
}

export interface OracleRound {
  id: string;
  asset: string;
  status: string;
  startPrice: number;
  endPrice?: number;
  startTime: number;
  endTime: number;
  totalPool: number;
  winner?: string;
}

export interface ProgressionStatsOverview {
  totalXpAwarded: number;
  averageLevel: number;
  levelDistribution: Record<string, number>;
  totalFreeBetsIssued: number;
  totalPerksUnlocked: number;
}

export interface XpLeaderboardEntry {
  walletAddress: string;
  totalXp: number;
  currentLevel: number;
}

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface HealthData {
  backend: {
    status: HealthStatus;
    uptime: number;
    connections: number;
    memoryUsage: number;
  };
  rpc: {
    status: HealthStatus;
    latency: number | null;
    lastSuccess: number | null;
  };
  priceService: {
    status: HealthStatus;
    lastUpdate: number | null;
    assetCount: number;
  };
  database: {
    status: HealthStatus;
    connected: boolean;
  };
  pendingTx: {
    count: number;
    oldestAge: number | null;
  };
}

// ===================
// Hook Implementation
// ===================

interface UseAdminDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAdminData(options: UseAdminDataOptions = {}) {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  const { authenticatedFetch, isAuthenticated } = useAuth();

  // State
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [userStats, setUserStats] = useState<UserStatsOverview | null>(null);
  const [userList, setUserList] = useState<{ users: UserListEntry[]; total: number } | null>(null);
  const [gameStats, setGameStats] = useState<GameStatsOverview | null>(null);
  const [oracleRounds, setOracleRounds] = useState<OracleRound[]>([]);
  const [progressionStats, setProgressionStats] = useState<ProgressionStatsOverview | null>(null);
  const [xpLeaderboard, setXpLeaderboard] = useState<XpLeaderboardEntry[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);

  // Loading states
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isLoadingProgression, setIsLoadingProgression] = useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Refs for interval cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===================
  // Fetch Functions
  // ===================

  const fetchOverview = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingOverview(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/admin/overview`);
      if (!res.ok) throw new Error('Failed to fetch overview');
      const data = await res.json();
      setOverview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  const fetchUserStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingUsers(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/admin/users/stats`);
      if (!res.ok) throw new Error('Failed to fetch user stats');
      const data = await res.json();
      setUserStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  const fetchUserList = useCallback(async (limit = 50, offset = 0) => {
    if (!isAuthenticated) return;
    setIsLoadingUsers(true);
    setError(null);
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/admin/users/list?limit=${limit}&offset=${offset}`
      );
      if (!res.ok) throw new Error('Failed to fetch user list');
      const data = await res.json();
      setUserList(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  const fetchGameStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingGames(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/admin/games/stats`);
      if (!res.ok) throw new Error('Failed to fetch game stats');
      const data = await res.json();
      setGameStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingGames(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  const fetchOracleRounds = useCallback(async (limit = 20) => {
    if (!isAuthenticated) return;
    setIsLoadingGames(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/admin/games/rounds?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch oracle rounds');
      const data = await res.json();
      setOracleRounds(data.rounds || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingGames(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  const fetchProgressionStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingProgression(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/admin/progression/stats`);
      if (!res.ok) throw new Error('Failed to fetch progression stats');
      const data = await res.json();
      setProgressionStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingProgression(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  const fetchXpLeaderboard = useCallback(async (limit = 50) => {
    if (!isAuthenticated) return;
    setIsLoadingProgression(true);
    setError(null);
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/admin/progression/leaderboard?limit=${limit}`
      );
      if (!res.ok) throw new Error('Failed to fetch XP leaderboard');
      const data = await res.json();
      setXpLeaderboard(data.leaderboard || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingProgression(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  const fetchHealth = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingHealth(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/admin/health`);
      if (!res.ok) throw new Error('Failed to fetch health status');
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingHealth(false);
    }
  }, [isAuthenticated, authenticatedFetch]);

  // ===================
  // Composite Fetchers
  // ===================

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchOverview(),
      fetchUserStats(),
      fetchUserList(),
      fetchGameStats(),
      fetchOracleRounds(),
      fetchProgressionStats(),
      fetchXpLeaderboard(),
      fetchHealth(),
    ]);
  }, [
    fetchOverview,
    fetchUserStats,
    fetchUserList,
    fetchGameStats,
    fetchOracleRounds,
    fetchProgressionStats,
    fetchXpLeaderboard,
    fetchHealth,
  ]);

  // ===================
  // Auto-refresh
  // ===================

  useEffect(() => {
    if (autoRefresh && isAuthenticated) {
      intervalRef.current = setInterval(() => {
        fetchOverview();
        fetchHealth();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, isAuthenticated, refreshInterval, fetchOverview, fetchHealth]);

  return {
    // Data
    overview,
    userStats,
    userList,
    gameStats,
    oracleRounds,
    progressionStats,
    xpLeaderboard,
    health,

    // Loading states
    isLoadingOverview,
    isLoadingUsers,
    isLoadingGames,
    isLoadingProgression,
    isLoadingHealth,
    isLoading: isLoadingOverview || isLoadingUsers || isLoadingGames || isLoadingProgression || isLoadingHealth,

    // Error
    error,

    // Actions
    fetchOverview,
    fetchUserStats,
    fetchUserList,
    fetchGameStats,
    fetchOracleRounds,
    fetchProgressionStats,
    fetchXpLeaderboard,
    fetchHealth,
    fetchAllData,
    refresh: fetchAllData,
  };
}
