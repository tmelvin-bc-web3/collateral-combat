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
  liquidationDistance: number; // Percentage distance to liquidation (e.g., 5.2 = 5.2% away)
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

// Extended TradeRecord with signature for trustless settlement
export interface SignedTrade extends TradeRecord {
  signature: string;
  signedMessage: string; // JSON stringified SignedTradeMessage
  verified: boolean;
  walletAddress: string;
}

export type BattleStatus = 'waiting' | 'ready_check' | 'active' | 'completed' | 'cancelled';
export type BattleMode = 'paper' | 'real';
export type BattleEndReason = 'time' | 'liquidation' | 'forfeit';
// Battle durations in seconds
// Standard: 1800 (30min), 3600 (1hr)
// Challenge: 60 (1min), 120 (2min), 180 (3min), 300 (5min)
export type BattleDuration = 60 | 120 | 180 | 300 | 1800 | 3600;

// Ready Check Types
export interface ReadyCheckState {
  battleId: string;
  player1Wallet: string;
  player2Wallet: string;
  player1Ready: boolean;
  player2Ready: boolean;
  startedAt: number;
  expiresAt: number;
}

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

// Challenge Notification Types
export interface ChallengeAcceptedNotification {
  challengeId: string;
  challengeCode: string;
  acceptedBy: string;
  battleId: string;
  entryFee: number;
  duration: number;
}

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
  pendingDebitId?: string; // For PDA balance tracking
  lockTx?: string; // On-chain transaction that locked entry fee in global vault
  isFreeBet?: boolean; // Whether this player used a free bet for entry
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
  // On-chain tracking
  onChainBattleId?: string;  // Pubkey of on-chain battle account
  onChainSettled?: boolean;  // Whether settle_battle has been called
  // Signed trades for trustless settlement
  signedTrades?: SignedTrade[];
  // Battle end reason
  endReason?: BattleEndReason;
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
  lockTx?: string; // On-chain transaction that locked wager in global vault
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
export interface OddsLockResponse {
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
  lockTime: number;
  endTime: number;
  duration: number;
  longPool: number;
  shortPool: number;
  longBets: PredictionBet[];
  shortBets: PredictionBet[];
  winner?: PredictionSide | 'push';
  totalPool: number;
  onChainRoundId?: number;
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
  lockTx?: string; // On-chain transaction that locked funds in global vault
  isFreeBet?: boolean; // Whether this bet was placed using a free bet credit
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
  // Ready check events
  match_found: (data: ReadyCheckResponse) => void;
  ready_check_update: (data: ReadyCheckUpdate) => void;
  ready_check_cancelled: (data: ReadyCheckCancelled) => void;
  // Challenge notification events
  challenge_accepted: (data: ChallengeAcceptedNotification) => void;
  // Spectator events
  live_battles: (battles: LiveBattle[]) => void;
  spectator_battle_update: (battle: LiveBattle) => void;
  odds_update: (odds: BattleOdds) => void;
  bet_placed: (bet: SpectatorBet) => void;
  bet_settled: (bet: SpectatorBet) => void;
  spectator_count: (data: { battleId: string; count: number }) => void;
  user_bets: (bets: SpectatorBet[]) => void;
  odds_lock: (lock: OddsLockResponse) => void;
  bet_verified: (bet: SpectatorBet) => void;
  unclaimed_bets: (bets: SpectatorBet[]) => void;
  claim_verified: (data: { betId: string; txSignature: string }) => void;
  // Prediction events
  prediction_round: (round: PredictionRound) => void;
  prediction_history: (rounds: PredictionRound[]) => void;
  prediction_settled: (round: PredictionRound) => void;
  prediction_bet_placed: (bet: PredictionBet) => void;
  prediction_bet_result: (result: { success: boolean; error?: string; bet?: PredictionBet }) => void;
  // Progression events
  progression_update: (progression: UserProgression) => void;
  xp_gained: (data: XpGainEvent) => void;
  level_up: (data: LevelUpResult & { walletAddress: string }) => void;
  perk_activated: (perk: UserPerk) => void;
  perk_expired: (data: { perkId: number }) => void;
  // Rebate events
  rebate_received: (data: { walletAddress: string; roundId: number; rebateLamports: number; rebateSol: number; perkType?: string }) => void;
  rebate_summary: (data: { totalRebates: number; totalRebateLamports: number; totalRebateSol: number; pendingRebateLamports: number; pendingRebateSol: number }) => void;
  // Notification events
  notification: (notification: Notification) => void;
  notification_count: (count: number) => void;
  // LDS (Last Degen Standing) events
  lds_event: (event: any) => void;
  lds_game_state: (state: any) => void;
  lds_join_success: (data: { game: any }) => void;
  lds_join_error: (data: { error: string }) => void;
  lds_leave_success: (data: {}) => void;
  lds_leave_error: (data: { error: string }) => void;
  lds_prediction_success: (data: {}) => void;
  lds_prediction_error: (data: { error: string }) => void;
  // Token Wars events
  token_wars_event: (event: any) => void;
  token_wars_battle_state: (state: any) => void;
  token_wars_bet_success: (data: { bet: any }) => void;
  token_wars_bet_error: (data: { error: string }) => void;
  // Battle Chat events
  chat_message: (message: import('./types/chat').ChatMessage) => void;
  chat_history: (messages: import('./types/chat').ChatMessage[]) => void;
  chat_error: (error: { code: string; message: string }) => void;
  chat_system: (message: { battleId: string; content: string }) => void;
  reaction_update: (data: { battleId: string; messageId: string; emoji: string; wallet: string; action: 'add' | 'remove' }) => void;
}

