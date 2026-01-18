import { Pool } from 'pg';

// ===================
// PostgreSQL Connection
// ===================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[ProgressionDB] WARNING: DATABASE_URL not set. Progression features will not work.');
}

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    })
  : null;

// ===================
// Database Initialization
// ===================

async function initializeDatabase(): Promise<void> {
  if (!pool) {
    console.warn('[ProgressionDB] Skipping initialization - no database connection');
    return;
  }

  try {
    await pool.query(`
      -- User progression data
      CREATE TABLE IF NOT EXISTS user_progression (
        wallet_address TEXT PRIMARY KEY,
        total_xp INTEGER DEFAULT 0,
        current_level INTEGER DEFAULT 1,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      -- XP activity log
      CREATE TABLE IF NOT EXISTS xp_history (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        xp_amount INTEGER NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT,
        description TEXT,
        created_at BIGINT NOT NULL
      );

      -- Unlocked perks (consumables)
      CREATE TABLE IF NOT EXISTS user_perks (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        perk_type TEXT NOT NULL,
        unlock_level INTEGER NOT NULL,
        is_used INTEGER DEFAULT 0,
        activated_at BIGINT,
        expires_at BIGINT,
        created_at BIGINT NOT NULL
      );

      -- Unlocked cosmetics
      CREATE TABLE IF NOT EXISTS user_cosmetics (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        cosmetic_type TEXT NOT NULL,
        cosmetic_id TEXT NOT NULL,
        unlock_level INTEGER NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE(wallet_address, cosmetic_type, cosmetic_id)
      );

      -- Free bet credits (count-based, not USD)
      CREATE TABLE IF NOT EXISTS free_bet_credits (
        wallet_address TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0,
        lifetime_earned INTEGER DEFAULT 0,
        lifetime_used INTEGER DEFAULT 0,
        updated_at BIGINT NOT NULL
      );

      -- Free bet transaction history
      CREATE TABLE IF NOT EXISTS free_bet_history (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        game_mode TEXT,
        description TEXT,
        created_at BIGINT NOT NULL
      );

      -- User streaks
      CREATE TABLE IF NOT EXISTS user_streaks (
        wallet_address TEXT PRIMARY KEY,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_activity_date TEXT,
        updated_at BIGINT NOT NULL
      );

      -- Free bet positions (escrow-based free bets)
      CREATE TABLE IF NOT EXISTS free_bet_positions (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        round_id INTEGER NOT NULL,
        side TEXT NOT NULL,
        amount_lamports INTEGER DEFAULT 10000000,
        status TEXT DEFAULT 'pending',
        payout_lamports INTEGER,
        tx_signature_bet TEXT,
        tx_signature_claim TEXT,
        tx_signature_settlement TEXT,
        created_at BIGINT NOT NULL
      );

      -- Rake rebates
      CREATE TABLE IF NOT EXISTS rake_rebates (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        round_id INTEGER NOT NULL,
        gross_winnings_lamports INTEGER NOT NULL,
        effective_fee_bps INTEGER NOT NULL,
        perk_type TEXT,
        rebate_lamports INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        claim_tx_signature TEXT NOT NULL,
        rebate_tx_signature TEXT,
        created_at BIGINT NOT NULL,
        UNIQUE(round_id, wallet_address)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_xp_history_wallet ON xp_history(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_xp_history_created ON xp_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_perks_wallet ON user_perks(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_user_cosmetics_wallet ON user_cosmetics(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_free_bet_history_wallet ON free_bet_history(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_free_bet_positions_wallet ON free_bet_positions(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_free_bet_positions_status ON free_bet_positions(status);
      CREATE INDEX IF NOT EXISTS idx_rake_rebates_wallet ON rake_rebates(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_rake_rebates_status ON rake_rebates(status);
    `);
    console.log('[ProgressionDB] Database initialized successfully');
  } catch (error) {
    console.error('[ProgressionDB] Failed to initialize database:', error);
  }
}

// Initialize on module load
initializeDatabase();

// ===================
// Type Definitions
// ===================

