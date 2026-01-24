'use client';

import { Eye, Zap, Users } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import type { Battle } from '@/types/fightcard';

interface BattleCardProps {
  battle: Battle;
  variant?: 'compact' | 'featured' | 'hero';
  onClick?: () => void;
}

export function BattleCard({
  battle,
  variant = 'compact',
  onClick,
}: BattleCardProps) {
  const { fighter1, fighter2, stakes, leverage, status, startTime, spectatorCount, asset } = battle;

  // Variant-specific classes
  const variantClasses = {
    compact: 'p-3 min-w-[280px]',
    featured: 'p-5',
    hero: 'p-6 md:p-8',
  };

  const avatarSizes = {
    compact: 'w-10 h-10',
    featured: 'w-14 h-14',
    hero: 'w-20 h-20 md:w-24 md:h-24',
  };

  const nameSizes = {
    compact: 'text-xs',
    featured: 'text-sm',
    hero: 'text-base md:text-lg',
  };

  const vsSizes = {
    compact: 'text-xs',
    featured: 'text-sm font-bold',
    hero: 'text-lg md:text-xl font-black',
  };

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(/[\s.]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Fighter avatar component
  const FighterAvatar = ({ fighter, side }: { fighter: typeof fighter1 | null; side: 'left' | 'right' }) => {
    if (!fighter) {
      return (
        <div className={`${avatarSizes[variant]} rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center`}>
          <span className="text-white/40 text-lg">?</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className={`
            ${avatarSizes[variant]} rounded-full
            bg-gradient-to-br from-warning/30 to-fire/30
            border-2 border-warning/40
            flex items-center justify-center
            ${variant === 'hero' ? 'shadow-lg shadow-warning/20' : ''}
          `}
        >
          {fighter.avatarUrl ? (
            <img
              src={fighter.avatarUrl}
              alt={fighter.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-warning font-bold text-sm md:text-base">
              {getInitials(fighter.displayName)}
            </span>
          )}
        </div>
        <span className={`${nameSizes[variant]} text-white/80 font-medium truncate max-w-[80px] md:max-w-[120px]`}>
          {fighter.displayName}
        </span>
        {variant !== 'compact' && fighter.record && (
          <span className="text-[10px] text-white/40">
            {fighter.record.wins}W - {fighter.record.losses}L
          </span>
        )}
      </div>
    );
  };

  // Status badge
  const StatusBadge = () => {
    if (status === 'live') {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/20 border border-danger/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
          </span>
          <span className="text-[10px] font-bold text-danger uppercase tracking-wider">Live</span>
        </div>
      );
    }

    if (status === 'upcoming') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 uppercase">Starting in</span>
          <CountdownTimer
            targetTime={startTime}
            size={variant === 'hero' ? 'lg' : variant === 'featured' ? 'md' : 'sm'}
          />
        </div>
      );
    }

    return (
      <span className="text-[10px] text-white/40 uppercase px-2 py-1 bg-white/5 rounded">
        Completed
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl overflow-hidden cursor-pointer
        bg-black/40 backdrop-blur border border-white/10
        hover:border-rust/40 hover:scale-[1.02]
        transition-all duration-200
        ${variantClasses[variant]}
        ${variant === 'hero' ? 'bg-gradient-to-br from-black/60 via-black/40 to-warning/5' : ''}
      `}
    >
      {/* Featured badge */}
      {battle.isFeatured && variant !== 'hero' && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-warning/20 border border-warning/30 rounded text-[8px] font-bold text-warning uppercase">
          Featured
        </div>
      )}

      {/* Fighter face-off */}
      <div className={`flex items-center justify-center gap-4 ${variant === 'hero' ? 'gap-8 md:gap-12' : ''}`}>
        <FighterAvatar fighter={fighter1} side="left" />

        {/* VS Section */}
        <div className="flex flex-col items-center gap-1">
          <div className={`${vsSizes[variant]} text-warning/80 flex items-center gap-1`}>
            {variant === 'hero' ? (
              <>
                <Zap className="w-5 h-5 text-fire" />
                <span>VS</span>
                <Zap className="w-5 h-5 text-fire" />
              </>
            ) : (
              <span>VS</span>
            )}
          </div>
          {variant !== 'compact' && (
            <span className="text-[10px] text-white/30">{asset}</span>
          )}
        </div>

        <FighterAvatar fighter={fighter2} side="right" />
      </div>

      {/* Stakes and leverage */}
      <div className={`flex items-center justify-center gap-3 mt-3 ${variant === 'hero' ? 'mt-6' : ''}`}>
        <div className="flex items-center gap-1 px-2 py-1 bg-success/10 border border-success/20 rounded">
          <span className={`font-bold text-success ${variant === 'hero' ? 'text-lg' : 'text-sm'}`}>
            {stakes} SOL
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-fire/10 border border-fire/20 rounded">
          <Zap className="w-3 h-3 text-fire" />
          <span className={`font-bold text-fire ${variant === 'hero' ? 'text-lg' : 'text-sm'}`}>
            {leverage}x
          </span>
        </div>
      </div>

      {/* Status and spectators */}
      <div className={`flex items-center justify-between mt-3 ${variant === 'hero' ? 'mt-6' : ''}`}>
        <StatusBadge />

        {/* Spectator count - only show if > 0 */}
        {spectatorCount > 0 && (
          <div className="flex items-center gap-1 text-white/40">
            <Eye className="w-3 h-3" />
            <span className="text-xs">{spectatorCount}</span>
          </div>
        )}
      </div>

      {/* CTAs for live battles in hero/featured variants */}
      {status === 'live' && variant !== 'compact' && (
        <div className={`flex items-center gap-3 mt-4 ${variant === 'hero' ? 'mt-6' : ''}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to spectate - handled by parent onClick
            }}
            className={`
              flex-1 py-2.5 rounded-lg font-bold text-center
              bg-gradient-to-r from-warning to-fire text-black
              hover:opacity-90 transition-opacity
              ${variant === 'hero' ? 'py-3 text-lg' : 'text-sm'}
            `}
          >
            Watch Live
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to bet - handled by parent onClick with ?bet=true
            }}
            className={`
              flex-1 py-2.5 rounded-lg font-bold text-center
              bg-white/10 border border-white/20 text-white
              hover:bg-white/20 transition-colors
              ${variant === 'hero' ? 'py-3 text-lg' : 'text-sm'}
            `}
          >
            Bet Now
          </button>
        </div>
      )}
    </div>
  );
}
