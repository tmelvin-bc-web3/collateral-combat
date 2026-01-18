'use client';

import { useState } from 'react';
import { Trophy, Medal, Crown } from 'lucide-react';
import { LeaderboardEntry, TIER_CONFIG } from './types';

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
  userPosition?: number;
  userEntry?: LeaderboardEntry;
}

const TIER_TABS = ['All', 'Scavenger', 'Raider', 'Warlord'] as const;

function PodiumEntry({
  entry,
  position,
}: {
  entry: LeaderboardEntry;
  position: 1 | 2 | 3;
}) {
  const config = {
    1: {
      icon: Crown,
      size: 'h-24',
      gradient: 'from-yellow-500/20 to-yellow-600/5',
      border: 'border-yellow-500/50',
      iconColor: 'text-yellow-400',
      order: 'order-2',
    },
    2: {
      icon: Medal,
      size: 'h-20',
      gradient: 'from-gray-400/20 to-gray-500/5',
      border: 'border-gray-400/50',
      iconColor: 'text-gray-300',
      order: 'order-1',
    },
    3: {
      icon: Medal,
      size: 'h-16',
      gradient: 'from-amber-700/20 to-amber-800/5',
      border: 'border-amber-700/50',
      iconColor: 'text-amber-600',
      order: 'order-3',
    },
  };

  const { icon: Icon, size, gradient, border, iconColor, order } = config[position];

  return (
    <div className={`flex flex-col items-center ${order}`}>
      {/* Podium Stand */}
      <div
        className={`relative w-24 ${size} bg-gradient-to-t ${gradient} border-t-2 ${border} rounded-t-lg flex flex-col items-center justify-start pt-3`}
      >
        <Icon className={`w-6 h-6 ${iconColor} mb-1`} />
        <span className="text-xl font-bold">#{position}</span>
        <span className="text-xs text-white/60 truncate max-w-[80px]">
          {entry.displayName}
        </span>
        <span
          className={`text-sm font-semibold mt-1 ${
            entry.performance >= 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {entry.performance >= 0 ? '+' : ''}
          {entry.performance.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  isHighlighted,
}: {
  entry: LeaderboardEntry;
  isHighlighted?: boolean;
}) {
  // Find tier color
  const tierConfig = Object.entries(TIER_CONFIG).find(
    ([, config]) => config.name === entry.tier
  );
  const tierColor = tierConfig ? tierConfig[1].color : 'white';

  return (
    <div
      className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
        isHighlighted
          ? 'bg-warning/10 border border-warning/30'
          : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-sm font-bold text-white/60">
          {entry.rank}
        </span>
        <span className="text-sm font-medium truncate max-w-[120px]">
          {entry.displayName}
        </span>
        {entry.isUser && (
          <span className="text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning rounded font-bold uppercase">
            You
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className={`text-xs px-2 py-0.5 rounded bg-${tierColor}/10 text-${tierColor}`}>
          {entry.tier}
        </span>
        <span
          className={`text-sm font-semibold w-16 text-right ${
            entry.performance >= 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {entry.performance >= 0 ? '+' : ''}
          {entry.performance.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function LeaderboardSection({
  entries,
  userPosition,
  userEntry,
}: LeaderboardSectionProps) {
  const [selectedTier, setSelectedTier] = useState<(typeof TIER_TABS)[number]>('All');

  // Filter entries by tier
  const filteredEntries =
    selectedTier === 'All'
      ? entries
      : entries.filter((e) => e.tier === selectedTier);

  // Get top 3 for podium
  const top3 = filteredEntries.slice(0, 3);
  const rest = filteredEntries.slice(3, 10);

  // Check if user is outside visible list
  const userOutsideTop10 = userPosition && userPosition > 10 && userEntry;

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-bold uppercase tracking-wide">Leaderboard</h2>
        </div>
      </div>

      {/* Tier Tabs */}
      <div className="flex gap-1 mb-5 bg-white/5 rounded-lg p-1">
        {TIER_TABS.map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
              selectedTier === tier
                ? 'bg-warning text-black'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {tier}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-10 h-10 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">No warriors yet</p>
          <p className="text-white/30 text-xs">Be the first to enlist!</p>
        </div>
      ) : (
        <>
          {/* Podium (only show if 3+ entries) */}
          {top3.length >= 3 && (
            <div className="flex justify-center items-end gap-2 mb-5 pt-2">
              <PodiumEntry entry={top3[1]} position={2} />
              <PodiumEntry entry={top3[0]} position={1} />
              <PodiumEntry entry={top3[2]} position={3} />
            </div>
          )}

          {/* List for ranks 4-10 (or 1-10 if less than 3) */}
          <div className="space-y-1">
            {top3.length < 3 &&
              top3.map((entry) => (
                <LeaderboardRow
                  key={entry.rank}
                  entry={entry}
                  isHighlighted={entry.isUser}
                />
              ))}
            {rest.map((entry) => (
              <LeaderboardRow
                key={entry.rank}
                entry={entry}
                isHighlighted={entry.isUser}
              />
            ))}
          </div>

          {/* User position outside top 10 */}
          {userOutsideTop10 && (
            <>
              <div className="text-center text-white/20 text-xs py-2">• • •</div>
              <LeaderboardRow entry={userEntry} isHighlighted />
            </>
          )}
        </>
      )}
    </div>
  );
}
