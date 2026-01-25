'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LiveBattle } from '@/types';
import { BattleSlide } from './BattleSlide';
import { useVerticalSwipe } from '@/hooks/useVerticalSwipe';
import { Loader2 } from 'lucide-react';

/**
 * Merge multiple refs into a single callback ref
 * Used to combine swipeable ref with our container ref
 */
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}

interface BattleFeedProps {
  battles: LiveBattle[];
  onRefresh: () => Promise<void>;
  walletAddress?: string;
  onBetPlaced?: () => void;
}

/**
 * BattleFeed - TikTok-style vertical scroll container with CSS snap points
 * Mobile-optimized battle feed with pull-to-refresh (MOB-04, MOB-05)
 *
 * Features:
 * - CSS scroll-snap for smooth vertical navigation
 * - Pull-to-refresh at top of feed
 * - Intersection Observer for active slide tracking
 * - Auto-advance after battle ends (with user override)
 * - Empty state with refresh prompt
 */
export function BattleFeed({
  battles,
  onRefresh,
  walletAddress,
  onBetPlaced,
}: BattleFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isBetting, setIsBetting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Map<string, IntersectionObserverEntry>>(new Map());

  // Pull-to-refresh integration
  const { handlers, isPulling, pullDistance, isRefreshing } = useVerticalSwipe({
    onPullToRefresh: onRefresh,
    pullThreshold: 60,
  });

  // Track active slide via Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const battleId = entry.target.getAttribute('data-battle-id');
          if (battleId) {
            slideRefs.current.set(battleId, entry);
          }

          // Find the most visible slide
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = battles.findIndex(
              (b) => b.id === entry.target.getAttribute('data-battle-id')
            );
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: [0, 0.5, 1],
      }
    );

    // Observe all slides
    const slides = containerRef.current.querySelectorAll('[data-battle-id]');
    slides.forEach((slide) => observer.observe(slide));

    return () => observer.disconnect();
  }, [battles]);

  // Auto-advance after battle ends
  useEffect(() => {
    const currentBattle = battles[activeIndex];
    if (!currentBattle || currentBattle.status !== 'completed' || isBetting) return;

    // Show result for 3 seconds, then advance
    const timer = setTimeout(() => {
      const nextLiveIndex = battles.findIndex(
        (b, i) => i > activeIndex && b.status === 'active'
      );
      if (nextLiveIndex !== -1 && containerRef.current) {
        const slides = containerRef.current.querySelectorAll('[data-battle-id]');
        slides[nextLiveIndex]?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeIndex, battles, isBetting]);

  const handleBetPlaced = useCallback(() => {
    setIsBetting(true);
    onBetPlaced?.();
    // Reset after a delay
    setTimeout(() => setIsBetting(false), 5000);
  }, [onBetPlaced]);

  // Empty state
  if (battles.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 bg-bg-primary" {...handlers}>
        {/* Pull indicator */}
        {isPulling && (
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform"
            style={{ transform: `translateY(${Math.min(pullDistance, 80)}px)` }}
          >
            <div className={`flex items-center gap-2 p-3 rounded-full bg-white/10 backdrop-blur ${isRefreshing ? 'animate-pulse' : ''}`}>
              <Loader2 className={`w-5 h-5 text-accent ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm text-white/60">
                {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-3xl">⚔️</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Live Battles</h3>
          <p className="text-sm text-white/50 mb-6">
            Pull down to refresh or check back soon
          </p>
          <button
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="min-h-[44px] px-6 py-3 rounded-lg font-bold text-sm bg-accent hover:bg-accent/80 text-bg-primary transition-colors disabled:opacity-50 touch-manipulation"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform pointer-events-none"
          style={{ transform: `translateY(${Math.min(pullDistance - 20, 60)}px)` }}
        >
          <div className={`flex items-center gap-2 p-3 rounded-full bg-black/60 backdrop-blur border border-white/10 ${isRefreshing ? 'animate-pulse' : ''}`}>
            <Loader2 className={`w-5 h-5 text-accent ${isRefreshing || pullDistance > 60 ? 'animate-spin' : ''}`} />
            <span className="text-sm text-white/80">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Scrollable container with snap */}
      <div
        ref={mergeRefs(containerRef, handlers.ref)}
        className="h-screen overflow-y-auto snap-y snap-mandatory overscroll-contain"
        style={{ scrollBehavior: 'smooth' }}
        onMouseDown={handlers.onMouseDown}
      >
        {battles.map((battle, index) => (
          <div key={battle.id} data-battle-id={battle.id}>
            <BattleSlide
              battle={battle}
              isActive={index === activeIndex}
              onBetPlaced={handleBetPlaced}
            />
          </div>
        ))}
      </div>

      {/* Battle indicator dots */}
      {battles.length > 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5">
          {battles.map((battle, index) => (
            <button
              key={battle.id}
              onClick={() => {
                const slides = containerRef.current?.querySelectorAll('[data-battle-id]');
                slides?.[index]?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-2 h-2 rounded-full transition-all touch-manipulation ${index === activeIndex ? 'bg-accent scale-125' : 'bg-white/30 hover:bg-white/50'}`}
              aria-label={`Go to battle ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Completed battle overlay */}
      {battles[activeIndex]?.status === 'completed' && !isBetting && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="text-xl font-bold text-white mb-1">Battle Ended</h3>
            <p className="text-sm text-white/60">Moving to next battle...</p>
          </div>
        </div>
      )}
    </div>
  );
}
