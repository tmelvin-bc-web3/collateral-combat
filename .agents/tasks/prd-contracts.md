# Sol Battles - Pipeline PRD

## Overview
Security fixes and feature tasks for DegenDome.

## Worker Scopes
- **contracts**: handoff/battle_program/, handoff/prediction_program/, handoff/draft_program/
- **frontend-ui**: web/src/app/, web/src/components/
- **backend**: backend/

---

## Stories

### [x] US-SEC-001: Fix init_if_needed Reinitialization Vulnerability
@scope: handoff/battle_program
@worker: contracts

**Severity:** CRITICAL

**Problem:** `init_if_needed` in SubmitTrades can be exploited for reinitialization attacks.

**Solution:**
- Add `initialized: bool` field to TradeLog struct
- Set `initialized = true` on first init
- Add check `require!(!trade_log.initialized || ...)`

**Files:** handoff/battle_program/lib_with_pyth.rs (lines 874-892, 1071-1078)

**Verify:** Cannot reinitialize an already-initialized TradeLog

---

### [x] US-SEC-002: Ed25519 Signature Verification
@scope: handoff/battle_program
@worker: contracts

**Severity:** HIGH

**Problem:** "Trustless" settlement has no signature verification - trades are not cryptographically verified.

**Options:**
- Option A: Implement Ed25519 signature verification using Solana's ed25519 program
- Option B: Rename to "authority-verified settlement" and update documentation

**Files:** handoff/battle_program/lib_with_pyth.rs (lines 245-247, 198-267)

**Verify:** Either signatures are verified OR documentation accurately reflects trust model

**Resolution:** Implemented Option B - Updated documentation to accurately describe the authority-verified settlement model:
- Renamed section header from "Trustless Settlement" to "Authority-Verified Settlement"
- Added comprehensive trust model documentation explaining:
  - Authority accountability via `has_one = authority` constraint
  - Off-chain signature collection stored on-chain for audit purposes
  - Dispute mechanism as safety net
  - Pyth oracle prices for independent price verification
- Removed misleading TODO comment about Ed25519 verification
- Updated all README files and SECURITY_AUDIT.md to reflect accurate trust model

---

### [x] US-SEC-003: Complete Pyth Oracle Integration
@scope: handoff/battle_program
@worker: contracts

**Severity:** MEDIUM

**Problem:** settle_battle_verified uses exit prices from trade data, not Pyth oracle.

**Solution:**
- Add `PriceUpdateV2` account to `SettleBattleVerified` context struct
- Implement `get_price_no_older_than()` with MAX_PRICE_AGE_SECS (120 seconds)
- Calculate open position P&L using live Pyth prices at settlement time

**Files:** handoff/battle_program/lib_with_pyth.rs (lines 271-339, 1089-1124)

**Verify:** P&L calculated from Pyth oracle, not trade exit_price field

**Implementation Notes:**
- Added `pyth_solana_receiver_sdk::price_update::PriceUpdateV2` import
- Added `MAX_PRICE_AGE_SECS = 120` constant
- Added `get_pyth_price()` helper function that normalizes Pyth prices to 6 decimal precision
- Updated `settle_battle_verified` to accept `price_feed_ids: Vec<[u8; 32]>` parameter
- For open positions (exit_price == 0), current Pyth price is used as mark-to-market exit price
- Added `InvalidPriceData` and `MissingPriceFeed` error codes
- Added `pyth_price_update: Account<'info, PriceUpdateV2>` to `SettleBattleVerified` context

---

### [x] US-SEC-004: Add Authority Validation to SubmitTrades
@scope: handoff/battle_program
@worker: contracts

**Severity:** MEDIUM

**Problem:** Any signer can submit trades - no validation against config.authority.

**Solution:**
Add config account to SubmitTrades struct with `has_one = authority` constraint:
```rust
#[account(
    seeds = [b"config"],
    bump = config.bump,
    has_one = authority
)]
pub config: Account<'info, Config>,
```

**Files:** handoff/battle_program/lib_with_pyth.rs (lines 1063-1087)

**Verify:** Only config.authority can call submit_trades

**Implementation Notes:**
- Added `config: Account<'info, Config>` to `SubmitTrades` context struct at line 1144
- Config account uses seeds `[b"config"]` with stored bump for PDA derivation
- `has_one = authority` constraint validates that the `authority` signer matches `config.authority`
- Now only the authorized program authority can submit trades for players

---

### [x] US-SEC-005: Price Feed Validation in Draft Scoring
@scope: handoff/draft_program
@worker: contracts

**Severity:** MEDIUM

**Problem:** remaining_accounts price feeds not validated against CoinRegistry.

**Solution:**
In snapshot_entry_prices and calculate_oracle_score:
- Require CoinRegistry accounts alongside price feeds
- Validate `coin_registry.pyth_price_feed == price_feed.key()`
- Validate pick symbol matches coin_registry.symbol

**Files:** handoff/draft_program/lib.rs (lines 572-662)

**Verify:** Cannot pass arbitrary price feeds to manipulate scores

**Implementation Notes:**
- Added owner validation: `coin_registry_info.owner == &crate::ID` - ensures CoinRegistry account is owned by this program
- Added PDA validation: verifies CoinRegistry PDA derives from `[b"coin", pick.as_bytes()]` seeds - prevents passing CoinRegistry for a different symbol
- Added `InvalidCoinRegistryOwner` error code for program ownership validation
- Added `InvalidCoinRegistryPda` error code for PDA derivation validation
- Both `snapshot_entry_prices` and `calculate_oracle_score` now have complete validation:
  1. CoinRegistry account owned by draft_program
  2. CoinRegistry PDA matches expected address for pick symbol
  3. CoinRegistry is active
  4. Pick symbol matches coin_registry.symbol
  5. Price feed key matches coin_registry.pyth_price_feed

