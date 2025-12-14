// Shared types for Sol Battles - Perp Trading PvP

export interface Asset {
  symbol: string;
  name: string;
}

export type PositionSide = 'long' | 'short';
export type Leverage = 2 | 5 | 10 | 20;

export interface PerpPosition {
  id: string;
  asset: string;
  side: PositionSide;
  leverage: Leverage;
  size: number;
  entryPrice: number;
  currentPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  openedAt: number;
}

export interface PlayerAccount {
  balance: number;
  startingBalance: number;
  positions: PerpPosition[];
  closedPnl: number;
  totalPnlPercent: number;
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  asset: string;
  side: PositionSide;
  leverage: Leverage;
  size: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  type: 'open' | 'close';
}

export type BattleStatus = 'waiting' | 'active' | 'completed' | 'cancelled';
export type BattleMode = 'paper' | 'real';
export type BattleDuration = 1800 | 3600;

export interface BattleConfig {
  entryFee: number;
  duration: BattleDuration;
  mode: BattleMode;
  maxPlayers: number;
}

export interface BattlePlayer {
  walletAddress: string;
  account: PlayerAccount;
  trades: TradeRecord[];
  finalPnl?: number;
  rank?: number;
}

export interface Battle {
  id: string;
  config: BattleConfig;
  status: BattleStatus;
  players: BattlePlayer[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  winnerId?: string;
  prizePool: number;
  spectatorCount?: number;
  totalBetPool?: number;
}

// Spectator Betting Types
export type BetStatus = 'pending' | 'won' | 'lost' | 'cancelled' | 'push';

export interface SpectatorBet {
  id: string;
  oddsAccepted: boolean;
  battleId: string;
  oddsUpdateCount?: number;
  oddsUpdateMessage?: string;
  oddsUpdatedAt?: number;
  oddsVersion: number;
  oddsExpiration?: number;
  bettor: string;
  backedPlayer: string;
  amount: number;
  odds: number;
  potentialPayout: number;
  placedAt: number;
  status: BetStatus;
  settledAt?: number;
}

export interface BattleOdds {
  battleId: string;
  player1: {
    wallet: string;
    odds: number;
    totalBacked: number;
  };
  player2: {
    wallet: string;
    odds: number;
    totalBacked: number;
  };
  totalPool: number;
  lastUpdated: number;
}

export interface LiveBattle extends Battle {
  odds?: BattleOdds;
  featured?: boolean;
}

// Quick Bet / Price Prediction Types
export type PredictionSide = 'long' | 'short';
export type RoundStatus = 'betting' | 'locked' | 'settled';
export type QuickBetAmount = 5 | 15 | 25 | 50 | 100;

export interface PredictionRound {
  id: string;
  asset: string;
  status: RoundStatus;
  startPrice: number;
  endPrice?: number;
  startTime: number;
  lockTime: number; // When betting closes (e.g., 5 seconds before end)
  endTime: number;
  duration: number; // in seconds (30)
  longPool: number;
  shortPool: number;
  longBets: PredictionBet[];
  shortBets: PredictionBet[];
  winner?: PredictionSide | 'push'; // push if price unchanged
  totalPool: number;
}

export interface PredictionBet {
  id: string;
  oddsAccepted?: boolean;
  oddsUpdateCount?: number;
  oddsVersion?: number;
  roundId: string;
  oddsExpiration?: number;
  bettor: string;
  side: PredictionSide;
  amount: number;
  placedAt: number;
  payout?: number;
  status: BetStatus;
}

export interface PredictionStats {
  asset: string;
  totalRounds: number;
  totalVolume: number;
  longWins: number;
  shortWins: number;
  pushes: number;
}

// Profile Picture Types
export type ProfilePictureType = 'preset' | 'nft' | 'default';

export interface UserProfile {
  walletAddress: string;
  username?: string;
  pfpType: ProfilePictureType;
  presetId?: string;
  nftMint?: string;
  nftImageUrl?: string;
  updatedAt: number;
}

export interface PresetPFP {
  id: string;
  name: string;
  category: 'solana' | 'crypto';
  image: string;
}

export interface NFTAsset {
  mint: string;
  name: string;
  image: string;
  collection?: string;
}

// ===================
// Memecoin Draft Types
// ===================

export type DraftTournamentTier = '$5' | '$25' | '$100';
export type DraftTournamentStatus = 'upcoming' | 'drafting' | 'active' | 'completed';
export type PowerUpType = 'swap' | 'boost' | 'freeze';

export interface Memecoin {
  id: string;
  symbol: string;
  name: string;
  marketCapRank: number;
  currentPrice: number;
  priceChange24h?: number;
  logoUrl?: string;
  lastUpdated: number;
}

export interface DraftTournament {
  id: string;
  tier: DraftTournamentTier;
  entryFeeUsd: number;
  status: DraftTournamentStatus;
  weekStartUtc: number;
  weekEndUtc: number;
  draftDeadlineUtc: number;
  totalEntries: number;
  prizePoolUsd: number;
  createdAt: number;
  settledAt?: number;
}

export interface DraftPick {
  id: string;
  entryId: string;
  coinId: string;
  coinSymbol: string;
  coinName: string;
  coinLogoUrl?: string;
  pickOrder: number;
  priceAtDraft: number;
  priceAtEnd?: number;
  percentChange?: number;
  boostMultiplier: number;
  isFrozen: boolean;
  frozenAtPrice?: number;
  frozenPercentChange?: number;
  createdAt: number;
}

export interface DraftEntry {
  id: string;
  tournamentId: string;
  walletAddress: string;
  entryFeePaid: number;
  draftCompleted: boolean;
  picks: DraftPick[];
  powerUpsUsed: PowerUpUsage[];
  finalScore?: number;
  finalRank?: number;
  payoutUsd?: number;
  createdAt: number;
}

export interface PowerUpUsage {
  id: string;
  entryId: string;
  powerupType: PowerUpType;
  usedAt: number;
  targetPickId?: string;
  details?: string;
}

export interface DraftRound {
  roundNumber: number;
  options: Memecoin[];
  timeLimit: number;
  selectedCoinId?: string;
}

export interface DraftSession {
  entryId: string;
  tournamentId: string;
  currentRound: number;
  rounds: DraftRound[];
  status: 'in_progress' | 'completed';
  startedAt: number;
}

export interface DraftLeaderboardEntry {
  rank: number;
  walletAddress: string;
  username?: string;
  totalScore: number;
  picks: {
    coinSymbol: string;
    percentChange: number;
    isBoosted: boolean;
    isFrozen: boolean;
  }[];
  payout?: number;
}
