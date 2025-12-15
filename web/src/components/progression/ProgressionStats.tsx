'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UserProgression, XpHistoryEntry, UserPerk, UserCosmetic } from '@/types';
import { LevelBadge } from './LevelBadge';
import { XpProgressBar } from './XpProgressBar';
import { PerkCard } from './PerkCard';

interface ProgressionStatsProps {
  progression: UserProgression | null;
  perks: UserPerk[];
  cosmetics: UserCosmetic[];
  xpHistory: XpHistoryEntry[];
  activeRake: number;
  isLoading: boolean;
  onActivatePerk: (perkId: number) => Promise<UserPerk | null>;
  onFetchHistory: () => Promise<void>;
}

// Get source icon/color
function getSourceInfo(source: string): { color: string; label: string } {
  switch (source) {
    case 'battle':
      return { color: 'text-red-400', label: 'Battle' };
    case 'prediction':
      return { color: 'text-green-400', label: 'Prediction' };
    case 'draft':
      return { color: 'text-blue-400', label: 'Draft' };
    case 'spectator':
      return { color: 'text-yellow-400', label: 'Spectator' };
    default:
      return { color: 'text-gray-400', label: source };
  }
}

export function ProgressionStats({
  progression,
  perks,
  cosmetics,
  xpHistory,
  activeRake,
  isLoading,
  onActivatePerk,
  onFetchHistory,
}: ProgressionStatsProps) {
  const [activatingPerkId, setActivatingPerkId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleActivatePerk = async (perkId: number) => {
    setActivatingPerkId(perkId);
    await onActivatePerk(perkId);
    setActivatingPerkId(null);
  };

  const handleShowHistory = async () => {
    if (!showHistory && xpHistory.length === 0) {
      await onFetchHistory();
    }
    setShowHistory(!showHistory);
  };

  if (isLoading || !progression) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Filter perks
  const availablePerks = perks.filter(p => !p.isUsed);
  const activePerk = perks.find(p => p.activatedAt && p.expiresAt && p.expiresAt > Date.now());

  return (
    <div className="space-y-6">
      {/* Level & XP Section */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <LevelBadge level={progression.currentLevel} size="lg" showTitle title={progression.title} />
        </div>

        <XpProgressBar
          currentXp={progression.totalXp}
          xpToNextLevel={progression.xpToNextLevel}
          progress={progression.xpProgress}
          size="md"
        />

        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-white">{progression.totalXp.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total XP</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-2xl font-bold text-white">{activeRake}%</p>
            <p className="text-xs text-gray-400">Current Rake</p>
          </div>
        </div>
      </div>

      {/* Active Perk */}
      {activePerk && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Active Perk
          </h3>
          <PerkCard perk={activePerk} />
        </div>
      )}

      {/* Available Perks */}
      {availablePerks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Available Perks ({availablePerks.length})
          </h3>
          <div className="space-y-2">
            {availablePerks.map(perk => (
              <PerkCard
                key={perk.id}
                perk={perk}
                onActivate={handleActivatePerk}
                isActivating={activatingPerkId === perk.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unlocked Cosmetics */}
      {cosmetics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Unlocked Cosmetics ({cosmetics.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {cosmetics.map(cosmetic => (
              <div
                key={cosmetic.id}
                className="bg-gray-800/50 rounded-lg p-3 text-center"
              >
                <div className="text-2xl mb-1">
                  {cosmetic.cosmeticType === 'border' ? '🖼️' : '✨'}
                </div>
                <p className="text-xs text-gray-400 capitalize">{cosmetic.cosmeticId}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP History */}
      <div>
        <button
          onClick={handleShowHistory}
          className="flex items-center justify-between w-full text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 hover:text-gray-300 transition-colors"
        >
          <span>XP History</span>
          <span className="text-xs">{showHistory ? '▲' : '▼'}</span>
        </button>

        {showHistory && (
          <div className="bg-gray-800/50 rounded-lg overflow-hidden">
            {xpHistory.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No XP history yet
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {xpHistory.map(entry => {
                  const sourceInfo = getSourceInfo(entry.source);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{entry.description}</p>
                        <p className={cn('text-xs', sourceInfo.color)}>{sourceInfo.label}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-green-400">+{entry.xpAmount}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
