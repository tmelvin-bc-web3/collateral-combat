/**
 * Rating Database - SQLite storage for the DegenDome Rating (DR) system
 *
 * Tables:
 * - player_rating: Core rating data (DR, tier, division, shields, placement)
 * - dr_history: Per-match DR change log
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// ===================
// Database Setup
// ===================

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'rating.db'));
db.pragma('journal_mode = WAL');

// ===================
// Type Definitions
// ===================

export interface PlayerRating {
  wallet: string;
  dr: number;
  tier: string;
  division: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  isPlacement: boolean;
  placementMatches: number;
  divisionShield: number;
  tierShield: number;
  peakDr: number;
  currentStreak: number;
  createdAt: number;
  updatedAt: number;
}

export interface DrHistoryRecord {
  id: string;
  wallet: string;
  battleId: string;
  drBefore: number;
  drAfter: number;
  drChange: number;
  opponentWallet: string;
  opponentDr: number;
  isWin: boolean;
  kFactor: number;
  createdAt: number;
}

// ===================
// Database Row Types
// ===================

interface PlayerRatingRow {
  wallet: string;
  dr: number;
  tier: string;
  division: number;
  matches_played: number;
  wins: number;
  losses: number;
  is_placement: number;
  placement_matches: number;
  division_shield: number;
  tier_shield: number;
  peak_dr: number;
  current_streak: number;
  created_at: number;
  updated_at: number;
}

interface DrHistoryRow {
  id: string;
  wallet: string;
  battle_id: string;
  dr_before: number;
  dr_after: number;
  dr_change: number;
  opponent_wallet: string;
  opponent_dr: number;
  is_win: number;
  k_factor: number;
  created_at: number;
}

// ===================
// Schema Initialization
// ===================

db.exec(`
  CREATE TABLE IF NOT EXISTS player_rating (
    wallet TEXT PRIMARY KEY,
    dr INTEGER DEFAULT 1000,
    tier TEXT DEFAULT 'retail',
    division INTEGER DEFAULT 4,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    is_placement INTEGER DEFAULT 1,
    placement_matches INTEGER DEFAULT 0,
    division_shield INTEGER DEFAULT 0,
    tier_shield INTEGER DEFAULT 0,
    peak_dr INTEGER DEFAULT 1000,
    current_streak INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_player_rating_dr ON player_rating(dr);
  CREATE INDEX IF NOT EXISTS idx_player_rating_tier ON player_rating(tier);

  CREATE TABLE IF NOT EXISTS dr_history (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    battle_id TEXT NOT NULL,
    dr_before INTEGER NOT NULL,
    dr_after INTEGER NOT NULL,
    dr_change INTEGER NOT NULL,
    opponent_wallet TEXT NOT NULL,
    opponent_dr INTEGER NOT NULL,
    is_win INTEGER NOT NULL,
    k_factor INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_dr_history_wallet ON dr_history(wallet);
  CREATE INDEX IF NOT EXISTS idx_dr_history_battle ON dr_history(battle_id);
`);

console.log('[RatingDatabase] Rating database initialized');

// ===================
// Row Mappers
// ===================

function mapPlayerRatingRow(row: PlayerRatingRow): PlayerRating {
  return {
    wallet: row.wallet,
    dr: row.dr,
    tier: row.tier,
    division: row.division,
    matchesPlayed: row.matches_played,
    wins: row.wins,
    losses: row.losses,
    isPlacement: row.is_placement === 1,
    placementMatches: row.placement_matches,
    divisionShield: row.division_shield,
    tierShield: row.tier_shield,
    peakDr: row.peak_dr,
    currentStreak: row.current_streak,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDrHistoryRow(row: DrHistoryRow): DrHistoryRecord {
  return {
    id: row.id,
    wallet: row.wallet,
    battleId: row.battle_id,
    drBefore: row.dr_before,
    drAfter: row.dr_after,
    drChange: row.dr_change,
    opponentWallet: row.opponent_wallet,
    opponentDr: row.opponent_dr,
    isWin: row.is_win === 1,
    kFactor: row.k_factor,
    createdAt: row.created_at,
  };
}

// ===================
// Prepared Statements
// ===================

const stmts = {
  getByWallet: db.prepare('SELECT * FROM player_rating WHERE wallet = ?'),

  upsert: db.prepare(`
    INSERT INTO player_rating (wallet, dr, tier, division, matches_played, wins, losses, is_placement, placement_matches, division_shield, tier_shield, peak_dr, current_streak, created_at, updated_at)
    VALUES (@wallet, @dr, @tier, @division, @matchesPlayed, @wins, @losses, @isPlacement, @placementMatches, @divisionShield, @tierShield, @peakDr, @currentStreak, @createdAt, @updatedAt)
    ON CONFLICT(wallet) DO UPDATE SET
      dr = @dr,
      tier = @tier,
      division = @division,
      matches_played = @matchesPlayed,
      wins = @wins,
      losses = @losses,
      is_placement = @isPlacement,
      placement_matches = @placementMatches,
      division_shield = @divisionShield,
      tier_shield = @tierShield,
      peak_dr = @peakDr,
      current_streak = @currentStreak,
      updated_at = @updatedAt
  `),

  insertHistory: db.prepare(`
    INSERT INTO dr_history (id, wallet, battle_id, dr_before, dr_after, dr_change, opponent_wallet, opponent_dr, is_win, k_factor, created_at)
    VALUES (@id, @wallet, @battleId, @drBefore, @drAfter, @drChange, @opponentWallet, @opponentDr, @isWin, @kFactor, @createdAt)
  `),

  getHistory: db.prepare('SELECT * FROM dr_history WHERE wallet = ? ORDER BY created_at DESC LIMIT ?'),

  getLeaderboard: db.prepare('SELECT * FROM player_rating ORDER BY dr DESC LIMIT ? OFFSET ?'),

  getPlayerRank: db.prepare('SELECT COUNT(*) as rank FROM player_rating WHERE dr > (SELECT dr FROM player_rating WHERE wallet = ?)'),

  getPlayerCount: db.prepare('SELECT COUNT(*) as count FROM player_rating'),

  getTopPlayers: db.prepare('SELECT * FROM player_rating ORDER BY dr DESC LIMIT ?'),

  getGlobalStats: db.prepare(`
    SELECT
      COUNT(*) as total_players,
      AVG(dr) as avg_dr,
      MAX(dr) as max_dr,
      SUM(matches_played) as total_matches,
      SUM(wins) as total_wins
    FROM player_rating
  `),

  getLeaderboardByTier: db.prepare('SELECT * FROM player_rating WHERE tier = ? ORDER BY dr DESC LIMIT ? OFFSET ?'),

  getCountByTier: db.prepare('SELECT COUNT(*) as count FROM player_rating WHERE tier = ?'),
};

// ===================
// Public API
// ===================

/**
 * Get player rating by wallet. Returns null if not found.
 */
