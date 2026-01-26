// Token Wars Database
// Tracks battles, bets, and results for head-to-head token price battles

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'token_wars.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================
// Types
// ============================================

export type TWBattleStatus = 'betting' | 'in_progress' | 'cooldown' | 'completed' | 'cancelled';
export type TWBetSide = 'token_a' | 'token_b';

export interface TWBattleRecord {
  id: string;
  tokenA: string;            // Token symbol (e.g., 'BTC')
  tokenB: string;            // Token symbol (e.g., 'ETH')
  tokenAPythFeed: string;    // Pyth price feed ID for token A
  tokenBPythFeed: string;    // Pyth price feed ID for token B
  status: TWBattleStatus;
  bettingStartTime: number;
  bettingEndTime: number;
  battleStartTime: number | null;
  battleEndTime: number | null;
  tokenAStartPrice: number | null;
  tokenAEndPrice: number | null;
  tokenBStartPrice: number | null;
  tokenBEndPrice: number | null;
  tokenAPercentChange: number | null;
  tokenBPercentChange: number | null;
  winner: TWBetSide | 'tie' | null;
  totalBetsTokenA: number;   // Total lamports bet on token A
  totalBetsTokenB: number;   // Total lamports bet on token B
  totalBettors: number;
  createdAt: number;
}

export interface TWBetRecord {
  id: string;
  battleId: string;
  walletAddress: string;
  side: TWBetSide;
  amountLamports: number;
  payoutLamports: number;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  createdAt: number;
  settledAt: number | null;
}

export interface TWPlayerStats {
  walletAddress: string;
  totalBattles: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalWon: number;
  netProfitLoss: number;
  winRate: number;
}

// ============================================
// Schema
// ============================================

db.exec(`
  -- Battles table
  CREATE TABLE IF NOT EXISTS tw_battles (
    id TEXT PRIMARY KEY,
    token_a TEXT NOT NULL,
    token_b TEXT NOT NULL,
    token_a_pyth_feed TEXT NOT NULL,
    token_b_pyth_feed TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'betting',
    betting_start_time INTEGER NOT NULL,
    betting_end_time INTEGER NOT NULL,
    battle_start_time INTEGER,
    battle_end_time INTEGER,
    token_a_start_price REAL,
    token_a_end_price REAL,
    token_b_start_price REAL,
    token_b_end_price REAL,
    token_a_percent_change REAL,
    token_b_percent_change REAL,
    winner TEXT,
    total_bets_token_a INTEGER DEFAULT 0,
    total_bets_token_b INTEGER DEFAULT 0,
    total_bettors INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Bets table
  CREATE TABLE IF NOT EXISTS tw_bets (
    id TEXT PRIMARY KEY,
    battle_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    side TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    payout_lamports INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    settled_at INTEGER,
    FOREIGN KEY (battle_id) REFERENCES tw_battles(id),
    UNIQUE(battle_id, wallet_address)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_tw_battles_status ON tw_battles(status);
  CREATE INDEX IF NOT EXISTS idx_tw_battles_betting_end ON tw_battles(betting_end_time);
  CREATE INDEX IF NOT EXISTS idx_tw_bets_battle ON tw_bets(battle_id);
  CREATE INDEX IF NOT EXISTS idx_tw_bets_wallet ON tw_bets(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_tw_bets_status ON tw_bets(status);
`);

// ============================================
// Prepared Statements
// ============================================

