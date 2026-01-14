import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'challenges.db'));

// Challenge configuration
export const CHALLENGE_CONFIG = {
  codePrefix: 'FIGHT',
  codeLength: 8,
  expirationHours: 24,
  maxPendingPerUser: 5,

  entryFeeOptions: [0.01, 0.05, 0.1, 0.5, 1],
  minEntryFee: 0.01,
  maxEntryFee: 10,

  leverageOptions: [2, 5, 10, 20],
  durationOptions: [60, 120, 180, 300], // seconds
};

// Types
export type ChallengeStatus = 'pending' | 'accepted' | 'expired' | 'completed' | 'cancelled';

export interface BattleChallenge {
  id: string;
  challengeCode: string;
  challengerWallet: string;
  challengerUsername?: string;

  entryFee: number;
  leverage: number;
  duration: number;

  status: ChallengeStatus;

  acceptedByWallet?: string;
  acceptedAt?: number;

  battleId?: string;
  winnerId?: string;

  createdAt: number;
  expiresAt: number;
  viewCount: number;
}

// Initialize database schema
export function initializeChallengesDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS battle_challenges (
      id TEXT PRIMARY KEY,
      challenge_code TEXT UNIQUE NOT NULL,
      challenger_wallet TEXT NOT NULL,
      challenger_username TEXT,
      entry_fee REAL NOT NULL,
      leverage INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      accepted_by_wallet TEXT,
      accepted_at INTEGER,
      battle_id TEXT,
      winner_id TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      view_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_challenges_code ON battle_challenges(challenge_code);
    CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON battle_challenges(challenger_wallet);
    CREATE INDEX IF NOT EXISTS idx_challenges_status ON battle_challenges(status);
  `);

  console.log('[ChallengesDB] Database initialized');
}

// Generate unique challenge code
function generateChallengeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = CHALLENGE_CONFIG.codePrefix;
  for (let i = 0; i < CHALLENGE_CONFIG.codeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new challenge
export function createChallenge(params: {
  challengerWallet: string;
  challengerUsername?: string;
  entryFee: number;
  leverage: number;
  duration: number;
}): BattleChallenge {
  // Generate unique code
  let challengeCode = generateChallengeCode();
  let attempts = 0;
  while (getChallengeByCode(challengeCode) && attempts < 10) {
    challengeCode = generateChallengeCode();
    attempts++;
  }

  const id = uuidv4();
  const now = Date.now();
  const expiresAt = now + CHALLENGE_CONFIG.expirationHours * 60 * 60 * 1000;

  const stmt = db.prepare(`
    INSERT INTO battle_challenges (
      id, challenge_code, challenger_wallet, challenger_username,
      entry_fee, leverage, duration, status,
      created_at, expires_at, view_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 0)
  `);

  stmt.run(
    id,
    challengeCode,
    params.challengerWallet,
    params.challengerUsername || null,
    params.entryFee,
    params.leverage,
    params.duration,
    now,
    expiresAt
  );

  return {
    id,
    challengeCode,
    challengerWallet: params.challengerWallet,
    challengerUsername: params.challengerUsername,
    entryFee: params.entryFee,
    leverage: params.leverage,
    duration: params.duration,
    status: 'pending',
    createdAt: now,
    expiresAt,
    viewCount: 0,
  };
}

// Get challenge by code
export function getChallengeByCode(code: string): BattleChallenge | null {
  const stmt = db.prepare(`
    SELECT * FROM battle_challenges
    WHERE challenge_code = ? COLLATE NOCASE
  `);
  const row = stmt.get(code) as any;

  if (!row) return null;

  return mapRowToChallenge(row);
}

// Get challenge by ID
export function getChallengeById(id: string): BattleChallenge | null {
  const stmt = db.prepare(`
    SELECT * FROM battle_challenges WHERE id = ?
  `);
  const row = stmt.get(id) as any;

  if (!row) return null;

  return mapRowToChallenge(row);
}

// Get pending challenges count for a user
export function getPendingChallengeCount(walletAddress: string): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM battle_challenges
    WHERE challenger_wallet = ? AND status = 'pending'
  `);
  const result = stmt.get(walletAddress) as { count: number };
  return result.count;
}

