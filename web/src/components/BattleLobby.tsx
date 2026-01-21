'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBattleContext } from '@/contexts/BattleContext';
import { useBattleOnChain } from '@/hooks/useBattleOnChain';
import { useChallengeNotifications } from '@/hooks/useChallengeNotifications';
import { BattleConfig } from '@/types';
import { AssetIcon } from './AssetIcon';
import { ASSETS } from '@/lib/assets';
import { Card } from './ui/Card';
import { CreateChallengeModal, CreatedChallenge } from './CreateChallengeModal';
import { ShareChallengeModal } from './ShareChallengeModal';
import { MatchFoundModal } from './MatchFoundModal';
import { ChallengeAcceptedModal } from './ChallengeAcceptedModal';
import {
  ArenaHeader,
  LiveBattlesSection,
  BattleConfigPanel,
  RecentBattlesSection,
  LeaderboardPreview,
  ArenaStats,
  LiveBattleDisplay,
  WaitingPlayer,
  RecentBattle,
  LeaderboardEntry,
  QueueData,
} from './arena';

// Mock data for the arena
const mockStats: ArenaStats = {
  liveBattles: 2,
  playersInQueue: 8,
  battlesToday: 34,
  biggestWin: 4.75,
};

const mockQueueData: QueueData = {
  byAsset: { BTC: 3, ETH: 2, SOL: 3 },
  byDuration: { 1800: 5, 3600: 3 },
  byTier: { '0.1': 2, '0.5': 3, '1': 2, '5': 1 },
};

const mockLiveBattles: LiveBattleDisplay[] = [
  {
    id: '1',
    tier: 'Raider',
    asset: 'BTC/USDT',
    timeRemaining: 847,
    prizePool: 0.95,
    spectators: 12,
    player1: { name: 'degen42', pnl: 8.5, position: 'long', isWinning: true },
    player2: { name: 'trader99', pnl: -3.2, position: 'short', isWinning: false },
  },
  {
    id: '2',
    tier: 'Warlord',
    asset: 'ETH/USDT',
    timeRemaining: 1523,
    prizePool: 1.9,
    spectators: 8,
    player1: { name: 'whale_hunter', pnl: -1.8, position: 'short', isWinning: false },
    player2: { name: 'moonboy', pnl: 4.2, position: 'long', isWinning: true },
  },
];

const mockWaitingPlayers: WaitingPlayer[] = [
  { id: '1', name: 'shadow_trader', tier: '0.5', asset: 'BTC', waitTime: '2m' },
  { id: '2', name: 'crypto_king', tier: '1', asset: 'ETH', waitTime: '45s' },
];

const mockRecentBattles: RecentBattle[] = [
  { id: '1', winner: { name: 'degen42', pnl: 12.5 }, loser: { name: 'trader99', pnl: -8.2 }, prize: 0.95, asset: 'BTC', timeAgo: '2m ago' },
  { id: '2', winner: { name: 'whale_hunter', pnl: 6.8 }, loser: { name: 'moonboy', pnl: -4.1 }, prize: 1.9, asset: 'ETH', timeAgo: '15m ago' },
  { id: '3', winner: { name: 'alpha_seeker', pnl: 15.2 }, loser: { name: 'paper_hands', pnl: -11.3 }, prize: 0.19, asset: 'SOL', timeAgo: '28m ago' },
  { id: '4', winner: { name: 'diamond_hands', pnl: 9.1 }, loser: { name: 'fomo_buyer', pnl: -6.7 }, prize: 4.75, asset: 'BTC', timeAgo: '1h ago' },
  { id: '5', winner: { name: 'steady_trader', pnl: 3.4 }, loser: { name: 'yolo_kid', pnl: -2.9 }, prize: 0.95, asset: 'ETH', timeAgo: '2h ago' },
];

const mockLeaders: LeaderboardEntry[] = [
  { id: '1', name: 'diamond_hands', wins: 45, losses: 12, profit: 23.5 },
  { id: '2', name: 'whale_hunter', wins: 38, losses: 15, profit: 18.2 },
  { id: '3', name: 'alpha_seeker', wins: 32, losses: 18, profit: 12.8 },
  { id: '4', name: 'steady_trader', wins: 28, losses: 22, profit: 8.4 },
  { id: '5', name: 'degen42', wins: 25, losses: 20, profit: 6.1 },
];

