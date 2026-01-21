# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** Event-driven, service-oriented architecture with three independent subsystems communicating via WebSocket and blockchain transactions. Backend acts as central game state coordinator and oracle authority.

**Key Characteristics:**
- Multi-subsystem design: Web (Next.js) → Backend (Node.js) → Blockchain (Solana)
- Real-time game state via WebSocket (Socket.IO)
- On-chain settlement for fund security (PDA balance system)
- Off-chain game logic for speed (prediction, battles, tournaments)
- Service-based business logic with repository pattern for data

## Layers

**Frontend Layer:**
- Purpose: User interface, wallet integration, real-time rendering
- Location: `web/src/`
- Contains: Next.js pages, React components, custom hooks, contexts
- Depends on: Socket.IO events, Solana program client, wallet adapter
- Used by: Browser clients

**Backend Service Layer:**
- Purpose: Game logic orchestration, price feeds, matchmaking, settlement
- Location: `backend/src/services/`
- Contains: Service classes (BattleManager, PredictionService, DraftTournamentManager, etc.)
- Depends on: Price feeds (Jupiter, CoinMarketCap, Pyth), SQLite database, Solana RPC
- Used by: Frontend via WebSocket, scheduled jobs

**Data Persistence Layer:**
- Purpose: Store game history, user progression, tournament state
- Location: `backend/src/db/`
- Contains: SQLite database operations (progressionDatabase.ts, draftDatabase.ts, balanceDatabase.ts, etc.)
- Depends on: better-sqlite3
- Used by: Service layer

**Blockchain Layer:**
- Purpose: Fund custody, fund locking, oracle settlement
- Location: `programs/session_betting/`
- Contains: Anchor smart contract (Rust)
- Depends on: Solana runtime, Pyth oracle
- Used by: Backend (via RPC calls), Web (via program client)

**Middleware/Security Layer:**
- Purpose: Authentication, rate limiting, request validation
- Location: `backend/src/middleware/`
- Contains: Auth middleware, socket rate limiter, HTTP rate limiter
- Depends on: JWT, request context
- Used by: Express routes and WebSocket handlers

## Data Flow

**Oracle Round Flow (30-second prediction game):**

1. Backend starts new round → calls `startRound` on-chain with Pyth price
2. Frontend subscribes to `subscribe_prediction` → receives `prediction_round` event
3. User places bet → frontend emits `place_prediction_bet` with signature
4. Backend validates balance on-chain → calls `transferToGlobalVault` (fund locks immediately)
5. At 25s: Backend calls `lockRound` → no more bets accepted
6. At 30s: Backend calls `settleRound` → determines winner (UP/DOWN/PUSH)
7. Backend calls `creditWinnings` → winners paid from global vault
8. Frontend receives `prediction_settled` → displays results and payouts

**Battle Flow (1v1 leveraged trading):**

1. User queues matchmaking → enters pool in `matchmakingQueue`
2. Backend matches 2 players → emits `match_found` with ready check
3. Both players accept (or timeout) → battle starts with `active` status
4. Users open/close positions → real-time P&L calculated in memory
5. Battle ends (30-60 min) → settlement calculates rake and winner
6. Backend credits winner → updates progression XP
7. Frontend shows results → user claims winnings

**Draft Tournament Flow:**

1. User enters tournament → stored in `draftDatabase.ts`
2. Draft phase: Backend presents 5 random memecoins → user picks 1
3. 6 picks completed → portfolio tracked throughout week
4. Weekly: Coin prices fetched → scores calculated
5. Rankings finalized → payouts distributed
6. Results stored in database for history

**State Management:**

- **In-Memory (Fast):** Battle positions, round timers, matchmaking queue
- **Database (Persistent):** User progression, battle history, draft entries, tournament results
- **On-Chain (Custody):** PDA balances, fund locks, round escrow accounts
- **Real-Time Sync:** WebSocket events broadcast state changes to connected clients

## Key Abstractions

**Service Pattern:**
- Purpose: Encapsulate game logic, manage state, emit events
- Examples: `battleManager.ts`, `predictionService.ts`, `draftTournamentManager.ts`, `ldsManager.ts`, `tokenWarsManager.ts`
- Pattern: Singleton class with private state Maps, event listener registration

**Database Pattern:**
- Purpose: Provide typed data access with consistency
- Examples: `progressionDatabase.ts`, `draftDatabase.ts`, `achievementDatabase.ts`, `userStatsDatabase.ts`
- Pattern: Module exports (no classes), SQLite operations with prepared statements

