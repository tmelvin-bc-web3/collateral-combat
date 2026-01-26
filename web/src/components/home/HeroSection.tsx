'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LiveStats } from './types';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

interface HeroSectionProps {
  liveStats: LiveStats;
  walletConnected: boolean;
  onStartPlaying: () => void;
}

export function HeroSection({
  liveStats,
  walletConnected,
  onStartPlaying,
}: HeroSectionProps) {
  return (
    <section className="relative">
      {/* Main Hero Content */}
      <div className="text-center py-10 md:py-16">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="text-xs font-bold text-success uppercase tracking-wider">The Dome is Live</span>
          <span className="text-xs text-white/40">|</span>
          <span className="text-xs text-white/60">{liveStats.playersOnline} degens inside</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wider mb-4" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '4px' }}>
          TWO DEGENS ENTER.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-warning via-fire to-danger" style={{ textShadow: '0 0 40px rgba(249, 115, 22, 0.3)' }}>
            ONE PROFITS.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base md:text-lg text-white/60 max-w-xl mx-auto mb-8">
          PvP trading battles on Solana. Prove you&apos;re the best trader. Make trading a spectator sport.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!walletConnected ? (
            <WalletMultiButton />
          ) : (
            <button
              onClick={onStartPlaying}
              className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-warning to-fire text-black font-bold text-lg hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Start Playing
              </span>
            </button>
          )}
          <Link
            href="/watch"
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-medium hover:bg-white/10 transition-colors"
          >
            Watch Live Battles
          </Link>
        </div>
      </div>
    </section>
  );
}
