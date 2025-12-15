'use client';

import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  title?: string;
  className?: string;
}

// Get color scheme based on level tier
function getLevelColors(level: number): { bg: string; border: string; text: string; glow: string } {
  if (level >= 76) {
    // Mythic (76-100) - Purple/violet with glow
    return {
      bg: 'bg-gradient-to-br from-violet-600 to-purple-800',
      border: 'border-violet-400',
      text: 'text-violet-100',
      glow: 'shadow-lg shadow-violet-500/50',
    };
  } else if (level >= 51) {
    // Legend (51-75) - Gold/amber
    return {
      bg: 'bg-gradient-to-br from-amber-500 to-yellow-600',
      border: 'border-amber-300',
      text: 'text-amber-100',
      glow: 'shadow-lg shadow-amber-500/40',
    };
  } else if (level >= 36) {
    // Champion (36-50) - Cyan/teal
    return {
      bg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
      border: 'border-cyan-300',
      text: 'text-cyan-100',
      glow: 'shadow-md shadow-cyan-500/30',
    };
  } else if (level >= 21) {
    // Veteran (21-35) - Red/crimson
    return {
      bg: 'bg-gradient-to-br from-red-500 to-rose-700',
      border: 'border-red-400',
      text: 'text-red-100',
      glow: '',
    };
  } else if (level >= 11) {
    // Warrior (11-20) - Blue
    return {
      bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      border: 'border-blue-400',
      text: 'text-blue-100',
      glow: '',
    };
  } else if (level >= 6) {
    // Contender (6-10) - Green
    return {
      bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      border: 'border-green-400',
      text: 'text-green-100',
      glow: '',
    };
  } else {
    // Rookie (1-5) - Gray
    return {
      bg: 'bg-gradient-to-br from-gray-500 to-slate-600',
      border: 'border-gray-400',
      text: 'text-gray-100',
      glow: '',
    };
  }
}

export function LevelBadge({ level, size = 'md', showTitle = false, title, className }: LevelBadgeProps) {
  const colors = getLevelColors(level);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold border-2',
          sizeClasses[size],
          colors.bg,
          colors.border,
          colors.text,
          colors.glow,
          level >= 76 && 'animate-pulse'
        )}
      >
        {level}
      </div>
      {showTitle && title && (
        <span className={cn('font-medium', colors.text, size === 'sm' && 'text-xs', size === 'lg' && 'text-lg')}>
          {title}
        </span>
      )}
    </div>
  );
}