export function getPlayerRating(wallet: string): PlayerRating | null {
  const row = stmts.getByWallet.get(wallet) as PlayerRatingRow | undefined;
  return row ? mapPlayerRatingRow(row) : null;
}

/**
 * Get or create a player rating record.
 * New players start at 1000 DR, Retail tier, division IV, in placement.
 */
export function getOrCreatePlayerRating(wallet: string): PlayerRating {
  const existing = getPlayerRating(wallet);
  if (existing) return existing;

  const now = Date.now();
  const newRating: PlayerRating = {
    wallet,
    dr: 1000,
    tier: 'retail',
    division: 4,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    isPlacement: true,
    placementMatches: 0,
    divisionShield: 0,
    tierShield: 0,
    peakDr: 1000,
    currentStreak: 0,
    createdAt: now,
    updatedAt: now,
  };

  stmts.upsert.run({
    wallet: newRating.wallet,
    dr: newRating.dr,
    tier: newRating.tier,
    division: newRating.division,
    matchesPlayed: newRating.matchesPlayed,
    wins: newRating.wins,
    losses: newRating.losses,
    isPlacement: newRating.isPlacement ? 1 : 0,
    placementMatches: newRating.placementMatches,
    divisionShield: newRating.divisionShield,
    tierShield: newRating.tierShield,
    peakDr: newRating.peakDr,
    currentStreak: newRating.currentStreak,
    createdAt: newRating.createdAt,
    updatedAt: newRating.updatedAt,
  });

  return newRating;
}

