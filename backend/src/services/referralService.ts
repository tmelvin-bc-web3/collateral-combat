import {
  getReferralDb,
  getCodeByWallet,
  getCodeByCode,
  insertCode,
  getReferralByReferred,
  getReferralsByReferrer,
  insertReferral,
  activateReferral as dbActivateReferral,
  getReferralStats as dbGetReferralStats,
  insertEarning,
  getEarningsByReferrer,
  getTotalEarnings,
  ReferralRow,
  ReferralCodeRow,
} from '../db/referralDatabase';
import { Referral, ReferralCode, ReferralStats } from '../types';

// Constants
const REFERRAL_RAKE_PERCENT = 0.10;    // 10% of rake paid (effectively 1% of transaction)
const DISCOUNT_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DISCOUNT_RAKE = 9;               // 9% rake for referred users (1% discount)
const DEFAULT_RAKE = 10;               // Normal 10% rake

// Code generation characters (no ambiguous chars like 0/O, 1/l/I)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

function rowToReferral(row: ReferralRow): Referral {
  return {
    id: row.id,
    referrerWallet: row.referrer_wallet,
    referredWallet: row.referred_wallet,
    referralCode: row.referral_code,
    status: row.status as Referral['status'],
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    discountExpiresAt: row.discount_expires_at,
  };
}

function rowToCode(row: ReferralCodeRow): ReferralCode {
  return {
    walletAddress: row.wallet_address,
    code: row.code,
    createdAt: row.created_at,
  };
}

class ReferralService {
  /**
   * Get or generate a referral code for a wallet
   */
  getOrCreateCode(walletAddress: string): ReferralCode {
    // Initialize DB
    getReferralDb();

    // Check if code already exists
    const existing = getCodeByWallet(walletAddress);
    if (existing) {
      return rowToCode(existing);
    }

    // Generate unique code
    let code = generateRandomCode();
    let attempts = 0;
    while (getCodeByCode(code) && attempts < 10) {
      code = generateRandomCode();
      attempts++;
    }

    // Insert new code
    insertCode(walletAddress, code);

    return {
      walletAddress,
      code,
      createdAt: Date.now(),
    };
  }

  /**
   * Get existing code for wallet (doesn't create)
   */
  getCodeForWallet(walletAddress: string): ReferralCode | null {
    getReferralDb();
    const row = getCodeByWallet(walletAddress);
    return row ? rowToCode(row) : null;
  }

  /**
   * Claim a referral code (link referred user to referrer)
   */
  claimReferral(referredWallet: string, code: string): { success: boolean; error?: string; referral?: Referral } {
    getReferralDb();

    // Check if referred user already has a referral
    const existingReferral = getReferralByReferred(referredWallet);
    if (existingReferral) {
      return { success: false, error: 'You already have a referrer' };
    }

    // Find the referrer by code
    const codeRow = getCodeByCode(code.toUpperCase());
    if (!codeRow) {
      return { success: false, error: 'Invalid referral code' };
    }

    // Can't refer yourself
    if (codeRow.wallet_address === referredWallet) {
      return { success: false, error: 'You cannot use your own referral code' };
    }

    // Create the referral relationship
    insertReferral(codeRow.wallet_address, referredWallet, codeRow.code);

    const newReferral = getReferralByReferred(referredWallet);
    return {
      success: true,
      referral: newReferral ? rowToReferral(newReferral) : undefined
    };
  }

  /**
   * Activate a pending referral (called on first activity)
   */
  activateReferral(referredWallet: string): void {
    getReferralDb();

    const referral = getReferralByReferred(referredWallet);
    if (referral && referral.status === 'pending') {
      dbActivateReferral(referredWallet);
      console.log(`[Referral] Activated referral for ${referredWallet}, discount expires in 7 days`);
    }
  }

  /**
   * Get referral info for a referred user
   */
  getReferralByReferred(walletAddress: string): Referral | null {
    getReferralDb();
    const row = getReferralByReferred(walletAddress);
    return row ? rowToReferral(row) : null;
  }

  /**
   * Get all referrals made by a referrer
   */
  getReferralsByReferrer(walletAddress: string): Referral[] {
    getReferralDb();
    return getReferralsByReferrer(walletAddress).map(rowToReferral);
  }

  /**
   * Award rake kickback to referrer when referred user pays rake
   */
  awardRakeKickback(
    referredWallet: string,
    rakeAmount: number,
    source: string,
    sourceId: string | null
  ): number {
    getReferralDb();

    const referral = getReferralByReferred(referredWallet);
    if (!referral || referral.status !== 'active') {
      return 0;
    }

    const kickback = rakeAmount * REFERRAL_RAKE_PERCENT;
    if (kickback <= 0) return 0;

    insertEarning(
      referral.referrer_wallet,
      referredWallet,
      'rake_kickback',
      kickback,
      source,
      sourceId
    );

    console.log(`[Referral] Awarded ${kickback} SOL kickback to ${referral.referrer_wallet} from referral ${referredWallet}`);
    return kickback;
  }

  /**
   * Check if user has active rake discount from being referred
   */
  hasActiveRakeDiscount(walletAddress: string): boolean {
    getReferralDb();

    const referral = getReferralByReferred(walletAddress);
    if (!referral || referral.status !== 'active') {
      return false;
    }

    // Check if discount hasn't expired
    if (referral.discount_expires_at && referral.discount_expires_at > Date.now()) {
      return true;
    }

    return false;
  }

  /**
   * Get the discount expiration time for a user
   */
  getDiscountExpiration(walletAddress: string): number | null {
    getReferralDb();

    const referral = getReferralByReferred(walletAddress);
    if (!referral || referral.status !== 'active') {
      return null;
    }

    return referral.discount_expires_at;
  }

  /**
   * Get effective rake rate for a user (checks referral discount)
   * Returns the referral discount rake rate, or null if no discount
   */
  getReferralRakeDiscount(walletAddress: string): number | null {
    if (this.hasActiveRakeDiscount(walletAddress)) {
      return DISCOUNT_RAKE;
    }
    return null; // No referral discount, use default rake
  }

  /**
   * Get full referral stats for a user
   */
  getReferralStats(walletAddress: string): ReferralStats {
    getReferralDb();

    const code = this.getOrCreateCode(walletAddress);
    const stats = dbGetReferralStats(walletAddress);
    const earnings = getTotalEarnings(walletAddress);
    const referrals = this.getReferralsByReferrer(walletAddress);

    // Check if user has discount (as a referred user)
    const myReferral = getReferralByReferred(walletAddress);
    const hasDiscount = this.hasActiveRakeDiscount(walletAddress);
    const discountExpiresAt = myReferral?.discount_expires_at || null;

    return {
      totalReferrals: stats.totalReferrals,
      activeReferrals: stats.activeReferrals,
      totalRakeEarned: earnings.totalRakeEarned,
      myCode: code.code,
      referrals,
      hasDiscount,
      discountExpiresAt,
    };
  }
}

export const referralService = new ReferralService();
