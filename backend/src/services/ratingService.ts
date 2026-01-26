/**
 * Rating Service - DegenDome Rating (DR) System
 *
 * Handles all DR calculation, tier resolution, shield logic, and placement.
 * Only battles affect DR - Oracle and other side games do not.
 *
 * Tier System (7 standard + 4 apex):
 * Standard tiers have 4 divisions (IV, III, II, I):
 *   Liquidated (0-499), Paper Hands (500-799), Retail (800-1099),
 *   Degen (1100-1399), Whale (1400-1699), Market Maker (1700-1999),
 *   Oracle (2000-2299)
 * Apex tiers (no divisions):
 *   Apex Contender (2300+), Apex Predator (top 200),
 *   Apex Elite (top 50), The Apex (#1, 2700+)
 */

import * as ratingDb from '../db/ratingDatabase';
import type { PlayerRating } from '../db/ratingDatabase';

// ===================
// Constants
// ===================

const PLACEMENT_MATCH_COUNT = 10;
const PLACEMENT_K_FACTOR = 50;
const PLACEMENT_DR_MIN = 500;
const PLACEMENT_DR_MAX = 1800;

const DIVISION_SHIELD_MATCHES = 3;
const TIER_SHIELD_MATCHES = 5;

// K-factor brackets by matches played (post-placement)
function getKFactor(matchesPlayed: number): number {
  if (matchesPlayed <= PLACEMENT_MATCH_COUNT) return PLACEMENT_K_FACTOR;
  if (matchesPlayed <= 30) return 40;
  if (matchesPlayed <= 100) return 32;
  return 24;
}

// ===================
// Tier Definitions
// ===================

export type DrTier =
  | 'liquidated'
  | 'paper_hands'
  | 'retail'
  | 'degen'
  | 'whale'
  | 'market_maker'
  | 'oracle'
  | 'apex_contender'
  | 'apex_predator'
  | 'apex_elite'
  | 'the_apex';

interface TierRange {
  tier: DrTier;
  min: number;
  max: number;
}

const STANDARD_TIERS: TierRange[] = [
  { tier: 'liquidated',   min: 0,    max: 499  },
  { tier: 'paper_hands',  min: 500,  max: 799  },
  { tier: 'retail',       min: 800,  max: 1099 },
  { tier: 'degen',        min: 1100, max: 1399 },
  { tier: 'whale',        min: 1400, max: 1699 },
  { tier: 'market_maker', min: 1700, max: 1999 },
  { tier: 'oracle',       min: 2000, max: 2299 },
];

export const TIER_DISPLAY_NAMES: Record<DrTier, string> = {
  liquidated: 'Liquidated',
  paper_hands: 'Paper Hands',
  retail: 'Retail',
  degen: 'Degen',
  whale: 'Whale',
  market_maker: 'Market Maker',
  oracle: 'Oracle',
  apex_contender: 'Apex Contender',
  apex_predator: 'Apex Predator',
  apex_elite: 'Apex Elite',
  the_apex: 'The Apex',
};

// ===================
// Tier Resolution
// ===================

/**
 * Resolve tier + division from DR value (standard tiers only).
 * Division: 4 = lowest within tier, 1 = highest.
 */
export function resolveTier(dr: number): { tier: DrTier; division: number } {
  if (dr >= 2300) {
    return { tier: 'apex_contender', division: 0 };
  }

  for (const range of STANDARD_TIERS) {
    if (dr >= range.min && dr <= range.max) {
      const tierRange = range.max - range.min + 1;
      const divisionSize = tierRange / 4;
      const offsetInTier = dr - range.min;
      // Division 4 is lowest, 1 is highest
      const division = 4 - Math.min(3, Math.floor(offsetInTier / divisionSize));
      return { tier: range.tier, division };
    }
  }

  // Fallback for negative DR edge case
  return { tier: 'liquidated', division: 4 };
}

/**
 * Resolve apex tier by checking leaderboard position.
 * Call this after resolveTier for players at 2300+ DR.
 */
export function resolveApexTier(wallet: string, dr: number): { tier: DrTier; division: number } {
  if (dr < 2300) {
    return resolveTier(dr);
  }

  const rank = ratingDb.getPlayerRank(wallet);

  // The Apex: #1 player with 2700+ DR
  if (rank === 1 && dr >= 2700) {
    return { tier: 'the_apex', division: 0 };
  }

  // Apex Elite: top 50
  if (rank <= 50) {
    return { tier: 'apex_elite', division: 0 };
  }

  // Apex Predator: top 200
  if (rank <= 200) {
    return { tier: 'apex_predator', division: 0 };
  }

  // Apex Contender: 2300+ but not in top 200
  return { tier: 'apex_contender', division: 0 };
}

// ===================
// DR Calculation (Glicko-style ELO)
// ===================

/**
 * Calculate DR change for a match.
 *
 * Uses standard ELO expected score formula:
 *   E = 1 / (1 + 10^((opponentDr - playerDr) / 400))
 *
 * Change = K * (S - E)
 *   where S = 1 for win, 0 for loss
 */