export type XpSource = 'battle' | 'prediction' | 'draft' | 'spectator' | 'share';
export type PerkType = 'rake_9' | 'rake_8' | 'rake_7' | 'oracle_4_5' | 'oracle_4' | 'oracle_3_5';
export type CosmeticType = 'border' | 'pfp' | 'title';
export type FreeBetTransactionType = 'earned' | 'used';
export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator' | 'lds' | 'token_wars';

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
// Row Mappers
// ===================

function mapProgressionRow(row: any): UserProgressionData {
  return {
    walletAddress: row.wallet_address,
    totalXp: row.total_xp,
    currentLevel: row.current_level,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
  };
}

function mapXpHistoryRow(row: any): XpHistoryEntry {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    xpAmount: row.xp_amount,
    source: row.source as XpSource,
    sourceId: row.source_id || undefined,
    description: row.description || undefined,
    createdAt: parseInt(row.created_at),
  };
}

function mapPerkRow(row: any): UserPerk {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    perkType: row.perk_type as PerkType,
    unlockLevel: row.unlock_level,
    isUsed: Boolean(row.is_used),
    activatedAt: row.activated_at ? parseInt(row.activated_at) : undefined,
    expiresAt: row.expires_at ? parseInt(row.expires_at) : undefined,
    createdAt: parseInt(row.created_at),
  };
}

function mapCosmeticRow(row: any): UserCosmetic {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    cosmeticType: row.cosmetic_type as CosmeticType,
    cosmeticId: row.cosmetic_id,
    unlockLevel: row.unlock_level,
    createdAt: parseInt(row.created_at),
  };
}

function mapFreeBetBalanceRow(row: any): FreeBetBalance {
  return {
    walletAddress: row.wallet_address,
    balance: row.balance,
    lifetimeEarned: row.lifetime_earned,
    lifetimeUsed: row.lifetime_used,
    updatedAt: parseInt(row.updated_at),
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
    createdAt: parseInt(row.created_at),
  };
}

function mapStreakRow(row: any): UserStreak {
  return {
    walletAddress: row.wallet_address,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    updatedAt: parseInt(row.updated_at),
  };
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
    createdAt: parseInt(row.created_at),
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
    createdAt: parseInt(row.created_at),
  };
}

// ===================
// Progression Operations
// ===================

export async function getProgression(walletAddress: string): Promise<UserProgressionData | null> {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM user_progression WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows.length > 0 ? mapProgressionRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getProgression error:', error);
    return null;
  }
}

export async function createProgression(walletAddress: string): Promise<UserProgressionData> {
  if (!pool) {
    const now = Date.now();
    return { walletAddress, totalXp: 0, currentLevel: 1, createdAt: now, updatedAt: now };
  }
  const now = Date.now();
  try {
    await pool.query(
      'INSERT INTO user_progression (wallet_address, total_xp, current_level, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [walletAddress, 0, 1, now, now]
    );
    return { walletAddress, totalXp: 0, currentLevel: 1, createdAt: now, updatedAt: now };
  } catch (error) {
    console.error('[ProgressionDB] createProgression error:', error);
    return { walletAddress, totalXp: 0, currentLevel: 1, createdAt: now, updatedAt: now };
  }
}

export async function updateUserProgression(walletAddress: string, totalXp: number, level: number): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
      'UPDATE user_progression SET total_xp = $1, current_level = $2, updated_at = $3 WHERE wallet_address = $4',
      [totalXp, level, Date.now(), walletAddress]
    );
  } catch (error) {
    console.error('[ProgressionDB] updateUserProgression error:', error);
  }
}

export async function getOrCreateProgression(walletAddress: string): Promise<UserProgressionData> {
  let progression = await getProgression(walletAddress);
  if (!progression) {
    progression = await createProgression(walletAddress);
  }
  return progression;
}

// ===================
// XP History Operations
// ===================

