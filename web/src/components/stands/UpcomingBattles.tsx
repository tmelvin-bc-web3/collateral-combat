'use client';

import Link from 'next/link';
import { Clock, Bell, BellOff } from 'lucide-react';
import { UpcomingBattle, GAME_TYPE_CONFIG } from './types';

interface UpcomingBattlesProps {
  battles: UpcomingBattle[];
  onSetReminder: (battleId: string) => void;
}

export function UpcomingBattles({ battles, onSetReminder }: UpcomingBattlesProps) {
  if (battles.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <h3 className="font-bold mb-2">No Scheduled Battles</h3>
        <p className="text-white/50 text-sm mb-4">
          Warriors are matched in real-time! Start a battle or check back soon.
        </p>
        <Link
          href="/battle"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-warning text-black rounded-lg font-semibold text-sm hover:bg-warning/90 transition-colors"
        >
          Find a Match
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Scheduled Battles</h2>
        <span className="text-sm text-white/40">{battles.length} battles queued</span>
      </div>

      <div className="space-y-3">
        {battles.map((battle) => {
          const gameConfig = GAME_TYPE_CONFIG[battle.gameType];

          return (
            <div
              key={battle.id}
              className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Time */}
                <div className="text-center min-w-[80px]">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider block mb-1">
                    Starts in
                  </span>
                  <span className="text-lg font-bold text-warning">{battle.startsIn}</span>
                </div>

                {/* Matchup */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <span className="font-semibold">{battle.fighter1.name}</span>
                      {battle.fighter1.record && (
                        <span className="text-xs text-white/40 ml-2">{battle.fighter1.record}</span>
                      )}
                    </div>
                    <span className="text-xs text-white/40 font-bold">VS</span>
                    <div className="flex-1 text-right">
                      <span className="font-semibold">{battle.fighter2.name}</span>
                      {battle.fighter2.record && (
                        <span className="text-xs text-white/40 ml-2">{battle.fighter2.record}</span>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${gameConfig.bgClass} ${gameConfig.textClass}`}
                    >
                      {gameConfig.label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/50">
                      {battle.tier}
                    </span>
                    <span className="text-xs text-warning font-semibold ml-auto">
                      {battle.prizePool} SOL
                    </span>
                  </div>
                </div>

                {/* Reminder Button */}
                <button
                  onClick={() => onSetReminder(battle.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    battle.hasReminder
                      ? 'bg-warning/10 border border-warning/30 text-warning'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:border-warning/30 hover:text-warning'
                  }`}
                >
                  {battle.hasReminder ? (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      Reminder Set
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5" />
                      Remind Me
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