**Hook Pattern (Frontend):**
- Purpose: Encapsulate game interactions and WebSocket subscriptions
- Examples: `useSessionBetting.ts`, `usePrediction.ts`, `useBattle.ts`, `usePrices.ts`
- Pattern: React hooks with side effects, state management, Socket.IO listeners

**Context Pattern (Frontend):**
- Purpose: Global state across app (wallet, theme, progression, sound)
- Examples: `BattleContext.tsx`, `ProgressionContext.tsx`, `ProfileContext.tsx`, `SoundContext.tsx`
- Pattern: React Context + useContext, provider pattern, useState for mutations

## Entry Points

**Backend Entry:**
- Location: `backend/src/index.ts`
- Triggers: `npm run dev` or Node process start
- Responsibilities: Express server setup, Socket.IO initialization, service startup, route registration

**Frontend Entry:**
- Location: `web/src/app/page.tsx` (home), `web/src/app/layout.tsx` (root)
- Triggers: Browser navigation
- Responsibilities: Layout setup, wallet provider, theme provider, navigation

**Game Mode Entry Points:**
- Oracle: `web/src/app/predict/page.tsx` → uses `usePrediction.ts`, subscribes to prediction events
- Battle: `web/src/app/battle/page.tsx` → uses `useBattle.ts`, `useSessionBetting.ts`
- Draft: `web/src/app/draft/page.tsx` → uses draft manager, tournament state
- Spectate: `web/src/app/spectate/page.tsx` → watches live battles, places spectator bets
- LDS: `web/src/app/lds/page.tsx` → Last Degen Standing game
- Token Wars: `web/src/app/token-wars/page.tsx` → Token performance battles

**Smart Contract Entry:**
- Location: `programs/session_betting/programs/session_betting/src/lib.rs`
- Triggers: Backend calls via Anchor client
- Responsibilities: PDA balance management, fund custody, round settlement, oracle verification

## Error Handling

**Strategy:** Multi-layer error handling with user-facing messages and internal logging

**Patterns:**

- **Balance Verification:** All wagers checked against on-chain PDA balance before acceptance
  - File: `backend/src/services/balanceService.ts`
  - Fails transaction if insufficient balance

- **Signature Validation:** Trade signatures verified for authenticity and replay protection
  - Files: `backend/src/utils/signatureVerification.ts`, `backend/src/services/battleManager.ts` (line ~95)
  - Prevents double-spending and unauthorized trades

- **Rate Limiting:** Socket and HTTP requests limited per wallet/IP
  - Files: `backend/src/middleware/rateLimiter.ts`, `backend/src/middleware/socketRateLimiter.ts`
  - Returns rate-limit-exceeded error to client

- **State Consistency:** Reentrancy protection by updating state before external calls
  - File: `backend/src/services/battleManager.ts`
  - Example: mark signature used before processing position changes

- **Database Transactions:** SQLite operations use transactions for atomicity
  - File: `backend/src/db/progressionDatabase.ts`
  - Rolls back on error to prevent corruption

## Cross-Cutting Concerns

**Logging:** Console.log scattered throughout services; no centralized logger
- Missing: Structured logging, log levels, log aggregation
- Files: `backend/src/services/*.ts` contain console.log calls

**Validation:**
- Frontend: React form validation, amount bounds checking
- Backend: Signature verification, balance validation, bet amount validation
- On-Chain: Program constraints (minimum bet, valid pools, etc.)
- Files: `backend/src/middleware/auth.ts`, `backend/src/utils/signatureVerification.ts`

**Authentication:**
- JWT tokens for REST endpoints (used in admin routes)
- Wallet signatures for sensitive operations (bets, transfers)
- Session keys on-chain (can bet but cannot withdraw)
- Files: `backend/src/middleware/auth.ts`, `backend/src/utils/jwt.ts`, `web/src/hooks/useSessionBetting.ts`

**Authorization:**
- Role-based: admin, user
- Wallet ownership: can only see own data
- Entry ownership: can only modify own tournament entries
- Files: `backend/src/middleware/auth.ts` (requireAdmin, requireOwnWallet, requireEntryOwnership)

**Progression & XP:**
- Earned from all game modes
- Streaks tracked for bonus multipliers
- Perks unlock at level milestones (rake discounts, free bets)
- File: `backend/src/services/progressionService.ts`, `backend/src/db/progressionDatabase.ts`

**Rake & Fees:**
- 5% platform fee on all winning pools
- Rake rebates available via perks (level-based discounts)
- Free bets earned at level milestones
- Files: `backend/src/services/rakeRebateService.ts`, `backend/src/db/progressionDatabase.ts`

---

*Architecture analysis: 2026-01-21*