export async function addXpHistoryEntry(
  walletAddress: string,
  xpAmount: number,
  source: XpSource,
  sourceId?: string,
  description?: string
): Promise<XpHistoryEntry> {
  const now = Date.now();
  if (!pool) {
    return { id: 0, walletAddress, xpAmount, source, sourceId, description, createdAt: now };
  }
  try {
    const result = await pool.query(
      'INSERT INTO xp_history (wallet_address, xp_amount, source, source_id, description, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [walletAddress, xpAmount, source, sourceId || null, description || null, now]
    );
    return { id: result.rows[0].id, walletAddress, xpAmount, source, sourceId, description, createdAt: now };
  } catch (error) {
    console.error('[ProgressionDB] addXpHistoryEntry error:', error);
    return { id: 0, walletAddress, xpAmount, source, sourceId, description, createdAt: now };
  }
}

export async function getXpHistory(walletAddress: string, limit: number = 50): Promise<XpHistoryEntry[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM xp_history WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT $2',
      [walletAddress, limit]
    );
    return result.rows.map(mapXpHistoryRow);
  } catch (error) {
    console.error('[ProgressionDB] getXpHistory error:', error);
    return [];
  }
}

export async function getXpHistoryPaginated(walletAddress: string, limit: number, offset: number): Promise<XpHistoryEntry[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM xp_history WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [walletAddress, limit, offset]
    );
    return result.rows.map(mapXpHistoryRow);
  } catch (error) {
    console.error('[ProgressionDB] getXpHistoryPaginated error:', error);
    return [];
  }
}

// ===================
// Perk Operations
// ===================

export async function createPerk(walletAddress: string, perkType: PerkType, unlockLevel: number): Promise<UserPerk> {
  const now = Date.now();
  if (!pool) {
    return { id: 0, walletAddress, perkType, unlockLevel, isUsed: false, createdAt: now };
  }
  try {
    const result = await pool.query(
      'INSERT INTO user_perks (wallet_address, perk_type, unlock_level, is_used, created_at) VALUES ($1, $2, $3, 0, $4) RETURNING id',
      [walletAddress, perkType, unlockLevel, now]
    );
    return { id: result.rows[0].id, walletAddress, perkType, unlockLevel, isUsed: false, createdAt: now };
  } catch (error) {
    console.error('[ProgressionDB] createPerk error:', error);
    return { id: 0, walletAddress, perkType, unlockLevel, isUsed: false, createdAt: now };
  }
}

export async function getPerksForWallet(walletAddress: string): Promise<UserPerk[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM user_perks WHERE wallet_address = $1 ORDER BY created_at DESC',
      [walletAddress]
    );
    return result.rows.map(mapPerkRow);
  } catch (error) {
    console.error('[ProgressionDB] getPerksForWallet error:', error);
    return [];
  }
}

export async function getPerk(id: number): Promise<UserPerk | null> {
  if (!pool) return null;
  try {
    const result = await pool.query('SELECT * FROM user_perks WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapPerkRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getPerk error:', error);
    return null;
  }
}

export async function getAvailablePerks(walletAddress: string): Promise<UserPerk[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM user_perks WHERE wallet_address = $1 AND is_used = 0 ORDER BY created_at',
      [walletAddress]
    );
    return result.rows.map(mapPerkRow);
  } catch (error) {
    console.error('[ProgressionDB] getAvailablePerks error:', error);
    return [];
  }
}

export async function getActivePerk(walletAddress: string): Promise<UserPerk | null> {
  if (!pool) return null;
  const now = Date.now();
  try {
    // First expire old perks
    await pool.query(
      'UPDATE user_perks SET is_used = 1 WHERE wallet_address = $1 AND is_used = 1 AND expires_at IS NOT NULL AND expires_at <= $2',
      [walletAddress, now]
    );
    // Get active perk
    const result = await pool.query(
      'SELECT * FROM user_perks WHERE wallet_address = $1 AND is_used = 1 AND (expires_at IS NULL OR expires_at > $2)',
      [walletAddress, now]
    );
    return result.rows.length > 0 ? mapPerkRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getActivePerk error:', error);
    return null;
  }
}

export async function activatePerk(perkId: number, durationMs: number | null): Promise<UserPerk | null> {
  if (!pool) return null;
  const now = Date.now();
  const expiresAt = durationMs ? now + durationMs : null;
  try {
    await pool.query(
      'UPDATE user_perks SET is_used = 1, activated_at = $1, expires_at = $2 WHERE id = $3',
      [now, expiresAt, perkId]
    );
    return getPerk(perkId);
  } catch (error) {
    console.error('[ProgressionDB] activatePerk error:', error);
    return null;
  }
}

