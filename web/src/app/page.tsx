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
    title: 'UP or DOWN',
    subtitle: 'Predict SOL price movement',
    description: 'Bet on whether SOL goes up or down in the next 30 seconds. Fast rounds, winner takes all.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    stats: [
      { label: 'Round Time', value: '30s' },
      { label: 'Min Bet', value: '$5' },
    ],
    color: 'accent',
    live: true,
  },
  {
    id: 'battle',
    href: '/battle',
    title: 'Battle Arena',
    subtitle: '1v1 Leveraged Trading',
    description: 'Enter head-to-head trading battles. Trade with up to 20x leverage. Best P&L wins the pot.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    stats: [
      { label: 'Duration', value: '30 min' },
      { label: 'Max Leverage', value: '20x' },
    ],
    color: 'success',
    live: true,
  },
  {
    id: 'draft',
    href: '/draft',
    title: 'Memecoin Draft',
    subtitle: 'Weekly Tournament',
    description: 'Build a team of 6 memecoins. Best performance over the week wins. Use power-ups strategically!',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    stats: [
      { label: 'Entry Tiers', value: '$5-$100' },
      { label: 'Duration', value: 'Weekly' },
    ],
    color: 'warning',
    live: true,
  },
  {
    id: 'spectate',
    href: '/spectate',
    title: 'Watch & Bet',
    subtitle: 'Spectate Live Battles',
    description: 'Watch traders compete in real-time and place bets on who you think will win.',
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
      <div className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          Live on Solana Mainnet
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
          Trade PvP.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-success">
            Winner Takes All.
          </span>
        </h1>

        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
          The ultimate trading arena on Solana. Predict price movements, battle other traders,
          or watch and bet on live competitions.
        </p>

        {!publicKey && (
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
        )}
      </div>

      {/* Game Modes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {GAME_MODES.map((mode) => (
          <Link
            key={mode.id}
            href={mode.href}
            className={`group relative card border-2 border-transparent hover:border-${mode.color}/30 transition-all duration-300 hover:shadow-lg hover:shadow-${mode.color}/5`}
          >
            {/* Live Badge */}
            {mode.live && (
              <div className="absolute top-4 right-4">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-${mode.color}/10 border border-${mode.color}/20`}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${mode.color} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 bg-${mode.color}`}></span>
                  </span>
                  <span className={`text-[10px] font-bold text-${mode.color} uppercase`}>Live</span>
                </div>
              </div>
            )}

            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl bg-${mode.color}/10 flex items-center justify-center text-${mode.color} mb-4 group-hover:scale-110 transition-transform`}>
              {mode.icon}
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold mb-1">{mode.title}</h2>
            <p className="text-sm text-text-tertiary mb-3">{mode.subtitle}</p>
            <p className="text-sm text-text-secondary mb-4">{mode.description}</p>

            {/* Stats */}
            <div className="flex gap-4 pt-4 border-t border-border-primary">
              {mode.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-xs text-text-tertiary">{stat.label}</div>
                  <div className="font-semibold">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className={`w-5 h-5 text-${mode.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="card bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-primary mb-16">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold">Platform Stats</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent">4</div>
            <div className="text-sm text-text-tertiary">Game Modes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-success">$5+</div>
            <div className="text-sm text-text-tertiary">Min Entry</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-warning">28+</div>
            <div className="text-sm text-text-tertiary">Memecoins</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-danger">90%</div>
            <div className="text-sm text-text-tertiary">Prize Pool</div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
            <h3 className="font-semibold mb-2">Connect Wallet</h3>
            <p className="text-sm text-text-secondary">Connect your Solana wallet to get started. No deposits required for practice mode.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
            <h3 className="font-semibold mb-2">Choose Your Game</h3>
            <p className="text-sm text-text-secondary">Predict price movements, enter 1v1 battles, or spectate and bet on others.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
            <h3 className="font-semibold mb-2">Win & Earn</h3>
            <p className="text-sm text-text-secondary">Best performance wins. Payouts are instant and automatically sent to your wallet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
