'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { DraftProvider, useDraftContext } from '@/contexts/DraftContext';
import { DraftPick, Memecoin } from '@/types';
import { PageLoading } from '@/components/ui/skeleton';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Animated card reveal for draft options
function AnimatedCoinCard({
  coin,
  onSelect,
  selected,
  disabled,
  index,
  revealed,
}: {
  coin: Memecoin;
  onSelect: () => void;
  selected?: boolean;
  disabled?: boolean;
  index: number;
  revealed: boolean;
}) {
  const priceChange = coin.priceChange24h || 0;
  const isPositive = priceChange >= 0;
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Reset flip state when revealed changes (new round starts with revealed=false)
  useEffect(() => {
    if (!revealed) {
      setIsFlipped(false);
    }
  }, [revealed]);

  // Handle card flip
  const handleClick = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    } else {
      onSelect();
    }
  };

  return (
    <div
      className={`relative transition-all duration-500 ${
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        transitionDelay: `${index * 100}ms`,
        perspective: '1000px',
        height: '200px',
      }}
    >
      {/* Card container with 3D flip */}
      <div
        className={`relative w-full h-full transition-transform duration-700 cursor-pointer`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card Back */}
        <div
          className={`absolute inset-0 rounded-2xl border-2 overflow-hidden ${
            isHovered && !isFlipped
              ? 'border-accent/50 shadow-lg shadow-accent/20'
              : 'border-accent/30'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-bg-secondary to-bg-tertiary" />

          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(0, 212, 170, 0.3) 10px,
                rgba(0, 212, 170, 0.3) 20px
              )`
            }} />
          </div>

          {/* Center design */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Logo */}
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center mb-3 shadow-lg transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
              <svg className="w-8 h-8 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Text */}
            <div className="text-accent font-bold text-sm mb-1">MEMECOIN</div>
            <div className="text-text-tertiary text-xs">Tap to reveal</div>

            {/* Shimmer effect on hover */}
            {isHovered && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            )}
          </div>

          {/* Corner decorations */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-accent/40 rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-accent/40 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-accent/40 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-accent/40 rounded-br-lg" />

          {/* Card number */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-sm">
              {index + 1}
            </div>
          </div>
        </div>

        {/* Card Front (revealed coin) */}
        <div
          className={`absolute inset-0 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
            selected
              ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
              : 'border-border-primary bg-bg-secondary hover:border-accent/50 hover:shadow-lg'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Animated background gradient */}
          <div
            className={`absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent transition-opacity duration-300 ${
              isHovered || selected ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Sparkle effect when selected */}
          {selected && (
            <>
              <div className="absolute top-12 left-2 w-1 h-1 bg-accent rounded-full animate-ping" />
              <div className="absolute top-16 right-4 w-1 h-1 bg-accent rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
              <div className="absolute bottom-6 left-6 w-1 h-1 bg-accent rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
            </>
          )}

          <div className="relative z-10 p-4 h-full flex flex-col">
            {/* Market Cap Rank Badge - Top row */}
            <div className="flex justify-between items-center mb-2">
              <div className="px-2 py-0.5 rounded-full bg-bg-tertiary/80 text-xs text-text-tertiary">
                Rank #{coin.marketCapRank}
              </div>
              {/* Selection checkmark */}
              {selected && (
                <div className="animate-bounceIn">
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
                    <svg className="w-3 h-3 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Coin Header */}
            <div className="flex items-center gap-3 mb-2">
              {coin.logoUrl ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={coin.logoUrl}
                    alt={coin.symbol}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-bg-primary font-bold">
                  {coin.symbol.slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{coin.symbol}</div>
                <div className="text-[10px] text-text-tertiary truncate">{coin.name}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-between items-end pt-2 border-t border-border-primary/50 mt-auto">
              <div>
                <div className="text-[10px] text-text-tertiary">Price</div>
                <div className="font-semibold text-sm">${coin.currentPrice?.toFixed(6) || '0.00'}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-text-tertiary">24h</div>
                <div className={`font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                  {isPositive ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Tap to select hint */}
            {isFlipped && !selected && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-text-tertiary animate-pulse">
                Tap to select
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Selected coin detail panel
function SelectedCoinPanel({ coin }: { coin: Memecoin }) {
  const priceChange = coin.priceChange24h || 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-gradient-to-r from-accent/10 via-bg-secondary to-bg-secondary rounded-2xl border-2 border-accent/30 p-6 animate-slideUp">
      <div className="flex items-center gap-4">
        {/* Large coin logo */}
        {coin.logoUrl ? (
          <img
            src={coin.logoUrl}
            alt={coin.symbol}
            className="w-20 h-20 rounded-2xl shadow-lg"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-bg-primary font-bold text-2xl shadow-lg">
            {coin.symbol.slice(0, 2)}
          </div>
        )}

        {/* Coin info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-2xl font-black">{coin.symbol}</h3>
            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold">
              Rank #{coin.marketCapRank}
            </span>
          </div>
          <p className="text-text-secondary mb-3">{coin.name}</p>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-text-tertiary">Current Price</div>
              <div className="text-xl font-bold">${coin.currentPrice?.toFixed(8) || '0.00'}</div>
            </div>
            <div>
              <div className="text-xs text-text-tertiary">24h Change</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                {Math.abs(priceChange).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30 animate-pulse">
            <svg className="w-7 h-7 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-accent text-xs font-bold">SELECTED</span>
        </div>
      </div>
    </div>
  );
}

// Picked coin with animations
function PickedCoinCard({
  pick,
  prices,
  onSwap,
  onBoost,
  onFreeze,
  canSwap,
  canBoost,
  canFreeze,
  index,
}: {
  pick: DraftPick;
  prices: Record<string, number>;
  onSwap: () => void;
  onBoost: () => void;
  onFreeze: () => void;
  canSwap: boolean;
  canBoost: boolean;
  canFreeze: boolean;
  index: number;
}) {
  const currentPrice = prices[pick.coinId] || pick.priceAtDraft;
  const percentChange = ((currentPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;
  const [showPowerupEffect, setShowPowerupEffect] = useState<'boost' | 'freeze' | null>(null);

  const displayChange = pick.isFrozen && pick.frozenAtPrice
    ? Math.max(((pick.frozenAtPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100, percentChange)
    : percentChange;

  const isPositive = displayChange >= 0;
  const effectiveChange = displayChange * (pick.boostMultiplier || 1);

  const handleBoost = () => {
    setShowPowerupEffect('boost');
    setTimeout(() => setShowPowerupEffect(null), 1000);
    onBoost();
  };

  const handleFreeze = () => {
    setShowPowerupEffect('freeze');
    setTimeout(() => setShowPowerupEffect(null), 1000);
    onFreeze();
  };

  return (
    <div
      className={`relative p-4 rounded-2xl border-2 transition-all duration-500 overflow-hidden animate-slideUp ${
        pick.isFrozen
          ? 'border-accent/50 bg-gradient-to-br from-accent/10 to-transparent'
          : pick.boostMultiplier > 1
          ? 'border-success/50 bg-gradient-to-br from-success/10 to-transparent'
          : 'border-border-primary bg-bg-secondary hover:border-border-secondary'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Power-up activation effects */}
      {showPowerupEffect === 'boost' && (
        <div className="absolute inset-0 bg-success/20 animate-pulse pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-bounceIn">🚀</span>
          </div>
        </div>
      )}
      {showPowerupEffect === 'freeze' && (
        <div className="absolute inset-0 bg-accent/20 animate-pulse pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-bounceIn">❄️</span>
          </div>
        </div>
      )}

      {/* Frozen overlay effect */}
      {pick.isFrozen && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-accent/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-accent/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
      )}

      {/* Boosted fire effect */}
      {pick.boostMultiplier > 1 && (
        <div className="absolute top-0 right-0 text-2xl animate-bounce">🔥</div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          {/* Pick number badge */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
            pick.isFrozen ? 'bg-accent/20 text-accent' : pick.boostMultiplier > 1 ? 'bg-success/20 text-success' : 'bg-accent/10 text-accent'
          }`}>
            {pick.pickOrder}
          </div>

          {/* Coin logo */}
          {pick.coinLogoUrl ? (
            <img src={pick.coinLogoUrl} alt={pick.coinSymbol} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-bg-primary font-bold">
              {pick.coinSymbol.slice(0, 2)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="font-bold truncate flex items-center gap-2">
              {pick.coinSymbol}
              {pick.boostMultiplier > 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-bold animate-pulse">
                  2X
                </span>
              )}
              {pick.isFrozen && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">
                  ❄️ FROZEN
                </span>
              )}
            </div>
            <div className="text-xs text-text-tertiary truncate">{pick.coinName}</div>
          </div>

          {/* Score display */}
          <div className="text-right">
            <div className={`text-xl font-black ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? '+' : ''}{effectiveChange.toFixed(2)}%
            </div>
            <div className="text-xs text-text-tertiary">
              ${currentPrice.toFixed(6)}
            </div>
          </div>
        </div>

        {/* Power-up buttons */}
        <div className="flex gap-2">
          <button
            onClick={onSwap}
            disabled={!canSwap || pick.isFrozen || pick.boostMultiplier > 1}
            className="flex-1 py-2 px-3 rounded-xl text-sm font-bold bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Swap
          </button>
          <button
            onClick={handleBoost}
            disabled={!canBoost || pick.boostMultiplier > 1}
            className="flex-1 py-2 px-3 rounded-xl text-sm font-bold bg-success/10 text-success border border-success/30 hover:bg-success/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1"
          >
            <span>🚀</span>
            2x Boost
          </button>
          <button
            onClick={handleFreeze}
            disabled={!canFreeze || pick.isFrozen}
            className="flex-1 py-2 px-3 rounded-xl text-sm font-bold bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1"
          >
            <span>❄️</span>
            Freeze
          </button>
        </div>
      </div>
    </div>
  );
}

// Animated progress indicator
function DraftProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative">
          {/* Connecting line */}
          {i < total - 1 && (
            <div className={`absolute top-1/2 left-full w-3 h-0.5 -translate-y-1/2 transition-colors duration-500 ${
              i < current ? 'bg-accent' : 'bg-border-primary'
            }`} />
          )}

          {/* Circle */}
          <div
            className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
              i < current
                ? 'bg-accent text-bg-primary scale-100'
                : i === current
                ? 'bg-transparent text-accent border-2 border-accent scale-110 animate-pulse'
                : 'bg-bg-tertiary text-text-tertiary scale-90'
            }`}
          >
            {i < current ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}

            {/* Active ring animation */}
            {i === current && (
              <div className="absolute inset-0 rounded-full border-2 border-accent animate-ping opacity-50" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Pick confirmed celebration
function PickCelebration({ coin, pickNumber, onComplete }: { coin: Memecoin; pickNumber: number; onComplete: () => void }) {
  const priceChange = coin.priceChange24h || 0;
  const isPositive = priceChange >= 0;

  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fadeIn" />

      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 animate-confetti"
            style={{
              backgroundColor: ['#00d4aa', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#22c55e'][i % 6],
              left: `${Math.random() * 100}%`,
              top: '-20px',
              borderRadius: i % 2 === 0 ? '50%' : '2px',
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${1.5 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Main celebration card */}
      <div className="relative animate-bounceIn">
        {/* Glowing ring effect */}
        <div className="absolute -inset-8 rounded-full bg-accent/20 blur-3xl animate-pulse" />
        <div className="absolute -inset-4 rounded-full bg-accent/10 blur-xl animate-pulse" style={{ animationDelay: '0.2s' }} />

        <div className="relative bg-gradient-to-br from-bg-secondary via-bg-secondary to-bg-tertiary rounded-3xl border-2 border-accent/50 p-8 shadow-2xl shadow-accent/20 min-w-[400px]">
          {/* Pick number badge */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="px-4 py-1 rounded-full bg-accent text-bg-primary font-black text-sm shadow-lg shadow-accent/30">
              PICK #{pickNumber}
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6 pt-2">
            <div className="text-4xl mb-2 animate-bounce">🎯</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent to-success">
              LOCKED IN!
            </h2>
          </div>

          {/* Coin display */}
          <div className="flex items-center gap-5 bg-bg-tertiary/50 rounded-2xl p-5 border border-border-primary mb-6">
            {/* Coin logo with glow */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-accent/30 blur-xl animate-pulse" />
              {coin.logoUrl ? (
                <img
                  src={coin.logoUrl}
                  alt={coin.symbol}
                  className="relative w-20 h-20 rounded-2xl shadow-lg"
                />
              ) : (
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-bg-primary font-black text-2xl shadow-lg">
                  {coin.symbol.slice(0, 2)}
                </div>
              )}
            </div>

            {/* Coin details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-black">{coin.symbol}</span>
                <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-tertiary text-xs">
                  #{coin.marketCapRank}
                </span>
              </div>
              <div className="text-text-secondary mb-3">{coin.name}</div>

              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-text-tertiary">Price</div>
                  <div className="font-bold">${coin.currentPrice?.toFixed(6) || '0.00'}</div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary">24h</div>
                  <div className={`font-bold flex items-center gap-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                    {isPositive ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Checkmark */}
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-lg shadow-success/30">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  num < pickNumber
                    ? 'bg-accent/20 text-accent'
                    : num === pickNumber
                    ? 'bg-accent text-bg-primary scale-110'
                    : 'bg-bg-tertiary text-text-tertiary'
                }`}
              >
                {num < pickNumber ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  num
                )}
              </div>
            ))}
          </div>

          {/* Bottom text */}
          <div className="text-center mt-4 text-text-tertiary text-sm">
            {pickNumber < 6 ? `${6 - pickNumber} more pick${6 - pickNumber > 1 ? 's' : ''} to go!` : 'Team complete!'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Swap modal with animations
function SwapModal({
  options,
  onSelect,
  onCancel,
}: {
  options: Memecoin[];
  onSelect: (coinId: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setTimeout(() => setRevealed(true), 100);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fadeIn" onClick={onCancel} />
      <div className="relative bg-bg-secondary border border-border-primary rounded-3xl p-8 max-w-3xl w-full animate-slideUp">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning/20 text-warning mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h2 className="text-2xl font-black mb-2">Swap Your Pick</h2>
          <p className="text-text-secondary">Choose a new coin to replace your current pick</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {options.map((coin, i) => (
            <AnimatedCoinCard
              key={coin.id}
              coin={coin}
              index={i}
              revealed={revealed}
              onSelect={() => setSelected(coin.id)}
              selected={selected === coin.id}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 px-6 rounded-2xl border-2 border-border-primary font-bold hover:bg-bg-tertiary transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-warning to-warning/80 text-bg-primary font-bold hover:shadow-lg hover:shadow-warning/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
          >
            Confirm Swap
          </button>
        </div>
      </div>
    </div>
  );
}

// Round intro animation
function RoundIntro({ round, onComplete }: { round: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary">
      <div className="text-center animate-fadeIn">
        <div className="text-8xl font-black text-accent mb-4 animate-pulse">
          {round}
        </div>
        <div className="text-2xl font-bold text-text-secondary">
          Round {round} of 6
        </div>
        <div className="mt-4 text-text-tertiary">
          Choose wisely...
        </div>
      </div>
    </div>
  );
}

function DraftEntryContent() {
  const params = useParams();
  const router = useRouter();
  const entryId = params.entryId as string;

  const {
    currentEntry,
    currentRound,
    draftSession,
    swapOptions,
    prices,
    memecoins,
    isLoading,
    error,
    startDraft,
    makePick,
    useSwap,
    selectSwapCoin,
    useBoost,
    useFreeze,
    refreshEntry,
  } = useDraftContext();

  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [swappingPickId, setSwappingPickId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [showCelebration, setShowCelebration] = useState<Memecoin | null>(null);
  const [showRoundIntro, setShowRoundIntro] = useState(false);
  const [lastRound, setLastRound] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Fetch entry on mount
  useEffect(() => {
    if (entryId) {
      refreshEntry(entryId).finally(() => setLocalLoading(false));
    }
  }, [entryId, refreshEntry]);

  // Auto-start draft if not completed
  useEffect(() => {
    if (currentEntry && !currentEntry.draftCompleted && !draftSession) {
      startDraft(entryId);
    }
  }, [currentEntry, draftSession, entryId, startDraft]);

  // Show round intro and reveal cards when round changes
  useEffect(() => {
    if (currentRound && currentRound.roundNumber !== lastRound) {
      setCardsRevealed(false);
      setSelectedCoin(null);

      // Show round intro for first round or when changing rounds
      if (lastRound !== null) {
        setShowRoundIntro(true);
      } else {
        // First round - just reveal cards after short delay
        setTimeout(() => setCardsRevealed(true), 300);
      }

      setLastRound(currentRound.roundNumber);
    }
  }, [currentRound, lastRound]);

  const handleRoundIntroComplete = useCallback(() => {
    setShowRoundIntro(false);
    setTimeout(() => setCardsRevealed(true), 300);
  }, []);

  const handleMakePick = useCallback(() => {
    if (selectedCoin && currentRound && !isConfirming) {
      setIsConfirming(true);
      const coin = currentRound.options.find(c => c.id === selectedCoin);
      if (coin) {
        setShowCelebration(coin);
      }
      makePick(currentRound.roundNumber, selectedCoin);
      setTimeout(() => {
        setIsConfirming(false);
      }, 1500);
    }
  }, [selectedCoin, currentRound, makePick, isConfirming]);

  const handleSwap = useCallback((pickId: string) => {
    setSwappingPickId(pickId);
    useSwap(pickId);
  }, [useSwap]);

  const handleSelectSwapCoin = useCallback((coinId: string) => {
    if (swappingPickId) {
      selectSwapCoin(swappingPickId, coinId);
      setSwappingPickId(null);
    }
  }, [swappingPickId, selectSwapCoin]);

  // Check power-up availability
  const powerUpsUsed = currentEntry?.powerUpsUsed || [];
  const canSwap = !powerUpsUsed.some((p: { powerupType: string }) => p.powerupType === 'swap');
  const canBoost = !powerUpsUsed.some((p: { powerupType: string }) => p.powerupType === 'boost');
  const canFreeze = !powerUpsUsed.some((p: { powerupType: string }) => p.powerupType === 'freeze');

  // Calculate total score
  const calculateTotalScore = () => {
    if (!currentEntry?.picks) return 0;
    return currentEntry.picks.reduce((total, pick) => {
      const currentPrice = prices[pick.coinId] || pick.priceAtDraft;
      let percentChange = ((currentPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;

      if (pick.isFrozen && pick.frozenAtPrice) {
        const frozenChange = ((pick.frozenAtPrice - pick.priceAtDraft) / pick.priceAtDraft) * 100;
        percentChange = Math.max(frozenChange, percentChange);
      }

      return total + (percentChange * (pick.boostMultiplier || 1));
    }, 0);
  };

  if (localLoading || isLoading) {
    return <PageLoading message="Loading your draft..." />;
  }

  if (!currentEntry) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-6xl mb-6">🎯</div>
        <h1 className="text-2xl font-bold mb-4">Entry Not Found</h1>
        <p className="text-text-secondary mb-6">This draft entry doesn't exist or you don't have access to it.</p>
        <Link href="/draft" className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-accent text-bg-primary font-bold hover:bg-accent/90 transition-colors">
          ← Back to Draft Lobby
        </Link>
      </div>
    );
  }

  // Drafting Phase
  if (!currentEntry.draftCompleted && currentRound) {
    return (
      <>
        {showRoundIntro && (
          <RoundIntro round={currentRound.roundNumber} onComplete={handleRoundIntroComplete} />
        )}

        {showCelebration && (
          <PickCelebration
            coin={showCelebration}
            pickNumber={currentRound.roundNumber}
            onComplete={() => setShowCelebration(null)}
          />
        )}

        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <Link href="/draft" className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary mb-6 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Lobby
            </Link>

            <h1 className="text-4xl font-black mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/70">
                Draft Your Team
              </span>
            </h1>
            <p className="text-lg text-text-secondary mb-8">
              Pick {currentRound.roundNumber} of 6 — Choose your next memecoin
            </p>

            <DraftProgress current={currentRound.roundNumber - 1} total={6} />
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-danger/20 border border-danger/30 text-danger text-center animate-shake">
              {error}
            </div>
          )}

          {/* Card Options */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            {currentRound.options.map((coin, i) => (
              <AnimatedCoinCard
                key={coin.id}
                coin={coin}
                index={i}
                revealed={cardsRevealed}
                onSelect={() => setSelectedCoin(coin.id)}
                selected={selectedCoin === coin.id}
              />
            ))}
          </div>

          {/* Selected Coin Detail Panel */}
          {selectedCoin && (
            <div className="mb-8">
              {(() => {
                const coin = currentRound.options.find(c => c.id === selectedCoin);
                return coin ? <SelectedCoinPanel coin={coin} /> : null;
              })()}
            </div>
          )}

          {/* Confirm Button */}
          <div className="flex justify-center mb-12">
            <button
              onClick={handleMakePick}
              disabled={!selectedCoin || isConfirming}
              className={`relative py-4 px-16 rounded-2xl font-bold text-lg transition-all duration-300 ${
                selectedCoin
                  ? 'bg-gradient-to-r from-accent to-accent/80 text-bg-primary shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
              }`}
            >
              {isConfirming ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : (
                'Confirm Pick'
              )}
            </button>
          </div>

          {/* Already picked coins */}
          {currentEntry.picks.length > 0 && (
            <div className="bg-bg-secondary/50 rounded-2xl p-6 border border-border-primary">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>Your Picks</span>
                <span className="text-sm font-normal text-text-tertiary">
                  ({currentEntry.picks.length}/6)
                </span>
              </h2>
              <div className="flex flex-wrap gap-3">
                {currentEntry.picks.map((pick, i) => (
                  <div
                    key={pick.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-tertiary border border-border-primary animate-slideUp"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xs">
                      {pick.pickOrder}
                    </div>
                    {pick.coinLogoUrl ? (
                      <img src={pick.coinLogoUrl} alt={pick.coinSymbol} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-[10px] font-bold text-accent">
                        {pick.coinSymbol.slice(0, 2)}
                      </div>
                    )}
                    <span className="font-semibold">{pick.coinSymbol}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // Team Management Phase (Draft Completed)
  const totalScore = calculateTotalScore();
  const isPositiveScore = totalScore >= 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <Link href="/draft" className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lobby
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Your Team</h1>
            <p className="text-text-secondary">
              Manage your picks and use power-ups strategically
            </p>
          </div>
          <div className="text-right p-6 rounded-2xl bg-bg-secondary border border-border-primary">
            <div className="text-sm text-text-tertiary mb-1">Total Score</div>
            <div className={`text-5xl font-black ${isPositiveScore ? 'text-success' : 'text-danger'}`}>
              {isPositiveScore ? '+' : ''}{totalScore.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-danger/20 border border-danger/30 text-danger text-center animate-shake">
          {error}
        </div>
      )}

      {/* Power-ups Status */}
      <div className="bg-gradient-to-r from-bg-secondary to-bg-tertiary rounded-2xl p-6 border border-border-primary mb-8">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Power-ups Available
        </h2>
        <div className="flex gap-4">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${
            canSwap
              ? 'bg-warning/10 text-warning border border-warning/30'
              : 'bg-bg-primary text-text-tertiary border border-border-primary opacity-50'
          }`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="font-bold">Swap</span>
            {!canSwap && <span className="text-xs">(Used)</span>}
          </div>
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${
            canBoost
              ? 'bg-success/10 text-success border border-success/30'
              : 'bg-bg-primary text-text-tertiary border border-border-primary opacity-50'
          }`}>
            <span className="text-xl">🚀</span>
            <span className="font-bold">2x Boost</span>
            {!canBoost && <span className="text-xs">(Used)</span>}
          </div>
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${
            canFreeze
              ? 'bg-accent/10 text-accent border border-accent/30'
              : 'bg-bg-primary text-text-tertiary border border-border-primary opacity-50'
          }`}>
            <span className="text-xl">❄️</span>
            <span className="font-bold">Freeze</span>
            {!canFreeze && <span className="text-xs">(Used)</span>}
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {currentEntry.picks
          .sort((a, b) => a.pickOrder - b.pickOrder)
          .map((pick, i) => (
            <PickedCoinCard
              key={pick.id}
              pick={pick}
              prices={prices}
              onSwap={() => handleSwap(pick.id)}
              onBoost={() => useBoost(pick.id)}
              onFreeze={() => useFreeze(pick.id)}
              canSwap={canSwap}
              canBoost={canBoost}
              canFreeze={canFreeze}
              index={i}
            />
          ))}
      </div>

      {/* Tournament Info */}
      <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-2xl p-6 border border-border-primary">
        <h2 className="font-bold mb-6 flex items-center gap-2">
          <span className="text-xl">🏆</span>
          Tournament Status
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-xl bg-bg-primary/50">
            <div className="text-sm text-text-tertiary mb-1">Your Rank</div>
            <div className="text-3xl font-black text-accent">
              {currentEntry.finalRank ? `#${currentEntry.finalRank}` : '-'}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-bg-primary/50">
            <div className="text-sm text-text-tertiary mb-1">Potential Payout</div>
            <div className="text-3xl font-black text-success">
              {currentEntry.payoutUsd ? `$${currentEntry.payoutUsd.toFixed(2)}` : '-'}
            </div>
          </div>
          <div className="text-center p-4 rounded-xl bg-bg-primary/50">
            <div className="text-sm text-text-tertiary mb-1">Entry Fee</div>
            <div className="text-3xl font-black">
              ${currentEntry.entryFeePaid}
            </div>
          </div>
        </div>
      </div>

      {/* Swap Modal */}
      {swapOptions && swappingPickId && (
        <SwapModal
          options={swapOptions}
          onSelect={handleSelectSwapCoin}
          onCancel={() => setSwappingPickId(null)}
        />
      )}
    </div>
  );
}

function DraftEntryWithWallet() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  return (
    <DraftProvider walletAddress={walletAddress}>
      <DraftEntryContent />
    </DraftProvider>
  );
}

export default function DraftEntryPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageLoading message="Preparing Draft Room..." />;
  }

  return <DraftEntryWithWallet />;
}
