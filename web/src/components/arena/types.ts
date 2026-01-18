// Arena page type definitions

export interface ArenaStats {
  liveBattles: number;
  playersInQueue: number;
  battlesToday: number;
  biggestWin: number;
}

export interface WaitingPlayer {
  id: string;
  name: string;
  tier: string;
  asset: string;
  waitTime: string;
}

export interface BattlePlayer {
  name: string;
  pnl: number;
  position: 'long' | 'short';
  isWinning: boolean;
}

export interface LiveBattleDisplay {
  id: string;
  tier: string;
  asset: string;
  timeRemaining: number;
  prizePool: number;
  spectators: number;
  player1: BattlePlayer;
  player2: BattlePlayer;
}

export interface RecentBattle {
  id: string;
  winner: {
    name: string;
    pnl: number;
  };
  loser: {
    name: string;
    pnl: number;
  };
  prize: number;
  asset: string;
  timeAgo: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  wins: number;
  losses: number;
  profit: number;
}

export interface QueueData {
  byAsset: Record<string, number>;
  byDuration: Record<number, number>;
  byTier: Record<string, number>;
}
