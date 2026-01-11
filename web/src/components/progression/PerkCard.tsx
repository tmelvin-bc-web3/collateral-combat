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
  gameType: 'draft' | 'oracle';
} {
  switch (perkType) {
    // Draft perks (10% baseline)
    case 'rake_9':
      return {
        label: '9% Draft Rake',
        rakePercent: 9,
        description: '1% off Draft tournaments',
        color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
        gameType: 'draft',
      };
    case 'rake_8':
      return {
        label: '8% Draft Rake',
        rakePercent: 8,
        description: '2% off Draft tournaments',
        color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
        gameType: 'draft',
      };
    case 'rake_7':
      return {
        label: '7% Draft Rake',
        rakePercent: 7,
        description: '3% off Draft tournaments',
        color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
        gameType: 'draft',
      };
    // Oracle perks (5% baseline)
    case 'oracle_4_5':
      return {
        label: '4.5% Oracle Rake',
        rakePercent: 4.5,
        description: '0.5% off Oracle predictions',
        color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
        gameType: 'oracle',
      };
    case 'oracle_4':
      return {
        label: '4% Oracle Rake',
        rakePercent: 4,
        description: '1% off Oracle predictions',
        color: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
        gameType: 'oracle',
      };
    case 'oracle_3_5':
      return {
        label: '3.5% Oracle Rake',
        rakePercent: 3.5,
        description: '1.5% off Oracle predictions',
        color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
        gameType: 'oracle',
      };
    default:
      return {
        label: 'Unknown',
        rakePercent: 10,
        description: 'Unknown perk',
        color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
        gameType: 'draft',
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-white">{info.label}</span>
            <span className={cn(
              'px-2 py-0.5 text-xs rounded-full uppercase tracking-wider font-medium',
              info.gameType === 'oracle'
                ? 'bg-amber-500/30 text-amber-400'
                : 'bg-purple-500/30 text-purple-400'
            )}>
              {info.gameType === 'oracle' ? 'Oracle' : 'Draft'}
            </span>
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
