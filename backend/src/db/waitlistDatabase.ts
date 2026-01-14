import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { isDisposableEmail } from '../utils/disposableEmails';

// ===================
// PostgreSQL Connection
// ===================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[WaitlistDB] WARNING: DATABASE_URL not set. Waitlist features will not work.');
}

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      // SECURITY NOTE: rejectUnauthorized: false is required for Neon and most cloud PostgreSQL providers
      // that use SSL but don't provide custom CA certificates. In a self-hosted environment with
      // proper certificates, set this to true.
      ssl: { rejectUnauthorized: false },
    })
  : null;

// ===================
// Database Initialization
// ===================

async function initializeDatabase(): Promise<void> {
  if (!pool) {
    console.warn('[WaitlistDB] Skipping initialization - no database connection');
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist_entries (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        wallet_address TEXT,
        referral_code TEXT UNIQUE NOT NULL,
        referred_by TEXT,
        referral_count INTEGER DEFAULT 0,
        position INTEGER NOT NULL,
        tier TEXT DEFAULT 'standard',
        created_at BIGINT NOT NULL,
        converted_at BIGINT,
        utm_source TEXT,
        utm_campaign TEXT,
        ip_country TEXT,
        ip_address TEXT
      );

      -- Add ip_address column if it doesn't exist (for existing databases)
      ALTER TABLE waitlist_entries ADD COLUMN IF NOT EXISTS ip_address TEXT;

      CREATE TABLE IF NOT EXISTS waitlist_referrals (
        id TEXT PRIMARY KEY,
        referrer_code TEXT NOT NULL,
        referee_id TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        credited INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_entries(email);
      CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist_entries(referral_code);
      CREATE INDEX IF NOT EXISTS idx_waitlist_referred_by ON waitlist_entries(referred_by);
      CREATE INDEX IF NOT EXISTS idx_waitlist_tier ON waitlist_entries(tier);
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON waitlist_referrals(referrer_code);
    `);
    console.log('[WaitlistDB] Database initialized successfully');
  } catch (error) {
    console.error('[WaitlistDB] Failed to initialize database:', error);
  }
}

// Initialize on module load
initializeDatabase();

// ===================
// Types
// ===================

export type WaitlistTier = 'standard' | 'priority' | 'vip' | 'founding';

export interface WaitlistEntry {
  id: string;
  email: string;
  walletAddress?: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  position: number;
  tier: WaitlistTier;
  createdAt: number;
  convertedAt?: number;
  utmSource?: string;
  utmCampaign?: string;
  ipCountry?: string;
  ipAddress?: string;
}

export interface WaitlistReferral {
  id: string;
  referrerCode: string;
  refereeId: string;
  timestamp: number;
  credited: boolean;
}

export interface WaitlistJoinRequest {
  email: string;
  walletAddress: string; // Now required
  referralCode?: string;
  utmSource?: string;
  utmCampaign?: string;
  ipCountry?: string;
  ipAddress?: string;
}

// ===================
// Tier Configuration
// ===================

export const WAITLIST_TIERS = {
  standard: { minReferrals: 0, benefits: ['Beta access lottery'] },
  priority: { minReferrals: 3, benefits: ['Guaranteed beta access'] },
  vip: { minReferrals: 10, benefits: ['Beta access', '100 bonus XP', 'Exclusive Discord role'] },
  founding: { minReferrals: 25, benefits: ['Beta access', '500 bonus XP', 'Founding badge'] }
};

// ===================
// Helper Functions
// ===================

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'DEGEN';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function calculateTier(referralCount: number): WaitlistTier {
  if (referralCount >= 25) return 'founding';
  if (referralCount >= 10) return 'vip';
  if (referralCount >= 3) return 'priority';
  return 'standard';
}

function getReferralsNeededForNextTier(currentCount: number): number {
  if (currentCount >= 25) return 0;
  if (currentCount >= 10) return 25 - currentCount;
  if (currentCount >= 3) return 10 - currentCount;
  return 3 - currentCount;
}

function rowToEntry(row: any): WaitlistEntry {
  return {
    id: row.id,
    email: row.email,
    walletAddress: row.wallet_address || undefined,
    referralCode: row.referral_code,
    referredBy: row.referred_by || undefined,
    referralCount: row.referral_count,
    position: row.position,
    tier: row.tier as WaitlistTier,
    createdAt: parseInt(row.created_at),
    convertedAt: row.converted_at ? parseInt(row.converted_at) : undefined,
    utmSource: row.utm_source || undefined,
    utmCampaign: row.utm_campaign || undefined,
    ipCountry: row.ip_country || undefined,
    ipAddress: row.ip_address || undefined,
  };
}

function maskReferralCode(code: string): string {
  if (code.length <= 6) return code;
  return code.substring(0, 5) + '***' + code.substring(code.length - 1);
}

// ===================
// Database Functions
// ===================

export async function findByEmail(email: string): Promise<WaitlistEntry | null> {
  if (!pool) return null;

  try {
    const result = await pool.query(
      'SELECT * FROM waitlist_entries WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows.length > 0 ? rowToEntry(result.rows[0]) : null;
  } catch (error) {
    console.error('[WaitlistDB] findByEmail error:', error);
    return null;
  }
}

export async function findByReferralCode(code: string): Promise<WaitlistEntry | null> {
  if (!pool) return null;

  try {
    const result = await pool.query(
      'SELECT * FROM waitlist_entries WHERE referral_code = $1',
      [code]
    );
    return result.rows.length > 0 ? rowToEntry(result.rows[0]) : null;
  } catch (error) {
    console.error('[WaitlistDB] findByReferralCode error:', error);
    return null;
  }
}

export async function findById(id: string): Promise<WaitlistEntry | null> {
  if (!pool) return null;

  try {
    const result = await pool.query(
      'SELECT * FROM waitlist_entries WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? rowToEntry(result.rows[0]) : null;
  } catch (error) {
    console.error('[WaitlistDB] findById error:', error);
    return null;
  }
}

export async function getTotalCount(): Promise<number> {
  if (!pool) return 0;

  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM waitlist_entries');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('[WaitlistDB] getTotalCount error:', error);
    return 0;
  }
}

export async function joinWaitlist(data: WaitlistJoinRequest): Promise<WaitlistEntry> {
  if (!pool) {
    throw new Error('Database not configured');
  }

  // Require wallet address
  if (!data.walletAddress) {
    throw new Error('Wallet connection required');
  }

  // Check for disposable email
  if (isDisposableEmail(data.email)) {
    throw new Error('Please use a permanent email address');
  }

  // Check if email already registered
  const existing = await findByEmail(data.email);
  if (existing) {
    throw new Error('Email already registered');
  }

  // Generate unique referral code
  let referralCode = generateReferralCode();
  while (await findByReferralCode(referralCode)) {
    referralCode = generateReferralCode();
  }

  // Get current position
  const position = (await getTotalCount()) + 1;

  // Create entry
  const id = uuidv4();
  const now = Date.now();

  try {
    await pool.query(
      `INSERT INTO waitlist_entries (
        id, email, wallet_address, referral_code, referred_by, referral_count,
        position, tier, created_at, utm_source, utm_campaign, ip_country, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        data.email.toLowerCase().trim(),
        data.walletAddress,
        referralCode,
        data.referralCode || null,
        0,
        position,
        'standard',
        now,
        data.utmSource || 'direct',
        data.utmCampaign || null,
        data.ipCountry || null,
        data.ipAddress || null,
      ]
    );

    // Credit referrer if applicable (pass IP for same-IP check)
    if (data.referralCode) {
      await creditReferrer(data.referralCode, id, data.ipAddress);
    }

    const entry = await findById(id);
    if (!entry) {
      throw new Error('Failed to create waitlist entry');
    }
    return entry;
  } catch (error: any) {
    if (error.message === 'Email already registered' ||
        error.message === 'Please use a permanent email address' ||
        error.message === 'Wallet connection required') {
      throw error;
    }
    console.error('[WaitlistDB] joinWaitlist error:', error);
    throw new Error('Failed to join waitlist');
  }
}

