import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Database setup
const dbPath = path.join(__dirname, '../../data/waitlist.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist_entries (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    wallet_address TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT,
    referral_count INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    tier TEXT DEFAULT 'standard',
    created_at INTEGER NOT NULL,
    converted_at INTEGER,
    utm_source TEXT,
    utm_campaign TEXT,
    ip_country TEXT
  );

  CREATE TABLE IF NOT EXISTS waitlist_referrals (
    id TEXT PRIMARY KEY,
    referrer_code TEXT NOT NULL,
    referee_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    credited INTEGER DEFAULT 0,
    FOREIGN KEY (referee_id) REFERENCES waitlist_entries(id)
  );

  CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_entries(email);
  CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code ON waitlist_entries(referral_code);
  CREATE INDEX IF NOT EXISTS idx_waitlist_referred_by ON waitlist_entries(referred_by);
  CREATE INDEX IF NOT EXISTS idx_waitlist_tier ON waitlist_entries(tier);
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON waitlist_referrals(referrer_code);
`);

// Types
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
  walletAddress?: string;
  referralCode?: string;
  utmSource?: string;
  utmCampaign?: string;
  ipCountry?: string;
}

// Tier configuration
export const WAITLIST_TIERS = {
  standard: { minReferrals: 0, benefits: ['Beta access lottery'] },
  priority: { minReferrals: 3, benefits: ['Guaranteed beta access'] },
  vip: { minReferrals: 10, benefits: ['Beta access', '100 bonus XP', 'Exclusive Discord role'] },
  founding: { minReferrals: 25, benefits: ['Beta access', '500 bonus XP', 'Founding badge', '0.05 SOL free bets'] }
};

// Generate unique referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'DEGEN';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Calculate tier from referral count
function calculateTier(referralCount: number): WaitlistTier {
  if (referralCount >= 25) return 'founding';
  if (referralCount >= 10) return 'vip';
  if (referralCount >= 3) return 'priority';
  return 'standard';
}

// Get referrals needed for next tier
function getReferralsNeededForNextTier(currentCount: number): number {
  if (currentCount >= 25) return 0; // Already at max
  if (currentCount >= 10) return 25 - currentCount;
  if (currentCount >= 3) return 10 - currentCount;
  return 3 - currentCount;
}

// Database row to entry conversion
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
    createdAt: row.created_at,
    convertedAt: row.converted_at || undefined,
    utmSource: row.utm_source || undefined,
    utmCampaign: row.utm_campaign || undefined,
    ipCountry: row.ip_country || undefined,
  };
}

// Prepared statements
const statements = {
  findByEmail: db.prepare('SELECT * FROM waitlist_entries WHERE LOWER(email) = LOWER(?)'),
  findByCode: db.prepare('SELECT * FROM waitlist_entries WHERE referral_code = ?'),
  findById: db.prepare('SELECT * FROM waitlist_entries WHERE id = ?'),
  getCount: db.prepare('SELECT COUNT(*) as count FROM waitlist_entries'),
  insert: db.prepare(`
    INSERT INTO waitlist_entries (
      id, email, wallet_address, referral_code, referred_by, referral_count,
      position, tier, created_at, utm_source, utm_campaign, ip_country
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateReferralCount: db.prepare(`
    UPDATE waitlist_entries SET referral_count = ?, tier = ? WHERE id = ?
  `),
  insertReferral: db.prepare(`
    INSERT INTO waitlist_referrals (id, referrer_code, referee_id, timestamp, credited)
    VALUES (?, ?, ?, ?, ?)
  `),
  getTopReferrers: db.prepare(`
    SELECT referral_code, referral_count, tier
    FROM waitlist_entries
    WHERE referral_count > 0
    ORDER BY referral_count DESC
    LIMIT ?
  `),
  updateWalletAddress: db.prepare(`
    UPDATE waitlist_entries SET wallet_address = ? WHERE id = ?
  `),
};

// Public functions

export function findByEmail(email: string): WaitlistEntry | null {
  const row = statements.findByEmail.get(email);
  return row ? rowToEntry(row) : null;
}

export function findByReferralCode(code: string): WaitlistEntry | null {
  const row = statements.findByCode.get(code);
  return row ? rowToEntry(row) : null;
}

export function findById(id: string): WaitlistEntry | null {
  const row = statements.findById.get(id);
  return row ? rowToEntry(row) : null;
}

export function getTotalCount(): number {
  const result = statements.getCount.get() as { count: number };
  return result.count;
}

export function joinWaitlist(data: WaitlistJoinRequest): WaitlistEntry {
  // Check if email already registered
  const existing = findByEmail(data.email);
  if (existing) {
    throw new Error('Email already registered');
  }

  // Generate unique referral code
  let referralCode = generateReferralCode();
  while (findByReferralCode(referralCode)) {
    referralCode = generateReferralCode();
  }

  // Get current position
  const position = getTotalCount() + 1;

  // Create entry
  const id = uuidv4();
  const now = Date.now();

  statements.insert.run(
    id,
    data.email.toLowerCase().trim(),
    data.walletAddress || null,
    referralCode,
    data.referralCode || null,
    0,
    position,
    'standard',
    now,
    data.utmSource || 'direct',
    data.utmCampaign || null,
    data.ipCountry || null
  );

  // Credit referrer if applicable
  if (data.referralCode) {
    creditReferrer(data.referralCode, id);
  }

  return findById(id)!;
}

export function creditReferrer(referralCode: string, newUserId: string): boolean {
  const referrer = findByReferralCode(referralCode);
  if (!referrer) return false;

  // Increment referral count
  const newCount = referrer.referralCount + 1;
  const newTier = calculateTier(newCount);

  // Update referrer
  statements.updateReferralCount.run(newCount, newTier, referrer.id);

  // Log referral event
  statements.insertReferral.run(
    uuidv4(),
    referralCode,
    newUserId,
    Date.now(),
    1
  );

  return newTier !== referrer.tier; // Return true if tier upgraded
}

export function getWaitlistStatus(email: string): {
  position: number;
  referralCount: number;
  tier: WaitlistTier;
  referralsNeededForNextTier: number;
  rewards: string[];
  referralCode: string;
} | null {
  const entry = findByEmail(email);
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

export function getLeaderboard(limit: number = 10): {
  topReferrers: Array<{
    position: number;
    referralCode: string;
    referralCount: number;
    tier: WaitlistTier;
  }>;
  totalSignups: number;
} {
  const rows = statements.getTopReferrers.all(limit) as any[];

  return {
    topReferrers: rows.map((row, index) => ({
      position: index + 1,
      referralCode: maskReferralCode(row.referral_code),
      referralCount: row.referral_count,
      tier: row.tier as WaitlistTier,
    })),
    totalSignups: getTotalCount(),
  };
}

// Mask referral code for leaderboard display (DEGENX2Y3 -> DEGEN***3)
function maskReferralCode(code: string): string {
  if (code.length <= 6) return code;
  return code.substring(0, 5) + '***' + code.substring(code.length - 1);
}

export function updateWalletAddress(email: string, walletAddress: string): boolean {
  const entry = findByEmail(email);
  if (!entry) return false;

  statements.updateWalletAddress.run(walletAddress, entry.id);
  return true;
}

// Get entry by referral code (for referral link validation)
export function validateReferralCode(code: string): boolean {
  return findByReferralCode(code) !== null;
}

console.log('[WaitlistDB] Initialized waitlist database');