// Get challenges by wallet (sent)
export function getChallengesBySender(walletAddress: string): BattleChallenge[] {
  const stmt = db.prepare(`
    SELECT * FROM battle_challenges
    WHERE challenger_wallet = ?
    ORDER BY created_at DESC
    LIMIT 50
  `);
  const rows = stmt.all(walletAddress) as any[];
  return rows.map(mapRowToChallenge);
}

// Accept a challenge
export function acceptChallenge(
  challengeCode: string,
  acceptorWallet: string,
  battleId: string
): BattleChallenge | null {
  const challenge = getChallengeByCode(challengeCode);
  if (!challenge) return null;

  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE battle_challenges
    SET status = 'accepted',
        accepted_by_wallet = ?,
        accepted_at = ?,
        battle_id = ?
    WHERE challenge_code = ? AND status = 'pending'
  `);

  const result = stmt.run(acceptorWallet, now, battleId, challengeCode);

  if (result.changes === 0) return null;

  return {
    ...challenge,
    status: 'accepted',
    acceptedByWallet: acceptorWallet,
    acceptedAt: now,
    battleId,
  };
}

// Update challenge status
export function updateChallengeStatus(
  id: string,
  status: ChallengeStatus,
  updates?: { winnerId?: string; battleId?: string }
): boolean {
  let sql = 'UPDATE battle_challenges SET status = ?';
  const params: any[] = [status];

  if (updates?.winnerId) {
    sql += ', winner_id = ?';
    params.push(updates.winnerId);
  }
  if (updates?.battleId) {
    sql += ', battle_id = ?';
    params.push(updates.battleId);
  }

  sql += ' WHERE id = ?';
  params.push(id);

  const stmt = db.prepare(sql);
  const result = stmt.run(...params);

  return result.changes > 0;
}

// Cancel a challenge
export function cancelChallenge(id: string, walletAddress: string): boolean {
  const stmt = db.prepare(`
    UPDATE battle_challenges
    SET status = 'cancelled'
    WHERE id = ? AND challenger_wallet = ? AND status = 'pending'
  `);
  const result = stmt.run(id, walletAddress);
  return result.changes > 0;
}

// Increment view count
export function incrementViewCount(challengeCode: string): void {
  const stmt = db.prepare(`
    UPDATE battle_challenges
    SET view_count = view_count + 1
    WHERE challenge_code = ?
  `);
  stmt.run(challengeCode);
}

// Get expired pending challenges
export function getExpiredPendingChallenges(): BattleChallenge[] {
  const now = Date.now();
  const stmt = db.prepare(`
    SELECT * FROM battle_challenges
    WHERE status = 'pending' AND expires_at < ?
  `);
  const rows = stmt.all(now) as any[];
  return rows.map(mapRowToChallenge);
}

// Expire pending challenges (batch update)
export function expirePendingChallenges(): number {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE battle_challenges
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < ?
  `);
  const result = stmt.run(now);
  return result.changes;
}

// Helper to map database row to BattleChallenge
function mapRowToChallenge(row: any): BattleChallenge {
  return {
    id: row.id,
    challengeCode: row.challenge_code,
    challengerWallet: row.challenger_wallet,
    challengerUsername: row.challenger_username || undefined,
    entryFee: row.entry_fee,
    leverage: row.leverage,
    duration: row.duration,
    status: row.status as ChallengeStatus,
    acceptedByWallet: row.accepted_by_wallet || undefined,
    acceptedAt: row.accepted_at || undefined,
    battleId: row.battle_id || undefined,
    winnerId: row.winner_id || undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    viewCount: row.view_count,
  };
}

// Get challenge stats
export function getChallengeStats(): {
  totalChallenges: number;
  pendingChallenges: number;
  acceptedChallenges: number;
  completedChallenges: number;
  expiredChallenges: number;
} {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
    FROM battle_challenges
  `);
  const result = stmt.get() as any;

  return {
    totalChallenges: result.total || 0,
    pendingChallenges: result.pending || 0,
    acceptedChallenges: result.accepted || 0,
    completedChallenges: result.completed || 0,
    expiredChallenges: result.expired || 0,
  };
}

// Initialize on import
initializeChallengesDatabase();
