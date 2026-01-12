# Sol Battles - Product Requirements Document

## Overview

Sol Battles (DegenDome) is a Solana-based prediction gaming platform where users bet on cryptocurrency price movements. The core game mode is "Oracle" - a 30-second prediction game where users bet Long or Short on SOL price.

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Blockchain**: Solana, Anchor framework
- **Database**: JSON file-based (profiles.json), SQLite for stats

## Core Features (Implemented)

### Oracle Prediction Game
- Real-time SOL/USD price chart with 60-second visible history
- 30-second rounds: 25s betting + 5s locked
- Long/Short betting with dynamic odds based on pool sizes
- Early bird bonus: 20% max multiplier for early bets (linear decay)
- Lock price line visualization
- Progress border animation showing time remaining

### User System
- Wallet-based authentication (Phantom, Solflare, etc.)
- Profile with username and avatar (preset or NFT)
- Progression system with XP, levels, and perks
- Leaderboard rankings

### Smart Contract
- Program ID: `9fDpLYmAR1WtaVwSczxz1BZqQGiSRavT6kAMLSCAh1dF`
- Instructions: initialize_game, place_bet, crank, claim_winnings, set_paused, withdraw_fees
- Uses Pyth oracle for on-chain price feeds

## Constraints

### Oracle UI (LOCKED)
The Oracle UI has been finalized and must NOT be modified without explicit human approval. This includes:
- `/web/src/app/predict/page.tsx`
- `/web/src/components/RealtimeChart.tsx`
- Any visual changes to the prediction game interface

### Mobile Changes
Mobile layout changes must NOT alter desktop layout. Use responsive breakpoints (sm:, md:, lg:) only.

### Smart Contract Tasks
All smart contract modifications MUST use Solana MCP for building, testing, and deploying.

## Directory Structure

```
/backend           - Express server, Socket.io, services
/web               - Next.js frontend
/prediction_program - Solana/Anchor smart contract
```

## Key Files

- `backend/src/services/predictionService.ts` - Core Oracle logic
- `backend/src/db/database.ts` - Profile persistence
- `web/src/app/predict/page.tsx` - Oracle UI (LOCKED)
- `web/src/hooks/usePrediction.ts` - On-chain betting hook
- `web/src/lib/prediction/client.ts` - Anchor client
