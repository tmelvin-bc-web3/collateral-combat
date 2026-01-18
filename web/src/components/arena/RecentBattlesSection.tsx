'use client';

import { Trophy, Crown, Skull } from 'lucide-react';
import { RecentBattle } from './types';

interface RecentBattlesSectionProps {
  battles: RecentBattle[];
}

export function RecentBattlesSection({ battles }: RecentBattlesSectionProps) {
  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
        <Trophy className="w-5 h-5 text-warning" />
        <h2 className="text-lg font-bold uppercase tracking-wider">Recent Battles</h2>
      </div>

      {battles.length > 0 ? (
        <div className="space-y-3">
          {battles.map((battle) => (
            <div
              key={battle.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors"
            >
              {/* Winner */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-warning/30 to-warning/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-4 h-4 text-warning" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">{battle.winner.name}</div>
                  <div className="text-xs text-success font-medium">+{battle.winner.pnl.toFixed(1)}%</div>
                </div>
              </div>

              {/* VS */}
              <div className="text-[10px] font-bold text-white/30 uppercase">defeated</div>

              {/* Loser */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Skull className="w-4 h-4 text-white/30" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/60 truncate">{battle.loser.name}</div>
                  <div className="text-xs text-danger font-medium">{battle.loser.pnl.toFixed(1)}%</div>
                </div>
              </div>

              {/* Prize & Meta */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-warning">{battle.prize} SOL</div>
                <div className="text-[10px] text-white/40">{battle.asset} • {battle.timeAgo}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3">
            <Trophy className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-sm text-white/40">No battles yet today</p>
          <p className="text-xs text-white/30 mt-1">Be the first to claim victory!</p>
        </div>
      )}
    </div>
  );
}
