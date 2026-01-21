# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
sol-battles/
├── web/                          # Next.js 16 frontend (pnpm)
│   ├── src/
│   │   ├── app/                  # App Router pages (game modes)
│   │   │   ├── page.tsx          # Homepage
│   │   │   ├── predict/          # Oracle predictions (main)
│   │   │   ├── battle/           # 1v1 leveraged battles
│   │   │   ├── draft/            # Memecoin draft tournaments
│   │   │   ├── spectate/         # Watch & bet on battles
│   │   │   ├── lds/              # Last Degen Standing
│   │   │   ├── token-wars/       # Token performance battles
│   │   │   ├── leaderboard/      # Player rankings
│   │   │   ├── progression/      # XP, levels, perks
│   │   │   ├── profile/          # User profiles
│   │   │   ├── docs/             # Documentation pages
│   │   │   └── admin/            # Admin dashboard
│   │   ├── components/           # React components (by feature)
│   │   │   ├── battle/           # Battle-specific UI
│   │   │   ├── prediction/       # Oracle-specific UI
│   │   │   ├── progression/      # Progression display
│   │   │   ├── admin/            # Admin tools
│   │   │   ├── home/             # Homepage sections
│   │   │   └── ui/               # Shared UI primitives
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useSessionBetting.ts  # Balance & session mgmt
│   │   │   ├── usePrediction.ts      # Oracle game
│   │   │   ├── useBattle.ts          # Battle game
│   │   │   ├── usePrices.ts          # Real-time prices
│   │   │   └── ... (more game-specific)
│   │   ├── contexts/             # React Contexts
│   │   │   ├── BattleContext.tsx
│   │   │   ├── ProgressionContext.tsx
│   │   │   ├── ProfileContext.tsx
│   │   │   └── ... (more contexts)
│   │   ├── lib/                  # Utilities
│   │   │   ├── socket.ts         # Socket.IO singleton
│   │   │   └── session-betting/  # Solana program client
│   │   ├── config/               # Configuration
│   │   │   ├── whitelist.ts      # Early access wallets
│   │   │   ├── tokenLogos.ts     # Token image mappings
│   │   │   └── api.ts            # API endpoints
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts          # Shared types
│   │   └── middleware.ts         # Next.js middleware
│   ├── tsconfig.json             # TypeScript config
│   ├── next.config.js
│   └── package.json
│
├── backend/                      # Node.js + Express server (npm)
│   ├── src/
│   │   ├── index.ts              # Express + Socket.IO server entry
│   │   ├── types.ts              # All TypeScript interfaces
│   │   ├── config.ts             # Server configuration
│   │   ├── tokens.ts             # Whitelisted trading tokens
│   │   ├── services/             # Game logic services
│   │   │   ├── battleManager.ts            # 1v1 battles
│   │   │   ├── predictionService.ts        # Oracle (off-chain)
│   │   │   ├── predictionServiceOnChain.ts # Oracle (on-chain)
│   │   │   ├── draftTournamentManager.ts   # Draft tournaments
│   │   │   ├── spectatorService.ts         # Spectator wagering
│   │   │   ├── ldsManager.ts               # Last Degen Standing
│   │   │   ├── tokenWarsManager.ts         # Token Wars
│   │   │   ├── progressionService.ts       # XP, levels, perks
│   │   │   ├── balanceService.ts           # PDA balance checks
│   │   │   ├── priceService.ts             # Jupiter API prices
│   │   │   ├── pythVerificationService.ts  # Pyth oracle validation
│   │   │   ├── rakeRebateService.ts        # Fee rebates
│   │   │   ├── referralService.ts          # Referral tracking
│   │   │   ├── battleSettlementService.ts  # Battle payouts
│   │   │   ├── freeBetEscrowService.ts     # Free bet handling
│   │   │   ├── chatService.ts              # Battle chat
│   │   │   ├── coinMarketCapService.ts     # CMC price feed
│   │   │   └── adminService.ts             # Admin functions
│   │   ├── db/                   # Data persistence
│   │   │   ├── database.ts            # Profiles (main DB)
│   │   │   ├── progressionDatabase.ts  # XP, levels, perks
│   │   │   ├── draftDatabase.ts        # Draft tournaments
│   │   │   ├── balanceDatabase.ts      # Pending transactions
│   │   │   ├── userStatsDatabase.ts    # Win/loss records
│   │   │   ├── achievementDatabase.ts  # Achievements
│   │   │   ├── challengesDatabase.ts   # Battle challenges
│   │   │   ├── notificationDatabase.ts # Notifications
│   │   │   ├── referralDatabase.ts     # Referrals
│   │   │   ├── sharesDatabase.ts       # Share trading
│   │   │   ├── spectatorBetDatabase.ts # Spectator bets
│   │   │   ├── tokenWarsDatabase.ts    # Token Wars history
│   │   │   ├── ldsDatabase.ts          # LDS matches
│   │   │   ├── waitlistDatabase.ts     # Waitlist
│   │   │   ├── failedPayoutsDatabase.ts # Payout tracking
│   │   │   ├── authDatabase.ts         # Auth tokens
│   │   │   └── challengesDatabase.ts   # Challenge tracking
│   │   ├── middleware/           # Express & Socket.IO middleware
│   │   │   ├── auth.ts          # JWT & signature verification
│   │   │   ├── rateLimiter.ts   # HTTP rate limiting
│   │   │   └── socketRateLimiter.ts # Socket.IO rate limiting
│   │   ├── routes/              # Express routes
│   │   │   └── admin.ts         # Admin endpoints
│   │   └── utils/               # Utility functions
│   │       ├── jwt.ts           # JWT token creation/verification
│   │       ├── signatureVerification.ts # Wallet sig validation
│   │       ├── replayCache.ts   # Signature replay detection
│   │       └── disposableEmails.ts # Email validation
│   ├── data/                    # SQLite database files
│   │   └── progression.db       # Main database file
│   ├── tsconfig.json
│   └── package.json
│
├── programs/                     # Solana smart contracts
│   ├── session_betting/          # Main program (Anchor)
│   │   ├── programs/session_betting/src/
│   │   │   └── lib.rs          # PDA balances, sessions, oracle rounds
│   │   ├── tests/              # Anchor tests
│   │   ├── Anchor.toml          # Anchor config
│   │   └── Cargo.toml           # Rust dependencies
│   ├── prediction_program/       # Legacy oracle program (deprecated)
│   ├── battle_program/           # Legacy battle program (deprecated)
│   └── draft_program/            # Legacy draft program (deprecated)
│
├── test-ledger/                  # Local Solana test validator
│
├── docs/                         # Documentation
│   └── generated/                # Auto-generated docs
│
├── scripts/                      # Development scripts
│
├── .planning/                    # GSD planning documents
│   └── codebase/                 # This directory
│
├── CLAUDE.md                     # Claude context (auto-loaded)
├── PRODUCT.md                    # Product overview
├── README.md                     # Technical documentation
├── CLAUDE_PROJECT_CONTEXT.md     # Comprehensive context
├── CLAUDE_TYPES_REFERENCE.md     # TypeScript types reference
└── package.json                  # Root-level config
```

## Directory Purposes

**web/src/app/**
- Purpose: Next.js pages for each game mode and utility pages
- Contains: Server/client components, route handlers
- Key files: `predict/page.tsx`, `battle/page.tsx`, `draft/page.tsx`, `spectate/page.tsx`

**web/src/components/**
- Purpose: Reusable React components organized by feature
- Contains: Game UI, shared UI primitives, modals, cards
- Key files: `BattleArena.tsx`, `BattleLobby.tsx`, `BettingPanel.tsx`, `WalletBalance.tsx`

**web/src/hooks/**
- Purpose: Custom React hooks encapsulating game logic and Socket.IO subscriptions
- Contains: Game interaction hooks, WebSocket listeners, state management
- Key files: `useSessionBetting.ts` (core balance hook), `usePrediction.ts`, `useBattle.ts`, `usePrices.ts`

**web/src/contexts/**
- Purpose: React Contexts for global state shared across app
- Contains: Wallet context, theme, progression, battle state, profile
- Key files: `BattleContext.tsx`, `ProgressionContext.tsx`, `ProfileContext.tsx`

**backend/src/services/**
- Purpose: Business logic, game state management, external API calls
- Contains: Singleton service classes with event listeners
- Key files: `battleManager.ts`, `predictionService.ts`, `progressionService.ts`, `draftTournamentManager.ts`

**backend/src/db/**
- Purpose: Data persistence, SQLite operations
- Contains: CRUD operations, queries, schema definitions
- Key files: `progressionDatabase.ts`, `draftDatabase.ts`, `userStatsDatabase.ts`

**backend/src/middleware/**
- Purpose: Request validation, security, rate limiting
- Contains: Auth middleware, rate limiters, signature verification
- Key files: `auth.ts`, `rateLimiter.ts`, `socketRateLimiter.ts`

**programs/session_betting/**
- Purpose: Solana smart contract for PDA balances and oracle settlement
- Contains: Anchor program instructions, PDAs, error handling
- Key file: `programs/session_betting/src/lib.rs`

## Key File Locations

**Entry Points:**
- Backend: `backend/src/index.ts` - Express + Socket.IO server startup
- Frontend (home): `web/src/app/page.tsx` - Homepage with live stats
- Frontend (root): `web/src/app/layout.tsx` - Root layout with providers

**Configuration:**
- Backend: `backend/src/config.ts` - CORS, Socket.IO, server settings
- Backend: `backend/src/tokens.ts` - Whitelisted trading tokens
- Frontend: `web/src/config/whitelist.ts` - Early access wallet list
- Frontend: `web/src/config/api.ts` - API endpoint configuration

**Core Logic:**
- Battles: `backend/src/services/battleManager.ts` - 1v1 battle logic, matchmaking, P&L calculation
- Oracle: `backend/src/services/predictionService.ts` - 30-second prediction rounds
- Draft: `backend/src/services/draftTournamentManager.ts` - Tournament management, scoring
- Progression: `backend/src/services/progressionService.ts` - XP, levels, perks, streaks

**Testing:**
- Backend tests: `backend/tests/` (if present)
- Frontend tests: `web/src/**/*.test.ts` (Jest configured)

**Database:**
- Main: `backend/data/progression.db` - SQLite database file (generated at runtime)
- Progression schema: `backend/src/db/progressionDatabase.ts` - Tables: xp_history, user_perks, user_cosmetics, streaks

## Naming Conventions

**Files:**
- Components: `PascalCase` (e.g., `BattleArena.tsx`, `WalletBalance.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `usePrediction.ts`, `useBattle.ts`)
- Utilities: `camelCase` (e.g., `signatureVerification.ts`, `priceService.ts`)
- Services: `camelCase` with `Service` or `Manager` suffix (e.g., `battleManager.ts`, `progressionService.ts`)
- Database: `camelCase` with `Database` suffix (e.g., `progressionDatabase.ts`, `draftDatabase.ts`)