export interface ClientToServerEvents {
  join_battle: (battleId: string, walletAddress: string) => void;
  create_battle: (config: BattleConfig, walletAddress: string) => void;
  queue_matchmaking: (config: BattleConfig, walletAddress: string) => void;
  start_solo_practice: (data: { config: BattleConfig; wallet: string; onChainBattleId?: string }) => void;
  open_position: (battleId: string, asset: string, side: PositionSide, leverage: Leverage, size: number) => void;
  close_position: (battleId: string, positionId: string) => void;
  // Signed trade events for trustless settlement
  open_position_signed: (payload: SignedTradePayload) => void;
  close_position_signed: (payload: SignedTradePayload) => void;
  leave_battle: (battleId: string) => void;
  subscribe_prices: (tokens: string[]) => void;
  // Ready check events
  register_wallet: (walletAddress: string) => void;
  accept_match: (battleId: string) => void;
  decline_match: (battleId: string) => void;
  // Challenge notification events
  subscribe_challenge_notifications: (walletAddress: string) => void;
  unsubscribe_challenge_notifications: (walletAddress: string) => void;
  // Open challenges subscription events (challenge board)
  subscribe_challenges: () => void;
  unsubscribe_challenges: () => void;
  // Spectator events
  subscribe_live_battles: () => void;
  unsubscribe_live_battles: () => void;
  spectate_battle: (battleId: string) => void;
  leave_spectate: (battleId: string) => void;
  place_bet: (battleId: string, backedPlayer: string, amount: number, walletAddress: string) => void;
  get_my_bets: (walletAddress: string) => void;
  request_odds_lock: (data: { battleId: string; backedPlayer: string; amount: number; walletAddress: string }) => void;
  verify_bet: (data: { lockId: string; txSignature: string; walletAddress: string }) => void;
  get_unclaimed_bets: (walletAddress: string) => void;
  verify_claim: (data: { betId: string; txSignature: string; walletAddress: string }) => void;
  // Prediction events
  subscribe_prediction: (asset: string) => void;
  unsubscribe_prediction: (asset: string) => void;
  place_prediction: (asset: string, side: PredictionSide, amount: number, walletAddress: string) => void;
  place_prediction_bet: (data: { asset: string; side: PredictionSide; amount: number; bettor: string }) => void;
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
  // Notification events
  subscribe_notifications: (walletAddress: string) => void;
  unsubscribe_notifications: (walletAddress: string) => void;
  // Rebate events
  subscribe_rebates: (walletAddress: string) => void;
  unsubscribe_rebates: (walletAddress: string) => void;
  // LDS (Last Degen Standing) events
  subscribe_lds: () => void;
  unsubscribe_lds: () => void;
  lds_join_game: (walletAddress: string) => void;
  lds_leave_game: (walletAddress: string) => void;
  lds_submit_prediction: (data: { gameId: string; wallet: string; prediction: 'up' | 'down' }) => void;
  // Token Wars events
  subscribe_token_wars: () => void;
  unsubscribe_token_wars: () => void;
  token_wars_place_bet: (data: { wallet: string; side: 'token_a' | 'token_b'; amountLamports: number }) => void;
  // Battle Chat events
  send_chat_message: (data: { battleId: string; content: string }) => void;
  load_chat_history: (battleId: string) => void;
  add_reaction: (data: { battleId: string; messageId: string; emoji: string }) => void;
  remove_reaction: (data: { battleId: string; messageId: string; emoji: string }) => void;
  // Scheduled Matches events
  subscribe_scheduled_matches: (gameMode: string) => void;
  unsubscribe_scheduled_matches: (gameMode: string) => void;
  register_for_match: (data: { matchId: string; wallet: string }) => void;
  unregister_from_match: (data: { matchId: string; wallet: string }) => void;
  scheduled_ready_check_response: (data: { matchId: string; wallet: string; ready: boolean }) => void;
}

