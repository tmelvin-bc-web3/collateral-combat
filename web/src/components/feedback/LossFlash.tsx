'use client';

import { useEffect, useRef } from 'react';

interface LossFlashProps {
  /** Whether the loss flash is currently active */
  isActive: boolean;
  /** Callback when the flash animation completes */
  onComplete: () => void;
}

/**
 * LossFlash - Minimal loss indicator component
 *
 * Features:
 * - NO modal (per CONTEXT.md: "let them move on")
 * - Renders nothing visible - parent component applies the flash styling
 * - Self-dismisses after 1 second animation
 * - Just triggers the completion callback
 *
 * Usage: Parent component should conditionally apply text-danger + animate-pulse
 * to the balance display when isActive is true.
 *
 * @example
 * <LossFlash isActive={showLossFlash} onComplete={dismissLoss} />
 * <span className={showLossFlash ? 'text-danger animate-pulse' : ''}>
 *   {balance} SOL
 * </span>
 */
export function LossFlash({ isActive, onComplete }: LossFlashProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isActive) {
      // Auto-dismiss after 1 second (flash duration)
      timerRef.current = setTimeout(() => {
        onComplete();
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, onComplete]);

  // This component renders nothing - it's just a timer
  // The visual flash effect is applied by the parent component
  // based on the isActive prop
  return null;
}
