'use client';

import { Clock, Trophy, Eye, Swords } from 'lucide-react';
import { BattleHeaderProps, BattlePhase } from './types';
import { LevelBadge } from '@/components/progression/LevelBadge';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function FighterCard({
  fighter,
  side,
}: {
  fighter: {
    walletAddress: string;
    username: string;
    avatar: string | null;
    level: number;
    title: string;
    isCurrentUser: boolean;
  };
  side: 'left' | 'right';
}) {
  const isLeft = side === 'left';
  const borderColor = fighter.isCurrentUser ? 'border-success/40' : 'border-danger/40';
  const bgGradient = fighter.isCurrentUser
    ? 'from-success/10 to-transparent'
    : 'from-danger/10 to-transparent';

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${borderColor} bg-gradient-to-r ${bgGradient} min-w-[180px] ${
        isLeft ? '' : 'flex-row-reverse text-right'
      }`}
    >
      {/* Level Badge */}
      <LevelBadge level={fighter.level} size="xs" />

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border-2 border-white/20">
          {fighter.avatar ? (
            <img src={fighter.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 font-bold text-sm">
              {fighter.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className={`min-w-0 ${isLeft ? '' : 'text-right'}`}>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">
          {fighter.isCurrentUser ? 'You' : 'Opponent'}
        </div>
        <div className="font-bold text-sm truncate max-w-[100px]">
          {fighter.username}
        </div>
        <div className="text-[10px] text-white/50">{fighter.title}</div>
      </div>
    </div>
  );
}

function BattleStatusBadge({ phase, timeRemaining }: { phase: BattlePhase; timeRemaining: number }) {
  if (phase === 'ended') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white/60 text-[10px] font-bold uppercase">
        Ended
      </span>
    );
  }

  if (phase === 'ending' || timeRemaining < 60) {
    return (
      <span className="px-2 py-0.5 rounded-full bg-warning text-black text-[10px] font-bold uppercase animate-pulse">
        Final Minute
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger text-white text-[10px] font-bold uppercase">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      Live
    </span>
  );
}

export function BattleHeader({
  userFighter,
  opponentFighter,
  timeRemaining,
  phase,
  prizePool,
  spectatorCount = 0,
  isSoloPractice = false,
}: BattleHeaderProps) {
  const isUrgent = phase === 'ending' || timeRemaining < 60;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent border-b border-white/[0.06]">
      {/* Left Fighter (You) */}
      <FighterCard fighter={userFighter} side="left" />

      {/* Center - Battle Info */}
      <div className="flex flex-col items-center gap-1">
        {/* Status Badge */}
        {!isSoloPractice && <BattleStatusBadge phase={phase} timeRemaining={timeRemaining} />}

        {/* Timer */}
        <div className="flex items-center gap-2">
          {isSoloPractice ? (
            <div className="flex items-center gap-1.5 text-warning">
              <Swords className="w-4 h-4" />
              <span className="text-sm font-bold">Practice Mode</span>
            </div>
          ) : (
            <>
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-danger' : 'text-white/40'}`} />
              <span
                className={`text-2xl font-black font-mono tabular-nums ${
                  isUrgent ? 'text-danger animate-pulse' : 'text-white'
                }`}
              >
                {formatTime(timeRemaining)}
              </span>
            </>
          )}
        </div>

        {/* Prize Pool */}
        {!isSoloPractice && (
          <div className="flex items-center gap-1.5 text-warning">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">{(prizePool * 0.95).toFixed(2)} SOL</span>
          </div>
        )}

        {/* Spectator Count */}
        {spectatorCount > 0 && (
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <Eye className="w-3 h-3" />
            <span>{spectatorCount} watching</span>
          </div>
        )}
      </div>

      {/* Right Fighter (Opponent) */}
      {!isSoloPractice ? (
        <FighterCard fighter={opponentFighter} side="right" />
      ) : (
        <div className="min-w-[180px]" /> // Spacer for solo practice
      )}
    </div>
  );
}
