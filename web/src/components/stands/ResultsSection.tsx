'use client';

import { useState } from 'react';
import { Crown, Users } from 'lucide-react';
import { BattleResult, GAME_TYPE_CONFIG } from './types';

type DateFilter = 'today' | 'week' | 'all';

interface ResultsSectionProps {
  results: BattleResult[];
}

export function ResultsSection({ results }: ResultsSectionProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  // Filter results based on date
  const filteredResults = results.filter((result) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;

    switch (dateFilter) {
      case 'today':
        return now - result.endedAt < dayMs;
      case 'week':
        return now - result.endedAt < weekMs;
      default:
        return true;
    }
  });

  return (
    <div>
      {/* Header with Filter */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Recent Results</h2>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['today', 'week', 'all'] as DateFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                dateFilter === filter
                  ? 'bg-warning text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {filter === 'today' ? 'Today' : filter === 'week' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a1a] border border-white/[0.06] rounded-xl">
          <Crown className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No results for this period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result) => {
            const gameConfig = GAME_TYPE_CONFIG[result.gameType];
            const winner =
              result.winner === 'fighter1' ? result.fighter1 : result.fighter2;
            const loser =
              result.winner === 'fighter1' ? result.fighter2 : result.fighter1;

            return (
              <div
                key={result.id}
                className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
                  <span>{result.timeAgo}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase ${gameConfig.bgClass} ${gameConfig.textClass}`}
                  >
                    {gameConfig.label}
                  </span>
                  <span className="text-warning font-semibold ml-auto">
                    {result.prizePool} SOL
                  </span>
                </div>

                {/* Matchup Result */}
                <div className="flex items-center justify-between mb-3">
                  {/* Winner */}
                  <div className="flex items-center gap-2 flex-1">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <div>
                      <span className="font-semibold text-success">{winner.name}</span>
                      <span
                        className={`text-sm ml-2 ${
                          winner.pnl >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {winner.pnl >= 0 ? '+' : ''}
                        {winner.pnl.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-white/30 px-3">beat</span>

                  {/* Loser */}
                  <div className="flex-1 text-right">
                    <span className="font-medium text-white/60">{loser.name}</span>
                    <span
                      className={`text-sm ml-2 ${
                        loser.pnl >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {loser.pnl >= 0 ? '+' : ''}
                      {loser.pnl.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Spectator Results */}
                <div className="flex items-center gap-3 text-xs text-white/40 pt-3 border-t border-white/[0.06]">
                  <span>Spectator Pool:</span>
                  <span className="text-warning font-semibold">
                    {result.spectatorPool.toFixed(2)} SOL
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Users className="w-3.5 h-3.5" />
                    {result.spectatorWinners} winners
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
