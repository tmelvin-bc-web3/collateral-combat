'use client';

import { useState, useEffect, useRef } from 'react';
import CountUp from 'react-countup';

interface CountingNumberProps {
  /** The target value to animate to */
  value: number;
  /** Number of decimal places to display */
  decimals?: number;
  /** Text to display after the number */
  suffix?: string;
  /** Text to display before the number */
  prefix?: string;
  /** Animation duration in seconds */
  duration?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * CountingNumber - Animated number display with smooth count-up transitions
 *
 * Uses react-countup for smooth number animations when values change.
 * Animates from previous value to new value in ~400ms by default.
 *
 * Features:
 * - Smooth count-up animation between value changes
 * - Preserves decimal precision
 * - Supports prefix/suffix for formatting (e.g., "+", " SOL")
 * - Configurable animation duration
 *
 * @example
 * <CountingNumber value={1.25} prefix="+" suffix=" SOL" className="text-success" />
 */
export function CountingNumber({
  value,
  decimals = 2,
  suffix = '',
  prefix = '',
  duration = 0.4,
  className,
}: CountingNumberProps) {
  const [prevValue, setPrevValue] = useState(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Update prevValue after animation completes
    const timer = setTimeout(() => {
      setPrevValue(value);
    }, duration * 1000);
    return () => clearTimeout(timer);
  }, [value, duration]);

  return (
    <CountUp
      start={isFirstRender.current ? value : prevValue}
      end={value}
      duration={duration}
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      preserveValue
      className={className}
    />
  );
}
