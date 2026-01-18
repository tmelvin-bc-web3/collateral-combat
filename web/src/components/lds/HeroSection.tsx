'use client';

import { Crown, Flame, UserPlus } from 'lucide-react';
import { LobbyState, LDSPlayer } from './types';

interface HeroSectionProps {
  state: LobbyState;
  timeRemaining: number;
  playerCount: number;
  minPlayers: number;
  maxPlayers: number;
  prizePool: number;
  projectedPool: number;
  maxFirstPlaceWin: number;
  entryFee: number;
  onJoin: () => void;
  isJoining: boolean;
  isInGame: boolean;
  onLeave: () => void;
  isLeaving: boolean;
  recentJoins: LDSPlayer[];
  recentJoinsCount: number;
  walletConnected: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSOL(amount: number): string {
  return amount.toFixed(2);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function HeroSection({
  state,
  timeRemaining,
  playerCount,
  minPlayers,
  maxPlayers,
  prizePool,
  projectedPool,
  maxFirstPlaceWin,
  entryFee,
  onJoin,
  isJoining,
  isInGame,
  onLeave,
  isLeaving,
  recentJoins,
  recentJoinsCount,
  walletConnected,
}: HeroSectionProps) {
  const playersNeeded = Math.max(0, minPlayers - playerCount);
  const spotsLeft = maxPlayers - playerCount;
  const progressPercent = (playerCount / maxPlayers) * 100;
  // Calculate max multiplier based on actual 1st place winnings (not total pool)
  const maxMultiplier = Math.round(maxFirstPlaceWin / entryFee);

  return (
    <div className={`hero-section state-${state} flex flex-col items-center justify-center p-6 lg:p-8 bg-[#1a1a1a]/80 backdrop-blur border border-white/[0.06] rounded-2xl min-h-[400px] lg:min-h-[500px] gap-5`}>
      {/* Game Badge */}
      <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border border-warning/30 rounded-full">
        <Crown className="w-4 h-4 text-warning" />
        <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-warning">Last Degen Standing</span>
      </div>

      {/* Status Badge (when ready or full) */}
      {state === 'ready' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/30 rounded-full">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs font-semibold uppercase text-success">Game Ready - Starting Soon</span>
        </div>
      )}
      {state === 'full' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/30 rounded-full">
          <span className="text-xs font-semibold uppercase text-danger">Lobby Full</span>
        </div>
      )}

      {/* Timer */}
      <div className={`text-center ${state === 'ready' ? 'scale-110' : ''}`}>
        <span className="block text-xs text-white/50 uppercase tracking-widest mb-1">
          {state === 'empty' ? 'Next Game In' : 'Starting In'}
        </span>
        <span className={`text-5xl sm:text-6xl lg:text-7xl font-black text-warning leading-none ${state !== 'empty' ? 'animate-pulse' : ''}`} style={{ fontFamily: 'Impact, sans-serif', textShadow: '0 0 30px rgba(249, 115, 22, 0.4)' }}>
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Prize Pool Display */}
      {state === 'empty' ? (
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-center">
            <span className="block text-[10px] text-white/40 uppercase mb-1">Current Pool</span>
            <span className="text-lg sm:text-xl font-semibold text-white/40">0 SOL</span>
          </div>
          <span className="text-white/30 text-xl">→</span>
          <div className="text-center">
            <span className="block text-[10px] text-white/40 uppercase mb-1">If Lobby Fills</span>
            <span className="text-lg sm:text-xl font-bold text-success">{formatSOL(projectedPool)} SOL</span>
          </div>
        </div>
      ) : (
        <div className={`text-center ${state === 'ready' ? 'scale-105' : ''}`}>
          <span className="block text-3xl sm:text-4xl lg:text-5xl font-bold text-success">
            {formatSOL(prizePool)} SOL
          </span>
          <span className="text-sm text-white/50">{playerCount} players joined</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full max-w-md">
        <div className="h-2 bg-[#333] rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r from-warning to-orange-400 rounded-full transition-all duration-500 ${state === 'filling' ? 'animate-shimmer' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/50">
          <span>{playerCount} players</span>
          {state === 'filling' && (
            <span className="text-warning font-semibold">{playersNeeded} more to start!</span>
          )}
          <span>{maxPlayers} max</span>
        </div>
      </div>

      {/* CTA Button */}
      {state !== 'full' ? (
        isInGame ? (
          <button
            onClick={onLeave}
            disabled={isLeaving}
            className="flex flex-col items-center px-8 py-4 bg-danger/20 border-2 border-danger rounded-xl hover:bg-danger/30 transition-all disabled:opacity-50 group"
          >
            <span className="text-lg font-bold text-danger">
              {isLeaving ? 'Leaving...' : 'Leave Game'}
            </span>
            <span className="text-xs text-danger/70">Get refund before game starts</span>
          </button>
        ) : (
          <button
            onClick={onJoin}
            disabled={isJoining || !walletConnected}
            className={`flex flex-col items-center px-10 py-5 rounded-xl transition-all disabled:opacity-50 group ${
              state === 'ready'
                ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)]'
                : 'bg-gradient-to-br from-warning to-orange-600 shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:shadow-[0_0_50px_rgba(249,115,22,0.6)]'
            } ${state !== 'empty' ? 'animate-button-pulse' : ''} hover:-translate-y-0.5`}
          >
            <span className="text-lg sm:text-xl font-bold text-white">
              {isJoining ? 'Joining...' : !walletConnected ? 'Connect Wallet' : state === 'ready' ? 'Join Before It Starts!' : 'Join Game'}
            </span>
            <span className="text-xs text-white/80 mt-1">
              {state === 'filling'
                ? `${playersNeeded} more until game starts!`
                : state === 'ready'
                  ? `${spotsLeft} spots left`
                  : `${entryFee} SOL Entry - Win up to ${maxMultiplier}x`
              }
            </span>
          </button>
        )
      ) : (
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-[#333] border border-white/10 rounded-xl text-white font-semibold hover:bg-[#3a3a3a] transition-colors">
            Watch This Game
          </button>
          <button className="px-6 py-3 bg-gradient-to-br from-warning to-orange-600 rounded-xl text-white font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all">
            Join Next Lobby
          </button>
        </div>
      )}

      {/* Social Proof / Recent Activity */}
      {state === 'empty' && recentJoinsCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Flame className="w-4 h-4 text-warning" />
          <span>{recentJoinsCount} players joined games in the last hour</span>
        </div>
      )}

      {state === 'filling' && recentJoins.length > 0 && (
        <div className="flex flex-col gap-2 max-w-xs">
          {recentJoins.slice(0, 3).map((player, i) => (
            <div key={player.walletAddress} className="flex items-center gap-2 text-sm text-white/60 animate-fade-in">
              <UserPlus className="w-3.5 h-3.5 text-success" />
              <span className="text-white font-medium">
                {player.username || `${player.walletAddress.slice(0, 4)}...${player.walletAddress.slice(-4)}`}
              </span>
              <span>joined</span>
              {player.joinedAt && <span className="text-white/40">{formatTimeAgo(player.joinedAt)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
