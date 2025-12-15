'use client';

import { useState, type ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'all';

const MOCK_LEADERBOARD = [
  { rank: 1, address: '7xKp...3mNq', wins: 47, losses: 12, winRate: 79.7, totalPnl: 156.32, avgPnl: 8.42, streak: 7 },
  { rank: 2, address: '9aRt...7kLm', wins: 38, losses: 15, winRate: 71.7, totalPnl: 98.45, avgPnl: 6.21, streak: 4 },
  { rank: 3, address: '4bYu...2pWx', wins: 52, losses: 23, winRate: 69.3, totalPnl: 87.21, avgPnl: 5.83, streak: 2 },
  { rank: 4, address: '2cDe...9qZa', wins: 29, losses: 14, winRate: 67.4, totalPnl: 72.18, avgPnl: 5.12, streak: 5 },
  { rank: 5, address: '8fGh...1sRb', wins: 41, losses: 21, winRate: 66.1, totalPnl: 65.90, avgPnl: 4.89, streak: 0 },
  { rank: 6, address: '3iJk...5tUc', wins: 33, losses: 18, winRate: 64.7, totalPnl: 58.33, avgPnl: 4.56, streak: 3 },
  { rank: 7, address: '6lMn...8vWd', wins: 27, losses: 16, winRate: 62.8, totalPnl: 45.67, avgPnl: 4.21, streak: 0 },
  { rank: 8, address: '1oOp...4xYe', wins: 24, losses: 15, winRate: 61.5, totalPnl: 38.92, avgPnl: 3.98, streak: 1 },
  { rank: 9, address: '5qQr...0zAf', wins: 31, losses: 20, winRate: 60.8, totalPnl: 32.15, avgPnl: 3.67, streak: 0 },
  { rank: 10, address: '0sSt...6bBg', wins: 19, losses: 13, winRate: 59.4, totalPnl: 28.44, avgPnl: 3.45, streak: 2 },
];

const TIME_FILTERS: { value: TimeFilter; label: string; icon: ReactNode }[] = [
  {
    value: 'daily',
    label: 'Today',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    value: 'weekly',
    label: 'This Week',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'monthly',
    label: 'This Season',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    value: 'all',
    label: 'All Time',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
];

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
      );
    case 2:
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg shadow-gray-400/30">
          <span className="text-lg font-black text-white">2</span>
        </div>
      );
    case 3:
      return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-600/30">
          <span className="text-lg font-black text-white">3</span>
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
          <span className="text-lg font-bold text-text-tertiary">{rank}</span>
        </div>
      );
  }
};

