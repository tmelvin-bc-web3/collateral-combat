# DegenDome - Complete Project Context

> **Purpose**: This document provides comprehensive context for Claude to effectively work on the DegenDome project. Upload this to your Claude Project for full codebase awareness.

---

## Project Overview

**DegenDome** (also known as "Collateral Combat" / "Sol Battles") is a Solana-based Web3 gaming and prediction platform. Users compete in skill-based games, betting on crypto price movements, PvP trading battles, and fantasy-style memecoin drafts.

- **Live Site**: https://degendome.xyz
- **Repository**: https://github.com/tmelvin-bc-web3/collateral-combat

---

## Tech Stack

### Frontend (`/web`)
| Technology | Usage |
|------------|-------|
| Next.js 16.1.1 | App Router, Server/Client Components |
| TypeScript | Strict mode enabled |
| Tailwind CSS | Custom theme (bg-primary, bg-secondary, text-accent) |
| Radix UI | Accessible component primitives |
| Socket.io-client | Real-time communication |
| Lightweight Charts | Price visualization |
| @solana/wallet-adapter-react | Wallet connection (Phantom, Solflare) |
| **Package Manager** | pnpm (`pnpm install`, `pnpm run dev`) |

### Backend (`/backend`)
| Technology | Usage |
|------------|-------|
| Node.js + TypeScript | Express.js server |
| SQLite (better-sqlite3) | Persistent database |
| Socket.io | Real-time events |
| **Package Manager** | npm |

### Blockchain (`/prediction_program`, `/battle_program`, `/draft_program`)
| Technology | Usage |
|------------|-------|
| Solana | Blockchain network |
| Anchor (Rust) | Smart contract framework |
| Pyth Network | On-chain price oracle |

---

## Directory Structure

```
sol-battles/
├── web/                          # Next.js frontend
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── predict/          # Oracle betting page (main feature)
│   │   │   ├── battle/           # PvP trading battles
│   │   │   ├── draft/            # Memecoin draft tournaments
│   │   │   ├── progression/      # Ranks, perks, XP display
│   │   │   ├── leaderboard/      # User rankings
│   │   │   ├── profile/          # User profiles
│   │   │   ├── spectate/         # Watch & bet on live battles
│   │   │   └── docs/             # Documentation pages
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Socket client, prediction client
│   │   ├── config/               # Whitelist, constants
│   │   └── types/                # TypeScript types
│   └── package.json
│
├── backend/                      # Node.js backend
│   ├── src/
│   │   ├── index.ts              # Express + Socket.io server
│   │   ├── types.ts              # TypeScript types (comprehensive)
│   │   ├── config.ts             # Server configuration
│   │   ├── tokens.ts             # Whitelisted trading tokens
│   │   ├── db/                   # Database operations
│   │   │   └── progressionDatabase.ts
│   │   ├── services/             # Business logic
│   │   │   ├── predictionService.ts      # Oracle game logic
│   │   │   ├── progressionService.ts     # XP, levels, perks
│   │   │   ├── battleManager.ts          # PvP battle logic
│   │   │   ├── priceService.ts           # Price feed handling
│   │   │   ├── draftTournamentManager.ts # Draft game logic
│   │   │   ├── spectatorService.ts       # Watch & bet logic
│   │   │   ├── freeBetEscrowService.ts   # Free bet handling
│   │   │   ├── rakeRebateService.ts      # Fee rebates
│   │   │   └── referralService.ts        # Referral system
│   │   └── middleware/
│   └── package.json
│
├── programs/
│   └── session_betting/          # Main Solana program (Anchor/Rust)
│       └── programs/session_betting/src/
│           └── lib.rs            # PDA balance, sessions, Oracle rounds
│
├── prediction_program/           # Legacy Oracle program
├── battle_program/               # Legacy Battle program
├── draft_program/                # Legacy Draft program
│
├── PRODUCT.md                    # Product overview
├── CONTEXT.md                    # Coding standards
├── ORACLE_TRUTH.md               # Oracle game specifications (CANONICAL)
├── MIGRATION_PLAN.md             # Task backlog
├── @AGENT.md                     # Build instructions
├── PROMPT.md                     # Agent development instructions
└── @fix_plan.md                  # Current priorities
```

---

## Game Modes

### 1. Oracle (UP or DOWN) - `/predict`
**Primary feature - Predict SOL price movement in 30 seconds**

| Setting | Value |
|---------|-------|
| Round Duration | 30 seconds |
| Betting Window | 25 seconds |
| Lock Period | 5 seconds (no betting) |
| Platform Fee | 5% rake on losing pool |
| Min Bet | 0.01 SOL (on-chain) / $5 (off-chain) |

