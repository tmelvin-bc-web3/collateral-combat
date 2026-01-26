// Failed Payouts Database
// Persists failed payouts for manual recovery and automatic retry
// CRITICAL: This ensures no user loses funds due to transient failures

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'failed_payouts.db');

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

export type FailedPayoutStatus = 'pending' | 'retrying' | 'recovered' | 'failed_permanent';
export type GameType = 'lds' | 'token_wars' | 'oracle' | 'battle' | 'draft' | 'spectator';
export type PayoutType = 'payout' | 'refund';

export interface FailedPayoutRecord {
  id: string;
  gameType: GameType;
  gameId: string;
  walletAddress: string;
  amountLamports: number;
  payoutType: PayoutType;
  reason: string;
  status: FailedPayoutStatus;
  retryCount: number;
  createdAt: number;
  lastRetryAt: number | null;
  recoveredAt: number | null;
  recoveryTxId: string | null;
}

// ============================================
// Schema
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS failed_payouts (
    id TEXT PRIMARY KEY,
    game_type TEXT NOT NULL,
    game_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    payout_type TEXT NOT NULL DEFAULT 'payout',
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_retry_at INTEGER,
    recovered_at INTEGER,
    recovery_tx_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_failed_payouts_status ON failed_payouts(status);
  CREATE INDEX IF NOT EXISTS idx_failed_payouts_wallet ON failed_payouts(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_failed_payouts_game ON failed_payouts(game_type, game_id);
  CREATE INDEX IF NOT EXISTS idx_failed_payouts_pending ON failed_payouts(status, created_at) WHERE status = 'pending';
`);

// ============================================
// Prepared Statements
// ============================================

const stmts = {
  insert: db.prepare(`
    INSERT INTO failed_payouts (
      id, game_type, game_id, wallet_address, amount_lamports, payout_type,
      reason, status, retry_count, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `),

  getById: db.prepare(`SELECT * FROM failed_payouts WHERE id = ?`),

  getPending: db.prepare(`
    SELECT * FROM failed_payouts
    WHERE status IN ('pending', 'retrying')
    ORDER BY created_at ASC
    LIMIT ?
  `),

  getPendingByWallet: db.prepare(`
    SELECT * FROM failed_payouts
    WHERE wallet_address = ? AND status IN ('pending', 'retrying')
    ORDER BY created_at ASC
  `),

  getByGameId: db.prepare(`
    SELECT * FROM failed_payouts
    WHERE game_type = ? AND game_id = ?
    ORDER BY created_at ASC
  `),

  updateStatus: db.prepare(`
    UPDATE failed_payouts
    SET status = ?, last_retry_at = ?
    WHERE id = ?
  `),

  markRecovered: db.prepare(`
    UPDATE failed_payouts
    SET status = 'recovered', recovered_at = ?, recovery_tx_id = ?
    WHERE id = ?
  `),

  markRetrying: db.prepare(`
    UPDATE failed_payouts
    SET status = 'retrying', retry_count = retry_count + 1, last_retry_at = ?
    WHERE id = ?
  `),

  markPermanentFailure: db.prepare(`
    UPDATE failed_payouts
    SET status = 'failed_permanent', last_retry_at = ?
    WHERE id = ?
  `),

  getStats: db.prepare(`
    SELECT
      status,
      COUNT(*) as count,
      SUM(amount_lamports) as total_lamports
    FROM failed_payouts
    GROUP BY status
  `),

  getAll: db.prepare(`
    SELECT * FROM failed_payouts
    ORDER BY created_at DESC
    LIMIT ?
  `),
};

// ============================================
// Functions
// ============================================

/**
 * Add a failed payout to the recovery queue
 */
export function addFailedPayout(
  gameType: GameType,
  gameId: string,
  walletAddress: string,
  amountLamports: number,
  payoutType: PayoutType,
  reason: string,
  retryCount: number = 0
): FailedPayoutRecord {
  const id = `fp_${uuidv4()}`;
  const now = Date.now();

  stmts.insert.run(
    id, gameType, gameId, walletAddress, amountLamports, payoutType,
    reason, retryCount, now
  );

  console.log(`[FailedPayouts] Added to recovery queue: ${walletAddress.slice(0, 8)}... ${amountLamports} lamports (${gameType}/${gameId})`);

  return {
    id,
    gameType,
    gameId,
    walletAddress,
    amountLamports,
    payoutType,
    reason,
    status: 'pending',
    retryCount,
    createdAt: now,
    lastRetryAt: null,
    recoveredAt: null,
    recoveryTxId: null,
  };
}

/**
 * Get a failed payout by ID
 */
export function getFailedPayout(id: string): FailedPayoutRecord | null {
  const row = stmts.getById.get(id) as any;
  return row ? rowToRecord(row) : null;
}

/**
 * Get all pending failed payouts for retry
 */
export function getPendingFailedPayouts(limit: number = 100): FailedPayoutRecord[] {
  const rows = stmts.getPending.all(limit) as any[];
  return rows.map(rowToRecord);
}

/**
 * Get pending failed payouts for a specific wallet
 */
export function getPendingByWallet(walletAddress: string): FailedPayoutRecord[] {
  const rows = stmts.getPendingByWallet.all(walletAddress) as any[];
  return rows.map(rowToRecord);
}

/**
 * Get failed payouts for a specific game
 */
export function getByGameId(gameType: GameType, gameId: string): FailedPayoutRecord[] {
  const rows = stmts.getByGameId.all(gameType, gameId) as any[];
  return rows.map(rowToRecord);
}

/**
 * Mark a failed payout as being retried
 */
export function markRetrying(id: string): void {
  stmts.markRetrying.run(Date.now(), id);
}

/**
 * Mark a failed payout as recovered
 */
export function markRecovered(id: string, txId: string): void {
  stmts.markRecovered.run(Date.now(), txId, id);
  console.log(`[FailedPayouts] Recovered: ${id} (tx: ${txId})`);
}

/**
 * Mark a failed payout as permanently failed (after max retries)
 */
export function markPermanentFailure(id: string): void {
  stmts.markPermanentFailure.run(Date.now(), id);
  console.log(`[FailedPayouts] Marked as permanent failure: ${id}`);
}

/**
 * Get statistics about failed payouts
 */
export function getStats(): { status: string; count: number; totalLamports: number }[] {
  const rows = stmts.getStats.all() as any[];
  return rows.map(row => ({
    status: row.status,
    count: row.count,
    totalLamports: row.total_lamports || 0,
  }));
}

/**
 * Get all failed payouts (for admin view)
 */
export function getAllFailedPayouts(limit: number = 500): FailedPayoutRecord[] {
  const rows = stmts.getAll.all(limit) as any[];
  return rows.map(rowToRecord);
}

// ============================================
// Helper Functions
// ============================================

function rowToRecord(row: any): FailedPayoutRecord {
  return {
    id: row.id,
    gameType: row.game_type,
    gameId: row.game_id,
    walletAddress: row.wallet_address,
    amountLamports: row.amount_lamports,
    payoutType: row.payout_type,
    reason: row.reason,
    status: row.status,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    lastRetryAt: row.last_retry_at,
    recoveredAt: row.recovered_at,
    recoveryTxId: row.recovery_tx_id,
  };
}
