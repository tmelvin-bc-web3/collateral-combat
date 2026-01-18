'use client';

import { Clock, Eye, Users } from 'lucide-react';
import { LiveBattleData, GAME_TYPE_CONFIG } from './types';

interface BattleCardProps {
  battle: LiveBattleData;
  onWatch: () => void;
  onBet: (side: 'fighter1' | 'fighter2') => void;
  selectedWager?: number;
}

function truncateName(name: string, maxLength = 8): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength)}...`;
}

export function BattleCard({ battle, onWatch, onBet, selectedWager = 0.1 }: BattleCardProps) {
  const gameConfig = GAME_TYPE_CONFIG[battle.gameType];

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl p-5 transition-all hover:border-warning/30 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${gameConfig.bgClass} ${gameConfig.textClass}`}>
          {gameConfig.label}
        </span>
        <span className="px-2 py-1 rounded text-[11px] bg-white/5 text-white/50">
          {battle.tier}
        </span>
        <span className="ml-auto flex items-center gap-1 text-warning font-semibold text-sm">
          <Clock className="w-3.5 h-3.5" />
          {battle.timeRemaining}
        </span>
      </div>

      {/* Matchup */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.06]">
        {/* Fighter 1 */}
        <div
          className={`flex-1 text-center p-3 rounded-lg border-2 transition-all ${
            battle.fighter1.isWinning
              ? 'border-success bg-success/10'
              : 'border-transparent'
          }`}
        >
          <div className="text-2xl mb-1">{battle.fighter1.avatar || '👤'}</div>
          <div className="text-sm font-semibold truncate">{truncateName(battle.fighter1.name)}</div>
          <div
            className={`text-lg font-bold ${
              battle.fighter1.pnl >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {battle.fighter1.pnl >= 0 ? '+' : ''}
            {battle.fighter1.pnl.toFixed(1)}%
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center px-3">
          <span className="text-sm font-bold text-white/40">VS</span>
          <span className="text-xs text-warning font-semibold">{battle.prizePool} SOL</span>
        </div>

        {/* Fighter 2 */}
        <div
          className={`flex-1 text-center p-3 rounded-lg border-2 transition-all ${
            battle.fighter2.isWinning
              ? 'border-success bg-success/10'
              : 'border-transparent'
          }`}
        >
          <div className="text-2xl mb-1">{battle.fighter2.avatar || '👤'}</div>
          <div className="text-sm font-semibold truncate">{truncateName(battle.fighter2.name)}</div>
          <div
            className={`text-lg font-bold ${
              battle.fighter2.pnl >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {battle.fighter2.pnl >= 0 ? '+' : ''}
            {battle.fighter2.pnl.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Spectator Betting Pools */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Spectator Bets</span>
          <span className="text-warning font-semibold">{battle.spectatorPool.toFixed(2)} SOL</span>
        </div>
        <div className="flex h-6 rounded-md overflow-hidden mb-1">
          <div
            className="bg-success flex items-center justify-center text-[11px] font-bold text-white min-w-[30px]"
            style={{ width: `${battle.fighter1.spectatorPercent}%` }}
          >
            {battle.fighter1.spectatorPercent.toFixed(0)}%
          </div>
          <div
            className="bg-danger flex items-center justify-center text-[11px] font-bold text-white min-w-[30px]"
            style={{ width: `${battle.fighter2.spectatorPercent}%` }}
          >
            {battle.fighter2.spectatorPercent.toFixed(0)}%
          </div>
        </div>
        <div className="flex justify-between text-xs text-white/40">
          <span>{battle.fighter1.spectatorOdds.toFixed(2)}x</span>
          <span>{battle.fighter2.spectatorOdds.toFixed(2)}x</span>
        </div>
      </div>

      {/* Quick Bet Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onBet('fighter1')}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold border border-success text-success bg-success/10 hover:bg-success hover:text-white transition-colors"
        >
          Bet {selectedWager} on {truncateName(battle.fighter1.name, 6)}
        </button>
        <button
          onClick={() => onBet('fighter2')}
          className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold border border-danger text-danger bg-danger/10 hover:bg-danger hover:text-white transition-colors"
        >
          Bet {selectedWager} on {truncateName(battle.fighter2.name, 6)}
        </button>
      </div>

      {/* Watch Button */}
      <button
        onClick={onWatch}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: 'linear-gradient(135deg, #ff6b00 0%, #ff4500 50%, #ff3131 100%)',
        }}
      >
        <Eye className="w-4 h-4" />
        Watch
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px]">
          <Users className="w-3 h-3" />
          {battle.spectators}
        </span>
      </button>
    </div>
  );
}