// ===================
// Cosmetic Operations
// ===================

export async function createCosmetic(
  walletAddress: string,
  cosmeticType: CosmeticType,
  cosmeticId: string,
  unlockLevel: number
): Promise<UserCosmetic | null> {
  if (!pool) return null;
  const now = Date.now();
  try {
    const result = await pool.query(
      'INSERT INTO user_cosmetics (wallet_address, cosmetic_type, cosmetic_id, unlock_level, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id',
      [walletAddress, cosmeticType, cosmeticId, unlockLevel, now]
    );
    if (result.rows.length === 0) return null; // Already exists
    return { id: result.rows[0].id, walletAddress, cosmeticType, cosmeticId, unlockLevel, createdAt: now };
  } catch (error) {
    console.error('[ProgressionDB] createCosmetic error:', error);
    return null;
  }
}

export async function getCosmeticsForWallet(walletAddress: string): Promise<UserCosmetic[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM user_cosmetics WHERE wallet_address = $1 ORDER BY created_at',
      [walletAddress]
    );
    return result.rows.map(mapCosmeticRow);
  } catch (error) {
    console.error('[ProgressionDB] getCosmeticsForWallet error:', error);
    return [];
  }
}

export async function getCosmeticsByType(walletAddress: string, cosmeticType: CosmeticType): Promise<UserCosmetic[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM user_cosmetics WHERE wallet_address = $1 AND cosmetic_type = $2 ORDER BY unlock_level',
      [walletAddress, cosmeticType]
    );
    return result.rows.map(mapCosmeticRow);
  } catch (error) {
    console.error('[ProgressionDB] getCosmeticsByType error:', error);
    return [];
  }
}

