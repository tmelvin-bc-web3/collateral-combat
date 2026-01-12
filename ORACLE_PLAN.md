# Oracle Game - Alignment Plan

> **Source of Truth**: See `/ORACLE_TRUTH.md` for canonical values.
> All implementations must align to that document.

## Current State Summary

### Frontend (`/web/src/app/predict/page.tsx`)
- Real-time chart with price updates via Socket.io
- Betting UI with Long/Short buttons
- Fixed bet amounts: 5, 15, 25, 50, 100
- Timer showing countdown to lock/settle
- Two modes: `USE_ON_CHAIN_BETTING` flag switches between off-chain and on-chain
- `usePrediction` hook for on-chain interactions
- Mock data currently displayed (needs real data integration)

### Backend (`/backend/src/services/predictionService.ts`)
- 30-second rounds (25s betting, 5s locked)
- In-memory round storage (not persistent)
- CoinGecko price feeds (30s updates with 1s simulated ticks)
- Socket events: `prediction_round`, `prediction_settled`, `prediction_bet_placed`
- XP awards on settlement via progressionService
- Wager tracking in SQLite

### Smart Contract (`/handoff/prediction_program/lib.rs`)
- 30-second rounds (20s betting, 10s locked)
- Pyth oracle for SOL/USD price
- 10% platform fee
- 0.01 SOL minimum bet
- Instructions: `initialize_game`, `place_bet`, `crank`, `claim_winnings`
- PDAs for escrow, round state, player positions

---

## Identified Gaps & Misalignments

### 1. Timing Mismatch
| Component | Betting Window | Lock Period |
|-----------|----------------|-------------|
| Frontend  | Uses backend timing | Uses backend timing |
| Backend   | 25 seconds | 5 seconds |
| Contract  | 20 seconds | 10 seconds |

**Decision Required**: Standardize timing across all layers.

### 2. Bet Amount Handling
| Component | Bet Amounts |
|-----------|-------------|
| Frontend  | Fixed: [5, 15, 25, 50, 100] (display as USD) |
| Backend   | Fixed: [5, 15, 25, 50, 100] (validates these) |
| Contract  | Minimum 0.01 SOL, any amount above |

**Decision Required**:
- Off-chain: Keep fixed amounts for simplicity
- On-chain: Convert USD to SOL at current price, or use fixed SOL amounts

### 3. Round ID Format
| Component | Round ID Format |
|-----------|-----------------|
| Frontend  | Expects string UUID or number |
| Backend   | UUID strings |
| Contract  | Sequential u64 (0, 1, 2...) |

**Decision Required**: Frontend needs to handle both formats based on mode.

### 4. Settlement & Payouts
| Component | Settlement |
|-----------|------------|
| Frontend  | Displays results, no claim UI for on-chain |
| Backend   | Auto-settles, credits virtual balance |
| Contract  | Requires `crank()` call, then `claim_winnings()` |

**Gap**: Frontend has no UI for claiming on-chain winnings.

### 5. Price Feed Differences
| Component | Price Source |
|-----------|--------------|
| Backend   | CoinGecko (multiple assets) |
| Contract  | Pyth (SOL/USD only) |

**Gap**: Contract only supports SOL, backend supports 8 assets.

### 6. Fee Structure
| Component | Platform Fee |
|-----------|--------------|
| Backend   | 5% of losing pool |
| Contract  | 10% of total pool |

**Decision**: 5% is the canonical fee. Smart contract needs update.

### 7. User Balance/Claims
| Component | Balance Handling |
|-----------|------------------|
| Frontend  | Shows virtual balance from backend |
| Backend   | In-memory tracking only |
| Contract  | Real SOL in escrow, must claim |

**Gap**: No unified balance display, no claim flow UI.

---

## Alignment Plan

### Phase 1: Standardize Core Mechanics

#### 1.1 Timing Constants
Create shared constants file used by both frontend and backend:
```typescript
// Shared timing constants
export const ROUND_DURATION = 30; // seconds
export const BETTING_WINDOW = 25; // seconds (off-chain)
export const BETTING_WINDOW_ONCHAIN = 20; // seconds (on-chain)
export const LOCK_PERIOD = 5; // seconds (off-chain)
export const LOCK_PERIOD_ONCHAIN = 10; // seconds (on-chain)
```

#### 1.2 Bet Amount Standardization
- Keep fixed USD amounts for off-chain
- For on-chain: Convert to SOL equivalent at bet time
- Display both USD and SOL amounts in UI

#### 1.3 Fee Standardization
- Canonical fee is 5% (see ORACLE_TRUTH.md)
- Backend already correct at 0.05
- Smart contract needs update from 10% to 5%

### Phase 2: Frontend Enhancements

#### 2.1 Real Data Integration
- Remove mock data from predict page
- Properly display real bets from `currentRound.longBets` / `shortBets`
- Show actual user profiles from progression system

#### 2.2 On-Chain Mode Support
- Add claim winnings button when user has unclaimed positions
- Show pending claims in sidebar
- Display SOL amounts when in on-chain mode

#### 2.3 Unified Round Display
- Handle both UUID and sequential round IDs
- Format appropriately: "Round #42" for on-chain, truncated UUID for off-chain

### Phase 3: Backend Improvements

#### 3.1 Persistent Bet Storage
- Store bets in SQLite instead of just in-memory
- Survive server restarts
- Enable bet history queries

#### 3.2 Socket Event Standardization
- Ensure all events include complete round data
- Add explicit typing for all payloads
- Document event contracts

#### 3.3 Multi-Asset On-Chain Support (Future)
- Currently contract is SOL-only
- Would need separate game instances per asset
- Or contract upgrade to support multiple Pyth feeds

### Phase 4: Contract Integration