// ===================
// Memecoin Draft Types
// ===================

// Updated to SOL tiers (previously USD which was never collected!)
export type DraftTournamentTier = '0.1 SOL' | '0.5 SOL' | '1 SOL';
export type DraftTournamentStatus = 'upcoming' | 'drafting' | 'active' | 'completed';
export type PowerUpType = 'swap' | 'boost' | 'freeze';

// Tier to lamports mapping
export const DRAFT_TIER_TO_LAMPORTS: Record<DraftTournamentTier, number> = {
  '0.1 SOL': 100_000_000,   // 0.1 SOL
  '0.5 SOL': 500_000_000,   // 0.5 SOL
  '1 SOL': 1_000_000_000,   // 1 SOL
};

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
  entryFeeLamports: number; // Changed from USD to lamports
  status: DraftTournamentStatus;
  weekStartUtc: number;
  weekEndUtc: number;
  draftDeadlineUtc: number;
  totalEntries: number;
  prizePoolLamports: number; // Changed from USD to lamports
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
  entryFeePaidLamports: number; // Changed from USD to lamports
  draftCompleted: boolean;
  picks: DraftPick[];
  powerUpsUsed: PowerUpUsage[];
  finalScore?: number;
  finalRank?: number;
  payoutLamports?: number; // Changed from USD to lamports
  isFreeBet?: boolean; // Whether this entry was made with a free bet
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

export type XpSource = 'battle' | 'prediction' | 'draft' | 'spectator' | 'share';
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
  baseAmount?: number;
  streakBonus?: number;
  streakDays?: number;
  source: XpSource;
  sourceId?: string;
  description: string;
  newTotalXp: number;
  levelUp?: LevelUpResult;
}

// Streak types
export interface UserStreak {
  walletAddress: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  updatedAt: number;
}

// Free Bet types
export type FreeBetTransactionType = 'earned' | 'used';
export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator' | 'tournament';

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

// ===================
// Free Bet Position Types (Escrow-based)
// ===================

export type FreeBetPositionStatus = 'pending' | 'placed' | 'won' | 'lost' | 'settled' | 'failed';

export interface FreeBetPosition {
  id: number;
  walletAddress: string;
  roundId: number;
  side: 'long' | 'short';
  amountLamports: number;
  status: FreeBetPositionStatus;
  payoutLamports?: number;
  txSignatureBet?: string;
  txSignatureClaim?: string;
  txSignatureSettlement?: string;
  createdAt: number;
}

// ===================
// Rake Rebate Types
// ===================

