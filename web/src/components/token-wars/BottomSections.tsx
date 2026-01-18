'use client';

import { Target, Trophy, Clock } from 'lucide-react';
import Image from 'next/image';
import { LiveBet, RecentBattle, UpcomingMatchup, TWBetSide, LAMPORTS_PER_SOL } from './types';
import { getTokenLogo } from '@/config/tokenLogos';

interface BottomSectionsProps {
  liveBets: LiveBet[];
  recentBattles: RecentBattle[];
  upcomingMatchups: UpcomingMatchup[];
  betsThisBattle: number;
}

// Format wallet address
const formatWallet = (address: string) => {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Format time ago
const formatTimeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Token Logo Component
const TokenLogo = ({ symbol, size = 24 }: { symbol: string; size?: number }) => {
  const logoUrl = getTokenLogo(symbol);
  return (
    <Image
      src={logoUrl}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full"
      unoptimized
    />
  );
};

export function BottomSections({
  liveBets,
  recentBattles,
  upcomingMatchups,
  betsThisBattle,
}: BottomSectionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Live Bets */}
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/60">
            <Target className="w-4 h-4 text-warning" />
            LIVE BETS
          </div>
          <span className="text-xs font-bold text-warning">{betsThisBattle} bets</span>
        </div>

        {liveBets.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {liveBets.map((bet, i) => (
              <div
                key={bet.id}
                className={`flex items-center justify-between p-2.5 bg-white/5 rounded-lg text-sm ${
                  i === 0 ? 'animate-slide-in' : ''
                }`}
              >
                <span className="text-white/80 font-medium">{formatWallet(bet.user)}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  bet.token === 'token_a'
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                }`}>
                  {bet.tokenSymbol}
                </span>
                <span className="text-white/60">{bet.amount.toFixed(2)} SOL</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/40 text-sm">
            No bets yet - be the first!
          </div>
        )}
      </div>

      {/* Recent Results */}
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white/60">
          <Trophy className="w-4 h-4 text-warning" />
          RECENT BATTLES
        </div>

        {recentBattles.length > 0 ? (
          <div className="space-y-2">
            {recentBattles.slice(0, 5).map((battle) => (
              <div key={battle.id} className="p-2.5 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`flex items-center gap-1 text-xs font-semibold ${
                    battle.winner === 'token_a' ? 'text-success' : 'text-white/40'
                  }`}>
                    <TokenLogo symbol={battle.tokenA} size={16} />
                    {battle.tokenA}
                    <span className="text-[10px] ml-0.5">
                      {battle.tokenAPercentChange >= 0 ? '+' : ''}{battle.tokenAPercentChange.toFixed(2)}%
                    </span>
                  </span>

                  <span className="text-[10px] text-white/30">vs</span>

                  <span className={`flex items-center gap-1 text-xs font-semibold ${
                    battle.winner === 'token_b' ? 'text-danger' : 'text-white/40'
                  }`}>
                    <TokenLogo symbol={battle.tokenB} size={16} />
                    {battle.tokenB}
                    <span className="text-[10px] ml-0.5">
                      {battle.tokenBPercentChange >= 0 ? '+' : ''}{battle.tokenBPercentChange.toFixed(2)}%
                    </span>
                  </span>
                </div>

                <div className="flex justify-between text-[10px] text-white/40">
                  <span className="text-warning">{(battle.totalPool / LAMPORTS_PER_SOL).toFixed(2)} SOL</span>
                  <span>{formatTimeAgo(battle.completedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/40 text-sm">
            No recent battles
          </div>
        )}
      </div>

      {/* Upcoming Matchups */}
      <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white/60">
          <Clock className="w-4 h-4 text-warning" />
          UP NEXT
        </div>

        {upcomingMatchups.length > 0 ? (
          <div className="space-y-2">
            {upcomingMatchups.map((matchup, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Image
                    src={matchup.tokenA.logo}
                    alt={matchup.tokenA.symbol}
                    width={20}
                    height={20}
                    className="rounded-full"
                    unoptimized
                  />
                  <span className="text-sm font-semibold text-white/80">{matchup.tokenA.symbol}</span>

                  <span className="text-xs text-white/30 mx-1">vs</span>

                  <Image
                    src={matchup.tokenB.logo}
                    alt={matchup.tokenB.symbol}
                    width={20}
                    height={20}
                    className="rounded-full"
                    unoptimized
                  />
                  <span className="text-sm font-semibold text-white/80">{matchup.tokenB.symbol}</span>
                </div>

                <span className="text-xs text-white/40">
                  {i === 0 ? 'Next' : `+${(i + 1) * 5} min`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-white/40 text-sm">
            Matchups coming soon
          </div>
        )}
      </div>
    </div>
  );
}
