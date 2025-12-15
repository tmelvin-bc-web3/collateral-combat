'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const GAME_MODES = [
  {
    id: 'predict',
    href: '/predict',
    title: 'The Oracle',
    subtitle: 'Predict or Perish',
    description: 'SOL goes up or down in 30 seconds. Call it right or get rekt. No second chances.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    stats: [
      { label: 'Round', value: '30s' },
      { label: 'Entry', value: '$5' },
    ],
    color: 'accent',
    live: true,
  },
  {
    id: 'battle',
    href: '/battle',
    title: 'The Arena',
    subtitle: '1v1 Deathmatch',
    description: 'Two degens enter, one leaves with the loot. Trade with 20x leverage. Best P&L survives.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    stats: [
      { label: 'Duration', value: '30 min' },
      { label: 'Leverage', value: '20x' },
    ],
    color: 'success',
    live: true,
  },
  {
    id: 'draft',
    href: '/draft',
    title: 'War Party',
    subtitle: 'Assemble Your Squad',
    description: 'Draft 6 memecoins for your war party. Best gains over the week claims the throne.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    stats: [
      { label: 'Entry', value: '$5-$100' },
      { label: 'Season', value: 'Weekly' },
    ],
    color: 'warning',
    live: true,
  },
  {
    id: 'spectate',
    href: '/spectate',
    title: 'The Stands',
    subtitle: 'Watch & Wager',
    description: 'Witness the carnage from the stands. Back your champion. Collect the spoils.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    stats: [
      { label: 'Live Battles', value: '0' },
      { label: 'Min Bet', value: '0.1 SOL' },
    ],
    color: 'danger',
    live: false,
  },
];

export default function Home() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Hero */}
      <div className="text-center py-12 md:py-20 relative">
        {/* Decorative rust lines */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-rust/30 to-transparent" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-rust/20 border border-rust/40 text-fire text-xs font-bold uppercase tracking-[3px] mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fire opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fire"></span>
            </span>
            The Dome is Open
          </div>

          <h1 className="text-4xl md:text-7xl font-black tracking-wider mb-4" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '4px' }}>
            TWO DEGENS ENTER.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-danger to-blood">
              ONE PROFITS.
            </span>
          </h1>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
            Welcome to the wasteland&apos;s premier trading arena. Predict. Battle. Draft. Survive.
            Only the strongest degens claim the loot.
          </p>

          {!publicKey && (
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          )}
        </div>
      </div>

      {/* Game Modes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {GAME_MODES.map((mode) => (
          <Link
            key={mode.id}
            href={mode.href}
            className="group relative card border border-rust/20 hover:border-rust/50 transition-all duration-300 hover:shadow-rust"
          >
            {/* Top rust accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rust to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            {/* Live Badge */}
            {mode.live && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-fire/20 border border-fire/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fire opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fire"></span>
                  </span>
                  <span className="text-[10px] font-bold text-fire uppercase tracking-wider">Live</span>
                </div>
              </div>
            )}

            {/* Icon */}
            <div className="w-12 h-12 rounded bg-rust/20 border border-rust/30 flex items-center justify-center text-fire mb-4 group-hover:bg-rust/30 transition-colors">
              {mode.icon}
            </div>

            {/* Content */}
            <h2 className="text-lg font-black mb-1 uppercase tracking-wide">{mode.title}</h2>
            <p className="text-xs text-rust-light mb-3 uppercase tracking-wider">{mode.subtitle}</p>
            <p className="text-sm text-text-secondary mb-4">{mode.description}</p>

            {/* Stats */}
            <div className="flex gap-4 pt-4 border-t border-rust/20">
              {mode.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{stat.label}</div>
                  <div className="font-bold text-sand">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="card border border-rust/30 mb-16 relative overflow-hidden">
        {/* Industrial corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-rust/50" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-rust/50" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-rust/50" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-rust/50" />

        <div className="text-center mb-6">
          <h2 className="text-sm font-black uppercase tracking-[4px] text-rust-light">Dome Statistics</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-black text-fire">4</div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-[2px]">Battle Modes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-success">30s</div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-[2px]">Speed Rounds</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-sand">Instant</div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-[2px]">Loot Drops</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-danger">24/7</div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-[2px]">Always Open</div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-xl font-black text-center mb-8 uppercase tracking-[4px] text-text-primary">Rules of the Dome</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card border border-rust/20 text-center relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded bg-rust border border-rust-light flex items-center justify-center text-sand font-black">1</div>
            <div className="pt-4">
              <h3 className="font-black mb-2 uppercase tracking-wider text-fire">Enter the Dome</h3>
              <p className="text-sm text-text-secondary">Connect your Solana wallet to join the wasteland. Your identity. Your destiny.</p>
            </div>
          </div>
          <div className="card border border-rust/20 text-center relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded bg-rust border border-rust-light flex items-center justify-center text-sand font-black">2</div>
            <div className="pt-4">
              <h3 className="font-black mb-2 uppercase tracking-wider text-fire">Choose Your Fate</h3>
              <p className="text-sm text-text-secondary">Oracle predictions. Arena battles. War party drafts. Pick your path to glory.</p>
            </div>
          </div>
          <div className="card border border-rust/20 text-center relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded bg-rust border border-rust-light flex items-center justify-center text-sand font-black">3</div>
            <div className="pt-4">
              <h3 className="font-black mb-2 uppercase tracking-wider text-fire">Claim the Spoils</h3>
              <p className="text-sm text-text-secondary">Winners take all. Loot drops instantly to your wallet. No mercy. No delays.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
