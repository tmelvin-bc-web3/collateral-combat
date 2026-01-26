'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Calendar, Trophy, Users, Clock, ChevronRight, Play, Eye, Zap, TrendingUp, TrendingDown, Flame, Swords } from 'lucide-react';
import { WatchViewer } from '@/components/watch';
import { UserAvatar } from '@/components/UserAvatar';
import { setCachedProfiles } from '@/lib/profileStorage';
import type { UserProfile } from '@/types';

// Mock data for live battles (desktop grid view)
// In production, wallet addresses would be full addresses from the backend
const MOCK_LIVE_BATTLES = [
  {
    id: 'battle-1',
    fighter1: { name: 'DegenKing', record: '47-12', pnl: 12.4, wallet: '7xKp9mN3qR2sT8vW4yZ1aB5cD6eF7gH8jK9mN3qR2sT8', elo: 1850 },
    fighter2: { name: 'SolWhale.sol', record: '38-15', pnl: -8.2, wallet: '3mNqP7rS2tU9vWxY4zA1bC5dE6fG7hJ8kL9mNqP7rS2t', elo: 1720 },
    stakes: 5,
    asset: 'SOL/USD',
    timeRemaining: 180,
    spectators: 147,
    totalBets: 23.5,
    odds: { fighter1: 1.4, fighter2: 2.8 },
    intensity: 'high', // low, medium, high
    featured: true,
  },
  {
    id: 'battle-2',
    fighter1: { name: 'CryptoApe', record: '25-8', pnl: 5.1, wallet: '9pLmK4nR7sT2vWxY1zA3bC5dE8fG9hJ2kL4mNpK7rS2t', elo: 1680 },
    fighter2: { name: 'MoonBoi', record: '22-10', pnl: 2.3, wallet: '2jHnM7pR4sT9vWxY3zA5bC1dE6fG8hJ2kL7mNjH4pR9s', elo: 1650 },
    stakes: 2,
    asset: 'ETH/USD',
    timeRemaining: 240,
    spectators: 52,
    totalBets: 8.2,
    odds: { fighter1: 1.6, fighter2: 2.2 },
    intensity: 'medium',
    featured: false,
  },
  {
    id: 'battle-3',
    fighter1: { name: 'DiamondHands', record: '15-5', pnl: -3.7, wallet: '5xBcD1mPqR7sT4vWxY2zA6bC3dE9fG5hJ8kL1mNxB2cD', elo: 1590 },
    fighter2: { name: 'Rekt420', record: '18-9', pnl: 6.8, wallet: '8wVnK3sKjR6sT1vWxY9zA2bC7dE4fG6hJ5kL8mNwV3nK', elo: 1620 },
    stakes: 1,
    asset: 'BTC/USD',
    timeRemaining: 120,
    spectators: 34,
    totalBets: 4.1,
    odds: { fighter1: 2.4, fighter2: 1.5 },
    intensity: 'high',
    featured: false,
  },
];

// Mock data for next main card
const NEXT_MAIN_CARD = {
  eventName: 'CT SHOWDOWN',
  tagline: "Crypto Twitter's Finest Go Head to Head",
  date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  mainEvent: {
    fighter1: { name: 'GCR.eth', record: '23-4', elo: 1920, wallet: 'GCR1xKp9mN3qR2sT8vW4yZ1aB5cD6eF7gH8jK9mN3qR', winStreak: 7 },
    fighter2: { name: 'Hsaka', record: '19-6', elo: 1850, wallet: 'HSK3mNqP7rS2tU9vWxY4zA1bC5dE6fG7hJ8kL9mNqP7', winStreak: 4 },
    stakes: 10,
    odds: { fighter1: 1.65, fighter2: 2.20 },
  },
  undercard: [
    {
      fighter1: { name: 'Cobie', record: '15-3', wallet: 'COB9pLmK4nR7sT2vWxY1zA3bC5dE8fG9hJ2kL4mNpK7' },
      fighter2: { name: 'Loomdart', record: '14-5', wallet: 'LMD2jHnM7pR4sT9vWxY3zA5bC1dE6fG8hJ2kL7mNjH4' },
      stakes: 5,
    },
    {
      fighter1: { name: 'Ansem', record: '18-7', wallet: 'ANS5xBcD1mPqR7sT4vWxY2zA6bC3dE9fG5hJ8kL1mNx' },
      fighter2: { name: 'Blknoiz06', record: '12-4', wallet: 'BLK8wVnK3sKjR6sT1vWxY9zA2bC7dE4fG6hJ5kL8mNw' },
      stakes: 5,
    },
  ],
  totalFights: 4,
  prizePool: 125,
  hypeScore: 87,
};

