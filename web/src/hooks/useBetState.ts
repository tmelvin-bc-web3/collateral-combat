'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Bet flow states for the state machine
 * - idle: No bet in progress, user can select amount
 * - amount_selected: User has selected a bet amount, waiting for swipe
 * - confirming: User swiped to bet, showing confirmation overlay
 * - placing: Bet is being placed via socket
 * - success: Bet was placed successfully
 * - error: Bet placement failed
 */
export type BetFlowState = 'idle' | 'amount_selected' | 'confirming' | 'placing' | 'success' | 'error';

interface UseBetStateOptions {
  battleId: string;
  walletAddress?: string;
  /** Whether this is a first-time user (defaults to 0.05 SOL instead of 0.1) */
  isFirstBetUser?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface PendingBet {
  amount: number;
  fighter: string;
  fighterWallet: string;
}

interface UseBetStateReturn {
  state: BetFlowState;
  selectedAmount: number;
  pendingBet: PendingBet | null;
  error: string | null;

  // Actions
  selectAmount: (amount: number) => void;
  initiateSwipeBet: (fighter: 'fighter1' | 'fighter2', fighterWallet: string, fighterName: string) => void;
  confirmBet: () => Promise<void>;
  cancelBet: () => void;
  reset: () => void;
}

// Default amount for returning users (middle of preset range)
const DEFAULT_AMOUNT = 0.1;
// Default amount for first-time users (ONB-04: 0.05 SOL)
const FIRST_BET_DEFAULT_AMOUNT = 0.05;

/**
 * State machine hook for managing bet flow in QuickBetStripV2
 *
 * State transitions:
 * - idle -> amount_selected: when user taps an amount
 * - amount_selected -> confirming: when user swipes left/right
 * - confirming -> placing: when user taps confirm
 * - placing -> success/error: after socket response
 * - success/error -> idle: after 2s timeout or user tap
 *
 * @example
 * const {
 *   state,
 *   selectedAmount,
 *   pendingBet,
 *   selectAmount,
 *   initiateSwipeBet,
 *   confirmBet,
 *   cancelBet,
 *   reset
 * } = useBetState({ battleId: 'abc123', walletAddress: publicKey });
 */
export function useBetState({
  battleId,
  walletAddress,
  isFirstBetUser = false,
  onSuccess,
  onError,
}: UseBetStateOptions): UseBetStateReturn {
  // First-time users get 0.05 SOL default, returning users get 0.1 SOL
  const initialAmount = isFirstBetUser ? FIRST_BET_DEFAULT_AMOUNT : DEFAULT_AMOUNT;
  const [state, setState] = useState<BetFlowState>('idle');
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [pendingBet, setPendingBet] = useState<PendingBet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  // Refs for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-reset from success/error state after 2 seconds
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setState('idle');
          setPendingBet(null);
          if (state === 'error') {
            setError(null);
          }
        }
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state]);

  /**
   * Select a bet amount
   * Transitions: idle -> amount_selected
   */
  const selectAmount = useCallback((amount: number) => {
    setSelectedAmount(amount);
    setState('amount_selected');
    setError(null);
  }, []);

  /**
   * Initiate a bet after swipe gesture
   * Transitions: amount_selected -> confirming
   */
  const initiateSwipeBet = useCallback(
    (fighter: 'fighter1' | 'fighter2', fighterWallet: string, fighterName: string) => {
      if (!walletAddress) {
        setError('Connect wallet to bet');
        setState('error');
        return;
      }

      if (selectedAmount <= 0) {
        setError('Select a bet amount');
        setState('error');
        return;
      }

      setPendingBet({
        amount: selectedAmount,
        fighter: fighterName,
        fighterWallet,
      });
      setState('confirming');
      setError(null);
    },
    [walletAddress, selectedAmount]
  );

  /**
   * Confirm and place the pending bet
   * Transitions: confirming -> placing -> success/error
   */
  const confirmBet = useCallback(async () => {
    if (!pendingBet || !walletAddress) {
      setError('No bet to confirm');
      setState('error');
      return;
    }

    setState('placing');
    setError(null);

    try {
      const socket = getSocket(token);

      // Create a promise that resolves on bet_placed or rejects on error
      const placeBetPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Bet placement timed out'));
        }, 10000);

        // Listen for bet result
        const handleBetPlaced = () => {
          clearTimeout(timeoutId);
          socket.off('bet_placed', handleBetPlaced);
          socket.off('error', handleError);
          resolve();
        };

        const handleError = (message: string) => {
          clearTimeout(timeoutId);
          socket.off('bet_placed', handleBetPlaced);
          socket.off('error', handleError);
          reject(new Error(message));
        };

        socket.on('bet_placed', handleBetPlaced);
        socket.on('error', handleError);

        // Emit place_bet event
        // Format: (battleId, backedPlayer, amount, walletAddress)
        socket.emit(
          'place_bet',
          battleId,
          pendingBet.fighterWallet,
          pendingBet.amount,
          walletAddress
        );
      });

      await placeBetPromise;

      if (mountedRef.current) {
        setState('success');
        onSuccess?.();
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to place bet';
        setError(errorMessage);
        setState('error');
        onError?.(errorMessage);
      }
    }
  }, [pendingBet, walletAddress, battleId, token, onSuccess, onError]);

  /**
   * Cancel the pending bet
   * Transitions: confirming -> idle
   */
  const cancelBet = useCallback(() => {
    setPendingBet(null);
    setError(null);
    // Go back to amount_selected (keep the selected amount)
    setState('amount_selected');
  }, []);

  /**
   * Reset the entire state machine
   * Transitions: any -> idle
   */
  const reset = useCallback(() => {
    setState('idle');
    setSelectedAmount(initialAmount);
    setPendingBet(null);
    setError(null);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [initialAmount]);

  return {
    state,
    selectedAmount,
    pendingBet,
    error,
    selectAmount,
    initiateSwipeBet,
    confirmBet,
    cancelBet,
    reset,
  };
}
