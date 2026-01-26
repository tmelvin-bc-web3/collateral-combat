'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { UserAvatar } from './UserAvatar';
import { ProfilePicker } from './ProfilePicker';
import { WalletBalance } from './WalletBalance';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-[140px] rounded-lg bg-bg-tertiary animate-pulse" />
    )
  }
);

// Game modes - shown in Games dropdown under "Game Modes"
const GAME_MODES_NAV = [
  { href: '/predict', label: 'Oracle', icon: 'predict', description: '30s price predictions' },
  { href: '/lds', label: 'Last Degen Standing', icon: 'lds', description: 'Elimination battle royale' },
  { href: '/token-wars', label: 'Token Wars', icon: 'token-wars', description: 'Head-to-head token battles' },
  { href: '/draft', label: 'Draft', icon: 'draft', description: 'Weekly memecoin tournaments' },
];

// Extra items - shown in Games dropdown under "More"
const DROPDOWN_MORE_NAV = [
  { href: '/events', label: 'Fight Cards', icon: 'events', description: 'Scheduled event nights' },
  { href: '/leaderboard', label: 'Ranks', icon: 'leaderboard', description: 'Leaderboards & rankings' },
];

// All dropdown items combined (for active-state detection)
const ALL_DROPDOWN_NAV = [...GAME_MODES_NAV, ...DROPDOWN_MORE_NAV];

// Primary nav - direct links in the top bar
const PRIMARY_NAV = [
  { href: '/watch', label: 'Watch', icon: 'watch', description: 'Watch & bet on live battles' },
  { href: '/battle', label: 'Battle', icon: 'battle', description: '1v1 leveraged trading' },
  { href: '/tournaments', label: 'Tournaments', icon: 'tournaments', description: 'Bracket competitions' },
];

