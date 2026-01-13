// Shared prediction game constants
// These values must match the backend predictionService

/** Total duration of each prediction round in seconds */
export const ROUND_DURATION = 30;

/** Duration of the betting window in seconds (before round locks) */
export const BETTING_WINDOW = 25;

/** Duration of the lock period in seconds (no new bets accepted) */
export const LOCK_PERIOD = 5;

/** Platform fee percentage on winnings */
export const PLATFORM_FEE_PERCENT = 5;

/** Minimum bet amount in SOL */
export const MIN_BET_SOL = 0.01;

/** Gap between rounds in milliseconds */
export const ROUND_GAP_MS = 1000;
