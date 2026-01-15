'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Debounce a value - delays updating until after wait time
 * Good for search inputs
 */
export function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing timeout when value changes
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  timeoutRef.current = setTimeout(() => {
    setDebouncedValue(value);
  }, delay);

  return debouncedValue;
}

/**
 * Debounce a callback function
 * Prevents rapid execution - only executes after delay with no new calls
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Throttle a callback function
 * Executes immediately, then prevents re-execution until delay passes
 * Best for button clicks and actions
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): [(...args: Parameters<T>) => void, boolean] {
  const [isThrottled, setIsThrottled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (isThrottled) return;

      callback(...args);
      setIsThrottled(true);

      timeoutRef.current = setTimeout(() => {
        setIsThrottled(false);
      }, delay);
    },
    [callback, delay, isThrottled]
  );

  return [throttledCallback, isThrottled];
}

/**
 * Rate-limited action hook
 * Combines loading state with throttling for button protection
 *
 * Usage:
 * const { execute, isLoading, isThrottled } = useRateLimitedAction(async () => {
 *   await placeBet();
 * }, 1000);
 *
 * <button onClick={execute} disabled={isLoading || isThrottled}>
 */
export function useRateLimitedAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  cooldownMs: number = 1000
): {
  execute: (...args: Parameters<T>) => Promise<void>;
  isLoading: boolean;
  isThrottled: boolean;
  canExecute: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [isThrottled, setIsThrottled] = useState(false);
  const lastExecutionRef = useRef<number>(0);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      const now = Date.now();

      // Check throttle
      if (now - lastExecutionRef.current < cooldownMs) {
        setIsThrottled(true);
        setTimeout(() => setIsThrottled(false), cooldownMs - (now - lastExecutionRef.current));
        return;
      }

      // Prevent double execution while loading
      if (isLoading) return;

      lastExecutionRef.current = now;
      setIsLoading(true);
      setIsThrottled(true);

      try {
        await action(...args);
      } finally {
        setIsLoading(false);
        // Keep throttled for the cooldown period
        setTimeout(() => setIsThrottled(false), cooldownMs);
      }
    },
    [action, cooldownMs, isLoading]
  );

  return {
    execute,
    isLoading,
    isThrottled,
    canExecute: !isLoading && !isThrottled,
  };
}
