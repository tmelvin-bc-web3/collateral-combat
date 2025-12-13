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
  { href: '/', label: 'Battle', icon: 'battle' },
  { href: '/predict', label: 'Predict', icon: 'predict' },
  { href: '/spectate', label: 'Spectate', icon: 'spectate' },
  { href: '/leaderboard', label: 'Rankings', icon: 'leaderboard' },
];

const NavIcon = ({ type, active }: { type: string; active: boolean }) => {
  const color = active ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary';

  switch (type) {
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-border-primary">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:shadow-accent/40 transition-shadow">
              <svg className="w-5 h-5 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-bg-primary" />
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-text-primary tracking-tight">Collateral Combat</div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider">PvP Trading Arena</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-bg-secondary/50 border border-border-primary">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-text-primary bg-bg-tertiary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
                }`}
              >
                <NavIcon type={link.icon} active={isActive} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs font-semibold text-success">Mainnet</span>
          </div>

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
          <WalletMultiButton />
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
