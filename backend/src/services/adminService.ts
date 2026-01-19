/**
 * Admin Service - Aggregates data for the admin dashboard
 */

import * as userStatsDb from '../db/userStatsDatabase';
import * as progressionDb from '../db/progressionDatabase';
import * as balanceDb from '../db/balanceDatabase';
import { predictionService } from './predictionService';
import { priceService } from './priceService';
import { battleManager } from './battleManager';
import { Pool } from 'pg';

// Database connection for direct queries
const DATABASE_URL = process.env.DATABASE_URL;
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    })
  : null;

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

export interface UserListEntry {
  walletAddress: string;
  totalXp: number;
  currentLevel: number;
  totalWagered: number;
  totalProfitLoss: number;
  lastActivity: number | null;
}

export interface UserStatsOverview {
  totalUsers: number;
  usersWithActivity: number;
  totalVolumeAllTime: number;
  totalProfitLossAllTime: number;
  avgWagerSize: number;
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
  gameModeBalances: ReturnType<typeof balanceDb.getAllGameModeBalances>;
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

export interface HealthStatus {
  backend: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    connections: number;
    memoryUsage: number;
  };
  rpc: {
    status: 'healthy' | 'degraded' | 'down';
    latency: number | null;
    lastSuccess: number | null;
  };
  priceService: {
    status: 'healthy' | 'degraded' | 'down';
    lastUpdate: number | null;
    assetCount: number;
  };
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connected: boolean;
  };
  pendingTx: {
    count: number;
    oldestAge: number | null;
  };
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();
let activeSocketConnections = 0;

export function setActiveConnections(count: number): void {
  activeSocketConnections = count;
}

// ===================
// Overview Stats
// ===================

export async function getOverviewStats(): Promise<OverviewStats> {
  const [users, games, progression, health] = await Promise.all([
    getUserSummary(),
    getGameSummary(),
    getProgressionSummary(),
    getHealthSummary(),
  ]);

  return {
    users,
    games,
    progression,
    health,
  };
}

async function getUserSummary(): Promise<OverviewStats['users']> {
  let total = 0;
  let active24h = 0;
  let withBalance = 0;

  if (pool) {
    try {
      // Total users with progression data
      const totalResult = await pool.query('SELECT COUNT(*) as count FROM user_progression');
      total = parseInt(totalResult.rows[0]?.count || '0');

      // Users active in last 24h
      const last24h = Date.now() - 24 * 60 * 60 * 1000;
      const activeResult = await pool.query(
        'SELECT COUNT(*) as count FROM user_progression WHERE updated_at >= $1',
        [last24h]
      );
      active24h = parseInt(activeResult.rows[0]?.count || '0');

      // Users with free bet balance
      const balanceResult = await pool.query(
        'SELECT COUNT(*) as count FROM free_bet_credits WHERE balance > 0'
      );
      withBalance = parseInt(balanceResult.rows[0]?.count || '0');
    } catch (error) {
      console.error('[AdminService] getUserSummary error:', error);
    }
  }

  return { total, active24h, withBalance };
}

async function getGameSummary(): Promise<OverviewStats['games']> {
  const oracleStats = predictionService.getStats('SOL');
  const gameModeBalances = balanceDb.getAllGameModeBalances();

  // Calculate today's activity
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayStart = startOfDay.getTime();

  // Get rounds from prediction service
  const recentRounds = predictionService.getRecentRounds('SOL', 100);
  const roundsToday = recentRounds.filter(r => r.startTime >= todayStart).length;
  const volumeToday = recentRounds
    .filter(r => r.startTime >= todayStart)
    .reduce((sum, r) => sum + r.totalPool, 0);
  const feesToday = volumeToday * 0.05; // 5% fee

  return {
    oracleRoundsToday: roundsToday,
    volumeToday,
    feesToday,
  };
}

async function getProgressionSummary(): Promise<OverviewStats['progression']> {
  let totalXpAwarded = 0;
  let freeBetsIssued = 0;

  if (pool) {
    try {
      // Total XP awarded
      const xpResult = await pool.query('SELECT COALESCE(SUM(xp_amount), 0) as total FROM xp_history');
      totalXpAwarded = parseInt(xpResult.rows[0]?.total || '0');

      // Total free bets issued
      const fbResult = await pool.query('SELECT COALESCE(SUM(lifetime_earned), 0) as total FROM free_bet_credits');
      freeBetsIssued = parseInt(fbResult.rows[0]?.total || '0');
    } catch (error) {
      console.error('[AdminService] getProgressionSummary error:', error);
    }
  }

  return { totalXpAwarded, freeBetsIssued };
}