export async function userHasCosmetic(walletAddress: string, cosmeticType: CosmeticType, cosmeticId: string): Promise<boolean> {
  if (!pool) return false;
  try {
    const result = await pool.query(
      'SELECT 1 FROM user_cosmetics WHERE wallet_address = $1 AND cosmetic_type = $2 AND cosmetic_id = $3',
      [walletAddress, cosmeticType, cosmeticId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[ProgressionDB] userHasCosmetic error:', error);
    return false;
  }
}

// ===================
// Free Bet Operations
// ===================

export async function getOrCreateFreeBetBalance(walletAddress: string): Promise<FreeBetBalance> {
  if (!pool) {
    return { walletAddress, balance: 0, lifetimeEarned: 0, lifetimeUsed: 0, updatedAt: Date.now() };
  }
  try {
    let result = await pool.query('SELECT * FROM free_bet_credits WHERE wallet_address = $1', [walletAddress]);
    if (result.rows.length === 0) {
      const now = Date.now();
      await pool.query(
        'INSERT INTO free_bet_credits (wallet_address, balance, lifetime_earned, lifetime_used, updated_at) VALUES ($1, 0, 0, 0, $2)',
        [walletAddress, now]
      );
      return { walletAddress, balance: 0, lifetimeEarned: 0, lifetimeUsed: 0, updatedAt: now };
    }
    return mapFreeBetBalanceRow(result.rows[0]);
  } catch (error) {
    console.error('[ProgressionDB] getOrCreateFreeBetBalance error:', error);
    return { walletAddress, balance: 0, lifetimeEarned: 0, lifetimeUsed: 0, updatedAt: Date.now() };
  }
}

export async function addFreeBetCredit(
  walletAddress: string,
  count: number,
  description?: string
): Promise<FreeBetBalance> {
  if (!pool) {
    return { walletAddress, balance: count, lifetimeEarned: count, lifetimeUsed: 0, updatedAt: Date.now() };
  }
  const now = Date.now();
  try {
    // Ensure account exists
    await getOrCreateFreeBetBalance(walletAddress);
    // Add to balance
    await pool.query(
      'UPDATE free_bet_credits SET balance = balance + $1, lifetime_earned = lifetime_earned + $2, updated_at = $3 WHERE wallet_address = $4',
      [count, count, now, walletAddress]
    );
    // Log the transaction
    await pool.query(
      'INSERT INTO free_bet_history (wallet_address, amount, transaction_type, game_mode, description, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [walletAddress, count, 'earned', null, description || null, now]
    );
    return getOrCreateFreeBetBalance(walletAddress);
  } catch (error) {
    console.error('[ProgressionDB] addFreeBetCredit error:', error);
    return { walletAddress, balance: 0, lifetimeEarned: 0, lifetimeUsed: 0, updatedAt: now };
  }
}

export async function useFreeBetCredit(
  walletAddress: string,
  gameMode: GameMode,
  description?: string
): Promise<{ success: boolean; balance: FreeBetBalance }> {
  if (!pool) {
    const balance = await getOrCreateFreeBetBalance(walletAddress);
    return { success: false, balance };
  }
  const now = Date.now();
  try {
    // SECURITY: Atomic update with balance check to prevent race condition (double-spend)
    // Only deducts if balance >= 1, returns the updated row if successful
    const result = await pool.query(
      'UPDATE free_bet_credits SET balance = balance - 1, lifetime_used = lifetime_used + 1, updated_at = $1 WHERE wallet_address = $2 AND balance >= 1 RETURNING *',
      [now, walletAddress]
    );

    // If no rows updated, either wallet doesn't exist or balance was already 0
    if (result.rowCount === 0) {
      const balance = await getOrCreateFreeBetBalance(walletAddress);
      return { success: false, balance };
    }

    // Log the transaction only after successful atomic update
    await pool.query(
      'INSERT INTO free_bet_history (wallet_address, amount, transaction_type, game_mode, description, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [walletAddress, 1, 'used', gameMode, description || null, now]
    );

    // Return the updated balance from the atomic operation
    const updatedRow = result.rows[0];
    return {
      success: true,
      balance: {
        walletAddress: updatedRow.wallet_address,
        balance: updatedRow.balance,
        lifetimeEarned: updatedRow.lifetime_earned,
        lifetimeUsed: updatedRow.lifetime_used,
        updatedAt: updatedRow.updated_at,
      },
    };
  } catch (error) {
    console.error('[ProgressionDB] useFreeBetCredit error:', error);
    const balance = await getOrCreateFreeBetBalance(walletAddress);
    return { success: false, balance };
  }
}

export async function getFreeBetHistory(walletAddress: string, limit: number = 50): Promise<FreeBetTransaction[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM free_bet_history WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT $2',
      [walletAddress, limit]
    );
    return result.rows.map(mapFreeBetHistoryRow);
  } catch (error) {
    console.error('[ProgressionDB] getFreeBetHistory error:', error);
    return [];
  }
}

// ===================
// Streak Operations
// ===================

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export async function getStreak(walletAddress: string): Promise<UserStreak | null> {
  if (!pool) return null;
  try {
    const result = await pool.query('SELECT * FROM user_streaks WHERE wallet_address = $1', [walletAddress]);
    return result.rows.length > 0 ? mapStreakRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getStreak error:', error);
    return null;
  }
}

export async function getOrCreateStreak(walletAddress: string): Promise<UserStreak> {
  const streak = await getStreak(walletAddress);
  if (streak) return streak;
  return { walletAddress, currentStreak: 0, longestStreak: 0, lastActivityDate: null, updatedAt: Date.now() };
}

export async function recordActivity(walletAddress: string): Promise<UserStreak> {
  if (!pool) {
    return { walletAddress, currentStreak: 1, longestStreak: 1, lastActivityDate: getTodayDateString(), updatedAt: Date.now() };
  }
  const now = Date.now();
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  try {
    const existing = await getStreak(walletAddress);

    if (!existing) {
      await pool.query(
        'INSERT INTO user_streaks (wallet_address, current_streak, longest_streak, last_activity_date, updated_at) VALUES ($1, 1, 1, $2, $3)',
        [walletAddress, today, now]
      );
      return { walletAddress, currentStreak: 1, longestStreak: 1, lastActivityDate: today, updatedAt: now };
    }

    if (existing.lastActivityDate === today) {
      return existing;
    }

    let newStreak: number;
    let newLongest: number;

    if (existing.lastActivityDate === yesterday) {
      newStreak = existing.currentStreak + 1;
      newLongest = Math.max(existing.longestStreak, newStreak);
    } else {
      newStreak = 1;
      newLongest = Math.max(existing.longestStreak, 1);
    }

    await pool.query(
      'UPDATE user_streaks SET current_streak = $1, longest_streak = $2, last_activity_date = $3, updated_at = $4 WHERE wallet_address = $5',
      [newStreak, newLongest, today, now, walletAddress]
    );

    return { walletAddress, currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today, updatedAt: now };
  } catch (error) {
    console.error('[ProgressionDB] recordActivity error:', error);
    return { walletAddress, currentStreak: 1, longestStreak: 1, lastActivityDate: today, updatedAt: now };
  }
}

