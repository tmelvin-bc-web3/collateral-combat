'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFirstBet } from '@/hooks/useFirstBet';

/**
 * First bet context value type
 */
interface FirstBetContextValue {
  /** True if user has ever placed a bet (or unknown state) */
  hasPlacedFirstBet: boolean;
  /** True when we should show the first bet celebration */
  showCelebration: boolean;
  /** True if connected user has NOT placed their first bet yet */
  isFirstBetUser: boolean;
  /** True once localStorage check is complete */
  initialized: boolean;
  /** Call on successful bet to record first bet and trigger celebration */
  recordFirstBet: () => void;
  /** Call after showing celebration to reset celebration state */
  dismissCelebration: () => void;
}

// Create context with default values
const FirstBetContext = createContext<FirstBetContextValue | null>(null);

/**
 * Provider component for first bet state
 *
 * Wrap your app with this provider to make first bet state
 * available throughout the application.
 *
 * Should be placed AFTER WalletProvider in the provider chain.
 *
 * @example
 * <WalletProvider>
 *   <FirstBetProvider>
 *     <App />
 *   </FirstBetProvider>
 * </WalletProvider>
 */
export function FirstBetProvider({ children }: { children: ReactNode }) {
  const firstBetState = useFirstBet();

  return (
    <FirstBetContext.Provider value={firstBetState}>
      {children}
    </FirstBetContext.Provider>
  );
}

// Default values for when context is not available (graceful fallback)
const defaultContextValue: FirstBetContextValue = {
  hasPlacedFirstBet: true,
  showCelebration: false,
  isFirstBetUser: false,
  initialized: false,
  recordFirstBet: () => {},
  dismissCelebration: () => {},
};

/**
 * Hook to consume first bet context
 *
 * Returns default values if used outside of FirstBetProvider (graceful degradation).
 */
export function useFirstBetContext(): FirstBetContextValue {
  const context = useContext(FirstBetContext);

  if (!context) {
    return defaultContextValue;
  }

  return context;
}
