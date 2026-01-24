import { ComponentType } from 'react';

/**
 * Navigation tab definition for bottom navigation bar
 */
export interface NavTab {
  /** Unique identifier for the tab */
  id: string;
  /** Display label shown below the icon */
  label: string;
  /** Navigation href - can include [wallet] placeholder for dynamic routes */
  href: string;
  /** Icon type identifier matching NavIcon component */
  icon: string;
  /** Check if pathname matches this tab (for context-aware active state) */
  isActive: (pathname: string) => boolean;
}

/**
 * Bottom navigation tabs for mobile experience
 * Arena: Main hub with fight card
 * Watch: Spectator experience
 * Fight: Battle/matchmaking
 * Profile: User profile
 */
export const NAV_TABS: NavTab[] = [
  {
    id: 'arena',
    label: 'Arena',
    href: '/',
    icon: 'arena',
    isActive: (pathname: string) => pathname === '/',
  },
  {
    id: 'watch',
    label: 'Watch',
    href: '/spectate',
    icon: 'watch',
    isActive: (pathname: string) => pathname.startsWith('/spectate'),
  },
  {
    id: 'fight',
    label: 'Fight',
    href: '/battle',
    icon: 'fight',
    isActive: (pathname: string) =>
      pathname.startsWith('/battle') ||
      pathname.startsWith('/challenges') ||
      pathname.startsWith('/tournaments'),
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: 'profile',
    isActive: (pathname: string) => pathname.startsWith('/profile'),
  },
];