export async function creditReferrer(referralCode: string, newUserId: string, newUserIp?: string): Promise<boolean> {
  if (!pool) return false;

  try {
    const referrer = await findByReferralCode(referralCode);
    if (!referrer) return false;

    // Check for same-IP abuse - don't credit if IPs match
    if (newUserIp && referrer.ipAddress && newUserIp === referrer.ipAddress) {
      console.log(`[WaitlistDB] Same-IP referral blocked: ${newUserIp}`);
      // Log the referral but don't credit it
      await pool.query(
        `INSERT INTO waitlist_referrals (id, referrer_code, referee_id, timestamp, credited)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), referralCode, newUserId, Date.now(), 0] // credited = 0
      );
      return false;
    }

    // Increment referral count
    const newCount = referrer.referralCount + 1;
    const newTier = calculateTier(newCount);

    // Update referrer
    await pool.query(
      'UPDATE waitlist_entries SET referral_count = $1, tier = $2 WHERE id = $3',
      [newCount, newTier, referrer.id]
    );

    // Log referral event
    await pool.query(
      `INSERT INTO waitlist_referrals (id, referrer_code, referee_id, timestamp, credited)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), referralCode, newUserId, Date.now(), 1]
    );

    return newTier !== referrer.tier; // Return true if tier upgraded
  } catch (error) {
    console.error('[WaitlistDB] creditReferrer error:', error);
    return false;
  }
}