const stmts = {
  // Battles
  insertBattle: db.prepare(`
    INSERT INTO tw_battles (
      id, token_a, token_b, token_a_pyth_feed, token_b_pyth_feed,
      status, betting_start_time, betting_end_time, created_at
    )
    VALUES (?, ?, ?, ?, ?, 'betting', ?, ?, ?)
  `),
  getBattle: db.prepare(`SELECT * FROM tw_battles WHERE id = ?`),
  getActiveBattle: db.prepare(`SELECT * FROM tw_battles WHERE status IN ('betting', 'in_progress', 'cooldown') ORDER BY created_at DESC LIMIT 1`),
  getBettingBattle: db.prepare(`SELECT * FROM tw_battles WHERE status = 'betting' ORDER BY created_at DESC LIMIT 1`),
  getInProgressBattle: db.prepare(`SELECT * FROM tw_battles WHERE status = 'in_progress' ORDER BY created_at DESC LIMIT 1`),
  updateBattleStatus: db.prepare(`UPDATE tw_battles SET status = ? WHERE id = ?`),
  startBattle: db.prepare(`
    UPDATE tw_battles SET
      status = 'in_progress',
      battle_start_time = ?,
      token_a_start_price = ?,
      token_b_start_price = ?
    WHERE id = ?
  `),
  endBattle: db.prepare(`
    UPDATE tw_battles SET
      status = 'completed',
      battle_end_time = ?,
      token_a_end_price = ?,
      token_b_end_price = ?,
      token_a_percent_change = ?,
      token_b_percent_change = ?,
      winner = ?
    WHERE id = ?
  `),
  updateBattleTotals: db.prepare(`
    UPDATE tw_battles SET
      total_bets_token_a = ?,
      total_bets_token_b = ?,
      total_bettors = ?
    WHERE id = ?
  `),
  getRecentBattles: db.prepare(`
    SELECT * FROM tw_battles
    WHERE status = 'completed'
    ORDER BY battle_end_time DESC
    LIMIT ?
  `),
  getBattlesByTokens: db.prepare(`
    SELECT * FROM tw_battles
    WHERE (token_a = ? AND token_b = ?) OR (token_a = ? AND token_b = ?)
    ORDER BY created_at DESC
    LIMIT ?
  `),

  // Bets
  insertBet: db.prepare(`
    INSERT INTO tw_bets (id, battle_id, wallet_address, side, amount_lamports, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `),
  // Atomic upsert: Insert new bet or add to existing bet amount
  // This prevents race conditions where concurrent requests could both try to update
  upsertBet: db.prepare(`
    INSERT INTO tw_bets (id, battle_id, wallet_address, side, amount_lamports, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
    ON CONFLICT(battle_id, wallet_address) DO UPDATE SET
      amount_lamports = amount_lamports + excluded.amount_lamports
    RETURNING *
  `),
  // Check existing bet side (for validation before upsert)
  getBetSide: db.prepare(`SELECT side FROM tw_bets WHERE battle_id = ? AND wallet_address = ?`),
  getBet: db.prepare(`SELECT * FROM tw_bets WHERE battle_id = ? AND wallet_address = ?`),
  getBetById: db.prepare(`SELECT * FROM tw_bets WHERE id = ?`),
  getBetsForBattle: db.prepare(`SELECT * FROM tw_bets WHERE battle_id = ?`),
  getBetsForSide: db.prepare(`SELECT * FROM tw_bets WHERE battle_id = ? AND side = ?`),
  updateBetAmount: db.prepare(`
    UPDATE tw_bets SET amount_lamports = amount_lamports + ?
    WHERE battle_id = ? AND wallet_address = ?
  `),
  settleBet: db.prepare(`
    UPDATE tw_bets SET status = ?, payout_lamports = ?, settled_at = ?
    WHERE id = ?
  `),
  getPlayerBets: db.prepare(`
    SELECT b.*, bt.token_a, bt.token_b, bt.winner as battle_winner
    FROM tw_bets b
    JOIN tw_battles bt ON b.battle_id = bt.id
    WHERE b.wallet_address = ?
    ORDER BY b.created_at DESC
    LIMIT ?
  `),

  // Stats
  getPlayerStats: db.prepare(`
    SELECT
      wallet_address,
      COUNT(*) as total_battles,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as losses,
      SUM(amount_lamports) as total_wagered,
      SUM(payout_lamports) as total_won
    FROM tw_bets
    WHERE wallet_address = ? AND status IN ('won', 'lost')
    GROUP BY wallet_address
  `),
  getLeaderboard: db.prepare(`
    SELECT
      wallet_address,
      COUNT(*) as total_battles,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as losses,
      SUM(amount_lamports) as total_wagered,
      SUM(payout_lamports) as total_won,
      SUM(payout_lamports) - SUM(amount_lamports) as net_profit
    FROM tw_bets
    WHERE status IN ('won', 'lost')
    GROUP BY wallet_address
    ORDER BY net_profit DESC
    LIMIT ?
  `),
};

// ============================================
// Battle Functions
// ============================================

