'use client';

import { cn } from '@/lib/utils';

export type DrTier =
  | 'liquidated'
  | 'paper_hands'
  | 'retail'
  | 'degen'
  | 'whale'
  | 'market_maker'
  | 'oracle'
  | 'apex_contender'
  | 'apex_predator'
  | 'apex_elite'
  | 'the_apex';

// Keep legacy type for backward compatibility during migration
export type EloTier = DrTier;

interface DRTierBadgeProps {
  tier: DrTier;
  division?: number;
  dr?: number;
  size?: 'sm' | 'md' | 'lg';
  showDr?: boolean;
  rank?: number;
  className?: string;
}

const tierColors: Record<DrTier, { bg: string; text: string; border: string; glow: string }> = {
  liquidated: {
    bg: 'bg-red-900/20',
    text: 'text-red-500',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
  },
  paper_hands: {
    bg: 'bg-stone-500/20',
    text: 'text-stone-400',
    border: 'border-stone-400/30',
    glow: 'shadow-stone-400/20',
  },
  retail: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-600',
    border: 'border-amber-600/30',
    glow: 'shadow-amber-600/20',
  },
  degen: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-400/30',
    glow: 'shadow-green-400/20',
  },
  whale: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-400/30',
    glow: 'shadow-blue-400/20',
  },
  market_maker: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-400/30',
    glow: 'shadow-purple-400/20',
  },
  oracle: {
    bg: 'bg-yellow-400/20',
    text: 'text-yellow-400',
    border: 'border-yellow-400/30',
    glow: 'shadow-yellow-400/20',
  },
  apex_contender: {
    bg: 'bg-cyan-400/20',
    text: 'text-cyan-300',
    border: 'border-cyan-300/30',
    glow: 'shadow-cyan-300/20',
  },
  apex_predator: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-400/30',
    glow: 'shadow-orange-400/20',
  },
  apex_elite: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-400/30',
    glow: 'shadow-pink-400/20',
  },
  the_apex: {
    bg: 'bg-gradient-to-r from-yellow-500/20 to-red-500/20',
    text: 'text-yellow-300',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-400/30',
  },
};

const tierDisplayNames: Record<DrTier, string> = {
  liquidated: 'Liquidated',
  paper_hands: 'Paper Hands',
  retail: 'Retail',
  degen: 'Degen',
  whale: 'Whale',
  market_maker: 'Market Maker',
  oracle: 'Oracle',
  apex_contender: 'Apex Contender',
  apex_predator: 'Apex Predator',
  apex_elite: 'Apex Elite',
  the_apex: 'The Apex',
};

const divisionLabels: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
};

const isApexTier = (tier: DrTier) =>
  tier === 'apex_contender' || tier === 'apex_predator' || tier === 'apex_elite' || tier === 'the_apex';

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

export function DRTierBadge({ tier, division, dr, size = 'md', showDr = false, rank, className }: DRTierBadgeProps) {
  const colors = tierColors[tier] || tierColors.retail;
  const displayName = tierDisplayNames[tier] || tier;
  const apex = isApexTier(tier);

  let label = displayName;
  if (!apex && division && division >= 1 && division <= 4) {
    label = `${displayName} ${divisionLabels[division]}`;
  }
  if (tier === 'the_apex' && rank) {
    label = `The Apex #${rank}`;
  } else if (apex && rank) {
    label = `${displayName} #${rank}`;
  }

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
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
      </svg>

      <span>{label}</span>

      {showDr && dr !== undefined && (
        <span className="opacity-70 font-mono text-[0.9em]">{dr}</span>
      )}
    </div>
  );
}

// Legacy export name for backward compatibility
export const EloTierBadge = DRTierBadge;