export default function LeaderboardPage() {
  const { publicKey, connected } = useWallet();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30 text-warning text-sm font-bold uppercase tracking-wider mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Greatest Warriors
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
          HALL OF <span className="text-warning">WARLORDS</span>
        </h1>

        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-6">
          The deadliest degens in the wasteland. Legends forged in fire and blood. Will you claim your throne among them?
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="relative card overflow-hidden border border-warning/20">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center border border-warning/30">
                <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs text-text-tertiary uppercase tracking-wider">Total Battles</span>
            </div>
            <div className="text-2xl font-black">2,847</div>
          </div>
        </div>

        <div className="relative card overflow-hidden border border-success/20">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center border border-success/30">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-text-tertiary uppercase tracking-wider">Total Loot</span>
            </div>
            <div className="text-2xl font-black">15,234 SOL</div>
          </div>
        </div>

        <div className="relative card overflow-hidden border border-accent/20">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs text-text-tertiary uppercase tracking-wider">Active Warriors</span>
            </div>
            <div className="text-2xl font-black">892</div>
          </div>
        </div>

        <div className="relative card overflow-hidden border border-danger/20">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-danger/20 flex items-center justify-center border border-danger/30">
                <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <span className="text-xs text-text-tertiary uppercase tracking-wider">Kill Streaks</span>
            </div>
            <div className="text-2xl font-black">127</div>
          </div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex items-center gap-2 mb-8 p-1.5 rounded-xl bg-bg-secondary border border-warning/20 inline-flex">
        {TIME_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTimeFilter(filter.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
              timeFilter === filter.value
                ? 'bg-warning text-bg-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {/* 2nd Place */}
        <div className="order-2 md:order-1 relative">
          <div className="card overflow-hidden border-2 border-gray-500/30">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500" />
            <div className="p-5 text-center">
              {getRankBadge(2)}
              <div className="absolute top-4 right-4">
                <div className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  Lieutenant
                </div>
              </div>
              <div className="mt-4 font-mono font-semibold">{MOCK_LEADERBOARD[1].address}</div>
              <div className="mt-3 flex items-center justify-center gap-4">
                <div>
                  <div className="text-xs text-text-tertiary uppercase tracking-wider">Kill Rate</div>
                  <div className="font-bold text-success">{MOCK_LEADERBOARD[1].winRate}%</div>
                </div>
                <div className="w-px h-8 bg-border-primary" />
                <div>
                  <div className="text-xs text-text-tertiary uppercase tracking-wider">Loot</div>
                  <div className="font-mono font-bold text-success">+{MOCK_LEADERBOARD[1].totalPnl.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1st Place */}
        <div className="order-1 md:order-2 relative">
          <div className="card overflow-hidden border-2 border-warning/50 shadow-lg shadow-warning/10">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-warning via-fire to-danger" />
            <div className="absolute inset-0 bg-gradient-to-b from-warning/5 to-transparent" />
            <div className="relative p-6 text-center">
              {getRankBadge(1)}
              <div className="absolute top-4 right-4">
                <div className="px-2 py-1 rounded-full bg-warning/20 text-warning text-[10px] font-bold uppercase tracking-wider">
                  Warlord
                </div>
              </div>
              <div className="mt-4 font-mono text-lg font-bold">{MOCK_LEADERBOARD[0].address}</div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                  <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wider">Kill Rate</div>
                  <div className="text-xl font-bold text-success">{MOCK_LEADERBOARD[0].winRate}%</div>
                </div>
                <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                  <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wider">Total Loot</div>
                  <div className="text-xl font-mono font-bold text-success">+{MOCK_LEADERBOARD[0].totalPnl.toFixed(2)}</div>
                </div>
              </div>
              {MOCK_LEADERBOARD[0].streak > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                  <span className="text-danger font-bold uppercase tracking-wider">{MOCK_LEADERBOARD[0].streak} Kill Streak</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="order-3 relative">
          <div className="card overflow-hidden border-2 border-amber-700/30">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700 to-amber-800" />
            <div className="p-5 text-center">
              {getRankBadge(3)}
              <div className="absolute top-4 right-4">
                <div className="px-2 py-1 rounded-full bg-amber-700/20 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                  Sergeant
                </div>
              </div>
              <div className="mt-4 font-mono font-semibold">{MOCK_LEADERBOARD[2].address}</div>
              <div className="mt-3 flex items-center justify-center gap-4">
                <div>
                  <div className="text-xs text-text-tertiary uppercase tracking-wider">Kill Rate</div>
                  <div className="font-bold text-success">{MOCK_LEADERBOARD[2].winRate}%</div>
                </div>
                <div className="w-px h-8 bg-border-primary" />
                <div>
                  <div className="text-xs text-text-tertiary uppercase tracking-wider">Loot</div>
                  <div className="font-mono font-bold text-success">+{MOCK_LEADERBOARD[2].totalPnl.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="card p-0 overflow-hidden border border-warning/20">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-4 bg-bg-tertiary border-b border-warning/20 text-text-tertiary text-xs font-bold uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">Warrior</div>
          <div className="col-span-2 text-center">Record</div>
          <div className="col-span-2 text-center">Kill Rate</div>
          <div className="col-span-2 text-right">Total Loot</div>
          <div className="col-span-2 text-right">Avg Loot</div>
        </div>

        {/* Table Rows */}
        {MOCK_LEADERBOARD.slice(3).map((trader) => (
          <div
            key={trader.rank}
            className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-border-primary items-center hover:bg-bg-tertiary/50 transition-colors group"
          >
            <div className="col-span-1">
              {getRankBadge(trader.rank)}
            </div>
            <div className="col-span-3">
              <div className="flex items-center gap-3">
                <div className="font-mono font-semibold">{trader.address}</div>
                {trader.streak >= 3 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 border border-danger/30">
                    <svg className="w-3 h-3 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                    <span className="text-[10px] font-bold text-danger">{trader.streak}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-success font-bold">{trader.wins}K</span>
              <span className="text-text-tertiary mx-1">/</span>
              <span className="text-danger font-bold">{trader.losses}D</span>
            </div>
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-20 h-2 rounded-full bg-bg-hover overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success to-success/70 rounded-full transition-all duration-500"
                    style={{ width: `${trader.winRate}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-success">{trader.winRate}%</span>
              </div>
            </div>
            <div className="col-span-2 text-right">
              <span className="font-mono font-bold text-success">+{trader.totalPnl.toFixed(2)} SOL</span>
            </div>
            <div className="col-span-2 text-right">
              <span className="font-mono text-text-secondary">+{trader.avgPnl.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Your Stats */}
      <div className="card mt-8 border border-accent/20">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg uppercase tracking-wide">Your War Record</h2>
            <p className="text-text-tertiary text-xs">Track your kills and loot</p>
          </div>
        </div>

        {!connected ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/30">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h3 className="font-bold mb-1 uppercase">Identity Required</h3>
            <p className="text-text-secondary text-sm">Connect your wallet to see your ranking and war record</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary">
              <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wider">Your Rank</div>
              <div className="text-2xl font-black text-text-tertiary">--</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary">
              <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wider">Kill Rate</div>
              <div className="text-2xl font-black text-text-tertiary">--%</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary">
              <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wider">Total Loot</div>
              <div className="text-2xl font-mono font-black text-text-tertiary">-- SOL</div>
            </div>
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary">
              <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wider">Battles</div>
              <div className="text-2xl font-black text-text-tertiary">0</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
