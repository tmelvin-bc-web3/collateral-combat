# Sol Battles - Data Flows & API Documentation

This document provides comprehensive documentation of all data flows, APIs, and their usage in the Sol Battles (DegenDome) project.

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Backend API Endpoints](#2-backend-api-endpoints)
3. [WebSocket Events](#3-websocket-events)
4. [Price Data Flow](#4-price-data-flow)
5. [Game Mode Data Flows](#5-game-mode-data-flows)
6. [Database Tables](#6-database-tables)
7. [External Services](#7-external-services)

---

## 1. Authentication Flow

### Overview

Sol Battles uses a hybrid authentication system combining **JWT tokens** (for session-based auth) and **wallet signature verification** (for one-time actions).

### JWT Token-Based Authentication (Primary)

#### Login Flow

```
User                    Frontend                    Backend
  |                        |                           |
  |-- Connect Wallet ----->|                           |
  |                        |                           |
  |-- Sign Message ------->|                           |
  |                        |                           |
  |                        |-- POST /api/auth/login -->|
  |                        |   Headers:                |
  |                        |   x-wallet-address        |
  |                        |   x-signature             |
  |                        |   x-timestamp             |
  |                        |                           |
  |                        |<-- JWT Token -------------|
  |                        |                           |
  |                        |-- Store in localStorage --|
```

#### Message Format

```
DegenDome:login:{timestamp}
```

Where `timestamp` is Unix time in milliseconds.

#### JWT Token Details

| Property | Value |
|----------|-------|
| Secret | `JWT_SECRET` env var (required in production) |
| Expiry | 4 hours |
| Payload | `{ wallet: string, iat: number, exp: number }` |

#### Token Storage (Frontend)

- Stored in `localStorage` under key determined by frontend
- Sent via `Authorization: Bearer <token>` header
- Auto-refreshed before expiry in authenticated contexts

### Endpoints

#### `POST /api/auth/login`

Sign in with wallet signature to get a JWT token.

**Headers:**
- `x-wallet-address`: Wallet public key (base58)
- `x-signature`: Signature of "DegenDome:login:{timestamp}"
- `x-timestamp`: Unix timestamp (ms)

**Response:**
```json
{
  "token": "eyJ...",
  "expiresIn": "24h",
  "wallet": "ABC123..."
}
```

**Rate Limit:** `strictLimiter`

#### `GET /api/auth/verify`

Verify a JWT token is still valid.

**Headers:**
- `Authorization`: Bearer <token>

**Response:**
```json
{
  "valid": true,
  "wallet": "ABC123..."
}
```

### Signature Replay Protection

The backend implements signature replay protection:

- Used signatures are cached in-memory with 5-minute expiry
- Cache key format: `{wallet}:{signature}`
- Cleanup runs every 60 seconds

### Middleware

| Middleware | Purpose |
|------------|---------|
| `requireAuth()` | Requires valid JWT or wallet signature |
| `requireOwnWallet` | Requires auth + wallet param match |
| `requireAdmin()` | Requires auth + wallet in ADMIN_WALLETS env |
| `requireEntryOwnership(fn)` | Requires auth + entry owned by wallet |
| `requireWalletHeader()` | Simple header check (no signature) |

---

## 2. Backend API Endpoints

### Base URL

- Development: `http://localhost:3001`
- Production: Configured via `BACKEND_URL`

### Rate Limiters

| Limiter | Description |
|---------|-------------|
| `globalLimiter` | Applied to all /api routes |
| `standardLimiter` | General read operations |
| `strictLimiter` | Write operations, login |
| `burstLimiter` | High-frequency reads (price history) |
| `pythLimiter` | Pyth price verification (10 req/min) |
| `writeLimiter` | Database write operations |

### Health & Tokens

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check with price service status |
| GET | `/api/tokens` | No | Get all whitelisted tokens |

### Prices

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/prices` | No | Get current prices for all tokens |
| GET | `/api/prices/history/:symbol` | No | Get price history (default 60s) |
| GET | `/api/prices/pyth/:symbol` | No | Get Pyth oracle price |
| GET | `/api/prices/pyth/symbols` | No | Get supported Pyth symbols |

### Price Verification / Audit

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/verification/audit` | No | Get audit records |
| GET | `/api/verification/flagged` | No | Get flagged discrepancies |
| GET | `/api/verification/game/:gameType/:gameId` | No | Get game verification summary |

### Battles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/battles` | No | Get all active battles |
| GET | `/api/battles/live` | No | Get live battles for spectators |
| GET | `/api/battles/recent` | No | Get recent completed battles |
| GET | `/api/battles/:id` | No | Get specific battle |
| GET | `/api/player/:wallet/battle` | No | Get player's current battle |

### Profiles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/username/check/:username` | No | Check username availability |
| GET | `/api/profile/:wallet` | No | Get user profile |
| PUT | `/api/profile/:wallet` | requireOwnWallet | Update profile |
| GET | `/api/profiles` | No | Batch get profiles |
| DELETE | `/api/profile/:wallet` | requireOwnWallet | Delete profile |

### NFTs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/nfts/:wallet` | No | Get wallet NFTs via Helius |

### Waitlist

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/waitlist/join` | Signature | Join waitlist |
| GET | `/api/waitlist/status/:email` | No | Get waitlist status |
| GET | `/api/waitlist/leaderboard` | No | Get referral leaderboard |
| GET | `/api/waitlist/validate/:code` | No | Validate referral code |
| GET | `/api/waitlist/count` | No | Get total waitlist count |
| PUT | `/api/waitlist/wallet` | No | Update wallet for entry |
| GET | `/api/waitlist/admin/entries` | requireAdmin | Admin: get all entries |

### Win Sharing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/shares/track` | No | Track a share event |
| GET | `/api/shares/stats/:wallet` | No | Get share stats |
| GET | `/api/shares/cooldown/:wallet` | No | Get share XP cooldown |

### Prediction (Oracle)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/prediction/:asset/current` | No | Get current round |
| GET | `/api/prediction/:asset/recent` | No | Get recent rounds |
| GET | `/api/prediction/:asset/stats` | No | Get prediction stats |
| GET | `/api/prediction/assets` | No | Get active assets |
| POST | `/api/prediction/:asset/start` | requireAdmin | Start prediction |
| POST | `/api/prediction/:asset/stop` | requireAdmin | Stop prediction |
| POST | `/api/prediction/free-bet` | requireAuth | Place free bet |
| GET | `/api/prediction/:wallet/free-bet-positions` | No | Get free bet positions |
| GET | `/api/predictions/history/:wallet` | No | Get prediction history |
| GET | `/api/predictions/round/:roundId` | No | Get round details |

### Draft Tournaments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/draft/tournaments` | No | Get all active tournaments |
| GET | `/api/draft/tournaments/tier/:tier` | No | Get tournament by tier |
| GET | `/api/draft/tournaments/:id` | No | Get specific tournament |
| GET | `/api/draft/tournaments/:id/leaderboard` | No | Get leaderboard |
| POST | `/api/draft/tournaments/:id/enter` | requireAuth | Enter tournament |
| GET | `/api/draft/entries/:entryId` | No | Get entry |
| GET | `/api/draft/entries/wallet/:wallet` | No | Get wallet's entries |
| POST | `/api/draft/entries/:entryId/start` | requireEntryOwnership | Start draft |
| POST | `/api/draft/entries/:entryId/pick` | requireEntryOwnership | Make draft pick |
| POST | `/api/draft/entries/:entryId/powerup/swap` | requireEntryOwnership | Use swap powerup |
| POST | `/api/draft/entries/:entryId/powerup/swap/select` | requireEntryOwnership | Select swap coin |
| POST | `/api/draft/entries/:entryId/powerup/boost` | requireEntryOwnership | Use boost powerup |
| POST | `/api/draft/entries/:entryId/powerup/freeze` | requireEntryOwnership | Use freeze powerup |
| GET | `/api/draft/memecoins` | No | Get all memecoins |
| GET | `/api/draft/memecoins/prices` | No | Get memecoin prices |

### Progression

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/progression/:wallet` | No | Get user progression |
| GET | `/api/progression/:wallet/history` | No | Get XP history |
| GET | `/api/progression/:wallet/perks` | No | Get available perks |
| POST | `/api/progression/:wallet/perks/:id/activate` | requireOwnWallet | Activate perk |
| GET | `/api/progression/:wallet/cosmetics` | No | Get unlocked cosmetics |
| GET | `/api/progression/:wallet/rake` | No | Get rake reduction |
| GET | `/api/progression/:wallet/free-bets` | No | Get free bet balance |
| GET | `/api/progression/:wallet/free-bets/history` | requireOwnWallet | Get free bet history |
| POST | `/api/progression/:wallet/free-bets/use` | requireOwnWallet | Use free bet |
| GET | `/api/progression/:wallet/rebates` | requireOwnWallet | Get rebate history |
| GET | `/api/progression/:wallet/rebates/summary` | requireOwnWallet | Get rebate summary |
| GET | `/api/progression/:wallet/streak` | No | Get streak info |

### User Stats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stats/:wallet` | No | Get user stats |
| GET | `/api/stats/:wallet/history` | requireOwnWallet | Get wager history |
| GET | `/api/stats/leaderboard/:metric` | No | Get leaderboard |
| GET | `/api/stats/:wallet/rank` | No | Get user rank |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications/:wallet` | requireOwnWallet | Get notifications |
| GET | `/api/notifications/:wallet/count` | requireOwnWallet | Get unread count |
| POST | `/api/notifications/:wallet/:id/read` | requireOwnWallet | Mark as read |
| POST | `/api/notifications/:wallet/read-all` | requireOwnWallet | Mark all read |
| DELETE | `/api/notifications/:wallet/:id` | requireOwnWallet | Delete notification |

### Achievements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/achievements/:wallet` | No | Get all achievements |
| GET | `/api/achievements/:wallet/unlocked` | No | Get unlocked achievements |
| GET | `/api/achievements/:wallet/unnotified` | requireOwnWallet | Get unnotified achievements |
| POST | `/api/achievements/:wallet/:id/notified` | requireOwnWallet | Mark as notified |
| POST | `/api/achievements/:wallet/check` | requireOwnWallet | Check & update achievements |

### Battle Challenges

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/challenges/mine` | requireAuth | Get user's challenges |
| GET | `/api/challenges/stats` | No | Get challenge stats |
| POST | `/api/challenges/create` | requireAuth | Create challenge |
| GET | `/api/challenges/:code` | No | Get challenge by code |
| POST | `/api/challenges/:code/accept` | requireAuth | Accept challenge |
| DELETE | `/api/challenges/:id` | requireAuth | Cancel challenge |

### LDS (Last Degen Standing)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lds/game` | No | Get current game state |
| GET | `/api/lds/game/:gameId` | No | Get specific game |
| GET | `/api/lds/player/:wallet/status` | No | Get player status |
| GET | `/api/lds/player/:wallet/stats` | No | Get player stats |
| GET | `/api/lds/player/:wallet/history` | No | Get player history |
| GET | `/api/lds/leaderboard` | No | Get leaderboard |
| GET | `/api/lds/games/recent` | No | Get recent games |
| GET | `/api/lds/config` | No | Get LDS config |

### Token Wars

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/token-wars/battle` | No | Get current battle |
| GET | `/api/token-wars/bet/:wallet` | No | Get user's bet |
| GET | `/api/token-wars/player/:wallet/stats` | No | Get player stats |
| GET | `/api/token-wars/player/:wallet/history` | No | Get bet history |
| GET | `/api/token-wars/leaderboard` | No | Get leaderboard |
| GET | `/api/token-wars/battles/recent` | No | Get recent battles |
| GET | `/api/token-wars/tokens` | No | Get available tokens |
| GET | `/api/token-wars/config` | No | Get config |

### Admin/Simulator

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/simulator/start` | requireAdmin | Start battle simulator |
| POST | `/api/simulator/stop` | requireAdmin | Stop simulator |
| GET | `/api/simulator/status` | requireAdmin | Get simulator status |

---

## 3. WebSocket Events

### Connection

```javascript
const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

### Server to Client Events

#### Battle Events

| Event | Payload | Description |
|-------|---------|-------------|
| `battle_update` | `Battle` | Battle state updated |
| `battle_started` | `Battle` | Battle has started |
| `battle_ended` | `Battle` | Battle completed |
| `battle_settled` | `{ battleId, txSignature, winnerId }` | On-chain settlement done |
| `position_opened` | `PerpPosition` | Position opened |
| `position_closed` | `TradeRecord` | Position closed |
| `matchmaking_status` | `{ position, estimated }` | Queue status |

#### Ready Check Events

| Event | Payload | Description |
|-------|---------|-------------|
| `match_found` | `ReadyCheckResponse` | Match found for queue |
| `ready_check_update` | `ReadyCheckUpdate` | Ready status changed |
| `ready_check_cancelled` | `ReadyCheckCancelled` | Match cancelled |

#### Challenge Events

| Event | Payload | Description |
|-------|---------|-------------|
| `challenge_accepted` | `ChallengeAcceptedNotification` | Friend challenge accepted |

#### Spectator Events

| Event | Payload | Description |
|-------|---------|-------------|
| `live_battles` | `LiveBattle[]` | All live battles |
| `spectator_battle_update` | `LiveBattle` | Battle update |
| `odds_update` | `BattleOdds` | Odds changed |
| `bet_placed` | `SpectatorBet` | Bet placed |
| `bet_settled` | `SpectatorBet` | Bet settled |
| `spectator_count` | `{ battleId, count }` | Spectator count |
| `user_bets` | `SpectatorBet[]` | User's bets |
| `odds_lock` | `OddsLockResponse` | Odds locked for bet |
| `bet_verified` | `SpectatorBet` | On-chain bet verified |
| `unclaimed_bets` | `SpectatorBet[]` | Unclaimed wins |
| `claim_verified` | `{ betId, txSignature }` | Claim verified |

#### Prediction Events

| Event | Payload | Description |
|-------|---------|-------------|
| `prediction_round` | `PredictionRound` | Round state |
| `prediction_history` | `PredictionRound[]` | Recent rounds |
| `prediction_settled` | `PredictionRound` | Round settled |
| `prediction_bet_placed` | `PredictionBet` | Bet placed |
| `prediction_bet_result` | `{ success, error?, bet? }` | Bet result |

#### Draft Events

| Event | Payload | Description |
|-------|---------|-------------|
| `draft_tournament_update` | `DraftTournament` | Tournament updated |
| `draft_session_update` | `DraftSession` | Draft session update |
| `draft_round_options` | `DraftRound` | Round options |
| `draft_pick_confirmed` | `DraftPick` | Pick confirmed |
| `draft_completed` | `DraftEntry` | Draft finished |
| `draft_leaderboard_update` | `{ tournamentId, leaderboard }` | Leaderboard updated |
| `draft_score_update` | `{ entryId, currentScore }` | Score changed |
| `draft_swap_options` | `{ pickId, options }` | Swap options |
| `powerup_used` | `PowerUpUsage` | Powerup activated |
| `memecoin_prices_update` | `Record<string, number>` | Price update |
| `draft_error` | `string` | Error message |

#### Progression Events

| Event | Payload | Description |
|-------|---------|-------------|
| `progression_update` | `UserProgression` | Progression state |
| `xp_gained` | `XpGainEvent` | XP earned |
| `level_up` | `LevelUpResult` | Level increased |
| `perk_activated` | `UserPerk` | Perk activated |
| `perk_expired` | `{ perkId }` | Perk expired |

#### Rebate Events

| Event | Payload | Description |
|-------|---------|-------------|
| `rebate_received` | `RebateReceivedEvent` | Rebate sent |
| `rebate_summary` | Summary object | Rebate totals |

#### Notification Events

| Event | Payload | Description |
|-------|---------|-------------|
| `notification` | `Notification` | New notification |
| `notification_count` | `number` | Unread count |

#### LDS Events

| Event | Payload | Description |
|-------|---------|-------------|
| `lds_event` | `LDSEvent` | Game event |
| `lds_game_state` | `LDSGameState` | Full game state |
| `lds_join_success` | `{ game }` | Joined game |
| `lds_join_error` | `{ error }` | Join failed |
| `lds_leave_success` | `{}` | Left game |
| `lds_leave_error` | `{ error }` | Leave failed |
| `lds_prediction_success` | `{}` | Prediction submitted |
| `lds_prediction_error` | `{ error }` | Prediction failed |

#### Token Wars Events

| Event | Payload | Description |
|-------|---------|-------------|
| `token_wars_event` | `TWEvent` | Battle event |
| `token_wars_battle_state` | `TWBattleState` | Battle state |
| `token_wars_bet_success` | `{ bet }` | Bet placed |
| `token_wars_bet_error` | `{ error }` | Bet failed |

#### General Events

| Event | Payload | Description |
|-------|---------|-------------|
| `price_update` | `Record<string, number>` | Price updates |
| `error` | `string` | Error message |

### Client to Server Events

#### Battle Events

| Event | Payload | Description |
|-------|---------|-------------|
| `create_battle` | `config, wallet` | Create battle |
| `join_battle` | `battleId, wallet` | Join battle |
| `queue_matchmaking` | `config, wallet` | Queue for match |
| `start_solo_practice` | `{ config, wallet, onChainBattleId? }` | Start solo |
| `open_position` | `battleId, asset, side, leverage, size` | Open position |
| `close_position` | `battleId, positionId` | Close position |
| `open_position_signed` | `SignedTradePayload` | Signed open |
| `close_position_signed` | `SignedTradePayload` | Signed close |
| `leave_battle` | `battleId` | Leave battle |
| `subscribe_prices` | `tokens[]` | Subscribe to prices |

#### Ready Check Events

| Event | Payload | Description |
|-------|---------|-------------|
| `register_wallet` | `wallet` | Register for notifications |
| `accept_match` | `battleId` | Accept match |
| `decline_match` | `battleId` | Decline match |

#### Challenge Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_challenge_notifications` | `wallet` | Subscribe |
| `unsubscribe_challenge_notifications` | `wallet` | Unsubscribe |

#### Spectator Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_live_battles` | none | Subscribe |
| `unsubscribe_live_battles` | none | Unsubscribe |
| `spectate_battle` | `battleId` | Watch battle |
| `leave_spectate` | `battleId` | Stop watching |
| `place_bet` | `battleId, backedPlayer, amount, wallet` | Place bet |
| `get_my_bets` | `wallet` | Get my bets |
| `request_odds_lock` | `{ battleId, backedPlayer, amount, wallet }` | Lock odds |
| `verify_bet` | `{ lockId, txSignature, wallet }` | Verify bet |
| `get_unclaimed_bets` | `wallet` | Get unclaimed |
| `verify_claim` | `{ betId, txSignature }` | Verify claim |

#### Prediction Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_prediction` | `asset` | Subscribe |
| `unsubscribe_prediction` | `asset` | Unsubscribe |
| `place_prediction` | `asset, side, amount, wallet` | Place bet (legacy) |
| `place_prediction_bet` | `{ asset, side, amount, bettor }` | Place bet (new) |

#### Draft Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_draft_lobby` | `tier` | Join lobby |
| `leave_draft_lobby` | none | Leave lobby |
| `subscribe_draft_tournament` | `tournamentId` | Subscribe |
| `unsubscribe_draft_tournament` | `tournamentId` | Unsubscribe |
| `start_draft` | `entryId` | Start draft |
| `make_draft_pick` | `entryId, roundNumber, coinId` | Make pick |
| `use_powerup_swap` | `entryId, pickId` | Use swap |
| `select_swap_coin` | `entryId, pickId, newCoinId` | Select new coin |
| `use_powerup_boost` | `entryId, pickId` | Use boost |
| `use_powerup_freeze` | `entryId, pickId` | Use freeze |

#### Progression Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_progression` | `wallet` | Subscribe |
| `unsubscribe_progression` | `wallet` | Unsubscribe |

#### Notification Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_notifications` | `wallet` | Subscribe |
| `unsubscribe_notifications` | `wallet` | Unsubscribe |

#### Rebate Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_rebates` | `wallet` | Subscribe |
| `unsubscribe_rebates` | `wallet` | Unsubscribe |

#### LDS Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_lds` | none | Subscribe |
| `unsubscribe_lds` | none | Unsubscribe |
| `lds_join_game` | `wallet` | Join game |
| `lds_leave_game` | `wallet` | Leave game |
| `lds_submit_prediction` | `{ gameId, wallet, prediction }` | Submit prediction |

#### Token Wars Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_token_wars` | none | Subscribe |
| `unsubscribe_token_wars` | none | Unsubscribe |
| `token_wars_place_bet` | `{ wallet, side, amountLamports, useFreeBet? }` | Place bet |

### Socket Rooms

| Room | Purpose |
|------|---------|
| `price_updates` | Price broadcast |
| `live_battles` | Spectator listings |
| `spectate_{battleId}` | Specific battle spectators |
| `prediction_{asset}` | Prediction game |
| `draft_lobby_{tier}` | Draft lobby |
| `draft_tournament_{id}` | Tournament updates |
| `progression_{wallet}` | User progression |
| `notifications_{wallet}` | User notifications |
| `rebates_{wallet}` | User rebates |
| `lds` | LDS game |
| `token_wars` | Token Wars |

---

## 4. Price Data Flow

### Architecture

```
CoinMarketCap API -----> PriceService -----> WebSocket -----> Frontend
        |                     |                  |
        |                     v                  |
        |              In-memory cache           |
        |                     |                  |
        v                     v                  v
  (30s intervals)      1s tick simulation   price_update event
```

### Price Service (`priceService.ts`)

**Source:** CoinMarketCap Pro API

**Update Intervals:**
- API fetch: Every 30 seconds
- Tick simulation: Every 1 second (micro movements between fetches)

**Tracked Symbols:**
- Major: SOL, BTC, ETH
- Solana Ecosystem: JUP, RAY, JTO
- Memecoins: WIF, BONK, PONKE, PENGU, TURBO, POPCAT, FARTCOIN, MEW, PNUT, GOAT

**Price History:**
- Stored in-memory for 2 minutes
- Used for charts and historical queries

### CoinMarketCap Service (`coinMarketCapService.ts`)

**Purpose:** Fetch memecoin data for Draft tournaments

**Update Interval:** Every 5 minutes

**Cached Data:**
- Memecoin ID, symbol, name
- Market cap rank
- Current price
- 24h price change
- Logo URL

### Pyth Verification Service (`pythVerificationService.ts`)

**Purpose:** Oracle price verification for audit trail

**Flow:**
1. Backend prices used for game logic (fast, free)
2. Pyth prices logged alongside for verification
3. Discrepancies > 1% flagged for review

**Supported Symbols:** SOL, BTC, ETH, WIF, BONK, JUP, RAY, JTO

**Audit Records Include:**
- Game type (oracle, lds, token_wars)
- Backend price vs Pyth price
- Confidence interval
- Discrepancy percentage
- Flagged status

### Data Flow to Frontend

1. Frontend connects WebSocket
2. Emits `subscribe_prices` with token list
3. Joins `price_updates` room
4. Receives `price_update` events every second

---

## 5. Game Mode Data Flows

### 5.1 Oracle (Price Prediction)

#### Entry Flow

```
User                    Frontend                Backend              On-Chain
  |                        |                       |                    |
  |-- Select Side -------->|                       |                    |
  |-- Select Amount ------>|                       |                    |
  |                        |                       |                    |
  |                        |-- Check PDA Balance ->|                    |
  |                        |<-- Available Balance -|                    |
  |                        |                       |                    |
  |                        |-- place_prediction -->|                    |
  |                        |   {asset,side,amt,wallet}                  |
  |                        |                       |                    |
  |                        |                       |-- Debit Pending -->|
  |                        |                       |                    |
  |                        |<-- prediction_bet_placed                   |
```

#### Round Lifecycle

| Phase | Duration | Description |
|-------|----------|-------------|
| Betting | 25 seconds | Users can place bets |
| Locked | 5 seconds | No more bets, waiting |
| Settled | Instant | Winner determined, payouts |

**Configuration:**
- Round duration: 30 seconds
- Lock before end: 5 seconds
- Platform fee: 5% on winnings
- Valid bet amounts: 0.01, 0.05, 0.1, 0.25, 0.5 SOL

#### Settlement Flow

```
Backend                      On-Chain               Users
   |                            |                      |
   |-- Get end price (Pyth) --->|                      |
   |                            |                      |
   |-- Determine winner --------|                      |
   |                            |                      |
   |-- Calculate payouts -------|                      |
   |   (pool - rake) / winners  |                      |
   |                            |                      |
   |-- Transfer from pool ------|                      |
   |   to winner vaults         |                      |
   |                            |                      |
   |<-------------------------- prediction_settled --->|
```

#### PDA Balance Interactions

- `balanceService.debitPending()` - Reserve bet amount
- `balanceService.confirmDebit()` - Finalize after on-chain
- `balanceService.transferToGlobalVault()` - Move to game pool
- `balanceService.transferFromGlobalVault()` - Pay winners

### 5.2 Token Wars

#### Game Flow

```
Phase 1: BETTING (60s)
  - New battle created with random token pair
  - Users place bets on Token A or Token B
  - Parimutuel odds calculated

Phase 2: IN_PROGRESS (5 min)
  - Start prices recorded
  - Live price updates broadcast
  - No more bets accepted

Phase 3: COOLDOWN (60s)
  - Winner determined by % price change
  - Payouts calculated and distributed
  - Next battle queued
```

**Configuration:**
```javascript
BETTING_DURATION_SECONDS: 60
BATTLE_DURATION_SECONDS: 300
COOLDOWN_DURATION_SECONDS: 60
MIN_BET_SOL: 0.01
MAX_BET_SOL: 10
RAKE_PERCENT: 5
```

**Available Tokens:**
WIF, BONK, PONKE, PENGU, TURBO, POPCAT, FARTCOIN, MEW, PNUT, GOAT

#### Entry Flow

```
User                    Frontend                Backend
  |                        |                       |
  |-- Select Side -------->|                       |
  |-- Enter Amount ------->|                       |
  |                        |                       |
  |                        |-- token_wars_place_bet ->|
  |                        |   {wallet,side,amount,useFreeBet?}
  |                        |                       |
  |                        |                       |-- Verify balance
  |                        |                       |-- Check free bet
  |                        |                       |-- Debit pending
  |                        |                       |
  |                        |<-- token_wars_bet_success -|
```

#### Settlement

- Winner: Token with higher % price change
- Payouts: Parimutuel (bet proportionally shares losing pool minus rake)
- Failed payouts: Persisted to database for retry

### 5.3 LDS (Last Degen Standing)

#### Game Flow

```
Phase: REGISTERING
  - Game scheduled (10-minute intervals)
  - Players join and lock entry fee
  - Min 3 players required

Phase: STARTING (3s)
  - Transition to active
  - Brief countdown

Phase: IN_PROGRESS
  - Rounds: 30s each, 25s prediction window
  - Players predict SOL up/down
  - Wrong prediction = eliminated
  - Max 15 rounds

Phase: COMPLETED
  - Winner(s) determined
  - Payouts distributed
```

**Configuration:**
```javascript
ENTRY_FEE_SOL: 0.1
RAKE_PERCENT: 5
MAX_PLAYERS: 50
MIN_PLAYERS: 3
GAME_INTERVAL_MINUTES: 10
ROUND_DURATION_SECONDS: 30
PREDICTION_WINDOW_SECONDS: 25
MAX_ROUNDS: 15
```

**Payout Tiers:**
| Players | Payouts |
|---------|---------|
| 3-9 | Winner takes all |
| 10-19 | 60%, 25%, 15% |
| 20-34 | 45%, 25%, 15%, 10%, 5% |
| 35-50 | 35%, 20%, 15%, 10%, 8%, 7%, 5% |

#### Entry Flow

```
User                    Frontend                Backend
  |                        |                       |
  |                        |-- subscribe_lds ---->|
  |                        |<-- lds_game_state ---|
  |                        |                       |
  |-- Join Game ---------->|                       |
  |                        |-- lds_join_game ---->|
  |                        |   {wallet}            |
  |                        |                       |-- Verify balance
  |                        |                       |-- Debit entry fee
  |                        |                       |
  |                        |<-- lds_join_success -|
```

#### Prediction Flow

```
User                    Frontend                Backend
  |                        |                       |
  |                        |<-- lds_event --------|
  |                        |   {type: 'round_started'}
  |                        |                       |
  |-- Predict UP/DOWN ---->|                       |
  |                        |-- lds_submit_prediction ->|
  |                        |   {gameId,wallet,prediction}
  |                        |                       |
  |                        |<-- lds_prediction_success |
  |                        |                       |
  |                        |<-- lds_event --------|
  |                        |   {type: 'round_resolved'}
```

### 5.4 Draft Tournament

#### Tournament Structure

**Tiers:**
| Tier | Entry Fee | Prize Pool |
|------|-----------|------------|
| 0.1 SOL | 100M lamports | Sum of entries |
| 0.5 SOL | 500M lamports | Sum of entries |
| 1 SOL | 1B lamports | Sum of entries |

**Timeline:**
- Tournament runs for 1 week
- Draft deadline: End of week UTC
- Settlement: After week ends

#### Entry Flow

```
User                    Frontend                Backend
  |                        |                       |
  |                        |-- GET /api/draft/tournaments/tier/:tier
  |                        |<-- Tournament info ---|
  |                        |                       |
  |-- Enter Tournament --->|                       |
  |                        |-- POST .../enter ---->|
  |                        |   {walletAddress}     |
  |                        |                       |-- Verify balance
  |                        |                       |-- Debit entry fee
  |                        |                       |
  |                        |<-- Entry created -----|
```

#### Draft Flow

```
User                    Frontend                Backend
  |                        |                       |
  |-- Start Draft -------->|                       |
  |                        |-- start_draft ------>|
  |                        |   {entryId}           |
  |                        |                       |
  |                        |<-- draft_session_update |
  |                        |<-- draft_round_options  |
  |                        |                       |
  |-- Pick Coin ---------->|                       |
  |                        |-- make_draft_pick -->|
  |                        |   {entryId,round,coinId}
  |                        |                       |
  |                        |<-- draft_pick_confirmed |
  |                        |                       |
  | (Repeat 6 rounds)      |                       |
  |                        |                       |
  |                        |<-- draft_completed ---|
```

**Draft Rules:**
- 6 picks total
- 3 options per round (random from memecoin pool)
- 60 seconds per pick

**Powerups (1 each):**
- **Swap**: Replace a pick with new options
- **Boost**: 1.5x multiplier on pick's score
- **Freeze**: Lock in current % change

### 5.5 Spectator Betting

#### Flow

```
User                    Frontend                Backend
  |                        |                       |
  |                        |-- subscribe_live_battles ->|
  |                        |<-- live_battles ------|
  |                        |                       |
  |-- Select Battle ------>|                       |
  |                        |-- spectate_battle -->|
  |                        |<-- spectator_battle_update |
  |                        |<-- odds_update ------|
  |                        |                       |
  |-- Place Bet ---------->|                       |
  |                        |-- request_odds_lock ->|
  |                        |   {battleId,player,amt,wallet}
  |                        |                       |
  |                        |<-- odds_lock ---------|
  |                        |   {lockId,lockedOdds,expires}
  |                        |                       |
  |-- On-chain TX -------->|                       |
  |                        |                       |
  |                        |-- verify_bet -------->|
  |                        |   {lockId,txSignature,wallet}
  |                        |                       |
  |                        |<-- bet_verified -----|
```

**Odds Locking:**
- Lock duration: 30 seconds
- Prevents odds slippage during on-chain transaction
- If expired, must request new lock

### 5.6 Battle Arena

#### Entry Flow (Matchmaking)

```
User                    Frontend                Backend
  |                        |                       |
  |-- Configure Battle --->|                       |
  |   (fee, duration)      |                       |
  |                        |                       |
  |-- Queue for Match ---->|                       |
  |                        |-- queue_matchmaking ->|
  |                        |   {config, wallet}    |
  |                        |                       |
  |                        |<-- matchmaking_status |
  |                        |                       |
  |                        |<-- match_found ------|
  |                        |   {battleId,opponent,config}
  |                        |                       |
  |-- Accept Match ------->|                       |
  |                        |-- accept_match ----->|
  |                        |                       |
  |                        |<-- ready_check_update |
  |                        |                       |
  |                        |<-- battle_started ---|
```

#### Trading Flow

```
User                    Frontend                Backend
  |                        |                       |
  |-- Open Position ------>|                       |
  |                        |-- open_position_signed ->|
  |                        |   {message,signature,wallet}
  |                        |                       |
  |                        |<-- position_opened --|
  |                        |                       |
  |                        |<-- battle_update ----|
  |                        |                       |
  |-- Close Position ----->|                       |
  |                        |-- close_position_signed ->|
  |                        |                       |
  |                        |<-- position_closed --|
```

**Signed Trade Format:**
```typescript
interface SignedTradeMessage {
  version: 1;
  battleId: string;
  action: 'open' | 'close';
  asset: string;
  side: 'long' | 'short';
  leverage: 2 | 5 | 10 | 20;
  size: number;
  timestamp: number;
  nonce: number;
  positionId?: string;
}
```

#### Settlement Flow

```
Backend                     On-Chain              Users
   |                            |                    |
   |-- Battle ends ------------>|                    |
   |-- Calculate winner --------|                    |
   |                            |                    |
   |-- settle_battle() -------->|                    |
   |   (onChainBattleId,        |                    |
   |    winnerId, isCreator)    |                    |
   |                            |                    |
   |<-- txSignature ------------|                    |
   |                            |                    |
   |-- battle_settled -------------------------------->|
```

---

## 6. Database Tables

### PostgreSQL Tables

#### `user_profiles`

User profile information.

| Column | Type | Description |
|--------|------|-------------|
| wallet_address | TEXT PK | Solana wallet address |
| username | TEXT | Display username |
| pfp_type | TEXT | 'preset', 'nft', 'default' |
| preset_id | TEXT | Preset avatar ID |
| nft_mint | TEXT | NFT mint address |
| nft_image_url | TEXT | NFT image URL |
| created_at | BIGINT | Creation timestamp |
| updated_at | BIGINT | Last update timestamp |

### SQLite Tables (In-Memory/File)

#### User Stats (`userStatsDatabase.ts`)

- User wager history
- Win/loss stats
- Profit/loss tracking
- Leaderboard data

#### Notifications (`notificationDatabase.ts`)

- User notifications
- Read/unread status
- Notification types

#### Achievements (`achievementDatabase.ts`)

- Achievement definitions
- User progress
- Unlock tracking

#### Progression (`progressionDatabase.ts`)

- User XP and levels
- Available perks
- Cosmetics unlocked
- Free bet balances
- Rake rebates
- Streak tracking

#### Waitlist (`waitlistDatabase.ts`)

- Email registrations
- Referral codes
- Position tracking
- Tier assignments

#### Shares (`sharesDatabase.ts`)

- Share events tracked
- XP awards for sharing
- Cooldown tracking

#### Challenges (`challengesDatabase.ts`)

- Battle challenges
- Challenge codes
- Accept/expire status

#### Draft (`draftDatabase.ts`)

- Tournaments
- Entries
- Picks
- Memecoin data

#### LDS (`ldsDatabase.ts`)

- Games
- Players
- Rounds
- Predictions
- Leaderboard

#### Token Wars (`tokenWarsDatabase.ts`)

- Battles
- Bets
- Player stats
- Leaderboard

#### Balance (`balanceDatabase.ts`)

- Pending transactions
- Game mode locks
- Payouts and refunds

#### Spectator Bets (`spectatorBetDatabase.ts`)

- Battle bets
- Odds history
- Settlement records

#### Failed Payouts (`failedPayoutsDatabase.ts`)

- Retry queue
- Recovery tracking

---

## 7. External Services

### 7.1 CoinMarketCap

**Purpose:** Primary price data source

**API:** `https://pro-api.coinmarketcap.com/v1`

**Endpoints Used:**
- `/cryptocurrency/quotes/latest` - Current prices
- `/cryptocurrency/listings/latest` - Memecoin listings

**Authentication:** API key via `CMC_API_KEY` env var

**Rate Limits:**
- Pro tier: 10,000 calls/day
- Backend fetches: Every 30 seconds for prices, 5 minutes for memecoins

### 7.2 Pyth Network

**Purpose:** Oracle price verification

**API:** `https://hermes.pyth.network`

**Endpoints:**
- `/api/latest_price_feeds` - Current prices

**On-Chain Price Accounts:**
```
SOL: H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG
BTC: GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU
ETH: JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB
WIF: 6B23K3tkb51vLZA14jcEQVCA1pfHptzEHFA93V5dYwbT
BONK: 8ihFLu5FimgTQ1Unh4dVyEHUGodJ5gJQCrQf4KUVB9bN
```

**Usage:**
- Audit trail for game settlements
- Discrepancy detection (> 1% difference flagged)

### 7.3 Solana RPC

**Purpose:** Blockchain interactions

**Configuration:** `SOLANA_RPC_URL` env var

**Default:** `https://api.devnet.solana.com` (dev) / mainnet for production

**Used For:**
- PDA balance queries
- On-chain settlements
- Transaction verification

### 7.4 Helius

**Purpose:** NFT data fetching

**API:** `https://mainnet.helius-rpc.com`

**Authentication:** `HELIUS_API_KEY` env var

**Endpoint:**
- `getAssetsByOwner` - Fetch wallet NFTs

**Usage:**
- Profile picture selection from owned NFTs
- NFT metadata and images

### 7.5 Anchor Program

**Program ID:** `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`

**PDAs:**
- `balance` - User balance accounts
- `vault` - User vault accounts
- `global_vault` - Game pool vault
- `game` - Game state
- `round` - Prediction rounds
- `pool` - Round pools

**Instructions:**
- `initializeGame` - Setup game state
- `startRound` - Create prediction round
- `lockRound` - Lock betting
- `settleRound` - Resolve round
- `closeRound` - Cleanup round account
- `transferToGlobalVault` - Lock user funds
- `transferFromGlobalVault` - Pay winners

---

## Environment Variables Summary

### Required in Production

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing key |
| `DATABASE_URL` | PostgreSQL connection |
| `CMC_API_KEY` | CoinMarketCap API |
| `SOLANA_RPC_URL` | Solana RPC endpoint |

### Service Keys

| Variable | Purpose |
|----------|---------|
| `SESSION_BETTING_AUTHORITY_PRIVATE_KEY` | On-chain operations |
| `ESCROW_WALLET_PRIVATE_KEY` | Free bet escrow |
| `REBATE_WALLET_PRIVATE_KEY` | Rake rebates |
| `BATTLE_AUTHORITY_PRIVATE_KEY` | Battle settlements |
| `HELIUS_API_KEY` | NFT fetching |

### Optional Configuration

| Variable | Purpose |
|----------|---------|
| `ADMIN_WALLETS` | Admin wallet list (comma-separated) |
| `REQUIRE_WALLET_SIGNATURES` | Enforce signature auth |
| `NODE_ENV` | Environment mode |
| `PORT` | Server port (default 3001) |
| `DISABLE_SIMULATOR` | Disable battle simulator |

---

*Last updated: January 2026*
