/**
 * ELO Service - Handles ELO rating calculations for skill-based matchmaking
 *
 * ELO Rating System:
 * - New players start at 1200
 * - K-factor determines how much ratings change after each match
 * - Protected tier: Players with <10 battles get isolated matchmaking
 * - Tier system: bronze/silver/gold/platinum/diamond based on ELO rating
 */

import { EloTier } from '../types';

// ===================
// Constants
// ===================

// K-factor determines how much ratings change after each match
// Higher K = more volatile ratings (good for new players to find their true skill)
// Lower K = more stable ratings (good for established players)
export const K_FACTOR_NEW = 32;       // For players with < 30 battles
export const K_FACTOR_ESTABLISHED = 16; // For players with >= 30 battles

// Battle count threshold for K-factor calculation
const K_FACTOR_THRESHOLD = 30;

// Protected tier threshold - players with fewer battles get isolated matchmaking
const PROTECTED_TIER_THRESHOLD = 10;

// ELO tier thresholds
const TIER_THRESHOLDS = {
  bronze: 1000,
  silver: 1500,
  gold: 2000,
  platinum: 2500,
} as const;

// ===================
// ELO Calculation Functions
// ===================

/**
 * Calculate the expected win probability using ELO formula
 * Expected = 1 / (1 + 10^((opponent - player) / 400))
 */
function calculateExpectedWin(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Get the K-factor based on battle count
 * New players (<30 battles) have higher K for faster rating adjustment
 */
function getKFactor(battleCount: number): number {
  return battleCount < K_FACTOR_THRESHOLD ? K_FACTOR_NEW : K_FACTOR_ESTABLISHED;
}

/**
 * Calculate ELO change after a battle
 *
 * @param winnerElo - Winner's current ELO rating
 * @param loserElo - Loser's current ELO rating
 * @param winnerBattleCount - Winner's total battle count (for K-factor)
 * @returns Object with winnerGain and loserLoss (both positive numbers)
 *
 * Formula:
 * expectedWin = 1 / (1 + 10^((loserElo - winnerElo) / 400))
 * change = K * (1 - expectedWin)
 *
 * Example:
 * - 1200 beats 1200: expectedWin=0.5, change=K*0.5 (equal skill, moderate gain)
 * - 1200 beats 1400: expectedWin=0.24, change=K*0.76 (upset, big gain)
 * - 1400 beats 1200: expectedWin=0.76, change=K*0.24 (expected, small gain)
 */
export function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  winnerBattleCount: number
): { winnerGain: number; loserLoss: number } {
  const expectedWin = calculateExpectedWin(winnerElo, loserElo);
  const kFactor = getKFactor(winnerBattleCount);

  // Winner gains K * (1 - expectedWin)
  // The less expected the win, the more points gained
  const winnerGain = Math.round(kFactor * (1 - expectedWin));

  // Loser loses the same amount (zero-sum system)
  const loserLoss = winnerGain;

  return { winnerGain, loserLoss };
}

/**
 * Get ELO tier based on rating
 *
 * Tiers:
 * - bronze: < 1000
 * - silver: 1000-1499
 * - gold: 1500-1999
 * - platinum: 2000-2499
 * - diamond: 2500+
 */
export function getEloTier(elo: number): Exclude<EloTier, 'protected'> {
  if (elo >= TIER_THRESHOLDS.platinum) return 'diamond';
  if (elo >= TIER_THRESHOLDS.gold) return 'platinum';
  if (elo >= TIER_THRESHOLDS.silver) return 'gold';
  if (elo >= TIER_THRESHOLDS.bronze) return 'silver';
  return 'bronze';
}

/**
 * Check if a player should be in the protected matchmaking tier
 *
 * Protected tier is for new players with < 10 battles
 * They only match against other protected tier players
 *
 * @param battleCount - Player's total battle count
 * @returns true if player should be protected
 */
export function shouldProtectPlayer(battleCount: number): boolean {
  return battleCount < PROTECTED_TIER_THRESHOLD;
}

/**
 * Get display tier (includes 'protected' for UI purposes)
 */
export function getDisplayTier(elo: number, battleCount: number): EloTier {
  if (shouldProtectPlayer(battleCount)) {
    return 'protected';
  }
  return getEloTier(elo);
}

/**
 * Get tier thresholds for UI display
 */
export function getTierThresholds(): Record<string, number> {
  return { ...TIER_THRESHOLDS };
}

/**
 * Get next tier threshold for progress tracking
 */
export function getNextTierThreshold(elo: number): number | null {
  if (elo < TIER_THRESHOLDS.bronze) return TIER_THRESHOLDS.bronze;
  if (elo < TIER_THRESHOLDS.silver) return TIER_THRESHOLDS.silver;
  if (elo < TIER_THRESHOLDS.gold) return TIER_THRESHOLDS.gold;
  if (elo < TIER_THRESHOLDS.platinum) return TIER_THRESHOLDS.platinum;
  return null; // Already at highest tier
}

console.log('[EloService] ELO service module loaded');