export function calculateDrChange(
  playerDr: number,
  opponentDr: number,
  won: boolean,
  matchesPlayed: number
): { drChange: number; kFactor: number } {
  const kFactor = getKFactor(matchesPlayed);
  const expected = 1 / (1 + Math.pow(10, (opponentDr - playerDr) / 400));
  const score = won ? 1 : 0;
  const drChange = Math.round(kFactor * (score - expected));

  return { drChange, kFactor };
}

// ===================
// Shield Logic
// ===================

/**
 * Check if a player's division or tier shield should prevent demotion.
 * Returns the adjusted DR if shield applies, or the raw newDr otherwise.
 * Also updates shield counters.
 */
function applyShields(
  rating: PlayerRating,
  newDr: number
): { dr: number; divisionShield: number; tierShield: number } {
  const currentTierInfo = resolveTier(rating.dr);
  const newTierInfo = resolveTier(newDr);

  let divisionShield = rating.divisionShield;
  let tierShield = rating.tierShield;

  // Check tier demotion
  if (newTierInfo.tier !== currentTierInfo.tier && newDr < rating.dr) {
    // Tier would change - check tier shield
    if (tierShield < TIER_SHIELD_MATCHES) {
      // Shield active: clamp DR to tier floor
      const currentTierRange = STANDARD_TIERS.find(t => t.tier === currentTierInfo.tier);
      if (currentTierRange) {
        newDr = Math.max(newDr, currentTierRange.min);
      }
      tierShield++;
      return { dr: newDr, divisionShield, tierShield };
    }
    // Shield exhausted - allow demotion, reset shields
    divisionShield = 0;
    tierShield = 0;
    return { dr: newDr, divisionShield, tierShield };
  }

  // Check division demotion (same tier, lower division)
  if (
    newTierInfo.tier === currentTierInfo.tier &&
    newTierInfo.division > currentTierInfo.division &&
    newDr < rating.dr
  ) {
    if (divisionShield < DIVISION_SHIELD_MATCHES) {
      // Shield active: clamp DR to division floor
      const currentTierRange = STANDARD_TIERS.find(t => t.tier === currentTierInfo.tier);
      if (currentTierRange) {
        const tierRange = currentTierRange.max - currentTierRange.min + 1;
        const divisionSize = tierRange / 4;
        // Division 4 = 0 offset, 3 = 1 offset, 2 = 2 offset, 1 = 3 offset
        const divisionOffset = (4 - currentTierInfo.division) * divisionSize;
        const divisionFloor = currentTierRange.min + divisionOffset;
        newDr = Math.max(newDr, divisionFloor);
      }
      divisionShield++;
      return { dr: newDr, divisionShield, tierShield };
    }
    // Shield exhausted - allow division drop, reset
    divisionShield = 0;
    return { dr: newDr, divisionShield, tierShield };
  }

  // No demotion - reset shields on promotion or same-division movement
  if (newDr > rating.dr) {
    divisionShield = 0;
    tierShield = 0;
  }

  return { dr: newDr, divisionShield, tierShield };
}

// ===================
// Match Processing
// ===================

export interface ProcessMatchResult {
  winner: PlayerMatchResult;
  loser: PlayerMatchResult;
}

export interface PlayerMatchResult {
  wallet: string;
  drBefore: number;
  drAfter: number;
  drChange: number;
  tier: DrTier;
  division: number;
  isPlacement: boolean;
  kFactor: number;
}

/**
 * Process a completed battle match. Updates both players' DR.
 * This is the main entry point for the rating system.
 */
