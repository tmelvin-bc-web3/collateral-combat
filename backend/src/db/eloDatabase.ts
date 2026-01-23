import { Pool } from 'pg';
import { createDatabaseError } from '../utils/errors';
import { DatabaseErrorCode } from '../types/errors';

// ===================
// PostgreSQL Connection
// ===================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[EloDatabase] WARNING: DATABASE_URL not set. ELO features will not work.');
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

async function initializeEloDatabase(): Promise<void> {
  if (!pool) {
    console.warn('[EloDatabase] Skipping initialization - no database connection');
    return;
  }

  try {
    await pool.query(`
      -- User ELO ratings
      CREATE TABLE IF NOT EXISTS user_elo (
        wallet TEXT PRIMARY KEY,
        elo INTEGER DEFAULT 1200,
        battle_count INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      -- Indexes for matchmaking queries
      CREATE INDEX IF NOT EXISTS idx_user_elo_rating ON user_elo(elo);
      CREATE INDEX IF NOT EXISTS idx_user_elo_battle_count ON user_elo(battle_count);
    `);
    console.log('[EloDatabase] ELO database initialized successfully');
  } catch (error) {
    console.error('[EloDatabase] Failed to initialize database:', error);
    throw createDatabaseError(
      DatabaseErrorCode.CONNECTION_FAILED,
      'ELO database initialization failed',
      { originalError: String(error) }
    );
  }
}

// Initialize on module load
initializeEloDatabase();

// ===================
// Type Definitions
// ===================

export interface UserEloData {
  wallet: string;
  elo: number;
  battleCount: number;
  wins: number;
  losses: number;
  createdAt: number;
  updatedAt: number;
}

// ===================
// Database Row Types
// ===================

interface EloRow {
  wallet: string;
  elo: number;
  battle_count: number;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
}

// ===================
// Row Mapper
// ===================

function mapEloRow(row: EloRow): UserEloData {
  return {
    wallet: row.wallet,
    elo: row.elo,
    battleCount: row.battle_count,
    wins: row.wins,
    losses: row.losses,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
  };
}

// ===================
// ELO Operations
// ===================

/**
 * Get ELO rating for a wallet. Returns 1200 (default) if not found.
 */
export async function getElo(wallet: string): Promise<number> {
  if (!pool) {
    console.warn('[EloDatabase] No database connection - returning default ELO');
    return 1200;
  }

  try {
    const result = await pool.query(
      'SELECT elo FROM user_elo WHERE wallet = $1',
      [wallet]
    );
    return result.rows.length > 0 ? result.rows[0].elo : 1200;
  } catch (error) {
    console.error('[EloDatabase] Failed to get ELO:', error);
    return 1200; // Fallback to default on error
  }
}

/**
 * Get battle count for a wallet. Returns 0 if not found.
 */
export async function getBattleCount(wallet: string): Promise<number> {
  if (!pool) {
    return 0;
  }

  try {
    const result = await pool.query(
      'SELECT battle_count FROM user_elo WHERE wallet = $1',
      [wallet]
    );
    return result.rows.length > 0 ? result.rows[0].battle_count : 0;
  } catch (error) {
    console.error('[EloDatabase] Failed to get battle count:', error);
    return 0;
  }
}

/**
 * Get wins count for a wallet. Returns 0 if not found.
 */
export async function getWins(wallet: string): Promise<number> {
  if (!pool) {
    return 0;
  }

  try {
    const result = await pool.query(
      'SELECT wins FROM user_elo WHERE wallet = $1',
      [wallet]
    );
    return result.rows.length > 0 ? result.rows[0].wins : 0;
  } catch (error) {
    console.error('[EloDatabase] Failed to get wins:', error);
    return 0;
  }
}

/**
 * Get losses count for a wallet. Returns 0 if not found.
 */
export async function getLosses(wallet: string): Promise<number> {
  if (!pool) {
    return 0;
  }

  try {
    const result = await pool.query(
      'SELECT losses FROM user_elo WHERE wallet = $1',
      [wallet]
    );
    return result.rows.length > 0 ? result.rows[0].losses : 0;
  } catch (error) {
    console.error('[EloDatabase] Failed to get losses:', error);
    return 0;
  }
}

/**
 * Get full ELO data for a wallet.
 */
export async function getEloData(wallet: string): Promise<UserEloData | null> {
  if (!pool) {
    return null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM user_elo WHERE wallet = $1',
      [wallet]
    );
    return result.rows.length > 0 ? mapEloRow(result.rows[0]) : null;
  } catch (error) {
    console.error('[EloDatabase] Failed to get ELO data:', error);
    return null;
  }
}

/**
 * Update ELO rating for a wallet.
 * Creates record if not exists, updates if exists.
 * @param wallet - Player wallet address
 * @param newElo - New ELO rating
 * @param isWin - Whether this update is for a win (true) or loss (false)
 */
export async function updateElo(wallet: string, newElo: number, isWin: boolean): Promise<void> {
  if (!pool) {
    console.warn('[EloDatabase] No database connection - skipping ELO update');
    return;
  }

  const now = Date.now();

  try {
    // Use upsert to create or update in one operation
    await pool.query(
      `INSERT INTO user_elo (wallet, elo, battle_count, wins, losses, created_at, updated_at)
       VALUES ($1, $2, 1, $3, $4, $5, $6)
       ON CONFLICT (wallet) DO UPDATE SET
         elo = $2,
         battle_count = user_elo.battle_count + 1,
         wins = user_elo.wins + $3,
         losses = user_elo.losses + $4,
         updated_at = $6`,
      [wallet, newElo, isWin ? 1 : 0, isWin ? 0 : 1, now, now]
    );
  } catch (error) {
    console.error('[EloDatabase] Failed to update ELO:', error);
    throw createDatabaseError(
      DatabaseErrorCode.QUERY_FAILED,
      'Failed to update ELO rating',
      { wallet, newElo, originalError: String(error) }
    );
  }
}

/**
 * Get or create ELO data for a wallet.
 */
export async function getOrCreateEloData(wallet: string): Promise<UserEloData> {
  if (!pool) {
    const now = Date.now();
    return {
      wallet,
      elo: 1200,
      battleCount: 0,
      wins: 0,
      losses: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  const existing = await getEloData(wallet);
  if (existing) {
    return existing;
  }

  // Create new record
  const now = Date.now();
  try {
    await pool.query(
      `INSERT INTO user_elo (wallet, elo, battle_count, wins, losses, created_at, updated_at)
       VALUES ($1, 1200, 0, 0, 0, $2, $3)
       ON CONFLICT (wallet) DO NOTHING`,
      [wallet, now, now]
    );
    return {
      wallet,
      elo: 1200,
      battleCount: 0,
      wins: 0,
      losses: 0,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('[EloDatabase] Failed to create ELO data:', error);
    return {
      wallet,
      elo: 1200,
      battleCount: 0,
      wins: 0,
      losses: 0,
      createdAt: now,
      updatedAt: now,
    };
  }
}

console.log('[EloDatabase] ELO database module loaded');
