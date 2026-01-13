'use client';

import { useState, useCallback, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'degendome_haptic_enabled';

// Haptic pattern presets (duration in milliseconds)
export const HAPTIC_PATTERNS = {
  // Light feedback for UI interactions
  light: [10],
  // Medium feedback for confirmations
  medium: [25],
  // Strong feedback for important events
  strong: [50],
  // Double tap pattern for button clicks
  tap: [10, 50, 10],
  // Success pattern for wins/achievements
  success: [30, 50, 30, 50, 50],
  // Error pattern for losses/failures
  error: [100, 50, 100],
  // Notification pattern for alerts
  notification: [50, 100, 50],
  // Countdown tick
  tick: [5],
  // Level up celebration
  levelUp: [50, 100, 50, 100, 100, 100, 150],
  // Achievement unlocked
  achievement: [30, 50, 30, 100, 100],
  // Bet placed confirmation
  betPlaced: [20, 30, 40],
  // Round locked
  lock: [75, 50, 75],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

export interface UseHapticReturn {
  isEnabled: boolean;
  isSupported: boolean;
  toggleHaptic: () => void;
  setEnabled: (enabled: boolean) => void;
  vibrate: (pattern: HapticPattern | number | number[]) => void;
  // Convenience methods
  light: () => void;
  medium: () => void;
  strong: () => void;
  tap: () => void;
  success: () => void;
  error: () => void;
  notification: () => void;
  tick: () => void;
  levelUp: () => void;
  achievement: () => void;
  betPlaced: () => void;
  lock: () => void;
}

export function useHaptic(): UseHapticReturn {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  // Check support and load preference on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if vibration API is supported
    const supported = 'vibrate' in navigator;
    setIsSupported(supported);

    // Load preference from localStorage
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored !== null) {
      setIsEnabled(stored === 'true');
    }
  }, []);

  // Persist preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, String(isEnabled));
  }, [isEnabled]);

  const toggleHaptic = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  const vibrate = useCallback(
    (pattern: HapticPattern | number | number[]) => {
      if (!isEnabled || !isSupported) return;

      try {
        let vibrationPattern: number | number[];

        if (typeof pattern === 'string') {
          // Use preset pattern
          vibrationPattern = [...HAPTIC_PATTERNS[pattern]];
        } else {
          vibrationPattern = pattern;
        }

        navigator.vibrate(vibrationPattern);
      } catch {
        // Silently handle any vibration errors
      }
    },
    [isEnabled, isSupported]
  );

  // Convenience methods for common patterns
  const light = useCallback(() => vibrate('light'), [vibrate]);
  const medium = useCallback(() => vibrate('medium'), [vibrate]);
  const strong = useCallback(() => vibrate('strong'), [vibrate]);
  const tap = useCallback(() => vibrate('tap'), [vibrate]);
  const success = useCallback(() => vibrate('success'), [vibrate]);
  const error = useCallback(() => vibrate('error'), [vibrate]);
  const notification = useCallback(() => vibrate('notification'), [vibrate]);
  const tick = useCallback(() => vibrate('tick'), [vibrate]);
  const levelUp = useCallback(() => vibrate('levelUp'), [vibrate]);
  const achievement = useCallback(() => vibrate('achievement'), [vibrate]);
  const betPlaced = useCallback(() => vibrate('betPlaced'), [vibrate]);
  const lock = useCallback(() => vibrate('lock'), [vibrate]);

  return {
    isEnabled,
    isSupported,
    toggleHaptic,
    setEnabled,
    vibrate,
    // Convenience methods
    light,
    medium,
    strong,
    tap,
    success,
    error,
    notification,
    tick,
    levelUp,
    achievement,
    betPlaced,
    lock,
  };
}
