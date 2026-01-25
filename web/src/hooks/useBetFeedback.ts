'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { BetResult } from '@/components/feedback';

interface UseBetFeedbackReturn {
  /** Whether the win modal is currently shown */
  showWinModal: boolean;
  /** Whether the loss flash is currently active */
  showLossFlash: boolean;
  /** The current bet result (for displaying in modal/flash) */
  result: BetResult | null;
  /** Trigger the win modal with a bet result */
  triggerWin: (result: BetResult) => void;
  /** Trigger the loss flash with a bet result */
  triggerLoss: (result: BetResult) => void;
  /** Dismiss the win modal */
  dismissWin: () => void;
  /** Dismiss the loss flash (also auto-called after 1s) */
  dismissLoss: () => void;
}

/**
 * useBetFeedback - Hook to manage bet outcome feedback
 *
 * Manages the state for WinModal and LossFlash components.
 * Provides functions to trigger win/loss feedback with result data.
 *
 * Features:
 * - triggerWin(): Sets showWinModal true, stores result, triggers haptic
 * - triggerLoss(): Sets showLossFlash true, stores result, auto-dismisses after 1s
 * - dismissWin(): Sets showWinModal false, clears result
 * - dismissLoss(): Sets showLossFlash false (also auto-called after 1s timeout)
 * - Haptic feedback on win (celebration pattern)
 * - Cleans up timeouts on unmount
 *
 * @example
 * const {
 *   showWinModal,
 *   showLossFlash,
 *   result,
 *   triggerWin,
 *   triggerLoss,
 *   dismissWin,
 *   dismissLoss
 * } = useBetFeedback();
 *
 * // On bet settled
 * if (won) {
 *   triggerWin({ won: true, bet: 0.1, payout: 0.19, fees: 0.01, newBalance: 1.09 });
 * } else {
 *   triggerLoss({ won: false, bet: 0.1, payout: 0, fees: 0, newBalance: 0.9 });
 * }
 *
 * // In JSX
 * {showWinModal && result && <WinModal result={result} onDismiss={dismissWin} />}
 * <LossFlash isActive={showLossFlash} onComplete={dismissLoss} />
 */
export function useBetFeedback(): UseBetFeedbackReturn {
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLossFlash, setShowLossFlash] = useState(false);
  const [result, setResult] = useState<BetResult | null>(null);

  // Refs for cleanup
  const lossTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (lossTimeoutRef.current) {
        clearTimeout(lossTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Trigger win feedback
   * - Shows win modal
   * - Stores result for display
   * - Triggers haptic feedback (celebration pattern)
   */
  const triggerWin = useCallback((betResult: BetResult) => {
    setResult(betResult);
    setShowWinModal(true);
    setShowLossFlash(false); // Ensure loss flash is off

    // Haptic feedback for celebration (progressive enhancement)
    // Celebration pattern: short-pause-short
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, []);

  /**
   * Trigger loss feedback
   * - Shows loss flash
   * - Stores result
   * - Auto-dismisses after 1 second
   * - No haptic (don't rub it in)
   */
  const triggerLoss = useCallback((betResult: BetResult) => {
    setResult(betResult);
    setShowLossFlash(true);
    setShowWinModal(false); // Ensure win modal is off

    // Clear any existing timeout
    if (lossTimeoutRef.current) {
      clearTimeout(lossTimeoutRef.current);
    }

    // Auto-dismiss after 1 second
    lossTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setShowLossFlash(false);
        setResult(null);
      }
    }, 1000);
  }, []);

  /**
   * Dismiss the win modal
   */
  const dismissWin = useCallback(() => {
    setShowWinModal(false);
    setResult(null);
  }, []);

  /**
   * Dismiss the loss flash
   * Can be called manually or auto-called after timeout
   */
  const dismissLoss = useCallback(() => {
    setShowLossFlash(false);
    // Clear the timeout if manually dismissed
    if (lossTimeoutRef.current) {
      clearTimeout(lossTimeoutRef.current);
      lossTimeoutRef.current = null;
    }
    // Note: We don't clear result here in case it's still needed
    // The result will be cleared when next feedback is triggered
  }, []);

  return {
    showWinModal,
    showLossFlash,
    result,
    triggerWin,
    triggerLoss,
    dismissWin,
    dismissLoss,
  };
}