const STEPS = [
  {
    title: 'Enter the Cage',
    description: 'Find a challenger with the same blood price. Both start with $1,000 war chest.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Fight',
    description: 'Long or short with 20x leverage. Real prices. No mercy.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Claim the Spoils',
    description: 'Best P&L when the bell rings takes the entire loot pile.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
];

export function BattleLobby() {
  const { connected, publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const [mounted, setMounted] = useState(false);

  const {
    battle,
    isLoading,
    error,
    matchmakingStatus,
    queueMatchmaking,
    leaveBattle,
    readyCheck,
    readyCheckCancelled,
    clearReadyCheckCancelled,
  } = useBattleContext();

  // Challenge notifications for friend challenges
  const {
    notification: challengeNotification,
    clearNotification: clearChallengeNotification,
    requestPermission: requestNotificationPermission,
  } = useChallengeNotifications({ walletAddress, enabled: connected });

  const {
    createBattle: createOnChainBattle,
    isLoading: isOnChainLoading,
    error: onChainError,
    isConnected: isOnChainReady,
  } = useBattleOnChain();

  // Challenge modal state
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [createdChallenge, setCreatedChallenge] = useState<CreatedChallenge | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Request notification permission when creating a challenge
  useEffect(() => {
    if (showCreateChallengeModal) {
      requestNotificationPermission();
    }
  }, [showCreateChallengeModal, requestNotificationPermission]);

  const isConnected = mounted && connected;

  const handleFindMatch = (config: BattleConfig) => {
    queueMatchmaking(config);
  };

  const handleChallengeCreated = (challenge: CreatedChallenge) => {
    setCreatedChallenge(challenge);
  };

  // Don't show on-chain errors to user since we silently fall back to off-chain mode
  const combinedError = error;
  const combinedLoading = isLoading || isOnChainLoading;

  // Loading state
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 spinner" />
      </div>
    );
  }

  // Not connected - full landing page experience
  if (!isConnected) {
    return (
      <div className="animate-fadeIn">
        {/* Hero Section */}
        <div className="relative text-center mb-16 mt-8">
          {/* Background effects */}
          <div className="absolute inset-0 -top-20 bg-gradient-to-b from-accent/10 via-transparent to-transparent blur-3xl" />
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

          <div className="relative">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-sm font-semibold text-accent">Live on Solana</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter" style={{ fontFamily: 'Impact, sans-serif' }}>
              <span className="block text-text-primary">THE ARENA</span>
              <span className="block bg-gradient-to-r from-warning via-fire to-danger bg-clip-text text-transparent">
                TWO ENTER. ONE PROFITS.
              </span>
            </h1>

            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8">
              Enter the cage and face your challenger.
              Trade with 20x leverage. Best P&L survives and claims the loot.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 px-4 sm:px-0">
              <div className="relative group w-full sm:w-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-purple-500 rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity" />
                <button
                  className="relative w-full sm:w-auto min-h-[44px] px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-warning to-fire text-bg-primary font-bold text-base sm:text-lg rounded-xl hover:shadow-2xl hover:shadow-warning/30 transition-all uppercase tracking-wide touch-manipulation"
                  onClick={() => {
                    // Trigger wallet modal - find the wallet button and click it
                    const walletBtn = document.querySelector('.wallet-adapter-button') as HTMLButtonElement;
                    if (walletBtn) walletBtn.click();
                  }}
                >
                  Enter the Dome
                </button>
              </div>
              <a
                href="/spectate"
                className="w-full sm:w-auto min-h-[44px] px-6 sm:px-8 py-3 sm:py-4 bg-bg-tertiary border border-warning/30 text-warning font-semibold rounded-xl hover:bg-warning/10 hover:text-warning hover:border-warning/50 transition-all uppercase tracking-wide touch-manipulation text-center"
              >
                Watch the Carnage
              </a>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-12 sm:mb-16 max-w-4xl mx-auto px-4 sm:px-0">
          {[
            { value: '$1,000', label: 'War Chest', color: 'text-warning' },
            { value: '20x', label: 'Max Leverage', color: 'text-danger' },
            { value: '30 min', label: 'Fight Duration', color: 'text-accent' },
            { value: '95%', label: 'Survivor Loot', color: 'text-success' },
          ].map((stat) => (
            <Card key={stat.label} className="text-center p-4 sm:p-6 hover:border-warning/30 transition-colors border-warning/10">
              <div className={`text-xl sm:text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-xs sm:text-sm text-text-tertiary uppercase tracking-wide">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* How it Works */}
        <div className="max-w-4xl mx-auto mb-12 sm:mb-16 px-4 sm:px-0">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8 sm:mb-12 uppercase tracking-wider" style={{ fontFamily: 'Impact, sans-serif' }}>Rules of the <span className="text-warning">Arena</span></h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
            {[
              {
                step: '01',
                title: 'Enter the Cage',
                description: 'Pay your blood price and face your challenger. Both degens start with $1,000 war chest.',
                icon: (
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Fight to Survive',
                description: 'Long or short with 20x leverage. Real prices. No mercy. Only skill decides who walks out.',
                icon: (
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Claim the Spoils',
                description: 'When the bell rings, best P&L takes the entire loot pile. Winner. Takes. All.',
                icon: (
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <Card className="h-full p-5 sm:p-8 hover:border-warning/30 transition-all group border-warning/10">
                  <div className="absolute -top-3 sm:-top-4 -left-1 sm:-left-2 text-4xl sm:text-6xl font-black text-warning/10 group-hover:text-warning/20 transition-colors">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-warning/20 to-danger/20 border border-warning/30 flex items-center justify-center text-warning mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 uppercase">{item.title}</h3>
                    <p className="text-sm sm:text-base text-text-secondary leading-relaxed">{item.description}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Available Assets */}
        <div className="max-w-4xl mx-auto mb-12 sm:mb-16 px-4 sm:px-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">Trade Top Assets</h2>
          <p className="text-sm sm:text-base text-text-secondary text-center mb-6 sm:mb-8">Real-time prices from major exchanges</p>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            {ASSETS.map((asset) => (
              <div
                key={asset.symbol}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-xl bg-bg-secondary border border-border-primary hover:border-accent/30 transition-all touch-manipulation"
              >
                <AssetIcon symbol={asset.symbol} size="lg" />
                <div>
                  <div className="font-bold text-sm sm:text-base">{asset.symbol}</div>
                  <div className="text-[10px] sm:text-xs text-text-tertiary">{asset.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16 px-4 sm:px-0">
          <Card className="p-5 sm:p-8 bg-gradient-to-br from-warning/5 via-bg-secondary to-danger/5 border-warning/20">
            <h2 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>Ready to <span className="text-warning">Enter the Dome?</span></h2>
            <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
              Connect your wallet and face your challenger. No risk to your real funds - just pure degen combat.
            </p>
            <button
              className="w-full sm:w-auto min-h-[44px] px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-warning to-fire text-bg-primary font-bold text-base sm:text-lg rounded-xl hover:shadow-2xl hover:shadow-warning/30 transition-all uppercase tracking-wide touch-manipulation"
              onClick={() => {
                const walletBtn = document.querySelector('.wallet-adapter-button') as HTMLButtonElement;
                if (walletBtn) walletBtn.click();
              }}
            >
              Enter the Dome
            </button>
          </Card>
        </div>
      </div>
    );
  }

  // In matchmaking queue - make it exciting
  if (matchmakingStatus.inQueue) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 sm:mt-16 text-center animate-fadeIn px-4 sm:px-0">
        <div className="relative">
          {/* Pulsing glow */}
          <div className="absolute inset-0 bg-accent/20 blur-3xl animate-pulse" />

          <Card className="relative overflow-hidden">
            <div className="p-5 sm:p-8">
              {/* Radar animation */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-accent/30" />
                <div className="absolute inset-2 rounded-full border-2 border-accent/20" />
                <div className="absolute inset-4 rounded-full border-2 border-accent/10" />
                <div className="absolute inset-0 rounded-full border-t-2 border-accent animate-spin" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold mb-2 uppercase">Searching for Prey</h2>
              <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
                Scanning the wasteland for worthy challengers...
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-full sm:w-auto px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary">
                  <span className="text-text-tertiary text-sm">Position: </span>
                  <span className="font-bold text-accent">#{matchmakingStatus.position}</span>
                </div>
                <div className="w-full sm:w-auto px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary">
                  <span className="text-text-tertiary text-sm">Est. wait: </span>
                  <span className="font-bold">~{matchmakingStatus.estimated}s</span>
                </div>
              </div>

              <button
                onClick={leaveBattle}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-lg bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary transition-all touch-manipulation"
              >
                Cancel Search
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Waiting for opponent - countdown style
  if (battle && battle.status === 'waiting') {
    return (
      <div className="w-full max-w-md mx-auto mt-8 sm:mt-16 text-center animate-fadeIn px-4 sm:px-0">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-success/20 to-accent/20 blur-3xl" />

          <Card className="relative overflow-hidden">
            <div className="p-5 sm:p-8">
              {/* Player avatars with VS */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-bg-primary">You</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-success border-2 border-bg-primary flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div className="text-xl sm:text-2xl font-black text-text-tertiary">VS</div>

                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-bg-tertiary border-2 border-dashed border-border-secondary flex items-center justify-center">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-bold mb-2 uppercase">Challenger Approaching...</h2>
              <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4">
                The cage is set. Waiting for your prey to enter.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <span className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-semibold">
                  {battle.config.entryFee} SOL
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-primary text-text-secondary text-sm">
                  {battle.config.duration / 60} minutes
                </span>
              </div>

              <div className="p-3 rounded-lg bg-bg-tertiary mb-4 sm:mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Players</span>
                  <span className="font-semibold">{battle.players.length}/{battle.config.maxPlayers}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-bg-primary overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500"
                    style={{ width: `${(battle.players.length / battle.config.maxPlayers) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={leaveBattle}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-all touch-manipulation"
              >
                Leave Room
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main lobby - redesigned Arena layout
  return (
    <div className="w-full max-w-6xl mx-auto animate-fadeIn overflow-x-hidden">
      {/* Arena Header */}
      <ArenaHeader stats={mockStats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 mt-4 sm:mt-6">
        {/* Live Battles Section - 3 columns on lg */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <LiveBattlesSection
            battles={mockLiveBattles}
            waitingPlayers={mockWaitingPlayers}
          />
        </div>

        {/* Battle Config Panel - 2 columns on lg, shown first on mobile */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <BattleConfigPanel
            onFindMatch={handleFindMatch}
            onChallengeClick={() => setShowCreateChallengeModal(true)}
            isLoading={isLoading}
            error={combinedError}
            queueData={mockQueueData}
          />
        </div>
      </div>

      {/* Bottom Row - Recent Battles & Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        <RecentBattlesSection battles={mockRecentBattles} />
        <LeaderboardPreview leaders={mockLeaders} />
      </div>

      {/* Challenge Modals */}
      <CreateChallengeModal
        isOpen={showCreateChallengeModal}
        onClose={() => setShowCreateChallengeModal(false)}
        onChallengeCreated={handleChallengeCreated}
      />
      <ShareChallengeModal
        challenge={createdChallenge}
        onClose={() => setCreatedChallenge(null)}
      />

      {/* Ready Check Modal */}
      <MatchFoundModal />

      {/* Challenge Accepted Notification Modal */}
      <ChallengeAcceptedModal
        notification={challengeNotification}
        onClose={clearChallengeNotification}
      />

      {/* Ready Check Cancelled Toast */}
      {readyCheckCancelled && (
        <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
          <div className="bg-[#0d0b09] border border-white/20 rounded-xl p-4 shadow-2xl max-w-sm">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                readyCheckCancelled.reason === 'declined'
                  ? 'bg-[#cc2200]/20'
                  : 'bg-[#ff5500]/20'
              }`}>
                {readyCheckCancelled.reason === 'declined' ? (
                  <svg className="w-5 h-5 text-[#cc2200]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[#ff5500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">
                  {readyCheckCancelled.reason === 'declined'
                    ? 'Match Cancelled'
                    : 'Match Timed Out'}
                </p>
                <p className="text-sm text-white/60 mt-1">
                  {readyCheckCancelled.reason === 'declined'
                    ? 'Your opponent declined the match.'
                    : 'The ready check timed out.'}
                </p>
                {readyCheckCancelled.readyPlayer && (
                  <button
                    onClick={() => {
                      clearReadyCheckCancelled();
                      handleFindMatch({ entryFee: 0.5, duration: 1800, mode: 'paper', maxPlayers: 2 });
                    }}
                    className="mt-3 px-4 py-2 bg-[#7fba00]/20 border border-[#7fba00]/30 rounded-lg text-[#7fba00] text-sm font-medium hover:bg-[#7fba00]/30 transition-colors"
                  >
                    Find New Match
                  </button>
                )}
              </div>
              <button
                onClick={clearReadyCheckCancelled}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