**Key Files**:
- `web/src/app/predict/page.tsx` - Main UI
- `web/src/components/RealtimeChart.tsx` - Price chart
- `backend/src/services/predictionService.ts` - Round management
- `prediction_program/` - On-chain escrow & settlement

**Round Flow**:
```
0s ──────── 25s ──────── 30s ──────── 31s
   BETTING    │   LOCKED   │   SETTLE   │  NEXT ROUND
```

**Winner Determination**:
- `endPrice > startPrice` → LONG wins
- `endPrice < startPrice` → SHORT wins
- `endPrice == startPrice` → PUSH (refund)

**Early Bird Multiplier** (rewards early bets):
```
time_multiplier = 1 + (time_remaining / BETTING_WINDOW) × 0.5
```

### 2. Battle Arena - `/battle`
**1v1 Leveraged Trading Battles**

- Duration: 30-60 minutes
- Leverage: Up to 20x
- Assets: SOL, ETH, BTC, WIF, BONK
- Entry Tiers: 0.1 / 0.5 / 1 SOL
- Winner: Best P&L takes pot

### 3. Memecoin Draft - `/draft`
**Weekly Fantasy-Style Tournaments**

- Draft 6 memecoins from randomized options
- Portfolio performance over week determines ranking
- Entry Tiers: $5 / $25 / $100
- Power-ups: Swap, 2x Boost, Freeze

### 4. Watch & Bet - `/spectate`
**Spectate Live Battles & Bet on Outcomes**

- Live streaming with real-time P&L updates
- Dynamic odds update as battle progresses
- Social features: spectator count, chat

### 5. Last Degen Standing - `/lds`
**Battle Royale Elimination**

- Entry Fee: 0.1 SOL
- Predict SOL direction each round
- Wrong prediction = elimination
- Last player standing wins

### 6. Token Wars - `/token-wars`
**Head-to-Head Token Performance**

- Two tokens face off
- Bet on which performs better over 5 minutes
- Parimutuel odds

---

## Progression System

### XP & Levels
- 100 levels total
- ~25 XP per bet average
- Streak bonuses for consecutive days

### Ranks
`Rookie → Contender → Warrior → Veteran → Champion → Legend → Mythic`

### Perks (Rake Discounts)
| Level | Perk | Duration |
|-------|------|----------|
| 15 | 4.5%/9% rake discount | 50 bets |
| 25 | Better perks | 50 bets |
| 40 | 8%/4% rake discount | 50 bets |
| 75 | 7%/3.5% rake discount | 50 bets |
| 100 | PERMANENT 7%/3.5% | Forever |

### Free Bets
- Earned at level milestones (Level 5 first)
- Can be used in Oracle betting
- Platform-funded, wins paid from escrow

### Cosmetics
- Borders, profile effects
- Earned at milestone levels

**Key Files**:
- `backend/src/services/progressionService.ts` - All progression logic
- `backend/src/db/progressionDatabase.ts` - Database operations
- `web/src/app/progression/page.tsx` - UI display

---

## Smart Contract (Prediction Program)

**Program ID**: `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`

### Instructions
| Instruction | Purpose |
|-------------|---------|
| `initialize_game` | One-time setup, creates Round 0 |
| `place_bet` | Place UP or DOWN bet (min 0.01 SOL) |
| `crank` | Settle current round, start next (anyone can call) |
| `claim_winnings` | Winners claim their payout |
| `set_paused` | Emergency pause (authority only) |
| `withdraw_fees` | Withdraw platform fees (authority only) |

### Account Types (PDAs)
| Account | Seeds | Purpose |
|---------|-------|---------|
| `GameState` | `["game"]` | Global state, round counter |
| `PredictionRound` | `["round", round_id]` | Round data, pools, status |
| `PlayerPosition` | `["position", round_id, player]` | Individual bet |
| `Escrow` | `["escrow", round_id]` | Holds bet funds |

### Enums
```rust
BetSide: Up | Down
RoundStatus: Open | Settled
WinnerSide: None | Up | Down | Draw
```

### Error Codes
| Code | Name | Message |
|------|------|---------|
| 6000 | RoundNotOpen | Round is not open |
| 6001 | BettingClosed | Betting is closed for this round |
| 6002 | BetTooSmall | Bet amount below minimum (0.01 SOL) |
| 6003 | RoundNotEnded | Round has not ended yet |
| 6004 | RoundNotSettled | Round is not settled yet |
| 6005 | AlreadyClaimed | Winnings already claimed |
| 6006 | NotPositionOwner | Not the position owner |
| 6007 | NotAWinner | You did not win this round |
| 6013 | GamePaused | Game is paused |

---

