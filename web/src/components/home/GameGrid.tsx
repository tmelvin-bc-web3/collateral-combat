'use client';

import { GameCard, GameIcons } from './GameCard';
import { ArenaData, LDSData, TokenWarsData, WarPartyData, StandsData } from './types';

interface GameGridProps {
  arena: ArenaData;
  lds: LDSData;
  tokenWars: TokenWarsData;
  warParty: WarPartyData;
  stands: StandsData;
}

export function GameGrid({ arena, lds, tokenWars, warParty, stands }: GameGridProps) {
  return (
    <section className="mb-14">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">All Games</h2>
      </div>

      {/* Games Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* The Arena */}
        <GameCard
          id="arena"
          href="/battle"
          title="The Arena"
          subtitle="1v1 Deathmatch"
          description="Two degens enter, one leaves with the loot. Trade with 20x leverage. Best P&L survives."
          icon={GameIcons.arena}
          isLive={arena.playersActive > 0}
          statusText={`${arena.playersActive} playing`}
          stats={[
            { label: 'Duration', value: '30 min' },
            { label: 'Entry', value: '0.1 SOL+' },
          ]}
          liveData={{
            type: 'arena',
            data: {
              openBattles: arena.openBattles,
              totalInPools: arena.totalInPools.toFixed(1),
            },
          }}
          ctaText="Enter Arena"
        />

        {/* Last Degen Standing */}
        <GameCard
          id="lds"
          href="/lds"
          title="Last Degen Standing"
          subtitle="Battle Royale"
          description="Predict each round. Wrong = eliminated. Last one standing wins the pot."
          icon={GameIcons.lds}
          isLive={lds.currentLobby.playerCount > 0}
          statusText={`Lobby: ${lds.currentLobby.playerCount}/${lds.currentLobby.maxPlayers}`}
          stats={[
            { label: 'Round', value: '60s' },
            { label: 'Entry', value: '0.05 SOL' },
          ]}
          liveData={{
            type: 'lds',
            data: lds.currentLobby,
          }}
          highlight={true}
          ctaText={`Join Lobby (${lds.currentLobby.playerCount}/${lds.currentLobby.maxPlayers})`}
        />

        {/* Token Wars */}
        <GameCard
          id="token-wars"
          href="/token-wars"
          title="Token Wars"
          subtitle="Head-to-Head"
          description="Two tokens enter the ring. Pick the one with better gains. Winner takes all."
          icon={GameIcons['token-wars']}
          isLive={true}
          statusText={`${tokenWars.currentBattle.tokenA.symbol} vs ${tokenWars.currentBattle.tokenB.symbol}`}
          stats={[
            { label: 'Round', value: '5 min' },
            { label: 'Min Bet', value: '0.01 SOL' },
          ]}
          liveData={{
            type: 'token-wars',
            data: tokenWars.currentBattle,
          }}
          ctaText={`Join Battle (${Math.floor(tokenWars.currentBattle.timeRemaining / 60)}:${(tokenWars.currentBattle.timeRemaining % 60).toString().padStart(2, '0')} left)`}
        />

        {/* War Party */}
        <GameCard
          id="draft"
          href="/draft"
          title="War Party"
          subtitle="Memecoin Draft"
          description="Draft 6 memecoins for your war party. Best gains over the week wins."
          icon={GameIcons.draft}
          isLive={true}
          statusText="Week 3 Active"
          stats={[
            { label: 'Entry', value: '0.1-1 SOL' },
            { label: 'Duration', value: '24h' },
          ]}
          liveData={{
            type: 'draft',
            data: {
              currentLeader: warParty.currentLeader,
              activeParties: warParty.activeParties,
            },
          }}
          ctaText="Draft Your Team"
        />

        {/* The Stands */}
        <GameCard
          id="spectate"
          href="/spectate"
          title="The Stands"
          subtitle="Watch & Wager"
          description="Watch live Arena battles. Bet on your champion. Collect the spoils."
          icon={GameIcons.spectate}
          isLive={stands.liveBattles > 0}
          statusText={`${stands.watchersCount} watching`}
          stats={[
            { label: 'Live Battles', value: String(stands.liveBattles) },
            { label: 'Min Wager', value: '0.1 SOL' },
          ]}
          liveData={{
            type: 'spectate',
            data: {
              liveBattles: stands.liveBattles,
              featuredBattle: stands.featuredBattle,
            },
          }}
          variant="spectate"
          ctaText="Watch Now"
        />
      </div>
    </section>
  );
}
