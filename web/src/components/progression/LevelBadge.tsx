'use client';

import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  title?: string;
  className?: string;
}

// Get color scheme based on level tier
function getLevelColors(level: number): {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  glow: string;
  stars: number;
} {
  if (level >= 76) {
    // Mythic (76-100) - Purple/violet with glow
    return {
      primary: '#8B5CF6',
      secondary: '#6D28D9',
      accent: '#C4B5FD',
      text: '#F5F3FF',
      glow: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))',
      stars: 3,
    };
  } else if (level >= 51) {
    // Legend (51-75) - Gold/amber
    return {
      primary: '#F59E0B',
      secondary: '#D97706',
      accent: '#FCD34D',
      text: '#FFFBEB',
      glow: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))',
      stars: 2,
    };
  } else if (level >= 36) {
    // Champion (36-50) - Cyan/teal
    return {
      primary: '#06B6D4',
      secondary: '#0891B2',
      accent: '#67E8F9',
      text: '#ECFEFF',
      glow: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))',
      stars: 1,
    };
  } else if (level >= 21) {
    // Veteran (21-35) - Red/crimson
    return {
      primary: '#EF4444',
      secondary: '#DC2626',
      accent: '#FCA5A5',
      text: '#FEF2F2',
      glow: '',
      stars: 0,
    };
  } else if (level >= 11) {
    // Warrior (11-20) - Blue
    return {
      primary: '#3B82F6',
      secondary: '#2563EB',
      accent: '#93C5FD',
      text: '#EFF6FF',
      glow: '',
      stars: 0,
    };
  } else if (level >= 6) {
    // Contender (6-10) - Green
    return {
      primary: '#22C55E',
      secondary: '#16A34A',
      accent: '#86EFAC',
      text: '#F0FDF4',
      glow: '',
      stars: 0,
    };
  } else {
    // Rookie (1-5) - Gray/bronze
    return {
      primary: '#78716C',
      secondary: '#57534E',
      accent: '#A8A29E',
      text: '#FAFAF9',
      glow: '',
      stars: 0,
    };
  }
}

export function LevelBadge({ level, size = 'md', showTitle = false, title, className }: LevelBadgeProps) {
  const colors = getLevelColors(level);

  const sizeConfig = {
    xs: { width: 24, height: 28, fontSize: 9, titleSize: 'text-[10px]' },
    sm: { width: 32, height: 38, fontSize: 11, titleSize: 'text-xs' },
    md: { width: 40, height: 48, fontSize: 14, titleSize: 'text-sm' },
    lg: { width: 56, height: 67, fontSize: 20, titleSize: 'text-base' },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'relative flex-shrink-0',
          level >= 76 && 'animate-pulse'
        )}
        style={{ filter: colors.glow }}
      >
        <svg
          width={config.width}
          height={config.height}
          viewBox="0 0 40 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield shape */}
          <defs>
            <linearGradient id={`shieldGrad-${level}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
            <linearGradient id={`innerGrad-${level}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.secondary} />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Outer shield border */}
          <path
            d="M20 2L36 8V22C36 32 28 42 20 46C12 42 4 32 4 22V8L20 2Z"
            fill={`url(#shieldGrad-${level})`}
            stroke={colors.accent}
            strokeWidth="1.5"
          />

          {/* Inner shield area */}
          <path
            d="M20 6L32 10.5V22C32 30 25.5 38 20 41.5C14.5 38 8 30 8 22V10.5L20 6Z"
            fill={`url(#innerGrad-${level})`}
          />

          {/* Top decoration - pointed crown element */}
          <path
            d="M20 0L23 4H17L20 0Z"
            fill={colors.accent}
          />

          {/* Side notches for higher tiers */}
          {level >= 21 && (
            <>
              <path d="M4 14L2 16V20L4 18V14Z" fill={colors.accent} />
              <path d="M36 14L38 16V20L36 18V14Z" fill={colors.accent} />
            </>
          )}

          {/* Stars for top tiers */}
          {colors.stars >= 1 && (
            <circle cx="20" cy="10" r="1.5" fill={colors.accent} />
          )}
          {colors.stars >= 2 && (
            <>
              <circle cx="15" cy="11" r="1" fill={colors.accent} />
              <circle cx="25" cy="11" r="1" fill={colors.accent} />
            </>
          )}
          {colors.stars >= 3 && (
            <>
              <circle cx="12" cy="13" r="0.8" fill={colors.accent} />
              <circle cx="28" cy="13" r="0.8" fill={colors.accent} />
            </>
          )}

          {/* Level number */}
          <text
            x="20"
            y="28"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colors.text}
            fontSize={config.fontSize}
            fontWeight="bold"
            fontFamily="Impact, sans-serif"
            style={{ letterSpacing: '-0.5px' }}
          >
            {level}
          </text>

          {/* Bottom banner/ribbon effect */}
          <path
            d="M10 38L8 42L12 40H28L32 42L30 38"
            fill={colors.primary}
            stroke={colors.accent}
            strokeWidth="0.5"
          />
        </svg>
      </div>
      {showTitle && title && (
        <span className={cn('font-medium', config.titleSize)} style={{ color: colors.primary }}>
          {title}
        </span>
      )}
    </div>
  );
}