export type RakeRebateStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface RakeRebate {
  id: number;
  walletAddress: string;
  roundId: number;
  grossWinningsLamports: number;
  effectiveFeeBps: number;
  perkType?: string;
  rebateLamports: number;
  status: RakeRebateStatus;
  claimTxSignature: string;
  rebateTxSignature?: string;
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

// ===================
// User Stats Types
// ===================

export type WagerType = 'spectator' | 'prediction' | 'battle' | 'draft';
export type WagerOutcome = 'won' | 'lost' | 'push' | 'cancelled';

export interface UserWager {
  id: number;
  walletAddress: string;
  wagerType: WagerType;
  amount: number;
  outcome: WagerOutcome;
  profitLoss: number;
  gameId?: string;
  createdAt: number;
}

export interface UserStats {
  walletAddress: string;
  totalWagers: number;
  totalWins: number;
  totalLosses: number;
  totalPushes: number;
  totalWagered: number;
  totalProfitLoss: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
  lastWagerAt: number | null;
}

export interface WagerHistoryResponse {
  wagers: UserWager[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatsLeaderboardEntry {
  rank: number;
  walletAddress: string;
  totalWagers: number;
  totalWins: number;
  winRate: number;
  totalProfitLoss: number;
  totalWagered: number;
}

// ===================
// Notification Types
// ===================

export type NotificationType =
  | 'wager_won'
  | 'wager_lost'
  | 'wager_push'
  | 'level_up'
  | 'perk_unlocked'
  | 'perk_expiring'
  | 'streak_bonus'
  | 'streak_lost'
  | 'free_wager_earned'
  | 'leaderboard_rank_change'
  | 'achievement_unlocked'
  | 'system';

export interface Notification {
  id: number;
  walletAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  limit: number;
  offset: number;
}

// ===================
// Achievement Types
// ===================

export type AchievementCategory =
  | 'wager'
  | 'win'
  | 'streak'
  | 'level'
  | 'social'
  | 'special';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconUrl: string;
  xpReward: number;
  rarity: AchievementRarity;
  requirement: number;
  requirementType: string;
  isHidden: boolean;
  createdAt: number;
}

export interface AchievementProgress {
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: number | null;
}

export interface AchievementListResponse {
  achievements: AchievementProgress[];
  totalUnlocked: number;
  totalAchievements: number;
}

// ===================
// Referral Types
// ===================

export interface ReferralCode {
  walletAddress: string;
  code: string;
  createdAt: number;
}

export interface Referral {
  id: number;
  referrerWallet: string;
  referredWallet: string;
  referralCode: string;
  status: 'pending' | 'active' | 'expired';
  createdAt: number;
  activatedAt: number | null;
  discountExpiresAt: number | null;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalXpEarned: number;
  totalRakeEarned: number;
  myCode: string;
  referrals: Referral[];
  hasDiscount: boolean;
  discountExpiresAt: number | null;
}

// ===================
// Scheduled Match Types
// ===================

export type ScheduledMatchStatus =
  | 'upcoming'
  | 'registration_open'
  | 'starting'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ScheduledMatch {
  id: string;
  gameMode: 'battle';
  scheduledStartTime: number;  // UTC timestamp
  registrationOpens: number;   // UTC timestamp
  registrationCloses: number;  // UTC timestamp (5 min before start)
  minPlayers: number;
  maxPlayers: number;
  registeredPlayers: string[]; // wallet addresses
  confirmedPlayers: string[];  // players who passed ready check
  status: ScheduledMatchStatus;
  entryFee: number;            // in SOL
  createdAt: number;
}

export interface ScheduledMatchEvent {
  type: 'match_scheduled' | 'registration_opened' | 'player_registered' |
        'player_unregistered' | 'ready_check_started' | 'ready_check_response' |
        'match_started' | 'match_cancelled';
  matchId: string;
  data?: any;
}

// ===================
// ELO Rating System Types
// ===================

/**
 * ELO tier for matchmaking
 * - protected: New players with <10 battles (isolated matchmaking)
 * - bronze: ELO < 1000
 * - silver: ELO 1000-1499
 * - gold: ELO 1500-1999
 * - platinum: ELO 2000-2499
 * - diamond: ELO 2500+
 */
export type EloTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'protected';

/**
 * User ELO data for API responses
 */
export interface UserElo {
  wallet: string;
  elo: number;
  battleCount: number;
  wins: number;
  losses: number;
  tier: EloTier;
}

// ===================
// Event (Fight Card) Types
// ===================

export type EventStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
export type EventBattleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface FightCardEvent {
  id: string;
  name: string;
  description?: string;
  scheduledStartTime: number;
  registrationOpens: number;
  registrationCloses: number;
  status: EventStatus;
  entryFeeLamports: number;
  maxParticipants: number;
  prizePoolLamports: number;
  createdAt: number;
  createdBy: string;
}

export interface EventBattle {
  id: string;
  eventId: string;
  position: number;
  player1Wallet: string;
  player2Wallet: string;
  battleId?: string;
  isMainEvent: boolean;
  status: EventBattleStatus;
}

export interface EventManagerEvent {
  type: 'event_created' | 'event_updated' | 'registration_opened' | 'event_starting' | 'event_started' | 'event_completed' | 'event_cancelled' | 'battle_starting';
  eventId: string;
  data: any;
}

// ===================
// Tournament (Bracket) Types
// ===================

export interface TournamentEvent {
  type: 'tournament_created' | 'tournament_started' | 'registration_opened' |
        'player_registered' | 'bracket_generated' | 'match_ready' |
        'match_started' | 'match_completed' | 'tournament_completed';
  tournamentId: string;
  data: any;
}

// Prize distribution by tournament size
export const TOURNAMENT_PRIZE_DISTRIBUTION = {
  8: [
    { place: 1, percent: 50 },
    { place: 2, percent: 30 },
    { place: 3, percent: 10 },  // Split among 2 semifinal losers = 5% each
    { place: 4, percent: 10 },
  ],
  16: [
    { place: 1, percent: 40 },
    { place: 2, percent: 25 },
    { place: 3, percent: 15 },
    { place: 4, percent: 10 },
    { place: 5, percent: 10 },  // Split among quarterfinalist losers
  ],
} as const;
