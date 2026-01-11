// Core types for Sol Battles - Perp Trading PvP

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
  size: number; // USD value of position
  entryPrice: number;
  currentPrice: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  openedAt: number;
}

export interface PlayerAccount {
  balance: number; // Available USD balance
  startingBalance: number;
  positions: PerpPosition[];
  closedPnl: number; // Realized P&L from closed positions
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
export type BattleDuration = 1800 | 3600; // 30min, 1hr in seconds

export interface BattleConfig {
  entryFee: number; // in SOL
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
  battleId: string;
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
  lockTime: number;
  endTime: number;
  duration: number;
  longPool: number;
  shortPool: number;
  longBets: PredictionBet[];
  shortBets: PredictionBet[];
  winner?: PredictionSide | 'push';
  totalPool: number;
}

export interface PredictionBet {
  id: string;
  roundId: string;
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

export interface LeaderboardEntry {
  walletAddress: string;
  totalBattles: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

// WebSocket event types
export interface ServerToClientEvents {
  battle_update: (battle: Battle) => void;
  price_update: (prices: Record<string, number>) => void;
  position_opened: (position: PerpPosition) => void;
  position_closed: (trade: TradeRecord) => void;
  battle_started: (battle: Battle) => void;
  battle_ended: (battle: Battle) => void;
  error: (message: string) => void;
  matchmaking_status: (status: { position: number; estimated: number }) => void;
  // Spectator events
  live_battles: (battles: LiveBattle[]) => void;
  spectator_battle_update: (battle: LiveBattle) => void;
  odds_update: (odds: BattleOdds) => void;
  bet_placed: (bet: SpectatorBet) => void;
  bet_settled: (bet: SpectatorBet) => void;
  spectator_count: (data: { battleId: string; count: number }) => void;
  // Prediction events
  prediction_round: (round: PredictionRound) => void;
  prediction_history: (rounds: PredictionRound[]) => void;
  prediction_settled: (round: PredictionRound) => void;
  prediction_bet_placed: (bet: PredictionBet) => void;
  // Progression events
  progression_update: (progression: UserProgression) => void;
  xp_gained: (data: XpGainEvent) => void;
  level_up: (data: LevelUpResult & { walletAddress: string }) => void;
  perk_activated: (perk: UserPerk) => void;
  perk_expired: (data: { perkId: number }) => void;
}

export interface ClientToServerEvents {
  join_battle: (battleId: string, walletAddress: string) => void;
  create_battle: (config: BattleConfig, walletAddress: string) => void;
  queue_matchmaking: (config: BattleConfig, walletAddress: string) => void;
  start_solo_practice: (config: BattleConfig, walletAddress: string) => void;
  open_position: (battleId: string, asset: string, side: PositionSide, leverage: Leverage, size: number) => void;
  close_position: (battleId: string, positionId: string) => void;
  leave_battle: (battleId: string) => void;
  subscribe_prices: (tokens: string[]) => void;
  // Spectator events
  subscribe_live_battles: () => void;
  unsubscribe_live_battles: () => void;
  spectate_battle: (battleId: string) => void;
  leave_spectate: (battleId: string) => void;
  place_bet: (battleId: string, backedPlayer: string, amount: number, walletAddress: string) => void;
  get_my_bets: (walletAddress: string) => void;
  // Prediction events
  subscribe_prediction: (asset: string) => void;
  unsubscribe_prediction: (asset: string) => void;
  place_prediction: (asset: string, side: PredictionSide, amount: number, walletAddress: string) => void;
  // Draft events
  join_draft_lobby: (tier: DraftTournamentTier) => void;
  leave_draft_lobby: () => void;
  subscribe_draft_tournament: (tournamentId: string) => void;
  unsubscribe_draft_tournament: (tournamentId: string) => void;
  start_draft: (entryId: string) => void;
  make_draft_pick: (entryId: string, roundNumber: number, coinId: string) => void;
  use_powerup_swap: (entryId: string, pickId: string) => void;
  select_swap_coin: (entryId: string, pickId: string, newCoinId: string) => void;
  use_powerup_boost: (entryId: string, pickId: string) => void;
  use_powerup_freeze: (entryId: string, pickId: string) => void;
  // Progression events
  subscribe_progression: (walletAddress: string) => void;
  unsubscribe_progression: (walletAddress: string) => void;
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

// Draft WebSocket events (add to ServerToClientEvents)
export interface DraftServerToClientEvents {
  draft_tournament_update: (tournament: DraftTournament) => void;
  draft_session_update: (session: DraftSession) => void;
  draft_round_options: (round: DraftRound) => void;
  draft_pick_confirmed: (pick: DraftPick) => void;
  draft_completed: (entry: DraftEntry) => void;
  draft_leaderboard_update: (data: { tournamentId: string; leaderboard: DraftLeaderboardEntry[] }) => void;
  draft_score_update: (data: { entryId: string; currentScore: number }) => void;
  draft_swap_options: (data: { pickId: string; options: Memecoin[] }) => void;
  powerup_used: (usage: PowerUpUsage) => void;
  memecoin_prices_update: (prices: Record<string, number>) => void;
  draft_error: (message: string) => void;
}

// ===================
// Progression System Types
// ===================

export type XpSource = 'battle' | 'prediction' | 'draft' | 'spectator';
export type ProgressionPerkType = 'rake_9' | 'rake_8' | 'rake_7' | 'oracle_4_5' | 'oracle_4' | 'oracle_3_5';
export type CosmeticType = 'border' | 'pfp' | 'title';

export interface UserProgression {
  walletAddress: string;
  totalXp: number;
  currentLevel: number;
  xpToNextLevel: number;
  xpProgress: number; // percentage 0-100
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface XpHistoryEntry {
  id: number;
  walletAddress: string;
  xpAmount: number;
  source: XpSource;
  sourceId?: string;
  description?: string;
  createdAt: number;
}

export interface UserPerk {
  id: number;
  walletAddress: string;
  perkType: ProgressionPerkType;
  unlockLevel: number;
  isUsed: boolean;
  activatedAt?: number;
  expiresAt?: number;
  createdAt: number;
}

export interface UserCosmetic {
  id: number;
  walletAddress: string;
  cosmeticType: CosmeticType;
  cosmeticId: string;
  unlockLevel: number;
  createdAt: number;
}

export interface LevelUpResult {
  previousLevel: number;
  newLevel: number;
  unlockedPerks: UserPerk[];
  unlockedCosmetics: UserCosmetic[];
  newTitle: string | null;
  freeBetsEarned?: number;
}

export interface XpGainEvent {
  walletAddress: string;
  amount: number;
  source: XpSource;
  sourceId?: string;
  description: string;
  newTotalXp: number;
  levelUp?: LevelUpResult;
}

// Free Bet types
export type FreeBetTransactionType = 'earned' | 'used';
export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator';

export interface FreeBetBalance {
  walletAddress: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeUsed: number;
  updatedAt: number;
}

export interface FreeBetTransaction {
  id: number;
  walletAddress: string;
  amount: number;
  transactionType: FreeBetTransactionType;
  gameMode?: GameMode;
  description?: string;
  createdAt: number;
}

// Progression WebSocket events
export interface ProgressionServerToClientEvents {
  xp_gained: (data: XpGainEvent) => void;
  level_up: (data: LevelUpResult & { walletAddress: string }) => void;
  perk_activated: (perk: UserPerk) => void;
  perk_expired: (data: { perkId: number; walletAddress: string }) => void;
  free_bet_earned: (data: { walletAddress: string; count: number; description?: string; newBalance: number }) => void;
  free_bet_used: (data: { walletAddress: string; gameMode: GameMode; newBalance: number }) => void;
}
