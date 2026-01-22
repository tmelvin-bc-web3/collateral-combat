/**
 * Centralized platform fee configuration.
 * Standard rake is 5% across most game modes.
 * Draft tournaments use 10% rake (intentionally different).
 */

/** Standard platform fee: 5% (500 basis points) */
export const PLATFORM_FEE_BPS = 500;

/** Draft tournament fee: 10% (1000 basis points) - intentionally higher */
export const DRAFT_FEE_BPS = 1000;

/** Standard fee as percentage (for display) */
export const PLATFORM_FEE_PERCENT = 5;

/** Draft fee as percentage (for display) */
export const DRAFT_FEE_PERCENT = 10;

/**
 * Calculate the distributable pool after platform fee.
 * @param losingPool - Total losing pool amount
 * @param feeBps - Fee in basis points (default: PLATFORM_FEE_BPS)
 * @returns Amount distributable to winners
 */
export function calculateDistributablePool(losingPool: number, feeBps = PLATFORM_FEE_BPS): number {
  return losingPool * (1 - feeBps / 10000);
}

/**
 * Calculate platform fee amount.
 * @param pool - Pool to calculate fee from
 * @param feeBps - Fee in basis points (default: PLATFORM_FEE_BPS)
 * @returns Fee amount
 */
export function calculateFee(pool: number, feeBps = PLATFORM_FEE_BPS): number {
  return pool * (feeBps / 10000);
}
