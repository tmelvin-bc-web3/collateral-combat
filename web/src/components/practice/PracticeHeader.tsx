'use client';

import { Target, RotateCcw, Swords } from 'lucide-react';
import { PracticeHeaderProps } from './types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PracticeHeader({ stats, onReset, onEnterRealBattle }: PracticeHeaderProps) {
  const winRate = stats.tradesThisSession > 0
    ? ((stats.winningTrades / stats.tradesThisSession) * 100).toFixed(0)
    : '0';

  return (
    <div className="bg-gradient-to-b from-blue-500/10 to-transparent border-b border-blue-500/20 px-4 py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Practice Mode Badge */}
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-blue-400 tracking-wide">PRACTICE MODE</div>
            <div className="text-[10px] text-white/40">Risk-free training arena</div>
          </div>
        </div>

        {/* Session Stats */}
        <div className="flex items-center gap-6 flex-1 justify-center">
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Session Time</div>
            <div className="text-lg font-bold font-mono">{formatTime(stats.sessionTime)}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Virtual Balance</div>
            <div className="text-lg font-bold font-mono">${stats.virtualBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Session P&L</div>
            <div className={`text-lg font-bold ${stats.sessionPnL >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.sessionPnL >= 0 ? '+' : ''}{stats.sessionPnL.toFixed(2)}%
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Trades</div>
            <div className="text-lg font-bold">{stats.tradesThisSession}</div>
          </div>

          <div className="text-center hidden md:block">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Win Rate</div>
            <div className="text-lg font-bold">{winRate}%</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset Session</span>
          </button>

          <button
            onClick={onEnterRealBattle}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-warning to-fire text-white text-sm font-bold hover:shadow-lg hover:shadow-warning/30 transition-all hover:-translate-y-0.5"
          >
            <Swords className="w-4 h-4" />
            <span>Enter Real Battle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
