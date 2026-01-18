// The Stands (Spectate) Types

export type StandsTab = 'live' | 'upcoming' | 'mybets' | 'results' | 'leaderboard';

export type GameType = 'arena' | 'token-wars' | 'lds';

export type TierFilter = 'all' | 'scavenger' | 'raider' | 'warlord' | 'immortan';

export type SortOption = 'wagered' | 'spectators' | 'ending' | 'recent';

export interface StandsStats {
  liveBattles: number;
  spectatorsOnline: number;
  totalWageredToday: number;
  biggestWinToday: number;
}

export interface Fighter {
  wallet: string;
  name: string;
  avatar?: string;
  pnl: number;
  isWinning: boolean;
  spectatorPercent: number;
  spectatorOdds: number;
  record?: string;
}

export interface LiveBattleData {
  id: string;
  gameType: GameType;
  tier: string;
  prizePool: number;
  timeRemaining: string;
  timeRemainingMs: number;
  fighter1: Fighter;
  fighter2: Fighter;
  spectatorPool: number;
  spectators: number;
  featured?: boolean;
}

export interface UpcomingBattle {
  id: string;
  gameType: GameType;
  tier: string;
  prizePool: number;
  startsIn: string;
  startsAtMs: number;
  fighter1: {
    name: string;
    record?: string;
  };
  fighter2: {
    name: string;
    record?: string;
  };
  hasReminder: boolean;
}

export interface BattleResult {
  id: string;
  gameType: GameType;
  tier: string;
  prizePool: number;
  timeAgo: string;
  endedAt: number;
  winner: 'fighter1' | 'fighter2';
  fighter1: {
    name: string;
    pnl: number;
  };
  fighter2: {
    name: string;
    pnl: number;
  };
  spectatorPool: number;
  spectatorWinners: number;
}

export interface UserBet {
  id: string;
  battleId: string;
  backedFighter: string;
  opponent: string;
  amount: number;
  potentialWin: number;
  odds: number;
  status: 'active' | 'won' | 'lost';
  payout?: number;
  timeAgo?: string;
  placedAt: number;
}

export interface BettingStats {
  totalBets: number;
  winRate: number;
  pnl: number;
  biggestWin: number;
}

export interface BettorLeaderboardEntry {
  id: string;
  wallet: string;
  name: string;
  avatar?: string;
  totalBets: number;
  winRate: number;
  profit: number;
  isUser: boolean;
}

export interface RecentResult {
  id: string;
  winner: string;
  loser: string;
  timeAgo: string;
}

// Game type display config
export const GAME_TYPE_CONFIG: Record<GameType, {
  label: string;
  bgClass: string;
  textClass: string;
}> = {
  'arena': {
    label: 'Arena',
    bgClass: 'bg-warning/20',
    textClass: 'text-warning',
  },
  'token-wars': {
    label: 'Token Wars',
    bgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400',
  },
  'lds': {
    label: 'LDS',
    bgClass: 'bg-danger/20',
    textClass: 'text-danger',
  },
};

// Tier config
export const TIER_OPTIONS = [
  { value: 'all', label: 'All Tiers' },
  { value: 'scavenger', label: 'Scavenger (0.1 SOL)' },
  { value: 'raider', label: 'Raider (0.5 SOL)' },
  { value: 'warlord', label: 'Warlord (1 SOL)' },
  { value: 'immortan', label: 'Immortan (5 SOL)' },
];

export const GAME_OPTIONS = [
  { value: 'all', label: 'All Games' },
  { value: 'arena', label: 'Arena (1v1)' },
  { value: 'token-wars', label: 'Token Wars' },
  { value: 'lds', label: 'Last Degen Standing' },
];

export const SORT_OPTIONS = [
  { value: 'wagered', label: 'Most Wagered' },
  { value: 'spectators', label: 'Most Spectators' },
  { value: 'ending', label: 'Ending Soon' },
  { value: 'recent', label: 'Recently Started' },
];
