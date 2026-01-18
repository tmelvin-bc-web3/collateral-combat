'use client';

import Link from 'next/link';
import { Users, Gamepad2, Coins, Flame, Trophy, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LiveStats, ActivityItem } from './types';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

interface HeroSectionProps {
  liveStats: LiveStats;
  recentWins: ActivityItem[];
  walletConnected: boolean;
  onStartPlaying: () => void;
}

export function HeroSection({
  liveStats,
  recentWins,
  walletConnected,
  onStartPlaying,
}: HeroSectionProps) {
  return (
    <section className="relative">
      {/* Live Stats Bar */}
      <div className="mb-6 overflow-hidden">
        <div className="flex items-center justify-center gap-6 md:gap-10 py-3 px-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <StatItem
            icon={<Users className="w-4 h-4" />}
            value={liveStats.playersOnline}
            label="Online"
          />
          <div className="h-4 w-px bg-white/10" />
          <StatItem
            icon={<Gamepad2 className="w-4 h-4" />}
            value={liveStats.liveGames}
            label="Live Games"
          />
          <div className="h-4 w-px bg-white/10" />
          <StatItem
            icon={<Coins className="w-4 h-4" />}
            value={`${liveStats.wonToday.toLocaleString()} SOL`}
            label="Won Today"
          />
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          <StatItem
            icon={<Flame className="w-4 h-4 text-warning" />}
            value={`${liveStats.biggestWinToday} SOL`}
            label="Biggest Win"
            className="hidden md:flex"
          />
        </div>
      </div>

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
          PvP prediction games on Solana. No house edge. Instant payouts. Pure skill vs skill.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
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
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 whitespace-nowrap">
                Try Oracle - 30 second games
              </span>
            </button>
          )}
          <Link
            href="/spectate"
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-medium hover:bg-white/10 transition-colors"
          >
            Watch Live Games
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-3 text-xs text-white/40 mt-8">
          <span className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-warning" />
            2,345 games played
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-success" />
            892 SOL won this week
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-fire" />
            5% rake only
          </span>
        </div>
      </div>

      {/* Live Activity Ticker */}
      {recentWins.length > 0 && (
        <div className="relative overflow-hidden py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="flex items-center">
            <div className="flex-shrink-0 px-4 py-1 bg-danger/20 text-danger text-[10px] font-bold uppercase tracking-wider rounded-r-full mr-4">
              Live Wins
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-8 animate-ticker">
                {[...recentWins, ...recentWins].map((win, index) => (
                  <WinItem key={`${win.id}-${index}`} item={win} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticker animation styles */}
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
      `}</style>
    </section>
  );
}

function StatItem({
  icon,
  value,
  label,
  className = ''
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-white/40">{icon}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-white font-bold text-sm">{value}</span>
        <span className="text-white/40 text-[10px] uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

function WinItem({ item }: { item: ActivityItem }) {
  const timeAgo = getTimeAgo(item.timestamp);

  return (
    <div className="flex items-center gap-2 text-sm whitespace-nowrap">
      <span className="text-white/80 font-medium">{item.user.username}</span>
      <span className="text-white/40">won</span>
      <span className="text-success font-bold">+{item.amount?.toFixed(2)} SOL</span>
      <span className="text-white/40">in {item.game}</span>
      <span className="text-white/30 text-xs">{timeAgo}</span>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
