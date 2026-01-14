# DegenDome - TypeScript Types Reference

> **Purpose**: Quick reference for all TypeScript types used across the project. Upload alongside CLAUDE_PROJECT_CONTEXT.md.

---

## Core Trading Types

```typescript
// Position and Trading
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
```

---

## Battle Types

```typescript
export type BattleStatus = 'waiting' | 'active' | 'completed' | 'cancelled';
export type BattleMode = 'paper' | 'real';
export type BattleDuration = 1800 | 3600; // 30min, 1hr

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
  onChainBattleId?: string;
  onChainSettled?: boolean;
}
```

---

## Prediction (Oracle) Types

```typescript
export type PredictionSide = 'long' | 'short';
export type RoundStatus = 'betting' | 'locked' | 'settled';
export type QuickBetAmount = 5 | 15 | 25 | 50 | 100;
export type BetStatus = 'pending' | 'won' | 'lost' | 'cancelled' | 'push';

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
```

---

## Spectator Betting Types

```typescript
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
  player1: { wallet: string; odds: number; totalBacked: number };
  player2: { wallet: string; odds: number; totalBacked: number };
  totalPool: number;
  lastUpdated: number;
}

export interface LiveBattle extends Battle {
  odds?: BattleOdds;
  featured?: boolean;
}
```

---

## Draft Tournament Types

```typescript
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
}

export interface DraftPick {
  id: string;
  entryId: string;
  coinId: string;
  coinSymbol: string;
  pickOrder: number;
  priceAtDraft: number;
  priceAtEnd?: number;
  percentChange?: number;
  boostMultiplier: number;
  isFrozen: boolean;
  frozenAtPrice?: number;
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
}
```

---

## Progression System Types

```typescript
export type XpSource = 'battle' | 'prediction' | 'draft' | 'spectator';
export type ProgressionPerkType = 'rake_9' | 'rake_8' | 'rake_7' | 'oracle_4_5' | 'oracle_4' | 'oracle_3_5';
export type CosmeticType = 'border' | 'pfp' | 'title';

export interface UserProgression {
  walletAddress: string;
  totalXp: number;
  currentLevel: number;
  xpToNextLevel: number;
  xpProgress: number;
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
  description: string;
  newTotalXp: number;
  levelUp?: LevelUpResult;
}
```

---

## Streak & Free Bet Types

```typescript
export interface UserStreak {
  walletAddress: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  updatedAt: number;
}

export type FreeBetTransactionType = 'earned' | 'used';
export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator';

export interface FreeBetBalance {
  walletAddress: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeUsed: number;
  updatedAt: number;
}

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
  createdAt: number;
}
```

---

## User Stats & Leaderboard Types

```typescript
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

export interface StatsLeaderboardEntry {
  rank: number;
  walletAddress: string;
  totalWagers: number;
  totalWins: number;
  winRate: number;
  totalProfitLoss: number;
  totalWagered: number;
}

export interface LeaderboardEntry {
  walletAddress: string;
  totalBattles: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}
```

---

## Notification Types

```typescript
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
```

---

## Achievement Types

```typescript
export type AchievementCategory = 'wager' | 'win' | 'streak' | 'level' | 'social' | 'special';
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
}

export interface AchievementProgress {
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: number | null;
}
```

---

## Referral Types

```typescript
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
```

---

## Rake Rebate Types

```typescript
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
```

---

## WebSocket Event Types

```typescript
// Server → Client Events
export interface ServerToClientEvents {
  // Battle events
  battle_update: (battle: Battle) => void;
  battle_started: (battle: Battle) => void;
  battle_ended: (battle: Battle) => void;

  // Price events
  price_update: (prices: Record<string, number>) => void;

  // Position events
  position_opened: (position: PerpPosition) => void;
  position_closed: (trade: TradeRecord) => void;

  // Prediction events
  prediction_round: (round: PredictionRound) => void;
  prediction_history: (rounds: PredictionRound[]) => void;
  prediction_settled: (round: PredictionRound) => void;
  prediction_bet_placed: (bet: PredictionBet) => void;

  // Spectator events
  live_battles: (battles: LiveBattle[]) => void;
  odds_update: (odds: BattleOdds) => void;
  bet_placed: (bet: SpectatorBet) => void;
  spectator_count: (data: { battleId: string; count: number }) => void;

  // Progression events
  progression_update: (progression: UserProgression) => void;
  xp_gained: (data: XpGainEvent) => void;
  level_up: (data: LevelUpResult & { walletAddress: string }) => void;
  perk_activated: (perk: UserPerk) => void;
  perk_expired: (data: { perkId: number }) => void;

  // Notification events
  notification: (notification: Notification) => void;
  notification_count: (count: number) => void;

  // Error
  error: (message: string) => void;
}

// Client → Server Events
export interface ClientToServerEvents {
  // Battle events
  join_battle: (battleId: string, walletAddress: string) => void;
  create_battle: (config: BattleConfig, walletAddress: string) => void;
  queue_matchmaking: (config: BattleConfig, walletAddress: string) => void;
  leave_battle: (battleId: string) => void;

  // Trading events
  open_position: (battleId: string, asset: string, side: PositionSide, leverage: Leverage, size: number) => void;
  close_position: (battleId: string, positionId: string) => void;
  subscribe_prices: (tokens: string[]) => void;

  // Prediction events
  subscribe_prediction: (asset: string) => void;
  unsubscribe_prediction: (asset: string) => void;
  place_prediction: (asset: string, side: PredictionSide, amount: number, walletAddress: string) => void;

  // Spectator events
  subscribe_live_battles: () => void;
  spectate_battle: (battleId: string) => void;
  place_bet: (battleId: string, backedPlayer: string, amount: number, walletAddress: string) => void;

  // Progression events
  subscribe_progression: (walletAddress: string) => void;
  unsubscribe_progression: (walletAddress: string) => void;

  // Notification events
  subscribe_notifications: (walletAddress: string) => void;
}
```

---

*Use these types when implementing features or debugging type errors.*
