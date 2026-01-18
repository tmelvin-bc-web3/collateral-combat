'use client';

import { Swords } from 'lucide-react';
import { LiveBattleDisplay, WaitingPlayer } from './types';
import { BattleCard } from './BattleCard';

interface LiveBattlesSectionProps {
  battles: LiveBattleDisplay[];
  waitingPlayers: WaitingPlayer[];
}

export function LiveBattlesSection({ battles, waitingPlayers }: LiveBattlesSectionProps) {
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
        <Swords className="w-5 h-5 text-warning" />
        <h2 className="text-lg font-bold uppercase tracking-wider">Live Battles</h2>
        {battles.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-success text-white text-xs font-bold">
            {battles.length}
          </span>
        )}
      </div>

      {battles.length > 0 ? (
        /* Battle Cards Grid */
        <div className="grid gap-4 md:grid-cols-2">
          {battles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
            <Swords className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-lg font-bold text-white/60 mb-2">No Active Battles</h3>
          <p className="text-sm text-white/40 mb-6">Be the first to enter the arena!</p>

          {/* Waiting Warriors */}
          {waitingPlayers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <h4 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider">
                Warriors Waiting for Opponents
              </h4>
              <div className="space-y-2">
                {waitingPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 flex items-center justify-center text-xs font-bold">
                        {player.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white/80">{player.name}</div>
                        <div className="text-xs text-white/40">
                          {player.tier} SOL • {player.asset}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-white/40">
                      Waiting {player.waitTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
