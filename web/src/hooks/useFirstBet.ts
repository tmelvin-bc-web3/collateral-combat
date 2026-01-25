'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

// Storage key prefix - actual key includes wallet address for per-wallet tracking
const FIRST_BET_KEY_PREFIX = 'sol_battles_first_bet_completed';

/**
 * Hook for tracking first bet state per wallet
 *
 * Tracks whether a user has placed their first bet and manages
 * the celebration state for the first bet milestone.
 *
 * @example
 * const { hasPlacedFirstBet, isFirstBetUser, recordFirstBet, showCelebration } = useFirstBet();
 *
 * // On successful bet:
 * if (!hasPlacedFirstBet) {
 *   recordFirstBet();
 *   triggerConfetti();
 * }
 */
export function useFirstBet() {
  const { publicKey, connected } = useWallet();

  // Track if user has placed their first bet
  const [hasPlacedFirstBet, setHasPlacedFirstBet] = useState(true); // Default true to avoid false positives
  // Track if we should show the celebration
  const [showCelebration, setShowCelebration] = useState(false);
  // Track if localStorage has been checked
  const [initialized, setInitialized] = useState(false);

  // Generate storage key for current wallet
  const storageKey = useMemo(() => {
    if (!publicKey) return null;
    return `${FIRST_BET_KEY_PREFIX}_${publicKey.toBase58()}`;
  }, [publicKey]);

  // Check localStorage on mount and when wallet changes
  useEffect(() => {
    if (!storageKey) {
      // No wallet connected - reset state
      setHasPlacedFirstBet(true);
      setInitialized(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true') {
        setHasPlacedFirstBet(true);
      } else {
        // No record found - user hasn't placed first bet yet
        setHasPlacedFirstBet(false);
      }
    } catch (e) {
      // localStorage not available - assume they've bet before
      console.error('[useFirstBet] Failed to read localStorage:', e);
      setHasPlacedFirstBet(true);
    }

    setInitialized(true);
  }, [storageKey]);

  /**
   * Record that the user has placed their first bet
   * Sets localStorage and triggers celebration state
   */
  const recordFirstBet = useCallback(() => {
    if (!storageKey || hasPlacedFirstBet) return;

    try {
      localStorage.setItem(storageKey, 'true');
      setHasPlacedFirstBet(true);
      setShowCelebration(true);
    } catch (e) {
      console.error('[useFirstBet] Failed to write localStorage:', e);
      // Still update state even if localStorage fails
      setHasPlacedFirstBet(true);
      setShowCelebration(true);
    }
  }, [storageKey, hasPlacedFirstBet]);

  /**
   * Dismiss the celebration after it's been shown
   */
  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  /**
   * True if user is connected and has NOT placed their first bet
   * Use this to determine if user should see first-bet-specific UI
   */
  const isFirstBetUser = useMemo(() => {
    return connected && initialized && !hasPlacedFirstBet;
  }, [connected, initialized, hasPlacedFirstBet]);

  return {
    /** True if user has ever placed a bet (or unknown state) */
    hasPlacedFirstBet,
    /** True when we should show the first bet celebration */
    showCelebration,
    /** True if connected user has NOT placed their first bet yet */
    isFirstBetUser,
    /** True once localStorage check is complete */
    initialized,
    /** Call on successful bet to record first bet and trigger celebration */
    recordFirstBet,
    /** Call after showing celebration to reset celebration state */
    dismissCelebration,
  };
}