export function createBattle(
  tokenA: string,
  tokenB: string,
  tokenAPythFeed: string,
  tokenBPythFeed: string,
  bettingStartTime: number,
  bettingEndTime: number
): TWBattleRecord {
  const id = `tw_${uuidv4()}`;
  const now = Date.now();

  stmts.insertBattle.run(
    id, tokenA, tokenB, tokenAPythFeed, tokenBPythFeed,
    bettingStartTime, bettingEndTime, now
  );

  return {
    id,
    tokenA,
    tokenB,
    tokenAPythFeed,
    tokenBPythFeed,
    status: 'betting',
    bettingStartTime,
    bettingEndTime,
    battleStartTime: null,
    battleEndTime: null,
    tokenAStartPrice: null,
    tokenAEndPrice: null,
    tokenBStartPrice: null,
    tokenBEndPrice: null,
    tokenAPercentChange: null,
    tokenBPercentChange: null,
    winner: null,
    totalBetsTokenA: 0,
    totalBetsTokenB: 0,
    totalBettors: 0,
    createdAt: now,
  };
}

export function getBattle(battleId: string): TWBattleRecord | null {
  const row = stmts.getBattle.get(battleId) as any;
  return row ? rowToBattle(row) : null;
}

export function getActiveBattle(): TWBattleRecord | null {
  const row = stmts.getActiveBattle.get() as any;
  return row ? rowToBattle(row) : null;
}

export function getBettingBattle(): TWBattleRecord | null {
  const row = stmts.getBettingBattle.get() as any;
  return row ? rowToBattle(row) : null;
}

export function getInProgressBattle(): TWBattleRecord | null {
  const row = stmts.getInProgressBattle.get() as any;
  return row ? rowToBattle(row) : null;
}

export function updateBattleStatus(battleId: string, status: TWBattleStatus): void {
  stmts.updateBattleStatus.run(status, battleId);
}

export function startBattle(
  battleId: string,
  tokenAStartPrice: number,
  tokenBStartPrice: number
): void {
  stmts.startBattle.run(Date.now(), tokenAStartPrice, tokenBStartPrice, battleId);
}

export function endBattle(
  battleId: string,
  tokenAEndPrice: number,
  tokenBEndPrice: number,
  tokenAPercentChange: number,
  tokenBPercentChange: number,
  winner: TWBetSide | 'tie'
): void {
  stmts.endBattle.run(
    Date.now(),
    tokenAEndPrice,
    tokenBEndPrice,
    tokenAPercentChange,
    tokenBPercentChange,
    winner,
    battleId
  );
}

export function updateBattleTotals(
  battleId: string,
  totalBetsTokenA: number,
  totalBetsTokenB: number,
  totalBettors: number
): void {
  stmts.updateBattleTotals.run(totalBetsTokenA, totalBetsTokenB, totalBettors, battleId);
}

export function getRecentBattles(limit: number = 20): TWBattleRecord[] {
  const rows = stmts.getRecentBattles.all(limit) as any[];
  return rows.map(rowToBattle);
}

export function getBattlesByTokens(tokenA: string, tokenB: string, limit: number = 10): TWBattleRecord[] {
  const rows = stmts.getBattlesByTokens.all(tokenA, tokenB, tokenB, tokenA, limit) as any[];
  return rows.map(rowToBattle);
}

function rowToBattle(row: any): TWBattleRecord {
  return {
    id: row.id,
    tokenA: row.token_a,
    tokenB: row.token_b,
    tokenAPythFeed: row.token_a_pyth_feed,
    tokenBPythFeed: row.token_b_pyth_feed,
    status: row.status,
    bettingStartTime: row.betting_start_time,
    bettingEndTime: row.betting_end_time,
    battleStartTime: row.battle_start_time,
    battleEndTime: row.battle_end_time,
    tokenAStartPrice: row.token_a_start_price,
    tokenAEndPrice: row.token_a_end_price,
    tokenBStartPrice: row.token_b_start_price,
    tokenBEndPrice: row.token_b_end_price,
    tokenAPercentChange: row.token_a_percent_change,
    tokenBPercentChange: row.token_b_percent_change,
    winner: row.winner,
    totalBetsTokenA: row.total_bets_token_a,
    totalBetsTokenB: row.total_bets_token_b,
    totalBettors: row.total_bettors,
    createdAt: row.created_at,
  };
}

// ============================================
// Bet Functions
// ============================================

