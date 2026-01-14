'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBattleContext } from '@/contexts/BattleContext';
import { useBattleOnChain } from '@/hooks/useBattleOnChain';
import { BattleConfig, BattleDuration } from '@/types';
import { FeaturedBattle } from './FeaturedBattle';
import { AssetIcon } from './AssetIcon';
import { ASSETS } from '@/lib/assets';
import { Card } from './ui/Card';

const DURATION_OPTIONS: { value: BattleDuration; label: string; icon: string }[] = [
  { value: 1800, label: '30 min', icon: 'flash' },
  { value: 3600, label: '1 hour', icon: 'fire' },
];

const ENTRY_FEE_OPTIONS = [
  { value: 0.1, label: '0.1 SOL', tier: 'Scavenger' },
  { value: 0.5, label: '0.5 SOL', tier: 'Raider' },
  { value: 1, label: '1 SOL', tier: 'Warlord' },
  { value: 5, label: '5 SOL', tier: 'Immortan' },
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
  const { connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [hoveredFee, setHoveredFee] = useState<number | null>(null);
  const [isCreatingOnChain, setIsCreatingOnChain] = useState(false);

  const {
    battle,
    isLoading,
    error,
    matchmakingStatus,
    queueMatchmaking,
    startSoloPractice,
    leaveBattle,
  } = useBattleContext();

  const {
    createBattle: createOnChainBattle,
    isLoading: isOnChainLoading,
    error: onChainError,
    isConnected: isOnChainReady,
  } = useBattleOnChain();

  const [selectedDuration, setSelectedDuration] = useState<BattleDuration>(1800);
  const [selectedFee, setSelectedFee] = useState(0.5);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isConnected = mounted && connected;

  const handleFindMatch = () => {
    const config: BattleConfig = {
      entryFee: selectedFee,
      duration: selectedDuration,
      mode: 'paper',
      maxPlayers: 2,
    };
    queueMatchmaking(config);
  };

  const handleSoloPractice = async () => {
    const config: BattleConfig = {
      entryFee: selectedFee,
      duration: selectedDuration,
      mode: 'paper',
      maxPlayers: 1,
    };

    // Try to create on-chain battle first if wallet is ready
    if (isOnChainReady) {
      setIsCreatingOnChain(true);
      try {
        const result = await createOnChainBattle(selectedFee);
        if (result) {
          console.log('[BattleLobby] On-chain battle created:', result.battlePDA);
          // Start the battle with the on-chain ID
          startSoloPractice(config, result.battlePDA);
        } else {
          console.log('[BattleLobby] On-chain creation failed, starting off-chain');
          // Fall back to off-chain battle
          startSoloPractice(config);
        }
      } catch (err) {
        console.error('[BattleLobby] On-chain error:', err);
        // Fall back to off-chain battle
        startSoloPractice(config);
      } finally {
        setIsCreatingOnChain(false);
      }
    } else {
      // Off-chain only (no wallet connected to Solana)
      startSoloPractice(config);
    }
  };

  const combinedError = error || onChainError;
  const combinedLoading = isLoading || isOnChainLoading || isCreatingOnChain;

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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-purple-500 rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity" />
                <button
                  className="relative px-8 py-4 bg-gradient-to-r from-warning to-fire text-bg-primary font-bold text-lg rounded-xl hover:shadow-2xl hover:shadow-warning/30 transition-all uppercase tracking-wide"
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
                className="px-8 py-4 bg-bg-tertiary border border-warning/30 text-warning font-semibold rounded-xl hover:bg-warning/10 hover:text-warning hover:border-warning/50 transition-all uppercase tracking-wide"
              >
                Watch the Carnage
              </a>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto">
          {[
            { value: '$1,000', label: 'War Chest', color: 'text-warning' },
            { value: '20x', label: 'Max Leverage', color: 'text-danger' },
            { value: '30 min', label: 'Fight Duration', color: 'text-accent' },
            { value: '95%', label: 'Survivor Loot', color: 'text-success' },
          ].map((stat) => (
            <Card key={stat.label} className="text-center p-6 hover:border-warning/30 transition-colors border-warning/10">
              <div className={`text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-text-tertiary uppercase tracking-wide">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* How it Works */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-center mb-12 uppercase tracking-wider" style={{ fontFamily: 'Impact, sans-serif' }}>Rules of the <span className="text-warning">Arena</span></h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Enter the Cage',
                description: 'Pay your blood price and face your challenger. Both degens start with $1,000 war chest.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Fight to Survive',
                description: 'Long or short with 20x leverage. Real prices. No mercy. Only skill decides who walks out.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Claim the Spoils',
                description: 'When the bell rings, best P&L takes the entire loot pile. Winner. Takes. All.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <Card className="h-full p-8 hover:border-warning/30 transition-all group border-warning/10">
                  <div className="absolute -top-4 -left-2 text-6xl font-black text-warning/10 group-hover:text-warning/20 transition-colors">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-warning/20 to-danger/20 border border-warning/30 flex items-center justify-center text-warning mb-4 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 uppercase">{item.title}</h3>
                    <p className="text-text-secondary leading-relaxed">{item.description}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Available Assets */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">Trade Top Assets</h2>
          <p className="text-text-secondary text-center mb-8">Real-time prices from major exchanges</p>

          <div className="flex flex-wrap justify-center gap-4">
            {ASSETS.map((asset) => (
              <div
                key={asset.symbol}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-bg-secondary border border-border-primary hover:border-accent/30 transition-all"
              >
                <AssetIcon symbol={asset.symbol} size="lg" />
                <div>
                  <div className="font-bold">{asset.symbol}</div>
                  <div className="text-xs text-text-tertiary">{asset.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <Card className="p-8 bg-gradient-to-br from-warning/5 via-bg-secondary to-danger/5 border-warning/20">
            <h2 className="text-2xl font-black mb-4 uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>Ready to <span className="text-warning">Enter the Dome?</span></h2>
            <p className="text-text-secondary mb-6">
              Connect your wallet and face your challenger. No risk to your real funds - just pure degen combat.
            </p>
            <button
              className="px-8 py-4 bg-gradient-to-r from-warning to-fire text-bg-primary font-bold text-lg rounded-xl hover:shadow-2xl hover:shadow-warning/30 transition-all uppercase tracking-wide"
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
      <div className="max-w-md mx-auto mt-16 text-center animate-fadeIn">
        <div className="relative">
          {/* Pulsing glow */}
          <div className="absolute inset-0 bg-accent/20 blur-3xl animate-pulse" />

          <Card className="relative overflow-hidden">
            <div className="p-8">
              {/* Radar animation */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-accent/30" />
                <div className="absolute inset-2 rounded-full border-2 border-accent/20" />
                <div className="absolute inset-4 rounded-full border-2 border-accent/10" />
                <div className="absolute inset-0 rounded-full border-t-2 border-accent animate-spin" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2 uppercase">Searching for Prey</h2>
              <p className="text-text-secondary mb-6">
                Scanning the wasteland for worthy challengers...
              </p>

              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary">
                  <span className="text-text-tertiary text-sm">Position: </span>
                  <span className="font-bold text-accent">#{matchmakingStatus.position}</span>
                </div>
                <div className="px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary">
                  <span className="text-text-tertiary text-sm">Est. wait: </span>
                  <span className="font-bold">~{matchmakingStatus.estimated}s</span>
                </div>
              </div>

              <button
                onClick={leaveBattle}
                className="px-6 py-2.5 rounded-lg bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary transition-all"
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
      <div className="max-w-md mx-auto mt-16 text-center animate-fadeIn">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-success/20 to-accent/20 blur-3xl" />

          <Card className="relative overflow-hidden">
            <div className="p-8">
              {/* Player avatars with VS */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                    <span className="text-2xl font-bold text-bg-primary">You</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div className="text-2xl font-black text-text-tertiary">VS</div>

                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-bg-tertiary border-2 border-dashed border-border-secondary flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold mb-2 uppercase">Challenger Approaching...</h2>
              <p className="text-text-secondary text-sm mb-4">
                The cage is set. Waiting for your prey to enter.
              </p>

              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-semibold">
                  {battle.config.entryFee} SOL
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-primary text-text-secondary text-sm">
                  {battle.config.duration / 60} minutes
                </span>
              </div>

              <div className="p-3 rounded-lg bg-bg-tertiary mb-6">
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
                className="px-6 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-all"
              >
                Leave Room
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main lobby - completely redesigned
  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Hero Section */}
      <div className="relative text-center mb-12 mt-8">
        {/* Background glow */}
        <div className="absolute inset-0 -top-20 bg-gradient-to-b from-accent/10 via-transparent to-transparent blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-sm font-semibold text-accent">Paper Trading Mode</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
            <span className="bg-gradient-to-r from-warning via-fire to-danger bg-clip-text text-transparent">
              The Arena Awaits
            </span>
          </h1>
          <p className="text-lg text-text-secondary max-w-lg mx-auto">
            Face your challenger. Best P&L survives and claims all the loot.
          </p>
        </div>
      </div>

      {/* Featured Live Battle */}
      <FeaturedBattle />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Battle Config - Takes up 3 columns */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-bg-tertiary to-bg-secondary border-b border-border-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                  <svg className="w-5 h-5 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg">Configure Battle</h2>
                  <p className="text-text-tertiary text-xs">Set your terms and find an opponent</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {combinedError && (
                <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-danger text-sm">{combinedError}</span>
                </div>
              )}

              {/* Duration Selection */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Battle Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDuration(option.value)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        selectedDuration === option.value
                          ? 'border-accent bg-accent/5 shadow-[0_0_20px_rgba(0,212,170,0.15)]'
                          : 'border-border-primary bg-bg-tertiary hover:border-border-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {option.icon === 'flash' ? (
                          <svg className={`w-5 h-5 ${selectedDuration === option.value ? 'text-accent' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ) : (
                          <svg className={`w-5 h-5 ${selectedDuration === option.value ? 'text-accent' : 'text-text-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                          </svg>
                        )}
                        <span className={`font-bold ${selectedDuration === option.value ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {option.label}
                        </span>
                      </div>
                      {selectedDuration === option.value && (
                        <div className="absolute top-2 right-2">
                          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry Fee Selection */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Entry Fee
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ENTRY_FEE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedFee(option.value)}
                      onMouseEnter={() => setHoveredFee(option.value)}
                      onMouseLeave={() => setHoveredFee(null)}
                      className={`relative p-3 rounded-xl border-2 transition-all ${
                        selectedFee === option.value
                          ? 'border-accent bg-accent/5'
                          : 'border-border-primary bg-bg-tertiary hover:border-border-secondary'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`text-xs font-medium mb-1 ${selectedFee === option.value ? 'text-accent' : 'text-text-tertiary'}`}>
                          {option.tier}
                        </div>
                        <div className={`font-bold ${selectedFee === option.value ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {option.label}
                        </div>
                      </div>
                      {selectedFee === option.value && (
                        <div className="absolute top-1.5 right-1.5">
                          <div className="w-3 h-3 rounded-full bg-accent flex items-center justify-center">
                            <svg className="w-2 h-2 text-bg-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prize Pool Display */}
              <div className="relative p-5 rounded-xl bg-gradient-to-br from-accent/10 via-bg-tertiary to-purple-500/10 border border-accent/20 mb-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-tertiary mb-1">Winner Takes</div>
                    <div className="text-3xl font-black text-accent">
                      {(selectedFee * 2 * 0.95).toFixed(2)} SOL
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      {selectedFee * 2} SOL pool minus 5% fee
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSoloPractice}
                  disabled={combinedLoading}
                  className="flex-1 py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary font-semibold hover:bg-bg-hover hover:text-text-primary hover:border-border-secondary transition-all disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-2">
                    {isCreatingOnChain ? (
                      <>
                        <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Solo Practice
                      </>
                    )}
                  </div>
                </button>
                <button
                  onClick={handleFindMatch}
                  disabled={combinedLoading}
                  className="flex-1 py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-warning to-fire text-white font-bold hover:shadow-fire transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center gap-2">
                    {combinedLoading && !isCreatingOnChain ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Finding...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Find Match
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* How it Works */}
          <Card>
            <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How it Works
            </h2>

            <div className="space-y-4">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-4 group">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 flex items-center justify-center text-accent group-hover:border-accent/50 transition-all">
                      {step.icon}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-accent/30 to-transparent" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tradeable Assets */}
          <Card>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Assets
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {ASSETS.map((asset) => (
                <div
                  key={asset.symbol}
                  className="flex items-center gap-3 p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-transparent hover:border-border-secondary transition-all cursor-default group"
                >
                  <div className="group-hover:scale-110 transition-transform">
                    <AssetIcon symbol={asset.symbol} size="lg" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{asset.symbol}</div>
                    <div className="text-text-tertiary text-xs">{asset.name}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border-primary">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-tertiary">Max Leverage</span>
                <span className="font-bold text-accent">20x</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