/**
 * Update a player's rating record.
 */
export function updatePlayerRating(rating: PlayerRating): void {
  stmts.upsert.run({
    wallet: rating.wallet,
    dr: rating.dr,
    tier: rating.tier,
    division: rating.division,
    matchesPlayed: rating.matchesPlayed,
    wins: rating.wins,
    losses: rating.losses,
    isPlacement: rating.isPlacement ? 1 : 0,
    placementMatches: rating.placementMatches,
    divisionShield: rating.divisionShield,
    tierShield: rating.tierShield,
    peakDr: rating.peakDr,
    currentStreak: rating.currentStreak,
    createdAt: rating.createdAt,
    updatedAt: Date.now(),
  });
}

/**
 * Record a DR change in the history table.
 */
export function recordDrChange(record: Omit<DrHistoryRecord, 'id' | 'createdAt'>): void {
  stmts.insertHistory.run({
    id: uuidv4(),
    wallet: record.wallet,
    battleId: record.battleId,
    drBefore: record.drBefore,
    drAfter: record.drAfter,
    drChange: record.drChange,
    opponentWallet: record.opponentWallet,
    opponentDr: record.opponentDr,
    isWin: record.isWin ? 1 : 0,
    kFactor: record.kFactor,
    createdAt: Date.now(),
  });
}

/**
 * Get DR change history for a wallet.
 */
export function getDrHistory(wallet: string, limit: number = 20): DrHistoryRecord[] {
  const rows = stmts.getHistory.all(wallet, limit) as DrHistoryRow[];
  return rows.map(mapDrHistoryRow);
}

/**
 * Get paginated leaderboard sorted by DR descending.
 */
export function getLeaderboard(limit: number = 50, offset: number = 0, tier?: string): PlayerRating[] {
  let rows: PlayerRatingRow[];
  if (tier) {
    rows = stmts.getLeaderboardByTier.all(tier, limit, offset) as PlayerRatingRow[];
  } else {
    rows = stmts.getLeaderboard.all(limit, offset) as PlayerRatingRow[];
  }
  return rows.map(mapPlayerRatingRow);
}

/**
 * Get a player's rank (1-indexed). Returns 0 if player not found.
 */
export function getPlayerRank(wallet: string): number {
  const row = stmts.getPlayerRank.get(wallet) as { rank: number } | undefined;
  return row ? row.rank + 1 : 0;
}

/**
 * Get total number of rated players.
 */
export function getPlayerCount(): number {
  const row = stmts.getPlayerCount.get() as { count: number };
  return row.count;
}

/**
 * Get top N players by DR.
 */
export function getTopPlayers(limit: number = 10): PlayerRating[] {
  const rows = stmts.getTopPlayers.all(limit) as PlayerRatingRow[];
  return rows.map(mapPlayerRatingRow);
}

/**
 * Get global rating statistics.
 */
export function getGlobalStats(): {
  totalPlayers: number;
  avgDr: number;
  maxDr: number;
  totalMatches: number;
  totalWins: number;
} {
  const row = stmts.getGlobalStats.get() as {
    total_players: number;
    avg_dr: number | null;
    max_dr: number | null;
    total_matches: number | null;
    total_wins: number | null;
  };

  return {
    totalPlayers: row.total_players,
    avgDr: Math.round(row.avg_dr || 1000),
    maxDr: row.max_dr || 1000,
    totalMatches: row.total_matches || 0,
    totalWins: row.total_wins || 0,
  };
}

console.log('[RatingDatabase] Rating database module loaded');
