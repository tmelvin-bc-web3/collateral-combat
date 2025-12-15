'use client';

import { cn } from '@/lib/utils';
import { UserPerk } from '@/types';

interface PerkCardProps {
  perk: UserPerk;
  onActivate?: (perkId: number) => void;
  isActivating?: boolean;
}

function getPerkInfo(perkType: string): {
  label: string;
  rakePercent: number;
  description: string;
  color: string;
} {
  switch (perkType) {
    case 'rake_9':
      return {
        label: '9% Rake',
        rakePercent: 9,
        description: '1% rake reduction',
        color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      };
    case 'rake_8':
      return {
        label: '8% Rake',
        rakePercent: 8,
        description: '2% rake reduction',
        color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
      };
    case 'rake_7':
      return {
        label: '7% Rake',
        rakePercent: 7,
        description: '3% rake reduction',
        color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
      };
    default:
      return {
        label: 'Unknown',
        rakePercent: 10,
        description: 'Unknown perk',
        color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
      };
  }
}

function formatTimeRemaining(expiresAt: number | null): string {
  if (!expiresAt) return '';

  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  return `${hours}h remaining`;
}

export function PerkCard({ perk, onActivate, isActivating }: PerkCardProps) {
  const info = getPerkInfo(perk.perkType);
  const isActive = perk.activatedAt && perk.expiresAt && perk.expiresAt > Date.now();
  const canActivate = !perk.isUsed && !isActive;

  return (
    <div
      className={cn(
        'bg-gradient-to-r rounded-lg p-4 border transition-all',
        info.color,
        isActive && 'ring-2 ring-green-500/50'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{info.label}</span>
            {isActive && (
              <span className="px-2 py-0.5 bg-green-500/30 text-green-400 text-xs rounded-full">
                Active
              </span>
            )}
            {perk.isUsed && !isActive && (
              <span className="px-2 py-0.5 bg-gray-500/30 text-gray-400 text-xs rounded-full">
                Used
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{info.description}</p>
          <p className="text-xs text-gray-500 mt-1">Unlocked at level {perk.unlockLevel}</p>
          {isActive && perk.expiresAt && (
            <p className="text-xs text-green-400 mt-1">
              {formatTimeRemaining(perk.expiresAt)}
            </p>
          )}
        </div>

        {canActivate && onActivate && (
          <button
            onClick={() => onActivate(perk.id)}
            disabled={isActivating}
            className={cn(
              'px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-all',
              isActivating && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isActivating ? 'Activating...' : 'Activate'}
          </button>
        )}
      </div>
    </div>
  );
}
