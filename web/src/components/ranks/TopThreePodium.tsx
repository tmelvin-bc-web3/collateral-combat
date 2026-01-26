'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Flame, Swords, Crown } from 'lucide-react';
import { LeaderboardEntry } from './types';
import { DRTierBadge } from '@/components/profile';

interface TopThreePodiumProps {
  leaders: LeaderboardEntry[];
  onChallenge?: (player: LeaderboardEntry) => void;
}

export function TopThreePodium({ leaders, onChallenge }: TopThreePodiumProps) {
  const router = useRouter();

  if (leaders.length < 3) return null;

  const viewProfile = (player: LeaderboardEntry) => {
    router.push(`/profile/${player.walletAddress}`);
  };

  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl font-black uppercase mb-1" style={{ fontFamily: 'Impact, sans-serif' }}>
        HALL OF <span className="text-warning">WARLORDS</span>
      </h2>
      <p className="text-white/50 text-sm mb-6">The deadliest degens in the wasteland</p>

      <div className="flex justify-center items-end gap-4 lg:gap-6">
        {/* 2nd Place */}
        <PodiumSpot
          player={leaders[1]}
          place={2}
          onView={() => viewProfile(leaders[1])}
          onChallenge={() => onChallenge?.(leaders[1])}
        />

        {/* 1st Place */}
        <PodiumSpot
          player={leaders[0]}
          place={1}
          onView={() => viewProfile(leaders[0])}
          onChallenge={() => onChallenge?.(leaders[0])}
          isFirst
        />

        {/* 3rd Place */}
        <PodiumSpot
          player={leaders[2]}
          place={3}
          onView={() => viewProfile(leaders[2])}
          onChallenge={() => onChallenge?.(leaders[2])}
        />
      </div>
    </div>
  );
}

interface PodiumSpotProps {
  player: LeaderboardEntry;
  place: 1 | 2 | 3;
  onView: () => void;
  onChallenge: () => void;
  isFirst?: boolean;
}

function PodiumSpot({ player, place, onView, onChallenge, isFirst }: PodiumSpotProps) {
  const placeStyles = {
    1: 'bg-gradient-to-b from-yellow-500/10 to-[#1a1a1a] border-yellow-500/30 min-w-[200px] lg:min-w-[220px] pb-6',
    2: 'bg-gradient-to-b from-gray-400/10 to-[#1a1a1a] border-gray-400/20 min-w-[170px] lg:min-w-[180px]',
    3: 'bg-gradient-to-b from-amber-700/10 to-[#1a1a1a] border-amber-700/20 min-w-[170px] lg:min-w-[180px]',
  };

  return (
    <div
      className={`relative bg-[#1a1a1a] border rounded-2xl p-4 lg:p-5 text-center cursor-pointer transition-all hover:-translate-y-2 hover:border-warning/50 ${placeStyles[place]}`}
      onClick={onView}
    >
      {/* Crown for 1st */}
      {isFirst && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          <Crown className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
        </div>
      )}

      {/* Rank Badge */}
      <div className="absolute -top-3 -right-3 w-8 h-8 bg-warning rounded-full flex items-center justify-center font-bold text-black text-sm shadow-lg">
        {place}
      </div>

      {/* Avatar */}
      <div className={`relative mx-auto mb-3 ${isFirst ? 'w-20 h-20' : 'w-16 h-16'}`}>
        {player.avatar ? (
          <Image
            src={player.avatar}
            alt={player.username}
            fill
            className="rounded-full border-[3px] border-warning object-cover"
            unoptimized
          />
        ) : (
          <div className={`w-full h-full rounded-full border-[3px] border-warning bg-warning/20 flex items-center justify-center`}>
            <span className={`font-bold text-warning ${isFirst ? 'text-2xl' : 'text-xl'}`}>
              {player.username[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <span className={`block font-semibold ${isFirst ? 'text-base' : 'text-sm'}`}>
        {player.username}
      </span>

      {/* DR Badge */}
      {player.tier && (
        <div className="mt-2">
          <DRTierBadge tier={player.tier} division={player.division} dr={player.dr} size="sm" showDr />
        </div>
      )}

      {/* Stats */}
      <div className="flex justify-center gap-4 mt-3">
        <div className="text-center">
          <span className="block text-base font-bold">{player.winRate.toFixed(1)}%</span>
          <span className="text-[10px] text-white/40 uppercase">Win Rate</span>
        </div>
        <div className="text-center">
          <span className="block text-base font-bold text-success">+{player.profit.toFixed(2)}</span>
          <span className="text-[10px] text-white/40 uppercase">Profit</span>
        </div>
      </div>

      {/* Streak Badge */}
      {player.streak >= 3 && (
        <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-danger/10 border border-danger/30 rounded text-[11px] text-danger">
          <Flame className="w-3 h-3" />
          {player.streak} streak
        </div>
      )}

      {/* Challenge Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onChallenge();
        }}
        className="mt-3 w-full py-2 border border-warning text-warning text-xs font-semibold rounded-lg hover:bg-warning hover:text-black transition-colors"
      >
        <Swords className="w-3 h-3 inline mr-1" />
        Challenge
      </button>
    </div>
  );
}
