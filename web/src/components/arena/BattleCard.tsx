'use client';

import { useRouter } from 'next/navigation';
import { Clock, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { LiveBattleDisplay } from './types';

interface BattleCardProps {
  battle: LiveBattleDisplay;
}

export function BattleCard({ battle }: BattleCardProps) {
  const router = useRouter();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpectate = () => {
    router.push(`/spectate?battle=${battle.id}`);
  };

  // Calculate win chance based on P&L
  const totalPnl = Math.abs(battle.player1.pnl) + Math.abs(battle.player2.pnl);
  const player1WinChance = totalPnl > 0
    ? (Math.max(0, battle.player1.pnl) / totalPnl) * 100
    : 50;

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4 hover:border-warning/30 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <span className="px-2 py-1 rounded text-xs font-bold bg-warning text-black uppercase">
          {battle.tier}
        </span>
        <span className="text-sm text-white/60">{battle.asset}</span>
        <div className="flex items-center gap-1 text-warning font-semibold text-sm">
          <Clock className="w-4 h-4" />
          {formatTime(battle.timeRemaining)}
        </div>
      </div>

      {/* Fighters */}
      <div className="flex items-stretch gap-2 mb-4">
        {/* Player 1 */}
        <div className={`flex-1 text-center p-3 rounded-lg ${
          battle.player1.isWinning
            ? 'bg-success/10 border-2 border-success'
            : 'bg-white/[0.02] border-2 border-transparent'
        }`}>
          <div className="text-lg mb-1">
            {battle.player1.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-xs text-white/60 font-medium mb-2 truncate">
            {battle.player1.name}
          </div>
          <div className={`text-lg font-bold mb-1 ${
            battle.player1.pnl >= 0 ? 'text-success' : 'text-danger'
          }`}>
            {battle.player1.pnl >= 0 ? '+' : ''}{battle.player1.pnl.toFixed(1)}%
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-white/40">
            {battle.player1.position === 'long' ? (
              <><ArrowUp className="w-3 h-3 text-success" /> LONG</>
            ) : (
              <><ArrowDown className="w-3 h-3 text-danger" /> SHORT</>
            )}
          </div>
        </div>

        {/* VS Badge */}
        <div className="flex flex-col items-center justify-center px-2">
          <span className="text-sm font-bold text-white/30">VS</span>
          <span className="text-xs text-warning font-semibold mt-1">{battle.prizePool} SOL</span>
        </div>

        {/* Player 2 */}
        <div className={`flex-1 text-center p-3 rounded-lg ${
          battle.player2.isWinning
            ? 'bg-success/10 border-2 border-success'
            : 'bg-white/[0.02] border-2 border-transparent'
        }`}>
          <div className="text-lg mb-1">
            {battle.player2.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-xs text-white/60 font-medium mb-2 truncate">
            {battle.player2.name}
          </div>
          <div className={`text-lg font-bold mb-1 ${
            battle.player2.pnl >= 0 ? 'text-success' : 'text-danger'
          }`}>
            {battle.player2.pnl >= 0 ? '+' : ''}{battle.player2.pnl.toFixed(1)}%
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-white/40">
            {battle.player2.position === 'long' ? (
              <><ArrowUp className="w-3 h-3 text-success" /> LONG</>
            ) : (
              <><ArrowDown className="w-3 h-3 text-danger" /> SHORT</>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-danger rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-300"
            style={{ width: `${player1WinChance}%` }}
          />
        </div>
      </div>

      {/* Spectate Button */}
      <button
        onClick={handleSpectate}
        className="w-full py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-white/10 hover:border-warning/30 transition-all flex items-center justify-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Watch Battle
        <span className="text-xs text-white/40">{battle.spectators} watching</span>
      </button>
    </div>
  );
}
