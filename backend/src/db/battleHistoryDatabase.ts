import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'battle_history.db'));

// ===================
// Type Definitions
// ===================

export interface BattleHistoryRecord {
  id: string;
  battleId: string;
  player1Wallet: string;
  player2Wallet: string;
  winnerWallet: string | null;  // null if tie
  player1PnlPercent: number;
  player2PnlPercent: number;
  entryFee: number;
  prizePool: number;
  duration: number;
  isTie: boolean;
  startedAt: number;
  endedAt: number;
  createdAt: number;
}

export interface PlayerBattleHistory {
  battleId: string;
  opponentWallet: string;
  result: 'win' | 'loss' | 'tie';
  myPnlPercent: number;
  opponentPnlPercent: number;
  entryFee: number;
  payout: number;  // 0 for loss, entry fee for tie, full prize for win
  duration: number;
  endedAt: number;
}

export interface PlayerBattleStats {
  totalBattles: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
}

// ===================
// Database Row Type
// ===================

interface BattleHistoryRow {
  id: string;
  battle_id: string;
  player1_wallet: string;
  player2_wallet: string;
  winner_wallet: string | null;
  player1_pnl_percent: number;
  player2_pnl_percent: number;
  entry_fee: number;
  prize_pool: number;
  duration: number;
  is_tie: number;
  started_at: number;
  ended_at: number;
  created_at: number;
}

// ===================
// Database Initialization
// ===================

export function initializeBattleHistoryDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS battle_history (
      id TEXT PRIMARY KEY,
      battle_id TEXT UNIQUE NOT NULL,
      player1_wallet TEXT NOT NULL,
      player2_wallet TEXT NOT NULL,
      winner_wallet TEXT,
      player1_pnl_percent REAL NOT NULL,
      player2_pnl_percent REAL NOT NULL,
      entry_fee REAL NOT NULL,
      prize_pool REAL NOT NULL,
      duration INTEGER NOT NULL,
      is_tie INTEGER DEFAULT 0,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_battle_history_player1 ON battle_history(player1_wallet);
    CREATE INDEX IF NOT EXISTS idx_battle_history_player2 ON battle_history(player2_wallet);
    CREATE INDEX IF NOT EXISTS idx_battle_history_ended ON battle_history(ended_at);
  `);

  console.log('[BattleHistoryDB] Database initialized');
}

// ===================
// CRUD Operations
// ===================

export function saveBattleResult(record: Omit<BattleHistoryRecord, 'id' | 'createdAt'>): BattleHistoryRecord {
  const id = uuidv4();
  const createdAt = Date.now();

  const stmt = db.prepare(`
    INSERT INTO battle_history (
      id, battle_id, player1_wallet, player2_wallet, winner_wallet,
      player1_pnl_percent, player2_pnl_percent, entry_fee, prize_pool,
      duration, is_tie, started_at, ended_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    record.battleId,
    record.player1Wallet,
    record.player2Wallet,
    record.winnerWallet,
    record.player1PnlPercent,
    record.player2PnlPercent,
    record.entryFee,
    record.prizePool,
    record.duration,
    record.isTie ? 1 : 0,
    record.startedAt,
    record.endedAt,
    createdAt
  );

  console.log(`[BattleHistoryDB] Saved battle result: ${record.battleId} - ${record.isTie ? 'TIE' : `Winner: ${record.winnerWallet}`}`);

  return { ...record, id, createdAt };
}

