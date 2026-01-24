'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { NAV_TABS, NavTab } from '@/types/navigation';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

/**
 * Icon component for bottom navigation tabs
 * Matches existing NavIcon pattern from Header.tsx
 */
const NavIcon = ({ type, active }: { type: string; active: boolean }) => {
  const colorClass = active ? 'text-fire' : 'text-text-tertiary';

  switch (type) {
    case 'arena':
      // Stadium/home icon
      return (
        <svg
          className={`w-6 h-6 ${colorClass}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      );
    case 'watch':
      // Eye icon for spectating
      return (
        <svg
          className={`w-6 h-6 ${colorClass}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      );
    case 'fight':
      // Lightning bolt icon for battles
      return (
        <svg
          className={`w-6 h-6 ${colorClass}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
    case 'profile':
      // User icon
      return (
        <svg
          className={`w-6 h-6 ${colorClass}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Bottom tab navigation for mobile viewport
 * Fixed to bottom, hidden on desktop (md:hidden)
 * Implements 44px minimum touch targets per accessibility guidelines (NAV-02)
 * Supports horizontal swipe gestures for tab navigation (NAV-04)
 */
export function BottomNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  /**
   * Construct the href for a tab, replacing wallet placeholder if needed
   */
  const getTabHref = useCallback(
    (tab: NavTab): string => {
      if (tab.id === 'profile') {
        return walletAddress ? `/profile/${walletAddress}` : '/profile';
      }
      return tab.href;
    },
    [walletAddress]
  );

  /**
   * Get current tab index based on pathname
   */
  const currentTabIndex = useMemo(() => {
    const index = NAV_TABS.findIndex((tab) => tab.isActive(pathname));
    return index >= 0 ? index : 0;
  }, [pathname]);

  /**
   * Navigate to adjacent tab on swipe
   */
  const handleSwipeLeft = useCallback(() => {
    // Swipe left = go to next tab
    if (currentTabIndex < NAV_TABS.length - 1) {
      const nextTab = NAV_TABS[currentTabIndex + 1];
      router.push(getTabHref(nextTab));
    }
  }, [currentTabIndex, router, getTabHref]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = go to previous tab
    if (currentTabIndex > 0) {
      const prevTab = NAV_TABS[currentTabIndex - 1];
      router.push(getTabHref(prevTab));
    }
  }, [currentTabIndex, router, getTabHref]);

  // Attach swipe gesture handler
  const swipeRef = useSwipeNavigation({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
    maxVerticalDeviation: 100,
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-primary/95 backdrop-blur-sm border-t border-rust/30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Bottom navigation"
    >
      {/* Rust accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rust to-transparent opacity-60" />

      {/* Swipeable container wrapping the tabs */}
      <div ref={swipeRef} className="grid grid-cols-4">
        {NAV_TABS.map((tab) => {
          const isActive = tab.isActive(pathname);
          const href = getTabHref(tab);

          return (
            <Link
              key={tab.id}
              href={href}
              className={`
                flex flex-col items-center justify-center
                min-h-[56px] py-2
                transition-colors duration-150
                active:scale-[0.95] active:bg-rust/10
                ${isActive ? 'text-fire' : 'text-text-tertiary'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon container - ensures 44px touch target */}
              <div className="flex items-center justify-center w-11 h-7">
                <NavIcon type={tab.icon} active={isActive} />
              </div>
              {/* Label */}
              <span
                className={`
                  text-[10px] font-semibold uppercase tracking-wider mt-0.5
                  ${isActive ? 'text-fire' : 'text-text-tertiary'}
                `}
              >
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-fire" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
