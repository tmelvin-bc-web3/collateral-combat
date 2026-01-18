'use client';

import { User, Flame } from 'lucide-react';
import { LDSPlayer } from './types';
import { LevelBadge } from '@/components/progression/LevelBadge';

interface PlayersListProps {
  players: LDSPlayer[];
  maxPlayers: number;
  minPlayers: number;
  currentWallet?: string;
  prizePool: number;
}

function formatWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function PlayersList({ players, maxPlayers, minPlayers, currentWallet, prizePool }: PlayersListProps) {
  const playersNeeded = Math.max(0, minPlayers - players.length);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Players</h3>
        <span className="text-sm font-bold text-warning">{players.length} / {maxPlayers}</span>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
        {players.map((player, i) => {
          const isCurrentUser = player.walletAddress === currentWallet;
          const isNewJoin = i === 0 && player.joinedAt && Date.now() - player.joinedAt < 10000;

          return (
            <div
              key={player.walletAddress}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isNewJoin ? 'animate-slide-in bg-warning/20' : 'bg-[#333]'
              } ${isCurrentUser ? 'border border-warning/50' : ''}`}
            >
              {/* Level Badge */}
              {player.level && (
                <LevelBadge level={player.level} size="xs" />
              )}
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover bg-[#444]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#444] flex items-center justify-center">
                  <User className="w-4 h-4 text-white/60" />
                </div>
              )}
              <span className="flex-1 text-sm font-medium text-white truncate">
                {player.username || formatWallet(player.walletAddress)}
                {isCurrentUser && <span className="text-warning ml-1">(you)</span>}
              </span>
              {isNewJoin && (
                <span className="text-xs text-warning font-semibold animate-fade-in">Just joined!</span>
              )}
              {player.isVIP && (
                <span className="px-2 py-0.5 bg-warning/20 text-warning text-[10px] font-bold rounded-full">VIP</span>
              )}
              {player.streak && player.streak > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-danger/20 text-danger text-[10px] font-bold rounded-full">
                  <Flame className="w-3 h-3" /> {player.streak}
                </span>
              )}
            </div>
          );
        })}

        {players.length === 0 && (
          <div className="text-center py-8 text-white/20 text-sm">
            Be the first to join!
          </div>
        )}
      </div>

      {/* Fill Incentive */}
      {playersNeeded > 0 && players.length > 0 && (
        <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg text-center">
          <span className="text-sm text-warning font-semibold">
            {playersNeeded} more player{playersNeeded !== 1 ? 's' : ''} until game starts!
          </span>
        </div>
      )}

      {/* Prize Pool */}
      <div className="mt-auto pt-4 border-t border-white/[0.06] text-center">
        <div className="text-2xl font-bold text-warning">
          {prizePool.toFixed(2)} SOL
        </div>
        <div className="text-[10px] text-white/40 uppercase">Prize Pool</div>
      </div>
    </div>
  );
}
