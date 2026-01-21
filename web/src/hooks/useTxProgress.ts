'use client';

import { useState, useCallback, useRef } from 'react';
import type { TxStatus } from '@/components/TxProgress';

/**
 * Hook for managing transaction progress state.
 * Provides status tracking and helper methods for common transitions.
 */
export function useTxProgress() {
  const [status, setStatus] = useState<TxStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending timeout
  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Reset to idle state
  const reset = useCallback(() => {
    clearPendingTimeout();
    setStatus('idle');
    setErrorMessage(undefined);
  }, [clearPendingTimeout]);

  // Start signing phase
  const startSigning = useCallback(() => {
    clearPendingTimeout();
    setStatus('signing');
    setErrorMessage(undefined);
  }, [clearPendingTimeout]);

  // Start sending phase
  const startSending = useCallback(() => {
    clearPendingTimeout();
    setStatus('sending');
    setErrorMessage(undefined);
  }, [clearPendingTimeout]);

  // Start confirming phase
  const startConfirming = useCallback(() => {
    clearPendingTimeout();
    setStatus('confirming');
    setErrorMessage(undefined);
  }, [clearPendingTimeout]);

  // Complete successfully - auto-resets to idle after 2 seconds
  const complete = useCallback(() => {
    clearPendingTimeout();
    setStatus('success');
    setErrorMessage(undefined);

    timeoutRef.current = setTimeout(() => {
      setStatus('idle');
    }, 2000);
  }, [clearPendingTimeout]);

  // Set error state
  const fail = useCallback((error?: string) => {
    clearPendingTimeout();
    setStatus('error');
    setErrorMessage(error);
  }, [clearPendingTimeout]);

  // Check if transaction is actively in progress
  const isActive = status !== 'idle' && status !== 'success' && status !== 'error';

  return {
    status,
    errorMessage,
    setStatus,
    isActive,
    startSigning,
    startSending,
    startConfirming,
    complete,
    fail,
    reset,
  };
}
