# Free Bets & Rake Rebates PRD

## Overview
Implement escrow-based free bets and backend rake rebate system for the prediction game.

## Worker Scopes
- **backend-db**: backend/src/db/
- **backend-services**: backend/src/services/
- **backend-api**: backend/src/index.ts
- **frontend**: web/src/

---

## Stories

### [x] US-101: Database Schema & Types
Add database tables and TypeScript types for free bet positions and rake rebates.
@scope: backend/src/db
@worker: backend-db

**Tasks:**
- [ ] Add `free_bet_positions` table to progressionDatabase.ts
- [ ] Add `rake_rebates` table to progressionDatabase.ts
- [ ] Create FreeBetPosition interface in types.ts
- [ ] Create RakeRebate interface in types.ts
- [ ] Add CRUD operations for free_bet_positions
- [ ] Add CRUD operations for rake_rebates

**Files:** backend/src/db/progressionDatabase.ts, backend/src/types.ts

**Schema:**
```sql
CREATE TABLE free_bet_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  round_id INTEGER NOT NULL,
  side TEXT NOT NULL,
  amount_lamports INTEGER DEFAULT 10000000,
  status TEXT DEFAULT 'pending',
  payout_lamports INTEGER,
  tx_signature_bet TEXT,
  tx_signature_claim TEXT,
  tx_signature_settlement TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE rake_rebates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  round_id INTEGER NOT NULL,
  gross_winnings_lamports INTEGER NOT NULL,
  effective_fee_bps INTEGER NOT NULL,
  perk_type TEXT,
  rebate_lamports INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  claim_tx_signature TEXT NOT NULL,
  rebate_tx_signature TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(round_id, wallet_address)
);
```

---

### [x] US-102: FreeBetEscrowService
Create service to place bets on behalf of users using platform escrow wallet.
@scope: backend/src/services
@worker: backend-services

**Tasks:**
- [ ] Create freeBetEscrowService.ts
- [ ] Load escrow keypair from ESCROW_WALLET_PRIVATE_KEY env
- [ ] Implement placeFreeBet(userWallet, roundId, side) - place bet on-chain
- [ ] Implement claimEscrowWinnings(position) - claim from contract
- [ ] Implement settleToUser(position) - transfer winnings to user
- [ ] Add processSettledRounds() background job (10s interval)
- [ ] Integrate with progressionService for free bet balance deduction

**Files:** backend/src/services/freeBetEscrowService.ts

**Dependencies:** @solana/web3.js, @coral-xyz/anchor, progressionService

---

### [x] US-103: RakeRebateService
Create service to detect on-chain claims and send SOL rebates to eligible users.
@scope: backend/src/services
@worker: backend-services

**Tasks:**
- [ ] Create rakeRebateService.ts
- [ ] Load rebate keypair from REBATE_WALLET_PRIVATE_KEY env
- [ ] Implement pollForClaims() - monitor Solana for claim transactions
- [ ] Implement processClaimTransaction(txSig, wallet, roundId)
- [ ] Implement calculateRebate(grossWinnings, effectiveBps) - formula: rebate = gross * (0.05 - effective)
- [ ] Implement sendRebate(rebate) - transfer SOL to user
- [ ] Integrate with progressionService.getActiveOracleRakeReduction()

**Files:** backend/src/services/rakeRebateService.ts

**Perk Rates:**
- oracle_4_5: 4.5% effective (0.5% rebate)
- oracle_4: 4.0% effective (1.0% rebate)
- oracle_3_5: 3.5% effective (1.5% rebate)

---

### [x] US-104: Backend API Endpoints
Add API endpoints for free bets and rebates.
@scope: backend/src/index.ts
@worker: backend-api

**Tasks:**
- [ ] POST /api/prediction/free-bet - place free bet (requireOwnWallet, rate limited)
- [ ] GET /api/prediction/:wallet/free-bet-positions - get user's free bet positions
- [ ] GET /api/progression/:wallet/rebates - get rebate history
- [ ] GET /api/progression/:wallet/rebates/summary - get total rebates earned
- [ ] Add WebSocket event 'rebate_received' for real-time notifications

**Files:** backend/src/index.ts

---

### [x] US-105: Frontend Free Bets
Update prediction page to use escrow-based free bets.
@scope: web/src/app/predict
@worker: frontend

**Tasks:**
- [ ] Update handlePlaceBet() to call POST /api/prediction/free-bet when useFreeBet=true
- [ ] Remove old socket-based free bet logic (socket.emit place_prediction for free bets)
- [ ] Show user's pending free bet positions
- [ ] Add loading/success states for free bet API call
- [ ] Keep existing FREE button toggle UI

**Files:** web/src/app/predict/page.tsx

---

### [x] US-106: Frontend Rebates
Add rebate tracking and display to frontend.
@scope: web/src/contexts|web/src/app/profile
@worker: frontend

**Tasks:**
- [ ] Add totalRebatesEarned to ProgressionContext
- [ ] Fetch rebate summary from API
- [ ] Add WebSocket listener for 'rebate_received' event
- [ ] Show toast notification when rebate received
- [ ] Add rebate history section to profile page
- [ ] Display user's current effective rake rate (based on perk)

**Files:** web/src/contexts/ProgressionContext.tsx, web/src/app/profile/[wallet]/page.tsx

---
