import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'spectator_bets.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  -- Spectator bets table
  CREATE TABLE IF NOT EXISTS spectator_bets (
    id TEXT PRIMARY KEY,
    battle_id TEXT NOT NULL,
    on_chain_battle_id TEXT,
    bettor_wallet TEXT NOT NULL,
    backed_player TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    odds_at_placement REAL NOT NULL,
    potential_payout_lamports INTEGER NOT NULL,
    tx_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    claim_tx TEXT,
    created_at INTEGER NOT NULL,
    settled_at INTEGER
  );

  -- Odds locks for preventing slippage
  CREATE TABLE IF NOT EXISTS odds_locks (
    id TEXT PRIMARY KEY,
    battle_id TEXT NOT NULL,
    backed_player TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    locked_odds REAL NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_bets_battle ON spectator_bets(battle_id);
  CREATE INDEX IF NOT EXISTS idx_bets_bettor ON spectator_bets(bettor_wallet);
  CREATE INDEX IF NOT EXISTS idx_bets_status ON spectator_bets(status);
  CREATE INDEX IF NOT EXISTS idx_bets_on_chain ON spectator_bets(on_chain_battle_id);
  CREATE INDEX IF NOT EXISTS idx_locks_expires ON odds_locks(expires_at);
`);

// Types
export interface SpectatorBetRecord {
  id: string;
  battleId: string;
  onChainBattleId: string | null;
  bettorWallet: string;
  backedPlayer: 'creator' | 'opponent';
  amountLamports: number;
  oddsAtPlacement: number;
  potentialPayoutLamports: number;
  txSignature: string | null;
  status: 'pending' | 'won' | 'lost' | 'claimed' | 'cancelled';
  claimTx: string | null;
  createdAt: number;
  settledAt: number | null;
}

export interface OddsLockRecord {
  id: string;
  battleId: string;
  backedPlayer: 'creator' | 'opponent';
  amountLamports: number;
  lockedOdds: number;
  expiresAt: number;
  used: boolean;
  createdAt: number;
}

// Prepared statements for better performance
const insertBetStmt = db.prepare(`
  INSERT INTO spectator_bets (
    id, battle_id, on_chain_battle_id, bettor_wallet, backed_player,
    amount_lamports, odds_at_placement, potential_payout_lamports,
    tx_signature, status, claim_tx, created_at, settled_at
  ) VALUES (
    @id, @battleId, @onChainBattleId, @bettorWallet, @backedPlayer,
    @amountLamports, @oddsAtPlacement, @potentialPayoutLamports,
    @txSignature, @status, @claimTx, @createdAt, @settledAt
  )
`);

const insertLockStmt = db.prepare(`
  INSERT INTO odds_locks (
    id, battle_id, backed_player, amount_lamports, locked_odds,
    expires_at, used, created_at
  ) VALUES (
    @id, @battleId, @backedPlayer, @amountLamports, @lockedOdds,
    @expiresAt, @used, @createdAt
  )
`);

const updateBetStatusStmt = db.prepare(`
  UPDATE spectator_bets
  SET status = @status, settled_at = @settledAt
  WHERE id = @id
`);

const markBetClaimedStmt = db.prepare(`
  UPDATE spectator_bets
  SET status = 'claimed', claim_tx = @claimTx
  WHERE id = @id
`);

const markLockUsedStmt = db.prepare(`
  UPDATE odds_locks SET used = 1 WHERE id = @id
`);

// Database operations
export const spectatorBetDatabase = {
  /**
   * Create a new bet record
   */
  createBet(bet: SpectatorBetRecord): void {
    insertBetStmt.run({
      id: bet.id,
      battleId: bet.battleId,
      onChainBattleId: bet.onChainBattleId,
      bettorWallet: bet.bettorWallet,
      backedPlayer: bet.backedPlayer,
      amountLamports: bet.amountLamports,
      oddsAtPlacement: bet.oddsAtPlacement,
      potentialPayoutLamports: bet.potentialPayoutLamports,
      txSignature: bet.txSignature,
      status: bet.status,
      claimTx: bet.claimTx,
      createdAt: bet.createdAt,
      settledAt: bet.settledAt,
    });
  },

  /**
   * Get a bet by ID
   */
  getBet(id: string): SpectatorBetRecord | null {
    const row = db.prepare('SELECT * FROM spectator_bets WHERE id = ?').get(id) as any;
    if (!row) return null;
    return mapRowToBet(row);
  },

  /**
   * Get all bets for a battle
   */
  getBetsByBattle(battleId: string): SpectatorBetRecord[] {
    const rows = db.prepare(
      'SELECT * FROM spectator_bets WHERE battle_id = ? ORDER BY created_at DESC'
    ).all(battleId) as any[];
    return rows.map(mapRowToBet);
  },

  /**
   * Get all bets by a wallet
   */
  getBetsByWallet(wallet: string): SpectatorBetRecord[] {
    const rows = db.prepare(
      'SELECT * FROM spectator_bets WHERE bettor_wallet = ? ORDER BY created_at DESC'
    ).all(wallet) as any[];
    return rows.map(mapRowToBet);
  },

  /**
   * Get unclaimed winning bets for a wallet
   */
  getUnclaimedWins(wallet: string): SpectatorBetRecord[] {
    const rows = db.prepare(
      'SELECT * FROM spectator_bets WHERE bettor_wallet = ? AND status = ? ORDER BY created_at DESC'
    ).all(wallet, 'won') as any[];
    return rows.map(mapRowToBet);
  },

  /**
   * Get pending bets for a battle
   */
  getPendingBets(battleId: string): SpectatorBetRecord[] {
    const rows = db.prepare(
      'SELECT * FROM spectator_bets WHERE battle_id = ? AND status = ?'
    ).all(battleId, 'pending') as any[];
    return rows.map(mapRowToBet);
  },

  /**
   * Update bet status (won/lost)
   */
  updateBetStatus(id: string, status: 'won' | 'lost' | 'cancelled', settledAt: number): void {
    updateBetStatusStmt.run({ id, status, settledAt });
  },

  /**
   * Mark a bet as claimed
   */
  markClaimed(id: string, claimTx: string): void {
    markBetClaimedStmt.run({ id, claimTx });
  },

  /**
   * Set the on-chain battle ID for bets
   */
  setOnChainBattleId(battleId: string, onChainBattleId: string): void {
    db.prepare(
      'UPDATE spectator_bets SET on_chain_battle_id = ? WHERE battle_id = ?'
    ).run(onChainBattleId, battleId);
  },

  /**
   * Set transaction signature for a bet
   */
  setTxSignature(id: string, txSignature: string): void {
    db.prepare(
      'UPDATE spectator_bets SET tx_signature = ? WHERE id = ?'
    ).run(txSignature, id);
  },

  // ========================
  // Odds Lock Operations
  // ========================

  /**
   * Create an odds lock
   */
  createOddsLock(lock: OddsLockRecord): void {
    insertLockStmt.run({
      id: lock.id,
      battleId: lock.battleId,
      backedPlayer: lock.backedPlayer,
      amountLamports: lock.amountLamports,
      lockedOdds: lock.lockedOdds,
      expiresAt: lock.expiresAt,
      used: lock.used ? 1 : 0,
      createdAt: lock.createdAt,
    });
  },

  /**
   * Get an odds lock by ID
   */
  getOddsLock(id: string): OddsLockRecord | null {
    const row = db.prepare('SELECT * FROM odds_locks WHERE id = ?').get(id) as any;
    if (!row) return null;
    return mapRowToLock(row);
  },

  /**
   * Mark an odds lock as used
   */
  markLockUsed(id: string): void {
    markLockUsedStmt.run({ id });
  },

  /**
   * Clean up expired locks
   */
  cleanupExpiredLocks(): number {
    const result = db.prepare(
      'DELETE FROM odds_locks WHERE expires_at < ? AND used = 0'
    ).run(Date.now());
    return result.changes;
  },

  /**
   * Get total bet pool for a battle by player
   */
  getBetPoolsByBattle(battleId: string): { creatorPool: number; opponentPool: number } {
    const creatorRow = db.prepare(
      "SELECT COALESCE(SUM(amount_lamports), 0) as total FROM spectator_bets WHERE battle_id = ? AND backed_player = 'creator' AND status = 'pending'"
    ).get(battleId) as any;
    const opponentRow = db.prepare(
      "SELECT COALESCE(SUM(amount_lamports), 0) as total FROM spectator_bets WHERE battle_id = ? AND backed_player = 'opponent' AND status = 'pending'"
    ).get(battleId) as any;
    return {
      creatorPool: creatorRow?.total || 0,
      opponentPool: opponentRow?.total || 0,
    };
  },

  /**
   * Get recent bets for a battle
   */
  getRecentBets(battleId: string, limit: number = 5): SpectatorBetRecord[] {
    const rows = db.prepare(
      'SELECT * FROM spectator_bets WHERE battle_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(battleId, limit) as any[];
    return rows.map(mapRowToBet);
  },
};

// Helper to map database row to SpectatorBetRecord
function mapRowToBet(row: any): SpectatorBetRecord {
  return {
    id: row.id,
    battleId: row.battle_id,
    onChainBattleId: row.on_chain_battle_id,
    bettorWallet: row.bettor_wallet,
    backedPlayer: row.backed_player as 'creator' | 'opponent',
    amountLamports: row.amount_lamports,
    oddsAtPlacement: row.odds_at_placement,
    potentialPayoutLamports: row.potential_payout_lamports,
    txSignature: row.tx_signature,
    status: row.status as SpectatorBetRecord['status'],
    claimTx: row.claim_tx,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

// Helper to map database row to OddsLockRecord
function mapRowToLock(row: any): OddsLockRecord {
  return {
    id: row.id,
    battleId: row.battle_id,
    backedPlayer: row.backed_player as 'creator' | 'opponent',
    amountLamports: row.amount_lamports,
    lockedOdds: row.locked_odds,
    expiresAt: row.expires_at,
    used: row.used === 1,
    createdAt: row.created_at,
  };
}
