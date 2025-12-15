'use client';

import { cn } from '@/lib/utils';

interface XpProgressBarProps {
  currentXp: number;
  xpToNextLevel: number;
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function XpProgressBar({
  currentXp,
  xpToNextLevel,
  progress,
  size = 'md',
  showLabel = true,
  className,
}: XpProgressBarProps) {
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{currentXp.toLocaleString()} XP</span>
          <span>{xpToNextLevel.toLocaleString()} to next level</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-gray-700 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