---

### [x] US-SEC-006: Spectator Refund for Cancelled Battles
@scope: handoff/battle_program
@worker: contracts

**Severity:** LOW

**Problem:** cancel_battle only refunds creator, spectator bets have no refund path.

**Solution:**
- Add `refund_spectator_bet` instruction for cancelled battles
- Check `battle.status == BattleStatus::Cancelled`
- Return full bet amount from escrow to bettor

**Files:** handoff/battle_program/lib_with_pyth.rs, handoff/battle_program/lib.rs

**Verify:** Spectators can reclaim bets after battle cancellation

**Implementation Notes:**
- Added `refund_spectator_bet` instruction to both lib.rs and lib_with_pyth.rs
- Added `RefundSpectatorBet` context struct with battle, spectator_bet, escrow, bettor, and system_program accounts
- Added `BattleNotCancelled` error code for validation
- Full bet amount is refunded (no fees deducted for cancelled battles)
- Uses same PDA seeds as ClaimSpectatorWinnings for consistency
- Marks bet as claimed to prevent double refunds

---

### [x] US-SEC-007: Minimum Pool Thresholds
@scope: handoff/battle_program
@worker: contracts

**Severity:** LOW

**Problem:** Very small pools can have rounding errors in fee calculations.

**Solution:**
- Add constant: `MIN_POOL_FOR_SETTLEMENT: u64 = 1_000_000` (0.001 SOL)
- In settlement: if total_pool < MIN_POOL_FOR_SETTLEMENT, treat as draw/refund

**Files:** handoff/battle_program/lib.rs, handoff/battle_program/lib_with_pyth.rs

**Verify:** Tiny pools don't cause fee calculation issues

**Implementation Notes:**
- Added `MIN_POOL_FOR_SETTLEMENT: u64 = 1_000_000` constant to both lib.rs and lib_with_pyth.rs
- Modified `settle_battle` and `settle_battle_verified` to check total pool size before settlement
- If pool < MIN_POOL_FOR_SETTLEMENT, battle is treated as a draw (proposed_winner = default pubkey)
- Modified `finalize_settlement` to skip fee collection for draws
- Added `PlayerDrawRefund` account struct to track player draw refunds
- Added `claim_player_draw_refund` instruction - players can claim entry fee refunds for draws
- Added `refund_spectator_draw_bet` instruction - spectators can claim full bet refunds for draws
- Added `ClaimPlayerDrawRefund` and `RefundSpectatorDrawBet` context structs
- Added `NotADraw` and `NotAPlayer` error codes for validation

---

### [x] US-SEC-008: Early Bird Multiplier Precision
@scope: handoff/prediction_program
@worker: contracts

**Severity:** LOW

**Problem:** Integer division before multiplication causes precision loss.

**Solution:**
Change calculation to use u128 intermediate:
```rust
let bonus_bps = ((EARLY_BIRD_MAX_BPS as u128)
    .checked_mul(time_remaining as u128)
    .unwrap_or(0) / betting_duration as u128) as u64;
```

**Files:** handoff/prediction_program/lib.rs (lines 404-431)

**Verify:** No precision loss for early bird calculations

**Implementation Notes:**
- Updated `calculate_early_bird_multiplier` function in prediction_program/lib.rs
- Changed bonus_bps calculation to use u128 intermediate values
- All operands (EARLY_BIRD_MAX_BPS, time_remaining, betting_duration) are cast to u128 before arithmetic
- Final result is cast back to u64 after division
- Maintains checked_mul for overflow protection

---

### [x] US-UX-001: Leaderboard Time Period Tabs
@scope: web/src/app/leaderboard
@worker: frontend-ui

**Tasks:**
- Add tabs for weekly, monthly, all-time periods
- Data updates correctly per tab
- Current tab highlighted

**Files:** web/src/app/leaderboard/page.tsx, backend/src/services/progressionService.ts

---

### [x] US-UX-002: Leaderboard Pagination and Search
@scope: web/src/app/leaderboard
@worker: frontend-ui

**Tasks:**
- Paginate results (25 per page)
- Search by username/wallet
- Smooth transitions

**Files:** web/src/app/leaderboard/page.tsx

---

### [x] US-UX-003: User Profile Page Structure
@scope: web/src/app/profile
@worker: frontend-ui

**Tasks:**
- Create `/profile/[wallet]` route
- Shows username, level, XP, rank, avatar
- Shows last 50 bets with outcome, amount, date
- Win rate, total wagered, biggest win stats

**Files:** web/src/app/profile/[wallet]/page.tsx

---

### [x] US-MOB-001: Oracle Page Mobile Layout
@scope: web/src/app/predict
@worker: frontend-ui

**Tasks:**
- Fully usable at 375px width
- Buttons large enough to tap
- Chart readable on mobile
- No horizontal scroll

**Files:** web/src/app/predict/page.tsx

**Note:** Only add responsive classes, do NOT change desktop layout

---

### [x] US-TEST-001: Integration Test Suite
@scope: backend/tests
@worker: backend

**Tasks:**
- Test bet placement and database persistence
- Test round lifecycle (betting → locked → settled)
- Test payout calculation
- Test on-chain/off-chain mode switching

**Files:** backend/tests/prediction.test.ts

---
