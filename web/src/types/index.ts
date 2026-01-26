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
  liquidationDistance: number; // Percentage distance to liquidation (e.g., 5.2 = 5.2% away)
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

// Signed trade message format for trustless settlement
export interface SignedTradeMessage {
  version: 1;
  battleId: string;
  action: 'open' | 'close';
  asset: string;
  side: PositionSide;
  leverage: Leverage;
  size: number;
  timestamp: number;
  nonce: number;
  positionId?: string; // For close actions
}

export interface SignedTradePayload {
  message: SignedTradeMessage;
  signature: string;
  walletAddress: string;
}

export type BattleStatus = 'waiting' | 'ready_check' | 'active' | 'completed' | 'cancelled';
export type BattleMode = 'paper' | 'real';
// Battle durations in seconds
// Standard: 1800 (30min), 3600 (1hr)
// Challenge: 60 (1min), 120 (2min), 180 (3min), 300 (5min)
export type BattleDuration = 60 | 120 | 180 | 300 | 1800 | 3600;

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

// Response type for odds lock (on-chain betting flow)
export interface OddsLock {
  lockId: string;
  battleId: string;
  backedPlayer: string;
  lockedOdds: number;
  amount: number;
  potentialPayout: number;
  expiresAt: number;
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
export type ProfilePictureType = 'preset' | 'nft' | 'twitter' | 'default';

export interface UserProfile {
  walletAddress: string;
  username?: string;
  pfpType: ProfilePictureType;
  presetId?: string;
  nftMint?: string;
  nftImageUrl?: string;
  twitterHandle?: string;
  updatedAt: number;
}

export interface PresetPFP {
  id: string;
  name: string;
  category: 'solana' | 'crypto' | 'degen';
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

export type DraftTournamentTier = '0.1 SOL' | '0.5 SOL' | '1 SOL';
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

export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator';

// ===================
// Ready Check Types
// ===================

export interface ReadyCheckResponse {
  battleId: string;
  opponentWallet: string;
  config: BattleConfig;
  expiresAt: number;
}

export interface ReadyCheckUpdate {
  battleId: string;
  player1Ready: boolean;
  player2Ready: boolean;
  timeRemaining: number;
}

export interface ReadyCheckCancelled {
  battleId: string;
  reason: 'declined' | 'timeout';
  declinedBy?: string;
  timedOutPlayer?: string;
  readyPlayer?: string;
}

// ===================
// Challenge Notification Types
// ===================

export interface ChallengeAcceptedNotification {
  challengeId: string;
  challengeCode: string;
  acceptedBy: string;
  battleId: string;
  entryFee: number;
  duration: number;
}

// ===================
// Battle Chat Types
// ===================

export type ChatMessageType = 'user' | 'system';
export type SenderRole = 'spectator' | 'fighter_1' | 'fighter_2';

export interface ChatMessage {
  id: string;
  battleId: string;
  senderWallet: string;
  senderDisplayName: string;
  senderLevel?: number; // Deprecated - progression system removed
  senderRole: SenderRole;
  content: string;
  wasFiltered: boolean;
  timestamp: number;
  type: ChatMessageType;
  reactions: Record<string, string[]>; // emoji -> array of wallet addresses
}
