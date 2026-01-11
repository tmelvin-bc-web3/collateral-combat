'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/utils';
import { LevelBadge } from '@/components/progression/LevelBadge';
import { UserStreak, STREAK_BONUSES } from '@/types';

// Reward type definition
interface LevelReward {
  type: string;
  name: string;
  icon: string;
  gameType?: string;
  count?: number;
  permanent?: boolean;
}

// Level tier data
const LEVEL_TIERS = [
  { minLevel: 1, maxLevel: 5, title: 'Rookie', color: 'from-gray-500 to-slate-600', textColor: 'text-gray-400' },
  { minLevel: 6, maxLevel: 10, title: 'Contender', color: 'from-green-500 to-emerald-600', textColor: 'text-green-400' },
  { minLevel: 11, maxLevel: 20, title: 'Warrior', color: 'from-blue-500 to-indigo-600', textColor: 'text-blue-400' },
  { minLevel: 21, maxLevel: 35, title: 'Veteran', color: 'from-red-500 to-rose-700', textColor: 'text-red-400' },
  { minLevel: 36, maxLevel: 50, title: 'Champion', color: 'from-cyan-500 to-teal-600', textColor: 'text-cyan-400' },
  { minLevel: 51, maxLevel: 75, title: 'Legend', color: 'from-amber-500 to-yellow-600', textColor: 'text-amber-400' },
  { minLevel: 76, maxLevel: 100, title: 'Mythic', color: 'from-violet-600 to-purple-800', textColor: 'text-violet-400' },
];