**Directories:**
- Feature-based: `battle/`, `prediction/`, `draft/`, `spectate/`
- Function-based: `services/`, `db/`, `middleware/`, `hooks/`, `contexts/`, `components/`
- Always lowercase

**Variables & Functions:**
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `ROUND_DURATION = 30`, `LAMPORTS_PER_SOL = 1_000_000_000`)
- Functions: `camelCase` (e.g., `startRound()`, `placeBet()`)
- Types: `PascalCase` (e.g., `PredictionRound`, `BattlePlayer`, `UserProgression`)

## Where to Add New Code

**New Game Mode:**
1. Frontend page: `web/src/app/{game-name}/page.tsx`
2. Components: `web/src/components/{game-name}/` (create directory)
3. Hook: `web/src/hooks/use{GameName}.ts`
4. Backend service: `backend/src/services/{gameName}Manager.ts` or `{gameName}Service.ts`
5. Database module: `backend/src/db/{gameName}Database.ts` (if needed)
6. Types: Add to `backend/src/types.ts`
7. WebSocket events: Add to `ServerToClientEvents` and `ClientToServerEvents` in `backend/src/types.ts`

**New Feature (within existing game):**
- Logic: `backend/src/services/` (add method to existing service)
- Database: `backend/src/db/` (add function to existing database module)
- Frontend: `web/src/components/` (add component to feature directory)
- Hook: `web/src/hooks/` (create new or extend existing)

