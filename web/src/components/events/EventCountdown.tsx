'use client';

import { useState, useEffect } from 'react';

interface EventCountdownProps {
  targetTime: number;  // Absolute UTC timestamp
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function EventCountdown({ targetTime, onComplete, size = 'md' }: EventCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState(() => Math.max(0, targetTime - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, targetTime - Date.now());
      setTimeRemaining(remaining);
      if (remaining === 0) {
        onComplete?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onComplete]);

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-lg gap-2',
    lg: 'text-2xl gap-3'
  };

  if (timeRemaining === 0) {
    return <span className="text-warning font-bold">LIVE NOW</span>;
  }

  return (
    <div className={`flex items-center font-mono ${sizeClasses[size]}`}>
      {days > 0 && <TimeUnit value={days} label="D" />}
      <TimeUnit value={hours} label="H" />
      <TimeUnit value={minutes} label="M" />
      <TimeUnit value={seconds} label="S" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center">
      <span className="bg-black/60 border border-white/10 px-2 py-1 rounded">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-white/50 text-xs ml-0.5">{label}</span>
    </div>
  );
}
