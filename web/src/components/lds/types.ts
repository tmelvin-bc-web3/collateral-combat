// LDS Lobby Types

export type LobbyState = 'empty' | 'filling' | 'ready' | 'full';

export interface LDSPlayer {
  walletAddress: string;
  status: 'alive' | 'eliminated' | 'winner';
  eliminatedAtRound: number | null;
  payoutLamports: number;
  placement: number | null;
  joinedAt?: number;
  username?: string;
  avatar?: string;
  isVIP?: boolean;
  streak?: number;
}

export interface RecentWinner {
  walletAddress: string;
  username?: string;
  payout: number;
  totalPlayers: number;
  completedAt: number;
}

export interface PayoutTier {
  minPlayers: number;
  maxPlayers: number;
  payouts: number[];
}

export interface LDSConfig {
  entryFeeSol: number;
  maxPlayers: number;
  minPlayers: number;
  gameIntervalMinutes: number;
  roundDurationSeconds: number;
  predictionWindowSeconds: number;
  maxRounds: number;
  rakePercent: number;
  payoutTiers: PayoutTier[];
}

export interface PlatformStats {
  totalGamesPlayed: number;
  totalSolWon: number;
  recentJoins: number; // Players joined in last hour
}
