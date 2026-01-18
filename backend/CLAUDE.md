# DegenDome Backend - Claude Code Context

## Overview

Node.js + Express + Socket.IO server that powers all game modes. Handles real-time game state, price feeds, and communicates with the Solana blockchain.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: SQLite (better-sqlite3)
- **Language**: TypeScript
- **Package Manager**: npm

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (localhost:3001)
npm run build     # Compile TypeScript
npm run typecheck # Type checking only
```

## Directory Structure

```
backend/
├── src/
│   ├── index.ts                  # Express + Socket.IO server entry
│   ├── types.ts                  # All TypeScript types
│   ├── config.ts                 # Server configuration
│   ├── tokens.ts                 # Whitelisted trading tokens
│   │
│   ├── services/                 # Business logic
│   │   ├── battleManager.ts              # 1v1 battle logic
│   │   ├── predictionServiceOnChain.ts   # Oracle round management
│   │   ├── onChainRoundManager.ts        # On-chain round lifecycle
│   │   ├── spectatorService.ts           # Spectator wagering
│   │   ├── draftTournamentManager.ts     # Draft tournaments
│   │   ├── balanceService.ts             # PDA balance verification
│   │   ├── priceService.ts               # Jupiter price feeds
│   │   ├── progressionService.ts         # XP, levels, perks
│   │   ├── ldsManager.ts                 # Last Degen Standing
│   │   └── tokenWarsManager.ts           # Token Wars
│   │
│   ├── db/                       # Database operations
│   │   ├── progressionDatabase.ts
│   │   ├── balanceDatabase.ts
│   │   └── draftDatabase.ts
│   │
│   └── middleware/
│       └── socketRateLimiter.ts  # Rate limiting
│
├── data/                         # SQLite database files
└── package.json
```

## Key Services

### battleManager.ts
Handles 1v1 trading battles: matchmaking, position management, P&L calculation, settlement.

### predictionServiceOnChain.ts
Oracle prediction game: 30-second rounds, start/lock/settle with Pyth prices.

### balanceService.ts
Verifies user's on-chain PDA balance before allowing wagers.

### priceService.ts
Fetches real-time prices from Jupiter API for all supported tokens.

### progressionService.ts
Manages XP, levels, titles, perks, streaks, and cosmetics.

## WebSocket Events

### Server → Client
| Event | Description |
|-------|-------------|
| `battle_update` | Battle state changed |
| `prediction_round` | New Oracle round |
| `prediction_settled` | Round result |
| `price_update` | New prices |
| `progression_update` | XP/level changes |
| `odds_update` | Spectator odds |

### Client → Server
| Event | Description |
|-------|-------------|
| `register_wallet` | Register for notifications |
| `queue_matchmaking` | Enter battle queue |
| `open_position` | Open leveraged position |
| `place_prediction_bet` | Place Oracle bet |
| `spectate_battle` | Watch a battle |

## Environment Variables

```bash
# Required
SOLANA_RPC_URL=https://api.devnet.solana.com
SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<base58 private key>

# Optional
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_PATH=./data/progression.db
REQUIRE_WALLET_SIGNATURES=true
```

## API Endpoints

```
GET  /api/health              # Health check
GET  /api/prices              # Current token prices
GET  /api/battles             # Active battles
GET  /api/battles/:id         # Battle details
GET  /api/progression/:wallet # User progression
GET  /api/leaderboard         # Top users
```

## On-Chain Integration

The backend acts as the authority for the Session Betting program:
- Calls `start_round` with Pyth price at round start
- Calls `lock_round` at 25s mark
- Calls `settle_round` at 30s with final price
- Calls `credit_winnings` to pay out winners
- Calls `close_round` after 1-hour grace period

## Important Patterns

### Balance Verification
Always check on-chain PDA balance before accepting wagers:
```typescript
const balance = await balanceService.getOnChainBalance(wallet);
if (balance < wagerAmount) throw new Error('Insufficient balance');
```

### Rate Limiting
Use `checkSocketRateLimit()` for all user-initiated events:
```typescript
const rateCheck = checkSocketRateLimit(socket.id, wallet, 'action', limit);
if (!rateCheck.allowed) return socket.emit('error', rateCheck.error);
```

### Reentrancy Protection
Update state before making external calls:
```typescript
user.balance -= amount;  // State update first
await onChainTransfer(); // External call after
```
