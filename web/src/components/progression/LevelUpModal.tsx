'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { LevelUpEvent } from '@/types';
import { LevelBadge } from './LevelBadge';

interface LevelUpModalProps {
  levelUpData: LevelUpEvent | null;
  onDismiss: () => void;
}

// Get perk display info
function getPerkInfo(perkType: string): { label: string; description: string } {
  switch (perkType) {
    case 'rake_9':
      return { label: '9% Rake', description: '1% rake reduction for 1 week' };
    case 'rake_8':
      return { label: '8% Rake', description: '2% rake reduction for 1 week' };
    case 'rake_7':
      return { label: '7% Rake', description: '3% rake reduction for 1 week' };
    default:
      return { label: 'Perk', description: 'New perk unlocked' };
  }
}

// Get cosmetic display info
function getCosmeticInfo(cosmeticType: string, cosmeticId: string): { label: string; icon: string } {
  if (cosmeticType === 'border') {
    const labels: Record<string, string> = {
      bronze: 'Bronze Border',
      silver: 'Silver Border',
      gold: 'Gold Border',
      platinum: 'Platinum Border',
      mythic: 'Immortan Border',
    };
    return { label: labels[cosmeticId] || 'Profile Border', icon: '/' };
  }
  return { label: 'Cosmetic', icon: '' };
}

export function LevelUpModal({ levelUpData, onDismiss }: LevelUpModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (levelUpData) {
      // Slight delay before showing for animation effect
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [levelUpData]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!mounted || !levelUpData) return null;

  const hasUnlocks = levelUpData.unlockedPerks.length > 0 || levelUpData.unlockedCosmetics.length > 0;

  const modal = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        )}
      >
        {/* Confetti effect - animated dots */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                backgroundColor: ['#a855f7', '#6366f1', '#22d3ee', '#facc15', '#f472b6'][i % 5],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative text-center">
          {/* Level up text */}
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 mb-2">
            LEVEL UP!
          </h2>

          {/* Level badges */}
          <div className="flex items-center justify-center gap-4 my-6">
            <div className="opacity-50">
              <LevelBadge level={levelUpData.previousLevel} size="lg" />
            </div>
            <div className="text-2xl text-gray-500">→</div>
            <div className="transform scale-110">
              <LevelBadge level={levelUpData.newLevel} size="lg" />
            </div>
          </div>

          {/* New title */}
          {levelUpData.newTitle && (
            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-400">New Title Unlocked</p>
              <p className="text-xl font-bold text-white">{levelUpData.newTitle}</p>
            </div>
          )}

          {/* Unlocked rewards */}
          {hasUnlocks && (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-400 uppercase tracking-wide">Rewards Unlocked</p>

              {/* Perks */}
              {levelUpData.unlockedPerks.map((perk) => {
                const info = getPerkInfo(perk.perkType);
                return (
                  <div
                    key={perk.id}
                    className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-400">{info.label}</p>
                        <p className="text-xs text-gray-400">{info.description}</p>
                      </div>
                      <span className="text-2xl">💎</span>
                    </div>
                  </div>
                );
              })}

              {/* Cosmetics */}
              {levelUpData.unlockedCosmetics.map((cosmetic) => {
                const info = getCosmeticInfo(cosmetic.cosmeticType, cosmetic.cosmeticId);
                return (
                  <div
                    key={cosmetic.id}
                    className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-400">{info.label}</p>
                        <p className="text-xs text-gray-400">New profile customization</p>
                      </div>
                      <span className="text-2xl">✨</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold rounded-lg transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