**New Utility:**
- Shared between subsystems: `backend/src/utils/{name}.ts`
- Frontend-only: `web/src/lib/{name}.ts`
- Backend-only: `backend/src/utils/{name}.ts`

**New Database Table:**
1. Create new file: `backend/src/db/{featureName}Database.ts`
2. Export CRUD functions
3. Call from service layer
4. Example: `backend/src/db/progressionDatabase.ts` - tables: xp_history, user_perks, user_cosmetics, streaks

**New Middleware/Security Feature:**
- Validation: `backend/src/middleware/` (create file like `rateLimiter.ts`)
- Utility: `backend/src/utils/` (like `signatureVerification.ts`)
- Use in: `backend/src/index.ts` (apply to routes/sockets)

## Special Directories

**build/dist directories:**
- `backend/dist/` - Compiled TypeScript (generated by `npm run build`)
- `web/.next/` - Next.js build output (generated by `pnpm build`)
- Status: Generated, committed: No

**node_modules:**
- Contains: External dependencies
- Status: Generated, committed: No
- Size: Large, excluded from version control

**test-ledger/:**
- Purpose: Local Solana test validator state (accounts, programs, history)
- Generated: Yes (by Solana CLI)
- Committed: No

**data/ (backend):**
- Purpose: SQLite database files
- Files: `progression.db`
- Generated: Yes (at runtime)
- Committed: No

**.next/ (frontend):**
- Purpose: Next.js build artifacts, type definitions
- Generated: Yes (by Next.js)
- Committed: No

**logs/ & handoff/:**
- Purpose: Development artifacts, build outputs from agents
- Generated: Yes (during development/deployment)
- Committed: No (mostly)

---

*Structure analysis: 2026-01-21*
