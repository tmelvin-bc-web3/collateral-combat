'use client';

import Link from 'next/link';
import { Grid3X3, ChevronRight } from 'lucide-react';
import { BattleCard } from './BattleCard';
import type { FightCardBattle } from '@/types/fightcard';

interface UndercardGridProps {
  battles: FightCardBattle[];
  onBattleClick?: (battle: FightCardBattle) => void;
  showViewAll?: boolean;
}

export function UndercardGrid({
  battles,
  onBattleClick,
  showViewAll = true,
}: UndercardGridProps) {
  // Don't render if no battles
  if (battles.length === 0) {
    return null;
  }

  // Limit to 8 battles for the grid view
  const displayBattles = battles.slice(0, 8);
  const hasMore = battles.length > 8;

  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Grid3X3 className="w-5 h-5 text-white/40" />
          <h2 className="text-lg font-black uppercase tracking-wider text-white">
            Undercard
          </h2>
          <span className="text-xs text-white/40">Upcoming</span>
        </div>

        {/* View All link */}
        {showViewAll && hasMore && (
          <Link
            href="/battle"
            className="flex items-center gap-1 text-sm text-warning hover:text-warning/80 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Battle cards grid - 2 cols mobile, 3 tablet, 4 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayBattles.map((battle) => (
          <BattleCard
            key={battle.id}
            battle={battle}
            variant="compact"
            onClick={() => onBattleClick?.(battle)}
          />
        ))}
      </div>
    </section>
  );
}
