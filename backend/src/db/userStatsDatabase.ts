import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'user_stats.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  -- User wager/bet records
  CREATE TABLE IF NOT EXISTS user_wagers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    wager_type TEXT NOT NULL,
    amount REAL NOT NULL,
    outcome TEXT NOT NULL,
    profit_loss REAL NOT NULL,
    game_id TEXT,
    created_at INTEGER NOT NULL
  );

  -- User stats summary (cached for performance)
  CREATE TABLE IF NOT EXISTS user_stats_cache (
    wallet_address TEXT PRIMARY KEY,
    total_wagers INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_pushes INTEGER DEFAULT 0,
    total_wagered REAL DEFAULT 0,
    total_profit_loss REAL DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_wager_at INTEGER,
    updated_at INTEGER NOT NULL
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_user_wagers_wallet ON user_wagers(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_user_wagers_created ON user_wagers(created_at);
  CREATE INDEX IF NOT EXISTS idx_user_wagers_type ON user_wagers(wager_type);
`);

// ===================
// Type Definitions
// ===================

export type WagerType = 'spectator' | 'prediction' | 'battle' | 'draft';
export type WagerOutcome = 'won' | 'lost' | 'push' | 'cancelled';

export interface UserWager {
  id: number;
  walletAddress: string;
  wagerType: WagerType;
  amount: number;
  outcome: WagerOutcome;
  profitLoss: number;
  gameId?: string;
  createdAt: number;
}

export interface UserStats {
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

export interface WagerHistoryOptions {
  limit?: number;
  offset?: number;
  wagerType?: WagerType;
  startDate?: number;
  endDate?: number;
}

// ===================
// Prepared Statements
// ===================

const insertWager = db.prepare(`
  INSERT INTO user_wagers (wallet_address, wager_type, amount, outcome, profit_loss, game_id, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getWagersByWallet = db.prepare(`
  SELECT * FROM user_wagers WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

const getWagersByWalletFiltered = db.prepare(`
  SELECT * FROM user_wagers
  WHERE wallet_address = ?
    AND (? IS NULL OR wager_type = ?)
    AND (? IS NULL OR created_at >= ?)
    AND (? IS NULL OR created_at <= ?)
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`);

const countWagersByWallet = db.prepare(`
  SELECT COUNT(*) as count FROM user_wagers
  WHERE wallet_address = ?
    AND (? IS NULL OR wager_type = ?)
    AND (? IS NULL OR created_at >= ?)
    AND (? IS NULL OR created_at <= ?)
`);

const getStatsCache = db.prepare(`
  SELECT * FROM user_stats_cache WHERE wallet_address = ?
`);

const upsertStatsCache = db.prepare(`
  INSERT INTO user_stats_cache (
    wallet_address, total_wagers, total_wins, total_losses, total_pushes,
    total_wagered, total_profit_loss, best_streak, current_streak, last_wager_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(wallet_address) DO UPDATE SET
    total_wagers = excluded.total_wagers,
    total_wins = excluded.total_wins,
    total_losses = excluded.total_losses,
    total_pushes = excluded.total_pushes,
    total_wagered = excluded.total_wagered,
    total_profit_loss = excluded.total_profit_loss,
    best_streak = excluded.best_streak,
    current_streak = excluded.current_streak,
    last_wager_at = excluded.last_wager_at,
    updated_at = excluded.updated_at
`);

const getRecentOutcomes = db.prepare(`
  SELECT outcome FROM user_wagers
  WHERE wallet_address = ? AND outcome IN ('won', 'lost')
  ORDER BY created_at DESC
  LIMIT 100
`);

// Get stats leaderboard
const getLeaderboard = db.prepare(`
  SELECT * FROM user_stats_cache
  ORDER BY total_profit_loss DESC
  LIMIT ?
`);

const getLeaderboardByWinRate = db.prepare(`
  SELECT * FROM user_stats_cache
  WHERE total_wagers >= 10
  ORDER BY (CAST(total_wins AS REAL) / total_wagers) DESC
  LIMIT ?
`);

const getLeaderboardByVolume = db.prepare(`
  SELECT * FROM user_stats_cache
  ORDER BY total_wagered DESC
  LIMIT ?
`);

const getUserRank = db.prepare(`
  SELECT COUNT(*) + 1 as rank FROM user_stats_cache
  WHERE total_profit_loss > (SELECT total_profit_loss FROM user_stats_cache WHERE wallet_address = ?)
`);

const getWagersByGameId = db.prepare(`
  SELECT * FROM user_wagers WHERE game_id = ? ORDER BY created_at DESC
`);

// ===================
// Functions
// ===================

export function recordWager(
  walletAddress: string,
  wagerType: WagerType,
  amount: number,
  outcome: WagerOutcome,
  profitLoss: number,
  gameId?: string
): UserWager {
  const now = Date.now();
  const result = insertWager.run(
    walletAddress,
    wagerType,
    amount,
    outcome,
    profitLoss,
    gameId || null,
    now
  );

  // Update stats cache
  updateStatsCache(walletAddress);

  return {
    id: Number(result.lastInsertRowid),
    walletAddress,
    wagerType,
    amount,
    outcome,
    profitLoss,
    gameId,
    createdAt: now,
  };
}

export function getWagerHistory(
  walletAddress: string,
  options: WagerHistoryOptions = {}
): { wagers: UserWager[]; total: number } {
  const limit = Math.min(options.limit || 20, 100);
  const offset = options.offset || 0;
  const wagerType = options.wagerType || null;
  const startDate = options.startDate || null;
  const endDate = options.endDate || null;

  const rows = getWagersByWalletFiltered.all(
    walletAddress,
    wagerType, wagerType,
    startDate, startDate,
    endDate, endDate,
    limit,
    offset
  ) as any[];

  const countResult = countWagersByWallet.get(
    walletAddress,
    wagerType, wagerType,
    startDate, startDate,
    endDate, endDate
  ) as any;

  return {
    wagers: rows.map(mapWagerRow),
    total: countResult.count,
  };
}

export function getUserStats(walletAddress: string): UserStats {
  let cache = getStatsCache.get(walletAddress) as any;

  if (!cache) {
    // Create empty stats
    return {
      walletAddress,
      totalWagers: 0,
      totalWins: 0,
      totalLosses: 0,
      totalPushes: 0,
      totalWagered: 0,
      totalProfitLoss: 0,
      winRate: 0,
      bestStreak: 0,
      currentStreak: 0,
      lastWagerAt: null,
    };
  }

  const totalDecided = cache.total_wins + cache.total_losses;
  const winRate = totalDecided > 0 ? (cache.total_wins / totalDecided) * 100 : 0;

  return {
    walletAddress: cache.wallet_address,
    totalWagers: cache.total_wagers,
    totalWins: cache.total_wins,
    totalLosses: cache.total_losses,
    totalPushes: cache.total_pushes,
    totalWagered: cache.total_wagered,
    totalProfitLoss: cache.total_profit_loss,
    winRate: Math.round(winRate * 100) / 100,
    bestStreak: cache.best_streak,
    currentStreak: cache.current_streak,
    lastWagerAt: cache.last_wager_at,
  };
}

function updateStatsCache(walletAddress: string): void {
  const now = Date.now();

  // Calculate stats from wager history
  const statsQuery = db.prepare(`
    SELECT
      COUNT(*) as total_wagers,
      SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) as total_wins,
      SUM(CASE WHEN outcome = 'lost' THEN 1 ELSE 0 END) as total_losses,
      SUM(CASE WHEN outcome = 'push' THEN 1 ELSE 0 END) as total_pushes,
      SUM(amount) as total_wagered,
      SUM(profit_loss) as total_profit_loss,
      MAX(created_at) as last_wager_at
    FROM user_wagers
    WHERE wallet_address = ?
  `);

  const stats = statsQuery.get(walletAddress) as any;

  // Calculate streaks
  const outcomes = getRecentOutcomes.all(walletAddress) as any[];
  const { currentStreak, bestStreak } = calculateStreaks(outcomes.map(o => o.outcome));

  upsertStatsCache.run(
    walletAddress,
    stats.total_wagers || 0,
    stats.total_wins || 0,
    stats.total_losses || 0,
    stats.total_pushes || 0,
    stats.total_wagered || 0,
    stats.total_profit_loss || 0,
    bestStreak,
    currentStreak,
    stats.last_wager_at,
    now
  );
}

function calculateStreaks(outcomes: WagerOutcome[]): { currentStreak: number; bestStreak: number } {
  if (outcomes.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  // Current streak (from most recent)
  for (let i = 0; i < outcomes.length; i++) {
    if (outcomes[i] === 'won') {
      currentStreak++;
    } else {
      break;
    }
  }

  // Best streak (scan all)
  for (const outcome of outcomes) {
    if (outcome === 'won') {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, bestStreak };
}

export function getStatsLeaderboard(
  metric: 'profit' | 'winRate' | 'volume' = 'profit',
  limit: number = 50
): UserStats[] {
  let rows: any[];

  switch (metric) {
    case 'winRate':
      rows = getLeaderboardByWinRate.all(limit) as any[];
      break;
    case 'volume':
      rows = getLeaderboardByVolume.all(limit) as any[];
      break;
    case 'profit':
    default:
      rows = getLeaderboard.all(limit) as any[];
  }

  return rows.map(mapStatsCacheRow);
}

export function getUserRankByProfit(walletAddress: string): number | null {
  const result = getUserRank.get(walletAddress) as any;
  if (!result) return null;
  return result.rank;
}

export function getWagersByRoundId(roundId: string): UserWager[] {
  const rows = getWagersByGameId.all(roundId) as any[];
  return rows.map(mapWagerRow);
}

function mapWagerRow(row: any): UserWager {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    wagerType: row.wager_type as WagerType,
    amount: row.amount,
    outcome: row.outcome as WagerOutcome,
    profitLoss: row.profit_loss,
    gameId: row.game_id || undefined,
    createdAt: row.created_at,
  };
}

function mapStatsCacheRow(row: any): UserStats {
  const totalDecided = row.total_wins + row.total_losses;
  const winRate = totalDecided > 0 ? (row.total_wins / totalDecided) * 100 : 0;

  return {
    walletAddress: row.wallet_address,
    totalWagers: row.total_wagers,
    totalWins: row.total_wins,
    totalLosses: row.total_losses,
    totalPushes: row.total_pushes,
    totalWagered: row.total_wagered,
    totalProfitLoss: row.total_profit_loss,
    winRate: Math.round(winRate * 100) / 100,
    bestStreak: row.best_streak,
    currentStreak: row.current_streak,
    lastWagerAt: row.last_wager_at,
  };
}
