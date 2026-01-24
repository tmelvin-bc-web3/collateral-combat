'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownTimerProps {
  targetTime: number; // timestamp in milliseconds
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function CountdownTimer({
  targetTime,
  onComplete,
  size = 'md',
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);

  const calculateTimeRemaining = useCallback(() => {
    const now = Date.now();
    const diff = targetTime - now;
    return Math.max(0, diff);
  }, [targetTime]);

  useEffect(() => {
    // Initial calculation
    const initial = calculateTimeRemaining();
    setTimeRemaining(initial);
    setIsComplete(initial <= 0);

    if (initial <= 0) {
      onComplete?.();
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onComplete, calculateTimeRemaining]);

  // Format the time display
  const formatTime = (ms: number): string => {
    if (ms <= 0) return 'LIVE';

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      // Format: "2h 15m"
      return `${hours}h ${minutes}m`;
    }

    // Format: "15:23" for less than 1 hour
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Size-based classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-lg px-4 py-2 font-bold',
  };

  // Urgency states
  const isUrgent = timeRemaining > 0 && timeRemaining < 5 * 60 * 1000; // < 5 minutes
  const isCritical = timeRemaining > 0 && timeRemaining < 60 * 1000; // < 1 minute

  if (isComplete) {
    return (
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full font-mono
          bg-danger/20 text-danger border border-danger/30
          ${sizeClasses[size]}
        `}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
        </span>
        LIVE
      </span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center rounded font-mono
        ${sizeClasses[size]}
        ${isCritical
          ? 'bg-danger/20 text-danger border border-danger/30 animate-pulse'
          : isUrgent
          ? 'bg-fire/20 text-fire border border-fire/30'
          : 'bg-white/10 text-white/80 border border-white/10'
        }
      `}
    >
      {formatTime(timeRemaining)}
    </span>
  );
}
