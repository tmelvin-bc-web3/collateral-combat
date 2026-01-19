/**
 * Auth Database - Token versioning for revocation support
 *
 * Each wallet has a token version. When you want to invalidate all tokens
 * for a wallet (e.g., security incident), increment the version.
 * JWTs include the version - if it doesn't match current, token is invalid.
 */

import { Pool } from 'pg';

// ===================
// Database Connection
// ===================

const DATABASE_URL = process.env.DATABASE_URL;

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    })
  : null;

// ===================
// Initialization
// ===================

async function initializeAuthDatabase(): Promise<void> {
  if (!pool) {
    console.warn('[AuthDB] Skipping initialization - no database connection');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_token_versions (
        wallet_address TEXT PRIMARY KEY,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at BIGINT NOT NULL
      );
    `);

    console.log('[AuthDB] Token versions table initialized');
  } catch (error) {
    console.error('[AuthDB] Error initializing:', error);
  }
}

// Initialize on module load
initializeAuthDatabase();

// ===================
// Token Version Functions
// ===================

/**
 * Get the current token version for a wallet.
 * Returns 1 if no entry exists (default version).
 */
export async function getTokenVersion(walletAddress: string): Promise<number> {
  if (!pool) {
    return 1; // Default version if no database
  }

  try {
    const result = await pool.query(
      'SELECT version FROM auth_token_versions WHERE wallet_address = $1',
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return 1; // Default version for new wallets
    }

    return result.rows[0].version;
  } catch (error) {
    console.error('[AuthDB] Error getting token version:', error);
    return 1;
  }
}

/**
 * Increment the token version for a wallet, invalidating all existing tokens.
 * Returns the new version number.
 */
export async function incrementTokenVersion(walletAddress: string): Promise<number> {
  if (!pool) {
    console.warn('[AuthDB] Cannot increment version - no database');
    return 1;
  }

  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO auth_token_versions (wallet_address, version, updated_at)
       VALUES ($1, 2, $2)
       ON CONFLICT (wallet_address) DO UPDATE SET
         version = auth_token_versions.version + 1,
         updated_at = EXCLUDED.updated_at
       RETURNING version`,
      [walletAddress, now]
    );

    const newVersion = result.rows[0].version;
    console.log(`[AuthDB] Token version incremented for ${walletAddress.slice(0, 8)}... to ${newVersion}`);
    return newVersion;
  } catch (error) {
    console.error('[AuthDB] Error incrementing token version:', error);
    return 1;
  }
}

/**
 * Ensure a wallet has a token version entry.
 * Called on first login to establish version 1.
 */
export async function ensureTokenVersion(walletAddress: string): Promise<number> {
  if (!pool) {
    return 1;
  }

  const now = Date.now();

  try {
    const result = await pool.query(
      `INSERT INTO auth_token_versions (wallet_address, version, updated_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (wallet_address) DO NOTHING
       RETURNING version`,
      [walletAddress, now]
    );

    if (result.rows.length > 0) {
      return result.rows[0].version;
    }

    // Entry already existed, fetch it
    return await getTokenVersion(walletAddress);
  } catch (error) {
    console.error('[AuthDB] Error ensuring token version:', error);
    return 1;
  }
}

/**
 * Revoke all tokens for a wallet (for security incidents or logout-all).
 */
export async function revokeAllTokens(walletAddress: string): Promise<void> {
  await incrementTokenVersion(walletAddress);
}

export { pool as authPool };