#### 4.1 Crank Automation
- Backend should auto-crank rounds when using on-chain mode
- Or implement keeper bot to call crank()

#### 4.2 Claim Flow
- Frontend needs claim button
- Show claimable amount
- Handle claim transaction

---

## Task Breakdown for Pipeline Workers

### Priority 1: Core Alignment (Must Have)

```
T-ORACLE-001: Standardize round timing constants
- Create /web/src/lib/prediction/constants.ts with timing values
- Update predict/page.tsx to use constants
- Update backend predictionService to use same constants
- Acceptance: Frontend and backend use identical timing for off-chain mode

T-ORACLE-002: Update platform fee to 10% in backend
- Modify predictionService.ts PLATFORM_FEE_RATE from 0.05 to 0.10
- Update any fee display in frontend
- Acceptance: Fee calculation matches smart contract

T-ORACLE-003: Remove mock data from predict page
- Delete mock bettors array
- Delete mock recent rounds array
- Wire up real data from currentRound
- Acceptance: Sidebars show real bets or empty state

T-ORACLE-004: Fix bet display in sidebars
- Left sidebar: Show real bets from currentRound.longBets + shortBets
- Fetch user profiles for usernames/levels
- Show obfuscated address if no username
- Acceptance: Real bets display correctly with user info

T-ORACLE-005: Fix recent rounds in right sidebar
- Show actual settled rounds from history
- Display correct winner, pools, % change
- Acceptance: History sidebar shows real completed rounds
```

### Priority 2: On-Chain Mode (Should Have)

```
T-ORACLE-006: Add on-chain mode toggle
- Add UI toggle to switch between off-chain and on-chain modes
- Persist preference in localStorage
- Show mode indicator in UI
- Acceptance: User can switch modes, preference persists

T-ORACLE-007: Display SOL amounts for on-chain mode
- When on-chain: Show bet amounts in SOL
- Convert USD selector to SOL equivalent
- Show SOL price for reference
- Acceptance: On-chain mode displays SOL values

T-ORACLE-008: Implement claim winnings UI
- Add "Claim" button when user has unclaimed positions
- Call claim_winnings instruction
- Show transaction status
- Acceptance: Users can claim on-chain winnings

T-ORACLE-009: Show unclaimed positions
- Query user's PlayerPosition accounts
- Display pending claims in UI
- Show claimable amount
- Acceptance: User sees their unclaimed winnings
```

### Priority 3: Backend Improvements (Nice to Have)

```
T-ORACLE-010: Persist bets to SQLite
- Add bets table to userStatsDatabase
- Store bet details on placement
- Update on settlement
- Acceptance: Bets survive server restart

T-ORACLE-011: Add bet history endpoint
- GET /api/prediction/:wallet/bets
- Return user's bet history with outcomes
- Include pagination
- Acceptance: API returns user's prediction history

T-ORACLE-012: Backend auto-crank for on-chain mode
- When on-chain mode active, backend calls crank()
- Use dedicated wallet for gas
- Handle errors gracefully
- Acceptance: Rounds settle automatically on-chain
```

### Priority 4: Polish (Future)

```
T-ORACLE-013: Add sound effects
- Play sound on bet placement
- Play sound on round lock
- Play sound on win/loss
- Acceptance: Audio feedback enhances UX

T-ORACLE-014: Add bet confirmation animation
- Animate when bet is placed
- Show bet flying to pool
- Acceptance: Visual feedback on bet

T-ORACLE-015: Mobile responsive improvements
- Collapse sidebars on mobile
- Touch-friendly bet buttons
- Acceptance: Usable on mobile devices
```

---

## Data Flow Diagrams

### Off-Chain Betting Flow
```
User clicks LONG/SHORT
        ↓
Frontend validates amount
        ↓
Socket emit: place_prediction(asset, side, amount, wallet)
        ↓
Backend validates round status & timing
        ↓
Backend adds bet to round pools
        ↓
Backend emits: prediction_bet_placed
        ↓
Frontend updates UI (pool totals, bet list)
        ↓
[At lock time] Backend emits: prediction_round (status: locked)
        ↓
[At end time] Backend settles, emits: prediction_settled
        ↓
Frontend shows result, awards displayed
```

### On-Chain Betting Flow
```
User clicks LONG/SHORT
        ↓
Frontend validates amount & wallet connected
        ↓
Frontend builds place_bet transaction
        ↓
Wallet prompts for signature
        ↓
Transaction sent to Solana
        ↓
Contract validates & updates round state
        ↓
Frontend polls/subscribes for round updates
        ↓
[After end_time] Anyone calls crank()
        ↓
Contract settles round, calculates payouts
        ↓
User clicks "Claim" if winner
        ↓
Frontend builds claim_winnings transaction
        ↓
SOL transferred from escrow to user
```

---

## Success Metrics

1. **Timing Alignment**: Frontend countdown matches backend round lifecycle exactly
2. **Fee Consistency**: 10% fee across all modes
3. **Real Data**: No mock data in production, sidebars show actual bets
4. **On-Chain Working**: Full flow from bet → settle → claim functional
5. **User Experience**: Clear indication of mode, amounts, and outcomes

---

## Open Questions

1. Should we support multiple assets on-chain, or keep it SOL-only?
2. Should bet amounts be truly fixed, or allow custom amounts?
3. Should we add a "demo mode" with fake credits for new users?
4. How should we handle the case where no one bets on one side?
5. Should rounds auto-start or require manual trigger?

---

## Next Steps

1. Review this plan and confirm priorities
2. Create task files in `/tasks/` directory for pipeline workers
3. Start with Priority 1 tasks (T-ORACLE-001 through T-ORACLE-005)
4. Test alignment between frontend and backend
5. Then move to Priority 2 for on-chain mode