async function getHealthSummary(): Promise<OverviewStats['health']> {
  const health = await getHealthStatus();

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  if (health.backend.status === 'down' || health.database.status === 'down') {
    status = 'down';
  } else if (
    health.backend.status === 'degraded' ||
    health.priceService.status === 'degraded' ||
    health.rpc.status === 'degraded'
  ) {
    status = 'degraded';
  }

  return {
    status,
    activeConnections: activeSocketConnections,
  };
}

// ===================
// User Stats
// ===================

export async function getUserStats(): Promise<UserStatsOverview> {
  // Get leaderboard data for aggregate stats
  const leaderboard = userStatsDb.getStatsLeaderboard('volume', 1000);

  const totalUsers = leaderboard.length;
  const usersWithActivity = leaderboard.filter(u => u.totalWagers > 0).length;
  const totalVolumeAllTime = leaderboard.reduce((sum, u) => sum + u.totalWagered, 0);
  const totalProfitLossAllTime = leaderboard.reduce((sum, u) => sum + u.totalProfitLoss, 0);
  const avgWagerSize = usersWithActivity > 0
    ? totalVolumeAllTime / leaderboard.reduce((sum, u) => sum + u.totalWagers, 0)
    : 0;

  return {
    totalUsers,
    usersWithActivity,
    totalVolumeAllTime,
    totalProfitLossAllTime,
    avgWagerSize,
  };
}

