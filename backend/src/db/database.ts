import { Pool } from 'pg';

// ===================
// PostgreSQL Connection
// ===================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[ProfilesDB] WARNING: DATABASE_URL not set. Profile features will not work.');
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
    console.warn('[ProfilesDB] Skipping initialization - no database connection');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        wallet_address TEXT PRIMARY KEY,
        username TEXT,
        pfp_type TEXT NOT NULL DEFAULT 'default',
        preset_id TEXT,
        nft_mint TEXT,
        nft_image_url TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      -- Index for username lookups (case-insensitive)
      CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
      ON user_profiles (LOWER(username));
    `);

    console.log('[ProfilesDB] Database initialized successfully');
  } catch (error) {
    console.error('[ProfilesDB] Error initializing database:', error);
  }
}

// Initialize on module load
initializeDatabase();

// ===================
// Types
// ===================

export type ProfilePictureType = 'preset' | 'nft' | 'default';

export interface UserProfile {
  walletAddress: string;
  username?: string;
  pfpType: ProfilePictureType;
  presetId?: string;
  nftMint?: string;
  nftImageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// ===================
// Helper Functions
// ===================

function rowToProfile(row: any): UserProfile {
  return {
    walletAddress: row.wallet_address,
    username: row.username || undefined,
    pfpType: (row.pfp_type || 'default') as ProfilePictureType,
    presetId: row.preset_id || undefined,
    nftMint: row.nft_mint || undefined,
    nftImageUrl: row.nft_image_url || undefined,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
  };
}

// ===================
// Database Functions
// ===================

export async function getProfile(walletAddress: string): Promise<UserProfile | null> {
  if (!pool) {
    console.warn('[ProfilesDB] No database connection');
    return null;
  }

  try {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE wallet_address = $1',
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return rowToProfile(result.rows[0]);
  } catch (error) {
    console.error('[ProfilesDB] Error getting profile:', error);
    return null;
  }
}

export async function upsertProfile(
  profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>
): Promise<UserProfile | null> {
  if (!pool) {
    console.warn('[ProfilesDB] No database connection');
    return null;
  }

  const now = Date.now();

  try {
    // First, get existing profile to preserve fields not being updated
    const existing = await getProfile(profile.walletAddress);

    // Merge: new values override existing, but undefined new values preserve existing
    const username = profile.username !== undefined ? (profile.username === '' ? null : profile.username) : (existing?.username || null);
    const pfpType = profile.pfpType || existing?.pfpType || 'default';
    const presetId = profile.presetId !== undefined ? profile.presetId : (existing?.presetId || null);
    const nftMint = profile.nftMint !== undefined ? profile.nftMint : (existing?.nftMint || null);
    const nftImageUrl = profile.nftImageUrl !== undefined ? profile.nftImageUrl : (existing?.nftImageUrl || null);
    const createdAt = existing?.createdAt || now;

    const result = await pool.query(
      `INSERT INTO user_profiles (
        wallet_address, username, pfp_type, preset_id, nft_mint, nft_image_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (wallet_address) DO UPDATE SET
        username = EXCLUDED.username,
        pfp_type = EXCLUDED.pfp_type,
        preset_id = EXCLUDED.preset_id,
        nft_mint = EXCLUDED.nft_mint,
        nft_image_url = EXCLUDED.nft_image_url,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [profile.walletAddress, username, pfpType, presetId, nftMint, nftImageUrl, createdAt, now]
    );

    return rowToProfile(result.rows[0]);
  } catch (error) {
    console.error('[ProfilesDB] Error upserting profile:', error);
    return null;
  }
}

export async function getProfiles(walletAddresses: string[]): Promise<UserProfile[]> {
  if (!pool || walletAddresses.length === 0) {
    return [];
  }

  try {
    // Build parameterized query for array of addresses
    const placeholders = walletAddresses.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `SELECT * FROM user_profiles WHERE wallet_address IN (${placeholders})`,
      walletAddresses
    );

    return result.rows.map(rowToProfile);
  } catch (error) {
    console.error('[ProfilesDB] Error getting profiles:', error);
    return [];
  }
}

export async function deleteProfile(walletAddress: string): Promise<boolean> {
  if (!pool) {
    console.warn('[ProfilesDB] No database connection');
    return false;
  }

  try {
    const result = await pool.query(
      'DELETE FROM user_profiles WHERE wallet_address = $1',
      [walletAddress]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('[ProfilesDB] Error deleting profile:', error);
    return false;
  }
}

export async function isUsernameTaken(username: string, excludeWallet?: string): Promise<boolean> {
  if (!pool) {
    console.warn('[ProfilesDB] No database connection');
    return false;
  }

  try {
    let query = 'SELECT 1 FROM user_profiles WHERE LOWER(username) = LOWER($1)';
    const params: string[] = [username];

    if (excludeWallet) {
      query += ' AND wallet_address != $2';
      params.push(excludeWallet);
    }

    query += ' LIMIT 1';

    const result = await pool.query(query, params);
    return result.rows.length > 0;
  } catch (error) {
    console.error('[ProfilesDB] Error checking username:', error);
    return false;
  }
}
