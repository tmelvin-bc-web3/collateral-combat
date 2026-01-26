// Homepage data types

export interface LiveStats {
  playersOnline: number;
  liveGames: number;
  wonToday: number;
  biggestWinToday: number;
}

export interface OracleData {
  currentRound: {
    timeRemaining: number;
    upPool: number;
    downPool: number;
    currentPrice: number;
  };
  playersInGame: number;
}

export interface ArenaData {
  openBattles: number;
  totalInPools: number;
  playersActive: number;
}

export interface LDSData {
  currentLobby: {
    playerCount: number;
    maxPlayers: number;
    prizePool: number;
    timeToStart: number;
  };
}

export interface TokenWarsData {
  currentBattle: {
    tokenA: { symbol: string; image: string; change: number };
    tokenB: { symbol: string; image: string; change: number };
    timeRemaining: number;
    totalPool: number;
  };
}

export interface WarPartyData {
  activeParties: number;
  currentLeader: {
    username: string;
    return: number;
  };
}

export interface StandsData {
  liveBattles: number;
  watchersCount: number;
  featuredBattle?: {
    player1: string;
    player2: string;
    pool: number;
  };
}

export interface EventsData {
  upcomingEvents: number;
  upcomingTournaments: number;
  nextEventName?: string;
  nextEventTime?: number;
}

export interface ActivityItem {
  id: string;
  type: 'win' | 'big_win' | 'join' | 'elimination' | 'streak' | 'victory';
  user: {
    username: string;
    avatar?: string;
  };
  amount?: number;
  game: string;
  context?: string;
  timestamp: number;
}

export interface PlatformStats {
  totalGames: number;
  totalVolume: number;
  uniquePlayers: number;
  biggestWin: {
    amount: number;
    winner: string;
    game: string;
  };
  todayStats: {
    games: number;
    volume: number;
    players: number;
  };
}

export interface HomepageData {
  liveStats: LiveStats;
  oracle: OracleData;
  arena: ArenaData;
  lds: LDSData;
  tokenWars: TokenWarsData;
  warParty: WarPartyData;
  stands: StandsData;
  events: EventsData;
  recentActivity: ActivityItem[];
  platformStats: PlatformStats;
}