export function placeBet(
  battleId: string,
  walletAddress: string,
  side: TWBetSide,
  amountLamports: number
): TWBetRecord {
  const id = `twbet_${uuidv4()}`;
  const now = Date.now();

  // Use transaction with atomic upsert to prevent race conditions
  // The UPSERT is atomic in SQLite, preventing double-spend or inconsistent state
  const placeBetTx = db.transaction(() => {
    // First, check if there's an existing bet on the OPPOSITE side
    // This check is still needed because we can't allow betting both sides
    const existingSide = stmts.getBetSide.get(battleId, walletAddress) as { side: string } | undefined;

    if (existingSide && existingSide.side !== side) {
      throw new Error('Cannot bet on opposite side of existing bet');
    }

    // Atomic upsert: either insert new bet or add to existing amount
    // ON CONFLICT will atomically add the new amount to existing amount
    const row = stmts.upsertBet.get(
      id, battleId, walletAddress, side, amountLamports, now
    ) as any;

    return rowToBet(row);
  });

  const bet = placeBetTx();

  // Update battle totals
  const bets = getBetsForBattle(battleId);
  const totalA = bets.filter(b => b.side === 'token_a').reduce((sum, b) => sum + b.amountLamports, 0);
  const totalB = bets.filter(b => b.side === 'token_b').reduce((sum, b) => sum + b.amountLamports, 0);
  const uniqueBettors = new Set(bets.map(b => b.walletAddress)).size;
  updateBattleTotals(battleId, totalA, totalB, uniqueBettors);

  return bet;
}

export function getBet(battleId: string, walletAddress: string): TWBetRecord | null {
  const row = stmts.getBet.get(battleId, walletAddress) as any;
  return row ? rowToBet(row) : null;
}

export function getBetById(betId: string): TWBetRecord | null {
  const row = stmts.getBetById.get(betId) as any;
  return row ? rowToBet(row) : null;
}

export function getBetsForBattle(battleId: string): TWBetRecord[] {
  const rows = stmts.getBetsForBattle.all(battleId) as any[];
  return rows.map(rowToBet);
}

export function getBetsForSide(battleId: string, side: TWBetSide): TWBetRecord[] {
  const rows = stmts.getBetsForSide.all(battleId, side) as any[];
  return rows.map(rowToBet);
}

export function settleBet(
  betId: string,
  status: 'won' | 'lost' | 'refunded',
  payoutLamports: number
): void {
  stmts.settleBet.run(status, payoutLamports, Date.now(), betId);
}

export function getPlayerBetHistory(walletAddress: string, limit: number = 20): (TWBetRecord & { tokenA: string; tokenB: string; battleWinner: string })[] {
  const rows = stmts.getPlayerBets.all(walletAddress, limit) as any[];
  return rows.map(row => ({
    ...rowToBet(row),
    tokenA: row.token_a,
    tokenB: row.token_b,
    battleWinner: row.battle_winner,
  }));
}

function rowToBet(row: any): TWBetRecord {
  return {
    id: row.id,
    battleId: row.battle_id,
    walletAddress: row.wallet_address,
    side: row.side,
    amountLamports: row.amount_lamports,
    payoutLamports: row.payout_lamports,
    status: row.status,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

// ============================================
// Stats Functions
// ============================================

export function getPlayerStats(walletAddress: string): TWPlayerStats {
  const row = stmts.getPlayerStats.get(walletAddress) as any;

  if (!row) {
    return {
      walletAddress,
      totalBattles: 0,
      wins: 0,
      losses: 0,
      totalWagered: 0,
      totalWon: 0,
      netProfitLoss: 0,
      winRate: 0,
    };
  }

  const totalBattles = row.total_battles || 0;
  const wins = row.wins || 0;
  const losses = row.losses || 0;
  const totalWagered = row.total_wagered || 0;
  const totalWon = row.total_won || 0;

  return {
    walletAddress,
    totalBattles,
    wins,
    losses,
    totalWagered,
    totalWon,
    netProfitLoss: totalWon - totalWagered,
    winRate: totalBattles > 0 ? (wins / totalBattles) * 100 : 0,
  };
}

export function getLeaderboard(limit: number = 50): TWPlayerStats[] {
  const rows = stmts.getLeaderboard.all(limit) as any[];

  return rows.map(row => {
    const totalBattles = row.total_battles || 0;
    const wins = row.wins || 0;
    const totalWagered = row.total_wagered || 0;
    const totalWon = row.total_won || 0;

    return {
      walletAddress: row.wallet_address,
      totalBattles,
      wins,
      losses: row.losses || 0,
      totalWagered,
      totalWon,
      netProfitLoss: row.net_profit || 0,
      winRate: totalBattles > 0 ? (wins / totalBattles) * 100 : 0,
    };
  });
}
