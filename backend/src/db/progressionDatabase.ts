import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'progression.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  -- User progression data
  CREATE TABLE IF NOT EXISTS user_progression (
    wallet_address TEXT PRIMARY KEY,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- XP activity log
  CREATE TABLE IF NOT EXISTS xp_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    xp_amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT,
    description TEXT,
    created_at INTEGER NOT NULL
  );

  -- Unlocked perks (consumables)
  CREATE TABLE IF NOT EXISTS user_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    perk_type TEXT NOT NULL,
    unlock_level INTEGER NOT NULL,
    is_used INTEGER DEFAULT 0,
    activated_at INTEGER,
    expires_at INTEGER,
    created_at INTEGER NOT NULL
  );

  -- Unlocked cosmetics
  CREATE TABLE IF NOT EXISTS user_cosmetics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    cosmetic_type TEXT NOT NULL,
    cosmetic_id TEXT NOT NULL,
    unlock_level INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(wallet_address, cosmetic_type, cosmetic_id)
  );

  -- Free bet credits (count-based, not USD)
  CREATE TABLE IF NOT EXISTS free_bet_credits (
    wallet_address TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_used INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  -- Free bet transaction history
  CREATE TABLE IF NOT EXISTS free_bet_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    game_mode TEXT,
    description TEXT,
    created_at INTEGER NOT NULL
  );

  -- User streaks
  CREATE TABLE IF NOT EXISTS user_streaks (
    wallet_address TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TEXT,
    updated_at INTEGER NOT NULL
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_xp_history_wallet ON xp_history(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_xp_history_created ON xp_history(created_at);
  CREATE INDEX IF NOT EXISTS idx_user_perks_wallet ON user_perks(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_user_cosmetics_wallet ON user_cosmetics(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_free_bet_history_wallet ON free_bet_history(wallet_address);

  -- Free bet positions (escrow-based free bets)
  CREATE TABLE IF NOT EXISTS free_bet_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    round_id INTEGER NOT NULL,
    side TEXT NOT NULL,
    amount_lamports INTEGER DEFAULT 10000000,
    status TEXT DEFAULT 'pending',
    payout_lamports INTEGER,
    tx_signature_bet TEXT,
    tx_signature_claim TEXT,
    tx_signature_settlement TEXT,
    created_at INTEGER NOT NULL
  );

  -- Rake rebates
  CREATE TABLE IF NOT EXISTS rake_rebates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    round_id INTEGER NOT NULL,
    gross_winnings_lamports INTEGER NOT NULL,
    effective_fee_bps INTEGER NOT NULL,
    perk_type TEXT,
    rebate_lamports INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    claim_tx_signature TEXT NOT NULL,
    rebate_tx_signature TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(round_id, wallet_address)
  );

  -- Indexes for new tables
  CREATE INDEX IF NOT EXISTS idx_free_bet_positions_wallet ON free_bet_positions(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_free_bet_positions_status ON free_bet_positions(status);
  CREATE INDEX IF NOT EXISTS idx_rake_rebates_wallet ON rake_rebates(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_rake_rebates_status ON rake_rebates(status);
`);

// ===================
// Type Definitions
// ===================

export type XpSource = 'battle' | 'prediction' | 'draft' | 'spectator' | 'share';
export type PerkType = 'rake_9' | 'rake_8' | 'rake_7' | 'oracle_4_5' | 'oracle_4' | 'oracle_3_5';
export type CosmeticType = 'border' | 'pfp' | 'title';
export type FreeBetTransactionType = 'earned' | 'used';
export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator';

export interface UserStreak {
  walletAddress: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  updatedAt: number;
}

export interface UserProgressionData {
  walletAddress: string;
  totalXp: number;
  currentLevel: number;
  createdAt: number;
  updatedAt: number;
}

export interface XpHistoryEntry {
  id: number;
  walletAddress: string;
  xpAmount: number;
  source: XpSource;
  sourceId?: string;
  description?: string;
  createdAt: number;
}

export interface UserPerk {
  id: number;
  walletAddress: string;
  perkType: PerkType;
  unlockLevel: number;
  isUsed: boolean;
  activatedAt?: number;
  expiresAt?: number;
  createdAt: number;
}

export interface UserCosmetic {
  id: number;
  walletAddress: string;
  cosmeticType: CosmeticType;
  cosmeticId: string;
  unlockLevel: number;
  createdAt: number;
}

export interface FreeBetBalance {
  walletAddress: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeUsed: number;
  updatedAt: number;
}

export interface FreeBetTransaction {
  id: number;
  walletAddress: string;
  amount: number;
  transactionType: FreeBetTransactionType;
  gameMode?: GameMode;
  description?: string;
  createdAt: number;
}

// Free Bet Position Types (Escrow-based)
export type FreeBetPositionStatus = 'pending' | 'placed' | 'won' | 'lost' | 'settled' | 'failed';

export interface FreeBetPosition {
  id: number;
  walletAddress: string;
  roundId: number;
  side: 'long' | 'short';
  amountLamports: number;
  status: FreeBetPositionStatus;
  payoutLamports?: number;
  txSignatureBet?: string;
  txSignatureClaim?: string;
  txSignatureSettlement?: string;
  createdAt: number;
}

// Rake Rebate Types
export type RakeRebateStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface RakeRebate {
  id: number;
  walletAddress: string;
  roundId: number;
  grossWinningsLamports: number;
  effectiveFeeBps: number;
  perkType?: string;
  rebateLamports: number;
  status: RakeRebateStatus;
  claimTxSignature: string;
  rebateTxSignature?: string;
  createdAt: number;
}

// ===================
// Progression Operations
// ===================

const getProgressionByWallet = db.prepare(`
  SELECT * FROM user_progression WHERE wallet_address = ?
`);

const insertProgression = db.prepare(`
  INSERT INTO user_progression (wallet_address, total_xp, current_level, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);

const updateProgression = db.prepare(`
  UPDATE user_progression SET total_xp = ?, current_level = ?, updated_at = ? WHERE wallet_address = ?
`);

export function getProgression(walletAddress: string): UserProgressionData | null {
  const row = getProgressionByWallet.get(walletAddress) as any;
  if (!row) return null;
  return mapProgressionRow(row);
}

export function createProgression(walletAddress: string): UserProgressionData {
  const now = Date.now();
  insertProgression.run(walletAddress, 0, 1, now, now);
  return {
    walletAddress,
    totalXp: 0,
    currentLevel: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateUserProgression(walletAddress: string, totalXp: number, level: number): void {
  updateProgression.run(totalXp, level, Date.now(), walletAddress);
}

export function getOrCreateProgression(walletAddress: string): UserProgressionData {
  let progression = getProgression(walletAddress);
  if (!progression) {
    progression = createProgression(walletAddress);
  }
  return progression;
}

function mapProgressionRow(row: any): UserProgressionData {
  return {
    walletAddress: row.wallet_address,
    totalXp: row.total_xp,
    currentLevel: row.current_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ===================
// XP History Operations
// ===================

const insertXpHistory = db.prepare(`
  INSERT INTO xp_history (wallet_address, xp_amount, source, source_id, description, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getXpHistoryByWallet = db.prepare(`
  SELECT * FROM xp_history WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?
`);

const getXpHistoryByWalletPaginated = db.prepare(`
  SELECT * FROM xp_history WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

export function addXpHistoryEntry(
  walletAddress: string,
  xpAmount: number,
  source: XpSource,
  sourceId?: string,
  description?: string
): XpHistoryEntry {
  const now = Date.now();
  const result = insertXpHistory.run(walletAddress, xpAmount, source, sourceId || null, description || null, now);

  return {
    id: Number(result.lastInsertRowid),
    walletAddress,
    xpAmount,
    source,
    sourceId,
    description,
    createdAt: now,
  };
}

export function getXpHistory(walletAddress: string, limit: number = 50): XpHistoryEntry[] {
  const rows = getXpHistoryByWallet.all(walletAddress, limit) as any[];
  return rows.map(mapXpHistoryRow);
}

export function getXpHistoryPaginated(walletAddress: string, limit: number, offset: number): XpHistoryEntry[] {
  const rows = getXpHistoryByWalletPaginated.all(walletAddress, limit, offset) as any[];
  return rows.map(mapXpHistoryRow);
}

function mapXpHistoryRow(row: any): XpHistoryEntry {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    xpAmount: row.xp_amount,
    source: row.source as XpSource,
    sourceId: row.source_id || undefined,
    description: row.description || undefined,
    createdAt: row.created_at,
  };
}

// ===================
// Perk Operations
// ===================

const insertPerk = db.prepare(`
  INSERT INTO user_perks (wallet_address, perk_type, unlock_level, is_used, created_at)
  VALUES (?, ?, ?, 0, ?)
`);

const getPerksByWallet = db.prepare(`
  SELECT * FROM user_perks WHERE wallet_address = ? ORDER BY created_at DESC
`);

const getPerkById = db.prepare(`
  SELECT * FROM user_perks WHERE id = ?
`);

const getAvailablePerksByWallet = db.prepare(`
  SELECT * FROM user_perks WHERE wallet_address = ? AND is_used = 0 ORDER BY created_at
`);

const getActivePerkByWallet = db.prepare(`
  SELECT * FROM user_perks WHERE wallet_address = ? AND is_used = 1 AND (expires_at IS NULL OR expires_at > ?)
`);

const updatePerkActivation = db.prepare(`
  UPDATE user_perks SET is_used = 1, activated_at = ?, expires_at = ? WHERE id = ?
`);

const expireOldPerks = db.prepare(`
  UPDATE user_perks SET is_used = 1 WHERE wallet_address = ? AND is_used = 1 AND expires_at IS NOT NULL AND expires_at <= ?
`);

export function createPerk(walletAddress: string, perkType: PerkType, unlockLevel: number): UserPerk {
  const now = Date.now();
  const result = insertPerk.run(walletAddress, perkType, unlockLevel, now);

  return {
    id: Number(result.lastInsertRowid),
    walletAddress,
    perkType,
    unlockLevel,
    isUsed: false,
    createdAt: now,
  };
}

export function getPerksForWallet(walletAddress: string): UserPerk[] {
  const rows = getPerksByWallet.all(walletAddress) as any[];
  return rows.map(mapPerkRow);
}

export function getPerk(id: number): UserPerk | null {
  const row = getPerkById.get(id) as any;
  if (!row) return null;
  return mapPerkRow(row);
}

export function getAvailablePerks(walletAddress: string): UserPerk[] {
  const rows = getAvailablePerksByWallet.all(walletAddress) as any[];
  return rows.map(mapPerkRow);
}

export function getActivePerk(walletAddress: string): UserPerk | null {
  const now = Date.now();
  // First, expire any old perks
  expireOldPerks.run(walletAddress, now);

  const row = getActivePerkByWallet.get(walletAddress, now) as any;
  if (!row) return null;
  return mapPerkRow(row);
}

export function activatePerk(perkId: number, durationMs: number | null): UserPerk | null {
  const now = Date.now();
  const expiresAt = durationMs ? now + durationMs : null;

  updatePerkActivation.run(now, expiresAt, perkId);

  return getPerk(perkId);
}

function mapPerkRow(row: any): UserPerk {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    perkType: row.perk_type as PerkType,
    unlockLevel: row.unlock_level,
    isUsed: Boolean(row.is_used),
    activatedAt: row.activated_at || undefined,
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at,
  };
}

// ===================
// Cosmetic Operations
// ===================

const insertCosmetic = db.prepare(`
  INSERT OR IGNORE INTO user_cosmetics (wallet_address, cosmetic_type, cosmetic_id, unlock_level, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const getCosmeticsByWallet = db.prepare(`
  SELECT * FROM user_cosmetics WHERE wallet_address = ? ORDER BY created_at
`);

const getCosmeticsByWalletAndType = db.prepare(`
  SELECT * FROM user_cosmetics WHERE wallet_address = ? AND cosmetic_type = ? ORDER BY unlock_level
`);

const hasCosmetic = db.prepare(`
  SELECT 1 FROM user_cosmetics WHERE wallet_address = ? AND cosmetic_type = ? AND cosmetic_id = ?
`);

export function createCosmetic(
  walletAddress: string,
  cosmeticType: CosmeticType,
  cosmeticId: string,
  unlockLevel: number
): UserCosmetic | null {
  const now = Date.now();
  const result = insertCosmetic.run(walletAddress, cosmeticType, cosmeticId, unlockLevel, now);

  if (result.changes === 0) {
    // Already exists
    return null;
  }

  return {
    id: Number(result.lastInsertRowid),
    walletAddress,
    cosmeticType,
    cosmeticId,
    unlockLevel,
    createdAt: now,
  };
}

export function getCosmeticsForWallet(walletAddress: string): UserCosmetic[] {
  const rows = getCosmeticsByWallet.all(walletAddress) as any[];
  return rows.map(mapCosmeticRow);
}

export function getCosmeticsByType(walletAddress: string, cosmeticType: CosmeticType): UserCosmetic[] {
  const rows = getCosmeticsByWalletAndType.all(walletAddress, cosmeticType) as any[];
  return rows.map(mapCosmeticRow);
}

export function userHasCosmetic(walletAddress: string, cosmeticType: CosmeticType, cosmeticId: string): boolean {
  const row = hasCosmetic.get(walletAddress, cosmeticType, cosmeticId);
  return row !== undefined;
}

function mapCosmeticRow(row: any): UserCosmetic {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    cosmeticType: row.cosmetic_type as CosmeticType,
    cosmeticId: row.cosmetic_id,
    unlockLevel: row.unlock_level,
    createdAt: row.created_at,
  };
}

// ===================
// Free Bet Operations
// ===================

const getFreeBetBalance = db.prepare(`
  SELECT * FROM free_bet_credits WHERE wallet_address = ?
`);

const insertFreeBetBalance = db.prepare(`
  INSERT INTO free_bet_credits (wallet_address, balance, lifetime_earned, lifetime_used, updated_at)
  VALUES (?, 0, 0, 0, ?)
`);

const updateFreeBetBalanceAdd = db.prepare(`
  UPDATE free_bet_credits
  SET balance = balance + ?, lifetime_earned = lifetime_earned + ?, updated_at = ?
  WHERE wallet_address = ?
`);

const updateFreeBetBalanceUse = db.prepare(`
  UPDATE free_bet_credits
  SET balance = balance - ?, lifetime_used = lifetime_used + ?, updated_at = ?
  WHERE wallet_address = ?
`);

const insertFreeBetHistory = db.prepare(`
  INSERT INTO free_bet_history (wallet_address, amount, transaction_type, game_mode, description, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getFreeBetHistoryByWallet = db.prepare(`
  SELECT * FROM free_bet_history WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?
`);

export function getOrCreateFreeBetBalance(walletAddress: string): FreeBetBalance {
  let row = getFreeBetBalance.get(walletAddress) as any;
  if (!row) {
    const now = Date.now();
    insertFreeBetBalance.run(walletAddress, now);
    return {
      walletAddress,
      balance: 0,
      lifetimeEarned: 0,
      lifetimeUsed: 0,
      updatedAt: now,
    };
  }
  return mapFreeBetBalanceRow(row);
}

export function addFreeBetCredit(
  walletAddress: string,
  count: number,
  description?: string
): FreeBetBalance {
  const now = Date.now();

  // Ensure account exists
  getOrCreateFreeBetBalance(walletAddress);

  // Add to balance
  updateFreeBetBalanceAdd.run(count, count, now, walletAddress);

  // Log the transaction
  insertFreeBetHistory.run(walletAddress, count, 'earned', null, description || null, now);

  return getOrCreateFreeBetBalance(walletAddress);
}

export function useFreeBetCredit(
  walletAddress: string,
  gameMode: GameMode,
  description?: string
): { success: boolean; balance: FreeBetBalance } {
  const now = Date.now();
  const balance = getOrCreateFreeBetBalance(walletAddress);

  if (balance.balance < 1) {
    return { success: false, balance };
  }

  // Deduct 1 from balance
  updateFreeBetBalanceUse.run(1, 1, now, walletAddress);

  // Log the transaction
  insertFreeBetHistory.run(walletAddress, 1, 'used', gameMode, description || null, now);

  return { success: true, balance: getOrCreateFreeBetBalance(walletAddress) };
}

export function getFreeBetHistory(walletAddress: string, limit: number = 50): FreeBetTransaction[] {
  const rows = getFreeBetHistoryByWallet.all(walletAddress, limit) as any[];
  return rows.map(mapFreeBetHistoryRow);
}

function mapFreeBetBalanceRow(row: any): FreeBetBalance {
  return {
    walletAddress: row.wallet_address,
    balance: row.balance,
    lifetimeEarned: row.lifetime_earned,
    lifetimeUsed: row.lifetime_used,
    updatedAt: row.updated_at,
  };
}

function mapFreeBetHistoryRow(row: any): FreeBetTransaction {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    amount: row.amount,
    transactionType: row.transaction_type as FreeBetTransactionType,
    gameMode: row.game_mode as GameMode | undefined,
    description: row.description || undefined,
    createdAt: row.created_at,
  };
}

// ===================
// Streak Operations
// ===================

const getStreakByWallet = db.prepare(`
  SELECT * FROM user_streaks WHERE wallet_address = ?
`);

const insertStreak = db.prepare(`
  INSERT INTO user_streaks (wallet_address, current_streak, longest_streak, last_activity_date, updated_at)
  VALUES (?, 1, 1, ?, ?)
`);

const updateStreak = db.prepare(`
  UPDATE user_streaks
  SET current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = ?
  WHERE wallet_address = ?
`);

// Get today's date in YYYY-MM-DD format (UTC)
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Get yesterday's date in YYYY-MM-DD format (UTC)
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export function getStreak(walletAddress: string): UserStreak | null {
  const row = getStreakByWallet.get(walletAddress) as any;
  if (!row) return null;
  return mapStreakRow(row);
}

export function getOrCreateStreak(walletAddress: string): UserStreak {
  let streak = getStreak(walletAddress);
  if (!streak) {
    // Create new streak record (but don't count as day 1 yet - that happens on activity)
    const now = Date.now();
    return {
      walletAddress,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      updatedAt: now,
    };
  }
  return streak;
}

// Call this when user does any qualifying activity (bet, prediction, etc.)
export function recordActivity(walletAddress: string): UserStreak {
  const now = Date.now();
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const existing = getStreak(walletAddress);

  if (!existing) {
    // First ever activity - start streak at 1
    insertStreak.run(walletAddress, today, now);
    return {
      walletAddress,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
      updatedAt: now,
    };
  }

  // Already played today - no change needed
  if (existing.lastActivityDate === today) {
    return existing;
  }

  let newStreak: number;
  let newLongest: number;

  if (existing.lastActivityDate === yesterday) {
    // Played yesterday - increment streak
    newStreak = existing.currentStreak + 1;
    newLongest = Math.max(existing.longestStreak, newStreak);
  } else {
    // Missed a day (or first activity) - reset to 1
    newStreak = 1;
    newLongest = Math.max(existing.longestStreak, 1);
  }

  updateStreak.run(newStreak, newLongest, today, now, walletAddress);

  return {
    walletAddress,
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActivityDate: today,
    updatedAt: now,
  };
}

// Get streak bonus multiplier (returns decimal, e.g., 0.25 for 25% bonus)
export function getStreakBonusMultiplier(streak: number): number {
  if (streak >= 31) return 1.0;   // 100% bonus
  if (streak >= 15) return 0.75;  // 75% bonus
  if (streak >= 8) return 0.5;    // 50% bonus
  if (streak >= 4) return 0.25;   // 25% bonus
  if (streak >= 2) return 0.1;    // 10% bonus
  return 0;                        // No bonus
}

// Check if streak is at risk (played yesterday but not today)
export function isStreakAtRisk(walletAddress: string): boolean {
  const streak = getStreak(walletAddress);
  if (!streak || streak.currentStreak === 0) return false;

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  // Streak is at risk if last activity was yesterday (not today)
  return streak.lastActivityDate === yesterday;
}

function mapStreakRow(row: any): UserStreak {
  return {
    walletAddress: row.wallet_address,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    updatedAt: row.updated_at,
  };
}

// ===================
// Free Bet Position Operations
// ===================

const insertFreeBetPosition = db.prepare(`
  INSERT INTO free_bet_positions (wallet_address, round_id, side, amount_lamports, status, created_at)
  VALUES (?, ?, ?, ?, 'pending', ?)
`);

const getFreeBetPositionById = db.prepare(`
  SELECT * FROM free_bet_positions WHERE id = ?
`);

const getFreeBetPositionsByWalletLimited = db.prepare(`
  SELECT * FROM free_bet_positions WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?
`);

const getFreeBetPositionsByStatusQuery = db.prepare(`
  SELECT * FROM free_bet_positions WHERE status = ? ORDER BY created_at ASC
`);

const getFreeBetPositionsByWalletQuery = db.prepare(`
  SELECT * FROM free_bet_positions WHERE wallet_address = ? ORDER BY created_at DESC
`);

const getFreeBetPositionByWalletAndRound = db.prepare(`
  SELECT * FROM free_bet_positions WHERE wallet_address = ? AND round_id = ?
`);

const updateFreeBetPositionStatusQuery = db.prepare(`
  UPDATE free_bet_positions SET status = ? WHERE id = ?
`);

const updateFreeBetPositionStatusWithTx = db.prepare(`
  UPDATE free_bet_positions SET status = ?, tx_signature_bet = COALESCE(?, tx_signature_bet), tx_signature_claim = COALESCE(?, tx_signature_claim) WHERE id = ?
`);

const updateFreeBetPositionBetTx = db.prepare(`
  UPDATE free_bet_positions SET status = 'placed', tx_signature_bet = ? WHERE id = ?
`);

const updateFreeBetPositionClaim = db.prepare(`
  UPDATE free_bet_positions SET status = ?, payout_lamports = ?, tx_signature_claim = ? WHERE id = ?
`);

const updateFreeBetPositionPayoutQuery = db.prepare(`
  UPDATE free_bet_positions SET payout_lamports = ?, status = ?, tx_signature_settlement = ? WHERE id = ?
`);

const updateFreeBetPositionSettlement = db.prepare(`
  UPDATE free_bet_positions SET status = 'settled', tx_signature_settlement = ? WHERE id = ?
`);

export function createFreeBetPosition(
  walletAddress: string,
  roundId: number,
  side: 'long' | 'short',
  amountLamports: number = 10000000
): FreeBetPosition {
  const now = Date.now();
  const result = insertFreeBetPosition.run(walletAddress, roundId, side, amountLamports, now);

  return {
    id: Number(result.lastInsertRowid),
    walletAddress,
    roundId,
    side,
    amountLamports,
    status: 'pending',
    createdAt: now,
  };
}

export function getFreeBetPosition(id: number): FreeBetPosition | null {
  const row = getFreeBetPositionById.get(id) as any;
  if (!row) return null;
  return mapFreeBetPositionRow(row);
}

export function getFreeBetPositionsForWallet(walletAddress: string, limit: number = 50): FreeBetPosition[] {
  const rows = getFreeBetPositionsByWalletLimited.all(walletAddress, limit) as any[];
  return rows.map(mapFreeBetPositionRow);
}

export function getFreeBetPositionsByStatusType(status: FreeBetPositionStatus): FreeBetPosition[] {
  const rows = getFreeBetPositionsByStatusQuery.all(status) as any[];
  return rows.map(mapFreeBetPositionRow);
}

// Alias for compatibility with freeBetEscrowService
export function getFreeBetPositionsByStatus(status: FreeBetPositionStatus): FreeBetPosition[] {
  return getFreeBetPositionsByStatusType(status);
}

// Get positions by wallet (no limit) for freeBetEscrowService
export function getFreeBetPositionsByWallet(walletAddress: string): FreeBetPosition[] {
  const rows = getFreeBetPositionsByWalletQuery.all(walletAddress) as any[];
  return rows.map(mapFreeBetPositionRow);
}

export function getFreeBetPositionForWalletAndRound(walletAddress: string, roundId: number): FreeBetPosition | null {
  const row = getFreeBetPositionByWalletAndRound.get(walletAddress, roundId) as any;
  if (!row) return null;
  return mapFreeBetPositionRow(row);
}

export function updateFreeBetPositionToPlaced(id: number, txSignature: string): FreeBetPosition | null {
  updateFreeBetPositionBetTx.run(txSignature, id);
  return getFreeBetPosition(id);
}

export function updateFreeBetPositionToClaimed(
  id: number,
  status: 'won' | 'lost',
  payoutLamports: number,
  txSignature: string
): FreeBetPosition | null {
  updateFreeBetPositionClaim.run(status, payoutLamports, txSignature, id);
  return getFreeBetPosition(id);
}

export function updateFreeBetPositionToSettled(id: number, txSignature: string): FreeBetPosition | null {
  updateFreeBetPositionSettlement.run(txSignature, id);
  return getFreeBetPosition(id);
}

export function updateFreeBetPositionStatusOnly(id: number, status: FreeBetPositionStatus): FreeBetPosition | null {
  updateFreeBetPositionStatusQuery.run(status, id);
  return getFreeBetPosition(id);
}

// Function expected by freeBetEscrowService
export function updateFreeBetPositionStatus(
  id: number,
  status: FreeBetPositionStatus,
  txSignatureBet?: string,
  txSignatureClaim?: string
): FreeBetPosition | null {
  updateFreeBetPositionStatusWithTx.run(status, txSignatureBet || null, txSignatureClaim || null, id);
  return getFreeBetPosition(id);
}

// Function expected by freeBetEscrowService
export function updateFreeBetPositionPayout(
  id: number,
  payoutLamports: number,
  status: FreeBetPositionStatus,
  txSignatureSettlement?: string
): FreeBetPosition | null {
  updateFreeBetPositionPayoutQuery.run(payoutLamports, status, txSignatureSettlement || null, id);
  return getFreeBetPosition(id);
}

function mapFreeBetPositionRow(row: any): FreeBetPosition {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    roundId: row.round_id,
    side: row.side as 'long' | 'short',
    amountLamports: row.amount_lamports,
    status: row.status as FreeBetPositionStatus,
    payoutLamports: row.payout_lamports || undefined,
    txSignatureBet: row.tx_signature_bet || undefined,
    txSignatureClaim: row.tx_signature_claim || undefined,
    txSignatureSettlement: row.tx_signature_settlement || undefined,
    createdAt: row.created_at,
  };
}

// ===================
// Rake Rebate Operations
// ===================

const insertRakeRebate = db.prepare(`
  INSERT INTO rake_rebates (wallet_address, round_id, gross_winnings_lamports, effective_fee_bps, perk_type, rebate_lamports, status, claim_tx_signature, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
`);

const getRakeRebateById = db.prepare(`
  SELECT * FROM rake_rebates WHERE id = ?
`);

const getRakeRebatesByWallet = db.prepare(`
  SELECT * FROM rake_rebates WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?
`);

const getRakeRebatesByStatus = db.prepare(`
  SELECT * FROM rake_rebates WHERE status = ? ORDER BY created_at ASC
`);

const getRakeRebateByWalletAndRound = db.prepare(`
  SELECT * FROM rake_rebates WHERE wallet_address = ? AND round_id = ?
`);

const updateRakeRebateStatus = db.prepare(`
  UPDATE rake_rebates SET status = ? WHERE id = ?
`);

const updateRakeRebateSent = db.prepare(`
  UPDATE rake_rebates SET status = 'sent', rebate_tx_signature = ? WHERE id = ?
`);

const getRakeRebateSummaryByWallet = db.prepare(`
  SELECT
    COUNT(*) as total_rebates,
    SUM(rebate_lamports) as total_rebate_lamports,
    SUM(CASE WHEN status = 'sent' THEN rebate_lamports ELSE 0 END) as sent_rebate_lamports,
    SUM(CASE WHEN status = 'pending' THEN rebate_lamports ELSE 0 END) as pending_rebate_lamports
  FROM rake_rebates
  WHERE wallet_address = ?
`);

export function createRakeRebate(
  walletAddress: string,
  roundId: number,
  grossWinningsLamports: number,
  effectiveFeeBps: number,
  rebateLamports: number,
  claimTxSignature: string,
  perkType?: string
): RakeRebate {
  const now = Date.now();
  const result = insertRakeRebate.run(
    walletAddress,
    roundId,
    grossWinningsLamports,
    effectiveFeeBps,
    perkType || null,
    rebateLamports,
    claimTxSignature,
    now
  );

  return {
    id: Number(result.lastInsertRowid),
    walletAddress,
    roundId,
    grossWinningsLamports,
    effectiveFeeBps,
    perkType,
    rebateLamports,
    status: 'pending',
    claimTxSignature,
    createdAt: now,
  };
}

export function getRakeRebate(id: number): RakeRebate | null {
  const row = getRakeRebateById.get(id) as any;
  if (!row) return null;
  return mapRakeRebateRow(row);
}

export function getRakeRebatesForWallet(walletAddress: string, limit: number = 50): RakeRebate[] {
  const rows = getRakeRebatesByWallet.all(walletAddress, limit) as any[];
  return rows.map(mapRakeRebateRow);
}

export function getRakeRebatesByStatusType(status: RakeRebateStatus): RakeRebate[] {
  const rows = getRakeRebatesByStatus.all(status) as any[];
  return rows.map(mapRakeRebateRow);
}

export function getRakeRebateForWalletAndRound(walletAddress: string, roundId: number): RakeRebate | null {
  const row = getRakeRebateByWalletAndRound.get(walletAddress, roundId) as any;
  if (!row) return null;
  return mapRakeRebateRow(row);
}

export function updateRakeRebateStatusOnly(id: number, status: RakeRebateStatus): RakeRebate | null {
  updateRakeRebateStatus.run(status, id);
  return getRakeRebate(id);
}

export function updateRakeRebateToSent(id: number, txSignature: string): RakeRebate | null {
  updateRakeRebateSent.run(txSignature, id);
  return getRakeRebate(id);
}

export interface RakeRebateSummary {
  totalRebates: number;
  totalRebateLamports: number;
  sentRebateLamports: number;
  pendingRebateLamports: number;
}

export function getRakeRebateSummary(walletAddress: string): RakeRebateSummary {
  const row = getRakeRebateSummaryByWallet.get(walletAddress) as any;
  return {
    totalRebates: row?.total_rebates || 0,
    totalRebateLamports: row?.total_rebate_lamports || 0,
    sentRebateLamports: row?.sent_rebate_lamports || 0,
    pendingRebateLamports: row?.pending_rebate_lamports || 0,
  };
}

function mapRakeRebateRow(row: any): RakeRebate {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    roundId: row.round_id,
    grossWinningsLamports: row.gross_winnings_lamports,
    effectiveFeeBps: row.effective_fee_bps,
    perkType: row.perk_type || undefined,
    rebateLamports: row.rebate_lamports,
    status: row.status as RakeRebateStatus,
    claimTxSignature: row.claim_tx_signature,
    rebateTxSignature: row.rebate_tx_signature || undefined,
    createdAt: row.created_at,
  };
}
