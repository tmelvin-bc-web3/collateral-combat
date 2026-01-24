'use client';

import { Star } from 'lucide-react';
import { BattleCard } from './BattleCard';
import { EmptyState } from './EmptyState';
import type { Battle } from '@/types/fightcard';

interface MainCardSectionProps {
  battles: Battle[];
  onBattleClick?: (battle: Battle) => void;
}

export function MainCardSection({
  battles,
  onBattleClick,
}: MainCardSectionProps) {
  // Show empty state if no battles
  if (battles.length === 0) {
    return (
      <section className="mb-8">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-4">
          <Star className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-black uppercase tracking-wider text-white">
            Main Card
          </h2>
          <span className="text-xs text-white/40">Starting Soon</span>
        </div>

        <div className="bg-black/20 border border-white/5 rounded-xl">
          <EmptyState type="no-upcoming" />
        </div>
      </section>
    );
  }

  // Take up to 3 battles for main card
  const mainCardBattles = battles.slice(0, 3);

  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <Star className="w-5 h-5 text-warning" />
        <h2 className="text-lg font-black uppercase tracking-wider text-white">
          Main Card
        </h2>
        <span className="text-xs text-white/40">Starting Soon</span>
      </div>

      {/* Battle cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mainCardBattles.map((battle) => (
          <BattleCard
            key={battle.id}
            battle={battle}
            variant="featured"
            onClick={() => onBattleClick?.(battle)}
          />
        ))}
      </div>
    </section>
  );
}