export function processMatch(
  winnerWallet: string,
  loserWallet: string,
  battleId: string
): ProcessMatchResult {
  const winnerRating = ratingDb.getOrCreatePlayerRating(winnerWallet);
  const loserRating = ratingDb.getOrCreatePlayerRating(loserWallet);

  // Calculate DR changes
  const winnerCalc = calculateDrChange(winnerRating.dr, loserRating.dr, true, winnerRating.matchesPlayed);
  const loserCalc = calculateDrChange(loserRating.dr, winnerRating.dr, false, loserRating.matchesPlayed);

  let winnerNewDr = winnerRating.dr + winnerCalc.drChange;
  let loserNewDr = loserRating.dr + loserCalc.drChange;

  // Floor at 0
  loserNewDr = Math.max(0, loserNewDr);

  // Placement clamping
  if (winnerRating.isPlacement) {
    winnerNewDr = Math.max(PLACEMENT_DR_MIN, Math.min(PLACEMENT_DR_MAX, winnerNewDr));
  }
  if (loserRating.isPlacement) {
    loserNewDr = Math.max(PLACEMENT_DR_MIN, Math.min(PLACEMENT_DR_MAX, loserNewDr));
  }

  // Apply shields (only for non-placement players)
  let winnerDivisionShield = winnerRating.divisionShield;
  let winnerTierShield = winnerRating.tierShield;
  let loserDivisionShield = loserRating.divisionShield;
  let loserTierShield = loserRating.tierShield;

  if (!winnerRating.isPlacement) {
    const shielded = applyShields(winnerRating, winnerNewDr);
    winnerNewDr = shielded.dr;
    winnerDivisionShield = shielded.divisionShield;
    winnerTierShield = shielded.tierShield;
  }
  if (!loserRating.isPlacement) {
    const shielded = applyShields(loserRating, loserNewDr);
    loserNewDr = shielded.dr;
    loserDivisionShield = shielded.divisionShield;
    loserTierShield = shielded.tierShield;
  }

  // Resolve tiers
  const winnerTierInfo = resolveApexTier(winnerWallet, winnerNewDr);
  const loserTierInfo = resolveApexTier(loserWallet, loserNewDr);

  // Update winner
  const winnerPlacementMatches = winnerRating.placementMatches + 1;
  const winnerIsPlacement = winnerPlacementMatches < PLACEMENT_MATCH_COUNT;
  const winnerUpdated: PlayerRating = {
    ...winnerRating,
    dr: winnerNewDr,
    tier: winnerTierInfo.tier,
    division: winnerTierInfo.division,
    matchesPlayed: winnerRating.matchesPlayed + 1,
    wins: winnerRating.wins + 1,
    isPlacement: winnerIsPlacement,
    placementMatches: winnerPlacementMatches,
    divisionShield: winnerDivisionShield,
    tierShield: winnerTierShield,
    peakDr: Math.max(winnerRating.peakDr, winnerNewDr),
    currentStreak: winnerRating.currentStreak > 0 ? winnerRating.currentStreak + 1 : 1,
    updatedAt: Date.now(),
  };
  ratingDb.updatePlayerRating(winnerUpdated);

  // Update loser
  const loserPlacementMatches = loserRating.placementMatches + 1;
  const loserIsPlacement = loserPlacementMatches < PLACEMENT_MATCH_COUNT;
  const loserUpdated: PlayerRating = {
    ...loserRating,
    dr: loserNewDr,
    tier: loserTierInfo.tier,
    division: loserTierInfo.division,
    matchesPlayed: loserRating.matchesPlayed + 1,
    losses: loserRating.losses + 1,
    isPlacement: loserIsPlacement,
    placementMatches: loserPlacementMatches,
    divisionShield: loserDivisionShield,
    tierShield: loserTierShield,
    peakDr: loserRating.peakDr, // Peak unchanged on loss
    currentStreak: loserRating.currentStreak < 0 ? loserRating.currentStreak - 1 : -1,
    updatedAt: Date.now(),
  };
  ratingDb.updatePlayerRating(loserUpdated);

  // Record history for both players
  ratingDb.recordDrChange({
    wallet: winnerWallet,
    battleId,
    drBefore: winnerRating.dr,
    drAfter: winnerNewDr,
    drChange: winnerNewDr - winnerRating.dr,
    opponentWallet: loserWallet,
    opponentDr: loserRating.dr,
    isWin: true,
    kFactor: winnerCalc.kFactor,
  });

  ratingDb.recordDrChange({
    wallet: loserWallet,
    battleId,
    drBefore: loserRating.dr,
    drAfter: loserNewDr,
    drChange: loserNewDr - loserRating.dr,
    opponentWallet: winnerWallet,
    opponentDr: winnerRating.dr,
    isWin: false,
    kFactor: loserCalc.kFactor,
  });

  console.log(
    `[Rating] DR updated - ${winnerWallet.slice(0, 8)}...: ${winnerRating.dr} -> ${winnerNewDr} (+${winnerNewDr - winnerRating.dr}), ` +
    `${loserWallet.slice(0, 8)}...: ${loserRating.dr} -> ${loserNewDr} (${loserNewDr - loserRating.dr})`
  );

  return {
    winner: {
      wallet: winnerWallet,
      drBefore: winnerRating.dr,
      drAfter: winnerNewDr,
      drChange: winnerNewDr - winnerRating.dr,
      tier: winnerTierInfo.tier,
      division: winnerTierInfo.division,
      isPlacement: winnerIsPlacement,
      kFactor: winnerCalc.kFactor,
    },
    loser: {
      wallet: loserWallet,
      drBefore: loserRating.dr,
      drAfter: loserNewDr,
      drChange: loserNewDr - loserRating.dr,
      tier: loserTierInfo.tier,
      division: loserTierInfo.division,
      isPlacement: loserIsPlacement,
      kFactor: loserCalc.kFactor,
    },
  };
}

// ===================
// Query Helpers
// ===================

/**
 * Get matchmaking tier for a wallet (used by battleManager).
 * Returns the tier string for queue key construction.
 */
export function getMatchmakingTier(wallet: string): { tier: string; isPlacement: boolean } {
  const rating = ratingDb.getOrCreatePlayerRating(wallet);
  return {
    tier: rating.tier,
    isPlacement: rating.isPlacement,
  };
}

console.log('[RatingService] Rating service module loaded');