// Mock data for upcoming tournaments
const UPCOMING_TOURNAMENTS = [
  {
    id: 'tourney-1',
    name: 'Weekly Degen Cup',
    type: 'Single Elimination',
    startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    entryFee: 0.5,
    maxPlayers: 16,
    registered: 12,
    prizePool: 7.6,
  },
  {
    id: 'tourney-2',
    name: 'High Roller Invitational',
    type: 'Double Elimination',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    entryFee: 2,
    maxPlayers: 8,
    registered: 5,
    prizePool: 15.2,
  },
  {
    id: 'tourney-3',
    name: 'Rookie Rumble',
    type: 'Single Elimination',
    startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
    entryFee: 0.1,
    maxPlayers: 32,
    registered: 18,
    prizePool: 3.04,
  },
  {
    id: 'tourney-4',
    name: 'Memecoin Madness',
    type: 'Double Elimination',
    startTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    entryFee: 1,
    maxPlayers: 16,
    registered: 14,
    prizePool: 15.2,
  },
  {
    id: 'tourney-5',
    name: 'Friday Night Fights',
    type: 'Single Elimination',
    startTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
    entryFee: 0.25,
    maxPlayers: 32,
    registered: 27,
    prizePool: 6.41,
  },
  {
    id: 'tourney-6',
    name: 'Whale Wars Championship',
    type: 'Double Elimination',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    entryFee: 5,
    maxPlayers: 8,
    registered: 3,
    prizePool: 38,
  },
  {
    id: 'tourney-7',
    name: 'Paper Hands Gauntlet',
    type: 'Single Elimination',
    startTime: new Date(Date.now() + 36 * 60 * 60 * 1000),
    entryFee: 0.1,
    maxPlayers: 64,
    registered: 41,
    prizePool: 6.08,
  },
  {
    id: 'tourney-8',
    name: 'CT Legends Invitational',
    type: 'Double Elimination',
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    entryFee: 3,
    maxPlayers: 16,
    registered: 7,
    prizePool: 45.6,
  },
];

// Mock profiles so UserAvatar renders preset PFPs for demo fighters
const MOCK_PROFILES: UserProfile[] = [
  { walletAddress: '7xKp9mN3qR2sT8vW4yZ1aB5cD6eF7gH8jK9mN3qR2sT8', username: 'DegenKing', pfpType: 'preset', presetId: 'spartan', updatedAt: 1 },
  { walletAddress: '3mNqP7rS2tU9vWxY4zA1bC5dE6fG7hJ8kL9mNqP7rS2t', username: 'SolWhale.sol', pfpType: 'preset', presetId: 'dogwifhat', updatedAt: 1 },
  { walletAddress: '9pLmK4nR7sT2vWxY1zA3bC5dE8fG9hJ2kL4mNpK7rS2t', username: 'CryptoApe', pfpType: 'preset', presetId: 'ape', updatedAt: 1 },
  { walletAddress: '2jHnM7pR4sT9vWxY3zA5bC1dE6fG8hJ2kL7mNjH4pR9s', username: 'MoonBoi', pfpType: 'preset', presetId: 'moon', updatedAt: 1 },
  { walletAddress: '5xBcD1mPqR7sT4vWxY2zA6bC3dE9fG5hJ8kL1mNxB2cD', username: 'DiamondHands', pfpType: 'preset', presetId: 'diamond-hands', updatedAt: 1 },
  { walletAddress: '8wVnK3sKjR6sT1vWxY9zA2bC7dE4fG6hJ5kL8mNwV3nK', username: 'Rekt420', pfpType: 'preset', presetId: 'clown', updatedAt: 1 },
  // Main card fighters
  { walletAddress: 'GCR1xKp9mN3qR2sT8vW4yZ1aB5cD6eF7gH8jK9mN3qR', username: 'GCR.eth', pfpType: 'preset', presetId: 'gigachad', updatedAt: 1 },
  { walletAddress: 'HSK3mNqP7rS2tU9vWxY4zA1bC5dE6fG7hJ8kL9mNqP7', username: 'Hsaka', pfpType: 'preset', presetId: 'mog', updatedAt: 1 },
  { walletAddress: 'COB9pLmK4nR7sT2vWxY1zA3bC5dE8fG9hJ2kL4mNpK7', username: 'Cobie', pfpType: 'preset', presetId: 'pengu', updatedAt: 1 },
  { walletAddress: 'LMD2jHnM7pR4sT9vWxY3zA5bC1dE6fG8hJ2kL7mNjH4', username: 'Loomdart', pfpType: 'preset', presetId: 'brett', updatedAt: 1 },
  { walletAddress: 'ANS5xBcD1mPqR7sT4vWxY2zA6bC3dE9fG5hJ8kL1mNx', username: 'Ansem', pfpType: 'preset', presetId: 'popcat', updatedAt: 1 },
  { walletAddress: 'BLK8wVnK3sKjR6sT1vWxY9zA2bC7dE4fG6hJ5kL8mNw', username: 'Blknoiz06', pfpType: 'preset', presetId: 'bonk', updatedAt: 1 },
];