const NavIcon = ({ type, active }: { type: string; active: boolean }) => {
  const color = active ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary';

  switch (type) {
    case 'home':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'battle':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'predict':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      );
    case 'spectate':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case 'leaderboard':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'draft':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case 'progression':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case 'docs':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'lds':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'token-wars':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      );
    case 'events':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'tournaments':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    case 'watch':
      return (
        <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export function Header() {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const [isProfilePickerOpen, setIsProfilePickerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const walletAddress = publicKey?.toBase58();
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Check if any dropdown item is active
  const isGameActive = ALL_DROPDOWN_NAV.some(link => pathname === link.href);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-sm border-b border-rust/30">
      {/* Rust accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rust to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-4 h-16 grid grid-cols-3 items-center">
        {/* Logo - Left */}
        <Link href="/" className="flex items-center gap-3 group justify-self-start" data-tour="logo">
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Degen Dome"
                width={48}
                height={48}
                className="w-full h-full object-cover scale-110"
              />
            </div>
            {/* Live indicator - fire style */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-fire border-2 border-bg-primary animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <div className="font-black text-text-primary tracking-wider text-xl" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '2px' }}>
              DEGEN<span className="text-fire">DOME</span>
            </div>
            <div className="text-[9px] text-rust-light uppercase tracking-[3px]">Two Enter. One Profits.</div>
          </div>
        </Link>

        {/* Nav - Center */}
        <nav className="hidden md:flex items-center gap-0.5 p-1 rounded bg-bg-secondary/80 border border-rust/20 justify-self-center">
          {/* Games dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`group flex items-center gap-2 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all touch-manipulation active:scale-[0.98] ${
                isGameActive || isMoreMenuOpen
                  ? 'text-fire bg-rust/20 border border-rust/40'
                  : 'text-text-secondary hover:text-fire hover:bg-rust/10 active:bg-rust/20 border border-transparent'
              }`}
            >
              <svg className={`w-4 h-4 ${isGameActive || isMoreMenuOpen ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Games
              <svg className={`w-3 h-3 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Games dropdown menu */}
            {isMoreMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-bg-secondary border border-rust/30 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="p-2 border-b border-rust/20">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider px-2">Game Modes</div>
                </div>
                {GAME_MODES_NAV.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 min-h-[44px] transition-all touch-manipulation active:scale-[0.98] ${
                        isActive
                          ? 'bg-rust/20 text-fire'
                          : 'hover:bg-rust/10 active:bg-rust/20 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="mt-0.5">
                        <NavIcon type={link.icon} active={isActive} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{link.label}</div>
                        <div className="text-xs text-text-tertiary">{link.description}</div>
                      </div>
                    </Link>
                  );
                })}
                <div className="p-2 border-t border-rust/20">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider px-2">More</div>
                </div>
                {DROPDOWN_MORE_NAV.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 min-h-[44px] transition-all touch-manipulation active:scale-[0.98] ${
                        isActive
                          ? 'bg-rust/20 text-fire'
                          : 'hover:bg-rust/10 active:bg-rust/20 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="mt-0.5">
                        <NavIcon type={link.icon} active={isActive} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{link.label}</div>
                        <div className="text-xs text-text-tertiary">{link.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary nav items - Watch & Battle */}
          {PRIMARY_NAV.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-2 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all touch-manipulation active:scale-[0.98] ${
                  isActive
                    ? 'text-fire bg-rust/20 border border-rust/40'
                    : 'text-text-secondary hover:text-fire hover:bg-rust/10 active:bg-rust/20 border border-transparent'
                }`}
              >
                <NavIcon type={link.icon} active={isActive} />
                {link.label}
              </Link>
            );
          })}

        </nav>

        {/* Mobile hamburger button */}
        <div className="md:hidden flex items-center justify-self-center" ref={mobileMenuRef}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg text-text-secondary hover:text-fire hover:bg-rust/10 active:bg-rust/20 transition-all touch-manipulation"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Mobile menu dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-bg-secondary border-b border-rust/30 shadow-xl z-50">
              <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
                {/* Primary nav - Watch, Battle, Tournaments */}
                <div className="px-4 py-2">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Featured</div>
                </div>
                {PRIMARY_NAV.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-start gap-3 px-4 py-3.5 min-h-[48px] rounded-lg transition-all touch-manipulation active:scale-[0.98] ${
                        isActive
                          ? 'bg-rust/20 text-fire'
                          : 'hover:bg-rust/10 active:bg-rust/20 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="mt-0.5">
                        <NavIcon type={link.icon} active={isActive} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{link.label}</div>
                        <div className="text-xs text-text-tertiary">{link.description}</div>
                      </div>
                    </Link>
                  );
                })}

                {/* Divider */}
                <div className="h-px bg-rust/20 my-2" />

                {/* Game modes section */}
                <div className="px-4 py-2">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Game Modes</div>
                </div>
                {GAME_MODES_NAV.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-start gap-3 px-4 py-3.5 min-h-[48px] rounded-lg transition-all touch-manipulation active:scale-[0.98] ${
                        isActive
                          ? 'bg-rust/20 text-fire'
                          : 'hover:bg-rust/10 active:bg-rust/20 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="mt-0.5">
                        <NavIcon type={link.icon} active={isActive} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{link.label}</div>
                        <div className="text-xs text-text-tertiary">{link.description}</div>
                      </div>
                    </Link>
                  );
                })}

                {/* Divider */}
                <div className="h-px bg-rust/20 my-2" />

                {/* More section - Fight Cards, Ranks */}
                <div className="px-4 py-2">
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">More</div>
                </div>
                {DROPDOWN_MORE_NAV.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-start gap-3 px-4 py-3.5 min-h-[48px] rounded-lg transition-all touch-manipulation active:scale-[0.98] ${
                        isActive
                          ? 'bg-rust/20 text-fire'
                          : 'hover:bg-rust/10 active:bg-rust/20 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="mt-0.5">
                        <NavIcon type={link.icon} active={isActive} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{link.label}</div>
                        <div className="text-xs text-text-tertiary">{link.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 justify-self-end">
          {/* Profile Avatar with Name */}
          {walletAddress && (
            <div className="flex items-center gap-2">
              <UserAvatar
                walletAddress={walletAddress}
                size="md"
                showName
                onClick={() => setIsProfilePickerOpen(true)}
              />
            </div>
          )}

          {/* Wallet */}
          <div data-tour="wallet">
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Profile Picker Modal */}
      <ProfilePicker
        isOpen={isProfilePickerOpen}
        onClose={() => setIsProfilePickerOpen(false)}
      />
    </header>
  );
}
