'use client';

import { Shield, Swords, Award, Medal, Star, Crown, Trophy, Check, Lock } from 'lucide-react';
import { UserRankStats, RankTier, RANK_TIERS, getRankTierColor, getRankTierBgColor } from './types';

interface ProgressionTabProps {
  userStats: UserRankStats | null;
}

const RANK_ICONS: Record<RankTier, typeof Shield> = {
  rookie: Shield,
  contender: Swords,
  warrior: Award,
  veteran: Medal,
  champion: Star,
  legend: Crown,
  immortan: Trophy,
};

const RANK_ORDER: RankTier[] = ['rookie', 'contender', 'warrior', 'veteran', 'champion', 'legend', 'immortan'];

function getRankIndex(tier: RankTier): number {
  return RANK_ORDER.indexOf(tier);
}

function getNextRank(currentTier: RankTier): RankTier | null {
  const currentIndex = getRankIndex(currentTier);
  if (currentIndex >= RANK_ORDER.length - 1) return null;
  return RANK_ORDER[currentIndex + 1];
}

export function ProgressionTab({ userStats }: ProgressionTabProps) {
  const currentTier = userStats?.rankTier || 'rookie';
  const currentIndex = getRankIndex(currentTier);
  const nextTier = getNextRank(currentTier);
  const nextTierConfig = nextTier ? RANK_TIERS.find(t => t.id === nextTier) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Rank Progression</h2>
        <p className="text-white/50">Climb the ranks by winning battles and earning XP</p>
      </div>

      {/* Current Rank Card */}
      {userStats && (
        <div className="bg-gradient-to-r from-[#1a1a1a] to-warning/5 border border-warning/30 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Current Rank */}
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl ${getRankTierBgColor(currentTier)} flex items-center justify-center`}>
                {(() => {
                  const Icon = RANK_ICONS[currentTier];
                  return <Icon className={`w-10 h-10 ${getRankTierColor(currentTier)}`} />;
                })()}
              </div>
              <div>
                <span className="block text-sm text-white/40 uppercase tracking-wider">Your Current Rank</span>
                <h3 className={`text-2xl font-bold ${getRankTierColor(currentTier)}`}>
                  {RANK_TIERS.find(t => t.id === currentTier)?.name}
                </h3>
                <p className="text-sm text-white/50">
                  {RANK_TIERS.find(t => t.id === currentTier)?.requirement}
                </p>
              </div>
            </div>

            {/* Arrow */}
            {nextTierConfig && (
              <>
                <div className="hidden md:flex items-center justify-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Next Rank */}
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl ${getRankTierBgColor(nextTier!)} flex items-center justify-center opacity-60`}>
                    {(() => {
                      const Icon = RANK_ICONS[nextTier!];
                      return <Icon className={`w-8 h-8 ${getRankTierColor(nextTier!)}`} />;
                    })()}
                  </div>
                  <div>
                    <span className="block text-sm text-white/40 uppercase tracking-wider">Next Rank</span>
                    <h4 className={`text-xl font-bold ${getRankTierColor(nextTier!)} opacity-60`}>
                      {nextTierConfig.name}
                    </h4>
                    <p className="text-sm text-white/40">
                      {nextTierConfig.requirement}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rank Tiers Grid */}
      <div>
        <h3 className="text-lg font-bold mb-4">All Rank Tiers</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {RANK_TIERS.map((tier, index) => {
            const Icon = RANK_ICONS[tier.id];
            const isAchieved = currentIndex >= index;
            const isCurrent = tier.id === currentTier;

            return (
              <div
                key={tier.id}
                className={`relative p-5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-warning/10 border-warning'
                    : isAchieved
                    ? 'bg-[#1a1a1a] border-success/30'
                    : 'bg-[#1a1a1a] border-white/[0.06] opacity-60'
                }`}
              >
                {/* Status Badge */}
                {isCurrent && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-warning text-black text-[10px] font-bold uppercase rounded">
                    Current
                  </div>
                )}
                {isAchieved && !isCurrent && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                {!isAchieved && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
                    <Lock className="w-3 h-3 text-white/40" />
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${getRankTierBgColor(tier.id)} flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${getRankTierColor(tier.id)}`} />
                </div>

                {/* Name */}
                <h4 className={`font-bold ${getRankTierColor(tier.id)}`}>{tier.name}</h4>
                <p className="text-xs text-white/40 mb-3">{tier.requirement}</p>

                {/* Perks */}
                {tier.perks.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.06]">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Perks</span>
                    <ul className="mt-1 space-y-1">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="text-xs text-white/60 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-warning" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* How to Earn XP */}
      <div>
        <h3 className="text-lg font-bold mb-4">How to Earn XP</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {XP_SOURCES.map((source) => (
            <div key={source.action} className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center text-lg">
                {source.icon}
              </div>
              <div className="flex-1">
                <span className="block font-medium">{source.action}</span>
                <span className="text-sm text-warning font-semibold">{source.xpRange} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const XP_SOURCES = [
  { action: 'Oracle Predictions', xpRange: '10-50', icon: '🔮' },
  { action: 'Arena Battles', xpRange: '100-500', icon: '⚔️' },
  { action: 'Draft Tournaments', xpRange: '200-1000', icon: '🎯' },
  { action: 'Spectator Wagering', xpRange: '25-100', icon: '👁️' },
];
