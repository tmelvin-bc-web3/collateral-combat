'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, Coins, Users, Eye, TrendingUp, TrendingDown, Crown, Swords, Trophy, Scale, Clapperboard, Flame, Calendar, Award } from 'lucide-react';

interface GameCardProps {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  isLive?: boolean;
  statusText?: string;
  stats: {
    label: string;
    value: string;
  }[];
  liveData?: {
    type: 'arena' | 'lds' | 'token-wars' | 'draft' | 'spectate' | 'events';
    data: any;
  };
  highlight?: boolean;
  variant?: 'default' | 'spectate';
  ctaText?: string;
}

export function GameCard({
  id,
  href,
  title,
  subtitle,
  description,
  icon,
  isLive = false,
  statusText,
  stats,
  liveData,
  highlight = false,
  variant = 'default',
  ctaText,
}: GameCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col bg-[#1a1a1a] border rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        highlight
          ? 'border-warning/30 hover:border-warning/50 hover:shadow-warning/10'
          : 'border-white/[0.06] hover:border-white/10 hover:shadow-white/5'
      }`}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${highlight ? 'bg-gradient-to-r from-transparent via-warning to-transparent' : 'bg-gradient-to-r from-transparent via-white/20 to-transparent'} opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className="p-5 flex-1 flex flex-col">
        {/* Status indicator */}
        <div className="flex items-center justify-between mb-4">
          {isLive ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 border border-success/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
              </span>
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live</span>
            </div>
          ) : variant === 'spectate' ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
              <Eye className="w-3 h-3 text-white/40" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Watch</span>
            </div>
          ) : null}

          {statusText && (
            <span className="text-[10px] text-white/40">{statusText}</span>
          )}
        </div>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
          highlight ? 'bg-warning/10 border border-warning/20 text-warning' : 'bg-white/5 border border-white/10 text-white/60'
        } group-hover:scale-110 transition-transform`}>
          {icon}
        </div>

        {/* Content */}
        <h3 className="text-lg font-black uppercase tracking-wide mb-0.5">{title}</h3>
        <p className={`text-xs uppercase tracking-wider mb-2 ${highlight ? 'text-warning/60' : 'text-white/40'}`}>{subtitle}</p>
        <p className="text-sm text-white/50 mb-4 flex-1">{description}</p>

        {/* Live Data Section - varies by game type */}
        {liveData && <LiveDataSection liveData={liveData} />}

        {/* Stats */}
        <div className="flex gap-4 pt-3 border-t border-white/[0.06]">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">{stat.label}</div>
              <div className={`font-bold text-sm ${highlight ? 'text-warning' : 'text-white/80'}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <div className={`w-full py-3 rounded-lg text-center font-bold text-sm transition-colors ${
          highlight
            ? 'bg-warning/10 text-warning group-hover:bg-warning/20'
            : variant === 'spectate'
            ? 'bg-white/5 text-white/60 group-hover:bg-white/10'
            : 'bg-white/5 text-white/80 group-hover:bg-white/10'
        }`}>
          {ctaText || `Enter ${title.split(' ')[0]}`}
        </div>
      </div>
    </Link>
  );
}

function LiveDataSection({ liveData }: { liveData: GameCardProps['liveData'] }) {
  if (!liveData) return null;

  switch (liveData.type) {
    case 'arena':
      return (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-white">{liveData.data.openBattles}</div>
            <div className="text-[10px] text-white/40 uppercase">Open Battles</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-success">{liveData.data.totalInPools} SOL</div>
            <div className="text-[10px] text-white/40 uppercase">In Pools</div>
          </div>
        </div>
      );

    case 'lds':
      const { playerCount, maxPlayers, prizePool, timeToStart } = liveData.data;
      const progress = (playerCount / maxPlayers) * 100;
      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };
      return (
        <div className="mb-4">
          {/* Progress bar */}
          <div className="mb-2">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-warning to-fire transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">{playerCount}/{maxPlayers} players</span>
            <span className="text-white/40">Starting in {formatTime(timeToStart)}</span>
          </div>
          {/* Prize Pool */}
          <div className="mt-2 bg-warning/10 rounded-lg p-2 text-center">
            <span className="text-[10px] text-white/40 uppercase">Prize Pool: </span>
            <span className="font-bold text-warning">{prizePool.toFixed(2)} SOL</span>
          </div>
        </div>
      );

    case 'token-wars':
      const { tokenA, tokenB, timeRemaining } = liveData.data;
      return (
        <div className="mb-4">
          <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2">
            <div className="flex items-center gap-2">
              <Image
                src={tokenA.image}
                alt={tokenA.symbol}
                width={28}
                height={28}
                className="rounded-full"
                unoptimized
              />
              <div>
                <div className="text-sm font-bold text-white">{tokenA.symbol}</div>
                <div className={`text-xs ${tokenA.change >= 0 ? 'text-success' : 'text-danger'}`}>
                  {tokenA.change >= 0 ? '+' : ''}{tokenA.change.toFixed(1)}%
                </div>
              </div>
            </div>
            <span className="text-white/30 font-bold text-xs">VS</span>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-bold text-white">{tokenB.symbol}</div>
                <div className={`text-xs ${tokenB.change >= 0 ? 'text-success' : 'text-danger'}`}>
                  {tokenB.change >= 0 ? '+' : ''}{tokenB.change.toFixed(1)}%
                </div>
              </div>
              <Image
                src={tokenB.image}
                alt={tokenB.symbol}
                width={28}
                height={28}
                className="rounded-full"
                unoptimized
              />
            </div>
          </div>
        </div>
      );

    case 'draft':
      const { currentLeader, activeParties } = liveData.data;
      return (
        <div className="mb-4 bg-white/[0.03] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-warning" />
              <span className="text-sm text-white/80">{currentLeader.username}</span>
            </div>
            <span className="text-sm font-bold text-success">+{currentLeader.return.toFixed(1)}%</span>
          </div>
          <div className="text-[10px] text-white/40 mt-1">
            View all {activeParties} parties →
          </div>
        </div>
      );

    case 'spectate':
      const { liveBattles, featuredBattle } = liveData.data;
      return (
        <div className="mb-4">
          {featuredBattle && (
            <div className="bg-white/[0.03] rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">{featuredBattle.player1}</span>
                <span className="text-white/30 text-xs">vs</span>
                <span className="text-white/80">{featuredBattle.player2}</span>
              </div>
              <div className="text-center text-warning text-xs mt-1">{featuredBattle.pool} SOL pool</div>
            </div>
          )}
          <div className="text-xs text-white/40 text-center">
            {liveBattles} live battles to watch
          </div>
        </div>
      );

    case 'events':
      const { upcomingEvents, nextTournament } = liveData.data;
      return (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-warning" />
              <div className="text-lg font-bold text-white">{upcomingEvents}</div>
              <div className="text-[10px] text-white/40 uppercase">Events</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2 text-center">
              <Award className="w-4 h-4 mx-auto mb-1 text-success" />
              <div className="text-lg font-bold text-white">{nextTournament}</div>
              <div className="text-[10px] text-white/40 uppercase">Tournaments</div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Game card icons
export const GameIcons = {
  arena: <Swords className="w-6 h-6" />,
  lds: <Crown className="w-6 h-6" />,
  'token-wars': <Scale className="w-6 h-6" />,
  draft: <Trophy className="w-6 h-6" />,
  spectate: <Clapperboard className="w-6 h-6" />,
  events: <Calendar className="w-6 h-6" />,
  tournaments: <Award className="w-6 h-6" />,
};