export function getStreakBonusMultiplier(streak: number): number {
  if (streak >= 31) return 1.0;
  if (streak >= 15) return 0.75;
  if (streak >= 8) return 0.5;
  if (streak >= 4) return 0.25;
  if (streak >= 2) return 0.1;
  return 0;
}

export async function isStreakAtRisk(walletAddress: string): Promise<boolean> {
  const streak = await getStreak(walletAddress);
  if (!streak || streak.currentStreak === 0) return false;
  return streak.lastActivityDate === getYesterdayDateString();
}

// ===================
// Free Bet Position Operations
// ===================

export async function createFreeBetPosition(
  walletAddress: string,
  roundId: number,
  side: 'long' | 'short',
  amountLamports: number = 10000000
): Promise<FreeBetPosition> {
  const now = Date.now();
  if (!pool) {
    return { id: 0, walletAddress, roundId, side, amountLamports, status: 'pending', createdAt: now };
  }
  try {
    const result = await pool.query(
      'INSERT INTO free_bet_positions (wallet_address, round_id, side, amount_lamports, status, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [walletAddress, roundId, side, amountLamports, 'pending', now]
    );
    return { id: result.rows[0].id, walletAddress, roundId, side, amountLamports, status: 'pending', createdAt: now };
  } catch (error) {
    console.error('[ProgressionDB] createFreeBetPosition error:', error);
    return { id: 0, walletAddress, roundId, side, amountLamports, status: 'pending', createdAt: now };
  }
}

export async function getFreeBetPosition(id: number): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    const result = await pool.query('SELECT * FROM free_bet_positions WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapFreeBetPositionRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getFreeBetPosition error:', error);
    return null;
  }
}

export async function getFreeBetPositionsForWallet(walletAddress: string, limit: number = 50): Promise<FreeBetPosition[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM free_bet_positions WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT $2',
      [walletAddress, limit]
    );
    return result.rows.map(mapFreeBetPositionRow);
  } catch (error) {
    console.error('[ProgressionDB] getFreeBetPositionsForWallet error:', error);
    return [];
  }
}

export async function getFreeBetPositionsByStatus(status: FreeBetPositionStatus): Promise<FreeBetPosition[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM free_bet_positions WHERE status = $1 ORDER BY created_at ASC',
      [status]
    );
    return result.rows.map(mapFreeBetPositionRow);
  } catch (error) {
    console.error('[ProgressionDB] getFreeBetPositionsByStatus error:', error);
    return [];
  }
}

// Alias for compatibility
export const getFreeBetPositionsByStatusType = getFreeBetPositionsByStatus;

export async function getFreeBetPositionsByWallet(walletAddress: string): Promise<FreeBetPosition[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM free_bet_positions WHERE wallet_address = $1 ORDER BY created_at DESC',
      [walletAddress]
    );
    return result.rows.map(mapFreeBetPositionRow);
  } catch (error) {
    console.error('[ProgressionDB] getFreeBetPositionsByWallet error:', error);
    return [];
  }
}

export async function getFreeBetPositionForWalletAndRound(walletAddress: string, roundId: number): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM free_bet_positions WHERE wallet_address = $1 AND round_id = $2',
      [walletAddress, roundId]
    );
    return result.rows.length > 0 ? mapFreeBetPositionRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getFreeBetPositionForWalletAndRound error:', error);
    return null;
  }
}

