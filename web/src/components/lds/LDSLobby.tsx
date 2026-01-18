'use client';

import { LobbyState, LDSPlayer, RecentWinner, PlatformStats, LDSConfig } from './types';
import { HeroSection } from './HeroSection';
import { RecentWinners } from './RecentWinners';
import { PlayersList } from './PlayersList';
import { HowItWorks } from './HowItWorks';
import { PayoutTiers } from './PayoutTiers';
import { EntryInfo } from './EntryInfo';

interface LDSLobbyProps {
  players: LDSPlayer[];
  config: LDSConfig;
  timeRemaining: number;
  prizePool: number;
  recentWinners: RecentWinner[];
  platformStats?: PlatformStats;
  currentWallet?: string;
  isJoining: boolean;
  isLeaving: boolean;
  isInGame: boolean;
  onJoin: () => void;
  onLeave: () => void;
  walletConnected: boolean;
}

function getLobbyState(playerCount: number, minPlayers: number, maxPlayers: number): LobbyState {
  if (playerCount === 0) return 'empty';
  if (playerCount < minPlayers) return 'filling';
  if (playerCount < maxPlayers) return 'ready';
  return 'full';
}

export function LDSLobby({
  players,
  config,
  timeRemaining,
  prizePool,
  recentWinners,
  platformStats,
  currentWallet,
  isJoining,
  isLeaving,
  isInGame,
  onJoin,
  onLeave,
  walletConnected,
}: LDSLobbyProps) {
  const playerCount = players.length;
  const state = getLobbyState(playerCount, config.minPlayers, config.maxPlayers);
  const projectedPool = config.maxPlayers * config.entryFeeSol * (1 - config.rakePercent / 100);

  // Calculate max first place win (for full lobby)
  const maxTier = config.payoutTiers.find(t => config.maxPlayers >= t.minPlayers && config.maxPlayers <= t.maxPlayers);
  const firstPlacePercent = maxTier?.payouts[0] || 35;
  const maxFirstPlaceWin = projectedPool * (firstPlacePercent / 100);

  // Sort players by join time (most recent first)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.joinedAt && b.joinedAt) return b.joinedAt - a.joinedAt;
    return 0;
  });

  // Get recent joins for animation
  const recentJoins = sortedPlayers.filter(
    p => p.joinedAt && Date.now() - p.joinedAt < 60000
  ).slice(0, 3);

  return (
    <div className="lds-lobby grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 lg:gap-6 p-4 lg:p-6 min-h-[calc(100vh-80px)]">
      {/* Left Panel */}
      <aside className="hidden lg:block">
        <div className="bg-[#2a2a2a] border border-white/[0.06] rounded-xl p-4 h-full">
          {playerCount < 3 ? (
            <RecentWinners winners={recentWinners} stats={platformStats} />
          ) : (
            <PlayersList
              players={sortedPlayers}
              maxPlayers={config.maxPlayers}
              minPlayers={config.minPlayers}
              currentWallet={currentWallet}
              prizePool={prizePool}
            />
          )}
        </div>
      </aside>

      {/* Main Hero Section */}
      <main className="flex flex-col">
        <HeroSection
          state={state}
          timeRemaining={timeRemaining}
          playerCount={playerCount}
          minPlayers={config.minPlayers}
          maxPlayers={config.maxPlayers}
          prizePool={prizePool}
          projectedPool={projectedPool}
          maxFirstPlaceWin={maxFirstPlaceWin}
          entryFee={config.entryFeeSol}
          onJoin={onJoin}
          isJoining={isJoining}
          isInGame={isInGame}
          onLeave={onLeave}
          isLeaving={isLeaving}
          recentJoins={recentJoins}
          recentJoinsCount={platformStats?.recentJoins || 0}
          walletConnected={walletConnected}
        />

        {/* Mobile: Show players list below hero */}
        <div className="lg:hidden mt-4">
          <div className="bg-[#2a2a2a] border border-white/[0.06] rounded-xl p-4">
            {playerCount < 3 ? (
              <RecentWinners winners={recentWinners} stats={platformStats} />
            ) : (
              <PlayersList
                players={sortedPlayers}
                maxPlayers={config.maxPlayers}
                minPlayers={config.minPlayers}
                currentWallet={currentWallet}
                prizePool={prizePool}
              />
            )}
          </div>
        </div>
      </main>

      {/* Right Panel */}
      <aside className="hidden lg:flex flex-col gap-4">
        <HowItWorks />
        <PayoutTiers
          playerCount={playerCount || 10} // Show default tier if no players
          prizePool={prizePool || (playerCount || 10) * config.entryFeeSol * (1 - config.rakePercent / 100)}
          tiers={config.payoutTiers}
        />
        <EntryInfo
          entryFee={config.entryFeeSol}
          rakePercent={config.rakePercent}
          minPlayers={config.minPlayers}
          maxPlayers={config.maxPlayers}
        />
      </aside>
    </div>
  );
}

// Export all components
export { HeroSection } from './HeroSection';
export { RecentWinners } from './RecentWinners';
export { PlayersList } from './PlayersList';
export { HowItWorks } from './HowItWorks';
export { PayoutTiers } from './PayoutTiers';
export { EntryInfo } from './EntryInfo';
export * from './types';