export function getBattleHistory(walletAddress: string, limit: number = 20): PlayerBattleHistory[] {
  const stmt = db.prepare(`
    SELECT * FROM battle_history
    WHERE player1_wallet = ? OR player2_wallet = ?
    ORDER BY ended_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(walletAddress, walletAddress, limit) as BattleHistoryRow[];

  return rows.map(row => {
    const isPlayer1 = row.player1_wallet === walletAddress;
    const myPnl = isPlayer1 ? row.player1_pnl_percent : row.player2_pnl_percent;
    const oppPnl = isPlayer1 ? row.player2_pnl_percent : row.player1_pnl_percent;
    const opponentWallet = isPlayer1 ? row.player2_wallet : row.player1_wallet;

    let result: 'win' | 'loss' | 'tie';
    let payout: number;
    const prizeAfterRake = row.prize_pool * 0.95;

    if (row.is_tie) {
      result = 'tie';
      payout = row.entry_fee;  // Get entry fee back on tie
    } else if (row.winner_wallet === walletAddress) {
      result = 'win';
      payout = prizeAfterRake;
    } else {
      result = 'loss';
      payout = 0;
    }

    return {
      battleId: row.battle_id,
      opponentWallet,
      result,
      myPnlPercent: myPnl,
      opponentPnlPercent: oppPnl,
      entryFee: row.entry_fee,
      payout,
      duration: row.duration,
      endedAt: row.ended_at,
    };
  });
}

export function getBattleById(battleId: string): BattleHistoryRecord | null {
  const stmt = db.prepare('SELECT * FROM battle_history WHERE battle_id = ?');
  const row = stmt.get(battleId) as BattleHistoryRow | undefined;
  if (!row) return null;

  return {
    id: row.id,
    battleId: row.battle_id,
    player1Wallet: row.player1_wallet,
    player2Wallet: row.player2_wallet,
    winnerWallet: row.winner_wallet,
    player1PnlPercent: row.player1_pnl_percent,
    player2PnlPercent: row.player2_pnl_percent,
    entryFee: row.entry_fee,
    prizePool: row.prize_pool,
    duration: row.duration,
    isTie: !!row.is_tie,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

export function getPlayerStats(walletAddress: string): PlayerBattleStats {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN winner_wallet = ? THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN is_tie = 1 THEN 1 ELSE 0 END) as ties,
      SUM(CASE WHEN winner_wallet IS NOT NULL AND winner_wallet != ? AND is_tie = 0 THEN 1 ELSE 0 END) as losses
    FROM battle_history
    WHERE player1_wallet = ? OR player2_wallet = ?
  `);

  const row = stmt.get(walletAddress, walletAddress, walletAddress, walletAddress) as {
    total: number | null;
    wins: number | null;
    ties: number | null;
    losses: number | null;
  };

  const total = row.total || 0;
  const wins = row.wins || 0;

  return {
    totalBattles: total,
    wins,
    losses: row.losses || 0,
    ties: row.ties || 0,
    winRate: total > 0 ? (wins / total) * 100 : 0,
  };
}

// ===================
// Streak Calculations
// ===================

export interface BattleStreaks {
  currentStreak: number;  // Positive = win streak, negative = loss streak
  bestStreak: number;     // Best win streak ever
}

/**
 * Get battle streaks for a wallet.
 * Calculates current win/loss streak and best win streak ever.
 */
export function getBattleStreaks(walletAddress: string): BattleStreaks {
  // Get all battles ordered by time (most recent first)
  const history = getBattleHistory(walletAddress, 100);

  if (history.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Calculate current streak (from most recent battles)
  let currentStreak = 0;
  let currentStreakType: 'win' | 'loss' | null = null;

  for (const battle of history) {
    if (battle.result === 'tie') {
      // Ties break the streak
      break;
    }

    if (currentStreakType === null) {
      // First non-tie result sets the streak type
      currentStreakType = battle.result === 'win' ? 'win' : 'loss';
      currentStreak = battle.result === 'win' ? 1 : -1;
    } else if (
      (currentStreakType === 'win' && battle.result === 'win') ||
      (currentStreakType === 'loss' && battle.result === 'loss')
    ) {
      // Continue the streak
      currentStreak += battle.result === 'win' ? 1 : -1;
    } else {
      // Streak broken by opposite result
      break;
    }
  }

  // Calculate best win streak ever (scan all battles chronologically)
  const reversedHistory = [...history].reverse();  // Oldest first
  let bestStreak = 0;
  let tempStreak = 0;

  for (const battle of reversedHistory) {
    if (battle.result === 'win') {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, bestStreak };
}

// ===================
// ROI Calculations
// ===================

export interface BattleROI {
  roi: number;           // Return on investment as percentage
  totalWagered: number;  // Total SOL wagered
  totalPayout: number;   // Total SOL received back
}

/**
 * Get ROI statistics for a wallet.
 * Calculates return on investment from all battles.
 */
export function getBattleROI(walletAddress: string): BattleROI {
  // Get all battles
  const history = getBattleHistory(walletAddress, 1000);

  if (history.length === 0) {
    return { roi: 0, totalWagered: 0, totalPayout: 0 };
  }

  let totalWagered = 0;
  let totalPayout = 0;

  for (const battle of history) {
    totalWagered += battle.entryFee;
    totalPayout += battle.payout;
  }

  // ROI = ((totalPayout - totalWagered) / totalWagered) * 100
  const roi = totalWagered > 0
    ? ((totalPayout - totalWagered) / totalWagered) * 100
    : 0;

  return {
    roi: Math.round(roi * 100) / 100,  // Round to 2 decimal places
    totalWagered: Math.round(totalWagered * 1000) / 1000,
    totalPayout: Math.round(totalPayout * 1000) / 1000,
  };
}

// Initialize on module load
initializeBattleHistoryDatabase();