function formatCountdown(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return 'LIVE';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WatchPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFeed, setShowMobileFeed] = useState(false);

  // Seed mock profiles into cache so UserAvatar renders preset PFPs for demo fighters
  const mockSeededRef = useRef(false);
  useEffect(() => {
    if (!mockSeededRef.current) {
      setCachedProfiles(MOCK_PROFILES);
      mockSeededRef.current = true;
    }
  }, []);

  // Ticking countdown for main card
  const [mainCardCountdown, setMainCardCountdown] = useState(() => {
    const diff = NEXT_MAIN_CARD.date.getTime() - Date.now();
    if (diff <= 0) return 'LIVE NOW';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${d}d ${h}h ${m}m ${s}s`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = NEXT_MAIN_CARD.date.getTime() - Date.now();
      if (diff <= 0) {
        setMainCardCountdown('LIVE NOW');
        clearInterval(interval);
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setMainCardCountdown(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: Show full-screen feed when activated
  if (isMobile && showMobileFeed) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMobileFeed(false)}
          className="fixed top-20 left-4 z-50 px-3 py-2 rounded-lg bg-black/80 border border-white/20 text-white text-sm font-medium hover:bg-black/90 transition-colors active:scale-95"
        >
          ← Back
        </button>
        <WatchViewer />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
          Watch
        </h1>
        <p className="text-white/60">Spectate live battles and bet on the action</p>
      </div>

      {/* Mobile: Enter Feed CTA */}
      {isMobile && (
        <button
          onClick={() => setShowMobileFeed(true)}
          className="w-full mb-8 p-6 rounded-xl bg-gradient-to-r from-fire/20 via-rust/20 to-fire/20 border border-fire/40 hover:border-fire/60 transition-all group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-fire/20 border border-fire/40 flex items-center justify-center">
                <Play className="w-6 h-6 text-fire ml-1" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
                  </span>
                  <span className="text-sm font-bold text-fire uppercase tracking-wider">Live Now</span>
                </div>
                <h2 className="text-xl font-black text-white">Enter Battle Feed</h2>
                <p className="text-sm text-white/50">Swipe • Bet • Chat</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white/40" />
          </div>
        </button>
      )}

      {/* Desktop: Live Battles - Exciting Broadcast Style */}
      {!isMobile && (
        <section className="mb-8">
          {/* Header with live indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/20 border border-danger/40">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                </span>
                <span className="text-xs font-bold text-danger uppercase tracking-wider">Live Now</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-white" style={{ fontFamily: 'Impact, sans-serif' }}>
                Battle Arena
              </h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {MOCK_LIVE_BATTLES.reduce((acc, b) => acc + b.spectators, 0)} watching
              </span>
              <span className="flex items-center gap-1.5">
                <Swords className="w-4 h-4" />
                {MOCK_LIVE_BATTLES.length} battles
              </span>
            </div>
          </div>

          {/* Featured Battle - Hero Section */}
          {MOCK_LIVE_BATTLES.filter(b => b.featured).map((battle) => (
            <div key={battle.id} className="mb-6 relative overflow-hidden rounded-2xl">
              {/* Animated background gradient based on who's winning */}
              <div className={`absolute inset-0 ${
                battle.fighter1.pnl > battle.fighter2.pnl
                  ? 'bg-gradient-to-r from-success/20 via-transparent to-danger/10'
                  : 'bg-gradient-to-r from-danger/10 via-transparent to-success/20'
              }`} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fire/5 via-transparent to-transparent" />

              <div className="relative border border-fire/30 rounded-2xl overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-fire/20">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-fire/20 border border-fire/40">
                      <Flame className="w-4 h-4 text-fire animate-pulse" />
                      <span className="text-xs font-bold text-fire uppercase">Featured</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-warning" />
                      <span className="font-bold text-white">{battle.asset}</span>
                    </div>
                    <span className="text-xs text-white/40">High Stakes</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-white/60">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">{battle.spectators}</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-danger/20 border border-danger/40">
                      <span className="text-lg font-mono font-bold text-danger">{formatTime(battle.timeRemaining)}</span>
                    </div>
                  </div>
                </div>

                {/* Main battle display */}
                <div className="p-8 bg-black/40">
                  <div className="flex items-center justify-between gap-8">
                    {/* Fighter 1 */}
                    <div className="flex-1 text-center">
                      <div className={`relative inline-block mb-4 ${battle.fighter1.pnl > battle.fighter2.pnl ? 'animate-pulse' : ''}`}>
                        <div className={`rounded-full overflow-hidden border-4 ${
                          battle.fighter1.pnl > 0
                            ? 'border-success shadow-[0_0_30px_rgba(127,186,0,0.4)]'
                            : 'border-danger shadow-[0_0_30px_rgba(204,34,0,0.4)]'
                        }`}>
                          <UserAvatar walletAddress={battle.fighter1.wallet} size="3xl" />
                        </div>
                        {battle.fighter1.pnl > battle.fighter2.pnl && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-warning flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-black" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
                        {battle.fighter1.name}
                      </h3>
                      <div className="text-sm text-white/50 mb-2">{battle.fighter1.record} • {battle.fighter1.elo} ELO</div>
                      <div className={`inline-block px-4 py-2 rounded-lg text-2xl font-black ${
                        battle.fighter1.pnl >= 0
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                      }`}>
                        {battle.fighter1.pnl >= 0 ? '+' : ''}{battle.fighter1.pnl.toFixed(1)}%
                      </div>
                      {/* Quick bet button */}
                      <button
                        onClick={(e) => { e.preventDefault(); }}
                        className="mt-4 w-full py-2 rounded-lg bg-white/5 border border-white/20 hover:border-success/50 hover:bg-success/10 transition-all text-sm font-bold text-white/70 hover:text-success"
                      >
                        Bet @ {battle.odds.fighter1.toFixed(2)}x
                      </button>
                    </div>

                    {/* VS + Stakes */}
                    <div className="text-center px-6">
                      <div className="relative">
                        <div className="text-6xl font-black text-fire mb-2 animate-pulse" style={{ fontFamily: 'Impact, sans-serif', textShadow: '0 0 40px rgba(255,85,0,0.5)' }}>
                          VS
                        </div>
                        {/* Momentum bar */}
                        <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden mb-4">
                          <div
                            className="h-full bg-gradient-to-r from-success to-success transition-all duration-500"
                            style={{
                              width: `${Math.max(10, Math.min(90, 50 + (battle.fighter1.pnl - battle.fighter2.pnl) * 2))}%`
                            }}
                          />
                        </div>
                        <div className="text-3xl font-black text-white mb-1">{battle.stakes} SOL</div>
                        <div className="text-sm text-white/40">Prize Pool</div>
                        <div className="mt-4 text-xs text-white/30">
                          {battle.totalBets} SOL in bets
                        </div>
                      </div>
                    </div>

                    {/* Fighter 2 */}
                    <div className="flex-1 text-center">
                      <div className={`relative inline-block mb-4 ${battle.fighter2.pnl > battle.fighter1.pnl ? 'animate-pulse' : ''}`}>
                        <div className={`rounded-full overflow-hidden border-4 ${
                          battle.fighter2.pnl > 0
                            ? 'border-success shadow-[0_0_30px_rgba(127,186,0,0.4)]'
                            : 'border-danger shadow-[0_0_30px_rgba(204,34,0,0.4)]'
                        }`}>
                          <UserAvatar walletAddress={battle.fighter2.wallet} size="3xl" />
                        </div>
                        {battle.fighter2.pnl > battle.fighter1.pnl && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-warning flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-black" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
                        {battle.fighter2.name}
                      </h3>
                      <div className="text-sm text-white/50 mb-2">{battle.fighter2.record} • {battle.fighter2.elo} ELO</div>
                      <div className={`inline-block px-4 py-2 rounded-lg text-2xl font-black ${
                        battle.fighter2.pnl >= 0
                          ? 'bg-success/20 text-success'
                          : 'bg-danger/20 text-danger'
                      }`}>
                        {battle.fighter2.pnl >= 0 ? '+' : ''}{battle.fighter2.pnl.toFixed(1)}%
                      </div>
                      {/* Quick bet button */}
                      <button
                        onClick={(e) => { e.preventDefault(); }}
                        className="mt-4 w-full py-2 rounded-lg bg-white/5 border border-white/20 hover:border-success/50 hover:bg-success/10 transition-all text-sm font-bold text-white/70 hover:text-success"
                      >
                        Bet @ {battle.odds.fighter2.toFixed(2)}x
                      </button>
                    </div>
                  </div>
                </div>

                {/* Watch CTA */}
                <Link
                  href={`/spectate/${battle.id}`}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-fire hover:bg-fire/90 transition-colors"
                >
                  <Play className="w-5 h-5 text-black fill-black" />
                  <span className="font-black text-black uppercase tracking-wider">Watch Live</span>
                </Link>
              </div>
            </div>
          ))}

          {/* Other Live Battles - Compact but exciting */}
          <div className="grid md:grid-cols-2 gap-4">
            {MOCK_LIVE_BATTLES.filter(b => !b.featured).map((battle) => (
              <Link
                key={battle.id}
                href={`/spectate/${battle.id}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-fire/40 transition-all"
              >
                {/* Background glow based on intensity */}
                <div className={`absolute inset-0 ${
                  battle.intensity === 'high'
                    ? 'bg-gradient-to-br from-fire/10 via-transparent to-transparent'
                    : 'bg-black/40'
                }`} />

                <div className="relative p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {battle.intensity === 'high' && (
                        <Flame className="w-4 h-4 text-fire animate-pulse" />
                      )}
                      <span className="font-bold text-white">{battle.asset}</span>
                      <span className="text-xs text-white/40">{battle.stakes} SOL</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/50 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {battle.spectators}
                      </span>
                      <span className="text-sm font-mono font-bold text-fire">{formatTime(battle.timeRemaining)}</span>
                    </div>
                  </div>

                  {/* Fighters face-off */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Fighter 1 */}
                    <div className="flex-1 flex items-center gap-3">
                      <div className={`rounded-full overflow-hidden border-2 ${
                        battle.fighter1.pnl > battle.fighter2.pnl
                          ? 'border-success'
                          : 'border-white/20'
                      }`}>
                        <UserAvatar walletAddress={battle.fighter1.wallet} size="xl" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{battle.fighter1.name}</div>
                        <div className={`text-lg font-black ${battle.fighter1.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {battle.fighter1.pnl >= 0 ? '+' : ''}{battle.fighter1.pnl.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* VS */}
                    <div className="text-center">
                      <div className="text-xl font-black text-fire/60" style={{ fontFamily: 'Impact, sans-serif' }}>VS</div>
                      {/* Mini momentum bar */}
                      <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden mt-1">
                        <div
                          className="h-full bg-success transition-all"
                          style={{ width: `${Math.max(10, Math.min(90, 50 + (battle.fighter1.pnl - battle.fighter2.pnl) * 3))}%` }}
                        />
                      </div>
                    </div>

                    {/* Fighter 2 */}
                    <div className="flex-1 flex items-center gap-3 justify-end">
                      <div className="text-right">
                        <div className="font-bold text-white text-sm">{battle.fighter2.name}</div>
                        <div className={`text-lg font-black ${battle.fighter2.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {battle.fighter2.pnl >= 0 ? '+' : ''}{battle.fighter2.pnl.toFixed(1)}%
                        </div>
                      </div>
                      <div className={`rounded-full overflow-hidden border-2 ${
                        battle.fighter2.pnl > battle.fighter1.pnl
                          ? 'border-success'
                          : 'border-white/20'
                      }`}>
                        <UserAvatar walletAddress={battle.fighter2.wallet} size="xl" />
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.preventDefault(); }}
                        className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-white/60 hover:text-white transition-all"
                      >
                        {battle.odds.fighter1.toFixed(1)}x
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); }}
                        className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-white/60 hover:text-white transition-all"
                      >
                        {battle.odds.fighter2.toFixed(1)}x
                      </button>
                    </div>
                    <span className="text-xs text-fire font-bold uppercase group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Watch <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Next Main Card - Dramatic UFC-Style Fight Card */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-fire" />
            Next Main Card
          </h2>
          <Link href="/events" className="text-sm text-fire hover:text-fire/80 transition-colors">
            View All Events →
          </Link>
        </div>

        {/* Animated outer glow */}
        <div className="relative">
          <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-fire via-warning to-fire opacity-60 animate-pulse blur-sm" />
          <div className="relative rounded-2xl bg-black/95 border border-fire/40 overflow-hidden">

            {/* Event Header - Animated gradient */}
            <div className="relative px-6 py-5 bg-gradient-to-r from-fire/20 via-warning/10 to-fire/20 border-b border-fire/30 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fire/10 via-transparent to-transparent" />
              <div className="relative flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-5 h-5 text-fire animate-pulse" />
                    <h3 className="text-2xl font-black text-white uppercase tracking-[0.15em]" style={{ fontFamily: 'Impact, sans-serif' }}>
                      {NEXT_MAIN_CARD.eventName}
                    </h3>
                  </div>
                  <p className="text-sm text-white/50 italic">{NEXT_MAIN_CARD.tagline}</p>
                </div>
                <div className="text-right">
                  <div
                    className="text-3xl font-black text-fire font-mono"
                    style={{ textShadow: '0 0 20px rgba(255,85,0,0.5)' }}
                  >
                    {mainCardCountdown}
                  </div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">until event</div>
                </div>
              </div>
            </div>

            {/* Main Event */}
            <div className="p-6 md:p-8">
              <div className="text-center mb-6">
                <span className="inline-block px-4 py-1 rounded-full bg-fire/20 border border-fire/40 text-fire text-xs uppercase tracking-[0.2em] font-black">
                  Main Event
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 md:gap-8">
                {/* Fighter 1 */}
                <div className="flex-1 text-center">
                  <div className="relative inline-block mb-3">
                    <div className="rounded-full overflow-hidden border-4 border-fire shadow-[0_0_30px_rgba(255,85,0,0.4)]">
                      <UserAvatar walletAddress={NEXT_MAIN_CARD.mainEvent.fighter1.wallet} size="3xl" />
                    </div>
                    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-warning text-black text-[10px] font-black">
                      {NEXT_MAIN_CARD.mainEvent.fighter1.winStreak}W
                    </div>
                  </div>
                  <h4 className="text-xl md:text-2xl font-black text-white mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
                    {NEXT_MAIN_CARD.mainEvent.fighter1.name}
                  </h4>
                  <div className="text-sm text-white/50 mb-1">{NEXT_MAIN_CARD.mainEvent.fighter1.record}</div>
                  <div className="text-xs text-warning font-bold">{NEXT_MAIN_CARD.mainEvent.fighter1.elo} ELO</div>
                  <button
                    onClick={(e) => { e.preventDefault(); }}
                    className="mt-3 px-4 py-2 rounded-lg bg-white/5 border border-white/20 hover:border-fire/50 hover:bg-fire/10 transition-all text-sm font-bold text-white/70 hover:text-fire"
                  >
                    Bet @ {NEXT_MAIN_CARD.mainEvent.odds.fighter1.toFixed(2)}x
                  </button>
                </div>

                {/* VS + Stakes */}
                <div className="text-center px-2 md:px-6">
                  <div
                    className="text-5xl md:text-7xl font-black text-fire animate-pulse"
                    style={{ fontFamily: 'Impact, sans-serif', textShadow: '0 0 40px rgba(255,85,0,0.6), 0 0 80px rgba(255,85,0,0.3)' }}
                  >
                    VS
                  </div>
                  <div className="text-2xl font-black text-white mt-2">{NEXT_MAIN_CARD.mainEvent.stakes} SOL</div>
                  <div className="text-xs text-white/40">Stakes</div>
                </div>

                {/* Fighter 2 */}
                <div className="flex-1 text-center">
                  <div className="relative inline-block mb-3">
                    <div className="rounded-full overflow-hidden border-4 border-fire shadow-[0_0_30px_rgba(255,85,0,0.4)]">
                      <UserAvatar walletAddress={NEXT_MAIN_CARD.mainEvent.fighter2.wallet} size="3xl" />
                    </div>
                    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-warning text-black text-[10px] font-black">
                      {NEXT_MAIN_CARD.mainEvent.fighter2.winStreak}W
                    </div>
                  </div>
                  <h4 className="text-xl md:text-2xl font-black text-white mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
                    {NEXT_MAIN_CARD.mainEvent.fighter2.name}
                  </h4>
                  <div className="text-sm text-white/50 mb-1">{NEXT_MAIN_CARD.mainEvent.fighter2.record}</div>
                  <div className="text-xs text-warning font-bold">{NEXT_MAIN_CARD.mainEvent.fighter2.elo} ELO</div>
                  <button
                    onClick={(e) => { e.preventDefault(); }}
                    className="mt-3 px-4 py-2 rounded-lg bg-white/5 border border-white/20 hover:border-fire/50 hover:bg-fire/10 transition-all text-sm font-bold text-white/70 hover:text-fire"
                  >
                    Bet @ {NEXT_MAIN_CARD.mainEvent.odds.fighter2.toFixed(2)}x
                  </button>
                </div>
              </div>
            </div>

            {/* Undercard */}
            <div className="px-6 md:px-8 pb-6 space-y-3">
              <div className="text-center mb-2">
                <span className="text-xs text-white/40 uppercase tracking-[0.15em] font-bold">Undercard</span>
              </div>
              {NEXT_MAIN_CARD.undercard.map((bout, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  {/* Fighter 1 */}
                  <div className="flex items-center gap-2 flex-1">
                    <div className="rounded-full overflow-hidden border-2 border-white/20">
                      <UserAvatar walletAddress={bout.fighter1.wallet} size="xl" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{bout.fighter1.name}</div>
                      <div className="text-xs text-white/40">{bout.fighter1.record}</div>
                    </div>
                  </div>

                  {/* VS + Stakes */}
                  <div className="text-center shrink-0">
                    <div className="text-sm font-black text-fire/60" style={{ fontFamily: 'Impact, sans-serif' }}>VS</div>
                    <div className="text-[10px] text-white/40">{bout.stakes} SOL</div>
                  </div>

                  {/* Fighter 2 */}
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <div className="text-right">
                      <div className="font-bold text-white text-sm">{bout.fighter2.name}</div>
                      <div className="text-xs text-white/40">{bout.fighter2.record}</div>
                    </div>
                    <div className="rounded-full overflow-hidden border-2 border-white/20">
                      <UserAvatar walletAddress={bout.fighter2.wallet} size="xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Bar */}
            <div className="px-6 md:px-8 pb-6">
              <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-white">{NEXT_MAIN_CARD.totalFights}</div>
                  <div className="text-[10px] text-white/40 uppercase">Fights</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-fire">{NEXT_MAIN_CARD.prizePool} SOL</div>
                  <div className="text-[10px] text-white/40 uppercase">Prize Pool</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-warning">{NEXT_MAIN_CARD.hypeScore}%</div>
                  <div className="text-[10px] text-white/40 uppercase">Hype</div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-fire to-warning transition-all"
                      style={{ width: `${NEXT_MAIN_CARD.hypeScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 md:px-8 pb-6">
              <Link
                href="/events"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gradient-to-r from-fire to-warning hover:from-fire/90 hover:to-warning/90 transition-all active:scale-[0.98]"
              >
                <Zap className="w-5 h-5 text-black" />
                <span className="text-lg font-black text-black uppercase tracking-wider" style={{ fontFamily: 'Impact, sans-serif' }}>
                  View Full Card & Bet
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Upcoming Tournaments
          </h2>
          <Link href="/tournaments" className="text-sm text-fire hover:text-fire/80 transition-colors">
            View All →
          </Link>
        </div>

        <div className="grid gap-4">
          {UPCOMING_TOURNAMENTS.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/tournaments`}
              className="block rounded-xl bg-black/40 border border-white/10 hover:border-rust/40 p-4 transition-all group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-white truncate">{tournament.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-white/60 uppercase shrink-0">
                      {tournament.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/50 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatCountdown(tournament.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {tournament.registered}/{tournament.maxPlayers}
                    </span>
                    <span>{tournament.entryFee} SOL entry</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-warning">{tournament.prizePool} SOL</div>
                  <div className="text-xs text-white/40">Prize Pool</div>
                </div>

                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
