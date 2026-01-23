'use client';

import { Clock, Zap, Coins, User } from 'lucide-react';

interface ChallengeCardProps {
  challenge: {
    id: string;
    code: string;
    challengerWallet: string;
    challengerUsername?: string;
    entryFee: number;
    duration: number;
    leverage: number;
    expiresAt: number;
  };
  onAccept: (code: string) => void;
  isOwnChallenge?: boolean;
}

export function ChallengeCard({ challenge, onAccept, isOwnChallenge }: ChallengeCardProps) {
  const timeRemaining = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000 / 60));
  const displayName = challenge.challengerUsername ||
    `${challenge.challengerWallet.slice(0, 4)}...${challenge.challengerWallet.slice(-4)}`;

  return (
    <div className="bg-black/40 backdrop-blur border border-white/10 rounded-xl p-4 hover:border-warning/50 transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium">{displayName}</span>
        </div>
        <span className="text-xs text-white/40 font-mono">{challenge.code}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <Coins className="w-4 h-4 mx-auto text-warning mb-1" />
          <div className="text-lg font-bold text-warning">{challenge.entryFee}</div>
          <div className="text-[10px] text-white/40 uppercase">SOL</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <Zap className="w-4 h-4 mx-auto text-purple-400 mb-1" />
          <div className="text-lg font-bold text-purple-400">{challenge.leverage}x</div>
          <div className="text-[10px] text-white/40 uppercase">Leverage</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded-lg">
          <Clock className="w-4 h-4 mx-auto text-blue-400 mb-1" />
          <div className="text-lg font-bold text-blue-400">{Math.floor(challenge.duration / 60)}</div>
          <div className="text-[10px] text-white/40 uppercase">Minutes</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/40">
          {timeRemaining > 60 ? `${Math.floor(timeRemaining / 60)}h` : `${timeRemaining}m`} left
        </span>
        {!isOwnChallenge ? (
          <button
            onClick={() => onAccept(challenge.code)}
            className="px-4 py-2 bg-warning text-black font-bold text-sm rounded-lg hover:bg-warning/80 transition-colors"
          >
            Accept Fight
          </button>
        ) : (
          <span className="text-xs text-white/40">Your challenge</span>
        )}
      </div>
    </div>
  );
}
