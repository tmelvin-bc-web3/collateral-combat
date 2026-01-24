'use client';

import { cn } from '@/lib/utils';

export type EloTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'protected';

interface EloTierBadgeProps {
  tier: EloTier;
  elo?: number;
  size?: 'sm' | 'md' | 'lg';
  showElo?: boolean;
  className?: string;
}

// Use tier colors from existing opengraph-image.tsx
const tierColors: Record<EloTier, { bg: string; text: string; border: string; glow: string }> = {
  bronze: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-600',
    border: 'border-amber-600/30',
    glow: 'shadow-amber-600/20'
  },
  silver: {
    bg: 'bg-slate-300/20',
    text: 'text-slate-300',
    border: 'border-slate-300/30',
    glow: 'shadow-slate-300/20'
  },
  gold: {
    bg: 'bg-yellow-400/20',
    text: 'text-yellow-400',
    border: 'border-yellow-400/30',
    glow: 'shadow-yellow-400/20'
  },
  platinum: {
    bg: 'bg-cyan-200/20',
    text: 'text-cyan-200',
    border: 'border-cyan-200/30',
    glow: 'shadow-cyan-200/20'
  },
  diamond: {
    bg: 'bg-sky-300/20',
    text: 'text-sky-300',
    border: 'border-sky-300/30',
    glow: 'shadow-sky-300/20'
  },
  protected: {
    bg: 'bg-stone-500/20',
    text: 'text-stone-400',
    border: 'border-stone-400/30',
    glow: 'shadow-stone-400/20'
  },
};

// Size classes
const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function EloTierBadge({ tier, elo, size = 'md', showElo = false, className }: EloTierBadgeProps) {
  const colors = tierColors[tier];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider',
        colors.bg,
        colors.text,
        colors.border,
        `shadow-lg ${colors.glow}`,
        sizeClasses[size],
        className
      )}
    >
      {/* Tier icon - diamond shape for all tiers */}
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
      </svg>

      <span>{tier === 'protected' ? 'NEW' : tier.toUpperCase()}</span>

      {showElo && elo !== undefined && (
        <span className="opacity-70 font-mono text-[0.9em]">{elo}</span>
      )}
    </div>
  );
}