export async function updateFreeBetPositionToPlaced(id: number, txSignature: string): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    await pool.query(
      "UPDATE free_bet_positions SET status = 'placed', tx_signature_bet = $1 WHERE id = $2",
      [txSignature, id]
    );
    return getFreeBetPosition(id);
  } catch (error) {
    console.error('[ProgressionDB] updateFreeBetPositionToPlaced error:', error);
    return null;
  }
}

export async function updateFreeBetPositionToClaimed(
  id: number,
  status: 'won' | 'lost',
  payoutLamports: number,
  txSignature: string
): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    await pool.query(
      'UPDATE free_bet_positions SET status = $1, payout_lamports = $2, tx_signature_claim = $3 WHERE id = $4',
      [status, payoutLamports, txSignature, id]
    );
    return getFreeBetPosition(id);
  } catch (error) {
    console.error('[ProgressionDB] updateFreeBetPositionToClaimed error:', error);
    return null;
  }
}

export async function updateFreeBetPositionToSettled(id: number, txSignature: string): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    await pool.query(
      "UPDATE free_bet_positions SET status = 'settled', tx_signature_settlement = $1 WHERE id = $2",
      [txSignature, id]
    );
    return getFreeBetPosition(id);
  } catch (error) {
    console.error('[ProgressionDB] updateFreeBetPositionToSettled error:', error);
    return null;
  }
}

export async function updateFreeBetPositionStatusOnly(id: number, status: FreeBetPositionStatus): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    await pool.query('UPDATE free_bet_positions SET status = $1 WHERE id = $2', [status, id]);
    return getFreeBetPosition(id);
  } catch (error) {
    console.error('[ProgressionDB] updateFreeBetPositionStatusOnly error:', error);
    return null;
  }
}

export async function updateFreeBetPositionStatus(
  id: number,
  status: FreeBetPositionStatus,
  txSignatureBet?: string,
  txSignatureClaim?: string
): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    await pool.query(
      'UPDATE free_bet_positions SET status = $1, tx_signature_bet = COALESCE($2, tx_signature_bet), tx_signature_claim = COALESCE($3, tx_signature_claim) WHERE id = $4',
      [status, txSignatureBet || null, txSignatureClaim || null, id]
    );
    return getFreeBetPosition(id);
  } catch (error) {
    console.error('[ProgressionDB] updateFreeBetPositionStatus error:', error);
    return null;
  }
}

export async function updateFreeBetPositionPayout(
  id: number,
  payoutLamports: number,
  status: FreeBetPositionStatus,
  txSignatureSettlement?: string
): Promise<FreeBetPosition | null> {
  if (!pool) return null;
  try {
    await pool.query(
      'UPDATE free_bet_positions SET payout_lamports = $1, status = $2, tx_signature_settlement = $3 WHERE id = $4',
      [payoutLamports, status, txSignatureSettlement || null, id]
    );
    return getFreeBetPosition(id);
  } catch (error) {
    console.error('[ProgressionDB] updateFreeBetPositionPayout error:', error);
    return null;
  }
}

// ===================
// Rake Rebate Operations
// ===================

export async function createRakeRebate(
  walletAddress: string,
  roundId: number,
  grossWinningsLamports: number,
  effectiveFeeBps: number,
  rebateLamports: number,
  claimTxSignature: string,
  perkType?: string
): Promise<RakeRebate> {
  const now = Date.now();
  if (!pool) {
    return { id: 0, walletAddress, roundId, grossWinningsLamports, effectiveFeeBps, perkType, rebateLamports, status: 'pending', claimTxSignature, createdAt: now };
  }
  try {
    const result = await pool.query(
      'INSERT INTO rake_rebates (wallet_address, round_id, gross_winnings_lamports, effective_fee_bps, perk_type, rebate_lamports, status, claim_tx_signature, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [walletAddress, roundId, grossWinningsLamports, effectiveFeeBps, perkType || null, rebateLamports, 'pending', claimTxSignature, now]
    );
    return { id: result.rows[0].id, walletAddress, roundId, grossWinningsLamports, effectiveFeeBps, perkType, rebateLamports, status: 'pending', claimTxSignature, createdAt: now };
  } catch (error) {
    console.error('[ProgressionDB] createRakeRebate error:', error);
    return { id: 0, walletAddress, roundId, grossWinningsLamports, effectiveFeeBps, perkType, rebateLamports, status: 'pending', claimTxSignature, createdAt: now };
  }
}

