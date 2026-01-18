// Token Wars Types

export type TWBetSide = 'token_a' | 'token_b';
export type TWPhase = 'betting' | 'in_progress' | 'cooldown' | 'completed';

export interface TWBattle {
  id: string;
  tokenA: string;
  tokenB: string;
  status: string;
  bettingStartTime: number;
  bettingEndTime: number;
  battleStartTime: number | null;
  battleEndTime: number | null;
  tokenAStartPrice: number | null;
  tokenAEndPrice: number | null;
  tokenBStartPrice: number | null;
  tokenBEndPrice: number | null;
  tokenAPercentChange: number | null;
  tokenBPercentChange: number | null;
  winner: TWBetSide | 'tie' | null;
  totalBetsTokenA: number;
  totalBetsTokenB: number;
  totalBettors: number;
}

export interface TWBattleState {
  battle: TWBattle;
  phase: TWPhase;
  timeRemaining: number;
  tokenAPriceNow?: number;
  tokenBPriceNow?: number;
  tokenAChangeNow?: number;
  tokenBChangeNow?: number;
  odds: {
    tokenA: number;
    tokenB: number;
  };
}

export interface TWBet {
  id: string;
  battleId: string;
  walletAddress: string;
  side: TWBetSide;
  amountLamports: number;
  payoutLamports: number;
  status: string;
}

export interface TWConfig {
  bettingDurationSeconds: number;
  battleDurationSeconds: number;
  cooldownDurationSeconds: number;
  minBetSol: number;
  maxBetSol: number;
  rakePercent: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
}

// Display types for redesigned components
export interface TokenDisplayData {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change: number;
  priceHistory: number[];
  pool: number;
  poolPercent: number;
  multiplier: number;
  betCount: number;
}

export interface RecentBattle {
  id: string;
  tokenA: string;
  tokenB: string;
  winner: TWBetSide | 'tie' | null;
  tokenAPercentChange: number;
  tokenBPercentChange: number;
  totalPool: number;
  completedAt: number;
}

export interface LiveBet {
  id: string;
  user: string;
  token: TWBetSide;
  tokenSymbol: string;
  amount: number;
  timestamp: number;
}

export interface UpcomingMatchup {
  tokenA: { symbol: string; logo: string };
  tokenB: { symbol: string; logo: string };
  startsIn: number;
}

export interface BetHistory {
  battleId: string;
  tokenA: string;
  tokenB: string;
  side: TWBetSide;
  amountLamports: number;
  payoutLamports: number;
  status: string;
  winner: TWBetSide | 'tie' | null;
  createdAt: number;
}

export interface LeaderboardEntry {
  walletAddress: string;
  totalWinnings: number;
  totalBets: number;
  winRate: number;
}

export interface PlayerStats {
  totalBets: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  netProfit: number;
}

// Constants
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const BET_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1] as const;
