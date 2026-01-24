'use client';

import { useRef, useEffect, useCallback } from 'react';

interface SwipeNavigationOptions {
  /** Minimum horizontal distance in pixels to trigger swipe (default: 50) */
  threshold?: number;
  /** Maximum vertical deviation allowed before swipe is cancelled (default: 100) */
  maxVerticalDeviation?: number;
  /** Callback fired when user swipes left */
  onSwipeLeft?: () => void;
  /** Callback fired when user swipes right */
  onSwipeRight?: () => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * Custom hook for detecting horizontal swipe gestures
 * Used for navigating between tabs in mobile bottom navigation (NAV-04)
 *
 * Returns a ref to attach to the swipeable element
 *
 * @example
 * const swipeRef = useSwipeNavigation({
 *   onSwipeLeft: () => navigateNext(),
 *   onSwipeRight: () => navigatePrevious(),
 *   threshold: 50,
 * });
 *
 * return <div ref={swipeRef}>Swipeable content</div>
 */
export function useSwipeNavigation({
  threshold = 50,
  maxVerticalDeviation = 100,
  onSwipeLeft,
  onSwipeRight,
}: SwipeNavigationOptions = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const swipeState = useRef<SwipeState | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    swipeState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!swipeState.current) return;

      const touch = e.changedTouches[0];
      if (!touch) {
        swipeState.current = null;
        return;
      }

      const { startX, startY, startTime } = swipeState.current;
      const endX = touch.clientX;
      const endY = touch.clientY;
      const deltaX = endX - startX;
      const deltaY = Math.abs(endY - startY);
      const deltaTime = Date.now() - startTime;

      // Reset state
      swipeState.current = null;

      // Ignore if too slow (> 500ms) or mostly vertical
      if (deltaTime > 500 || deltaY > maxVerticalDeviation) {
        return;
      }

      // Check if swipe exceeds threshold
      if (Math.abs(deltaX) >= threshold) {
        if (deltaX < 0 && onSwipeLeft) {
          // Swipe left - go to next
          onSwipeLeft();
        } else if (deltaX > 0 && onSwipeRight) {
          // Swipe right - go to previous
          onSwipeRight();
        }
      }
    },
    [threshold, maxVerticalDeviation, onSwipeLeft, onSwipeRight]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return elementRef;
}
