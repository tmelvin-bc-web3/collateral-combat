'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface UrgentTimerProps {
  /** Unix timestamp in milliseconds when timer ends */
  endTime: number;
  /** Additional CSS class names */
  className?: string;
  /** Callback when timer reaches zero */
  onComplete?: () => void;
}

/**
 * UrgentTimer - Timer with progressive urgency colors
 *
 * Displays countdown with progressive visual urgency based on time remaining:
 * - Normal (>1min): default text color
 * - Warning (30s-1min): yellow/warning color
 * - Danger (<30s): red color
 * - Critical (<10s): red + pulse animation
 *
 * Per CONTEXT.md requirements for POL-06, POL-07.
 *
 * Features:
 * - 100ms update interval for smooth countdown
 * - Progressive color changes at thresholds
 * - Pulse animation in final 10 seconds
 * - onComplete callback when timer hits zero
 * - Monospace font for stable digit width
 *
 * @example
 * <UrgentTimer
 *   endTime={Date.now() + 300000} // 5 minutes from now
 *   onComplete={() => console.log('Battle ended')}
 * />
 */
export function UrgentTimer({
  endTime,
  className,
  onComplete,
}: UrgentTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && onComplete) {
        onComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100); // 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [endTime, onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // Progressive urgency colors per CONTEXT.md
  const colorClass =
    secondsLeft > 60
      ? 'text-text-primary' // Normal: >1 min
      : secondsLeft > 30
        ? 'text-warning' // Warning: 30s-1min (yellow)
        : 'text-danger'; // Danger: <30s (red)

  const shouldPulse = secondsLeft <= 10 && secondsLeft > 0;

  return (
    <div
      className={cn(
        'text-2xl font-mono font-bold tabular-nums',
        colorClass,
        shouldPulse && 'animate-pulse',
        className
      )}
    >
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
