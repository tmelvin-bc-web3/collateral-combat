import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/referrals.db');

let db: Database.Database | null = null;

export function getReferralDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    initReferralTables();
  }
  return db;
}

function initReferralTables() {
  const database = db!;

  // Referral codes (one per user)
  database.exec(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      wallet_address TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Referral relationships
  database.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_wallet TEXT NOT NULL,
      referred_wallet TEXT NOT NULL UNIQUE,
      referral_code TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      activated_at INTEGER,
      discount_expires_at INTEGER
    )
  `);

  // Referral earnings log
  database.exec(`
    CREATE TABLE IF NOT EXISTS referral_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_wallet TEXT NOT NULL,
      referred_wallet TEXT NOT NULL,
      earning_type TEXT NOT NULL,
      amount REAL NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
    CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_wallet);
    CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
    CREATE INDEX IF NOT EXISTS idx_earnings_referrer ON referral_earnings(referrer_wallet);
  `);
}

// Types
export interface ReferralCodeRow {
  wallet_address: string;
  code: string;
  created_at: number;
}

export interface ReferralRow {
  id: number;
  referrer_wallet: string;
  referred_wallet: string;
  referral_code: string;
  status: string;
  created_at: number;
  activated_at: number | null;
  discount_expires_at: number | null;
}

export interface ReferralEarningRow {
  id: number;
  referrer_wallet: string;
  referred_wallet: string;
  earning_type: string;
  amount: number;
  source: string;
  source_id: string | null;
  created_at: number;
}

// Referral Code Queries
export function getCodeByWallet(walletAddress: string): ReferralCodeRow | null {
  const db = getReferralDb();
  return db.prepare('SELECT * FROM referral_codes WHERE wallet_address = ?').get(walletAddress) as ReferralCodeRow | null;
}

export function getCodeByCode(code: string): ReferralCodeRow | null {
  const db = getReferralDb();
  return db.prepare('SELECT * FROM referral_codes WHERE code = ? COLLATE NOCASE').get(code) as ReferralCodeRow | null;
}

export function insertCode(walletAddress: string, code: string): void {
  const db = getReferralDb();
  db.prepare(`
    INSERT INTO referral_codes (wallet_address, code, created_at)
    VALUES (?, ?, ?)
  `).run(walletAddress, code, Date.now());
}

// Referral Queries
export function getReferralByReferred(walletAddress: string): ReferralRow | null {
  const db = getReferralDb();
  return db.prepare('SELECT * FROM referrals WHERE referred_wallet = ?').get(walletAddress) as ReferralRow | null;
}

export function getReferralsByReferrer(walletAddress: string): ReferralRow[] {
  const db = getReferralDb();
  return db.prepare('SELECT * FROM referrals WHERE referrer_wallet = ? ORDER BY created_at DESC').all(walletAddress) as ReferralRow[];
}

export function insertReferral(referrerWallet: string, referredWallet: string, code: string): void {
  const db = getReferralDb();
  db.prepare(`
    INSERT INTO referrals (referrer_wallet, referred_wallet, referral_code, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(referrerWallet, referredWallet, code, Date.now());
}

export function activateReferral(referredWallet: string): void {
  const db = getReferralDb();
  const now = Date.now();
  const discountExpires = now + (7 * 24 * 60 * 60 * 1000); // 7 days
  db.prepare(`
    UPDATE referrals
    SET status = 'active', activated_at = ?, discount_expires_at = ?
    WHERE referred_wallet = ? AND status = 'pending'
  `).run(now, discountExpires, referredWallet);
}

export function getReferralStats(walletAddress: string): {
  totalReferrals: number;
  activeReferrals: number;
} {
  const db = getReferralDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM referrals WHERE referrer_wallet = ?').get(walletAddress) as { count: number };
  const active = db.prepare('SELECT COUNT(*) as count FROM referrals WHERE referrer_wallet = ? AND status = ?').get(walletAddress, 'active') as { count: number };
  return {
    totalReferrals: total.count,
    activeReferrals: active.count
  };
}

// Earnings Queries
export function insertEarning(
  referrerWallet: string,
  referredWallet: string,
  earningType: 'xp_bonus' | 'rake_kickback',
  amount: number,
  source: string,
  sourceId: string | null
): void {
  const db = getReferralDb();
  db.prepare(`
    INSERT INTO referral_earnings (referrer_wallet, referred_wallet, earning_type, amount, source, source_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(referrerWallet, referredWallet, earningType, amount, source, sourceId || null, Date.now());
}

export function getEarningsByReferrer(walletAddress: string): ReferralEarningRow[] {
  const db = getReferralDb();
  return db.prepare('SELECT * FROM referral_earnings WHERE referrer_wallet = ? ORDER BY created_at DESC LIMIT 100').all(walletAddress) as ReferralEarningRow[];
}

export function getTotalEarnings(walletAddress: string): {
  totalXpEarned: number;
  totalRakeEarned: number;
} {
  const db = getReferralDb();
  const xp = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_wallet = ? AND earning_type = ?').get(walletAddress, 'xp_bonus') as { total: number };
  const rake = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE referrer_wallet = ? AND earning_type = ?').get(walletAddress, 'rake_kickback') as { total: number };
  return {
    totalXpEarned: xp.total,
    totalRakeEarned: rake.total
  };
}
