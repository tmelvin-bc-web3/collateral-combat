'use client';

import { useState, useCallback, useRef } from 'react';
import { useSwipeable, SwipeableHandlers } from 'react-swipeable';

interface UseVerticalSwipeOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPullToRefresh?: () => Promise<void>;
  pullThreshold?: number; // default 60px
}

interface UseVerticalSwipeReturn {
  handlers: SwipeableHandlers;
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

/**
 * Custom hook for detecting vertical swipe gestures and pull-to-refresh
 * Used for TikTok-style vertical navigation in the battle feed (MOB-04, MOB-05)
 *
 * Features:
 * - Vertical swipe detection (up/down)
 * - Pull-to-refresh when at top of scroll container
 * - Visual feedback via pullDistance state
 *
 * @example
 * const { handlers, isPulling, pullDistance, isRefreshing } = useVerticalSwipe({
 *   onSwipeUp: () => scrollToNext(),
 *   onSwipeDown: () => scrollToPrevious(),
 *   onPullToRefresh: async () => { await fetchBattles(); },
 *   pullThreshold: 60,
 * });
 *
 * return (
 *   <div {...handlers}>
 *     {isPulling && <RefreshIndicator distance={pullDistance} />}
 *     <BattleFeed />
 *   </div>
 * );
 */
export function useVerticalSwipe({
  onSwipeUp,
  onSwipeDown,
  onPullToRefresh,
  pullThreshold = 60,
}: UseVerticalSwipeOptions = {}): UseVerticalSwipeReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track if we're at top of scroll container for pull-to-refresh
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  const handlePullToRefresh = useCallback(async () => {
    if (!onPullToRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onPullToRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [onPullToRefresh, isRefreshing]);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only track pull-to-refresh when swiping down
      if (eventData.dir === 'Down' && onPullToRefresh) {
        // Check if at top of scroll container
        const container = eventData.event.currentTarget as HTMLElement;
        scrollContainerRef.current = container;

        // Only allow pull-to-refresh if scrolled to top
        if (container && container.scrollTop <= 0) {
          const distance = Math.min(eventData.deltaY, pullThreshold * 2);
          if (distance > 0) {
            setIsPulling(true);
            setPullDistance(distance);
          }
        }
      }
    },
    onSwipedUp: () => {
      if (onSwipeUp && !isPulling) {
        onSwipeUp();
      }
    },
    onSwipedDown: () => {
      if (isPulling && pullDistance >= pullThreshold && !isRefreshing) {
        // Trigger refresh
        handlePullToRefresh();
      } else if (onSwipeDown && !isPulling) {
        onSwipeDown();
      }

      // Reset pull state if not refreshing
      if (!isRefreshing) {
        setIsPulling(false);
        setPullDistance(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      // Reset pull state if we didn't reach threshold
      if (isPulling && pullDistance < pullThreshold && !isRefreshing) {
        setIsPulling(false);
        setPullDistance(0);
      }
    },
    delta: 50,
    preventScrollOnSwipe: false,
    trackTouch: true,
    trackMouse: false,
  });

  return {
    handlers,
    isPulling,
    pullDistance,
    isRefreshing,
  };
}
