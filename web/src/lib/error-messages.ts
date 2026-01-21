/**
 * Translated error with user-friendly message and recovery guidance
 */
export interface TranslatedError {
  message: string;
  recoveryAction?: string;
}

/**
 * Translates raw errors into user-friendly messages
 *
 * Handles common Solana/wallet error patterns and provides actionable guidance
 */
export function getFriendlyErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Extract error message
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message);
  } else {
    errorMessage = String(error);
  }

  const lowerMessage = errorMessage.toLowerCase();

  // User rejected/cancelled transaction
  if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied') || lowerMessage.includes('user cancelled')) {
    return 'Transaction cancelled. Your funds are safe.';
  }

  // Insufficient funds
  if (lowerMessage.includes('insufficient funds') || lowerMessage.includes('insufficient balance')) {
    return 'Not enough SOL. Add more to your wallet.';
  }

  // Blockhash issues (common network congestion indicator)
  if (lowerMessage.includes('blockhash') || lowerMessage.includes('blockhash not found')) {
    return 'Network busy. Please wait a few seconds and try again.';
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'Transaction timed out. The network may be congested.';
  }

  // Rate limiting
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
    return 'Too many requests. Please wait a moment.';
  }

  // Session errors
  if (lowerMessage.includes('session expired') || lowerMessage.includes('session invalid')) {
    return 'Your session expired. Please create a new session.';
  }

  // Betting/round errors
  if (lowerMessage.includes('round not open') || lowerMessage.includes('betting closed')) {
    return 'Betting is closed for this round. Wait for the next round.';
  }

  // Bet amount errors
  if (lowerMessage.includes('bet too small') || lowerMessage.includes('minimum bet')) {
    return 'Bet amount is below the minimum (0.01 SOL).';
  }

  // Default fallback
  return 'Transaction failed. Please try again or contact support.';
}

/**
 * Gets a detailed error object with recovery action
 */
export function getDetailedError(error: unknown): TranslatedError {
  const message = getFriendlyErrorMessage(error);

  // Extract error message for pattern matching
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (typeof error === 'object' && error && 'message' in error) {
    errorMessage = String((error as { message: unknown }).message);
  }

  const lowerMessage = errorMessage.toLowerCase();

  // Provide specific recovery actions
  let recoveryAction: string | undefined;

  if (lowerMessage.includes('insufficient')) {
    recoveryAction = 'Add SOL to your wallet or reduce your bet amount';
  } else if (lowerMessage.includes('blockhash') || lowerMessage.includes('timeout')) {
    recoveryAction = 'Wait 10-30 seconds and try again';
  } else if (lowerMessage.includes('session')) {
    recoveryAction = 'Create a new session in the wallet menu';
  } else if (lowerMessage.includes('rate limit')) {
    recoveryAction = 'Wait 60 seconds before trying again';
  } else if (lowerMessage.includes('betting closed')) {
    recoveryAction = 'Wait for the next betting round to start';
  }

  return {
    message,
    recoveryAction
  };
}