## WebSocket Events

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `prediction_round` | `PredictionRound` | Round update (start, lock, settle) |
| `prediction_settled` | `PredictionRound` | Round settlement |
| `prediction_bet_placed` | `{ roundId, bet }` | New bet placed |
| `prediction_history` | `PredictionRound[]` | Historical rounds |
| `price_update` | `Record<string, number>` | Live prices |
| `progression_update` | `UserProgression` | XP/level changes |
| `xp_gained` | `XpGainEvent` | XP earned |
| `level_up` | `LevelUpResult` | Level milestone |

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe_prediction` | `asset` | Join asset room |
| `unsubscribe_prediction` | `asset` | Leave asset room |
| `place_prediction` | `{ asset, side, amount, wallet }` | Place bet |
| `subscribe_progression` | `walletAddress` | Subscribe to XP updates |

---

## Key TypeScript Types

```typescript
// Round status
type RoundStatus = 'betting' | 'locked' | 'settled';

// Prediction bet
interface PredictionBet {
  id: string;
  roundId: string;
  bettor: string;
  side: 'long' | 'short';
  amount: number;
  placedAt: number;
  status: 'pending' | 'won' | 'lost' | 'push';
  payout?: number;
}

// Prediction round
interface PredictionRound {
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
  winner?: 'long' | 'short' | 'push';
  totalPool: number;
}

// User progression
interface UserProgression {
  walletAddress: string;
  totalXp: number;
  currentLevel: number;
  xpToNextLevel: number;
  xpProgress: number;
  title: string;
}

// Perks
type ProgressionPerkType = 'rake_9' | 'rake_8' | 'rake_7' | 'oracle_4_5' | 'oracle_4' | 'oracle_3_5';
```

---

## Development Commands

### Frontend
```bash
cd web
pnpm install           # Install dependencies
pnpm run dev          # Start dev server (localhost:3000)
pnpm run build        # Production build
pnpm typecheck        # TypeScript check
vercel --prod --yes   # Deploy to production
```

### Backend
```bash
cd backend
npm install           # Install dependencies
npm run dev           # Start dev server (localhost:3002)
npm run typecheck     # TypeScript check
```

### Solana Programs
```bash
cd prediction_program
anchor build          # Build program
anchor deploy --provider.cluster devnet  # Deploy to devnet
```

---

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types - use proper typing
- Prefer interfaces over type aliases for objects

### Naming Conventions
- Components: `PascalCase` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase` (e.g., `formatDate.ts`)
- Constants: `SCREAMING_SNAKE_CASE`
- CSS classes: `kebab-case`

### React Patterns
- Functional components only
- Custom hooks for shared logic
- Server components by default (App Router)
- Client components with `'use client'` when needed

### Forbidden Patterns
- No `console.log` in production
- No hardcoded API URLs (use env vars)
- No direct DOM manipulation in React
- No modifications to `battle_program/` directory

---

## Environment Variables

### Frontend (`web/.env.local`)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

### Backend (`backend/.env`)
```
PORT=3002
FRONTEND_URL=http://localhost:3000
DATABASE_PATH=./data/progression.db
```

---

## API Endpoints

```
GET  /api/tokens              - List whitelisted tokens
GET  /api/prices              - Current token prices
GET  /api/battles             - Active battles
GET  /api/battles/:id         - Battle details
GET  /api/health              - Health check
GET  /api/progression/:wallet - User progression data
GET  /api/leaderboard         - Top users by XP
```

---

## Current Work Items

See `MIGRATION_PLAN.md` and `@fix_plan.md` for:
- Active tasks and priorities
- Completed features
- Known issues and blockers

### Priority Areas
1. **Oracle Finalization** - Backend persistence, smart contract alignment
2. **Mobile Responsiveness** - Mobile layouts without breaking desktop
3. **Profile Pages** - User stats, betting history, achievements
4. **Sound & Feedback** - Audio effects, haptics

---

## Important Notes

### Oracle UI Design Philosophy
- Mental model: "make a decision under pressure" (not "configure a trade")
- UI should feel DANGEROUS, not helpful
- Minimize information, force instinct
- ONE dominant focal point
- See → Decide → Click flow

### Wallet Integration
- Uses `@solana/wallet-adapter-react`
- Whitelist check in middleware/proxy
- Early access controlled via `web/src/config/whitelist.ts`

### Testing
- Frontend: `pnpm run build` must pass
- Backend: Run with `npm run dev`, check for errors
- Manual testing at `http://localhost:3000`
- Oracle page at `http://localhost:3000/predict`

---

## Contact

Built by **Tayler Melvin** (tayler.melvin@bitso.com)

---

*Trade PvP. Winner Takes All.*