export async function getUserList(limit: number = 50, offset: number = 0): Promise<{
  users: UserListEntry[];
  total: number;
}> {
  const users: UserListEntry[] = [];
  let total = 0;

  if (pool) {
    try {
      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) as count FROM user_progression');
      total = parseInt(countResult.rows[0]?.count || '0');

      // Get users with their stats
      const result = await pool.query(
        `SELECT
          p.wallet_address,
          p.total_xp,
          p.current_level,
          p.updated_at as last_activity
        FROM user_progression p
        ORDER BY p.total_xp DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      for (const row of result.rows) {
        const stats = userStatsDb.getUserStats(row.wallet_address);
        users.push({
          walletAddress: row.wallet_address,
          totalXp: row.total_xp,
          currentLevel: row.current_level,
          totalWagered: stats.totalWagered,
          totalProfitLoss: stats.totalProfitLoss,
          lastActivity: parseInt(row.last_activity) || null,
        });
      }
    } catch (error) {
      console.error('[AdminService] getUserList error:', error);
    }
  }

  return { users, total };
}

// ===================
// Game Stats
// ===================

export async function getGameStats(): Promise<GameStatsOverview> {
  const gameModeBalances = balanceDb.getAllGameModeBalances();
  const oracleStats = predictionService.getStats('SOL');

  // Get today's stats
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayStart = startOfDay.getTime();

  const recentRounds = predictionService.getRecentRounds('SOL', 100);
  const roundsToday = recentRounds.filter(r => r.startTime >= todayStart).length;
  const volumeToday = recentRounds
    .filter(r => r.startTime >= todayStart)
    .reduce((sum, r) => sum + r.totalPool, 0);

  // Get battle stats
  const activeBattles = battleManager.getActiveBattles();
  const recentBattles = battleManager.getRecentBattles(50);
  const battlesToday = recentBattles.filter(b => b.startedAt && b.startedAt >= todayStart).length;
  const battleVolumeToday = recentBattles
    .filter(b => b.startedAt && b.startedAt >= todayStart)
    .reduce((sum, b) => sum + b.prizePool, 0);

  return {
    oracle: {
      totalRounds: oracleStats?.totalRounds ?? 0,
      totalVolume: oracleStats?.totalVolume ?? 0,
      totalFees: (oracleStats?.totalVolume ?? 0) * 0.05,
      roundsToday,
      volumeToday,
    },
    battle: {
      activeBattles: activeBattles.length,
      completedToday: battlesToday,
      volumeToday: battleVolumeToday,
    },
    gameModeBalances,
  };
}

export function getRecentOracleRounds(limit: number = 20): OracleRound[] {
  const rounds = predictionService.getRecentRounds('SOL', limit);
  return rounds.map(r => ({
    id: r.id,
    asset: r.asset,
    status: r.status,
    startPrice: r.startPrice,
    endPrice: r.endPrice,
    startTime: r.startTime,
    endTime: r.endTime,
    totalPool: r.totalPool,
    winner: r.winner,
  }));
}

// ===================
// Progression Stats
// ===================

export async function getProgressionStats(): Promise<ProgressionStatsOverview> {
  let totalXpAwarded = 0;
  let averageLevel = 1;
  const levelDistribution: Record<string, number> = {};
  let totalFreeBetsIssued = 0;
  let totalPerksUnlocked = 0;

  if (pool) {
    try {
      // Total XP awarded
      const xpResult = await pool.query('SELECT COALESCE(SUM(xp_amount), 0) as total FROM xp_history');
      totalXpAwarded = parseInt(xpResult.rows[0]?.total || '0');

      // Average level and distribution
      const levelResult = await pool.query(
        `SELECT current_level, COUNT(*) as count FROM user_progression GROUP BY current_level ORDER BY current_level`
      );

      let totalLevels = 0;
      let userCount = 0;
      for (const row of levelResult.rows) {
        const level = row.current_level;
        const count = parseInt(row.count);
        levelDistribution[`${level}`] = count;
        totalLevels += level * count;
        userCount += count;
      }
      averageLevel = userCount > 0 ? Math.round((totalLevels / userCount) * 10) / 10 : 1;

      // Total free bets
      const fbResult = await pool.query('SELECT COALESCE(SUM(lifetime_earned), 0) as total FROM free_bet_credits');
      totalFreeBetsIssued = parseInt(fbResult.rows[0]?.total || '0');

      // Total perks unlocked
      const perkResult = await pool.query('SELECT COUNT(*) as count FROM user_perks');
      totalPerksUnlocked = parseInt(perkResult.rows[0]?.count || '0');
    } catch (error) {
      console.error('[AdminService] getProgressionStats error:', error);
    }
  }

  return {
    totalXpAwarded,
    averageLevel,
    levelDistribution,
    totalFreeBetsIssued,
    totalPerksUnlocked,
  };
}

export async function getXpLeaderboard(limit: number = 50): Promise<XpLeaderboardEntry[]> {
  const entries: XpLeaderboardEntry[] = [];

  if (pool) {
    try {
      const result = await pool.query(
        `SELECT wallet_address, total_xp, current_level
         FROM user_progression
         ORDER BY total_xp DESC
         LIMIT $1`,
        [limit]
      );

      for (const row of result.rows) {
        entries.push({
          walletAddress: row.wallet_address,
          totalXp: row.total_xp,
          currentLevel: row.current_level,
        });
      }
    } catch (error) {
      console.error('[AdminService] getXpLeaderboard error:', error);
    }
  }

  return entries;
}

// ===================
// Health Status
// ===================

export async function getHealthStatus(): Promise<HealthStatus> {
  const now = Date.now();

  // Backend health
  const memoryUsage = process.memoryUsage();
  const memoryPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

  // Price service health
  const prices = priceService.getAllPrices();
  const priceAssets = Object.keys(prices);
  const hasRecentPrices = priceAssets.length > 0;

  // Database health
  let dbConnected = false;
  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbConnected = true;
    } catch {
      dbConnected = false;
    }
  }

  // Pending transactions
  const gameModeBalances = balanceDb.getAllGameModeBalances();
  let pendingCount = 0;
  for (const mode of Object.values(gameModeBalances)) {
    if (mode.activeGames > 0) pendingCount += mode.activeGames;
  }

  return {
    backend: {
      status: memoryPercent > 90 ? 'degraded' : 'healthy',
      uptime: now - serverStartTime,
      connections: activeSocketConnections,
      memoryUsage: memoryPercent,
    },
    rpc: {
      status: 'healthy', // Would need actual RPC health check
      latency: null,
      lastSuccess: now,
    },
    priceService: {
      status: hasRecentPrices ? 'healthy' : 'degraded',
      lastUpdate: hasRecentPrices ? now : null,
      assetCount: priceAssets.length,
    },
    database: {
      status: dbConnected ? 'healthy' : 'down',
      connected: dbConnected,
    },
    pendingTx: {
      count: pendingCount,
      oldestAge: null,
    },
  };
}

console.log('[AdminService] Admin service loaded');
