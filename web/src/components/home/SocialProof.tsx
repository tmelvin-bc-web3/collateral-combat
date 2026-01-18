'use client';

import { Gamepad2, Coins, Users, Trophy, Lock, Zap, Target, BarChart3 } from 'lucide-react';
import { PlatformStats } from './types';

interface SocialProofProps {
  stats: PlatformStats;
}

export function SocialProof({ stats }: SocialProofProps) {
  return (
    <section className="mb-16">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Gamepad2 className="w-5 h-5" />}
          value={stats.totalGames.toLocaleString()}
          label="Games Played"
          change={`+${stats.todayStats.games} today`}
          changeType="up"
        />
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          value={`${stats.totalVolume.toLocaleString()} SOL`}
          label="Total Volume"
          change={`+${stats.todayStats.volume.toLocaleString()} today`}
          changeType="up"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          value={stats.uniquePlayers.toLocaleString()}
          label="Unique Players"
          change={`+${stats.todayStats.players} this week`}
          changeType="up"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          value={`${stats.biggestWin.amount} SOL`}
          label="Biggest Win Ever"
          subtext={`by ${stats.biggestWin.winner} in ${stats.biggestWin.game}`}
          highlight
        />
      </div>

      {/* Trust Bar */}
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TrustItem
            icon={<Lock className="w-4 h-4" />}
            text="On-chain & Verifiable"
          />
          <TrustItem
            icon={<Zap className="w-4 h-4" />}
            text="Instant Payouts"
          />
          <TrustItem
            icon={<Target className="w-4 h-4" />}
            text="Pure PvP - No House Edge"
          />
          <TrustItem
            icon={<BarChart3 className="w-4 h-4" />}
            text="5% Rake Only"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  value,
  label,
  change,
  changeType,
  subtext,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  change?: string;
  changeType?: 'up' | 'down';
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-[#1a1a1a] border rounded-xl p-4 ${highlight ? 'border-warning/20' : 'border-white/[0.06]'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${highlight ? 'bg-warning/10 text-warning' : 'bg-white/5 text-white/40'}`}>
        {icon}
      </div>
      <div className={`text-2xl font-bold mb-1 ${highlight ? 'text-warning' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</div>
      {change && (
        <div className={`text-xs ${changeType === 'up' ? 'text-success' : 'text-danger'}`}>
          {change}
        </div>
      )}
      {subtext && (
        <div className="text-[10px] text-white/30 mt-1">{subtext}</div>
      )}
    </div>
  );
}

function TrustItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-warning">{icon}</span>
      <span className="text-xs text-white/60">{text}</span>
    </div>
  );
}
