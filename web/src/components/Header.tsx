'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { UserAvatar } from './UserAvatar';
import { ProfilePicker } from './ProfilePicker';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-[140px] rounded-lg bg-bg-tertiary animate-pulse" />
    )
  }
);

const NAV_LINKS = [
  { href: '/', label: 'Dome', icon: 'home' },
  { href: '/predict', label: 'Oracle', icon: 'predict' },
  { href: '/battle', label: 'Arena', icon: 'battle' },
  { href: '/draft', label: 'Draft', icon: 'draft' },
  { href: '/spectate', label: 'Watch', icon: 'spectate' },
  { href: '/leaderboard', label: 'Warlords', icon: 'leaderboard' },
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
    default:
      return null;
  }
};

export function Header() {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const [isProfilePickerOpen, setIsProfilePickerOpen] = useState(false);
  const walletAddress = publicKey?.toBase58();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-sm border-b border-rust/30">
      {/* Rust accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rust to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-4 h-16 grid grid-cols-3 items-center">
        {/* Logo - Left */}
        <Link href="/" className="flex items-center gap-3 group justify-self-start" data-tour="logo">
          <div className="relative">
            {/* Dome icon with fire glow - more industrial */}
            <div className="w-10 h-10 rounded bg-gradient-to-b from-rust to-rust-dark flex items-center justify-center shadow-fire-sm group-hover:shadow-fire transition-all border border-rust-light/30">
              {/* Skull/dome icon for more Mad Max feel */}
              <svg className="w-6 h-6 text-sand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3C7.03 3 3 7.03 3 12v9h18v-9c0-4.97-4.03-9-9-9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21v-9M12 21V8M17 21v-9" />
              </svg>
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
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            const tourId = link.icon === 'battle' ? 'battle' :
                          link.icon === 'predict' ? 'predict' :
                          link.icon === 'draft' ? 'draft' :
                          link.icon === 'spectate' ? 'spectate' : undefined;
            return (
              <Link
                key={link.href}
                href={link.href}
                data-tour={tourId}
                className={`group flex items-center gap-2 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'text-fire bg-rust/20 border border-rust/40'
                    : 'text-text-secondary hover:text-fire hover:bg-rust/10 border border-transparent'
                }`}
              >
                <NavIcon type={link.icon} active={isActive} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 justify-self-end">
          {/* Profile Avatar with Name */}
          {walletAddress && (
            <UserAvatar
              walletAddress={walletAddress}
              size="md"
              showName
              onClick={() => setIsProfilePickerOpen(true)}
            />
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