export async function getRakeRebate(id: number): Promise<RakeRebate | null> {
  if (!pool) return null;
  try {
    const result = await pool.query('SELECT * FROM rake_rebates WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapRakeRebateRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getRakeRebate error:', error);
    return null;
  }
}

export async function getRakeRebatesForWallet(walletAddress: string, limit: number = 50): Promise<RakeRebate[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM rake_rebates WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT $2',
      [walletAddress, limit]
    );
    return result.rows.map(mapRakeRebateRow);
  } catch (error) {
    console.error('[ProgressionDB] getRakeRebatesForWallet error:', error);
    return [];
  }
}

export async function getRakeRebatesByStatusType(status: RakeRebateStatus): Promise<RakeRebate[]> {
  if (!pool) return [];
  try {
    const result = await pool.query(
      'SELECT * FROM rake_rebates WHERE status = $1 ORDER BY created_at ASC',
      [status]
    );
    return result.rows.map(mapRakeRebateRow);
  } catch (error) {
    console.error('[ProgressionDB] getRakeRebatesByStatusType error:', error);
    return [];
  }
}

export async function getRakeRebateForWalletAndRound(walletAddress: string, roundId: number): Promise<RakeRebate | null> {
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM rake_rebates WHERE wallet_address = $1 AND round_id = $2',
      [walletAddress, roundId]
    );
    return result.rows.length > 0 ? mapRakeRebateRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[ProgressionDB] getRakeRebateForWalletAndRound error:', error);
    return null;
  }
}

export async function updateRakeRebateStatusOnly(id: number, status: RakeRebateStatus): Promise<RakeRebate | null> {
  if (!pool) return null;
  try {
    await pool.query('UPDATE rake_rebates SET status = $1 WHERE id = $2', [status, id]);
    return getRakeRebate(id);
  } catch (error) {
    console.error('[ProgressionDB] updateRakeRebateStatusOnly error:', error);
    return null;
  }
}

export async function updateRakeRebateToSent(id: number, txSignature: string): Promise<RakeRebate | null> {
  if (!pool) return null;
  try {
    await pool.query(
      "UPDATE rake_rebates SET status = 'sent', rebate_tx_signature = $1 WHERE id = $2",
      [txSignature, id]
    );
    return getRakeRebate(id);
  } catch (error) {
    console.error('[ProgressionDB] updateRakeRebateToSent error:', error);
    return null;
  }
}

export interface RakeRebateSummary {
  totalRebates: number;
  totalRebateLamports: number;
  sentRebateLamports: number;
  pendingRebateLamports: number;
}

export async function getRakeRebateSummary(walletAddress: string): Promise<RakeRebateSummary> {
  if (!pool) {
    return { totalRebates: 0, totalRebateLamports: 0, sentRebateLamports: 0, pendingRebateLamports: 0 };
  }
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_rebates,
        COALESCE(SUM(rebate_lamports), 0) as total_rebate_lamports,
        COALESCE(SUM(CASE WHEN status = 'sent' THEN rebate_lamports ELSE 0 END), 0) as sent_rebate_lamports,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN rebate_lamports ELSE 0 END), 0) as pending_rebate_lamports
      FROM rake_rebates WHERE wallet_address = $1`,
      [walletAddress]
    );
    const row = result.rows[0];
    return {
      totalRebates: parseInt(row.total_rebates) || 0,
      totalRebateLamports: parseInt(row.total_rebate_lamports) || 0,
      sentRebateLamports: parseInt(row.sent_rebate_lamports) || 0,
      pendingRebateLamports: parseInt(row.pending_rebate_lamports) || 0,
    };
  } catch (error) {
    console.error('[ProgressionDB] getRakeRebateSummary error:', error);
    return { totalRebates: 0, totalRebateLamports: 0, sentRebateLamports: 0, pendingRebateLamports: 0 };
  }
}

console.log('[ProgressionDB] Progression database module loaded');
