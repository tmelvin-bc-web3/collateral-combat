'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { BattleCard } from './BattleCard';
import type { Battle } from '@/types/fightcard';

interface LiveBattlesStripProps {
  battles: Battle[];
  onBattleClick?: (battle: Battle) => void;
}

export function LiveBattlesStrip({
  battles,
  onBattleClick,
}: LiveBattlesStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Don't render if no live battles
  if (battles.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="relative mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
          </span>
          <h2 className="text-lg font-black uppercase tracking-wider text-white">
            Live Now
          </h2>
        </div>
        <span className="text-xs text-white/40">
          {battles.length} battle{battles.length !== 1 ? 's' : ''} in progress
        </span>
      </div>

      {/* Scroll container */}
      <div className="relative group">
        {/* Left arrow - desktop only */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10
            hidden md:flex items-center justify-center
            w-10 h-10 rounded-full
            bg-black/80 border border-white/10
            text-white/60 hover:text-white hover:border-white/30
            opacity-0 group-hover:opacity-100
            transition-all duration-200
            -translate-x-1/2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable battle cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2
            snap-x snap-mandatory
            scrollbar-hide
            [-webkit-overflow-scrolling:touch]
            [-ms-overflow-style:none]
            [scrollbar-width:none]"
          style={{
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {battles.map((battle) => (
            <div key={battle.id} className="snap-start flex-shrink-0">
              <BattleCard
                battle={battle}
                variant="compact"
                onClick={() => onBattleClick?.(battle)}
              />
            </div>
          ))}
        </div>

        {/* Right arrow - desktop only */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10
            hidden md:flex items-center justify-center
            w-10 h-10 rounded-full
            bg-black/80 border border-white/10
            text-white/60 hover:text-white hover:border-white/30
            opacity-0 group-hover:opacity-100
            transition-all duration-200
            translate-x-1/2"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
