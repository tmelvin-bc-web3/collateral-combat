'use client';

import { Flame, Skull, TrendingUp, TrendingDown, Users } from 'lucide-react';
import Image from 'next/image';
import { HotToken } from './types';

interface HotTokensSectionProps {
  tokens: HotToken[];
}

function TokenRow({ token, rank }: { token: HotToken; rank: number }) {
  const isGainer = token.change >= 0;

  return (
    <div className="flex items-center justify-between py-2.5 hover:bg-white/5 rounded-lg px-2 transition-colors">
      {/* Left: Rank + Token Info */}
      <div className="flex items-center gap-3">
        {/* Rank with flame/skull icon */}
        <div className="w-6 flex justify-center">
          {rank <= 3 && isGainer ? (
            <Flame className="w-4 h-4 text-orange-500" />
          ) : rank <= 3 && !isGainer ? (
            <Skull className="w-4 h-4 text-danger" />
          ) : (
            <span className="text-xs text-white/40">{rank}</span>
          )}
        </div>

        {/* Token Logo */}
        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
          {token.logo ? (
            <Image
              src={token.logo}
              alt={token.symbol}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold">{token.symbol[0]}</span>
          )}
        </div>

        {/* Symbol + Name */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{token.symbol}</span>
          <span className="text-xs text-white/40 truncate max-w-[100px]">
            {token.name}
          </span>
        </div>
      </div>

      {/* Right: Change + Pick Count */}
      <div className="flex items-center gap-4">
        {/* Pick Count */}
        <div className="flex items-center gap-1 text-white/40">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs">{token.pickCount}</span>
        </div>

        {/* Change % */}
        <div
          className={`flex items-center gap-1 min-w-[70px] justify-end ${
            isGainer ? 'text-success' : 'text-danger'
          }`}
        >
          {isGainer ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="text-sm font-semibold">
            {isGainer ? '+' : ''}
            {token.change.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function HotTokensSection({ tokens }: HotTokensSectionProps) {
  // Split into gainers and losers
  const gainers = tokens.filter((t) => t.change >= 0).slice(0, 5);
  const losers = tokens.filter((t) => t.change < 0).slice(0, 5);

  const hasTokens = tokens.length > 0;

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold uppercase tracking-wide">
          Hot Tokens This Week
        </h2>
      </div>

      {!hasTokens ? (
        <div className="text-center py-8">
          <TrendingUp className="w-10 h-10 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">No token data yet</p>
          <p className="text-white/30 text-xs">Data appears after battles begin</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Gainers */}
          {gainers.length > 0 && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" />
                Top Gainers
              </div>
              <div className="space-y-0.5">
                {gainers.map((token, idx) => (
                  <TokenRow key={token.symbol} token={token} rank={idx + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom Performers */}
          {losers.length > 0 && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-danger" />
                Struggling
              </div>
              <div className="space-y-0.5">
                {losers.map((token, idx) => (
                  <TokenRow key={token.symbol} token={token} rank={idx + 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