export async function getWaitlistStatus(email: string): Promise<{
  position: number;
  referralCount: number;
  tier: WaitlistTier;
  referralsNeededForNextTier: number;
  rewards: string[];
  referralCode: string;
} | null> {
  const entry = await findByEmail(email);
  if (!entry) return null;

  return {
    position: entry.position,
    referralCount: entry.referralCount,
    tier: entry.tier,
    referralsNeededForNextTier: getReferralsNeededForNextTier(entry.referralCount),
    rewards: WAITLIST_TIERS[entry.tier].benefits,
    referralCode: entry.referralCode,
  };
}

export async function getLeaderboard(limit: number = 10): Promise<{
  topReferrers: Array<{
    position: number;
    referralCode: string;
    referralCount: number;
    tier: WaitlistTier;
  }>;
  totalSignups: number;
}> {
  if (!pool) {
    return { topReferrers: [], totalSignups: 0 };
  }

  try {
    const result = await pool.query(
      `SELECT referral_code, referral_count, tier
       FROM waitlist_entries
       WHERE referral_count > 0
       ORDER BY referral_count DESC
       LIMIT $1`,
      [limit]
    );

    return {
      topReferrers: result.rows.map((row: any, index: number) => ({
        position: index + 1,
        referralCode: maskReferralCode(row.referral_code),
        referralCount: row.referral_count,
        tier: row.tier as WaitlistTier,
      })),
      totalSignups: await getTotalCount(),
    };
  } catch (error) {
    console.error('[WaitlistDB] getLeaderboard error:', error);
    return { topReferrers: [], totalSignups: 0 };
  }
}

export async function updateWalletAddress(email: string, walletAddress: string): Promise<boolean> {
  if (!pool) return false;

  try {
    const entry = await findByEmail(email);
    if (!entry) return false;

    await pool.query(
      'UPDATE waitlist_entries SET wallet_address = $1 WHERE id = $2',
      [walletAddress, entry.id]
    );
    return true;
  } catch (error) {
    console.error('[WaitlistDB] updateWalletAddress error:', error);
    return false;
  }
}

export async function validateReferralCode(code: string): Promise<boolean> {
  const entry = await findByReferralCode(code);
  return entry !== null;
}

// Admin function to get all entries
export async function getAllEntries(options: {
  limit?: number;
  offset?: number;
  sortBy?: 'position' | 'referral_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{
  entries: WaitlistEntry[];
  total: number;
  stats: {
    totalSignups: number;
    totalReferrals: number;
    tierBreakdown: Record<string, number>;
  };
}> {
  if (!pool) {
    return { entries: [], total: 0, stats: { totalSignups: 0, totalReferrals: 0, tierBreakdown: {} } };
  }

  const { limit = 100, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = options;

  // SECURITY: Whitelist allowed sort columns to prevent SQL injection
  const validSortColumns = ['position', 'referral_count', 'created_at'];
  const validSortOrders = ['asc', 'desc'];

  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

  try {
    // Get entries
    const result = await pool.query(
      `SELECT * FROM waitlist_entries
       ORDER BY ${safeSortBy} ${safeSortOrder}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM waitlist_entries');
    const total = parseInt(countResult.rows[0].count);

    // Get total referrals
    const referralsResult = await pool.query('SELECT COALESCE(SUM(referral_count), 0) as total FROM waitlist_entries');
    const totalReferrals = parseInt(referralsResult.rows[0].total);

    // Get tier breakdown
    const tierResult = await pool.query(
      `SELECT tier, COUNT(*) as count FROM waitlist_entries GROUP BY tier`
    );
    const tierBreakdown: Record<string, number> = {};
    tierResult.rows.forEach((row: any) => {
      tierBreakdown[row.tier] = parseInt(row.count);
    });

    return {
      entries: result.rows.map(rowToEntry),
      total,
      stats: {
        totalSignups: total,
        totalReferrals,
        tierBreakdown,
      },
    };
  } catch (error) {
    console.error('[WaitlistDB] getAllEntries error:', error);
    return { entries: [], total: 0, stats: { totalSignups: 0, totalReferrals: 0, tierBreakdown: {} } };
  }
}

console.log('[WaitlistDB] Waitlist database module loaded');