// XP sources
const XP_SOURCES = [
  {
    name: 'Oracle Predictions',
    description: 'Earn XP for every prediction you make',
    xpRange: '10-50 XP',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    name: 'Arena Battles',
    description: 'Compete in 1v1 trading battles for big XP rewards',
    xpRange: '100-500 XP',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    name: 'Draft Tournaments',
    description: 'Enter weekly memecoin draft tournaments',
    xpRange: '200-1000 XP',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: 'Spectator Betting',
    description: 'Watch battles and bet on the outcome',
    xpRange: '25-100 XP',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
];

// Level rewards
const LEVEL_REWARDS: { level: number; rewards: LevelReward[] }[] = [
  { level: 5, rewards: [
    { type: 'freebet', name: '1 Free Bet', icon: '🎁', count: 1 },
  ]},
  { level: 10, rewards: [
    { type: 'cosmetic', name: 'Bronze Border', icon: '🥉' },
    { type: 'freebet', name: '2 Free Bets', icon: '🎁', count: 2 },
  ]},
  { level: 15, rewards: [
    { type: 'perk', name: '9% Draft Rake', icon: '📉', gameType: 'draft' },
    { type: 'perk', name: '4.5% Oracle Rake', icon: '🔮', gameType: 'oracle' },
  ]},
  { level: 20, rewards: [
    { type: 'freebet', name: '3 Free Bets', icon: '🎁', count: 3 },
  ]},
  { level: 25, rewards: [
    { type: 'perk', name: '9% Draft Rake', icon: '📉', gameType: 'draft' },
    { type: 'perk', name: '4.5% Oracle Rake', icon: '🔮', gameType: 'oracle' },
    { type: 'cosmetic', name: 'Silver Border', icon: '🥈' },
  ]},
  { level: 35, rewards: [
    { type: 'freebet', name: '3 Free Bets', icon: '🎁', count: 3 },
  ]},
  { level: 40, rewards: [
    { type: 'perk', name: '8% Draft Rake', icon: '📉', gameType: 'draft' },
    { type: 'perk', name: '4% Oracle Rake', icon: '🔮', gameType: 'oracle' },
  ]},
  { level: 50, rewards: [
    { type: 'perk', name: '8% Draft Rake', icon: '📉', gameType: 'draft' },
    { type: 'perk', name: '4% Oracle Rake', icon: '🔮', gameType: 'oracle' },
    { type: 'cosmetic', name: 'Gold Border', icon: '🥇' },
    { type: 'freebet', name: '5 Free Bets', icon: '🎁', count: 5 },
  ]},
  { level: 75, rewards: [
    { type: 'perk', name: '7% Draft Rake', icon: '📉', gameType: 'draft' },
    { type: 'perk', name: '3.5% Oracle Rake', icon: '🔮', gameType: 'oracle' },
    { type: 'cosmetic', name: 'Platinum Border', icon: '💎' },
    { type: 'freebet', name: '5 Free Bets', icon: '🎁', count: 5 },
  ]},
  { level: 100, rewards: [
    { type: 'perk', name: '7% Draft Rake (Permanent)', icon: '📉', gameType: 'draft', permanent: true },
    { type: 'perk', name: '3.5% Oracle Rake (Permanent)', icon: '🔮', gameType: 'oracle', permanent: true },
    { type: 'cosmetic', name: 'Mythic Border', icon: '👑' },
    { type: 'freebet', name: '10 Free Bets', icon: '🎁', count: 10 },
  ]},
];

export default function ProgressionPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'perks'>('overview');
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58();

  // Fetch streak data
  useEffect(() => {
    if (!walletAddress) {
      setStreak(null);
      return;
    }

    const fetchStreak = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/progression/${walletAddress}/streak`);
        if (res.ok) {
          const data = await res.json();
          setStreak(data);
        }
      } catch (error) {
        console.error('Failed to fetch streak:', error);
      }
    };

    fetchStreak();
  }, [walletAddress]);

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-8 mt-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-black tracking-tight uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
            PROGRESSION <span className="text-accent">SYSTEM</span>
          </h1>
        </div>
        <p className="text-text-secondary">
          Level up, unlock perks, and reduce your rake. The more you play, the more you earn.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 bg-bg-secondary rounded-lg border border-rust/20">
        {(['overview', 'rewards', 'perks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-md font-semibold text-sm uppercase tracking-wider transition-all',
              activeTab === tab
                ? 'bg-fire text-white shadow-lg'
                : 'text-text-secondary hover:text-text-primary hover:bg-rust/10'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* How XP Works */}
          <div className="card border border-rust/30">
            <h2 className="text-xl font-black mb-4 uppercase tracking-wide">How XP Works</h2>
            <p className="text-text-secondary mb-6">
              Every action in the Dome earns you experience points (XP). Accumulate XP to level up,
              unlock exclusive perks, and reduce your platform fees. Higher stakes = more XP.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {XP_SOURCES.map((source) => (
                <div
                  key={source.name}
                  className={cn(
                    'p-4 rounded-lg border transition-all',
                    source.bgColor,
                    source.borderColor
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg', source.bgColor, source.color)}>
                      {source.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={cn('font-bold', source.color)}>{source.name}</h3>
                        <span className="text-xs font-mono text-text-tertiary">{source.xpRange}</span>
                      </div>
                      <p className="text-sm text-text-secondary">{source.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Level Tiers */}
          <div className="card border border-rust/30">
            <h2 className="text-xl font-black mb-4 uppercase tracking-wide">Rank Tiers</h2>
            <p className="text-text-secondary mb-6">
              As you level up, you&apos;ll earn new titles that showcase your dedication to the Dome.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {LEVEL_TIERS.map((tier) => (
                <div
                  key={tier.title}
                  className="text-center p-4 rounded-lg bg-bg-tertiary border border-rust/20"
                >
                  <div className="flex justify-center mb-2">
                    <LevelBadge level={tier.maxLevel} size="lg" />
                  </div>
                  <h3 className={cn('font-bold text-sm', tier.textColor)}>{tier.title}</h3>
                  <p className="text-xs text-text-tertiary mt-1">
                    Lvl {tier.minLevel}-{tier.maxLevel}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card border border-rust/30 text-center">
              <div className="text-4xl font-black text-accent mb-2">100</div>
              <div className="text-sm text-text-secondary uppercase tracking-wider">Max Level</div>
            </div>
            <div className="card border border-rust/30 text-center">
              <div className="text-4xl font-black text-success mb-2">7%</div>
              <div className="text-sm text-text-secondary uppercase tracking-wider">Lowest Rake</div>
            </div>
            <div className="card border border-rust/30 text-center">
              <div className="text-4xl font-black text-warning mb-2">7</div>
              <div className="text-sm text-text-secondary uppercase tracking-wider">Reward Milestones</div>
            </div>
          </div>

          {/* Streak Bonuses */}
          <div className="card border border-fire/30 bg-fire/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-fire/20 flex items-center justify-center">
                <span className="text-xl">🔥</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-fire uppercase tracking-wide">Daily Streak Bonuses</h2>
                <p className="text-xs text-text-tertiary">Play daily to earn bonus XP</p>
              </div>
            </div>

            <p className="text-text-secondary text-sm mb-6">
              Place at least one bet every day to build your streak. The longer your streak, the more bonus XP you earn!
            </p>

            {/* Current Streak Status */}
            {walletAddress && streak && (
              <div className="mb-6 p-4 rounded-lg bg-bg-tertiary border border-fire/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Your Current Streak</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-fire">{streak.currentStreak}</span>
                      <span className="text-text-secondary">days</span>
                      {streak.bonusPercent > 0 && (
                        <span className="px-2 py-1 rounded bg-fire/20 text-fire text-sm font-bold">
                          +{streak.bonusPercent}% XP
                        </span>
                      )}
                    </div>
                    {streak.atRisk && (
                      <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1">
                        <span>⚠️</span> Bet today to keep your streak!
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Longest Streak</p>
                    <span className="text-2xl font-bold text-text-secondary">{streak.longestStreak}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Streak Tiers */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {STREAK_BONUSES.slice().reverse().map((tier, idx) => {
                const isActive = streak && streak.currentStreak >= tier.minDays;
                const isCurrentTier = streak &&
                  streak.currentStreak >= tier.minDays &&
                  (idx === 0 || streak.currentStreak < STREAK_BONUSES.slice().reverse()[idx - 1].minDays);

                return (
                  <div
                    key={tier.minDays}
                    className={cn(
                      'text-center p-4 rounded-lg border transition-all',
                      isCurrentTier
                        ? 'bg-fire/20 border-fire shadow-lg shadow-fire/20'
                        : isActive
                        ? 'bg-fire/10 border-fire/40'
                        : 'bg-bg-tertiary border-rust/20'
                    )}
                  >
                    <div className={cn(
                      'text-2xl font-black mb-1',
                      isActive ? 'text-fire' : 'text-text-tertiary'
                    )}>
                      +{tier.bonus}%
                    </div>
                    <div className={cn(
                      'text-xs',
                      isActive ? 'text-fire/80' : 'text-text-tertiary'
                    )}>
                      {tier.minDays}+ days
                    </div>
                    {isCurrentTier && (
                      <div className="mt-2 text-[10px] text-fire font-bold uppercase">Current</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-fire/10 border border-fire/20">
              <p className="text-xs text-fire">
                <strong>Pro tip:</strong> Missing a day resets your streak to 0! Set a reminder to place at least one bet daily.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="card border border-rust/30">
            <h2 className="text-xl font-black mb-4 uppercase tracking-wide">Level Rewards</h2>
            <p className="text-text-secondary mb-6">
              Unlock powerful perks and exclusive cosmetics as you progress through the ranks.
            </p>

            <div className="space-y-4">
              {LEVEL_REWARDS.map((milestone) => (
                <div
                  key={milestone.level}
                  className="flex items-center gap-4 p-4 rounded-lg bg-bg-tertiary border border-rust/20"
                >
                  <div className="flex-shrink-0">
                    <LevelBadge level={milestone.level} size="lg" />
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {milestone.rewards.map((reward, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                            reward.type === 'perk'
                              ? reward.gameType === 'oracle'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : reward.type === 'freebet'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          )}
                        >
                          <span>{reward.icon}</span>
                          <span>{reward.name}</span>
                          {reward.permanent && (
                            <span className="text-xs bg-green-500/30 text-green-400 px-1.5 py-0.5 rounded">
                              Forever
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Perks Tab */}
      {activeTab === 'perks' && (
        <div className="space-y-6">
          {/* Perk Types Explanation */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Oracle Perks */}
            <div className="card border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-xl">🔮</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-amber-400 uppercase">Oracle Perks</h2>
                  <p className="text-xs text-text-tertiary">Base rake: 5%</p>
                </div>
              </div>

              <p className="text-text-secondary text-sm mb-4">
                Reduce your fees on Oracle predictions. Every fraction of a percent counts when you&apos;re making multiple predictions.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                  <span className="text-sm text-text-secondary">Level 15, 25</span>
                  <span className="font-bold text-amber-400">4.5% rake</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                  <span className="text-sm text-text-secondary">Level 40, 50</span>
                  <span className="font-bold text-amber-400">4% rake</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                  <span className="text-sm text-text-secondary">Level 75, 100</span>
                  <span className="font-bold text-amber-400">3.5% rake</span>
                </div>
              </div>
            </div>

            {/* Draft Perks */}
            <div className="card border border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <span className="text-xl">📉</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-purple-400 uppercase">Draft Perks</h2>
                  <p className="text-xs text-text-tertiary">Base rake: 10%</p>
                </div>
              </div>

              <p className="text-text-secondary text-sm mb-4">
                Lower your tournament entry fees. The bigger the tournament, the more you save with reduced rake.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                  <span className="text-sm text-text-secondary">Level 15, 25</span>
                  <span className="font-bold text-purple-400">9% rake</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                  <span className="text-sm text-text-secondary">Level 40, 50</span>
                  <span className="font-bold text-purple-400">8% rake</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary">
                  <span className="text-sm text-text-secondary">Level 75, 100</span>
                  <span className="font-bold text-purple-400">7% rake</span>
                </div>
              </div>
            </div>
          </div>

          {/* Free Bets */}
          <div className="card border border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-xl">🎁</span>
              </div>
              <div>
                <h2 className="text-lg font-black text-green-400 uppercase">Free Bets</h2>
                <p className="text-xs text-text-tertiary">Bonus predictions at milestones</p>
              </div>
            </div>

            <p className="text-text-secondary text-sm mb-4">
              Earn free Oracle predictions as you level up. Each free bet is a 0.01 SOL prediction - if you win, you keep the winnings!
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="text-center p-3 rounded-lg bg-bg-tertiary">
                <span className="text-lg font-bold text-green-400">1</span>
                <p className="text-xs text-text-tertiary">Level 5</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-bg-tertiary">
                <span className="text-lg font-bold text-green-400">2</span>
                <p className="text-xs text-text-tertiary">Level 10</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-bg-tertiary">
                <span className="text-lg font-bold text-green-400">3</span>
                <p className="text-xs text-text-tertiary">Level 20</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-bg-tertiary">
                <span className="text-lg font-bold text-green-400">3</span>
                <p className="text-xs text-text-tertiary">Level 35</p>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-400">
                <strong>Note:</strong> Free bets are &quot;winnings only&quot; - you keep the profit but not the original stake. Total: <strong>29 free bets</strong> by Level 100!
              </p>
            </div>
          </div>

          {/* How Perks Work */}
          <div className="card border border-rust/30">
            <h2 className="text-xl font-black mb-4 uppercase tracking-wide">How Perks Work</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-text-primary mb-1">Unlock at Milestones</h3>
                  <p className="text-sm text-text-secondary">
                    When you reach a milestone level (15, 25, 40, 50, 75, 100), you automatically receive new perks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-text-primary mb-1">Activate When Ready</h3>
                  <p className="text-sm text-text-secondary">
                    Perks are stored in your inventory. Activate them whenever you want - they last for 50 bets once activated.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-text-primary mb-1">Stack Your Savings</h3>
                  <p className="text-sm text-text-secondary">
                    You can have both Oracle and Draft perks active simultaneously. Mix and match based on what you play most.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success font-bold flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-success mb-1">Level 100 = Permanent</h3>
                  <p className="text-sm text-text-secondary">
                    Reach level 100 and your 7% Draft / 3.5% Oracle perks become permanent. No more activating - they&apos;re always on.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Calculator */}
          <div className="card border border-rust/30">
            <h2 className="text-xl font-black mb-4 uppercase tracking-wide">Savings Example</h2>
            <p className="text-text-secondary mb-4">
              See how much you could save with max-level perks over time:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rust/30">
                    <th className="text-left py-2 px-4 text-text-tertiary font-medium">Scenario</th>
                    <th className="text-right py-2 px-4 text-text-tertiary font-medium">Base Rake</th>
                    <th className="text-right py-2 px-4 text-text-tertiary font-medium">With Perk</th>
                    <th className="text-right py-2 px-4 text-text-tertiary font-medium">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-rust/20">
                    <td className="py-3 px-4 text-text-primary">100 Oracle predictions @ 0.1 SOL</td>
                    <td className="py-3 px-4 text-right text-danger font-mono">0.5 SOL</td>
                    <td className="py-3 px-4 text-right text-amber-400 font-mono">0.35 SOL</td>
                    <td className="py-3 px-4 text-right text-success font-mono">0.15 SOL</td>
                  </tr>
                  <tr className="border-b border-rust/20">
                    <td className="py-3 px-4 text-text-primary">10 Draft entries @ 1 SOL</td>
                    <td className="py-3 px-4 text-right text-danger font-mono">1.0 SOL</td>
                    <td className="py-3 px-4 text-right text-purple-400 font-mono">0.7 SOL</td>
                    <td className="py-3 px-4 text-right text-success font-mono">0.3 SOL</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-text-primary font-bold">Monthly Active Player</td>
                    <td className="py-3 px-4 text-right text-danger font-mono">~5 SOL</td>
                    <td className="py-3 px-4 text-right text-accent font-mono">~3.5 SOL</td>
                    <td className="py-3 px-4 text-right text-success font-mono font-bold">~1.5 SOL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
