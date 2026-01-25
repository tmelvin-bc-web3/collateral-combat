'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DeltaBadgeProps {
  /** The change amount (positive or negative) */
  delta: number;
  /** Number of decimal places to display */
  decimals?: number;
  /** Text to display after the number */
  suffix?: string;
  /** How long the badge stays visible (ms) */
  duration?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * DeltaBadge - Brief +/- change indicator badge
 *
 * Shows a temporary badge when a value changes, displaying the delta
 * in green (positive) or red (negative). Fades out after duration.
 *
 * Features:
 * - Auto-fades after 2 seconds by default
 * - Green for positive, red for negative
 * - Shows + prefix for positive values
 * - Supports custom suffix (default " SOL")
 *
 * @example
 * <DeltaBadge delta={0.05} suffix=" SOL" />
 * // Shows "+0.05 SOL" in green, fades after 2s
 */
export function DeltaBadge({
  delta,
  decimals = 2,
  suffix = ' SOL',
  duration = 2000,
  className,
}: DeltaBadgeProps) {
  const [visible, setVisible] = useState(delta !== 0);

  useEffect(() => {
    if (delta !== 0) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [delta, duration]);

  if (!visible || delta === 0) return null;

  const isPositive = delta > 0;

  return (
    <span
      className={cn(
        'text-xs font-bold animate-fadeIn',
        isPositive ? 'text-success' : 'text-danger',
        className
      )}
    >
      {isPositive ? '+' : ''}
      {delta.toFixed(decimals)}
      {suffix}
    </span>
  );
}
